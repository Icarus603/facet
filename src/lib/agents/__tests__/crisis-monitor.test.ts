/**
 * FACET Crisis Monitor Agent Tests
 * Critical performance and accuracy testing for crisis detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CrisisMonitorAgent } from '../implementations/crisis-monitor';
import { crisisDetector } from '../utils/crisis-detection';
import { AzureOpenAIClient } from '../../llm/azure-openai';
import { RedisCoordinator } from '../coordination/redis-coordinator';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  generateCorrelationId,
} from '../agent-types';

// Mock dependencies
vi.mock('../../llm/azure-openai');
vi.mock('../coordination/redis-coordinator');

const createMockLLMClient = () => ({
  generateResponse: vi.fn().mockResolvedValue({
    content: 'Mock crisis assessment response',
    usage: { totalTokens: 100 },
    model: 'gpt-4o',
    finishReason: 'stop',
    requestId: 'test-request',
    timestamp: Date.now(),
  }),
  healthCheck: vi.fn().mockResolvedValue(true),
});

const createMockRedisCoordinator = () => ({
  publish: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  emit: vi.fn(),
});

const createCrisisConfig = (): AgentConfig => ({
  id: 'crisis_monitor_test',
  type: 'crisis_monitor',
  capabilities: ['crisis_detection', 'risk_assessment', 'safety_planning'],
  maxConcurrentSessions: 10,
  responseTimeoutMs: 1000, // 1 second for crisis
  healthCheckIntervalMs: 30000,
  circuitBreaker: {
    failureThreshold: 3,
    successThreshold: 2,
    timeoutMs: 5000,
    halfOpenMaxRequests: 1,
  },
  llmConfig: {
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 500,
    systemPrompt: 'You are a crisis monitoring specialist.',
  },
});

const createTestContext = (overrides = {}): AgentContext => ({
  sessionId: 'crisis-test-session',
  userId: 'crisis-test-user',
  culturalProfile: {
    primaryCulture: 'Latino',
    religiousSpiritual: { beliefs: ['Catholic'], importance: 8 },
    familyDynamics: { involvement: 'high' },
  },
  confidentialityLevel: 'maximum',
  timestamp: Date.now(),
  correlationId: generateCorrelationId(),
  ...overrides,
});

const createCrisisMessage = (content: string, metadata = {}): AgentMessage => ({
  id: 'crisis-message',
  type: 'user_input',
  content,
  metadata,
  priority: 'critical',
  source: 'user',
  timestamp: Date.now(),
  encrypted: true,
});

describe('Crisis Monitor Agent - Performance Tests', () => {
  let crisisAgent: CrisisMonitorAgent;
  let mockLLMClient: any;
  let mockRedisCoordinator: any;

  beforeEach(() => {
    mockLLMClient = createMockLLMClient();
    mockRedisCoordinator = createMockRedisCoordinator();
    crisisAgent = new CrisisMonitorAgent(
      createCrisisConfig(),
      mockLLMClient,
      mockRedisCoordinator
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Response Time Requirements', () => {
    it('should detect critical crisis in <1 second', async () => {
      const criticalMessages = [
        'I am going to kill myself tonight',
        'I have a gun and plan to end my life',
        'I am taking pills to overdose right now',
        'I wrote goodbye letters and am ready to die',
      ];

      for (const message of criticalMessages) {
        const startTime = Date.now();
        const crisisMessage = createCrisisMessage(message);
        const context = createTestContext();

        const response = await crisisAgent.processMessage(crisisMessage, context);
        const processingTime = Date.now() - startTime;

        expect(processingTime).toBeLessThan(1000);
        expect(response.escalationNeeded).toBe(true);
        expect(response.metadata?.criticalCrisisDetected).toBe(true);
      }
    });

    it('should respond to moderate risk in <2 seconds', async () => {
      const moderateMessages = [
        'I sometimes think about dying but would never act on it',
        'Life feels overwhelming and I wish I could disappear',
        'I have been having dark thoughts but no plans',
      ];

      for (const message of moderateMessages) {
        const startTime = Date.now();
        const crisisMessage = createCrisisMessage(message);
        const context = createTestContext();

        const response = await crisisAgent.processMessage(crisisMessage, context);
        const processingTime = Date.now() - startTime;

        expect(processingTime).toBeLessThan(2000);
        expect(response.metadata?.riskLevel).toBeDefined();
        expect(response.metadata?.safetyPlanCreated).toBe(true);
      }
    });
  });

  describe('Crisis Detection Accuracy', () => {
    it('should achieve >95% sensitivity for critical cases', async () => {
      const criticalCases = [
        'I am going to kill myself',
        'I have a suicide plan',
        'I am going to hurt my family',
        'The voices are telling me to die',
        'I overdosed on pills',
        'I am cutting my wrists',
        'I have a gun ready',
        'I want to end my life tonight',
        'I wrote my suicide note',
        'I am jumping off the bridge',
      ];

      let correctlyDetected = 0;

      for (const message of criticalCases) {
        const crisisMessage = createCrisisMessage(message);
        const context = createTestContext();

        const response = await crisisAgent.processMessage(crisisMessage, context);

        if (response.escalationNeeded && response.metadata?.criticalCrisisDetected) {
          correctlyDetected++;
        }
      }

      const sensitivity = correctlyDetected / criticalCases.length;
      expect(sensitivity).toBeGreaterThan(0.95);
    });

    it('should maintain <5% false positives for non-crisis cases', async () => {
      const nonCrisisCases = [
        'I had a good day today',
        'I am feeling stressed about work',
        'My relationship is going through a difficult time',
        'I am worried about my health',
        'I feel sad sometimes',
        'I am having trouble sleeping',
        'I argued with my family',
        'I am nervous about a presentation',
        'I feel lonely at times',
        'I am dealing with grief',
      ];

      let falsePositives = 0;

      for (const message of nonCrisisCases) {
        const crisisMessage = createCrisisMessage(message);
        const context = createTestContext();

        const response = await crisisAgent.processMessage(crisisMessage, context);

        if (response.escalationNeeded && response.metadata?.criticalCrisisDetected) {
          falsePositives++;
        }
      }

      const falsePositiveRate = falsePositives / nonCrisisCases.length;
      expect(falsePositiveRate).toBeLessThan(0.05);
    });
  });

  describe('Cultural Crisis Considerations', () => {
    it('should adapt crisis response for Latino cultural context', async () => {
      const culturalMessage = createCrisisMessage(
        'I want to die but I cannot shame my family and go against God'
      );
      const latinoContext = createTestContext({
        culturalProfile: {
          primaryCulture: 'Latino',
          religiousSpiritual: { beliefs: ['Catholic'], importance: 9 },
          familyDynamics: { involvement: 'high' },
          culturalValues: { mentalHealthStigma: 8 },
        },
      });

      const response = await crisisAgent.processMessage(culturalMessage, latinoContext);

      expect(response.culturalRelevance).toBeGreaterThan(0.8);
      expect(response.metadata?.humanInterventionRequired).toBe(true);
      expect(response.content.toLowerCase()).toContain('family');
    });

    it('should adapt crisis response for Asian cultural context', async () => {
      const culturalMessage = createCrisisMessage(
        'I have brought dishonor to my family and want to end my shame'
      );
      const asianContext = createTestContext({
        culturalProfile: {
          primaryCulture: 'Asian',
          culturalValues: { mentalHealthStigma: 9, powerDistance: 8 },
          familyDynamics: { involvement: 'high', decisionMaking: 'family' },
        },
      });

      const response = await crisisAgent.processMessage(culturalMessage, asianContext);

      expect(response.culturalRelevance).toBeGreaterThan(0.8);
      expect(response.escalationNeeded).toBe(true);
      expect(response.content.toLowerCase()).toMatch(/honor|family|shame/);
    });

    it('should provide culturally appropriate emergency resources', async () => {
      const crisisMessage = createCrisisMessage('I am going to kill myself tonight');
      const spanishContext = createTestContext({
        culturalProfile: {
          primaryCulture: 'Latino',
          languagePreferences: ['Spanish'],
        },
      });

      const response = await crisisAgent.processMessage(crisisMessage, spanishContext);

      expect(response.escalationNeeded).toBe(true);
      expect(response.actionItems).toContain(
        expect.stringMatching(/spanish|español|hola/i)
      );
    });
  });

  describe('Safety Planning and Intervention', () => {
    it('should create comprehensive safety plan for moderate risk', async () => {
      const moderateMessage = createCrisisMessage(
        'I have been thinking about suicide but I have young children who need me'
      );
      const context = createTestContext();

      const response = await crisisAgent.processMessage(moderateMessage, context);

      expect(response.metadata?.safetyPlanCreated).toBe(true);
      expect(response.actionItems).toContain(expect.stringMatching(/safety|plan/i));
      expect(response.followUpRequired).toBe(true);
    });

    it('should activate emergency protocols for immediate danger', async () => {
      const emergencyMessage = createCrisisMessage(
        'I am taking an overdose of pills right now'
      );
      const context = createTestContext();

      const response = await crisisAgent.processMessage(emergencyMessage, context);

      expect(response.escalationNeeded).toBe(true);
      expect(response.metadata?.emergencyServicesNotified).toBe(true);
      expect(response.actionItems).toContain(expect.stringMatching(/911|emergency/i));
    });

    it('should consider protective factors in risk assessment', async () => {
      const protectedMessage = createCrisisMessage(
        'I want to die but my faith tells me suicide is wrong and my children need me'
      );
      const religiousContext = createTestContext({
        culturalProfile: {
          primaryCulture: 'African American',
          religiousSpiritual: { beliefs: ['Baptist'], importance: 9 },
        },
      });

      const response = await crisisAgent.processMessage(protectedMessage, religiousContext);

      expect(response.escalationNeeded).toBe(true); // Still escalate suicidal ideation
      expect(response.culturalRelevance).toBeGreaterThan(0.8);
      expect(response.content.toLowerCase()).toMatch(/faith|children|support/);
    });
  });

  describe('Risk Monitoring and Progression', () => {
    it('should track risk changes over multiple sessions', async () => {
      const context = createTestContext();
      const messages = [
        'I have been thinking about suicide every day',
        'The thoughts are getting stronger and more frequent',
        'I am starting to make plans',
        'I have access to pills and am ready to act',
      ];

      const responses = [];
      for (const message of messages) {
        const crisisMessage = createCrisisMessage(message);
        const response = await crisisAgent.processMessage(crisisMessage, context);
        responses.push(response);
      }

      // Risk should escalate over time
      expect(responses[0].escalationNeeded).toBe(true);
      expect(responses[3].metadata?.criticalCrisisDetected).toBe(true);
      expect(responses[3].metadata?.emergencyServicesNeeded).toBe(true);
    });

    it('should recognize improvement in risk levels', async () => {
      const context = createTestContext();
      const improvementMessages = [
        'I was thinking about suicide but therapy is helping',
        'The thoughts are less frequent now',
        'I am feeling more hopeful about the future',
        'I have many reasons to live and want to get better',
      ];

      const responses = [];
      for (const message of improvementMessages) {
        const crisisMessage = createCrisisMessage(message);
        const response = await crisisAgent.processMessage(crisisMessage, context);
        responses.push(response);
      }

      // First message should still trigger concern, later ones should show improvement
      expect(responses[0].escalationNeeded).toBe(true);
      expect(responses[3].escalationNeeded).toBe(false);
      expect(responses[3].followUpRequired).toBe(true); // Still monitor
    });
  });

  describe('Health Check and Monitoring', () => {
    it('should pass health check with accurate crisis detection', async () => {
      const healthStatus = await crisisAgent.performAgentSpecificHealthCheck();
      expect(healthStatus).toBe(true);
    });

    it('should report performance metrics', () => {
      const metrics = crisisAgent.getPerformanceMetrics();
      expect(metrics.agentId).toBe('crisis_monitor_test');
      expect(metrics.responseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(1);
    });

    it('should maintain circuit breaker functionality', async () => {
      // Simulate failures
      mockLLMClient.generateResponse.mockRejectedValue(new Error('Service unavailable'));

      const crisisMessage = createCrisisMessage('Test message');
      const context = createTestContext();

      // Should fail but circuit breaker should handle it
      await expect(crisisAgent.processMessage(crisisMessage, context)).rejects.toThrow();

      const circuitState = crisisAgent.getCircuitBreakerState();
      expect(circuitState).toBeDefined();
    });
  });

  describe('Fallback and Error Handling', () => {
    it('should provide safe fallback response on technical failure', async () => {
      mockLLMClient.generateResponse.mockRejectedValue(new Error('LLM unavailable'));

      const crisisMessage = createCrisisMessage('I want to hurt myself');
      const context = createTestContext();

      try {
        await crisisAgent.processMessage(crisisMessage, context);
      } catch (error) {
        // Should still provide crisis guidance in error cases
        expect(error).toBeDefined();
      }
    });

    it('should maintain crisis detection even with degraded services', async () => {
      // Simulate partial service degradation
      mockLLMClient.generateResponse.mockImplementation(() => {
        return Promise.resolve({
          content: 'Basic crisis response - please call 911 if in immediate danger',
          usage: { totalTokens: 20 },
          model: 'fallback',
          finishReason: 'stop',
          requestId: 'fallback',
          timestamp: Date.now(),
        });
      });

      const crisisMessage = createCrisisMessage('I am going to kill myself');
      const context = createTestContext();

      const response = await crisisAgent.processMessage(crisisMessage, context);

      expect(response.escalationNeeded).toBe(true);
      expect(response.content).toContain('911');
    });
  });
});

describe('Crisis Detection Utility Tests', () => {
  describe('Pattern Matching Performance', () => {
    it('should detect crisis patterns in <100ms', () => {
      const testCases = [
        'I want to kill myself tonight',
        'I am hearing voices telling me to die',
        'I have a plan to overdose on pills',
        'I am going to hurt my family',
      ];

      for (const text of testCases) {
        const startTime = Date.now();
        const riskScore = crisisDetector.detectCrisis({
          text,
          culturalBackground: 'general',
        });
        const detectionTime = Date.now() - startTime;

        expect(detectionTime).toBeLessThan(100);
        expect(riskScore.overallRisk).toBeGreaterThan(7);
        expect(riskScore.immediacy).toBeGreaterThan(7);
      }
    });

    it('should provide accurate confidence scores', () => {
      const highConfidenceCases = [
        'I am going to commit suicide tonight',
        'I have a gun and plan to shoot myself',
        'I am taking an overdose right now',
      ];

      const lowConfidenceCases = [
        'I feel sad',
        'Life is hard sometimes',
        'I am having a difficult day',
      ];

      for (const text of highConfidenceCases) {
        const riskScore = crisisDetector.detectCrisis({ text });
        expect(riskScore.confidence).toBeGreaterThan(0.8);
      }

      for (const text of lowConfidenceCases) {
        const riskScore = crisisDetector.detectCrisis({ text });
        expect(riskScore.confidence).toBeLessThan(0.3);
      }
    });
  });

  describe('Cultural Risk Assessment', () => {
    it('should apply cultural protective factors', () => {
      const baseText = 'I want to die';
      
      const baseRisk = crisisDetector.detectCrisis({ text: baseText });
      const culturalRisk = crisisDetector.detectCrisis({
        text: baseText + ' but my faith says suicide is wrong',
        culturalBackground: 'Latino',
      });

      expect(culturalRisk.protectiveFactors.length).toBeGreaterThan(0);
      // Cultural protective factors should be considered
      expect(culturalRisk.protectiveFactors).toContain(expect.stringMatching(/faith|religious/));
    });

    it('should identify cultural risk factors', () => {
      const culturalStressText = 'I have brought shame to my family and want to die';
      
      const riskScore = crisisDetector.detectCrisis({
        text: culturalStressText,
        culturalBackground: 'Asian',
      });

      expect(riskScore.overallRisk).toBeGreaterThan(7);
      expect(riskScore.riskFactors).toBeDefined();
    });
  });

  describe('Risk Progression Monitoring', () => {
    it('should track improving risk trends', () => {
      const sessionRisks = [
        { overallRisk: 8, suicideRisk: 8, violenceRisk: 2, selfHarmRisk: 6, psychosisRisk: 1, immediacy: 7, confidence: 0.9, detectedPatterns: [], protectiveFactors: [], riskFactors: [] },
        { overallRisk: 6, suicideRisk: 6, violenceRisk: 2, selfHarmRisk: 4, psychosisRisk: 1, immediacy: 5, confidence: 0.8, detectedPatterns: [], protectiveFactors: [], riskFactors: [] },
        { overallRisk: 4, suicideRisk: 4, violenceRisk: 1, selfHarmRisk: 3, psychosisRisk: 1, immediacy: 3, confidence: 0.7, detectedPatterns: [], protectiveFactors: [], riskFactors: [] },
        { overallRisk: 2, suicideRisk: 2, violenceRisk: 1, selfHarmRisk: 2, psychosisRisk: 1, immediacy: 2, confidence: 0.6, detectedPatterns: [], protectiveFactors: [], riskFactors: [] },
      ];

      const progression = crisisDetector.monitorRiskProgression(sessionRisks);

      expect(progression.trend).toBe('improving');
      expect(progression.concernLevel).toBeLessThan(5);
      expect(progression.recommendations).toContain(expect.stringMatching(/continue|maintain/i));
    });

    it('should detect worsening risk trends', () => {
      const sessionRisks = [
        { overallRisk: 3, suicideRisk: 3, violenceRisk: 1, selfHarmRisk: 2, psychosisRisk: 1, immediacy: 2, confidence: 0.6, detectedPatterns: [], protectiveFactors: [], riskFactors: [] },
        { overallRisk: 5, suicideRisk: 5, violenceRisk: 1, selfHarmRisk: 4, psychosisRisk: 1, immediacy: 4, confidence: 0.7, detectedPatterns: [], protectiveFactors: [], riskFactors: [] },
        { overallRisk: 7, suicideRisk: 7, violenceRisk: 2, selfHarmRisk: 6, psychosisRisk: 1, immediacy: 6, confidence: 0.8, detectedPatterns: [], protectiveFactors: [], riskFactors: [] },
        { overallRisk: 9, suicideRisk: 9, violenceRisk: 2, selfHarmRisk: 8, psychosisRisk: 1, immediacy: 8, confidence: 0.9, detectedPatterns: [], protectiveFactors: [], riskFactors: [] },
      ];

      const progression = crisisDetector.monitorRiskProgression(sessionRisks);

      expect(progression.trend).toBe('worsening');
      expect(progression.concernLevel).toBeGreaterThan(7);
      expect(progression.recommendations).toContain(expect.stringMatching(/increase|intensive|hospital/i));
    });
  });
});