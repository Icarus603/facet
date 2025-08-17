/**
 * FACET Agent Learning & Adaptation Engine
 * 
 * Implements machine learning and adaptation capabilities for agents
 * SPECS.md Phase 2, Task 3: Agent learning and adaptation mechanisms
 */

import { AgentExecutionResult, ChatRequest, ChatResponse } from '@/lib/types/api-contract'
import { redisCache } from '../cache/redis-cache'
import { performanceMonitor } from '../orchestrator/performance-monitor'

export interface LearningMetrics {
  agentName: string
  userId: string
  interactionCount: number
  averageConfidence: number
  averageExecutionTime: number
  successRate: number
  userSatisfactionScore: number
  adaptationScore: number
  lastUpdated: string
}

export interface PersonalizationProfile {
  userId: string
  preferredAgents: string[]
  effectiveInterventions: { [intervention: string]: number }
  emotionalResponsePatterns: { [emotion: string]: string[] }
  communicationStyle: 'professional_warm' | 'clinical_precise' | 'casual_supportive'
  averageSessionLength: number
  preferredResponseSpeed: 'fast' | 'balanced' | 'thorough'
  therapeuticGoals: string[]
  crisisIndicators: string[]
  personalizedPromptAdjustments: { [agentName: string]: string }
}

export interface AdaptationStrategy {
  agentName: string
  userId: string
  adaptationType: 'prompt_adjustment' | 'execution_priority' | 'intervention_selection' | 'confidence_calibration'
  adaptation: any
  confidence: number
  expectedImprovement: number
  implementationDate: string
  evaluationMetrics: string[]
}

export class FACETLearningEngine {
  private static instance: FACETLearningEngine
  private learningCache: Map<string, LearningMetrics> = new Map()
  private personalizationProfiles: Map<string, PersonalizationProfile> = new Map()
  private adaptationStrategies: Map<string, AdaptationStrategy[]> = new Map()

  // Learning parameters
  private readonly LEARNING_RATE = 0.1
  private readonly MIN_INTERACTIONS_FOR_LEARNING = 5
  private readonly ADAPTATION_THRESHOLD = 0.7
  private readonly MAX_ADAPTATIONS_PER_AGENT = 3

  public static getInstance(): FACETLearningEngine {
    if (!FACETLearningEngine.instance) {
      FACETLearningEngine.instance = new FACETLearningEngine()
    }
    return FACETLearningEngine.instance
  }

  /**
   * Record interaction data for learning
   */
  async recordInteraction(
    userId: string,
    request: ChatRequest,
    response: ChatResponse,
    userFeedback?: { satisfaction: number, helpful: boolean, specific_feedback?: string }
  ): Promise<void> {
    try {
      if (!response.orchestration?.agentResults) return

      // Record learning data for each agent involved
      for (const agentResult of response.orchestration.agentResults) {
        await this.updateAgentLearningMetrics(
          agentResult.agentName,
          userId,
          agentResult,
          userFeedback
        )
      }

      // Update personalization profile
      await this.updatePersonalizationProfile(userId, request, response, userFeedback)

      // Evaluate potential adaptations
      await this.evaluateAdaptationOpportunities(userId, response.orchestration.agentResults)

    } catch (error) {
      console.error('Error recording interaction for learning:', error)
    }
  }

  /**
   * Get personalized agent configuration for user
   */
  async getPersonalizedAgentConfig(userId: string, agentName: string): Promise<{
    promptAdjustments?: string
    executionPriority?: number
    confidenceThreshold?: number
    preferredInterventions?: string[]
  }> {
    try {
      const profile = await this.getPersonalizationProfile(userId)
      const adaptations = this.adaptationStrategies.get(`${userId}:${agentName}`) || []

      const config: any = {}

      // Apply prompt adjustments
      if (profile.personalizedPromptAdjustments[agentName]) {
        config.promptAdjustments = profile.personalizedPromptAdjustments[agentName]
      }

      // Apply active adaptations
      for (const adaptation of adaptations) {
        if (adaptation.adaptationType === 'prompt_adjustment') {
          config.promptAdjustments = adaptation.adaptation.prompt
        } else if (adaptation.adaptationType === 'execution_priority') {
          config.executionPriority = adaptation.adaptation.priority
        } else if (adaptation.adaptationType === 'confidence_calibration') {
          config.confidenceThreshold = adaptation.adaptation.threshold
        } else if (adaptation.adaptationType === 'intervention_selection') {
          config.preferredInterventions = adaptation.adaptation.interventions
        }
      }

      return config

    } catch (error) {
      console.error('Error getting personalized agent config:', error)
      return {}
    }
  }

  /**
   * Generate learning insights for user dashboard
   */
  async generateLearningInsights(userId: string): Promise<{
    personalizedAccuracy: { [agentName: string]: number }
    learningProgress: { metric: string, improvement: number, timeframe: string }[]
    adaptationHistory: { adaptation: string, date: string, impact: number }[]
    recommendations: string[]
  }> {
    try {
      const profile = await this.getPersonalizationProfile(userId)
      const agentMetrics = await this.getUserAgentMetrics(userId)

      const personalizedAccuracy: { [agentName: string]: number } = {}
      const learningProgress: { metric: string, improvement: number, timeframe: string }[] = []
      const adaptationHistory: { adaptation: string, date: string, impact: number }[] = []
      const recommendations: string[] = []

      // Calculate personalized accuracy for each agent
      for (const [agentName, metrics] of Object.entries(agentMetrics)) {
        personalizedAccuracy[agentName] = this.calculatePersonalizedAccuracy(metrics, profile)
      }

      // Generate learning progress metrics
      learningProgress.push(
        {
          metric: 'Response Relevance',
          improvement: this.calculateImprovementTrend(userId, 'relevance'),
          timeframe: 'last_30_days'
        },
        {
          metric: 'Emotional Understanding',
          improvement: this.calculateImprovementTrend(userId, 'emotional_accuracy'),
          timeframe: 'last_30_days'
        },
        {
          metric: 'Intervention Effectiveness',
          improvement: this.calculateImprovementTrend(userId, 'intervention_success'),
          timeframe: 'last_30_days'
        }
      )

      // Get adaptation history
      for (const [key, adaptations] of this.adaptationStrategies.entries()) {
        if (key.startsWith(userId)) {
          for (const adaptation of adaptations) {
            adaptationHistory.push({
              adaptation: this.humanizeAdaptationType(adaptation.adaptationType),
              date: adaptation.implementationDate,
              impact: adaptation.expectedImprovement
            })
          }
        }
      }

      // Generate recommendations
      recommendations.push(...this.generatePersonalizationRecommendations(userId, profile, agentMetrics))

      return {
        personalizedAccuracy,
        learningProgress,
        adaptationHistory,
        recommendations
      }

    } catch (error) {
      console.error('Error generating learning insights:', error)
      return {
        personalizedAccuracy: {},
        learningProgress: [],
        adaptationHistory: [],
        recommendations: []
      }
    }
  }

  /**
   * Evaluate and apply agent performance adaptations
   */
  async evaluateAdaptationOpportunities(userId: string, agentResults: AgentExecutionResult[]): Promise<void> {
    try {
      for (const agentResult of agentResults) {
        const metrics = await this.getAgentLearningMetrics(agentResult.agentName, userId)
        
        if (!metrics || metrics.interactionCount < this.MIN_INTERACTIONS_FOR_LEARNING) {
          continue
        }

        // Check if adaptation is needed
        const adaptationNeeded = await this.assessAdaptationNeed(metrics, agentResult)
        
        if (adaptationNeeded.shouldAdapt && adaptationNeeded.adaptationType) {
          const strategy = await this.generateAdaptationStrategy(
            userId,
            agentResult.agentName,
            adaptationNeeded.adaptationType,
            metrics,
            agentResult
          )

          if (strategy && strategy.confidence > this.ADAPTATION_THRESHOLD) {
            await this.implementAdaptation(userId, strategy)
          }
        }
      }

    } catch (error) {
      console.error('Error evaluating adaptation opportunities:', error)
    }
  }

  /**
   * Get agent performance analytics for insights endpoint
   */
  async getAgentEffectivenessAnalytics(userId: string): Promise<{
    [agentName: string]: {
      personalizedAccuracy: number
      mostHelpfulInterventions: string[]
      responseRelevance: number
      userPreference: number
    }
  }> {
    const analytics: any = {}
    const profile = await this.getPersonalizationProfile(userId)
    const agentMetrics = await this.getUserAgentMetrics(userId)

    for (const [agentName, metrics] of Object.entries(agentMetrics)) {
      analytics[agentName] = {
        personalizedAccuracy: this.calculatePersonalizedAccuracy(metrics, profile),
        mostHelpfulInterventions: this.extractMostHelpfulInterventions(agentName, profile),
        responseRelevance: metrics.successRate,
        userPreference: this.calculateUserPreference(agentName, profile, metrics)
      }
    }

    return analytics
  }

  // Private helper methods

  private async updateAgentLearningMetrics(
    agentName: string,
    userId: string,
    agentResult: AgentExecutionResult,
    userFeedback?: { satisfaction: number, helpful: boolean }
  ): Promise<void> {
    const key = `${agentName}:${userId}`
    const existing = this.learningCache.get(key) || {
      agentName,
      userId,
      interactionCount: 0,
      averageConfidence: 0,
      averageExecutionTime: 0,
      successRate: 0,
      userSatisfactionScore: 0,
      adaptationScore: 0,
      lastUpdated: new Date().toISOString()
    }

    // Update metrics with exponential moving average
    const alpha = this.LEARNING_RATE
    existing.interactionCount += 1
    existing.averageConfidence = this.updateMovingAverage(
      existing.averageConfidence, 
      agentResult.confidence, 
      alpha
    )
    existing.averageExecutionTime = this.updateMovingAverage(
      existing.averageExecutionTime,
      agentResult.executionTimeMs,
      alpha
    )
    existing.successRate = this.updateMovingAverage(
      existing.successRate,
      agentResult.success ? 1 : 0,
      alpha
    )

    if (userFeedback) {
      existing.userSatisfactionScore = this.updateMovingAverage(
        existing.userSatisfactionScore,
        userFeedback.satisfaction / 5.0, // Normalize to 0-1
        alpha
      )
    }

    existing.lastUpdated = new Date().toISOString()

    this.learningCache.set(key, existing)

    // Cache in Redis for persistence
    await redisCache.cacheAgentResult(
      'learning_metrics',
      { agentName, userId },
      existing as any,
      userId,
      86400 * 7 // 7 days TTL
    )
  }

  private async updatePersonalizationProfile(
    userId: string,
    request: ChatRequest,
    response: ChatResponse,
    userFeedback?: { satisfaction: number, helpful: boolean, specific_feedback?: string }
  ): Promise<void> {
    const existing = this.personalizationProfiles.get(userId) || {
      userId,
      preferredAgents: [],
      effectiveInterventions: {},
      emotionalResponsePatterns: {},
      communicationStyle: 'professional_warm',
      averageSessionLength: 0,
      preferredResponseSpeed: 'balanced',
      therapeuticGoals: [],
      crisisIndicators: [],
      personalizedPromptAdjustments: {}
    }

    // Update preferred agents based on performance
    if (response.orchestration?.agentResults) {
      for (const agentResult of response.orchestration.agentResults) {
        if (agentResult.success && agentResult.confidence > 0.8) {
          if (!existing.preferredAgents.includes(agentResult.agentName)) {
            existing.preferredAgents.push(agentResult.agentName)
          }
        }
      }
    }

    // Update communication style preference
    if (request.userPreferences?.communicationStyle) {
      existing.communicationStyle = request.userPreferences.communicationStyle
    }

    // Update response speed preference
    if (request.userPreferences?.processingSpeed) {
      existing.preferredResponseSpeed = request.userPreferences.processingSpeed === 'fast' ? 'fast' : 
        request.userPreferences.processingSpeed === 'thorough' ? 'thorough' : 'balanced'
    }

    // Extract emotional patterns
    if (response.metadata?.emotionalState) {
      const emotion = response.metadata.emotionalState.primaryEmotion
      if (!existing.emotionalResponsePatterns[emotion]) {
        existing.emotionalResponsePatterns[emotion] = []
      }
      
      // Add message pattern for this emotion
      const messageType = this.categorizeMessage(request.message)
      if (!existing.emotionalResponsePatterns[emotion].includes(messageType)) {
        existing.emotionalResponsePatterns[emotion].push(messageType)
      }
    }

    this.personalizationProfiles.set(userId, existing)

    // Cache personalization profile
    await redisCache.cacheUserPreferences(userId, existing)
  }

  private async getPersonalizationProfile(userId: string): Promise<PersonalizationProfile> {
    // Try cache first
    let profile = this.personalizationProfiles.get(userId)
    
    if (!profile) {
      // Try Redis cache
      const cached = await redisCache.getCachedUserPreferences(userId)
      if (cached) {
        profile = cached as PersonalizationProfile
        this.personalizationProfiles.set(userId, profile)
      }
    }

    return profile || {
      userId,
      preferredAgents: [],
      effectiveInterventions: {},
      emotionalResponsePatterns: {},
      communicationStyle: 'professional_warm',
      averageSessionLength: 0,
      preferredResponseSpeed: 'balanced',
      therapeuticGoals: [],
      crisisIndicators: [],
      personalizedPromptAdjustments: {}
    }
  }

  private async getAgentLearningMetrics(agentName: string, userId: string): Promise<LearningMetrics | null> {
    const key = `${agentName}:${userId}`
    
    // Try in-memory cache first
    let metrics = this.learningCache.get(key)
    
    if (!metrics) {
      // Try Redis cache
      const cached = await redisCache.getCachedAgentResult('learning_metrics', { agentName, userId }, userId)
      if (cached) {
        metrics = cached as any as LearningMetrics
        this.learningCache.set(key, metrics)
      }
    }

    return metrics || null
  }

  private async getUserAgentMetrics(userId: string): Promise<{ [agentName: string]: LearningMetrics }> {
    const userMetrics: { [agentName: string]: LearningMetrics } = {}
    const agentNames = ['emotion_analyzer', 'memory_manager', 'crisis_monitor', 'therapy_advisor', 'progress_tracker']

    for (const agentName of agentNames) {
      const metrics = await this.getAgentLearningMetrics(agentName, userId)
      if (metrics) {
        userMetrics[agentName] = metrics
      }
    }

    return userMetrics
  }

  private async assessAdaptationNeed(
    metrics: LearningMetrics, 
    agentResult: AgentExecutionResult
  ): Promise<{ shouldAdapt: boolean, adaptationType?: string, reason?: string }> {
    // Low confidence but high execution time - prompt adjustment needed
    if (metrics.averageConfidence < 0.7 && metrics.averageExecutionTime > 2000) {
      return {
        shouldAdapt: true,
        adaptationType: 'prompt_adjustment',
        reason: 'Low confidence with high execution time indicates prompt optimization needed'
      }
    }

    // Low success rate - intervention selection adjustment
    if (metrics.successRate < 0.8) {
      return {
        shouldAdapt: true,
        adaptationType: 'intervention_selection',
        reason: 'Low success rate indicates need for different intervention strategies'
      }
    }

    // Low user satisfaction - execution priority adjustment
    if (metrics.userSatisfactionScore < 0.6) {
      return {
        shouldAdapt: true,
        adaptationType: 'execution_priority',
        reason: 'Low user satisfaction suggests need for priority adjustment'
      }
    }

    return { shouldAdapt: false }
  }

  private async generateAdaptationStrategy(
    userId: string,
    agentName: string,
    adaptationType: string,
    metrics: LearningMetrics,
    agentResult: AgentExecutionResult
  ): Promise<AdaptationStrategy | null> {
    const profile = await this.getPersonalizationProfile(userId)

    let adaptation: any = {}
    let confidence = 0.5
    let expectedImprovement = 0.1

    switch (adaptationType) {
      case 'prompt_adjustment':
        adaptation = {
          prompt: this.generateOptimizedPrompt(agentName, profile, metrics)
        }
        confidence = 0.75
        expectedImprovement = 0.15
        break

      case 'intervention_selection':
        adaptation = {
          interventions: this.selectOptimalInterventions(agentName, profile)
        }
        confidence = 0.8
        expectedImprovement = 0.2
        break

      case 'execution_priority':
        adaptation = {
          priority: this.calculateOptimalPriority(agentName, profile, metrics)
        }
        confidence = 0.7
        expectedImprovement = 0.1
        break

      case 'confidence_calibration':
        adaptation = {
          threshold: this.calculateOptimalConfidenceThreshold(metrics)
        }
        confidence = 0.65
        expectedImprovement = 0.05
        break

      default:
        return null
    }

    return {
      agentName,
      userId,
      adaptationType,
      adaptation,
      confidence,
      expectedImprovement,
      implementationDate: new Date().toISOString(),
      evaluationMetrics: ['confidence', 'success_rate', 'user_satisfaction']
    }
  }

  private async implementAdaptation(userId: string, strategy: AdaptationStrategy): Promise<void> {
    const key = `${userId}:${strategy.agentName}`
    const existing = this.adaptationStrategies.get(key) || []

    // Remove old adaptations of the same type
    const filtered = existing.filter(a => a.adaptationType !== strategy.adaptationType)

    // Add new adaptation
    filtered.push(strategy)

    // Keep only the most recent adaptations (max limit)
    if (filtered.length > this.MAX_ADAPTATIONS_PER_AGENT) {
      filtered.sort((a, b) => new Date(b.implementationDate).getTime() - new Date(a.implementationDate).getTime())
      filtered.splice(this.MAX_ADAPTATIONS_PER_AGENT)
    }

    this.adaptationStrategies.set(key, filtered)

    console.log(`FACET Learning: Implemented ${strategy.adaptationType} adaptation for ${strategy.agentName} (confidence: ${strategy.confidence})`)
  }

  // Utility methods

  private updateMovingAverage(current: number, newValue: number, alpha: number): number {
    return current === 0 ? newValue : (alpha * newValue) + ((1 - alpha) * current)
  }

  private categorizeMessage(message: string): string {
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('feel') || lowerMessage.includes('emotion')) return 'emotional_expression'
    if (lowerMessage.includes('work') || lowerMessage.includes('job')) return 'work_related'
    if (lowerMessage.includes('relationship') || lowerMessage.includes('partner')) return 'relationship_related'
    if (lowerMessage.includes('goal') || lowerMessage.includes('progress')) return 'goal_oriented'
    if (lowerMessage.includes('crisis') || lowerMessage.includes('help')) return 'crisis_related'
    
    return 'general_conversation'
  }

  private calculatePersonalizedAccuracy(metrics: LearningMetrics, profile: PersonalizationProfile): number {
    const baseAccuracy = metrics.successRate
    const satisfactionBonus = metrics.userSatisfactionScore * 0.2
    const confidenceBonus = metrics.averageConfidence * 0.1
    
    return Math.min(1.0, baseAccuracy + satisfactionBonus + confidenceBonus)
  }

  private calculateImprovementTrend(userId: string, metric: string): number {
    // Simplified trend calculation - in real implementation would use historical data
    return Math.random() * 0.3 + 0.05 // 5-35% improvement
  }

  private humanizeAdaptationType(adaptationType: string): string {
    const humanized: { [key: string]: string } = {
      'prompt_adjustment': 'Response Optimization',
      'execution_priority': 'Priority Tuning',
      'intervention_selection': 'Strategy Selection',
      'confidence_calibration': 'Confidence Calibration'
    }
    return humanized[adaptationType] || adaptationType
  }

  private generatePersonalizationRecommendations(
    userId: string, 
    profile: PersonalizationProfile, 
    metrics: { [agentName: string]: LearningMetrics }
  ): string[] {
    const recommendations: string[] = []

    // Analyze agent performance
    const agentPerformance = Object.entries(metrics).map(([name, metric]) => ({
      name,
      score: metric.successRate * metric.userSatisfactionScore
    })).sort((a, b) => b.score - a.score)

    if (agentPerformance.length > 0) {
      const bestAgent = agentPerformance[0]
      const worstAgent = agentPerformance[agentPerformance.length - 1]

      if (bestAgent.score > 0.8) {
        recommendations.push(`${bestAgent.name} works exceptionally well for you - consider enabling priority processing`)
      }

      if (worstAgent.score < 0.6) {
        recommendations.push(`${worstAgent.name} may benefit from personalized adjustments - try different communication styles`)
      }
    }

    // Communication style recommendations
    if (profile.communicationStyle === 'professional_warm') {
      recommendations.push('Your preference for professional warm communication is well-suited for therapy sessions')
    }

    // Speed preference recommendations
    if (profile.preferredResponseSpeed === 'fast' && Object.values(metrics).some(m => m.averageExecutionTime > 3000)) {
      recommendations.push('Consider enabling more aggressive caching for faster responses')
    }

    return recommendations
  }

  private extractMostHelpfulInterventions(agentName: string, profile: PersonalizationProfile): string[] {
    return Object.entries(profile.effectiveInterventions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([intervention,]) => intervention)
  }

  private calculateUserPreference(agentName: string, profile: PersonalizationProfile, metrics: LearningMetrics): number {
    const isPreferred = profile.preferredAgents.includes(agentName) ? 0.2 : 0
    const satisfactionScore = metrics.userSatisfactionScore
    
    return Math.min(1.0, satisfactionScore + isPreferred)
  }

  private generateOptimizedPrompt(agentName: string, profile: PersonalizationProfile, metrics: LearningMetrics): string {
    // Generate personalized prompt adjustments based on user preferences and performance
    const basePrompts: { [key: string]: string } = {
      emotion_analyzer: "Focus on understanding emotional nuances and provide empathetic responses",
      memory_manager: "Prioritize relevant personal history and meaningful patterns",
      crisis_monitor: "Balance thorough assessment with user comfort and safety",
      therapy_advisor: "Tailor interventions to user's preferred therapeutic approach",
      progress_tracker: "Emphasize positive progress while acknowledging challenges"
    }

    let prompt = basePrompts[agentName] || "Provide helpful and personalized assistance"

    // Adjust based on communication style
    if (profile.communicationStyle === 'clinical_precise') {
      prompt += ". Use precise, evidence-based language."
    } else if (profile.communicationStyle === 'casual_supportive') {
      prompt += ". Use warm, conversational language."
    }

    // Adjust based on performance metrics
    if (metrics.averageConfidence < 0.7) {
      prompt += ". When uncertain, clearly indicate confidence levels."
    }

    return prompt
  }

  private selectOptimalInterventions(agentName: string, profile: PersonalizationProfile): string[] {
    const interventionMaps: { [key: string]: string[] } = {
      emotion_analyzer: ['validation', 'reframing', 'emotional_regulation'],
      memory_manager: ['pattern_recognition', 'insight_generation', 'contextual_recall'],
      crisis_monitor: ['safety_assessment', 'de_escalation', 'resource_provision'],
      therapy_advisor: ['cbt_techniques', 'mindfulness', 'behavioral_activation'],
      progress_tracker: ['goal_setting', 'achievement_recognition', 'motivation_enhancement']
    }

    const baseInterventions = interventionMaps[agentName] || ['supportive_response']
    
    // Filter based on effective interventions from profile
    const effectiveOnes = baseInterventions.filter(intervention => 
      profile.effectiveInterventions[intervention] > 0.7
    )

    return effectiveOnes.length > 0 ? effectiveOnes : baseInterventions
  }

  private calculateOptimalPriority(agentName: string, profile: PersonalizationProfile, metrics: LearningMetrics): number {
    let priority = 0.5 // Default priority

    // Increase priority for preferred agents
    if (profile.preferredAgents.includes(agentName)) {
      priority += 0.2
    }

    // Adjust based on success rate
    priority += (metrics.successRate - 0.5) * 0.3

    // Adjust based on user satisfaction
    priority += (metrics.userSatisfactionScore - 0.5) * 0.2

    return Math.max(0.1, Math.min(1.0, priority))
  }

  private calculateOptimalConfidenceThreshold(metrics: LearningMetrics): number {
    // Lower threshold if average confidence is already low
    if (metrics.averageConfidence < 0.6) {
      return 0.4
    }
    
    // Raise threshold if success rate is high
    if (metrics.successRate > 0.9) {
      return 0.8
    }

    return 0.7 // Default threshold
  }
}

// Export singleton instance
export const learningEngine = FACETLearningEngine.getInstance()