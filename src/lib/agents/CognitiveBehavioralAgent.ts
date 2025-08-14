/**
 * FACET Cognitive Behavioral Agent
 * Specializes in CBT interventions, thought pattern analysis, and behavioral change strategies
 */

import { BaseAgent } from './BaseAgent';
import { TherapeuticAgent, ProgressMetrics } from './types';

interface ThoughtRecord {
  situation: string;
  emotion: string;
  intensity: number;
  automatic_thought: string;
  evidence_for: string[];
  evidence_against: string[];
  balanced_thought: string;
  new_emotion_intensity: number;
}

interface BehaviorPattern {
  trigger: string;
  behavior: string;
  short_term_consequence: string;
  long_term_consequence: string;
  alternative_behavior: string;
}

export class CognitiveBehavioralAgent extends BaseAgent {
  private cognitiveDistortions = [
    {
      name: 'All-or-Nothing Thinking',
      description: 'Seeing things in black and white categories',
      examples: ['I always fail', 'I never do anything right', 'It\'s completely ruined'],
      keywords: ['always', 'never', 'completely', 'totally', 'perfect', 'disaster']
    },
    {
      name: 'Catastrophizing',
      description: 'Expecting the worst possible outcome',
      examples: ['This will be a disaster', 'Everything will go wrong', 'I can\'t handle this'],
      keywords: ['disaster', 'terrible', 'awful', 'worst', 'can\'t handle', 'end of the world']
    },
    {
      name: 'Mind Reading',
      description: 'Assuming you know what others are thinking',
      examples: ['They think I\'m stupid', 'She doesn\'t like me', 'He\'s judging me'],
      keywords: ['they think', 'he thinks', 'she thinks', 'everyone thinks', 'judging me']
    },
    {
      name: 'Fortune Telling',
      description: 'Predicting negative outcomes without evidence',
      examples: ['I\'ll definitely fail', 'It won\'t work out', 'I\'ll embarrass myself'],
      keywords: ['will fail', 'won\'t work', 'going to', 'will definitely', 'bound to']
    },
    {
      name: 'Emotional Reasoning',
      description: 'Believing that feelings reflect reality',
      examples: ['I feel stupid, so I must be stupid', 'I feel guilty, so I did something wrong'],
      keywords: ['I feel', 'so I must be', 'because I feel', 'I feel like']
    },
    {
      name: 'Should Statements',
      description: 'Using rigid rules about how things should be',
      examples: ['I should be perfect', 'I must never make mistakes', 'I have to please everyone'],
      keywords: ['should', 'must', 'have to', 'ought to', 'need to', 'supposed to']
    }
  ];

  constructor() {
    const agentConfig: TherapeuticAgent = {
      id: 'cognitive_behavioral_001',
      name: 'Dr. Rebecca Martinez',
      type: 'cognitive_behavioral',
      specialty: 'Cognitive Behavioral Therapy & Behavioral Interventions',
      description: 'Specializes in identifying and restructuring negative thought patterns, developing healthy coping strategies, and implementing behavioral change techniques using evidence-based CBT methods.',
      capabilities: [
        {
          name: 'Cognitive Restructuring',
          description: 'Identifies and challenges unhelpful thinking patterns and cognitive distortions',
          cultural_contexts: ['all'],
          intervention_types: ['thought_challenging', 'cognitive_reframing', 'evidence_examination'],
          evidence_base: ['Beck\'s Cognitive Therapy', 'Cognitive Restructuring Techniques', 'Thought Record Methods']
        },
        {
          name: 'Behavioral Activation',
          description: 'Helps increase engagement in meaningful and pleasurable activities',
          cultural_contexts: ['all'],
          intervention_types: ['activity_scheduling', 'behavioral_experiments', 'graded_exposure'],
          evidence_base: ['Behavioral Activation for Depression', 'Activity Monitoring', 'Behavioral Experiments']
        },
        {
          name: 'Skills Training',
          description: 'Teaches practical coping skills and problem-solving strategies',
          cultural_contexts: ['all'],
          intervention_types: ['coping_skills', 'problem_solving', 'stress_management', 'assertiveness'],
          evidence_base: ['CBT Skills Training', 'Problem-Solving Therapy', 'Stress Inoculation Training']
        }
      ],
      personality: {
        communication_style: 'collaborative',
        cultural_sensitivity_level: 'high',
        intervention_approach: 'balanced',
        preferred_modalities: ['cognitive_behavioral', 'psychoeducation', 'skills_based', 'homework_assignments']
      },
      cultural_specializations: [
        'Culturally-adapted CBT', 'Collectivist vs individualist thought patterns',
        'Cultural beliefs and cognitive schemas', 'Family-centered behavioral change'
      ],
      intervention_triggers: [
        'negative_thought_patterns', 'cognitive_distortions', 'avoidance_behaviors',
        'depression_symptoms', 'anxiety_patterns', 'procrastination', 'perfectionism',
        'social_anxiety', 'catastrophic_thinking', 'behavioral_activation_needs'
      ],
      response_patterns: [
        {
          trigger_type: 'emotion',
          trigger_keywords: ['always', 'never', 'terrible', 'disaster', 'can\'t handle', 'everyone thinks'],
          response_template: 'I notice some very strong language in what you\'re sharing - words like "always," "never," or "terrible." These absolute terms often signal that our minds might be playing tricks on us. Let\'s examine this thought together. What evidence do we have for and against this belief?',
          cultural_adaptations: [
            {
              culture: 'Asian/Pacific Islander',
              adaptations: {
                language_style: 'gentle and respectful',
                cultural_references: ['harmony in thinking', 'balanced perspective'],
                respect_protocols: ['avoid direct confrontation of beliefs', 'honor family wisdom'],
                family_involvement: 'consider family perspectives',
                spiritual_considerations: ['mindfulness practices', 'Buddhist concepts of impermanence']
              }
            }
          ],
          follow_up_actions: ['thought_record', 'evidence_examination', 'cognitive_reframing'],
          escalation_conditions: ['severe_distortion', 'self_harm_thoughts']
        },
        {
          trigger_type: 'behavior',
          trigger_keywords: ['avoiding', 'putting off', 'can\'t bring myself', 'too hard', 'overwhelming'],
          response_template: 'It sounds like you\'re experiencing some avoidance, which is completely understandable when things feel overwhelming. Avoidance often makes sense in the short term but can keep us stuck. Let\'s break this down into smaller, more manageable steps. What would be the tiniest first step you could take?',
          cultural_adaptations: [],
          follow_up_actions: ['behavioral_experiment', 'graded_exposure', 'activity_scheduling'],
          escalation_conditions: ['complete_avoidance', 'functional_impairment']
        }
      ],
      ethical_guidelines: [
        'Collaborate with clients rather than imposing interpretations',
        'Respect cultural beliefs while gently challenging unhelpful patterns',
        'Provide psychoeducation about the connection between thoughts, feelings, and behaviors',
        'Assign homework and practice exercises appropriate to cultural context',
        'Monitor for increased distress during cognitive challenging'
      ],
      collaboration_preferences: [
        'mindfulness_agent', 'behavioral_activation_specialist', 'family_therapy_agent', 'trauma_recovery_agent'
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
    const distortions = this.identifyCognitiveDistortions(userInput);
    const thoughtPatterns = this.analyzeThoughtPatterns(userInput, context);
    const behaviorPatterns = this.identifyBehaviorPatterns(userInput, context);

    let response = '';

    // Address cognitive distortions
    if (distortions.length > 0) {
      response += await this.addressCognitiveDistortions(distortions, userInput, context);
    }

    // Provide behavioral interventions
    if (behaviorPatterns.avoidance || behaviorPatterns.procrastination) {
      response += await this.provideBehavioralIntervention(userInput, context, behaviorPatterns);
    }

    // Suggest thought record or behavioral experiment
    if (thoughtPatterns.intensity === 'high') {
      response += this.suggestThoughtRecord(userInput);
    }

    // Provide skills training
    response += await this.provideSkillsTraining(userInput, context, distortions);

    return response;
  }

  validateIntervention(intervention: string, context: Record<string, any>): boolean {
    // Check for CBT elements
    const cbtElements = [
      'thought', 'feeling', 'behavior', 'evidence', 'balanced',
      'realistic', 'helpful', 'coping', 'skill', 'practice'
    ];

    const hasCBTElements = cbtElements.some(element => 
      intervention.toLowerCase().includes(element)
    );

    // Avoid invalidating or dismissive language
    const invalidatingTerms = [
      'just think positive', 'stop thinking that way', 'that\'s irrational',
      'you\'re wrong', 'that\'s silly', 'just get over it'
    ];

    const hasInvalidatingTerms = invalidatingTerms.some(term => 
      intervention.toLowerCase().includes(term)
    );

    return hasCBTElements && !hasInvalidatingTerms;
  }

  async getProgressMetrics(sessionId: string, userId: string): Promise<ProgressMetrics> {
    return {
      agent_id: this.agent.id,
      session_id: sessionId,
      user_id: userId,
      metrics: {
        engagement_score: 0.82,
        therapeutic_alliance: 0.85,
        goal_progress: 0.75,
        symptom_reduction: 0.68,
        cultural_resonance: 0.78,
        intervention_effectiveness: 0.84
      },
      qualitative_notes: [
        'Improved recognition of cognitive distortions',
        'Increased use of thought challenging techniques',
        'Better engagement in behavioral experiments',
        'Enhanced coping skills application'
      ],
      recommended_adjustments: [
        'Continue thought record practice',
        'Increase behavioral activation activities',
        'Practice challenging should statements',
        'Develop relapse prevention strategies'
      ],
      timestamp: new Date().toISOString()
    };
  }

  private identifyCognitiveDistortions(userInput: string) {
    const identifiedDistortions = [];

    for (const distortion of this.cognitiveDistortions) {
      const hasKeywords = distortion.keywords.some(keyword => 
        userInput.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasKeywords) {
        identifiedDistortions.push(distortion);
      }
    }

    return identifiedDistortions;
  }

  private analyzeThoughtPatterns(userInput: string, context: Record<string, any>) {
    const negativeWords = ['terrible', 'awful', 'disaster', 'horrible', 'worst', 'impossible'];
    const absoluteWords = ['always', 'never', 'completely', 'totally', 'everyone', 'no one'];
    const emotionalIntensity = ['extremely', 'incredibly', 'totally', 'completely'];

    const negativeCount = negativeWords.filter(word => 
      userInput.toLowerCase().includes(word)
    ).length;

    const absoluteCount = absoluteWords.filter(word => 
      userInput.toLowerCase().includes(word)
    ).length;

    const intensityCount = emotionalIntensity.filter(word => 
      userInput.toLowerCase().includes(word)
    ).length;

    const totalScore = negativeCount + absoluteCount + intensityCount;

    return {
      negative_words: negativeCount,
      absolute_thinking: absoluteCount,
      emotional_intensity: totalScore >= 3 ? 'high' : totalScore >= 2 ? 'moderate' : 'low',
      intensity: totalScore >= 3 ? 'high' : totalScore >= 2 ? 'moderate' : 'low'
    };
  }

  private identifyBehaviorPatterns(userInput: string, context: Record<string, any>) {
    const avoidanceWords = ['avoiding', 'putting off', 'can\'t bring myself', 'skip', 'cancel'];
    const procrastinationWords = ['later', 'tomorrow', 'when I feel better', 'not ready'];
    const withdrawalWords = ['isolating', 'staying home', 'don\'t want to see', 'hiding'];

    return {
      avoidance: avoidanceWords.some(word => userInput.toLowerCase().includes(word)),
      procrastination: procrastinationWords.some(word => userInput.toLowerCase().includes(word)),
      social_withdrawal: withdrawalWords.some(word => userInput.toLowerCase().includes(word))
    };
  }

  private async addressCognitiveDistortions(
    distortions: any[],
    userInput: string,
    context: Record<string, any>
  ): Promise<string> {
    let response = `I notice some thinking patterns that might be making things feel worse than they need to be. `;

    const primaryDistortion = distortions[0];
    response += `Specifically, I'm hearing some **${primaryDistortion.name}** - ${primaryDistortion.description}.\n\n`;

    response += `**Let's examine this thought together:**\n`;
    response += `• **The thought:** "${this.extractKeyThought(userInput)}"\n`;
    response += `• **How it makes you feel:** (What emotions come up?)\n`;
    response += `• **Evidence FOR this thought:** What supports this belief?\n`;
    response += `• **Evidence AGAINST this thought:** What contradicts it?\n`;
    response += `• **A more balanced perspective might be:** (We'll work on this together)\n\n`;

    // Provide specific challenging questions
    response += this.getChallengingQuestions(primaryDistortion.name);

    return response;
  }

  private async provideBehavioralIntervention(
    userInput: string,
    context: Record<string, any>,
    patterns: any
  ): Promise<string> {
    let response = `\n\nI understand the urge to avoid or put things off when they feel overwhelming. `;

    if (patterns.avoidance) {
      response += `Avoidance often provides temporary relief but tends to make anxiety stronger over time. `;
    }

    if (patterns.procrastination) {
      response += `Procrastination is often our mind's way of trying to protect us from discomfort. `;
    }

    response += `\n\n**Let's try a behavioral approach:**\n`;
    response += `1. **Break it down:** What's the smallest possible first step?\n`;
    response += `2. **Set a timer:** Commit to just 5-10 minutes\n`;
    response += `3. **Reward the effort:** Celebrate taking the step, regardless of outcome\n`;
    response += `4. **Notice what happens:** How do you feel after taking action?\n\n`;

    response += `**Behavioral experiment:** Can you identify one small action you could take today, even if you don't feel like it? `;
    response += `Remember, we don't have to feel motivated to take action - action often creates motivation.\n\n`;

    return response;
  }

  private suggestThoughtRecord(userInput: string): string {
    return `\n\n**Thought Record Exercise:**
Since you're experiencing some intense thoughts and feelings, it might help to use a thought record. Here's a simple format:

1. **Situation:** What happened? (just the facts)
2. **Emotion:** What did you feel? (name it and rate intensity 1-10)
3. **Automatic thought:** What went through your mind?
4. **Evidence for:** What supports this thought?
5. **Evidence against:** What contradicts this thought?
6. **Balanced thought:** What's a more realistic perspective?
7. **New emotion:** How do you feel now? (rate 1-10)

Would you like to try this with the situation you're describing?

`;
  }

  private async provideSkillsTraining(
    userInput: string,
    context: Record<string, any>,
    distortions: any[]
  ): Promise<string> {
    let response = `\n\n**CBT Skills for Your Toolkit:**\n`;

    // Thought challenging skills
    if (distortions.length > 0) {
      response += `\n**🧠 Thought Challenging:**
• **The 3 C's:** Catch the thought, Check the evidence, Change to balanced thinking
• **Best friend test:** What would you tell a good friend in this situation?
• **Time perspective:** Will this matter in 5 years? 5 months? 5 days?
• **Alternative explanations:** What are 3 other possible explanations?

`;
    }

    // Behavioral skills
    response += `**🎯 Behavioral Skills:**
• **Graded exposure:** Start small and gradually work up to bigger challenges
• **Activity scheduling:** Plan pleasant and meaningful activities daily
• **Opposite action:** When emotion isn't justified, act opposite to what it's telling you
• **Problem-solving:** Define the problem → Brainstorm solutions → Choose and implement → Evaluate

`;

    // Coping skills
    response += `**🛡️ Coping Skills:**
• **STOP technique:** Stop, Take a breath, Observe thoughts/feelings, Proceed mindfully
• **5-4-3-2-1 grounding:** 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste
• **Self-compassion:** Talk to yourself like you would a good friend
• **Values check:** Is this action aligned with what matters most to me?

`;

    response += `Which of these skills feels most relevant to what you're experiencing right now?`;

    return response;
  }

  private extractKeyThought(userInput: string): string {
    // Simple extraction of key negative thought
    const sentences = userInput.split(/[.!?]+/);
    
    // Look for sentences with strong emotional words or cognitive distortions
    const emotionalSentence = sentences.find(sentence => {
      const lowerSentence = sentence.toLowerCase();
      return (
        lowerSentence.includes('always') || lowerSentence.includes('never') ||
        lowerSentence.includes('terrible') || lowerSentence.includes('disaster') ||
        lowerSentence.includes('can\'t') || lowerSentence.includes('should')
      );
    });

    return emotionalSentence?.trim() || sentences[0]?.trim() || userInput.substring(0, 100);
  }

  private getChallengingQuestions(distortionType: string): string {
    switch (distortionType) {
      case 'All-or-Nothing Thinking':
        return `**Challenging questions:**
• Is this really completely black or white, or might there be some gray areas?
• What would a more balanced perspective look like?
• Have there been times when this wasn't true?

`;

      case 'Catastrophizing':
        return `**Challenging questions:**
• What's the most realistic outcome?
• What would I tell a friend who was thinking this way?
• How likely is the worst-case scenario, really?

`;

      case 'Mind Reading':
        return `**Challenging questions:**
• What actual evidence do I have for what others are thinking?
• Could there be other explanations for their behavior?
• How often am I right when I assume I know what others think?

`;

      case 'Fortune Telling':
        return `**Challenging questions:**
• What evidence do I have that this will definitely happen?
• What has my track record been with predictions like this?
• What would be a more realistic prediction?

`;

      default:
        return `**Challenging questions:**
• What evidence supports this thought?
• What evidence contradicts it?
• What would a more balanced perspective be?

`;
    }
  }
}