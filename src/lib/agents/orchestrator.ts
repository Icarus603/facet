/**
 * FACET Agent Orchestrator Barrel Export
 * 
 * Main entry point for the multi-agent orchestration system
 * Exports the LangChain-powered orchestrator for use throughout the application
 */

// Export the main orchestrator class
export { FACETOrchestrator as AgentOrchestrator } from './orchestrator/langchain-orchestrator'

// Export orchestrator types for compatibility
export type { FACETState } from './orchestrator/langraph-workflows'

// Re-export execution planner for advanced usage
export { ExecutionPlanner } from './orchestrator/execution-planner'

// Re-export performance monitor for metrics
export { performanceMonitor } from './orchestrator/performance-monitor'

// Default export for convenience
export { FACETOrchestrator as default } from './orchestrator/langchain-orchestrator'