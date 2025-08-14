/**
 * FACET Base Agent Implementation
 * Abstract base class for all therapy agents with HIPAA compliance
 */

import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import {
  AgentType,
  AgentStatus,
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentPerformanceMetrics,
  CircuitBreakerState,
  AgentError,
  CircuitBreakerError,
} from './agent-types';
import { AzureOpenAIClient } from '../llm/azure-openai';
import { RedisCoordinator } from './coordination/redis-coordinator';
import { CircuitBreaker } from './coordination/circuit-breaker';

export abstract class BaseAgent extends EventEmitter {
  protected readonly id: string;
  protected readonly type: AgentType;
  protected readonly config: AgentConfig;
  protected status: AgentStatus = 'idle';
  protected readonly llmClient: AzureOpenAIClient;
  protected readonly redisCoordinator: RedisCoordinator;
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly performanceMetrics: AgentPerformanceMetrics;
  protected activeSessions: Set<string> = new Set();
  protected lastHealthCheck: number = Date.now();

  constructor(
    type: AgentType,
    config: AgentConfig,
    llmClient: AzureOpenAIClient,
    redisCoordinator: RedisCoordinator
  ) {
    super();
    this.id = config.id;
    this.type = type;
    this.config = config;
    this.llmClient = llmClient;
    this.redisCoordinator = redisCoordinator;
    
    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      this.id,
      config.circuitBreaker.failureThreshold,
      config.circuitBreaker.successThreshold,
      config.circuitBreaker.timeoutMs
    );

    // Initialize performance metrics
    this.performanceMetrics = {
      agentId: this.id,
      responseTime: 0,
      successRate: 1.0,
      userSatisfaction: 1.0,
      culturalAccuracy: 1.0,
      resourceUsage: {
        cpuPercent: 0,
        memoryMb: 0,
        tokensUsed: 0,
        costUsd: 0,
      },
      errorCount: 0,
      lastHealthCheck: Date.now(),
    };

    // Start health check interval
    this.startHealthCheckInterval();
  }

  // ============================================================================
  // PUBLIC INTERFACE
  // ============================================================================

  /**
   * Process an incoming message with full error handling and monitoring
   */
  async processMessage(message: AgentMessage, context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    const correlationId = context.correlationId;

    try {
      // Check circuit breaker state
      if (!this.circuitBreaker.canExecute()) {
        const state = this.circuitBreaker.getState();
        throw new CircuitBreakerError(
          `Agent ${this.id} is currently unavailable (circuit breaker: ${state.state})`,
          this.id,
          state,
          state.nextRetryTime
        );
      }

      // Validate session capacity
      if (this.activeSessions.size >= this.config.maxConcurrentSessions) {
        throw new AgentError(
          `Agent ${this.id} has reached maximum concurrent sessions`,
          this.id,
          this.type,
          'CAPACITY_EXCEEDED',
          true
        );
      }

      // Add session tracking
      this.activeSessions.add(context.sessionId);
      this.status = 'processing';

      // Emit processing event
      this.emit('processing_started', {
        agentId: this.id,
        sessionId: context.sessionId,
        correlationId,
        timestamp: startTime,
      });

      // Process the message using agent-specific logic
      const response = await this.executeAgentLogic(message, context);

      // Update circuit breaker on success
      this.circuitBreaker.recordSuccess();

      // Calculate processing time
      const processingTime = Date.now() - startTime;
      response.processingTimeMs = processingTime;

      // Update performance metrics
      this.updatePerformanceMetrics(processingTime, true);

      // Emit success event
      this.emit('processing_completed', {
        agentId: this.id,
        sessionId: context.sessionId,
        correlationId,
        processingTime,
        success: true,
        timestamp: Date.now(),
      });

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Record failure in circuit breaker
      this.circuitBreaker.recordFailure();
      
      // Update performance metrics
      this.updatePerformanceMetrics(processingTime, false);

      // Emit error event
      this.emit('processing_error', {
        agentId: this.id,
        sessionId: context.sessionId,
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        timestamp: Date.now(),
      });

      // Re-throw the error for upstream handling
      throw error;

    } finally {
      // Cleanup session tracking
      this.activeSessions.delete(context.sessionId);
      this.status = this.activeSessions.size > 0 ? 'busy' : 'idle';
    }
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    try {
      this.status = 'idle';
      await this.performHealthCheck();
      
      // Subscribe to Redis coordination events
      await this.redisCoordinator.subscribe(
        `agent:${this.id}:*`,
        this.handleCoordinationEvent.bind(this)
      );

      this.emit('initialized', {
        agentId: this.id,
        agentType: this.type,
        timestamp: Date.now(),
      });

    } catch (error) {
      this.status = 'failed';
      throw new AgentError(
        `Failed to initialize agent ${this.id}`,
        this.id,
        this.type,
        'INITIALIZATION_FAILED',
        false,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Shutdown the agent gracefully
   */
  async shutdown(): Promise<void> {
    try {
      this.status = 'offline';
      
      // Wait for active sessions to complete (with timeout)
      const shutdownTimeout = 30000; // 30 seconds
      const shutdownStart = Date.now();
      
      while (this.activeSessions.size > 0 && (Date.now() - shutdownStart) < shutdownTimeout) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Force cleanup if sessions still active
      if (this.activeSessions.size > 0) {
        console.warn(`Agent ${this.id} shutting down with ${this.activeSessions.size} active sessions`);
        this.activeSessions.clear();
      }

      // Unsubscribe from Redis events
      await this.redisCoordinator.unsubscribe(`agent:${this.id}:*`);

      this.emit('shutdown', {
        agentId: this.id,
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error(`Error during agent ${this.id} shutdown:`, error);
    }
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Get agent performance metrics
   */
  getPerformanceMetrics(): AgentPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }

  // ============================================================================
  // ABSTRACT METHODS (IMPLEMENTED BY SPECIFIC AGENTS)
  // ============================================================================

  /**
   * Agent-specific message processing logic
   */
  protected abstract executeAgentLogic(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse>;

  /**
   * Agent-specific capabilities
   */
  abstract getCapabilities(): string[];

  /**
   * Agent-specific health check
   */
  protected abstract performAgentSpecificHealthCheck(): Promise<boolean>;

  // ============================================================================
  // PROTECTED HELPER METHODS
  // ============================================================================

  /**
   * Generate LLM response using Azure OpenAI
   */
  protected async generateLLMResponse(
    prompt: string,
    context: AgentContext,
    systemPrompt?: string
  ): Promise<string> {
    try {
      const response = await this.llmClient.generateResponse({
        messages: [
          {
            role: 'system',
            content: systemPrompt || this.config.llmConfig.systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: this.config.llmConfig.model,
        temperature: this.config.llmConfig.temperature,
        maxTokens: this.config.llmConfig.maxTokens,
        metadata: {
          agentId: this.id,
          agentType: this.type,
          sessionId: context.sessionId,
          correlationId: context.correlationId,
        },
      });

      // Update token usage metrics
      if (response.usage) {
        this.performanceMetrics.resourceUsage.tokensUsed += response.usage.totalTokens;
        this.performanceMetrics.resourceUsage.costUsd += this.calculateTokenCost(
          response.usage.totalTokens,
          this.config.llmConfig.model
        );
      }

      return response.content;

    } catch (error) {
      throw new AgentError(
        `LLM generation failed for agent ${this.id}`,
        this.id,
        this.type,
        'LLM_GENERATION_FAILED',
        true,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Create standardized agent response
   */
  protected createResponse(
    content: string,
    confidence: number,
    context: AgentContext,
    options: {
      culturalRelevance?: number;
      actionItems?: string[];
      followUpRequired?: boolean;
      escalationNeeded?: boolean;
      coordinationEvents?: any[];
      metadata?: Record<string, any>;
    } = {}
  ): AgentResponse {
    return {
      agentId: this.id,
      agentType: this.type,
      content,
      confidence,
      culturalRelevance: options.culturalRelevance,
      actionItems: options.actionItems,
      followUpRequired: options.followUpRequired || false,
      escalationNeeded: options.escalationNeeded || false,
      processingTimeMs: 0, // Will be set by processMessage
      coordinationEvents: options.coordinationEvents,
      metadata: options.metadata,
      timestamp: Date.now(),
    };
  }

  /**
   * Handle coordination events from Redis
   */
  protected async handleCoordinationEvent(channel: string, message: string): Promise<void> {
    try {
      const event = JSON.parse(message);
      
      this.emit('coordination_event', {
        agentId: this.id,
        channel,
        event,
        timestamp: Date.now(),
      });

      // Agent-specific event handling can be implemented in subclasses
      await this.onCoordinationEvent(event);

    } catch (error) {
      console.error(`Error handling coordination event for agent ${this.id}:`, error);
    }
  }

  /**
   * Override in subclasses for agent-specific coordination event handling
   */
  protected async onCoordinationEvent(event: any): Promise<void> {
    // Default implementation - no-op
  }

  /**
   * Perform comprehensive health check
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      // Check circuit breaker state
      if (!this.circuitBreaker.canExecute()) {
        return false;
      }

      // Check Redis connectivity
      const redisHealthy = await this.redisCoordinator.healthCheck();
      if (!redisHealthy) {
        return false;
      }

      // Check LLM connectivity
      const llmHealthy = await this.llmClient.healthCheck();
      if (!llmHealthy) {
        return false;
      }

      // Agent-specific health checks
      const agentHealthy = await this.performAgentSpecificHealthCheck();
      if (!agentHealthy) {
        return false;
      }

      this.lastHealthCheck = Date.now();
      this.performanceMetrics.lastHealthCheck = this.lastHealthCheck;

      return true;

    } catch (error) {
      console.error(`Health check failed for agent ${this.id}:`, error);
      return false;
    }
  }

  /**
   * Update performance metrics
   */
  protected updatePerformanceMetrics(processingTime: number, success: boolean): void {
    // Update response time (exponential moving average)
    const alpha = 0.1;
    this.performanceMetrics.responseTime = 
      alpha * processingTime + (1 - alpha) * this.performanceMetrics.responseTime;

    // Update success rate (exponential moving average)
    const successValue = success ? 1 : 0;
    this.performanceMetrics.successRate = 
      alpha * successValue + (1 - alpha) * this.performanceMetrics.successRate;

    // Update error count
    if (!success) {
      this.performanceMetrics.errorCount++;
    }

    // Update resource usage (memory)
    if (process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.performanceMetrics.resourceUsage.memoryMb = memUsage.heapUsed / 1024 / 1024;
    }
  }

  /**
   * Calculate token cost based on model
   */
  protected calculateTokenCost(tokens: number, model: string): number {
    // Azure OpenAI pricing (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 }, // per 1K tokens
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-35-turbo': { input: 0.0005, output: 0.0015 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
    return (tokens / 1000) * ((modelPricing.input + modelPricing.output) / 2);
  }

  /**
   * Start health check interval
   */
  protected startHealthCheckInterval(): void {
    setInterval(async () => {
      const isHealthy = await this.performHealthCheck();
      
      if (!isHealthy && this.status !== 'offline') {
        this.status = 'failed';
        this.emit('health_check_failed', {
          agentId: this.id,
          timestamp: Date.now(),
        });
      } else if (isHealthy && this.status === 'failed') {
        this.status = 'idle';
        this.emit('health_check_recovered', {
          agentId: this.id,
          timestamp: Date.now(),
        });
      }
    }, this.config.healthCheckIntervalMs);
  }
}