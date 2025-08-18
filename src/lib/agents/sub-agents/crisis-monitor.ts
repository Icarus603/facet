/**
 * FACET Crisis Monitor Agent
 * 
 * Real-time AI-powered crisis detection and safety assessment
 * Implements exact AgentExecutionResult format from API_CONTRACT.md
 */

import { BaseAgent, AgentContext, createAgentConfig } from '../base-agent'
import { AgentExecutionResult, AGENT_NAMES, AGENT_CONFIG } from '@/lib/types/api-contract'
import { 
  CRISIS_MONITOR_SYSTEM_PROMPT, 
  buildCrisisAssessmentPrompt 
} from '../prompts/crisis-monitor-prompts'
import { getModelForAgent } from '@/lib/openai/client'

export interface CrisisAssessment {
  riskLevel: 'none' | 'low' | 'moderate' | 'high' | 'crisis'
  riskScore: number  // 0-10 numerical risk score
  immediateInterventionRequired: boolean
  professionalReferralRecommended: boolean
  emergencyContactTriggered: boolean
  riskFactors: string[]
  protectiveFactors: string[]
  reasoning: string
  confidence: number
  urgencyScore: number
  recommendedActions: string[]
  insights: string[]
  recommendations: string[]
  contributedInsights: string[]
  safetyPlan: {
    immediateSteps: string[]
    copingStrategies: string[]
    emergencyContacts: string[]
    professionalResources: string[]
  }
  triggerWords: string[]
  contextualFactors: string[]
}

export class CrisisMonitor extends BaseAgent {
  constructor() {
    super(createAgentConfig(
      AGENT_NAMES.CRISIS_MONITOR,
      AGENT_CONFIG[AGENT_NAMES.CRISIS_MONITOR].displayName,
      AGENT_CONFIG[AGENT_NAMES.CRISIS_MONITOR].icon,
      CRISIS_MONITOR_SYSTEM_PROMPT,
      {
        model: getModelForAgent('crisis_monitor'),
        temperature: 0.1, // Very low temperature for consistent crisis detection
        maxTokens: 2500,
        timeoutMs: 45000 // 45 second timeout for crisis detection (increased for proxy requests)
      }
    ))
  }

  /**
   * Prepare input for crisis assessment
   */
  protected async prepareInput(context: AgentContext): Promise<any> {
    return {
      message: context.userMessage,
      emotionalContext: context.emotionalState,
      memoryContext: context.memoryContext,
      urgencyLevel: context.urgencyLevel,
      previousResults: context.previousResults
    }
  }

  /**
   * Perform AI-powered crisis assessment
   */
  protected async performAnalysis(input: any, context: AgentContext): Promise<CrisisAssessment> {
    try {
      // Build messages for OpenAI
      const messages = await this.buildMessages(input, context)

      // Call OpenAI API with crisis-optimized settings
      const response = await this.callOpenAI(messages)

      // Parse JSON response
      const crisisAnalysis = JSON.parse(response)

      // Validate and return structured crisis assessment
      return this.validateCrisisAssessment(crisisAnalysis)

    } catch (error) {
      console.error('Crisis assessment error:', error)
      throw error
    }
  }

  /**
   * Process and validate the crisis assessment result
   */
  protected async processResult(result: CrisisAssessment): Promise<CrisisAssessment> {
    // Ensure critical fields are properly set and within bounds
    const processedResult = {
      ...result,
      riskScore: Math.max(0, Math.min(10, result.riskScore || 0)),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.8)),
      urgencyScore: Math.max(0, Math.min(1, result.urgencyScore || 0)),
      riskFactors: result.riskFactors || [],
      protectiveFactors: result.protectiveFactors || [],
      recommendedActions: result.recommendedActions || [],
      insights: result.insights || [],
      recommendations: result.recommendations || [],
      contributedInsights: result.contributedInsights || [],
      triggerWords: result.triggerWords || [],
      contextualFactors: result.contextualFactors || []
    }

    // Ensure risk level consistency with risk score
    if (processedResult.riskScore >= 9) processedResult.riskLevel = 'crisis'
    else if (processedResult.riskScore >= 7) processedResult.riskLevel = 'high'
    else if (processedResult.riskScore >= 4) processedResult.riskLevel = 'moderate'
    else if (processedResult.riskScore >= 1) processedResult.riskLevel = 'low'
    else processedResult.riskLevel = 'none'

    // Set intervention flags based on risk level
    processedResult.immediateInterventionRequired = processedResult.riskLevel === 'crisis'
    processedResult.professionalReferralRecommended = ['crisis', 'high'].includes(processedResult.riskLevel)
    processedResult.emergencyContactTriggered = processedResult.riskLevel === 'crisis' && processedResult.riskScore >= 9.5

    return processedResult
  }

  /**
   * Format user input for the AI prompt
   */
  protected async formatUserInput(input: any): Promise<string> {
    return buildCrisisAssessmentPrompt(
      input.message,
      input.emotionalContext,
      input.memoryContext
    )
  }

  /**
   * Provide fallback result for critical errors
   */
  protected async getFallbackResult(error: Error, context: AgentContext): Promise<CrisisAssessment> {
    // Conservative fallback - assume moderate risk when AI fails
    const message = context.userMessage.toLowerCase()
    const basicRiskScore = this.getBasicRiskScore(message)
    
    return {
      riskLevel: basicRiskScore >= 7 ? 'high' : basicRiskScore >= 4 ? 'moderate' : 'low',
      riskScore: basicRiskScore,
      immediateInterventionRequired: basicRiskScore >= 9,
      professionalReferralRecommended: basicRiskScore >= 7,
      emergencyContactTriggered: false,
      riskFactors: this.detectBasicRiskFactors(message),
      protectiveFactors: [],
      reasoning: `Fallback assessment due to AI error: ${error.message}. Conservative risk evaluation applied.`,
      confidence: 0.4, // Low confidence for fallback
      urgencyScore: Math.min(basicRiskScore / 10, 1),
      recommendedActions: basicRiskScore >= 7 ? ['Seek immediate professional help'] : ['Monitor situation closely'],
      insights: ['AI analysis failed - using fallback assessment'],
      recommendations: ['Please try again or contact support'],
      contributedInsights: ['Fallback crisis assessment used'],
      safetyPlan: {
        immediateSteps: ['Contact crisis hotline: 988', 'Reach out to trusted friend or family member'],
        copingStrategies: ['Deep breathing', 'Call someone you trust'],
        emergencyContacts: ['National Suicide Prevention Lifeline: 988', 'Emergency Services: 911'],
        professionalResources: ['Crisis Text Line: Text HOME to 741741', 'Local emergency room']
      },
      triggerWords: this.detectBasicTriggers(message),
      contextualFactors: ['AI assessment unavailable']
    }
  }

  /**
   * Validate crisis assessment response from AI
   */
  private validateCrisisAssessment(analysis: any): CrisisAssessment {
    const validRiskLevels = ['none', 'low', 'moderate', 'high', 'crisis']
    
    return {
      riskLevel: validRiskLevels.includes(analysis.riskLevel) ? analysis.riskLevel : 'moderate',
      riskScore: typeof analysis.riskScore === 'number' ? analysis.riskScore : 5,
      immediateInterventionRequired: Boolean(analysis.immediateInterventionRequired),
      professionalReferralRecommended: Boolean(analysis.professionalReferralRecommended),
      emergencyContactTriggered: Boolean(analysis.emergencyContactTriggered),
      riskFactors: Array.isArray(analysis.riskFactors) ? analysis.riskFactors : [],
      protectiveFactors: Array.isArray(analysis.protectiveFactors) ? analysis.protectiveFactors : [],
      reasoning: analysis.reasoning || 'Crisis assessment completed',
      confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0.8,
      urgencyScore: typeof analysis.urgencyScore === 'number' ? analysis.urgencyScore : 0.5,
      recommendedActions: Array.isArray(analysis.recommendedActions) ? analysis.recommendedActions : [],
      insights: Array.isArray(analysis.insights) ? analysis.insights : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      contributedInsights: Array.isArray(analysis.contributedInsights) ? analysis.contributedInsights : [],
      safetyPlan: analysis.safetyPlan || {
        immediateSteps: [],
        copingStrategies: [],
        emergencyContacts: ['National Suicide Prevention Lifeline: 988'],
        professionalResources: []
      },
      triggerWords: Array.isArray(analysis.triggerWords) ? analysis.triggerWords : [],
      contextualFactors: Array.isArray(analysis.contextualFactors) ? analysis.contextualFactors : []
    }
  }

  // Fallback crisis detection methods for error scenarios
  private getBasicRiskScore(message: string): number {
    let score = 0
    
    // Crisis indicators (immediate)
    const crisisWords = ['suicide', 'kill myself', 'end my life', 'want to die']
    if (crisisWords.some(word => message.includes(word))) score = 9
    
    // High risk indicators
    const highRiskWords = ['hopeless', 'no point', 'can\'t go on', 'self harm', 'cut myself']
    if (highRiskWords.some(word => message.includes(word))) score = Math.max(score, 7)
    
    // Moderate risk indicators  
    const moderateRiskWords = ['overwhelmed', 'can\'t cope', 'breaking down', 'desperate']
    if (moderateRiskWords.some(word => message.includes(word))) score = Math.max(score, 5)
    
    // Low risk indicators
    const lowRiskWords = ['worried', 'stressed', 'anxious', 'sad']
    if (lowRiskWords.some(word => message.includes(word))) score = Math.max(score, 2)
    
    return score
  }

  private detectBasicRiskFactors(message: string): string[] {
    const factors = []
    
    if (message.includes('suicide') || message.includes('kill myself')) {
      factors.push('Suicidal ideation')
    }
    if (message.includes('hopeless') || message.includes('no point')) {
      factors.push('Hopelessness')
    }
    if (message.includes('alone') || message.includes('nobody cares')) {
      factors.push('Social isolation')
    }
    if (message.includes('overwhelmed') || message.includes('can\'t cope')) {
      factors.push('Overwhelming stress')
    }
    
    return factors
  }

  private detectBasicTriggers(message: string): string[] {
    const triggers = []
    
    if (message.includes('suicide') || message.includes('kill myself') || message.includes('end my life')) {
      triggers.push('suicide')
    }
    if (message.includes('hurt myself') || message.includes('cut myself')) {
      triggers.push('self-harm')
    }
    if (message.includes('hopeless') || message.includes('no point')) {
      triggers.push('hopelessness')
    }
    
    return triggers
  }
}

// Create singleton instance
export const crisisMonitor = new CrisisMonitor()

// Export helper function for backward compatibility
export async function assessCrisis(
  message: string, 
  userId: string, 
  startTimeMs: number,
  emotionalState?: any,
  assignedTask: string = 'Assess crisis risk and safety requirements'
): Promise<AgentExecutionResult> {
  const context: AgentContext = {
    userId,
    messageId: `crisis_${Date.now()}`,
    conversationId: `conv_${userId}_${Date.now()}`,
    userMessage: message,
    emotionalState
  }
  
  return await crisisMonitor.execute(context, assignedTask, startTimeMs)
}