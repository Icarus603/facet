/**
 * FACET Base Therapeutic Agent
 * Foundation class for all specialized therapy agents
 */

import { 
  TherapeuticAgent, 
  AgentInteraction, 
  CrisisAssessment, 
  ProgressMetrics,
  CulturalContent,
  ResponsePattern,
  CulturalAdaptation
} from './types';

export abstract class BaseAgent {
  protected agent: TherapeuticAgent;
  protected culturalContent: Map<string, CulturalContent[]> = new Map();
  protected sessionContext: Map<string, any> = new Map();

  constructor(agent: TherapeuticAgent) {
    this.agent = agent;
    this.loadCulturalContent();
  }

  /**
   * Main interaction method - processes user input and generates therapeutic response
   */
  async interact(
    sessionId: string,
    userId: string,
    userInput: string,
    context: Record<string, any> = {}
  ): Promise<AgentInteraction> {
    // Store session context
    this.sessionContext.set(sessionId, { ...context, lastInteraction: Date.now() });

    // Assess crisis risk
    const crisisLevel = await this.assessCrisisRisk(userInput, context);
    
    // Determine appropriate response pattern
    const responsePattern = this.selectResponsePattern(userInput, context, crisisLevel);
    
    // Generate culturally-adapted response
    const response = await this.generateResponse(
      userInput, 
      context, 
      responsePattern, 
      context.cultural_background
    );

    // Create interaction record
    const interaction: AgentInteraction = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      session_id: sessionId,
      agent_id: this.agent.id,
      user_id: userId,
      interaction_type: this.determineInteractionType(userInput, context, crisisLevel),
      trigger: this.identifyTrigger(userInput, context),
      context,
      response,
      cultural_context: context.cultural_background,
      follow_up_needed: this.assessFollowUpNeed(userInput, context, responsePattern),
      escalation_required: crisisLevel.severity_level === 'high' || crisisLevel.severity_level === 'critical',
      timestamp: new Date().toISOString()
    };

    // Log interaction for learning and improvement
    await this.logInteraction(interaction);

    return interaction;
  }

  /**
   * Assess crisis risk level from user input
   */
  protected async assessCrisisRisk(
    userInput: string, 
    context: Record<string, any>
  ): Promise<CrisisAssessment> {
    const crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'no point', 'better off dead',
      'hurt myself', 'self-harm', 'cutting', 'overdose', 'jump',
      'hopeless', 'trapped', 'can\'t go on', 'worthless', 'burden'
    ];

    const highRiskFactors: string[] = [];
    const lowInput = userInput.toLowerCase();

    // Check for crisis keywords
    crisisKeywords.forEach(keyword => {
      if (lowInput.includes(keyword)) {
        highRiskFactors.push(`Crisis keyword detected: ${keyword}`);
      }
    });

    // Check recent mood patterns
    if (context.recent_mood_scores) {
      const avgMood = context.recent_mood_scores.reduce((a: number, b: number) => a + b, 0) / context.recent_mood_scores.length;
      if (avgMood < 3) {
        highRiskFactors.push('Persistently low mood scores');
      }
    }

    // Determine severity level
    let severityLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (highRiskFactors.length >= 3) {
      severityLevel = 'critical';
    } else if (highRiskFactors.length >= 2) {
      severityLevel = 'high';
    } else if (highRiskFactors.length >= 1) {
      severityLevel = 'moderate';
    }

    return {
      severity_level: severityLevel,
      risk_factors: highRiskFactors,
      protective_factors: this.identifyProtectiveFactors(context),
      immediate_actions: this.getImmediateActions(severityLevel),
      follow_up_timeline: this.getFollowUpTimeline(severityLevel),
      escalation_contacts: this.getEscalationContacts(severityLevel),
      safety_plan: this.generateSafetyPlan(severityLevel, context)
    };
  }

  /**
   * Select appropriate response pattern based on input and context
   */
  protected selectResponsePattern(
    userInput: string,
    context: Record<string, any>,
    crisisLevel: CrisisAssessment
  ): ResponsePattern {
    // Crisis override
    if (crisisLevel.severity_level === 'high' || crisisLevel.severity_level === 'critical') {
      return this.agent.response_patterns.find(p => p.trigger_type === 'crisis') || this.getDefaultPattern();
    }

    // Find matching pattern
    for (const pattern of this.agent.response_patterns) {
      const keywordMatch = pattern.trigger_keywords.some(keyword => 
        userInput.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (keywordMatch) {
        return pattern;
      }
    }

    return this.getDefaultPattern();
  }

  /**
   * Generate culturally-adapted therapeutic response
   */
  protected async generateResponse(
    userInput: string,
    context: Record<string, any>,
    pattern: ResponsePattern,
    culturalBackground?: string
  ): Promise<string> {
    let response = pattern.response_template;

    // Apply cultural adaptations
    if (culturalBackground) {
      const adaptation = pattern.cultural_adaptations.find(a => 
        a.culture.toLowerCase() === culturalBackground.toLowerCase()
      );
      
      if (adaptation) {
        response = this.applyCulturalAdaptation(response, adaptation, context);
      }
    }

    // Insert relevant cultural content
    if (culturalBackground && this.culturalContent.has(culturalBackground)) {
      const relevantContent = this.selectRelevantCulturalContent(
        userInput, 
        context, 
        culturalBackground
      );
      
      if (relevantContent) {
        response = this.integrateCulturalContent(response, relevantContent);
      }
    }

    // Personalize with context
    response = this.personalizeResponse(response, context);

    return response;
  }

  /**
   * Apply cultural adaptation to response
   */
  protected applyCulturalAdaptation(
    response: string, 
    adaptation: CulturalAdaptation,
    context: Record<string, any>
  ): string {
    // Apply language style adjustments
    if (adaptation.adaptations.language_style === 'formal') {
      response = response.replace(/\byou\b/g, 'you');
      response = response.replace(/\bI\b/g, 'I');
    }

    // Add cultural references where appropriate
    if (adaptation.adaptations.cultural_references.length > 0) {
      const reference = adaptation.adaptations.cultural_references[
        Math.floor(Math.random() * adaptation.adaptations.cultural_references.length)
      ];
      response += `\n\nAs we say, "${reference}"`;
    }

    // Consider family involvement
    if (adaptation.adaptations.family_involvement === 'central') {
      response += '\n\nHow might we involve your family or community in supporting your journey?';
    }

    return response;
  }

  /**
   * Abstract methods to be implemented by specific agents
   */
  abstract getSpecializedResponse(
    userInput: string, 
    context: Record<string, any>
  ): Promise<string>;

  abstract validateIntervention(
    intervention: string, 
    context: Record<string, any>
  ): boolean;

  abstract getProgressMetrics(
    sessionId: string, 
    userId: string
  ): Promise<ProgressMetrics>;

  /**
   * Utility methods
   */
  protected getDefaultPattern(): ResponsePattern {
    return {
      trigger_type: 'emotion',
      trigger_keywords: ['general'],
      response_template: 'I hear you, and I want you to know that your feelings are valid. Can you tell me more about what you\'re experiencing right now?',
      cultural_adaptations: [],
      follow_up_actions: ['active_listening', 'emotional_validation'],
      escalation_conditions: []
    };
  }

  protected identifyProtectiveFactors(context: Record<string, any>): string[] {
    const factors: string[] = [];
    
    if (context.social_support) factors.push('Strong social support network');
    if (context.employment_status === 'employed') factors.push('Stable employment');
    if (context.has_children) factors.push('Parental responsibilities');
    if (context.religious_beliefs) factors.push('Religious/spiritual beliefs');
    if (context.therapy_engagement > 0.7) factors.push('High therapy engagement');
    
    return factors;
  }

  protected getImmediateActions(severity: string): string[] {
    switch (severity) {
      case 'critical':
        return [
          'Contact emergency services (988 Suicide & Crisis Lifeline)',
          'Ensure immediate safety supervision',
          'Remove means of self-harm',
          'Emergency psychiatric evaluation'
        ];
      case 'high':
        return [
          'Increase session frequency',
          'Develop detailed safety plan',
          'Contact emergency contact',
          'Consider psychiatric consultation'
        ];
      case 'moderate':
        return [
          'Schedule follow-up within 48 hours',
          'Review coping strategies',
          'Check in with support network'
        ];
      default:
        return ['Continue regular therapeutic support'];
    }
  }

  protected getFollowUpTimeline(severity: string): string {
    switch (severity) {
      case 'critical': return 'Immediate - within 1 hour';
      case 'high': return 'Within 24 hours';
      case 'moderate': return 'Within 48 hours';
      default: return 'Next scheduled session';
    }
  }

  protected getEscalationContacts(severity: string): string[] {
    if (severity === 'critical' || severity === 'high') {
      return [
        '988 Suicide & Crisis Lifeline',
        'Local Emergency Services (911)',
        'Crisis Mobile Team',
        'Emergency Psychiatric Services'
      ];
    }
    return [];
  }

  protected generateSafetyPlan(severity: string, context: Record<string, any>): string[] {
    const plan: string[] = [];
    
    plan.push('Recognize warning signs and triggers');
    plan.push('Use coping strategies and skills');
    plan.push('Contact support people');
    
    if (severity === 'high' || severity === 'critical') {
      plan.push('Contact mental health professionals');
      plan.push('Contact crisis hotlines');
      plan.push('Ensure environment safety');
    }
    
    return plan;
  }

  protected determineInteractionType(
    userInput: string,
    context: Record<string, any>,
    crisisLevel: CrisisAssessment
  ): 'assessment' | 'intervention' | 'support' | 'crisis' | 'progress' | 'cultural' {
    if (crisisLevel.severity_level === 'high' || crisisLevel.severity_level === 'critical') {
      return 'crisis';
    }
    
    if (context.session_type === 'assessment') return 'assessment';
    if (context.requesting_progress_update) return 'progress';
    if (context.cultural_context_mentioned) return 'cultural';
    if (context.seeking_intervention) return 'intervention';
    
    return 'support';
  }

  protected identifyTrigger(userInput: string, context: Record<string, any>): string {
    const emotionWords = ['sad', 'angry', 'anxious', 'depressed', 'worried', 'scared', 'happy', 'excited'];
    const trigger = emotionWords.find(word => userInput.toLowerCase().includes(word));
    return trigger || 'general_interaction';
  }

  protected assessFollowUpNeed(
    userInput: string,
    context: Record<string, any>,
    pattern: ResponsePattern
  ): boolean {
    return pattern.follow_up_actions.length > 0 || 
           userInput.toLowerCase().includes('help') ||
           context.recent_mood_trend === 'declining';
  }

  protected async logInteraction(interaction: AgentInteraction): Promise<void> {
    // In production, this would log to database for learning and improvement
    console.log(`[${this.agent.type}] Interaction logged:`, {
      session: interaction.session_id,
      type: interaction.interaction_type,
      escalation: interaction.escalation_required
    });
  }

  protected async loadCulturalContent(): Promise<void> {
    // In production, this would load from database
    // For now, we'll populate with sample content
    this.culturalContent.set('Latino/Hispanic', [
      {
        id: 'family_values_1',
        culture: 'Latino/Hispanic',
        content_type: 'value',
        title: 'Familismo',
        content: 'Family comes first - the wellbeing of family takes priority over individual needs',
        therapeutic_applications: ['family_therapy', 'social_support', 'collectivist_approach'],
        context_notes: 'Central value in Latino cultures emphasizing family loyalty and interdependence',
        source: 'Cultural Psychology Research',
        verified_by: 'Cultural Consultant',
        tags: ['family', 'support', 'values']
      }
    ]);
    
    // Add more cultural content for other cultures...
  }

  protected selectRelevantCulturalContent(
    userInput: string,
    context: Record<string, any>,
    culture: string
  ): CulturalContent | null {
    const content = this.culturalContent.get(culture) || [];
    
    // Simple relevance matching - in production would use more sophisticated NLP
    for (const item of content) {
      if (item.therapeutic_applications.some(app => 
        userInput.toLowerCase().includes(app.toLowerCase())
      )) {
        return item;
      }
    }
    
    return content.length > 0 ? content[0] : null;
  }

  protected integrateCulturalContent(response: string, content: CulturalContent): string {
    return response + `\n\nIn your cultural tradition, there's wisdom about ${content.title}: "${content.content}". How might this perspective be helpful in your current situation?`;
  }

  protected personalizeResponse(response: string, context: Record<string, any>): string {
    if (context.preferred_name) {
      response = response.replace(/\{name\}/g, context.preferred_name);
    }
    
    if (context.previous_successful_strategies) {
      response += `\n\nI remember that ${context.previous_successful_strategies[0]} worked well for you before. Might that be helpful now?`;
    }
    
    return response;
  }
}