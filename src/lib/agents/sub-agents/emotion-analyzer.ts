/**
 * FACET Emotion Analyzer Agent
 * 
 * Enhanced VAD (Valence-Arousal-Dominance) emotion detection and analysis
 * Implements exact AgentExecutionResult format from API_CONTRACT.md
 */

import { AgentExecutionResult, AGENT_NAMES, AGENT_CONFIG } from '@/lib/types/api-contract'

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
}

export class EmotionAnalyzer {
  private emotionKeywords: Record<string, { valence: number, arousal: number, dominance: number, intensity: number }> = {
    // Positive emotions
    'happy': { valence: 0.8, arousal: 0.6, dominance: 0.7, intensity: 0.7 },
    'joy': { valence: 0.9, arousal: 0.8, dominance: 0.8, intensity: 0.8 },
    'excited': { valence: 0.7, arousal: 0.9, dominance: 0.8, intensity: 0.8 },
    'calm': { valence: 0.6, arousal: 0.2, dominance: 0.6, intensity: 0.5 },
    'peaceful': { valence: 0.7, arousal: 0.1, dominance: 0.5, intensity: 0.6 },
    'confident': { valence: 0.6, arousal: 0.5, dominance: 0.9, intensity: 0.7 },
    'grateful': { valence: 0.8, arousal: 0.4, dominance: 0.6, intensity: 0.7 },
    'hopeful': { valence: 0.7, arousal: 0.5, dominance: 0.6, intensity: 0.6 },
    
    // Negative emotions
    'sad': { valence: -0.7, arousal: 0.3, dominance: 0.2, intensity: 0.6 },
    'depressed': { valence: -0.8, arousal: 0.2, dominance: 0.1, intensity: 0.8 },
    'anxious': { valence: -0.5, arousal: 0.8, dominance: 0.3, intensity: 0.7 },
    'worried': { valence: -0.4, arousal: 0.6, dominance: 0.3, intensity: 0.6 },
    'angry': { valence: -0.6, arousal: 0.8, dominance: 0.8, intensity: 0.8 },
    'frustrated': { valence: -0.5, arousal: 0.7, dominance: 0.6, intensity: 0.7 },
    'overwhelmed': { valence: -0.6, arousal: 0.9, dominance: 0.2, intensity: 0.8 },
    'hopeless': { valence: -0.9, arousal: 0.2, dominance: 0.1, intensity: 0.9 },
    'panic': { valence: -0.8, arousal: 1.0, dominance: 0.1, intensity: 0.9 },
    'fear': { valence: -0.7, arousal: 0.8, dominance: 0.2, intensity: 0.8 },
    'lonely': { valence: -0.6, arousal: 0.3, dominance: 0.2, intensity: 0.7 },
    'guilty': { valence: -0.6, arousal: 0.5, dominance: 0.2, intensity: 0.6 },
    'ashamed': { valence: -0.7, arousal: 0.4, dominance: 0.1, intensity: 0.7 },
    
    // Neutral/mixed emotions
    'confused': { valence: -0.2, arousal: 0.6, dominance: 0.3, intensity: 0.5 },
    'tired': { valence: -0.3, arousal: 0.1, dominance: 0.3, intensity: 0.5 },
    'numb': { valence: -0.4, arousal: 0.1, dominance: 0.2, intensity: 0.6 },
    'okay': { valence: 0.1, arousal: 0.3, dominance: 0.5, intensity: 0.3 }
  }

  private intensityModifiers: Record<string, number> = {
    'extremely': 1.0,
    'very': 0.8,
    'really': 0.8,
    'quite': 0.6,
    'somewhat': 0.4,
    'a bit': 0.3,
    'slightly': 0.2,
    'barely': 0.1
  }

  private contextPatterns = {
    work: ['work', 'job', 'boss', 'colleague', 'deadline', 'meeting', 'project'],
    relationship: ['partner', 'boyfriend', 'girlfriend', 'husband', 'wife', 'friend', 'family'],
    health: ['sick', 'pain', 'doctor', 'medical', 'health', 'medicine', 'therapy'],
    future: ['future', 'tomorrow', 'plan', 'goal', 'dream', 'hope', 'career'],
    past: ['past', 'memory', 'remember', 'used to', 'before', 'childhood']
  }

  /**
   * Analyze emotional content and return comprehensive VAD assessment
   */
  async analyze(
    message: string,
    userId: string,
    startTimeMs: number,
    assignedTask: string = 'Analyze emotional content using VAD model'
  ): Promise<AgentExecutionResult> {
    const agentStart = Date.now()
    
    try {
      // Perform comprehensive emotion analysis
      const emotionResult = await this.performVADAnalysis(message)
      const executionTimeMs = Date.now() - agentStart

      return {
        agentName: AGENT_NAMES.EMOTION_ANALYZER,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.EMOTION_ANALYZER].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.EMOTION_ANALYZER].icon,
        assignedTask,
        inputData: { message, userId },
        executionTimeMs,
        executionType: 'parallel',
        startTimeMs: agentStart - startTimeMs,
        endTimeMs: (agentStart - startTimeMs) + executionTimeMs,
        result: emotionResult,
        confidence: emotionResult.confidence,
        success: true,
        reasoning: emotionResult.reasoning,
        keyInsights: emotionResult.insights,
        recommendationsToOrchestrator: emotionResult.recommendations,
        influenceOnFinalResponse: this.calculateInfluence(emotionResult),
        contributedInsights: emotionResult.contributedInsights
      }
    } catch (error) {
      const executionTimeMs = Date.now() - agentStart
      
      return {
        agentName: AGENT_NAMES.EMOTION_ANALYZER,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.EMOTION_ANALYZER].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.EMOTION_ANALYZER].icon,
        assignedTask,
        inputData: { message, userId },
        executionTimeMs,
        executionType: 'parallel',
        startTimeMs: agentStart - startTimeMs,
        endTimeMs: (agentStart - startTimeMs) + executionTimeMs,
        result: null,
        confidence: 0.0,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        reasoning: 'Failed to perform emotion analysis',
        keyInsights: [],
        recommendationsToOrchestrator: ['fallback_to_neutral_response'],
        influenceOnFinalResponse: 0.0,
        contributedInsights: []
      }
    }
  }

  /**
   * Perform comprehensive VAD emotion analysis
   */
  private async performVADAnalysis(message: string): Promise<VADEmotion> {
    const lowerMessage = message.toLowerCase()
    
    // 1. Extract emotional keywords and their weights
    const detectedEmotions = this.extractEmotions(lowerMessage)
    
    // 2. Apply intensity modifiers
    const modifiedEmotions = this.applyIntensityModifiers(detectedEmotions, lowerMessage)
    
    // 3. Calculate weighted VAD scores
    const vadScores = this.calculateVADScores(modifiedEmotions)
    
    // 4. Determine primary emotion
    const primaryEmotion = this.determinePrimaryEmotion(modifiedEmotions, vadScores)
    
    // 5. Calculate overall intensity
    const intensity = this.calculateOverallIntensity(modifiedEmotions)
    
    // 6. Assess confidence based on clarity and consistency
    const confidence = this.assessConfidence(modifiedEmotions, message)
    
    // 7. Analyze emotional context
    const context = this.analyzeEmotionalContext(lowerMessage)
    
    // 8. Generate insights and recommendations
    const insights = this.generateEmotionalInsights(vadScores, primaryEmotion, context, intensity)
    const recommendations = this.generateRecommendations(vadScores, primaryEmotion, intensity)
    const reasoning = this.generateReasoning(vadScores, primaryEmotion, detectedEmotions, confidence)
    
    return {
      valence: vadScores.valence,
      arousal: vadScores.arousal,
      dominance: vadScores.dominance,
      confidence,
      primaryEmotion,
      intensity,
      reasoning,
      insights,
      recommendations,
      contributedInsights: this.generateContributedInsights(primaryEmotion, intensity, context)
    }
  }

  private extractEmotions(message: string): Array<{ emotion: string, weight: number, values: any }> {
    const detected = []
    
    for (const [emotion, values] of Object.entries(this.emotionKeywords)) {
      if (message.includes(emotion)) {
        // Calculate weight based on word frequency and position
        const frequency = (message.match(new RegExp(emotion, 'g')) || []).length
        const position = message.indexOf(emotion) / message.length
        const weight = frequency * (1 - position * 0.3) // Words earlier in message have more weight
        
        detected.push({ emotion, weight, values })
      }
    }
    
    return detected
  }

  private applyIntensityModifiers(emotions: any[], message: string): any[] {
    return emotions.map(emotion => {
      let intensityMultiplier = 1.0
      
      for (const [modifier, multiplier] of Object.entries(this.intensityModifiers)) {
        if (message.includes(modifier)) {
          intensityMultiplier = Math.max(intensityMultiplier, multiplier)
        }
      }
      
      return {
        ...emotion,
        weight: emotion.weight * intensityMultiplier,
        values: {
          ...emotion.values,
          intensity: Math.min(emotion.values.intensity * intensityMultiplier, 1.0)
        }
      }
    })
  }

  private calculateVADScores(emotions: any[]): { valence: number, arousal: number, dominance: number } {
    if (emotions.length === 0) {
      return { valence: 0.0, arousal: 0.4, dominance: 0.5 } // Neutral baseline
    }
    
    const totalWeight = emotions.reduce((sum, e) => sum + e.weight, 0)
    
    const valence = emotions.reduce((sum, e) => sum + (e.values.valence * e.weight), 0) / totalWeight
    const arousal = emotions.reduce((sum, e) => sum + (e.values.arousal * e.weight), 0) / totalWeight
    const dominance = emotions.reduce((sum, e) => sum + (e.values.dominance * e.weight), 0) / totalWeight
    
    return {
      valence: Math.max(-1, Math.min(1, valence)),
      arousal: Math.max(0, Math.min(1, arousal)),
      dominance: Math.max(0, Math.min(1, dominance))
    }
  }

  private determinePrimaryEmotion(emotions: any[], vadScores: any): string {
    if (emotions.length === 0) {
      return this.getEmotionFromVAD(vadScores)
    }
    
    // Return the emotion with highest weighted intensity
    const strongest = emotions.reduce((max, current) => 
      (current.weight * current.values.intensity) > (max.weight * max.values.intensity) ? current : max
    )
    
    return strongest.emotion
  }

  private getEmotionFromVAD(vad: { valence: number, arousal: number, dominance: number }): string {
    // Map VAD coordinates to emotion categories
    if (vad.valence > 0.3) {
      if (vad.arousal > 0.6) return 'excited'
      if (vad.arousal < 0.3) return 'calm'
      return 'happy'
    } else if (vad.valence < -0.3) {
      if (vad.arousal > 0.7) return 'anxious'
      if (vad.arousal < 0.3) return 'sad'
      return 'frustrated'
    } else {
      return 'neutral'
    }
  }

  private calculateOverallIntensity(emotions: any[]): number {
    if (emotions.length === 0) return 0.3
    
    const avgIntensity = emotions.reduce((sum, e) => sum + e.values.intensity, 0) / emotions.length
    const maxIntensity = Math.max(...emotions.map(e => e.values.intensity))
    
    // Combine average and max for balanced intensity assessment
    return (avgIntensity * 0.6) + (maxIntensity * 0.4)
  }

  private assessConfidence(emotions: any[], message: string): number {
    let confidence = 0.5 // Base confidence
    
    // Increase confidence with clear emotional indicators
    if (emotions.length > 0) confidence += 0.2
    if (emotions.length > 2) confidence += 0.1
    
    // Increase confidence with explicit emotional statements
    const explicitEmotionalPhrases = [
      'i feel', 'i am feeling', 'feeling', 'i\'m so', 'makes me', 'i get'
    ]
    
    if (explicitEmotionalPhrases.some(phrase => message.includes(phrase))) {
      confidence += 0.2
    }
    
    // Decrease confidence with ambiguous language
    const ambiguousWords = ['maybe', 'perhaps', 'might', 'could be', 'sort of']
    if (ambiguousWords.some(word => message.includes(word))) {
      confidence -= 0.1
    }
    
    // Decrease confidence with very short messages
    if (message.length < 20) confidence -= 0.1
    
    return Math.max(0.1, Math.min(1.0, confidence))
  }

  private analyzeEmotionalContext(message: string): string[] {
    const contexts = []
    
    for (const [context, keywords] of Object.entries(this.contextPatterns)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        contexts.push(context)
      }
    }
    
    return contexts
  }

  private generateEmotionalInsights(
    vad: any, 
    primaryEmotion: string, 
    contexts: string[], 
    intensity: number
  ): string[] {
    const insights = []
    
    // VAD-based insights
    if (vad.valence < -0.5) {
      insights.push('User experiencing negative emotional state requiring supportive response')
    }
    if (vad.arousal > 0.7) {
      insights.push('High emotional activation detected - user may benefit from calming techniques')
    }
    if (vad.dominance < 0.3) {
      insights.push('Low sense of control - empowerment strategies may be helpful')
    }
    
    // Context-based insights
    if (contexts.includes('work')) {
      insights.push('Work-related emotional content identified')
    }
    if (contexts.includes('relationship')) {
      insights.push('Relationship dynamics affecting emotional state')
    }
    
    // Intensity-based insights
    if (intensity > 0.7) {
      insights.push('High emotional intensity - prioritize immediate emotional support')
    }
    
    return insights
  }

  private generateRecommendations(vad: any, primaryEmotion: string, intensity: number): string[] {
    const recommendations = []
    
    // Crisis emotions need immediate attention
    if (['hopeless', 'panic', 'desperation'].includes(primaryEmotion)) {
      recommendations.push('escalate_to_crisis_monitor')
    }
    
    // High arousal emotions benefit from calming
    if (vad.arousal > 0.7) {
      recommendations.push('provide_calming_techniques')
    }
    
    // Low valence needs validation and support
    if (vad.valence < -0.4) {
      recommendations.push('provide_emotional_validation')
      recommendations.push('offer_supportive_interventions')
    }
    
    // Low dominance needs empowerment
    if (vad.dominance < 0.4) {
      recommendations.push('focus_on_user_agency')
    }
    
    // High intensity needs immediate attention
    if (intensity > 0.7) {
      recommendations.push('prioritize_immediate_support')
    }
    
    return recommendations
  }

  private generateReasoning(vad: any, primaryEmotion: string, emotions: any[], confidence: number): string {
    const emotionList = emotions.map(e => e.emotion).join(', ')
    
    let reasoning = `Detected primary emotion: ${primaryEmotion}`
    
    if (emotions.length > 1) {
      reasoning += ` among multiple emotional indicators (${emotionList})`
    }
    
    reasoning += `. VAD assessment: valence ${vad.valence.toFixed(2)} (${vad.valence > 0 ? 'positive' : 'negative'}), `
    reasoning += `arousal ${vad.arousal.toFixed(2)} (${vad.arousal > 0.5 ? 'high' : 'low'}), `
    reasoning += `dominance ${vad.dominance.toFixed(2)} (${vad.dominance > 0.5 ? 'high' : 'low'} control).`
    
    if (confidence < 0.6) {
      reasoning += ' Moderate confidence due to limited emotional indicators.'
    } else if (confidence > 0.8) {
      reasoning += ' High confidence based on clear emotional expression.'
    }
    
    return reasoning
  }

  private generateContributedInsights(primaryEmotion: string, intensity: number, contexts: string[]): string[] {
    const insights = []
    
    insights.push(`Primary emotion identified: ${primaryEmotion}`)
    
    if (intensity > 0.6) {
      insights.push('High emotional intensity requiring immediate attention')
    }
    
    if (contexts.length > 0) {
      insights.push(`Emotional context: ${contexts.join(', ')}`)
    }
    
    return insights
  }

  private calculateInfluence(emotionResult: VADEmotion): number {
    // Base influence on emotional intensity and confidence
    let influence = (emotionResult.intensity * 0.6) + (emotionResult.confidence * 0.4)
    
    // Crisis emotions have maximum influence
    if (['hopeless', 'panic', 'suicidal'].includes(emotionResult.primaryEmotion)) {
      influence = 1.0
    }
    
    // High arousal emotions increase influence
    if (emotionResult.arousal > 0.7) {
      influence = Math.min(1.0, influence + 0.2)
    }
    
    return influence
  }
}

// Export singleton instance
export const emotionAnalyzer = new EmotionAnalyzer()