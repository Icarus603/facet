/**
 * FACET Redis Agent Coordinator
 * High-level coordination interface built on CoordinationBus
 */

import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import { CoordinationBus, CoordinationBusConfig } from '../../redis/coordination-bus';
import {
  AgentType,
  AgentMessage,
  AgentResponse,
  CoordinationEvent,
  RedisMessage,
  CoordinatedResponse,
  CoordinationStrategy,
  TherapyTask,
} from '../agent-types';

export interface CoordinationRequest {
  id: string;
  sessionId: string;
  agentIds: string[];
  strategy: CoordinationStrategy;
  task: TherapyTask;
  timeout: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  startTime: number;
}

export interface CoordinationResult {
  coordinationId: string;
  responses: AgentResponse[];
  strategy: CoordinationStrategy;
  success: boolean;
  totalTime: number;
  errors: Array<{ agentId: string; error: string }>;
}

export class RedisCoordinator extends EventEmitter {
  private readonly coordinationBus: CoordinationBus;
  private readonly activeCoordinations = new Map<string, CoordinationRequest>();
  private readonly coordinationResults = new Map<string, Partial<CoordinationResult>>();
  private readonly agentResponseTimeouts = new Map<string, NodeJS.Timeout>();
  
  private readonly metrics = {
    totalCoordinations: 0,
    successfulCoordinations: 0,
    failedCoordinations: 0,
    averageCoordinationTime: 0,
    activeCoordinations: 0,
  };

  constructor(config: CoordinationBusConfig) {
    super();
    this.coordinationBus = new CoordinationBus(config);
    this.setupEventHandlers();
  }

  // ============================================================================
  // PUBLIC INTERFACE
  // ============================================================================

  /**
   * Initialize the coordinator
   */
  async initialize(): Promise<void> {
    await this.coordinationBus.initialize();
    
    // Subscribe to agent responses
    await this.coordinationBus.subscribe(
      'coordination:responses:*',
      this.handleAgentResponse.bind(this)
    );

    // Subscribe to coordination events
    await this.coordinationBus.subscribe(
      'coordination:events:*',
      this.handleCoordinationEvent.bind(this)
    );

    this.emit('initialized', {
      timestamp: Date.now(),
    });
  }

  /**
   * Coordinate multiple agents for a therapy task
   */
  async coordinateAgents(
    sessionId: string,
    agentIds: string[],
    task: TherapyTask,
    strategy: CoordinationStrategy = 'parallel',
    timeoutMs: number = 30000
  ): Promise<CoordinatedResponse> {
    const coordinationId = nanoid();
    const startTime = Date.now();

    try {
      this.metrics.totalCoordinations++;
      this.metrics.activeCoordinations++;

      // Create coordination request
      const request: CoordinationRequest = {
        id: coordinationId,
        sessionId,
        agentIds,
        strategy,
        task,
        timeout: timeoutMs,
        priority: task.priority,
        startTime,
      };

      this.activeCoordinations.set(coordinationId, request);
      this.coordinationResults.set(coordinationId, {
        coordinationId,
        responses: [],
        strategy,
        success: false,
        totalTime: 0,
        errors: [],
      });

      // Store coordination state for recovery
      await this.coordinationBus.storeCoordinationState(coordinationId, {
        request,
        status: 'started',
        timestamp: startTime,
      });

      // Execute coordination based on strategy
      const result = await this.executeCoordinationStrategy(request);

      // Update metrics
      this.metrics.activeCoordinations--;
      if (result.success) {
        this.metrics.successfulCoordinations++;
      } else {
        this.metrics.failedCoordinations++;
      }

      const totalTime = Date.now() - startTime;
      this.metrics.averageCoordinationTime = 
        (this.metrics.averageCoordinationTime * (this.metrics.totalCoordinations - 1) + totalTime) / 
        this.metrics.totalCoordinations;

      // Create coordinated response
      const response: CoordinatedResponse = {
        coordinationId,
        strategy,
        agentResponses: result.responses,
        synthesizedResponse: this.synthesizeResponses(result.responses, strategy),
        consensusScore: this.calculateConsensusScore(result.responses),
        coordinationMetrics: {
          totalProcessingTime: totalTime,
          parallelEfficiency: this.calculateParallelEfficiency(result.responses, strategy),
          resourceUtilization: this.calculateResourceUtilization(result.responses),
        },
        culturalIntegration: this.extractCulturalIntegration(result.responses),
        timestamp: Date.now(),
      };

      // Emit coordination completed event
      await this.emitCoordinationEvent({
        id: nanoid(),
        type: 'coordination_completed',
        sessionId,
        coordinationId,
        details: {
          agentCount: agentIds.length,
          strategy,
          success: result.success,
          totalTime,
        },
        timestamp: Date.now(),
        processingTimeMs: totalTime,
      });

      return response;

    } catch (error) {
      this.metrics.activeCoordinations--;
      this.metrics.failedCoordinations++;

      await this.emitCoordinationEvent({
        id: nanoid(),
        type: 'failure_detected',
        sessionId,
        coordinationId,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          agentIds,
          strategy,
        },
        timestamp: Date.now(),
      });

      throw error;

    } finally {
      // Cleanup
      this.activeCoordinations.delete(coordinationId);
      this.coordinationResults.delete(coordinationId);
      this.clearAgentTimeouts(coordinationId);
    }
  }

  /**
   * Send message to specific agent
   */
  async sendToAgent(agentId: string, message: AgentMessage): Promise<void> {
    const redisMessage: RedisMessage = {
      type: 'agent_request',
      correlationId: message.id,
      payload: message,
      timestamp: Date.now(),
    };

    await this.coordinationBus.sendToAgent(agentId, redisMessage);
  }

  /**
   * Subscribe to coordination events
   */
  async subscribe(pattern: string, handler: (channel: string, message: string) => void): Promise<void> {
    await this.coordinationBus.subscribe(pattern, handler);
  }

  /**
   * Unsubscribe from coordination events
   */
  async unsubscribe(pattern: string, handler?: (channel: string, message: string) => void): Promise<void> {
    await this.coordinationBus.unsubscribe(pattern, handler);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return await this.coordinationBus.healthCheck();
  }

  /**
   * Get coordination metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Shutdown coordinator
   */
  async shutdown(): Promise<void> {
    // Cancel active coordinations
    for (const [coordinationId, request] of this.activeCoordinations) {
      await this.emitCoordinationEvent({
        id: nanoid(),
        type: 'coordination_started', // This should be a 'coordination_cancelled' type
        sessionId: request.sessionId,
        coordinationId,
        details: { reason: 'shutdown' },
        timestamp: Date.now(),
      });
    }

    this.clearAllTimeouts();
    await this.coordinationBus.shutdown();
  }

  // ============================================================================
  // COORDINATION STRATEGIES
  // ============================================================================

  /**
   * Execute coordination based on strategy
   */
  private async executeCoordinationStrategy(request: CoordinationRequest): Promise<CoordinationResult> {
    switch (request.strategy) {
      case 'parallel':
        return await this.executeParallelCoordination(request);
      case 'sequential':
        return await this.executeSequentialCoordination(request);
      case 'hierarchical':
        return await this.executeHierarchicalCoordination(request);
      case 'consensus':
        return await this.executeConsensusCoordination(request);
      default:
        throw new Error(`Unsupported coordination strategy: ${request.strategy}`);
    }
  }

  /**
   * Execute parallel coordination
   */
  private async executeParallelCoordination(request: CoordinationRequest): Promise<CoordinationResult> {
    const promises = request.agentIds.map(agentId => 
      this.requestAgentResponse(agentId, request)
    );

    try {
      const responses = await Promise.allSettled(promises);
      const result = this.processSettledResponses(request, responses);
      return result;
    } catch (error) {
      throw new Error(`Parallel coordination failed: ${error}`);
    }
  }

  /**
   * Execute sequential coordination
   */
  private async executeSequentialCoordination(request: CoordinationRequest): Promise<CoordinationResult> {
    const responses: AgentResponse[] = [];
    const errors: Array<{ agentId: string; error: string }> = [];
    
    for (const agentId of request.agentIds) {
      try {
        const response = await this.requestAgentResponse(agentId, request);
        responses.push(response);
        
        // Pass previous responses as context for next agent
        request.task.metadata = {
          ...request.task.metadata,
          previousResponses: responses,
        };
      } catch (error) {
        errors.push({
          agentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      coordinationId: request.id,
      responses,
      strategy: request.strategy,
      success: responses.length > 0,
      totalTime: Date.now() - request.startTime,
      errors,
    };
  }

  /**
   * Execute hierarchical coordination
   */
  private async executeHierarchicalCoordination(request: CoordinationRequest): Promise<CoordinationResult> {
    // Define hierarchy: therapy_coordinator -> others
    const coordinator = request.agentIds.find(id => id.includes('therapy_coordinator'));
    const subordinates = request.agentIds.filter(id => id !== coordinator);

    const responses: AgentResponse[] = [];
    const errors: Array<{ agentId: string; error: string }> = [];

    // First, get coordinator response
    if (coordinator) {
      try {
        const coordinatorResponse = await this.requestAgentResponse(coordinator, request);
        responses.push(coordinatorResponse);
        
        // Use coordinator's response to guide subordinate tasks
        request.task.metadata = {
          ...request.task.metadata,
          coordinatorGuidance: coordinatorResponse,
        };
      } catch (error) {
        errors.push({
          agentId: coordinator,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Then, coordinate subordinates in parallel
    if (subordinates.length > 0) {
      const subordinatePromises = subordinates.map(agentId =>
        this.requestAgentResponse(agentId, request)
      );

      const subordinateResults = await Promise.allSettled(subordinatePromises);
      const subordinateResponse = this.processSettledResponses(request, subordinateResults);
      
      responses.push(...subordinateResponse.responses);
      errors.push(...subordinateResponse.errors);
    }

    return {
      coordinationId: request.id,
      responses,
      strategy: request.strategy,
      success: responses.length > 0,
      totalTime: Date.now() - request.startTime,
      errors,
    };
  }

  /**
   * Execute consensus coordination
   */
  private async executeConsensusCoordination(request: CoordinationRequest): Promise<CoordinationResult> {
    // First round - get all agent responses
    const firstRoundPromises = request.agentIds.map(agentId =>
      this.requestAgentResponse(agentId, request)
    );

    const firstRoundResults = await Promise.allSettled(firstRoundPromises);
    const firstRoundResponse = this.processSettledResponses(request, firstRoundResults);

    if (firstRoundResponse.responses.length < 2) {
      return firstRoundResponse;
    }

    // Check for consensus
    const consensusScore = this.calculateConsensusScore(firstRoundResponse.responses);
    
    if (consensusScore >= 0.8) {
      return firstRoundResponse;
    }

    // Second round - present all responses to agents for consensus
    request.task.metadata = {
      ...request.task.metadata,
      consensusRound: true,
      allResponses: firstRoundResponse.responses,
    };

    const secondRoundPromises = request.agentIds.map(agentId =>
      this.requestAgentResponse(agentId, request)
    );

    const secondRoundResults = await Promise.allSettled(secondRoundPromises);
    const finalResponse = this.processSettledResponses(request, secondRoundResults);

    return {
      coordinationId: request.id,
      responses: [...firstRoundResponse.responses, ...finalResponse.responses],
      strategy: request.strategy,
      success: finalResponse.responses.length > 0,
      totalTime: Date.now() - request.startTime,
      errors: [...firstRoundResponse.errors, ...finalResponse.errors],
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Request response from individual agent
   */
  private async requestAgentResponse(agentId: string, request: CoordinationRequest): Promise<AgentResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Agent ${agentId} response timeout`));
      }, request.timeout);

      this.agentResponseTimeouts.set(`${request.id}:${agentId}`, timeout);

      // Store response handler
      const responseKey = `${request.id}:${agentId}`;
      const responseHandler = (response: AgentResponse) => {
        clearTimeout(timeout);
        this.agentResponseTimeouts.delete(responseKey);
        resolve(response);
      };

      this.once(`agent_response:${responseKey}`, responseHandler);

      // Send request to agent
      const message: AgentMessage = {
        id: nanoid(),
        type: 'coordination',
        content: JSON.stringify(request.task),
        metadata: {
          coordinationId: request.id,
          sessionId: request.sessionId,
          agentIds: request.agentIds,
          strategy: request.strategy,
        },
        priority: request.priority,
        source: 'coordinator',
        timestamp: Date.now(),
        encrypted: false,
      };

      this.sendToAgent(agentId, message).catch(reject);
    });
  }

  /**
   * Process Promise.allSettled results
   */
  private processSettledResponses(
    request: CoordinationRequest,
    results: PromiseSettledResult<AgentResponse>[]
  ): CoordinationResult {
    const responses: AgentResponse[] = [];
    const errors: Array<{ agentId: string; error: string }> = [];

    results.forEach((result, index) => {
      const agentId = request.agentIds[index];
      
      if (result.status === 'fulfilled') {
        responses.push(result.value);
      } else {
        errors.push({
          agentId,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    });

    return {
      coordinationId: request.id,
      responses,
      strategy: request.strategy,
      success: responses.length > 0,
      totalTime: Date.now() - request.startTime,
      errors,
    };
  }

  /**
   * Handle agent response from Redis
   */
  private handleAgentResponse(channel: string, message: string): void {
    try {
      const data = JSON.parse(message);
      const response: AgentResponse = data.payload;
      const coordinationId = data.correlationId;
      const agentId = response.agentId;
      
      this.emit(`agent_response:${coordinationId}:${agentId}`, response);
    } catch (error) {
      console.error('Error handling agent response:', error);
    }
  }

  /**
   * Handle coordination events
   */
  private handleCoordinationEvent(channel: string, message: string): void {
    try {
      const data = JSON.parse(message);
      const event: CoordinationEvent = data.payload;
      
      this.emit('coordination_event', event);
    } catch (error) {
      console.error('Error handling coordination event:', error);
    }
  }

  /**
   * Emit coordination event
   */
  private async emitCoordinationEvent(event: CoordinationEvent): Promise<void> {
    await this.coordinationBus.broadcastCoordinationEvent(event);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.coordinationBus.on('redis_error', (error) => {
      this.emit('error', error);
    });

    this.coordinationBus.on('redis_disconnected', (event) => {
      this.emit('disconnected', event);
    });
  }

  /**
   * Synthesize multiple agent responses
   */
  private synthesizeResponses(responses: AgentResponse[], strategy: CoordinationStrategy): string {
    if (responses.length === 0) {
      return 'No agent responses received';
    }

    if (responses.length === 1) {
      return responses[0].content;
    }

    switch (strategy) {
      case 'consensus':
        return this.synthesizeConsensusResponse(responses);
      case 'hierarchical':
        return this.synthesizeHierarchicalResponse(responses);
      default:
        return this.synthesizeDefaultResponse(responses);
    }
  }

  /**
   * Synthesize consensus response
   */
  private synthesizeConsensusResponse(responses: AgentResponse[]): string {
    const highConfidenceResponses = responses.filter(r => r.confidence > 0.8);
    
    if (highConfidenceResponses.length > 0) {
      return highConfidenceResponses
        .map(r => r.content)
        .join(' ');
    }

    return responses
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 2)
      .map(r => r.content)
      .join(' ');
  }

  /**
   * Synthesize hierarchical response
   */
  private synthesizeHierarchicalResponse(responses: AgentResponse[]): string {
    const coordinator = responses.find(r => r.agentType === 'therapy_coordinator');
    
    if (coordinator) {
      const others = responses.filter(r => r.agentType !== 'therapy_coordinator');
      return `${coordinator.content} ${others.map(r => r.content).join(' ')}`;
    }

    return this.synthesizeDefaultResponse(responses);
  }

  /**
   * Synthesize default response
   */
  private synthesizeDefaultResponse(responses: AgentResponse[]): string {
    return responses
      .sort((a, b) => b.confidence - a.confidence)
      .map(r => r.content)
      .join(' ');
  }

  /**
   * Calculate consensus score
   */
  private calculateConsensusScore(responses: AgentResponse[]): number {
    if (responses.length < 2) return 1.0;

    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    const confidenceVariance = responses.reduce((sum, r) => sum + Math.pow(r.confidence - avgConfidence, 2), 0) / responses.length;
    
    return Math.max(0, 1 - confidenceVariance);
  }

  /**
   * Calculate parallel efficiency
   */
  private calculateParallelEfficiency(responses: AgentResponse[], strategy: CoordinationStrategy): number {
    if (strategy !== 'parallel') return 1.0;

    const maxTime = Math.max(...responses.map(r => r.processingTimeMs));
    const totalTime = responses.reduce((sum, r) => sum + r.processingTimeMs, 0);
    
    return maxTime > 0 ? maxTime / (totalTime / responses.length) : 1.0;
  }

  /**
   * Calculate resource utilization
   */
  private calculateResourceUtilization(responses: AgentResponse[]): number {
    const avgProcessingTime = responses.reduce((sum, r) => sum + r.processingTimeMs, 0) / responses.length;
    const optimalTime = 2000; // 2 seconds target
    
    return Math.min(1.0, optimalTime / avgProcessingTime);
  }

  /**
   * Extract cultural integration info
   */
  private extractCulturalIntegration(responses: AgentResponse[]): Record<string, any> {
    const culturalAdapters = responses.filter(r => r.agentType === 'cultural_adapter');
    
    if (culturalAdapters.length === 0) return {};

    return {
      culturalRelevanceScore: culturalAdapters.reduce((sum, r) => sum + (r.culturalRelevance || 0), 0) / culturalAdapters.length,
      culturalAdaptations: culturalAdapters.flatMap(r => r.actionItems || []),
      culturalMetadata: culturalAdapters.flatMap(r => Object.keys(r.metadata || {})),
    };
  }

  /**
   * Clear agent timeouts for coordination
   */
  private clearAgentTimeouts(coordinationId: string): void {
    for (const [key, timeout] of this.agentResponseTimeouts) {
      if (key.startsWith(coordinationId)) {
        clearTimeout(timeout);
        this.agentResponseTimeouts.delete(key);
      }
    }
  }

  /**
   * Clear all timeouts
   */
  private clearAllTimeouts(): void {
    for (const timeout of this.agentResponseTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.agentResponseTimeouts.clear();
  }
}