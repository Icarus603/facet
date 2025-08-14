/**
 * FACET Cultural Integration Agent
 * Specializes in culturally-responsive therapy and cross-cultural mental health
 */

import { BaseAgent } from './BaseAgent';
import { TherapeuticAgent, ProgressMetrics, CulturalContent } from './types';

export class CulturalIntegrationAgent extends BaseAgent {
  constructor() {
    const agentConfig: TherapeuticAgent = {
      id: 'cultural_integration_001',
      name: 'Dr. Maya Patel',
      type: 'cultural_integration',
      specialty: 'Cross-Cultural Psychology & Mental Health',
      description: 'Specializes in integrating cultural wisdom, traditions, and practices into therapeutic interventions while respecting diverse worldviews and healing approaches.',
      capabilities: [
        {
          name: 'Cultural Assessment',
          description: 'Comprehensive evaluation of cultural identity, acculturation stress, and cultural resources',
          cultural_contexts: ['all'],
          intervention_types: ['assessment', 'cultural_formulation'],
          evidence_base: ['Cultural Formulation (DSM-5)', 'Multicultural Counseling Theory']
        },
        {
          name: 'Traditional Healing Integration',
          description: 'Incorporates traditional healing practices with evidence-based therapy',
          cultural_contexts: ['Indigenous', 'Asian', 'African', 'Latino', 'Middle Eastern'],
          intervention_types: ['holistic_healing', 'spiritual_integration', 'community_healing'],
          evidence_base: ['Indigenous Psychology', 'Complementary Medicine Research']
        },
        {
          name: 'Acculturation Support',
          description: 'Supports individuals navigating cultural transitions and identity conflicts',
          cultural_contexts: ['Immigrant', 'Refugee', 'Second-generation', 'Multicultural'],
          intervention_types: ['identity_exploration', 'cultural_conflict_resolution', 'adaptation_support'],
          evidence_base: ['Acculturation Theory', 'Cultural Identity Development Models']
        }
      ],
      personality: {
        communication_style: 'empathetic',
        cultural_sensitivity_level: 'specialized',
        intervention_approach: 'collaborative',
        preferred_modalities: ['narrative_therapy', 'family_systems', 'community_based', 'holistic']
      },
      cultural_specializations: [
        'Latino/Hispanic', 'Asian/Pacific Islander', 'African/Caribbean', 'Indigenous/Native',
        'Middle Eastern/Arab', 'South Asian', 'Eastern European', 'Multiracial/Multiethnic'
      ],
      intervention_triggers: [
        'cultural_identity_confusion', 'discrimination_experiences', 'family_cultural_conflicts',
        'acculturation_stress', 'spiritual_disconnection', 'traditional_healing_interest',
        'intergenerational_trauma', 'language_barriers', 'cultural_stigma_around_mental_health'
      ],
      response_patterns: [
        {
          trigger_type: 'cultural',
          trigger_keywords: ['culture', 'family expectations', 'tradition', 'identity', 'discrimination', 'heritage'],
          response_template: 'Your cultural background and experiences are such an important part of who you are. I honor the wisdom of your traditions while also understanding the unique challenges you might be facing. Can you help me understand how your cultural identity intersects with what you\'re experiencing right now?',
          cultural_adaptations: [
            {
              culture: 'Latino/Hispanic',
              adaptations: {
                language_style: 'warm and familial',
                cultural_references: ['familia es todo', 'dichos/proverbs', 'compadrazgo system'],
                respect_protocols: ['acknowledge family hierarchy', 'include spiritual elements'],
                family_involvement: 'central',
                spiritual_considerations: ['Catholic traditions', 'indigenous spirituality', 'curanderismo']
              }
            },
            {
              culture: 'Asian/Pacific Islander',
              adaptations: {
                language_style: 'respectful and indirect',
                cultural_references: ['filial piety', 'harmony', 'face/dignity concepts'],
                respect_protocols: ['honor elders', 'avoid direct confrontation', 'save face'],
                family_involvement: 'hierarchical',
                spiritual_considerations: ['Buddhism', 'Confucianism', 'ancestor reverence']
              }
            }
          ],
          follow_up_actions: ['cultural_exploration', 'strength_identification', 'resource_mapping'],
          escalation_conditions: ['cultural_trauma_disclosure', 'severe_discrimination_impact']
        },
        {
          trigger_type: 'emotion',
          trigger_keywords: ['ashamed', 'torn between', 'don\'t belong', 'lost', 'confused about who I am'],
          response_template: 'It sounds like you\'re navigating complex feelings about identity and belonging. This is incredibly common and shows your strength in holding multiple parts of yourself. Your cultural heritage can be a source of resilience and wisdom. What aspects of your culture bring you comfort or strength?',
          cultural_adaptations: [],
          follow_up_actions: ['identity_mapping', 'cultural_strength_exploration', 'community_connection'],
          escalation_conditions: ['identity_crisis', 'cultural_rejection_trauma']
        }
      ],
      ethical_guidelines: [
        'Respect cultural worldviews without imposing Western therapeutic models',
        'Acknowledge historical trauma and systemic oppression',
        'Collaborate with traditional healers when appropriate',
        'Maintain cultural humility and ongoing cultural learning',
        'Address power dynamics and cultural privilege in therapeutic relationship'
      ],
      collaboration_preferences: [
        'family_therapy_agent', 'trauma_recovery_agent', 'community_liaisons', 'spiritual_care_providers'
      ],
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    super(agentConfig);
    this.loadExtendedCulturalContent();
  }

  async getSpecializedResponse(
    userInput: string,
    context: Record<string, any>
  ): Promise<string> {
    const culturalThemes = this.identifyCulturalThemes(userInput, context);
    const acculturationStress = this.assessAcculturationStress(userInput, context);
    const culturalResources = this.identifyCulturalResources(context);

    let response = '';

    // Address acculturation stress
    if (acculturationStress.level === 'high') {
      response += this.generateAcculturationSupport(acculturationStress, context);
    }

    // Integrate cultural strengths
    if (culturalResources.length > 0) {
      response += this.integrateCulturalStrengths(culturalResources, userInput);
    }

    // Address cultural conflicts
    if (culturalThemes.conflicts.length > 0) {
      response += this.addressCulturalConflicts(culturalThemes.conflicts, context);
    }

    // Provide culturally-informed coping strategies
    response += await this.generateCulturalCopingStrategies(
      userInput, 
      context.cultural_background,
      culturalThemes
    );

    return response;
  }

  validateIntervention(intervention: string, context: Record<string, any>): boolean {
    // Check for cultural appropriateness
    const inappropriateTerms = ['exotic', 'primitive', 'backwards', 'superstitious'];
    const hasInappropriateLanguage = inappropriateTerms.some(term => 
      intervention.toLowerCase().includes(term)
    );

    if (hasInappropriateLanguage) return false;

    // Ensure cultural sensitivity
    const culturallyAware = intervention.includes('cultural') || 
                           intervention.includes('tradition') ||
                           intervention.includes('heritage') ||
                           intervention.includes('family') ||
                           intervention.includes('community');

    return culturallyAware;
  }

  async getProgressMetrics(sessionId: string, userId: string): Promise<ProgressMetrics> {
    // In production, this would query actual progress data
    return {
      agent_id: this.agent.id,
      session_id: sessionId,
      user_id: userId,
      metrics: {
        engagement_score: 0.85,
        therapeutic_alliance: 0.88,
        goal_progress: 0.72,
        symptom_reduction: 0.65,
        cultural_resonance: 0.92, // High cultural resonance
        intervention_effectiveness: 0.78
      },
      qualitative_notes: [
        'Strong connection to cultural identity exploration',
        'Improved integration of cultural and personal values',
        'Increased use of cultural coping strategies',
        'Better family communication about mental health'
      ],
      recommended_adjustments: [
        'Continue family involvement in sessions',
        'Explore traditional healing practices',
        'Address remaining acculturation stress'
      ],
      timestamp: new Date().toISOString()
    };
  }

  private identifyCulturalThemes(userInput: string, context: Record<string, any>) {
    const identityThemes = ['who am I', 'don\'t fit', 'between worlds', 'identity', 'belong'];
    const familyThemes = ['family expectations', 'parents want', 'traditional vs modern', 'shame family'];
    const discriminationThemes = ['racism', 'prejudice', 'stereotypes', 'don\'t understand', 'judged'];
    const spiritualThemes = ['faith', 'spiritual', 'prayer', 'beliefs', 'religion'];

    return {
      identity: identityThemes.filter(theme => userInput.toLowerCase().includes(theme)),
      family: familyThemes.filter(theme => userInput.toLowerCase().includes(theme)),
      discrimination: discriminationThemes.filter(theme => userInput.toLowerCase().includes(theme)),
      spiritual: spiritualThemes.filter(theme => userInput.toLowerCase().includes(theme)),
      conflicts: this.identifyConflicts(userInput)
    };
  }

  private assessAcculturationStress(userInput: string, context: Record<string, any>) {
    const stressIndicators = [
      'torn between cultures', 'don\'t fit anywhere', 'lost my identity',
      'family doesn\'t understand', 'ashamed of background', 'can\'t be myself'
    ];

    const stressLevel = stressIndicators.filter(indicator => 
      userInput.toLowerCase().includes(indicator.toLowerCase())
    ).length;

    return {
      level: stressLevel >= 2 ? 'high' : stressLevel >= 1 ? 'moderate' : 'low',
      indicators: stressIndicators.filter(indicator => 
        userInput.toLowerCase().includes(indicator.toLowerCase())
      ),
      context_factors: context.immigration_generation || 'unknown'
    };
  }

  private identifyCulturalResources(context: Record<string, any>): string[] {
    const resources: string[] = [];
    
    if (context.family_support) resources.push('Strong family connections');
    if (context.community_involvement) resources.push('Community participation');
    if (context.cultural_practices) resources.push('Cultural traditions and practices');
    if (context.spiritual_beliefs) resources.push('Spiritual/religious foundation');
    if (context.multilingual) resources.push('Multilingual abilities');
    if (context.cultural_pride) resources.push('Cultural pride and identity');

    return resources;
  }

  private generateAcculturationSupport(acculturationStress: any, context: Record<string, any>): string {
    let support = `I can see you're navigating the complex experience of living between cultures. This is incredibly common and speaks to your resilience in holding multiple identities. `;

    if (acculturationStress.level === 'high') {
      support += `The stress you're feeling about fitting in while staying true to your heritage is very real. Many people in your situation find it helpful to think of themselves as "cultural bridges" - you have the unique gift of understanding multiple worlds. `;
    }

    support += `Your cultural background isn't something to leave behind; it's a source of strength and wisdom that can enrich your healing journey. `;

    return support;
  }

  private integrateCulturalStrengths(resources: string[], userInput: string): string {
    let integration = `\n\nLooking at your cultural resources, I see real strengths: ${resources.join(', ')}. `;

    if (resources.includes('Strong family connections')) {
      integration += `Your family bonds can be a powerful source of support and healing. `;
    }

    if (resources.includes('Spiritual/religious foundation')) {
      integration += `Your spiritual beliefs can provide comfort, meaning, and guidance during difficult times. `;
    }

    integration += `How might we draw on these cultural strengths to support you through this challenge? `;

    return integration;
  }

  private addressCulturalConflicts(conflicts: string[], context: Record<string, any>): string {
    let response = `\n\nI hear that you're experiencing some tension between different cultural expectations or values. `;

    response += `This is a common experience for people navigating multiple cultural worlds. Rather than seeing this as something to resolve by choosing one side, we can explore how to honor multiple aspects of your identity. `;

    response += `Sometimes the path forward involves creating your own unique blend that feels authentic to you. `;

    return response;
  }

  private async generateCulturalCopingStrategies(
    userInput: string,
    culturalBackground: string,
    themes: any
  ): Promise<string> {
    let strategies = `\n\nBased on your cultural background, here are some approaches that might resonate: `;

    if (culturalBackground === 'Latino/Hispanic') {
      strategies += `\n• **Plática familiar**: Consider having honest conversations with trusted family members about your experiences
• **Cultural dichos**: Draw wisdom from traditional sayings that offer guidance
• **Community support**: Connect with others who share similar experiences in your community
• **Spiritual practices**: If meaningful to you, prayer, meditation, or connecting with your spiritual traditions`;
    } else if (culturalBackground === 'Asian/Pacific Islander') {
      strategies += `\n• **Harmony seeking**: Focus on finding balance between different aspects of your life
• **Ancestral wisdom**: Reflect on the strength and resilience of your ancestors
• **Mindful practices**: Meditation, tai chi, or other contemplative practices from your tradition
• **Community respect**: Consider how your healing can honor your community while being true to yourself`;
    } else if (culturalBackground === 'African/Caribbean') {
      strategies += `\n• **Community strength**: Draw on the collective wisdom and support of your community
• **Ancestral connection**: Honor the resilience passed down through generations
• **Storytelling tradition**: Use narrative and sharing your story as a healing practice
• **Spiritual grounding**: Connect with spiritual practices that feel authentic to your heritage`;
    } else {
      strategies += `\n• **Cultural exploration**: Take time to explore and reclaim aspects of your heritage that bring you strength
• **Community connection**: Seek out others who share similar cultural experiences
• **Traditional practices**: Consider incorporating cultural practices that promote wellbeing
• **Identity integration**: Work on blending different aspects of your identity in ways that feel authentic`;
    }

    strategies += `\n\nWhich of these approaches feels most meaningful to you right now?`;

    return strategies;
  }

  private identifyConflicts(userInput: string): string[] {
    const conflictPatterns = [
      'my family expects but I want',
      'traditional vs modern',
      'torn between',
      'my culture says but I feel',
      'family honor vs personal needs'
    ];

    return conflictPatterns.filter(pattern => 
      userInput.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private async loadExtendedCulturalContent(): Promise<void> {
    // Extended cultural content library
    const extendedContent = [
      // Latino/Hispanic Content
      {
        id: 'latino_resilience_1',
        culture: 'Latino/Hispanic',
        content_type: 'proverb' as const,
        title: 'No hay mal que por bien no venga',
        content: 'There is no bad from which good does not come',
        therapeutic_applications: ['reframing', 'hope_cultivation', 'meaning_making'],
        context_notes: 'Used to find positive meaning in difficult experiences',
        source: 'Traditional Latino Wisdom',
        verified_by: 'Cultural Consultant',
        tags: ['resilience', 'hope', 'reframing']
      },
      // Asian Cultural Content
      {
        id: 'asian_balance_1',
        culture: 'Asian/Pacific Islander',
        content_type: 'practice' as const,
        title: 'Middle Way Philosophy',
        content: 'Finding balance between extremes, avoiding excess in any direction',
        therapeutic_applications: ['emotional_regulation', 'lifestyle_balance', 'conflict_resolution'],
        context_notes: 'Buddhist concept applicable to mental health and life decisions',
        source: 'Buddhist Psychology',
        verified_by: 'Cultural Consultant',
        tags: ['balance', 'moderation', 'wisdom']
      },
      // African/Caribbean Content
      {
        id: 'african_community_1',
        culture: 'African/Caribbean',
        content_type: 'value' as const,
        title: 'Ubuntu Philosophy',
        content: 'I am because we are - interconnectedness of all people',
        therapeutic_applications: ['community_healing', 'collective_support', 'identity_affirmation'],
        context_notes: 'Emphasizes community support and collective wellbeing',
        source: 'African Philosophy',
        verified_by: 'Cultural Consultant',
        tags: ['community', 'interconnection', 'support']
      }
    ];

    // Add to cultural content map
    extendedContent.forEach(content => {
      const existing = this.culturalContent.get(content.culture) || [];
      existing.push(content);
      this.culturalContent.set(content.culture, existing);
    });
  }
}