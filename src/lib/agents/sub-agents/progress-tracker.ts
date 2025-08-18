/**
 * FACET Progress Tracker Agent
 * 
 * Real AI-powered therapeutic progress monitoring, goal tracking, and outcome measurement
 * Implements exact AgentExecutionResult format from API_CONTRACT.md
 */

import { BaseAgent, AgentContext, createAgentConfig } from '../base-agent'
import { AgentExecutionResult, AGENT_NAMES, AGENT_CONFIG } from '@/lib/types/api-contract'
import { 
  PROGRESS_TRACKER_SYSTEM_PROMPT, 
  buildProgressTrackingPrompt 
} from '../prompts/progress-tracker-prompts'
import { getModelForAgent } from '@/lib/openai/client'

export interface ProgressAssessment {
  overallProgressScore: number            // 0-10 overall progress rating
  domainProgress: {                       // Progress by domain
    emotionalRegulation: {
      score: number                       // 0-10
      trend: 'improving' | 'stable' | 'declining'
      evidence: string[]                  // Supporting evidence
      concerns: string[]                  // Areas needing attention
    }
    behavioralActivation: {
      score: number
      trend: 'improving' | 'stable' | 'declining'
      evidence: string[]
      concerns: string[]
    }
    cognitivePatterns: {
      score: number
      trend: 'improving' | 'stable' | 'declining'
      evidence: string[]
      concerns: string[]
    }
    interpersonalFunctioning: {
      score: number
      trend: 'improving' | 'stable' | 'declining'
      evidence: string[]
      concerns: string[]
    }
    crisisManagement: {
      score: number
      trend: 'improving' | 'stable' | 'declining'
      evidence: string[]
      concerns: string[]
    }
    overallFunctioning: {
      score: number
      trend: 'improving' | 'stable' | 'declining'
      evidence: string[]
      concerns: string[]
    }
  }
  goalProgress: {                         // Therapeutic goal tracking
    goalId: string
    description: string
    status: 'not_started' | 'in_progress' | 'achieved' | 'modified' | 'discontinued'
    progressPercentage: number            // 0-100
    milestonesMet: string[]
    nextSteps: string[]
    adjustmentsNeeded: string[]
  }[]
  progressIndicators: string[]            // Current positive indicators
  concerningTrends: string[]              // Warning signs or negative trends
  interventionEffectiveness: {            // Which interventions are working
    intervention: string
    effectiveness: number                 // 0-10
    evidence: string[]
    recommendations: string[]
  }[]
  reasoning: string                       // Progress assessment reasoning
  confidence: number                      // 0.0-1.0 assessment confidence
  insights: string[]                      // Progress-related insights
  recommendations: string[]               // Progress optimization recommendations
  contributedInsights: string[]           // Coordination insights
  sessionComparisons: {                   // Historical progress comparison
    previousSessions: number              // Number of sessions compared
    trendAnalysis: string                 // Overall trend description
    significantChanges: string[]          // Major changes identified
    consistencyFactors: string[]          // Factors supporting consistency
  }
  riskAssessment: {                       // Risk-related progress
    riskTrend: 'improving' | 'stable' | 'worsening'
    riskFactors: string[]
    protectiveFactors: string[]
    safetySkillDevelopment: number        // 0-10 safety skill progress
  }
}

export class ProgressTracker extends BaseAgent {
  constructor() {
    super(createAgentConfig(
      AGENT_NAMES.PROGRESS_TRACKER,
      AGENT_CONFIG[AGENT_NAMES.PROGRESS_TRACKER].displayName,
      AGENT_CONFIG[AGENT_NAMES.PROGRESS_TRACKER].icon,
      PROGRESS_TRACKER_SYSTEM_PROMPT,
      {
        model: getModelForAgent('progress_tracker'),
        temperature: 0.4, // Moderate temperature for balanced assessment
        maxTokens: 3500,
        timeoutMs: 60000 // 60 second timeout for comprehensive progress analysis (increased for proxy requests)
      }
    ))
  }

  /**
   * Prepare input for progress analysis
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
   * Perform AI-powered progress analysis
   */
  protected async performAnalysis(input: any, context: AgentContext): Promise<ProgressAssessment> {
    try {
      // Build messages for OpenAI
      const messages = await this.buildMessages(input, context)

      // Call OpenAI API
      const response = await this.callOpenAI(messages)

      // Parse JSON response
      const progressAnalysis = JSON.parse(response)

      // Validate and return structured progress assessment
      return this.validateProgressAssessment(progressAnalysis)

    } catch (error) {
      console.error('Progress analysis error:', error)
      throw error
    }
  }

  /**
   * Process and validate the analysis result
   */
  protected async processResult(result: ProgressAssessment): Promise<ProgressAssessment> {
    // Ensure all scores are within valid ranges
    const processedResult = {
      ...result,
      overallProgressScore: Math.max(0, Math.min(10, result.overallProgressScore || 5)),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.7)),
      progressIndicators: Array.isArray(result.progressIndicators) ? result.progressIndicators : [],
      concerningTrends: Array.isArray(result.concerningTrends) ? result.concerningTrends : [],
      insights: Array.isArray(result.insights) ? result.insights : [],
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
      contributedInsights: Array.isArray(result.contributedInsights) ? result.contributedInsights : []
    }

    // Validate domain progress scores
    if (processedResult.domainProgress) {
      Object.values(processedResult.domainProgress).forEach(domain => {
        if (domain && typeof domain === 'object') {
          domain.score = Math.max(0, Math.min(10, domain.score || 5))
          domain.evidence = Array.isArray(domain.evidence) ? domain.evidence : []
          domain.concerns = Array.isArray(domain.concerns) ? domain.concerns : []
        }
      })
    }

    // Validate goal progress percentages
    if (Array.isArray(processedResult.goalProgress)) {
      processedResult.goalProgress.forEach(goal => {
        goal.progressPercentage = Math.max(0, Math.min(100, goal.progressPercentage || 0))
        goal.milestonesMet = Array.isArray(goal.milestonesMet) ? goal.milestonesMet : []
        goal.nextSteps = Array.isArray(goal.nextSteps) ? goal.nextSteps : []
        goal.adjustmentsNeeded = Array.isArray(goal.adjustmentsNeeded) ? goal.adjustmentsNeeded : []
      })
    }

    return processedResult
  }

  /**
   * Format user input for the AI prompt
   */
  protected async formatUserInput(input: any): Promise<string> {
    return buildProgressTrackingPrompt(
      input.message,
      input.emotionalContext,
      input.previousResults?.therapy,
      input.memoryContext,
      input.previousResults?.previousProgress
    )
  }

  /**
   * Provide fallback progress assessment for errors
   */
  protected async getFallbackResult(error: Error, context: AgentContext): Promise<ProgressAssessment> {
    // Basic progress assessment when AI fails
    const message = context.userMessage.toLowerCase()
    const basicScore = this.getBasicProgressScore(message)
    
    return {
      overallProgressScore: basicScore,
      domainProgress: {
        emotionalRegulation: {
          score: basicScore,
          trend: basicScore >= 6 ? 'improving' : basicScore >= 4 ? 'stable' : 'declining',
          evidence: ['Limited assessment data available'],
          concerns: ['AI analysis unavailable']
        },
        behavioralActivation: {
          score: basicScore,
          trend: 'stable',
          evidence: ['Basic assessment only'],
          concerns: []
        },
        cognitivePatterns: {
          score: basicScore,
          trend: 'stable',
          evidence: [],
          concerns: []
        },
        interpersonalFunctioning: {
          score: basicScore,
          trend: 'stable',
          evidence: [],
          concerns: []
        },
        crisisManagement: {
          score: basicScore,
          trend: 'stable',
          evidence: [],
          concerns: []
        },
        overallFunctioning: {
          score: basicScore,
          trend: 'stable',
          evidence: [],
          concerns: []
        }
      },
      goalProgress: [],
      progressIndicators: basicScore >= 6 ? ['User engaged in conversation'] : [],
      concerningTrends: basicScore < 4 ? ['Limited progress data available'] : [],
      interventionEffectiveness: [],
      reasoning: `Fallback progress assessment due to error: ${error.message}. Basic evaluation provided.`,
      confidence: 0.3,
      insights: ['Unable to perform full progress analysis'],
      recommendations: ['Consider tracking progress over multiple sessions'],
      contributedInsights: ['Basic progress fallback used'],
      sessionComparisons: {
        previousSessions: 0,
        trendAnalysis: 'Insufficient data for trend analysis',
        significantChanges: [],
        consistencyFactors: []
      },
      riskAssessment: {
        riskTrend: 'stable',
        riskFactors: [],
        protectiveFactors: [],
        safetySkillDevelopment: basicScore
      }
    }
  }

  /**
   * Validate progress assessment response from AI
   */
  private validateProgressAssessment(analysis: any): ProgressAssessment {
    const validTrends = ['improving', 'stable', 'declining']
    const validStatuses = ['not_started', 'in_progress', 'achieved', 'modified', 'discontinued']
    
    // Create default domain structure
    const defaultDomain = {
      score: 5,
      trend: 'stable' as const,
      evidence: [],
      concerns: []
    }

    return {
      overallProgressScore: typeof analysis.overallProgressScore === 'number' 
        ? analysis.overallProgressScore 
        : 5,
      domainProgress: {
        emotionalRegulation: analysis.domainProgress?.emotionalRegulation || defaultDomain,
        behavioralActivation: analysis.domainProgress?.behavioralActivation || defaultDomain,
        cognitivePatterns: analysis.domainProgress?.cognitivePatterns || defaultDomain,
        interpersonalFunctioning: analysis.domainProgress?.interpersonalFunctioning || defaultDomain,
        crisisManagement: analysis.domainProgress?.crisisManagement || defaultDomain,
        overallFunctioning: analysis.domainProgress?.overallFunctioning || defaultDomain
      },
      goalProgress: Array.isArray(analysis.goalProgress) 
        ? analysis.goalProgress.map((goal: any) => ({
            goalId: goal.goalId || 'unknown',
            description: goal.description || 'No description',
            status: validStatuses.includes(goal.status) ? goal.status : 'not_started',
            progressPercentage: typeof goal.progressPercentage === 'number' ? goal.progressPercentage : 0,
            milestonesMet: Array.isArray(goal.milestonesMet) ? goal.milestonesMet : [],
            nextSteps: Array.isArray(goal.nextSteps) ? goal.nextSteps : [],
            adjustmentsNeeded: Array.isArray(goal.adjustmentsNeeded) ? goal.adjustmentsNeeded : []
          }))
        : [],
      progressIndicators: Array.isArray(analysis.progressIndicators) ? analysis.progressIndicators : [],
      concerningTrends: Array.isArray(analysis.concerningTrends) ? analysis.concerningTrends : [],
      interventionEffectiveness: Array.isArray(analysis.interventionEffectiveness) 
        ? analysis.interventionEffectiveness 
        : [],
      reasoning: analysis.reasoning || 'Progress assessment completed',
      confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0.7,
      insights: Array.isArray(analysis.insights) ? analysis.insights : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      contributedInsights: Array.isArray(analysis.contributedInsights) ? analysis.contributedInsights : [],
      sessionComparisons: analysis.sessionComparisons || {
        previousSessions: 0,
        trendAnalysis: 'Initial assessment',
        significantChanges: [],
        consistencyFactors: []
      },
      riskAssessment: analysis.riskAssessment || {
        riskTrend: 'stable',
        riskFactors: [],
        protectiveFactors: [],
        safetySkillDevelopment: 5
      }
    }
  }

  // Fallback progress scoring for error scenarios
  private getBasicProgressScore(message: string): number {
    let score = 5 // Default neutral
    
    // Positive indicators
    const positiveWords = ['better', 'improved', 'good', 'progress', 'helpful', 'working']
    if (positiveWords.some(word => message.includes(word))) {
      score += 2
    }
    
    // Negative indicators
    const negativeWords = ['worse', 'difficult', 'struggling', 'hard', 'problem', 'can\'t']
    if (negativeWords.some(word => message.includes(word))) {
      score -= 2
    }
    
    // Engagement indicators
    if (message.length > 20) { // User is providing detailed responses
      score += 1
    }
    
    // Crisis indicators
    const crisisWords = ['hopeless', 'suicide', 'end it', 'give up']
    if (crisisWords.some(word => message.includes(word))) {
      score = Math.min(score - 3, 2) // Cap at very low but not zero
    }
    
    return Math.max(0, Math.min(10, score))
  }
}

// Create singleton instance
export const progressTracker = new ProgressTracker()

// Export helper function for backward compatibility
export async function trackProgress(
  userId: string,
  emotionalAnalysis?: any,
  therapyAdvice?: any,
  startTimeMs: number = Date.now(),
  assignedTask: string = 'Track therapeutic progress and goal achievement'
): Promise<AgentExecutionResult> {
  const context: AgentContext = {
    userId,
    messageId: `progress_${Date.now()}`,
    conversationId: `conv_${userId}_${Date.now()}`,
    userMessage: 'Progress tracking analysis',
    previousResults: {
      emotion: emotionalAnalysis,
      therapy: therapyAdvice
    }
  }
  
  return await progressTracker.execute(context, assignedTask, startTimeMs)
}