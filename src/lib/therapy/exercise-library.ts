/**
 * CBT/DBT Therapeutic Exercise Library
 * Evidence-based therapeutic interventions for the FACET platform
 * Based on SPECS.md requirements for therapeutic frameworks
 */

import { EmotionAnalysis } from '@/lib/types/agent'

// Exercise types based on therapeutic modalities
export type ExerciseType = 
  | 'cbt_thought_record'
  | 'cbt_behavioral_experiment'
  | 'cbt_cognitive_restructuring'
  | 'dbt_distress_tolerance'
  | 'dbt_emotion_regulation'
  | 'dbt_mindfulness'
  | 'dbt_interpersonal_effectiveness'
  | 'grounding_technique'
  | 'breathing_exercise'
  | 'progressive_muscle_relaxation'
  | 'behavioral_activation'
  | 'exposure_preparation'

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type ExerciseDuration = 'short' | 'medium' | 'long' // 2-5min, 5-15min, 15-30min

export interface TherapeuticExercise {
  id: string
  title: string
  type: ExerciseType
  description: string
  difficulty: ExerciseDifficulty
  estimatedDuration: ExerciseDuration
  targetEmotions: string[]
  contraindications: string[]
  prerequisites?: string[]
  
  // Exercise content
  instructions: ExerciseStep[]
  resources?: ExerciseResource[]
  
  // Therapeutic context
  therapeuticGoals: string[]
  evidenceBase: string[]
  adaptations?: ExerciseAdaptation[]
  
  // Usage tracking
  effectivenessRating: number // 0-10 based on user feedback
  usageCount: number
  lastUpdated: Date
}

export interface ExerciseStep {
  stepNumber: number
  title: string
  instruction: string
  duration?: number // seconds
  isRequired: boolean
  helpText?: string
  audioScript?: string // For guided exercises
}

export interface ExerciseResource {
  type: 'worksheet' | 'audio' | 'video' | 'reading' | 'app'
  title: string
  description: string
  url?: string
  content?: string
}

export interface ExerciseAdaptation {
  condition: string // e.g., 'high_anxiety', 'depression', 'trauma_history'
  modifications: string[]
  additionalPrecautions: string[]
}

export interface ExerciseRecommendation {
  exercise: TherapeuticExercise
  reasoning: string
  urgency: 'immediate' | 'soon' | 'when_ready'
  personalizations: string[]
  alternativeExercises: string[]
}

export interface ExerciseSession {
  id: string
  userId: string
  exerciseId: string
  startedAt: Date
  completedAt?: Date
  status: 'started' | 'completed' | 'abandoned'
  
  // User responses and ratings
  preExerciseEmotion: EmotionAnalysis
  postExerciseEmotion?: EmotionAnalysis
  userResponses: { [stepNumber: number]: string }
  effectivenessRating?: number // 1-10
  difficultyRating?: number // 1-10
  notes?: string
  
  // Progress tracking
  stepsCompleted: number
  totalSteps: number
  adaptationsUsed: string[]
}

/**
 * Therapeutic Exercise Library Manager
 */
export class ExerciseLibrary {
  private exercises: Map<string, TherapeuticExercise> = new Map()

  constructor() {
    this.initializeExercises()
  }

  /**
   * Get exercise recommendations based on emotional state and context
   */
  getRecommendations(
    emotionAnalysis: EmotionAnalysis,
    userHistory: ExerciseSession[] = [],
    urgencyLevel: 'low' | 'medium' | 'high' = 'medium',
    availableTime: ExerciseDuration = 'medium'
  ): ExerciseRecommendation[] {
    const recommendations: ExerciseRecommendation[] = []
    
    // Crisis-level emotions - immediate interventions
    if (emotionAnalysis.intensity > 8 || urgencyLevel === 'high') {
      recommendations.push(...this.getCrisisInterventions(emotionAnalysis))
    }
    
    // Primary emotion-based recommendations
    const primaryEmotionExercises = this.getExercisesForEmotion(
      emotionAnalysis.primaryEmotion,
      availableTime
    )
    
    // Filter based on user history to avoid repetition
    const recentExerciseIds = userHistory
      .filter(session => session.startedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .map(session => session.exerciseId)
    
    const novelExercises = primaryEmotionExercises.filter(
      exercise => !recentExerciseIds.includes(exercise.id)
    )
    
    // Add personalized recommendations
    for (const exercise of novelExercises.slice(0, 3)) {
      recommendations.push({
        exercise,
        reasoning: this.generateRecommendationReasoning(exercise, emotionAnalysis),
        urgency: this.determineUrgency(emotionAnalysis, exercise),
        personalizations: this.generatePersonalizations(exercise, emotionAnalysis),
        alternativeExercises: this.getAlternativeExercises(exercise.id, 2)
      })
    }
    
    return recommendations
  }

  /**
   * Get specific exercise by ID
   */
  getExercise(exerciseId: string): TherapeuticExercise | undefined {
    return this.exercises.get(exerciseId)
  }

  /**
   * Search exercises by criteria
   */
  searchExercises(criteria: {
    type?: ExerciseType
    difficulty?: ExerciseDifficulty
    duration?: ExerciseDuration
    targetEmotion?: string
    keyword?: string
  }): TherapeuticExercise[] {
    return Array.from(this.exercises.values()).filter(exercise => {
      if (criteria.type && exercise.type !== criteria.type) return false
      if (criteria.difficulty && exercise.difficulty !== criteria.difficulty) return false
      if (criteria.duration && exercise.estimatedDuration !== criteria.duration) return false
      if (criteria.targetEmotion && !exercise.targetEmotions.includes(criteria.targetEmotion)) return false
      if (criteria.keyword) {
        const keyword = criteria.keyword.toLowerCase()
        const searchText = `${exercise.title} ${exercise.description}`.toLowerCase()
        if (!searchText.includes(keyword)) return false
      }
      return true
    })
  }

  /**
   * Get crisis intervention exercises
   */
  private getCrisisInterventions(emotionAnalysis: EmotionAnalysis): ExerciseRecommendation[] {
    const crisisExercises = [
      'grounding_5_4_3_2_1',
      'box_breathing_crisis',
      'dbt_ice_water',
      'progressive_muscle_quick'
    ]
    
    return crisisExercises
      .map(id => this.exercises.get(id))
      .filter((exercise): exercise is TherapeuticExercise => exercise !== undefined)
      .map(exercise => ({
        exercise,
        reasoning: 'Immediate emotional regulation needed for crisis-level distress',
        urgency: 'immediate' as const,
        personalizations: [`Adapted for ${emotionAnalysis.primaryEmotion} intensity ${emotionAnalysis.intensity}/10`],
        alternativeExercises: this.getAlternativeExercises(exercise.id, 2)
      }))
  }

  /**
   * Get exercises targeting specific emotions
   */
  private getExercisesForEmotion(emotion: string, duration: ExerciseDuration): TherapeuticExercise[] {
    return Array.from(this.exercises.values())
      .filter(exercise => 
        exercise.targetEmotions.includes(emotion) && 
        exercise.estimatedDuration === duration
      )
      .sort((a, b) => b.effectivenessRating - a.effectivenessRating)
  }

  /**
   * Generate reasoning for exercise recommendation
   */
  private generateRecommendationReasoning(
    exercise: TherapeuticExercise, 
    emotionAnalysis: EmotionAnalysis
  ): string {
    const reasons = []
    
    if (exercise.targetEmotions.includes(emotionAnalysis.primaryEmotion)) {
      reasons.push(`targets your current ${emotionAnalysis.primaryEmotion}`)
    }
    
    if (exercise.type.includes('dbt') && emotionAnalysis.intensity > 6) {
      reasons.push('provides distress tolerance skills for intense emotions')
    }
    
    if (exercise.type.includes('cbt') && emotionAnalysis.valence < 40) {
      reasons.push('helps identify and reframe negative thought patterns')
    }
    
    if (exercise.effectivenessRating > 7) {
      reasons.push('has shown high effectiveness with other users')
    }
    
    return reasons.length > 0 
      ? `This exercise ${reasons.join(' and ')}.`
      : `This exercise can help with emotional regulation.`
  }

  /**
   * Determine urgency based on emotional state and exercise type
   */
  private determineUrgency(
    emotionAnalysis: EmotionAnalysis, 
    exercise: TherapeuticExercise
  ): 'immediate' | 'soon' | 'when_ready' {
    if (emotionAnalysis.intensity > 8) return 'immediate'
    if (emotionAnalysis.intensity > 6 && exercise.type.includes('grounding')) return 'soon'
    if (emotionAnalysis.valence < 30) return 'soon'
    return 'when_ready'
  }

  /**
   * Generate personalized modifications
   */
  private generatePersonalizations(
    exercise: TherapeuticExercise, 
    emotionAnalysis: EmotionAnalysis
  ): string[] {
    const personalizations = []
    
    if (emotionAnalysis.intensity > 7) {
      personalizations.push('Start with shorter time periods if feeling overwhelmed')
    }
    
    if (emotionAnalysis.primaryEmotion === 'anxiety' && exercise.type.includes('breathing')) {
      personalizations.push('Focus extra attention on the exhale phase')
    }
    
    if (emotionAnalysis.valence < 30) {
      personalizations.push('Be gentle with yourself - small steps count')
    }
    
    return personalizations
  }

  /**
   * Get alternative exercises
   */
  private getAlternativeExercises(exerciseId: string, count: number = 2): string[] {
    const currentExercise = this.exercises.get(exerciseId)
    if (!currentExercise) return []
    
    return Array.from(this.exercises.values())
      .filter(ex => 
        ex.id !== exerciseId && 
        ex.type === currentExercise.type ||
        ex.targetEmotions.some(emotion => currentExercise.targetEmotions.includes(emotion))
      )
      .slice(0, count)
      .map(ex => ex.id)
  }

  /**
   * Initialize the exercise library with evidence-based interventions
   */
  private initializeExercises(): void {
    // DBT Distress Tolerance - Ice Water
    this.exercises.set('dbt_ice_water', {
      id: 'dbt_ice_water',
      title: 'Ice Water Technique',
      type: 'dbt_distress_tolerance',
      description: 'Use cold water to rapidly decrease emotional intensity through the dive response',
      difficulty: 'beginner',
      estimatedDuration: 'short',
      targetEmotions: ['anger', 'anxiety', 'panic', 'overwhelm'],
      contraindications: ['eating_disorders', 'heart_conditions'],
      instructions: [
        {
          stepNumber: 1,
          title: 'Prepare cold water',
          instruction: 'Fill a bowl with cold water (around 50-60°F). If unavailable, use ice cubes wrapped in a towel.',
          duration: 30,
          isRequired: true,
          helpText: 'Cold water triggers the mammalian dive response, which naturally calms the nervous system.'
        },
        {
          stepNumber: 2,
          title: 'Submerge face',
          instruction: 'Hold your breath and submerge your face from temples to chin for 30 seconds.',
          duration: 30,
          isRequired: true,
          helpText: 'This activates the parasympathetic nervous system quickly.'
        },
        {
          stepNumber: 3,
          title: 'Alternative method',
          instruction: 'If face submersion isn\'t possible, hold ice cubes over your eyes and upper cheeks.',
          duration: 60,
          isRequired: false,
          helpText: 'This achieves similar physiological effects.'
        },
        {
          stepNumber: 4,
          title: 'Notice the change',
          instruction: 'Take a moment to notice how your emotional intensity has changed.',
          duration: 30,
          isRequired: true,
          helpText: 'Awareness of the technique\'s effectiveness helps build confidence in using it.'
        }
      ],
      therapeuticGoals: ['emotional_regulation', 'distress_tolerance', 'crisis_intervention'],
      evidenceBase: ['DBT Skills Training Manual', 'Dialectical Behavior Therapy research'],
      effectivenessRating: 8.5,
      usageCount: 0,
      lastUpdated: new Date()
    })

    // CBT Thought Record
    this.exercises.set('cbt_thought_record', {
      id: 'cbt_thought_record',
      title: 'Thought Record',
      type: 'cbt_thought_record',
      description: 'Identify and examine unhelpful thoughts to develop more balanced thinking',
      difficulty: 'intermediate',
      estimatedDuration: 'medium',
      targetEmotions: ['depression', 'anxiety', 'anger', 'guilt', 'shame'],
      contraindications: [],
      instructions: [
        {
          stepNumber: 1,
          title: 'Identify the situation',
          instruction: 'Describe the situation that triggered your emotional response. Be specific about what happened.',
          duration: 120,
          isRequired: true,
          helpText: 'Focus on facts, not interpretations. What would a camera record?'
        },
        {
          stepNumber: 2,
          title: 'Rate your emotion',
          instruction: 'Identify your emotion and rate its intensity from 0-100.',
          duration: 60,
          isRequired: true,
          helpText: 'Be specific about the emotion. "Bad" isn\'t an emotion - try "frustrated," "sad," or "anxious."'
        },
        {
          stepNumber: 3,
          title: 'Capture the thought',
          instruction: 'What thought went through your mind? What were you telling yourself?',
          duration: 120,
          isRequired: true,
          helpText: 'Look for the "hot thought" - the one that triggered the strongest emotional response.'
        },
        {
          stepNumber: 4,
          title: 'Examine the evidence',
          instruction: 'What evidence supports this thought? What evidence contradicts it?',
          duration: 180,
          isRequired: true,
          helpText: 'Be your own detective. Look for facts, not feelings or assumptions.'
        },
        {
          stepNumber: 5,
          title: 'Develop a balanced thought',
          instruction: 'Create a more balanced, realistic thought based on the evidence.',
          duration: 120,
          isRequired: true,
          helpText: 'This isn\'t about positive thinking - it\'s about accurate thinking.'
        },
        {
          stepNumber: 6,
          title: 'Rate your emotion again',
          instruction: 'Rate the intensity of your emotion now, from 0-100.',
          duration: 60,
          isRequired: true,
          helpText: 'Even small decreases are meaningful and show the technique is working.'
        }
      ],
      therapeuticGoals: ['cognitive_restructuring', 'mood_improvement', 'insight_development'],
      evidenceBase: ['Cognitive Therapy for Depression', 'CBT effectiveness research'],
      effectivenessRating: 8.2,
      usageCount: 0,
      lastUpdated: new Date()
    })

    // Grounding 5-4-3-2-1 Technique
    this.exercises.set('grounding_5_4_3_2_1', {
      id: 'grounding_5_4_3_2_1',
      title: '5-4-3-2-1 Grounding',
      type: 'grounding_technique',
      description: 'Use your five senses to ground yourself in the present moment',
      difficulty: 'beginner',
      estimatedDuration: 'short',
      targetEmotions: ['anxiety', 'panic', 'dissociation', 'overwhelm'],
      contraindications: [],
      instructions: [
        {
          stepNumber: 1,
          title: 'Find 5 things you can see',
          instruction: 'Look around and name 5 things you can see. Describe them in detail.',
          duration: 60,
          isRequired: true,
          helpText: 'Really focus on details - colors, shapes, textures. This brings you into the present.'
        },
        {
          stepNumber: 2,
          title: 'Find 4 things you can touch',
          instruction: 'Notice 4 things you can feel. Touch them and describe the sensations.',
          duration: 60,
          isRequired: true,
          helpText: 'Temperature, texture, weight - physical sensations anchor you to reality.'
        },
        {
          stepNumber: 3,
          title: 'Find 3 things you can hear',
          instruction: 'Listen carefully and identify 3 different sounds around you.',
          duration: 45,
          isRequired: true,
          helpText: 'Even subtle sounds count - your breathing, distant traffic, the hum of electronics.'
        },
        {
          stepNumber: 4,
          title: 'Find 2 things you can smell',
          instruction: 'Notice 2 different scents. If you can\'t smell anything, move to find some.',
          duration: 45,
          isRequired: false,
          helpText: 'Smell is strongly connected to memory and emotion, helping reset your nervous system.'
        },
        {
          stepNumber: 5,
          title: 'Find 1 thing you can taste',
          instruction: 'Notice what you can taste, or take a sip of water and focus on the sensation.',
          duration: 30,
          isRequired: false,
          helpText: 'Taste completes the sensory grounding experience.'
        }
      ],
      therapeuticGoals: ['present_moment_awareness', 'anxiety_reduction', 'grounding'],
      evidenceBase: ['Trauma-informed therapy', 'Mindfulness research'],
      effectivenessRating: 8.7,
      usageCount: 0,
      lastUpdated: new Date()
    })

    // Continue with more exercises...
    this.initializeAdditionalExercises()
  }

  private initializeAdditionalExercises(): void {
    // Box Breathing for Crisis
    this.exercises.set('box_breathing_crisis', {
      id: 'box_breathing_crisis',
      title: 'Crisis Box Breathing',
      type: 'breathing_exercise',
      description: 'Regulated breathing pattern to quickly calm the nervous system',
      difficulty: 'beginner',
      estimatedDuration: 'short',
      targetEmotions: ['anxiety', 'panic', 'anger', 'stress'],
      contraindications: ['severe_respiratory_issues'],
      instructions: [
        {
          stepNumber: 1,
          title: 'Get comfortable',
          instruction: 'Sit or lie down comfortably. Place one hand on your chest, one on your belly.',
          duration: 30,
          isRequired: true,
          helpText: 'Good posture helps with breathing effectiveness.'
        },
        {
          stepNumber: 2,
          title: 'Exhale completely',
          instruction: 'Breathe out completely through your mouth, making a "whoosh" sound.',
          duration: 15,
          isRequired: true,
          helpText: 'Emptying your lungs prepares for the pattern.'
        },
        {
          stepNumber: 3,
          title: 'Begin the pattern',
          instruction: 'Inhale through nose for 4 counts, hold for 4, exhale through mouth for 4, hold empty for 4.',
          duration: 240,
          isRequired: true,
          helpText: 'Repeat this pattern 4-8 times. Focus only on counting.'
        },
        {
          stepNumber: 4,
          title: 'Return to normal breathing',
          instruction: 'Allow your breathing to return to its natural rhythm.',
          duration: 30,
          isRequired: true,
          helpText: 'Notice how your body feels different now.'
        }
      ],
      therapeuticGoals: ['anxiety_reduction', 'emotional_regulation', 'physiological_calming'],
      evidenceBase: ['Pranayama research', 'Autonomic nervous system studies'],
      effectivenessRating: 8.3,
      usageCount: 0,
      lastUpdated: new Date()
    })

    // DBT PLEASE Skills
    this.exercises.set('dbt_please_skills', {
      id: 'dbt_please_skills',
      title: 'PLEASE Skills Check',
      type: 'dbt_emotion_regulation',
      description: 'Maintain emotional balance by taking care of basic needs',
      difficulty: 'beginner',
      estimatedDuration: 'medium',
      targetEmotions: ['irritability', 'mood_swings', 'emotional_vulnerability'],
      contraindications: [],
      instructions: [
        {
          stepNumber: 1,
          title: 'P - Treat Physical Illness',
          instruction: 'Check: Do you have any physical symptoms that need attention? Take care of any illness.',
          duration: 120,
          isRequired: true,
          helpText: 'Physical illness affects emotional regulation. Address what you can.'
        },
        {
          stepNumber: 2,
          title: 'L - Balance Eating',
          instruction: 'Reflect on your eating today. Have you eaten regularly? Are you hungry or overly full?',
          duration: 60,
          isRequired: true,
          helpText: 'Blood sugar affects mood. Plan your next meal if needed.'
        },
        {
          stepNumber: 3,
          title: 'E - Avoid Mood-Altering Substances',
          instruction: 'Check your use of alcohol, drugs, or excessive caffeine. Make a plan to moderate if needed.',
          duration: 90,
          isRequired: true,
          helpText: 'Substances can destabilize emotions even hours later.'
        },
        {
          stepNumber: 4,
          title: 'A - Balance Sleep',
          instruction: 'How is your sleep? Rate quality (1-10) and hours. Plan improvements if needed.',
          duration: 90,
          isRequired: true,
          helpText: 'Sleep deprivation is one of the strongest predictors of emotional difficulty.'
        },
        {
          stepNumber: 5,
          title: 'S - Get Exercise',
          instruction: 'What movement have you done today? Plan at least 10 minutes of physical activity.',
          duration: 120,
          isRequired: true,
          helpText: 'Exercise is as effective as many medications for mood regulation.'
        },
        {
          stepNumber: 6,
          title: 'E - Build Mastery',
          instruction: 'Plan one small thing you can accomplish that will give you a sense of achievement.',
          duration: 120,
          isRequired: true,
          helpText: 'Accomplishment, even small tasks, builds emotional resilience.'
        }
      ],
      therapeuticGoals: ['emotion_regulation', 'self_care', 'mood_stability'],
      evidenceBase: ['DBT Skills Training Manual', 'Emotion regulation research'],
      effectivenessRating: 7.8,
      usageCount: 0,
      lastUpdated: new Date()
    })
  }
}