/**
 * FACET Execution Planner
 * 
 * Implements intelligent agent coordination strategies based on user context
 * Follows exact workflow patterns from SPECS.md lines 106-125
 */

import { ChatRequest } from '@/lib/types/api-contract'

export interface ExecutionPlan {
  strategy: string
  executionPattern: 'serial' | 'parallel' | 'hybrid' | 'crisis_priority'
  agentsToInvoke: string[]
  estimatedTimeMs: number
  description: string
  parallelGroups?: string[][]
  dependencies: Record<string, string[]>
}

export class ExecutionPlanner {
  /**
   * Plan execution strategy based on message analysis
   * Follows exact patterns from SPECS.md workflow examples
   */
  async planExecution(
    userMessage: string,
    userId: string,
    urgencyLevel: string = 'normal',
    userPreferences?: ChatRequest['userPreferences']
  ): Promise<ExecutionPlan> {
    
    // Crisis detection takes absolute priority (SPECS.md line 117-119)
    if (this.detectCrisisKeywords(userMessage) || urgencyLevel === 'crisis') {
      return {
        strategy: "Crisis priority - immediate safety assessment",
        executionPattern: 'crisis_priority',
        agentsToInvoke: ['crisis_monitor', 'therapy_advisor', 'memory_manager'],
        estimatedTimeMs: 6000, // Increased for proxy requests (was 1100)
        description: "Crisis Monitor → [Therapy Advisor || Memory Manager] → Professional Alert",
        parallelGroups: [['therapy_advisor', 'memory_manager']],
        dependencies: {
          'therapy_advisor': ['crisis_monitor'],
          'memory_manager': ['crisis_monitor']
        }
      }
    }

    // Analyze emotional intensity and content complexity
    const emotionalIntensity = this.analyzeEmotionalIntensity(userMessage)
    const hasProgressKeywords = this.detectProgressKeywords(userMessage)

    // Scenario 4: Progress Discussion (SPECS.md line 122-124)
    if (hasProgressKeywords) {
      return {
        strategy: "Progress focus - historical analysis needed",
        executionPattern: 'parallel',
        agentsToInvoke: ['progress_tracker', 'memory_manager', 'therapy_advisor'],
        estimatedTimeMs: 10000, // Increased for proxy requests (was 2500)
        description: "[Progress Tracker || Memory Manager] → Therapy Advisor",
        parallelGroups: [['progress_tracker', 'memory_manager']],
        dependencies: {
          'therapy_advisor': ['progress_tracker', 'memory_manager']
        }
      }
    }

    // Scenario 2: Emotional Distress (SPECS.md line 111-114)
    if (emotionalIntensity > 6 || this.detectDistressKeywords(userMessage)) {
      return {
        strategy: "High emotion + crisis keywords - parallel analysis",
        executionPattern: 'parallel',
        agentsToInvoke: ['emotion_analyzer', 'crisis_monitor', 'memory_manager', 'therapy_advisor'],
        estimatedTimeMs: 12000, // Increased for proxy requests (was 2800)
        description: "[Emotion Analyzer || Crisis Monitor || Memory Manager] → Therapy Advisor",
        parallelGroups: [['emotion_analyzer', 'crisis_monitor', 'memory_manager']],
        dependencies: {
          'therapy_advisor': ['emotion_analyzer', 'crisis_monitor', 'memory_manager']
        }
      }
    }

    // Scenario 1: Routine Check-in (SPECS.md line 107-109)
    return {
      strategy: "Simple emotional state - light analysis",
      executionPattern: 'serial',
      agentsToInvoke: ['emotion_analyzer'],
      estimatedTimeMs: 10000, // Further increased for proxy latency (was 5000)
      description: "Emotion Analyzer → Response",
      dependencies: {}
    }
  }

  /**
   * Crisis keyword detection - exact patterns for crisis scenarios
   */
  private detectCrisisKeywords(message: string): boolean {
    const crisisPatterns = [
      'want to end it all',
      'hurt myself',
      'kill myself',
      'suicide',
      'want to die',
      'end my life',
      'no point in living',
      'better off dead'
    ]
    
    const lowerMessage = message.toLowerCase()
    return crisisPatterns.some(pattern => lowerMessage.includes(pattern))
  }

  /**
   * Progress-related keyword detection
   */
  private detectProgressKeywords(message: string): boolean {
    const progressPatterns = [
      'been working on',
      'making progress',
      'goals',
      'exercises you suggested',
      'techniques',
      'getting better',
      'improvement'
    ]
    
    const lowerMessage = message.toLowerCase()
    return progressPatterns.some(pattern => lowerMessage.includes(pattern))
  }

  /**
   * Emotional distress keyword detection
   */
  private detectDistressKeywords(message: string): boolean {
    const distressPatterns = [
      "can't stop crying",
      'feels hopeless',
      'overwhelming',
      'breaking down',
      'falling apart',
      'can\'t cope',
      'too much'
    ]
    
    const lowerMessage = message.toLowerCase()
    return distressPatterns.some(pattern => lowerMessage.includes(pattern))
  }

  /**
   * Analyze emotional intensity from message content
   */
  private analyzeEmotionalIntensity(message: string): number {
    let intensity = 3 // baseline

    // High intensity indicators
    const highIntensityWords = ['extremely', 'completely', 'totally', 'absolutely', 'devastating', 'overwhelming']
    const moderateIntensityWords = ['very', 'really', 'quite', 'pretty', 'somewhat']
    const lowIntensityWords = ['a bit', 'slightly', 'maybe', 'kind of']

    const lowerMessage = message.toLowerCase()

    if (highIntensityWords.some(word => lowerMessage.includes(word))) {
      intensity += 4
    } else if (moderateIntensityWords.some(word => lowerMessage.includes(word))) {
      intensity += 2
    } else if (lowIntensityWords.some(word => lowerMessage.includes(word))) {
      intensity -= 1
    }

    // Emotional words
    const strongEmotionalWords = ['devastated', 'terrified', 'hopeless', 'desperate', 'furious']
    const moderateEmotionalWords = ['sad', 'angry', 'worried', 'stressed', 'upset']

    if (strongEmotionalWords.some(word => lowerMessage.includes(word))) {
      intensity += 3
    } else if (moderateEmotionalWords.some(word => lowerMessage.includes(word))) {
      intensity += 1
    }

    return Math.min(Math.max(intensity, 1), 10)
  }

  /**
   * Determine timeout based on execution plan and user preferences
   */
  getTimeoutForPlan(plan: ExecutionPlan, userPreferences?: ChatRequest['userPreferences']): number {
    const baseTimeout = plan.estimatedTimeMs

    if (plan.executionPattern === 'crisis_priority') {
      return 10000 // Increased for proxy requests (was 2000)
    }

    const speed = userPreferences?.processingSpeed || 'thorough'
    
    switch (speed) {
      case 'fast':
        return Math.min(baseTimeout * 0.7, 8000) // Increased for proxy (was 1500)
      case 'thorough':
        return Math.min(baseTimeout * 1.3, 20000) // Increased for proxy (was 8000)
      default:
        return baseTimeout
    }
  }

  /**
   * Estimate completion time for real-time updates
   */
  estimateRemainingTime(plan: ExecutionPlan, completedAgents: string[]): number {
    const totalAgents = plan.agentsToInvoke.length
    const remainingAgents = totalAgents - completedAgents.length
    
    if (remainingAgents === 0) return 0

    const avgTimePerAgent = plan.estimatedTimeMs / totalAgents
    return remainingAgents * avgTimePerAgent
  }

  /**
   * Determine if agents can run in parallel based on dependencies
   */
  canRunInParallel(agentName: string, plan: ExecutionPlan, completedAgents: string[]): boolean {
    const dependencies = plan.dependencies[agentName] || []
    return dependencies.every(dep => completedAgents.includes(dep))
  }
}