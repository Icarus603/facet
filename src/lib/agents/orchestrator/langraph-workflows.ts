/**
 * FACET LangGraph Workflow Definitions
 * 
 * Implements StateGraph workflows exactly as specified in SPECS.md lines 550-634
 * Follows the exact technical specification architecture
 */

import { StateGraph, END } from '@langchain/langgraph'
import { ExecutionPlan } from './execution-planner'
import { 
  ChatRequest, 
  ChatResponse, 
  ExecutionStep, 
  AgentExecutionResult,
  AGENT_NAMES,
  AGENT_CONFIG 
} from '@/lib/types/api-contract'

// State interface matching SPECS.md lines 554-563
export interface FACETState {
  userMessage: string
  userId: string
  messageId: string
  conversationId: string
  userPreferences?: ChatRequest['userPreferences']
  urgencyLevel: 'normal' | 'elevated' | 'crisis'
  
  // Agent Results (matching SPECS.md specification)
  emotionAnalysis?: EmotionResult
  memoryRetrieval?: MemoryResult
  crisisAssessment?: CrisisResult
  therapyAdvice?: TherapyResult
  progressTracking?: ProgressResult
  
  // Orchestration Tracking
  orchestrationLog: ExecutionStep[]
  agentResults: AgentExecutionResult[]
  executionPlan?: ExecutionPlan
  startTime: number
  
  // Final Response
  finalResponse?: string
  responseConfidence?: number
  emotionalState?: ChatResponse['metadata']['emotionalState']
  riskAssessment?: ChatResponse['metadata']['riskAssessment']
  warningFlags?: string[]
  recommendedFollowUp?: string[]
}

// Agent result interfaces matching the mental health domain
export interface EmotionResult {
  valence: number           // -1.0 to 1.0
  arousal: number          // 0.0 to 1.0
  dominance: number        // 0.0 to 1.0
  confidence: number       // 0.0 to 1.0
  primaryEmotion: string   // "anxiety", "sadness", "joy", etc.
  intensity: number        // 0.0 to 1.0
  reasoning: string
  insights: string[]
  recommendations: string[]
  contributedInsights: string[]
}

export interface MemoryResult {
  relevantMemories: any[]
  patterns: string[]
  personalInsights: string[]
  confidence: number
  reasoning: string
  insights: string[]
  recommendations: string[]
  contributedInsights: string[]
}

export interface CrisisResult {
  riskLevel: 'none' | 'low' | 'moderate' | 'high' | 'crisis'
  immediateInterventionRequired: boolean
  professionalReferralRecommended: boolean
  emergencyContactTriggered: boolean
  confidence: number
  reasoning: string
  insights: string[]
  recommendations: string[]
  contributedInsights: string[]
  supportResources?: string[]
}

export interface TherapyResult {
  intervention: string
  techniques: string[]
  copingStrategies: string[]
  confidence: number
  reasoning: string
  insights: string[]
  recommendations: string[]
  contributedInsights: string[]
  followUpSuggestions: string[]
  therapeuticGoals?: string[]
}

export interface ProgressResult {
  progressIndicators: any[]
  achievements: string[]
  areasForImprovement: string[]
  confidence: number
  reasoning: string
  insights: string[]
  recommendations: string[]
  contributedInsights: string[]
}

export class FACETWorkflows {
  private workflow: any // Compiled StateGraph workflow

  constructor() {
    this.initializeWorkflow()
  }

  /**
   * Initialize LangGraph workflow exactly as specified in SPECS.md lines 574-611
   */
  private initializeWorkflow() {
    // Create StateGraph with exact channel specification from SPECS.md
    this.workflow = new StateGraph<FACETState>({
      channels: {
        userMessage: "string",
        userId: "string", 
        messageId: "string",
        conversationId: "string",
        userPreferences: "object",
        urgencyLevel: "string",
        emotionAnalysis: "object",
        memoryRetrieval: "object", 
        crisisAssessment: "object",
        therapyAdvice: "object",
        progressTracking: "object",
        orchestrationLog: "array",
        agentResults: "array",
        executionPlan: "object",
        startTime: "number",
        finalResponse: "string",
        responseConfidence: "number",
        emotionalState: "object",
        riskAssessment: "object",
        warningFlags: "array",
        recommendedFollowUp: "array"
      }
    })

    // Define agent nodes exactly as specified in SPECS.md lines 588-594
    this.workflow.addNode("orchestrator", this.coordinateAgents.bind(this))
    this.workflow.addNode("emotionAnalyzer", this.analyzeEmotion.bind(this))
    this.workflow.addNode("memoryManager", this.retrieveMemories.bind(this))
    this.workflow.addNode("crisisMonitor", this.assessCrisis.bind(this))
    this.workflow.addNode("therapyAdvisor", this.provideCounseling.bind(this))
    this.workflow.addNode("progressTracker", this.trackProgress.bind(this))
    this.workflow.addNode("responseSynthesizer", this.synthesizeResponse.bind(this))

    // Define execution flow with conditional logic (SPECS.md lines 596-610)
    this.workflow.setEntryPoint("orchestrator")
    
    this.workflow.addConditionalEdges(
      "orchestrator",
      this.determineExecutionPath.bind(this),
      {
        "crisis_priority": "crisisMonitor",
        "parallel_analysis": "emotionAnalyzer", 
        "progress_focus": "progressTracker",
        "simple_emotion": "emotionAnalyzer"
      }
    )

    // Crisis conditional routing (SPECS.md lines 598-605)
    this.workflow.addConditionalEdges(
      "crisisMonitor",
      this.shouldContinueAfterCrisis.bind(this),
      {
        "emergency_response": "responseSynthesizer",
        "continue_analysis": "therapyAdvisor"
      }
    )

    // Parallel execution support (SPECS.md lines 607-610)
    this.workflow.addEdge("emotionAnalyzer", "memoryManager")
    this.workflow.addEdge("memoryManager", "therapyAdvisor") 
    this.workflow.addEdge("progressTracker", "memoryManager")
    this.workflow.addEdge("therapyAdvisor", "responseSynthesizer")
    this.workflow.addEdge("responseSynthesizer", END)
  }

  /**
   * Execute workflow and return ChatResponse
   */
  async executeWorkflow(initialState: FACETState): Promise<FACETState> {
    return await this.workflow.invoke(initialState)
  }

  /**
   * Orchestrator coordination node
   */
  private async coordinateAgents(state: FACETState): Promise<Partial<FACETState>> {
    // This will be called by the main orchestrator
    return state
  }

  /**
   * Emotion Analyzer node - processes emotional content
   */
  private async analyzeEmotion(state: FACETState): Promise<Partial<FACETState>> {
    const agentStart = Date.now()
    const startTimeMs = agentStart - state.startTime

    try {
      // Simulate emotion analysis with VAD model
      const emotionResult: EmotionResult = await this.performEmotionAnalysis(state.userMessage)
      const executionTimeMs = Date.now() - agentStart

      const agentResult: AgentExecutionResult = {
        agentName: AGENT_NAMES.EMOTION_ANALYZER,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.EMOTION_ANALYZER].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.EMOTION_ANALYZER].icon,
        assignedTask: 'Analyze emotional content using VAD model',
        inputData: { message: state.userMessage },
        executionTimeMs,
        executionType: 'parallel',
        startTimeMs,
        endTimeMs: startTimeMs + executionTimeMs,
        result: emotionResult,
        confidence: emotionResult.confidence,
        success: true,
        reasoning: emotionResult.reasoning,
        keyInsights: emotionResult.insights,
        recommendationsToOrchestrator: emotionResult.recommendations,
        influenceOnFinalResponse: 0.8,
        contributedInsights: emotionResult.contributedInsights
      }

      const executionStep: ExecutionStep = {
        stepId: `emotion_${Date.now()}`,
        stepNumber: state.orchestrationLog.length + 1,
        description: 'VAD emotional analysis and pattern recognition',
        agentsInvolved: [AGENT_NAMES.EMOTION_ANALYZER],
        executionType: 'parallel',
        startTimeMs,
        durationMs: executionTimeMs,
        dependencies: [],
        status: 'completed',
        results: emotionResult
      }

      return {
        emotionAnalysis: emotionResult,
        agentResults: [...state.agentResults, agentResult],
        orchestrationLog: [...state.orchestrationLog, executionStep],
        emotionalState: {
          valence: emotionResult.valence,
          arousal: emotionResult.arousal,
          dominance: emotionResult.dominance,
          confidence: emotionResult.confidence,
          primaryEmotion: emotionResult.primaryEmotion,
          intensity: emotionResult.intensity
        }
      }
    } catch (error) {
      return this.handleAgentError(state, AGENT_NAMES.EMOTION_ANALYZER, error as Error, agentStart)
    }
  }

  /**
   * Crisis Monitor node - immediate safety assessment
   */
  private async assessCrisis(state: FACETState): Promise<Partial<FACETState>> {
    const agentStart = Date.now()
    const startTimeMs = agentStart - state.startTime

    try {
      const crisisResult: CrisisResult = await this.performCrisisAssessment(
        state.userMessage, 
        state.emotionAnalysis
      )
      const executionTimeMs = Date.now() - agentStart

      const agentResult: AgentExecutionResult = {
        agentName: AGENT_NAMES.CRISIS_MONITOR,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.CRISIS_MONITOR].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.CRISIS_MONITOR].icon,
        assignedTask: 'Real-time risk assessment and safety evaluation',
        inputData: { message: state.userMessage, emotionContext: state.emotionAnalysis },
        executionTimeMs,
        executionType: 'priority',
        startTimeMs,
        endTimeMs: startTimeMs + executionTimeMs,
        result: crisisResult,
        confidence: crisisResult.confidence,
        success: true,
        reasoning: crisisResult.reasoning,
        keyInsights: crisisResult.insights,
        recommendationsToOrchestrator: crisisResult.recommendations,
        influenceOnFinalResponse: crisisResult.riskLevel === 'crisis' ? 1.0 : 0.6,
        contributedInsights: crisisResult.contributedInsights
      }

      const executionStep: ExecutionStep = {
        stepId: `crisis_${Date.now()}`,
        stepNumber: state.orchestrationLog.length + 1,
        description: 'Crisis risk assessment and safety protocols',
        agentsInvolved: [AGENT_NAMES.CRISIS_MONITOR],
        executionType: 'conditional',
        startTimeMs,
        durationMs: executionTimeMs,
        dependencies: [],
        status: 'completed',
        results: crisisResult
      }

      const warningFlags = [...(state.warningFlags || [])]
      if (crisisResult.riskLevel === 'crisis') {
        warningFlags.push('crisis_protocol')
      }
      if (crisisResult.professionalReferralRecommended) {
        warningFlags.push('professional_referral')
      }

      return {
        crisisAssessment: crisisResult,
        agentResults: [...state.agentResults, agentResult],
        orchestrationLog: [...state.orchestrationLog, executionStep],
        riskAssessment: {
          level: crisisResult.riskLevel,
          immediateInterventionRequired: crisisResult.immediateInterventionRequired,
          professionalReferralRecommended: crisisResult.professionalReferralRecommended,
          emergencyContactTriggered: crisisResult.emergencyContactTriggered,
          reasoning: crisisResult.reasoning
        },
        warningFlags
      }
    } catch (error) {
      return this.handleAgentError(state, AGENT_NAMES.CRISIS_MONITOR, error as Error, agentStart)
    }
  }

  /**
   * Memory Manager node - vector-based memory retrieval
   */
  private async retrieveMemories(state: FACETState): Promise<Partial<FACETState>> {
    const agentStart = Date.now()
    const startTimeMs = agentStart - state.startTime

    try {
      const memoryResult: MemoryResult = await this.performMemoryRetrieval(
        state.userMessage,
        state.userId,
        state.emotionAnalysis
      )
      const executionTimeMs = Date.now() - agentStart

      const agentResult: AgentExecutionResult = {
        agentName: AGENT_NAMES.MEMORY_MANAGER,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.MEMORY_MANAGER].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.MEMORY_MANAGER].icon,
        assignedTask: 'Vector-based memory retrieval and pattern recognition',
        inputData: { message: state.userMessage, userId: state.userId },
        executionTimeMs,
        executionType: 'parallel',
        startTimeMs,
        endTimeMs: startTimeMs + executionTimeMs,
        result: memoryResult,
        confidence: memoryResult.confidence,
        success: true,
        reasoning: memoryResult.reasoning,
        keyInsights: memoryResult.insights,
        recommendationsToOrchestrator: memoryResult.recommendations,
        influenceOnFinalResponse: 0.7,
        contributedInsights: memoryResult.contributedInsights
      }

      const executionStep: ExecutionStep = {
        stepId: `memory_${Date.now()}`,
        stepNumber: state.orchestrationLog.length + 1,
        description: 'Contextual memory retrieval and pattern analysis',
        agentsInvolved: [AGENT_NAMES.MEMORY_MANAGER],
        executionType: 'parallel',
        startTimeMs,
        durationMs: executionTimeMs,
        dependencies: [AGENT_NAMES.EMOTION_ANALYZER],
        status: 'completed',
        results: memoryResult
      }

      return {
        memoryRetrieval: memoryResult,
        agentResults: [...state.agentResults, agentResult],
        orchestrationLog: [...state.orchestrationLog, executionStep]
      }
    } catch (error) {
      return this.handleAgentError(state, AGENT_NAMES.MEMORY_MANAGER, error as Error, agentStart)
    }
  }

  /**
   * Therapy Advisor node - CBT/DBT interventions
   */
  private async provideCounseling(state: FACETState): Promise<Partial<FACETState>> {
    const agentStart = Date.now()
    const startTimeMs = agentStart - state.startTime

    try {
      const therapyResult: TherapyResult = await this.performTherapyAdvising(
        state.userMessage,
        state.emotionAnalysis,
        state.memoryRetrieval,
        state.crisisAssessment,
        state.userPreferences
      )
      const executionTimeMs = Date.now() - agentStart

      const agentResult: AgentExecutionResult = {
        agentName: AGENT_NAMES.THERAPY_ADVISOR,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.THERAPY_ADVISOR].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.THERAPY_ADVISOR].icon,
        assignedTask: 'CBT/DBT intervention recommendations and coping strategies',
        inputData: {
          message: state.userMessage,
          emotionContext: state.emotionAnalysis,
          memoryContext: state.memoryRetrieval,
          crisisContext: state.crisisAssessment
        },
        executionTimeMs,
        executionType: 'serial',
        startTimeMs,
        endTimeMs: startTimeMs + executionTimeMs,
        result: therapyResult,
        confidence: therapyResult.confidence,
        success: true,
        reasoning: therapyResult.reasoning,
        keyInsights: therapyResult.insights,
        recommendationsToOrchestrator: therapyResult.recommendations,
        influenceOnFinalResponse: 0.9,
        contributedInsights: therapyResult.contributedInsights
      }

      const executionStep: ExecutionStep = {
        stepId: `therapy_${Date.now()}`,
        stepNumber: state.orchestrationLog.length + 1,
        description: 'Therapeutic intervention and personalized guidance',
        agentsInvolved: [AGENT_NAMES.THERAPY_ADVISOR],
        executionType: 'serial',
        startTimeMs,
        durationMs: executionTimeMs,
        dependencies: [AGENT_NAMES.MEMORY_MANAGER],
        status: 'completed',
        results: therapyResult
      }

      return {
        therapyAdvice: therapyResult,
        agentResults: [...state.agentResults, agentResult],
        orchestrationLog: [...state.orchestrationLog, executionStep],
        recommendedFollowUp: therapyResult.followUpSuggestions || []
      }
    } catch (error) {
      return this.handleAgentError(state, AGENT_NAMES.THERAPY_ADVISOR, error as Error, agentStart)
    }
  }

  /**
   * Progress Tracker node - goal monitoring and achievement analysis
   */
  private async trackProgress(state: FACETState): Promise<Partial<FACETState>> {
    const agentStart = Date.now()
    const startTimeMs = agentStart - state.startTime

    try {
      const progressResult: ProgressResult = await this.performProgressTracking(
        state.userId,
        state.emotionAnalysis,
        state.therapyAdvice
      )
      const executionTimeMs = Date.now() - agentStart

      const agentResult: AgentExecutionResult = {
        agentName: AGENT_NAMES.PROGRESS_TRACKER,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.PROGRESS_TRACKER].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.PROGRESS_TRACKER].icon,
        assignedTask: 'Goal monitoring and therapeutic outcome measurement',
        inputData: { userId: state.userId, emotionContext: state.emotionAnalysis },
        executionTimeMs,
        executionType: 'parallel',
        startTimeMs,
        endTimeMs: startTimeMs + executionTimeMs,
        result: progressResult,
        confidence: progressResult.confidence,
        success: true,
        reasoning: progressResult.reasoning,
        keyInsights: progressResult.insights,
        recommendationsToOrchestrator: progressResult.recommendations,
        influenceOnFinalResponse: 0.5,
        contributedInsights: progressResult.contributedInsights
      }

      const executionStep: ExecutionStep = {
        stepId: `progress_${Date.now()}`,
        stepNumber: state.orchestrationLog.length + 1,
        description: 'Progress monitoring and achievement analysis',
        agentsInvolved: [AGENT_NAMES.PROGRESS_TRACKER],
        executionType: 'parallel',
        startTimeMs,
        durationMs: executionTimeMs,
        dependencies: [],
        status: 'completed',
        results: progressResult
      }

      return {
        progressTracking: progressResult,
        agentResults: [...state.agentResults, agentResult],
        orchestrationLog: [...state.orchestrationLog, executionStep]
      }
    } catch (error) {
      return this.handleAgentError(state, AGENT_NAMES.PROGRESS_TRACKER, error as Error, agentStart)
    }
  }

  /**
   * Response Synthesizer node - creates final therapeutic response
   */
  private async synthesizeResponse(state: FACETState): Promise<Partial<FACETState>> {
    const synthesisStart = Date.now()
    
    try {
      const finalResponse = await this.generateFinalResponse(
        state.userMessage,
        state.emotionAnalysis,
        state.memoryRetrieval,
        state.crisisAssessment,
        state.therapyAdvice,
        state.progressTracking,
        state.userPreferences
      )

      const executionStep: ExecutionStep = {
        stepId: `synthesis_${Date.now()}`,
        stepNumber: state.orchestrationLog.length + 1,
        description: 'Response synthesis and quality assurance',
        agentsInvolved: ['response_synthesizer'],
        executionType: 'serial',
        startTimeMs: synthesisStart - state.startTime,
        durationMs: Date.now() - synthesisStart,
        dependencies: [AGENT_NAMES.THERAPY_ADVISOR],
        status: 'completed',
        results: { response: finalResponse.content }
      }

      return {
        finalResponse: finalResponse.content,
        responseConfidence: finalResponse.confidence,
        orchestrationLog: [...state.orchestrationLog, executionStep]
      }
    } catch (error) {
      console.error('Response synthesis error:', error)
      
      return {
        finalResponse: "I'm here to support you. How are you feeling right now?",
        responseConfidence: 0.5,
        orchestrationLog: [...state.orchestrationLog, {
          stepId: `synthesis_error_${Date.now()}`,
          stepNumber: state.orchestrationLog.length + 1,
          description: 'Response synthesis (fallback)',
          agentsInvolved: ['response_synthesizer'],
          executionType: 'serial',
          startTimeMs: synthesisStart - state.startTime,
          durationMs: Date.now() - synthesisStart,
          dependencies: [],
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown synthesis error'
        }]
      }
    }
  }

  // Routing and control methods
  private determineExecutionPath(state: FACETState): string {
    if (state.crisisAssessment?.riskLevel === 'crisis' || state.urgencyLevel === 'crisis') {
      return 'crisis_priority'
    }
    if (state.executionPlan?.strategy.includes('progress')) {
      return 'progress_focus'
    }
    if (state.executionPlan?.strategy.includes('parallel')) {
      return 'parallel_analysis'
    }
    return 'simple_emotion'
  }

  private shouldContinueAfterCrisis(state: FACETState): string {
    if (state.riskAssessment?.immediateInterventionRequired) {
      return 'emergency_response'
    }
    return 'continue_analysis'
  }

  // Placeholder implementations for agent logic
  private async performEmotionAnalysis(message: string): Promise<EmotionResult> {
    // Implementation will be in separate emotion-analyzer.ts file
    return {
      valence: 0.2,
      arousal: 0.6,
      dominance: 0.5,
      confidence: 0.85,
      primaryEmotion: 'anxiety',
      intensity: 0.7,
      reasoning: 'Detected anxious language patterns with moderate intensity',
      insights: ['User expressing concern about current situation'],
      recommendations: ['Provide calming support and validation'],
      contributedInsights: ['Emotional validation needed']
    }
  }

  private async performCrisisAssessment(message: string, emotionContext?: EmotionResult): Promise<CrisisResult> {
    const hascrisisKeywords = this.detectCrisisKeywords(message)
    
    return {
      riskLevel: hascrisisKeywords ? 'crisis' : 'low',
      immediateInterventionRequired: hascrisisKeywords,
      professionalReferralRecommended: hascrisisKeywords,
      emergencyContactTriggered: hascrisisKeywords,
      confidence: 0.9,
      reasoning: hascrisisKeywords ? 
        'High-risk language detected requiring immediate intervention' :
        'No immediate crisis indicators detected',
      insights: hascrisisKeywords ? ['Crisis intervention needed'] : [],
      recommendations: hascrisisKeywords ? ['Immediate safety protocols'] : [],
      contributedInsights: hascrisisKeywords ? ['Crisis protocols activated'] : [],
      supportResources: hascrisisKeywords ? ['988 Suicide & Crisis Lifeline', 'Crisis Text Line: 741741'] : undefined
    }
  }

  private async performMemoryRetrieval(message: string, userId: string, emotionContext?: EmotionResult): Promise<MemoryResult> {
    return {
      relevantMemories: [],
      patterns: ['Sleep and mood correlation'],
      personalInsights: ['User tends to feel anxious during work stress'],
      confidence: 0.7,
      reasoning: 'Retrieved contextual conversation history and patterns',
      insights: ['Similar emotional patterns identified from previous sessions'],
      recommendations: ['Reference past coping strategies that worked'],
      contributedInsights: ['Personal context integrated']
    }
  }

  private async performTherapyAdvising(
    message: string, 
    emotion?: EmotionResult, 
    memory?: MemoryResult, 
    crisis?: CrisisResult,
    preferences?: ChatRequest['userPreferences']
  ): Promise<TherapyResult> {
    if (crisis?.riskLevel === 'crisis') {
      return {
        intervention: 'crisis_intervention',
        techniques: ['immediate_safety_planning', 'professional_referral'],
        copingStrategies: ['reach_out_for_help', 'crisis_hotline'],
        confidence: 0.95,
        reasoning: 'Crisis situation requires immediate professional intervention',
        insights: ['User in crisis requiring immediate support'],
        recommendations: ['Emergency protocols activated'],
        contributedInsights: ['Crisis intervention provided'],
        followUpSuggestions: ['Are you in a safe place right now?'],
        therapeuticGoals: ['immediate_safety']
      }
    }

    return {
      intervention: 'supportive_validation',
      techniques: ['active_listening', 'emotional_validation'],
      copingStrategies: ['deep_breathing', 'grounding_exercises'],
      confidence: 0.8,
      reasoning: 'Providing empathetic support based on emotional state and context',
      insights: ['User needs validation and coping strategies'],
      recommendations: ['Continue supportive therapeutic approach'],
      contributedInsights: ['Therapeutic support and validation provided'],
      followUpSuggestions: ['How are you feeling about trying these techniques?'],
      therapeuticGoals: ['emotional_regulation', 'stress_management']
    }
  }

  private async performProgressTracking(userId: string, emotion?: EmotionResult, therapy?: TherapyResult): Promise<ProgressResult> {
    return {
      progressIndicators: ['engagement_level', 'emotional_stability'],
      achievements: ['Consistent session attendance'],
      areasForImprovement: ['Stress management techniques'],
      confidence: 0.6,
      reasoning: 'Tracking therapeutic engagement and emotional progress',
      insights: ['User showing consistent engagement with therapy'],
      recommendations: ['Continue current therapeutic approach'],
      contributedInsights: ['Progress monitoring data available']
    }
  }

  private async generateFinalResponse(
    message: string,
    emotion?: EmotionResult,
    memory?: MemoryResult,
    crisis?: CrisisResult,
    therapy?: TherapyResult,
    progress?: ProgressResult,
    preferences?: ChatRequest['userPreferences']
  ): Promise<{ content: string, confidence: number }> {
    
    if (crisis?.riskLevel === 'crisis') {
      return {
        content: "I'm really concerned about you right now, and I want you to know that you're not alone. Your safety is the most important thing. Please reach out for immediate help:\n\n• Call 988 (Suicide & Crisis Lifeline) - available 24/7\n• Text HOME to 741741 (Crisis Text Line)\n• Call 911 if you're in immediate danger\n\nYou matter, and there are people who want to help you through this difficult time. Can you tell me if you're in a safe place right now?",
        confidence: 0.95
      }
    }

    let response = "I hear you, and I want you to know that I'm here to support you. "
    
    if (emotion?.primaryEmotion === 'anxiety') {
      response += "I can sense you might be feeling anxious. That's completely understandable, and it's okay to feel this way. "
      
      if (therapy?.copingStrategies.includes('deep_breathing')) {
        response += "Let's try a quick grounding exercise: Can you take a slow, deep breath with me and name 5 things you can see around you right now? This can help bring you back to the present moment. "
      }
    } else if (emotion?.primaryEmotion === 'sadness') {
      response += "I can hear that you're going through a difficult time. It's okay to feel sad - your emotions are valid and important. "
    }

    if (memory?.patterns.length && memory.patterns.includes('Sleep and mood correlation')) {
      response += "I notice this connects to some patterns we've discussed before, particularly around how your sleep affects your mood. "
    }

    response += "What would be most helpful to focus on together today?"

    return {
      content: response,
      confidence: 0.85
    }
  }

  private detectCrisisKeywords(message: string): boolean {
    const crisisPatterns = [
      'want to end it all',
      'hurt myself', 
      'kill myself',
      'suicide',
      'want to die',
      'end my life',
      'no point in living',
      'better off dead'
    ]
    
    const lowerMessage = message.toLowerCase()
    return crisisPatterns.some(pattern => lowerMessage.includes(pattern))
  }

  private handleAgentError(state: FACETState, agentName: string, error: Error, startTime: number): Partial<FACETState> {
    const executionStep: ExecutionStep = {
      stepId: `error_${agentName}_${Date.now()}`,
      stepNumber: state.orchestrationLog.length + 1,
      description: `${agentName} execution failed`,
      agentsInvolved: [agentName],
      executionType: 'serial',
      startTimeMs: startTime - state.startTime,
      durationMs: Date.now() - startTime,
      dependencies: [],
      status: 'error',
      errorMessage: error.message
    }

    return {
      orchestrationLog: [...state.orchestrationLog, executionStep],
      warningFlags: [...(state.warningFlags || []), 'agent_error']
    }
  }

  getWorkflow(): StateGraph<FACETState> {
    return this.workflow
  }
}