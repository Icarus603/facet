import { getIndex } from '@/lib/pinecone/client'
import { createClient } from '@/lib/supabase/client'
import { MemoryEntry, UserMemory, MemoryType } from '@/lib/types/memory'
import { EmotionAnalysis } from '@/lib/types/agent'
import { generateEmbedding, generateSummary, analyzeEmotionalContent } from '@/lib/openai/client'

export interface MemoryEmbedding {
  id: string
  values: number[]
  metadata: {
    userId: string
    memoryType: MemoryType
    importance: number
    emotionalValence: number
    createdAt: string
    lastAccessedAt: string
    accessCount: number
    categories: string[]
    relatedGoals: string[]
    therapeuticRelevance: number
    sensitivityLevel: 'low' | 'medium' | 'high' | 'critical'
    retentionDays: number
    content: string
    summary: string
  }
}

export interface MemorySearchResult {
  id: string
  score: number
  content: string
  summary: string
  memoryType: MemoryType
  importance: number
  createdAt: Date
  categories: string[]
  therapeuticRelevance: number
}

export class MemoryManager {
  private supabase = createClient()
  private indexName = process.env.PINECONE_INDEX_NAME || 'facet-memory'

  /**
   * Store a new memory with vector embedding
   */
  async storeMemory(
    userId: string,
    content: string,
    memoryType: MemoryType,
    emotionalContext?: EmotionAnalysis,
    importance: number = 0.5,
    categories: string[] = [],
    relatedGoals: string[] = []
  ): Promise<string> {
    try {
      // Generate embedding for the content using OpenAI
      const embedding = await generateEmbedding(content)
      
      // Create memory ID
      const memoryId = `memory_${userId}_${Date.now()}`
      
      // Analyze emotional content with AI
      const aiAnalysis = await analyzeEmotionalContent(content)
      
      // Calculate emotional valence from context or AI analysis
      const emotionalValence = emotionalContext ? 
        (emotionalContext.valence - 50) / 50 : aiAnalysis.emotionalTone
      
      // Use AI analysis for therapeutic relevance if not provided
      const therapeuticRelevance = this.calculateTherapeuticRelevance(content, categories, aiAnalysis.therapeuticRelevance)
      
      // Use AI analysis for sensitivity if not overridden
      const sensitivityLevel = this.determineSensitivityLevel(content, emotionalContext, aiAnalysis.sensitivity)
      
      // Determine retention based on importance and sensitivity
      const retentionDays = this.calculateRetentionDays(importance, memoryType, sensitivityLevel)
      
      // Create summary using OpenAI
      const summary = await generateSummary(content, 150)
      
      // Prepare metadata
      const metadata: MemoryEmbedding['metadata'] = {
        userId,
        memoryType,
        importance,
        emotionalValence,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        accessCount: 0,
        categories,
        relatedGoals,
        therapeuticRelevance,
        sensitivityLevel,
        retentionDays,
        content,
        summary
      }
      
      // Store in Pinecone
      const index = await getIndex(this.indexName)
      await index.upsert([{
        id: memoryId,
        values: embedding,
        metadata
      }])
      
      // Store reference in PostgreSQL for backup and querying
      await this.supabase
        .from('memory_entries')
        .insert({
          id: memoryId,
          user_id: userId,
          content,
          summary,
          memory_type: memoryType,
          importance,
          emotional_valence: emotionalValence,
          categories,
          related_goals: relatedGoals,
          therapeutic_relevance: metadata.therapeuticRelevance,
          sensitivity_level: metadata.sensitivityLevel,
          retention_expires_at: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString()
        })
      
      return memoryId
    } catch (error) {
      console.error('Error storing memory:', error)
      throw new Error('Failed to store memory')
    }
  }

  /**
   * Retrieve relevant memories based on similarity search
   */
  async retrieveRelevantMemories(
    queryText: string,
    userId: string,
    topK: number = 5,
    similarityThreshold: number = 0.8,
    memoryTypes?: MemoryType[]
  ): Promise<MemorySearchResult[]> {
    try {
      // Generate embedding for query using OpenAI
      const queryEmbedding = await generateEmbedding(queryText)
      
      // Search in Pinecone
      const index = await getIndex(this.indexName)
      
      const searchResult = await index.query({
        vector: queryEmbedding,
        topK: topK * 2, // Get more results to filter
        includeMetadata: true,
        filter: {
          userId: { $eq: userId },
          ...(memoryTypes && { memoryType: { $in: memoryTypes } })
        }
      })
      
      // Filter by similarity threshold and format results
      const relevantMemories: MemorySearchResult[] = searchResult.matches
        ?.filter(match => (match.score || 0) >= similarityThreshold)
        .slice(0, topK)
        .map(match => ({
          id: match.id,
          score: match.score || 0,
          content: match.metadata?.content as string || '',
          summary: match.metadata?.summary as string || '',
          memoryType: match.metadata?.memoryType as MemoryType || 'event',
          importance: match.metadata?.importance as number || 0,
          createdAt: new Date(match.metadata?.createdAt as string || Date.now()),
          categories: match.metadata?.categories as string[] || [],
          therapeuticRelevance: match.metadata?.therapeuticRelevance as number || 0
        })) || []
      
      // Update access count and last accessed time
      await this.updateMemoryAccess(relevantMemories.map(m => m.id))
      
      return relevantMemories
    } catch (error) {
      console.error('Error retrieving memories:', error)
      return []
    }
  }

  /**
   * Get contextual memories based on emotion and topic
   */
  async getContextualMemories(
    currentEmotion: string,
    currentTopic: string,
    userId: string,
    timeWindow?: { start: Date, end: Date }
  ): Promise<MemorySearchResult[]> {
    const query = `${currentEmotion} ${currentTopic}`
    
    const memories = await this.retrieveRelevantMemories(
      query,
      userId,
      8,
      0.7
    )
    
    // Filter by time window if provided
    if (timeWindow) {
      return memories.filter(memory => 
        memory.createdAt >= timeWindow.start && 
        memory.createdAt <= timeWindow.end
      )
    }
    
    return memories
  }

  /**
   * Get memories related to specific therapeutic goals
   */
  async getProgressMemories(
    goalId: string,
    userId: string
  ): Promise<MemorySearchResult[]> {
    try {
      const index = await getIndex(this.indexName)
      
      const searchResult = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector for metadata-only search
        topK: 50,
        includeMetadata: true,
        filter: {
          userId: { $eq: userId },
          relatedGoals: { $in: [goalId] }
        }
      })
      
      return searchResult.matches?.map(match => ({
        id: match.id,
        score: match.score || 0,
        content: match.metadata?.content as string || '',
        summary: match.metadata?.summary as string || '',
        memoryType: match.metadata?.memoryType as MemoryType || 'event',
        importance: match.metadata?.importance as number || 0,
        createdAt: new Date(match.metadata?.createdAt as string || Date.now()),
        categories: match.metadata?.categories as string[] || [],
        therapeuticRelevance: match.metadata?.therapeuticRelevance as number || 0
      })) || []
    } catch (error) {
      console.error('Error getting progress memories:', error)
      return []
    }
  }


  /**
   * Calculate retention days based on importance, type, and sensitivity
   */
  private calculateRetentionDays(importance: number, memoryType: MemoryType, sensitivityLevel: 'low' | 'medium' | 'high' | 'critical'): number {
    const baseDays = {
      'event': 90,
      'insight': 365,
      'pattern': 365,
      'preference': 730,
      'goal': 365,
      'crisis': 1095 // 3 years for crisis memories
    }
    
    const sensitivityMultiplier = {
      'low': 1.0,
      'medium': 1.2,
      'high': 1.5,
      'critical': 2.0 // Critical memories kept longer
    }
    
    const base = baseDays[memoryType] || 90
    const sensitivityBonus = sensitivityMultiplier[sensitivityLevel] || 1.0
    return Math.floor(base * (0.5 + importance) * sensitivityBonus)
  }

  /**
   * Calculate therapeutic relevance score with AI analysis
   */
  private calculateTherapeuticRelevance(content: string, categories: string[], aiRelevance?: number): number {
    // If we have AI analysis, weight it heavily
    if (aiRelevance !== undefined) {
      const categoryBonus = categories.filter(cat => 
        ['therapy', 'mental-health', 'wellness', 'crisis'].includes(cat)
      ).length * 0.1
      
      return Math.min(1.0, aiRelevance + categoryBonus)
    }
    
    // Fallback to keyword-based analysis
    const therapeuticKeywords = [
      'therapy', 'counseling', 'anxiety', 'depression', 'mood', 'stress',
      'coping', 'trigger', 'emotion', 'feeling', 'goal', 'progress',
      'mindfulness', 'breathing', 'exercise', 'medication', 'support'
    ]
    
    const lowerContent = content.toLowerCase()
    const keywordMatches = therapeuticKeywords.filter(keyword => 
      lowerContent.includes(keyword)
    ).length
    
    const categoryBonus = categories.filter(cat => 
      ['therapy', 'mental-health', 'wellness', 'crisis'].includes(cat)
    ).length * 0.2
    
    return Math.min(1.0, (keywordMatches / therapeuticKeywords.length) + categoryBonus)
  }

  /**
   * Determine sensitivity level based on content, emotion, and AI analysis
   */
  private determineSensitivityLevel(
    content: string, 
    emotionalContext?: EmotionAnalysis,
    aiSensitivity?: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    // If we have AI analysis, use it as the primary source
    if (aiSensitivity) {
      // But still check emotional intensity to potentially upgrade sensitivity
      if (emotionalContext && emotionalContext.intensity > 8 && aiSensitivity !== 'critical') {
        return aiSensitivity === 'high' ? 'critical' : 'high'
      }
      return aiSensitivity
    }
    
    // Fallback to keyword-based analysis
    const lowerContent = content.toLowerCase()
    
    // Critical keywords
    const criticalKeywords = ['suicide', 'self-harm', 'abuse', 'trauma', 'crisis']
    if (criticalKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'critical'
    }
    
    // High sensitivity
    const highKeywords = ['depression', 'anxiety', 'panic', 'medication', 'therapy']
    if (highKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'high'
    }
    
    // Check emotional intensity
    if (emotionalContext && emotionalContext.intensity > 7) {
      return 'high'
    }
    
    if (emotionalContext && emotionalContext.intensity > 5) {
      return 'medium'
    }
    
    return 'low'
  }

  /**
   * Update memory access tracking
   */
  private async updateMemoryAccess(memoryIds: string[]): Promise<void> {
    try {
      if (memoryIds.length === 0) return
      
      const index = await getIndex(this.indexName)
      
      // Get current metadata for memories
      const fetchResult = await index.fetch(memoryIds)
      
      // Update access count and last accessed time
      const updates = Object.entries(fetchResult.records || {}).map(([id, record]) => {
        const metadata = record.metadata as MemoryEmbedding['metadata']
        return {
          id,
          values: record.values,
          metadata: {
            ...metadata,
            lastAccessedAt: new Date().toISOString(),
            accessCount: (metadata.accessCount || 0) + 1
          }
        }
      })
      
      if (updates.length > 0) {
        await index.upsert(updates)
      }
    } catch (error) {
      console.error('Error updating memory access:', error)
      // Non-critical error, don't throw
    }
  }

  /**
   * Clean up expired memories
   */
  async cleanupExpiredMemories(): Promise<number> {
    try {
      // Get expired memories from PostgreSQL
      const { data: expiredMemories } = await this.supabase
        .from('memory_entries')
        .select('id')
        .lt('retention_expires_at', new Date().toISOString())
      
      if (!expiredMemories || expiredMemories.length === 0) {
        return 0
      }
      
      const memoryIds = expiredMemories.map(m => m.id)
      
      // Delete from Pinecone
      const index = await getIndex(this.indexName)
      await index.deleteMany(memoryIds)
      
      // Delete from PostgreSQL
      await this.supabase
        .from('memory_entries')
        .delete()
        .in('id', memoryIds)
      
      console.log(`Cleaned up ${memoryIds.length} expired memories`)
      return memoryIds.length
    } catch (error) {
      console.error('Error cleaning up expired memories:', error)
      return 0
    }
  }
}