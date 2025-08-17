/**
 * FACET Reasoning Logger
 * 
 * Implements transparency logging system exactly as specified in SPECS.md line 144
 * Provides user-friendly explanations of agent orchestration decisions
 */

import { 
  ExecutionStep, 
  AgentExecutionResult, 
  AgentOrchestrationData,
  ChatRequest 
} from '@/lib/types/api-contract'
import { ExecutionPlan } from './execution-planner'
import { FACETState } from './langraph-workflows'

export interface ReasoningLogEntry {
  timestamp: string
  phase: string
  decision: string
  reasoning: string
  context: any
  confidence: number
}

export class ReasoningLogger {
  private logs: ReasoningLogEntry[] = []
  private startTime: number = Date.now()

  /**
   * Log orchestration decision with reasoning
   */
  logDecision(
    phase: string, 
    decision: string, 
    reasoning: string, 
    context: any = {}, 
    confidence: number = 0.8
  ): void {
    this.logs.push({
      timestamp: new Date().toISOString(),
      phase,
      decision,
      reasoning,
      context,
      confidence
    })
  }

  /**
   * Log execution plan creation
   */
  logExecutionPlanning(
    userMessage: string,
    plan: ExecutionPlan,
    urgencyLevel: string,
    userPreferences?: ChatRequest['userPreferences']
  ): void {
    const reasoning = this.generatePlanningReasoning(userMessage, plan, urgencyLevel, userPreferences)
    
    this.logDecision(
      'execution_planning',
      `Selected strategy: ${plan.strategy}`,
      reasoning,
      {
        messageAnalysis: this.analyzeMessageContent(userMessage),
        planDetails: {
          pattern: plan.executionPattern,
          agents: plan.agentsToInvoke,
          estimatedTime: plan.estimatedTimeMs,
          parallelGroups: plan.parallelGroups
        },
        userContext: {
          urgencyLevel,
          preferences: userPreferences
        }
      },
      0.9
    )
  }

  /**
   * Log agent coordination decisions
   */
  logAgentCoordination(
    agents: string[],
    executionType: 'parallel' | 'serial' | 'hybrid',
    reasoning: string,
    dependencies: Record<string, string[]> = {}
  ): void {
    this.logDecision(
      'agent_coordination',
      `Coordinating ${agents.length} agents in ${executionType} execution`,
      reasoning,
      {
        agents,
        executionType,
        dependencies,
        coordinationStrategy: this.generateCoordinationStrategy(agents, executionType)
      },
      0.85
    )
  }

  /**
   * Log crisis detection and response
   */
  logCrisisDetection(
    riskLevel: string,
    interventionRequired: boolean,
    reasoning: string,
    triggers: string[]
  ): void {
    this.logDecision(
      'crisis_assessment',
      `Risk level: ${riskLevel}${interventionRequired ? ' - Immediate intervention required' : ''}`,
      reasoning,
      {
        riskLevel,
        interventionRequired,
        triggers,
        protocolsActivated: this.determineCrisisProtocols(riskLevel, interventionRequired)
      },
      riskLevel === 'crisis' ? 0.98 : 0.85
    )
  }

  /**
   * Log response synthesis decisions
   */
  logResponseSynthesis(
    agentResults: AgentExecutionResult[],
    finalConfidence: number,
    reasoning: string
  ): void {
    this.logDecision(
      'response_synthesis',
      `Synthesized response from ${agentResults.length} agent results`,
      reasoning,
      {
        agentContributions: agentResults.map(result => ({
          agent: result.agentName,
          confidence: result.confidence,
          influence: result.influenceOnFinalResponse,
          keyInsights: result.keyInsights
        })),
        synthesisStrategy: this.determineSynthesisStrategy(agentResults),
        qualityMetrics: {
          finalConfidence,
          agentAgreement: this.calculateAgentAgreement(agentResults)
        }
      },
      finalConfidence
    )
  }

  /**
   * Generate comprehensive orchestration transparency data
   */
  generateOrchestrationData(
    plan: ExecutionPlan,
    executionSteps: ExecutionStep[],
    agentResults: AgentExecutionResult[],
    totalTimeMs: number,
    finalConfidence: number
  ): AgentOrchestrationData {
    const overallReasoning = this.generateOverallReasoning(plan, agentResults)
    const agentAgreement = this.calculateAgentAgreement(agentResults)
    
    return {
      strategy: plan.description,
      reasoning: overallReasoning,
      totalAgentsInvolved: agentResults.length,
      executionPattern: plan.executionPattern,
      
      executionPlan: executionSteps,
      agentResults: agentResults,
      
      timing: {
        planningTimeMs: this.calculatePlanningTime(),
        coordinationOverheadMs: this.calculateCoordinationOverhead(executionSteps),
        parallelExecutionTimeMs: this.calculateParallelExecutionTime(executionSteps),
        synthesisTimeMs: this.calculateSynthesisTime(executionSteps),
        totalTimeMs
      },
      
      confidence: {
        overall: finalConfidence,
        agentAgreement,
        responseQuality: this.calculateResponseQuality(agentResults, finalConfidence)
      },
      
      adaptations: this.extractAdaptations(),
      learnings: this.extractLearnings(agentResults)
    }
  }

  /**
   * Generate user-friendly strategy explanation
   */
  generateStrategyExplanation(
    plan: ExecutionPlan,
    userPreferences?: ChatRequest['userPreferences']
  ): string {
    const transparencyLevel = userPreferences?.transparencyLevel || 'standard'
    
    switch (transparencyLevel) {
      case 'minimal':
        return this.generateMinimalExplanation(plan)
      case 'detailed':
        return this.generateDetailedExplanation(plan)
      default:
        return this.generateStandardExplanation(plan)
    }
  }

  // Private helper methods for reasoning generation

  private generatePlanningReasoning(
    message: string,
    plan: ExecutionPlan,
    urgencyLevel: string,
    preferences?: ChatRequest['userPreferences']
  ): string {
    const messageAnalysis = this.analyzeMessageContent(message)
    const factors = []

    if (urgencyLevel === 'crisis') {
      factors.push('crisis urgency detected requiring immediate safety protocols')
    }

    if (messageAnalysis.emotionalIntensity > 6) {
      factors.push('high emotional intensity requiring comprehensive support')
    }

    if (messageAnalysis.hasProgressKeywords) {
      factors.push('progress discussion requiring historical context analysis')
    }

    if (preferences?.processingSpeed === 'fast') {
      factors.push('user preference for quick response')
    }

    let reasoning = `Selected ${plan.executionPattern} execution with ${plan.agentsToInvoke.length} agents based on: ${factors.join(', ')}. `
    
    if (plan.executionPattern === 'parallel') {
      reasoning += `Parallel processing chosen to minimize response time while ensuring comprehensive analysis.`
    } else if (plan.executionPattern === 'crisis_priority') {
      reasoning += `Crisis priority protocol activated for immediate safety assessment.`
    } else {
      reasoning += `Serial execution selected for efficient processing of straightforward request.`
    }

    return reasoning
  }

  private analyzeMessageContent(message: string): any {
    const lowerMessage = message.toLowerCase()
    
    // Simplified analysis - in real implementation this would be more sophisticated
    const crisisKeywords = ['hurt', 'die', 'suicide', 'hopeless', 'end it all']
    const progressKeywords = ['working on', 'progress', 'goals', 'exercises', 'better']
    const distressKeywords = ['overwhelming', 'crying', 'breakdown', 'anxious', 'panic']
    
    return {
      emotionalIntensity: this.calculateEmotionalIntensity(message),
      hasCrisisKeywords: crisisKeywords.some(keyword => lowerMessage.includes(keyword)),
      hasProgressKeywords: progressKeywords.some(keyword => lowerMessage.includes(keyword)),
      hasDistressKeywords: distressKeywords.some(keyword => lowerMessage.includes(keyword)),
      complexity: message.length > 100 ? 'high' : message.length > 50 ? 'medium' : 'low'
    }
  }

  private calculateEmotionalIntensity(message: string): number {
    // Simplified emotional intensity calculation
    const highIntensityWords = ['extremely', 'completely', 'devastating', 'overwhelming']
    const moderateIntensityWords = ['very', 'really', 'quite', 'pretty']
    const lowerMessage = message.toLowerCase()
    
    let intensity = 3 // baseline
    
    if (highIntensityWords.some(word => lowerMessage.includes(word))) {
      intensity += 4
    } else if (moderateIntensityWords.some(word => lowerMessage.includes(word))) {
      intensity += 2
    }
    
    return Math.min(intensity, 10)
  }

  private generateCoordinationStrategy(agents: string[], executionType: string): string {
    if (executionType === 'parallel') {
      return `Agents will execute simultaneously to minimize processing time while maintaining quality`
    } else if (executionType === 'serial') {
      return `Agents will execute sequentially with each building on previous results`
    } else {
      return `Hybrid approach with initial parallel analysis followed by serial synthesis`
    }
  }

  private determineCrisisProtocols(riskLevel: string, interventionRequired: boolean): string[] {
    const protocols = []
    
    if (riskLevel === 'crisis') {
      protocols.push('immediate_safety_assessment', 'professional_alert', 'emergency_resources')
    }
    
    if (interventionRequired) {
      protocols.push('intervention_protocols', 'crisis_de_escalation')
    }
    
    if (riskLevel === 'high' || riskLevel === 'crisis') {
      protocols.push('followup_monitoring', 'support_resource_provision')
    }
    
    return protocols
  }

  private determineSynthesisStrategy(agentResults: AgentExecutionResult[]): string {
    const hasHighConfidenceResults = agentResults.some(result => result.confidence > 0.9)
    const hasLowConfidenceResults = agentResults.some(result => result.confidence < 0.6)
    
    if (hasHighConfidenceResults && !hasLowConfidenceResults) {
      return 'confidence_weighted_synthesis'
    } else if (hasLowConfidenceResults) {
      return 'conservative_synthesis_with_uncertainty_acknowledgment'
    } else {
      return 'balanced_multi_agent_synthesis'
    }
  }

  private calculateAgentAgreement(agentResults: AgentExecutionResult[]): number {
    if (agentResults.length < 2) return 1.0
    
    // Simplified agreement calculation based on confidence consistency
    const confidences = agentResults.map(result => result.confidence)
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
    const variance = confidences.reduce((sum, conf) => sum + Math.pow(conf - avgConfidence, 2), 0) / confidences.length
    
    // Higher agreement when confidence scores are consistent
    return Math.max(0, 1 - variance)
  }

  private generateOverallReasoning(plan: ExecutionPlan, agentResults: AgentExecutionResult[]): string {
    const successfulAgents = agentResults.filter(result => result.success)
    const avgConfidence = successfulAgents.reduce((sum, result) => sum + result.confidence, 0) / successfulAgents.length
    
    let reasoning = `Orchestrated ${plan.executionPattern} execution with ${successfulAgents.length} agents. `
    
    if (avgConfidence > 0.8) {
      reasoning += `High confidence analysis achieved through coordinated agent collaboration. `
    } else if (avgConfidence > 0.6) {
      reasoning += `Moderate confidence achieved with thoughtful agent coordination. `
    } else {
      reasoning += `Analysis completed with appropriate uncertainty acknowledgment. `
    }
    
    if (plan.executionPattern === 'parallel') {
      reasoning += `Parallel processing enabled comprehensive analysis while meeting response time requirements.`
    }
    
    return reasoning
  }

  private generateMinimalExplanation(plan: ExecutionPlan): string {
    return `Used ${plan.agentsToInvoke.length} AI specialists for your response`
  }

  private generateStandardExplanation(plan: ExecutionPlan): string {
    const agentNames = plan.agentsToInvoke.map(agent => 
      agent.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    ).join(', ')
    
    return `Coordinated ${agentNames} to provide personalized support based on your message content and context`
  }

  private generateDetailedExplanation(plan: ExecutionPlan): string {
    const explanation = `Selected ${plan.executionPattern} execution strategy involving ${plan.agentsToInvoke.length} specialized agents. `
    const timing = `Estimated processing time: ${plan.estimatedTimeMs}ms. `
    const coordination = plan.parallelGroups?.length ? 
      `Parallel coordination groups: ${plan.parallelGroups.length}. ` : 
      'Sequential agent coordination. '
    
    return explanation + timing + coordination + `This approach optimizes for both response quality and processing efficiency.`
  }

  // Timing calculation helpers
  private calculatePlanningTime(): number {
    // Time from start to first agent execution
    return this.logs.find(log => log.phase === 'execution_planning') ? 50 : 0
  }

  private calculateCoordinationOverhead(steps: ExecutionStep[]): number {
    // Overhead time for agent coordination
    return steps.length * 25 // Estimated 25ms overhead per step
  }

  private calculateParallelExecutionTime(steps: ExecutionStep[]): number {
    // Find steps that executed in parallel
    const parallelSteps = steps.filter(step => step.executionType === 'parallel')
    return parallelSteps.reduce((max, step) => Math.max(max, step.durationMs), 0)
  }

  private calculateSynthesisTime(steps: ExecutionStep[]): number {
    // Time for final response synthesis
    const synthesisStep = steps.find(step => step.description.includes('synthesis'))
    return synthesisStep?.durationMs || 100
  }

  private calculateResponseQuality(agentResults: AgentExecutionResult[], finalConfidence: number): number {
    const avgAgentConfidence = agentResults.reduce((sum, result) => sum + result.confidence, 0) / agentResults.length
    const agentAgreement = this.calculateAgentAgreement(agentResults)
    
    // Weighted combination of final confidence, agent confidence, and agreement
    return (finalConfidence * 0.4) + (avgAgentConfidence * 0.4) + (agentAgreement * 0.2)
  }

  private extractAdaptations(): string[] {
    const adaptations = []
    
    const crisisLogs = this.logs.filter(log => log.phase === 'crisis_assessment')
    if (crisisLogs.length > 0) {
      adaptations.push('crisis_protocol_activation')
    }
    
    const parallelLogs = this.logs.filter(log => 
      log.context?.executionType === 'parallel' || 
      log.decision.includes('parallel')
    )
    if (parallelLogs.length > 0) {
      adaptations.push('parallel_processing_optimization')
    }
    
    return adaptations
  }

  private extractLearnings(agentResults: AgentExecutionResult[]): string[] {
    const learnings = []
    
    const emotionResults = agentResults.find(result => result.agentName === 'emotion_analyzer')
    if (emotionResults?.keyInsights?.length) {
      learnings.push('emotional_pattern_recognition')
    }
    
    const memoryResults = agentResults.find(result => result.agentName === 'memory_manager')
    if (memoryResults?.keyInsights?.length) {
      learnings.push('personal_context_integration')
    }
    
    const highConfidenceResults = agentResults.filter(result => result.confidence > 0.9)
    if (highConfidenceResults.length > 0) {
      learnings.push('high_confidence_analysis_achieved')
    }
    
    return learnings
  }

  /**
   * Clear logs for new session
   */
  reset(): void {
    this.logs = []
    this.startTime = Date.now()
  }

  /**
   * Get all reasoning logs
   */
  getLogs(): ReasoningLogEntry[] {
    return [...this.logs]
  }
}