/**
 * FACET Memory Manager Agent
 * 
 * Vector-based memory storage and retrieval for therapeutic continuity
 * Implements exact AgentExecutionResult format from API_CONTRACT.md
 */

import { AgentExecutionResult, AGENT_NAMES, AGENT_CONFIG } from '@/lib/types/api-contract'

export interface MemoryContext {
  relevantMemories: Memory[]
  insights: string[]
  patterns: TherapeuticPattern[]
  personalContext: PersonalContext
  recommendations: string[]
  confidence: number
  reasoning: string
}

export interface Memory {
  id: string
  type: 'event' | 'insight' | 'goal' | 'pattern' | 'preference' | 'crisis'
  content: string
  emotionalContext: {
    valence: number
    arousal: number
    dominance: number
    primaryEmotion: string
  }
  importance: number
  timestamp: string
  sessionId: string
  vectorEmbedding?: number[]
  tags: string[]
  retrievalScore?: number
}

export interface TherapeuticPattern {
  type: 'emotional_trigger' | 'coping_success' | 'progress_indicator' | 'relationship_dynamic'
  description: string
  frequency: number
  confidence: number
  lastObserved: string
  recommendations: string[]
}

export interface PersonalContext {
  preferences: {
    communicationStyle?: string
    copingStrategies?: string[]
    triggers?: string[]
    strengths?: string[]
  }
  therapeuticGoals: string[]
  progressIndicators: string[]
  importantRelationships: string[]
  currentChallenges: string[]
}

export class MemoryManager {
  // Simulated vector store - in production this would connect to Pinecone
  private memoryStore: Map<string, Memory> = new Map()
  private userContexts: Map<string, PersonalContext> = new Map()

  /**
   * Retrieve relevant memories and context for current conversation
   */
  async retrieveContext(
    message: string,
    userId: string,
    startTimeMs: number,
    emotionalState?: { valence: number, arousal: number, dominance: number },
    assignedTask: string = 'Retrieve relevant therapeutic context and memories'
  ): Promise<AgentExecutionResult> {
    const agentStart = Date.now()
    
    try {
      const memoryContext = await this.performMemoryRetrieval(message, userId, emotionalState)
      const executionTimeMs = Date.now() - agentStart

      return {
        agentName: AGENT_NAMES.MEMORY_MANAGER,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.MEMORY_MANAGER].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.MEMORY_MANAGER].icon,
        assignedTask,
        inputData: { message, userId, emotionalState },
        executionTimeMs,
        executionType: 'parallel',
        startTimeMs: agentStart - startTimeMs,
        endTimeMs: (agentStart - startTimeMs) + executionTimeMs,
        result: memoryContext,
        confidence: memoryContext.confidence,
        success: true,
        reasoning: memoryContext.reasoning,
        keyInsights: memoryContext.insights,
        recommendationsToOrchestrator: memoryContext.recommendations,
        influenceOnFinalResponse: this.calculateInfluence(memoryContext),
        contributedInsights: this.generateContributedInsights(memoryContext)
      }
    } catch (error) {
      const executionTimeMs = Date.now() - agentStart
      
      return {
        agentName: AGENT_NAMES.MEMORY_MANAGER,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.MEMORY_MANAGER].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.MEMORY_MANAGER].icon,
        assignedTask,
        inputData: { message, userId },
        executionTimeMs,
        executionType: 'parallel',
        startTimeMs: agentStart - startTimeMs,
        endTimeMs: (agentStart - startTimeMs) + executionTimeMs,
        result: null,
        confidence: 0.0,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        reasoning: 'Failed to retrieve memory context',
        keyInsights: [],
        recommendationsToOrchestrator: ['proceed_without_memory_context'],
        influenceOnFinalResponse: 0.0,
        contributedInsights: ['Memory context unavailable']
      }
    }
  }

  /**
   * Store significant conversation moments for future retrieval
   */
  async storeMemory(
    content: string,
    userId: string,
    sessionId: string,
    emotionalContext: any,
    importance: number,
    type: Memory['type'] = 'event',
    tags: string[] = []
  ): Promise<void> {
    const memory: Memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      emotionalContext,
      importance,
      timestamp: new Date().toISOString(),
      sessionId,
      tags,
      vectorEmbedding: await this.generateEmbedding(content) // Simulated
    }

    // Store in simulated vector store
    this.memoryStore.set(memory.id, memory)
    
    // Update user context patterns
    await this.updateUserContext(userId, memory)
  }

  private async performMemoryRetrieval(
    message: string,
    userId: string,
    emotionalState?: any
  ): Promise<MemoryContext> {
    // 1. Generate query embedding (simulated)
    const queryEmbedding = await this.generateEmbedding(message)
    
    // 2. Retrieve similar memories using vector similarity
    const relevantMemories = await this.findSimilarMemories(userId, queryEmbedding, message)
    
    // 3. Identify therapeutic patterns
    const patterns = await this.identifyPatterns(userId, relevantMemories, emotionalState)
    
    // 4. Get or create personal context
    const personalContext = this.getUserContext(userId)
    
    // 5. Generate insights from memory analysis
    const insights = this.generateMemoryInsights(relevantMemories, patterns, personalContext)
    
    // 6. Generate recommendations for orchestrator
    const recommendations = this.generateMemoryRecommendations(relevantMemories, patterns, insights)
    
    // 7. Calculate confidence in memory retrieval
    const confidence = this.calculateMemoryConfidence(relevantMemories, patterns)
    
    // 8. Generate reasoning
    const reasoning = this.generateMemoryReasoning(relevantMemories, patterns, confidence)

    return {
      relevantMemories,
      insights,
      patterns,
      personalContext,
      recommendations,
      confidence,
      reasoning
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simplified embedding simulation - in production use OpenAI embeddings
    const words = text.toLowerCase().split(/\s+/)
    const embedding = new Array(384).fill(0) // Simulated 384-dimensional embedding
    
    // Simple hash-based simulation
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j)
        embedding[Math.abs(charCode * (i + 1)) % 384] += 0.1
      }
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0)
  }

  private async findSimilarMemories(
    userId: string,
    queryEmbedding: number[],
    message: string,
    limit: number = 10
  ): Promise<Memory[]> {
    const userMemories = Array.from(this.memoryStore.values())
      .filter(memory => memory.sessionId.includes(userId)) // Simplified user filtering
    
    // Calculate similarity scores (simplified cosine similarity)
    const memoriesWithScores = userMemories.map(memory => {
      const similarity = this.calculateCosineSimilarity(queryEmbedding, memory.vectorEmbedding || [])
      
      // Boost score for recent and important memories
      const recencyBoost = this.calculateRecencyBoost(memory.timestamp)
      const importanceBoost = memory.importance * 0.2
      
      // Boost for keyword matches
      const keywordBoost = this.calculateKeywordBoost(message, memory.content)
      
      const finalScore = similarity + recencyBoost + importanceBoost + keywordBoost
      
      return {
        ...memory,
        retrievalScore: finalScore
      }
    })

    // Sort by relevance score and return top results
    return memoriesWithScores
      .sort((a, b) => (b.retrievalScore || 0) - (a.retrievalScore || 0))
      .slice(0, limit)
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    
    return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0
  }

  private calculateRecencyBoost(timestamp: string): number {
    const memoryDate = new Date(timestamp)
    const now = new Date()
    const daysDiff = (now.getTime() - memoryDate.getTime()) / (1000 * 60 * 60 * 24)
    
    // More recent memories get higher boost (exponential decay)
    return Math.exp(-daysDiff / 30) * 0.3 // 30-day half-life
  }

  private calculateKeywordBoost(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/)
    const contentWords = content.toLowerCase().split(/\s+/)
    
    const matches = queryWords.filter(word => 
      word.length > 3 && contentWords.some(cWord => cWord.includes(word))
    )
    
    return Math.min(matches.length * 0.1, 0.3) // Max 0.3 boost
  }

  private async identifyPatterns(
    userId: string,
    memories: Memory[],
    currentEmotionalState?: any
  ): Promise<TherapeuticPattern[]> {
    const patterns: TherapeuticPattern[] = []
    
    // Analyze emotional triggers
    const triggerPattern = this.analyzeEmotionalTriggers(memories)
    if (triggerPattern) patterns.push(triggerPattern)
    
    // Analyze coping successes
    const copingPattern = this.analyzeCopingSuccesses(memories)
    if (copingPattern) patterns.push(copingPattern)
    
    // Analyze progress indicators
    const progressPattern = this.analyzeProgressIndicators(memories)
    if (progressPattern) patterns.push(progressPattern)
    
    // Analyze relationship dynamics
    const relationshipPattern = this.analyzeRelationshipDynamics(memories)
    if (relationshipPattern) patterns.push(relationshipPattern)
    
    return patterns
  }

  private analyzeEmotionalTriggers(memories: Memory[]): TherapeuticPattern | null {
    const negativeMemories = memories.filter(m => 
      m.emotionalContext.valence < -0.3 && 
      m.type === 'event'
    )
    
    if (negativeMemories.length < 2) return null
    
    // Look for common themes in negative emotional experiences
    const commonTriggers = this.extractCommonThemes(negativeMemories.map(m => m.content))
    
    if (commonTriggers.length === 0) return null
    
    return {
      type: 'emotional_trigger',
      description: `Common emotional triggers identified: ${commonTriggers.join(', ')}`,
      frequency: negativeMemories.length,
      confidence: 0.7,
      lastObserved: negativeMemories[0].timestamp,
      recommendations: [
        'develop_trigger_awareness',
        'practice_preventive_coping',
        'explore_trigger_origins'
      ]
    }
  }

  private analyzeCopingSuccesses(memories: Memory[]): TherapeuticPattern | null {
    const successMemories = memories.filter(m => 
      m.content.toLowerCase().includes('helped') ||
      m.content.toLowerCase().includes('worked') ||
      m.content.toLowerCase().includes('better') ||
      m.emotionalContext.valence > 0.3
    )
    
    if (successMemories.length < 1) return null
    
    const copingStrategies = this.extractCopingStrategies(successMemories.map(m => m.content))
    
    return {
      type: 'coping_success',
      description: `Effective coping strategies: ${copingStrategies.join(', ')}`,
      frequency: successMemories.length,
      confidence: 0.8,
      lastObserved: successMemories[0].timestamp,
      recommendations: [
        'reinforce_successful_strategies',
        'expand_coping_toolkit',
        'practice_during_calm_periods'
      ]
    }
  }

  private analyzeProgressIndicators(memories: Memory[]): TherapeuticPattern | null {
    const progressMemories = memories.filter(m => 
      m.type === 'goal' || 
      m.content.toLowerCase().includes('progress') ||
      m.content.toLowerCase().includes('improving')
    )
    
    if (progressMemories.length === 0) return null
    
    return {
      type: 'progress_indicator',
      description: `Progress observed in: ${progressMemories.map(m => m.tags.join(', ')).join('; ')}`,
      frequency: progressMemories.length,
      confidence: 0.75,
      lastObserved: progressMemories[0].timestamp,
      recommendations: [
        'acknowledge_progress',
        'set_next_milestones',
        'maintain_momentum'
      ]
    }
  }

  private analyzeRelationshipDynamics(memories: Memory[]): TherapeuticPattern | null {
    const relationshipMemories = memories.filter(m => 
      m.content.toLowerCase().includes('friend') ||
      m.content.toLowerCase().includes('family') ||
      m.content.toLowerCase().includes('partner') ||
      m.content.toLowerCase().includes('relationship')
    )
    
    if (relationshipMemories.length < 2) return null
    
    return {
      type: 'relationship_dynamic',
      description: 'Recurring relationship themes in therapeutic discussions',
      frequency: relationshipMemories.length,
      confidence: 0.6,
      lastObserved: relationshipMemories[0].timestamp,
      recommendations: [
        'explore_relationship_patterns',
        'develop_communication_skills',
        'set_healthy_boundaries'
      ]
    }
  }

  private extractCommonThemes(contents: string[]): string[] {
    // Simplified theme extraction - in production use NLP
    const commonWords = ['work', 'family', 'money', 'health', 'future', 'relationship']
    
    return commonWords.filter(theme => 
      contents.some(content => content.toLowerCase().includes(theme))
    )
  }

  private extractCopingStrategies(contents: string[]): string[] {
    const strategies = ['breathing', 'exercise', 'meditation', 'talking', 'writing', 'music']
    
    return strategies.filter(strategy => 
      contents.some(content => content.toLowerCase().includes(strategy))
    )
  }

  private getUserContext(userId: string): PersonalContext {
    if (!this.userContexts.has(userId)) {
      // Initialize default context
      this.userContexts.set(userId, {
        preferences: {},
        therapeuticGoals: [],
        progressIndicators: [],
        importantRelationships: [],
        currentChallenges: []
      })
    }
    
    return this.userContexts.get(userId)!
  }

  private async updateUserContext(userId: string, memory: Memory): Promise<void> {
    const context = this.getUserContext(userId)
    
    // Update context based on memory content and type
    if (memory.type === 'goal') {
      context.therapeuticGoals.push(memory.content)
    }
    
    if (memory.type === 'preference') {
      // Extract preferences from memory content
      // This would be more sophisticated in production
    }
    
    // Update important relationships
    if (memory.content.toLowerCase().includes('family') || 
        memory.content.toLowerCase().includes('friend')) {
      const relationships = memory.tags.filter(tag => tag.includes('relationship'))
      context.importantRelationships.push(...relationships)
    }
  }

  private generateMemoryInsights(
    memories: Memory[],
    patterns: TherapeuticPattern[],
    context: PersonalContext
  ): string[] {
    const insights = []
    
    if (memories.length > 0) {
      insights.push(`Retrieved ${memories.length} relevant memories from therapeutic history`)
      
      const recentMemories = memories.filter(m => {
        const daysSince = (Date.now() - new Date(m.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        return daysSince < 7
      })
      
      if (recentMemories.length > 0) {
        insights.push(`${recentMemories.length} memories from recent sessions show current themes`)
      }
    }
    
    if (patterns.length > 0) {
      insights.push(`Identified ${patterns.length} therapeutic patterns for personalized approach`)
      
      const triggerPatterns = patterns.filter(p => p.type === 'emotional_trigger')
      if (triggerPatterns.length > 0) {
        insights.push('Emotional trigger patterns detected - proactive coping recommended')
      }
      
      const successPatterns = patterns.filter(p => p.type === 'coping_success')
      if (successPatterns.length > 0) {
        insights.push('Previous coping successes available for reinforcement')
      }
    }
    
    if (context.therapeuticGoals.length > 0) {
      insights.push(`Active therapeutic goals: ${context.therapeuticGoals.length}`)
    }
    
    return insights
  }

  private generateMemoryRecommendations(
    memories: Memory[],
    patterns: TherapeuticPattern[],
    insights: string[]
  ): string[] {
    const recommendations = []
    
    if (memories.length > 0) {
      recommendations.push('incorporate_personal_history')
      
      const highImportanceMemories = memories.filter(m => m.importance > 0.7)
      if (highImportanceMemories.length > 0) {
        recommendations.push('reference_significant_moments')
      }
    }
    
    if (patterns.length > 0) {
      recommendations.push('apply_identified_patterns')
      
      const copingPatterns = patterns.filter(p => p.type === 'coping_success')
      if (copingPatterns.length > 0) {
        recommendations.push('reinforce_successful_coping')
      }
      
      const triggerPatterns = patterns.filter(p => p.type === 'emotional_trigger')
      if (triggerPatterns.length > 0) {
        recommendations.push('address_known_triggers')
      }
    }
    
    if (memories.length === 0) {
      recommendations.push('build_initial_rapport', 'establish_baseline')
    }
    
    return recommendations
  }

  private calculateMemoryConfidence(memories: Memory[], patterns: TherapeuticPattern[]): number {
    let confidence = 0.3 // Base confidence
    
    // Increase confidence with relevant memories
    if (memories.length > 0) {
      confidence += Math.min(memories.length * 0.1, 0.4)
      
      // High retrieval scores increase confidence
      const avgRetrievalScore = memories.reduce((sum, m) => sum + (m.retrievalScore || 0), 0) / memories.length
      confidence += avgRetrievalScore * 0.2
    }
    
    // Patterns increase confidence
    if (patterns.length > 0) {
      confidence += patterns.length * 0.1
      
      // High confidence patterns boost overall confidence
      const avgPatternConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      confidence += avgPatternConfidence * 0.1
    }
    
    return Math.max(0.1, Math.min(1.0, confidence))
  }

  private generateMemoryReasoning(
    memories: Memory[],
    patterns: TherapeuticPattern[],
    confidence: number
  ): string {
    let reasoning = ''
    
    if (memories.length > 0) {
      reasoning += `Retrieved ${memories.length} relevant memories using vector similarity search. `
      
      const avgImportance = memories.reduce((sum, m) => sum + m.importance, 0) / memories.length
      if (avgImportance > 0.6) {
        reasoning += 'High-importance memories identified for therapeutic context. '
      }
    } else {
      reasoning += 'No relevant memories found - may be new user or low similarity to past conversations. '
    }
    
    if (patterns.length > 0) {
      reasoning += `Identified ${patterns.length} therapeutic patterns across memory history. `
    }
    
    reasoning += `Memory retrieval confidence: ${(confidence * 100).toFixed(0)}%`
    
    return reasoning
  }

  private generateContributedInsights(context: MemoryContext): string[] {
    const insights = []
    
    if (context.relevantMemories.length > 0) {
      insights.push(`${context.relevantMemories.length} relevant memories retrieved for context`)
    }
    
    if (context.patterns.length > 0) {
      const patternTypes = context.patterns.map(p => p.type).join(', ')
      insights.push(`Therapeutic patterns identified: ${patternTypes}`)
    }
    
    if (context.personalContext.therapeuticGoals.length > 0) {
      insights.push(`${context.personalContext.therapeuticGoals.length} active therapeutic goals`)
    }
    
    return insights
  }

  private calculateInfluence(context: MemoryContext): number {
    let influence = 0.3 // Base influence
    
    // High-quality memories increase influence
    const highQualityMemories = context.relevantMemories.filter(m => 
      (m.retrievalScore || 0) > 0.7 && m.importance > 0.6
    )
    influence += highQualityMemories.length * 0.15
    
    // Strong patterns increase influence
    const strongPatterns = context.patterns.filter(p => p.confidence > 0.7)
    influence += strongPatterns.length * 0.1
    
    // Overall confidence affects influence
    influence += context.confidence * 0.3
    
    return Math.max(0.1, Math.min(1.0, influence))
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager()