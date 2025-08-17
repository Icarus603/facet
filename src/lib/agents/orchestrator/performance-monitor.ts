/**
 * FACET Performance Monitor
 * 
 * Tracks and ensures SLA compliance for agent orchestration
 * Target SLAs from SPECS.md lines 728-734:
 * - Simple Check-in: <1.5s
 * - Emotional Support: <3.0s  
 * - Crisis Situation: <2.0s
 * - Deep Therapy: <8.0s
 */

export interface SLATarget {
  scenario: 'simple' | 'emotional' | 'crisis' | 'therapy'
  maxTimeMs: number
  description: string
}

export interface PerformanceMetrics {
  messageId: string
  scenario: string
  startTime: number
  endTime: number
  totalTimeMs: number
  slaTargetMs: number
  slaCompliant: boolean
  agentTimings: Array<{
    agentName: string
    startMs: number
    durationMs: number
    slaContribution: number
  }>
  orchestrationOverheadMs: number
  optimizationApplied: string[]
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  
  private slaTargets: Record<string, SLATarget> = {
    simple: {
      scenario: 'simple',
      maxTimeMs: 1500,
      description: 'Simple Check-in - Single agent response'
    },
    emotional: {
      scenario: 'emotional',
      maxTimeMs: 3000,
      description: 'Emotional Support - Multi-agent parallel processing'
    },
    crisis: {
      scenario: 'crisis',
      maxTimeMs: 2000,
      description: 'Crisis Situation - Priority parallel execution'
    },
    therapy: {
      scenario: 'therapy',
      maxTimeMs: 8000,
      description: 'Deep Therapy - Comprehensive hybrid execution'
    }
  }

  private performanceHistory: PerformanceMetrics[] = []
  private activeMonitors = new Map<string, PerformanceMetrics>()

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Start monitoring a message processing session
   */
  startMonitoring(messageId: string, scenario: string): void {
    const slaTarget = this.slaTargets[scenario] || this.slaTargets.emotional
    
    const metrics: PerformanceMetrics = {
      messageId,
      scenario,
      startTime: Date.now(),
      endTime: 0,
      totalTimeMs: 0,
      slaTargetMs: slaTarget.maxTimeMs,
      slaCompliant: false,
      agentTimings: [],
      orchestrationOverheadMs: 0,
      optimizationApplied: []
    }

    this.activeMonitors.set(messageId, metrics)
  }

  /**
   * Record agent execution timing
   */
  recordAgentExecution(
    messageId: string,
    agentName: string,
    startMs: number,
    durationMs: number
  ): void {
    const metrics = this.activeMonitors.get(messageId)
    if (!metrics) return

    metrics.agentTimings.push({
      agentName,
      startMs: startMs - metrics.startTime,
      durationMs,
      slaContribution: (durationMs / metrics.slaTargetMs) * 100
    })
  }

  /**
   * Record optimization applied
   */
  recordOptimization(messageId: string, optimization: string): void {
    const metrics = this.activeMonitors.get(messageId)
    if (!metrics) return

    metrics.optimizationApplied.push(optimization)
  }

  /**
   * Complete monitoring and assess SLA compliance
   */
  completeMonitoring(messageId: string): PerformanceMetrics | null {
    const metrics = this.activeMonitors.get(messageId)
    if (!metrics) return null

    metrics.endTime = Date.now()
    metrics.totalTimeMs = metrics.endTime - metrics.startTime
    metrics.slaCompliant = metrics.totalTimeMs <= metrics.slaTargetMs

    // Calculate orchestration overhead
    const totalAgentTime = metrics.agentTimings.reduce((sum, timing) => sum + timing.durationMs, 0)
    metrics.orchestrationOverheadMs = Math.max(0, metrics.totalTimeMs - totalAgentTime)

    // Store in history
    this.performanceHistory.push({ ...metrics })
    
    // Keep only last 1000 records
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000)
    }

    // Clean up active monitor
    this.activeMonitors.delete(messageId)

    // Log SLA violations for monitoring
    if (!metrics.slaCompliant) {
      console.warn(`SLA VIOLATION: ${messageId} took ${metrics.totalTimeMs}ms (target: ${metrics.slaTargetMs}ms)`, {
        scenario: metrics.scenario,
        agentTimings: metrics.agentTimings,
        orchestrationOverhead: metrics.orchestrationOverheadMs
      })
    }

    return metrics
  }

  /**
   * Get SLA compliance statistics
   */
  getSLAStatistics(timeframeMs: number = 24 * 60 * 60 * 1000): {
    overallCompliance: number
    scenarioCompliance: Record<string, number>
    averageResponseTimes: Record<string, number>
    violations: PerformanceMetrics[]
  } {
    const cutoffTime = Date.now() - timeframeMs
    const recentMetrics = this.performanceHistory.filter(m => m.startTime >= cutoffTime)

    if (recentMetrics.length === 0) {
      return {
        overallCompliance: 100,
        scenarioCompliance: {},
        averageResponseTimes: {},
        violations: []
      }
    }

    const violations = recentMetrics.filter(m => !m.slaCompliant)
    const overallCompliance = ((recentMetrics.length - violations.length) / recentMetrics.length) * 100

    // Calculate by scenario
    const scenarioStats = this.groupByScenario(recentMetrics)
    const scenarioCompliance: Record<string, number> = {}
    const averageResponseTimes: Record<string, number> = {}

    for (const [scenario, metrics] of Object.entries(scenarioStats)) {
      const compliant = metrics.filter(m => m.slaCompliant).length
      scenarioCompliance[scenario] = (compliant / metrics.length) * 100
      averageResponseTimes[scenario] = metrics.reduce((sum, m) => sum + m.totalTimeMs, 0) / metrics.length
    }

    return {
      overallCompliance,
      scenarioCompliance,
      averageResponseTimes,
      violations
    }
  }

  /**
   * Predict if current execution will meet SLA
   */
  predictSLACompliance(messageId: string): {
    likely: boolean
    timeRemaining: number
    recommendedActions: string[]
  } {
    const metrics = this.activeMonitors.get(messageId)
    if (!metrics) {
      return { likely: false, timeRemaining: 0, recommendedActions: ['start_monitoring'] }
    }

    const elapsedTime = Date.now() - metrics.startTime
    const timeRemaining = metrics.slaTargetMs - elapsedTime
    const likely = timeRemaining > 200 // Need at least 200ms buffer

    const recommendedActions = []
    
    if (!likely) {
      recommendedActions.push('enable_fast_path')
      if (elapsedTime > metrics.slaTargetMs * 0.8) {
        recommendedActions.push('skip_optional_agents')
      }
      if (elapsedTime > metrics.slaTargetMs * 0.9) {
        recommendedActions.push('return_fallback_response')
      }
    }

    return {
      likely,
      timeRemaining,
      recommendedActions
    }
  }

  /**
   * Get optimization recommendations based on performance history
   */
  getOptimizationRecommendations(): string[] {
    const recentMetrics = this.performanceHistory.slice(-100) // Last 100 requests
    const violations = recentMetrics.filter(m => !m.slaCompliant)
    
    if (violations.length === 0) {
      return ['performance_optimal']
    }

    const recommendations = []
    
    // Analyze common violation patterns
    const scenarioViolations = this.groupByScenario(violations)
    
    for (const [scenario, metrics] of Object.entries(scenarioViolations)) {
      const avgOvertime = metrics.reduce((sum, m) => sum + (m.totalTimeMs - m.slaTargetMs), 0) / metrics.length
      
      if (avgOvertime > 1000) {
        recommendations.push(`optimize_${scenario}_scenario`)
      }
      
      // Check if orchestration overhead is the problem
      const avgOverhead = metrics.reduce((sum, m) => sum + m.orchestrationOverheadMs, 0) / metrics.length
      if (avgOverhead > 500) {
        recommendations.push('reduce_orchestration_overhead')
      }
      
      // Check for slow agents
      const slowAgents = this.identifySlowAgents(metrics)
      if (slowAgents.length > 0) {
        recommendations.push(`optimize_agents: ${slowAgents.join(', ')}`)
      }
    }

    return recommendations.length > 0 ? recommendations : ['investigate_performance_bottlenecks']
  }

  private groupByScenario(metrics: PerformanceMetrics[]): Record<string, PerformanceMetrics[]> {
    return metrics.reduce((groups, metric) => {
      const scenario = metric.scenario
      if (!groups[scenario]) {
        groups[scenario] = []
      }
      groups[scenario].push(metric)
      return groups
    }, {} as Record<string, PerformanceMetrics[]>)
  }

  private identifySlowAgents(metrics: PerformanceMetrics[]): string[] {
    const agentPerformance = new Map<string, number[]>()
    
    for (const metric of metrics) {
      for (const timing of metric.agentTimings) {
        if (!agentPerformance.has(timing.agentName)) {
          agentPerformance.set(timing.agentName, [])
        }
        agentPerformance.get(timing.agentName)!.push(timing.durationMs)
      }
    }

    const slowAgents = []
    for (const [agentName, timings] of agentPerformance.entries()) {
      const avgTime = timings.reduce((sum, time) => sum + time, 0) / timings.length
      if (avgTime > 1000) { // More than 1s on average
        slowAgents.push(agentName)
      }
    }

    return slowAgents
  }

  /**
   * Check if system is performing within SLA targets
   */
  isSystemHealthy(): boolean {
    const stats = this.getSLAStatistics(60 * 60 * 1000) // Last hour
    return stats.overallCompliance >= 95 // 95% compliance target
  }

  /**
   * Get real-time performance dashboard data
   */
  getDashboardData(): {
    activeSessions: number
    recentCompliance: number
    averageResponseTime: number
    currentAlerts: string[]
  } {
    const stats = this.getSLAStatistics(15 * 60 * 1000) // Last 15 minutes
    const alerts = []
    
    if (stats.overallCompliance < 90) {
      alerts.push('low_sla_compliance')
    }
    
    if (this.activeMonitors.size > 10) {
      alerts.push('high_concurrent_load')
    }
    
    // Check for stuck sessions
    const now = Date.now()
    for (const [messageId, metrics] of this.activeMonitors.entries()) {
      if (now - metrics.startTime > metrics.slaTargetMs * 2) {
        alerts.push(`stuck_session_${messageId}`)
      }
    }

    return {
      activeSessions: this.activeMonitors.size,
      recentCompliance: stats.overallCompliance,
      averageResponseTime: Object.values(stats.averageResponseTimes).reduce((sum, time) => sum + time, 0) / Object.keys(stats.averageResponseTimes).length || 0,
      currentAlerts: alerts
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()