import { AgentType, WorkflowMode, AgentResponse, UserContext, Message } from '@/lib/types/agent'
import { SmartRouter } from './smart-router'
import { EmotionAnalyzer } from './emotion-analyzer'
import { MemoryManager } from '@/lib/memory/memory-manager'
import { createClient } from '@/lib/supabase/client'
import { MemoryType } from '@/lib/types/memory'

export interface OrchestratorConfig {
  maxResponseTime: {
    light: number    // 1000ms
    standard: number // 3000ms
    crisis: number   // 2000ms
    deep: number     // 8000ms
  }
  enableParallelProcessing: boolean
  enablePerformanceLogging: boolean
}

export class AgentOrchestrator {
  private smartRouter: SmartRouter
  private emotionAnalyzer: EmotionAnalyzer
  private memoryManager: MemoryManager
  private config: OrchestratorConfig
  private supabase = createClient()

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      maxResponseTime: {
        light: 1000,
        standard: 3000,
        crisis: 2000,
        deep: 8000
      },
      enableParallelProcessing: true,
      enablePerformanceLogging: true,
      ...config
    }

    this.smartRouter = new SmartRouter()
    this.emotionAnalyzer = new EmotionAnalyzer()
    this.memoryManager = new MemoryManager()
  }

  /**
   * Main entry point for processing user messages
   */
  async processMessage(
    userMessage: string,
    userId: string,
    sessionId?: string
  ): Promise<AgentResponse> {
    const startTime = performance.now()

    try {
      // 1. Get user context
      const userContext = await this.getUserContext(userId)

      // 2. Route the conversation
      const routingDecision = await this.smartRouter.routeConversation(userMessage, userContext)

      // 3. Check timeout for workflow mode
      const maxTime = this.config.maxResponseTime[routingDecision.workflowMode]
      const timeoutPromise = new Promise<AgentResponse>((_, reject) => {
        setTimeout(() => reject(new Error('Response timeout')), maxTime)
      })

      // 4. Process with selected workflow
      const responsePromise = this.executeWorkflow(
        userMessage,
        routingDecision,
        userContext,
        sessionId
      )

      // 5. Race against timeout
      const response = await Promise.race([responsePromise, timeoutPromise])

      // 6. Log performance
      const totalTime = performance.now() - startTime
      if (this.config.enablePerformanceLogging) {
        console.log(`${routingDecision.workflowMode} mode completed in ${totalTime}ms (target: ${maxTime}ms)`)
      }

      // 7. Store conversation data
      await this.storeConversationData(userId, sessionId, userMessage, response, routingDecision)

      return response

    } catch (error) {
      console.error('Orchestrator error:', error)
      
      // Return fallback response
      return {
        agentType: 'therapeutic_advisor',
        content: "I'm experiencing a technical issue, but I'm here to support you. How are you feeling right now?",
        confidence: 0.5,
        processingTime: performance.now() - startTime,
        metadata: {
          reasoning: 'Fallback response due to system error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Execute the appropriate workflow based on routing decision
   */
  private async executeWorkflow(
    userMessage: string,
    routingDecision: any,
    userContext: UserContext,
    sessionId?: string
  ): Promise<AgentResponse> {
    switch (routingDecision.workflowMode) {
      case 'crisis':
        return this.executeCrisisWorkflow(userMessage, routingDecision, userContext)
      
      case 'light':
        return this.executeLightWorkflow(userMessage, routingDecision, userContext)
      
      case 'deep':
        return this.executeDeepWorkflow(userMessage, routingDecision, userContext)
      
      case 'standard':
      default:
        return this.executeStandardWorkflow(userMessage, routingDecision, userContext)
    }
  }

  /**
   * Crisis workflow - immediate safety-focused response
   */
  private async executeCrisisWorkflow(
    userMessage: string,
    routingDecision: any,
    userContext: UserContext
  ): Promise<AgentResponse> {
    const crisisResponse = `I'm really concerned about you right now, and I want you to know that you're not alone. Your safety is the most important thing.

If you're having thoughts of hurting yourself, please reach out for immediate help:
• Call 988 (Suicide & Crisis Lifeline) - available 24/7
• Text HOME to 741741 (Crisis Text Line)
• Call 911 if you're in immediate danger

You matter, and there are people who want to help you through this difficult time. Can you tell me if you're in a safe place right now?`

    return {
      agentType: 'crisis_assessor',
      content: crisisResponse,
      confidence: 0.95,
      processingTime: performance.now(),
      metadata: {
        reasoning: 'Crisis intervention response triggered',
        interventions: ['crisis_resources', 'safety_check', 'professional_referral'],
        urgency: 'immediate',
        followUpActions: ['continuous_monitoring', 'safety_plan_activation']
      }
    }
  }

  /**
   * Light workflow - simple, fast responses
   */
  private async executeLightWorkflow(
    userMessage: string,
    routingDecision: any,
    userContext: UserContext
  ): Promise<AgentResponse> {
    const emotion = routingDecision.context.emotionalState

    // Simple empathetic responses based on emotion
    let response = "I hear you. "
    
    if (emotion?.primaryEmotion === 'sadness') {
      response += "It sounds like you're going through a difficult time. I'm here to listen and support you."
    } else if (emotion?.primaryEmotion === 'anxiety') {
      response += "I can sense you might be feeling anxious. Take a deep breath - you're safe here with me."
    } else if (emotion?.primaryEmotion === 'joy') {
      response += "It's wonderful to hear some positivity from you! I'd love to hear more about what's going well."
    } else {
      response += "How are you feeling right now? I'm here to support you in whatever way you need."
    }

    return {
      agentType: 'emotion_analyzer',
      content: response,
      confidence: 0.8,
      processingTime: performance.now(),
      metadata: {
        reasoning: 'Light mode empathetic response',
        interventions: ['emotional_validation', 'supportive_presence']
      }
    }
  }

  /**
   * Standard workflow - balanced therapeutic support
   */
  private async executeStandardWorkflow(
    userMessage: string,
    routingDecision: any,
    userContext: UserContext
  ): Promise<AgentResponse> {
    const emotion = routingDecision.context.emotionalState
    
    let response = "Thank you for sharing that with me. "

    // Provide more comprehensive support based on context
    if (emotion?.intensity > 6) {
      response += `I can sense you're experiencing ${emotion.primaryEmotion} quite intensely right now. That must feel overwhelming. `
      
      if (emotion.primaryEmotion === 'anxiety') {
        response += "Let's try a quick grounding exercise: Can you name 5 things you can see around you right now? This can help bring you back to the present moment."
      } else if (emotion.primaryEmotion === 'sadness') {
        response += "It's okay to feel sad - emotions are valid and important signals. What's been weighing most heavily on your mind lately?"
      } else if (emotion.primaryEmotion === 'anger') {
        response += "Anger often signals that something important to us feels threatened. What's behind these feelings for you?"
      }
    } else {
      response += "I'm here to support you through whatever you're experiencing. What would be most helpful to talk about today?"
    }

    return {
      agentType: 'therapeutic_advisor',
      content: response,
      confidence: 0.85,
      processingTime: performance.now(),
      metadata: {
        reasoning: 'Standard therapeutic response with emotion-specific intervention',
        interventions: ['emotional_validation', 'therapeutic_questioning', 'coping_strategies'],
        recommendations: ['continue_conversation', 'explore_emotions']
      }
    }
  }

  /**
   * Deep workflow - comprehensive therapeutic work
   */
  private async executeDeepWorkflow(
    userMessage: string,
    routingDecision: any,
    userContext: UserContext
  ): Promise<AgentResponse> {
    const emotion = routingDecision.context.emotionalState
    
    // Get contextual memories for deep therapeutic work
    const relevantMemories = await this.memoryManager.getContextualMemories(
      emotion?.primaryEmotion || 'neutral',
      'therapy deep_work patterns',
      userContext.userId
    )

    let response = "I really appreciate you trusting me with something so important. "

    // Use memory context if available
    if (relevantMemories.length > 0) {
      const patternMemories = relevantMemories.filter(m => m.memoryType === 'pattern')
      const insightMemories = relevantMemories.filter(m => m.memoryType === 'insight')
      
      if (patternMemories.length > 0) {
        response += "As we explore this, I'm noticing some patterns from our previous conversations that might be relevant. "
      }
      
      if (insightMemories.length > 0) {
        response += "This also connects to some insights we've discovered together before. "
      }
    }

    // Comprehensive therapeutic response
    response += `What you're sharing shows a lot of courage, and I want to make sure we take the time to really understand what you're going through.

From what you've told me, I'm hearing themes of ${emotion?.primaryEmotion} and it seems like this is affecting you quite significantly. `

    if (userContext.activeGoals.length > 0) {
      response += `I also want to acknowledge the work you've been doing on your goals - that takes real commitment. `
    }

    response += `

Let's explore this together. Sometimes when we're feeling ${emotion?.primaryEmotion}, it can help to understand:
• What situations or thoughts tend to trigger these feelings?
• How does this connect to other experiences you've had?
• What has helped you cope with similar feelings in the past?

What feels most important to focus on right now?`

    return {
      agentType: 'therapeutic_advisor',
      content: response,
      confidence: 0.9,
      processingTime: performance.now(),
      metadata: {
        reasoning: 'Deep therapeutic exploration with CBT framework',
        interventions: [
          'emotional_validation',
          'therapeutic_exploration',
          'pattern_identification',
          'coping_strategy_development'
        ],
        recommendations: [
          'continue_deep_exploration',
          'identify_patterns',
          'develop_coping_strategies',
          'set_therapeutic_goals'
        ],
        followUpActions: [
          'schedule_follow_up',
          'assign_therapeutic_exercises',
          'monitor_progress'
        ]
      }
    }
  }

  /**
   * Get user context for decision making
   */
  private async getUserContext(userId: string): Promise<UserContext> {
    try {
      // Get recent conversation history
      const { data: recentSessions } = await this.supabase
        .from('therapy_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(5)

      // Get recent emotional data
      const { data: emotionalHistory } = await this.supabase
        .from('emotion_tracking')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(10)

      // Get active goals
      const { data: activeGoals } = await this.supabase
        .from('therapeutic_goals')
        .select('goal_title')
        .eq('user_id', userId)
        .eq('status', 'active')

      // Get crisis history
      const { data: crisisHistory } = await this.supabase
        .from('crisis_assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      // Get recent relevant memories
      const recentMemories = await this.memoryManager.retrieveRelevantMemories(
        'recent context conversation therapy',
        userId,
        8, // Get 8 most relevant memories
        0.7 // Lower similarity threshold for broader context
      )

      return {
        userId,
        sessionId: recentSessions?.[0]?.id || '',
        emotionalHistory: emotionalHistory?.map(e => ({
          primaryEmotion: e.primary_emotion,
          intensity: e.emotion_intensity,
          valence: e.emotion_vector[0] || 50,
          arousal: e.emotion_vector[1] || 50,
          confidence: e.confidence_score,
          emotions: {
            joy: 0, sadness: 0, anger: 0, fear: 0, 
            surprise: 0, disgust: 0, anxiety: 0, depression: 0
          },
          linguisticMarkers: e.triggers || [],
          emotionalTrend: 'stable' as const
        })) || [],
        recentMemories: recentMemories.map(memory => ({
          id: memory.id,
          userId,
          content: memory.content,
          timestamp: memory.createdAt,
          type: memory.memoryType as any,
          emotionalContext: {
            primaryEmotion: 'neutral',
            intensity: Math.round(memory.importance * 10),
            valence: 50,
            arousal: 50,
            confidence: memory.score,
            emotions: { joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0, disgust: 0, anxiety: 0, depression: 0 },
            linguisticMarkers: memory.categories,
            emotionalTrend: 'stable' as const
          },
          importance: Math.round(memory.importance * 100),
          tags: memory.categories
        })),
        activeGoals: activeGoals?.map(g => g.goal_title) || [],
        crisisHistory: crisisHistory?.map(c => ({
          riskLevel: c.risk_level as any,
          urgency: 'moderate' as const,
          confidence: c.assessor_confidence,
          triggers: Object.keys(c.identified_risk_factors || {}),
          protectiveFactors: Object.keys(c.protective_factors || {}),
          riskFactors: Object.keys(c.identified_risk_factors || {}),
          immediateActions: [],
          followUpRequired: c.follow_up_scheduled,
          escalationPath: []
        })) || []
      }
    } catch (error) {
      console.error('Error getting user context:', error)
      
      // Return minimal context
      return {
        userId,
        sessionId: '',
        emotionalHistory: [],
        recentMemories: [],
        activeGoals: [],
        crisisHistory: []
      }
    }
  }

  /**
   * Store conversation data for learning and analysis
   */
  private async storeConversationData(
    userId: string,
    sessionId: string | undefined,
    userMessage: string,
    agentResponse: AgentResponse,
    routingDecision: any
  ): Promise<void> {
    try {
      // Create session if needed
      let currentSessionId = sessionId
      if (!currentSessionId) {
        const { data: session } = await this.supabase
          .from('therapy_sessions')
          .insert({
            user_id: userId,
            session_type: routingDecision.workflowMode,
            primary_emotion: routingDecision.context.emotionalState?.primaryEmotion,
            emotion_intensity: routingDecision.context.emotionalState?.intensity,
            risk_level: routingDecision.context.crisisLevel?.riskLevel || 'minimal',
            workflow_used: routingDecision.workflowMode
          })
          .select('id')
          .single()
        
        currentSessionId = session?.id
      }

      if (currentSessionId) {
        // Store user message
        await this.supabase
          .from('conversation_messages')
          .insert({
            session_id: currentSessionId,
            message_type: 'user',
            content: userMessage,
            timestamp: new Date().toISOString()
          })

        // Store agent response
        await this.supabase
          .from('conversation_messages')
          .insert({
            session_id: currentSessionId,
            message_type: 'agent',
            content: agentResponse.content,
            agent_type: agentResponse.agentType,
            workflow_mode: routingDecision.workflowMode,
            response_time_ms: agentResponse.processingTime,
            therapeutic_interventions: agentResponse.metadata,
            timestamp: new Date().toISOString()
          })

        // Store significant user message as memory
        await this.storeSignificantMemory(userId, userMessage, routingDecision, agentResponse)
      }
    } catch (error) {
      console.error('Error storing conversation data:', error)
    }
  }

  /**
   * Store significant conversation elements as memories
   */
  private async storeSignificantMemory(
    userId: string,
    userMessage: string,
    routingDecision: any,
    agentResponse: AgentResponse
  ): Promise<void> {
    try {
      const emotionalContext = routingDecision.context.emotionalState
      const workflowMode = routingDecision.workflowMode

      // Determine if this should be stored as a memory
      let shouldStore = false
      let memoryType: MemoryType = 'event'
      let importance = 0.3

      // Crisis situations always stored with high importance
      if (workflowMode === 'crisis') {
        shouldStore = true
        memoryType = 'crisis'
        importance = 0.9
      }
      // High intensity emotions
      else if (emotionalContext && emotionalContext.intensity > 6) {
        shouldStore = true
        memoryType = 'event'
        importance = 0.7
      }
      // Deep therapeutic work
      else if (workflowMode === 'deep') {
        shouldStore = true
        memoryType = 'insight'
        importance = 0.8
      }
      // Patterns and goals mentioned
      else if (userMessage.toLowerCase().includes('goal') || 
               userMessage.toLowerCase().includes('pattern') ||
               userMessage.toLowerCase().includes('always') ||
               userMessage.toLowerCase().includes('never')) {
        shouldStore = true
        memoryType = userMessage.toLowerCase().includes('goal') ? 'goal' : 'pattern'
        importance = 0.6
      }
      // Preferences expressed
      else if (userMessage.toLowerCase().includes('prefer') ||
               userMessage.toLowerCase().includes('like') ||
               userMessage.toLowerCase().includes('dislike') ||
               userMessage.toLowerCase().includes('hate')) {
        shouldStore = true
        memoryType = 'preference'
        importance = 0.5
      }

      if (shouldStore) {
        // Determine categories based on content and routing
        const categories: string[] = []
        if (emotionalContext) {
          categories.push('emotional-expression')
          if (emotionalContext.primaryEmotion !== 'neutral') {
            categories.push(emotionalContext.primaryEmotion)
          }
        }
        if (workflowMode === 'crisis') categories.push('crisis')
        if (workflowMode === 'deep') categories.push('therapy')
        
        // Extract related goals if mentioned
        const relatedGoals: string[] = []
        if (userMessage.toLowerCase().includes('goal')) {
          relatedGoals.push('mentioned-goal')
        }

        await this.memoryManager.storeMemory(
          userId,
          userMessage,
          memoryType,
          emotionalContext,
          importance,
          categories,
          relatedGoals
        )

        console.log(`Stored ${memoryType} memory for user ${userId} with importance ${importance}`)
      }
    } catch (error) {
      console.error('Error storing memory:', error)
      // Don't throw - memory storage failure shouldn't break the conversation
    }
  }
}