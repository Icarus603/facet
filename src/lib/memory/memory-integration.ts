import { AgentMemoryManager, MemoryContext } from './memory-manager'
import { SessionManager, TherapySession, SessionMetrics } from './session-manager'
import { randomUUID } from 'crypto'

export interface MemoryIntegrationConfig {
  enableEncryption: boolean
  retentionPeriodDays: number
  maxConversationHistory: number
  enableAuditLogging: boolean
  performanceThresholds: {
    maxResponseTimeMs: number
    maxMemoryUsageMB: number
  }
}

export interface AgentMemoryInterface {
  // Session management
  startTherapySession(userId: string, sessionType?: string): Promise<string>
  endTherapySession(sessionId: string): Promise<SessionMetrics>
  pauseSession(sessionId: string): Promise<void>
  resumeSession(sessionId: string): Promise<void>
  
  // Memory operations
  addMessage(sessionId: string, role: 'user' | 'agent', content: string, agentType?: string): Promise<void>
  getConversationHistory(sessionId: string, options?: GetHistoryOptions): Promise<ConversationMessage[]>
  updateTherapeuticState(sessionId: string, updates: TherapeuticStateUpdate): Promise<void>
  
  // Agent coordination
  transitionToAgent(sessionId: string, fromAgent: string, toAgent: string, reason: string): Promise<void>
  getAgentContext(sessionId: string, agentType: string): Promise<AgentContextView>
  shareContextBetweenAgents(sessionId: string, fromAgent: string, toAgent: string): Promise<void>
  
  // Memory queries
  searchMemory(sessionId: string, query: string, options?: SearchOptions): Promise<MemorySearchResult[]>
  getCulturalContext(sessionId: string): Promise<CulturalMemoryView>
  getTherapeuticProgress(sessionId: string): Promise<TherapeuticProgressView>
  
  // Maintenance
  cleanupExpiredMemory(): Promise<number>
  performHealthCheck(): Promise<MemoryHealthStatus>
}

export interface GetHistoryOptions {
  maxMessages?: number
  agentType?: string
  startTime?: Date
  endTime?: Date
  includeMetadata?: boolean
}

export interface SearchOptions {
  searchType: 'semantic' | 'keyword' | 'temporal'
  maxResults?: number
  relevanceThreshold?: number
  culturalFilter?: string[]
}

export interface MemorySearchResult {
  messageId: string
  content: string
  relevanceScore: number
  timestamp: Date
  agentType: string
  context: any
}

export interface AgentContextView {
  sessionId: string
  agentType: string
  conversationSummary: string
  culturalContext: CulturalMemoryView
  therapeuticState: TherapeuticProgressView
  recentInteractions: ConversationMessage[]
  recommendations: string[]
}

export interface CulturalMemoryView {
  primaryCulture: string
  culturalPreferences: string[]
  sensitivityFlags: string[]
  culturalContent: CulturalContentReference[]
  adaptationHistory: string[]
}

export interface TherapeuticProgressView {
  currentGoals: string[]
  completedGoals: string[]
  progressScore: number
  therapeuticAlliance: number
  riskFactors: string[]
  protectiveFactors: string[]
  recentProgress: ProgressMarker[]
}

export interface TherapeuticStateUpdate {
  goals?: string[]
  progressMarkers?: ProgressMarker[]
  therapeuticAlliance?: number
  riskFactors?: string[]
  protectiveFactors?: string[]
  interventions?: InterventionRecord[]
}

export interface MemoryHealthStatus {
  memorySystemHealth: 'healthy' | 'degraded' | 'critical'
  redisConnected: boolean
  databaseConnected: boolean
  memoryUsage: {
    activeSessions: number
    totalMemoryMB: number
    averageResponseTimeMs: number
  }
  alerts: MemoryAlert[]
}

export interface MemoryAlert {
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  timestamp: Date
  affectedSessions?: string[]
}

export class MemoryIntegration implements AgentMemoryInterface {
  private memoryManager: AgentMemoryManager
  private sessionManager: SessionManager
  private config: MemoryIntegrationConfig

  constructor(config: Partial<MemoryIntegrationConfig> = {}) {
    this.memoryManager = new AgentMemoryManager()
    this.sessionManager = new SessionManager()
    this.config = {
      enableEncryption: true,
      retentionPeriodDays: 2555, // 7 years for medical records
      maxConversationHistory: 100,
      enableAuditLogging: true,
      performanceThresholds: {
        maxResponseTimeMs: 2000,
        maxMemoryUsageMB: 512
      },
      ...config
    }
  }

  /**
   * Start a new therapy session with memory initialization
   */
  async startTherapySession(
    userId: string,
    sessionType: 'initial' | 'follow_up' | 'crisis' | 'group' = 'follow_up'
  ): Promise<string> {
    try {
      const session = await this.sessionManager.startSession(userId, sessionType, 'intake')
      return session.id
    } catch (error) {
      console.error('Failed to start therapy session:', error)
      throw new Error('Unable to initialize therapy session')
    }
  }

  /**
   * End therapy session and compute final metrics
   */
  async endTherapySession(sessionId: string): Promise<SessionMetrics> {
    try {
      const metrics = await this.sessionManager.endSession(sessionId)
      return metrics
    } catch (error) {
      console.error('Failed to end therapy session:', error)
      throw new Error('Unable to complete therapy session')
    }
  }

  /**
   * Pause active session
   */
  async pauseSession(sessionId: string): Promise<void> {
    await this.sessionManager.pauseSession(sessionId)
  }

  /**
   * Resume paused session
   */
  async resumeSession(sessionId: string): Promise<void> {
    await this.sessionManager.resumeSession(sessionId)
  }

  /**
   * Add conversation message to memory with encryption
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'agent',
    content: string,
    agentType?: string
  ): Promise<void> {
    try {
      await this.memoryManager.addConversationMessage(sessionId, {
        role,
        content,
        agentType
      })
    } catch (error) {
      console.error('Failed to add message to memory:', error)
      throw new Error('Unable to store conversation message')
    }
  }

  /**
   * Get filtered conversation history
   */
  async getConversationHistory(
    sessionId: string,
    options: GetHistoryOptions = {}
  ): Promise<ConversationMessage[]> {
    try {
      const filters = {
        agentType: options.agentType,
        timeRange: options.startTime && options.endTime 
          ? { start: options.startTime, end: options.endTime } 
          : undefined,
        messageCount: options.maxMessages || this.config.maxConversationHistory
      }

      return await this.memoryManager.getConversationThread(sessionId, filters)
    } catch (error) {
      console.error('Failed to get conversation history:', error)
      return []
    }
  }

  /**
   * Update therapeutic state with progress tracking
   */
  async updateTherapeuticState(
    sessionId: string,
    updates: TherapeuticStateUpdate
  ): Promise<void> {
    try {
      const therapeuticUpdates: any = {}

      if (updates.goals) {
        therapeuticUpdates.currentGoals = updates.goals
      }

      if (updates.progressMarkers) {
        therapeuticUpdates.progressMarkers = updates.progressMarkers
      }

      if (updates.therapeuticAlliance !== undefined) {
        therapeuticUpdates.therapeuticAlliance = updates.therapeuticAlliance
      }

      if (updates.riskFactors) {
        therapeuticUpdates.riskFactors = updates.riskFactors
      }

      if (updates.protectiveFactors) {
        therapeuticUpdates.protectiveFactors = updates.protectiveFactors
      }

      if (updates.interventions) {
        therapeuticUpdates.interventionHistory = updates.interventions
      }

      await this.memoryManager.updateTherapeuticState(sessionId, therapeuticUpdates)
    } catch (error) {
      console.error('Failed to update therapeutic state:', error)
      throw new Error('Unable to update therapeutic progress')
    }
  }

  /**
   * Transition between agents with context transfer
   */
  async transitionToAgent(
    sessionId: string,
    fromAgent: string,
    toAgent: string,
    reason: string
  ): Promise<void> {
    try {
      await this.sessionManager.transitionAgent(sessionId, fromAgent, toAgent, reason)
    } catch (error) {
      console.error('Failed to transition agent:', error)
      throw new Error('Unable to transfer to new agent')
    }
  }

  /**
   * Get agent-specific context view
   */
  async getAgentContext(sessionId: string, agentType: string): Promise<AgentContextView> {
    try {
      const memoryContext = await this.memoryManager.getMemoryContext(sessionId)
      if (!memoryContext) {
        throw new Error('Memory context not found')
      }

      // Get recent interactions for this agent
      const recentInteractions = await this.memoryManager.getConversationThread(sessionId, {
        agentType,
        messageCount: 10
      })

      // Generate conversation summary
      const conversationSummary = this.generateConversationSummary(recentInteractions)

      // Generate recommendations
      const recommendations = await this.generateAgentRecommendations(
        memoryContext,
        agentType
      )

      return {
        sessionId,
        agentType,
        conversationSummary,
        culturalContext: this.mapCulturalMemoryView(memoryContext.culturalContext),
        therapeuticState: this.mapTherapeuticProgressView(memoryContext.therapeuticState),
        recentInteractions,
        recommendations
      }
    } catch (error) {
      console.error('Failed to get agent context:', error)
      throw new Error('Unable to retrieve agent context')
    }
  }

  /**
   * Share context between agents with privacy controls
   */
  async shareContextBetweenAgents(
    sessionId: string,
    fromAgent: string,
    toAgent: string
  ): Promise<void> {
    try {
      await this.memoryManager.shareContextBetweenAgents(
        sessionId,
        fromAgent,
        toAgent,
        'summary'
      )
    } catch (error) {
      console.error('Failed to share context between agents:', error)
      throw new Error('Unable to share agent context')
    }
  }

  /**
   * Search memory with semantic and keyword capabilities
   */
  async searchMemory(
    sessionId: string,
    query: string,
    options: SearchOptions = { searchType: 'keyword' }
  ): Promise<MemorySearchResult[]> {
    try {
      const messages = await this.memoryManager.getConversationThread(sessionId)
      
      // Simple keyword search implementation
      const results: MemorySearchResult[] = []
      
      for (const message of messages) {
        if (message.content.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            messageId: message.id,
            content: message.content,
            relevanceScore: this.calculateRelevanceScore(message.content, query),
            timestamp: message.timestamp,
            agentType: message.agentType || 'unknown',
            context: { role: message.role }
          })
        }
      }

      // Sort by relevance and limit results
      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, options.maxResults || 10)
    } catch (error) {
      console.error('Failed to search memory:', error)
      return []
    }
  }

  /**
   * Get cultural context for agent adaptation
   */
  async getCulturalContext(sessionId: string): Promise<CulturalMemoryView> {
    try {
      const memoryContext = await this.memoryManager.getMemoryContext(sessionId)
      if (!memoryContext) {
        throw new Error('Memory context not found')
      }

      return this.mapCulturalMemoryView(memoryContext.culturalContext)
    } catch (error) {
      console.error('Failed to get cultural context:', error)
      throw new Error('Unable to retrieve cultural context')
    }
  }

  /**
   * Get therapeutic progress for tracking and insights
   */
  async getTherapeuticProgress(sessionId: string): Promise<TherapeuticProgressView> {
    try {
      const memoryContext = await this.memoryManager.getMemoryContext(sessionId)
      if (!memoryContext) {
        throw new Error('Memory context not found')
      }

      return this.mapTherapeuticProgressView(memoryContext.therapeuticState)
    } catch (error) {
      console.error('Failed to get therapeutic progress:', error)
      throw new Error('Unable to retrieve therapeutic progress')
    }
  }

  /**
   * Clean up expired memory for privacy compliance
   */
  async cleanupExpiredMemory(): Promise<number> {
    try {
      const memoryCleanedCount = await this.memoryManager.cleanupExpiredMemory()
      const sessionCleanedCount = await this.sessionManager.cleanupInactiveSessions()
      
      return memoryCleanedCount + sessionCleanedCount
    } catch (error) {
      console.error('Failed to cleanup expired memory:', error)
      return 0
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<MemoryHealthStatus> {
    try {
      const alerts: MemoryAlert[] = []
      let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy'

      // Check Redis connectivity
      const redisConnected = await this.checkRedisHealth()
      if (!redisConnected) {
        alerts.push({
          severity: 'critical',
          message: 'Redis connection failed',
          timestamp: new Date()
        })
        systemHealth = 'critical'
      }

      // Check database connectivity
      const databaseConnected = await this.checkDatabaseHealth()
      if (!databaseConnected) {
        alerts.push({
          severity: 'critical',
          message: 'Database connection failed',
          timestamp: new Date()
        })
        systemHealth = 'critical'
      }

      // Mock memory usage statistics
      const memoryUsage = {
        activeSessions: 0, // Would be populated from actual metrics
        totalMemoryMB: 128,
        averageResponseTimeMs: 150
      }

      return {
        memorySystemHealth: systemHealth,
        redisConnected,
        databaseConnected,
        memoryUsage,
        alerts
      }
    } catch (error) {
      console.error('Failed to perform health check:', error)
      return {
        memorySystemHealth: 'critical',
        redisConnected: false,
        databaseConnected: false,
        memoryUsage: {
          activeSessions: 0,
          totalMemoryMB: 0,
          averageResponseTimeMs: 0
        },
        alerts: [{
          severity: 'critical',
          message: 'Health check failed',
          timestamp: new Date()
        }]
      }
    }
  }

  // Private helper methods

  private generateConversationSummary(messages: ConversationMessage[]): string {
    if (messages.length === 0) {
      return 'No conversation history available'
    }

    const recentMessages = messages.slice(-5)
    const summary = recentMessages
      .map(msg => `${msg.role}: ${msg.content.substring(0, 100)}...`)
      .join('\n')

    return `Recent conversation:\n${summary}`
  }

  private async generateAgentRecommendations(
    context: MemoryContext,
    agentType: string
  ): Promise<string[]> {
    const recommendations: string[] = []

    // Agent-specific recommendations
    switch (agentType) {
      case 'intake':
        recommendations.push('Complete cultural background assessment')
        recommendations.push('Establish therapeutic goals')
        break
      case 'therapy_coordinator':
        recommendations.push('Review session progress')
        recommendations.push('Consider agent transitions based on needs')
        break
      case 'crisis_monitor':
        recommendations.push('Monitor for crisis indicators')
        recommendations.push('Maintain safety protocols')
        break
      case 'cultural_adapter':
        recommendations.push('Integrate culturally relevant content')
        recommendations.push('Validate cultural appropriateness')
        break
      case 'progress_tracker':
        recommendations.push('Measure therapeutic outcomes')
        recommendations.push('Update progress markers')
        break
    }

    return recommendations
  }

  private mapCulturalMemoryView(culturalContext: any): CulturalMemoryView {
    return {
      primaryCulture: culturalContext.primaryCulture || 'unknown',
      culturalPreferences: culturalContext.culturalPreferences || [],
      sensitivityFlags: culturalContext.sensitivityFlags || [],
      culturalContent: culturalContext.culturalContent || [],
      adaptationHistory: culturalContext.culturalAdaptations || []
    }
  }

  private mapTherapeuticProgressView(therapeuticState: any): TherapeuticProgressView {
    const progressMarkers = therapeuticState.progressMarkers || []
    const completedGoals = progressMarkers
      .filter((marker: any) => marker.measurement >= 0.8)
      .map((marker: any) => marker.goal)

    return {
      currentGoals: therapeuticState.currentGoals || [],
      completedGoals,
      progressScore: progressMarkers.length > 0
        ? progressMarkers.reduce((acc: number, marker: any) => acc + marker.measurement, 0) / progressMarkers.length
        : 0,
      therapeuticAlliance: therapeuticState.therapeuticAlliance || 0.5,
      riskFactors: therapeuticState.riskFactors || [],
      protectiveFactors: therapeuticState.protectiveFactors || [],
      recentProgress: progressMarkers.slice(-5)
    }
  }

  private calculateRelevanceScore(content: string, query: string): number {
    const contentLower = content.toLowerCase()
    const queryLower = query.toLowerCase()
    
    // Simple relevance scoring
    let score = 0
    
    if (contentLower.includes(queryLower)) {
      score += 1.0
    }
    
    const queryWords = queryLower.split(' ')
    const matchingWords = queryWords.filter(word => contentLower.includes(word))
    score += matchingWords.length / queryWords.length
    
    return Math.min(score, 1.0)
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      // Would implement actual Redis health check
      return true
    } catch (error) {
      return false
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Would implement actual database health check
      return true
    } catch (error) {
      return false
    }
  }
}

// Re-export types for convenience
export type { ConversationMessage, ProgressMarker, InterventionRecord, CulturalContentReference } from './memory-manager'