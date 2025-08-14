/**
 * FACET Enhanced Agent Orchestration Engine
 * Manages sophisticated multi-agent coordination, load balancing, and intelligent routing
 */

import { EventEmitter } from 'events';
import { AgentRegistry } from '../AgentRegistry';
import { BaseAgent } from '../BaseAgent';
import { 
  TherapeuticAgent, 
  AgentInteraction, 
  AgentCollaboration,
  CrisisAssessment 
} from '../types';

export interface OrchestrationContext {
  sessionId: string;
  userId: string;
  userInput: string;
  culturalContext?: Record<string, any>;
  sessionHistory: AgentInteraction[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  requiredCapabilities?: string[];
  excludedAgents?: string[];
  maxResponseTime?: number; // milliseconds
  preferredAgent?: string;
}

export interface AgentLoadMetrics {
  agentId: string;
  currentSessions: number;
  averageResponseTime: number;
  successRate: number;
  lastUpdated: Date;
  isHealthy: boolean;
}

export interface OrchestrationResult {
  primaryAgent: BaseAgent;
  supportingAgents: BaseAgent[];
  estimatedResponseTime: number;
  orchestrationStrategy: 'single' | 'collaborative' | 'sequential' | 'parallel';
  routingReason: string;
  loadBalancingDecision: string;
}

export interface OrchestrationStrategy {
  name: string;
  description: string;
  evaluate: (context: OrchestrationContext, availableAgents: BaseAgent[]) => number;
  execute: (context: OrchestrationContext, selectedAgents: BaseAgent[]) => Promise<AgentInteraction[]>;
}

export class OrchestrationEngine extends EventEmitter {
  private agentRegistry: AgentRegistry;
  private agentLoadMetrics: Map<string, AgentLoadMetrics> = new Map();
  private orchestrationStrategies: Map<string, OrchestrationStrategy> = new Map();
  private activeOrchestrations: Map<string, OrchestrationContext> = new Map();
  private performanceHistory: Map<string, number[]> = new Map();

  constructor(agentRegistry: AgentRegistry) {
    super();
    this.agentRegistry = agentRegistry;
    this.initializeStrategies();
    this.startMetricsCollection();
  }

  /**
   * Main orchestration entry point
   */
  async orchestrate(context: OrchestrationContext): Promise<AgentInteraction[]> {
    this.emit('orchestration:started', { sessionId: context.sessionId, urgency: context.urgencyLevel });
    
    try {
      // Store active orchestration
      this.activeOrchestrations.set(context.sessionId, context);

      // Crisis detection and immediate routing
      if (context.urgencyLevel === 'critical') {
        return await this.handleCrisisOrchestration(context);
      }

      // Get optimal orchestration result
      const orchestrationResult = await this.determineOptimalOrchestration(context);
      
      // Execute orchestration strategy
      const interactions = await this.executeOrchestration(context, orchestrationResult);

      // Update metrics
      this.updateAgentMetrics(orchestrationResult, interactions);

      this.emit('orchestration:completed', { 
        sessionId: context.sessionId, 
        strategy: orchestrationResult.orchestrationStrategy,
        agentCount: interactions.length 
      });

      return interactions;

    } catch (error) {
      this.emit('orchestration:error', { sessionId: context.sessionId, error });
      throw error;
    } finally {
      this.activeOrchestrations.delete(context.sessionId);
    }
  }

  /**
   * Determine optimal orchestration strategy and agent selection
   */
  private async determineOptimalOrchestration(context: OrchestrationContext): Promise<OrchestrationResult> {
    const availableAgents = this.getAvailableAgents(context);
    const healthyAgents = this.filterHealthyAgents(availableAgents);

    // Apply load balancing
    const loadBalancedAgents = this.applyLoadBalancing(healthyAgents, context);

    // Evaluate orchestration strategies
    const bestStrategy = this.selectBestStrategy(context, loadBalancedAgents);
    
    // Select primary and supporting agents
    const { primaryAgent, supportingAgents } = this.selectAgents(context, loadBalancedAgents, bestStrategy);

    const estimatedResponseTime = this.estimateResponseTime(primaryAgent, supportingAgents);

    return {
      primaryAgent,
      supportingAgents,
      estimatedResponseTime,
      orchestrationStrategy: bestStrategy.name as any,
      routingReason: this.generateRoutingReason(context, primaryAgent, bestStrategy),
      loadBalancingDecision: this.generateLoadBalancingReason(primaryAgent, supportingAgents)
    };
  }

  /**
   * Crisis orchestration with immediate response
   */
  private async handleCrisisOrchestration(context: OrchestrationContext): Promise<AgentInteraction[]> {
    const crisisAgent = this.agentRegistry.getAgentByType('crisis_intervention');
    
    if (!crisisAgent) {
      throw new Error('Crisis intervention agent not available');
    }

    // Immediate crisis response
    const crisisInteraction = await crisisAgent.interact(
      context.sessionId,
      context.userId,
      context.userInput,
      { ...context.culturalContext, crisis_mode: true, urgency: 'critical' }
    );

    // Notify all relevant systems
    this.emit('crisis:detected', { 
      sessionId: context.sessionId, 
      userId: context.userId,
      severity: 'critical' 
    });

    // Escalate to human oversight if required
    if (crisisInteraction.escalation_required) {
      this.emit('crisis:escalation_required', {
        sessionId: context.sessionId,
        interaction: crisisInteraction
      });
    }

    return [crisisInteraction];
  }

  /**
   * Execute the determined orchestration strategy
   */
  private async executeOrchestration(
    context: OrchestrationContext, 
    result: OrchestrationResult
  ): Promise<AgentInteraction[]> {
    const strategy = this.orchestrationStrategies.get(result.orchestrationStrategy);
    
    if (!strategy) {
      throw new Error(`Unknown orchestration strategy: ${result.orchestrationStrategy}`);
    }

    const selectedAgents = [result.primaryAgent, ...result.supportingAgents];
    return await strategy.execute(context, selectedAgents);
  }

  /**
   * Get available agents based on context
   */
  private getAvailableAgents(context: OrchestrationContext): BaseAgent[] {
    let agents = this.agentRegistry.getAllAgents();

    // Filter out excluded agents
    if (context.excludedAgents) {
      agents = agents.filter(agent => 
        !context.excludedAgents!.includes(agent['agent'].id)
      );
    }

    // Filter by required capabilities
    if (context.requiredCapabilities) {
      agents = agents.filter(agent => {
        const agentCapabilities = agent['agent'].capabilities.map(cap => cap.name);
        return context.requiredCapabilities!.some(req => 
          agentCapabilities.includes(req)
        );
      });
    }

    return agents;
  }

  /**
   * Filter agents based on health status
   */
  private filterHealthyAgents(agents: BaseAgent[]): BaseAgent[] {
    return agents.filter(agent => {
      const metrics = this.agentLoadMetrics.get(agent['agent'].id);
      return !metrics || metrics.isHealthy;
    });
  }

  /**
   * Apply load balancing to agent selection
   */
  private applyLoadBalancing(agents: BaseAgent[], context: OrchestrationContext): BaseAgent[] {
    // Sort agents by current load and performance
    return agents.sort((a, b) => {
      const aMetrics = this.agentLoadMetrics.get(a['agent'].id);
      const bMetrics = this.agentLoadMetrics.get(b['agent'].id);

      const aLoad = aMetrics ? aMetrics.currentSessions : 0;
      const bLoad = bMetrics ? bMetrics.currentSessions : 0;

      const aPerformance = aMetrics ? aMetrics.successRate : 1.0;
      const bPerformance = bMetrics ? bMetrics.successRate : 1.0;

      // Weighted score: lower load + higher performance = better
      const aScore = (aLoad * 0.4) + ((1 - aPerformance) * 0.6);
      const bScore = (bLoad * 0.4) + ((1 - bPerformance) * 0.6);

      return aScore - bScore;
    });
  }

  /**
   * Select the best orchestration strategy
   */
  private selectBestStrategy(context: OrchestrationContext, agents: BaseAgent[]): OrchestrationStrategy {
    let bestStrategy: OrchestrationStrategy | null = null;
    let bestScore = -1;

    for (const strategy of this.orchestrationStrategies.values()) {
      const score = strategy.evaluate(context, agents);
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = strategy;
      }
    }

    return bestStrategy || this.orchestrationStrategies.get('single')!;
  }

  /**
   * Select primary and supporting agents
   */
  private selectAgents(
    context: OrchestrationContext, 
    agents: BaseAgent[], 
    strategy: OrchestrationStrategy
  ): { primaryAgent: BaseAgent; supportingAgents: BaseAgent[] } {
    
    // Prefer specified agent if available and healthy
    if (context.preferredAgent) {
      const preferredAgent = agents.find(agent => 
        agent['agent'].id === context.preferredAgent
      );
      if (preferredAgent) {
        const supportingAgents = agents
          .filter(agent => agent !== preferredAgent)
          .slice(0, 2); // Limit supporting agents
        return { primaryAgent: preferredAgent, supportingAgents };
      }
    }

    // Use load balancing results
    const primaryAgent = agents[0];
    const supportingAgents = strategy.name === 'collaborative' || strategy.name === 'parallel' 
      ? agents.slice(1, 3) // Up to 2 supporting agents
      : [];

    return { primaryAgent, supportingAgents };
  }

  /**
   * Estimate response time based on agent metrics
   */
  private estimateResponseTime(primaryAgent: BaseAgent, supportingAgents: BaseAgent[]): number {
    const primaryMetrics = this.agentLoadMetrics.get(primaryAgent['agent'].id);
    const primaryTime = primaryMetrics ? primaryMetrics.averageResponseTime : 2000;

    if (supportingAgents.length === 0) {
      return primaryTime;
    }

    // For collaborative approaches, estimate parallel execution time
    const supportingTimes = supportingAgents.map(agent => {
      const metrics = this.agentLoadMetrics.get(agent['agent'].id);
      return metrics ? metrics.averageResponseTime : 2000;
    });

    // Parallel execution: max time + coordination overhead
    const maxSupportingTime = Math.max(...supportingTimes);
    const coordinationOverhead = 500; // milliseconds

    return Math.max(primaryTime, maxSupportingTime) + coordinationOverhead;
  }

  /**
   * Initialize orchestration strategies
   */
  private initializeStrategies(): void {
    // Single Agent Strategy
    this.orchestrationStrategies.set('single', {
      name: 'single',
      description: 'Single agent handles the entire interaction',
      evaluate: (context, agents) => {
        // Prefer single agent for simple interactions
        if (context.urgencyLevel === 'low' && context.sessionHistory.length < 3) {
          return 0.8;
        }
        return 0.3;
      },
      execute: async (context, agents) => {
        const primaryAgent = agents[0];
        const interaction = await primaryAgent.interact(
          context.sessionId,
          context.userId,
          context.userInput,
          context.culturalContext || {}
        );
        return [interaction];
      }
    });

    // Collaborative Strategy
    this.orchestrationStrategies.set('collaborative', {
      name: 'collaborative',
      description: 'Multiple agents collaborate on the response',
      evaluate: (context, agents) => {
        // Prefer collaboration for complex cultural contexts
        if (context.culturalContext && Object.keys(context.culturalContext).length > 2) {
          return 0.9;
        }
        if (context.urgencyLevel === 'medium' && agents.length >= 2) {
          return 0.7;
        }
        return 0.4;
      },
      execute: async (context, agents) => {
        const primaryAgent = agents[0];
        const supportingAgents = agents.slice(1);

        // Primary response
        const primaryInteraction = await primaryAgent.interact(
          context.sessionId,
          context.userId,
          context.userInput,
          context.culturalContext || {}
        );

        const interactions = [primaryInteraction];

        // Supporting consultations
        for (const supportingAgent of supportingAgents) {
          const consultation = await supportingAgent.interact(
            context.sessionId,
            context.userId,
            `Consultation on: ${context.userInput}`,
            { 
              ...context.culturalContext, 
              consultation_mode: true, 
              primary_response: primaryInteraction.response 
            }
          );
          interactions.push(consultation);
        }

        return interactions;
      }
    });

    // Sequential Strategy
    this.orchestrationStrategies.set('sequential', {
      name: 'sequential',
      description: 'Agents work in sequence, building on each other',
      evaluate: (context, agents) => {
        // Good for progress tracking and structured approaches
        if (context.userInput.toLowerCase().includes('progress') ||
            context.userInput.toLowerCase().includes('goal')) {
          return 0.8;
        }
        return 0.3;
      },
      execute: async (context, agents) => {
        const interactions: AgentInteraction[] = [];
        let currentContext = { ...context.culturalContext };

        for (const agent of agents) {
          const interaction = await agent.interact(
            context.sessionId,
            context.userId,
            context.userInput,
            currentContext
          );
          
          interactions.push(interaction);
          
          // Build context for next agent
          currentContext = {
            ...currentContext,
            previous_interaction: interaction,
            sequence_step: interactions.length
          };
        }

        return interactions;
      }
    });

    // Parallel Strategy
    this.orchestrationStrategies.set('parallel', {
      name: 'parallel',
      description: 'Multiple agents work simultaneously',
      evaluate: (context, agents) => {
        // Good for urgent situations requiring multiple perspectives
        if (context.urgencyLevel === 'high' && agents.length >= 2) {
          return 0.9;
        }
        if (context.maxResponseTime && context.maxResponseTime < 3000) {
          return 0.7;
        }
        return 0.4;
      },
      execute: async (context, agents) => {
        // Execute all agents in parallel
        const interactionPromises = agents.map(agent =>
          agent.interact(
            context.sessionId,
            context.userId,
            context.userInput,
            { ...context.culturalContext, parallel_mode: true }
          )
        );

        const interactions = await Promise.all(interactionPromises);
        return interactions;
      }
    });
  }

  /**
   * Start collecting agent performance metrics
   */
  private startMetricsCollection(): void {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateAllAgentMetrics();
    }, 30000);

    // Cleanup old performance history every 5 minutes
    setInterval(() => {
      this.cleanupPerformanceHistory();
    }, 300000);
  }

  /**
   * Update metrics for all agents
   */
  private updateAllAgentMetrics(): void {
    for (const agent of this.agentRegistry.getAllAgents()) {
      const agentId = agent['agent'].id;
      const currentMetrics = this.agentLoadMetrics.get(agentId);
      
      // In production, these would be real metrics from monitoring systems
      const updatedMetrics: AgentLoadMetrics = {
        agentId,
        currentSessions: this.getActiveSessionCount(agentId),
        averageResponseTime: this.calculateAverageResponseTime(agentId),
        successRate: this.calculateSuccessRate(agentId),
        lastUpdated: new Date(),
        isHealthy: this.assessAgentHealth(agentId)
      };

      this.agentLoadMetrics.set(agentId, updatedMetrics);
    }
  }

  /**
   * Update agent metrics after orchestration
   */
  private updateAgentMetrics(result: OrchestrationResult, interactions: AgentInteraction[]): void {
    const allAgents = [result.primaryAgent, ...result.supportingAgents];
    
    for (let i = 0; i < allAgents.length; i++) {
      const agent = allAgents[i];
      const interaction = interactions[i];
      
      if (interaction) {
        // Record performance data
        const agentId = agent['agent'].id;
        const performanceData = this.performanceHistory.get(agentId) || [];
        
        // Estimate response time (in production, this would be measured)
        const responseTime = result.estimatedResponseTime;
        performanceData.push(responseTime);
        
        // Keep only last 100 measurements
        if (performanceData.length > 100) {
          performanceData.shift();
        }
        
        this.performanceHistory.set(agentId, performanceData);
      }
    }
  }

  /**
   * Generate routing reason explanation
   */
  private generateRoutingReason(
    context: OrchestrationContext, 
    primaryAgent: BaseAgent, 
    strategy: OrchestrationStrategy
  ): string {
    const reasons = [];
    
    if (context.preferredAgent === primaryAgent['agent'].id) {
      reasons.push('User preferred agent');
    }
    
    if (context.urgencyLevel === 'critical') {
      reasons.push('Crisis situation requiring immediate response');
    }
    
    const metrics = this.agentLoadMetrics.get(primaryAgent['agent'].id);
    if (metrics && metrics.currentSessions < 3) {
      reasons.push('Agent has low current load');
    }
    
    if (strategy.name === 'collaborative') {
      reasons.push('Complex context benefits from multiple perspectives');
    }
    
    return reasons.join('; ') || 'Default routing based on agent capabilities';
  }

  /**
   * Generate load balancing explanation
   */
  private generateLoadBalancingReason(primaryAgent: BaseAgent, supportingAgents: BaseAgent[]): string {
    const primaryMetrics = this.agentLoadMetrics.get(primaryAgent['agent'].id);
    const reasons = [];
    
    if (primaryMetrics) {
      reasons.push(`Primary agent load: ${primaryMetrics.currentSessions} sessions`);
      reasons.push(`Success rate: ${(primaryMetrics.successRate * 100).toFixed(1)}%`);
    }
    
    if (supportingAgents.length > 0) {
      reasons.push(`${supportingAgents.length} supporting agents selected for collaboration`);
    }
    
    return reasons.join('; ') || 'Standard load balancing applied';
  }

  // Helper methods for metrics calculation
  private getActiveSessionCount(agentId: string): number {
    // In production, this would query active sessions
    return Math.floor(Math.random() * 5);
  }

  private calculateAverageResponseTime(agentId: string): number {
    const performanceData = this.performanceHistory.get(agentId) || [];
    if (performanceData.length === 0) return 2000;
    
    const sum = performanceData.reduce((acc, time) => acc + time, 0);
    return sum / performanceData.length;
  }

  private calculateSuccessRate(agentId: string): number {
    // In production, this would be based on actual success metrics
    return 0.85 + (Math.random() * 0.15); // 85-100% success rate
  }

  private assessAgentHealth(agentId: string): boolean {
    const metrics = this.agentLoadMetrics.get(agentId);
    if (!metrics) return true;
    
    return metrics.successRate > 0.7 && 
           metrics.averageResponseTime < 10000 && 
           metrics.currentSessions < 10;
  }

  private cleanupPerformanceHistory(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [agentId, data] of this.performanceHistory.entries()) {
      // Keep only recent data (this is simplified - in production, we'd have timestamps)
      const recentData = data.slice(-50); // Keep last 50 measurements
      this.performanceHistory.set(agentId, recentData);
    }
  }

  /**
   * Get current orchestration status
   */
  getOrchestrationStatus(): {
    activeOrchestrations: number;
    agentLoadMetrics: Map<string, AgentLoadMetrics>;
    availableStrategies: string[];
  } {
    return {
      activeOrchestrations: this.activeOrchestrations.size,
      agentLoadMetrics: new Map(this.agentLoadMetrics),
      availableStrategies: Array.from(this.orchestrationStrategies.keys())
    };
  }

  /**
   * Get agent performance report
   */
  getPerformanceReport(agentId?: string): Map<string, AgentLoadMetrics> | AgentLoadMetrics | null {
    if (agentId) {
      return this.agentLoadMetrics.get(agentId) || null;
    }
    return new Map(this.agentLoadMetrics);
  }
}