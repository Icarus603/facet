import { AgentResponse, EmotionAnalysis, UserContext } from '@/lib/types/agent'
import { emotionAnalysis, compareWithBaseline } from '@/lib/agents/utils/emotion-analysis'
import { getOpenAIClient } from '@/lib/openai/client'

/**
 * Emotion Analyzer Agent
 * Advanced VAD-based emotion analysis with therapeutic insights
 * Performance Target: <1s for light analysis, <3s for deep analysis
 */

export class EmotionAnalyzer {
  private readonly agentType = 'emotion_analyzer' as const
  private readonly model: string
  private readonly temperature: number

  constructor(model: string = 'gpt-4', temperature: number = 0.3) {
    this.model = model
    this.temperature = temperature
  }

  /**
   * Analyze emotions with VAD model and therapeutic context
   */
  async analyzeEmotion(
    userInput: string,
    userContext: UserContext,
    analysisDepth: 'light' | 'standard' | 'deep' = 'standard'
  ): Promise<AgentResponse> {
    const startTime = performance.now()

    try {
      // Get baseline emotion analysis using VAD model
      const emotionResult = await emotionAnalysis(
        userInput,
        userContext.emotionalHistory
      )

      let therapeuticInsights: string[] = []
      let interventions: string[] = []
      let confidence = emotionResult.confidence

      // Deep analysis includes AI-powered therapeutic insights
      if (analysisDepth === 'deep') {
        const aiInsights = await this.generateTherapeuticInsights(
          userInput,
          emotionResult,
          userContext
        )
        therapeuticInsights = aiInsights.insights
        interventions = aiInsights.interventions
        confidence = Math.max(confidence, aiInsights.confidence)
      }

      // Compare with user baseline if available
      let baselineComparison = null
      if (userContext.emotionalHistory.length > 0) {
        const userBaseline = this.calculateUserBaseline(userContext.emotionalHistory)
        baselineComparison = compareWithBaseline(emotionResult, userBaseline)
      }

      // Generate appropriate response based on emotional state
      const response = this.generateEmotionalResponse(
        emotionResult,
        baselineComparison,
        therapeuticInsights
      )

      const processingTime = performance.now() - startTime

      return {
        agentType: this.agentType,
        content: response,
        confidence,
        processingTime: Math.round(processingTime),
        metadata: {
          reasoning: `VAD Analysis - Valence: ${emotionResult.valence}, Arousal: ${emotionResult.arousal}, Primary: ${emotionResult.primaryEmotion}`,
          interventions,
          recommendations: therapeuticInsights,
          followUpActions: this.generateFollowUpActions(emotionResult)
        }
      }
    } catch (error) {
      console.error('Emotion Analyzer error:', error)
      
      return {
        agentType: this.agentType,
        content: "I'm having trouble analyzing your emotional state right now, but I'm here to listen and support you.",
        confidence: 0.1,
        processingTime: performance.now() - startTime,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      }
    }
  }

  /**
   * Generate therapeutic insights using AI
   */
  private async generateTherapeuticInsights(
    userInput: string,
    emotionAnalysis: EmotionAnalysis,
    userContext: UserContext
  ): Promise<{
    insights: string[]
    interventions: string[]
    confidence: number
  }> {
    const client = getOpenAIClient()

    try {
      const response = await client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a licensed therapist providing emotional analysis insights. 

Analyze the user's emotional state using this data:
- Primary emotion: ${emotionAnalysis.primaryEmotion}
- Intensity: ${emotionAnalysis.intensity}/10
- Valence: ${emotionAnalysis.valence}/100 (negative to positive)
- Arousal: ${emotionAnalysis.arousal}/100 (calm to excited)
- Emotional trend: ${emotionAnalysis.emotionalTrend}

Respond with JSON only:
{
  "insights": ["insight 1", "insight 2"], // 2-3 therapeutic observations
  "interventions": ["intervention 1", "intervention 2"], // 2-3 helpful actions
  "confidence": 0.0-1.0 // Your confidence in this analysis
}`
          },
          {
            role: 'user',
            content: userInput
          }
        ],
        max_tokens: 300,
        temperature: this.temperature
      })

      const result = response.choices[0]?.message?.content?.trim()
      if (result) {
        const parsed = JSON.parse(result)
        return {
          insights: parsed.insights || [],
          interventions: parsed.interventions || [],
          confidence: parsed.confidence || 0.7
        }
      }
    } catch (error) {
      console.error('Error generating therapeutic insights:', error)
    }

    // Fallback insights based on emotion patterns
    return this.generateFallbackInsights(emotionAnalysis)
  }

  /**
   * Generate fallback insights when AI analysis fails
   */
  private generateFallbackInsights(emotionAnalysis: EmotionAnalysis): {
    insights: string[]
    interventions: string[]
    confidence: number
  } {
    const insights: string[] = []
    const interventions: string[] = []

    // High intensity negative emotions
    if (emotionAnalysis.intensity > 7 && emotionAnalysis.valence < 30) {
      insights.push('You appear to be experiencing intense emotional distress')
      interventions.push('Consider grounding techniques like deep breathing')
      interventions.push('Reach out to your support network or a professional')
    }
    
    // Anxiety patterns
    if (emotionAnalysis.emotions.anxiety > 6) {
      insights.push('High arousal and anxiety patterns detected')
      interventions.push('Try the 4-7-8 breathing technique')
      interventions.push('Practice progressive muscle relaxation')
    }

    // Depression patterns
    if (emotionAnalysis.emotions.depression > 5 || emotionAnalysis.emotions.sadness > 6) {
      insights.push('Low valence emotions suggesting possible depressive feelings')
      interventions.push('Consider engaging in a small pleasant activity')
      interventions.push('Connect with a trusted friend or family member')
    }

    // Declining trend
    if (emotionAnalysis.emotionalTrend === 'declining') {
      insights.push('Your emotional state appears to be declining over recent interactions')
      interventions.push('Monitor your emotional patterns closely')
      interventions.push('Consider scheduling a check-in with a mental health professional')
    }

    return {
      insights: insights.length > 0 ? insights : ['Your emotional expression shows normal variation'],
      interventions: interventions.length > 0 ? interventions : ['Continue with your current coping strategies'],
      confidence: 0.6
    }
  }

  /**
   * Calculate user's emotional baseline from history
   */
  private calculateUserBaseline(emotionalHistory: EmotionAnalysis[]): EmotionAnalysis {
    if (emotionalHistory.length === 0) {
      // Default baseline
      return {
        primaryEmotion: 'neutral',
        intensity: 3,
        valence: 50,
        arousal: 40,
        confidence: 0.5,
        emotions: {
          joy: 0,
          sadness: 0,
          anger: 0,
          fear: 0,
          surprise: 0,
          disgust: 0,
          anxiety: 0,
          depression: 0
        },
        linguisticMarkers: [],
        emotionalTrend: 'stable'
      }
    }

    const recent = emotionalHistory.slice(-7) // Last 7 interactions
    
    return {
      primaryEmotion: this.findMostCommonEmotion(recent),
      intensity: Math.round(recent.reduce((sum, e) => sum + e.intensity, 0) / recent.length),
      valence: Math.round(recent.reduce((sum, e) => sum + e.valence, 0) / recent.length),
      arousal: Math.round(recent.reduce((sum, e) => sum + e.arousal, 0) / recent.length),
      confidence: recent.reduce((sum, e) => sum + e.confidence, 0) / recent.length,
      emotions: this.averageEmotions(recent),
      linguisticMarkers: [],
      emotionalTrend: this.determineTrend(recent)
    }
  }

  private findMostCommonEmotion(emotions: EmotionAnalysis[]): string {
    const counts = emotions.reduce((acc, e) => {
      acc[e.primaryEmotion] = (acc[e.primaryEmotion] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0]
  }

  private averageEmotions(emotions: EmotionAnalysis[]): EmotionAnalysis['emotions'] {
    const keys = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'anxiety', 'depression'] as const
    
    return keys.reduce((acc, key) => {
      acc[key] = emotions.reduce((sum, e) => sum + e.emotions[key], 0) / emotions.length
      return acc
    }, {} as EmotionAnalysis['emotions'])
  }

  private determineTrend(emotions: EmotionAnalysis[]): 'improving' | 'stable' | 'declining' {
    if (emotions.length < 3) return 'stable'
    
    const recent = emotions.slice(-3)
    const older = emotions.slice(-6, -3)
    
    if (older.length === 0) return 'stable'
    
    const recentAvgValence = recent.reduce((sum, e) => sum + e.valence, 0) / recent.length
    const olderAvgValence = older.reduce((sum, e) => sum + e.valence, 0) / older.length
    
    const diff = recentAvgValence - olderAvgValence
    
    if (diff > 10) return 'improving'
    if (diff < -10) return 'declining'
    return 'stable'
  }

  /**
   * Generate appropriate emotional response
   */
  private generateEmotionalResponse(
    emotion: EmotionAnalysis,
    baselineComparison: any,
    therapeuticInsights: string[]
  ): string {
    let response = "I can hear the emotions in what you're sharing. "

    // Acknowledge primary emotion
    if (emotion.intensity > 6) {
      response += `You seem to be experiencing quite intense ${emotion.primaryEmotion}. `
    } else {
      response += `I notice you're feeling ${emotion.primaryEmotion}. `
    }

    // Add therapeutic insight
    if (therapeuticInsights.length > 0) {
      response += therapeuticInsights[0] + " "
    }

    // Address significant changes
    if (baselineComparison?.significantChange) {
      if (baselineComparison.direction === 'negative') {
        response += "I notice this seems different from how you've been feeling lately. "
      } else if (baselineComparison.direction === 'positive') {
        response += "It sounds like things might be looking up compared to recently. "
      }
    }

    response += "Would you like to explore what's contributing to these feelings?"

    return response
  }

  /**
   * Generate follow-up actions based on emotional state
   */
  private generateFollowUpActions(emotion: EmotionAnalysis): string[] {
    const actions: string[] = []

    if (emotion.intensity > 7) {
      actions.push('monitor_emotional_intensity')
    }

    if (emotion.valence < 30 && emotion.intensity > 5) {
      actions.push('assess_crisis_risk')
      actions.push('provide_immediate_support')
    }

    if (emotion.emotions.anxiety > 6) {
      actions.push('offer_anxiety_coping_techniques')
    }

    if (emotion.emotionalTrend === 'declining') {
      actions.push('schedule_follow_up')
      actions.push('assess_support_needs')
    }

    return actions
  }
}