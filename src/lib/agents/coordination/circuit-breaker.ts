/**
 * FACET Circuit Breaker Implementation
 * Resilient agent failure handling with automatic recovery
 */

import { CircuitBreakerState, CircuitBreakerError } from '../agent-types';

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private readonly agentId: string;

  constructor(
    agentId: string,
    failureThreshold: number = 5,
    successThreshold: number = 3,
    timeoutMs: number = 60000
  ) {
    this.agentId = agentId;
    this.state = {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: undefined,
      nextRetryTime: undefined,
      successThreshold,
      failureThreshold,
      timeout: timeoutMs,
    };
  }

  /**
   * Check if the circuit breaker allows execution
   */
  canExecute(): boolean {
    const now = Date.now();

    switch (this.state.state) {
      case 'closed':
        return true;

      case 'open':
        if (this.state.nextRetryTime && now >= this.state.nextRetryTime) {
          this.state.state = 'half-open';
          this.state.failureCount = 0;
          return true;
        }
        return false;

      case 'half-open':
        return true;

      default:
        return false;
    }
  }

  /**
   * Record a successful execution
   */
  recordSuccess(): void {
    if (this.state.state === 'half-open') {
      this.state.failureCount = 0;
      if (this.state.failureCount <= 0) {
        this.state.state = 'closed';
        this.state.lastFailureTime = undefined;
        this.state.nextRetryTime = undefined;
      }
    } else if (this.state.state === 'closed') {
      this.state.failureCount = Math.max(0, this.state.failureCount - 1);
    }
  }

  /**
   * Record a failed execution
   */
  recordFailure(): void {
    const now = Date.now();
    this.state.failureCount++;
    this.state.lastFailureTime = now;

    if (this.state.state === 'closed' && this.state.failureCount >= this.state.failureThreshold) {
      this.openCircuit();
    } else if (this.state.state === 'half-open') {
      this.openCircuit();
    }
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(): void {
    const now = Date.now();
    this.state.state = 'open';
    this.state.nextRetryTime = now + this.state.timeout;
  }

  /**
   * Force the circuit breaker to a specific state
   */
  setState(newState: 'closed' | 'open' | 'half-open'): void {
    const now = Date.now();
    
    switch (newState) {
      case 'closed':
        this.state.state = 'closed';
        this.state.failureCount = 0;
        this.state.lastFailureTime = undefined;
        this.state.nextRetryTime = undefined;
        break;
        
      case 'open':
        this.openCircuit();
        break;
        
      case 'half-open':
        this.state.state = 'half-open';
        this.state.failureCount = 0;
        break;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Get circuit breaker statistics
   */
  getStatistics(): {
    totalFailures: number;
    consecutiveFailures: number;
    successRate: number;
    uptime: number;
    lastFailureTime?: number;
  } {
    const now = Date.now();
    
    return {
      totalFailures: this.state.failureCount,
      consecutiveFailures: this.state.state === 'closed' ? 0 : this.state.failureCount,
      successRate: this.calculateSuccessRate(),
      uptime: this.calculateUptime(now),
      lastFailureTime: this.state.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: undefined,
      nextRetryTime: undefined,
      successThreshold: this.state.successThreshold,
      failureThreshold: this.state.failureThreshold,
      timeout: this.state.timeout,
    };
  }

  /**
   * Calculate success rate based on recent history
   */
  private calculateSuccessRate(): number {
    if (this.state.state === 'closed' && this.state.failureCount === 0) {
      return 1.0;
    }
    
    const totalAttempts = Math.max(this.state.failureCount + this.state.successThreshold, 1);
    const successes = Math.max(totalAttempts - this.state.failureCount, 0);
    
    return successes / totalAttempts;
  }

  /**
   * Calculate uptime percentage
   */
  private calculateUptime(now: number): number {
    if (!this.state.lastFailureTime) {
      return 1.0;
    }

    const totalTime = now - (this.state.lastFailureTime - this.state.timeout);
    const downtime = this.state.state === 'open' ? 
      Math.min(now - this.state.lastFailureTime, this.state.timeout) : 0;

    return Math.max(0, (totalTime - downtime) / totalTime);
  }

  /**
   * Create a circuit breaker-aware execution wrapper
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new CircuitBreakerError(
        `Circuit breaker is ${this.state.state} for agent ${this.agentId}`,
        this.agentId,
        this.getState(),
        this.state.nextRetryTime
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Create a circuit breaker for multiple agents with shared configuration
   */
  static createMultiAgentBreaker(
    agentIds: string[],
    failureThreshold: number = 5,
    successThreshold: number = 3,
    timeoutMs: number = 60000
  ): Map<string, CircuitBreaker> {
    const breakers = new Map<string, CircuitBreaker>();
    
    for (const agentId of agentIds) {
      breakers.set(
        agentId,
        new CircuitBreaker(agentId, failureThreshold, successThreshold, timeoutMs)
      );
    }
    
    return breakers;
  }

  /**
   * Monitor circuit breaker health across multiple agents
   */
  static monitorMultiAgentHealth(
    breakers: Map<string, CircuitBreaker>
  ): {
    healthyAgents: string[];
    unhealthyAgents: string[];
    overallHealthPercentage: number;
    statistics: Map<string, any>;
  } {
    const healthyAgents: string[] = [];
    const unhealthyAgents: string[] = [];
    const statistics = new Map<string, any>();

    for (const [agentId, breaker] of breakers) {
      const state = breaker.getState();
      const stats = breaker.getStatistics();
      
      statistics.set(agentId, {
        state: state.state,
        ...stats,
      });

      if (state.state === 'closed' || state.state === 'half-open') {
        healthyAgents.push(agentId);
      } else {
        unhealthyAgents.push(agentId);
      }
    }

    const overallHealthPercentage = healthyAgents.length / breakers.size;

    return {
      healthyAgents,
      unhealthyAgents,
      overallHealthPercentage,
      statistics,
    };
  }
}