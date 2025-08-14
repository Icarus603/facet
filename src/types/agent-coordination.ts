/**
 * Agent Coordination UI Integration Types
 * Real-time agent orchestration and cultural content integration
 */

import { AgentType, AgentResponse, CoordinationStrategy } from './agent-types'

// ============================================================================
// AGENT STATE MANAGEMENT
// ============================================================================

export interface AgentState {
  agentId: string
  type: AgentType
  status: 'idle' | 'processing' | 'coordinating' | 'failed' | 'offline'
  currentTask: string | null
  queuePosition: number
  estimatedCompletion: number | null
  performance: {
    averageResponseTime: number
    successRate: number
    culturalAccuracy: number
    totalProcessed: number
    lastHealthCheck: number
  }
  culturalSpecializations?: string[]
  isHealthy: boolean
  lastActivity: number
}

export interface AgentCoordinationState {
  agents: Map<string, AgentState>
  activeCoordinations: Map<string, CoordinationSession>
  coordinationQueue: CoordinationEvent[]
  globalMetrics: {
    totalActiveAgents: number
    averageResponseTime: number
    coordinationEfficiency: number
    culturalAdaptationRate: number
  }
  lastUpdated: number
}

export interface CoordinationSession {
  sessionId: string
  coordinationId: string
  strategy: CoordinationStrategy
  agentIds: string[]
  status: 'pending' | 'active' | 'completed' | 'failed' | 'escalated'
  startTime: number
  estimatedCompletion: number | null
  culturalContext?: CulturalProfile
  events: CoordinationEvent[]
  metrics: {
    totalProcessingTime: number
    agentUtilization: number
    coordinationEfficiency: number
  }
}

export interface CoordinationEvent {
  eventId: string
  timestamp: number
  sourceAgent: string | null
  targetAgent: string | null
  eventType: 'handoff' | 'collaboration' | 'escalation' | 'fallback' | 'crisis_detected' | 'cultural_adaptation'
  context: Record<string, any>
  culturalContext?: CulturalProfile
  priority: 'low' | 'medium' | 'high' | 'critical'
  processingTime?: number
}

// ============================================================================
// CULTURAL PROFILE & CONTENT INTEGRATION
// ============================================================================

export interface CulturalProfile {
  primaryCulture: string
  culturalTags: string[]
  languagePreferences: string[]
  religiousConsiderations?: string[]
  traditionalPractices?: string[]
  communicationStyles?: string[]
  therapeuticApproaches?: string[]
  sensitiveTopics?: string[]
}

export interface CulturalContentRequest {
  query: string
  culturalContext: CulturalProfile
  therapeuticGoals: string[]
  sessionContext: SessionContext
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

export interface CulturalContentResponse {
  content: CulturalContent[]
  relevanceScore: number
  biasAssessment: BiasAssessment
  expertValidation: boolean
  culturalThemes: string[]
  recommendations: string[]
  usageGuidance: string
  cautionaryNotes?: string[]
}

export interface CulturalContent {
  id: string
  title: string
  content: string
  contentType: 'meditation' | 'story' | 'proverb' | 'philosophy' | 'ritual' | 'practice'
  cultureTags: string[]
  therapeuticThemes: string[]
  therapeuticApplications: string[]
  source: string
  region: string
  culturalSignificance: string
  biasScore?: number
  expertValidated: boolean
  expertValidator?: string
  validationNotes?: string
  createdAt: Date
  updatedAt: Date
}

export interface BiasAssessment {
  biasScore: number
  isValid: boolean
  biasIndicators: BiasIndicator[]
  culturalAppropriateness: number
  confidence: number
  recommendations: string[]
  analysisDetails: {
    culturalStereotyping: number
    culturalAppropriation: number
    harmfulGeneralization: number
    religousSensitivity: number
    historicalAccuracy: number
    languagePropriety: number
    contextualAppropriaqteness: number
  }
}

export interface BiasIndicator {
  type: 'cultural_stereotyping' | 'cultural_appropriation' | 'harmful_generalization' | 'religious_insensitivity' | 'historical_inaccuracy' | 'misrepresentation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  content: string
  explanation: string
  startIndex: number
  endIndex: number
}

export interface SessionContext {
  sessionId: string
  userId: string
  culturalProfile: CulturalProfile
  sessionHistory: string[]
  currentIssues: string[]
  therapeuticGoals: string[]
  riskLevel: number
}

// ============================================================================
// CRISIS DETECTION & MONITORING
// ============================================================================

export interface CrisisMonitoringData {
  userId: string
  sessionId: string
  riskLevel: number // 0-1 scale
  riskFactors: string[]
  interventionHistory: CrisisIntervention[]
  emergencyContacts: EmergencyContact[]
  culturalConsiderations: string[]
  assessmentTimestamp: number
  nextAssessmentDue: number
}

export interface CrisisIntervention {
  interventionId: string
  timestamp: number
  interventionType: 'de_escalation' | 'safety_planning' | 'emergency_contact' | 'professional_referral' | 'crisis_line'
  agentId: string
  culturalAdaptations: string[]
  effectiveness: number | null
  userResponse: string | null
  followUpRequired: boolean
  notes: string
}

export interface EmergencyContact {
  contactId: string
  name: string
  relationship: string
  phoneNumber: string
  email?: string
  isPrimary: boolean
  culturalConsiderations?: string[]
  availabilityHours?: string
  lastContactedAt?: number
}

export interface CrisisAlert {
  alertId: string
  userId: string
  sessionId: string
  riskLevel: number
  triggerFactors: string[]
  detectedAt: number
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated'
  assignedAgent: string | null
  culturalConsiderations: string[]
  interventionPlan: string[]
  estimatedResolutionTime: number | null
}

// ============================================================================
// AGENT PERFORMANCE ANALYTICS
// ============================================================================

export interface AgentPerformanceMetrics {
  agentType: string
  agentId: string
  responseTime: {
    average: number
    percentile95: number
    trend: 'improving' | 'stable' | 'declining'
    lastMeasurement: number
  }
  accuracy: {
    therapeuticAccuracy: number
    culturalAccuracy: number
    safetyCompliance: number
    userSatisfaction: number
  }
  throughput: {
    sessionsPerHour: number
    messagesPerSession: number
    coordinationsParticipated: number
  }
  culturalCompetency: {
    culturesCovered: string[]
    culturalAdaptationSuccess: number
    biasDetectionAccuracy: number
    expertValidationRate: number
  }
  reliability: {
    uptime: number
    errorRate: number
    failoverCount: number
    lastFailureTime: number | null
  }
}

export interface CoordinationMetrics {
  coordinationId: string
  strategy: CoordinationStrategy
  agentsInvolved: string[]
  timing: {
    totalDuration: number
    coordinationOverhead: number
    parallelEfficiency: number
    bottleneckAgent: string | null
  }
  quality: {
    consensusScore: number
    conflictResolutionTime: number
    outputCoherence: number
    culturalConsistency: number
  }
  resource: {
    computeUtilization: number
    memoryUsage: number
    tokensConsumed: number
    costEstimate: number
  }
}

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

export interface AgentCoordinationEvent {
  type: 'agent_status_update' | 'coordination_start' | 'coordination_complete' | 'coordination_failure' | 'crisis_alert' | 'cultural_content_ready' | 'agent_handoff' | 'performance_metric_update'
  payload: {
    sessionId?: string
    agentId?: string
    coordinationId?: string
    data: Record<string, any>
    culturalContext?: CulturalProfile
    priority?: 'low' | 'medium' | 'high' | 'critical'
  }
  timestamp: number
  correlationId?: string
}

export interface WebSocketAgentMessage {
  type: 'agent_coordination_event' | 'crisis_alert' | 'cultural_content' | 'performance_update'
  event: AgentCoordinationEvent
  metadata?: {
    retryCount?: number
    priority?: 'low' | 'medium' | 'high' | 'critical'
    encryption?: boolean
  }
}

// ============================================================================
// UI COMPONENT STATE INTERFACES
// ============================================================================

export interface AgentStatusIndicatorProps {
  agentId: string
  agentType: AgentType
  status: AgentState['status']
  performance: AgentState['performance']
  culturalSpecializations?: string[]
  showDetailedMetrics?: boolean
  className?: string
}

export interface CoordinationFlowVisualizationProps {
  coordinationSession: CoordinationSession
  showRealTimeUpdates?: boolean
  highlightCulturalAdaptations?: boolean
  onEventClick?: (event: CoordinationEvent) => void
  className?: string
}

export interface CrisisMonitoringInterfaceProps {
  monitoringData: CrisisMonitoringData
  alerts: CrisisAlert[]
  onInterventionTrigger: (intervention: Partial<CrisisIntervention>) => void
  onEmergencyContactActivate: (contactId: string) => void
  culturalAdaptationsEnabled?: boolean
  className?: string
}

export interface CulturalContentInterfaceProps {
  contentResponse: CulturalContentResponse
  onContentSelect: (content: CulturalContent) => void
  onBiasReport: (contentId: string, issue: string) => void
  showExpertValidationStatus?: boolean
  culturalProfile: CulturalProfile
  className?: string
}

export interface PerformanceMetricsDashboardProps {
  metrics: AgentPerformanceMetrics[]
  coordinationMetrics: CoordinationMetrics[]
  timeRange: { start: Date; end: Date }
  groupBy?: 'agent' | 'type' | 'culture' | 'session'
  showTrends?: boolean
  onExportData?: () => void
  className?: string
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

export interface UseAgentCoordinationReturn {
  coordinationState: AgentCoordinationState
  activeAlerts: CrisisAlert[]
  culturalContent: CulturalContentResponse | null
  isConnected: boolean
  
  // Actions
  requestCoordination: (strategy: CoordinationStrategy, agentTypes: AgentType[], context: SessionContext) => Promise<string>
  cancelCoordination: (coordinationId: string) => Promise<void>
  updateAgentStatus: (agentId: string, status: Partial<AgentState>) => void
  triggerCrisisIntervention: (intervention: Partial<CrisisIntervention>) => Promise<void>
  requestCulturalContent: (request: CulturalContentRequest) => Promise<void>
  
  // Real-time subscriptions
  subscribeToAgent: (agentId: string) => () => void
  subscribeToCoordination: (coordinationId: string) => () => void
  subscribeToCrisisAlerts: (userId: string) => () => void
  
  // Metrics
  getAgentMetrics: (agentId: string) => AgentPerformanceMetrics | null
  getCoordinationMetrics: (coordinationId: string) => CoordinationMetrics | null
  getGlobalMetrics: () => AgentCoordinationState['globalMetrics']
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type AgentCoordinationEventHandler = (event: AgentCoordinationEvent) => void
export type CrisisAlertHandler = (alert: CrisisAlert) => void
export type CulturalContentHandler = (content: CulturalContentResponse) => void

export interface AgentCoordinationConfig {
  enableRealTimeUpdates: boolean
  enableCrisisMonitoring: boolean
  enableCulturalAdaptation: boolean
  maxConcurrentCoordinations: number
  coordinationTimeout: number
  performanceMetricsInterval: number
  cacheSize: number
  retryAttempts: number
  debugMode: boolean
}