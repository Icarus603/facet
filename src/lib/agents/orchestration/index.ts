/**
 * FACET Agent Orchestration System
 * Unified export for the complete multi-agent coordination infrastructure
 */

// Core orchestration components
export { OrchestrationEngine } from './OrchestrationEngine';
export { IntelligentRouter } from './IntelligentRouter';
export { PerformanceMonitor } from './PerformanceMonitor';
export { CollaborationWorkflow } from './CollaborationWorkflow';

// Type exports for orchestration
export type {
  OrchestrationContext,
  OrchestrationResult,
  OrchestrationStrategy,
  AgentLoadMetrics
} from './OrchestrationEngine';

export type {
  RoutingContext,
  RoutingDecision,
  AgentPerformanceProfile,
  LoadBalancingStrategy,
  CulturalMatchingAlgorithm
} from './IntelligentRouter';

export type {
  PerformanceMetrics,
  PerformanceThresholds,
  PerformanceAlert,
  OptimizationRecommendation,
  PerformanceTrend,
  AgentHealthStatus
} from './PerformanceMonitor';

export type {
  CollaborationContext,
  HandoffProtocol,
  CollaborationSession,
  JointIntervention,
  SupervisionProtocol
} from './CollaborationWorkflow';

/**
 * FACET Orchestration System Overview
 * 
 * This orchestration system provides comprehensive multi-agent coordination for the FACET therapy platform:
 * 
 * 1. **OrchestrationEngine**: Core coordination engine managing agent selection and strategy execution
 *    - Handles crisis routing, collaborative interventions, sequential/parallel workflows
 *    - Provides load balancing and intelligent agent selection
 *    - Manages orchestration strategies (single, collaborative, sequential, parallel)
 * 
 * 2. **IntelligentRouter**: Advanced routing system with cultural matching and performance optimization
 *    - Cultural affinity algorithms for appropriate agent-client matching
 *    - Load balancing strategies (weighted round-robin, least connections, performance-based)
 *    - Dynamic routing weights based on urgency, performance, and specialization
 * 
 * 3. **PerformanceMonitor**: Comprehensive performance tracking and optimization
 *    - Real-time performance metrics collection and analysis
 *    - Predictive analytics for performance trends
 *    - Auto-optimization recommendations and implementation
 *    - Health status monitoring and alerting
 * 
 * 4. **CollaborationWorkflow**: Sophisticated agent handoffs and joint interventions
 *    - Handoff protocols for different scenarios (crisis, cultural, standard)
 *    - Joint intervention coordination (crisis teams, cultural consultation)
 *    - Supervision protocols for oversight and quality assurance
 *    - Quality gates and validation throughout workflows
 * 
 * Key Features:
 * - **Cultural Responsiveness**: Deep integration of cultural matching and adaptation
 * - **Crisis Management**: Immediate escalation and specialized crisis protocols
 * - **Performance Optimization**: AI-driven performance analysis and optimization
 * - **Quality Assurance**: Built-in quality gates and supervision mechanisms
 * - **Scalability**: Load balancing and resource optimization for production use
 * - **Flexibility**: Multiple orchestration strategies for different scenarios
 * 
 * Usage Example:
 * ```typescript
 * import { 
 *   OrchestrationEngine, 
 *   IntelligentRouter, 
 *   PerformanceMonitor,
 *   CollaborationWorkflow 
 * } from '@/lib/agents/orchestration';
 * 
 * // Initialize orchestration system
 * const router = new IntelligentRouter();
 * const monitor = new PerformanceMonitor();
 * const workflow = new CollaborationWorkflow();
 * const orchestrator = new OrchestrationEngine(agentRegistry);
 * 
 * // Orchestrate agent interaction
 * const result = await orchestrator.orchestrate({
 *   sessionId: 'session_123',
 *   userId: 'user_456',
 *   userInput: 'I need help with anxiety',
 *   culturalContext: { primaryCulture: 'Latino' },
 *   urgencyLevel: 'medium'
 * });
 * ```
 */

/**
 * Factory function to create a complete orchestration system
 */
export function createOrchestrationSystem(agentRegistry: any) {
  const router = new IntelligentRouter();
  const monitor = new PerformanceMonitor();
  const workflow = new CollaborationWorkflow();
  const orchestrator = new OrchestrationEngine(agentRegistry);

  // Connect components for integrated operation
  
  // Route performance data to monitor
  router.on('routing:completed', (data) => {
    monitor.recordInteraction(data.selectedAgent, data.interaction, data.metrics);
  });

  // Route collaboration events to monitor
  workflow.on('handoff:completed', (data) => {
    monitor.emit('collaboration:completed', data);
  });

  // Route orchestration events to workflow
  orchestrator.on('crisis:detected', (data) => {
    workflow.emit('crisis:escalation_needed', data);
  });

  return {
    router,
    monitor,
    workflow,
    orchestrator,
    
    /**
     * Get system status
     */
    getSystemStatus() {
      return {
        orchestration: orchestrator.getOrchestrationStatus(),
        routing: router.getRoutingAnalytics(),
        performance: monitor.getPerformanceDashboard(),
        collaboration: workflow.getCollaborationAnalytics()
      };
    },

    /**
     * Shutdown system gracefully
     */
    shutdown() {
      monitor.stopMonitoring();
      // Additional cleanup as needed
    }
  };
}

/**
 * Agent orchestration system singleton
 */
export class FACETOrchestrationSystem {
  private static instance: FACETOrchestrationSystem;
  private systemComponents: any;

  private constructor(agentRegistry: any) {
    this.systemComponents = createOrchestrationSystem(agentRegistry);
  }

  public static getInstance(agentRegistry?: any): FACETOrchestrationSystem {
    if (!FACETOrchestrationSystem.instance) {
      if (!agentRegistry) {
        throw new Error('Agent registry required for first initialization');
      }
      FACETOrchestrationSystem.instance = new FACETOrchestrationSystem(agentRegistry);
    }
    return FACETOrchestrationSystem.instance;
  }

  public getOrchestrator() {
    return this.systemComponents.orchestrator;
  }

  public getRouter() {
    return this.systemComponents.router;
  }

  public getMonitor() {
    return this.systemComponents.monitor;
  }

  public getWorkflow() {
    return this.systemComponents.workflow;
  }

  public getSystemStatus() {
    return this.systemComponents.getSystemStatus();
  }

  public shutdown() {
    this.systemComponents.shutdown();
  }
}