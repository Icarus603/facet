/**
 * FACET Family Therapy Agent
 * Specializes in family systems therapy, relationship dynamics, and intergenerational healing
 */

import { BaseAgent } from './BaseAgent';
import { TherapeuticAgent, ProgressMetrics } from './types';

interface FamilyDynamic {
  pattern_type: 'communication' | 'boundary' | 'role' | 'conflict' | 'cultural';
  description: string;
  family_members_involved: string[];
  cultural_factors: string[];
  intervention_suggestions: string[];
}

interface RelationshipPattern {
  relationship_type: 'parent_child' | 'siblings' | 'partners' | 'extended_family';
  healthy_aspects: string[];
  challenging_aspects: string[];
  cultural_considerations: string[];
}

export class FamilyTherapyAgent extends BaseAgent {
  constructor() {
    const agentConfig: TherapeuticAgent = {
      id: 'family_therapy_001',
      name: 'Dr. Maria Gonzalez-Kim',
      type: 'family_therapy',
      specialty: 'Family Systems Therapy & Multicultural Family Dynamics',
      description: 'Specializes in family systems work, relationship dynamics, intergenerational patterns, and culturally-responsive family therapy approaches.',
      capabilities: [
        {
          name: 'Family Systems Analysis',
          description: 'Comprehensive assessment of family patterns, roles, and dynamics',
          cultural_contexts: ['all'],
          intervention_types: ['genogram_analysis', 'family_mapping', 'pattern_identification'],
          evidence_base: ['Bowen Family Systems', 'Structural Family Therapy', 'Strategic Family Therapy']
        },
        {
          name: 'Intergenerational Trauma Healing',
          description: 'Addresses trauma patterns passed down through family generations',
          cultural_contexts: ['all'],
          intervention_types: ['trauma_informed_family_work', 'ancestral_healing', 'legacy_work'],
          evidence_base: ['Intergenerational Trauma Research', 'Family Trauma Therapy', 'Cultural Trauma Studies']
        },
        {
          name: 'Cultural Family Integration',
          description: 'Helps families navigate cultural differences and preserve cultural heritage',
          cultural_contexts: ['multicultural', 'immigrant', 'blended_cultural'],
          intervention_types: ['cultural_bridging', 'heritage_preservation', 'acculturation_support'],
          evidence_base: ['Multicultural Family Therapy', 'Cultural Family Systems', 'Immigration Family Studies']
        }
      ],
      personality: {
        communication_style: 'collaborative',
        cultural_sensitivity_level: 'specialized',
        intervention_approach: 'balanced',
        preferred_modalities: ['family_systems', 'narrative_therapy', 'structural', 'cultural_adaptation']
      },
      cultural_specializations: [
        'Latino/Hispanic family dynamics', 'Asian family hierarchies', 'African/Caribbean family structures',
        'Indigenous family systems', 'Immigrant family adaptation', 'Intergenerational cultural transmission'
      ],
      intervention_triggers: [
        'family_conflict', 'intergenerational_tension', 'cultural_identity_conflicts',
        'parent_child_issues', 'sibling_rivalry', 'family_communication_problems',
        'boundary_violations', 'family_trauma', 'divorce_separation_impact',
        'blended_family_challenges', 'elder_care_stress', 'family_mental_health_stigma'
      ],
      response_patterns: [
        {
          trigger_type: 'cultural',
          trigger_keywords: [
            'family expects', 'parents don\'t understand', 'cultural differences', 'traditional vs modern',
            'family honor', 'bringing shame', 'family pressure', 'generational conflict'
          ],
          response_template: 'Family dynamics can be especially complex when cultural values and expectations are involved. It sounds like you\'re navigating tensions between different generational perspectives or cultural approaches. This is incredibly common in families, especially those bridging different cultures or generations. Can you help me understand more about your family\'s cultural background and how these expectations are affecting your relationships?',
          cultural_adaptations: [
            {
              culture: 'Latino/Hispanic',
              adaptations: {
                language_style: 'warm and family-centered',
                cultural_references: ['familismo', 'respeto', 'confianza'],
                respect_protocols: ['honor family hierarchy', 'acknowledge cultural values'],
                family_involvement: 'central and essential',
                spiritual_considerations: ['religious traditions', 'family spirituality']
              }
            },
            {
              culture: 'Asian/Pacific Islander',
              adaptations: {
                language_style: 'respectful and harmony-focused',
                cultural_references: ['filial piety', 'family face', 'harmony'],
                respect_protocols: ['respect elder authority', 'maintain family honor'],
                family_involvement: 'hierarchical and structured',
                spiritual_considerations: ['ancestor respect', 'family traditions']
              }
            }
          ],
          follow_up_actions: ['family_assessment', 'cultural_exploration', 'genogram_creation'],
          escalation_conditions: ['family_violence', 'severe_family_dysfunction']
        },
        {
          trigger_type: 'emotion',
          trigger_keywords: [
            'family drama', 'toxic family', 'family dysfunction', 'can\'t talk to family',
            'family stress', 'family problems', 'family conflict'
          ],
          response_template: 'Family relationships can be some of the most challenging and rewarding in our lives. When families are struggling, it affects everyone involved. I hear that your family dynamics are causing you stress. Every family has its own patterns and ways of relating - some helpful, some not so much. Let\'s explore what\'s happening in your family system and how we might create some positive changes.',
          cultural_adaptations: [],
          follow_up_actions: ['family_pattern_analysis', 'communication_assessment', 'boundary_exploration'],
          escalation_conditions: ['abuse_disclosure', 'safety_concerns']
        }
      ],
      ethical_guidelines: [
        'Maintain neutrality while supporting individual client needs',
        'Respect family cultural values while addressing harmful patterns',
        'Consider safety of all family members, especially vulnerable individuals',
        'Navigate confidentiality carefully in family contexts',
        'Address power dynamics and cultural hierarchies sensitively'
      ],
      collaboration_preferences: [
        'cultural_integration_agent', 'trauma_recovery_agent', 'couples_therapy_specialists',
        'child_family_services', 'cultural_liaisons'
      ],
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    super(agentConfig);
  }

  async getSpecializedResponse(
    userInput: string,
    context: Record<string, any>
  ): Promise<string> {
    const familyDynamics = this.analyzeFamilyDynamics(userInput, context);
    const culturalFactors = this.identifyCulturalFactors(userInput, context);
    const relationshipPatterns = this.assessRelationshipPatterns(userInput, context);

    let response = '';

    // Address immediate family concerns
    if (familyDynamics.high_conflict) {
      response += this.addressFamilyConflict(userInput, context, familyDynamics);
    } else {
      response += this.provideFamilySystemsGuidance(userInput, context);
    }

    // Address cultural family dynamics
    if (culturalFactors.length > 0) {
      response += this.addressCulturalFamilyDynamics(culturalFactors, context);
    }

    // Provide family intervention strategies
    response += this.provideFamilyInterventions(relationshipPatterns, context);

    return response;
  }

  validateIntervention(intervention: string, context: Record<string, any>): boolean {
    // Check for family systems elements
    const familyElements = [
      'family', 'relationship', 'communication', 'boundary', 'pattern',
      'generation', 'system', 'dynamic', 'connection', 'support'
    ];

    const hasFamilyElements = familyElements.some(element => 
      intervention.toLowerCase().includes(element)
    );

    // Avoid family-blaming language
    const blamingTerms = [
      'toxic family', 'bad family', 'dysfunctional family', 'crazy family',
      'cut them off', 'they\'re the problem', 'family is hopeless'
    ];

    const hasBlamingTerms = blamingTerms.some(term => 
      intervention.toLowerCase().includes(term)
    );

    return hasFamilyElements && !hasBlamingTerms;
  }

  async getProgressMetrics(sessionId: string, userId: string): Promise<ProgressMetrics> {
    return {
      agent_id: this.agent.id,
      session_id: sessionId,
      user_id: userId,
      metrics: {
        engagement_score: 0.80,
        therapeutic_alliance: 0.83,
        goal_progress: 0.74,
        symptom_reduction: 0.67,
        cultural_resonance: 0.88,
        intervention_effectiveness: 0.79
      },
      qualitative_notes: [
        'Improved family communication patterns',
        'Better understanding of cultural family dynamics',
        'Enhanced boundary-setting skills',
        'Reduced family-related stress and conflict'
      ],
      recommended_adjustments: [
        'Consider family session inclusion',
        'Continue cultural heritage exploration',
        'Practice new communication strategies',
        'Address remaining intergenerational patterns'
      ],
      timestamp: new Date().toISOString()
    };
  }

  private analyzeFamilyDynamics(userInput: string, context: Record<string, any>) {
    const conflictIndicators = [
      'family fight', 'family argument', 'family drama', 'family conflict',
      'can\'t talk to', 'family stress', 'family problems'
    ];

    const boundaryIndicators = [
      'boundaries', 'space', 'independence', 'privacy', 'overinvolved',
      'enmeshed', 'controlling', 'suffocating'
    ];

    const communicationIndicators = [
      'don\'t listen', 'won\'t hear me', 'misunderstand', 'communication',
      'talk past each other', 'not heard'
    ];

    return {
      high_conflict: conflictIndicators.some(indicator => 
        userInput.toLowerCase().includes(indicator)),
      boundary_issues: boundaryIndicators.some(indicator => 
        userInput.toLowerCase().includes(indicator)),
      communication_problems: communicationIndicators.some(indicator => 
        userInput.toLowerCase().includes(indicator))
    };
  }

  private identifyCulturalFactors(userInput: string, context: Record<string, any>): string[] {
    const culturalFactors = [];

    if (userInput.toLowerCase().includes('traditional') || 
        userInput.toLowerCase().includes('old country') ||
        userInput.toLowerCase().includes('cultural')) {
      culturalFactors.push('traditional_vs_modern_values');
    }

    if (userInput.toLowerCase().includes('generation') ||
        userInput.toLowerCase().includes('parents don\'t understand')) {
      culturalFactors.push('generational_differences');
    }

    if (userInput.toLowerCase().includes('honor') ||
        userInput.toLowerCase().includes('shame') ||
        userInput.toLowerCase().includes('reputation')) {
      culturalFactors.push('family_honor_concerns');
    }

    if (userInput.toLowerCase().includes('language') ||
        userInput.toLowerCase().includes('english')) {
      culturalFactors.push('language_barriers');
    }

    return culturalFactors;
  }

  private assessRelationshipPatterns(userInput: string, context: Record<string, any>) {
    const parentChildIssues = [
      'parents', 'mom', 'dad', 'mother', 'father', 'parent'
    ].some(term => userInput.toLowerCase().includes(term));

    const siblingIssues = [
      'sister', 'brother', 'sibling'
    ].some(term => userInput.toLowerCase().includes(term));

    const extendedFamilyIssues = [
      'grandparents', 'aunts', 'uncles', 'cousins', 'family gatherings'
    ].some(term => userInput.toLowerCase().includes(term));

    return {
      parent_child: parentChildIssues,
      siblings: siblingIssues,
      extended_family: extendedFamilyIssues
    };
  }

  private addressFamilyConflict(
    userInput: string,
    context: Record<string, any>,
    dynamics: any
  ): string {
    let response = `Family conflicts can be incredibly painful because these are the people who matter most to us. When families are in distress, everyone feels it. `;

    response += `\n\n**Understanding Family Systems:**
Family conflicts are rarely about just one person or one issue. They're usually about patterns that have developed over time - ways of communicating, responding to stress, or handling differences that may have worked once but aren't working now.

`;

    if (dynamics.communication_problems) {
      response += `**Communication Patterns:**
• **Listen first** - Try to understand before being understood
• **Use "I" statements** - "I feel..." instead of "You always..."
• **Take breaks** - When emotions are high, pause and return later
• **Find common ground** - What do you all care about?

`;
    }

    if (dynamics.boundary_issues) {
      response += `**Healthy Boundaries:**
• **Personal space** - You can love family and still need space
• **Different opinions** - Family members can disagree and still be family
• **Your own life** - You can honor family while living your own life
• **Respectful limits** - "I love you, and I need you to respect my decision"

`;
    }

    response += `Remember: You can only change your own behavior in the family system, but when one person changes, it often creates space for others to change too.

`;

    return response;
  }

  private provideFamilySystemsGuidance(userInput: string, context: Record<string, any>): string {
    let response = `Families are complex systems where everyone affects everyone else. Understanding these patterns can help us navigate relationships more skillfully. `;

    response += `\n\n**Family Systems Perspective:**
• **Patterns repeat** - Families often have ways of handling things that get passed down
• **Everyone has a role** - Sometimes we get stuck in family roles that don't fit anymore
• **Change is possible** - When one person changes, the whole system can shift
• **Culture matters** - Family patterns are deeply influenced by cultural background

`;

    response += `**Reflecting on Your Family:**
• What patterns do you notice in how your family handles conflict?
• What role do you tend to play in family dynamics?
• How has your cultural background shaped family expectations?
• What would you like to be different in your family relationships?

`;

    return response;
  }

  private addressCulturalFamilyDynamics(factors: string[], context: Record<string, any>): string {
    let response = `\n\n**Cultural Family Dynamics:**\n`;

    if (factors.includes('traditional_vs_modern_values')) {
      response += `**Bridging Traditional and Modern Values:**
• Honor the wisdom in traditional values while allowing for personal growth
• Find ways to respect cultural heritage while living authentically
• Communicate with family about how you can honor both tradition and your individual path
• Remember that adaptation can be a form of honoring your culture

`;
    }

    if (factors.includes('generational_differences')) {
      response += `**Generational Understanding:**
• Different generations faced different challenges and developed different coping strategies
• What looks like stubbornness might be survival strategies that worked for them
• Bridge-building takes patience and understanding from all sides
• Your generation's wisdom is as valid as previous generations'

`;
    }

    if (factors.includes('family_honor_concerns')) {
      response += `**Family Honor and Individual Growth:**
• True honor comes from living with integrity, not from meeting every expectation
• Your mental health and wellbeing contribute to family strength
• Sometimes the most honoring thing is to break cycles that cause harm
• Healthy boundaries can actually protect family relationships

`;
    }

    return response;
  }

  private provideFamilyInterventions(patterns: any, context: Record<string, any>): string {
    let response = `\n\n**Family Relationship Strategies:**\n`;

    if (patterns.parent_child) {
      response += `**Parent-Child Relationships:**
• **Adult relationship building** - Moving from child-parent to adult-adult relating
• **Appreciate their perspective** - Understand their generational experiences
• **Set loving boundaries** - "I love you and I need to make my own decisions"
• **Find new ways to connect** - Discover what you enjoy together now

`;
    }

    if (patterns.siblings) {
      response += `**Sibling Dynamics:**
• **Move beyond childhood roles** - You're not the same people you were as kids
• **Address old hurts** - Acknowledge past conflicts and work toward healing
• **Create new traditions** - Build adult relationships based on who you are now
• **Support each other's growth** - Celebrate each other's individual journeys

`;
    }

    response += `**Family Healing Practices:**
• **Family meetings** - Regular check-ins about how everyone is doing
• **Storytelling** - Share family stories and cultural heritage
• **Gratitude practices** - Express appreciation for each other regularly
• **Conflict resolution** - Develop healthy ways to work through disagreements
• **Cultural celebrations** - Honor your heritage together

`;

    response += `Remember: Healthy families aren't families without problems - they're families that face problems together with love, respect, and commitment to growth.`;

    return response;
  }
}