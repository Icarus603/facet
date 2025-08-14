/**
 * FACET Agent Orchestration Framework - Type Definitions
 * HIPAA-compliant agent coordination types for therapy platform
 */

import { z } from 'zod';

// ============================================================================
// CORE AGENT TYPES
// ============================================================================

export type AgentType = 
  | 'intake' 
  | 'therapy_coordinator' 
  | 'crisis_monitor' 
  | 'cultural_adapter' 
  | 'progress_tracker';

export type AgentStatus = 
  | 'idle' 
  | 'processing' 
  | 'busy' 
  | 'failed' 
  | 'offline';

export type AgentPriority = 'low' | 'medium' | 'high' | 'critical';

export type CoordinationStrategy = 
  | 'sequential' 
  | 'parallel' 
  | 'hierarchical' 
  | 'consensus';

// ============================================================================
// AGENT CONTEXT & MESSAGES
// ============================================================================

export const AgentContextSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  culturalProfile: z.record(z.any()).optional(),
  sessionHistory: z.array(z.record(z.any())).optional(),
  userPreferences: z.record(z.any()).optional(),
  confidentialityLevel: z.enum(['standard', 'elevated', 'maximum']),
  timestamp: z.number(),
  correlationId: z.string(),
});

export type AgentContext = z.infer<typeof AgentContextSchema>;

export const AgentMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['user_input', 'agent_query', 'coordination', 'system']),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  source: z.string(),
  timestamp: z.number(),
  encrypted: z.boolean().default(false),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

export const UserMessageSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  content: z.string(),
  messageType: z.enum(['text', 'voice', 'file']),
  culturalContext: z.record(z.any()).optional(),
  emergencyIndicators: z.array(z.string()).optional(),
  timestamp: z.number(),
  correlationId: z.string(),
});

export type UserMessage = z.infer<typeof UserMessageSchema>;

// ============================================================================
// AGENT RESPONSES
// ============================================================================

export const AgentResponseSchema = z.object({
  agentId: z.string(),
  agentType: z.enum(['intake', 'therapy_coordinator', 'crisis_monitor', 'cultural_adapter', 'progress_tracker']),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  culturalRelevance: z.number().min(0).max(1).optional(),
  actionItems: z.array(z.string()).optional(),
  followUpRequired: z.boolean().default(false),
  escalationNeeded: z.boolean().default(false),
  processingTimeMs: z.number(),
  coordinationEvents: z.array(z.record(z.any())).optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.number(),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

export const TherapyResponseSchema = z.object({
  primaryResponse: AgentResponseSchema,
  supportingResponses: z.array(AgentResponseSchema).optional(),
  coordinationSummary: z.object({
    agentsInvolved: z.array(z.string()),
    coordinationStrategy: z.enum(['sequential', 'parallel', 'hierarchical', 'consensus']),
    totalProcessingTime: z.number(),
    coordinationEfficiency: z.number().min(0).max(1),
  }),
  culturalAdaptations: z.array(z.record(z.any())).optional(),
  recommendations: z.array(z.string()).optional(),
  sessionUpdates: z.record(z.any()).optional(),
  timestamp: z.number(),
});

export type TherapyResponse = z.infer<typeof TherapyResponseSchema>;

export const CoordinatedResponseSchema = z.object({
  coordinationId: z.string(),
  strategy: z.enum(['sequential', 'parallel', 'hierarchical', 'consensus']),
  agentResponses: z.array(AgentResponseSchema),
  synthesizedResponse: z.string(),
  consensusScore: z.number().min(0).max(1).optional(),
  coordinationMetrics: z.object({
    totalProcessingTime: z.number(),
    parallelEfficiency: z.number().min(0).max(1),
    resourceUtilization: z.number().min(0).max(1),
  }),
  culturalIntegration: z.record(z.any()).optional(),
  timestamp: z.number(),
});

export type CoordinatedResponse = z.infer<typeof CoordinatedResponseSchema>;

export const FallbackResponseSchema = z.object({
  fallbackAgentId: z.string(),
  originalAgentId: z.string(),
  failureReason: z.string(),
  response: AgentResponseSchema,
  degradedCapabilities: z.array(z.string()).optional(),
  recoveryEstimate: z.number().optional(),
  timestamp: z.number(),
});

export type FallbackResponse = z.infer<typeof FallbackResponseSchema>;

// ============================================================================
// AGENT PERFORMANCE & MONITORING
// ============================================================================

export const AgentPerformanceMetricsSchema = z.object({
  agentId: z.string(),
  responseTime: z.number(),
  successRate: z.number().min(0).max(1),
  userSatisfaction: z.number().min(0).max(1).optional(),
  culturalAccuracy: z.number().min(0).max(1).optional(),
  resourceUsage: z.object({
    cpuPercent: z.number(),
    memoryMb: z.number(),
    tokensUsed: z.number(),
    costUsd: z.number(),
  }),
  errorCount: z.number(),
  lastHealthCheck: z.number(),
});

export type AgentPerformanceMetrics = z.infer<typeof AgentPerformanceMetricsSchema>;

export const CircuitBreakerStateSchema = z.object({
  state: z.enum(['closed', 'open', 'half-open']),
  failureCount: z.number(),
  lastFailureTime: z.number().optional(),
  nextRetryTime: z.number().optional(),
  successThreshold: z.number(),
  failureThreshold: z.number(),
  timeout: z.number(),
});

export type CircuitBreakerState = z.infer<typeof CircuitBreakerStateSchema>;

// ============================================================================
// THERAPY TASK DEFINITIONS
// ============================================================================

export const TherapyTaskSchema = z.object({
  id: z.string(),
  type: z.enum(['assessment', 'intervention', 'crisis_response', 'cultural_adaptation', 'progress_evaluation']),
  description: z.string(),
  requiredAgents: z.array(z.enum(['intake', 'therapy_coordinator', 'crisis_monitor', 'cultural_adapter', 'progress_tracker'])),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  coordinationStrategy: z.enum(['sequential', 'parallel', 'hierarchical', 'consensus']),
  culturalConsiderations: z.array(z.string()).optional(),
  confidentialityLevel: z.enum(['standard', 'elevated', 'maximum']),
  timeoutMs: z.number(),
  metadata: z.record(z.any()).optional(),
});

export type TherapyTask = z.infer<typeof TherapyTaskSchema>;

// ============================================================================
// COORDINATION EVENTS
// ============================================================================

export const CoordinationEventSchema = z.object({
  id: z.string(),
  type: z.enum(['agent_requested', 'agent_responded', 'coordination_started', 'coordination_completed', 'failure_detected', 'fallback_triggered']),
  sessionId: z.string(),
  agentId: z.string().optional(),
  coordinationId: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: z.number(),
  processingTimeMs: z.number().optional(),
});

export type CoordinationEvent = z.infer<typeof CoordinationEventSchema>;

// ============================================================================
// REDIS MESSAGE TYPES
// ============================================================================

export const RedisMessageSchema = z.object({
  type: z.enum(['agent_request', 'agent_response', 'coordination_event', 'health_check', 'performance_metric']),
  correlationId: z.string(),
  payload: z.record(z.any()),
  timestamp: z.number(),
  ttl: z.number().optional(),
});

export type RedisMessage = z.infer<typeof RedisMessageSchema>;

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AgentError extends Error {
  constructor(
    message: string,
    public agentId: string,
    public agentType: AgentType,
    public errorCode: string,
    public retryable: boolean = false,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class CoordinationError extends Error {
  constructor(
    message: string,
    public coordinationId: string,
    public agentsInvolved: string[],
    public errorCode: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'CoordinationError';
  }
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public agentId: string,
    public state: CircuitBreakerState,
    public nextRetryTime?: number
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export const AgentConfigSchema = z.object({
  id: z.string(),
  type: z.enum(['intake', 'therapy_coordinator', 'crisis_monitor', 'cultural_adapter', 'progress_tracker']),
  capabilities: z.array(z.string()),
  maxConcurrentSessions: z.number().min(1),
  responseTimeoutMs: z.number(),
  healthCheckIntervalMs: z.number(),
  circuitBreaker: z.object({
    failureThreshold: z.number().min(1),
    successThreshold: z.number().min(1),
    timeoutMs: z.number(),
    halfOpenMaxRequests: z.number().min(1),
  }),
  llmConfig: z.object({
    model: z.string(),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().min(1),
    systemPrompt: z.string(),
  }),
  culturalSettings: z.record(z.any()).optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const OrchestratorConfigSchema = z.object({
  maxConcurrentCoordinations: z.number().min(1),
  defaultTimeoutMs: z.number(),
  redisConnectionString: z.string(),
  azureOpenAiEndpoint: z.string(),
  azureOpenAiApiKey: z.string(),
  azureOpenAiApiVersion: z.string(),
  performanceMetricsRetention: z.number(),
  auditLogRetention: z.number(),
  encryptionEnabled: z.boolean(),
  encryptionKey: z.string().optional(),
});

export type OrchestratorConfig = z.infer<typeof OrchestratorConfigSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function generateAgentId(type: AgentType): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${type}_${timestamp}_${random}`;
}

export function generateCorrelationId(): string {
  return `coord_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

export function isHighPriorityTask(task: TherapyTask): boolean {
  return task.priority === 'high' || task.priority === 'critical';
}

export function requiresImmediateAttention(message: UserMessage): boolean {
  return Boolean(message.emergencyIndicators && message.emergencyIndicators.length > 0);
}

export function calculateCoordinationTimeout(strategy: CoordinationStrategy, agentCount: number): number {
  const baseTimeout = 30000; // 30 seconds
  const agentMultiplier = strategy === 'parallel' ? 1.2 : agentCount * 0.5;
  return Math.min(baseTimeout * agentMultiplier, 120000); // Max 2 minutes
}