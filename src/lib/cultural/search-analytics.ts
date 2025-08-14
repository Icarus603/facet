import { createClient } from '@/lib/supabase/client'
import { ProcessedQuery } from './query-processor'
import Redis from 'ioredis'
import { EventEmitter } from 'events'

export interface SearchMetrics {
  searchId: string
  query: string
  processedQuery: string
  resultCount: number
  processingTime: number
  cacheHit: boolean
  userId?: string
  sessionId?: string
  intent?: string
  culturalContext?: string[]
  rankingStrategy?: string
  timestamp: Date
}

export interface PerformanceMetrics {
  averageLatency: number
  p50Latency: number
  p95Latency: number
  p99Latency: number
  cacheHitRate: number
  searchVolume: number
  popularQueries: Array<{ query: string; count: number }>
  userEngagement: Array<{ userId: string; searchCount: number }>
  errorRate: number
  throughput: number
}

export interface SearchTrend {
  period: string
  searchVolume: number
  avgLatency: number
  cacheHitRate: number
  topQueries: string[]
  topCultures: string[]
  topIntents: string[]
  userSatisfaction: number
}

export interface UserEngagementMetrics {
  userId: string
  totalSearches: number
  avgSessionDuration: number
  avgQueriesPerSession: number
  preferredCultures: string[]
  satisfactionScore: number
  retentionRate: number
  lastActiveDate: Date
}

export interface ContentAnalytics {
  contentId: string
  totalViews: number
  uniqueUsers: number
  avgRating: number
  avgDwellTime: number
  clickThroughRate: number
  culturalResonanceScore: number
  therapeuticEffectivenessScore: number
  searchRankings: Array<{
    query: string
    avgPosition: number
    clickRate: number
  }>
}

export interface RealTimeMetrics {
  activeSearches: number
  searchesPerMinute: number
  avgLatency: number
  cacheHitRate: number
  errorRate: number
  topQueries: string[]
  alerts: Alert[]
}

export interface Alert {
  id: string
  type: 'performance' | 'error' | 'usage' | 'quality'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: Date
  acknowledged: boolean
  resolvedAt?: Date
}

export interface SearchQualityMetrics {
  relevanceScore: number
  culturalAccuracyScore: number
  therapeuticEffectivenessScore: number
  biasScore: number
  diversityScore: number
  userSatisfactionScore: number
}

export class SearchAnalytics extends EventEmitter {
  private supabase: ReturnType<typeof createClient>
  private redis: Redis
  private metricsBuffer: SearchMetrics[] = []
  private realTimeMetrics: RealTimeMetrics
  private alertThresholds: AlertThresholds
  private bufferFlushInterval: number = 10000 // 10 seconds
  private performanceWindow: number = 3600000 // 1 hour

  constructor() {
    super()
    this.supabase = createClient()
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })

    this.realTimeMetrics = {
      activeSearches: 0,
      searchesPerMinute: 0,
      avgLatency: 0,
      cacheHitRate: 0,
      errorRate: 0,
      topQueries: [],
      alerts: []
    }

    this.alertThresholds = {
      maxLatency: 1000, // ms
      minCacheHitRate: 0.7,
      maxErrorRate: 0.05,
      maxActiveSearches: 1000
    }

    this.initializeAnalytics()
  }

  /**
   * Record search metrics with real-time processing
   */
  async recordSearchMetrics(metrics: SearchMetrics): Promise<void> {
    try {
      // Add to buffer for batch processing
      this.metricsBuffer.push(metrics)

      // Update real-time metrics
      await this.updateRealTimeMetrics(metrics)

      // Check for alerts
      await this.checkAlertConditions(metrics)

      // Emit event for real-time dashboards
      this.emit('searchMetrics', metrics)

      // Log performance issues immediately
      if (metrics.processingTime > this.alertThresholds.maxLatency) {
        console.warn(`High latency search: ${metrics.processingTime}ms for query: ${metrics.query}`)
      }

    } catch (error) {
      console.error('Failed to record search metrics:', error)
    }
  }

  /**
   * Get comprehensive performance metrics for monitoring
   */
  async getPerformanceMetrics(
    timeRange?: { start: Date; end: Date }
  ): Promise<PerformanceMetrics> {
    try {
      const endTime = timeRange?.end || new Date()
      const startTime = timeRange?.start || new Date(endTime.getTime() - this.performanceWindow)

      // Query metrics from database
      const { data: metrics, error } = await this.supabase
        .from('search_metrics')
        .select('*')
        .gte('timestamp', startTime.toISOString())
        .lte('timestamp', endTime.toISOString())
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('Failed to fetch performance metrics:', error)
        return this.getDefaultPerformanceMetrics()
      }

      const searchMetrics = metrics || []

      // Calculate performance statistics
      const latencies = searchMetrics.map(m => m.processing_time).filter(l => l > 0)
      latencies.sort((a, b) => a - b)

      const averageLatency = latencies.length > 0 
        ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length 
        : 0

      const p50Latency = latencies[Math.floor(latencies.length * 0.5)] || 0
      const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0
      const p99Latency = latencies[Math.floor(latencies.length * 0.99)] || 0

      const cacheHits = searchMetrics.filter(m => m.cache_hit).length
      const cacheHitRate = searchMetrics.length > 0 ? cacheHits / searchMetrics.length : 0

      const searchVolume = searchMetrics.length
      const throughput = searchVolume / ((endTime.getTime() - startTime.getTime()) / 1000) // searches per second

      // Calculate popular queries
      const queryFreq = new Map<string, number>()
      searchMetrics.forEach(m => {
        queryFreq.set(m.query, (queryFreq.get(m.query) || 0) + 1)
      })

      const popularQueries = Array.from(queryFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }))

      // Calculate user engagement
      const userSearches = new Map<string, number>()
      searchMetrics.forEach(m => {
        if (m.user_id) {
          userSearches.set(m.user_id, (userSearches.get(m.user_id) || 0) + 1)
        }
      })

      const userEngagement = Array.from(userSearches.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([userId, searchCount]) => ({ userId, searchCount }))

      return {
        averageLatency,
        p50Latency,
        p95Latency,
        p99Latency,
        cacheHitRate,
        searchVolume,
        popularQueries,
        userEngagement,
        errorRate: 0, // Would be calculated from error logs
        throughput
      }

    } catch (error) {
      console.error('Failed to calculate performance metrics:', error)
      return this.getDefaultPerformanceMetrics()
    }
  }

  /**
   * Get search trends over time for business insights
   */
  async getSearchTrends(
    period: 'hour' | 'day' | 'week' | 'month' = 'day',
    limit: number = 30
  ): Promise<SearchTrend[]> {
    try {
      const { data: trends, error } = await this.supabase.rpc('get_search_trends', {
        time_period: period,
        result_limit: limit
      })

      if (error) {
        console.error('Failed to fetch search trends:', error)
        return []
      }

      return trends || []

    } catch (error) {
      console.error('Search trends calculation failed:', error)
      return []
    }
  }

  /**
   * Get user engagement analytics for retention analysis
   */
  async getUserEngagementMetrics(
    timeRange?: { start: Date; end: Date }
  ): Promise<UserEngagementMetrics[]> {
    try {
      const endTime = timeRange?.end || new Date()
      const startTime = timeRange?.start || new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days

      const { data: engagement, error } = await this.supabase.rpc('calculate_user_engagement', {
        start_date: startTime.toISOString(),
        end_date: endTime.toISOString()
      })

      if (error) {
        console.error('Failed to calculate user engagement:', error)
        return []
      }

      return (engagement || []).map(this.mapUserEngagementData)

    } catch (error) {
      console.error('User engagement calculation failed:', error)
      return []
    }
  }

  /**
   * Get content performance analytics
   */
  async getContentAnalytics(
    contentIds?: string[],
    timeRange?: { start: Date; end: Date }
  ): Promise<ContentAnalytics[]> {
    try {
      const endTime = timeRange?.end || new Date()
      const startTime = timeRange?.start || new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days

      let query = this.supabase
        .from('search_results_analytics')
        .select('*')
        .gte('timestamp', startTime.toISOString())
        .lte('timestamp', endTime.toISOString())

      if (contentIds && contentIds.length > 0) {
        query = query.in('content_id', contentIds)
      }

      const { data: analytics, error } = await query

      if (error) {
        console.error('Failed to fetch content analytics:', error)
        return []
      }

      // Group by content and calculate metrics
      const contentMetrics = new Map<string, any>()
      
      analytics?.forEach(record => {
        const contentId = record.content_id
        if (!contentMetrics.has(contentId)) {
          contentMetrics.set(contentId, {
            contentId,
            totalViews: 0,
            uniqueUsers: new Set(),
            ratings: [],
            dwellTimes: [],
            searchRankings: []
          })
        }

        const metrics = contentMetrics.get(contentId)!
        metrics.totalViews += 1
        
        if (record.user_id) metrics.uniqueUsers.add(record.user_id)
        if (record.rating) metrics.ratings.push(record.rating)
        if (record.dwell_time) metrics.dwellTimes.push(record.dwell_time)
        if (record.search_position) {
          metrics.searchRankings.push({
            query: record.query,
            position: record.search_position,
            clicked: record.clicked
          })
        }
      })

      // Calculate final metrics
      const contentAnalytics: ContentAnalytics[] = []
      
      contentMetrics.forEach((metrics, contentId) => {
        const avgRating = metrics.ratings.length > 0
          ? metrics.ratings.reduce((sum: number, r: number) => sum + r, 0) / metrics.ratings.length
          : 0

        const avgDwellTime = metrics.dwellTimes.length > 0
          ? metrics.dwellTimes.reduce((sum: number, t: number) => sum + t, 0) / metrics.dwellTimes.length
          : 0

        const totalClicks = metrics.searchRankings.filter((r: any) => r.clicked).length
        const clickThroughRate = metrics.totalViews > 0 ? totalClicks / metrics.totalViews : 0

        // Calculate average search position
        const avgPosition = metrics.searchRankings.length > 0
          ? metrics.searchRankings.reduce((sum: number, r: any) => sum + r.position, 0) / metrics.searchRankings.length
          : 0

        contentAnalytics.push({
          contentId,
          totalViews: metrics.totalViews,
          uniqueUsers: metrics.uniqueUsers.size,
          avgRating,
          avgDwellTime,
          clickThroughRate,
          culturalResonanceScore: 0, // Would be calculated from specific metrics
          therapeuticEffectivenessScore: 0, // Would be calculated from specific metrics
          searchRankings: [{
            query: 'aggregated',
            avgPosition,
            clickRate: clickThroughRate
          }]
        })
      })

      return contentAnalytics

    } catch (error) {
      console.error('Content analytics calculation failed:', error)
      return []
    }
  }

  /**
   * Get real-time metrics for monitoring dashboards
   */
  getRealTimeMetrics(): RealTimeMetrics {
    return { ...this.realTimeMetrics }
  }

  /**
   * Get search quality metrics for system optimization
   */
  async getSearchQualityMetrics(
    timeRange?: { start: Date; end: Date }
  ): Promise<SearchQualityMetrics> {
    try {
      const endTime = timeRange?.end || new Date()
      const startTime = timeRange?.start || new Date(endTime.getTime() - 24 * 60 * 60 * 1000) // 24 hours

      const { data: qualityData, error } = await this.supabase.rpc('calculate_search_quality', {
        start_date: startTime.toISOString(),
        end_date: endTime.toISOString()
      })

      if (error) {
        console.error('Failed to fetch search quality metrics:', error)
        return this.getDefaultQualityMetrics()
      }

      return qualityData || this.getDefaultQualityMetrics()

    } catch (error) {
      console.error('Search quality calculation failed:', error)
      return this.getDefaultQualityMetrics()
    }
  }

  /**
   * Generate analytics report for stakeholders
   */
  async generateAnalyticsReport(
    reportType: 'daily' | 'weekly' | 'monthly',
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    summary: {
      totalSearches: number
      avgLatency: number
      cacheHitRate: number
      userSatisfaction: number
    }
    trends: SearchTrend[]
    topQueries: Array<{ query: string; count: number }>
    contentPerformance: ContentAnalytics[]
    userEngagement: {
      totalUsers: number
      avgSessionDuration: number
      retentionRate: number
    }
    recommendations: string[]
  }> {
    try {
      console.log(`Generating ${reportType} analytics report`)

      // Get all required metrics in parallel
      const [
        performance,
        trends,
        engagement,
        contentAnalytics,
        qualityMetrics
      ] = await Promise.all([
        this.getPerformanceMetrics(timeRange),
        this.getSearchTrends(reportType === 'daily' ? 'hour' : reportType === 'weekly' ? 'day' : 'week'),
        this.getUserEngagementMetrics(timeRange),
        this.getContentAnalytics(undefined, timeRange),
        this.getSearchQualityMetrics(timeRange)
      ])

      // Generate recommendations based on metrics
      const recommendations = this.generateRecommendations(
        performance,
        qualityMetrics,
        engagement
      )

      // Calculate user engagement summary
      const totalUsers = engagement.length
      const avgSessionDuration = engagement.reduce((sum, user) => sum + user.avgSessionDuration, 0) / Math.max(totalUsers, 1)
      const avgRetentionRate = engagement.reduce((sum, user) => sum + user.retentionRate, 0) / Math.max(totalUsers, 1)

      return {
        summary: {
          totalSearches: performance.searchVolume,
          avgLatency: performance.averageLatency,
          cacheHitRate: performance.cacheHitRate,
          userSatisfaction: qualityMetrics.userSatisfactionScore
        },
        trends,
        topQueries: performance.popularQueries,
        contentPerformance: contentAnalytics,
        userEngagement: {
          totalUsers,
          avgSessionDuration,
          retentionRate: avgRetentionRate
        },
        recommendations
      }

    } catch (error) {
      console.error('Analytics report generation failed:', error)
      throw error
    }
  }

  /**
   * Set up real-time alerts for system monitoring
   */
  setupAlerts(thresholds: Partial<AlertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds }
    console.log('Alert thresholds updated:', this.alertThresholds)
  }

  /**
   * Acknowledge and resolve alerts
   */
  async acknowledgeAlert(alertId: string, resolvedBy?: string): Promise<void> {
    try {
      const alert = this.realTimeMetrics.alerts.find(a => a.id === alertId)
      if (alert) {
        alert.acknowledged = true
        alert.resolvedAt = new Date()
      }

      // Record in database
      await this.supabase
        .from('search_alerts')
        .update({
          acknowledged: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy
        })
        .eq('id', alertId)

      this.emit('alertResolved', { alertId, resolvedBy })

    } catch (error) {
      console.error('Alert acknowledgment failed:', error)
    }
  }

  /**
   * Export analytics data for external analysis
   */
  async exportAnalyticsData(
    format: 'json' | 'csv',
    timeRange: { start: Date; end: Date }
  ): Promise<string> {
    try {
      const [performance, trends, engagement] = await Promise.all([
        this.getPerformanceMetrics(timeRange),
        this.getSearchTrends('day'),
        this.getUserEngagementMetrics(timeRange)
      ])

      const exportData = {
        exportedAt: new Date().toISOString(),
        timeRange,
        performance,
        trends,
        engagement
      }

      if (format === 'json') {
        return JSON.stringify(exportData, null, 2)
      } else {
        // Convert to CSV format
        return this.convertToCSV(exportData)
      }

    } catch (error) {
      console.error('Analytics data export failed:', error)
      throw error
    }
  }

  // Private helper methods

  private async initializeAnalytics(): Promise<void> {
    try {
      // Set up periodic buffer flush
      setInterval(() => {
        this.flushMetricsBuffer()
      }, this.bufferFlushInterval)

      // Set up real-time metrics update
      setInterval(() => {
        this.updateRealTimeAggregates()
      }, 5000) // Every 5 seconds

      console.log('Search analytics initialized')

    } catch (error) {
      console.error('Analytics initialization failed:', error)
    }
  }

  private async updateRealTimeMetrics(metrics: SearchMetrics): Promise<void> {
    try {
      // Update Redis counters
      const minute = Math.floor(Date.now() / 60000) * 60000
      
      await Promise.all([
        this.redis.incr(`searches:${minute}`),
        this.redis.expire(`searches:${minute}`, 3600),
        this.redis.lpush('recent_searches', JSON.stringify(metrics)),
        this.redis.ltrim('recent_searches', 0, 1000)
      ])

      // Update in-memory metrics
      if (metrics.cacheHit) {
        // Update cache hit rate calculation
      }

    } catch (error) {
      console.error('Real-time metrics update failed:', error)
    }
  }

  private async checkAlertConditions(metrics: SearchMetrics): Promise<void> {
    const alerts: Alert[] = []

    // High latency alert
    if (metrics.processingTime > this.alertThresholds.maxLatency) {
      alerts.push({
        id: `latency-${Date.now()}`,
        type: 'performance',
        severity: metrics.processingTime > this.alertThresholds.maxLatency * 2 ? 'high' : 'medium',
        message: `High search latency: ${metrics.processingTime}ms (threshold: ${this.alertThresholds.maxLatency}ms)`,
        timestamp: new Date(),
        acknowledged: false
      })
    }

    // Low cache hit rate alert
    if (metrics.cacheHit === false) {
      const recentCacheHitRate = await this.calculateRecentCacheHitRate()
      if (recentCacheHitRate < this.alertThresholds.minCacheHitRate) {
        alerts.push({
          id: `cache-${Date.now()}`,
          type: 'performance',
          severity: recentCacheHitRate < 0.5 ? 'high' : 'medium',
          message: `Low cache hit rate: ${(recentCacheHitRate * 100).toFixed(1)}% (threshold: ${(this.alertThresholds.minCacheHitRate * 100).toFixed(1)}%)`,
          timestamp: new Date(),
          acknowledged: false
        })
      }
    }

    // Add alerts to system
    alerts.forEach(alert => {
      this.realTimeMetrics.alerts.push(alert)
      this.emit('alert', alert)
    })

    // Persist critical alerts
    if (alerts.some(a => a.severity === 'high' || a.severity === 'critical')) {
      await this.persistAlerts(alerts.filter(a => a.severity === 'high' || a.severity === 'critical'))
    }
  }

  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return

    try {
      const metricsToFlush = [...this.metricsBuffer]
      this.metricsBuffer = []

      // Batch insert to database
      const insertData = metricsToFlush.map(m => ({
        search_id: m.searchId,
        query: m.query,
        processed_query: m.processedQuery,
        result_count: m.resultCount,
        processing_time: m.processingTime,
        cache_hit: m.cacheHit,
        user_id: m.userId,
        session_id: m.sessionId,
        intent: m.intent,
        cultural_context: m.culturalContext,
        ranking_strategy: m.rankingStrategy,
        timestamp: m.timestamp.toISOString()
      }))

      const { error } = await this.supabase
        .from('search_metrics')
        .insert(insertData)

      if (error) {
        console.error('Metrics buffer flush failed:', error)
        // Re-add failed metrics to buffer for retry
        this.metricsBuffer.unshift(...metricsToFlush)
      } else {
        console.log(`Flushed ${metricsToFlush.length} search metrics to database`)
      }

    } catch (error) {
      console.error('Metrics buffer flush error:', error)
    }
  }

  private async updateRealTimeAggregates(): Promise<void> {
    try {
      // Calculate searches per minute
      const currentMinute = Math.floor(Date.now() / 60000) * 60000
      const searchesThisMinute = await this.redis.get(`searches:${currentMinute}`)
      this.realTimeMetrics.searchesPerMinute = parseInt(searchesThisMinute || '0')

      // Calculate recent average latency
      const recentSearches = await this.redis.lrange('recent_searches', 0, 99)
      if (recentSearches.length > 0) {
        const latencies = recentSearches
          .map(s => JSON.parse(s))
          .map(m => m.processingTime)
          .filter(t => t > 0)
        
        this.realTimeMetrics.avgLatency = latencies.length > 0
          ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
          : 0
      }

      // Update top queries
      await this.updateTopQueries()

    } catch (error) {
      console.error('Real-time aggregates update failed:', error)
    }
  }

  private async updateTopQueries(): Promise<void> {
    try {
      const recentSearches = await this.redis.lrange('recent_searches', 0, 499)
      const queryFreq = new Map<string, number>()

      recentSearches.forEach(searchJson => {
        try {
          const search = JSON.parse(searchJson)
          queryFreq.set(search.query, (queryFreq.get(search.query) || 0) + 1)
        } catch (e) {
          // Skip invalid JSON
        }
      })

      this.realTimeMetrics.topQueries = Array.from(queryFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query]) => query)

    } catch (error) {
      console.error('Top queries update failed:', error)
    }
  }

  private async calculateRecentCacheHitRate(): Promise<number> {
    try {
      const recentSearches = await this.redis.lrange('recent_searches', 0, 99)
      if (recentSearches.length === 0) return 1.0

      const searches = recentSearches.map(s => JSON.parse(s))
      const cacheHits = searches.filter(s => s.cacheHit).length
      
      return cacheHits / searches.length

    } catch (error) {
      console.error('Cache hit rate calculation failed:', error)
      return 1.0
    }
  }

  private async persistAlerts(alerts: Alert[]): Promise<void> {
    try {
      const alertData = alerts.map(alert => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
        acknowledged: alert.acknowledged,
        resolved_at: alert.resolvedAt?.toISOString()
      }))

      await this.supabase
        .from('search_alerts')
        .insert(alertData)

    } catch (error) {
      console.error('Alert persistence failed:', error)
    }
  }

  private mapUserEngagementData(data: any): UserEngagementMetrics {
    return {
      userId: data.user_id,
      totalSearches: data.total_searches,
      avgSessionDuration: data.avg_session_duration,
      avgQueriesPerSession: data.avg_queries_per_session,
      preferredCultures: data.preferred_cultures || [],
      satisfactionScore: data.satisfaction_score,
      retentionRate: data.retention_rate,
      lastActiveDate: new Date(data.last_active_date)
    }
  }

  private generateRecommendations(
    performance: PerformanceMetrics,
    quality: SearchQualityMetrics,
    engagement: UserEngagementMetrics[]
  ): string[] {
    const recommendations: string[] = []

    // Performance recommendations
    if (performance.p95Latency > 1000) {
      recommendations.push('Consider optimizing search indexes to improve P95 latency')
    }

    if (performance.cacheHitRate < 0.7) {
      recommendations.push('Increase cache TTL or improve cache warming strategies')
    }

    if (performance.throughput < 10) {
      recommendations.push('Consider horizontal scaling of search infrastructure')
    }

    // Quality recommendations
    if (quality.relevanceScore < 0.8) {
      recommendations.push('Review and improve ranking algorithms for better relevance')
    }

    if (quality.biasScore > 0.3) {
      recommendations.push('Enhance bias detection and content filtering mechanisms')
    }

    // Engagement recommendations
    const avgRetention = engagement.reduce((sum, u) => sum + u.retentionRate, 0) / Math.max(engagement.length, 1)
    if (avgRetention < 0.6) {
      recommendations.push('Improve personalization to increase user retention')
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is optimal - continue monitoring')
    }

    return recommendations
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - would be more sophisticated in production
    const csv = [
      'Metric,Value',
      `Export Date,${data.exportedAt}`,
      `Total Searches,${data.performance.searchVolume}`,
      `Average Latency,${data.performance.averageLatency}ms`,
      `Cache Hit Rate,${(data.performance.cacheHitRate * 100).toFixed(1)}%`,
      `Active Users,${data.engagement.length}`
    ]

    return csv.join('\n')
  }

  private getDefaultPerformanceMetrics(): PerformanceMetrics {
    return {
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      cacheHitRate: 0,
      searchVolume: 0,
      popularQueries: [],
      userEngagement: [],
      errorRate: 0,
      throughput: 0
    }
  }

  private getDefaultQualityMetrics(): SearchQualityMetrics {
    return {
      relevanceScore: 0.8,
      culturalAccuracyScore: 0.8,
      therapeuticEffectivenessScore: 0.8,
      biasScore: 0.1,
      diversityScore: 0.7,
      userSatisfactionScore: 0.8
    }
  }
}

interface AlertThresholds {
  maxLatency: number
  minCacheHitRate: number
  maxErrorRate: number
  maxActiveSearches: number
}