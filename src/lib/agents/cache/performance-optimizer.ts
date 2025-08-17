/**
 * FACET Performance Optimizer
 * 
 * Response time optimization using Redis caching and intelligent agent selection
 * Implements SPECS.md performance requirements and caching strategies
 */

import { redisCache, cacheUtils } from './redis-cache'
import { performanceMonitor } from '../orchestrator/performance-monitor'
import { AgentExecutionResult, ChatRequest } from '@/lib/types/api-contract'

export interface OptimizationStrategy {
  useCache: boolean
  skipOptionalAgents: boolean
  enableParallelExecution: boolean
  maxExecutionTime: number
  priorityAgents: string[]
  fallbackEnabled: boolean
}

export interface PerformanceOptimization {
  strategy: OptimizationStrategy
  estimatedTimeSaving: number
  cacheHitProbability: number
  recommendedActions: string[]
  reasoning: string
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer
  
  // Performance thresholds from SPECS.md
  private readonly SLA_TARGETS = {
    simple: 1500,     // <1.5s
    emotional: 3000,  // <3s  
    crisis: 2000,     // <2s
    therapy: 8000     // <8s
  }

  // Agent execution time baselines (ms)
  private readonly AGENT_BASELINES = {
    emotion_analyzer: 800,
    crisis_monitor: 600,
    memory_manager: 1200,
    therapy_advisor: 1500,
    progress_tracker: 1000
  }

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer()
    }
    return PerformanceOptimizer.instance
  }

  /**
   * Analyze request and recommend performance optimizations
   */
  async optimizeRequest(
    request: ChatRequest,
    userId: string,
    messageComplexity: 'simple' | 'emotional' | 'crisis' | 'therapy'
  ): Promise<PerformanceOptimization> {
    const contextHash = cacheUtils.generateContextHash(request.message, userId, request.userPreferences)
    const targetTime = this.SLA_TARGETS[messageComplexity]
    
    // Check cache hit probabilities
    const cacheAnalysis = await this.analyzeCacheAvailability(request, userId, contextHash)
    
    // Analyze system performance
    const systemLoad = await this.analyzeSystemLoad()
    
    // Generate optimization strategy
    const strategy = this.generateOptimizationStrategy(
      request,
      messageComplexity,
      cacheAnalysis,
      systemLoad,
      targetTime
    )
    
    // Estimate time savings
    const estimatedTimeSaving = this.calculateTimeSavings(strategy, messageComplexity)
    
    return {
      strategy,
      estimatedTimeSaving,
      cacheHitProbability: cacheAnalysis.overallHitProbability,
      recommendedActions: this.generateRecommendations(strategy, cacheAnalysis),
      reasoning: this.generateReasoningExplanation(strategy, cacheAnalysis, systemLoad)
    }
  }

  /**
   * Optimize agent execution order based on cache availability and performance
   */
  async optimizeAgentExecution(
    requiredAgents: string[],
    userId: string,
    inputData: any,
    targetTime: number
  ): Promise<{
    optimizedOrder: string[]
    parallelGroups: string[][]
    cacheable: { [agentName: string]: boolean }
    estimatedTime: number
  }> {
    const agentAnalysis = await Promise.all(
      requiredAgents.map(async (agentName) => {
        const cached = await redisCache.getCachedAgentResult(agentName, inputData, userId)
        const baselineTime = this.AGENT_BASELINES[agentName as keyof typeof this.AGENT_BASELINES] || 1000
        
        return {
          agentName,
          hasCachedResult: !!cached,
          baselineTime,
          estimatedTime: cached ? 50 : baselineTime, // Cached results are nearly instant
          cacheable: cacheUtils.shouldCacheAgentResult(agentName, inputData, {} as AgentExecutionResult)
        }
      })
    )

    // Sort by execution time (cached first, then by baseline time)
    agentAnalysis.sort((a, b) => a.estimatedTime - b.estimatedTime)
    
    // Create parallel groups for agents that can run concurrently
    const parallelGroups = this.createParallelGroups(agentAnalysis, targetTime)
    
    // Calculate total estimated time
    const estimatedTime = this.calculateParallelExecutionTime(parallelGroups, agentAnalysis)
    
    return {
      optimizedOrder: agentAnalysis.map(a => a.agentName),
      parallelGroups,
      cacheable: Object.fromEntries(agentAnalysis.map(a => [a.agentName, a.cacheable])),
      estimatedTime
    }
  }

  /**
   * Cache orchestration results for future optimization
   */
  async cacheOrchestrationResults(
    request: ChatRequest,
    userId: string,
    agentResults: AgentExecutionResult[],
    totalTime: number,
    strategy: string
  ): Promise<void> {
    const contextHash = cacheUtils.generateContextHash(request.message, userId, request.userPreferences)
    
    // Cache successful orchestration strategy
    await redisCache.cacheOrchestrationStrategy(
      contextHash,
      strategy,
      agentResults.map(r => r.agentName),
      agentResults.length > 1 ? 'parallel' : 'serial'
    )
    
    // Cache individual agent results if appropriate
    await Promise.all(
      agentResults
        .filter(result => cacheUtils.shouldCacheAgentResult(result.agentName, result.inputData, result))
        .map(result => 
          redisCache.cacheAgentResult(
            result.agentName,
            result.inputData,
            result,
            userId,
            this.calculateCacheTTL(result)
          )
        )
    )
    
    // Update performance metrics
    await this.updatePerformanceMetrics(request, agentResults, totalTime)
  }

  /**
   * Get performance recommendations for system optimization
   */
  async getSystemPerformanceRecommendations(): Promise<{
    cacheEfficiency: number
    systemRecommendations: string[]
    agentOptimizations: { [agentName: string]: string[] }
    criticalIssues: string[]
  }> {
    const cacheStats = await redisCache.getCacheStats()
    const performanceStats = performanceMonitor.getSLAStatistics()
    
    const cacheEfficiency = this.calculateCacheEfficiency(cacheStats)
    const systemRecommendations = this.generateSystemRecommendations(cacheStats, performanceStats)
    const agentOptimizations = this.generateAgentOptimizations(performanceStats)
    const criticalIssues = this.identifyCriticalIssues(cacheStats, performanceStats)
    
    return {
      cacheEfficiency,
      systemRecommendations,
      agentOptimizations,
      criticalIssues
    }
  }

  // Private implementation methods

  private async analyzeCacheAvailability(
    request: ChatRequest,
    userId: string,
    contextHash: string
  ): Promise<{
    orchestrationCached: boolean
    agentCacheHits: { [agentName: string]: boolean }
    overallHitProbability: number
  }> {
    // Check if similar orchestration strategy is cached
    const cachedStrategy = await redisCache.getCachedOrchestrationStrategy(contextHash)
    const orchestrationCached = !!cachedStrategy
    
    // Check individual agent cache availability
    const commonAgents = ['emotion_analyzer', 'memory_manager', 'therapy_advisor']
    const agentCacheChecks = await Promise.all(
      commonAgents.map(async (agentName) => {
        const cached = await redisCache.getCachedAgentResult(agentName, { message: request.message }, userId)
        return { agentName, cached: !!cached }
      })
    )
    
    const agentCacheHits = Object.fromEntries(agentCacheChecks.map(a => [a.agentName, a.cached]))
    const hitCount = agentCacheChecks.filter(a => a.cached).length
    const overallHitProbability = hitCount / commonAgents.length
    
    return {
      orchestrationCached,
      agentCacheHits,
      overallHitProbability
    }
  }

  private async analyzeSystemLoad(): Promise<{
    activeRequests: number
    systemHealthy: boolean
    averageResponseTime: number
    errorRate: number
  }> {
    const dashboardData = performanceMonitor.getDashboardData()
    const healthCheck = await redisCache.healthCheck()
    
    return {
      activeRequests: dashboardData.activeSessions,
      systemHealthy: healthCheck.connected && dashboardData.recentCompliance > 90,
      averageResponseTime: dashboardData.averageResponseTime,
      errorRate: 100 - dashboardData.recentCompliance
    }
  }

  private generateOptimizationStrategy(
    request: ChatRequest,
    complexity: 'simple' | 'emotional' | 'crisis' | 'therapy',
    cacheAnalysis: any,
    systemLoad: any,
    targetTime: number
  ): OptimizationStrategy {
    const strategy: OptimizationStrategy = {
      useCache: true,
      skipOptionalAgents: false,
      enableParallelExecution: true,
      maxExecutionTime: targetTime,
      priorityAgents: [],
      fallbackEnabled: true
    }
    
    // Crisis handling gets highest priority
    if (complexity === 'crisis') {
      strategy.priorityAgents = ['crisis_monitor', 'therapy_advisor']
      strategy.skipOptionalAgents = true
      strategy.maxExecutionTime = Math.min(targetTime, 1800) // Even stricter for crisis
    }
    
    // Simple requests use minimal resources
    if (complexity === 'simple') {
      strategy.skipOptionalAgents = true
      strategy.priorityAgents = ['emotion_analyzer']
      strategy.enableParallelExecution = false
    }
    
    // High system load triggers aggressive optimization
    if (!systemLoad.systemHealthy || systemLoad.activeRequests > 10) {
      strategy.skipOptionalAgents = true
      strategy.maxExecutionTime = Math.min(targetTime, targetTime * 0.8)
      strategy.fallbackEnabled = true
    }
    
    // Low cache hit rate disables cache dependency
    if (cacheAnalysis.overallHitProbability < 0.3) {
      strategy.useCache = false
    }
    
    return strategy
  }

  private calculateTimeSavings(
    strategy: OptimizationStrategy,
    complexity: 'simple' | 'emotional' | 'crisis' | 'therapy'
  ): number {
    let timeSaving = 0
    
    // Cache usage saves significant time
    if (strategy.useCache) {
      timeSaving += 800 // Average agent execution time saved per cache hit
    }
    
    // Parallel execution saves time for complex scenarios
    if (strategy.enableParallelExecution && complexity !== 'simple') {
      timeSaving += 600 // Coordination time saved
    }
    
    // Skipping optional agents saves time
    if (strategy.skipOptionalAgents) {
      timeSaving += 500 // Per agent skipped
    }
    
    return timeSaving
  }

  private createParallelGroups(agentAnalysis: any[], targetTime: number): string[][] {
    const groups: string[][] = []
    let currentGroup: string[] = []
    let currentGroupTime = 0
    
    for (const agent of agentAnalysis) {
      // If adding this agent would exceed target time, start new group
      if (currentGroupTime + agent.estimatedTime > targetTime && currentGroup.length > 0) {
        groups.push([...currentGroup])
        currentGroup = [agent.agentName]
        currentGroupTime = agent.estimatedTime
      } else {
        currentGroup.push(agent.agentName)
        currentGroupTime = Math.max(currentGroupTime, agent.estimatedTime) // Parallel execution
      }
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }
    
    return groups
  }

  private calculateParallelExecutionTime(parallelGroups: string[][], agentAnalysis: any[]): number {
    const agentTimeMap = Object.fromEntries(agentAnalysis.map(a => [a.agentName, a.estimatedTime]))
    
    return parallelGroups.reduce((totalTime, group) => {
      // Parallel execution time is the maximum time in the group
      const groupTime = Math.max(...group.map(agentName => agentTimeMap[agentName] || 1000))
      return totalTime + groupTime
    }, 0)
  }

  private calculateCacheTTL(result: AgentExecutionResult): number {
    // Higher confidence results cached longer
    const baseTTL = 3600 // 1 hour
    const confidenceMultiplier = result.confidence
    const agentMultiplier = result.agentName === 'emotion_analyzer' ? 0.5 : 1.0 // Emotions change faster
    
    return Math.floor(baseTTL * confidenceMultiplier * agentMultiplier)
  }

  private generateRecommendations(strategy: OptimizationStrategy, cacheAnalysis: any): string[] {
    const recommendations = []
    
    if (strategy.useCache && cacheAnalysis.overallHitProbability > 0.5) {
      recommendations.push('leverage_cache_results')
    }
    
    if (strategy.enableParallelExecution) {
      recommendations.push('enable_parallel_processing')
    }
    
    if (strategy.skipOptionalAgents) {
      recommendations.push('skip_non_essential_agents')
    }
    
    if (strategy.fallbackEnabled) {
      recommendations.push('prepare_fallback_response')
    }
    
    return recommendations
  }

  private generateReasoningExplanation(strategy: OptimizationStrategy, cacheAnalysis: any, systemLoad: any): string {
    let reasoning = 'Performance optimization strategy: '
    
    if (strategy.useCache) {
      reasoning += `Using cache (${Math.round(cacheAnalysis.overallHitProbability * 100)}% hit rate). `
    }
    
    if (strategy.enableParallelExecution) {
      reasoning += 'Parallel agent execution enabled. '
    }
    
    if (strategy.skipOptionalAgents) {
      reasoning += 'Skipping optional agents for speed. '
    }
    
    if (!systemLoad.systemHealthy) {
      reasoning += 'System under load - applying aggressive optimization. '
    }
    
    return reasoning
  }

  private async updatePerformanceMetrics(
    request: ChatRequest,
    agentResults: AgentExecutionResult[],
    totalTime: number
  ): Promise<void> {
    // Track optimization effectiveness
    // This would integrate with monitoring systems
    console.log('Performance metrics updated:', {
      messageLength: request.message.length,
      agentCount: agentResults.length,
      totalTime,
      averageAgentTime: agentResults.reduce((sum, r) => sum + r.executionTimeMs, 0) / agentResults.length
    })
  }

  private calculateCacheEfficiency(cacheStats: any): number {
    const agentHitRate = cacheStats.agentResults.hits / (cacheStats.agentResults.hits + cacheStats.agentResults.misses) || 0
    const sessionHitRate = cacheStats.sessions.hits / (cacheStats.sessions.hits + cacheStats.sessions.misses) || 0
    
    return (agentHitRate + sessionHitRate) / 2
  }

  private generateSystemRecommendations(cacheStats: any, performanceStats: any): string[] {
    const recommendations = []
    
    if (this.calculateCacheEfficiency(cacheStats) < 0.6) {
      recommendations.push('increase_cache_ttl')
      recommendations.push('optimize_cache_key_strategy')
    }
    
    if (performanceStats.overallCompliance < 95) {
      recommendations.push('review_agent_performance')
      recommendations.push('consider_additional_caching')
    }
    
    if (cacheStats.memoryUsage.includes('G')) { // Gigabytes
      recommendations.push('monitor_cache_memory_usage')
    }
    
    return recommendations
  }

  private generateAgentOptimizations(performanceStats: any): { [agentName: string]: string[] } {
    const optimizations: { [agentName: string]: string[] } = {}
    
    // This would analyze individual agent performance from stats
    Object.keys(this.AGENT_BASELINES).forEach(agentName => {
      optimizations[agentName] = []
      
      // Example optimizations based on performance patterns
      if (agentName === 'emotion_analyzer') {
        optimizations[agentName].push('consider_faster_keyword_matching')
      }
      
      if (agentName === 'memory_manager') {
        optimizations[agentName].push('optimize_vector_search_parameters')
      }
    })
    
    return optimizations
  }

  private identifyCriticalIssues(cacheStats: any, performanceStats: any): string[] {
    const issues = []
    
    if (performanceStats.overallCompliance < 85) {
      issues.push('sla_compliance_below_threshold')
    }
    
    if (cacheStats.agentResults.errors > 10) {
      issues.push('high_cache_error_rate')
    }
    
    if (cacheStats.connectedClients === 0) {
      issues.push('redis_connection_failure')
    }
    
    return issues
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance()