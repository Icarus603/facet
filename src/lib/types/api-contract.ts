/**
 * FACET Multi-Agent System API Contract Types
 * Exact TypeScript definitions from API_CONTRACT.md v2.0
 * 
 * CRITICAL: These types MUST match the API contract exactly for Developer A/B integration
 */

// ============================================================================
// PRIMARY API TYPES
// ============================================================================

/**
 * Request format for POST /api/chat
 * Lines 29-49 from API_CONTRACT.md
 */
export interface ChatRequest {
  // Required Fields
  message: string                          // User's input message (1-4000 chars)
  
  // Optional Context
  conversationId?: string                  // UUID for conversation continuity
  messageId?: string                       // UUID for message tracking
  
  // User Preferences (Override stored preferences)
  userPreferences?: {
    transparencyLevel?: 'minimal' | 'standard' | 'detailed'
    agentVisibility?: boolean               // Show agent coordination
    processingSpeed?: 'fast' | 'thorough'  // Speed vs. quality preference
    communicationStyle?: 'professional_warm' | 'clinical_precise' | 'casual_supportive'
  }
  
  // Session Context
  isNewSession?: boolean                   // Force new conversation
  urgencyLevel?: 'normal' | 'elevated' | 'crisis'  // Manual priority override
}

/**
 * Response format for POST /api/chat
 * Lines 54-92 from API_CONTRACT.md
 */
export interface ChatResponse {
  // Primary Response Content
  content: string                          // Main therapeutic response (AI-generated)
  messageId: string                       // UUID for this specific message
  conversationId: string                  // UUID for conversation tracking
  
  // Agent Orchestration Data (null if transparency disabled)
  orchestration: AgentOrchestrationData | null
  
  // Response Metadata
  metadata: {
    timestamp: string                      // ISO 8601 timestamp
    processingTimeMs: number              // Total response time
    agentVersion: string                  // "facet-orchestrator-v2.0"
    responseConfidence: number            // 0.0-1.0 confidence score
    recommendedFollowUp: string[]         // Suggested next topics/actions
    warningFlags: string[]                // ["privacy_reminder", "crisis_protocol"]
    
    // User State Updates
    emotionalState?: {
      valence: number                     // -1.0 to 1.0 (negative to positive)
      arousal: number                     // 0.0 to 1.0 (calm to excited)
      dominance: number                   // 0.0 to 1.0 (submissive to dominant)
      confidence: number                  // 0.0 to 1.0 confidence in assessment
      primaryEmotion: string             // "anxiety", "sadness", "joy", etc.
      intensity: number                   // 0.0 to 1.0 intensity level
    }
    
    // Crisis Assessment
    riskAssessment?: {
      level: 'none' | 'low' | 'moderate' | 'high' | 'crisis'
      immediateInterventionRequired: boolean
      professionalReferralRecommended: boolean
      emergencyContactTriggered: boolean
      reasoning: string                   // Explanation of assessment
    }
    
    // Emergency Response
    emergencyResponse?: {
      emergencyDetected: boolean
      emergencyLevel?: 'low' | 'moderate' | 'high' | 'critical'
      incidentId?: string
      interventionsTriggered: string[]
      immediateActions: string[]
      professionalContactInfo?: {
        name: string
        phone: string
        serviceType: string
        available24_7: boolean
      }[]
    }
  }
}

/**
 * Agent Orchestration Transparency Data
 * Lines 95-125 from API_CONTRACT.md
 */
export interface AgentOrchestrationData {
  // High-Level Strategy
  strategy: string                        // Human-readable strategy description
  reasoning: string                       // Orchestrator's decision reasoning
  totalAgentsInvolved: number            // Count of agents used
  executionPattern: 'serial' | 'parallel' | 'hybrid' | 'crisis_priority'
  
  // Detailed Execution Plan
  executionPlan: ExecutionStep[]         // Step-by-step execution timeline
  agentResults: AgentExecutionResult[]   // Individual agent outputs
  
  // Performance Metrics
  timing: {
    planningTimeMs: number               // Time to plan execution
    coordinationOverheadMs: number       // Agent coordination overhead
    parallelExecutionTimeMs: number      // Time for parallel operations
    synthesisTimeMs: number              // Time to synthesize final response
    totalTimeMs: number                  // Complete processing time
  }
  
  // Quality Metrics
  confidence: {
    overall: number                      // 0.0-1.0 overall confidence
    agentAgreement: number              // 0.0-1.0 agent consensus level
    responseQuality: number             // 0.0-1.0 response quality score
  }
  
  // User Experience Data
  adaptations: string[]                  // ["increased_parallel_processing", "crisis_priority"]
  learnings: string[]                    // Insights about user patterns
}

/**
 * Individual Execution Step
 * Lines 128-146 from API_CONTRACT.md
 */
export interface ExecutionStep {
  stepId: string                         // Unique step identifier
  stepNumber: number                     // Sequential step number (1, 2, 3...)
  description: string                    // Human-readable step description
  
  // Agent Information
  agentsInvolved: string[]              // ["emotion_analyzer", "memory_manager"]
  executionType: 'parallel' | 'serial' | 'hybrid' | 'conditional' | 'crisis_priority' | 'cached_parallel'
  
  // Timing & Dependencies
  startTimeMs: number                   // Relative start time from request
  durationMs: number                    // Step duration
  dependencies: string[]                // Required previous step IDs
  
  // Status & Results
  status: 'completed' | 'running' | 'pending' | 'error' | 'skipped'
  errorMessage?: string                 // Error details if status = 'error'
  results?: any                         // Step-specific results
}

/**
 * Individual Agent Execution Result
 * Lines 149-179 from API_CONTRACT.md
 */
export interface AgentExecutionResult {
  // Agent Identity
  agentName: string                     // "emotion_analyzer", "crisis_monitor", etc.
  agentDisplayName: string              // "Emotion Analyzer", "Crisis Monitor"
  agentIcon: string                     // "😊", "🛡️", etc. for UI display
  
  // Task Information
  assignedTask: string                  // Specific task given to agent
  inputData: any                        // Data provided to agent (sanitized)
  
  // Execution Details
  executionTimeMs: number               // Individual agent execution time
  executionType: 'parallel' | 'serial' | 'priority' | 'cached_parallel'
  startTimeMs: number                   // Relative start time
  endTimeMs: number                     // Relative end time
  
  // Results & Quality
  result: any                           // Agent-specific result data
  confidence: number                    // 0.0-1.0 agent confidence
  success: boolean                      // Execution success/failure
  errorMessage?: string                 // Error details if success = false
  
  // Agent Reasoning (for transparency)
  reasoning?: string                    // Agent's reasoning process
  keyInsights?: string[]               // Important findings
  recommendationsToOrchestrator?: string[]  // Agent's recommendations
  
  // Contribution to Final Response
  influenceOnFinalResponse: number      // 0.0-1.0 how much this affected final response
  contributedInsights: string[]         // Specific insights used in final response
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

/**
 * WebSocket message types for real-time agent status updates
 * Lines 192-252 from API_CONTRACT.md
 */

// Sent from Backend to Frontend
export interface AgentStatusUpdate {
  type: 'agent_status_update'
  messageId: string                      // Associated message ID
  timestamp: string                      // ISO 8601 timestamp
  
  update: {
    overallStatus: 'planning' | 'executing' | 'synthesizing' | 'complete' | 'error'
    progressPercentage: number           // 0-100 overall progress
    currentPhase: string                // "Analyzing emotions", "Retrieving memories"
    estimatedTimeRemainingMs: number    // Best guess at remaining time
    
    // Individual Agent Statuses
    agentStatuses: {
      [agentName: string]: {
        status: 'pending' | 'running' | 'completed' | 'error'
        progressPercentage: number       // 0-100 for this agent
        currentTask: string             // "Analyzing emotional valence"
        startedAt?: string              // ISO 8601 timestamp
        estimatedCompletionMs?: number  // Estimated completion time
      }
    }
    
    // Execution Visualization Data
    executionTree: {
      currentStep: number               // Which execution step is active
      totalSteps: number               // Total planned steps
      parallelGroups: {                // Groups of agents running in parallel
        groupId: string
        agents: string[]
        status: 'pending' | 'running' | 'completed'
      }[]
    }
  }
}

// Error Status Update
export interface AgentErrorUpdate {
  type: 'agent_error'
  messageId: string
  timestamp: string
  
  error: {
    agentName?: string                  // Which agent failed (if specific)
    errorType: 'timeout' | 'api_error' | 'orchestration_error' | 'validation_error'
    errorMessage: string
    recoveryAction: 'retrying' | 'fallback_agent' | 'user_notification'
    affectsResponse: boolean           // Will this impact the final response?
  }
}

// Sent from Frontend to Backend
export interface AgentControlMessage {
  type: 'agent_control'
  messageId: string
  
  action: {
    type: 'cancel_processing' | 'change_speed_preference' | 'request_explanation'
    data?: any                          // Action-specific data
  }
}

// WebSocket Connection Messages
export interface WSConnectionRequest {
  type: 'auth'
  token: string                        // User authentication token
  preferences: {
    updateFrequency: 'high' | 'medium' | 'low'  // How often to send updates
    includeDetailedMetrics: boolean
  }
}

export interface WSConnectionConfirmed {
  type: 'connection_confirmed'
  connectionId: string
  capabilities: string[]               // ["agent_status", "error_reporting", "user_control"]
}

// ============================================================================
// USER PREFERENCES TYPES
// ============================================================================

/**
 * User Preferences Management
 * Lines 261-315 from API_CONTRACT.md
 */
export interface UserPreferences {
  userId: string
  
  // Transparency & Visualization Preferences
  transparency: {
    level: 'minimal' | 'standard' | 'detailed'
    showAgentReasoning: boolean
    showExecutionTimeline: boolean
    showConfidenceScores: boolean
    showAgentPersonalities: boolean
  }
  
  // Performance Preferences
  performance: {
    responseSpeed: 'fast' | 'balanced' | 'thorough'
    enableParallelProcessing: boolean
    maxWaitTimeSeconds: number          // User's patience threshold
  }
  
  // Communication Preferences
  communication: {
    style: 'professional_warm' | 'clinical_precise' | 'casual_supportive'
    verbosity: 'concise' | 'standard' | 'detailed'
    includeInsights: boolean            // Show personal insights in responses
    mentionAgentNames: boolean          // Reference specific agents by name
  }
  
  // Privacy & Data Preferences
  privacy: {
    enablePersonalization: boolean      // Allow agent learning
    shareAnonymousAnalytics: boolean
    dataRetentionDays: number          // How long to keep conversation data
    allowCrisisSharing: boolean        // Share crisis data with professionals
  }
  
  // Accessibility & UI Preferences
  accessibility: {
    reducedMotion: boolean             // Minimize animations
    highContrast: boolean
    largerText: boolean
    audioDescriptions: boolean         // For agent status updates
  }
  
  lastUpdated: string                  // ISO 8601 timestamp
}

export interface UpdatePreferencesRequest {
  preferences: Partial<UserPreferences>  // Only include fields to update
  reason?: string                        // Optional reason for tracking
}

// ============================================================================
// CONVERSATION HISTORY TYPES
// ============================================================================

/**
 * Conversation History & Analytics
 * Lines 324-397 from API_CONTRACT.md
 */
export interface ConversationQueryParams {
  limit?: number                        // Default: 20, Max: 100
  offset?: number                       // For pagination
  dateFrom?: string                     // ISO 8601 date
  dateTo?: string                       // ISO 8601 date
  includeAnalytics?: boolean           // Include agent performance data
  includeOrchestration?: boolean       // Include orchestration details
}

export interface ConversationHistoryResponse {
  conversations: ConversationSummary[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  analytics?: ConversationAnalytics    // If includeAnalytics=true
}

export interface ConversationSummary {
  conversationId: string
  startedAt: string                    // ISO 8601 timestamp
  lastMessageAt: string
  messageCount: number
  
  // Conversation Metadata
  topics: string[]                     // ["anxiety", "work_stress", "sleep"]
  emotionalJourney: {                 // Emotional progression through conversation
    start: { valence: number, arousal: number }
    end: { valence: number, arousal: number }
    progression: 'improved' | 'stable' | 'declined'
  }
  
  // Agent Usage Summary
  agentUsage: {
    [agentName: string]: {
      timesInvoked: number
      totalExecutionTimeMs: number
      averageConfidence: number
      keyContributions: string[]
    }
  }
  
  // Outcomes
  outcomes: {
    riskLevels: ('none' | 'low' | 'moderate' | 'high' | 'crisis')[]
    interventionsProvided: string[]     // Types of therapeutic interventions
    professionalReferralMade: boolean
    goalProgressMade: boolean
    userSatisfactionScore?: number      // 1-5 if provided
  }
}

export interface ConversationAnalytics {
  // Performance Analytics
  averageResponseTime: number
  agentEfficiencyScores: { [agentName: string]: number }
  orchestrationSuccessRate: number
  
  // Therapeutic Analytics
  emotionalProgressTrend: 'improving' | 'stable' | 'concerning'
  interventionEffectiveness: { [intervention: string]: number }
  goalAchievementRate: number
  
  // Usage Patterns
  mostActiveTimeOfDay: string
  averageSessionLength: number
  topDiscussionTopics: { topic: string, frequency: number }[]
}

// ============================================================================
// USER INSIGHTS TYPES
// ============================================================================

/**
 * Agent Insights & Personal Analytics
 * Lines 407-458 from API_CONTRACT.md
 */
export interface UserInsightsResponse {
  // Personal Patterns Discovered by Agents
  emotionalPatterns: {
    dominantEmotions: { emotion: string, frequency: number }[]
    triggerPatterns: { trigger: string, emotionalResponse: string }[]
    timeBasedPatterns: { timeOfDay: string, typicalMood: string }[]
    progressionTrends: {
      valence: { trend: 'improving' | 'stable' | 'declining', confidence: number }
      arousal: { trend: 'improving' | 'stable' | 'declining', confidence: number }
      dominance: { trend: 'improving' | 'stable' | 'declining', confidence: number }
    }
  }
  
  // Memory & Learning Insights
  memoryInsights: {
    significantEvents: { date: string, description: string, impact: number }[]
    copingStrategies: { strategy: string, effectiveness: number, usage: number }[]
    therapeuticGoals: { goal: string, progress: number, lastUpdated: string }[]
    personalStrengths: string[]
    growthAreas: string[]
  }
  
  // Agent Collaboration Insights
  agentEffectiveness: {
    [agentName: string]: {
      personalizedAccuracy: number      // How well this agent works for this user
      mostHelpfulInterventions: string[]
      responseRelevance: number         // 0.0-1.0 relevance to user needs
      userPreference: number           // 0.0-1.0 user satisfaction with this agent
    }
  }
  
  // Progress & Achievement Insights
  therapeuticProgress: {
    overallProgress: number             // 0.0-1.0 overall therapeutic progress
    specificAchievements: { achievement: string, date: string }[]
    milestoneProgress: { milestone: string, progress: number }[]
    areasOfImprovement: string[]
    recommendedFocus: string[]
  }
  
  // Predictive Insights
  predictions: {
    riskFactors: { factor: string, riskLevel: number, timeframe: string }[]
    successPredictors: { factor: string, probability: number }[]
    recommendedInterventions: { intervention: string, expectedBenefit: number }[]
  }
  
  generatedAt: string                  // ISO 8601 timestamp
  dataConfidence: number               // 0.0-1.0 confidence in insights
  minimumDataPoints: number            // How many interactions were analyzed
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

/**
 * Error Response Format
 * Lines 545-572 from API_CONTRACT.md
 */
export interface APIErrorResponse {
  error: {
    code: string                       // "ORCHESTRATION_TIMEOUT", "INVALID_MESSAGE"
    message: string                    // User-friendly error message
    details?: string                   // Technical details for debugging
    recoveryOptions?: string[]         // ["try_again", "simplify_message", "contact_support"]
    
    // Agent-Specific Error Context
    failedAgents?: string[]           // Which agents failed
    partialResults?: boolean          // Are partial results available?
    fallbackResponse?: string         // Emergency fallback response
  }
  
  metadata: {
    requestId: string
    timestamp: string
    errorSeverity: 'low' | 'medium' | 'high' | 'critical'
  }
}

// ============================================================================
// TESTING TYPES
// ============================================================================

/**
 * Mock Data Specifications for Testing
 * Lines 584-651 from API_CONTRACT.md
 */
export interface MockOrchestrationResponse {
  strategy: string
  agentResults: Partial<AgentExecutionResult>[]
  timing: { totalTimeMs: number }
}

export interface E2ETestScenario {
  name: string
  userMessage: string
  expectedResponse: {
    shouldContainAgents: string[]
    maxResponseTimeMs: number
    minConfidenceScore: number
    requiredMetadataFields: string[]
  }
  frontendValidation: {
    shouldShowAgentStatus: boolean
    shouldDisplayOrchestration: boolean
    shouldUpdateRealtime: boolean
  }
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Input Validation Rules
 * Lines 518-540 from API_CONTRACT.md
 */
export interface MessageValidation {
  message: {
    minLength: 1
    maxLength: 4000
    allowedCharacters: 'unicode + standard punctuation'
    prohibitedContent: ['self-harm instructions', 'illegal advice']
  }
  
  userPreferences: {
    transparencyLevel: ['minimal', 'standard', 'detailed']
    processingSpeed: ['fast', 'thorough']
    // All enum values strictly validated
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type WebSocketMessage = AgentStatusUpdate | AgentErrorUpdate | AgentControlMessage | WSConnectionRequest | WSConnectionConfirmed

export type APIResponse = ChatResponse | ConversationHistoryResponse | UserInsightsResponse | UserPreferences | APIErrorResponse

// HTTP Status Code Constants
export const HTTP_STATUS = {
  SUCCESS: 200,              // Successful orchestration with full response
  PARTIAL_SUCCESS: 206,      // Partial success (some agents failed but response generated)
  BAD_REQUEST: 400,          // Invalid request format or content
  TOO_MANY_REQUESTS: 429,    // Rate limiting (too many requests)
  INTERNAL_ERROR: 500,       // Critical orchestration failure
  SERVICE_UNAVAILABLE: 503   // Service temporarily unavailable (agent system down)
} as const

// Agent Name Constants (must match exactly)
export const AGENT_NAMES = {
  EMOTION_ANALYZER: 'emotion_analyzer',
  MEMORY_MANAGER: 'memory_manager',
  CRISIS_MONITOR: 'crisis_monitor',
  THERAPY_ADVISOR: 'therapy_advisor',
  PROGRESS_TRACKER: 'progress_tracker'
} as const

// Agent Display Names and Icons (must match exactly)
export const AGENT_CONFIG = {
  [AGENT_NAMES.EMOTION_ANALYZER]: {
    displayName: 'Emotion Analyzer',
    icon: '😊'
  },
  [AGENT_NAMES.MEMORY_MANAGER]: {
    displayName: 'Memory Manager',
    icon: '🧠'
  },
  [AGENT_NAMES.CRISIS_MONITOR]: {
    displayName: 'Crisis Monitor',
    icon: '🛡️'
  },
  [AGENT_NAMES.THERAPY_ADVISOR]: {
    displayName: 'Therapy Advisor',
    icon: '🎯'
  },
  [AGENT_NAMES.PROGRESS_TRACKER]: {
    displayName: 'Progress Tracker',
    icon: '📊'
  }
} as const