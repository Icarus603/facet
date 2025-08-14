/**
 * FACET Agent Performance Benchmarking
 * Comprehensive performance testing and optimization for therapy agents
 */

import { performance } from 'perf_hooks';
import { nanoid } from 'nanoid';
import { BaseAgent } from '../base-agent';
import { AgentContext, AgentMessage, AgentResponse, AgentType } from '../agent-types';
import { crisisDetector, CrisisContext } from './crisis-detection';
import { culturalMatcher, CulturalProfile } from './cultural-matching';

export interface PerformanceBenchmark {
  agentType: AgentType;
  testName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  responseTime: number;
  memoryUsage: number;
  cpuUsage?: number;
  confidence: number;
  culturalRelevance?: number;
  accuracy?: number;
  errorMessage?: string;
}

export interface BenchmarkSuite {
  name: string;
  description: string;
  tests: BenchmarkTest[];
  requirements: PerformanceRequirement[];
}

export interface BenchmarkTest {
  name: string;
  description: string;
  testType: 'latency' | 'accuracy' | 'throughput' | 'reliability' | 'cultural_competency';
  priority: 'critical' | 'high' | 'medium' | 'low';
  execute: (agent: BaseAgent) => Promise<PerformanceBenchmark>;
}

export interface PerformanceRequirement {
  metric: string;
  operator: '<' | '>' | '<=' | '>=' | '=';
  threshold: number;
  unit: string;
  description: string;
}

export interface BenchmarkReport {
  timestamp: number;
  agentType: AgentType;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  accuracyScore: number;
  culturalCompetencyScore: number;
  memoryEfficiency: number;
  recommendations: string[];
  criticalIssues: string[];
  benchmarks: PerformanceBenchmark[];
}

/**
 * Comprehensive agent performance benchmarking system
 */
export class AgentBenchmarker {
  private readonly benchmarkSuites: Map<AgentType, BenchmarkSuite[]> = new Map();
  private readonly results: Map<string, PerformanceBenchmark[]> = new Map();

  constructor() {
    this.initializeBenchmarkSuites();
  }

  /**
   * Run comprehensive benchmarks for all agents
   */
  async benchmarkAllAgents(agents: Map<AgentType, BaseAgent>): Promise<Map<AgentType, BenchmarkReport>> {
    const reports = new Map<AgentType, BenchmarkReport>();

    for (const [agentType, agent] of agents) {
      console.log(`\n🔬 Benchmarking ${agentType} agent...`);
      const report = await this.benchmarkAgent(agent);
      reports.set(agentType, report);
      
      this.logBenchmarkSummary(agentType, report);
    }

    return reports;
  }

  /**
   * Benchmark specific agent with comprehensive test suite
   */
  async benchmarkAgent(agent: BaseAgent): Promise<BenchmarkReport> {
    const agentType = agent.type as AgentType;
    const suites = this.benchmarkSuites.get(agentType) || [];
    const allBenchmarks: PerformanceBenchmark[] = [];

    for (const suite of suites) {
      console.log(`  📋 Running ${suite.name}...`);
      
      for (const test of suite.tests) {
        try {
          const benchmark = await test.execute(agent);
          allBenchmarks.push(benchmark);
          
          const status = benchmark.success ? '✅' : '❌';
          console.log(`    ${status} ${test.name}: ${benchmark.duration.toFixed(2)}ms`);
          
        } catch (error) {
          console.error(`    ❌ ${test.name}: Failed with error`, error);
          allBenchmarks.push({
            agentType,
            testName: test.name,
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
            success: false,
            responseTime: 0,
            memoryUsage: 0,
            confidence: 0,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return this.generateBenchmarkReport(agentType, allBenchmarks);
  }

  /**
   * Run specific performance test
   */
  async runPerformanceTest(
    testName: string,
    agent: BaseAgent,
    iterations: number = 100
  ): Promise<PerformanceBenchmark[]> {
    const benchmarks: PerformanceBenchmark[] = [];
    
    console.log(`🚀 Running ${testName} with ${iterations} iterations...`);

    for (let i = 0; i < iterations; i++) {
      const benchmark = await this.executeSingleTest(testName, agent, i);
      benchmarks.push(benchmark);
      
      if (i % 10 === 0) {
        console.log(`  Progress: ${i}/${iterations}`);
      }
    }

    this.analyzePerformanceResults(testName, benchmarks);
    return benchmarks;
  }

  /**
   * Test agent under load
   */
  async loadTest(
    agent: BaseAgent,
    concurrentRequests: number = 10,
    duration: number = 30000 // 30 seconds
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    errors: string[];
  }> {
    console.log(`🔥 Load testing ${agent.type} with ${concurrentRequests} concurrent requests for ${duration / 1000}s...`);

    const startTime = Date.now();
    const results: PerformanceBenchmark[] = [];
    const errors: string[] = [];
    let requestCount = 0;

    const executeRequest = async (): Promise<void> => {
      while (Date.now() - startTime < duration) {
        try {
          const testMessage = this.createTestMessage(agent.type as AgentType, requestCount);
          const testContext = this.createTestContext();
          
          const benchmark = await this.measureAgentResponse(agent, testMessage, testContext);
          results.push(benchmark);
          
          if (!benchmark.success) {
            errors.push(benchmark.errorMessage || 'Unknown error');
          }
          
        } catch (error) {
          errors.push(error instanceof Error ? error.message : 'Load test error');
        }
        
        requestCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
      }
    };

    // Run concurrent requests
    const promises = Array.from({ length: concurrentRequests }, () => executeRequest());
    await Promise.all(promises);

    const successfulRequests = results.filter(r => r.success).length;
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const requestsPerSecond = results.length / (duration / 1000);

    console.log(`📊 Load test completed: ${results.length} requests, ${successfulRequests} successful, ${averageResponseTime.toFixed(2)}ms avg`);

    return {
      totalRequests: results.length,
      successfulRequests,
      failedRequests: results.length - successfulRequests,
      averageResponseTime,
      requestsPerSecond,
      errors: Array.from(new Set(errors)), // Unique errors
    };
  }

  /**
   * Measure memory usage patterns
   */
  async memoryProfiler(
    agent: BaseAgent,
    testDuration: number = 60000 // 1 minute
  ): Promise<{
    initialMemory: number;
    peakMemory: number;
    finalMemory: number;
    memoryGrowth: number;
    gcEvents: number;
    recommendations: string[];
  }> {
    console.log(`💾 Memory profiling ${agent.type} for ${testDuration / 1000}s...`);

    const initialMemory = process.memoryUsage().heapUsed;
    let peakMemory = initialMemory;
    let gcEvents = 0;

    const startTime = Date.now();
    let requestCount = 0;

    // Monitor memory during continuous operation
    const memoryMonitor = setInterval(() => {
      const currentMemory = process.memoryUsage().heapUsed;
      if (currentMemory > peakMemory) {
        peakMemory = currentMemory;
      }
    }, 1000);

    // Force garbage collection monitoring if available
    if (global.gc) {
      const originalGC = global.gc;
      global.gc = () => {
        gcEvents++;
        return originalGC();
      };
    }

    try {
      // Continuous operation
      while (Date.now() - startTime < testDuration) {
        const testMessage = this.createTestMessage(agent.type as AgentType, requestCount);
        const testContext = this.createTestContext();
        
        await this.measureAgentResponse(agent, testMessage, testContext);
        requestCount++;
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } finally {
      clearInterval(memoryMonitor);
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;

    const recommendations = this.generateMemoryRecommendations(
      initialMemory,
      peakMemory,
      finalMemory,
      memoryGrowth,
      requestCount
    );

    console.log(`📈 Memory profile: ${(initialMemory / 1024 / 1024).toFixed(2)}MB → ${(finalMemory / 1024 / 1024).toFixed(2)}MB (${(memoryGrowth / 1024 / 1024).toFixed(2)}MB growth)`);

    return {
      initialMemory,
      peakMemory,
      finalMemory,
      memoryGrowth,
      gcEvents,
      recommendations,
    };
  }

  // ============================================================================
  // INITIALIZATION AND CONFIGURATION
  // ============================================================================

  private initializeBenchmarkSuites(): void {
    // Crisis Monitor benchmarks
    this.benchmarkSuites.set('crisis_monitor', [
      {
        name: 'Crisis Detection Performance',
        description: 'Test crisis detection speed and accuracy',
        tests: this.createCrisisDetectionTests(),
        requirements: [
          { metric: 'responseTime', operator: '<', threshold: 1000, unit: 'ms', description: 'Critical crisis detection must be <1s' },
          { metric: 'accuracy', operator: '>', threshold: 0.95, unit: 'ratio', description: 'Crisis detection sensitivity >95%' },
          { metric: 'falsePositiveRate', operator: '<', threshold: 0.05, unit: 'ratio', description: 'False positive rate <5%' },
        ],
      },
      {
        name: 'Cultural Crisis Adaptation',
        description: 'Test cultural sensitivity in crisis situations',
        tests: this.createCulturalCrisisTests(),
        requirements: [
          { metric: 'culturalRelevance', operator: '>', threshold: 0.8, unit: 'ratio', description: 'Cultural relevance >80%' },
          { metric: 'responseTime', operator: '<', threshold: 2000, unit: 'ms', description: 'Cultural adaptation <2s' },
        ],
      },
    ]);

    // Cultural Adapter benchmarks
    this.benchmarkSuites.set('cultural_adapter', [
      {
        name: 'Cultural Content Matching',
        description: 'Test cultural content relevance and appropriateness',
        tests: this.createCulturalContentTests(),
        requirements: [
          { metric: 'culturalRelevance', operator: '>', threshold: 0.8, unit: 'ratio', description: 'Cultural relevance >80%' },
          { metric: 'biasRisk', operator: '<', threshold: 0.3, unit: 'ratio', description: 'Bias risk <30%' },
          { metric: 'responseTime', operator: '<', threshold: 2000, unit: 'ms', description: 'Cultural adaptation <2s' },
        ],
      },
    ]);

    // Progress Tracker benchmarks
    this.benchmarkSuites.set('progress_tracker', [
      {
        name: 'Progress Measurement Accuracy',
        description: 'Test progress tracking precision and reliability',
        tests: this.createProgressTrackingTests(),
        requirements: [
          { metric: 'accuracy', operator: '>', threshold: 0.85, unit: 'ratio', description: 'Progress tracking accuracy >85%' },
          { metric: 'responseTime', operator: '<', threshold: 2000, unit: 'ms', description: 'Progress analysis <2s' },
        ],
      },
    ]);

    // Therapy Coordinator benchmarks
    this.benchmarkSuites.set('therapy_coordinator', [
      {
        name: 'Agent Coordination Performance',
        description: 'Test multi-agent coordination efficiency',
        tests: this.createCoordinationTests(),
        requirements: [
          { metric: 'responseTime', operator: '<', threshold: 3000, unit: 'ms', description: 'Agent coordination <3s' },
          { metric: 'consistency', operator: '>', threshold: 0.9, unit: 'ratio', description: 'Coordination consistency >90%' },
        ],
      },
    ]);

    // Intake Agent benchmarks
    this.benchmarkSuites.set('intake', [
      {
        name: 'Assessment Comprehensiveness',
        description: 'Test intake assessment quality and cultural sensitivity',
        tests: this.createIntakeAssessmentTests(),
        requirements: [
          { metric: 'completeness', operator: '>', threshold: 0.9, unit: 'ratio', description: 'Assessment completeness >90%' },
          { metric: 'culturalSensitivity', operator: '>', threshold: 0.85, unit: 'ratio', description: 'Cultural sensitivity >85%' },
        ],
      },
    ]);
  }

  // ============================================================================
  // BENCHMARK TEST CREATION
  // ============================================================================

  private createCrisisDetectionTests(): BenchmarkTest[] {
    return [
      {
        name: 'Critical Crisis Speed Test',
        description: 'Test detection speed for critical crisis situations',
        testType: 'latency',
        priority: 'critical',
        execute: async (agent: BaseAgent) => {
          const criticalMessage = this.createTestMessage('crisis_monitor', 0, 'I am going to kill myself tonight with pills');
          const context = this.createTestContext();
          return await this.measureAgentResponse(agent, criticalMessage, context);
        },
      },
      {
        name: 'Crisis Accuracy Test',
        description: 'Test accuracy of crisis vs non-crisis detection',
        testType: 'accuracy',
        priority: 'critical',
        execute: async (agent: BaseAgent) => {
          const testCases = [
            { text: 'I want to kill myself', shouldDetectCrisis: true },
            { text: 'I had a bad day at work', shouldDetectCrisis: false },
            { text: 'I am planning my suicide', shouldDetectCrisis: true },
            { text: 'I feel stressed about exams', shouldDetectCrisis: false },
          ];

          let correct = 0;
          const startTime = performance.now();

          for (const testCase of testCases) {
            const message = this.createTestMessage('crisis_monitor', 0, testCase.text);
            const context = this.createTestContext();
            const response = await agent.processMessage(message, context);
            
            const detected = response.escalationNeeded || response.metadata?.criticalCrisisDetected;
            if ((detected && testCase.shouldDetectCrisis) || (!detected && !testCase.shouldDetectCrisis)) {
              correct++;
            }
          }

          const endTime = performance.now();
          const accuracy = correct / testCases.length;

          return {
            agentType: agent.type as AgentType,
            testName: 'Crisis Accuracy Test',
            startTime: startTime,
            endTime: endTime,
            duration: endTime - startTime,
            success: accuracy > 0.8,
            responseTime: endTime - startTime,
            memoryUsage: process.memoryUsage().heapUsed,
            confidence: 0.9,
            accuracy,
          };
        },
      },
    ];
  }

  private createCulturalCrisisTests(): BenchmarkTest[] {
    return [
      {
        name: 'Cultural Crisis Adaptation',
        description: 'Test cultural adaptation in crisis scenarios',
        testType: 'cultural_competency',
        priority: 'high',
        execute: async (agent: BaseAgent) => {
          const culturalMessage = this.createTestMessage(
            'crisis_monitor',
            0,
            'I want to die but cannot shame my family'
          );
          const culturalContext = this.createTestContext({
            culturalProfile: {
              primaryCulture: 'Asian',
              culturalValues: { mentalHealthStigma: 9 },
            },
          });

          return await this.measureAgentResponse(agent, culturalMessage, culturalContext);
        },
      },
    ];
  }

  private createCulturalContentTests(): BenchmarkTest[] {
    return [
      {
        name: 'Cultural Content Relevance',
        description: 'Test cultural content matching accuracy',
        testType: 'cultural_competency',
        priority: 'high',
        execute: async (agent: BaseAgent) => {
          const message = this.createTestMessage(
            'cultural_adapter',
            0,
            'I need help balancing individual goals with family expectations'
          );
          const context = this.createTestContext({
            culturalProfile: {
              primaryCulture: 'Latino',
              culturalValues: { collectivism: 8 },
            },
          });

          return await this.measureAgentResponse(agent, message, context);
        },
      },
    ];
  }

  private createProgressTrackingTests(): BenchmarkTest[] {
    return [
      {
        name: 'Progress Measurement Precision',
        description: 'Test accuracy of progress measurements',
        testType: 'accuracy',
        priority: 'high',
        execute: async (agent: BaseAgent) => {
          const message = this.createTestMessage(
            'progress_tracker',
            0,
            'I have been practicing mindfulness daily and feel less anxious'
          );
          const context = this.createTestContext({
            sessionHistory: ['Previous session 1', 'Previous session 2'],
          });

          return await this.measureAgentResponse(agent, message, context);
        },
      },
    ];
  }

  private createCoordinationTests(): BenchmarkTest[] {
    return [
      {
        name: 'Multi-Agent Coordination Speed',
        description: 'Test coordination efficiency with multiple agents',
        testType: 'latency',
        priority: 'high',
        execute: async (agent: BaseAgent) => {
          const message = this.createTestMessage(
            'therapy_coordinator',
            0,
            'I need help with anxiety and cultural identity issues'
          );
          const context = this.createTestContext();

          return await this.measureAgentResponse(agent, message, context);
        },
      },
    ];
  }

  private createIntakeAssessmentTests(): BenchmarkTest[] {
    return [
      {
        name: 'Assessment Comprehensiveness',
        description: 'Test completeness of intake assessment',
        testType: 'accuracy',
        priority: 'medium',
        execute: async (agent: BaseAgent) => {
          const message = this.createTestMessage(
            'intake',
            0,
            'I am a second-generation immigrant dealing with anxiety and family pressure'
          );
          const context = this.createTestContext();

          return await this.measureAgentResponse(agent, message, context);
        },
      },
    ];
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async executeSingleTest(
    testName: string,
    agent: BaseAgent,
    iteration: number
  ): Promise<PerformanceBenchmark> {
    const message = this.createTestMessage(agent.type as AgentType, iteration);
    const context = this.createTestContext();
    
    return await this.measureAgentResponse(agent, message, context);
  }

  private async measureAgentResponse(
    agent: BaseAgent,
    message: AgentMessage,
    context: AgentContext
  ): Promise<PerformanceBenchmark> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const response = await agent.processMessage(message, context);
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;

      return {
        agentType: agent.type as AgentType,
        testName: 'Agent Response Test',
        startTime,
        endTime,
        duration: endTime - startTime,
        success: true,
        responseTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        confidence: response.confidence,
        culturalRelevance: response.culturalRelevance,
      };

    } catch (error) {
      const endTime = performance.now();

      return {
        agentType: agent.type as AgentType,
        testName: 'Agent Response Test',
        startTime,
        endTime,
        duration: endTime - startTime,
        success: false,
        responseTime: endTime - startTime,
        memoryUsage: 0,
        confidence: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private createTestMessage(agentType: AgentType, iteration: number, customContent?: string): AgentMessage {
    const testContent = customContent || this.getTestContent(agentType, iteration);

    return {
      id: nanoid(),
      type: 'user_input',
      content: testContent,
      metadata: { testIteration: iteration },
      priority: 'medium',
      source: 'benchmark',
      timestamp: Date.now(),
      encrypted: false,
    };
  }

  private createTestContext(overrides: Partial<AgentContext> = {}): AgentContext {
    return {
      sessionId: `benchmark-session-${nanoid()}`,
      userId: `benchmark-user-${nanoid()}`,
      culturalProfile: {
        primaryCulture: 'General',
        familyDynamics: { involvement: 'medium' },
      },
      confidentialityLevel: 'standard',
      timestamp: Date.now(),
      correlationId: nanoid(),
      ...overrides,
    };
  }

  private getTestContent(agentType: AgentType, iteration: number): string {
    const testMessages = {
      crisis_monitor: [
        'I have been feeling very depressed lately',
        'Sometimes I think life is not worth living',
        'I am struggling with thoughts of self-harm',
        'I feel overwhelmed and don\'t know what to do',
      ],
      cultural_adapter: [
        'I feel caught between two cultures',
        'My family doesn\'t understand my mental health struggles',
        'I want to honor my culture while getting help',
        'Traditional healing methods are important to me',
      ],
      progress_tracker: [
        'I have been practicing the coping skills we discussed',
        'I notice some improvement in my mood',
        'The anxiety exercises are helping',
        'I want to track my progress better',
      ],
      therapy_coordinator: [
        'I need help coordinating my treatment',
        'I want to make sure all aspects of my care are aligned',
        'How can I integrate different therapeutic approaches',
        'I need comprehensive support for my mental health',
      ],
      intake: [
        'I am seeking therapy for the first time',
        'I need help with anxiety and depression',
        'My cultural background is important to my healing',
        'I want to understand what therapy options are available',
      ],
    };

    const messages = testMessages[agentType] || ['Test message for benchmarking'];
    return messages[iteration % messages.length];
  }

  private generateBenchmarkReport(
    agentType: AgentType,
    benchmarks: PerformanceBenchmark[]
  ): BenchmarkReport {
    const successful = benchmarks.filter(b => b.success);
    const responseTimes = successful.map(b => b.responseTime);
    
    responseTimes.sort((a, b) => a - b);
    
    const passedTests = successful.length;
    const failedTests = benchmarks.length - passedTests;
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length || 0;
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;
    
    const accuracyBenchmarks = benchmarks.filter(b => b.accuracy !== undefined);
    const accuracyScore = accuracyBenchmarks.length > 0
      ? accuracyBenchmarks.reduce((sum, b) => sum + (b.accuracy || 0), 0) / accuracyBenchmarks.length
      : 0;
    
    const culturalBenchmarks = benchmarks.filter(b => b.culturalRelevance !== undefined);
    const culturalCompetencyScore = culturalBenchmarks.length > 0
      ? culturalBenchmarks.reduce((sum, b) => sum + (b.culturalRelevance || 0), 0) / culturalBenchmarks.length
      : 0;
    
    const memoryEfficiency = this.calculateMemoryEfficiency(benchmarks);
    
    const recommendations = this.generateRecommendations(agentType, benchmarks);
    const criticalIssues = this.identifyCriticalIssues(agentType, benchmarks);

    return {
      timestamp: Date.now(),
      agentType,
      totalTests: benchmarks.length,
      passedTests,
      failedTests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      accuracyScore,
      culturalCompetencyScore,
      memoryEfficiency,
      recommendations,
      criticalIssues,
      benchmarks,
    };
  }

  private calculateMemoryEfficiency(benchmarks: PerformanceBenchmark[]): number {
    const memoryUsages = benchmarks
      .filter(b => b.success && b.memoryUsage > 0)
      .map(b => b.memoryUsage);
    
    if (memoryUsages.length === 0) return 1;
    
    const averageMemory = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;
    const maxAcceptableMemory = 50 * 1024 * 1024; // 50MB per request
    
    return Math.max(0, 1 - (averageMemory / maxAcceptableMemory));
  }

  private generateRecommendations(agentType: AgentType, benchmarks: PerformanceBenchmark[]): string[] {
    const recommendations: string[] = [];
    const averageResponseTime = benchmarks
      .filter(b => b.success)
      .reduce((sum, b) => sum + b.responseTime, 0) / benchmarks.filter(b => b.success).length;

    // Performance recommendations
    if (averageResponseTime > 2000) {
      recommendations.push('Consider response time optimization - current average exceeds 2 seconds');
    }
    if (averageResponseTime > 5000) {
      recommendations.push('CRITICAL: Response time optimization required - exceeds 5 seconds');
    }

    // Agent-specific recommendations
    if (agentType === 'crisis_monitor' && averageResponseTime > 1000) {
      recommendations.push('CRITICAL: Crisis monitor must respond in <1 second for safety');
    }

    // Memory recommendations
    const averageMemory = benchmarks
      .filter(b => b.success)
      .reduce((sum, b) => sum + b.memoryUsage, 0) / benchmarks.filter(b => b.success).length;
    
    if (averageMemory > 25 * 1024 * 1024) {
      recommendations.push('Consider memory optimization - high memory usage detected');
    }

    // Accuracy recommendations
    const accuracyBenchmarks = benchmarks.filter(b => b.accuracy !== undefined);
    if (accuracyBenchmarks.length > 0) {
      const avgAccuracy = accuracyBenchmarks.reduce((sum, b) => sum + (b.accuracy || 0), 0) / accuracyBenchmarks.length;
      if (avgAccuracy < 0.8) {
        recommendations.push('Improve accuracy - current performance below 80%');
      }
    }

    return recommendations;
  }

  private identifyCriticalIssues(agentType: AgentType, benchmarks: PerformanceBenchmark[]): string[] {
    const issues: string[] = [];
    const failureRate = benchmarks.filter(b => !b.success).length / benchmarks.length;

    if (failureRate > 0.1) {
      issues.push(`High failure rate: ${(failureRate * 100).toFixed(1)}% of tests failed`);
    }

    if (agentType === 'crisis_monitor') {
      const crisisTests = benchmarks.filter(b => b.testName.includes('Crisis'));
      const criticalFailures = crisisTests.filter(b => !b.success);
      if (criticalFailures.length > 0) {
        issues.push('CRITICAL: Crisis detection failures detected - immediate attention required');
      }
    }

    return issues;
  }

  private generateMemoryRecommendations(
    initial: number,
    peak: number,
    final: number,
    growth: number,
    requests: number
  ): string[] {
    const recommendations: string[] = [];
    const growthPerRequest = growth / requests;

    if (growth > 100 * 1024 * 1024) { // 100MB growth
      recommendations.push('Significant memory growth detected - check for memory leaks');
    }

    if (growthPerRequest > 1 * 1024 * 1024) { // 1MB per request
      recommendations.push('High memory usage per request - optimize data structures');
    }

    if (peak > 500 * 1024 * 1024) { // 500MB peak
      recommendations.push('High peak memory usage - consider streaming or chunking');
    }

    return recommendations;
  }

  private analyzePerformanceResults(testName: string, benchmarks: PerformanceBenchmark[]): void {
    const successful = benchmarks.filter(b => b.success);
    const responseTimes = successful.map(b => b.responseTime);
    
    if (responseTimes.length === 0) {
      console.log(`❌ ${testName}: All tests failed`);
      return;
    }

    responseTimes.sort((a, b) => a - b);
    
    const min = responseTimes[0];
    const max = responseTimes[responseTimes.length - 1];
    const avg = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];

    console.log(`📊 ${testName} Results:`);
    console.log(`  Success Rate: ${(successful.length / benchmarks.length * 100).toFixed(1)}%`);
    console.log(`  Response Times: min=${min.toFixed(2)}ms, avg=${avg.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
    console.log(`  Percentiles: P95=${p95.toFixed(2)}ms, P99=${p99.toFixed(2)}ms`);
  }

  private logBenchmarkSummary(agentType: AgentType, report: BenchmarkReport): void {
    const passRate = (report.passedTests / report.totalTests * 100).toFixed(1);
    const status = report.criticalIssues.length > 0 ? '❌' : 
                   report.failedTests > 0 ? '⚠️' : '✅';

    console.log(`${status} ${agentType} Summary:`);
    console.log(`  Tests: ${report.passedTests}/${report.totalTests} passed (${passRate}%)`);
    console.log(`  Response Time: avg=${report.averageResponseTime.toFixed(2)}ms, P95=${report.p95ResponseTime.toFixed(2)}ms`);
    console.log(`  Accuracy: ${(report.accuracyScore * 100).toFixed(1)}%`);
    console.log(`  Cultural Competency: ${(report.culturalCompetencyScore * 100).toFixed(1)}%`);
    
    if (report.criticalIssues.length > 0) {
      console.log(`  🚨 Critical Issues: ${report.criticalIssues.length}`);
      report.criticalIssues.forEach(issue => console.log(`    - ${issue}`));
    }
    
    if (report.recommendations.length > 0) {
      console.log(`  💡 Recommendations: ${report.recommendations.length}`);
      report.recommendations.slice(0, 3).forEach(rec => console.log(`    - ${rec}`));
    }
  }
}

// Export singleton instance
export const agentBenchmarker = new AgentBenchmarker();