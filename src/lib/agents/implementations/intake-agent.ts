/**
 * FACET Intake Agent Implementation
 * Specialized for initial assessment, cultural discovery, and rapport building
 */

import { nanoid } from 'nanoid';
import { BaseAgent } from '../base-agent';
import {
  AgentType,
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
} from '../agent-types';
import { AzureOpenAIClient } from '../../llm/azure-openai';
import { RedisCoordinator } from '../coordination/redis-coordinator';
import { PromptGenerator } from '../../llm/prompt-templates';

export interface AssessmentResult {
  mentalHealthConcerns: string[];
  culturalProfile: {
    primaryIdentity: string;
    secondaryIdentities: string[];
    languagePreferences: string[];
    familyStructure: string;
    religiousSpiritual: string;
    communicationStyle: string;
    treatmentPreferences: string[];
  };
  riskFactors: {
    suicidalIdeation: boolean;
    selfHarm: boolean;
    substanceUse: boolean;
    domesticViolence: boolean;
    psychosis: boolean;
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  };
  socialSupport: {
    familySupport: number; // 1-10 scale
    friendSupport: number;
    communitySupport: number;
    professionalSupport: number;
  };
  treatmentHistory: {
    previousTherapy: boolean;
    therapyTypes: string[];
    positiveExperiences: string[];
    negativeExperiences: string[];
    medications: string[];
  };
  recommendations: {
    immediateActions: string[];
    suggestedAgents: AgentType[];
    treatmentPriority: 'routine' | 'urgent' | 'crisis';
    culturalAdaptations: string[];
  };
}

export interface CulturalProfile {
  primaryCulture: string;
  ethnicity: string[];
  languages: string[];
  generationStatus: string;
  acculturationLevel: number; // 1-10 scale
  culturalValues: string[];
  familyDynamics: string;
  religiousBeliefs: string;
  traditionalPractices: string[];
  culturalTrauma: boolean;
  culturalAssets: string[];
}

export class IntakeAgent extends BaseAgent {
  type = 'intake' as const;
  capabilities = [
    'initial_assessment',
    'cultural_discovery',
    'rapport_building',
    'risk_screening',
    'treatment_planning',
    'crisis_detection'
  ];

  constructor(
    config: AgentConfig,
    llmClient: AzureOpenAIClient,
    redisCoordinator: RedisCoordinator
  ) {
    super('intake', config, llmClient, redisCoordinator);
  }

  // ============================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================================================

  protected async executeAgentLogic(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse> {
    try {
      // Generate comprehensive intake assessment
      const assessment = await this.conductInitialAssessment(message.content, context);
      
      // Discover cultural background
      const culturalProfile = await this.discoverCulturalBackground(message.content, context);
      
      // Screen for risk factors
      const riskAssessment = await this.screenForRisks(message.content, context, assessment);
      
      // Build therapeutic rapport
      const rapportResponse = await this.buildRapport(message.content, context, assessment);
      
      // Determine next steps and coordination needs
      const recommendations = await this.generateRecommendations(
        assessment,
        culturalProfile,
        riskAssessment,
        context
      );

      // Calculate confidence based on assessment completeness
      const confidence = this.calculateAssessmentConfidence(assessment, culturalProfile);

      // Determine cultural relevance
      const culturalRelevance = this.calculateCulturalRelevance(culturalProfile, context);

      // Check for escalation needs
      const escalationNeeded = riskAssessment.riskLevel === 'critical' || 
                              riskAssessment.suicidalIdeation ||
                              riskAssessment.psychosis;

      return this.createResponse(
        rapportResponse,
        confidence,
        context,
        {
          culturalRelevance,
          actionItems: recommendations.immediateActions,
          followUpRequired: true,
          escalationNeeded,
          coordinationEvents: [
            {
              type: 'intake_completed',
              assessment,
              culturalProfile,
              riskAssessment,
              recommendations,
              timestamp: Date.now(),
            }
          ],
          metadata: {
            intakeComplete: true,
            culturalProfileEstablished: true,
            riskScreeningComplete: true,
            recommendedAgents: recommendations.suggestedAgents,
            treatmentPriority: recommendations.treatmentPriority,
          }
        }
      );

    } catch (error) {
      throw new Error(`Intake assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getCapabilities(): string[] {
    return this.capabilities;
  }

  protected async performAgentSpecificHealthCheck(): Promise<boolean> {
    try {
      // Test cultural discovery functionality
      const testAssessment = await this.conductInitialAssessment(
        'I am feeling anxious about my cultural identity.',
        {
          sessionId: 'health-check',
          userId: 'health-check-user',
          confidentialityLevel: 'standard',
          timestamp: Date.now(),
          correlationId: 'health-check-correlation',
        }
      );

      return testAssessment.mentalHealthConcerns.length > 0;

    } catch (error) {
      console.error('Intake agent health check failed:', error);
      return false;
    }
  }

  // ============================================================================
  // INTAKE-SPECIFIC METHODS
  // ============================================================================

  /**
   * Conduct comprehensive initial assessment
   */
  async conductInitialAssessment(userInput: string, context: AgentContext): Promise<AssessmentResult> {
    const promptContext = {
      userInput,
      sessionHistory: context.sessionHistory,
      culturalProfile: context.culturalProfile,
      emergencyIndicators: this.extractEmergencyIndicators(userInput),
    };

    const { systemPrompt, userPrompt } = PromptGenerator.generatePrompt(
      'intake',
      promptContext,
      context
    );

    const assessmentPrompt = `${userPrompt}

Please provide a structured assessment in the following format:

MENTAL HEALTH CONCERNS:
- List primary concerns and symptoms
- Rate severity (1-10)
- Note duration and impact

RISK FACTORS:
- Assess suicidal ideation (yes/no and details)
- Screen for self-harm behaviors
- Evaluate substance use patterns
- Check for domestic violence indicators
- Assess for psychosis or reality distortion
- Determine overall risk level (low/moderate/high/critical)

SOCIAL SUPPORT:
- Family support quality (1-10)
- Friend network strength (1-10)
- Community connections (1-10)
- Professional support history (1-10)

TREATMENT HISTORY:
- Previous therapy experience (yes/no)
- Types of therapy tried
- Positive and negative experiences
- Current or past medications

Provide specific, actionable assessment data for treatment planning.`;

    const response = await this.generateLLMResponse(
      assessmentPrompt,
      context,
      systemPrompt
    );

    return this.parseAssessmentResponse(response);
  }

  /**
   * Discover cultural background and preferences
   */
  async discoverCulturalBackground(userInput: string, context: AgentContext): Promise<CulturalProfile> {
    const culturalPrompt = `Based on the user input: "${userInput}"

Please conduct a respectful cultural exploration:

CULTURAL IDENTITY EXPLORATION:
1. What cultural or ethnic backgrounds are important to you?
2. What languages do you speak or feel connected to?
3. How would you describe your family structure and dynamics?
4. What role do religious or spiritual beliefs play in your life?
5. Are there cultural traditions or practices that are meaningful to you?
6. How do you feel your cultural background affects your mental health?

CULTURAL ADAPTATION NEEDS:
- Communication style preferences
- Family involvement in treatment
- Cultural barriers to mental health treatment
- Traditional healing practices of interest
- Cultural strengths and resources

Approach with cultural humility and avoid assumptions. Ask open-ended questions to understand their unique cultural identity.`;

    const response = await this.generateLLMResponse(
      culturalPrompt,
      context,
      "You are conducting a culturally sensitive intake assessment. Show genuine interest in the user's cultural background while maintaining professional boundaries."
    );

    return this.parseCulturalResponse(response);
  }

  /**
   * Build therapeutic rapport while maintaining boundaries
   */
  async buildRapport(
    userInput: string,
    context: AgentContext,
    assessment: AssessmentResult
  ): Promise<string> {
    const rapportPrompt = `User has shared: "${userInput}"

Based on the assessment findings, provide a warm, empathetic response that:

1. ACKNOWLEDGES their courage in seeking help
2. VALIDATES their experiences and concerns
3. NORMALIZES their struggles within cultural context
4. EXPRESSES genuine care and commitment to helping
5. EXPLAINS what comes next in the therapy process
6. ASKS what questions they have about therapy

Use their preferred communication style and cultural context. Build trust while maintaining professional therapeutic boundaries.

Keep response warm, hopeful, and culturally sensitive.`;

    return await this.generateLLMResponse(
      rapportPrompt,
      context,
      "You are building therapeutic rapport during intake. Be warm, genuine, and culturally sensitive while maintaining professional boundaries."
    );
  }

  /**
   * Screen for immediate risk factors and crisis indicators
   */
  async screenForRisks(
    userInput: string,
    context: AgentContext,
    assessment: AssessmentResult
  ): Promise<AssessmentResult['riskFactors']> {
    // Extract crisis indicators from text
    const crisisIndicators = this.extractEmergencyIndicators(userInput);
    
    const riskPrompt = `Conduct comprehensive risk assessment for: "${userInput}"

SUICIDE RISK ASSESSMENT:
- Current suicidal thoughts (frequency, intensity, duration)
- Suicide plans (method, timing, location)
- Access to means
- Previous attempts
- Protective factors
- Intent to act

SELF-HARM ASSESSMENT:
- Current self-harm urges or behaviors
- History of self-injury
- Functions of self-harm
- Alternative coping strategies

SUBSTANCE USE SCREENING:
- Current use patterns
- Impact on functioning
- History of abuse or dependence
- Co-occurring mental health issues

DOMESTIC VIOLENCE SCREENING:
- Current safety concerns
- History of abuse (physical, emotional, sexual)
- Safety planning needs
- Children at risk

PSYCHOSIS SCREENING:
- Reality testing
- Hallucinations or delusions
- Thought organization
- Insight and judgment

Provide specific risk level determination and immediate safety recommendations.`;

    const response = await this.generateLLMResponse(
      riskPrompt,
      context,
      "You are conducting a comprehensive risk assessment. Be thorough, direct, and focused on immediate safety while maintaining therapeutic rapport."
    );

    return this.parseRiskAssessment(response, crisisIndicators);
  }

  /**
   * Generate treatment recommendations and coordination needs
   */
  async generateRecommendations(
    assessment: AssessmentResult,
    culturalProfile: CulturalProfile,
    riskAssessment: AssessmentResult['riskFactors'],
    context: AgentContext
  ): Promise<AssessmentResult['recommendations']> {
    const recommendationPrompt = `Based on comprehensive intake assessment:

ASSESSMENT SUMMARY:
- Mental health concerns: ${assessment.mentalHealthConcerns.join(', ')}
- Risk level: ${riskAssessment.riskLevel}
- Cultural background: ${culturalProfile.primaryCulture}
- Support systems: Family(${assessment.socialSupport.familySupport}/10), Community(${assessment.socialSupport.communitySupport}/10)

GENERATE RECOMMENDATIONS FOR:

1. IMMEDIATE ACTIONS (next 24-48 hours):
   - Safety planning if needed
   - Crisis resources
   - Initial coping strategies
   - Cultural support activation

2. AGENT COORDINATION NEEDS:
   - Crisis Monitor: ${riskAssessment.riskLevel === 'high' || riskAssessment.riskLevel === 'critical' ? 'YES' : 'NO'}
   - Cultural Adapter: ${culturalProfile.primaryCulture !== 'mainstream' ? 'YES' : 'NO'}
   - Progress Tracker: YES (all cases)
   - Therapy Coordinator: YES (all cases)

3. TREATMENT PRIORITY:
   - Crisis: Immediate safety concerns
   - Urgent: High risk or severe symptoms
   - Routine: Standard therapeutic support

4. CULTURAL ADAPTATIONS:
   - Communication style adjustments
   - Family involvement considerations
   - Traditional healing integration
   - Cultural barrier solutions

Provide specific, actionable recommendations.`;

    const response = await this.generateLLMResponse(
      recommendationPrompt,
      context,
      "You are developing treatment recommendations based on comprehensive intake assessment. Consider cultural factors, risk levels, and resource needs."
    );

    return this.parseRecommendations(response, riskAssessment.riskLevel);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Extract emergency indicators from user input
   */
  private extractEmergencyIndicators(userInput: string): string[] {
    const indicators: string[] = [];
    const text = userInput.toLowerCase();

    // Suicide indicators
    const suicideTerms = [
      'kill myself', 'end it all', 'better off dead', 'suicide', 'suicidal',
      'not worth living', 'want to die', 'plan to die', 'end my life'
    ];
    
    // Self-harm indicators
    const selfHarmTerms = [
      'cut myself', 'hurt myself', 'self-harm', 'cutting', 'burning',
      'punish myself', 'deserve pain'
    ];

    // Violence indicators
    const violenceTerms = [
      'kill them', 'hurt someone', 'violent thoughts', 'weapon',
      'domestic violence', 'being abused', 'hitting me'
    ];

    // Psychosis indicators
    const psychosisTerms = [
      'hearing voices', 'seeing things', 'not real', 'paranoid',
      'conspiracy', 'controlling my thoughts', 'messages'
    ];

    // Check for indicators
    if (suicideTerms.some(term => text.includes(term))) {
      indicators.push('suicidal_ideation');
    }
    if (selfHarmTerms.some(term => text.includes(term))) {
      indicators.push('self_harm');
    }
    if (violenceTerms.some(term => text.includes(term))) {
      indicators.push('violence_risk');
    }
    if (psychosisTerms.some(term => text.includes(term))) {
      indicators.push('psychosis');
    }

    return indicators;
  }

  /**
   * Parse LLM assessment response into structured format
   */
  private parseAssessmentResponse(response: string): AssessmentResult {
    // Extract structured data from LLM response
    // This is a simplified parser - in production, you'd want more robust parsing
    
    const concerns = this.extractSection(response, 'MENTAL HEALTH CONCERNS:');
    const riskSection = this.extractSection(response, 'RISK FACTORS:');
    const supportSection = this.extractSection(response, 'SOCIAL SUPPORT:');
    const historySection = this.extractSection(response, 'TREATMENT HISTORY:');

    return {
      mentalHealthConcerns: this.parseListItems(concerns),
      culturalProfile: {
        primaryIdentity: '',
        secondaryIdentities: [],
        languagePreferences: [],
        familyStructure: '',
        religiousSpiritual: '',
        communicationStyle: '',
        treatmentPreferences: [],
      },
      riskFactors: {
        suicidalIdeation: riskSection.toLowerCase().includes('suicidal ideation: yes'),
        selfHarm: riskSection.toLowerCase().includes('self-harm'),
        substanceUse: riskSection.toLowerCase().includes('substance'),
        domesticViolence: riskSection.toLowerCase().includes('domestic violence'),
        psychosis: riskSection.toLowerCase().includes('psychosis'),
        riskLevel: this.extractRiskLevel(riskSection),
      },
      socialSupport: {
        familySupport: this.extractRating(supportSection, 'family'),
        friendSupport: this.extractRating(supportSection, 'friend'),
        communitySupport: this.extractRating(supportSection, 'community'),
        professionalSupport: this.extractRating(supportSection, 'professional'),
      },
      treatmentHistory: {
        previousTherapy: historySection.toLowerCase().includes('previous therapy: yes'),
        therapyTypes: [],
        positiveExperiences: [],
        negativeExperiences: [],
        medications: [],
      },
      recommendations: {
        immediateActions: [],
        suggestedAgents: ['therapy_coordinator'],
        treatmentPriority: 'routine',
        culturalAdaptations: [],
      },
    };
  }

  /**
   * Parse cultural discovery response
   */
  private parseCulturalResponse(response: string): CulturalProfile {
    return {
      primaryCulture: this.extractCulturalValue(response, 'primary culture') || 'Not specified',
      ethnicity: this.parseListItems(this.extractSection(response, 'ethnicity')),
      languages: this.parseListItems(this.extractSection(response, 'languages')),
      generationStatus: this.extractCulturalValue(response, 'generation') || 'Not specified',
      acculturationLevel: 5, // Default mid-range
      culturalValues: this.parseListItems(this.extractSection(response, 'values')),
      familyDynamics: this.extractCulturalValue(response, 'family') || 'Not specified',
      religiousBeliefs: this.extractCulturalValue(response, 'religious') || 'Not specified',
      traditionalPractices: this.parseListItems(this.extractSection(response, 'practices')),
      culturalTrauma: response.toLowerCase().includes('trauma'),
      culturalAssets: this.parseListItems(this.extractSection(response, 'strengths')),
    };
  }

  /**
   * Parse risk assessment from LLM response
   */
  private parseRiskAssessment(response: string, crisisIndicators: string[]): AssessmentResult['riskFactors'] {
    const hasHighRiskIndicators = crisisIndicators.length > 0;
    const responseText = response.toLowerCase();

    return {
      suicidalIdeation: responseText.includes('suicidal') || crisisIndicators.includes('suicidal_ideation'),
      selfHarm: responseText.includes('self-harm') || crisisIndicators.includes('self_harm'),
      substanceUse: responseText.includes('substance'),
      domesticViolence: responseText.includes('domestic') || responseText.includes('abuse'),
      psychosis: responseText.includes('psychosis') || crisisIndicators.includes('psychosis'),
      riskLevel: this.determineOverallRiskLevel(response, crisisIndicators, hasHighRiskIndicators),
    };
  }

  /**
   * Parse treatment recommendations
   */
  private parseRecommendations(response: string, riskLevel: string): AssessmentResult['recommendations'] {
    const immediateActions = this.parseListItems(this.extractSection(response, 'IMMEDIATE ACTIONS'));
    const suggestedAgents: AgentType[] = ['therapy_coordinator'];

    // Add agents based on content
    if (response.includes('Crisis Monitor: YES')) {
      suggestedAgents.push('crisis_monitor');
    }
    if (response.includes('Cultural Adapter: YES')) {
      suggestedAgents.push('cultural_adapter');
    }
    if (response.includes('Progress Tracker: YES')) {
      suggestedAgents.push('progress_tracker');
    }

    const treatmentPriority: 'routine' | 'urgent' | 'crisis' = 
      riskLevel === 'critical' ? 'crisis' :
      riskLevel === 'high' ? 'urgent' : 'routine';

    return {
      immediateActions,
      suggestedAgents,
      treatmentPriority,
      culturalAdaptations: this.parseListItems(this.extractSection(response, 'CULTURAL ADAPTATIONS')),
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private extractSection(text: string, header: string): string {
    const lines = text.split('\n');
    const startIndex = lines.findIndex(line => line.includes(header));
    if (startIndex === -1) return '';

    const endIndex = lines.findIndex((line, index) => 
      index > startIndex && line.match(/^[A-Z][A-Z\s]+:/)
    );

    return lines
      .slice(startIndex + 1, endIndex === -1 ? undefined : endIndex)
      .join('\n')
      .trim();
  }

  private parseListItems(text: string): string[] {
    return text
      .split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  private extractRiskLevel(text: string): 'low' | 'moderate' | 'high' | 'critical' {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('critical')) return 'critical';
    if (lowerText.includes('high')) return 'high';
    if (lowerText.includes('moderate')) return 'moderate';
    return 'low';
  }

  private extractRating(text: string, category: string): number {
    const match = text.match(new RegExp(`${category}[^\\d]*(\\d+)`, 'i'));
    return match ? parseInt(match[1]) : 5; // Default to middle rating
  }

  private extractCulturalValue(text: string, key: string): string | null {
    const lines = text.split('\n');
    const line = lines.find(l => l.toLowerCase().includes(key.toLowerCase()));
    if (!line) return null;
    
    const colonIndex = line.indexOf(':');
    return colonIndex !== -1 ? line.substring(colonIndex + 1).trim() : null;
  }

  private determineOverallRiskLevel(
    response: string,
    crisisIndicators: string[],
    hasHighRiskIndicators: boolean
  ): 'low' | 'moderate' | 'high' | 'critical' {
    if (crisisIndicators.includes('suicidal_ideation') || crisisIndicators.includes('psychosis')) {
      return 'critical';
    }
    if (hasHighRiskIndicators || response.toLowerCase().includes('high risk')) {
      return 'high';
    }
    if (response.toLowerCase().includes('moderate')) {
      return 'moderate';
    }
    return 'low';
  }

  private calculateAssessmentConfidence(
    assessment: AssessmentResult,
    culturalProfile: CulturalProfile
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on completeness
    if (assessment.mentalHealthConcerns.length > 0) confidence += 0.15;
    if (culturalProfile.primaryCulture !== 'Not specified') confidence += 0.15;
    if (assessment.socialSupport.familySupport > 0) confidence += 0.1;
    if (assessment.treatmentHistory.previousTherapy !== undefined) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private calculateCulturalRelevance(
    culturalProfile: CulturalProfile,
    context: AgentContext
  ): number {
    let relevance = 0.7; // Base relevance

    // Increase relevance based on cultural information gathered
    if (culturalProfile.primaryCulture !== 'Not specified') relevance += 0.1;
    if (culturalProfile.languages.length > 0) relevance += 0.1;
    if (culturalProfile.traditionalPractices.length > 0) relevance += 0.1;

    return Math.min(relevance, 1.0);
  }
}