/**
 * FACET Progress Tracker Agent
 * 
 * Therapeutic progress monitoring and goal tracking
 * Implements exact AgentExecutionResult format from API_CONTRACT.md
 */

import { AgentExecutionResult, AGENT_NAMES, AGENT_CONFIG } from '@/lib/types/api-contract'

export interface ProgressAnalysis {
  progressSummary: ProgressSummary
  goalUpdates: GoalUpdate[]
  milestones: Milestone[]
  insights: ProgressInsight[]
  recommendations: string[]
  confidence: number
  reasoning: string
  trendsIdentified: ProgressTrend[]
  nextSteps: string[]
}

export interface ProgressSummary {
  overallDirection: 'significant_improvement' | 'moderate_improvement' | 'stable' | 'some_decline' | 'significant_decline'
  timeframe: string
  confidenceLevel: number
  keyIndicators: string[]
  areasOfProgress: string[]
  areasOfConcern: string[]
}

export interface GoalUpdate {
  goalId: string
  goalDescription: string
  currentStatus: 'not_started' | 'in_progress' | 'partially_completed' | 'completed' | 'paused' | 'discontinued'
  progressPercentage: number
  lastUpdate: string
  milestonesAchieved: string[]
  challengesFaced: string[]
  nextActions: string[]
}

export interface Milestone {
  id: string
  description: string
  category: 'emotional_regulation' | 'behavioral_change' | 'cognitive_shift' | 'interpersonal_skills' | 'coping_strategies'
  achievedDate: string
  significance: 'minor' | 'moderate' | 'major' | 'breakthrough'
  evidence: string[]
  impact: string
}

export interface ProgressInsight {
  type: 'strength_identified' | 'pattern_recognition' | 'growth_area' | 'breakthrough_moment' | 'setback_learning'
  description: string
  supportingEvidence: string[]
  implications: string[]
  actionableSteps: string[]
}

export interface ProgressTrend {
  metric: string
  direction: 'improving' | 'stable' | 'declining'
  timeframe: string
  confidence: number
  factors: string[]
}

export class ProgressTracker {
  // Simulated user progress data - in production this would connect to database
  private userGoals: Map<string, GoalUpdate[]> = new Map()
  private userMilestones: Map<string, Milestone[]> = new Map()
  private progressHistory: Map<string, any[]> = new Map()

  /**
   * Analyze therapeutic progress and goal advancement
   */
  async analyzeProgress(
    message: string,
    userId: string,
    startTimeMs: number,
    emotionalState?: { valence: number, arousal: number, dominance: number },
    memoryContext?: any,
    assignedTask: string = 'Analyze therapeutic progress and update goals'
  ): Promise<AgentExecutionResult> {
    const agentStart = Date.now()
    
    try {
      const progressAnalysis = await this.performProgressAnalysis(message, userId, emotionalState, memoryContext)
      const executionTimeMs = Date.now() - agentStart

      return {
        agentName: AGENT_NAMES.PROGRESS_TRACKER,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.PROGRESS_TRACKER].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.PROGRESS_TRACKER].icon,
        assignedTask,
        inputData: { message, userId, emotionalState, memoryContext },
        executionTimeMs,
        executionType: 'serial',
        startTimeMs: agentStart - startTimeMs,
        endTimeMs: (agentStart - startTimeMs) + executionTimeMs,
        result: progressAnalysis,
        confidence: progressAnalysis.confidence,
        success: true,
        reasoning: progressAnalysis.reasoning,
        keyInsights: this.generateKeyInsights(progressAnalysis),
        recommendationsToOrchestrator: progressAnalysis.recommendations,
        influenceOnFinalResponse: this.calculateInfluence(progressAnalysis),
        contributedInsights: this.generateContributedInsights(progressAnalysis)
      }
    } catch (error) {
      const executionTimeMs = Date.now() - agentStart
      
      return {
        agentName: AGENT_NAMES.PROGRESS_TRACKER,
        agentDisplayName: AGENT_CONFIG[AGENT_NAMES.PROGRESS_TRACKER].displayName,
        agentIcon: AGENT_CONFIG[AGENT_NAMES.PROGRESS_TRACKER].icon,
        assignedTask,
        inputData: { message, userId },
        executionTimeMs,
        executionType: 'serial',
        startTimeMs: agentStart - startTimeMs,
        endTimeMs: (agentStart - startTimeMs) + executionTimeMs,
        result: null,
        confidence: 0.0,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        reasoning: 'Failed to analyze therapeutic progress',
        keyInsights: [],
        recommendationsToOrchestrator: ['proceed_without_progress_analysis'],
        influenceOnFinalResponse: 0.2,
        contributedInsights: ['Progress analysis unavailable']
      }
    }
  }

  private async performProgressAnalysis(
    message: string,
    userId: string,
    emotionalState?: any,
    memoryContext?: any
  ): Promise<ProgressAnalysis> {
    // 1. Get current goals and progress data
    const currentGoals = this.getUserGoals(userId)
    const milestones = this.getUserMilestones(userId)
    const progressHistory = this.getProgressHistory(userId)
    
    // 2. Analyze message for progress indicators
    const progressIndicators = this.extractProgressIndicators(message)
    
    // 3. Update goals based on current message
    const goalUpdates = this.updateGoalsFromMessage(message, currentGoals, progressIndicators)
    
    // 4. Identify new milestones
    const newMilestones = this.identifyNewMilestones(message, emotionalState, progressIndicators)
    
    // 5. Generate progress summary
    const progressSummary = this.generateProgressSummary(goalUpdates, milestones, progressHistory, emotionalState)
    
    // 6. Extract insights from progress patterns
    const insights = this.extractProgressInsights(progressSummary, goalUpdates, memoryContext)
    
    // 7. Identify trends
    const trendsIdentified = this.identifyProgressTrends(progressHistory, emotionalState)
    
    // 8. Generate recommendations
    const recommendations = this.generateProgressRecommendations(progressSummary, insights, trendsIdentified)
    
    // 9. Calculate confidence
    const confidence = this.calculateProgressConfidence(progressSummary, goalUpdates, insights)
    
    // 10. Generate reasoning
    const reasoning = this.generateProgressReasoning(progressSummary, goalUpdates, insights, confidence)
    
    // 11. Suggest next steps
    const nextSteps = this.generateNextSteps(progressSummary, goalUpdates, insights)

    return {
      progressSummary,
      goalUpdates,
      milestones: [...milestones, ...newMilestones],
      insights,
      recommendations,
      confidence,
      reasoning,
      trendsIdentified,
      nextSteps
    }
  }

  private extractProgressIndicators(message: string): any {
    const lowerMessage = message.toLowerCase()
    
    const positiveIndicators = [
      'better', 'improved', 'progress', 'successful', 'accomplished', 'achieved', 
      'working', 'helping', 'easier', 'stronger', 'confident', 'proud'
    ]
    
    const negativeIndicators = [
      'worse', 'difficult', 'struggling', 'failed', 'setback', 'hard', 
      'challenging', 'overwhelming', 'stuck', 'frustrated'
    ]
    
    const goalKeywords = [
      'goal', 'working on', 'trying to', 'want to', 'practice', 'exercise', 
      'therapy', 'meditation', 'breathing', 'journaling'
    ]
    
    return {
      positive: positiveIndicators.filter(indicator => lowerMessage.includes(indicator)),
      negative: negativeIndicators.filter(indicator => lowerMessage.includes(indicator)),
      goalRelated: goalKeywords.filter(keyword => lowerMessage.includes(keyword)),
      timeReferences: this.extractTimeReferences(lowerMessage),
      quantifiers: this.extractQuantifiers(lowerMessage)
    }
  }

  private extractTimeReferences(message: string): string[] {
    const timeWords = ['today', 'yesterday', 'week', 'month', 'recently', 'lately', 'since', 'during']
    return timeWords.filter(word => message.includes(word))
  }

  private extractQuantifiers(message: string): string[] {
    const quantifiers = ['more', 'less', 'often', 'sometimes', 'always', 'never', 'frequently', 'rarely']
    return quantifiers.filter(word => message.includes(word))
  }

  private getUserGoals(userId: string): GoalUpdate[] {
    if (!this.userGoals.has(userId)) {
      // Initialize with default goals for new users
      this.userGoals.set(userId, [
        {
          goalId: 'emotional_regulation',
          goalDescription: 'Improve emotional regulation and coping strategies',
          currentStatus: 'in_progress',
          progressPercentage: 25,
          lastUpdate: new Date().toISOString(),
          milestonesAchieved: [],
          challengesFaced: [],
          nextActions: ['Practice breathing exercises', 'Use grounding techniques']
        },
        {
          goalId: 'self_awareness',
          goalDescription: 'Increase self-awareness and emotional intelligence',
          currentStatus: 'in_progress',
          progressPercentage: 15,
          lastUpdate: new Date().toISOString(),
          milestonesAchieved: [],
          challengesFaced: [],
          nextActions: ['Journal daily emotions', 'Practice mindfulness']
        }
      ])
    }
    
    return this.userGoals.get(userId)!
  }

  private getUserMilestones(userId: string): Milestone[] {
    if (!this.userMilestones.has(userId)) {
      this.userMilestones.set(userId, [])
    }
    
    return this.userMilestones.get(userId)!
  }

  private getProgressHistory(userId: string): any[] {
    if (!this.progressHistory.has(userId)) {
      this.progressHistory.set(userId, [])
    }
    
    return this.progressHistory.get(userId)!
  }

  private updateGoalsFromMessage(
    message: string,
    currentGoals: GoalUpdate[],
    indicators: any
  ): GoalUpdate[] {
    const updatedGoals = [...currentGoals]
    
    // Update progress based on positive indicators
    if (indicators.positive.length > 0) {
      updatedGoals.forEach(goal => {
        if (goal.currentStatus === 'in_progress') {
          // Increase progress by 5-10% for positive indicators
          const progressIncrease = Math.min(indicators.positive.length * 5, 10)
          goal.progressPercentage = Math.min(goal.progressPercentage + progressIncrease, 100)
          goal.lastUpdate = new Date().toISOString()
          
          if (indicators.goalRelated.length > 0) {
            goal.milestonesAchieved.push(`Progress noted: ${indicators.positive.join(', ')}`)
          }
        }
      })
    }
    
    // Note challenges from negative indicators
    if (indicators.negative.length > 0) {
      updatedGoals.forEach(goal => {
        if (goal.currentStatus === 'in_progress') {
          goal.challengesFaced.push(`Challenges noted: ${indicators.negative.join(', ')}`)
          goal.lastUpdate = new Date().toISOString()
        }
      })
    }
    
    // Add new goals if mentioned
    if (message.toLowerCase().includes('new goal') || message.toLowerCase().includes('want to work on')) {
      const newGoal: GoalUpdate = {
        goalId: `goal_${Date.now()}`,
        goalDescription: this.extractNewGoalFromMessage(message),
        currentStatus: 'in_progress',
        progressPercentage: 0,
        lastUpdate: new Date().toISOString(),
        milestonesAchieved: [],
        challengesFaced: [],
        nextActions: ['Define specific action steps', 'Set measurable milestones']
      }
      updatedGoals.push(newGoal)
    }
    
    return updatedGoals
  }

  private extractNewGoalFromMessage(message: string): string {
    // Simplified goal extraction - in production this would be more sophisticated
    const goalPhrases = [
      'work on', 'improve', 'practice', 'learn', 'develop', 'manage', 'control', 'reduce'
    ]
    
    for (const phrase of goalPhrases) {
      const index = message.toLowerCase().indexOf(phrase)
      if (index !== -1) {
        const afterPhrase = message.substring(index + phrase.length).trim()
        return `${phrase} ${afterPhrase.split('.')[0].substring(0, 50)}...`
      }
    }
    
    return 'Explore and develop new coping strategies'
  }

  private identifyNewMilestones(
    message: string,
    emotionalState?: any,
    indicators?: any
  ): Milestone[] {
    const milestones: Milestone[] = []
    const lowerMessage = message.toLowerCase()
    
    // Emotional regulation milestones
    if (indicators.positive.includes('calm') || indicators.positive.includes('peaceful')) {
      milestones.push({
        id: `milestone_${Date.now()}`,
        description: 'Achieved emotional regulation in challenging situation',
        category: 'emotional_regulation',
        achievedDate: new Date().toISOString(),
        significance: 'moderate',
        evidence: ['User reported feeling calm/peaceful'],
        impact: 'Demonstrates developing emotional self-regulation skills'
      })
    }
    
    // Behavioral change milestones
    if (lowerMessage.includes('practiced') || lowerMessage.includes('tried')) {
      milestones.push({
        id: `milestone_${Date.now()}_behavior`,
        description: 'Actively practiced new coping strategy',
        category: 'behavioral_change',
        achievedDate: new Date().toISOString(),
        significance: 'minor',
        evidence: ['User engaged in deliberate practice'],
        impact: 'Shows commitment to therapeutic process and behavioral change'
      })
    }
    
    // Cognitive shift milestones
    if (lowerMessage.includes('realized') || lowerMessage.includes('understand')) {
      milestones.push({
        id: `milestone_${Date.now()}_cognitive`,
        description: 'Gained new insight or understanding',
        category: 'cognitive_shift',
        achievedDate: new Date().toISOString(),
        significance: 'moderate',
        evidence: ['User expressed new realization or understanding'],
        impact: 'Indicates cognitive flexibility and growing self-awareness'
      })
    }
    
    return milestones
  }

  private generateProgressSummary(
    goalUpdates: GoalUpdate[],
    milestones: Milestone[],
    history: any[],
    emotionalState?: any
  ): ProgressSummary {
    // Calculate overall direction
    const activeGoals = goalUpdates.filter(g => g.currentStatus === 'in_progress')
    const avgProgress = activeGoals.reduce((sum, g) => sum + g.progressPercentage, 0) / activeGoals.length || 0
    
    let overallDirection: ProgressSummary['overallDirection']
    if (avgProgress > 70) {
      overallDirection = 'significant_improvement'
    } else if (avgProgress > 40) {
      overallDirection = 'moderate_improvement'
    } else if (avgProgress > 20) {
      overallDirection = 'stable'
    } else {
      overallDirection = 'some_decline'
    }
    
    // Identify areas of progress and concern
    const areasOfProgress = goalUpdates
      .filter(g => g.progressPercentage > 50)
      .map(g => g.goalDescription)
    
    const areasOfConcern = goalUpdates
      .filter(g => g.challengesFaced.length > g.milestonesAchieved.length)
      .map(g => g.goalDescription)
    
    return {
      overallDirection,
      timeframe: 'Recent sessions',
      confidenceLevel: 0.75,
      keyIndicators: [
        `${activeGoals.length} active goals`,
        `${milestones.length} milestones achieved`,
        `${avgProgress.toFixed(0)}% average progress`
      ],
      areasOfProgress,
      areasOfConcern
    }
  }

  private extractProgressInsights(
    summary: ProgressSummary,
    goalUpdates: GoalUpdate[],
    memoryContext?: any
  ): ProgressInsight[] {
    const insights: ProgressInsight[] = []
    
    // Strength identification
    const goalsWithProgress = goalUpdates.filter(g => g.progressPercentage > 30)
    if (goalsWithProgress.length > 0) {
      insights.push({
        type: 'strength_identified',
        description: 'Consistent engagement with therapeutic goals demonstrates resilience',
        supportingEvidence: goalsWithProgress.map(g => `Progress in: ${g.goalDescription}`),
        implications: ['User shows commitment to change', 'Therapeutic alliance is strong'],
        actionableSteps: ['Continue reinforcing successful strategies', 'Build on existing strengths']
      })
    }
    
    // Pattern recognition
    if (summary.overallDirection === 'moderate_improvement' || summary.overallDirection === 'significant_improvement') {
      insights.push({
        type: 'pattern_recognition',
        description: 'Positive trajectory across multiple therapeutic domains',
        supportingEvidence: [`Overall direction: ${summary.overallDirection}`, ...summary.areasOfProgress],
        implications: ['Current approach is effective', 'User is developing coping skills'],
        actionableSteps: ['Maintain current strategies', 'Gradually increase challenge level']
      })
    }
    
    // Growth areas
    if (summary.areasOfConcern.length > 0) {
      insights.push({
        type: 'growth_area',
        description: 'Identified areas requiring additional focus and support',
        supportingEvidence: summary.areasOfConcern,
        implications: ['Some goals may need strategy adjustment', 'Additional support resources may help'],
        actionableSteps: ['Review and modify approach for challenging goals', 'Provide additional coping tools']
      })
    }
    
    return insights
  }

  private identifyProgressTrends(history: any[], emotionalState?: any): ProgressTrend[] {
    const trends: ProgressTrend[] = []
    
    // Simplified trend analysis - in production this would analyze actual historical data
    if (emotionalState) {
      if (emotionalState.valence > 0) {
        trends.push({
          metric: 'Emotional Valence',
          direction: 'improving',
          timeframe: 'Recent sessions',
          confidence: 0.7,
          factors: ['Increased positive emotional expression', 'Active engagement in therapeutic process']
        })
      }
      
      if (emotionalState.dominance > 0.5) {
        trends.push({
          metric: 'Sense of Control',
          direction: 'improving',
          timeframe: 'Recent sessions',
          confidence: 0.6,
          factors: ['Increased emotional dominance scores', 'Growing confidence in coping abilities']
        })
      }
    }
    
    return trends
  }

  private generateProgressRecommendations(
    summary: ProgressSummary,
    insights: ProgressInsight[],
    trends: ProgressTrend[]
  ): string[] {
    const recommendations = []
    
    if (summary.overallDirection === 'significant_improvement') {
      recommendations.push('acknowledge_progress', 'celebrate_achievements', 'set_next_level_goals')
    } else if (summary.overallDirection === 'moderate_improvement') {
      recommendations.push('reinforce_positive_changes', 'maintain_momentum', 'identify_next_steps')
    } else if (summary.overallDirection === 'stable') {
      recommendations.push('reassess_goals', 'adjust_strategies', 'explore_barriers')
    } else {
      recommendations.push('provide_additional_support', 'reassess_approach', 'focus_on_stabilization')
    }
    
    // Insight-based recommendations
    const strengthInsights = insights.filter(i => i.type === 'strength_identified')
    if (strengthInsights.length > 0) {
      recommendations.push('build_on_strengths')
    }
    
    const growthInsights = insights.filter(i => i.type === 'growth_area')
    if (growthInsights.length > 0) {
      recommendations.push('address_growth_areas')
    }
    
    return recommendations
  }

  private calculateProgressConfidence(
    summary: ProgressSummary,
    goalUpdates: GoalUpdate[],
    insights: ProgressInsight[]
  ): number {
    let confidence = 0.5 // Base confidence
    
    // Active goals increase confidence
    const activeGoals = goalUpdates.filter(g => g.currentStatus === 'in_progress')
    confidence += Math.min(activeGoals.length * 0.1, 0.3)
    
    // Progress percentage affects confidence
    const avgProgress = activeGoals.reduce((sum, g) => sum + g.progressPercentage, 0) / activeGoals.length || 0
    confidence += (avgProgress / 100) * 0.3
    
    // Clear direction increases confidence
    if (summary.overallDirection !== 'stable') {
      confidence += 0.1
    }
    
    // Insights provide additional confidence
    confidence += Math.min(insights.length * 0.05, 0.15)
    
    return Math.max(0.3, Math.min(1.0, confidence))
  }

  private generateProgressReasoning(
    summary: ProgressSummary,
    goalUpdates: GoalUpdate[],
    insights: ProgressInsight[],
    confidence: number
  ): string {
    const activeGoals = goalUpdates.filter(g => g.currentStatus === 'in_progress')
    
    let reasoning = `Progress analysis based on ${activeGoals.length} active therapeutic goals. `
    reasoning += `Overall direction: ${summary.overallDirection.replace('_', ' ')}. `
    
    if (summary.areasOfProgress.length > 0) {
      reasoning += `Progress evident in: ${summary.areasOfProgress.length} areas. `
    }
    
    if (insights.length > 0) {
      reasoning += `${insights.length} therapeutic insights identified. `
    }
    
    reasoning += `Progress tracking confidence: ${(confidence * 100).toFixed(0)}%`
    
    return reasoning
  }

  private generateNextSteps(
    summary: ProgressSummary,
    goalUpdates: GoalUpdate[],
    insights: ProgressInsight[]
  ): string[] {
    const nextSteps = []
    
    // Goal-specific next steps
    goalUpdates.forEach(goal => {
      if (goal.nextActions.length > 0) {
        nextSteps.push(`${goal.goalDescription}: ${goal.nextActions[0]}`)
      }
    })
    
    // Insight-based next steps
    insights.forEach(insight => {
      if (insight.actionableSteps.length > 0) {
        nextSteps.push(insight.actionableSteps[0])
      }
    })
    
    // Direction-based next steps
    if (summary.overallDirection === 'significant_improvement') {
      nextSteps.push('Consider advancing to more challenging therapeutic goals')
    } else if (summary.overallDirection === 'some_decline') {
      nextSteps.push('Focus on stabilization and additional support resources')
    }
    
    return nextSteps.slice(0, 5) // Limit to top 5 next steps
  }

  private generateKeyInsights(analysis: ProgressAnalysis): string[] {
    const insights = []
    
    insights.push(`Overall progress direction: ${analysis.progressSummary.overallDirection.replace('_', ' ')}`)
    
    if (analysis.goalUpdates.length > 0) {
      const inProgressGoals = analysis.goalUpdates.filter(g => g.currentStatus === 'in_progress')
      insights.push(`${inProgressGoals.length} active therapeutic goals being tracked`)
    }
    
    if (analysis.milestones.length > 0) {
      const recentMilestones = analysis.milestones.filter(m => {
        const daysSince = (Date.now() - new Date(m.achievedDate).getTime()) / (1000 * 60 * 60 * 24)
        return daysSince < 30
      })
      insights.push(`${recentMilestones.length} recent milestones achieved`)
    }
    
    if (analysis.trendsIdentified.length > 0) {
      const improvingTrends = analysis.trendsIdentified.filter(t => t.direction === 'improving')
      if (improvingTrends.length > 0) {
        insights.push(`${improvingTrends.length} positive trends identified`)
      }
    }
    
    return insights
  }

  private generateContributedInsights(analysis: ProgressAnalysis): string[] {
    const insights = []
    
    insights.push(`Progress status: ${analysis.progressSummary.overallDirection.replace('_', ' ')}`)
    
    if (analysis.goalUpdates.length > 0) {
      const avgProgress = analysis.goalUpdates.reduce((sum, g) => sum + g.progressPercentage, 0) / analysis.goalUpdates.length
      insights.push(`Average goal progress: ${avgProgress.toFixed(0)}%`)
    }
    
    if (analysis.insights.length > 0) {
      const insightTypes = analysis.insights.map(i => i.type.replace('_', ' ')).join(', ')
      insights.push(`Therapeutic insights: ${insightTypes}`)
    }
    
    if (analysis.nextSteps.length > 0) {
      insights.push(`${analysis.nextSteps.length} recommended next steps identified`)
    }
    
    return insights
  }

  private calculateInfluence(analysis: ProgressAnalysis): number {
    let influence = 0.4 // Base influence
    
    // Strong progress increases influence
    if (analysis.progressSummary.overallDirection === 'significant_improvement') {
      influence += 0.3
    } else if (analysis.progressSummary.overallDirection === 'moderate_improvement') {
      influence += 0.2
    }
    
    // Multiple insights increase influence
    influence += Math.min(analysis.insights.length * 0.05, 0.2)
    
    // High confidence increases influence
    if (analysis.confidence > 0.7) {
      influence += 0.1
    }
    
    return Math.max(0.2, Math.min(0.8, influence))
  }
}

// Export singleton instance
export const progressTracker = new ProgressTracker()