/**
 * FACET Therapy Advisor Agent
 * 
 * Real AI-powered evidence-based therapeutic interventions and personalized support
 * Implements exact AgentExecutionResult format from API_CONTRACT.md
 */

import { BaseAgent, AgentContext, createAgentConfig } from '../base-agent'
import { AgentExecutionResult, AGENT_NAMES, AGENT_CONFIG } from '@/lib/types/api-contract'
import { 
  THERAPY_ADVISOR_SYSTEM_PROMPT, 
  buildTherapyAdvisorPrompt 
} from '../prompts/therapy-advisor-prompts'
import { getModelForAgent } from '@/lib/openai/client'

export interface TherapeuticResponse {
  intervention: string                    // Primary intervention type
  techniques: string[]                   // Specific therapeutic techniques (3-5)
  exercises: {                           // Immediate exercises user can try
    name: string
    instructions: string
    duration: string
    difficulty: 'easy' | 'moderate' | 'advanced'
  }[]
  copingStrategies: string[]             // Personalized coping methods
  reasoning: string                      // Therapeutic rationale
  confidence: number                     // 0.0-1.0 intervention confidence
  insights: string[]                     // Therapeutic insights
  recommendations: string[]              // Specific recommendations
  contributedInsights: string[]          // Coordination insights
  therapeuticGoals: string[]             // Short-term goals (1-3)
  homeworkSuggestions: string[]          // Practice suggestions
  warningFlags: string[]                 // Contraindications or concerns
  progressIndicators: string[]           // Signs of improvement to watch for
  resourceRecommendations: {             // Additional resources
    books: string[]
    apps: string[]
    worksheets: string[]
    professionalReferral: boolean
  }
}

export class TherapyAdvisor extends BaseAgent {
  constructor() {
    super(createAgentConfig(
      AGENT_NAMES.THERAPY_ADVISOR,
      AGENT_CONFIG[AGENT_NAMES.THERAPY_ADVISOR].displayName,
      AGENT_CONFIG[AGENT_NAMES.THERAPY_ADVISOR].icon,
      THERAPY_ADVISOR_SYSTEM_PROMPT,
      {
        model: getModelForAgent('therapy_advisor'),
        temperature: 0.6, // Balanced temperature for therapeutic creativity
        maxTokens: 3000,
        timeoutMs: 60000 // 60 second timeout for comprehensive therapy advice (increased for proxy requests)
      }
    ))
  }

  /**
   * Prepare input for therapeutic analysis
   */
  protected async prepareInput(context: AgentContext): Promise<any> {
    return {
      message: context.userMessage,
      emotionalContext: context.emotionalState,
      memoryContext: context.memoryContext,
      previousResults: context.previousResults,
      urgencyLevel: context.urgencyLevel
    }
  }

  /**
   * Perform AI-powered therapeutic analysis
   */
  protected async performAnalysis(input: any, context: AgentContext): Promise<TherapeuticResponse> {
    try {
      // Build messages for OpenAI
      const messages = await this.buildMessages(input, context)

      // Call OpenAI API
      const response = await this.callOpenAI(messages)

      // Parse JSON response
      const therapyAnalysis = JSON.parse(response)

      // Validate and return structured therapeutic response
      return this.validateTherapeuticResponse(therapyAnalysis)

    } catch (error) {
      console.error('Therapeutic analysis error:', error)
      throw error
    }
  }

  /**
   * Process and validate the analysis result
   */
  protected async processResult(result: TherapeuticResponse): Promise<TherapeuticResponse> {
    // Ensure safety guidelines are followed
    const safeResult = await this.applySafetyGuidelines(result)
    
    // Validate all arrays and required fields
    return {
      intervention: safeResult.intervention || 'supportive_validation',
      techniques: Array.isArray(safeResult.techniques) ? safeResult.techniques.slice(0, 5) : [],
      exercises: Array.isArray(safeResult.exercises) ? safeResult.exercises.slice(0, 3) : [],
      copingStrategies: Array.isArray(safeResult.copingStrategies) ? safeResult.copingStrategies.slice(0, 6) : [],
      reasoning: safeResult.reasoning || 'Therapeutic guidance provided',
      confidence: Math.max(0, Math.min(1, safeResult.confidence || 0.8)),
      insights: Array.isArray(safeResult.insights) ? safeResult.insights : [],
      recommendations: Array.isArray(safeResult.recommendations) ? safeResult.recommendations : [],
      contributedInsights: Array.isArray(safeResult.contributedInsights) ? safeResult.contributedInsights : [],
      therapeuticGoals: Array.isArray(safeResult.therapeuticGoals) ? safeResult.therapeuticGoals.slice(0, 3) : [],
      homeworkSuggestions: Array.isArray(safeResult.homeworkSuggestions) ? safeResult.homeworkSuggestions : [],
      warningFlags: Array.isArray(safeResult.warningFlags) ? safeResult.warningFlags : [],
      progressIndicators: Array.isArray(safeResult.progressIndicators) ? safeResult.progressIndicators : [],
      resourceRecommendations: safeResult.resourceRecommendations || {
        books: [],
        apps: [],
        worksheets: [],
        professionalReferral: false
      }
    }
  }

  /**
   * Format user input for the AI prompt
   */
  protected async formatUserInput(input: any): Promise<string> {
    return buildTherapyAdvisorPrompt(
      input.message,
      input.emotionalContext,
      input.previousResults?.crisis,
      input.memoryContext,
      input.previousResults?.userPreferences
    )
  }

  /**
   * Provide fallback therapeutic result for errors
   */
  protected async getFallbackResult(error: Error, context: AgentContext): Promise<TherapeuticResponse> {
    // Conservative therapeutic fallback
    const message = context.userMessage.toLowerCase()
    const basicIntervention = this.getBasicIntervention(message)
    
    return {
      intervention: basicIntervention.type,
      techniques: basicIntervention.techniques,
      exercises: [{
        name: 'Deep Breathing Exercise',
        instructions: 'Take slow, deep breaths. Inhale for 4 counts, hold for 4, exhale for 6.',
        duration: '5-10 minutes',
        difficulty: 'easy'
      }],
      copingStrategies: [
        'Practice mindful breathing',
        'Reach out to a trusted friend or family member',
        'Engage in a calming activity you enjoy'
      ],
      reasoning: `Fallback therapeutic guidance due to error: ${error.message}. Basic supportive intervention provided.`,
      confidence: 0.4,
      insights: ['Unable to perform full therapeutic analysis'],
      recommendations: ['Consider speaking with a mental health professional'],
      contributedInsights: ['Basic therapeutic fallback used'],
      therapeuticGoals: ['Focus on immediate self-care'],
      homeworkSuggestions: ['Practice deep breathing daily'],
      warningFlags: ['AI therapeutic analysis unavailable'],
      progressIndicators: ['Improved mood stability', 'Better stress management'],
      resourceRecommendations: {
        books: ['The Anxiety and Worry Workbook by David A. Clark'],
        apps: ['Headspace', 'Calm', 'Insight Timer'],
        worksheets: [],
        professionalReferral: true
      }
    }
  }

  /**
   * Validate therapeutic response from AI
   */
  private validateTherapeuticResponse(analysis: any): TherapeuticResponse {
    const validInterventions = [
      'supportive_validation', 'cognitive_restructuring', 'behavioral_activation',
      'mindfulness_based', 'distress_tolerance', 'interpersonal_skills',
      'emotion_regulation', 'trauma_informed', 'crisis_intervention'
    ]
    
    return {
      intervention: validInterventions.includes(analysis.intervention) 
        ? analysis.intervention 
        : 'supportive_validation',
      techniques: Array.isArray(analysis.techniques) ? analysis.techniques : [],
      exercises: Array.isArray(analysis.exercises) ? analysis.exercises : [],
      copingStrategies: Array.isArray(analysis.copingStrategies) ? analysis.copingStrategies : [],
      reasoning: analysis.reasoning || 'Therapeutic intervention provided',
      confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0.8,
      insights: Array.isArray(analysis.insights) ? analysis.insights : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      contributedInsights: Array.isArray(analysis.contributedInsights) ? analysis.contributedInsights : [],
      therapeuticGoals: Array.isArray(analysis.therapeuticGoals) ? analysis.therapeuticGoals : [],
      homeworkSuggestions: Array.isArray(analysis.homeworkSuggestions) ? analysis.homeworkSuggestions : [],
      warningFlags: Array.isArray(analysis.warningFlags) ? analysis.warningFlags : [],
      progressIndicators: Array.isArray(analysis.progressIndicators) ? analysis.progressIndicators : [],
      resourceRecommendations: analysis.resourceRecommendations || {
        books: [],
        apps: [],
        worksheets: [],
        professionalReferral: false
      }
    }
  }

  /**
   * Apply safety guidelines to therapeutic responses
   */
  private async applySafetyGuidelines(result: TherapeuticResponse): Promise<TherapeuticResponse> {
    // Add professional referral warning for severe cases
    if (result.intervention === 'crisis_intervention') {
      result.warningFlags.push('Immediate professional intervention recommended')
      result.resourceRecommendations.professionalReferral = true
    }

    // Ensure crisis resources are always included for high-risk situations
    if (result.warningFlags.some(flag => flag.includes('crisis') || flag.includes('harm'))) {
      result.resourceRecommendations.apps = [
        ...result.resourceRecommendations.apps,
        'Crisis Text Line (Text HOME to 741741)',
        'National Suicide Prevention Lifeline (988)'
      ]
    }

    // Add standard disclaimers for therapeutic interventions
    if (!result.warningFlags.includes('Professional therapy recommended for complex issues')) {
      result.warningFlags.push('This is AI-assisted guidance, not professional therapy')
    }

    return result
  }

  // Fallback intervention methods for error scenarios
  private getBasicIntervention(message: string): { type: string; techniques: string[] } {
    if (message.includes('anxious') || message.includes('panic') || message.includes('worried')) {
      return {
        type: 'anxiety_management',
        techniques: ['deep_breathing', 'grounding_techniques', '5-4-3-2-1_method']
      }
    }
    
    if (message.includes('sad') || message.includes('depressed') || message.includes('down')) {
      return {
        type: 'mood_support',
        techniques: ['behavioral_activation', 'pleasant_activities', 'social_connection']
      }
    }
    
    if (message.includes('angry') || message.includes('frustrated') || message.includes('mad')) {
      return {
        type: 'anger_management',
        techniques: ['emotional_validation', 'cooling_strategies', 'assertiveness_training']
      }
    }
    
    if (message.includes('overwhelmed') || message.includes('stressed') || message.includes('pressure')) {
      return {
        type: 'stress_management',
        techniques: ['mindfulness', 'time_management', 'problem_solving']
      }
    }
    
    return {
      type: 'supportive_validation',
      techniques: ['active_listening', 'emotional_validation', 'gentle_encouragement']
    }
  }
}

// Create singleton instance
export const therapyAdvisor = new TherapyAdvisor()

// Export helper function for backward compatibility
export async function provideTherapyAdvice(
  message: string,
  userId: string,
  startTimeMs: number,
  emotionalState?: any,
  crisisAssessment?: any,
  memoryContext?: any[],
  assignedTask: string = 'Provide therapeutic guidance and intervention recommendations'
): Promise<AgentExecutionResult> {
  const context: AgentContext = {
    userId,
    messageId: `therapy_${Date.now()}`,
    conversationId: `conv_${userId}_${Date.now()}`,
    userMessage: message,
    emotionalState,
    memoryContext,
    previousResults: { crisis: crisisAssessment }
  }
  
  return await therapyAdvisor.execute(context, assignedTask, startTimeMs)
}