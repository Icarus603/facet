/**
 * FACET Agent Orchestrator Usage Examples
 * Comprehensive examples of how to use the agent orchestration framework
 */

import { PrismaClient } from '@prisma/client';
import { AgentOrchestrator } from '../orchestrator';
import { BaseAgent } from '../base-agent';
import {
  AgentType,
  UserMessage,
  AgentContext,
  AgentMessage,
  AgentResponse,
  TherapyTask,
} from '../agent-types';
import {
  getOrchestratorConfig,
  getAgentConfig,
  getAzureOpenAIConfig,
  AGENT_TYPES,
} from '../../config/orchestrator-config';
import { AzureOpenAIClient } from '../../llm/azure-openai';
import { RedisCoordinator } from '../coordination/redis-coordinator';
import { PromptGenerator } from '../../llm/prompt-templates';

// ============================================================================
// EXAMPLE AGENT IMPLEMENTATIONS
// ============================================================================

/**
 * Example Intake Agent Implementation
 */
class IntakeAgent extends BaseAgent {
  protected async executeAgentLogic(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse> {
    // Generate culturally-aware intake prompt
    const { systemPrompt, userPrompt } = PromptGenerator.generatePrompt(
      'intake',
      {
        userInput: message.content,
        culturalProfile: context.culturalProfile,
        sessionHistory: context.sessionHistory,
      },
      context
    );

    // Get LLM response
    const llmResponse = await this.generateLLMResponse(
      userPrompt,
      context,
      systemPrompt
    );

    // Detect crisis indicators
    const crisisKeywords = ['suicide', 'kill myself', 'end my life', 'hurt myself'];
    const hasCrisisIndicators = crisisKeywords.some(keyword =>
      message.content.toLowerCase().includes(keyword)
    );

    return this.createResponse(
      llmResponse,
      0.85,
      context,
      {
        actionItems: [
          'Complete comprehensive assessment',
          'Establish therapeutic goals',
          'Schedule follow-up session',
        ],
        followUpRequired: true,
        escalationNeeded: hasCrisisIndicators,
        metadata: {
          assessmentType: 'initial_intake',
          crisisDetected: hasCrisisIndicators,
          culturalFactors: Object.keys(context.culturalProfile || {}),
        },
      }
    );
  }

  getCapabilities(): string[] {
    return [
      'initial_assessment',
      'crisis_detection',
      'cultural_assessment',
      'rapport_building',
    ];
  }

  protected async performAgentSpecificHealthCheck(): Promise<boolean> {
    // Verify ability to generate assessment responses
    try {
      const testResponse = await this.generateLLMResponse(
        'Please confirm you can provide therapy intake assessments.',
        {
          sessionId: 'health-check',
          userId: 'health-check',
          correlationId: 'health-check',
          confidentialityLevel: 'standard',
          timestamp: Date.now(),
        }
      );
      return testResponse.length > 0;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Example Therapy Coordinator Agent Implementation
 */
class TherapyCoordinatorAgent extends BaseAgent {
  protected async executeAgentLogic(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse> {
    // Check for coordination metadata
    const coordinationData = message.metadata?.previousResponses || [];

    const { systemPrompt, userPrompt } = PromptGenerator.generatePrompt(
      'therapy_coordinator',
      {
        userInput: message.content,
        culturalProfile: context.culturalProfile,
        sessionHistory: context.sessionHistory,
        previousResponses: coordinationData,
      },
      context
    );

    const llmResponse = await this.generateLLMResponse(
      userPrompt,
      context,
      systemPrompt
    );

    return this.createResponse(
      llmResponse,
      0.90,
      context,
      {
        actionItems: [
          'Integrate multi-agent insights',
          'Provide therapeutic guidance',
          'Monitor session progress',
        ],
        followUpRequired: true,
        coordinationEvents: [
          {
            type: 'coordination_synthesis',
            agentInputs: coordinationData.length,
            timestamp: Date.now(),
          },
        ],
        metadata: {
          coordinationRole: 'primary_coordinator',
          agentInputsProcessed: coordinationData.length,
        },
      }
    );
  }

  getCapabilities(): string[] {
    return [
      'session_orchestration',
      'treatment_planning',
      'agent_coordination',
      'therapeutic_intervention',
    ];
  }

  protected async performAgentSpecificHealthCheck(): Promise<boolean> {
    try {
      const testResponse = await this.generateLLMResponse(
        'Please confirm your ability to coordinate therapy sessions.',
        {
          sessionId: 'health-check',
          userId: 'health-check',
          correlationId: 'health-check',
          confidentialityLevel: 'standard',
          timestamp: Date.now(),
        }
      );
      return testResponse.includes('coordinate') || testResponse.includes('therapy');
    } catch (error) {
      return false;
    }
  }
}

/**
 * Example Crisis Monitor Agent Implementation
 */
class CrisisMonitorAgent extends BaseAgent {
  protected async executeAgentLogic(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse> {
    // Perform crisis risk assessment
    const riskFactors = this.assessRiskFactors(message.content);
    const riskLevel = this.calculateRiskLevel(riskFactors);

    const { systemPrompt, userPrompt } = PromptGenerator.generatePrompt(
      'crisis_monitor',
      {
        userInput: message.content,
        culturalProfile: context.culturalProfile,
        emergencyIndicators: riskFactors,
      },
      context
    );

    const llmResponse = await this.generateLLMResponse(
      userPrompt,
      context,
      systemPrompt
    );

    return this.createResponse(
      llmResponse,
      0.95,
      context,
      {
        actionItems: riskLevel === 'high' ? [
          'Immediate safety assessment',
          'Crisis intervention protocol',
          'Emergency contact activation',
        ] : [
          'Continue monitoring',
          'Safety planning',
          'Follow-up assessment',
        ],
        followUpRequired: true,
        escalationNeeded: riskLevel === 'high',
        metadata: {
          riskLevel,
          riskFactors,
          crisisAssessment: {
            suicidalIdeation: riskFactors.includes('suicide'),
            immediateRisk: riskLevel === 'high',
            safetyPlanNeeded: true,
          },
        },
      }
    );
  }

  private assessRiskFactors(content: string): string[] {
    const riskIndicators = [
      { keywords: ['suicide', 'kill myself', 'end my life'], factor: 'suicide' },
      { keywords: ['hurt myself', 'self-harm', 'cut myself'], factor: 'self_harm' },
      { keywords: ['hopeless', 'no point', 'give up'], factor: 'hopelessness' },
      { keywords: ['alone', 'isolated', 'no one cares'], factor: 'isolation' },
      { keywords: ['plan', 'method', 'how to'], factor: 'planning' },
    ];

    const detectedFactors: string[] = [];
    const lowerContent = content.toLowerCase();

    for (const indicator of riskIndicators) {
      if (indicator.keywords.some(keyword => lowerContent.includes(keyword))) {
        detectedFactors.push(indicator.factor);
      }
    }

    return detectedFactors;
  }

  private calculateRiskLevel(riskFactors: string[]): 'low' | 'medium' | 'high' {
    if (riskFactors.includes('suicide') && riskFactors.includes('planning')) {
      return 'high';
    } else if (riskFactors.includes('suicide') || riskFactors.length >= 3) {
      return 'medium';
    } else if (riskFactors.length > 0) {
      return 'medium';
    }
    return 'low';
  }

  getCapabilities(): string[] {
    return [
      'suicide_risk_assessment',
      'crisis_intervention',
      'safety_planning',
      'emergency_coordination',
    ];
  }

  protected async performAgentSpecificHealthCheck(): Promise<boolean> {
    // Test crisis detection capabilities
    const testContent = 'I am feeling very sad and hopeless';
    const riskFactors = this.assessRiskFactors(testContent);
    return riskFactors.includes('hopelessness');
  }
}

// ============================================================================
// ORCHESTRATOR INITIALIZATION AND USAGE
// ============================================================================

/**
 * Initialize and configure the orchestrator with all agents
 */
export async function initializeOrchestrator(): Promise<AgentOrchestrator> {
  // Initialize dependencies
  const prisma = new PrismaClient();
  const orchestratorConfig = getOrchestratorConfig();
  const azureConfig = getAzureOpenAIConfig();

  // Create orchestrator
  const orchestrator = new AgentOrchestrator(orchestratorConfig, prisma);

  // Initialize orchestrator infrastructure
  await orchestrator.initialize();

  // Create and register agents
  const agents = await createAndRegisterAgents(orchestrator);

  console.log(`Orchestrator initialized with ${agents.length} agents`);
  
  return orchestrator;
}

/**
 * Create and register all therapy agents
 */
async function createAndRegisterAgents(orchestrator: AgentOrchestrator): Promise<BaseAgent[]> {
  const azureConfig = getAzureOpenAIConfig();
  const azureClient = new AzureOpenAIClient(azureConfig);
  
  // We'll create a mock RedisCoordinator for this example
  const redisCoordinator = {} as RedisCoordinator;

  const agents: BaseAgent[] = [];

  // Create intake agents (2 instances for load balancing)
  for (let i = 1; i <= 2; i++) {
    const config = getAgentConfig('intake', `intake_agent_${i}`);
    const agent = new IntakeAgent('intake', config, azureClient, redisCoordinator);
    await orchestrator.registerAgent(agent, config);
    agents.push(agent);
  }

  // Create therapy coordinator agents (2 instances)
  for (let i = 1; i <= 2; i++) {
    const config = getAgentConfig('therapy_coordinator', `therapy_coordinator_${i}`);
    const agent = new TherapyCoordinatorAgent('therapy_coordinator', config, azureClient, redisCoordinator);
    await orchestrator.registerAgent(agent, config);
    agents.push(agent);
  }

  // Create crisis monitor agents (3 instances for high availability)
  for (let i = 1; i <= 3; i++) {
    const config = getAgentConfig('crisis_monitor', `crisis_monitor_${i}`);
    const agent = new CrisisMonitorAgent('crisis_monitor', config, azureClient, redisCoordinator);
    await orchestrator.registerAgent(agent, config);
    agents.push(agent);
  }

  // Cultural adapter and progress tracker agents would be created similarly
  // ... (omitted for brevity)

  return agents;
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Process a regular therapy message
 */
export async function processRegularTherapyMessage() {
  const orchestrator = await initializeOrchestrator();

  const userMessage: UserMessage = {
    sessionId: 'session_12345',
    userId: 'user_67890',
    content: 'I\'ve been feeling really anxious about my job lately. The stress is affecting my sleep and I don\'t know how to cope.',
    messageType: 'text',
    culturalContext: {
      primaryCulture: 'Mexican',
      languagePreferences: ['Spanish', 'English'],
      religiousBackground: 'Catholic',
    },
    timestamp: Date.now(),
    correlationId: 'regular_therapy_001',
  };

  try {
    const response = await orchestrator.processUserMessage(userMessage);
    
    console.log('Therapy Response:', {
      primaryResponse: response.primaryResponse.content,
      coordinationStrategy: response.coordinationSummary.coordinationStrategy,
      agentsInvolved: response.coordinationSummary.agentsInvolved,
      culturalAdaptations: response.culturalAdaptations,
      recommendations: response.recommendations,
    });

    return response;
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}

/**
 * Example 2: Handle a crisis situation
 */
export async function processCrisisMessage() {
  const orchestrator = await initializeOrchestrator();

  const crisisMessage: UserMessage = {
    sessionId: 'crisis_session_001',
    userId: 'user_crisis_001',
    content: 'I can\'t take this anymore. I\'ve been thinking about ending my life. I have a plan and I don\'t see any other way out.',
    messageType: 'text',
    emergencyIndicators: ['suicide', 'planning', 'hopelessness'],
    culturalContext: {
      primaryCulture: 'Korean',
      familyInvolvement: 'high',
      stigmaFactors: ['mental_health', 'family_shame'],
    },
    timestamp: Date.now(),
    correlationId: 'crisis_001',
  };

  try {
    const response = await orchestrator.processUserMessage(crisisMessage);
    
    console.log('Crisis Response:', {
      primaryResponse: response.primaryResponse.content,
      escalationNeeded: response.primaryResponse.escalationNeeded,
      coordinationStrategy: response.coordinationSummary.coordinationStrategy,
      culturalConsiderations: response.culturalAdaptations,
      emergencyActions: response.recommendations,
    });

    return response;
  } catch (error) {
    console.error('Error processing crisis message:', error);
    throw error;
  }
}

/**
 * Example 3: Route to specific agent
 */
export async function routeToSpecificAgent() {
  const orchestrator = await initializeOrchestrator();

  const context: AgentContext = {
    sessionId: 'direct_route_001',
    userId: 'user_direct_001',
    culturalProfile: {
      primaryCulture: 'Chinese',
      generationalStatus: 'First generation immigrant',
      languagePreferences: ['Mandarin', 'English'],
    },
    confidentialityLevel: 'standard',
    timestamp: Date.now(),
    correlationId: 'direct_route_001',
  };

  try {
    // Route directly to cultural adapter
    const response = await orchestrator.routeToAgent('cultural_adapter', context);
    
    console.log('Cultural Adapter Response:', {
      agentType: response.agentType,
      content: response.content,
      culturalRelevance: response.culturalRelevance,
      actionItems: response.actionItems,
    });

    return response;
  } catch (error) {
    console.error('Error routing to agent:', error);
    throw error;
  }
}

/**
 * Example 4: Multi-agent coordination
 */
export async function coordinateMultipleAgents() {
  const orchestrator = await initializeOrchestrator();

  const task: TherapyTask = {
    id: 'complex_case_001',
    type: 'assessment',
    description: 'Comprehensive assessment for client with cultural considerations and mild crisis indicators',
    requiredAgents: ['intake', 'cultural_adapter', 'crisis_monitor', 'therapy_coordinator'],
    priority: 'high',
    coordinationStrategy: 'hierarchical',
    culturalConsiderations: ['Bicultural identity', 'Language barriers', 'Family dynamics'],
    confidentialityLevel: 'elevated',
    timeoutMs: 45000,
    metadata: {
      caseComplexity: 'high',
      culturalFactors: ['Indigenous heritage', 'Urban environment'],
    },
  };

  const context: AgentContext = {
    sessionId: 'complex_case_session',
    userId: 'user_complex_001',
    culturalProfile: {
      primaryCulture: 'Navajo',
      secondaryCulture: 'American',
      traditionalPractices: ['Ceremonial healing', 'Elder consultation'],
      urbanization: 'Recently relocated to city',
    },
    confidentialityLevel: 'elevated',
    timestamp: Date.now(),
    correlationId: 'complex_case_001',
  };

  try {
    const response = await orchestrator.coordinateMultiAgent(
      task.requiredAgents.map(type => `${type}_agent_1`),
      task,
      context
    );

    console.log('Multi-Agent Coordination Response:', {
      coordinationId: response.coordinationId,
      strategy: response.strategy,
      agentCount: response.agentResponses.length,
      synthesizedResponse: response.synthesizedResponse,
      coordinationMetrics: response.coordinationMetrics,
      culturalIntegration: response.culturalIntegration,
    });

    return response;
  } catch (error) {
    console.error('Error in multi-agent coordination:', error);
    throw error;
  }
}

/**
 * Example 5: Monitor orchestrator performance
 */
export async function monitorOrchestratorPerformance() {
  const orchestrator = await initializeOrchestrator();

  // Process several messages to generate metrics
  const testMessages = [
    'I feel sad today',
    'My anxiety is getting worse',
    'I need help with my relationship',
  ];

  for (const content of testMessages) {
    const message: UserMessage = {
      sessionId: `perf_test_${Date.now()}`,
      userId: 'perf_test_user',
      content,
      messageType: 'text',
      timestamp: Date.now(),
      correlationId: `perf_test_${Date.now()}`,
    };

    try {
      await orchestrator.processUserMessage(message);
    } catch (error) {
      console.error('Performance test message failed:', error);
    }
  }

  // Get and display metrics
  const metrics = orchestrator.getMetrics();
  
  console.log('Orchestrator Performance Metrics:', {
    totalMessages: metrics.totalMessages,
    successfulCoordinations: metrics.successfulCoordinations,
    failedCoordinations: metrics.failedCoordinations,
    averageResponseTime: `${metrics.averageResponseTime}ms`,
    averageCoordinationTime: `${metrics.averageCoordinationTime}ms`,
    agentHealthScore: `${(metrics.agentHealthScore * 100).toFixed(1)}%`,
    registeredAgents: metrics.registeredAgents,
    healthyAgents: metrics.healthyAgents,
  });

  // Display individual agent metrics
  console.log('\nIndividual Agent Metrics:');
  for (const [agentId, agentMetrics] of metrics.agentMetrics) {
    console.log(`${agentId}:`, {
      type: agentMetrics.type,
      isHealthy: agentMetrics.isHealthy,
      activeCoordinations: agentMetrics.activeCoordinations,
      responseTime: `${agentMetrics.performance.responseTime}ms`,
      successRate: `${(agentMetrics.performance.successRate * 100).toFixed(1)}%`,
    });
  }

  return metrics;
}

/**
 * Example 6: Graceful shutdown
 */
export async function gracefulShutdown(orchestrator: AgentOrchestrator) {
  console.log('Starting graceful shutdown...');
  
  try {
    await orchestrator.shutdown();
    console.log('Orchestrator shutdown completed successfully');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
}

// ============================================================================
// MAIN EXECUTION EXAMPLE
// ============================================================================

/**
 * Main function demonstrating full orchestrator usage
 */
export async function main() {
  try {
    console.log('🚀 Initializing FACET Agent Orchestrator...\n');

    // Initialize orchestrator
    const orchestrator = await initializeOrchestrator();

    // Run examples
    console.log('📝 Processing regular therapy message...');
    await processRegularTherapyMessage();
    console.log('✅ Regular therapy message processed\n');

    console.log('🚨 Processing crisis message...');
    await processCrisisMessage();
    console.log('✅ Crisis message processed\n');

    console.log('🎯 Testing direct agent routing...');
    await routeToSpecificAgent();
    console.log('✅ Direct routing completed\n');

    console.log('🤝 Testing multi-agent coordination...');
    await coordinateMultipleAgents();
    console.log('✅ Multi-agent coordination completed\n');

    console.log('📊 Monitoring performance...');
    await monitorOrchestratorPerformance();
    console.log('✅ Performance monitoring completed\n');

    // Graceful shutdown
    console.log('🔄 Shutting down orchestrator...');
    await gracefulShutdown(orchestrator);
    console.log('✅ Shutdown completed\n');

    console.log('🎉 All examples completed successfully!');

  } catch (error) {
    console.error('❌ Error in main execution:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}