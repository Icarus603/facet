/**
 * FACET Cultural Adapter Agent Implementation
 * Specialized for cultural content integration and therapeutic adaptation
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

export interface CulturalProfile {
  primaryCulture: string;
  ethnicIdentities: string[];
  languagePreferences: string[];
  generationStatus: 'first' | 'second' | 'third' | 'multicultural' | 'unknown';
  acculturationLevel: number; // 1-10 scale
  religiousSpiritual: {
    beliefs: string[];
    practices: string[];
    importance: number; // 1-10 scale
    integration: boolean; // integrate into therapy
  };
  familyDynamics: {
    structure: string;
    involvement: 'high' | 'medium' | 'low' | 'conflicted';
    decisionMaking: 'individual' | 'family' | 'community';
    communicationStyle: string;
  };
  culturalValues: {
    collectivism: number; // vs individualism, 1-10
    powerDistance: number; // 1-10
    uncertaintyAvoidance: number; // 1-10
    traditionalGender: number; // adherence, 1-10
    mentalHealthStigma: number; // 1-10
  };
  culturalAssets: string[];
  culturalChallenges: string[];
  traditionalHealing: {
    practices: string[];
    practitioners: string[];
    effectiveness: number; // 1-10
    willingnessToIntegrate: boolean;
  };
  immigrationTrauma: {
    present: boolean;
    factors: string[];
    impact: number; // 1-10
    needsAddressing: boolean;
  };
}

export interface CulturalContent {
  id: string;
  type: 'story' | 'proverb' | 'metaphor' | 'practice' | 'wisdom' | 'healing_method';
  culture: string;
  language: string;
  content: string;
  translation?: string;
  therapeuticApplication: string[];
  appropriatenessRating: number; // 1-10
  effectiveness: number; // 1-10
  contextualFactors: string[];
  warnings?: string[];
}

export interface CulturalAdaptation {
  originalContent: string;
  adaptedContent: string;
  adaptationType: 'language' | 'metaphor' | 'values' | 'family_involvement' | 'spiritual_integration' | 'communication_style';
  culturalFactors: string[];
  rationale: string;
  appropriateness: number; // 1-10
  effectiveness: number; // 1-10
  warnings?: string[];
}

export interface TherapyAdaptation {
  approach: string;
  culturalModifications: CulturalAdaptation[];
  familyInvolvement: {
    recommended: boolean;
    level: 'minimal' | 'moderate' | 'extensive';
    considerations: string[];
  };
  spiritualIntegration: {
    recommended: boolean;
    practices: string[];
    considerations: string[];
  };
  communicationAdjustments: string[];
  potentialBarriers: string[];
  culturalStrengths: string[];
  monitoring: {
    culturalFit: string[];
    adaptation_indicators: string[];
  };
}

export class CulturalAdapterAgent extends BaseAgent {
  type = 'cultural_adapter' as const;
  capabilities = [
    'cultural_assessment',
    'content_adaptation',
    'cultural_integration',
    'barrier_identification',
    'traditional_healing_integration',
    'family_involvement_planning',
    'spiritual_integration',
    'cultural_validation'
  ];

  // Cultural content database integration
  private culturalContentCache: Map<string, CulturalContent[]> = new Map();
  private adaptationCache: Map<string, CulturalAdaptation[]> = new Map();

  constructor(
    config: AgentConfig,
    llmClient: AzureOpenAIClient,
    redisCoordinator: RedisCoordinator
  ) {
    super('cultural_adapter', config, llmClient, redisCoordinator);
    this.initializeCulturalDatabase();
  }

  // ============================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================================================

  protected async executeAgentLogic(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse> {
    try {
      // Assess cultural profile if not already established
      const culturalProfile = await this.assessCulturalProfile(message, context);
      
      // Analyze other agent responses for cultural appropriateness
      const otherResponses = message.metadata?.otherAgentResponses || [];
      const appropriatenessAnalysis = await this.analyzeAppropriateness(otherResponses, culturalProfile, context);
      
      // Generate cultural adaptations
      const adaptations = await this.generateCulturalAdaptations(otherResponses, culturalProfile, context);
      
      // Search for relevant cultural content
      const culturalContent = await this.searchCulturalContent(message.content, culturalProfile);
      
      // Validate cultural accuracy
      const validationResults = await this.validateCulturalAccuracy(adaptations, culturalContent, culturalProfile);
      
      // Generate adaptation recommendations
      const recommendations = await this.generateAdaptationRecommendations(
        appropriatenessAnalysis,
        adaptations,
        culturalContent,
        culturalProfile,
        context
      );

      // Calculate cultural relevance score
      const culturalRelevance = this.calculateCulturalRelevance(adaptations, culturalContent, culturalProfile);
      
      // Determine confidence based on cultural data availability
      const confidence = this.calculateAdaptationConfidence(culturalProfile, culturalContent, adaptations);

      return this.createResponse(
        recommendations,
        confidence,
        context,
        {
          culturalRelevance,
          actionItems: this.extractCulturalActionItems(adaptations),
          followUpRequired: this.needsCulturalFollowUp(culturalProfile, adaptations),
          escalationNeeded: this.needsCulturalEscalation(appropriatenessAnalysis),
          coordinationEvents: [
            {
              type: 'cultural_adaptation_completed',
              culturalProfile,
              adaptations,
              culturalContent,
              appropriatenessScore: appropriatenessAnalysis.overallScore,
              timestamp: Date.now(),
            }
          ],
          metadata: {
            culturalProfileComplete: this.isCulturalProfileComplete(culturalProfile),
            adaptationsGenerated: adaptations.length,
            culturalContentFound: culturalContent.length,
            appropriatenessScore: appropriatenessAnalysis.overallScore,
            barriersIdentified: appropriatenessAnalysis.barriers,
            culturalStrengths: appropriatenessAnalysis.strengths,
          }
        }
      );

    } catch (error) {
      throw new Error(`Cultural adaptation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getCapabilities(): string[] {
    return this.capabilities;
  }

  protected async performAgentSpecificHealthCheck(): Promise<boolean> {
    try {
      // Test cultural content search
      const testContent = await this.searchCulturalContent(
        'family support during difficult times',
        {
          primaryCulture: 'Latino',
          ethnicIdentities: ['Mexican'],
          languagePreferences: ['Spanish', 'English'],
          generationStatus: 'second',
          acculturationLevel: 6,
          religiousSpiritual: {
            beliefs: ['Catholic'],
            practices: ['prayer'],
            importance: 7,
            integration: true,
          },
          familyDynamics: {
            structure: 'extended family',
            involvement: 'high',
            decisionMaking: 'family',
            communicationStyle: 'indirect',
          },
          culturalValues: {
            collectivism: 8,
            powerDistance: 6,
            uncertaintyAvoidance: 7,
            traditionalGender: 6,
            mentalHealthStigma: 7,
          },
          culturalAssets: ['strong family bonds'],
          culturalChallenges: ['mental health stigma'],
          traditionalHealing: {
            practices: ['curanderismo'],
            practitioners: ['curandero'],
            effectiveness: 6,
            willingnessToIntegrate: true,
          },
          immigrationTrauma: {
            present: false,
            factors: [],
            impact: 0,
            needsAddressing: false,
          },
        }
      );

      return testContent.length > 0;

    } catch (error) {
      console.error('Cultural adapter health check failed:', error);
      return false;
    }
  }

  // ============================================================================
  // CULTURAL ADAPTATION METHODS
  // ============================================================================

  /**
   * Assess and update cultural profile
   */
  async assessCulturalProfile(message: AgentMessage, context: AgentContext): Promise<CulturalProfile> {
    // Use existing profile if available
    if (context.culturalProfile && this.isCulturalProfileComplete(context.culturalProfile)) {
      return context.culturalProfile as CulturalProfile;
    }

    const assessmentPrompt = `Assess cultural profile based on: "${message.content}"

Previous cultural context: ${JSON.stringify(context.culturalProfile || {})}

CULTURAL IDENTITY ASSESSMENT:
1. Primary cultural/ethnic identity
2. Language preferences and fluency
3. Generation status (immigrant, 2nd gen, etc.)
4. Acculturation level (1-10, traditional to fully acculturated)

FAMILY AND SOCIAL STRUCTURE:
1. Family structure and dynamics
2. Level of family involvement in decisions
3. Communication styles (direct/indirect)
4. Gender roles and expectations

RELIGIOUS/SPIRITUAL:
1. Religious or spiritual beliefs
2. Practices and their importance
3. Willingness to integrate into therapy

CULTURAL VALUES:
1. Individualism vs Collectivism (1-10)
2. Power distance (respect for authority, 1-10)
3. Mental health stigma level (1-10)
4. Traditional healing beliefs

CULTURAL ASSETS AND CHALLENGES:
1. Cultural strengths and resources
2. Cultural barriers to mental health treatment
3. Immigration/acculturation stressors

Provide detailed cultural assessment for therapeutic adaptation.`;

    const response = await this.generateLLMResponse(assessmentPrompt, context);
    return this.parseCulturalProfile(response);
  }

  /**
   * Search cultural content database for relevant wisdom/practices
   */
  async searchCulturalContent(query: string, culturalProfile: CulturalProfile): Promise<CulturalContent[]> {
    // Check cache first
    const cacheKey = `${culturalProfile.primaryCulture}_${query.slice(0, 50)}`;
    const cached = this.culturalContentCache.get(cacheKey);
    if (cached) return cached;

    // Generate embeddings for semantic search
    const queryEmbedding = await this.llmClient.generateEmbeddings(
      `${query} ${culturalProfile.primaryCulture} therapy mental health`
    );

    // In production, this would use pgvector for semantic search
    // For now, simulate with cultural content matching
    const content = await this.simulateCulturalContentSearch(query, culturalProfile);
    
    // Cache results
    this.culturalContentCache.set(cacheKey, content);
    
    return content;
  }

  /**
   * Generate cultural adaptations for therapy content
   */
  async generateCulturalAdaptations(
    originalContent: string[],
    culturalProfile: CulturalProfile,
    context: AgentContext
  ): Promise<CulturalAdaptation[]> {
    const adaptations: CulturalAdaptation[] = [];

    for (const content of originalContent) {
      const adaptationPrompt = `Adapt therapeutic content for cultural context:

ORIGINAL CONTENT: "${content}"

CULTURAL PROFILE:
- Primary Culture: ${culturalProfile.primaryCulture}
- Language Preferences: ${culturalProfile.languagePreferences.join(', ')}
- Family Involvement: ${culturalProfile.familyDynamics.involvement}
- Religious/Spiritual: ${culturalProfile.religiousSpiritual.beliefs.join(', ')}
- Communication Style: ${culturalProfile.familyDynamics.communicationStyle}
- Collectivism Level: ${culturalProfile.culturalValues.collectivism}/10
- Mental Health Stigma: ${culturalProfile.culturalValues.mentalHealthStigma}/10

ADAPTATION REQUIREMENTS:
1. Language and metaphor adjustments
2. Family involvement considerations
3. Religious/spiritual integration opportunities
4. Communication style modifications
5. Cultural value alignment
6. Stigma reduction strategies

Provide specific adaptations with rationale and appropriateness ratings.`;

      const response = await this.generateLLMResponse(adaptationPrompt, context);
      const adaptation = this.parseAdaptationResponse(response, content);
      
      if (adaptation) {
        adaptations.push(adaptation);
      }
    }

    return adaptations;
  }

  /**
   * Validate cultural accuracy and appropriateness
   */
  async validateCulturalAccuracy(
    adaptations: CulturalAdaptation[],
    culturalContent: CulturalContent[],
    culturalProfile: CulturalProfile
  ): Promise<{ isAccurate: boolean; concerns: string[]; recommendations: string[] }> {
    const validationPrompt = `Validate cultural accuracy and appropriateness:

CULTURAL PROFILE: ${JSON.stringify(culturalProfile, null, 2)}

PROPOSED ADAPTATIONS:
${adaptations.map(a => `- ${a.adaptationType}: ${a.adaptedContent}`).join('\n')}

CULTURAL CONTENT USED:
${culturalContent.map(c => `- ${c.type}: ${c.content} (${c.culture})`).join('\n')}

VALIDATION CRITERIA:
1. Cultural authenticity and accuracy
2. Avoidance of stereotypes or generalizations
3. Respect for cultural nuances
4. Appropriateness for individual's specific background
5. Potential for cultural harm or misrepresentation

Identify any concerns and provide recommendations for improvement.`;

    const response = await this.generateLLMResponse(validationPrompt, {
      sessionId: 'validation',
      userId: 'system',
      confidentialityLevel: 'standard',
      timestamp: Date.now(),
      correlationId: nanoid(),
    });

    return this.parseValidationResponse(response);
  }

  /**
   * Analyze appropriateness of other agent responses
   */
  async analyzeAppropriateness(
    responses: string[],
    culturalProfile: CulturalProfile,
    context: AgentContext
  ): Promise<{
    overallScore: number;
    individualScores: number[];
    barriers: string[];
    strengths: string[];
    recommendations: string[];
  }> {
    if (responses.length === 0) {
      return {
        overallScore: 0.8,
        individualScores: [],
        barriers: [],
        strengths: [],
        recommendations: ['No other agent responses to analyze'],
      };
    }

    const analysisPrompt = `Analyze cultural appropriateness of therapy responses:

CULTURAL PROFILE:
${JSON.stringify(culturalProfile, null, 2)}

RESPONSES TO ANALYZE:
${responses.map((r, i) => `Response ${i + 1}: "${r}"`).join('\n\n')}

ANALYSIS CRITERIA:
1. Cultural sensitivity and awareness
2. Avoidance of cultural stereotypes
3. Appropriate communication style
4. Respect for cultural values
5. Family/community consideration
6. Religious/spiritual sensitivity
7. Stigma awareness

For each response, rate appropriateness (1-10) and identify:
- Cultural barriers or insensitive elements
- Cultural strengths and appropriate elements
- Specific recommendations for improvement

Provide overall cultural appropriateness assessment.`;

    const response = await this.generateLLMResponse(analysisPrompt, context);
    return this.parseAppropriatenessAnalysis(response);
  }

  /**
   * Generate comprehensive adaptation recommendations
   */
  async generateAdaptationRecommendations(
    appropriatenessAnalysis: any,
    adaptations: CulturalAdaptation[],
    culturalContent: CulturalContent[],
    culturalProfile: CulturalProfile,
    context: AgentContext
  ): Promise<string> {
    const recommendationPrompt = `Generate comprehensive cultural adaptation recommendations:

APPROPRIATENESS ANALYSIS:
- Overall Score: ${appropriatenessAnalysis.overallScore}/10
- Barriers: ${appropriatenessAnalysis.barriers.join(', ')}
- Strengths: ${appropriatenessAnalysis.strengths.join(', ')}

CULTURAL ADAPTATIONS GENERATED: ${adaptations.length}
${adaptations.map(a => `- ${a.adaptationType}: ${a.rationale}`).join('\n')}

RELEVANT CULTURAL CONTENT: ${culturalContent.length} items
${culturalContent.slice(0, 3).map(c => `- ${c.type}: ${c.content.slice(0, 100)}...`).join('\n')}

CULTURAL PROFILE SUMMARY:
- Culture: ${culturalProfile.primaryCulture}
- Collectivism: ${culturalProfile.culturalValues.collectivism}/10
- Family Involvement: ${culturalProfile.familyDynamics.involvement}
- Mental Health Stigma: ${culturalProfile.culturalValues.mentalHealthStigma}/10

PROVIDE RECOMMENDATIONS FOR:
1. Immediate cultural adaptations to implement
2. Communication style adjustments
3. Family involvement strategies
4. Spiritual/religious integration opportunities
5. Cultural content integration
6. Barrier mitigation strategies
7. Cultural strength utilization

Make recommendations specific, actionable, and culturally humble.`;

    return await this.generateLLMResponse(recommendationPrompt, context);
  }

  // ============================================================================
  // SPECIALIZED CULTURAL METHODS
  // ============================================================================

  /**
   * Adapt therapeutic approach for cultural context
   */
  async adaptTherapyToCulture(
    approach: string,
    culturalProfile: CulturalProfile
  ): Promise<TherapyAdaptation> {
    const adaptationPrompt = `Adapt therapeutic approach for cultural context:

THERAPEUTIC APPROACH: ${approach}

CULTURAL CONTEXT:
- Primary Culture: ${culturalProfile.primaryCulture}
- Collectivism Level: ${culturalProfile.culturalValues.collectivism}/10
- Family Involvement: ${culturalProfile.familyDynamics.involvement}
- Power Distance: ${culturalProfile.culturalValues.powerDistance}/10
- Religious Integration: ${culturalProfile.religiousSpiritual.integration}
- Mental Health Stigma: ${culturalProfile.culturalValues.mentalHealthStigma}/10

ADAPTATION AREAS:
1. Modify approach for cultural values
2. Adjust for family/community involvement
3. Integrate spiritual/religious elements
4. Address cultural barriers
5. Leverage cultural strengths
6. Adapt communication style

Provide specific modifications with rationale.`;

    const response = await this.generateLLMResponse(adaptationPrompt, {
      sessionId: 'adaptation',
      userId: 'system',
      confidentialityLevel: 'standard',
      timestamp: Date.now(),
      correlationId: nanoid(),
    });

    return this.parseTherapyAdaptation(response, approach);
  }

  /**
   * Generate cultural metaphors for therapeutic concepts
   */
  async generateCulturalMetaphors(
    concept: string,
    culturalProfile: CulturalProfile
  ): Promise<{ metaphor: string; explanation: string; appropriateness: number }[]> {
    const metaphorPrompt = `Generate culturally appropriate metaphors for: "${concept}"

CULTURAL CONTEXT:
- Primary Culture: ${culturalProfile.primaryCulture}
- Cultural Assets: ${culturalProfile.culturalAssets.join(', ')}
- Traditional Practices: ${culturalProfile.traditionalHealing.practices.join(', ')}
- Religious/Spiritual: ${culturalProfile.religiousSpiritual.beliefs.join(', ')}

Generate 3 different metaphors that:
1. Resonate with cultural background
2. Use familiar cultural references
3. Respect cultural values
4. Avoid stereotypes
5. Support therapeutic goals

For each metaphor, provide explanation and appropriateness rating (1-10).`;

    const response = await this.generateLLMResponse(metaphorPrompt, {
      sessionId: 'metaphor',
      userId: 'system',
      confidentialityLevel: 'standard',
      timestamp: Date.now(),
      correlationId: nanoid(),
    });

    return this.parseMetaphorResponse(response);
  }

  // ============================================================================
  // CULTURAL DATABASE SIMULATION
  // ============================================================================

  private async simulateCulturalContentSearch(
    query: string,
    culturalProfile: CulturalProfile
  ): Promise<CulturalContent[]> {
    // This simulates a cultural content database search
    // In production, this would query a real pgvector database
    
    const culturalDatabase = this.getCulturalDatabase();
    const relevantContent: CulturalContent[] = [];

    for (const content of culturalDatabase) {
      if (content.culture.toLowerCase().includes(culturalProfile.primaryCulture.toLowerCase()) ||
          culturalProfile.ethnicIdentities.some(e => content.culture.toLowerCase().includes(e.toLowerCase()))) {
        
        // Simple relevance scoring based on query terms
        const queryWords = query.toLowerCase().split(' ');
        const contentWords = content.content.toLowerCase();
        const relevanceScore = queryWords.filter(word => contentWords.includes(word)).length;
        
        if (relevanceScore > 0) {
          relevantContent.push({
            ...content,
            appropriatenessRating: this.calculateAppropriatenessRating(content, culturalProfile),
            effectiveness: this.calculateEffectivenessRating(content, culturalProfile),
          });
        }
      }
    }

    // Sort by appropriateness and effectiveness
    return relevantContent
      .sort((a, b) => (b.appropriatenessRating + b.effectiveness) - (a.appropriatenessRating + a.effectiveness))
      .slice(0, 5); // Return top 5 results
  }

  private getCulturalDatabase(): CulturalContent[] {
    // Sample cultural content database
    // In production, this would be a comprehensive database
    return [
      {
        id: 'latino_001',
        type: 'proverb',
        culture: 'Latino/Hispanic',
        language: 'Spanish',
        content: 'Dios aprieta pero no ahorca',
        translation: 'God squeezes but does not strangle',
        therapeuticApplication: ['hope', 'resilience', 'faith_based_coping'],
        appropriatenessRating: 9,
        effectiveness: 8,
        contextualFactors: ['religious_beliefs', 'hope_building', 'resilience'],
      },
      {
        id: 'asian_001',
        type: 'metaphor',
        culture: 'Chinese',
        language: 'English',
        content: 'The bamboo that bends is stronger than the oak that resists',
        therapeuticApplication: ['flexibility', 'resilience', 'adaptation'],
        appropriatenessRating: 8,
        effectiveness: 9,
        contextualFactors: ['flexibility', 'strength_through_yielding'],
      },
      {
        id: 'african_001',
        type: 'proverb',
        culture: 'African',
        language: 'English',
        content: 'Ubuntu: I am because we are',
        therapeuticApplication: ['community_support', 'interconnectedness', 'family_therapy'],
        appropriatenessRating: 9,
        effectiveness: 8,
        contextualFactors: ['community', 'collectivism', 'family_bonds'],
      },
      {
        id: 'native_001',
        type: 'story',
        culture: 'Native American',
        language: 'English',
        content: 'The story of two wolves fighting within - which one wins depends on which one you feed',
        therapeuticApplication: ['choice', 'self_control', 'mindfulness'],
        appropriatenessRating: 8,
        effectiveness: 9,
        contextualFactors: ['choice', 'internal_balance', 'spiritual_wisdom'],
      },
      {
        id: 'middle_eastern_001',
        type: 'wisdom',
        culture: 'Middle Eastern',
        language: 'English',
        content: 'This too shall pass - Sufi teaching about impermanence',
        therapeuticApplication: ['mindfulness', 'acceptance', 'temporal_perspective'],
        appropriatenessRating: 8,
        effectiveness: 8,
        contextualFactors: ['impermanence', 'spiritual_acceptance', 'patience'],
      },
    ];
  }

  private initializeCulturalDatabase(): void {
    // Initialize cultural content patterns and relationships
    // This would be more sophisticated in production
    console.log('Cultural adapter initialized with content database');
  }

  // ============================================================================
  // PARSING AND UTILITY METHODS
  // ============================================================================

  private parseCulturalProfile(response: string): CulturalProfile {
    // Simplified parsing - would be more robust in production
    return {
      primaryCulture: this.extractValue(response, 'primary culture') || 'Not specified',
      ethnicIdentities: this.extractList(response, 'ethnic'),
      languagePreferences: this.extractList(response, 'language'),
      generationStatus: this.extractGenerationStatus(response),
      acculturationLevel: this.extractRating(response, 'acculturation') || 5,
      religiousSpiritual: {
        beliefs: this.extractList(response, 'religious'),
        practices: this.extractList(response, 'spiritual practices'),
        importance: this.extractRating(response, 'importance') || 5,
        integration: response.toLowerCase().includes('integrate'),
      },
      familyDynamics: {
        structure: this.extractValue(response, 'family structure') || 'Nuclear',
        involvement: this.extractInvolvementLevel(response),
        decisionMaking: this.extractDecisionStyle(response),
        communicationStyle: this.extractValue(response, 'communication') || 'Direct',
      },
      culturalValues: {
        collectivism: this.extractRating(response, 'collectivism') || 5,
        powerDistance: this.extractRating(response, 'power distance') || 5,
        uncertaintyAvoidance: this.extractRating(response, 'uncertainty') || 5,
        traditionalGender: this.extractRating(response, 'gender') || 5,
        mentalHealthStigma: this.extractRating(response, 'stigma') || 5,
      },
      culturalAssets: this.extractList(response, 'assets'),
      culturalChallenges: this.extractList(response, 'challenges'),
      traditionalHealing: {
        practices: this.extractList(response, 'traditional'),
        practitioners: this.extractList(response, 'healers'),
        effectiveness: this.extractRating(response, 'effectiveness') || 5,
        willingnessToIntegrate: response.toLowerCase().includes('willing'),
      },
      immigrationTrauma: {
        present: response.toLowerCase().includes('immigration trauma'),
        factors: this.extractList(response, 'immigration'),
        impact: this.extractRating(response, 'trauma impact') || 0,
        needsAddressing: response.toLowerCase().includes('needs addressing'),
      },
    };
  }

  private parseAdaptationResponse(response: string, originalContent: string): CulturalAdaptation | null {
    const adaptedContent = this.extractValue(response, 'adapted content') || 
                          this.extractValue(response, 'adaptation') ||
                          originalContent;
    
    if (adaptedContent === originalContent) return null;

    return {
      originalContent,
      adaptedContent,
      adaptationType: this.extractAdaptationType(response),
      culturalFactors: this.extractList(response, 'cultural factors'),
      rationale: this.extractValue(response, 'rationale') || 'Cultural appropriateness',
      appropriateness: this.extractRating(response, 'appropriateness') || 7,
      effectiveness: this.extractRating(response, 'effectiveness') || 7,
      warnings: this.extractList(response, 'warnings'),
    };
  }

  private parseValidationResponse(response: string): {
    isAccurate: boolean;
    concerns: string[];
    recommendations: string[];
  } {
    return {
      isAccurate: !response.toLowerCase().includes('concern') && !response.toLowerCase().includes('inaccurate'),
      concerns: this.extractList(response, 'concerns'),
      recommendations: this.extractList(response, 'recommendations'),
    };
  }

  private parseAppropriatenessAnalysis(response: string): {
    overallScore: number;
    individualScores: number[];
    barriers: string[];
    strengths: string[];
    recommendations: string[];
  } {
    return {
      overallScore: this.extractRating(response, 'overall') || 7,
      individualScores: this.extractMultipleRatings(response),
      barriers: this.extractList(response, 'barriers'),
      strengths: this.extractList(response, 'strengths'),
      recommendations: this.extractList(response, 'recommendations'),
    };
  }

  private parseTherapyAdaptation(response: string, approach: string): TherapyAdaptation {
    return {
      approach,
      culturalModifications: [], // Would be populated from response
      familyInvolvement: {
        recommended: response.toLowerCase().includes('family involvement'),
        level: this.extractInvolvementLevel(response),
        considerations: this.extractList(response, 'family considerations'),
      },
      spiritualIntegration: {
        recommended: response.toLowerCase().includes('spiritual'),
        practices: this.extractList(response, 'spiritual practices'),
        considerations: this.extractList(response, 'spiritual considerations'),
      },
      communicationAdjustments: this.extractList(response, 'communication'),
      potentialBarriers: this.extractList(response, 'barriers'),
      culturalStrengths: this.extractList(response, 'strengths'),
      monitoring: {
        culturalFit: this.extractList(response, 'cultural fit'),
        adaptation_indicators: this.extractList(response, 'indicators'),
      },
    };
  }

  private parseMetaphorResponse(response: string): {
    metaphor: string;
    explanation: string;
    appropriateness: number;
  }[] {
    const metaphors: any[] = [];
    const sections = response.split(/\d+\./);
    
    for (const section of sections.slice(1)) {
      const metaphor = this.extractValue(section, 'metaphor') || 
                      section.split('\n')[0].trim();
      const explanation = this.extractValue(section, 'explanation') || '';
      const appropriateness = this.extractRating(section, 'appropriateness') || 7;
      
      if (metaphor) {
        metaphors.push({ metaphor, explanation, appropriateness });
      }
    }
    
    return metaphors;
  }

  // Utility methods for parsing
  private extractValue(text: string, key: string): string | null {
    const regex = new RegExp(`${key}[^\\n]*:([^\\n]*)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractList(text: string, category: string): string[] {
    const lines = text.split('\n');
    const categoryIndex = lines.findIndex(line => 
      line.toLowerCase().includes(category.toLowerCase())
    );
    
    if (categoryIndex === -1) return [];
    
    const items: string[] = [];
    for (let i = categoryIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('-') || line.startsWith('•')) {
        items.push(line.substring(1).trim());
      } else if (line.length > 0 && !line.includes(':')) {
        break;
      }
    }
    
    return items;
  }

  private extractRating(text: string, category: string): number | null {
    const regex = new RegExp(`${category}[^\\d]*(\\d+)(?:/10)?`, 'i');
    const match = text.match(regex);
    return match ? parseInt(match[1]) : null;
  }

  private extractMultipleRatings(text: string): number[] {
    const matches = text.match(/\d+(?:\/10)?/g);
    return matches ? matches.map(m => parseInt(m)) : [];
  }

  private extractGenerationStatus(response: string): CulturalProfile['generationStatus'] {
    const text = response.toLowerCase();
    if (text.includes('first generation') || text.includes('immigrant')) return 'first';
    if (text.includes('second generation')) return 'second';
    if (text.includes('third generation')) return 'third';
    if (text.includes('multicultural')) return 'multicultural';
    return 'unknown';
  }

  private extractInvolvementLevel(response: string): 'high' | 'medium' | 'low' | 'conflicted' {
    const text = response.toLowerCase();
    if (text.includes('high involvement')) return 'high';
    if (text.includes('low involvement')) return 'low';
    if (text.includes('conflicted')) return 'conflicted';
    return 'medium';
  }

  private extractDecisionStyle(response: string): 'individual' | 'family' | 'community' {
    const text = response.toLowerCase();
    if (text.includes('family decision')) return 'family';
    if (text.includes('community decision')) return 'community';
    return 'individual';
  }

  private extractAdaptationType(response: string): CulturalAdaptation['adaptationType'] {
    const text = response.toLowerCase();
    if (text.includes('language')) return 'language';
    if (text.includes('metaphor')) return 'metaphor';
    if (text.includes('family')) return 'family_involvement';
    if (text.includes('spiritual')) return 'spiritual_integration';
    if (text.includes('communication')) return 'communication_style';
    return 'values';
  }

  private calculateAppropriatenessRating(content: CulturalContent, profile: CulturalProfile): number {
    let rating = content.appropriatenessRating;
    
    // Adjust based on cultural match
    if (content.culture.toLowerCase().includes(profile.primaryCulture.toLowerCase())) {
      rating += 1;
    }
    
    // Adjust based on religious/spiritual alignment
    if (content.contextualFactors.some(f => 
      profile.religiousSpiritual.beliefs.some(b => f.includes(b.toLowerCase()))
    )) {
      rating += 0.5;
    }
    
    return Math.min(rating, 10);
  }

  private calculateEffectivenessRating(content: CulturalContent, profile: CulturalProfile): number {
    let rating = content.effectiveness;
    
    // Adjust based on values alignment
    if (content.contextualFactors.includes('collectivism') && profile.culturalValues.collectivism > 6) {
      rating += 1;
    }
    
    return Math.min(rating, 10);
  }

  private isCulturalProfileComplete(profile: any): boolean {
    return profile && 
           profile.primaryCulture && 
           profile.primaryCulture !== 'Not specified' &&
           profile.familyDynamics &&
           profile.culturalValues;
  }

  private calculateCulturalRelevance(
    adaptations: CulturalAdaptation[],
    culturalContent: CulturalContent[],
    culturalProfile: CulturalProfile
  ): number {
    let relevance = 0.6; // Base relevance
    
    // Increase based on adaptations
    if (adaptations.length > 0) {
      relevance += Math.min(adaptations.length * 0.1, 0.2);
    }
    
    // Increase based on cultural content
    if (culturalContent.length > 0) {
      relevance += Math.min(culturalContent.length * 0.05, 0.15);
    }
    
    // Increase based on profile completeness
    if (this.isCulturalProfileComplete(culturalProfile)) {
      relevance += 0.05;
    }
    
    return Math.min(relevance, 1.0);
  }

  private calculateAdaptationConfidence(
    culturalProfile: CulturalProfile,
    culturalContent: CulturalContent[],
    adaptations: CulturalAdaptation[]
  ): number {
    let confidence = 0.5;
    
    // Increase based on cultural profile completeness
    if (this.isCulturalProfileComplete(culturalProfile)) {
      confidence += 0.2;
    }
    
    // Increase based on available cultural content
    confidence += Math.min(culturalContent.length * 0.05, 0.2);
    
    // Increase based on adaptation quality
    if (adaptations.length > 0) {
      const avgAppropriateness = adaptations.reduce((sum, a) => sum + a.appropriateness, 0) / adaptations.length;
      confidence += (avgAppropriateness / 10) * 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  private extractCulturalActionItems(adaptations: CulturalAdaptation[]): string[] {
    return adaptations.map(a => `Implement ${a.adaptationType}: ${a.rationale}`);
  }

  private needsCulturalFollowUp(profile: CulturalProfile, adaptations: CulturalAdaptation[]): boolean {
    return !this.isCulturalProfileComplete(profile) || 
           adaptations.some(a => a.warnings && a.warnings.length > 0);
  }

  private needsCulturalEscalation(analysis: any): boolean {
    return analysis.overallScore < 5 || 
           analysis.barriers.some((b: string) => b.includes('serious') || b.includes('harmful'));
  }
}