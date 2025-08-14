/**
 * FACET Intelligent Agent Router
 * Advanced routing system with load balancing, cultural matching, and performance optimization
 */

import { EventEmitter } from 'events';
import { BaseAgent } from '../BaseAgent';
import { TherapeuticAgent, AgentInteraction } from '../types';

export interface RoutingContext {
  sessionId: string;
  userId: string;
  userInput: string;
  culturalProfile?: {
    primaryCulture?: string;
    secondaryCultures?: string[];
    languagePreferences?: string[];
    religiousBackground?: string;
    generationalStatus?: string;
  };
  sessionHistory: AgentInteraction[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  currentAgent?: string;
  preferredAgents?: string[];
  blacklistedAgents?: string[];
  performanceRequirements?: {
    maxResponseTime?: number;
    minSuccessRate?: number;
    requireSpecialization?: boolean;
  };
}

export interface RoutingDecision {
  selectedAgent: BaseAgent;
  routingScore: number;
  routingFactors: {
    culturalMatch: number;
    loadBalance: number;
    performance: number;
    specialization: number;
    userPreference: number;
    sessionContinuity: number;
  };
  alternativeAgents: BaseAgent[];
  routingReason: string;
  estimatedResponseTime: number;
  confidence: number;
}

export interface AgentPerformanceProfile {
  agentId: string;
  responseTimeStats: {
    average: number;
    median: number;
    p95: number;
    variance: number;
  };
  successMetrics: {
    overallSuccessRate: number;
    culturalSuccessRate: Map<string, number>;
    crisisHandlingRate: number;
    userSatisfactionScore: number;
  };
  loadMetrics: {
    currentSessions: number;
    maxConcurrentSessions: number;
    utilizationRate: number;
    queueLength: number;
  };
  specializationMetrics: {
    expertiseAreas: string[];
    culturalSpecializations: string[];
    interventionSuccessRates: Map<string, number>;
  };
  healthStatus: {
    isHealthy: boolean;
    lastHealthCheck: Date;
    errorRate: number;
    availability: number;
  };
}

export interface LoadBalancingStrategy {
  name: string;
  description: string;
  calculate: (agent: BaseAgent, profile: AgentPerformanceProfile, context: RoutingContext) => number;
}

export interface CulturalMatchingAlgorithm {
  name: string;
  description: string;
  calculateMatch: (agent: BaseAgent, culturalProfile: any) => number;
}

export class IntelligentRouter extends EventEmitter {
  private agentPerformanceProfiles: Map<string, AgentPerformanceProfile> = new Map();
  private loadBalancingStrategies: Map<string, LoadBalancingStrategy> = new Map();
  private culturalMatchingAlgorithms: Map<string, CulturalMatchingAlgorithm> = new Map();
  private routingHistory: Map<string, RoutingDecision[]> = new Map();
  private activeStrategy: string = 'weighted_round_robin';
  private activeCulturalAlgorithm: string = 'cultural_affinity';

  constructor() {
    super();
    this.initializeLoadBalancingStrategies();
    this.initializeCulturalMatchingAlgorithms();
    this.startPerformanceMonitoring();
  }

  /**
   * Main routing decision engine
   */
  async route(availableAgents: BaseAgent[], context: RoutingContext): Promise<RoutingDecision> {
    this.emit('routing:started', { sessionId: context.sessionId, agentCount: availableAgents.length });

    try {
      // Pre-filter agents based on hard constraints
      const eligibleAgents = this.preFilterAgents(availableAgents, context);
      
      if (eligibleAgents.length === 0) {
        throw new Error('No eligible agents available for routing');
      }

      // Calculate routing scores for each eligible agent
      const scoredAgents = await this.scoreAgents(eligibleAgents, context);

      // Select the best agent
      const selectedAgent = scoredAgents[0];
      const alternativeAgents = scoredAgents.slice(1, 4); // Top 3 alternatives

      const routingDecision: RoutingDecision = {
        selectedAgent: selectedAgent.agent,
        routingScore: selectedAgent.totalScore,
        routingFactors: selectedAgent.factors,
        alternativeAgents: alternativeAgents.map(a => a.agent),
        routingReason: this.generateRoutingReason(selectedAgent, context),
        estimatedResponseTime: this.estimateResponseTime(selectedAgent.agent, context),
        confidence: this.calculateConfidence(selectedAgent, scoredAgents)
      };

      // Store routing decision for learning
      this.storeRoutingDecision(context.sessionId, routingDecision);

      this.emit('routing:completed', { 
        sessionId: context.sessionId, 
        selectedAgent: selectedAgent.agent['agent'].id,
        score: selectedAgent.totalScore 
      });

      return routingDecision;

    } catch (error) {
      this.emit('routing:error', { sessionId: context.sessionId, error });
      throw error;
    }
  }

  /**
   * Pre-filter agents based on hard constraints
   */
  private preFilterAgents(agents: BaseAgent[], context: RoutingContext): BaseAgent[] {
    return agents.filter(agent => {
      const agentId = agent['agent'].id;
      const profile = this.agentPerformanceProfiles.get(agentId);

      // Health check
      if (profile && !profile.healthStatus.isHealthy) {
        return false;
      }

      // Blacklist check
      if (context.blacklistedAgents?.includes(agentId)) {
        return false;
      }

      // Capacity check
      if (profile && profile.loadMetrics.currentSessions >= profile.loadMetrics.maxConcurrentSessions) {
        return false;
      }

      // Performance requirements check
      if (context.performanceRequirements) {
        const reqs = context.performanceRequirements;
        
        if (reqs.maxResponseTime && profile && 
            profile.responseTimeStats.average > reqs.maxResponseTime) {
          return false;
        }
        
        if (reqs.minSuccessRate && profile && 
            profile.successMetrics.overallSuccessRate < reqs.minSuccessRate) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Score all eligible agents
   */
  private async scoreAgents(agents: BaseAgent[], context: RoutingContext): Promise<Array<{
    agent: BaseAgent;
    totalScore: number;
    factors: RoutingDecision['routingFactors'];
  }>> {
    const scoredAgents = await Promise.all(
      agents.map(async agent => {
        const factors = await this.calculateRoutingFactors(agent, context);
        const totalScore = this.calculateTotalScore(factors, context);
        
        return {
          agent,
          totalScore,
          factors
        };
      })
    );

    // Sort by total score (descending)
    return scoredAgents.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Calculate individual routing factors
   */
  private async calculateRoutingFactors(
    agent: BaseAgent, 
    context: RoutingContext
  ): Promise<RoutingDecision['routingFactors']> {
    const agentId = agent['agent'].id;
    const profile = this.agentPerformanceProfiles.get(agentId);

    return {
      culturalMatch: this.calculateCulturalMatch(agent, context),
      loadBalance: this.calculateLoadBalanceScore(agent, context),
      performance: this.calculatePerformanceScore(agent, context),
      specialization: this.calculateSpecializationScore(agent, context),
      userPreference: this.calculateUserPreferenceScore(agent, context),
      sessionContinuity: this.calculateSessionContinuityScore(agent, context)
    };
  }

  /**
   * Calculate cultural matching score
   */
  private calculateCulturalMatch(agent: BaseAgent, context: RoutingContext): number {
    if (!context.culturalProfile) return 0.5; // Neutral if no cultural profile

    const algorithm = this.culturalMatchingAlgorithms.get(this.activeCulturalAlgorithm);
    if (!algorithm) return 0.5;

    return algorithm.calculateMatch(agent, context.culturalProfile);
  }

  /**
   * Calculate load balancing score (higher = less loaded)
   */
  private calculateLoadBalanceScore(agent: BaseAgent, context: RoutingContext): number {
    const strategy = this.loadBalancingStrategies.get(this.activeStrategy);
    if (!strategy) return 0.5;

    const profile = this.agentPerformanceProfiles.get(agent['agent'].id);
    if (!profile) return 0.5;

    return strategy.calculate(agent, profile, context);
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(agent: BaseAgent, context: RoutingContext): number {
    const profile = this.agentPerformanceProfiles.get(agent['agent'].id);
    if (!profile) return 0.5;

    const successRate = profile.successMetrics.overallSuccessRate;
    const responseTimeScore = Math.max(0, 1 - (profile.responseTimeStats.average / 10000)); // Normalize to 10s max
    const satisfactionScore = profile.successMetrics.userSatisfactionScore;

    return (successRate * 0.4) + (responseTimeScore * 0.3) + (satisfactionScore * 0.3);
  }

  /**
   * Calculate specialization match score
   */
  private calculateSpecializationScore(agent: BaseAgent, context: RoutingContext): number {
    const agentCapabilities = agent['agent'].capabilities.map(cap => cap.name.toLowerCase());
    const agentSpecializations = agent['agent'].cultural_specializations.map(spec => spec.toLowerCase());
    
    // Check if user input suggests need for specific specialization
    const inputLower = context.userInput.toLowerCase();
    
    let specializationScore = 0;
    
    // Crisis specialization
    if (context.urgencyLevel === 'critical' && 
        agentCapabilities.includes('crisis intervention')) {
      specializationScore += 0.8;
    }
    
    // Cultural specialization match
    if (context.culturalProfile?.primaryCulture) {
      const primaryCulture = context.culturalProfile.primaryCulture.toLowerCase();
      if (agentSpecializations.some(spec => spec.includes(primaryCulture))) {
        specializationScore += 0.6;
      }
    }
    
    // Content-based specialization matching
    const specializationKeywords = {
      'family': ['family therapy', 'family systems', 'relationship'],
      'anxiety': ['anxiety', 'cognitive behavioral', 'cbt'],
      'mindfulness': ['mindfulness', 'meditation', 'mbsr', 'mbct'],
      'progress': ['progress tracking', 'goal setting', 'outcome measurement'],
      'culture': ['cultural integration', 'cultural identity']
    };
    
    for (const [keyword, specializations] of Object.entries(specializationKeywords)) {
      if (inputLower.includes(keyword)) {
        if (specializations.some(spec => 
          agentCapabilities.some(cap => cap.includes(spec)) ||
          agentSpecializations.some(agentSpec => agentSpec.includes(spec))
        )) {
          specializationScore += 0.4;
        }
      }
    }
    
    return Math.min(1.0, specializationScore);
  }

  /**
   * Calculate user preference score
   */
  private calculateUserPreferenceScore(agent: BaseAgent, context: RoutingContext): number {
    const agentId = agent['agent'].id;
    
    if (context.preferredAgents?.includes(agentId)) {
      return 1.0;
    }
    
    // Check historical preference based on session history
    const recentInteractions = context.sessionHistory.slice(-5);
    const agentUsageCount = recentInteractions.filter(
      interaction => interaction.agent_id === agentId
    ).length;
    
    if (agentUsageCount > 0) {
      // Slight preference for continuity, but not overwhelming
      return 0.6 + (agentUsageCount * 0.1);
    }
    
    return 0.5;
  }

  /**
   * Calculate session continuity score
   */
  private calculateSessionContinuityScore(agent: BaseAgent, context: RoutingContext): number {
    if (!context.currentAgent) return 0.5;
    
    const agentId = agent['agent'].id;
    
    // Strong preference for current agent if session is ongoing
    if (context.currentAgent === agentId) {
      return 1.0;
    }
    
    // Check for natural handoff patterns
    const lastInteraction = context.sessionHistory[context.sessionHistory.length - 1];
    if (lastInteraction?.escalation_required) {
      // If escalation required, prefer crisis agent
      if (agent['agent'].type === 'crisis_intervention') {
        return 0.9;
      }
    }
    
    return 0.3; // Lower score for switching agents
  }

  /**
   * Calculate total weighted score
   */
  private calculateTotalScore(factors: RoutingDecision['routingFactors'], context: RoutingContext): number {
    // Dynamic weights based on context
    let weights = {
      culturalMatch: 0.2,
      loadBalance: 0.15,
      performance: 0.25,
      specialization: 0.2,
      userPreference: 0.1,
      sessionContinuity: 0.1
    };

    // Adjust weights based on urgency
    if (context.urgencyLevel === 'critical') {
      weights.performance = 0.4;
      weights.specialization = 0.3;
      weights.loadBalance = 0.2;
      weights.culturalMatch = 0.05;
      weights.userPreference = 0.025;
      weights.sessionContinuity = 0.025;
    } else if (context.urgencyLevel === 'high') {
      weights.performance = 0.3;
      weights.specialization = 0.25;
      weights.loadBalance = 0.2;
      weights.culturalMatch = 0.15;
      weights.userPreference = 0.05;
      weights.sessionContinuity = 0.05;
    }

    // Calculate weighted sum
    return (
      factors.culturalMatch * weights.culturalMatch +
      factors.loadBalance * weights.loadBalance +
      factors.performance * weights.performance +
      factors.specialization * weights.specialization +
      factors.userPreference * weights.userPreference +
      factors.sessionContinuity * weights.sessionContinuity
    );
  }

  /**
   * Initialize load balancing strategies
   */
  private initializeLoadBalancingStrategies(): void {
    // Weighted Round Robin
    this.loadBalancingStrategies.set('weighted_round_robin', {
      name: 'weighted_round_robin',
      description: 'Distributes load based on agent capacity and current utilization',
      calculate: (agent, profile, context) => {
        const utilizationRate = profile.loadMetrics.utilizationRate;
        const capacityScore = 1 - utilizationRate;
        const queuePenalty = Math.max(0, 1 - (profile.loadMetrics.queueLength * 0.1));
        return capacityScore * queuePenalty;
      }
    });

    // Least Connections
    this.loadBalancingStrategies.set('least_connections', {
      name: 'least_connections',
      description: 'Routes to agent with fewest active connections',
      calculate: (agent, profile, context) => {
        const maxSessions = profile.loadMetrics.maxConcurrentSessions;
        const currentSessions = profile.loadMetrics.currentSessions;
        return 1 - (currentSessions / maxSessions);
      }
    });

    // Performance-based
    this.loadBalancingStrategies.set('performance_based', {
      name: 'performance_based',
      description: 'Routes based on historical performance metrics',
      calculate: (agent, profile, context) => {
        const successRate = profile.successMetrics.overallSuccessRate;
        const responseTimeScore = Math.max(0, 1 - (profile.responseTimeStats.average / 5000));
        const utilizationPenalty = profile.loadMetrics.utilizationRate > 0.8 ? 0.5 : 1;
        return (successRate * 0.6 + responseTimeScore * 0.4) * utilizationPenalty;
      }
    });
  }

  /**
   * Initialize cultural matching algorithms
   */
  private initializeCulturalMatchingAlgorithms(): void {
    // Cultural Affinity Algorithm
    this.culturalMatchingAlgorithms.set('cultural_affinity', {
      name: 'cultural_affinity',
      description: 'Matches agents based on cultural specializations and language preferences',
      calculateMatch: (agent, culturalProfile) => {
        const agentSpecializations = agent['agent'].cultural_specializations.map(s => s.toLowerCase());
        let matchScore = 0;

        // Primary culture match
        if (culturalProfile.primaryCulture) {
          const primaryCulture = culturalProfile.primaryCulture.toLowerCase();
          if (agentSpecializations.some(spec => spec.includes(primaryCulture))) {
            matchScore += 0.6;
          }
        }

        // Secondary cultures match
        if (culturalProfile.secondaryCultures) {
          for (const secondaryCulture of culturalProfile.secondaryCultures) {
            if (agentSpecializations.some(spec => spec.includes(secondaryCulture.toLowerCase()))) {
              matchScore += 0.2;
            }
          }
        }

        // Language preference match (simplified)
        if (culturalProfile.languagePreferences) {
          // In a real implementation, this would check agent language capabilities
          matchScore += 0.1;
        }

        // Religious/spiritual background consideration
        if (culturalProfile.religiousBackground) {
          const religiousTerms = ['spiritual', 'religious', 'faith', 'traditional'];
          if (agentSpecializations.some(spec => 
            religiousTerms.some(term => spec.includes(term))
          )) {
            matchScore += 0.1;
          }
        }

        return Math.min(1.0, matchScore);
      }
    });

    // Generational Matching Algorithm
    this.culturalMatchingAlgorithms.set('generational_matching', {
      name: 'generational_matching',
      description: 'Considers generational status in cultural matching',
      calculateMatch: (agent, culturalProfile) => {
        const agentSpecializations = agent['agent'].cultural_specializations.map(s => s.toLowerCase());
        let matchScore = 0.3; // Base score

        if (culturalProfile.generationalStatus) {
          const generationalTerms = {
            'first': ['immigration', 'acculturation', 'cultural adaptation'],
            'second': ['bicultural', 'identity', 'generational conflict'],
            'third': ['cultural heritage', 'tradition preservation']
          };

          const status = culturalProfile.generationalStatus.toLowerCase();
          const relevantTerms = generationalTerms[status] || [];

          for (const term of relevantTerms) {
            if (agentSpecializations.some(spec => spec.includes(term))) {
              matchScore += 0.2;
            }
          }
        }

        return Math.min(1.0, matchScore);
      }
    });
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Update performance profiles every minute
    setInterval(() => {
      this.updatePerformanceProfiles();
    }, 60000);

    // Cleanup old routing history every hour
    setInterval(() => {
      this.cleanupRoutingHistory();
    }, 3600000);
  }

  /**
   * Update agent performance profiles
   */
  private updatePerformanceProfiles(): void {
    // In production, this would fetch real metrics from monitoring systems
    // For now, we'll simulate some basic profile updates
    this.emit('performance:update_started');
    
    // This is where you'd integrate with your monitoring system
    // to get real performance data
    
    this.emit('performance:update_completed');
  }

  /**
   * Generate routing reason explanation
   */
  private generateRoutingReason(
    scoredAgent: { agent: BaseAgent; totalScore: number; factors: RoutingDecision['routingFactors'] },
    context: RoutingContext
  ): string {
    const factors = scoredAgent.factors;
    const reasons = [];

    if (factors.specialization > 0.7) {
      reasons.push('Strong specialization match');
    }
    
    if (factors.culturalMatch > 0.6) {
      reasons.push('Good cultural alignment');
    }
    
    if (factors.performance > 0.8) {
      reasons.push('Excellent performance history');
    }
    
    if (factors.loadBalance > 0.7) {
      reasons.push('Optimal load distribution');
    }
    
    if (factors.userPreference > 0.7) {
      reasons.push('User preference or continuity');
    }

    if (context.urgencyLevel === 'critical') {
      reasons.push('Crisis-optimized routing');
    }

    return reasons.length > 0 ? reasons.join('; ') : 'Standard routing algorithm applied';
  }

  /**
   * Estimate response time based on agent profile and context
   */
  private estimateResponseTime(agent: BaseAgent, context: RoutingContext): number {
    const profile = this.agentPerformanceProfiles.get(agent['agent'].id);
    
    if (!profile) {
      return 3000; // Default 3 seconds
    }

    let baseTime = profile.responseTimeStats.average;
    
    // Adjust for current load
    if (profile.loadMetrics.utilizationRate > 0.8) {
      baseTime *= 1.5; // 50% penalty for high utilization
    }
    
    // Adjust for urgency
    if (context.urgencyLevel === 'critical') {
      baseTime *= 0.7; // Priority processing
    }
    
    // Add queue time
    const queueTime = profile.loadMetrics.queueLength * 500; // 500ms per queued item
    
    return Math.round(baseTime + queueTime);
  }

  /**
   * Calculate confidence in routing decision
   */
  private calculateConfidence(
    selectedAgent: { totalScore: number },
    allScoredAgents: Array<{ totalScore: number }>
  ): number {
    if (allScoredAgents.length < 2) return 1.0;

    const topScore = selectedAgent.totalScore;
    const secondScore = allScoredAgents[1].totalScore;
    
    // Confidence based on score gap
    const scoreGap = topScore - secondScore;
    const confidence = Math.min(1.0, 0.5 + (scoreGap * 2));
    
    return Math.round(confidence * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Store routing decision for learning and analysis
   */
  private storeRoutingDecision(sessionId: string, decision: RoutingDecision): void {
    const sessionHistory = this.routingHistory.get(sessionId) || [];
    sessionHistory.push(decision);
    
    // Keep only last 20 decisions per session
    if (sessionHistory.length > 20) {
      sessionHistory.shift();
    }
    
    this.routingHistory.set(sessionId, sessionHistory);
  }

  /**
   * Cleanup old routing history
   */
  private cleanupRoutingHistory(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [sessionId, decisions] of this.routingHistory.entries()) {
      // Keep only recent decisions (simplified - in production, we'd check actual timestamps)
      const recentDecisions = decisions.slice(-10);
      this.routingHistory.set(sessionId, recentDecisions);
    }
  }

  /**
   * Update agent performance profile (to be called after interactions)
   */
  updateAgentPerformance(
    agentId: string, 
    responseTime: number, 
    success: boolean, 
    userSatisfaction?: number
  ): void {
    let profile = this.agentPerformanceProfiles.get(agentId);
    
    if (!profile) {
      // Create new profile with default values
      profile = {
        agentId,
        responseTimeStats: { average: 2000, median: 2000, p95: 4000, variance: 500 },
        successMetrics: {
          overallSuccessRate: 0.85,
          culturalSuccessRate: new Map(),
          crisisHandlingRate: 0.9,
          userSatisfactionScore: 0.8
        },
        loadMetrics: {
          currentSessions: 0,
          maxConcurrentSessions: 10,
          utilizationRate: 0,
          queueLength: 0
        },
        specializationMetrics: {
          expertiseAreas: [],
          culturalSpecializations: [],
          interventionSuccessRates: new Map()
        },
        healthStatus: {
          isHealthy: true,
          lastHealthCheck: new Date(),
          errorRate: 0.05,
          availability: 0.99
        }
      };
    }

    // Update response time (simplified moving average)
    profile.responseTimeStats.average = 
      (profile.responseTimeStats.average * 0.9) + (responseTime * 0.1);

    // Update success rate
    const currentSuccessRate = profile.successMetrics.overallSuccessRate;
    profile.successMetrics.overallSuccessRate = 
      (currentSuccessRate * 0.95) + ((success ? 1 : 0) * 0.05);

    // Update satisfaction if provided
    if (userSatisfaction !== undefined) {
      const currentSatisfaction = profile.successMetrics.userSatisfactionScore;
      profile.successMetrics.userSatisfactionScore = 
        (currentSatisfaction * 0.9) + (userSatisfaction * 0.1);
    }

    this.agentPerformanceProfiles.set(agentId, profile);
  }

  /**
   * Get routing analytics
   */
  getRoutingAnalytics(): {
    totalRoutingDecisions: number;
    averageRoutingScore: number;
    averageConfidence: number;
    strategyDistribution: Map<string, number>;
    agentUtilization: Map<string, number>;
  } {
    let totalDecisions = 0;
    let totalScore = 0;
    let totalConfidence = 0;
    const agentUsage = new Map<string, number>();

    for (const decisions of this.routingHistory.values()) {
      for (const decision of decisions) {
        totalDecisions++;
        totalScore += decision.routingScore;
        totalConfidence += decision.confidence;
        
        const agentId = decision.selectedAgent['agent'].id;
        agentUsage.set(agentId, (agentUsage.get(agentId) || 0) + 1);
      }
    }

    const agentUtilization = new Map<string, number>();
    for (const [agentId, usage] of agentUsage.entries()) {
      agentUtilization.set(agentId, totalDecisions > 0 ? usage / totalDecisions : 0);
    }

    return {
      totalRoutingDecisions: totalDecisions,
      averageRoutingScore: totalDecisions > 0 ? totalScore / totalDecisions : 0,
      averageConfidence: totalDecisions > 0 ? totalConfidence / totalDecisions : 0,
      strategyDistribution: new Map(), // Would track strategy usage in production
      agentUtilization
    };
  }

  /**
   * Set active load balancing strategy
   */
  setLoadBalancingStrategy(strategyName: string): void {
    if (this.loadBalancingStrategies.has(strategyName)) {
      this.activeStrategy = strategyName;
      this.emit('strategy:changed', { type: 'load_balancing', strategy: strategyName });
    } else {
      throw new Error(`Unknown load balancing strategy: ${strategyName}`);
    }
  }

  /**
   * Set active cultural matching algorithm
   */
  setCulturalMatchingAlgorithm(algorithmName: string): void {
    if (this.culturalMatchingAlgorithms.has(algorithmName)) {
      this.activeCulturalAlgorithm = algorithmName;
      this.emit('algorithm:changed', { type: 'cultural_matching', algorithm: algorithmName });
    } else {
      throw new Error(`Unknown cultural matching algorithm: ${algorithmName}`);
    }
  }
}