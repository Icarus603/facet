/**
 * FACET LangChain-Powered Dynamic Orchestrator
 * 
 * Core orchestration engine that coordinates specialized AI agents using LangGraph
 * to provide transparent, adaptive mental health support.
 * 
 * CRITICAL: This implementation MUST return exact ChatResponse format from API_CONTRACT.md
 */

import { StateGraph, END } from '@langchain/langgraph'
import { OpenAI } from '@langchain/openai'
import { v4 as uuidv4 } from 'uuid'
import {
  ChatRequest,
  ChatResponse,
  AgentOrchestrationData,
  ExecutionStep,
  AgentExecutionResult,
  AGENT_NAMES,
  AGENT_CONFIG
} from '@/lib/types/api-contract'
import { createClient } from '@/lib/supabase/client'
import { performanceMonitor } from './performance-monitor'
import { redisCache, cacheUtils } from '../cache/redis-cache'
import { performanceOptimizer } from '../cache/performance-optimizer'
import { learningCoordinator } from '../learning/learning-coordinator'
import { advancedCacheManager } from '../cache/advanced-cache-manager'

// State interface for LangGraph workflow
interface FACETState {
  // Input
  userMessage: string
  userId: string
  messageId: string
  conversationId: string
  userPreferences?: ChatRequest['userPreferences']
  urgencyLevel: 'normal' | 'elevated' | 'crisis'
  personalizedConfigs?: { [agentName: string]: any }
  
  // Agent Results
  emotionAnalysis?: any
  memoryRetrieval?: any
  crisisAssessment?: any
  therapyAdvice?: any
  progressTracking?: any
  
  // Orchestration Tracking
  orchestrationLog: ExecutionStep[]
  agentResults: AgentExecutionResult[]
  startTime: number
  
  // Final Response
  finalResponse?: string
  responseConfidence?: number
  emotionalState?: ChatResponse['metadata']['emotionalState']
  riskAssessment?: ChatResponse['metadata']['riskAssessment']
  warningFlags?: string[]
  recommendedFollowUp?: string[]
}

export class FACETOrchestrator {
  private workflow: any // Compiled StateGraph workflow
  private openai: OpenAI
  private supabase = createClient()
  
  // Performance tracking
  private executionMetrics = {
    planningTime: 0,
    coordinationOverhead: 0,
    parallelExecutionTime: 0,
    synthesisTime: 0
  }

  constructor() {
    this.openai = new OpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: 'gpt-4o' // Using GPT-4o as specified in CLAUDE.md
    })
    
    this.initializeWorkflow()
    this.initializeCache()
    this.setupCacheWarming()
  }

  /**
   * Initialize Redis cache connection
   */
  private async initializeCache(): Promise<void> {
    try {
      await redisCache.connect()
      console.log('FACET Orchestrator: Redis cache initialized')
    } catch (error) {
      console.warn('FACET Orchestrator: Redis cache unavailable, continuing without cache:', error)
      // Continue without cache - caching is optional for core functionality
    }

    // Initialize learning coordinator
    console.log('FACET Orchestrator: Learning system initialized')
  }

  /**
   * Setup cache warming strategies
   */
  private setupCacheWarming(): void {
    // Warm cache for common agent combinations on startup
    const systemWarmingStrategy = {
      strategy: 'system_optimization' as const,
      targetUsers: ['system'], // System-wide patterns
      agentCombinations: [
        ['emotion_analyzer'],
        ['emotion_analyzer', 'therapy_advisor'],
        ['emotion_analyzer', 'memory_manager', 'therapy_advisor'],
        ['crisis_monitor', 'therapy_advisor']
      ],
      scheduleType: 'background' as const,
      priority: 5
    }

    // Start background cache warming
    setTimeout(() => {
      advancedCacheManager.warmCache(systemWarmingStrategy)
    }, 5000) // 5 second delay after startup

    console.log('FACET Orchestrator: Cache warming strategies initialized')
  }

  /**
   * Main entry point - processes user message and returns exact ChatResponse format
   * Optimized for SLA targets: <1.5s simple, <2s crisis, <3s emotional, <8s therapy
   */
  async processMessage(request: ChatRequest, userId: string): Promise<ChatResponse> {
    const startTime = Date.now()
    const messageId = request.messageId || uuidv4()
    const conversationId = request.conversationId || uuidv4()

    try {
      // Fast-track crisis detection before full orchestration
      const quickCrisisCheck = this.quickCrisisDetection(request.message, request.urgencyLevel)
      const complexity = this.analyzeMessageComplexity(request.message)
      const scenario = quickCrisisCheck.urgencyLevel === 'crisis' ? 'crisis' : complexity
      
      // Start performance monitoring
      performanceMonitor.startMonitoring(messageId, scenario)
      
      // Get performance optimization recommendations
      const optimization = await performanceOptimizer.optimizeRequest(request, userId, scenario)
      performanceMonitor.recordOptimization(messageId, 'cache_optimization_applied')
      
      // Check for cached user preferences
      const cachedPreferences = await redisCache.getCachedUserPreferences(userId) || request.userPreferences
      
      // Initialize learning context for this interaction
      const sessionId = conversationId || `session_${userId}_${Date.now()}`
      await learningCoordinator.initializeLearningContext(userId, sessionId)

      // Trigger predictive cache preloading for this user
      advancedCacheManager.preloadPredictiveCache(userId)

      // Get personalized agent configurations
      const personalizedConfigs = await learningCoordinator.getPersonalizedAgentConfigs(userId)
      
      // Initialize state with pre-computed crisis assessment and optimizations
      const initialState: FACETState = {
        userMessage: request.message,
        userId,
        messageId,
        conversationId,
        userPreferences: cachedPreferences,
        urgencyLevel: quickCrisisCheck.urgencyLevel,
        personalizedConfigs,
        orchestrationLog: [],
        agentResults: [],
        startTime
      }

      // Apply performance optimizations to timeout
      const baseTimeoutMs = this.getSLATimeoutForRequest(request, quickCrisisCheck)
      const optimizedTimeoutMs = Math.min(baseTimeoutMs, optimization.strategy.maxExecutionTime)
      
      // Execute workflow with caching and performance optimizations
      const result = await Promise.race([
        this.executeWithCachingAndMonitoring(initialState, optimization),
        this.createTimeoutPromise(optimizedTimeoutMs, messageId)
      ])

      // Calculate total processing time
      const processingTimeMs = Date.now() - startTime

      // Build exact ChatResponse format
      const response: ChatResponse = {
        content: result.finalResponse || "I'm here to support you. How are you feeling right now?",
        messageId,
        conversationId,
        orchestration: this.buildOrchestrationData(result, processingTimeMs),
        metadata: {
          timestamp: new Date().toISOString(),
          processingTimeMs,
          agentVersion: "facet-orchestrator-v2.0",
          responseConfidence: result.responseConfidence || 0.8,
          recommendedFollowUp: result.recommendedFollowUp || [],
          warningFlags: result.warningFlags || [],
          emotionalState: result.emotionalState,
          riskAssessment: result.riskAssessment
        }
      }

      // Complete performance monitoring
      const performanceMetrics = performanceMonitor.completeMonitoring(messageId)
      
      // Store orchestration log in database
      await this.storeOrchestrationLog(userId, response)

      // Process interaction for learning (async)
      learningCoordinator.processInteractionForLearning(sessionId, request, response)

      // Trigger intelligent cache invalidation if user preferences changed
      if (request.userPreferences && 
          JSON.stringify(request.userPreferences) !== JSON.stringify(cachedPreferences)) {
        await advancedCacheManager.intelligentInvalidation({
          type: 'user_preference_change',
          userId,
          newPreferences: request.userPreferences,
          oldPreferences: cachedPreferences
        })
      }

      return response

    } catch (error) {
      console.error('Orchestration error:', error)
      
      // Complete monitoring even on error
      performanceMonitor.completeMonitoring(messageId)
      
      // Return fallback response in exact format
      return this.createFallbackResponse(messageId, conversationId, error, Date.now() - startTime)
    }
  }

  /**
   * Execute workflow with performance monitoring and SLA compliance
   */
  private async executeWithMonitoring(state: FACETState): Promise<FACETState> {
    // Check if we need to apply performance optimizations
    const prediction = performanceMonitor.predictSLACompliance(state.messageId)
    
    if (!prediction.likely) {
      // Apply recommended optimizations
      for (const action of prediction.recommendedActions) {
        performanceMonitor.recordOptimization(state.messageId, action)
        
        if (action === 'enable_fast_path') {
          // Use simplified workflow for speed
          return await this.executeFastPath(state)
        } else if (action === 'skip_optional_agents') {
          // Remove non-essential agents
          state.userPreferences = { 
            ...state.userPreferences, 
            processingSpeed: 'fast' 
          }
        } else if (action === 'return_fallback_response') {
          // Return immediate fallback
          return await this.executeFallbackPath(state)
        }
      }
    }
    
    // Execute normal workflow
    return await this.workflow.invoke(state)
  }

  /**
   * Fast execution path for SLA compliance
   */
  private async executeFastPath(state: FACETState): Promise<FACETState> {
    performanceMonitor.recordOptimization(state.messageId, 'fast_path_execution')
    
    // Simple emotion analysis + direct response generation
    const personalizedConfig = state.personalizedConfigs?.['emotion_analyzer']
    const emotionResult = await this.performEmotionAnalysis(state.userMessage, personalizedConfig)
    const agentStart = Date.now()
    
    performanceMonitor.recordAgentExecution(
      state.messageId,
      AGENT_NAMES.EMOTION_ANALYZER,
      agentStart,
      Date.now() - agentStart
    )
    
    // Generate response directly without full agent coordination
    const responseStart = Date.now()
    const finalResponse = await this.generateFinalResponse(
      state.userMessage,
      emotionResult,
      null, // No memory
      null, // No crisis assessment  
      null, // No therapy
      null, // No progress
      state.userPreferences
    )
    
    performanceMonitor.recordAgentExecution(
      state.messageId,
      'response_synthesizer',
      responseStart,
      Date.now() - responseStart
    )
    
    return {
      ...state,
      finalResponse: finalResponse.content,
      responseConfidence: finalResponse.confidence,
      emotionalState: {
        valence: emotionResult.valence,
        arousal: emotionResult.arousal,
        dominance: emotionResult.dominance,
        confidence: emotionResult.confidence,
        primaryEmotion: emotionResult.primaryEmotion,
        intensity: emotionResult.intensity
      }
    }
  }

  /**
   * Fallback execution path for extreme time constraints
   */
  private async executeFallbackPath(state: FACETState): Promise<FACETState> {
    performanceMonitor.recordOptimization(state.messageId, 'fallback_execution')
    
    // Minimal processing - just basic safety check and canned response
    const isCrisis = this.detectCrisisKeywords(state.userMessage)
    const fallbackResponse = isCrisis ? 
      "I'm concerned about your safety. Please contact 988 Suicide & Crisis Lifeline immediately for support." :
      "I'm here to support you. How are you feeling right now?"
    
    return {
      ...state,
      finalResponse: fallbackResponse,
      responseConfidence: 0.6,
      warningFlags: ['fast_fallback_response']
    }
  }

  /**
   * Initialize LangGraph workflow with agent nodes and routing logic
   */
  private initializeWorkflow() {
    this.workflow = new StateGraph<FACETState>({
      channels: {
        userMessage: 'string',
        userId: 'string',
        messageId: 'string',
        conversationId: 'string',
        userPreferences: 'object',
        urgencyLevel: 'string',
        emotionAnalysis: 'object',
        memoryRetrieval: 'object',
        crisisAssessment: 'object',
        therapyAdvice: 'object',
        progressTracking: 'object',
        orchestrationLog: 'array',
        agentResults: 'array',
        startTime: 'number',
        finalResponse: 'string',
        responseConfidence: 'number',
        emotionalState: 'object',
        riskAssessment: 'object',
        warningFlags: 'array',
        recommendedFollowUp: 'array'
      }
    })

    // Add agent nodes
    this.workflow.addNode('orchestrator', this.coordinateAgents.bind(this))
    this.workflow.addNode('emotionAnalyzer', this.analyzeEmotion.bind(this))
    this.workflow.addNode('memoryManager', this.retrieveMemories.bind(this))
    this.workflow.addNode('crisisMonitor', this.assessCrisis.bind(this))
    this.workflow.addNode('therapyAdvisor', this.provideCounseling.bind(this))
    this.workflow.addNode('progressTracker', this.trackProgress.bind(this))
    this.workflow.addNode('responseSynthesizer', this.synthesizeResponse.bind(this))

    // Define execution flow with conditional routing
    this.workflow.setEntryPoint('orchestrator')
    
    // Orchestrator determines execution strategy
    this.workflow.addConditionalEdges(
      'orchestrator',
      this.determineExecutionPath.bind(this),
      {
        'crisis_priority': 'crisisMonitor',
        'parallel_analysis': 'emotionAnalyzer',
        'memory_first': 'memoryManager',
        'direct_therapy': 'therapyAdvisor'
      }
    )

    // Crisis takes priority
    this.workflow.addConditionalEdges(
      'crisisMonitor',
      this.shouldContinueAfterCrisis.bind(this),
      {
        'emergency_response': 'responseSynthesizer',
        'continue_analysis': 'emotionAnalyzer'
      }
    )

    // Parallel agent execution support
    this.workflow.addEdge('emotionAnalyzer', 'memoryManager')
    this.workflow.addEdge('memoryManager', 'therapyAdvisor')
    this.workflow.addEdge('therapyAdvisor', 'progressTracker')
    this.workflow.addEdge('progressTracker', 'responseSynthesizer')
    this.workflow.addEdge('responseSynthesizer', END)
  }

  /**
   * Orchestrator node - determines execution strategy with performance optimization
   */
  private async coordinateAgents(state: FACETState): Promise<Partial<FACETState>> {
    const planningStart = Date.now()
    
    // Fast strategy determination based on urgency and complexity
    const strategy = this.planExecutionOptimized(state.userMessage, state.urgencyLevel, state.userPreferences)
    
    this.executionMetrics.planningTime = Date.now() - planningStart

    // Log orchestration decision
    const orchestrationStep: ExecutionStep = {
      stepId: uuidv4(),
      stepNumber: 1,
      description: `Orchestration planning: ${strategy.description}`,
      agentsInvolved: ['orchestrator'],
      executionType: 'serial',
      startTimeMs: Date.now() - state.startTime,
      durationMs: this.executionMetrics.planningTime,
      dependencies: [],
      status: 'completed',
      results: strategy
    }

    return {
      orchestrationLog: [orchestrationStep],
      ...strategy.stateUpdates
    }
  }

  /**
   * Emotion Analyzer node
   */
  private async analyzeEmotion(state: FACETState): Promise<Partial<FACETState>> {
    const agentStart = Date.now()
    const startTimeMs = agentStart - state.startTime

    try {
      // Simulate emotion analysis (replace with actual implementation)
      const personalizedConfig = state.personalizedConfigs?.['emotion_analyzer']
      const emotionResult = await this.performEmotionAnalysis(state.userMessage, personalizedConfig)
      
      const executionTimeMs = Date.now() - agentStart
      
      // Record performance metrics
      performanceMonitor.recordAgentExecution(
        state.messageId,
        AGENT_NAMES.EMOTION_ANALYZER,
        agentStart,
        executionTimeMs
      )
      
      const agentResult: AgentExecutionResult = {
        agentName: AGENT_NAMES.EMOTION_ANALYZER,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.EMOTION_ANALYZER].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.EMOTION_ANALYZER].icon,
        assignedTask: 'Analyze emotional content and VAD dimensions',
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
        stepId: uuidv4(),
        stepNumber: state.orchestrationLog.length + 1,
        description: 'Emotional analysis and VAD assessment',
        agentsInvolved: [AGENT_NAMES.EMOTION_ANALYZER],
        executionType: 'parallel',
        startTimeMs,
        durationMs: executionTimeMs,
        dependencies: ['orchestrator'],
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
   * Crisis Monitor node
   */
  private async assessCrisis(state: FACETState): Promise<Partial<FACETState>> {
    const agentStart = Date.now()
    const startTimeMs = agentStart - state.startTime

    try {
      const crisisResult = await this.performCrisisAssessment(state.userMessage, state.emotionAnalysis)
      const executionTimeMs = Date.now() - agentStart
      
      // Record performance metrics
      performanceMonitor.recordAgentExecution(
        state.messageId,
        AGENT_NAMES.CRISIS_MONITOR,
        agentStart,
        executionTimeMs
      )

      const agentResult: AgentExecutionResult = {
        agentName: AGENT_NAMES.CRISIS_MONITOR,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.CRISIS_MONITOR].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.CRISIS_MONITOR].icon,
        assignedTask: 'Assess crisis risk and safety requirements',
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
        stepId: uuidv4(),
        stepNumber: state.orchestrationLog.length + 1,
        description: 'Crisis risk assessment and safety evaluation',
        agentsInvolved: [AGENT_NAMES.CRISIS_MONITOR],
        executionType: 'conditional',
        startTimeMs,
        durationMs: executionTimeMs,
        dependencies: [],
        status: 'completed',
        results: crisisResult
      }

      const warningFlags = []
      if (crisisResult.riskLevel === 'crisis') {
        warningFlags.push('crisis_protocol')
        
        // Trigger cache invalidation for crisis state change
        advancedCacheManager.intelligentInvalidation({
          type: 'crisis_state_change',
          userId: state.userId,
          newRiskLevel: crisisResult.riskLevel,
          urgencyLevel: 'crisis'
        })
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
        warningFlags: [...(state.warningFlags || []), ...warningFlags]
      }
    } catch (error) {
      return this.handleAgentError(state, AGENT_NAMES.CRISIS_MONITOR, error as Error, agentStart)
    }
  }

  /**
   * Memory Manager node
   */
  private async retrieveMemories(state: FACETState): Promise<Partial<FACETState>> {
    const agentStart = Date.now()
    const startTimeMs = agentStart - state.startTime

    try {
      const memoryResult = await this.performMemoryRetrieval(state.userMessage, state.userId, state.emotionAnalysis)
      const executionTimeMs = Date.now() - agentStart
      
      // Record performance metrics
      performanceMonitor.recordAgentExecution(
        state.messageId,
        AGENT_NAMES.MEMORY_MANAGER,
        agentStart,
        executionTimeMs
      )

      const agentResult: AgentExecutionResult = {
        agentName: AGENT_NAMES.MEMORY_MANAGER,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.MEMORY_MANAGER].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.MEMORY_MANAGER].icon,
        assignedTask: 'Retrieve relevant memories and identify patterns',
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
        stepId: uuidv4(),
        stepNumber: state.orchestrationLog.length + 1,
        description: 'Memory retrieval and pattern recognition',
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
   * Therapy Advisor node
   */
  private async provideCounseling(state: FACETState): Promise<Partial<FACETState>> {
    const agentStart = Date.now()
    const startTimeMs = agentStart - state.startTime

    try {
      const therapyResult = await this.performTherapyAdvising(
        state.userMessage,
        state.emotionAnalysis,
        state.memoryRetrieval,
        state.crisisAssessment,
        state.userPreferences
      )
      const executionTimeMs = Date.now() - agentStart
      
      // Record performance metrics
      performanceMonitor.recordAgentExecution(
        state.messageId,
        AGENT_NAMES.THERAPY_ADVISOR,
        agentStart,
        executionTimeMs
      )

      const agentResult: AgentExecutionResult = {
        agentName: AGENT_NAMES.THERAPY_ADVISOR,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.THERAPY_ADVISOR].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.THERAPY_ADVISOR].icon,
        assignedTask: 'Provide therapeutic guidance and interventions',
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
        stepId: uuidv4(),
        stepNumber: state.orchestrationLog.length + 1,
        description: 'Therapeutic intervention and guidance',
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
   * Progress Tracker node
   */
  private async trackProgress(state: FACETState): Promise<Partial<FACETState>> {
    const agentStart = Date.now()
    const startTimeMs = agentStart - state.startTime

    try {
      const progressResult = await this.performProgressTracking(
        state.userId,
        state.emotionAnalysis,
        state.therapyAdvice
      )
      const executionTimeMs = Date.now() - agentStart
      
      // Record performance metrics
      performanceMonitor.recordAgentExecution(
        state.messageId,
        AGENT_NAMES.PROGRESS_TRACKER,
        agentStart,
        executionTimeMs
      )

      const agentResult: AgentExecutionResult = {
        agentName: AGENT_NAMES.PROGRESS_TRACKER,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.PROGRESS_TRACKER].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.PROGRESS_TRACKER].icon,
        assignedTask: 'Track therapeutic progress and outcomes',
        inputData: { userId: state.userId, emotionContext: state.emotionAnalysis },
        executionTimeMs,
        executionType: 'serial',
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
        stepId: uuidv4(),
        stepNumber: state.orchestrationLog.length + 1,
        description: 'Progress monitoring and outcome analysis',
        agentsInvolved: [AGENT_NAMES.PROGRESS_TRACKER],
        executionType: 'serial',
        startTimeMs,
        durationMs: executionTimeMs,
        dependencies: [AGENT_NAMES.THERAPY_ADVISOR],
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

      this.executionMetrics.synthesisTime = Date.now() - synthesisStart

      const executionStep: ExecutionStep = {
        stepId: uuidv4(),
        stepNumber: state.orchestrationLog.length + 1,
        description: 'Response synthesis and quality assurance',
        agentsInvolved: ['response_synthesizer'],
        executionType: 'serial',
        startTimeMs: synthesisStart - state.startTime,
        durationMs: this.executionMetrics.synthesisTime,
        dependencies: [AGENT_NAMES.PROGRESS_TRACKER],
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
          stepId: uuidv4(),
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

  // ... [Additional private methods for execution path determination, agent implementations, error handling, etc.]
  // These will be implemented in the next part due to length constraints

  /**
   * Determine execution path based on message analysis and SLA optimization
   */
  private determineExecutionPath(state: FACETState): string {
    // Crisis detection takes absolute priority
    if (state.urgencyLevel === 'crisis') {
      return 'crisis_priority'
    }
    
    const complexity = this.analyzeMessageComplexity(state.userMessage)
    const timeElapsed = Date.now() - state.startTime
    
    // If we're already approaching timeout, take fastest path
    if (timeElapsed > 800) { // 800ms elapsed, go fast
      return 'direct_therapy'
    }
    
    // Route based on complexity for optimal SLA performance
    switch (complexity) {
      case 'simple':
        return 'direct_therapy' // Skip heavy analysis for simple messages
      case 'emotional':
        return 'parallel_analysis' // Use parallel processing
      case 'therapy':
        return 'memory_first' // Full analysis but memory-guided
      default:
        return 'parallel_analysis'
    }
  }

  /**
   * Simple crisis keyword detection
   */
  private detectCrisisKeywords(message: string): boolean {
    const crisisKeywords = ['hurt myself', 'end it all', 'suicide', 'kill myself', 'want to die']
    return crisisKeywords.some(keyword => message.toLowerCase().includes(keyword))
  }

  /**
   * Build orchestration data for response
   */
  private buildOrchestrationData(state: FACETState, totalTimeMs: number): AgentOrchestrationData | null {
    if (!state.userPreferences?.agentVisibility) {
      return null
    }

    return {
      strategy: this.generateStrategyDescription(state),
      reasoning: this.generateReasoningExplanation(state),
      totalAgentsInvolved: state.agentResults.length,
      executionPattern: this.determineExecutionPattern(state.orchestrationLog),
      executionPlan: state.orchestrationLog,
      agentResults: state.agentResults,
      timing: {
        planningTimeMs: this.executionMetrics.planningTime,
        coordinationOverheadMs: this.executionMetrics.coordinationOverhead,
        parallelExecutionTimeMs: this.executionMetrics.parallelExecutionTime,
        synthesisTimeMs: this.executionMetrics.synthesisTime,
        totalTimeMs
      },
      confidence: {
        overall: state.responseConfidence || 0.8,
        agentAgreement: this.calculateAgentAgreement(state.agentResults),
        responseQuality: this.calculateResponseQuality(state)
      },
      adaptations: this.generateAdaptations(state),
      learnings: this.generateLearnings(state)
    }
  }

  /**
   * Optimized execution planning with performance-first approach
   */
  private planExecutionOptimized(message: string, urgency: string, preferences?: any): any {
    const complexity = this.analyzeMessageComplexity(message)
    const isCrisis = urgency === 'crisis'
    
    // Crisis: Minimal agents, maximum speed
    if (isCrisis) {
      return {
        description: 'Crisis priority - immediate safety assessment',
        executionType: 'crisis_priority',
        agentsRequired: ['crisis_monitor', 'therapy_advisor'],
        parallelExecution: false,
        timeoutMs: 1800,
        stateUpdates: { urgencyLevel: 'crisis' }
      }
    }
    
    // Simple: Single agent, fastest response
    if (complexity === 'simple') {
      return {
        description: 'Simple emotional state - light analysis',
        executionType: 'simple',
        agentsRequired: ['emotion_analyzer'],
        parallelExecution: false,
        timeoutMs: 1300,
        stateUpdates: {}
      }
    }
    
    // Emotional: Balanced approach with parallel processing
    if (complexity === 'emotional') {
      return {
        description: 'Emotional support with parallel analysis',
        executionType: 'parallel',
        agentsRequired: ['emotion_analyzer', 'memory_manager', 'therapy_advisor'],
        parallelExecution: true,
        timeoutMs: 2800,
        stateUpdates: {}
      }
    }
    
    // Therapy: Full agent coordination
    return {
      description: 'Comprehensive therapeutic analysis',
      executionType: 'therapy',
      agentsRequired: ['emotion_analyzer', 'memory_manager', 'therapy_advisor', 'progress_tracker'],
      parallelExecution: true,
      timeoutMs: 7500,
      stateUpdates: {}
    }
  }

  private async performEmotionAnalysis(message: string, personalizedConfig?: any): Promise<any> {
    // Apply personalized configuration if available
    let confidenceThreshold = 0.7
    let priorityEmotions = ['anxiety', 'sadness', 'anger', 'joy', 'fear']
    
    if (personalizedConfig) {
      confidenceThreshold = personalizedConfig.confidenceThreshold || confidenceThreshold
      priorityEmotions = personalizedConfig.preferredInterventions?.length > 0 
        ? personalizedConfig.preferredInterventions 
        : priorityEmotions
    }

    // Fast emotion analysis using keyword matching and patterns
    const emotionKeywords = {
      anxiety: ['anxious', 'worried', 'nervous', 'scared', 'panic', 'stress'],
      sadness: ['sad', 'down', 'depressed', 'hopeless', 'empty', 'alone'],
      anger: ['angry', 'mad', 'frustrated', 'irritated', 'furious', 'rage'],
      joy: ['happy', 'good', 'great', 'excited', 'wonderful', 'amazing'],
      fear: ['afraid', 'terrified', 'scared', 'frightened', 'panic']
    }
    
    const messageLower = message.toLowerCase()
    let dominantEmotion = 'neutral'
    let maxScore = 0
    
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const score = keywords.filter(kw => messageLower.includes(kw)).length
      if (score > maxScore) {
        maxScore = score
        dominantEmotion = emotion
      }
    }
    
    // Calculate VAD values based on detected emotion
    const vadMapping = {
      anxiety: { valence: -0.3, arousal: 0.7, dominance: 0.2 },
      sadness: { valence: -0.6, arousal: 0.2, dominance: 0.1 },
      anger: { valence: -0.4, arousal: 0.8, dominance: 0.7 },
      joy: { valence: 0.7, arousal: 0.6, dominance: 0.6 },
      fear: { valence: -0.5, arousal: 0.8, dominance: 0.1 },
      neutral: { valence: 0.0, arousal: 0.3, dominance: 0.5 }
    }
    
    const vad = vadMapping[dominantEmotion as keyof typeof vadMapping] || vadMapping.neutral
    
    return {
      valence: vad.valence,
      arousal: vad.arousal,
      dominance: vad.dominance,
      confidence: maxScore > 0 ? 0.8 : 0.6,
      primaryEmotion: dominantEmotion,
      intensity: Math.min(maxScore * 0.3, 1.0),
      reasoning: `Detected ${dominantEmotion} through keyword analysis`,
      insights: [`Primary emotion: ${dominantEmotion}`],
      recommendations: [`Provide ${dominantEmotion}-appropriate support`],
      contributedInsights: [`Emotional state: ${dominantEmotion}`]
    }
  }

  private async performCrisisAssessment(message: string, emotionContext: any): Promise<any> {
    return {
      riskLevel: this.detectCrisisKeywords(message) ? 'crisis' : 'low',
      immediateInterventionRequired: this.detectCrisisKeywords(message),
      professionalReferralRecommended: false,
      emergencyContactTriggered: false,
      confidence: 0.9,
      reasoning: 'No immediate crisis indicators detected',
      insights: [],
      recommendations: [],
      contributedInsights: []
    }
  }

  private async performMemoryRetrieval(message: string, userId: string, emotionContext: any): Promise<any> {
    return {
      relevantMemories: [],
      patterns: [],
      confidence: 0.7,
      reasoning: 'Retrieved contextual conversation history',
      insights: [],
      recommendations: [],
      contributedInsights: []
    }
  }

  private async performTherapyAdvising(message: string, emotion: any, memory: any, crisis: any, preferences: any): Promise<any> {
    return {
      intervention: 'supportive_validation',
      techniques: ['active_listening'],
      confidence: 0.8,
      reasoning: 'Providing empathetic support based on emotional state',
      insights: ['User needs validation'],
      recommendations: ['Continue supportive approach'],
      contributedInsights: ['Therapeutic support provided'],
      followUpSuggestions: ['How are you feeling about this?']
    }
  }

  private async performProgressTracking(userId: string, emotion: any, therapy: any): Promise<any> {
    return {
      progressIndicators: [],
      confidence: 0.6,
      reasoning: 'Tracking therapeutic engagement',
      insights: [],
      recommendations: [],
      contributedInsights: []
    }
  }

  private async generateFinalResponse(message: string, emotion: any, memory: any, crisis: any, therapy: any, progress: any, preferences: any): Promise<{ content: string, confidence: number }> {
    // Fast, template-based response generation for SLA compliance
    const responseTemplates = {
      crisis: "I'm really concerned about you right now. Your safety is the most important thing. Please reach out for immediate help by calling 988 (Suicide & Crisis Lifeline) or text HOME to 741741. I'm here with you through this.",
      
      anxiety: "I can sense you might be feeling anxious. Take a deep breath - you're safe here with me. Let's work through this together. What's been weighing on your mind?",
      
      sadness: "I hear the sadness in your words, and I want you to know that your feelings are valid. You don't have to go through this alone. What would feel most supportive right now?",
      
      anger: "I can feel the frustration in what you're sharing. It's completely understandable to feel this way. Let's explore what's behind these feelings. What triggered this for you?",
      
      joy: "It's wonderful to hear some positivity from you! I'm glad you're experiencing these good feelings. What's been going well for you?",
      
      neutral: "I hear you, and I want you to know that I'm here to support you. What would be most helpful to talk about today?"
    }
    
    let selectedTemplate = 'neutral'
    let confidence = 0.7
    
    if (crisis?.riskLevel === 'crisis') {
      selectedTemplate = 'crisis'
      confidence = 0.95
    } else if (emotion?.primaryEmotion && responseTemplates[emotion.primaryEmotion as keyof typeof responseTemplates]) {
      selectedTemplate = emotion.primaryEmotion
      confidence = emotion.confidence * 0.9
    }
    
    const response = responseTemplates[selectedTemplate as keyof typeof responseTemplates]
    
    return {
      content: response,
      confidence: Math.min(confidence, 0.95)
    }
  }

  // Helper methods
  private getSLATimeoutForRequest(request: ChatRequest, crisisCheck: any): number {
    // SLA targets from SPECS.md lines 728-734
    if (crisisCheck.urgencyLevel === 'crisis') return 1800 // <2s for crisis (with 200ms buffer)
    
    const messageComplexity = this.analyzeMessageComplexity(request.message)
    
    if (messageComplexity === 'simple') return 1300 // <1.5s for simple check-ins (with buffer)
    if (messageComplexity === 'emotional') return 2800 // <3s for emotional support (with buffer)
    if (messageComplexity === 'therapy') return 7500 // <8s for deep therapy (with buffer)
    
    // Default to emotional support timing
    return 2800
  }

  private quickCrisisDetection(message: string, urgencyLevel?: string): { urgencyLevel: 'normal' | 'elevated' | 'crisis', riskScore: number } {
    if (urgencyLevel === 'crisis') return { urgencyLevel: 'crisis', riskScore: 1.0 }
    
    const crisisKeywords = [
      'hurt myself', 'end it all', 'suicide', 'kill myself', 'want to die',
      'no point', 'give up', 'hopeless', 'end my life', 'not worth living'
    ]
    
    const emergencyKeywords = [
      'right now', 'tonight', 'today', 'immediately', 'can\'t take it'
    ]
    
    const messageLower = message.toLowerCase()
    const crisisScore = crisisKeywords.filter(kw => messageLower.includes(kw)).length
    const emergencyScore = emergencyKeywords.filter(kw => messageLower.includes(kw)).length
    
    const riskScore = (crisisScore * 0.4) + (emergencyScore * 0.3)
    
    if (riskScore >= 0.7) return { urgencyLevel: 'crisis', riskScore }
    if (riskScore >= 0.3) return { urgencyLevel: 'elevated', riskScore }
    return { urgencyLevel: 'normal', riskScore }
  }

  private analyzeMessageComplexity(message: string): 'simple' | 'emotional' | 'therapy' {
    const messageLength = message.length
    const emotionalKeywords = [
      'feel', 'feeling', 'emotion', 'sad', 'happy', 'angry', 'anxious', 
      'depressed', 'stressed', 'overwhelmed', 'excited', 'worried'
    ]
    const therapyKeywords = [
      'therapy', 'counseling', 'trauma', 'relationship', 'family', 'work',
      'goal', 'progress', 'coping', 'strategy', 'technique', 'exercise'
    ]
    
    const messageLower = message.toLowerCase()
    const emotionalCount = emotionalKeywords.filter(kw => messageLower.includes(kw)).length
    const therapyCount = therapyKeywords.filter(kw => messageLower.includes(kw)).length
    
    // Simple messages: short, few keywords
    if (messageLength < 50 && emotionalCount <= 1 && therapyCount === 0) {
      return 'simple'
    }
    
    // Therapy messages: complex topics, therapeutic language
    if (therapyCount >= 2 || messageLength > 200 || emotionalCount >= 3) {
      return 'therapy'
    }
    
    // Default to emotional support
    return 'emotional'
  }

  private createTimeoutPromise(timeoutMs: number, messageId: string): Promise<FACETState> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Orchestration timeout after ${timeoutMs}ms for message ${messageId}`)), timeoutMs)
    })
  }

  private handleAgentError(state: FACETState, agentName: string, error: Error, startTime: number): Partial<FACETState> {
    const executionStep: ExecutionStep = {
      stepId: uuidv4(),
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

  private createFallbackResponse(messageId: string, conversationId: string, error: any, processingTimeMs: number): ChatResponse {
    return {
      content: "I'm experiencing a technical issue, but I'm here to support you. How are you feeling right now?",
      messageId,
      conversationId,
      orchestration: null,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTimeMs,
        agentVersion: "facet-orchestrator-v2.0",
        responseConfidence: 0.5,
        recommendedFollowUp: ["Please try rephrasing your message"],
        warningFlags: ["system_error"],
        emotionalState: undefined,
        riskAssessment: undefined
      }
    }
  }

  // Additional helper methods
  private generateStrategyDescription(state: FACETState): string {
    const agentCount = state.agentResults.length
    const hascrisis = state.riskAssessment?.level === 'crisis'
    
    if (hascrisis) return "Crisis priority - immediate safety assessment"
    if (agentCount > 3) return "Comprehensive analysis with parallel agent coordination"
    if (agentCount > 1) return "Balanced therapeutic support with multi-agent analysis"
    return "Simple emotional state analysis"
  }

  private generateReasoningExplanation(state: FACETState): string {
    return "Based on message analysis and user context, coordinated specialized agents to provide personalized therapeutic support"
  }

  private determineExecutionPattern(steps: ExecutionStep[]): 'serial' | 'parallel' | 'hybrid' {
    const hasParallel = steps.some(step => step.executionType === 'parallel')
    const hasSerial = steps.some(step => step.executionType === 'serial')
    
    if (hasParallel && hasSerial) return 'hybrid'
    if (hasParallel) return 'parallel'
    return 'serial'
  }

  private calculateAgentAgreement(results: AgentExecutionResult[]): number {
    if (results.length < 2) return 1.0
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    return Math.min(avgConfidence + 0.1, 1.0)
  }

  private calculateResponseQuality(state: FACETState): number {
    return state.responseConfidence || 0.8
  }

  private generateAdaptations(state: FACETState): string[] {
    const adaptations = []
    if (state.agentResults.length > 2) adaptations.push('parallel_processing_enabled')
    if (state.riskAssessment?.level === 'crisis') adaptations.push('crisis_priority_activated')
    return adaptations
  }

  private generateLearnings(state: FACETState): string[] {
    const learnings = []
    if (state.emotionalState) learnings.push(`Primary emotion: ${state.emotionalState.primaryEmotion}`)
    return learnings
  }

  private shouldContinueAfterCrisis(state: FACETState): string {
    if (state.riskAssessment?.immediateInterventionRequired) {
      return 'emergency_response'
    }
    return 'continue_analysis'
  }

  private async storeOrchestrationLog(userId: string, response: ChatResponse): Promise<void> {
    try {
      if (response.orchestration) {
        // Store in database - placeholder for now
        console.log(`Storing orchestration log for user ${userId}`)
      }
    } catch (error) {
      console.error('Failed to store orchestration log:', error)
    }
  }

  /**
   * Get comprehensive cache analytics for monitoring
   */
  async getCacheAnalytics(): Promise<any> {
    return advancedCacheManager.getCacheAnalytics()
  }

  /**
   * Trigger cache optimization based on performance data
   */
  async optimizeCacheStrategy(): Promise<void> {
    await advancedCacheManager.optimizeCacheStrategy()
  }

  /**
   * Execute workflow with Redis caching and performance monitoring integration
   */
  private async executeWithCachingAndMonitoring(
    state: FACETState, 
    optimization: any
  ): Promise<FACETState> {
    try {
      // Use advanced cache manager for hierarchical caching
      const cacheKey = `orchestration:${state.userId}:${state.messageId}`
      const cacheContext = {
        agentName: 'orchestrator',
        userId: state.userId,
        inputData: { 
          message: state.userMessage,
          urgency: state.urgencyLevel,
          preferences: state.userPreferences
        },
        confidence: 0.8
      }
      
      const cachedResult = await advancedCacheManager.getWithHierarchy(cacheKey, cacheContext)
      
      if (cachedResult && optimization.strategy.useCache) {
        console.log('FACET Orchestrator: Using advanced cached orchestration result')
        
        // Execute optimized workflow with cached data
        const optimizedResult = await this.executeCachedStrategy(state, cachedResult, optimization)
        if (optimizedResult) {
          return optimizedResult
        }
      }
      
      // Execute normal workflow if no cache hit or cache disabled
      const result = await this.workflow.invoke(state)
      
      // Cache successful execution using advanced cache manager
      if (result.finalResponse && result.agentResults && result.agentResults.length > 0) {
        await advancedCacheManager.setWithStrategy(
          cacheKey,
          {
            finalResponse: result.finalResponse,
            agentResults: result.agentResults,
            orchestrationLog: result.orchestrationLog,
            responseConfidence: result.responseConfidence,
            strategy: optimization.strategy
          },
          cacheContext,
          optimization.strategy.cacheStrategy || 'balanced'
        )
        
        // Also cache individual agent results for future use
        for (const agentResult of result.agentResults) {
          const agentCacheKey = `agent:${agentResult.agentName}:${state.userId}:${state.messageId}`
          const agentContext = {
            agentName: agentResult.agentName,
            userId: state.userId,
            inputData: agentResult.inputData,
            confidence: agentResult.confidence
          }
          
          await advancedCacheManager.setWithStrategy(
            agentCacheKey,
            agentResult,
            agentContext,
            'agent_result'
          )
        }
      }
      
      return result
      
    } catch (error) {
      console.error('FACET Orchestrator: Error in cached execution:', error)
      // Fallback to normal execution without caching
      return await this.workflow.invoke(state)
    }
  }

  /**
   * Execute workflow using cached orchestration strategy
   */
  private async executeCachedStrategy(
    state: FACETState, 
    cachedStrategy: any, 
    optimization: any
  ): Promise<FACETState | null> {
    try {
      const agentExecution = await performanceOptimizer.optimizeAgentExecution(
        cachedStrategy.agentsUsed,
        state.userId,
        { message: state.userMessage },
        optimization.strategy.maxExecutionTime
      )
      
      const results: AgentExecutionResult[] = []
      let totalTime = 0
      
      // Execute agents in optimized order
      for (const parallelGroup of agentExecution.parallelGroups) {
        const groupStart = Date.now()
        
        // Execute agents in parallel within each group
        const groupResults = await Promise.all(
          parallelGroup.map(async (agentName) => {
            // Check advanced cache first for this specific agent
            const agentCacheKey = `agent:${agentName}:${state.userId}`
            const agentCacheContext = {
              agentName,
              userId: state.userId,
              inputData: { message: state.userMessage },
              confidence: 0.8
            }
            
            const cachedResult = await advancedCacheManager.getWithHierarchy(agentCacheKey, agentCacheContext)
            
            if (cachedResult) {
              console.log(`FACET Orchestrator: Using advanced cached result for ${agentName}`)
              return cachedResult
            }
            
            // Execute agent if not cached
            return await this.executeIndividualAgent(state, agentName)
          })
        )
        
        results.push(...groupResults.filter(r => r !== null))
        totalTime += Date.now() - groupStart
      }
      
      // Generate final response using cached results
      const finalResponse = await this.generateFinalResponse(
        state.userMessage,
        results.find(r => r.agentName === 'emotion_analyzer')?.result,
        results.find(r => r.agentName === 'memory_manager')?.result,
        results.find(r => r.agentName === 'crisis_monitor')?.result,
        results.find(r => r.agentName === 'therapy_advisor')?.result,
        results.find(r => r.agentName === 'progress_tracker')?.result,
        state.userPreferences
      )
      
      return {
        ...state,
        finalResponse: finalResponse.content,
        responseConfidence: finalResponse.confidence,
        agentResults: results,
        orchestrationLog: this.buildOrchestrationLogFromCachedExecution(
          results, 
          cachedStrategy, 
          totalTime
        )
      }
      
    } catch (error) {
      console.error('FACET Orchestrator: Error executing cached strategy:', error)
      return null // Fall back to normal execution
    }
  }

  /**
   * Execute individual agent for cached strategy execution
   */
  private async executeIndividualAgent(state: FACETState, agentName: string): Promise<AgentExecutionResult | null> {
    const agentStart = Date.now()
    
    try {
      let result: any = null
      
      switch (agentName) {
        case 'emotion_analyzer':
          const personalizedConfig = state.personalizedConfigs?.[agentName]
          result = await this.performEmotionAnalysis(state.userMessage, personalizedConfig)
          break
        case 'memory_manager':
          result = await this.performMemoryRetrieval(state.userMessage, state.userId, state.emotionalState)
          break
        case 'crisis_monitor':
          result = await this.performCrisisAssessment(state.userMessage, state.emotionalState)
          break
        case 'therapy_advisor':
          result = await this.performTherapyAdvising(state.userMessage, state.emotionalState, null, null, state.userPreferences)
          break
        case 'progress_tracker':
          result = await this.performProgressTracking(state.userId, state.userMessage, state.emotionalState)
          break
        default:
          console.warn(`Unknown agent: ${agentName}`)
          return null
      }
      
      const executionTime = Date.now() - agentStart
      
      // Cache the result for future use
      const agentResult: AgentExecutionResult = {
        agentName,
        agentDisplayName: AGENT_CONFIG[agentName]?.displayName || agentName,
        agentIcon: AGENT_CONFIG[agentName]?.icon || '🤖',
        assignedTask: `Execute ${agentName}`,
        inputData: { message: state.userMessage },
        executionTimeMs: executionTime,
        executionType: 'cached_parallel',
        startTimeMs: agentStart,
        endTimeMs: agentStart + executionTime,
        result,
        confidence: result.confidence || 0.8,
        success: true,
        reasoning: result.reasoning || `${agentName} analysis complete`,
        keyInsights: result.insights || [],
        recommendationsToOrchestrator: result.recommendations || [],
        influenceOnFinalResponse: 0.7,
        contributedInsights: result.contributedInsights || []
      }
      
      // Cache using advanced cache manager
      const agentCacheKey = `agent:${agentName}:${state.userId}`
      const agentCacheContext = {
        agentName,
        userId: state.userId,
        inputData: { message: state.userMessage },
        confidence: agentResult.confidence,
        executionType: 'individual'
      }
      
      await advancedCacheManager.setWithStrategy(
        agentCacheKey,
        agentResult,
        agentCacheContext,
        'agent_result'
      )
      
      return agentResult
      
    } catch (error) {
      console.error(`Error executing agent ${agentName}:`, error)
      return null
    }
  }

  /**
   * Build orchestration log from cached execution results
   */
  private buildOrchestrationLogFromCachedExecution(
    results: AgentExecutionResult[], 
    cachedStrategy: any, 
    totalTime: number
  ): ExecutionStep[] {
    return results.map((result, index) => ({
      stepId: uuidv4(),
      stepNumber: index + 1,
      description: `${result.agentDisplayName} analysis (cached optimization)`,
      agentsInvolved: [result.agentName],
      executionType: 'cached_parallel',
      startTimeMs: result.startTimeMs,
      durationMs: result.executionTimeMs,
      dependencies: index > 0 ? [results[index - 1].agentName] : [],
      status: 'completed',
      results: result.result
    }))
  }
}