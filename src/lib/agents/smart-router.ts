import { AgentType, WorkflowMode, RoutingDecision, UserContext, EmotionAnalysis, CrisisAssessment } from '@/lib/types/agent'
import { crisisKeywordDetection } from './utils/crisis-detection'
import { emotionAnalysis } from './utils/emotion-analysis'

export interface SmartRouterConfig {
  enableCrisisOverride: boolean
  enablePerformanceLogging: boolean
  fallbackMode: WorkflowMode
}

export class SmartRouter {
  private config: SmartRouterConfig

  constructor(config: SmartRouterConfig = {
    enableCrisisOverride: true,
    enablePerformanceLogging: true,
    fallbackMode: 'standard'
  }) {
    this.config = config
  }

  /**
   * Main routing decision logic - determines workflow mode and agent coordination
   */
  async routeConversation(
    userInput: string,
    userContext: UserContext
  ): Promise<RoutingDecision> {
    const startTime = performance.now()

    try {
      // Step 1: Rapid crisis detection (< 100ms requirement)
      const crisisIndicators = await crisisKeywordDetection(userInput)
      
      // Step 2: If crisis detected, immediately route to crisis mode
      if (crisisIndicators.hasCrisisKeywords || crisisIndicators.riskLevel === 'high') {
        const crisisDecision: RoutingDecision = {
          selectedAgent: 'crisis_assessor',
          workflowMode: 'crisis',
          confidence: crisisIndicators.confidence,
          reasoning: `Crisis keywords detected: ${crisisIndicators.triggerWords.join(', ')}`,
          urgency: 'immediate',
          context: {
            crisisLevel: {
              riskLevel: crisisIndicators.riskLevel as any,
              urgency: 'immediate',
              confidence: crisisIndicators.confidence,
              triggers: crisisIndicators.triggerWords,
              protectiveFactors: [],
              riskFactors: crisisIndicators.triggerWords,
              immediateActions: ['crisis_assessment', 'safety_planning'],
              followUpRequired: true,
              escalationPath: ['crisis_assessor', 'professional_referral']
            } as CrisisAssessment
          }
        }

        if (this.config.enablePerformanceLogging) {
          console.log(`Crisis routing completed in ${performance.now() - startTime}ms`)
        }

        return crisisDecision
      }

      // Step 3: Basic emotion analysis for non-crisis scenarios
      const emotion = await emotionAnalysis(userInput, userContext.emotionalHistory)

      // Step 4: Determine workflow mode based on complexity and context
      const workflowMode = this.determineWorkflowMode(userInput, emotion, userContext)

      // Step 5: Select primary agent based on workflow mode and context
      const selectedAgent = this.selectPrimaryAgent(workflowMode, emotion, userContext)

      // Step 6: Calculate confidence and urgency
      const confidence = this.calculateConfidence(workflowMode, emotion, userContext)
      const urgency = this.determineUrgency(emotion, userContext)

      const decision: RoutingDecision = {
        selectedAgent,
        workflowMode,
        confidence,
        reasoning: this.generateReasoning(workflowMode, selectedAgent, emotion, userContext),
        urgency,
        context: {
          emotionalState: emotion,
          therapeuticGoals: userContext.activeGoals
        }
      }

      if (this.config.enablePerformanceLogging) {
        console.log(`Routing completed in ${performance.now() - startTime}ms for ${workflowMode} mode`)
      }

      return decision

    } catch (error) {
      console.error('Smart Router error:', error)
      
      // Fallback routing decision
      return {
        selectedAgent: 'therapeutic_advisor',
        workflowMode: this.config.fallbackMode,
        confidence: 0.5,
        reasoning: 'Fallback routing due to system error',
        urgency: 'moderate',
        context: {}
      }
    }
  }

  /**
   * Determine workflow mode based on conversation complexity and user context
   */
  private determineWorkflowMode(
    userInput: string,
    emotion: EmotionAnalysis,
    userContext: UserContext
  ): WorkflowMode {
    // Light mode criteria (< 1 second target)
    if (this.isLightModeAppropriate(userInput, emotion, userContext)) {
      return 'light'
    }

    // Deep mode criteria (< 8 seconds target)
    if (this.isDeepModeRequired(userInput, emotion, userContext)) {
      return 'deep'
    }

    // Default to standard mode (< 3 seconds target)
    return 'standard'
  }

  private isLightModeAppropriate(
    userInput: string,
    emotion: EmotionAnalysis,
    userContext: UserContext
  ): boolean {
    // Simple greetings or check-ins
    const simplePatterns = [
      /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
      /^(how are you|thanks|thank you|bye|goodbye)/i,
      /^(yes|no|ok|okay|sure)/i
    ]

    const isSimpleResponse = simplePatterns.some(pattern => pattern.test(userInput.trim()))
    const isNewUser = userContext.recentMemories.length < 3
    const isLowIntensity = emotion.intensity < 5

    return isSimpleResponse && (isNewUser || isLowIntensity)
  }

  private isDeepModeRequired(
    userInput: string,
    emotion: EmotionAnalysis,
    userContext: UserContext
  ): boolean {
    // Complex therapeutic scenarios
    const deepModeIndicators = [
      userInput.length > 200, // Long, complex messages
      emotion.intensity > 7,   // High emotional intensity
      userContext.crisisHistory.length > 0, // Previous crisis events
      userInput.toLowerCase().includes('therapy'),
      userInput.toLowerCase().includes('trauma'),
      userContext.activeGoals.length > 2 // Multiple active goals
    ]

    return deepModeIndicators.filter(Boolean).length >= 2
  }

  /**
   * Select the primary agent based on workflow mode and context
   */
  private selectPrimaryAgent(
    workflowMode: WorkflowMode,
    emotion: EmotionAnalysis,
    userContext: UserContext
  ): AgentType {
    switch (workflowMode) {
      case 'crisis':
        return 'crisis_assessor'
      
      case 'light':
        // Simple emotion analysis for light interactions
        return 'emotion_analyzer'
      
      case 'deep':
        // Complex therapeutic work
        return 'therapeutic_advisor'
      
      case 'standard':
      default:
        // Route based on emotional state and context
        if (emotion.intensity > 6) {
          return 'emotion_analyzer'
        } else if (userContext.activeGoals.length > 0) {
          return 'therapeutic_advisor'
        } else {
          return 'therapeutic_advisor' // Default therapeutic support
        }
    }
  }

  private calculateConfidence(
    workflowMode: WorkflowMode,
    emotion: EmotionAnalysis,
    userContext: UserContext
  ): number {
    let baseConfidence = 0.7

    // Increase confidence for clear patterns
    if (workflowMode === 'crisis') {
      baseConfidence = 0.95
    } else if (emotion.confidence > 0.8) {
      baseConfidence = 0.85
    } else if (userContext.recentMemories.length > 5) {
      baseConfidence = 0.8 // More context = higher confidence
    }

    return Math.min(0.99, baseConfidence)
  }

  private determineUrgency(
    emotion: EmotionAnalysis,
    userContext: UserContext
  ): 'immediate' | 'urgent' | 'moderate' | 'low' {
    if (emotion.intensity > 8) {
      return 'urgent'
    } else if (emotion.intensity > 6) {
      return 'moderate'
    } else {
      return 'low'
    }
  }

  private generateReasoning(
    workflowMode: WorkflowMode,
    selectedAgent: AgentType,
    emotion: EmotionAnalysis,
    userContext: UserContext
  ): string {
    const reasons = []

    reasons.push(`Selected ${workflowMode} workflow mode`)
    reasons.push(`Primary emotion: ${emotion.primaryEmotion} (intensity: ${emotion.intensity})`)
    reasons.push(`Routed to ${selectedAgent} agent`)

    if (userContext.activeGoals.length > 0) {
      reasons.push(`${userContext.activeGoals.length} active therapeutic goals`)
    }

    if (userContext.recentMemories.length > 0) {
      reasons.push(`${userContext.recentMemories.length} recent conversation memories`)
    }

    return reasons.join('. ')
  }
}