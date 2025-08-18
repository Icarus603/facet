/**
 * FACET Emotion Analyzer Agent
 * 
 * Real AI-powered VAD (Valence-Arousal-Dominance) emotion detection and analysis
 * Implements exact AgentExecutionResult format from API_CONTRACT.md
 */

import { BaseAgent, AgentContext, createAgentConfig } from '../base-agent'
import { AgentExecutionResult, AGENT_NAMES, AGENT_CONFIG } from '@/lib/types/api-contract'
import { 
  EMOTION_ANALYZER_SYSTEM_PROMPT, 
  buildEmotionAnalysisPrompt 
} from '../prompts/emotion-analyzer-prompts'
import { getModelForAgent } from '@/lib/openai/client'

// VAD Emotion Model Interface
export interface VADEmotion {
  valence: number      // -1.0 to 1.0 (negative to positive)
  arousal: number      // 0.0 to 1.0 (calm to excited)
  dominance: number    // 0.0 to 1.0 (submissive to dominant)
  confidence: number   // 0.0 to 1.0
  primaryEmotion: string
  intensity: number    // 0.0 to 1.0
  reasoning: string
  insights: string[]
  recommendations: string[]
  contributedInsights: string[]
  therapeuticTriggers?: string[]  // Therapeutic intervention triggers
  emotionRegulation?: {           // Emotion regulation detection
    isPresent: boolean
    strategy: string
    effectiveness: number
  }
}

export class EmotionAnalyzer extends BaseAgent {
  constructor() {
    super(createAgentConfig(
      AGENT_NAMES.EMOTION_ANALYZER,
      AGENT_CONFIG[AGENT_NAMES.EMOTION_ANALYZER].displayName,
      AGENT_CONFIG[AGENT_NAMES.EMOTION_ANALYZER].icon,
      EMOTION_ANALYZER_SYSTEM_PROMPT,
      {
        model: getModelForAgent('emotion_analyzer'),
        temperature: 0.3, // Lower temperature for more consistent emotional analysis
        maxTokens: 2000,
        timeoutMs: 60000 // 60 second timeout for emotion analysis (increased for proxy requests)
      }
    ))
  }

  /**
   * Prepare input for emotion analysis
   */
  protected async prepareInput(context: AgentContext): Promise<any> {
    return {
      message: context.userMessage,
      emotionalContext: context.emotionalState,
      memoryContext: context.memoryContext,
      urgencyLevel: context.urgencyLevel
    }
  }

  /**
   * Perform AI-powered emotion analysis
   */
  protected async performAnalysis(input: any, context: AgentContext): Promise<VADEmotion> {
    try {
      // Build messages for OpenAI
      const messages = await this.buildMessages(input, context)

      // Call OpenAI API
      const response = await this.callOpenAI(messages)

      // Parse JSON response
      const emotionAnalysis = JSON.parse(response)

      // Validate and return structured emotion data
      return this.validateEmotionAnalysis(emotionAnalysis)

    } catch (error) {
      console.error('Emotion analysis error:', error)
      throw error
    }
  }

  /**
   * Process and validate the analysis result
   */
  protected async processResult(result: VADEmotion): Promise<VADEmotion> {
    // Ensure all required fields are present and within valid ranges
    return {
      valence: Math.max(-1, Math.min(1, result.valence || 0)),
      arousal: Math.max(0, Math.min(1, result.arousal || 0.5)),
      dominance: Math.max(0, Math.min(1, result.dominance || 0.5)),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.7)),
      primaryEmotion: result.primaryEmotion || 'neutral',
      intensity: Math.max(0, Math.min(1, result.intensity || 0.5)),
      reasoning: result.reasoning || 'Emotion analysis completed',
      insights: result.insights || [],
      recommendations: result.recommendations || [],
      contributedInsights: result.contributedInsights || [],
      therapeuticTriggers: result.therapeuticTriggers || [],
      emotionRegulation: result.emotionRegulation || {
        isPresent: false,
        strategy: 'none',
        effectiveness: 0
      }
    }
  }

  /**
   * Format user input for the AI prompt
   */
  protected async formatUserInput(input: any): Promise<string> {
    return buildEmotionAnalysisPrompt(
      input.message,
      input.emotionalContext,
      input.memoryContext
    )
  }

  /**
   * Provide fallback result in case of errors
   */
  protected async getFallbackResult(error: Error, context: AgentContext): Promise<VADEmotion> {
    // Simple keyword-based fallback for critical failure scenarios
    const message = context.userMessage.toLowerCase()
    
    return {
      valence: this.getBasicValence(message),
      arousal: this.getBasicArousal(message),
      dominance: 0.5, // Neutral dominance as fallback
      confidence: 0.3, // Low confidence for fallback
      primaryEmotion: this.getBasicEmotion(message),
      intensity: 0.5,
      reasoning: `Fallback analysis due to error: ${error.message}`,
      insights: ['Unable to perform full AI analysis'],
      recommendations: ['Please try again or contact support'],
      contributedInsights: ['Fallback emotion detection used'],
      therapeuticTriggers: this.detectBasicTriggers(message),
      emotionRegulation: {
        isPresent: false,
        strategy: 'unknown',
        effectiveness: 0
      }
    }
  }

  /**
   * Validate emotion analysis response from AI
   */
  private validateEmotionAnalysis(analysis: any): VADEmotion {
    // Ensure required properties exist with fallbacks
    return {
      valence: typeof analysis.valence === 'number' ? analysis.valence : 0,
      arousal: typeof analysis.arousal === 'number' ? analysis.arousal : 0.5,
      dominance: typeof analysis.dominance === 'number' ? analysis.dominance : 0.5,
      confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0.7,
      primaryEmotion: analysis.primaryEmotion || 'neutral',
      intensity: typeof analysis.intensity === 'number' ? analysis.intensity : 0.5,
      reasoning: analysis.reasoning || 'Analysis completed',
      insights: Array.isArray(analysis.insights) ? analysis.insights : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      contributedInsights: Array.isArray(analysis.contributedInsights) ? analysis.contributedInsights : [],
      therapeuticTriggers: Array.isArray(analysis.therapeuticTriggers) ? analysis.therapeuticTriggers : [],
      emotionRegulation: analysis.emotionRegulation || {
        isPresent: false,
        strategy: 'none',
        effectiveness: 0
      }
    }
  }

  // Fallback emotion detection methods for error scenarios
  private getBasicValence(message: string): number {
    const positiveWords = ['happy', 'joy', 'good', 'great', 'amazing', 'love', 'wonderful']
    const negativeWords = ['sad', 'angry', 'terrible', 'awful', 'hate', 'depressed', 'anxious']
    
    let score = 0
    positiveWords.forEach(word => {
      if (message.includes(word)) score += 0.3
    })
    negativeWords.forEach(word => {
      if (message.includes(word)) score -= 0.3
    })
    
    return Math.max(-1, Math.min(1, score))
  }

  private getBasicArousal(message: string): number {
    const highArousalWords = ['excited', 'panic', 'angry', 'thrilled', 'overwhelmed']
    const lowArousalWords = ['calm', 'peaceful', 'tired', 'relaxed', 'sleepy']
    
    let score = 0.5 // Default neutral
    highArousalWords.forEach(word => {
      if (message.includes(word)) score += 0.2
    })
    lowArousalWords.forEach(word => {
      if (message.includes(word)) score -= 0.2
    })
    
    return Math.max(0, Math.min(1, score))
  }

  private getBasicEmotion(message: string): string {
    const emotionKeywords = {
      'anxiety': ['anxious', 'worried', 'nervous'],
      'sadness': ['sad', 'down', 'depressed'],
      'anger': ['angry', 'frustrated', 'mad'],
      'joy': ['happy', 'joyful', 'excited'],
      'fear': ['scared', 'afraid', 'fearful']
    }
    
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return emotion
      }
    }
    
    return 'neutral'
  }

  private detectBasicTriggers(message: string): string[] {
    const triggers = []
    if (message.includes('suicide') || message.includes('kill myself')) {
      triggers.push('crisis_intervention')
    }
    if (message.includes('overwhelmed') || message.includes('can\'t cope')) {
      triggers.push('coping_support')
    }
    if (message.includes('anxious') || message.includes('panic')) {
      triggers.push('anxiety_management')
    }
    return triggers
  }
}

// Create singleton instance
export const emotionAnalyzer = new EmotionAnalyzer()

// Export helper function for backward compatibility
export async function analyzeEmotion(
  message: string, 
  userId: string, 
  startTimeMs: number,
  emotionalState?: any,
  assignedTask: string = 'Analyze emotional content and provide insights'
): Promise<AgentExecutionResult> {
  const context: AgentContext = {
    userId,
    messageId: `emotion_${Date.now()}`,
    conversationId: `conv_${userId}_${Date.now()}`,
    userMessage: message,
    emotionalState
  }
  
  return await emotionAnalyzer.execute(context, assignedTask, startTimeMs)
}