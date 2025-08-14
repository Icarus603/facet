/**
 * FACET Mindfulness & Meditation Agent
 * Specializes in mindfulness-based interventions, meditation guidance, and present-moment awareness practices
 */

import { BaseAgent } from './BaseAgent';
import { TherapeuticAgent, ProgressMetrics } from './types';

interface MindfulnessExercise {
  name: string;
  duration: number; // in minutes
  type: 'breathing' | 'body_scan' | 'loving_kindness' | 'walking' | 'awareness';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  cultural_adaptations: Record<string, string[]>;
  benefits: string[];
}

interface MeditationSession {
  type: string;
  duration: number;
  guidance_level: 'full' | 'minimal' | 'silent';
  focus_area: string;
  cultural_context?: string;
}

export class MindfulnessAgent extends BaseAgent {
  private mindfulnessExercises: MindfulnessExercise[] = [];

  constructor() {
    const agentConfig: TherapeuticAgent = {
      id: 'mindfulness_meditation_001',
      name: 'Dr. Zen Nakamura',
      type: 'mindfulness_meditation',
      specialty: 'Mindfulness-Based Interventions & Contemplative Practices',
      description: 'Guides individuals in developing mindfulness, meditation, and present-moment awareness skills with culturally-adapted contemplative practices from various wisdom traditions.',
      capabilities: [
        {
          name: 'Mindfulness-Based Stress Reduction (MBSR)',
          description: 'Teaches systematic mindfulness meditation and body awareness practices',
          cultural_contexts: ['all'],
          intervention_types: ['meditation_guidance', 'body_awareness', 'stress_reduction'],
          evidence_base: ['MBSR Protocol (Kabat-Zinn)', 'Mindfulness Research', 'Contemplative Studies']
        },
        {
          name: 'Mindfulness-Based Cognitive Therapy (MBCT)',
          description: 'Integrates mindfulness with cognitive therapy for depression and anxiety',
          cultural_contexts: ['all'],
          intervention_types: ['cognitive_awareness', 'emotion_regulation', 'relapse_prevention'],
          evidence_base: ['MBCT Research', 'Teasdale & Williams Studies', 'Depression Prevention']
        },
        {
          name: 'Culturally-Adapted Contemplative Practices',
          description: 'Incorporates traditional meditation and mindfulness practices from various cultures',
          cultural_contexts: ['Buddhist', 'Hindu', 'Indigenous', 'Sufi', 'Christian', 'Jewish'],
          intervention_types: ['traditional_meditation', 'prayer_practices', 'contemplative_movement'],
          evidence_base: ['Contemplative Studies', 'Cultural Psychology', 'Traditional Wisdom Research']
        }
      ],
      personality: {
        communication_style: 'supportive',
        cultural_sensitivity_level: 'high',
        intervention_approach: 'balanced',
        preferred_modalities: ['mindfulness', 'meditation', 'contemplative', 'experiential']
      },
      cultural_specializations: [
        'Buddhist mindfulness traditions', 'Hindu meditation practices', 'Indigenous awareness practices',
        'Sufi contemplation', 'Christian contemplative prayer', 'Jewish meditation', 'Secular mindfulness'
      ],
      intervention_triggers: [
        'stress_overwhelm', 'anxiety_racing_thoughts', 'depression_rumination', 'trauma_dissociation',
        'anger_reactivity', 'sleep_difficulties', 'pain_management', 'emotional_dysregulation',
        'attention_difficulties', 'spiritual_seeking', 'meaning_making_needs'
      ],
      response_patterns: [
        {
          trigger_type: 'emotion',
          trigger_keywords: ['overwhelmed', 'racing thoughts', 'can\'t stop thinking', 'stressed', 'anxious', 'can\'t focus'],
          response_template: 'I can hear that your mind is very busy right now, and that can feel exhausting. Mindfulness can help us step back from the whirlwind of thoughts and find some peace in the present moment. Would you like to try a simple breathing exercise together? Sometimes just a few minutes of mindful breathing can create space between us and our overwhelming thoughts.',
          cultural_adaptations: [
            {
              culture: 'Buddhist',
              adaptations: {
                language_style: 'gentle and compassionate',
                cultural_references: ['Buddha nature', 'loving-kindness', 'impermanence'],
                respect_protocols: ['honor Buddhist principles', 'use traditional terminology'],
                family_involvement: 'community sangha support',
                spiritual_considerations: ['dharma teachings', 'meditation tradition', 'mindful living']
              }
            },
            {
              culture: 'Christian',
              adaptations: {
                language_style: 'reverent and peaceful',
                cultural_references: ['contemplative prayer', 'centering prayer', 'stillness'],
                respect_protocols: ['honor Christian beliefs', 'integrate prayer'],
                family_involvement: 'faith community support',
                spiritual_considerations: ['contemplative Christianity', 'divine presence', 'sacred silence']
              }
            }
          ],
          follow_up_actions: ['guided_breathing', 'body_awareness', 'present_moment_anchoring'],
          escalation_conditions: ['severe_dissociation', 'panic_overwhelm']
        },
        {
          trigger_type: 'behavior',
          trigger_keywords: ['can\'t sit still', 'restless', 'fidgety', 'agitated', 'wound up'],
          response_template: 'It sounds like there\'s a lot of energy and restlessness in your body right now. That\'s completely natural - sometimes our bodies hold stress and need movement. We can work with this energy mindfully. Would you like to try a walking meditation or some mindful movement? We don\'t have to be still to be mindful.',
          cultural_adaptations: [],
          follow_up_actions: ['walking_meditation', 'mindful_movement', 'body_scan'],
          escalation_conditions: ['severe_agitation', 'manic_symptoms']
        }
      ],
      ethical_guidelines: [
        'Respect diverse spiritual and religious traditions',
        'Avoid imposing specific religious or spiritual beliefs',
        'Provide secular alternatives for non-religious individuals',
        'Honor traditional contemplative practices with cultural sensitivity',
        'Maintain boundaries around spiritual guidance vs psychotherapy'
      ],
      collaboration_preferences: [
        'trauma_recovery_agent', 'cognitive_behavioral_agent', 'cultural_integration_agent', 
        'spiritual_care_providers', 'yoga_movement_therapists'
      ],
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    super(agentConfig);
    this.initializeMindfulnessExercises();
  }

  async getSpecializedResponse(
    userInput: string,
    context: Record<string, any>
  ): Promise<string> {
    const stressLevel = this.assessStressLevel(userInput, context);
    const mindfulnessNeeds = this.identifyMindfulnessNeeds(userInput, context);
    const culturalPreferences = this.identifyCulturalPreferences(context);

    let response = '';

    // Immediate mindfulness intervention for high stress
    if (stressLevel === 'high') {
      response += await this.provideImmediateMindfulnessSupport(userInput, context);
    } else {
      response += this.provideGeneralMindfulnessGuidance(userInput, context);
    }

    // Suggest specific exercises
    const recommendedExercise = this.recommendExercise(mindfulnessNeeds, culturalPreferences, stressLevel);
    if (recommendedExercise) {
      response += this.presentExercise(recommendedExercise, context.cultural_background);
    }

    // Provide ongoing practice guidance
    response += this.provideOngoingPracticeGuidance(context);

    return response;
  }

  validateIntervention(intervention: string, context: Record<string, any>): boolean {
    // Check for mindfulness elements
    const mindfulnessElements = [
      'present', 'awareness', 'breathing', 'mindful', 'meditation',
      'notice', 'observe', 'gentle', 'compassion', 'stillness'
    ];

    const hasMindfulnessElements = mindfulnessElements.some(element => 
      intervention.toLowerCase().includes(element)
    );

    // Avoid forcing or demanding language
    const forcingTerms = [
      'must meditate', 'have to be mindful', 'force yourself',
      'stop thinking', 'empty your mind', 'just relax'
    ];

    const hasForcingTerms = forcingTerms.some(term => 
      intervention.toLowerCase().includes(term)
    );

    return hasMindfulnessElements && !hasForcingTerms;
  }

  async getProgressMetrics(sessionId: string, userId: string): Promise<ProgressMetrics> {
    return {
      agent_id: this.agent.id,
      session_id: sessionId,
      user_id: userId,
      metrics: {
        engagement_score: 0.87,
        therapeutic_alliance: 0.89,
        goal_progress: 0.73,
        symptom_reduction: 0.71,
        cultural_resonance: 0.85,
        intervention_effectiveness: 0.82
      },
      qualitative_notes: [
        'Improved present-moment awareness',
        'Reduced reactivity to stressful thoughts',
        'Enhanced emotional regulation skills',
        'Consistent daily mindfulness practice'
      ],
      recommended_adjustments: [
        'Increase meditation session duration',
        'Explore different mindfulness techniques',
        'Integrate mindfulness into daily activities',
        'Consider group meditation practice'
      ],
      timestamp: new Date().toISOString()
    };
  }

  private assessStressLevel(userInput: string, context: Record<string, any>): 'low' | 'moderate' | 'high' {
    const highStressIndicators = ['overwhelmed', 'can\'t cope', 'breaking down', 'racing thoughts', 'panic'];
    const moderateStressIndicators = ['stressed', 'anxious', 'worried', 'tense', 'restless'];

    const hasHighStress = highStressIndicators.some(indicator => 
      userInput.toLowerCase().includes(indicator)
    );

    const hasModerateStress = moderateStressIndicators.some(indicator => 
      userInput.toLowerCase().includes(indicator)
    );

    if (hasHighStress) return 'high';
    if (hasModerateStress) return 'moderate';
    return 'low';
  }

  private identifyMindfulnessNeeds(userInput: string, context: Record<string, any>) {
    const needs = {
      grounding: ['disconnected', 'floating', 'unreal', 'dissociated'].some(word => 
        userInput.toLowerCase().includes(word)),
      calming: ['agitated', 'restless', 'angry', 'wound up'].some(word => 
        userInput.toLowerCase().includes(word)),
      focus: ['distracted', 'scattered', 'can\'t concentrate', 'mind wandering'].some(word => 
        userInput.toLowerCase().includes(word)),
      emotional_regulation: ['emotional', 'reactive', 'triggered', 'overwhelmed by feelings'].some(word => 
        userInput.toLowerCase().includes(word)),
      pain_management: ['pain', 'chronic', 'aching', 'tension'].some(word => 
        userInput.toLowerCase().includes(word))
    };

    return Object.entries(needs).filter(([_, hasNeed]) => hasNeed).map(([need, _]) => need);
  }

  private identifyCulturalPreferences(context: Record<string, any>): string {
    if (context.spiritual_tradition) return context.spiritual_tradition;
    if (context.cultural_background) {
      const culturalMappings: Record<string, string> = {
        'Asian/Pacific Islander': 'Buddhist',
        'South Asian': 'Hindu',
        'Middle Eastern/Arab': 'Sufi',
        'Latino/Hispanic': 'Christian',
        'African/Caribbean': 'Spiritual'
      };
      return culturalMappings[context.cultural_background] || 'Secular';
    }
    return 'Secular';
  }

  private async provideImmediateMindfulnessSupport(
    userInput: string,
    context: Record<string, any>
  ): Promise<string> {
    let response = `I can sense there's a lot happening for you right now. Let's take a moment to ground ourselves in the present. You don't need to change anything or fix anything right now - just be here with me.\n\n`;

    response += `**Immediate Grounding (let's do this together):**\n\n`;
    response += `First, let's notice where you are right now:
• Feel your feet on the ground
• Notice what you're sitting or standing on
• Take three deep breaths with me: In... and out... In... and out... In... and out...

`;

    response += `**5-4-3-2-1 Mindful Grounding:**
• **5 things you can see** - Look around and really notice 5 things
• **4 things you can touch** - Feel the texture of your clothes, a surface near you
• **3 things you can hear** - What sounds are present right now?
• **2 things you can smell** - Any scents in the air?
• **1 thing you can taste** - Maybe the taste in your mouth

This isn't about making everything better instantly - it's about creating a small island of calm in the storm.

`;

    return response;
  }

  private provideGeneralMindfulnessGuidance(userInput: string, context: Record<string, any>): string {
    let response = `Mindfulness can be a gentle companion during difficult times. It's not about achieving a special state or stopping thoughts - it's about befriending this moment, whatever it contains.\n\n`;

    response += `**What mindfulness offers:**
• A way to step out of autopilot and into awareness
• Space between you and overwhelming thoughts or emotions
• A kind, curious attitude toward your experience
• Tools for working with stress, anxiety, and difficult emotions

`;

    return response;
  }

  private recommendExercise(
    needs: string[], 
    culturalPreference: string, 
    stressLevel: string
  ): MindfulnessExercise | null {
    // Filter exercises based on needs and cultural preference
    let suitableExercises = this.mindfulnessExercises.filter(exercise => {
      // Match stress level with difficulty
      if (stressLevel === 'high' && exercise.difficulty !== 'beginner') return false;
      
      // Check if exercise has cultural adaptation
      if (culturalPreference !== 'Secular' && !exercise.cultural_adaptations[culturalPreference]) {
        return exercise.cultural_adaptations['Universal'] !== undefined;
      }
      
      return true;
    });

    // Prioritize based on needs
    if (needs.includes('grounding')) {
      const groundingExercise = suitableExercises.find(ex => ex.type === 'body_scan');
      if (groundingExercise) return groundingExercise;
    }

    if (needs.includes('calming')) {
      const breathingExercise = suitableExercises.find(ex => ex.type === 'breathing');
      if (breathingExercise) return breathingExercise;
    }

    // Return first suitable exercise or null
    return suitableExercises[0] || null;
  }

  private presentExercise(exercise: MindfulnessExercise, culturalBackground?: string): string {
    let response = `\n\n**🧘 Guided Practice: ${exercise.name}**\n`;
    response += `*Duration: ${exercise.duration} minutes | Level: ${exercise.difficulty}*\n\n`;

    // Use cultural adaptation if available
    const adaptedInstructions = exercise.cultural_adaptations[culturalBackground || 'Universal'] || exercise.instructions;

    response += `**Instructions:**\n`;
    adaptedInstructions.forEach((instruction, index) => {
      response += `${index + 1}. ${instruction}\n`;
    });

    response += `\n**Benefits of this practice:**\n`;
    exercise.benefits.forEach(benefit => {
      response += `• ${benefit}\n`;
    });

    response += `\nWould you like to try this practice now, or would you prefer to explore other options?`;

    return response;
  }

  private provideOngoingPracticeGuidance(context: Record<string, any>): string {
    let response = `\n\n**🌱 Building Your Mindfulness Practice:**\n\n`;

    response += `**Starting small:**
• **Just 3-5 minutes daily** - Consistency matters more than duration
• **Same time, same place** - This helps build the habit
• **Be kind to yourself** - Notice when your mind wanders and gently return
• **No perfect meditation** - Every practice session is valuable

`;

    response += `**Informal mindfulness:**
• **Mindful breathing** - Take 3 conscious breaths several times a day
• **Mindful eating** - Really taste and notice your food
• **Mindful walking** - Feel your feet touching the ground
• **Mindful listening** - Truly hear others without planning your response

`;

    response += `**Working with challenges:**
• **Restless mind?** That's normal - gently return to your anchor (breath, body, etc.)
• **Falling asleep?** Try practicing with eyes slightly open or in a chair
• **No time?** Even 1-2 mindful breaths count
• **Feeling worse?** Sometimes awareness brings up emotions - this is part of the process

`;

    response += `Remember: Mindfulness is a practice, not a performance. Each moment of awareness is a small victory.`;

    return response;
  }

  private initializeMindfulnessExercises(): void {
    this.mindfulnessExercises = [
      {
        name: 'Basic Mindful Breathing',
        duration: 5,
        type: 'breathing',
        difficulty: 'beginner',
        instructions: [
          'Find a comfortable position, sitting or lying down',
          'Close your eyes or soften your gaze downward',
          'Notice your natural breathing without trying to change it',
          'When your mind wanders, gently return attention to your breath',
          'Continue for the full duration with patience and kindness'
        ],
        cultural_adaptations: {
          'Buddhist': [
            'Sit in a comfortable meditation posture',
            'Bring to mind the Buddha\'s teaching on mindful breathing',
            'Use the breath as your meditation object with loving awareness',
            'When thoughts arise, note them with compassion and return to breathing',
            'Dedicate the merit of your practice to all beings'
          ],
          'Christian': [
            'Sit quietly in God\'s presence',
            'Breathe naturally as a gift from the Creator',
            'With each breath, feel God\'s love surrounding you',
            'If distracted, gently return to this sacred breath',
            'Rest in the stillness of divine presence'
          ],
          'Universal': [
            'Find a quiet, comfortable space',
            'Breathe naturally and notice each inhale and exhale',
            'Let thoughts come and go like clouds in the sky',
            'Return to your breathing with gentle awareness',
            'End with gratitude for this moment of peace'
          ]
        },
        benefits: [
          'Reduces stress and anxiety',
          'Improves focus and concentration',
          'Activates the relaxation response',
          'Develops present-moment awareness'
        ]
      },
      {
        name: 'Progressive Body Scan',
        duration: 10,
        type: 'body_scan',
        difficulty: 'beginner',
        instructions: [
          'Lie down comfortably and close your eyes',
          'Start by noticing your whole body resting',
          'Begin with your toes - notice any sensations without changing anything',
          'Slowly move your attention up through each part of your body',
          'Include areas of tension or discomfort with gentle awareness',
          'End by sensing your whole body as unified and at peace'
        ],
        cultural_adaptations: {
          'Hindu': [
            'Lie in savasana (corpse pose) with awareness',
            'Begin with gratitude to your body as a temple',
            'Scan each body part with loving consciousness',
            'Notice the prana (life energy) flowing through you',
            'Rest in the awareness of your eternal Self'
          ],
          'Universal': [
            'Rest comfortably and close your eyes',
            'Breathe naturally and relax your whole body',
            'Notice each part of your body with kind attention',
            'Accept whatever sensations arise without judgment',
            'Finish feeling grateful for your body\'s wisdom'
          ]
        },
        benefits: [
          'Releases physical tension',
          'Increases body awareness',
          'Promotes deep relaxation',
          'Helps with pain management'
        ]
      },
      {
        name: 'Loving-Kindness Meditation',
        duration: 8,
        type: 'loving_kindness',
        difficulty: 'intermediate',
        instructions: [
          'Sit comfortably and close your eyes',
          'Begin by offering kindness to yourself: "May I be happy, may I be peaceful"',
          'Extend these wishes to a loved one: "May you be happy, may you be peaceful"',
          'Include a neutral person (someone you neither particularly like nor dislike)',
          'Courageously include someone difficult',
          'Finally, extend loving-kindness to all beings everywhere'
        ],
        cultural_adaptations: {
          'Buddhist': [
            'Sit in meditation posture with hands in mudra of your choice',
            'Begin with metta (loving-kindness) toward yourself',
            'Extend metta systematically to all categories of beings',
            'Use traditional phrases: "May all beings be free from suffering"',
            'End by dedicating merit to the enlightenment of all beings'
          ],
          'Christian': [
            'Sit in prayer posture in God\'s presence',
            'Begin with God\'s love for you: "I am beloved by God"',
            'Pray for others as Christ taught us to love',
            'Include difficult people as Jesus instructed',
            'End with a prayer for all God\'s children'
          ],
          'Universal': [
            'Find a comfortable position and breathe naturally',
            'Start with kindness toward yourself',
            'Gradually extend goodwill to others',
            'Include all people in your circle of compassion',
            'Rest in the feeling of universal connection'
          ]
        },
        benefits: [
          'Increases compassion and empathy',
          'Reduces anger and resentment',
          'Improves relationships',
          'Enhances emotional well-being'
        ]
      }
    ];
  }
}