/**
 * FACET LangGraph Coordination Engine
 * Advanced workflow orchestration for therapy agent coordination
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { nanoid } from 'nanoid';
import {
  AgentType,
  AgentResponse,
  CoordinatedResponse,
  CoordinationStrategy,
  TherapyTask,
  AgentContext,
  CoordinationEvent,
} from '../agent-types';
import { RedisCoordinator } from './redis-coordinator';

// ============================================================================
// LANGRAPH STATE DEFINITIONS
// ============================================================================

const AgentWorkflowState = Annotation.Root({
  sessionId: Annotation<string>,
  coordinationId: Annotation<string>,
  task: Annotation<TherapyTask>,
  context: Annotation<AgentContext>,
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  agentResponses: Annotation<AgentResponse[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  activeAgents: Annotation<string[]>({
    default: () => [],
  }),
  completedAgents: Annotation<string[]>({
    reducer: (x, y) => Array.from(new Set([...x, ...y])),
    default: () => [],
  }),
  errors: Annotation<Array<{ agentId: string; error: string }>>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  coordinationStrategy: Annotation<CoordinationStrategy>,
  currentPhase: Annotation<string>,
  consensusScore: Annotation<number>({
    default: () => 0,
  }),
  culturalContext: Annotation<Record<string, any>>({
    default: () => ({}),
  }),
  emergencyDetected: Annotation<boolean>({
    default: () => false,
  }),
  finalResponse: Annotation<CoordinatedResponse | null>({
    default: () => null,
  }),
});

type WorkflowState = typeof AgentWorkflowState.State;

// ============================================================================
// LANGRAPH COORDINATION ENGINE
// ============================================================================

export class LangGraphCoordinationEngine {
  private readonly redisCoordinator: RedisCoordinator;
  private readonly workflows = new Map<string, StateGraph<WorkflowState>>();
  private readonly activeWorkflows = new Map<string, any>();

  constructor(redisCoordinator: RedisCoordinator) {
    this.redisCoordinator = redisCoordinator;
    this.initializeWorkflows();
  }

  // ============================================================================
  // PUBLIC INTERFACE
  // ============================================================================

  /**
   * Execute coordination workflow for therapy task
   */
  async executeCoordination(
    sessionId: string,
    task: TherapyTask,
    context: AgentContext,
    strategy: CoordinationStrategy = 'parallel'
  ): Promise<CoordinatedResponse> {
    const coordinationId = nanoid();
    
    try {
      // Select appropriate workflow based on strategy
      const workflow = this.getWorkflowForStrategy(strategy);
      
      // Initialize workflow state
      const initialState: WorkflowState = {
        sessionId,
        coordinationId,
        task,
        context,
        messages: [new HumanMessage({ content: task.description })],
        agentResponses: [],
        activeAgents: task.requiredAgents,
        completedAgents: [],
        errors: [],
        coordinationStrategy: strategy,
        currentPhase: 'initialization',
        consensusScore: 0,
        culturalContext: context.culturalProfile || {},
        emergencyDetected: false,
        finalResponse: null,
      };

      // Execute workflow
      const result = await workflow.invoke(initialState);
      
      if (!result.finalResponse) {
        throw new Error('Workflow execution failed to produce final response');
      }

      return result.finalResponse;

    } catch (error) {
      console.error(`Workflow execution failed for coordination ${coordinationId}:`, error);
      throw error;
    } finally {
      this.activeWorkflows.delete(coordinationId);
    }
  }

  /**
   * Get workflow execution status
   */
  getWorkflowStatus(coordinationId: string): {
    active: boolean;
    currentPhase?: string;
    completedAgents?: string[];
    errors?: Array<{ agentId: string; error: string }>;
  } {
    const workflow = this.activeWorkflows.get(coordinationId);
    
    if (!workflow) {
      return { active: false };
    }

    return {
      active: true,
      currentPhase: workflow.currentPhase,
      completedAgents: workflow.completedAgents,
      errors: workflow.errors,
    };
  }

  /**
   * Cancel active workflow
   */
  async cancelWorkflow(coordinationId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(coordinationId);
    
    if (workflow && workflow.cancel) {
      await workflow.cancel();
    }
    
    this.activeWorkflows.delete(coordinationId);
  }

  // ============================================================================
  // WORKFLOW INITIALIZATION
  // ============================================================================

  /**
   * Initialize all coordination workflows
   */
  private initializeWorkflows(): void {
    this.workflows.set('parallel', this.createParallelWorkflow());
    this.workflows.set('sequential', this.createSequentialWorkflow());
    this.workflows.set('hierarchical', this.createHierarchicalWorkflow());
    this.workflows.set('consensus', this.createConsensusWorkflow());
  }

  /**
   * Get workflow for coordination strategy
   */
  private getWorkflowForStrategy(strategy: CoordinationStrategy): StateGraph<WorkflowState> {
    const workflow = this.workflows.get(strategy);
    
    if (!workflow) {
      throw new Error(`No workflow defined for strategy: ${strategy}`);
    }
    
    return workflow;
  }

  // ============================================================================
  // PARALLEL WORKFLOW
  // ============================================================================

  /**
   * Create parallel coordination workflow
   */
  private createParallelWorkflow(): StateGraph<WorkflowState> {
    const workflow = new StateGraph(AgentWorkflowState);

    // Define workflow nodes
    workflow.addNode('initialize', this.initializeCoordination.bind(this));
    workflow.addNode('dispatch_parallel', this.dispatchParallelRequests.bind(this));
    workflow.addNode('collect_responses', this.collectParallelResponses.bind(this));
    workflow.addNode('check_emergency', this.checkEmergencyConditions.bind(this));
    workflow.addNode('synthesize_response', this.synthesizeResponse.bind(this));
    workflow.addNode('emergency_escalation', this.handleEmergencyEscalation.bind(this));

    // Define workflow edges
    workflow.addEdge(START, 'initialize');
    workflow.addEdge('initialize', 'dispatch_parallel');
    workflow.addEdge('dispatch_parallel', 'collect_responses');
    workflow.addEdge('collect_responses', 'check_emergency');
    
    workflow.addConditionalEdges(
      'check_emergency',
      this.routeEmergencyCheck.bind(this),
      {
        emergency: 'emergency_escalation',
        normal: 'synthesize_response',
      }
    );
    
    workflow.addEdge('emergency_escalation', 'synthesize_response');
    workflow.addEdge('synthesize_response', END);

    return workflow.compile();
  }

  // ============================================================================
  // SEQUENTIAL WORKFLOW
  // ============================================================================

  /**
   * Create sequential coordination workflow
   */
  private createSequentialWorkflow(): StateGraph<WorkflowState> {
    const workflow = new StateGraph(AgentWorkflowState);

    workflow.addNode('initialize', this.initializeCoordination.bind(this));
    workflow.addNode('dispatch_sequential', this.dispatchSequentialRequests.bind(this));
    workflow.addNode('process_agent_response', this.processSequentialResponse.bind(this));
    workflow.addNode('check_completion', this.checkSequentialCompletion.bind(this));
    workflow.addNode('check_emergency', this.checkEmergencyConditions.bind(this));
    workflow.addNode('synthesize_response', this.synthesizeResponse.bind(this));
    workflow.addNode('emergency_escalation', this.handleEmergencyEscalation.bind(this));

    workflow.addEdge(START, 'initialize');
    workflow.addEdge('initialize', 'dispatch_sequential');
    workflow.addEdge('dispatch_sequential', 'process_agent_response');
    workflow.addEdge('process_agent_response', 'check_completion');
    
    workflow.addConditionalEdges(
      'check_completion',
      this.routeSequentialCompletion.bind(this),
      {
        continue: 'dispatch_sequential',
        complete: 'check_emergency',
      }
    );
    
    workflow.addConditionalEdges(
      'check_emergency',
      this.routeEmergencyCheck.bind(this),
      {
        emergency: 'emergency_escalation',
        normal: 'synthesize_response',
      }
    );
    
    workflow.addEdge('emergency_escalation', 'synthesize_response');
    workflow.addEdge('synthesize_response', END);

    return workflow.compile();
  }

  // ============================================================================
  // HIERARCHICAL WORKFLOW
  // ============================================================================

  /**
   * Create hierarchical coordination workflow
   */
  private createHierarchicalWorkflow(): StateGraph<WorkflowState> {
    const workflow = new StateGraph(AgentWorkflowState);

    workflow.addNode('initialize', this.initializeCoordination.bind(this));
    workflow.addNode('dispatch_coordinator', this.dispatchCoordinatorRequest.bind(this));
    workflow.addNode('process_coordinator_response', this.processCoordinatorResponse.bind(this));
    workflow.addNode('dispatch_subordinates', this.dispatchSubordinateRequests.bind(this));
    workflow.addNode('collect_subordinate_responses', this.collectSubordinateResponses.bind(this));
    workflow.addNode('check_emergency', this.checkEmergencyConditions.bind(this));
    workflow.addNode('synthesize_response', this.synthesizeResponse.bind(this));
    workflow.addNode('emergency_escalation', this.handleEmergencyEscalation.bind(this));

    workflow.addEdge(START, 'initialize');
    workflow.addEdge('initialize', 'dispatch_coordinator');
    workflow.addEdge('dispatch_coordinator', 'process_coordinator_response');
    workflow.addEdge('process_coordinator_response', 'dispatch_subordinates');
    workflow.addEdge('dispatch_subordinates', 'collect_subordinate_responses');
    workflow.addEdge('collect_subordinate_responses', 'check_emergency');
    
    workflow.addConditionalEdges(
      'check_emergency',
      this.routeEmergencyCheck.bind(this),
      {
        emergency: 'emergency_escalation',
        normal: 'synthesize_response',
      }
    );
    
    workflow.addEdge('emergency_escalation', 'synthesize_response');
    workflow.addEdge('synthesize_response', END);

    return workflow.compile();
  }

  // ============================================================================
  // CONSENSUS WORKFLOW
  // ============================================================================

  /**
   * Create consensus coordination workflow
   */
  private createConsensusWorkflow(): StateGraph<WorkflowState> {
    const workflow = new StateGraph(AgentWorkflowState);

    workflow.addNode('initialize', this.initializeCoordination.bind(this));
    workflow.addNode('dispatch_first_round', this.dispatchConsensusFirstRound.bind(this));
    workflow.addNode('collect_first_round', this.collectConsensusFirstRound.bind(this));
    workflow.addNode('check_consensus', this.checkConsensusScore.bind(this));
    workflow.addNode('dispatch_second_round', this.dispatchConsensusSecondRound.bind(this));
    workflow.addNode('collect_second_round', this.collectConsensusSecondRound.bind(this));
    workflow.addNode('check_emergency', this.checkEmergencyConditions.bind(this));
    workflow.addNode('synthesize_response', this.synthesizeResponse.bind(this));
    workflow.addNode('emergency_escalation', this.handleEmergencyEscalation.bind(this));

    workflow.addEdge(START, 'initialize');
    workflow.addEdge('initialize', 'dispatch_first_round');
    workflow.addEdge('dispatch_first_round', 'collect_first_round');
    workflow.addEdge('collect_first_round', 'check_consensus');
    
    workflow.addConditionalEdges(
      'check_consensus',
      this.routeConsensusCheck.bind(this),
      {
        consensus_reached: 'check_emergency',
        needs_second_round: 'dispatch_second_round',
      }
    );
    
    workflow.addEdge('dispatch_second_round', 'collect_second_round');
    workflow.addEdge('collect_second_round', 'check_emergency');
    
    workflow.addConditionalEdges(
      'check_emergency',
      this.routeEmergencyCheck.bind(this),
      {
        emergency: 'emergency_escalation',
        normal: 'synthesize_response',
      }
    );
    
    workflow.addEdge('emergency_escalation', 'synthesize_response');
    workflow.addEdge('synthesize_response', END);

    return workflow.compile();
  }

  // ============================================================================
  // WORKFLOW NODE IMPLEMENTATIONS
  // ============================================================================

  /**
   * Initialize coordination workflow
   */
  private async initializeCoordination(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const coordinationEvent: CoordinationEvent = {
      id: nanoid(),
      type: 'coordination_started',
      sessionId: state.sessionId,
      coordinationId: state.coordinationId,
      details: {
        strategy: state.coordinationStrategy,
        agentCount: state.activeAgents.length,
        task: state.task.type,
      },
      timestamp: Date.now(),
    };

    await this.emitCoordinationEvent(coordinationEvent);

    return {
      currentPhase: 'dispatching',
      messages: [...state.messages, new AIMessage({ content: 'Coordination initialized' })],
    };
  }

  /**
   * Dispatch parallel requests to all agents
   */
  private async dispatchParallelRequests(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const promises = state.activeAgents.map(async (agentId) => {
      try {
        return await this.redisCoordinator.coordinateAgents(
          state.sessionId,
          [agentId],
          state.task,
          'parallel',
          30000
        );
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          agentId,
        };
      }
    });

    // Store promises for collection phase
    (state as any).dispatchPromises = promises;

    return {
      currentPhase: 'collecting',
    };
  }

  /**
   * Collect parallel responses
   */
  private async collectParallelResponses(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const promises = (state as any).dispatchPromises || [];
    const results = await Promise.allSettled(promises);

    const responses: AgentResponse[] = [];
    const errors: Array<{ agentId: string; error: string }> = [];
    const completedAgents: string[] = [];

    results.forEach((result, index) => {
      const agentId = state.activeAgents[index];
      
      if (result.status === 'fulfilled' && !result.value.error) {
        const response = result.value as CoordinatedResponse;
        responses.push(...response.agentResponses);
        completedAgents.push(agentId);
      } else {
        const errorMessage = result.status === 'rejected' 
          ? result.reason 
          : result.value.error;
        errors.push({ agentId, error: errorMessage });
      }
    });

    return {
      agentResponses: responses,
      completedAgents,
      errors,
      currentPhase: 'processing',
    };
  }

  /**
   * Check for emergency conditions
   */
  private async checkEmergencyConditions(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const emergencyKeywords = ['crisis', 'emergency', 'suicide', 'self-harm', 'danger'];
    const hasEmergencyResponse = state.agentResponses.some(response =>
      emergencyKeywords.some(keyword =>
        response.content.toLowerCase().includes(keyword)
      ) || response.escalationNeeded
    );

    return {
      emergencyDetected: hasEmergencyResponse,
      currentPhase: hasEmergencyResponse ? 'emergency' : 'synthesis',
    };
  }

  /**
   * Handle emergency escalation
   */
  private async handleEmergencyEscalation(state: WorkflowState): Promise<Partial<WorkflowState>> {
    // Emit emergency event
    const emergencyEvent: CoordinationEvent = {
      id: nanoid(),
      type: 'failure_detected', // Could be 'emergency_detected'
      sessionId: state.sessionId,
      coordinationId: state.coordinationId,
      details: {
        emergencyType: 'crisis_detected',
        agentResponses: state.agentResponses.length,
      },
      timestamp: Date.now(),
    };

    await this.emitCoordinationEvent(emergencyEvent);

    return {
      currentPhase: 'emergency_handled',
      messages: [...state.messages, new AIMessage({ content: 'Emergency escalation triggered' })],
    };
  }

  /**
   * Synthesize final response
   */
  private async synthesizeResponse(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const response: CoordinatedResponse = {
      coordinationId: state.coordinationId,
      strategy: state.coordinationStrategy,
      agentResponses: state.agentResponses,
      synthesizedResponse: this.synthesizeAgentResponses(state.agentResponses, state.coordinationStrategy),
      consensusScore: this.calculateConsensusScore(state.agentResponses),
      coordinationMetrics: {
        totalProcessingTime: Date.now() - (state.context.timestamp || Date.now()),
        parallelEfficiency: this.calculateParallelEfficiency(state.agentResponses),
        resourceUtilization: this.calculateResourceUtilization(state.agentResponses),
      },
      culturalIntegration: this.extractCulturalIntegration(state.agentResponses),
      timestamp: Date.now(),
    };

    return {
      finalResponse: response,
      currentPhase: 'completed',
    };
  }

  // ============================================================================
  // ROUTING FUNCTIONS
  // ============================================================================

  /**
   * Route based on emergency check
   */
  private routeEmergencyCheck(state: WorkflowState): string {
    return state.emergencyDetected ? 'emergency' : 'normal';
  }

  /**
   * Route sequential completion
   */
  private routeSequentialCompletion(state: WorkflowState): string {
    return state.completedAgents.length < state.activeAgents.length ? 'continue' : 'complete';
  }

  /**
   * Route consensus check
   */
  private routeConsensusCheck(state: WorkflowState): string {
    return state.consensusScore >= 0.8 ? 'consensus_reached' : 'needs_second_round';
  }

  // ============================================================================
  // SEQUENTIAL WORKFLOW NODES
  // ============================================================================

  /**
   * Dispatch sequential requests (one at a time)
   */
  private async dispatchSequentialRequests(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const nextAgentIndex = state.completedAgents.length;
    const nextAgentId = state.activeAgents[nextAgentIndex];

    if (!nextAgentId) {
      return { currentPhase: 'completed' };
    }

    // Add previous responses to task context
    const enhancedTask = {
      ...state.task,
      metadata: {
        ...state.task.metadata,
        previousResponses: state.agentResponses,
      },
    };

    try {
      const response = await this.redisCoordinator.coordinateAgents(
        state.sessionId,
        [nextAgentId],
        enhancedTask,
        'sequential',
        30000
      );

      return {
        agentResponses: response.agentResponses,
        completedAgents: [nextAgentId],
        currentPhase: 'processing',
      };

    } catch (error) {
      return {
        errors: [{
          agentId: nextAgentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
        completedAgents: [nextAgentId],
        currentPhase: 'processing',
      };
    }
  }

  /**
   * Process sequential response
   */
  private async processSequentialResponse(state: WorkflowState): Promise<Partial<WorkflowState>> {
    // Update messages with latest response
    const latestResponse = state.agentResponses[state.agentResponses.length - 1];
    
    if (latestResponse) {
      return {
        messages: [...state.messages, new AIMessage({ content: latestResponse.content })],
      };
    }

    return {};
  }

  /**
   * Check sequential completion
   */
  private async checkSequentialCompletion(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const isComplete = state.completedAgents.length >= state.activeAgents.length;
    
    return {
      currentPhase: isComplete ? 'completed' : 'continuing',
    };
  }

  // ============================================================================
  // HIERARCHICAL WORKFLOW NODES
  // ============================================================================

  /**
   * Dispatch coordinator request
   */
  private async dispatchCoordinatorRequest(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const coordinator = state.activeAgents.find(id => id.includes('therapy_coordinator'));
    
    if (!coordinator) {
      return {
        errors: [{ agentId: 'coordinator', error: 'No coordinator agent found' }],
        currentPhase: 'error',
      };
    }

    try {
      const response = await this.redisCoordinator.coordinateAgents(
        state.sessionId,
        [coordinator],
        state.task,
        'hierarchical',
        30000
      );

      return {
        agentResponses: response.agentResponses,
        completedAgents: [coordinator],
        currentPhase: 'coordinator_completed',
      };

    } catch (error) {
      return {
        errors: [{
          agentId: coordinator,
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
        currentPhase: 'error',
      };
    }
  }

  /**
   * Process coordinator response
   */
  private async processCoordinatorResponse(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const coordinatorResponse = state.agentResponses[0];
    
    if (!coordinatorResponse) {
      return { currentPhase: 'error' };
    }

    // Enhance task with coordinator guidance
    const enhancedTask = {
      ...state.task,
      metadata: {
        ...state.task.metadata,
        coordinatorGuidance: coordinatorResponse,
      },
    };

    return {
      task: enhancedTask,
      currentPhase: 'subordinate_dispatch',
    };
  }

  /**
   * Dispatch subordinate requests
   */
  private async dispatchSubordinateRequests(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const subordinates = state.activeAgents.filter(id => !state.completedAgents.includes(id));

    if (subordinates.length === 0) {
      return { currentPhase: 'completed' };
    }

    const promises = subordinates.map(async (agentId) => {
      try {
        return await this.redisCoordinator.coordinateAgents(
          state.sessionId,
          [agentId],
          state.task,
          'hierarchical',
          30000
        );
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          agentId,
        };
      }
    });

    (state as any).subordinatePromises = promises;

    return {
      currentPhase: 'subordinate_collection',
    };
  }

  /**
   * Collect subordinate responses
   */
  private async collectSubordinateResponses(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const promises = (state as any).subordinatePromises || [];
    const results = await Promise.allSettled(promises);

    const responses: AgentResponse[] = [];
    const errors: Array<{ agentId: string; error: string }> = [];
    const completedAgents: string[] = [];

    results.forEach((result, index) => {
      const subordinates = state.activeAgents.filter(id => !state.completedAgents.includes(id));
      const agentId = subordinates[index];
      
      if (result.status === 'fulfilled' && !result.value.error) {
        const response = result.value as CoordinatedResponse;
        responses.push(...response.agentResponses);
        completedAgents.push(agentId);
      } else {
        const errorMessage = result.status === 'rejected' 
          ? result.reason 
          : result.value.error;
        errors.push({ agentId, error: errorMessage });
      }
    });

    return {
      agentResponses: responses,
      completedAgents,
      errors,
      currentPhase: 'processing',
    };
  }

  // ============================================================================
  // CONSENSUS WORKFLOW NODES
  // ============================================================================

  /**
   * Dispatch consensus first round
   */
  private async dispatchConsensusFirstRound(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const promises = state.activeAgents.map(async (agentId) => {
      try {
        return await this.redisCoordinator.coordinateAgents(
          state.sessionId,
          [agentId],
          state.task,
          'consensus',
          30000
        );
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          agentId,
        };
      }
    });

    (state as any).firstRoundPromises = promises;

    return {
      currentPhase: 'first_round_collection',
    };
  }

  /**
   * Collect consensus first round
   */
  private async collectConsensusFirstRound(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const promises = (state as any).firstRoundPromises || [];
    const results = await Promise.allSettled(promises);

    const responses: AgentResponse[] = [];
    const errors: Array<{ agentId: string; error: string }> = [];

    results.forEach((result, index) => {
      const agentId = state.activeAgents[index];
      
      if (result.status === 'fulfilled' && !result.value.error) {
        const response = result.value as CoordinatedResponse;
        responses.push(...response.agentResponses);
      } else {
        const errorMessage = result.status === 'rejected' 
          ? result.reason 
          : result.value.error;
        errors.push({ agentId, error: errorMessage });
      }
    });

    const consensusScore = this.calculateConsensusScore(responses);

    return {
      agentResponses: responses,
      errors,
      consensusScore,
      currentPhase: 'consensus_evaluation',
    };
  }

  /**
   * Check consensus score
   */
  private async checkConsensusScore(state: WorkflowState): Promise<Partial<WorkflowState>> {
    return {
      currentPhase: state.consensusScore >= 0.8 ? 'consensus_achieved' : 'second_round_needed',
    };
  }

  /**
   * Dispatch consensus second round
   */
  private async dispatchConsensusSecondRound(state: WorkflowState): Promise<Partial<WorkflowState>> {
    // Enhance task with all first round responses
    const enhancedTask = {
      ...state.task,
      metadata: {
        ...state.task.metadata,
        consensusRound: true,
        allResponses: state.agentResponses,
      },
    };

    const promises = state.activeAgents.map(async (agentId) => {
      try {
        return await this.redisCoordinator.coordinateAgents(
          state.sessionId,
          [agentId],
          enhancedTask,
          'consensus',
          30000
        );
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          agentId,
        };
      }
    });

    (state as any).secondRoundPromises = promises;

    return {
      currentPhase: 'second_round_collection',
    };
  }

  /**
   * Collect consensus second round
   */
  private async collectConsensusSecondRound(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const promises = (state as any).secondRoundPromises || [];
    const results = await Promise.allSettled(promises);

    const responses: AgentResponse[] = [];
    const errors: Array<{ agentId: string; error: string }> = [];

    results.forEach((result, index) => {
      const agentId = state.activeAgents[index];
      
      if (result.status === 'fulfilled' && !result.value.error) {
        const response = result.value as CoordinatedResponse;
        responses.push(...response.agentResponses);
      } else {
        const errorMessage = result.status === 'rejected' 
          ? result.reason 
          : result.value.error;
        errors.push({ agentId, error: errorMessage });
      }
    });

    const consensusScore = this.calculateConsensusScore([...state.agentResponses, ...responses]);

    return {
      agentResponses: responses,
      errors,
      consensusScore,
      currentPhase: 'processing',
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Emit coordination event
   */
  private async emitCoordinationEvent(event: CoordinationEvent): Promise<void> {
    await this.redisCoordinator.coordinateAgents(
      event.sessionId || '',
      [],
      {
        id: event.id,
        type: 'assessment',
        description: 'coordination_event',
        requiredAgents: [],
        priority: 'medium',
        coordinationStrategy: 'parallel',
        confidentialityLevel: 'standard',
        timeoutMs: 1000,
      }
    );
  }

  /**
   * Synthesize agent responses
   */
  private synthesizeAgentResponses(responses: AgentResponse[], strategy: CoordinationStrategy): string {
    if (responses.length === 0) {
      return 'No agent responses available';
    }

    if (responses.length === 1) {
      return responses[0].content;
    }

    // Sort by confidence and combine
    const sortedResponses = responses.sort((a, b) => b.confidence - a.confidence);
    
    switch (strategy) {
      case 'hierarchical':
        const coordinator = sortedResponses.find(r => r.agentType === 'therapy_coordinator');
        const others = sortedResponses.filter(r => r.agentType !== 'therapy_coordinator');
        return coordinator ? 
          `${coordinator.content} ${others.map(r => r.content).join(' ')}` :
          sortedResponses.map(r => r.content).join(' ');
      
      case 'consensus':
        const highConfidence = sortedResponses.filter(r => r.confidence > 0.8);
        return highConfidence.length > 0 ?
          highConfidence.map(r => r.content).join(' ') :
          sortedResponses.slice(0, 2).map(r => r.content).join(' ');
      
      default:
        return sortedResponses.map(r => r.content).join(' ');
    }
  }

  /**
   * Calculate consensus score
   */
  private calculateConsensusScore(responses: AgentResponse[]): number {
    if (responses.length < 2) return 1.0;

    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    const variance = responses.reduce((sum, r) => sum + Math.pow(r.confidence - avgConfidence, 2), 0) / responses.length;
    
    return Math.max(0, 1 - variance);
  }

  /**
   * Calculate parallel efficiency
   */
  private calculateParallelEfficiency(responses: AgentResponse[]): number {
    if (responses.length === 0) return 0;

    const maxTime = Math.max(...responses.map(r => r.processingTimeMs));
    const avgTime = responses.reduce((sum, r) => sum + r.processingTimeMs, 0) / responses.length;
    
    return maxTime > 0 ? avgTime / maxTime : 1.0;
  }

  /**
   * Calculate resource utilization
   */
  private calculateResourceUtilization(responses: AgentResponse[]): number {
    const avgProcessingTime = responses.reduce((sum, r) => sum + r.processingTimeMs, 0) / responses.length;
    const targetTime = 2000; // 2 seconds
    
    return Math.min(1.0, targetTime / avgProcessingTime);
  }

  /**
   * Extract cultural integration
   */
  private extractCulturalIntegration(responses: AgentResponse[]): Record<string, any> {
    const culturalResponses = responses.filter(r => r.agentType === 'cultural_adapter');
    
    if (culturalResponses.length === 0) return {};

    return {
      culturalRelevanceScore: culturalResponses.reduce((sum, r) => sum + (r.culturalRelevance || 0), 0) / culturalResponses.length,
      culturalAdaptations: culturalResponses.flatMap(r => r.actionItems || []),
    };
  }
}