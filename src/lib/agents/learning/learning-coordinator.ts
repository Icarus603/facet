/**
 * FACET Learning Coordinator
 * 
 * Coordinates learning and adaptation across all agents
 * Integrates with orchestrator for real-time personalization
 */

import { AgentExecutionResult, ChatRequest, ChatResponse } from '@/lib/types/api-contract'
import { learningEngine, PersonalizationProfile } from './agent-learning-engine'
import { redisCache } from '../cache/redis-cache'

export interface LearningContext {
  userId: string
  sessionId: string
  interactionHistory: InteractionRecord[]
  personalizedConfigs: { [agentName: string]: any }
  adaptationFlags: string[]
}

export interface InteractionRecord {
  messageId: string
  timestamp: string
  userMessage: string
  agentsUsed: string[]
  processingTime: number
  userSatisfaction?: number
  outcomeType: 'positive' | 'neutral' | 'negative'
  learningPoints: string[]
}

export interface AdaptationEvent {
  type: 'agent_config_update' | 'priority_adjustment' | 'intervention_change' | 'prompt_optimization'
  agentName: string
  userId: string
  change: any
  reason: string
  confidence: number
  timestamp: string
}

export class FACETLearningCoordinator {
  private static instance: FACETLearningCoordinator
  private learningContexts: Map<string, LearningContext> = new Map()
  private adaptationEvents: AdaptationEvent[] = []
  private realTimePersonalization: Map<string, any> = new Map()

  // Learning configuration
  private readonly REAL_TIME_ADAPTATION_ENABLED = true
  private readonly MIN_CONFIDENCE_FOR_LIVE_ADAPTATION = 0.8
  private readonly LEARNING_BATCH_SIZE = 10
  private readonly PERSONALIZATION_UPDATE_INTERVAL = 300000 // 5 minutes

  public static getInstance(): FACETLearningCoordinator {
    if (!FACETLearningCoordinator.instance) {
      FACETLearningCoordinator.instance = new FACETLearningCoordinator()
    }
    return FACETLearningCoordinator.instance
  }

  /**
   * Initialize learning context for a new session
   */
  async initializeLearningContext(userId: string, sessionId: string): Promise<LearningContext> {
    const context: LearningContext = {
      userId,
      sessionId,
      interactionHistory: [],
      personalizedConfigs: {},
      adaptationFlags: []
    }

    // Load personalized configurations for all agents
    const agentNames = ['emotion_analyzer', 'memory_manager', 'crisis_monitor', 'therapy_advisor', 'progress_tracker']
    
    for (const agentName of agentNames) {
      const config = await learningEngine.getPersonalizedAgentConfig(userId, agentName)
      if (Object.keys(config).length > 0) {
        context.personalizedConfigs[agentName] = config
        context.adaptationFlags.push(`personalized_${agentName}`)
      }
    }

    this.learningContexts.set(sessionId, context)
    
    console.log(`FACET Learning: Initialized context for user ${userId} with ${Object.keys(context.personalizedConfigs).length} personalized agents`)
    
    return context
  }

  /**
   * Process interaction for learning (called by orchestrator)
   */
  async processInteractionForLearning(
    sessionId: string,
    request: ChatRequest,
    response: ChatResponse,
    userFeedback?: { satisfaction: number, helpful: boolean, specific_feedback?: string }
  ): Promise<void> {
    try {
      const context = this.learningContexts.get(sessionId)
      if (!context) {
        console.warn(`No learning context found for session ${sessionId}`)
        return
      }

      // Record the interaction
      const interactionRecord: InteractionRecord = {
        messageId: response.messageId,
        timestamp: response.metadata.timestamp,
        userMessage: request.message,
        agentsUsed: response.orchestration?.agentResults.map(a => a.agentName) || [],
        processingTime: response.metadata.processingTimeMs,
        userSatisfaction: userFeedback?.satisfaction,
        outcomeType: this.classifyOutcome(response, userFeedback),
        learningPoints: this.extractLearningPoints(response, userFeedback)
      }

      context.interactionHistory.push(interactionRecord)

      // Process learning asynchronously
      this.processLearningAsync(context.userId, request, response, userFeedback)

      // Check for real-time adaptations
      if (this.REAL_TIME_ADAPTATION_ENABLED) {
        await this.evaluateRealTimeAdaptations(context, response)
      }

      // Update learning context cache
      await this.cacheLearningContext(context)

    } catch (error) {
      console.error('Error processing interaction for learning:', error)
    }
  }

  /**
   * Get personalized agent configurations for orchestrator
   */
  async getPersonalizedAgentConfigs(userId: string): Promise<{ [agentName: string]: any }> {
    const sessionId = `temp_${userId}_${Date.now()}`
    let context = this.learningContexts.get(sessionId)
    
    if (!context) {
      context = await this.initializeLearningContext(userId, sessionId)
    }

    return context.personalizedConfigs
  }

  /**
   * Apply real-time learning adjustments during orchestration
   */
  async applyRealTimeLearning(
    userId: string,
    agentName: string,
    currentConfig: any
  ): Promise<any> {
    try {
      const personalizedConfig = await learningEngine.getPersonalizedAgentConfig(userId, agentName)
      
      // Merge current config with personalized adjustments
      const enhancedConfig = {
        ...currentConfig,
        ...personalizedConfig
      }

      // Apply any real-time adjustments
      const realtimeKey = `${userId}:${agentName}`
      const realtimeAdjustments = this.realTimePersonalization.get(realtimeKey)
      
      if (realtimeAdjustments) {
        Object.assign(enhancedConfig, realtimeAdjustments)
        console.log(`FACET Learning: Applied real-time adjustments for ${agentName}`)
      }

      return enhancedConfig

    } catch (error) {
      console.error('Error applying real-time learning:', error)
      return currentConfig
    }
  }

  /**
   * Get learning analytics for user insights
   */
  async getLearningAnalytics(userId: string): Promise<{
    learningProgress: { metric: string, value: number, trend: string }[]
    personalizedAgents: string[]
    adaptationHistory: { type: string, date: string, impact: string }[]
    insights: string[]
    recommendations: string[]
  }> {
    try {
      const insights = await learningEngine.generateLearningInsights(userId)
      const effectiveness = await learningEngine.getAgentEffectivenessAnalytics(userId)

      const learningProgress = [
        {
          metric: 'Personalization Accuracy',
          value: Object.values(effectiveness).reduce((sum, agent) => sum + agent.personalizedAccuracy, 0) / Object.keys(effectiveness).length,
          trend: 'improving'
        },
        {
          metric: 'Response Relevance',
          value: Object.values(effectiveness).reduce((sum, agent) => sum + agent.responseRelevance, 0) / Object.keys(effectiveness).length,
          trend: 'stable'
        },
        {
          metric: 'User Satisfaction',
          value: Object.values(effectiveness).reduce((sum, agent) => sum + agent.userPreference, 0) / Object.keys(effectiveness).length,
          trend: 'improving'
        }
      ]

      const personalizedAgents = Object.entries(effectiveness)
        .filter(([_, data]) => data.personalizedAccuracy > 0.8)
        .map(([agentName, _]) => agentName)

      const adaptationHistory = insights.adaptationHistory.map(adaptation => ({
        type: adaptation.adaptation,
        date: adaptation.date,
        impact: adaptation.impact > 0.15 ? 'high' : adaptation.impact > 0.05 ? 'medium' : 'low'
      }))

      const analyticsInsights = [
        `Your AI team has learned ${personalizedAgents.length} personalized configurations`,
        `System adaptation confidence: ${(insights.learningProgress.reduce((sum, p) => sum + p.improvement, 0) / insights.learningProgress.length * 100).toFixed(0)}%`,
        `Most effective agent: ${Object.entries(effectiveness).sort(([,a], [,b]) => b.personalizedAccuracy - a.personalizedAccuracy)[0]?.[0] || 'emotion_analyzer'}`
      ]

      return {
        learningProgress,
        personalizedAgents,
        adaptationHistory,
        insights: analyticsInsights,
        recommendations: insights.recommendations
      }

    } catch (error) {
      console.error('Error getting learning analytics:', error)
      return {
        learningProgress: [],
        personalizedAgents: [],
        adaptationHistory: [],
        insights: [],
        recommendations: []
      }
    }
  }

  /**
   * Export user's learning data (for GDPR compliance)
   */
  async exportUserLearningData(userId: string): Promise<{
    personalizedConfigs: any
    interactionHistory: InteractionRecord[]
    adaptationEvents: AdaptationEvent[]
    learningMetrics: any
  }> {
    try {
      // Get all learning contexts for this user
      const userContexts = Array.from(this.learningContexts.values())
        .filter(context => context.userId === userId)

      const allInteractions = userContexts.flatMap(context => context.interactionHistory)
      const userAdaptations = this.adaptationEvents.filter(event => event.userId === userId)
      const configs = await this.getPersonalizedAgentConfigs(userId)
      const analytics = await learningEngine.getAgentEffectivenessAnalytics(userId)

      return {
        personalizedConfigs: configs,
        interactionHistory: allInteractions,
        adaptationEvents: userAdaptations,
        learningMetrics: analytics
      }

    } catch (error) {
      console.error('Error exporting user learning data:', error)
      throw error
    }
  }

  /**
   * Delete user's learning data (for GDPR compliance)
   */
  async deleteUserLearningData(userId: string): Promise<void> {
    try {
      // Remove from memory
      const keysToDelete = Array.from(this.learningContexts.keys())
        .filter(key => {
          const context = this.learningContexts.get(key)
          return context?.userId === userId
        })

      keysToDelete.forEach(key => this.learningContexts.delete(key))

      // Remove adaptation events
      this.adaptationEvents = this.adaptationEvents.filter(event => event.userId !== userId)

      // Remove real-time personalizations
      const realtimeKeys = Array.from(this.realTimePersonalization.keys())
        .filter(key => key.startsWith(userId))
      
      realtimeKeys.forEach(key => this.realTimePersonalization.delete(key))

      // Clear Redis cache
      await redisCache.invalidateUserCache(userId)

      console.log(`FACET Learning: Deleted all learning data for user ${userId}`)

    } catch (error) {
      console.error('Error deleting user learning data:', error)
      throw error
    }
  }

  // Private helper methods

  private async processLearningAsync(
    userId: string,
    request: ChatRequest,
    response: ChatResponse,
    userFeedback?: { satisfaction: number, helpful: boolean, specific_feedback?: string }
  ): Promise<void> {
    // Process learning in background to avoid blocking response
    setTimeout(async () => {
      try {
        await learningEngine.recordInteraction(userId, request, response, userFeedback)
      } catch (error) {
        console.error('Error in async learning processing:', error)
      }
    }, 0)
  }

  private async evaluateRealTimeAdaptations(
    context: LearningContext,
    response: ChatResponse
  ): Promise<void> {
    if (!response.orchestration?.agentResults) return

    for (const agentResult of response.orchestration.agentResults) {
      // Check if this agent needs real-time adaptation
      if (agentResult.confidence < 0.6 && agentResult.executionTimeMs > 3000) {
        // Apply immediate optimization
        const realtimeKey = `${context.userId}:${agentResult.agentName}`
        const optimization = {
          priorityBoost: true,
          timeoutReduction: 0.8,
          confidenceThreshold: 0.5
        }

        this.realTimePersonalization.set(realtimeKey, optimization)

        // Record adaptation event
        this.adaptationEvents.push({
          type: 'priority_adjustment',
          agentName: agentResult.agentName,
          userId: context.userId,
          change: optimization,
          reason: 'Real-time optimization for low confidence and high execution time',
          confidence: 0.9,
          timestamp: new Date().toISOString()
        })

        console.log(`FACET Learning: Applied real-time adaptation for ${agentResult.agentName}`)
      }
    }
  }

  private classifyOutcome(
    response: ChatResponse, 
    userFeedback?: { satisfaction: number, helpful: boolean }
  ): 'positive' | 'neutral' | 'negative' {
    if (userFeedback) {
      if (userFeedback.satisfaction >= 4 && userFeedback.helpful) return 'positive'
      if (userFeedback.satisfaction <= 2 || !userFeedback.helpful) return 'negative'
    }

    // Fallback to response metrics
    const confidence = response.metadata.responseConfidence
    const hasWarnings = response.metadata.warningFlags.length > 0

    if (confidence >= 0.8 && !hasWarnings) return 'positive'
    if (confidence <= 0.5 || hasWarnings) return 'negative'
    
    return 'neutral'
  }

  private extractLearningPoints(
    response: ChatResponse,
    userFeedback?: { satisfaction: number, helpful: boolean, specific_feedback?: string }
  ): string[] {
    const learningPoints: string[] = []

    // Extract from orchestration
    if (response.orchestration) {
      if (response.orchestration.executionPattern === 'parallel') {
        learningPoints.push('parallel_execution_successful')
      }
      
      if (response.orchestration.timing.totalTimeMs < 2000) {
        learningPoints.push('fast_response_achieved')
      }

      if (response.orchestration.confidence.overall > 0.9) {
        learningPoints.push('high_confidence_orchestration')
      }
    }

    // Extract from user feedback
    if (userFeedback?.specific_feedback) {
      if (userFeedback.specific_feedback.toLowerCase().includes('helpful')) {
        learningPoints.push('user_found_helpful')
      }
      if (userFeedback.specific_feedback.toLowerCase().includes('relevant')) {
        learningPoints.push('response_relevant')
      }
    }

    // Extract from emotional state
    if (response.metadata.emotionalState) {
      learningPoints.push(`emotional_context_${response.metadata.emotionalState.primaryEmotion}`)
    }

    return learningPoints
  }

  private async cacheLearningContext(context: LearningContext): Promise<void> {
    try {
      await redisCache.cacheSession(
        context.sessionId,
        context.userId,
        {
          interactionHistory: context.interactionHistory.slice(-10), // Keep last 10 interactions
          adaptationFlags: context.adaptationFlags
        },
        context.personalizedConfigs,
        7200 // 2 hours TTL
      )
    } catch (error) {
      console.error('Error caching learning context:', error)
    }
  }
}

// Export singleton instance
export const learningCoordinator = FACETLearningCoordinator.getInstance()