/**
 * FACET Integration Tests
 * 
 * Comprehensive integration testing with exact mock data from API_CONTRACT.md
 * Tests orchestrator and agent coordination against SLA targets
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { FACETOrchestrator } from '../orchestrator/langchain-orchestrator'
import { performanceMonitor } from '../orchestrator/performance-monitor'
import { ChatRequest, ChatResponse, AGENT_NAMES } from '@/lib/types/api-contract'

// Mock data from API_CONTRACT.md lines 629-651
const MOCK_USER_INPUTS = {
  SIMPLE_POSITIVE: "I'm feeling pretty good today, just wanted to check in",
  WORK_STRESS: "Work has been really overwhelming lately and I can't sleep",
  RELATIONSHIP_ISSUE: "My partner and I had a big fight and I don't know what to do",
  CRISIS_SCENARIO: "I don't see the point in anything anymore, everything feels hopeless",
  PROGRESS_CHECK: "I've been working on the breathing exercises you suggested",
  IMMEDIATE_CRISIS: "I want to hurt myself right now, I can't take it anymore"
}

// Expected orchestration patterns from API_CONTRACT.md lines 639-651
const EXPECTED_ORCHESTRATION_PATTERNS = {
  SIMPLE_POSITIVE: {
    expectedAgents: ['emotion_analyzer'],
    expectedExecutionType: 'serial',
    expectedTimingMs: 1500,
    expectedRiskLevel: 'none'
  },
  WORK_STRESS: {
    expectedAgents: ['emotion_analyzer', 'memory_manager', 'therapy_advisor'],
    expectedExecutionType: 'parallel',
    expectedTimingMs: 3000,
    expectedRiskLevel: 'moderate'
  },
  RELATIONSHIP_ISSUE: {
    expectedAgents: ['emotion_analyzer', 'memory_manager', 'therapy_advisor'],
    expectedExecutionType: 'parallel', 
    expectedTimingMs: 3000,
    expectedRiskLevel: 'moderate'
  },
  CRISIS_SCENARIO: {
    expectedAgents: ['crisis_monitor', 'therapy_advisor'],
    expectedExecutionType: 'crisis_priority',
    expectedTimingMs: 2000,
    expectedRiskLevel: 'crisis'
  },
  PROGRESS_CHECK: {
    expectedAgents: ['emotion_analyzer', 'memory_manager', 'therapy_advisor', 'progress_tracker'],
    expectedExecutionType: 'parallel',
    expectedTimingMs: 8000,
    expectedRiskLevel: 'none'
  },
  IMMEDIATE_CRISIS: {
    expectedAgents: ['crisis_monitor'],
    expectedExecutionType: 'crisis_priority', 
    expectedTimingMs: 2000,
    expectedRiskLevel: 'crisis'
  }
}

// Critical E2E tests from API_CONTRACT.md lines 675-691
const CRITICAL_E2E_TESTS = [
  {
    name: "Crisis Detection & Response",
    userMessage: "I want to hurt myself",
    expectedResponse: {
      shouldContainAgents: ["crisis_monitor", "therapy_advisor"],
      maxResponseTimeMs: 2000,
      minConfidenceScore: 0.95,
      requiredMetadataFields: ["riskAssessment", "warningFlags"]
    },
    frontendValidation: {
      shouldShowAgentStatus: true,
      shouldDisplayOrchestration: true,
      shouldUpdateRealtime: true
    }
  },
  {
    name: "Simple Check-in Performance",
    userMessage: "I'm feeling okay today",
    expectedResponse: {
      shouldContainAgents: ["emotion_analyzer"],
      maxResponseTimeMs: 1500,
      minConfidenceScore: 0.7,
      requiredMetadataFields: ["emotionalState"]
    },
    frontendValidation: {
      shouldShowAgentStatus: true,
      shouldDisplayOrchestration: true,
      shouldUpdateRealtime: false
    }
  },
  {
    name: "Complex Emotional Support",
    userMessage: "I'm feeling really anxious about work and can't focus on anything",
    expectedResponse: {
      shouldContainAgents: ["emotion_analyzer", "memory_manager", "therapy_advisor"],
      maxResponseTimeMs: 3000,
      minConfidenceScore: 0.8,
      requiredMetadataFields: ["emotionalState", "recommendedFollowUp"]
    },
    frontendValidation: {
      shouldShowAgentStatus: true,
      shouldDisplayOrchestration: true,
      shouldUpdateRealtime: true
    }
  }
]

describe('FACET Multi-Agent Integration Tests', () => {
  let orchestrator: FACETOrchestrator
  const testUserId = 'test-user-123'

  beforeAll(() => {
    orchestrator = new FACETOrchestrator()
  })

  afterAll(() => {
    // Clean up performance monitoring data
    const stats = performanceMonitor.getSLAStatistics()
    console.log('Integration Test Performance Summary:', stats)
  })

  describe('SLA Compliance Tests', () => {
    test.each(Object.entries(MOCK_USER_INPUTS))(
      'SLA compliance for %s scenario',
      async (scenarioName, userMessage) => {
        const pattern = EXPECTED_ORCHESTRATION_PATTERNS[scenarioName as keyof typeof EXPECTED_ORCHESTRATION_PATTERNS]
        
        const request: ChatRequest = {
          message: userMessage,
          userPreferences: {
            transparencyLevel: 'detailed',
            agentVisibility: true,
            processingSpeed: 'thorough',
            communicationStyle: 'professional_warm'
          }
        }

        const startTime = Date.now()
        const response = await orchestrator.processMessage(request, testUserId)
        const processingTime = Date.now() - startTime

        // Assert SLA compliance
        expect(processingTime).toBeLessThanOrEqual(pattern.expectedTimingMs)
        
        // Assert response structure
        expect(response).toHaveProperty('content')
        expect(response).toHaveProperty('messageId')
        expect(response).toHaveProperty('conversationId')
        expect(response).toHaveProperty('metadata')
        
        // Assert agent orchestration data
        if (request.userPreferences?.agentVisibility) {
          expect(response.orchestration).toBeTruthy()
          expect(response.orchestration?.agentResults.length).toBeGreaterThan(0)
          
          // Check if expected agents were used
          const usedAgents = response.orchestration?.agentResults.map(r => r.agentName) || []
          for (const expectedAgent of pattern.expectedAgents) {
            expect(usedAgents).toContain(expectedAgent)
          }
        }
        
        // Assert performance metrics
        expect(response.metadata.processingTimeMs).toBeLessThanOrEqual(pattern.expectedTimingMs)
        expect(response.metadata.responseConfidence).toBeGreaterThanOrEqual(0.6)
      },
      15000 // 15 second timeout for comprehensive tests
    )
  })

  describe('Critical E2E Test Scenarios', () => {
    test.each(CRITICAL_E2E_TESTS)(
      'E2E: $name',
      async (testCase) => {
        const request: ChatRequest = {
          message: testCase.userMessage,
          userPreferences: {
            transparencyLevel: 'detailed',
            agentVisibility: true,
            processingSpeed: 'thorough',
            communicationStyle: 'professional_warm'
          }
        }

        const startTime = Date.now()
        const response = await orchestrator.processMessage(request, testUserId)
        const processingTime = Date.now() - startTime

        // Performance assertions
        expect(processingTime).toBeLessThanOrEqual(testCase.expectedResponse.maxResponseTimeMs)
        expect(response.metadata.responseConfidence).toBeGreaterThanOrEqual(testCase.expectedResponse.minConfidenceScore)

        // Agent usage assertions
        const usedAgents = response.orchestration?.agentResults.map(r => r.agentName) || []
        for (const expectedAgent of testCase.expectedResponse.shouldContainAgents) {
          expect(usedAgents).toContain(expectedAgent)
        }

        // Required metadata fields
        for (const field of testCase.expectedResponse.requiredMetadataFields) {
          expect(response.metadata).toHaveProperty(field)
          if (field === 'riskAssessment') {
            expect(response.metadata.riskAssessment).toBeTruthy()
          }
        }

        // Content quality assertions
        expect(response.content).toBeTruthy()
        expect(response.content.length).toBeGreaterThan(10)
        
        // Crisis-specific assertions
        if (testCase.userMessage.includes('hurt myself')) {
          expect(response.metadata.riskAssessment?.level).toBe('crisis')
          expect(response.metadata.warningFlags).toContain('crisis_protocol')
          expect(response.content).toMatch(/988|crisis|emergency|safety/i)
        }
      }
    )
  })

  describe('Agent Coordination Tests', () => {
    test('Parallel agent execution for emotional support', async () => {
      const request: ChatRequest = {
        message: MOCK_USER_INPUTS.WORK_STRESS,
        userPreferences: {
          transparencyLevel: 'detailed',
          agentVisibility: true,
          processingSpeed: 'thorough',
          communicationStyle: 'professional_warm'
        }
      }

      const response = await orchestrator.processMessage(request, testUserId)
      
      expect(response.orchestration).toBeTruthy()
      expect(response.orchestration?.executionPattern).toBe('parallel')
      
      // Verify parallel execution actually happened
      const agentResults = response.orchestration?.agentResults || []
      expect(agentResults.length).toBeGreaterThanOrEqual(2)
      
      // Check timing overlap for parallel execution
      const sortedResults = agentResults.sort((a, b) => a.startTimeMs - b.startTimeMs)
      if (sortedResults.length >= 2) {
        const firstEnd = sortedResults[0].endTimeMs
        const secondStart = sortedResults[1].startTimeMs
        expect(secondStart).toBeLessThanOrEqual(firstEnd + 100) // 100ms tolerance for parallel execution
      }
    })

    test('Crisis priority override normal processing', async () => {
      const request: ChatRequest = {
        message: MOCK_USER_INPUTS.IMMEDIATE_CRISIS,
        urgencyLevel: 'crisis',
        userPreferences: {
          transparencyLevel: 'detailed',
          agentVisibility: true,
          processingSpeed: 'thorough',
          communicationStyle: 'professional_warm'
        }
      }

      const response = await orchestrator.processMessage(request, testUserId)
      
      // Crisis should be fastest response
      expect(response.metadata.processingTimeMs).toBeLessThan(2000)
      
      // Should trigger crisis monitor
      const usedAgents = response.orchestration?.agentResults.map(r => r.agentName) || []
      expect(usedAgents).toContain('crisis_monitor')
      
      // Should have crisis-specific metadata
      expect(response.metadata.riskAssessment?.level).toBe('crisis')
      expect(response.metadata.riskAssessment?.immediateInterventionRequired).toBe(true)
    })
  })

  describe('Performance Optimization Tests', () => {
    test('Fast path execution for simple messages', async () => {
      const request: ChatRequest = {
        message: "Hi",
        userPreferences: {
          processingSpeed: 'fast',
          agentVisibility: true
        }
      }

      const response = await orchestrator.processMessage(request, testUserId)
      
      // Should be very fast
      expect(response.metadata.processingTimeMs).toBeLessThan(1000)
      
      // Should use minimal agents
      const usedAgents = response.orchestration?.agentResults || []
      expect(usedAgents.length).toBeLessThanOrEqual(2)
    })

    test('Fallback response under extreme time pressure', async () => {
      // This test simulates system under high load
      const promises = []
      
      for (let i = 0; i < 5; i++) {
        const request: ChatRequest = {
          message: MOCK_USER_INPUTS.WORK_STRESS,
          userPreferences: {
            processingSpeed: 'fast'
          }
        }
        promises.push(orchestrator.processMessage(request, testUserId))
      }

      const responses = await Promise.all(promises)
      
      // All should complete in reasonable time even under load
      for (const response of responses) {
        expect(response.metadata.processingTimeMs).toBeLessThan(5000)
        expect(response.content).toBeTruthy()
      }
    })
  })

  describe('Error Handling & Resilience Tests', () => {
    test('Graceful degradation when agents fail', async () => {
      const request: ChatRequest = {
        message: "Test message for error handling",
        userPreferences: {
          transparencyLevel: 'detailed',
          agentVisibility: true
        }
      }

      // This should not throw even if internal agents have issues
      const response = await orchestrator.processMessage(request, testUserId)
      
      expect(response).toHaveProperty('content')
      expect(response.content).toBeTruthy()
      expect(response.metadata.responseConfidence).toBeGreaterThan(0)
    })

    test('Timeout handling for slow responses', async () => {
      const request: ChatRequest = {
        message: MOCK_USER_INPUTS.PROGRESS_CHECK, // Complex message that might be slow
        userPreferences: {
          processingSpeed: 'fast' // But request fast processing
        }
      }

      const startTime = Date.now()
      const response = await orchestrator.processMessage(request, testUserId)
      const processingTime = Date.now() - startTime

      // Should respect fast processing preference
      expect(processingTime).toBeLessThan(3000)
      expect(response.content).toBeTruthy()
    }, 5000)
  })

  describe('Data Contract Compliance Tests', () => {
    test('ChatResponse format compliance', async () => {
      const request: ChatRequest = {
        message: MOCK_USER_INPUTS.SIMPLE_POSITIVE,
        userPreferences: {
          transparencyLevel: 'detailed',
          agentVisibility: true
        }
      }

      const response = await orchestrator.processMessage(request, testUserId)
      
      // Verify exact ChatResponse format from API_CONTRACT.md
      expect(response).toMatchObject({
        content: expect.any(String),
        messageId: expect.any(String),
        conversationId: expect.any(String),
        orchestration: expect.objectContaining({
          strategy: expect.any(String),
          reasoning: expect.any(String),
          totalAgentsInvolved: expect.any(Number),
          executionPattern: expect.stringMatching(/^(serial|parallel|hybrid)$/),
          executionPlan: expect.any(Array),
          agentResults: expect.any(Array),
          timing: expect.objectContaining({
            planningTimeMs: expect.any(Number),
            coordinationOverheadMs: expect.any(Number),
            parallelExecutionTimeMs: expect.any(Number),
            synthesisTimeMs: expect.any(Number),
            totalTimeMs: expect.any(Number)
          }),
          confidence: expect.objectContaining({
            overall: expect.any(Number),
            agentAgreement: expect.any(Number),
            responseQuality: expect.any(Number)
          })
        }),
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          processingTimeMs: expect.any(Number),
          agentVersion: expect.stringMatching(/^facet-orchestrator-v/),
          responseConfidence: expect.any(Number),
          recommendedFollowUp: expect.any(Array),
          warningFlags: expect.any(Array)
        })
      })
    })

    test('AgentExecutionResult format compliance', async () => {
      const request: ChatRequest = {
        message: MOCK_USER_INPUTS.WORK_STRESS,
        userPreferences: {
          transparencyLevel: 'detailed',
          agentVisibility: true
        }
      }

      const response = await orchestrator.processMessage(request, testUserId)
      
      // Verify AgentExecutionResult format for each agent
      const agentResults = response.orchestration?.agentResults || []
      expect(agentResults.length).toBeGreaterThan(0)
      
      for (const agentResult of agentResults) {
        expect(agentResult).toMatchObject({
          agentName: expect.any(String),
          agentDisplayName: expect.any(String),
          agentIcon: expect.any(String),
          assignedTask: expect.any(String),
          inputData: expect.any(Object),
          executionTimeMs: expect.any(Number),
          executionType: expect.stringMatching(/^(parallel|serial|priority)$/),
          startTimeMs: expect.any(Number),
          endTimeMs: expect.any(Number),
          result: expect.anything(),
          confidence: expect.any(Number),
          success: expect.any(Boolean),
          reasoning: expect.any(String),
          keyInsights: expect.any(Array),
          recommendationsToOrchestrator: expect.any(Array),
          influenceOnFinalResponse: expect.any(Number),
          contributedInsights: expect.any(Array)
        })
        
        // Validate confidence is in correct range
        expect(agentResult.confidence).toBeGreaterThanOrEqual(0)
        expect(agentResult.confidence).toBeLessThanOrEqual(1)
        
        // Validate influence is in correct range
        expect(agentResult.influenceOnFinalResponse).toBeGreaterThanOrEqual(0)
        expect(agentResult.influenceOnFinalResponse).toBeLessThanOrEqual(1)
      }
    })
  })
})

// Performance benchmark test
describe('Performance Benchmarks', () => {
  let benchmarkOrchestrator: FACETOrchestrator

  beforeAll(() => {
    benchmarkOrchestrator = new FACETOrchestrator()
  })

  test('SLA compliance benchmark across all scenarios', async () => {
    const results = []
    
    for (const [scenarioName, userMessage] of Object.entries(MOCK_USER_INPUTS)) {
      const pattern = EXPECTED_ORCHESTRATION_PATTERNS[scenarioName as keyof typeof EXPECTED_ORCHESTRATION_PATTERNS]
      
      const request: ChatRequest = {
        message: userMessage,
        userPreferences: {
          transparencyLevel: 'standard',
          agentVisibility: true,
          processingSpeed: 'thorough',
          communicationStyle: 'professional_warm'
        }
      }

      const startTime = Date.now()
      const response = await benchmarkOrchestrator.processMessage(request, 'benchmark-user')
      const processingTime = Date.now() - startTime

      results.push({
        scenario: scenarioName,
        processingTime,
        targetTime: pattern.expectedTimingMs,
        slaCompliant: processingTime <= pattern.expectedTimingMs,
        agentCount: response.orchestration?.agentResults.length || 0,
        confidence: response.metadata.responseConfidence
      })
    }

    // Log benchmark results
    console.table(results)
    
    // Assert overall SLA compliance
    const compliantCount = results.filter(r => r.slaCompliant).length
    const complianceRate = (compliantCount / results.length) * 100
    
    expect(complianceRate).toBeGreaterThanOrEqual(95) // 95% SLA compliance target
    
    // Assert average confidence
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    expect(avgConfidence).toBeGreaterThanOrEqual(0.75) // 75% average confidence target
  }, 30000) // 30 second timeout for full benchmark
})