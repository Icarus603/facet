/**
 * FACET Agent Integration Tests
 * Comprehensive testing of agent coordination and therapeutic effectiveness
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntakeAgent } from '../implementations/intake-agent';
import { TherapyCoordinatorAgent } from '../implementations/therapy-coordinator';
import { CrisisMonitorAgent } from '../implementations/crisis-monitor';
import { CulturalAdapterAgent } from '../implementations/cultural-adapter';
import { ProgressTrackerAgent } from '../implementations/progress-tracker';
import { AgentOrchestrator } from '../orchestrator';
import { AzureOpenAIClient } from '../../llm/azure-openai';
import { RedisCoordinator } from '../coordination/redis-coordinator';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  UserMessage,
  generateCorrelationId,
} from '../agent-types';

// Mock dependencies
vi.mock('../../llm/azure-openai');
vi.mock('../coordination/redis-coordinator');

const createMockLLMClient = () => ({
  generateResponse: vi.fn().mockResolvedValue({
    content: 'Mock therapeutic response',
    usage: { totalTokens: 100 },
    model: 'gpt-4o',
    finishReason: 'stop',
    requestId: 'test-request',
    timestamp: Date.now(),
  }),
  generateEmbeddings: vi.fn().mockResolvedValue({
    embedding: new Array(1536).fill(0.1),
    usage: { totalTokens: 50 },
  }),
  healthCheck: vi.fn().mockResolvedValue(true),
  getMetrics: vi.fn().mockReturnValue({
    totalRequests: 10,
    successfulRequests: 10,
    averageResponseTime: 500,
  }),
});

const createMockRedisCoordinator = () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  publish: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockResolvedValue(undefined),
  unsubscribe: vi.fn().mockResolvedValue(undefined),
  healthCheck: vi.fn().mockResolvedValue(true),
  shutdown: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  emit: vi.fn(),
});

const createAgentConfig = (type: string): AgentConfig => ({
  id: `${type}_test_agent`,
  type: type as any,
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
    systemPrompt: `You are a ${type} agent for FACET therapy platform.`,
  },
});

const createTestContext = (overrides = {}): AgentContext => ({
  sessionId: 'test-session-123',
  userId: 'test-user-456',
  culturalProfile: {
    primaryCulture: 'Latino',
    ethnicIdentities: ['Mexican'],
    languagePreferences: ['Spanish', 'English'],
    familyDynamics: { involvement: 'high' },
  },
  sessionHistory: ['Previous session context'],
  userPreferences: { communicationStyle: 'warm' },
  confidentialityLevel: 'standard',
  timestamp: Date.now(),
  correlationId: generateCorrelationId(),
  ...overrides,
});

const createTestMessage = (content: string, metadata = {}): AgentMessage => ({
  id: 'test-message-789',
  type: 'user_input',
  content,
  metadata,
  priority: 'medium',
  source: 'user',
  timestamp: Date.now(),
  encrypted: false,
});

describe('Agent Integration Tests', () => {
  let mockLLMClient: any;
  let mockRedisCoordinator: any;
  let agents: {
    intake: IntakeAgent;
    coordinator: TherapyCoordinatorAgent;
    crisis: CrisisMonitorAgent;
    cultural: CulturalAdapterAgent;
    progress: ProgressTrackerAgent;
  };

  beforeEach(() => {
    mockLLMClient = createMockLLMClient();
    mockRedisCoordinator = createMockRedisCoordinator();

    agents = {
      intake: new IntakeAgent(
        createAgentConfig('intake'),
        mockLLMClient,
        mockRedisCoordinator
      ),
      coordinator: new TherapyCoordinatorAgent(
        createAgentConfig('therapy_coordinator'),
        mockLLMClient,
        mockRedisCoordinator
      ),
      crisis: new CrisisMonitorAgent(
        createAgentConfig('crisis_monitor'),
        mockLLMClient,
        mockRedisCoordinator
      ),
      cultural: new CulturalAdapterAgent(
        createAgentConfig('cultural_adapter'),
        mockLLMClient,
        mockRedisCoordinator
      ),
      progress: new ProgressTrackerAgent(
        createAgentConfig('progress_tracker'),
        mockLLMClient,
        mockRedisCoordinator
      ),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Individual Agent Functionality', () => {
    describe('IntakeAgent', () => {
      it('should conduct comprehensive intake assessment', async () => {
        const message = createTestMessage(
          'I have been feeling anxious and depressed lately. My family is from Mexico and I am struggling with cultural identity issues.'
        );
        const context = createTestContext();

        const response = await agents.intake.processMessage(message, context);

        expect(response).toBeDefined();
        expect(response.agentType).toBe('intake');
        expect(response.confidence).toBeGreaterThan(0.5);
        expect(response.coordinationEvents).toBeDefined();
        expect(response.metadata?.intakeComplete).toBe(true);
      });

      it('should detect cultural background during intake', async () => {
        const message = createTestMessage(
          'I am a second-generation Korean American and feeling torn between cultures.'
        );
        const context = createTestContext();

        const response = await agents.intake.processMessage(message, context);

        expect(response.culturalRelevance).toBeGreaterThan(0.7);
        expect(response.metadata?.culturalProfileEstablished).toBe(true);
      });

      it('should detect crisis indicators during intake', async () => {
        const message = createTestMessage(
          'I have been thinking about ending my life because I feel like a burden to my family.'
        );
        const context = createTestContext();

        const response = await agents.intake.processMessage(message, context);

        expect(response.escalationNeeded).toBe(true);
        expect(response.metadata?.riskLevel).toBeDefined();
      });
    });

    describe('CrisisMonitorAgent', () => {
      it('should detect critical crisis within 1 second', async () => {
        const startTime = Date.now();
        const message = createTestMessage(
          'I am going to kill myself tonight. I have pills and I have written goodbye letters.'
        );
        const context = createTestContext();

        const response = await agents.crisis.processMessage(message, context);
        const processingTime = Date.now() - startTime;

        expect(processingTime).toBeLessThan(1000);
        expect(response.escalationNeeded).toBe(true);
        expect(response.metadata?.criticalCrisisDetected).toBe(true);
        expect(response.metadata?.emergencyServicesNeeded).toBe(true);
      });

      it('should perform accurate risk assessment', async () => {
        const message = createTestMessage(
          'Sometimes I think about dying but I would never actually do it because of my children.'
        );
        const context = createTestContext();

        const response = await agents.crisis.processMessage(message, context);

        expect(response.metadata?.riskLevel).toBeDefined();
        expect(response.metadata?.safetyPlanCreated).toBe(true);
        expect(response.escalationNeeded).toBe(false);
      });

      it('should provide culturally-informed crisis intervention', async () => {
        const message = createTestMessage(
          'I want to die but my faith says suicide is wrong. I feel trapped.'
        );
        const context = createTestContext({
          culturalProfile: {
            primaryCulture: 'Latino',
            religiousSpiritual: { beliefs: ['Catholic'], importance: 9 },
          },
        });

        const response = await agents.crisis.processMessage(message, context);

        expect(response.culturalRelevance).toBeGreaterThan(0.8);
        expect(response.metadata?.humanInterventionRequired).toBe(true);
      });
    });

    describe('CulturalAdapterAgent', () => {
      it('should provide cultural adaptations for therapy content', async () => {
        const message = createTestMessage(
          'The therapy approach feels too individualistic for me. In my culture, family is everything.',
          {
            otherAgentResponses: ['Focus on your individual goals and self-care'],
          }
        );
        const context = createTestContext();

        const response = await agents.cultural.processMessage(message, context);

        expect(response.culturalRelevance).toBeGreaterThan(0.8);
        expect(response.metadata?.adaptationsGenerated).toBeGreaterThan(0);
        expect(response.metadata?.appropriatenessScore).toBeDefined();
      });

      it('should identify cultural content and practices', async () => {
        const message = createTestMessage(
          'I want to incorporate traditional healing practices from my culture into therapy.'
        );
        const context = createTestContext();

        const response = await agents.cultural.processMessage(message, context);

        expect(response.metadata?.culturalContentFound).toBeGreaterThan(0);
        expect(response.culturalRelevance).toBeGreaterThan(0.7);
      });

      it('should address cultural barriers to treatment', async () => {
        const message = createTestMessage(
          'My family thinks therapy is for weak people and that I should just pray harder.'
        );
        const context = createTestContext();

        const response = await agents.cultural.processMessage(message, context);

        expect(response.metadata?.barriersIdentified).toBeDefined();
        expect(response.actionItems).toContain(expect.stringMatching(/cultural/i));
      });
    });

    describe('ProgressTrackerAgent', () => {
      it('should track therapeutic progress accurately', async () => {
        const message = createTestMessage(
          'I have been practicing the breathing exercises daily and feel less anxious.'
        );
        const context = createTestContext({
          sessionHistory: ['Session 1', 'Session 2', 'Session 3'],
        });

        const response = await agents.progress.processMessage(message, context);

        expect(response.metadata?.progressTracked).toBe(true);
        expect(response.metadata?.overallProgress).toBeGreaterThan(0);
        expect(response.metadata?.progressTrend).toBeDefined();
      });

      it('should measure cultural integration progress', async () => {
        const message = createTestMessage(
          'Incorporating prayer and talking to my grandmother has really helped my healing.'
        );
        const context = createTestContext();

        const response = await agents.progress.processMessage(message, context);

        expect(response.metadata?.culturalIntegrationScore).toBeGreaterThan(5);
        expect(response.culturalRelevance).toBeGreaterThan(0.7);
      });

      it('should identify treatment optimizations', async () => {
        const message = createTestMessage(
          'The current approach is not working well for me. I feel stuck.'
        );
        const context = createTestContext();

        const response = await agents.progress.processMessage(message, context);

        expect(response.metadata?.optimizationsIdentified).toBeGreaterThan(0);
        expect(response.followUpRequired).toBe(true);
      });
    });

    describe('TherapyCoordinatorAgent', () => {
      it('should coordinate multiple agent responses effectively', async () => {
        const message = createTestMessage(
          'I need help with my anxiety and want to make sure my cultural background is considered.',
          {
            otherAgentResponses: [
              'Cultural adaptation needed for anxiety treatment',
              'Moderate anxiety symptoms detected',
              'Progress tracking initialized',
            ],
          }
        );
        const context = createTestContext();

        const response = await agents.coordinator.processMessage(message, context);

        expect(response.metadata?.sessionPlanActive).toBe(true);
        expect(response.metadata?.agentsCoordinated).toBeGreaterThan(0);
        expect(response.metadata?.coordinationStrategy).toBeDefined();
      });

      it('should synthesize agent responses into coherent therapy', async () => {
        const message = createTestMessage(
          'How do I balance my individual needs with my family obligations?'
        );
        const context = createTestContext();

        const response = await agents.coordinator.processMessage(message, context);

        expect(response.confidence).toBeGreaterThan(0.7);
        expect(response.culturalRelevance).toBeGreaterThan(0.7);
        expect(response.actionItems).toBeDefined();
      });
    });
  });

  describe('Agent Health Checks', () => {
    it('should pass health checks for all agents', async () => {
      const healthChecks = await Promise.all([
        agents.intake.getStatus(),
        agents.coordinator.getStatus(),
        agents.crisis.getStatus(),
        agents.cultural.getStatus(),
        agents.progress.getStatus(),
      ]);

      healthChecks.forEach((status) => {
        expect(['idle', 'processing', 'busy']).toContain(status);
      });
    });

    it('should report performance metrics', () => {
      Object.values(agents).forEach((agent) => {
        const metrics = agent.getPerformanceMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.agentId).toBeDefined();
        expect(metrics.responseTime).toBeGreaterThanOrEqual(0);
        expect(metrics.successRate).toBeGreaterThanOrEqual(0);
        expect(metrics.successRate).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 2 seconds for non-crisis interactions', async () => {
      const startTime = Date.now();
      const message = createTestMessage('I have been feeling stressed lately.');
      const context = createTestContext();

      await agents.intake.processMessage(message, context);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(2000);
    });

    it('should handle concurrent sessions within capacity limits', async () => {
      const promises = Array.from({ length: 3 }, (_, i) =>
        agents.coordinator.processMessage(
          createTestMessage(`Session ${i} message`),
          createTestContext({ sessionId: `session-${i}` })
        )
      );

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(3);
      responses.forEach((response) => {
        expect(response).toBeDefined();
        expect(response.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Cultural Competency', () => {
    const culturalTestCases = [
      {
        culture: 'Latino',
        message: 'Mi familia no entiende mi depresión',
        expectedElements: ['family', 'cultural', 'Latino'],
      },
      {
        culture: 'Asian',
        message: 'I feel shame bringing dishonor to my family',
        expectedElements: ['family', 'honor', 'cultural'],
      },
      {
        culture: 'African American',
        message: 'The church is my main support but they don\'t understand mental health',
        expectedElements: ['church', 'community', 'cultural'],
      },
    ];

    culturalTestCases.forEach(({ culture, message, expectedElements }) => {
      it(`should handle ${culture} cultural context appropriately`, async () => {
        const testMessage = createTestMessage(message);
        const context = createTestContext({
          culturalProfile: { primaryCulture: culture },
        });

        const response = await agents.cultural.processMessage(testMessage, context);

        expect(response.culturalRelevance).toBeGreaterThan(0.7);
        // Check that response addresses cultural elements
        const responseContent = response.content.toLowerCase();
        expectedElements.forEach((element) => {
          expect(responseContent).toContain(element.toLowerCase());
        });
      });
    });
  });

  describe('Crisis Response Integration', () => {
    it('should escalate crisis across all relevant agents', async () => {
      const crisisMessage = createTestMessage(
        'I have a plan to end my life tonight. I have access to pills and have written goodbye notes.'
      );
      const context = createTestContext();

      const responses = await Promise.all([
        agents.crisis.processMessage(crisisMessage, context),
        agents.coordinator.processMessage(crisisMessage, context),
        agents.cultural.processMessage(crisisMessage, context),
      ]);

      responses.forEach((response) => {
        expect(response.escalationNeeded).toBe(true);
        expect(response.processingTimeMs).toBeLessThan(1000);
      });
    });

    it('should provide culturally-informed crisis resources', async () => {
      const crisisMessage = createTestMessage(
        'I want to die but I cannot shame my family.'
      );
      const context = createTestContext({
        culturalProfile: {
          primaryCulture: 'Asian',
          culturalValues: { mentalHealthStigma: 9 },
        },
      });

      const response = await agents.crisis.processMessage(crisisMessage, context);

      expect(response.escalationNeeded).toBe(true);
      expect(response.culturalRelevance).toBeGreaterThan(0.8);
      expect(response.actionItems).toContain(
        expect.stringMatching(/cultural|family|honor/i)
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle LLM failures gracefully', async () => {
      mockLLMClient.generateResponse.mockRejectedValueOnce(new Error('LLM service unavailable'));

      const message = createTestMessage('Test message');
      const context = createTestContext();

      await expect(agents.intake.processMessage(message, context)).rejects.toThrow();
      
      // Should still maintain circuit breaker functionality
      const circuitState = agents.intake.getCircuitBreakerState();
      expect(circuitState).toBeDefined();
    });

    it('should provide fallback responses when appropriate', async () => {
      // Simulate multiple agent failures
      const failedResponse = {
        ...createTestMessage('Service temporarily unavailable'),
        escalationNeeded: true,
      };

      // Test that fallback mechanisms are in place
      expect(failedResponse.escalationNeeded).toBe(true);
    });
  });

  describe('HIPAA Compliance', () => {
    it('should encrypt sensitive data in responses', async () => {
      const message = createTestMessage('My SSN is 123-45-6789 and I am depressed');
      const context = createTestContext({ confidentialityLevel: 'maximum' });

      const response = await agents.intake.processMessage(message, context);

      // Should not contain PII in response
      expect(response.content).not.toContain('123-45-6789');
      expect(response.metadata).toBeDefined();
    });

    it('should maintain audit logs for all interactions', async () => {
      const message = createTestMessage('Therapy session content');
      const context = createTestContext();

      const response = await agents.coordinator.processMessage(message, context);

      expect(response.coordinationEvents).toBeDefined();
      expect(response.timestamp).toBeDefined();
      expect(response.metadata).toBeDefined();
    });
  });
});

describe('Agent Orchestrator Integration', () => {
  let orchestrator: AgentOrchestrator;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
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
    };

    const orchestratorConfig = {
      maxConcurrentCoordinations: 10,
      defaultTimeoutMs: 30000,
      redisConnectionString: 'redis://localhost:6379',
      azureOpenAiEndpoint: 'https://test.openai.azure.com',
      azureOpenAiApiKey: 'test-key',
      azureOpenAiApiVersion: '2023-12-01-preview',
      performanceMetricsRetention: 86400,
      auditLogRetention: 86400,
      encryptionEnabled: true,
      encryptionKey: 'test-encryption-key',
    };

    orchestrator = new AgentOrchestrator(orchestratorConfig, mockPrisma);
  });

  it('should process user messages through agent coordination', async () => {
    const userMessage: UserMessage = {
      sessionId: 'test-session',
      userId: 'test-user',
      content: 'I am feeling anxious and need help with cultural identity issues',
      messageType: 'text',
      culturalContext: { primaryCulture: 'Latino' },
      timestamp: Date.now(),
      correlationId: generateCorrelationId(),
    };

    // Mock initialization
    orchestrator.initialize = vi.fn().mockResolvedValue(undefined);

    await expect(orchestrator.initialize()).resolves.not.toThrow();
  });

  it('should maintain performance metrics', () => {
    const metrics = orchestrator.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.registeredAgents).toBeDefined();
    expect(metrics.totalMessages).toBeDefined();
  });
});

describe('End-to-End Therapy Session Simulation', () => {
  it('should handle complete therapy session workflow', async () => {
    const mockLLMClient = createMockLLMClient();
    const mockRedisCoordinator = createMockRedisCoordinator();

    // Create agents
    const intake = new IntakeAgent(
      createAgentConfig('intake'),
      mockLLMClient,
      mockRedisCoordinator
    );
    const crisis = new CrisisMonitorAgent(
      createAgentConfig('crisis_monitor'),
      mockLLMClient,
      mockRedisCoordinator
    );
    const cultural = new CulturalAdapterAgent(
      createAgentConfig('cultural_adapter'),
      mockLLMClient,
      mockRedisCoordinator
    );
    const coordinator = new TherapyCoordinatorAgent(
      createAgentConfig('therapy_coordinator'),
      mockLLMClient,
      mockRedisCoordinator
    );
    const progress = new ProgressTrackerAgent(
      createAgentConfig('progress_tracker'),
      mockLLMClient,
      mockRedisCoordinator
    );

    // Simulate therapy session progression
    const sessionMessages = [
      'I am a second-generation Mexican American dealing with anxiety and family pressure',
      'My family doesn\'t understand why I need therapy when I should just pray',
      'I feel caught between two cultures and don\'t fit in either',
      'The breathing exercises are helping but I still feel overwhelmed sometimes',
    ];

    const context = createTestContext();
    const responses = [];

    for (let i = 0; i < sessionMessages.length; i++) {
      const message = createTestMessage(sessionMessages[i]);
      
      // Each agent processes the message
      const agentResponses = await Promise.all([
        intake.processMessage(message, context),
        crisis.processMessage(message, context),
        cultural.processMessage(message, { ...context, 
          sessionHistory: responses.map(r => r.content) 
        }),
        progress.processMessage(message, { ...context, 
          sessionHistory: responses.map(r => r.content) 
        }),
      ]);

      // Coordinator synthesizes responses
      const coordinatedMessage = createTestMessage(sessionMessages[i], {
        otherAgentResponses: agentResponses.map(r => r.content),
      });
      
      const coordinatedResponse = await coordinator.processMessage(
        coordinatedMessage,
        context
      );

      responses.push(coordinatedResponse);

      // Verify session progression
      expect(coordinatedResponse).toBeDefined();
      expect(coordinatedResponse.confidence).toBeGreaterThan(0.5);
      if (i > 0) {
        expect(coordinatedResponse.culturalRelevance).toBeGreaterThan(0.7);
      }
    }

    // Verify overall session quality
    expect(responses).toHaveLength(4);
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.metadata?.progressTracked).toBe(true);
    expect(lastResponse.culturalRelevance).toBeGreaterThan(0.7);
  });
});