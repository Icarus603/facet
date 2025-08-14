/**
 * FACET Agent Performance Monitor
 * Comprehensive performance tracking, optimization, and predictive analytics for therapeutic agents
 */

import { EventEmitter } from 'events';
import { BaseAgent } from '../BaseAgent';
import { AgentInteraction, TherapeuticAgent, ProgressMetrics } from '../types';

export interface PerformanceMetrics {
  agentId: string;
  timestamp: Date;
  
  // Response metrics
  responseTime: number;
  processingTime: number;
  queueTime: number;
  
  // Quality metrics
  userSatisfactionScore: number;
  therapeuticEffectiveness: number;
  culturalRelevance: number;
  crisisHandlingAccuracy: number;
  
  // Interaction metrics
  interactionCount: number;
  successfulInteractions: number;
  escalationRate: number;
  handoffRate: number;
  
  // Resource metrics
  memoryUsage: number;
  cpuUsage: number;
  concurrentSessions: number;
  errorRate: number;
}

export interface PerformanceThresholds {
  responseTime: {
    target: number;
    warning: number;
    critical: number;
  };
  userSatisfaction: {
    target: number;
    warning: number;
    critical: number;
  };
  errorRate: {
    target: number;
    warning: number;
    critical: number;
  };
  throughput: {
    target: number;
    warning: number;
    critical: number;
  };
}

export interface PerformanceAlert {
  id: string;
  agentId: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'performance' | 'quality' | 'availability' | 'resource';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolutionTime?: Date;
}

export interface OptimizationRecommendation {
  id: string;
  agentId: string;
  type: 'configuration' | 'resource' | 'routing' | 'training';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImpact: {
    responseTime?: number;
    userSatisfaction?: number;
    throughput?: number;
    resourceUsage?: number;
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    risk: 'low' | 'medium' | 'high';
    timeframe: string;
    steps: string[];
  };
  createdAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
}

export interface PerformanceTrend {
  agentId: string;
  metric: string;
  timeframe: '1h' | '24h' | '7d' | '30d';
  trend: 'improving' | 'stable' | 'declining';
  changeRate: number;
  confidence: number;
  dataPoints: Array<{ timestamp: Date; value: number }>;
}

export interface AgentHealthStatus {
  agentId: string;
  overallHealth: 'healthy' | 'warning' | 'critical' | 'offline';
  healthScore: number; // 0-100
  lastCheck: Date;
  components: {
    performance: 'healthy' | 'warning' | 'critical';
    quality: 'healthy' | 'warning' | 'critical';
    availability: 'healthy' | 'warning' | 'critical';
    resources: 'healthy' | 'warning' | 'critical';
  };
  activeAlerts: number;
  uptime: number; // percentage
  lastIncident?: Date;
}

export class PerformanceMonitor extends EventEmitter {
  private performanceData: Map<string, PerformanceMetrics[]> = new Map();
  private performanceThresholds: Map<string, PerformanceThresholds> = new Map();
  private activeAlerts: Map<string, PerformanceAlert[]> = new Map();
  private optimizationRecommendations: Map<string, OptimizationRecommendation[]> = new Map();
  private healthStatuses: Map<string, AgentHealthStatus> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private predictionModels: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeDefaultThresholds();
    this.startMonitoring();
  }

  /**
   * Record performance metrics for an agent interaction
   */
  recordInteraction(
    agentId: string,
    interaction: AgentInteraction,
    metrics: Partial<PerformanceMetrics>
  ): void {
    const performanceRecord: PerformanceMetrics = {
      agentId,
      timestamp: new Date(),
      responseTime: metrics.responseTime || 2000,
      processingTime: metrics.processingTime || 1500,
      queueTime: metrics.queueTime || 500,
      userSatisfactionScore: this.deriveUserSatisfaction(interaction),
      therapeuticEffectiveness: metrics.therapeuticEffectiveness || 0.8,
      culturalRelevance: metrics.culturalRelevance || 0.75,
      crisisHandlingAccuracy: metrics.crisisHandlingAccuracy || 0.9,
      interactionCount: 1,
      successfulInteractions: interaction.user_feedback !== 'unhelpful' ? 1 : 0,
      escalationRate: interaction.escalation_required ? 1 : 0,
      handoffRate: 0, // Would be determined by subsequent interactions
      memoryUsage: metrics.memoryUsage || 50, // MB
      cpuUsage: metrics.cpuUsage || 25, // percentage
      concurrentSessions: metrics.concurrentSessions || 1,
      errorRate: 0 // Would be calculated based on errors
    };

    // Store performance data
    const agentData = this.performanceData.get(agentId) || [];
    agentData.push(performanceRecord);
    
    // Keep only last 1000 records per agent
    if (agentData.length > 1000) {
      agentData.shift();
    }
    
    this.performanceData.set(agentId, agentData);

    // Check for threshold violations
    this.checkThresholds(agentId, performanceRecord);

    // Update health status
    this.updateHealthStatus(agentId);

    // Emit performance event
    this.emit('performance:recorded', { agentId, metrics: performanceRecord });
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(
    agentId?: string,
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h'
  ): {
    summary: any;
    trends: PerformanceTrend[];
    alerts: PerformanceAlert[];
    recommendations: OptimizationRecommendation[];
    health: AgentHealthStatus | Map<string, AgentHealthStatus>;
  } {
    const cutoffTime = this.getCutoffTime(timeframe);
    
    if (agentId) {
      return this.generateSingleAgentReport(agentId, cutoffTime);
    } else {
      return this.generateSystemWideReport(cutoffTime);
    }
  }

  /**
   * Analyze performance trends and generate predictions
   */
  analyzePerformanceTrends(agentId: string, metric: string): PerformanceTrend {
    const agentData = this.performanceData.get(agentId) || [];
    const timeframes: Array<'1h' | '24h' | '7d' | '30d'> = ['1h', '24h', '7d', '30d'];
    
    // Analyze trends for different timeframes
    const trends = timeframes.map(timeframe => {
      const cutoffTime = this.getCutoffTime(timeframe);
      const relevantData = agentData.filter(d => d.timestamp >= cutoffTime);
      
      return this.calculateTrend(agentId, metric, timeframe, relevantData);
    });

    // Return the most significant trend
    return trends.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(agentId: string): OptimizationRecommendation[] {
    const agentData = this.performanceData.get(agentId) || [];
    const recentData = agentData.slice(-100); // Last 100 interactions
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze response time patterns
    const avgResponseTime = this.calculateAverage(recentData, 'responseTime');
    const thresholds = this.performanceThresholds.get(agentId);
    
    if (thresholds && avgResponseTime > thresholds.responseTime.warning) {
      recommendations.push({
        id: `${agentId}-response-time-${Date.now()}`,
        agentId,
        type: 'performance',
        priority: avgResponseTime > thresholds.responseTime.critical ? 'critical' : 'high',
        title: 'Optimize Response Time',
        description: 'Agent response time is consistently above optimal thresholds. Consider optimization strategies.',
        expectedImpact: {
          responseTime: avgResponseTime * 0.3, // 30% improvement
          userSatisfaction: 0.1 // 10% improvement
        },
        implementation: {
          effort: 'medium',
          risk: 'low',
          timeframe: '1-2 weeks',
          steps: [
            'Analyze response time bottlenecks',
            'Optimize prompt processing',
            'Consider caching frequently used responses',
            'Review model configuration'
          ]
        },
        createdAt: new Date(),
        status: 'pending'
      });
    }

    // Analyze user satisfaction patterns
    const avgSatisfaction = this.calculateAverage(recentData, 'userSatisfactionScore');
    if (avgSatisfaction < 0.7) {
      recommendations.push({
        id: `${agentId}-satisfaction-${Date.now()}`,
        agentId,
        type: 'quality',
        priority: avgSatisfaction < 0.5 ? 'critical' : 'high',
        title: 'Improve User Satisfaction',
        description: 'User satisfaction scores are below optimal levels. Consider response quality improvements.',
        expectedImpact: {
          userSatisfaction: 0.15, // 15% improvement
          therapeuticEffectiveness: 0.1
        },
        implementation: {
          effort: 'high',
          risk: 'medium',
          timeframe: '2-4 weeks',
          steps: [
            'Analyze user feedback patterns',
            'Review and update response templates',
            'Enhance cultural sensitivity training',
            'Implement A/B testing for responses'
          ]
        },
        createdAt: new Date(),
        status: 'pending'
      });
    }

    // Analyze resource utilization
    const avgCpuUsage = this.calculateAverage(recentData, 'cpuUsage');
    if (avgCpuUsage > 80) {
      recommendations.push({
        id: `${agentId}-resources-${Date.now()}`,
        agentId,
        type: 'resource',
        priority: 'medium',
        title: 'Optimize Resource Usage',
        description: 'High CPU utilization detected. Consider resource optimization or scaling.',
        expectedImpact: {
          responseTime: avgResponseTime * 0.15, // 15% improvement
          resourceUsage: avgCpuUsage * 0.25 // 25% reduction
        },
        implementation: {
          effort: 'low',
          risk: 'low',
          timeframe: '1 week',
          steps: [
            'Profile resource usage patterns',
            'Optimize algorithm efficiency',
            'Consider horizontal scaling',
            'Implement resource monitoring'
          ]
        },
        createdAt: new Date(),
        status: 'pending'
      });
    }

    // Store recommendations
    this.optimizationRecommendations.set(agentId, recommendations);

    return recommendations;
  }

  /**
   * Predict future performance based on trends
   */
  predictPerformance(
    agentId: string,
    metric: string,
    hoursAhead: number = 24
  ): {
    predictedValue: number;
    confidence: number;
    trend: 'improving' | 'stable' | 'declining';
    range: { min: number; max: number };
  } {
    const agentData = this.performanceData.get(agentId) || [];
    const recentData = agentData.slice(-100);

    if (recentData.length < 10) {
      return {
        predictedValue: 0,
        confidence: 0,
        trend: 'stable',
        range: { min: 0, max: 0 }
      };
    }

    // Simple linear regression for prediction
    const values = recentData.map((d, i) => ({ x: i, y: (d as any)[metric] || 0 }));
    const { slope, intercept, r2 } = this.linearRegression(values);

    const futureIndex = recentData.length + (hoursAhead / 24) * recentData.length;
    const predictedValue = slope * futureIndex + intercept;

    // Calculate confidence based on R-squared and data variance
    const variance = this.calculateVariance(values.map(v => v.y));
    const confidence = Math.max(0, Math.min(1, r2 * (1 - variance / predictedValue)));

    // Determine trend
    const trend = slope > 0.05 ? 'improving' : slope < -0.05 ? 'declining' : 'stable';

    // Calculate prediction range
    const errorMargin = Math.sqrt(variance) * (1 - confidence);
    const range = {
      min: predictedValue - errorMargin,
      max: predictedValue + errorMargin
    };

    return { predictedValue, confidence, trend, range };
  }

  /**
   * Auto-optimize agent based on performance data
   */
  async autoOptimize(agentId: string): Promise<{
    optimizationsApplied: string[];
    expectedImprovements: Record<string, number>;
    success: boolean;
  }> {
    const recommendations = this.generateOptimizationRecommendations(agentId);
    const optimizationsApplied: string[] = [];
    const expectedImprovements: Record<string, number> = {};

    try {
      // Apply low-risk, high-impact optimizations
      for (const rec of recommendations) {
        if (rec.implementation.risk === 'low' && rec.priority !== 'low') {
          await this.applyOptimization(agentId, rec);
          optimizationsApplied.push(rec.title);
          
          // Track expected improvements
          if (rec.expectedImpact.responseTime) {
            expectedImprovements.responseTime = rec.expectedImpact.responseTime;
          }
          if (rec.expectedImpact.userSatisfaction) {
            expectedImprovements.userSatisfaction = rec.expectedImpact.userSatisfaction;
          }
        }
      }

      this.emit('optimization:completed', { 
        agentId, 
        optimizationsApplied, 
        expectedImprovements 
      });

      return { optimizationsApplied, expectedImprovements, success: true };

    } catch (error) {
      this.emit('optimization:failed', { agentId, error });
      return { optimizationsApplied, expectedImprovements, success: false };
    }
  }

  /**
   * Initialize default performance thresholds
   */
  private initializeDefaultThresholds(): void {
    const defaultThresholds: PerformanceThresholds = {
      responseTime: {
        target: 2000,     // 2 seconds
        warning: 5000,    // 5 seconds
        critical: 10000   // 10 seconds
      },
      userSatisfaction: {
        target: 0.8,      // 80%
        warning: 0.6,     // 60%
        critical: 0.4     // 40%
      },
      errorRate: {
        target: 0.01,     // 1%
        warning: 0.05,    // 5%
        critical: 0.1     // 10%
      },
      throughput: {
        target: 10,       // 10 interactions/hour
        warning: 5,       // 5 interactions/hour
        critical: 2       // 2 interactions/hour
      }
    };

    // Set default thresholds for all agents
    // In production, these would be customized per agent type
    this.performanceThresholds.set('default', defaultThresholds);
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    // Monitor every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
      this.analyzeSystemPerformance();
      this.cleanupOldData();
    }, 5 * 60 * 1000);

    this.emit('monitoring:started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.emit('monitoring:stopped');
  }

  /**
   * Check if metrics violate thresholds
   */
  private checkThresholds(agentId: string, metrics: PerformanceMetrics): void {
    const thresholds = this.performanceThresholds.get(agentId) || 
                      this.performanceThresholds.get('default')!;

    const alerts: PerformanceAlert[] = [];

    // Check response time
    if (metrics.responseTime > thresholds.responseTime.critical) {
      alerts.push(this.createAlert(agentId, 'critical', 'performance', 'responseTime', 
        metrics.responseTime, thresholds.responseTime.critical,
        `Critical response time: ${metrics.responseTime}ms exceeds ${thresholds.responseTime.critical}ms`));
    } else if (metrics.responseTime > thresholds.responseTime.warning) {
      alerts.push(this.createAlert(agentId, 'warning', 'performance', 'responseTime',
        metrics.responseTime, thresholds.responseTime.warning,
        `High response time: ${metrics.responseTime}ms exceeds ${thresholds.responseTime.warning}ms`));
    }

    // Check user satisfaction
    if (metrics.userSatisfactionScore < thresholds.userSatisfaction.critical) {
      alerts.push(this.createAlert(agentId, 'critical', 'quality', 'userSatisfaction',
        metrics.userSatisfactionScore, thresholds.userSatisfaction.critical,
        `Critical user satisfaction: ${(metrics.userSatisfactionScore * 100).toFixed(1)}% below ${(thresholds.userSatisfaction.critical * 100).toFixed(1)}%`));
    } else if (metrics.userSatisfactionScore < thresholds.userSatisfaction.warning) {
      alerts.push(this.createAlert(agentId, 'warning', 'quality', 'userSatisfaction',
        metrics.userSatisfactionScore, thresholds.userSatisfaction.warning,
        `Low user satisfaction: ${(metrics.userSatisfactionScore * 100).toFixed(1)}% below ${(thresholds.userSatisfaction.warning * 100).toFixed(1)}%`));
    }

    // Store alerts
    if (alerts.length > 0) {
      const existingAlerts = this.activeAlerts.get(agentId) || [];
      existingAlerts.push(...alerts);
      this.activeAlerts.set(agentId, existingAlerts);

      // Emit alert events
      alerts.forEach(alert => {
        this.emit('alert:triggered', alert);
      });
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(
    agentId: string,
    severity: 'info' | 'warning' | 'critical',
    type: 'performance' | 'quality' | 'availability' | 'resource',
    metric: string,
    currentValue: number,
    threshold: number,
    message: string
  ): PerformanceAlert {
    return {
      id: `${agentId}-${metric}-${Date.now()}`,
      agentId,
      severity,
      type,
      metric,
      currentValue,
      threshold,
      message,
      timestamp: new Date(),
      resolved: false
    };
  }

  /**
   * Update agent health status
   */
  private updateHealthStatus(agentId: string): void {
    const agentData = this.performanceData.get(agentId) || [];
    const recentData = agentData.slice(-20); // Last 20 interactions
    const alerts = this.activeAlerts.get(agentId) || [];
    const activeAlerts = alerts.filter(a => !a.resolved);

    if (recentData.length === 0) {
      return;
    }

    // Calculate component health
    const avgResponseTime = this.calculateAverage(recentData, 'responseTime');
    const avgSatisfaction = this.calculateAverage(recentData, 'userSatisfactionScore');
    const avgErrorRate = this.calculateAverage(recentData, 'errorRate');
    const avgCpuUsage = this.calculateAverage(recentData, 'cpuUsage');

    const thresholds = this.performanceThresholds.get(agentId) || 
                      this.performanceThresholds.get('default')!;

    const components = {
      performance: avgResponseTime < thresholds.responseTime.warning ? 'healthy' as const :
                  avgResponseTime < thresholds.responseTime.critical ? 'warning' as const : 'critical' as const,
      quality: avgSatisfaction > thresholds.userSatisfaction.warning ? 'healthy' as const :
              avgSatisfaction > thresholds.userSatisfaction.critical ? 'warning' as const : 'critical' as const,
      availability: avgErrorRate < thresholds.errorRate.warning ? 'healthy' as const :
                   avgErrorRate < thresholds.errorRate.critical ? 'warning' as const : 'critical' as const,
      resources: avgCpuUsage < 70 ? 'healthy' as const :
                avgCpuUsage < 90 ? 'warning' as const : 'critical' as const
    };

    // Calculate overall health score
    const componentScores = {
      performance: components.performance === 'healthy' ? 100 : 
                  components.performance === 'warning' ? 60 : 20,
      quality: components.quality === 'healthy' ? 100 :
              components.quality === 'warning' ? 60 : 20,
      availability: components.availability === 'healthy' ? 100 :
                   components.availability === 'warning' ? 60 : 20,
      resources: components.resources === 'healthy' ? 100 :
                components.resources === 'warning' ? 60 : 20
    };

    const healthScore = Object.values(componentScores).reduce((sum, score) => sum + score, 0) / 4;

    const overallHealth = healthScore > 80 ? 'healthy' as const :
                         healthScore > 50 ? 'warning' as const : 'critical' as const;

    const healthStatus: AgentHealthStatus = {
      agentId,
      overallHealth,
      healthScore,
      lastCheck: new Date(),
      components,
      activeAlerts: activeAlerts.length,
      uptime: 99.5, // Would be calculated from actual uptime data
      lastIncident: activeAlerts.length > 0 ? activeAlerts[0].timestamp : undefined
    };

    this.healthStatuses.set(agentId, healthStatus);
    this.emit('health:updated', healthStatus);
  }

  /**
   * Perform system-wide health checks
   */
  private performHealthChecks(): void {
    for (const agentId of this.performanceData.keys()) {
      this.updateHealthStatus(agentId);
    }
  }

  /**
   * Analyze system-wide performance
   */
  private analyzeSystemPerformance(): void {
    const systemMetrics = {
      totalAgents: this.performanceData.size,
      healthyAgents: Array.from(this.healthStatuses.values()).filter(h => h.overallHealth === 'healthy').length,
      totalAlerts: Array.from(this.activeAlerts.values()).flat().filter(a => !a.resolved).length,
      averageResponseTime: 0,
      averageUserSatisfaction: 0
    };

    // Calculate system averages
    let totalResponseTime = 0;
    let totalSatisfaction = 0;
    let totalInteractions = 0;

    for (const agentData of this.performanceData.values()) {
      const recentData = agentData.slice(-10);
      for (const data of recentData) {
        totalResponseTime += data.responseTime;
        totalSatisfaction += data.userSatisfactionScore;
        totalInteractions++;
      }
    }

    if (totalInteractions > 0) {
      systemMetrics.averageResponseTime = totalResponseTime / totalInteractions;
      systemMetrics.averageUserSatisfaction = totalSatisfaction / totalInteractions;
    }

    this.emit('system:performance', systemMetrics);
  }

  /**
   * Cleanup old performance data
   */
  private cleanupOldData(): void {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    for (const [agentId, data] of this.performanceData.entries()) {
      const filteredData = data.filter(d => d.timestamp > cutoffTime);
      this.performanceData.set(agentId, filteredData);
    }

    // Cleanup old alerts
    for (const [agentId, alerts] of this.activeAlerts.entries()) {
      const filteredAlerts = alerts.filter(a => a.timestamp > cutoffTime);
      this.activeAlerts.set(agentId, filteredAlerts);
    }
  }

  // Helper methods
  private deriveUserSatisfaction(interaction: AgentInteraction): number {
    if (interaction.user_feedback === 'helpful') return 0.9;
    if (interaction.user_feedback === 'neutral') return 0.6;
    if (interaction.user_feedback === 'unhelpful') return 0.3;
    return 0.7; // Default if no feedback
  }

  private getCutoffTime(timeframe: '1h' | '24h' | '7d' | '30d'): Date {
    const now = Date.now();
    switch (timeframe) {
      case '1h': return new Date(now - 60 * 60 * 1000);
      case '24h': return new Date(now - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateAverage(data: PerformanceMetrics[], metric: keyof PerformanceMetrics): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, d) => acc + (d[metric] as number || 0), 0);
    return sum / data.length;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  private linearRegression(points: Array<{ x: number; y: number }>): { slope: number; intercept: number; r2: number } {
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumY2 = points.reduce((sum, p) => sum + p.y * p.y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = points.reduce((sum, p) => sum + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
    const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
    const r2 = 1 - (ssRes / ssTot);

    return { slope, intercept, r2 };
  }

  private calculateTrend(
    agentId: string,
    metric: string,
    timeframe: '1h' | '24h' | '7d' | '30d',
    data: PerformanceMetrics[]
  ): PerformanceTrend {
    const values = data.map((d, i) => ({ x: i, y: (d as any)[metric] || 0 }));
    const { slope, r2 } = this.linearRegression(values);

    const trend = slope > 0.05 ? 'improving' : slope < -0.05 ? 'declining' : 'stable';
    const changeRate = slope;
    const confidence = Math.max(0, Math.min(1, r2));

    return {
      agentId,
      metric,
      timeframe,
      trend,
      changeRate,
      confidence,
      dataPoints: data.map(d => ({ timestamp: d.timestamp, value: (d as any)[metric] || 0 }))
    };
  }

  private generateSingleAgentReport(agentId: string, cutoffTime: Date): any {
    const agentData = this.performanceData.get(agentId) || [];
    const relevantData = agentData.filter(d => d.timestamp >= cutoffTime);
    
    return {
      summary: this.calculateSummaryStats(relevantData),
      trends: ['responseTime', 'userSatisfactionScore', 'therapeuticEffectiveness'].map(metric =>
        this.analyzePerformanceTrends(agentId, metric)
      ),
      alerts: this.activeAlerts.get(agentId) || [],
      recommendations: this.optimizationRecommendations.get(agentId) || [],
      health: this.healthStatuses.get(agentId)
    };
  }

  private generateSystemWideReport(cutoffTime: Date): any {
    const allData = Array.from(this.performanceData.values()).flat()
      .filter(d => d.timestamp >= cutoffTime);
    
    return {
      summary: this.calculateSummaryStats(allData),
      trends: Array.from(this.performanceData.keys()).map(agentId =>
        this.analyzePerformanceTrends(agentId, 'responseTime')
      ),
      alerts: Array.from(this.activeAlerts.values()).flat(),
      recommendations: Array.from(this.optimizationRecommendations.values()).flat(),
      health: this.healthStatuses
    };
  }

  private calculateSummaryStats(data: PerformanceMetrics[]): any {
    if (data.length === 0) {
      return {
        totalInteractions: 0,
        averageResponseTime: 0,
        averageUserSatisfaction: 0,
        successRate: 0,
        averageTherapeuticEffectiveness: 0
      };
    }

    return {
      totalInteractions: data.length,
      averageResponseTime: this.calculateAverage(data, 'responseTime'),
      averageUserSatisfaction: this.calculateAverage(data, 'userSatisfactionScore'),
      successRate: data.filter(d => d.successfulInteractions > 0).length / data.length,
      averageTherapeuticEffectiveness: this.calculateAverage(data, 'therapeuticEffectiveness')
    };
  }

  private async applyOptimization(agentId: string, recommendation: OptimizationRecommendation): Promise<void> {
    // In production, this would apply actual optimizations
    // For now, we'll simulate the application
    
    recommendation.status = 'in_progress';
    
    // Simulate optimization work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    recommendation.status = 'completed';
    
    this.emit('optimization:applied', { agentId, recommendation });
  }

  /**
   * Get performance dashboard data
   */
  getPerformanceDashboard(): {
    systemOverview: any;
    agentHealth: Map<string, AgentHealthStatus>;
    activeAlerts: PerformanceAlert[];
    topRecommendations: OptimizationRecommendation[];
  } {
    const activeAlerts = Array.from(this.activeAlerts.values())
      .flat()
      .filter(a => !a.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    const topRecommendations = Array.from(this.optimizationRecommendations.values())
      .flat()
      .filter(r => r.status === 'pending')
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 5);

    const systemOverview = {
      totalAgents: this.performanceData.size,
      healthyAgents: Array.from(this.healthStatuses.values()).filter(h => h.overallHealth === 'healthy').length,
      warningAgents: Array.from(this.healthStatuses.values()).filter(h => h.overallHealth === 'warning').length,
      criticalAgents: Array.from(this.healthStatuses.values()).filter(h => h.overallHealth === 'critical').length,
      totalAlerts: activeAlerts.length,
      totalRecommendations: topRecommendations.length
    };

    return {
      systemOverview,
      agentHealth: this.healthStatuses,
      activeAlerts,
      topRecommendations
    };
  }
}