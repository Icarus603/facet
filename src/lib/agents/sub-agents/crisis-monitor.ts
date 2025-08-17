/**
 * FACET Crisis Monitor Agent
 * 
 * Real-time crisis detection and safety assessment
 * Implements exact AgentExecutionResult format from API_CONTRACT.md
 */

import { AgentExecutionResult, AGENT_NAMES, AGENT_CONFIG } from '@/lib/types/api-contract'

export interface CrisisAssessment {
  riskLevel: 'none' | 'low' | 'moderate' | 'high' | 'crisis'
  immediateInterventionRequired: boolean
  professionalReferralRecommended: boolean
  emergencyContactTriggered: boolean
  riskFactors: string[]
  protectiveFactors: string[]
  reasoning: string
  confidence: number
  urgencyScore: number
  recommendedActions: string[]
  safetyPlan?: {
    immediateSteps: string[]
    copingStrategies: string[]
    emergencyContacts: string[]
    professionalResources: string[]
  }
}

export class CrisisMonitor {
  private crisisKeywords = {
    suicidal: {
      direct: ['suicide', 'kill myself', 'end my life', 'want to die', 'better off dead'],
      indirect: ['no point', 'cant go on', 'everyone would be better', 'tired of living'],
      severity: 'crisis'
    },
    selfHarm: {
      direct: ['hurt myself', 'cut myself', 'self harm', 'self-harm', 'cutting'],
      indirect: ['deserve pain', 'need to punish', 'physical release'],
      severity: 'high'
    },
    hopelessness: {
      direct: ['hopeless', 'no hope', 'pointless', 'nothing matters', 'no future'],
      indirect: ['whats the point', 'why bother', 'never get better'],
      severity: 'high'
    },
    overwhelm: {
      direct: ['cant cope', 'overwhelmed', 'falling apart', 'breaking down'],
      indirect: ['too much', 'cant handle', 'drowning'],
      severity: 'moderate'
    },
    isolation: {
      direct: ['alone', 'nobody cares', 'no one understands', 'isolated'],
      indirect: ['burden', 'pushing away', 'disconnected'],
      severity: 'moderate'
    },
    substance: {
      direct: ['drinking too much', 'using drugs', 'need pills', 'getting high'],
      indirect: ['numb the pain', 'escape reality', 'forget everything'],
      severity: 'moderate'
    }
  }

  private protectiveFactors = [
    'family', 'friends', 'support', 'therapy', 'medication', 'hope', 'future',
    'goals', 'pets', 'children', 'job', 'hobbies', 'faith', 'spirituality'
  ]

  private emergencyKeywords = [
    'right now', 'tonight', 'today', 'immediate', 'soon', 'plan to', 
    'going to', 'about to', 'ready to'
  ]

  /**
   * Fast crisis assessment optimized for <2s SLA compliance
   */
  async assess(
    message: string,
    userId: string,
    startTimeMs: number,
    emotionalState?: { valence: number, arousal: number, dominance: number },
    assignedTask: string = 'Assess crisis risk and safety requirements'
  ): Promise<AgentExecutionResult> {
    const agentStart = Date.now()
    
    try {
      // Fast-path crisis detection for SLA compliance
      const assessment = this.performFastCrisisAssessment(message, emotionalState)
      const executionTimeMs = Date.now() - agentStart

      return {
        agentName: AGENT_NAMES.CRISIS_MONITOR,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.CRISIS_MONITOR].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.CRISIS_MONITOR].icon,
        assignedTask,
        inputData: { message, userId, emotionalState },
        executionTimeMs,
        executionType: 'parallel',
        startTimeMs: agentStart - startTimeMs,
        endTimeMs: (agentStart - startTimeMs) + executionTimeMs,
        result: assessment,
        confidence: assessment.confidence,
        success: true,
        reasoning: assessment.reasoning,
        keyInsights: this.generateKeyInsights(assessment),
        recommendationsToOrchestrator: this.generateOrchestratorRecommendations(assessment),
        influenceOnFinalResponse: this.calculateInfluence(assessment),
        contributedInsights: this.generateContributedInsights(assessment)
      }
    } catch (error) {
      const executionTimeMs = Date.now() - agentStart
      
      return {
        agentName: AGENT_NAMES.CRISIS_MONITOR,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.CRISIS_MONITOR].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.CRISIS_MONITOR].icon,
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
        reasoning: 'Failed to perform crisis assessment',
        keyInsights: [],
        recommendationsToOrchestrator: ['default_safety_protocols'],
        influenceOnFinalResponse: 1.0, // Max influence on error for safety
        contributedInsights: ['Crisis assessment unavailable - defaulting to safety protocols']
      }
    }
  }

  /**
   * Fast crisis assessment optimized for sub-2s performance
   */
  private performFastCrisisAssessment(
    message: string, 
    emotionalState?: { valence: number, arousal: number, dominance: number }
  ): CrisisAssessment {
    const lowerMessage = message.toLowerCase()
    
    // Fast crisis detection using optimized keyword matching
    let riskLevel: 'none' | 'low' | 'moderate' | 'high' | 'crisis' = 'none'
    let urgencyScore = 0
    let immediateIntervention = false
    let riskFactors: string[] = []
    
    // Critical keywords check (fastest path)
    const criticalKeywords = ['suicide', 'kill myself', 'end my life', 'want to die', 'hurt myself']
    const hasCritical = criticalKeywords.some(kw => lowerMessage.includes(kw))
    
    if (hasCritical) {
      riskLevel = 'crisis'
      urgencyScore = 100
      immediateIntervention = true
      riskFactors.push('suicidal_ideation')
    } else {
      // Quick keyword scoring
      const highRiskWords = ['hopeless', 'no point', 'cant go on', 'overwhelmed', 'falling apart']
      const moderateRiskWords = ['alone', 'nobody cares', 'tired', 'stressed', 'anxious']
      
      const highRiskCount = highRiskWords.filter(kw => lowerMessage.includes(kw)).length
      const moderateRiskCount = moderateRiskWords.filter(kw => lowerMessage.includes(kw)).length
      
      if (highRiskCount >= 2) {
        riskLevel = 'high'
        urgencyScore = 75
        riskFactors.push('multiple_risk_indicators')
      } else if (highRiskCount >= 1) {
        riskLevel = 'moderate'
        urgencyScore = 50
        riskFactors.push('emotional_distress')
      } else if (moderateRiskCount >= 2) {
        riskLevel = 'moderate'
        urgencyScore = 40
        riskFactors.push('mild_distress')
      } else if (moderateRiskCount >= 1) {
        riskLevel = 'low'
        urgencyScore = 20
      }
    }
    
    // Quick urgency boost for immediate language
    const immediateWords = ['right now', 'tonight', 'today', 'about to']
    if (immediateWords.some(kw => lowerMessage.includes(kw))) {
      urgencyScore += 30
      if (riskLevel !== 'none') {
        immediateIntervention = true
      }
    }
    
    // Quick protective factors check
    const protectiveWords = ['family', 'friends', 'support', 'therapy', 'hope']
    const protectiveFactors = protectiveWords.filter(kw => lowerMessage.includes(kw))
    
    // Confidence based on keyword matches and message length
    const confidence = hasCritical ? 0.95 : 
                     riskFactors.length > 0 ? 0.8 : 
                     message.length > 50 ? 0.7 : 0.6
    
    // Quick reasoning generation
    const reasoning = hasCritical ? 
      'Crisis-level language detected requiring immediate intervention' :
      riskLevel !== 'none' ? 
        `${riskLevel} risk level based on detected indicators: ${riskFactors.join(', ')}` :
        'No significant crisis indicators detected'
    
    return {
      riskLevel,
      immediateInterventionRequired: immediateIntervention,
      professionalReferralRecommended: riskLevel === 'crisis' || riskLevel === 'high',
      emergencyContactTriggered: riskLevel === 'crisis' && immediateIntervention,
      riskFactors,
      protectiveFactors,
      reasoning,
      confidence,
      urgencyScore: Math.min(100, urgencyScore),
      recommendedActions: this.generateRecommendedActions(riskLevel, immediateIntervention),
      safetyPlan: riskLevel === 'crisis' ? this.generateQuickSafetyPlan() : undefined
    }
  }

  /**
   * Comprehensive crisis assessment (fallback for non-time-critical cases)
   */
  private async performCrisisAssessment(
    message: string, 
    emotionalState?: { valence: number, arousal: number, dominance: number }
  ): Promise<CrisisAssessment> {
    const lowerMessage = message.toLowerCase()
    
    // 1. Detect crisis indicators
    const crisisIndicators = this.detectCrisisIndicators(lowerMessage)
    
    // 2. Assess immediacy and urgency
    const urgencyAssessment = this.assessUrgency(lowerMessage, crisisIndicators)
    
    // 3. Identify protective factors
    const protectiveFactors = this.identifyProtectiveFactors(lowerMessage)
    
    // 4. Calculate risk level
    const riskLevel = this.calculateRiskLevel(crisisIndicators, urgencyAssessment, emotionalState)
    
    // 5. Determine intervention requirements
    const interventionRequired = this.determineInterventionNeed(riskLevel, urgencyAssessment)
    
    // 6. Generate safety plan if needed
    const safetyPlan = interventionRequired ? this.generateSafetyPlan(riskLevel, crisisIndicators) : undefined
    
    // 7. Calculate confidence
    const confidence = this.calculateConfidence(crisisIndicators, message.length, emotionalState)
    
    // 8. Generate reasoning
    const reasoning = this.generateReasoning(riskLevel, crisisIndicators, urgencyAssessment, protectiveFactors)

    return {
      riskLevel,
      immediateInterventionRequired: interventionRequired,
      professionalReferralRecommended: riskLevel === 'crisis' || riskLevel === 'high',
      emergencyContactTriggered: riskLevel === 'crisis' && urgencyAssessment.immediate,
      riskFactors: crisisIndicators.map(c => c.type),
      protectiveFactors,
      reasoning,
      confidence,
      urgencyScore: urgencyAssessment.score,
      recommendedActions: this.generateRecommendedActions(riskLevel, interventionRequired),
      safetyPlan
    }
  }

  private generateQuickSafetyPlan(): any {
    return {
      immediateSteps: [
        'Stay in a safe location with others if possible',
        'Contact 988 Suicide & Crisis Lifeline immediately',
        'Remove any means of self-harm from immediate environment'
      ],
      copingStrategies: [
        'Deep breathing: 4-7-8 technique',
        'Call someone you trust right now',
        'Focus on immediate safety'
      ],
      emergencyContacts: [
        '988 - Suicide & Crisis Lifeline (24/7)',
        'Emergency Services: 911',
        'Crisis Text Line: Text HOME to 741741'
      ],
      professionalResources: [
        'Local emergency room',
        'Mental health crisis center'
      ]
    }
  }

  private detectCrisisIndicators(message: string): Array<{ type: string, severity: string, keywords: string[] }> {
    const indicators = []
    
    for (const [category, data] of Object.entries(this.crisisKeywords)) {
      const foundDirect = data.direct.filter(keyword => message.includes(keyword))
      const foundIndirect = data.indirect.filter(keyword => message.includes(keyword))
      
      if (foundDirect.length > 0 || foundIndirect.length > 0) {
        indicators.push({
          type: category,
          severity: data.severity,
          keywords: [...foundDirect, ...foundIndirect]
        })
      }
    }
    
    return indicators
  }

  private assessUrgency(message: string, indicators: any[]): { score: number, immediate: boolean } {
    let urgencyScore = 0
    
    // Base urgency from crisis indicators
    for (const indicator of indicators) {
      switch (indicator.severity) {
        case 'crisis': urgencyScore += 40; break
        case 'high': urgencyScore += 25; break
        case 'moderate': urgencyScore += 15; break
      }
    }
    
    // Immediacy keywords increase urgency significantly
    const immediacyKeywords = this.emergencyKeywords.filter(keyword => message.includes(keyword))
    urgencyScore += immediacyKeywords.length * 20
    
    // Multiple indicators compound urgency
    if (indicators.length > 2) {
      urgencyScore += 15
    }
    
    // Crisis + immediacy = maximum urgency
    const hasCrisis = indicators.some(i => i.severity === 'crisis')
    const hasImmediacy = immediacyKeywords.length > 0
    
    return {
      score: Math.min(100, urgencyScore),
      immediate: hasCrisis && hasImmediacy
    }
  }

  private identifyProtectiveFactors(message: string): string[] {
    return this.protectiveFactors.filter(factor => message.includes(factor))
  }

  private calculateRiskLevel(
    indicators: any[], 
    urgency: any, 
    emotionalState?: { valence: number, arousal: number, dominance: number }
  ): 'none' | 'low' | 'moderate' | 'high' | 'crisis' {
    // Crisis indicators override everything
    if (indicators.some(i => i.severity === 'crisis')) {
      return 'crisis'
    }
    
    // Multiple high-severity indicators
    const highSeverityCount = indicators.filter(i => i.severity === 'high').length
    if (highSeverityCount >= 2) {
      return 'crisis'
    }
    
    // High urgency with indicators
    if (urgency.score > 60 && indicators.length > 0) {
      return 'high'
    }
    
    // Single high-severity indicator
    if (highSeverityCount === 1) {
      return 'high'
    }
    
    // Multiple moderate indicators
    const moderateCount = indicators.filter(i => i.severity === 'moderate').length
    if (moderateCount >= 3) {
      return 'high'
    }
    
    if (moderateCount >= 1) {
      return 'moderate'
    }
    
    // Factor in emotional state if available
    if (emotionalState) {
      if (emotionalState.valence < -0.7 && emotionalState.arousal > 0.8) {
        return 'moderate'
      }
      if (emotionalState.valence < -0.5) {
        return 'low'
      }
    }
    
    return 'none'
  }

  private determineInterventionNeed(riskLevel: string, urgency: any): boolean {
    return riskLevel === 'crisis' || 
           riskLevel === 'high' || 
           (riskLevel === 'moderate' && urgency.score > 50)
  }

  private generateSafetyPlan(riskLevel: string, indicators: any[]): any {
    const plan = {
      immediateSteps: [] as string[],
      copingStrategies: [] as string[],
      emergencyContacts: [] as string[],
      professionalResources: [] as string[]
    }
    
    // Immediate steps based on risk level
    if (riskLevel === 'crisis') {
      plan.immediateSteps = [
        'Stay in a safe location with others if possible',
        'Remove any means of self-harm from immediate environment',
        'Contact emergency services (988 Suicide & Crisis Lifeline) if feeling unsafe',
        'Reach out to trusted friend, family member, or therapist immediately'
      ]
    } else if (riskLevel === 'high') {
      plan.immediateSteps = [
        'Practice grounding techniques (5-4-3-2-1 method)',
        'Call someone you trust to talk',
        'Avoid being alone for extended periods',
        'Schedule appointment with mental health professional'
      ]
    }
    
    // Coping strategies
    plan.copingStrategies = [
      'Deep breathing exercises (4-7-8 technique)',
      'Progressive muscle relaxation',
      'Journal writing or voice recording feelings',
      'Physical activity or movement',
      'Listen to calming music or nature sounds',
      'Practice mindfulness or meditation'
    ]
    
    // Emergency contacts
    plan.emergencyContacts = [
      '988 - Suicide & Crisis Lifeline (24/7)',
      'Emergency Services: 911',
      'Crisis Text Line: Text HOME to 741741',
      'National Alliance on Mental Illness: 1-800-950-NAMI'
    ]
    
    // Professional resources
    plan.professionalResources = [
      'Local emergency room or urgent care',
      'Mental health crisis center',
      'Therapist or counselor',
      'Psychiatrist for medication evaluation',
      'Local community mental health center'
    ]
    
    return plan
  }

  private calculateConfidence(indicators: any[], messageLength: number, emotionalState?: any): number {
    let confidence = 0.5
    
    // Clear crisis indicators increase confidence
    if (indicators.some(i => i.severity === 'crisis')) {
      confidence = 0.95
    } else if (indicators.length > 0) {
      confidence += indicators.length * 0.15
    }
    
    // Longer messages provide more context
    if (messageLength > 100) {
      confidence += 0.1
    }
    
    // Emotional state data increases confidence
    if (emotionalState) {
      confidence += 0.1
    }
    
    // Multiple indicators from same category reduce confidence slightly
    const categoryCount = new Set(indicators.map(i => i.type)).size
    if (categoryCount < indicators.length) {
      confidence -= 0.05
    }
    
    return Math.max(0.1, Math.min(1.0, confidence))
  }

  private generateReasoning(riskLevel: string, indicators: any[], urgency: any, protectiveFactors: string[]): string {
    let reasoning = `Risk assessment: ${riskLevel} level`
    
    if (indicators.length > 0) {
      const categories = indicators.map(i => i.type).join(', ')
      reasoning += ` based on detected indicators: ${categories}`
    }
    
    if (urgency.score > 50) {
      reasoning += `. High urgency score (${urgency.score}/100)`
      if (urgency.immediate) {
        reasoning += ' with immediate intervention required'
      }
    }
    
    if (protectiveFactors.length > 0) {
      reasoning += `. Protective factors identified: ${protectiveFactors.join(', ')}`
    }
    
    if (riskLevel === 'crisis') {
      reasoning += '. Emergency protocols activated.'
    } else if (riskLevel === 'high') {
      reasoning += '. Professional referral strongly recommended.'
    }
    
    return reasoning
  }

  private generateRecommendedActions(riskLevel: string, interventionRequired: boolean): string[] {
    const actions = []
    
    if (riskLevel === 'crisis') {
      actions.push('immediate_safety_response', 'emergency_contact_activation', 'professional_intervention')
    } else if (riskLevel === 'high') {
      actions.push('safety_planning', 'professional_referral', 'followup_monitoring')
    } else if (riskLevel === 'moderate') {
      actions.push('supportive_response', 'coping_strategy_provision', 'resource_sharing')
    }
    
    if (interventionRequired) {
      actions.push('escalate_to_human_support')
    }
    
    return actions
  }

  private generateKeyInsights(assessment: CrisisAssessment): string[] {
    const insights = []
    
    insights.push(`Risk level: ${assessment.riskLevel}`)
    
    if (assessment.riskFactors.length > 0) {
      insights.push(`Risk factors: ${assessment.riskFactors.join(', ')}`)
    }
    
    if (assessment.immediateInterventionRequired) {
      insights.push('Immediate intervention required')
    }
    
    if (assessment.urgencyScore > 60) {
      insights.push('High urgency situation detected')
    }
    
    if (assessment.protectiveFactors.length > 0) {
      insights.push(`Protective factors present: ${assessment.protectiveFactors.join(', ')}`)
    }
    
    return insights
  }

  private generateOrchestratorRecommendations(assessment: CrisisAssessment): string[] {
    const recommendations = []
    
    if (assessment.riskLevel === 'crisis') {
      recommendations.push('emergency_response_protocol', 'override_standard_processing', 'activate_human_support')
    } else if (assessment.riskLevel === 'high') {
      recommendations.push('prioritize_safety_response', 'include_professional_resources', 'schedule_followup')
    } else if (assessment.riskLevel === 'moderate') {
      recommendations.push('include_coping_strategies', 'provide_support_resources')
    } else {
      recommendations.push('standard_supportive_response')
    }
    
    if (assessment.immediateInterventionRequired) {
      recommendations.push('bypass_normal_wait_times')
    }
    
    return recommendations
  }

  private generateContributedInsights(assessment: CrisisAssessment): string[] {
    const insights = []
    
    insights.push(`Crisis risk level: ${assessment.riskLevel}`)
    
    if (assessment.immediateInterventionRequired) {
      insights.push('Immediate safety intervention required')
    }
    
    if (assessment.professionalReferralRecommended) {
      insights.push('Professional mental health referral recommended')
    }
    
    if (assessment.safetyPlan) {
      insights.push('Safety plan generated with immediate steps and coping strategies')
    }
    
    return insights
  }

  private calculateInfluence(assessment: CrisisAssessment): number {
    // Crisis assessments have maximum influence on final response
    switch (assessment.riskLevel) {
      case 'crisis': return 1.0
      case 'high': return 0.9
      case 'moderate': return 0.7
      case 'low': return 0.4
      default: return 0.1
    }
  }
}

// Export singleton instance
export const crisisMonitor = new CrisisMonitor()