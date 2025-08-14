/**
 * FACET Agent Orchestrator Tests
 * Comprehensive tests for agent coordination functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AgentOrchestrator } from '../orchestrator';
import { BaseAgent } from '../base-agent';
import {
  AgentType,
  AgentConfig,
  OrchestratorConfig,
  UserMessage,
  AgentContext,
  TherapyTask,
} from '../agent-types';
import { AzureOpenAIClient } from '../../llm/azure-openai';
import { RedisCoordinator } from '../coordination/redis-coordinator';

// Mock implementations
class MockAgent extends BaseAgent {
  constructor(type: AgentType, config: AgentConfig) {
    const mockLLMClient = {} as AzureOpenAIClient;
    const mockRedisCoordinator = {} as RedisCoordinator;
    super(type, config, mockLLMClient, mockRedisCoordinator);
  }

  protected async executeAgentLogic(message: any, context: AgentContext) {
    return this.createResponse(
      `Mock response from ${this.type} agent`,
      0.9,
      context,
      {
        actionItems: [`Action from ${this.type}`],
        followUpRequired: false,
      }
    );
  }

  getCapabilities(): string[] {
    return [`${this.type}_capability`];
  }

  protected async performAgentSpecificHealthCheck(): Promise<boolean> {
    return true;
  }
}

// Mock Prisma client
const mockPrisma = {
  therapyInteraction: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  user: {
    findUnique: vi.fn().mockResolvedValue({
      profile: {},
      culturalBackground: {},
      privacySettings: {},
    }),
  },
  agentCoordinationLog: {
    create: vi.fn().mockResolvedValue({}),
  },
} as unknown as PrismaClient;

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let config: OrchestratorConfig;
  let agents: Map<AgentType, MockAgent>;

  beforeEach(async () => {
    config = {
      maxConcurrentCoordinations: 10,
      defaultTimeoutMs: 30000,
      redisConnectionString: 'redis://localhost:6379',
      azureOpenAiEndpoint: 'https://test.openai.azure.com',
      azureOpenAiApiKey: 'test-key',
      azureOpenAiApiVersion: '2024-02-01',
      performanceMetricsRetention: 86400,
      auditLogRetention: 2592000,
      encryptionEnabled: false,
    };

    orchestrator = new AgentOrchestrator(config, mockPrisma);
    
    // Create mock agents
    agents = new Map();
    const agentTypes: AgentType[] = ['intake', 'therapy_coordinator', 'crisis_monitor', 'cultural_adapter', 'progress_tracker'];
    
    for (const type of agentTypes) {
      const agentConfig: AgentConfig = {
        id: `${type}_agent_1`,
        type,
        capabilities: [`${type}_capability`],
        maxConcurrentSessions: 5,
        responseTimeoutMs: 30000,
        healthCheckIntervalMs: 30000,
        circuitBreaker: {
          failureThreshold: 5,
          successThreshold: 3,
          timeoutMs: 60000,
          halfOpenMaxRequests: 2,
        },
        llmConfig: {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 1000,
          systemPrompt: `You are a ${type} agent`,
        },
      };

      const agent = new MockAgent(type, agentConfig);
      agents.set(type, agent);
    }

    // Mock the initialization methods to avoid Redis/Azure dependencies
    vi.spyOn(orchestrator as any, 'initialize').mockResolvedValue(undefined);
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe('Agent Registration', () => {
    it('should register agents successfully', async () => {
      for (const [type, agent] of agents) {
        const config = (agent as any).config;
        
        // Mock agent initialization
        vi.spyOn(agent, 'initialize').mockResolvedValue(undefined);
        
        await orchestrator.registerAgent(agent, config);
        
        const metrics = orchestrator.getMetrics();
        expect(metrics.registeredAgents).toBeGreaterThan(0);
      }
    });

    it('should track agents by type', async () => {
      const therapyAgent = agents.get('therapy_coordinator')!;
      const config = (therapyAgent as any).config;
      
      vi.spyOn(therapyAgent, 'initialize').mockResolvedValue(undefined);
      
      await orchestrator.registerAgent(therapyAgent, config);
      
      const metrics = orchestrator.getMetrics();
      expect(metrics.agentMetrics.has(config.id)).toBe(true);
      expect(metrics.agentMetrics.get(config.id).type).toBe('therapy_coordinator');
    });
  });

  describe('Message Processing', () => {
    beforeEach(async () => {
      // Register all agents
      for (const [type, agent] of agents) {
        const config = (agent as any).config;
        vi.spyOn(agent, 'initialize').mockResolvedValue(undefined);
        await orchestrator.registerAgent(agent, config);
      }
    });

    it('should process user message successfully', async () => {
      const userMessage: UserMessage = {
        sessionId: 'test-session-1',
        userId: 'test-user-1',
        content: 'I am feeling anxious about my work situation',
        messageType: 'text',
        timestamp: Date.now(),
        correlationId: 'test-correlation-1',
      };

      // Mock the coordination methods
      vi.spyOn(orchestrator as any, 'executeCoordination').mockResolvedValue({
        coordinationId: 'test-coordination-1',
        strategy: 'parallel',
        agentResponses: [
          {
            agentId: 'therapy_coordinator_agent_1',
            agentType: 'therapy_coordinator',
            content: 'I understand you\'re feeling anxious about work',
            confidence: 0.9,
            processingTimeMs: 500,
            timestamp: Date.now(),
          },
        ],
        synthesizedResponse: 'I understand you\'re feeling anxious about work',
        coordinationMetrics: {
          totalProcessingTime: 500,
          parallelEfficiency: 0.9,
          resourceUtilization: 0.8,
        },
        timestamp: Date.now(),
      });

      const response = await orchestrator.processUserMessage(userMessage);

      expect(response).toBeDefined();
      expect(response.primaryResponse).toBeDefined();
      expect(response.coordinationSummary).toBeDefined();
      expect(response.coordinationSummary.agentsInvolved).toContain('therapy_coordinator_agent_1');
    });

    it('should handle emergency messages with appropriate priority', async () => {
      const emergencyMessage: UserMessage = {
        sessionId: 'test-session-2',
        userId: 'test-user-2',
        content: 'I am having thoughts of suicide',
        messageType: 'text',
        emergencyIndicators: ['suicide', 'crisis'],
        timestamp: Date.now(),
        correlationId: 'test-correlation-2',
      };

      // Mock coordination for emergency
      vi.spyOn(orchestrator as any, 'executeCoordination').mockResolvedValue({
        coordinationId: 'test-coordination-2',
        strategy: 'hierarchical',
        agentResponses: [
          {
            agentId: 'crisis_monitor_agent_1',
            agentType: 'crisis_monitor',
            content: 'I\'m very concerned about what you\'ve shared',
            confidence: 0.95,
            escalationNeeded: true,
            processingTimeMs: 200,
            timestamp: Date.now(),
          },
        ],
        synthesizedResponse: 'I\'m very concerned about what you\'ve shared',
        coordinationMetrics: {
          totalProcessingTime: 200,
          parallelEfficiency: 1.0,
          resourceUtilization: 0.9,
        },
        timestamp: Date.now(),
      });

      const response = await orchestrator.processUserMessage(emergencyMessage);

      expect(response).toBeDefined();
      expect(response.primaryResponse.escalationNeeded).toBe(true);
      expect(response.coordinationSummary.coordinationStrategy).toBe('hierarchical');
    });

    it('should include cultural adaptation when cultural context is provided', async () => {
      const culturalMessage: UserMessage = {
        sessionId: 'test-session-3',
        userId: 'test-user-3',
        content: 'I feel disconnected from my cultural identity',
        messageType: 'text',
        culturalContext: {
          primaryCulture: 'Mexican',
          religiousBackground: 'Catholic',
          generationalStatus: 'Second generation',
        },
        timestamp: Date.now(),
        correlationId: 'test-correlation-3',
      };

      // Mock coordination including cultural adapter
      vi.spyOn(orchestrator as any, 'executeCoordination').mockResolvedValue({
        coordinationId: 'test-coordination-3',
        strategy: 'consensus',
        agentResponses: [
          {
            agentId: 'cultural_adapter_agent_1',
            agentType: 'cultural_adapter',
            content: 'Cultural identity exploration is important',
            confidence: 0.85,
            culturalRelevance: 0.95,
            processingTimeMs: 600,
            timestamp: Date.now(),
          },
        ],
        synthesizedResponse: 'Cultural identity exploration is important',
        coordinationMetrics: {
          totalProcessingTime: 600,
          parallelEfficiency: 0.8,
          resourceUtilization: 0.7,
        },
        culturalIntegration: {
          culturalRelevanceScore: 0.95,
          culturalAdaptations: ['Identity exploration exercises'],
        },
        timestamp: Date.now(),
      });

      const response = await orchestrator.processUserMessage(culturalMessage);

      expect(response).toBeDefined();
      expect(response.culturalAdaptations).toBeDefined();
      expect(response.culturalAdaptations![0]).toHaveProperty('culturalRelevanceScore');
    });
  });

  describe('Agent Coordination', () => {
    beforeEach(async () => {
      // Register therapy coordinator for coordination tests
      const therapyAgent = agents.get('therapy_coordinator')!;
      const config = (therapyAgent as any).config;
      vi.spyOn(therapyAgent, 'initialize').mockResolvedValue(undefined);
      await orchestrator.registerAgent(therapyAgent, config);
    });

    it('should route to specific agent type', async () => {
      const context: AgentContext = {
        sessionId: 'test-session-4',
        userId: 'test-user-4',
        confidentialityLevel: 'standard',
        timestamp: Date.now(),
        correlationId: 'test-correlation-4',
      };

      const response = await orchestrator.routeToAgent('therapy_coordinator', context);

      expect(response).toBeDefined();
      expect(response.agentType).toBe('therapy_coordinator');
      expect(response.content).toContain('Mock response from therapy_coordinator agent');
    });

    it('should handle agent failure with fallback', async () => {
      const failedAgentId = 'therapy_coordinator_agent_1';
      const context: AgentContext = {
        sessionId: 'test-session-5',
        userId: 'test-user-5',
        confidentialityLevel: 'standard',
        timestamp: Date.now(),
        correlationId: 'test-correlation-5',
      };

      // Mock agent failure
      const therapyAgent = agents.get('therapy_coordinator')!;
      vi.spyOn(therapyAgent, 'processMessage').mockRejectedValue(new Error('Agent failed'));

      const fallbackResponse = await orchestrator.handleAgentFailure(failedAgentId, context);

      expect(fallbackResponse).toBeDefined();
      expect(fallbackResponse.originalAgentId).toBe(failedAgentId);
      expect(fallbackResponse.response.content).toContain('technical difficulties');
    });
  });

  describe('Task Analysis', () => {
    it('should create appropriate task for regular therapy session', async () => {
      const message: UserMessage = {
        sessionId: 'test-session-6',
        userId: 'test-user-6',
        content: 'I want to work on my anxiety',
        messageType: 'text',
        timestamp: Date.now(),
        correlationId: 'test-correlation-6',
      };

      const context: AgentContext = {
        sessionId: message.sessionId,
        userId: message.userId,
        confidentialityLevel: 'standard',
        timestamp: Date.now(),
        correlationId: message.correlationId,
      };

      // Access private method for testing
      const task = await (orchestrator as any).analyzeAndCreateTask(message, context);

      expect(task).toBeDefined();
      expect(task.type).toBe('intervention');
      expect(task.priority).toBe('medium');
      expect(task.requiredAgents).toContain('therapy_coordinator');
    });

    it('should create crisis task for emergency situations', async () => {
      const emergencyMessage: UserMessage = {
        sessionId: 'test-session-7',
        userId: 'test-user-7',
        content: 'I want to end my life',
        messageType: 'text',
        emergencyIndicators: ['suicide'],
        timestamp: Date.now(),
        correlationId: 'test-correlation-7',
      };

      const context: AgentContext = {
        sessionId: emergencyMessage.sessionId,
        userId: emergencyMessage.userId,
        confidentialityLevel: 'maximum',
        timestamp: Date.now(),
        correlationId: emergencyMessage.correlationId,
      };

      const task = await (orchestrator as any).analyzeAndCreateTask(emergencyMessage, context);

      expect(task).toBeDefined();
      expect(task.type).toBe('crisis_response');
      expect(task.priority).toBe('critical');
      expect(task.requiredAgents).toContain('crisis_monitor');
      expect(task.coordinationStrategy).toBe('hierarchical');
    });
  });

  describe('Performance Metrics', () => {
    it('should track orchestrator metrics', () => {
      const metrics = orchestrator.getMetrics();

      expect(metrics).toHaveProperty('totalMessages');
      expect(metrics).toHaveProperty('successfulCoordinations');
      expect(metrics).toHaveProperty('failedCoordinations');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('registeredAgents');
      expect(metrics).toHaveProperty('healthyAgents');
      expect(metrics).toHaveProperty('agentMetrics');
    });

    it('should update metrics after successful message processing', async () => {
      // Register agent first
      const therapyAgent = agents.get('therapy_coordinator')!;
      const config = (therapyAgent as any).config;
      vi.spyOn(therapyAgent, 'initialize').mockResolvedValue(undefined);
      await orchestrator.registerAgent(therapyAgent, config);

      const initialMetrics = orchestrator.getMetrics();
      const initialMessages = initialMetrics.totalMessages;

      const message: UserMessage = {
        sessionId: 'test-session-8',
        userId: 'test-user-8',
        content: 'Test message',
        messageType: 'text',
        timestamp: Date.now(),
        correlationId: 'test-correlation-8',
      };

      // Mock successful coordination
      vi.spyOn(orchestrator as any, 'executeCoordination').mockResolvedValue({
        coordinationId: 'test-coordination-8',
        strategy: 'parallel',
        agentResponses: [
          {
            agentId: 'therapy_coordinator_agent_1',
            agentType: 'therapy_coordinator',
            content: 'Test response',
            confidence: 0.9,
            processingTimeMs: 300,
            timestamp: Date.now(),
          },
        ],
        synthesizedResponse: 'Test response',
        coordinationMetrics: {
          totalProcessingTime: 300,
          parallelEfficiency: 0.9,
          resourceUtilization: 0.8,
        },
        timestamp: Date.now(),
      });

      await orchestrator.processUserMessage(message);

      const updatedMetrics = orchestrator.getMetrics();
      expect(updatedMetrics.totalMessages).toBe(initialMessages + 1);
    });
  });

  describe('Coordination Strategies', () => {
    it('should select hierarchical strategy for emergency situations', () => {
      const emergencyTask: TherapyTask = {
        id: 'emergency-task-1',
        type: 'crisis_response',
        description: 'Emergency crisis response',
        requiredAgents: ['crisis_monitor', 'therapy_coordinator'],
        priority: 'critical',
        coordinationStrategy: 'parallel', // Will be overridden
        confidentialityLevel: 'maximum',
        timeoutMs: 30000,
      };

      const emergencyMessage: UserMessage = {
        sessionId: 'emergency-session-1',
        userId: 'emergency-user-1',
        content: 'Emergency situation',
        messageType: 'text',
        emergencyIndicators: ['crisis'],
        timestamp: Date.now(),
        correlationId: 'emergency-correlation-1',
      };

      const strategy = (orchestrator as any).selectCoordinationStrategy(emergencyTask, emergencyMessage);
      expect(strategy).toBe('hierarchical');
    });

    it('should select consensus strategy for cultural adaptation tasks', () => {
      const culturalTask: TherapyTask = {
        id: 'cultural-task-1',
        type: 'cultural_adaptation',
        description: 'Cultural adaptation needed',
        requiredAgents: ['cultural_adapter', 'therapy_coordinator'],
        priority: 'medium',
        coordinationStrategy: 'parallel',
        culturalConsiderations: ['Mexican heritage', 'Language preferences'],
        confidentialityLevel: 'standard',
        timeoutMs: 30000,
      };

      const culturalMessage: UserMessage = {
        sessionId: 'cultural-session-1',
        userId: 'cultural-user-1',
        content: 'Cultural identity concerns',
        messageType: 'text',
        culturalContext: { primaryCulture: 'Mexican' },
        timestamp: Date.now(),
        correlationId: 'cultural-correlation-1',
      };

      const strategy = (orchestrator as any).selectCoordinationStrategy(culturalTask, culturalMessage);
      expect(strategy).toBe('consensus');
    });
  });

  describe('Error Handling', () => {
    it('should return fallback response when all agents fail', async () => {
      const message: UserMessage = {
        sessionId: 'error-session-1',
        userId: 'error-user-1',
        content: 'Test message',
        messageType: 'text',
        timestamp: Date.now(),
        correlationId: 'error-correlation-1',
      };

      // Mock coordination failure
      vi.spyOn(orchestrator as any, 'executeCoordination').mockRejectedValue(new Error('All agents failed'));

      const response = await orchestrator.processUserMessage(message);

      expect(response).toBeDefined();
      expect(response.primaryResponse.agentId).toBe('system_fallback');
      expect(response.primaryResponse.content).toContain('technical difficulties');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database failure
      vi.spyOn(mockPrisma.therapyInteraction, 'findMany').mockRejectedValue(new Error('Database error'));

      const message: UserMessage = {
        sessionId: 'db-error-session-1',
        userId: 'db-error-user-1',
        content: 'Test message',
        messageType: 'text',
        timestamp: Date.now(),
        correlationId: 'db-error-correlation-1',
      };

      // Should not throw, should handle gracefully
      const response = await orchestrator.processUserMessage(message);
      expect(response).toBeDefined();
    });
  });
});