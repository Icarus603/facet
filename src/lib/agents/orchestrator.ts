/**
 * FACET Agent Orchestrator
 * Main coordination engine for therapy agent interactions
 */

import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import { PrismaClient } from '@prisma/client';
import {
  AgentType,
  AgentConfig,
  OrchestratorConfig,
  UserMessage,
  TherapyResponse,
  AgentResponse,
  CoordinatedResponse,
  TherapyTask,
  AgentContext,
  AgentMessage,
  FallbackResponse,
  CoordinationStrategy,
  generateCorrelationId,
  isHighPriorityTask,
  requiresImmediateAttention,
  calculateCoordinationTimeout,
} from './agent-types';
import { BaseAgent } from './base-agent';
import { RedisCoordinator } from './coordination/redis-coordinator';
import { LangGraphCoordinationEngine } from './coordination/langraph-engine';
import { AzureOpenAIClient } from '../llm/azure-openai';
import { CoordinationBus } from '../redis/coordination-bus';

export interface AgentRegistration {
  agent: BaseAgent;
  config: AgentConfig;
  lastHealthCheck: number;
  isHealthy: boolean;
  activeCoordinations: Set<string>;
}

export class AgentOrchestrator extends EventEmitter {
  private readonly config: OrchestratorConfig;
  private readonly prisma: PrismaClient;
  private readonly redisCoordinator: RedisCoordinator;
  private readonly langGraphEngine: LangGraphCoordinationEngine;
  private readonly llmClient: AzureOpenAIClient;
  private readonly coordinationBus: CoordinationBus;
  
  private readonly registeredAgents = new Map<string, AgentRegistration>();
  private readonly agentsByType = new Map<AgentType, string[]>();
  private readonly activeCoordinations = new Map<string, {
    strategy: CoordinationStrategy;
    agentIds: string[];
    startTime: number;
    timeout: number;
  }>();
  
  private readonly metrics = {
    totalMessages: 0,
    successfulCoordinations: 0,
    failedCoordinations: 0,
    averageResponseTime: 0,
    averageCoordinationTime: 0,
    agentHealthScore: 1.0,
    lastHealthCheck: Date.now(),
  };

  private isShuttingDown = false;

  constructor(config: OrchestratorConfig, prisma: PrismaClient) {
    super();
    this.config = config;
    this.prisma = prisma;

    // Initialize coordination infrastructure
    this.coordinationBus = new CoordinationBus({
      redis: {
        host: new URL(config.redisConnectionString).hostname,
        port: parseInt(new URL(config.redisConnectionString).port) || 6379,
        password: new URL(config.redisConnectionString).password || undefined,
      },
      encryption: {
        enabled: config.encryptionEnabled,
        key: config.encryptionKey,
      },
      messageRetention: {
        ttlSeconds: 3600, // 1 hour
        maxMessages: 10000,
      },
      performance: {
        batchSize: 10,
        flushInterval: 1000,
        compressionEnabled: false,
      },
    });

    this.redisCoordinator = new RedisCoordinator({
      redis: {
        host: new URL(config.redisConnectionString).hostname,
        port: parseInt(new URL(config.redisConnectionString).port) || 6379,
        password: new URL(config.redisConnectionString).password || undefined,
      },
      encryption: {
        enabled: config.encryptionEnabled,
        key: config.encryptionKey,
      },
      messageRetention: {
        ttlSeconds: 3600,
        maxMessages: 10000,
      },
      performance: {
        batchSize: 10,
        flushInterval: 1000,
        compressionEnabled: false,
      },
    });

    this.langGraphEngine = new LangGraphCoordinationEngine(this.redisCoordinator);

    this.llmClient = new AzureOpenAIClient({
      endpoint: config.azureOpenAiEndpoint,
      apiKey: config.azureOpenAiApiKey,
      apiVersion: config.azureOpenAiApiVersion,
      deployment: {
        gpt4o: 'gpt-4o',
        gpt4oMini: 'gpt-4o-mini',
        gpt35Turbo: 'gpt-35-turbo',
        embedding: 'text-embedding-ada-002',
      },
      hipaaCompliance: {
        enabled: true,
        auditLogging: true,
        dataResidency: 'US',
        encryptionInTransit: true,
      },
      rateLimit: {
        requestsPerMinute: 100,
        tokensPerMinute: 50000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      monitoring: {
        enabled: true,
        logLevel: 'info',
        metricsRetention: 86400, // 24 hours
      },
    });

    this.setupEventHandlers();
    this.startHealthCheckInterval();
  }

  // ============================================================================
  // PUBLIC INTERFACE
  // ============================================================================

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.coordinationBus.initialize(),
        this.redisCoordinator.initialize(),
      ]);

      this.emit('initialized', {
        timestamp: Date.now(),
        config: {
          maxConcurrentCoordinations: this.config.maxConcurrentCoordinations,
          encryptionEnabled: this.config.encryptionEnabled,
          auditLogRetention: this.config.auditLogRetention,
        },
      });

    } catch (error) {
      throw new Error(`Failed to initialize orchestrator: ${error}`);
    }
  }

  /**
   * Register an agent with the orchestrator
   */
  async registerAgent(agent: BaseAgent, config: AgentConfig): Promise<void> {
    try {
      // Initialize the agent
      await agent.initialize();

      // Register agent
      const registration: AgentRegistration = {
        agent,
        config,
        lastHealthCheck: Date.now(),
        isHealthy: true,
        activeCoordinations: new Set(),
      };

      this.registeredAgents.set(config.id, registration);

      // Track agents by type
      if (!this.agentsByType.has(config.type)) {
        this.agentsByType.set(config.type, []);
      }
      this.agentsByType.get(config.type)!.push(config.id);

      // Setup agent event handlers
      this.setupAgentEventHandlers(agent, config);

      this.emit('agent_registered', {
        agentId: config.id,
        agentType: config.type,
        timestamp: Date.now(),
      });

    } catch (error) {
      throw new Error(`Failed to register agent ${config.id}: ${error}`);
    }
  }

  /**
   * Process user message with intelligent agent coordination
   */
  async processUserMessage(message: UserMessage): Promise<TherapyResponse> {
    const startTime = Date.now();
    const correlationId = generateCorrelationId();

    try {
      this.metrics.totalMessages++;

      // Create agent context
      const context: AgentContext = {
        sessionId: message.sessionId,
        userId: message.userId,
        culturalProfile: message.culturalContext,
        sessionHistory: await this.getSessionHistory(message.sessionId),
        userPreferences: await this.getUserPreferences(message.userId),
        confidentialityLevel: requiresImmediateAttention(message) ? 'maximum' : 'standard',
        timestamp: Date.now(),
        correlationId,
      };

      // Determine therapy task
      const task = await this.analyzeAndCreateTask(message, context);

      // Select coordination strategy
      const strategy = this.selectCoordinationStrategy(task, message);

      // Route to appropriate agents
      const agentIds = await this.selectAgentsForTask(task, strategy);

      if (agentIds.length === 0) {
        throw new Error('No suitable agents available for task');
      }

      // Execute coordination
      const coordinatedResponse = await this.executeCoordination(
        message.sessionId,
        agentIds,
        task,
        context,
        strategy
      );

      // Create therapy response
      const therapyResponse: TherapyResponse = {
        primaryResponse: coordinatedResponse.agentResponses[0] || this.createFallbackResponse(context),
        supportingResponses: coordinatedResponse.agentResponses.slice(1),
        coordinationSummary: {
          agentsInvolved: agentIds,
          coordinationStrategy: strategy,
          totalProcessingTime: Date.now() - startTime,
          coordinationEfficiency: coordinatedResponse.coordinationMetrics.parallelEfficiency,
        },
        culturalAdaptations: coordinatedResponse.culturalIntegration ? [coordinatedResponse.culturalIntegration] : undefined,
        recommendations: this.extractRecommendations(coordinatedResponse.agentResponses),
        sessionUpdates: await this.generateSessionUpdates(message, coordinatedResponse, context),
        timestamp: Date.now(),
      };

      // Log coordination event
      await this.logCoordinationEvent(message, therapyResponse, correlationId);

      // Update metrics
      this.updateSuccessMetrics(startTime);

      return therapyResponse;

    } catch (error) {
      this.updateFailureMetrics(startTime);
      
      console.error(`Message processing failed (${correlationId}):`, error);
      
      // Return fallback response
      return this.createFallbackTherapyResponse(message, context, error);
    }
  }

  /**
   * Route message to specific agent
   */
  async routeToAgent(agentType: AgentType, context: AgentContext): Promise<AgentResponse> {
    const agentIds = this.agentsByType.get(agentType) || [];
    
    if (agentIds.length === 0) {
      throw new Error(`No agents registered for type: ${agentType}`);
    }

    // Select best available agent
    const selectedAgentId = await this.selectBestAgent(agentIds, context);
    const registration = this.registeredAgents.get(selectedAgentId);

    if (!registration || !registration.isHealthy) {
      throw new Error(`Selected agent ${selectedAgentId} is not available`);
    }

    // Create agent message
    const message: AgentMessage = {
      id: nanoid(),
      type: 'agent_query',
      content: `Process therapy interaction for session ${context.sessionId}`,
      metadata: {
        sessionId: context.sessionId,
        userId: context.userId,
        culturalProfile: context.culturalProfile,
      },
      priority: 'medium',
      source: 'orchestrator',
      timestamp: Date.now(),
      encrypted: this.config.encryptionEnabled,
    };

    // Process message through agent
    return await registration.agent.processMessage(message, context);
  }

  /**
   * Coordinate multiple agents for complex task
   */
  async coordinateMultiAgent(
    agents: string[],
    task: TherapyTask,
    context: AgentContext
  ): Promise<CoordinatedResponse> {
    // Validate agent availability
    const availableAgents = agents.filter(agentId => {
      const registration = this.registeredAgents.get(agentId);
      return registration && registration.isHealthy;
    });

    if (availableAgents.length === 0) {
      throw new Error('No available agents for coordination');
    }

    // Execute coordination using LangGraph engine
    return await this.langGraphEngine.executeCoordination(
      context.sessionId,
      task,
      context,
      task.coordinationStrategy
    );
  }

  /**
   * Handle agent failure with fallback mechanisms
   */
  async handleAgentFailure(failedAgent: string, context: AgentContext): Promise<FallbackResponse> {
    const registration = this.registeredAgents.get(failedAgent);
    
    if (!registration) {
      throw new Error(`Unknown agent: ${failedAgent}`);
    }

    // Mark agent as unhealthy
    registration.isHealthy = false;

    // Find backup agent of same type
    const agentType = registration.config.type;
    const backupAgents = this.agentsByType.get(agentType)?.filter(id => 
      id !== failedAgent && this.registeredAgents.get(id)?.isHealthy
    ) || [];

    if (backupAgents.length === 0) {
      // No backup available - create degraded response
      return {
        fallbackAgentId: 'system_fallback',
        originalAgentId: failedAgent,
        failureReason: 'No backup agents available',
        response: this.createFallbackResponse(context),
        degradedCapabilities: [registration.config.type],
        recoveryEstimate: 300000, // 5 minutes
        timestamp: Date.now(),
      };
    }

    // Route to backup agent
    const backupAgentId = backupAgents[0];
    
    try {
      const backupResponse = await this.routeToAgent(agentType, context);
      
      return {
        fallbackAgentId: backupAgentId,
        originalAgentId: failedAgent,
        failureReason: 'Agent failure - routed to backup',
        response: backupResponse,
        degradedCapabilities: [],
        recoveryEstimate: 60000, // 1 minute
        timestamp: Date.now(),
      };

    } catch (error) {
      return {
        fallbackAgentId: 'system_fallback',
        originalAgentId: failedAgent,
        failureReason: `Backup agent also failed: ${error}`,
        response: this.createFallbackResponse(context),
        degradedCapabilities: [registration.config.type],
        recoveryEstimate: 600000, // 10 minutes
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get orchestrator metrics
   */
  getMetrics(): typeof this.metrics & {
    registeredAgents: number;
    healthyAgents: number;
    activeCoordinations: number;
    agentMetrics: Map<string, any>;
  } {
    const healthyAgents = Array.from(this.registeredAgents.values())
      .filter(reg => reg.isHealthy).length;

    const agentMetrics = new Map();
    for (const [agentId, registration] of this.registeredAgents) {
      agentMetrics.set(agentId, {
        type: registration.config.type,
        isHealthy: registration.isHealthy,
        activeCoordinations: registration.activeCoordinations.size,
        lastHealthCheck: registration.lastHealthCheck,
        performance: registration.agent.getPerformanceMetrics(),
      });
    }

    return {
      ...this.metrics,
      registeredAgents: this.registeredAgents.size,
      healthyAgents,
      activeCoordinations: this.activeCoordinations.size,
      agentMetrics,
    };
  }

  /**
   * Shutdown orchestrator gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    try {
      // Cancel active coordinations
      for (const coordinationId of this.activeCoordinations.keys()) {
        await this.langGraphEngine.cancelWorkflow(coordinationId);
      }

      // Shutdown all agents
      const shutdownPromises = Array.from(this.registeredAgents.values())
        .map(registration => registration.agent.shutdown());
      
      await Promise.all(shutdownPromises);

      // Shutdown infrastructure
      await Promise.all([
        this.redisCoordinator.shutdown(),
        this.coordinationBus.shutdown(),
      ]);

      this.emit('shutdown', {
        timestamp: Date.now(),
        metrics: this.metrics,
      });

    } catch (error) {
      console.error('Error during orchestrator shutdown:', error);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Analyze user message and create therapy task
   */
  private async analyzeAndCreateTask(message: UserMessage, context: AgentContext): Promise<TherapyTask> {
    // Determine task type based on message content and context
    let taskType: TherapyTask['type'] = 'intervention';
    let priority: TherapyTask['priority'] = 'medium';
    let requiredAgents: AgentType[] = ['therapy_coordinator'];

    // Check for crisis indicators
    if (requiresImmediateAttention(message)) {
      taskType = 'crisis_response';
      priority = 'critical';
      requiredAgents = ['crisis_monitor', 'therapy_coordinator'];
    }

    // Check for cultural adaptation needs
    if (message.culturalContext && Object.keys(message.culturalContext).length > 0) {
      if (!requiredAgents.includes('cultural_adapter')) {
        requiredAgents.push('cultural_adapter');
      }
    }

    // Check for progress tracking needs
    const sessionHistory = context.sessionHistory || [];
    if (sessionHistory.length > 0) {
      if (!requiredAgents.includes('progress_tracker')) {
        requiredAgents.push('progress_tracker');
      }
    }

    // Determine coordination strategy
    let coordinationStrategy: CoordinationStrategy = 'parallel';
    if (priority === 'critical') {
      coordinationStrategy = 'hierarchical';
    } else if (requiredAgents.length > 3) {
      coordinationStrategy = 'consensus';
    }

    return {
      id: nanoid(),
      type: taskType,
      description: message.content,
      requiredAgents,
      priority,
      coordinationStrategy,
      culturalConsiderations: message.culturalContext ? Object.keys(message.culturalContext) : undefined,
      confidentialityLevel: context.confidentialityLevel,
      timeoutMs: calculateCoordinationTimeout(coordinationStrategy, requiredAgents.length),
      metadata: {
        originalMessage: message,
        context,
      },
    };
  }

  /**
   * Select coordination strategy based on task and message
   */
  private selectCoordinationStrategy(task: TherapyTask, message: UserMessage): CoordinationStrategy {
    // Use task's preferred strategy, but override for special cases
    let strategy = task.coordinationStrategy;

    // Emergency cases always use hierarchical
    if (requiresImmediateAttention(message)) {
      strategy = 'hierarchical';
    }

    // High priority tasks use sequential for better control
    if (isHighPriorityTask(task) && strategy !== 'hierarchical') {
      strategy = 'sequential';
    }

    // Cultural adaptation tasks benefit from consensus
    if (task.culturalConsiderations && task.culturalConsiderations.length > 0) {
      strategy = 'consensus';
    }

    return strategy;
  }

  /**
   * Select agents for therapy task
   */
  private async selectAgentsForTask(task: TherapyTask, strategy: CoordinationStrategy): Promise<string[]> {
    const selectedAgents: string[] = [];

    for (const agentType of task.requiredAgents) {
      const candidateAgents = this.agentsByType.get(agentType) || [];
      const availableAgents = candidateAgents.filter(agentId => {
        const registration = this.registeredAgents.get(agentId);
        return registration && registration.isHealthy;
      });

      if (availableAgents.length === 0) {
        console.warn(`No available agents for type: ${agentType}`);
        continue;
      }

      // Select best agent for this type
      const selectedAgent = await this.selectBestAgent(availableAgents, task.metadata?.context);
      selectedAgents.push(selectedAgent);
    }

    return selectedAgents;
  }

  /**
   * Select best available agent based on performance and load
   */
  private async selectBestAgent(candidateAgents: string[], context?: AgentContext): Promise<string> {
    let bestAgent = candidateAgents[0];
    let bestScore = -1;

    for (const agentId of candidateAgents) {
      const registration = this.registeredAgents.get(agentId);
      if (!registration || !registration.isHealthy) continue;

      const metrics = registration.agent.getPerformanceMetrics();
      const loadScore = 1 - (registration.activeCoordinations.size / registration.config.maxConcurrentSessions);
      const performanceScore = metrics.successRate;
      const responseTimeScore = Math.max(0, 1 - (metrics.responseTime / 5000)); // 5 second baseline

      const totalScore = (loadScore * 0.4) + (performanceScore * 0.4) + (responseTimeScore * 0.2);

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAgent = agentId;
      }
    }

    return bestAgent;
  }

  /**
   * Execute coordination with error handling and monitoring
   */
  private async executeCoordination(
    sessionId: string,
    agentIds: string[],
    task: TherapyTask,
    context: AgentContext,
    strategy: CoordinationStrategy
  ): Promise<CoordinatedResponse> {
    const coordinationId = nanoid();
    const startTime = Date.now();

    try {
      // Track coordination
      this.activeCoordinations.set(coordinationId, {
        strategy,
        agentIds,
        startTime,
        timeout: task.timeoutMs,
      });

      // Mark agents as busy
      agentIds.forEach(agentId => {
        const registration = this.registeredAgents.get(agentId);
        if (registration) {
          registration.activeCoordinations.add(coordinationId);
        }
      });

      // Execute coordination
      const response = await this.langGraphEngine.executeCoordination(
        sessionId,
        task,
        context,
        strategy
      );

      // Update metrics
      this.metrics.successfulCoordinations++;
      const coordinationTime = Date.now() - startTime;
      this.metrics.averageCoordinationTime = 
        (this.metrics.averageCoordinationTime * (this.metrics.successfulCoordinations - 1) + coordinationTime) / 
        this.metrics.successfulCoordinations;

      return response;

    } catch (error) {
      this.metrics.failedCoordinations++;
      throw error;

    } finally {
      // Cleanup
      this.activeCoordinations.delete(coordinationId);
      agentIds.forEach(agentId => {
        const registration = this.registeredAgents.get(agentId);
        if (registration) {
          registration.activeCoordinations.delete(coordinationId);
        }
      });
    }
  }

  /**
   * Get session history from database
   */
  private async getSessionHistory(sessionId: string): Promise<string[]> {
    try {
      const interactions = await this.prisma.therapyInteraction.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
        take: 10, // Last 10 interactions
        select: {
          userInput: true,
          agentResponse: true,
          timestamp: true,
        },
      });

      return interactions.map(interaction => 
        `User: ${interaction.userInput}\nAgent: ${interaction.agentResponse}\n---`
      );

    } catch (error) {
      console.error('Failed to fetch session history:', error);
      return [];
    }
  }

  /**
   * Get user preferences from database
   */
  private async getUserPreferences(userId: string): Promise<Record<string, any>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          profile: true,
          culturalBackground: true,
          privacySettings: true,
        },
      });

      return {
        profile: user?.profile || {},
        culturalBackground: user?.culturalBackground || {},
        privacySettings: user?.privacySettings || {},
      };

    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
      return {};
    }
  }

  /**
   * Extract recommendations from agent responses
   */
  private extractRecommendations(responses: AgentResponse[]): string[] {
    const recommendations: string[] = [];

    for (const response of responses) {
      if (response.actionItems) {
        recommendations.push(...response.actionItems);
      }
    }

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  /**
   * Generate session updates for database
   */
  private async generateSessionUpdates(
    message: UserMessage,
    response: CoordinatedResponse,
    context: AgentContext
  ): Promise<Record<string, any>> {
    return {
      lastInteraction: Date.now(),
      culturalAdaptations: response.culturalIntegration,
      coordinationSummary: {
        strategy: response.strategy,
        agentCount: response.agentResponses.length,
        processingTime: response.coordinationMetrics.totalProcessingTime,
      },
      sessionMetrics: {
        messageCount: this.metrics.totalMessages,
        averageResponseTime: this.metrics.averageResponseTime,
      },
    };
  }

  /**
   * Log coordination event to database
   */
  private async logCoordinationEvent(
    message: UserMessage,
    response: TherapyResponse,
    correlationId: string
  ): Promise<void> {
    try {
      await this.prisma.agentCoordinationLog.create({
        data: {
          sessionId: message.sessionId,
          coordinationEvent: 'user_message_processed',
          agentsInvolved: response.coordinationSummary.agentsInvolved,
          timingData: {
            totalProcessingTime: response.coordinationSummary.totalProcessingTime,
            strategy: response.coordinationSummary.coordinationStrategy,
            correlationId,
          },
          success: true,
        },
      });

    } catch (error) {
      console.error('Failed to log coordination event:', error);
    }
  }

  /**
   * Create fallback response for system errors
   */
  private createFallbackResponse(context: AgentContext): AgentResponse {
    return {
      agentId: 'system_fallback',
      agentType: 'therapy_coordinator',
      content: 'I apologize, but I\'m experiencing some technical difficulties right now. Please know that your wellbeing is important to me. If this is an emergency, please contact emergency services or a crisis hotline immediately.',
      confidence: 0.8,
      followUpRequired: true,
      escalationNeeded: false,
      processingTimeMs: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Create fallback therapy response
   */
  private createFallbackTherapyResponse(
    message: UserMessage,
    context: AgentContext,
    error: any
  ): TherapyResponse {
    const fallbackResponse = this.createFallbackResponse(context);

    return {
      primaryResponse: fallbackResponse,
      coordinationSummary: {
        agentsInvolved: ['system_fallback'],
        coordinationStrategy: 'parallel',
        totalProcessingTime: 0,
        coordinationEfficiency: 0,
      },
      recommendations: ['Please try again in a few moments', 'Contact support if issues persist'],
      timestamp: Date.now(),
    };
  }

  /**
   * Setup orchestrator event handlers
   */
  private setupEventHandlers(): void {
    this.redisCoordinator.on('error', (error) => {
      console.error('Redis coordinator error:', error);
      this.emit('coordination_error', error);
    });

    this.coordinationBus.on('redis_error', (error) => {
      console.error('Coordination bus error:', error);
      this.emit('bus_error', error);
    });
  }

  /**
   * Setup agent-specific event handlers
   */
  private setupAgentEventHandlers(agent: BaseAgent, config: AgentConfig): void {
    agent.on('processing_error', (event) => {
      console.error(`Agent ${config.id} processing error:`, event);
      
      // Mark agent as potentially unhealthy
      const registration = this.registeredAgents.get(config.id);
      if (registration) {
        registration.isHealthy = false;
      }
    });

    agent.on('health_check_failed', (event) => {
      const registration = this.registeredAgents.get(config.id);
      if (registration) {
        registration.isHealthy = false;
        registration.lastHealthCheck = Date.now();
      }
    });

    agent.on('health_check_recovered', (event) => {
      const registration = this.registeredAgents.get(config.id);
      if (registration) {
        registration.isHealthy = true;
        registration.lastHealthCheck = Date.now();
      }
    });
  }

  /**
   * Update success metrics
   */
  private updateSuccessMetrics(startTime: number): void {
    const responseTime = Date.now() - startTime;
    
    // Update average response time (exponential moving average)
    const alpha = 0.1;
    this.metrics.averageResponseTime = 
      alpha * responseTime + (1 - alpha) * this.metrics.averageResponseTime;
  }

  /**
   * Update failure metrics
   */
  private updateFailureMetrics(startTime: number): void {
    // Could track failure-specific metrics here
  }

  /**
   * Start health check interval for all agents
   */
  private startHealthCheckInterval(): void {
    setInterval(async () => {
      if (this.isShuttingDown) return;

      let healthyAgents = 0;
      const totalAgents = this.registeredAgents.size;

      for (const [agentId, registration] of this.registeredAgents) {
        try {
          const isHealthy = await registration.agent.getStatus() !== 'failed';
          registration.isHealthy = isHealthy;
          registration.lastHealthCheck = Date.now();
          
          if (isHealthy) healthyAgents++;

        } catch (error) {
          console.error(`Health check failed for agent ${agentId}:`, error);
          registration.isHealthy = false;
        }
      }

      this.metrics.agentHealthScore = totalAgents > 0 ? healthyAgents / totalAgents : 1.0;
      this.metrics.lastHealthCheck = Date.now();

    }, 30000); // Every 30 seconds
  }
}