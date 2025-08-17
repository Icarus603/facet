/**
 * FACET Therapy Advisor Agent
 * 
 * Evidence-based therapeutic interventions and personalized support
 * Implements exact AgentExecutionResult format from API_CONTRACT.md
 */

import { AgentExecutionResult, AGENT_NAMES, AGENT_CONFIG } from '@/lib/types/api-contract'

export interface TherapeuticResponse {
  primaryApproach: TherapeuticApproach
  interventions: TherapeuticIntervention[]
  response: string
  techniques: string[]
  recommendations: string[]
  rationale: string
  confidence: number
  followUpSuggestions: string[]
  resourceRecommendations: ResourceRecommendation[]
}

export interface TherapeuticApproach {
  type: 'CBT' | 'DBT' | 'ACT' | 'Mindfulness' | 'Psychodynamic' | 'Humanistic' | 'Solution-Focused'
  reasoning: string
  suitability: number
  evidenceBase: string
}

export interface TherapeuticIntervention {
  name: string
  category: 'cognitive' | 'behavioral' | 'emotional' | 'interpersonal' | 'mindfulness'
  technique: string
  instructions: string
  expectedOutcome: string
  timeframe: string
}

export interface ResourceRecommendation {
  type: 'exercise' | 'reading' | 'app' | 'professional' | 'support_group' | 'crisis_line'
  title: string
  description: string
  urgency: 'low' | 'medium' | 'high' | 'immediate'
  accessibility: 'free' | 'subscription' | 'professional_required'
}

export class TherapyAdvisor {
  private therapeuticApproaches = {
    CBT: {
      description: 'Cognitive Behavioral Therapy - addresses thought patterns and behaviors',
      keyTechniques: ['thought_challenging', 'behavioral_activation', 'exposure_therapy'],
      bestFor: ['anxiety', 'depression', 'negative_thinking', 'behavioral_patterns'],
      evidenceLevel: 'strong'
    },
    DBT: {
      description: 'Dialectical Behavior Therapy - emotion regulation and distress tolerance',
      keyTechniques: ['distress_tolerance', 'emotion_regulation', 'interpersonal_effectiveness'],
      bestFor: ['emotional_dysregulation', 'crisis', 'interpersonal_issues'],
      evidenceLevel: 'strong'
    },
    ACT: {
      description: 'Acceptance and Commitment Therapy - psychological flexibility',
      keyTechniques: ['acceptance', 'mindfulness', 'values_clarification'],
      bestFor: ['avoidance', 'rumination', 'values_conflicts'],
      evidenceLevel: 'moderate'
    },
    Mindfulness: {
      description: 'Mindfulness-based interventions - present-moment awareness',
      keyTechniques: ['breathing_exercises', 'body_awareness', 'observational_skills'],
      bestFor: ['anxiety', 'stress', 'attention_issues', 'emotional_reactivity'],
      evidenceLevel: 'strong'
    },
    Humanistic: {
      description: 'Person-centered approach - empathy and unconditional regard',
      keyTechniques: ['active_listening', 'reflection', 'validation'],
      bestFor: ['self_esteem', 'identity_issues', 'general_support'],
      evidenceLevel: 'moderate'
    }
  }

  private interventionLibrary = {
    cognitive: [
      {
        name: 'Thought Challenging',
        technique: 'Identify and examine negative thought patterns',
        instructions: 'Notice automatic thoughts, examine evidence for/against, develop balanced alternatives',
        expectedOutcome: 'Reduced cognitive distortions and improved mood',
        timeframe: '2-3 weeks of practice'
      },
      {
        name: 'Cognitive Restructuring',
        technique: 'Reframe negative interpretations with realistic perspectives',
        instructions: 'Write down triggering situation, identify thoughts, feelings, and create balanced view',
        expectedOutcome: 'More realistic thinking patterns',
        timeframe: 'Daily practice for 1-2 weeks'
      }
    ],
    behavioral: [
      {
        name: 'Behavioral Activation',
        technique: 'Increase engagement in meaningful activities',
        instructions: 'Schedule pleasant activities daily, start small, gradually increase complexity',
        expectedOutcome: 'Improved mood and energy through activity',
        timeframe: '1-2 weeks to see initial benefits'
      },
      {
        name: 'Graded Exposure',
        technique: 'Gradual exposure to anxiety-provoking situations',
        instructions: 'Create anxiety hierarchy, start with least threatening, practice regularly',
        expectedOutcome: 'Reduced avoidance and anxiety responses',
        timeframe: '4-8 weeks depending on complexity'
      }
    ],
    emotional: [
      {
        name: 'Emotion Regulation',
        technique: 'Develop skills to manage intense emotions',
        instructions: 'Practice TIPP technique: Temperature, Intense exercise, Paced breathing, Paired muscle relaxation',
        expectedOutcome: 'Better emotional control during distress',
        timeframe: 'Immediate relief, mastery takes weeks'
      },
      {
        name: 'Emotional Validation',
        technique: 'Acknowledge and accept emotional experiences',
        instructions: 'Name emotions without judgment, recognize their validity and temporary nature',
        expectedOutcome: 'Reduced emotional intensity and self-criticism',
        timeframe: 'Immediate soothing, skill builds over time'
      }
    ],
    mindfulness: [
      {
        name: '5-4-3-2-1 Grounding',
        technique: 'Present-moment awareness through senses',
        instructions: 'Notice 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste',
        expectedOutcome: 'Reduced anxiety and increased present-moment awareness',
        timeframe: 'Immediate relief in 2-5 minutes'
      },
      {
        name: 'Breathing Meditation',
        technique: 'Focused attention on breath pattern',
        instructions: 'Sit comfortably, focus on natural breathing, gently return attention when mind wanders',
        expectedOutcome: 'Calmed nervous system and improved focus',
        timeframe: '5-10 minutes for immediate benefit'
      }
    ],
    interpersonal: [
      {
        name: 'DEAR MAN',
        technique: 'Assertive communication technique',
        instructions: 'Describe, Express, Assert, Reinforce, stay Mindful, Appear confident, Negotiate',
        expectedOutcome: 'Improved communication and relationship dynamics',
        timeframe: 'Practice in low-stakes situations first'
      }
    ]
  }

  /**
   * Generate therapeutic response and interventions
   */
  async generateResponse(
    message: string,
    userId: string,
    startTimeMs: number,
    emotionalState?: { valence: number, arousal: number, dominance: number, primaryEmotion: string },
    memoryContext?: any,
    crisisAssessment?: any,
    assignedTask: string = 'Generate evidence-based therapeutic response'
  ): Promise<AgentExecutionResult> {
    const agentStart = Date.now()
    
    try {
      const therapeuticResponse = await this.generateTherapeuticResponse(
        message, 
        emotionalState, 
        memoryContext, 
        crisisAssessment
      )
      const executionTimeMs = Date.now() - agentStart

      return {
        agentName: AGENT_NAMES.THERAPY_ADVISOR,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.THERAPY_ADVISOR].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.THERAPY_ADVISOR].icon,
        assignedTask,
        inputData: { message, userId, emotionalState, memoryContext, crisisAssessment },
        executionTimeMs,
        executionType: 'serial',
        startTimeMs: agentStart - startTimeMs,
        endTimeMs: (agentStart - startTimeMs) + executionTimeMs,
        result: therapeuticResponse,
        confidence: therapeuticResponse.confidence,
        success: true,
        reasoning: therapeuticResponse.rationale,
        keyInsights: this.generateKeyInsights(therapeuticResponse),
        recommendationsToOrchestrator: therapeuticResponse.recommendations,
        influenceOnFinalResponse: this.calculateInfluence(therapeuticResponse, crisisAssessment),
        contributedInsights: this.generateContributedInsights(therapeuticResponse)
      }
    } catch (error) {
      const executionTimeMs = Date.now() - agentStart
      
      return {
        agentName: AGENT_NAMES.THERAPY_ADVISOR,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.THERAPY_ADVISOR].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.THERAPY_ADVISOR].icon,
        assignedTask,
        inputData: { message, userId },
        executionTimeMs,
        executionType: 'serial',
        startTimeMs: agentStart - startTimeMs,
        endTimeMs: (agentStart - startTimeMs) + executionTimeMs,
        result: null,
        confidence: 0.0,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        reasoning: 'Failed to generate therapeutic response',
        keyInsights: [],
        recommendationsToOrchestrator: ['provide_general_support'],
        influenceOnFinalResponse: 0.5, // Moderate influence even on error
        contributedInsights: ['Therapeutic guidance unavailable - general support provided']
      }
    }
  }

  private async generateTherapeuticResponse(
    message: string,
    emotionalState?: any,
    memoryContext?: any,
    crisisAssessment?: any
  ): Promise<TherapeuticResponse> {
    // 1. Select primary therapeutic approach
    const primaryApproach = this.selectTherapeuticApproach(message, emotionalState, crisisAssessment)
    
    // 2. Generate appropriate interventions
    const interventions = this.selectInterventions(primaryApproach, emotionalState, memoryContext)
    
    // 3. Craft therapeutic response
    const response = this.craftTherapeuticResponse(message, primaryApproach, interventions, emotionalState, crisisAssessment)
    
    // 4. Extract techniques and recommendations
    const techniques = interventions.map(i => i.name)
    const recommendations = this.generateRecommendations(primaryApproach, interventions, crisisAssessment)
    
    // 5. Generate follow-up suggestions
    const followUpSuggestions = this.generateFollowUpSuggestions(primaryApproach, emotionalState, memoryContext)
    
    // 6. Recommend resources
    const resourceRecommendations = this.recommendResources(primaryApproach, interventions, crisisAssessment)
    
    // 7. Calculate confidence and rationale
    const confidence = this.calculateTherapeuticConfidence(primaryApproach, interventions, emotionalState)
    const rationale = this.generateRationale(primaryApproach, interventions, confidence, emotionalState)

    return {
      primaryApproach,
      interventions,
      response,
      techniques,
      recommendations,
      rationale,
      confidence,
      followUpSuggestions,
      resourceRecommendations
    }
  }

  private selectTherapeuticApproach(
    message: string,
    emotionalState?: any,
    crisisAssessment?: any
  ): TherapeuticApproach {
    const messageLower = message.toLowerCase()
    
    // Crisis situations prioritize DBT/safety
    if (crisisAssessment?.riskLevel === 'crisis' || crisisAssessment?.riskLevel === 'high') {
      return {
        type: 'DBT',
        reasoning: 'Crisis situation requires distress tolerance and emotion regulation skills',
        suitability: 0.95,
        evidenceBase: 'DBT specifically designed for crisis intervention and emotional dysregulation'
      }
    }
    
    // High arousal emotions benefit from mindfulness
    if (emotionalState?.arousal > 0.7) {
      return {
        type: 'Mindfulness',
        reasoning: 'High emotional arousal responds well to mindfulness-based calming techniques',
        suitability: 0.85,
        evidenceBase: 'Strong evidence for mindfulness in reducing emotional reactivity'
      }
    }
    
    // Negative thinking patterns suggest CBT
    if (messageLower.includes('always') || messageLower.includes('never') || 
        messageLower.includes('should') || messageLower.includes('must')) {
      return {
        type: 'CBT',
        reasoning: 'Cognitive distortions identified - CBT techniques for thought challenging appropriate',
        suitability: 0.9,
        evidenceBase: 'Gold standard evidence for CBT in addressing negative thought patterns'
      }
    }
    
    // Avoidance or values conflicts suggest ACT
    if (messageLower.includes('avoid') || messageLower.includes('stuck') ||
        messageLower.includes('meaning') || messageLower.includes('purpose')) {
      return {
        type: 'ACT',
        reasoning: 'Avoidance patterns or values exploration - ACT principles most suitable',
        suitability: 0.8,
        evidenceBase: 'ACT effective for avoidance behaviors and values-based living'
      }
    }
    
    // Low valence with interpersonal content
    if (emotionalState?.valence < -0.4 && 
        (messageLower.includes('relationship') || messageLower.includes('friend') || 
         messageLower.includes('family'))) {
      return {
        type: 'DBT',
        reasoning: 'Interpersonal distress with negative emotions - DBT interpersonal effectiveness skills',
        suitability: 0.8,
        evidenceBase: 'DBT interpersonal module designed for relationship difficulties'
      }
    }
    
    // Default to humanistic for general support
    return {
      type: 'Humanistic',
      reasoning: 'General emotional support and validation most appropriate',
      suitability: 0.7,
      evidenceBase: 'Person-centered approach effective for general emotional support'
    }
  }

  private selectInterventions(
    approach: TherapeuticApproach,
    emotionalState?: any,
    memoryContext?: any
  ): TherapeuticIntervention[] {
    const interventions: TherapeuticIntervention[] = []
    
    // Select interventions based on approach and emotional state
    switch (approach.type) {
      case 'CBT':
        if (emotionalState?.valence < -0.5) {
          interventions.push({
            ...this.interventionLibrary.cognitive[0],
            category: 'cognitive'
          })
        }
        if (emotionalState?.dominance < 0.4) {
          interventions.push({
            ...this.interventionLibrary.behavioral[0],
            category: 'behavioral'
          })
        }
        break
        
      case 'DBT':
        if (emotionalState?.arousal > 0.7) {
          interventions.push({
            ...this.interventionLibrary.emotional[0],
            category: 'emotional'
          })
        }
        interventions.push({
          ...this.interventionLibrary.emotional[1],
          category: 'emotional'
        })
        break
        
      case 'Mindfulness':
        interventions.push({
          ...this.interventionLibrary.mindfulness[0],
          category: 'mindfulness'
        })
        if (emotionalState?.arousal > 0.6) {
          interventions.push({
            ...this.interventionLibrary.mindfulness[1],
            category: 'mindfulness'
          })
        }
        break
        
      case 'ACT':
        interventions.push({
          ...this.interventionLibrary.emotional[1],
          category: 'emotional'
        })
        interventions.push({
          ...this.interventionLibrary.mindfulness[0],
          category: 'mindfulness'
        })
        break
        
      default:
        // Humanistic - focus on validation
        interventions.push({
          ...this.interventionLibrary.emotional[1],
          category: 'emotional'
        })
    }
    
    return interventions
  }

  private craftTherapeuticResponse(
    message: string,
    approach: TherapeuticApproach,
    interventions: TherapeuticIntervention[],
    emotionalState?: any,
    crisisAssessment?: any
  ): string {
    let response = ''
    
    // Start with validation and empathy
    if (emotionalState?.valence < -0.3) {
      response += "I can hear that you're going through something difficult right now. "
    } else if (emotionalState?.valence > 0.3) {
      response += "It sounds like you're in a more positive space today. "
    } else {
      response += "Thank you for sharing what's on your mind. "
    }
    
    // Address crisis if present
    if (crisisAssessment?.riskLevel === 'crisis') {
      response += "I'm concerned about your safety right now. Your life has value, and there are people who want to help. "
      response += "Would you like me to provide some immediate coping strategies while we also connect you with professional support? "
    } else if (crisisAssessment?.riskLevel === 'high') {
      response += "I can see you're in significant distress. Let's focus on getting you some relief and support. "
    }
    
    // Provide approach-specific response
    switch (approach.type) {
      case 'CBT':
        response += "I notice some thought patterns that might be contributing to how you're feeling. "
        response += "Sometimes our minds can be quite harsh critics. What if we explored a different way of looking at this situation? "
        break
        
      case 'DBT':
        response += "It sounds like emotions are feeling pretty intense right now. "
        response += "Let's focus on getting through this moment safely and finding some relief. "
        break
        
      case 'Mindfulness':
        response += "When emotions feel overwhelming, sometimes grounding ourselves in the present moment can help. "
        response += "Would you like to try a quick technique to help settle your nervous system? "
        break
        
      case 'ACT':
        response += "It sounds like you might be struggling with some difficult feelings or situations. "
        response += "Rather than fighting these experiences, what if we explored accepting them while still moving toward what matters to you? "
        break
        
      default:
        response += "Your feelings make complete sense given what you're experiencing. "
        response += "You don't have to go through this alone. "
    }
    
    // Include primary intervention if appropriate
    if (interventions.length > 0 && !crisisAssessment?.immediateInterventionRequired) {
      const primaryIntervention = interventions[0]
      response += `One thing that might help is ${primaryIntervention.name.toLowerCase()}. ${primaryIntervention.instructions} `
    }
    
    // End with support and follow-up
    response += "How does this resonate with you? I'm here to support you through this."
    
    return response
  }

  private generateRecommendations(
    approach: TherapeuticApproach,
    interventions: TherapeuticIntervention[],
    crisisAssessment?: any
  ): string[] {
    const recommendations = []
    
    if (crisisAssessment?.riskLevel === 'crisis') {
      recommendations.push('prioritize_safety_planning', 'activate_emergency_protocols', 'provide_crisis_resources')
    } else if (crisisAssessment?.riskLevel === 'high') {
      recommendations.push('include_safety_assessment', 'provide_professional_referrals')
    }
    
    // Approach-specific recommendations
    switch (approach.type) {
      case 'CBT':
        recommendations.push('include_thought_challenging_exercises', 'provide_cognitive_restructuring_tools')
        break
      case 'DBT':
        recommendations.push('include_distress_tolerance_skills', 'provide_emotion_regulation_techniques')
        break
      case 'Mindfulness':
        recommendations.push('include_grounding_techniques', 'provide_mindfulness_exercises')
        break
      case 'ACT':
        recommendations.push('explore_values_clarification', 'include_acceptance_strategies')
        break
      default:
        recommendations.push('provide_validation_and_support', 'maintain_therapeutic_alliance')
    }
    
    // Intervention-specific recommendations
    interventions.forEach(intervention => {
      recommendations.push(`demonstrate_${intervention.name.toLowerCase().replace(/\s+/g, '_')}`)
    })
    
    return recommendations
  }

  private generateFollowUpSuggestions(
    approach: TherapeuticApproach,
    emotionalState?: any,
    memoryContext?: any
  ): string[] {
    const suggestions = []
    
    // Check in on emotional state
    if (emotionalState?.valence < -0.5) {
      suggestions.push('Check in on emotional state in 24-48 hours')
    }
    
    if (emotionalState?.arousal > 0.7) {
      suggestions.push('Follow up on stress management techniques effectiveness')
    }
    
    // Approach-specific follow-ups
    switch (approach.type) {
      case 'CBT':
        suggestions.push('Review thought challenging practice', 'Assess behavioral activation progress')
        break
      case 'DBT':
        suggestions.push('Practice distress tolerance skills', 'Review emotion regulation strategies')
        break
      case 'Mindfulness':
        suggestions.push('Continue mindfulness practice', 'Explore longer meditation sessions')
        break
    }
    
    // Memory-based follow-ups
    if (memoryContext?.patterns?.length > 0) {
      suggestions.push('Review progress on identified patterns')
    }
    
    return suggestions
  }

  private recommendResources(
    approach: TherapeuticApproach,
    interventions: TherapeuticIntervention[],
    crisisAssessment?: any
  ): ResourceRecommendation[] {
    const resources: ResourceRecommendation[] = []
    
    // Crisis resources
    if (crisisAssessment?.riskLevel === 'crisis') {
      resources.push({
        type: 'crisis_line',
        title: '988 Suicide & Crisis Lifeline',
        description: '24/7 free and confidential support for people in distress',
        urgency: 'immediate',
        accessibility: 'free'
      })
    }
    
    // Approach-specific resources
    switch (approach.type) {
      case 'CBT':
        resources.push({
          type: 'app',
          title: 'MindShift CBT App',
          description: 'Evidence-based CBT tools for anxiety and mood',
          urgency: 'medium',
          accessibility: 'free'
        })
        break
        
      case 'DBT':
        resources.push({
          type: 'app',
          title: 'DBT Coach',
          description: 'DBT skills practice and crisis survival tools',
          urgency: 'high',
          accessibility: 'subscription'
        })
        break
        
      case 'Mindfulness':
        resources.push({
          type: 'app',
          title: 'Insight Timer',
          description: 'Free meditation and mindfulness practices',
          urgency: 'medium',
          accessibility: 'free'
        })
        break
    }
    
    // Professional support recommendation
    if (crisisAssessment?.professionalReferralRecommended) {
      resources.push({
        type: 'professional',
        title: 'Licensed Mental Health Professional',
        description: 'Individual therapy for ongoing support and treatment',
        urgency: 'high',
        accessibility: 'professional_required'
      })
    }
    
    return resources
  }

  private calculateTherapeuticConfidence(
    approach: TherapeuticApproach,
    interventions: TherapeuticIntervention[],
    emotionalState?: any
  ): number {
    let confidence = approach.suitability
    
    // Adjust based on emotional state clarity
    if (emotionalState) {
      confidence += 0.1 // Having emotional data increases confidence
    }
    
    // More interventions available increases confidence
    confidence += Math.min(interventions.length * 0.05, 0.15)
    
    // Evidence level affects confidence
    if (approach.evidenceBase.includes('strong')) {
      confidence += 0.05
    }
    
    return Math.max(0.5, Math.min(1.0, confidence))
  }

  private generateRationale(
    approach: TherapeuticApproach,
    interventions: TherapeuticIntervention[],
    confidence: number,
    emotionalState?: any
  ): string {
    let rationale = `Selected ${approach.type} approach: ${approach.reasoning}. `
    
    if (interventions.length > 0) {
      const interventionNames = interventions.map(i => i.name).join(', ')
      rationale += `Recommended interventions: ${interventionNames}. `
    }
    
    if (emotionalState) {
      rationale += `Emotional state analysis informed intervention selection (valence: ${emotionalState.valence?.toFixed(2)}, arousal: ${emotionalState.arousal?.toFixed(2)}). `
    }
    
    rationale += `Therapeutic confidence: ${(confidence * 100).toFixed(0)}% based on evidence base and situational fit.`
    
    return rationale
  }

  private generateKeyInsights(response: TherapeuticResponse): string[] {
    const insights = []
    
    insights.push(`Primary therapeutic approach: ${response.primaryApproach.type}`)
    
    if (response.interventions.length > 0) {
      insights.push(`${response.interventions.length} evidence-based interventions selected`)
    }
    
    if (response.resourceRecommendations.length > 0) {
      const urgentResources = response.resourceRecommendations.filter(r => r.urgency === 'immediate' || r.urgency === 'high')
      if (urgentResources.length > 0) {
        insights.push(`${urgentResources.length} high-priority resources recommended`)
      }
    }
    
    if (response.confidence > 0.8) {
      insights.push('High confidence therapeutic approach based on strong evidence')
    }
    
    return insights
  }

  private generateContributedInsights(response: TherapeuticResponse): string[] {
    const insights = []
    
    insights.push(`Therapeutic approach: ${response.primaryApproach.type}`)
    insights.push(`${response.interventions.length} interventions recommended`)
    
    const categories = [...new Set(response.interventions.map(i => i.category))]
    if (categories.length > 0) {
      insights.push(`Intervention categories: ${categories.join(', ')}`)
    }
    
    if (response.resourceRecommendations.length > 0) {
      insights.push(`${response.resourceRecommendations.length} therapeutic resources provided`)
    }
    
    return insights
  }

  private calculateInfluence(response: TherapeuticResponse, crisisAssessment?: any): number {
    let influence = 0.6 // Base influence for therapy advisor
    
    // Crisis situations increase influence significantly
    if (crisisAssessment?.riskLevel === 'crisis') {
      influence = 0.95
    } else if (crisisAssessment?.riskLevel === 'high') {
      influence = 0.85
    }
    
    // High confidence approaches increase influence
    if (response.confidence > 0.8) {
      influence += 0.1
    }
    
    // Multiple interventions increase influence
    if (response.interventions.length > 1) {
      influence += 0.05
    }
    
    return Math.max(0.4, Math.min(1.0, influence))
  }
}

// Export singleton instance
export const therapyAdvisor = new TherapyAdvisor()