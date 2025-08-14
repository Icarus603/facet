/**
 * FACET Progress Tracking Agent
 * Specializes in monitoring therapeutic progress, goal achievement, and outcome measurement
 */

import { BaseAgent } from './BaseAgent';
import { TherapeuticAgent, ProgressMetrics } from './types';

interface GoalProgress {
  goal_id: string;
  goal_description: string;
  target_date: string;
  progress_percentage: number;
  milestones_achieved: string[];
  barriers_identified: string[];
  strategies_working: string[];
  next_steps: string[];
}

interface ProgressTrend {
  metric: string;
  trend_direction: 'improving' | 'stable' | 'declining';
  confidence_level: number;
  time_period: string;
  cultural_factors: string[];
}

interface OutcomeMeasurement {
  assessment_type: string;
  baseline_score: number;
  current_score: number;
  change_score: number;
  clinical_significance: boolean;
  cultural_validity: boolean;
}

export class ProgressTrackingAgent extends BaseAgent {
  private standardizedMeasures = {
    depression: {
      name: 'Patient Health Questionnaire (PHQ-9)',
      score_range: '0-27',
      interpretation: {
        minimal: '0-4',
        mild: '5-9',
        moderate: '10-14',
        moderately_severe: '15-19',
        severe: '20-27'
      }
    },
    anxiety: {
      name: 'Generalized Anxiety Disorder Scale (GAD-7)',
      score_range: '0-21',
      interpretation: {
        minimal: '0-4',
        mild: '5-9',
        moderate: '10-14',
        severe: '15-21'
      }
    },
    wellbeing: {
      name: 'Warwick-Edinburgh Mental Well-being Scale (WEMWBS)',
      score_range: '14-70',
      interpretation: {
        low: '14-32',
        below_average: '33-40',
        average: '41-59',
        above_average: '60-70'
      }
    }
  };

  constructor() {
    const agentConfig: TherapeuticAgent = {
      id: 'progress_tracking_001',
      name: 'Dr. Angela Data-Chen',
      type: 'progress_tracking',
      specialty: 'Clinical Outcomes & Therapeutic Progress Measurement',
      description: 'Specializes in systematic progress monitoring, goal tracking, outcome measurement, and data-driven treatment planning with cultural responsiveness.',
      capabilities: [
        {
          name: 'Progress Monitoring',
          description: 'Systematic tracking of therapeutic goals and symptom changes over time',
          cultural_contexts: ['all'],
          intervention_types: ['goal_tracking', 'symptom_monitoring', 'milestone_assessment'],
          evidence_base: ['Outcome Measurement Research', 'Goal Attainment Scaling', 'Progress Monitoring Studies']
        },
        {
          name: 'Outcome Assessment',
          description: 'Comprehensive evaluation using standardized and culturally-adapted measures',
          cultural_contexts: ['all'],
          intervention_types: ['standardized_assessment', 'cultural_adaptation', 'functional_measurement'],
          evidence_base: ['Psychometric Assessment', 'Cultural Assessment Adaptation', 'Evidence-Based Measurement']
        },
        {
          name: 'Data-Driven Treatment Planning',
          description: 'Uses progress data to inform and adjust therapeutic interventions',
          cultural_contexts: ['all'],
          intervention_types: ['treatment_adjustment', 'intervention_optimization', 'relapse_prevention'],
          evidence_base: ['Measurement-Based Care', 'Personalized Medicine', 'Adaptive Treatment Research']
        }
      ],
      personality: {
        communication_style: 'analytical',
        cultural_sensitivity_level: 'high',
        intervention_approach: 'balanced',
        preferred_modalities: ['measurement_based', 'goal_oriented', 'evidence_based', 'collaborative']
      },
      cultural_specializations: [
        'Culturally-adapted assessment', 'Cross-cultural outcome measurement',
        'Indigenous progress indicators', 'Collectivist goal-setting approaches'
      ],
      intervention_triggers: [
        'progress_review_needed', 'goal_adjustment_request', 'plateau_in_progress',
        'regression_concerns', 'milestone_achievement', 'treatment_effectiveness_questions',
        'motivation_fluctuations', 'outcome_measurement_due', 'relapse_prevention_planning'
      ],
      response_patterns: [
        {
          trigger_type: 'progress',
          trigger_keywords: [
            'am I getting better', 'progress check', 'how am I doing', 'any improvement',
            'stuck', 'plateau', 'not improving', 'goals', 'milestones'
          ],
          response_template: 'It\'s wonderful that you\'re thinking about your progress - this kind of reflection shows real engagement in your healing journey. Let\'s take a comprehensive look at how you\'ve been doing. Progress in therapy isn\'t always linear, and sometimes the changes are subtle but meaningful. I\'d like to review your goals with you and celebrate the progress you\'ve made while also identifying areas where we might need to adjust our approach.',
          cultural_adaptations: [
            {
              culture: 'Asian/Pacific Islander',
              adaptations: {
                language_style: 'respectful and patient',
                cultural_references: ['steady progress', 'patience with process'],
                respect_protocols: ['acknowledge effort over speed', 'honor family perspective on progress'],
                family_involvement: 'include family views on progress',
                spiritual_considerations: ['holistic wellbeing', 'balance and harmony']
              }
            }
          ],
          follow_up_actions: ['comprehensive_progress_review', 'goal_reassessment', 'celebration_of_achievements'],
          escalation_conditions: ['significant_regression', 'loss_of_hope_about_progress']
        },
        {
          trigger_type: 'emotion',
          trigger_keywords: [
            'feel like giving up', 'nothing is working', 'wasting time', 'no point',
            'discouraged about progress', 'not worth it'
          ],
          response_template: 'I hear your discouragement, and it takes courage to express these feelings. Progress in therapy can sometimes feel slow or unclear, especially when we\'re in the middle of it. Let\'s look at your journey together - sometimes we\'re making more progress than we realize, and sometimes we need to adjust our approach. Your feelings are valid, and they\'re also important information that can help us understand what\'s working and what needs to change.',
          cultural_adaptations: [],
          follow_up_actions: ['progress_reality_check', 'goal_revision', 'motivation_renewal'],
          escalation_conditions: ['hopelessness', 'treatment_dropout_risk']
        }
      ],
      ethical_guidelines: [
        'Present progress data honestly while maintaining hope',
        'Respect cultural differences in defining progress and success',
        'Collaborate on goal-setting rather than imposing external measures',
        'Consider cultural factors that may influence measurement validity',
        'Balance quantitative data with qualitative life improvements'
      ],
      collaboration_preferences: [
        'all_therapy_agents', 'assessment_specialists', 'cultural_consultants', 'research_coordinators'
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
    const progressConcerns = this.identifyProgressConcerns(userInput, context);
    const goalStatus = this.assessGoalProgress(context);
    const trendAnalysis = this.analyzeTrends(context);

    let response = '';

    // Address immediate progress concerns
    if (progressConcerns.discouraged) {
      response += this.addressDiscouragement(userInput, context, trendAnalysis);
    } else if (progressConcerns.plateau) {
      response += this.addressPlateau(userInput, context);
    } else {
      response += this.provideProgressReview(context, goalStatus, trendAnalysis);
    }

    // Provide goal-focused guidance
    response += this.provideGoalGuidance(goalStatus, context);

    // Suggest next steps
    response += this.suggestNextSteps(trendAnalysis, context);

    return response;
  }

  validateIntervention(intervention: string, context: Record<string, any>): boolean {
    // Check for progress elements
    const progressElements = [
      'progress', 'goal', 'improvement', 'growth', 'change',
      'milestone', 'achievement', 'development', 'success'
    ];

    const hasProgressElements = progressElements.some(element => 
      intervention.toLowerCase().includes(element)
    );

    // Avoid discouraging language
    const discouragingTerms = [
      'no progress', 'failure', 'hopeless', 'waste of time',
      'not working', 'pointless', 'giving up'
    ];

    const hasDiscouragingTerms = discouragingTerms.some(term => 
      intervention.toLowerCase().includes(term)
    );

    return hasProgressElements && !hasDiscouragingTerms;
  }

  async getProgressMetrics(sessionId: string, userId: string): Promise<ProgressMetrics> {
    return {
      agent_id: this.agent.id,
      session_id: sessionId,
      user_id: userId,
      metrics: {
        engagement_score: 0.91, // High engagement for progress tracking
        therapeutic_alliance: 0.86,
        goal_progress: 0.84, // Strong focus on goal achievement
        symptom_reduction: 0.77,
        cultural_resonance: 0.81,
        intervention_effectiveness: 0.88
      },
      qualitative_notes: [
        'Excellent engagement with progress monitoring',
        'Clear understanding of personal goals and milestones',
        'Improved self-awareness of progress patterns',
        'Enhanced motivation through visible progress tracking'
      ],
      recommended_adjustments: [
        'Continue regular progress check-ins',
        'Expand goal-setting to new life areas',
        'Develop advanced self-monitoring skills',
        'Prepare for therapy completion planning'
      ],
      timestamp: new Date().toISOString()
    };
  }

  private identifyProgressConcerns(userInput: string, context: Record<string, any>) {
    const discouragementIndicators = [
      'not getting better', 'no improvement', 'feel stuck', 'giving up',
      'wasting time', 'not working', 'discouraged', 'hopeless about progress'
    ];

    const plateauIndicators = [
      'plateau', 'stuck', 'same place', 'not moving forward',
      'stagnant', 'no change', 'hitting wall'
    ];

    const impatientIndicators = [
      'taking too long', 'should be better by now', 'slow progress',
      'when will I feel better', 'how much longer'
    ];

    return {
      discouraged: discouragementIndicators.some(indicator => 
        userInput.toLowerCase().includes(indicator)),
      plateau: plateauIndicators.some(indicator => 
        userInput.toLowerCase().includes(indicator)),
      impatient: impatientIndicators.some(indicator => 
        userInput.toLowerCase().includes(indicator))
    };
  }

  private assessGoalProgress(context: Record<string, any>): GoalProgress[] {
    // In production, this would access actual goal data
    // For now, returning sample progress data
    return [
      {
        goal_id: 'goal_001',
        goal_description: 'Reduce anxiety symptoms to manageable levels',
        target_date: '2024-06-01',
        progress_percentage: 75,
        milestones_achieved: [
          'Learned breathing techniques',
          'Practicing daily mindfulness',
          'Reduced avoidance behaviors'
        ],
        barriers_identified: [
          'Work stress continues to trigger anxiety',
          'Social situations still challenging'
        ],
        strategies_working: [
          'Cognitive reframing techniques',
          'Regular exercise routine',
          'Support group participation'
        ],
        next_steps: [
          'Practice exposure exercises for social situations',
          'Develop workplace stress management strategies'
        ]
      }
    ];
  }

  private analyzeTrends(context: Record<string, any>): ProgressTrend[] {
    // In production, this would analyze actual data trends
    return [
      {
        metric: 'Mood scores',
        trend_direction: 'improving',
        confidence_level: 0.85,
        time_period: 'Last 6 weeks',
        cultural_factors: ['Increased family support', 'Cultural identity exploration']
      },
      {
        metric: 'Anxiety levels',
        trend_direction: 'stable',
        confidence_level: 0.70,
        time_period: 'Last 4 weeks',
        cultural_factors: ['Work stress remains constant']
      }
    ];
  }

  private addressDiscouragement(
    userInput: string,
    context: Record<string, any>,
    trends: ProgressTrend[]
  ): string {
    let response = `I hear your discouragement, and I want you to know that these feelings are completely understandable. Progress in therapy and personal growth rarely follows a straight line upward. `;

    response += `Let me share what I'm observing about your journey:\n\n`;

    // Highlight positive trends
    const improvingTrends = trends.filter(t => t.trend_direction === 'improving');
    if (improvingTrends.length > 0) {
      response += `**Progress You May Not Be Seeing:**\n`;
      improvingTrends.forEach(trend => {
        response += `• ${trend.metric}: ${trend.trend_direction} over ${trend.time_period}\n`;
      });
      response += `\n`;
    }

    response += `**Why Progress Can Feel Invisible:**
• **Daily familiarity** - We adapt to improvements and they become our new normal
• **Focus on remaining problems** - Our minds naturally notice what's still wrong
• **Gradual change** - Most meaningful progress happens slowly and subtly
• **Bad days stand out** - Difficult moments feel more memorable than good ones

`;

    response += `**The Reality of Your Journey:**
Progress doesn't mean feeling good all the time. It means developing tools, building resilience, and gradually shifting patterns. Even asking about your progress shows growth in self-awareness and commitment to healing.

`;

    return response;
  }

  private addressPlateau(userInput: string, context: Record<string, any>): string {
    let response = `Feeling stuck or hitting a plateau is actually a common and normal part of the growth process. It often indicates that you've integrated one level of change and are ready for the next stage of development.\n\n`;

    response += `**Understanding Plateaus:**
• **Integration phase** - Your mind and body are consolidating the changes you've made
• **Preparation for next level** - Like a plateau in mountain climbing, it's a resting point before the next ascent
• **Depth over breadth** - Sometimes we need to go deeper rather than broader
• **Readiness for new challenges** - Plateaus often signal readiness for new goals or approaches

`;

    response += `**Working with Plateaus:**
• **Review what's working** - Consolidate and strengthen your current tools
• **Explore new areas** - Consider goals or challenges you haven't addressed yet
• **Change approaches** - Try different therapeutic techniques or perspectives
• **Celebrate stability** - Appreciate that you're maintaining positive changes

`;

    response += `**Questions for Reflection:**
• What would you like to explore that we haven't focused on yet?
• Are there new areas of your life where you'd like to apply what you've learned?
• What would the next level of growth look like for you?

`;

    return response;
  }

  private provideProgressReview(
    context: Record<string, any>,
    goals: GoalProgress[],
    trends: ProgressTrend[]
  ): string {
    let response = `Let's take a comprehensive look at your progress. You've been working hard on your healing journey, and there's real value in recognizing how far you've come.\n\n`;

    response += `**Your Current Progress:**\n`;

    // Review goals
    if (goals.length > 0) {
      goals.forEach(goal => {
        response += `\n**Goal: ${goal.goal_description}**
• Progress: ${goal.progress_percentage}% complete
• Milestones achieved: ${goal.milestones_achieved.join(', ')}
• Strategies working: ${goal.strategies_working.join(', ')}
`;
        if (goal.barriers_identified.length > 0) {
          response += `• Areas to focus on: ${goal.barriers_identified.join(', ')}\n`;
        }
      });
    }

    // Review trends
    response += `\n**Overall Trends:**\n`;
    trends.forEach(trend => {
      const trendIcon = trend.trend_direction === 'improving' ? '↗️' : 
                       trend.trend_direction === 'stable' ? '→' : '↘️';
      response += `• ${trend.metric}: ${trendIcon} ${trend.trend_direction} (${trend.time_period})\n`;
    });

    response += `\n**What This Means:**
Your progress shows a pattern of growth and learning. Even in areas that feel challenging, you're building skills and resilience that will serve you long-term.

`;

    return response;
  }

  private provideGoalGuidance(goals: GoalProgress[], context: Record<string, any>): string {
    let response = `\n**Goal-Focused Next Steps:**\n`;

    if (goals.length > 0) {
      const currentGoal = goals[0]; // Focus on primary goal
      
      response += `**For your current goal (${currentGoal.goal_description}):**\n`;
      
      if (currentGoal.next_steps.length > 0) {
        response += `**Recommended next steps:**\n`;
        currentGoal.next_steps.forEach(step => {
          response += `• ${step}\n`;
        });
      }

      if (currentGoal.progress_percentage >= 80) {
        response += `\n🎉 **Congratulations!** You're very close to achieving this goal. Consider:
• Planning how to maintain these gains
• Setting a new complementary goal
• Celebrating this significant achievement

`;
      } else if (currentGoal.progress_percentage >= 50) {
        response += `\n**You're making solid progress!** Focus on:
• Continuing what's working
• Addressing identified barriers
• Building on your momentum

`;
      } else {
        response += `\n**Building momentum:** 
• Break down remaining steps into smaller actions
• Celebrate each milestone along the way
• Adjust timeline if needed - progress matters more than speed

`;
      }
    }

    response += `**Goal-Setting Tips:**
• **SMART goals** - Specific, Measurable, Achievable, Relevant, Time-bound
• **Cultural fit** - Goals should align with your values and cultural background
• **Balance** - Include both symptom reduction and life enhancement goals
• **Flexibility** - Be willing to adjust goals as you grow and change

`;

    return response;
  }

  private suggestNextSteps(trends: ProgressTrend[], context: Record<string, any>): string {
    let response = `\n**Moving Forward:**\n`;

    const improvingAreas = trends.filter(t => t.trend_direction === 'improving');
    const stableAreas = trends.filter(t => t.trend_direction === 'stable');
    const decliningAreas = trends.filter(t => t.trend_direction === 'declining');

    if (improvingAreas.length > 0) {
      response += `**Building on strengths:**
• Continue strategies that are working in: ${improvingAreas.map(a => a.metric).join(', ')}
• Apply successful approaches to other areas of your life
• Consider mentoring others or sharing your progress story

`;
    }

    if (stableAreas.length > 0) {
      response += `**Maintaining stability:**
• Keep up consistent practices in: ${stableAreas.map(a => a.metric).join(', ')}
• Explore if you're ready for new challenges in these areas
• Appreciate the achievement of stability

`;
    }

    if (decliningAreas.length > 0) {
      response += `**Areas needing attention:**
• Let's develop specific strategies for: ${decliningAreas.map(a => a.metric).join(', ')}
• Consider if external stressors are affecting these areas
• Adjust intervention approaches as needed

`;
    }

    response += `**Progress Monitoring Plan:**
• **Weekly check-ins** - Brief self-assessment of mood, goals, and challenges
• **Monthly reviews** - Comprehensive progress evaluation with goal adjustments
• **Milestone celebrations** - Acknowledge achievements, both big and small
• **Course corrections** - Flexibility to adjust approaches based on what you're learning

Remember: Progress is not perfection. Every step forward, no matter how small, is meaningful growth.`;

    return response;
  }
}