import { Redis } from 'ioredis'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/client'

export interface MemoryContext {
  sessionId: string
  userId: string
  agentType: string
  conversationHistory: ConversationMessage[]
  culturalContext: CulturalMemory
  therapeuticState: TherapeuticMemory
  metadata: MemoryMetadata
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  agentType?: string
  timestamp: Date
  encrypted: boolean
}

export interface CulturalMemory {
  primaryCulture: string
  culturalPreferences: string[]
  culturalContent: CulturalContentReference[]
  culturalAdaptations: string[]
  sensitivityFlags: string[]
}

export interface TherapeuticMemory {
  currentGoals: string[]
  progressMarkers: ProgressMarker[]
  therapeuticAlliance: number // 0-1 score
  interventionHistory: InterventionRecord[]
  riskFactors: string[]
  protectiveFactors: string[]
}

export interface MemoryMetadata {
  createdAt: Date
  lastAccessed: Date
  accessCount: number
  privacy: PrivacySettings
  retention: RetentionSettings
}

export interface PrivacySettings {
  encryptionLevel: 'basic' | 'enhanced' | 'maximum'
  dataClassification: 'public' | 'confidential' | 'restricted'
  accessLog: boolean
  auditTrail: boolean
}

export interface RetentionSettings {
  retentionPeriod: number // days
  autoDelete: boolean
  archiveAfter: number // days
  anonymizeAfter: number // days
}

export class AgentMemoryManager {
  private redis: Redis
  private supabase: ReturnType<typeof createClient>
  private encryptionKey: string

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
    this.supabase = createClient()
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
  }

  /**
   * Initialize memory context for a new therapy session
   */
  async initializeMemoryContext(
    sessionId: string,
    userId: string,
    initialContext: Partial<MemoryContext> = {}
  ): Promise<MemoryContext> {
    try {
      // Get user's cultural profile
      const { data: userProfile } = await this.supabase
        .from('user_cultural_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      // Get previous session context for continuity
      const previousContext = await this.getPreviousSessionContext(userId)

      const memoryContext: MemoryContext = {
        sessionId,
        userId,
        agentType: 'intake', // Start with intake agent
        conversationHistory: [],
        culturalContext: {
          primaryCulture: userProfile?.primary_culture || 'unknown',
          culturalPreferences: userProfile?.language_preferences || [],
          culturalContent: [],
          culturalAdaptations: [],
          sensitivityFlags: []
        },
        therapeuticState: {
          currentGoals: previousContext?.therapeuticState.currentGoals || [],
          progressMarkers: [],
          therapeuticAlliance: previousContext?.therapeuticState.therapeuticAlliance || 0.5,
          interventionHistory: [],
          riskFactors: [],
          protectiveFactors: []
        },
        metadata: {
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 0,
          privacy: {
            encryptionLevel: 'enhanced',
            dataClassification: 'restricted',
            accessLog: true,
            auditTrail: true
          },
          retention: {
            retentionPeriod: 2555, // 7 years for medical records
            autoDelete: false,
            archiveAfter: 365,
            anonymizeAfter: 1825 // 5 years
          }
        },
        ...initialContext
      }

      // Store in Redis for fast access
      await this.storeMemoryContext(memoryContext)

      // Log memory initialization
      await this.logMemoryAccess(sessionId, userId, 'initialize', 'success')

      return memoryContext
    } catch (error) {
      await this.logMemoryAccess(sessionId, userId, 'initialize', 'error', error)
      throw error
    }
  }

  /**
   * Store memory context with encryption
   */
  async storeMemoryContext(context: MemoryContext): Promise<void> {
    try {
      const encryptedContext = await this.encryptMemoryContext(context)
      const key = `memory:${context.sessionId}`
      
      await this.redis.setex(
        key,
        60 * 60 * 24, // 24 hours TTL
        JSON.stringify(encryptedContext)
      )

      // Also store in database for persistence
      await this.persistMemoryContext(context)
    } catch (error) {
      console.error('Failed to store memory context:', error)
      throw error
    }
  }

  /**
   * Retrieve memory context with decryption
   */
  async getMemoryContext(sessionId: string): Promise<MemoryContext | null> {
    try {
      const key = `memory:${sessionId}`
      const encryptedData = await this.redis.get(key)

      if (!encryptedData) {
        // Try to load from database
        return await this.loadMemoryContextFromDB(sessionId)
      }

      const encryptedContext = JSON.parse(encryptedData)
      const context = await this.decryptMemoryContext(encryptedContext)

      // Update access metadata
      context.metadata.lastAccessed = new Date()
      context.metadata.accessCount += 1

      await this.storeMemoryContext(context)
      await this.logMemoryAccess(sessionId, context.userId, 'retrieve', 'success')

      return context
    } catch (error) {
      console.error('Failed to retrieve memory context:', error)
      return null
    }
  }

  /**
   * Add conversation message to memory
   */
  async addConversationMessage(
    sessionId: string,
    message: Omit<ConversationMessage, 'id' | 'timestamp' | 'encrypted'>
  ): Promise<void> {
    try {
      const context = await this.getMemoryContext(sessionId)
      if (!context) {
        throw new Error(`Memory context not found for session: ${sessionId}`)
      }

      const fullMessage: ConversationMessage = {
        id: randomUUID(),
        timestamp: new Date(),
        encrypted: true,
        ...message
      }

      context.conversationHistory.push(fullMessage)

      // Keep only last 50 messages in active memory
      if (context.conversationHistory.length > 50) {
        context.conversationHistory = context.conversationHistory.slice(-50)
      }

      await this.storeMemoryContext(context)
    } catch (error) {
      console.error('Failed to add conversation message:', error)
      throw error
    }
  }

  /**
   * Update therapeutic state
   */
  async updateTherapeuticState(
    sessionId: string,
    updates: Partial<TherapeuticMemory>
  ): Promise<void> {
    try {
      const context = await this.getMemoryContext(sessionId)
      if (!context) {
        throw new Error(`Memory context not found for session: ${sessionId}`)
      }

      context.therapeuticState = {
        ...context.therapeuticState,
        ...updates
      }

      await this.storeMemoryContext(context)
    } catch (error) {
      console.error('Failed to update therapeutic state:', error)
      throw error
    }
  }

  /**
   * Share context between agents with privacy preservation
   */
  async shareContextBetweenAgents(
    sessionId: string,
    fromAgent: string,
    toAgent: string,
    contextType: 'full' | 'summary' | 'crisis-only' = 'summary'
  ): Promise<MemoryContext | null> {
    try {
      const context = await this.getMemoryContext(sessionId)
      if (!context) {
        return null
      }

      // Create filtered context based on agent needs and privacy
      const sharedContext = await this.filterContextForAgent(context, toAgent, contextType)

      // Log context sharing for audit
      await this.logContextSharing(sessionId, fromAgent, toAgent, contextType)

      return sharedContext
    } catch (error) {
      console.error('Failed to share context between agents:', error)
      return null
    }
  }

  /**
   * Get conversation thread for specific topic or timeframe
   */
  async getConversationThread(
    sessionId: string,
    filters: {
      agentType?: string
      topic?: string
      timeRange?: { start: Date; end: Date }
      messageCount?: number
    } = {}
  ): Promise<ConversationMessage[]> {
    try {
      const context = await this.getMemoryContext(sessionId)
      if (!context) {
        return []
      }

      let messages = context.conversationHistory

      // Apply filters
      if (filters.agentType) {
        messages = messages.filter(msg => msg.agentType === filters.agentType)
      }

      if (filters.topic) {
        messages = messages.filter(msg => 
          msg.content.toLowerCase().includes(filters.topic.toLowerCase())
        )
      }

      if (filters.timeRange) {
        messages = messages.filter(msg => 
          msg.timestamp >= filters.timeRange!.start && 
          msg.timestamp <= filters.timeRange!.end
        )
      }

      if (filters.messageCount) {
        messages = messages.slice(-filters.messageCount)
      }

      return messages
    } catch (error) {
      console.error('Failed to get conversation thread:', error)
      return []
    }
  }

  /**
   * Clean up expired memory contexts
   */
  async cleanupExpiredMemory(): Promise<number> {
    try {
      let cleanedCount = 0
      const keys = await this.redis.keys('memory:*')

      for (const key of keys) {
        const data = await this.redis.get(key)
        if (!data) continue

        const context = JSON.parse(data)
        const expiryDate = new Date(context.metadata.createdAt)
        expiryDate.setDate(expiryDate.getDate() + context.metadata.retention.retentionPeriod)

        if (new Date() > expiryDate) {
          await this.redis.del(key)
          cleanedCount++
        }
      }

      return cleanedCount
    } catch (error) {
      console.error('Failed to cleanup expired memory:', error)
      return 0
    }
  }

  // Private helper methods

  private async encryptMemoryContext(context: MemoryContext): Promise<any> {
    // Simple encryption for demo - use proper encryption in production
    const data = JSON.stringify(context)
    return {
      encrypted: Buffer.from(data).toString('base64'),
      algorithm: 'base64', // Use AES-256-GCM in production
      iv: randomUUID()
    }
  }

  private async decryptMemoryContext(encryptedContext: any): Promise<MemoryContext> {
    // Simple decryption for demo - use proper decryption in production
    const data = Buffer.from(encryptedContext.encrypted, 'base64').toString('utf-8')
    return JSON.parse(data)
  }

  private async persistMemoryContext(context: MemoryContext): Promise<void> {
    try {
      await this.supabase
        .from('memory_contexts')
        .upsert({
          session_id: context.sessionId,
          user_id: context.userId,
          agent_type: context.agentType,
          context_data: context,
          created_at: context.metadata.createdAt,
          last_accessed: context.metadata.lastAccessed
        })
    } catch (error) {
      console.error('Failed to persist memory context:', error)
    }
  }

  private async loadMemoryContextFromDB(sessionId: string): Promise<MemoryContext | null> {
    try {
      const { data } = await this.supabase
        .from('memory_contexts')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      return data?.context_data || null
    } catch (error) {
      console.error('Failed to load memory context from DB:', error)
      return null
    }
  }

  private async getPreviousSessionContext(userId: string): Promise<MemoryContext | null> {
    try {
      const { data } = await this.supabase
        .from('memory_contexts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return data?.context_data || null
    } catch (error) {
      return null
    }
  }

  private async filterContextForAgent(
    context: MemoryContext,
    agentType: string,
    contextType: 'full' | 'summary' | 'crisis-only'
  ): Promise<MemoryContext> {
    const filteredContext = { ...context }

    switch (contextType) {
      case 'crisis-only':
        filteredContext.conversationHistory = context.conversationHistory.filter(
          msg => msg.content.toLowerCase().includes('crisis') || 
                 msg.content.toLowerCase().includes('emergency')
        )
        filteredContext.therapeuticState = {
          ...context.therapeuticState,
          riskFactors: context.therapeuticState.riskFactors,
          protectiveFactors: context.therapeuticState.protectiveFactors,
          currentGoals: [],
          progressMarkers: [],
          therapeuticAlliance: context.therapeuticState.therapeuticAlliance,
          interventionHistory: []
        }
        break

      case 'summary':
        filteredContext.conversationHistory = context.conversationHistory.slice(-10)
        break

      case 'full':
        // No filtering
        break
    }

    return filteredContext
  }

  private async logMemoryAccess(
    sessionId: string,
    userId: string,
    action: string,
    status: 'success' | 'error',
    error?: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('memory_access_logs')
        .insert({
          session_id: sessionId,
          user_id: userId,
          action,
          status,
          error_message: error?.message,
          timestamp: new Date()
        })
    } catch (logError) {
      console.error('Failed to log memory access:', logError)
    }
  }

  private async logContextSharing(
    sessionId: string,
    fromAgent: string,
    toAgent: string,
    contextType: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('context_sharing_logs')
        .insert({
          session_id: sessionId,
          from_agent: fromAgent,
          to_agent: toAgent,
          context_type: contextType,
          timestamp: new Date()
        })
    } catch (error) {
      console.error('Failed to log context sharing:', error)
    }
  }
}

// Additional interfaces
interface CulturalContentReference {
  contentId: string
  relevanceScore: number
  lastUsed: Date
}

interface ProgressMarker {
  id: string
  goal: string
  measurement: number
  timestamp: Date
  agentType: string
}

interface InterventionRecord {
  id: string
  type: string
  agentType: string
  effectiveness: number
  timestamp: Date
  notes: string
}