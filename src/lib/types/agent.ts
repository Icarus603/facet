/**
 * FACET 4-Agent Architecture Types
 * Core type definitions for the multi-agent therapy system
 */

// Agent Types - 4 Core Agents
export type AgentType = 'smart_router' | 'emotion_analyzer' | 'crisis_assessor' | 'therapeutic_advisor';

// Workflow Modes - Performance Requirements
export type WorkflowMode = 'light' | 'standard' | 'crisis' | 'deep';

// Performance Requirements (from SPECS.md)
export interface WorkflowPerformance {
  light: { maxResponseTime: 1000 };    // <1s
  standard: { maxResponseTime: 3000 }; // <3s  
  crisis: { maxResponseTime: 2000 };   // <2s
  deep: { maxResponseTime: 8000 };     // <8s
}

// Emotion Analysis Types
export interface EmotionAnalysis {
  primaryEmotion: string;
  intensity: number; // 0-100
  valence: number;   // -100 to 100 (negative to positive)
  arousal: number;   // 0-100 (calm to excited)
  confidence: number; // 0-100
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    anxiety: number;
    depression: number;
  };
  linguisticMarkers: string[];
  emotionalTrend: 'improving' | 'stable' | 'declining';
}

// Crisis Assessment Types
export interface CrisisAssessment {
  riskLevel: 'none' | 'low' | 'moderate' | 'high' | 'severe';
  urgency: 'immediate' | 'urgent' | 'moderate' | 'low';
  confidence: number; // 0-100
  triggers: string[];
  protectiveFactors: string[];
  riskFactors: string[];
  immediateActions: string[];
  followUpRequired: boolean;
  escalationPath: string[];
}

// Message Types
export interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'agent';
  agentType?: AgentType;
  metadata?: {
    emotionAnalysis?: EmotionAnalysis;
    crisisAssessment?: CrisisAssessment;
    workflowMode?: WorkflowMode;
    processingTime?: number;
    interventions?: string[];
    recommendations?: string[];
    confidence?: number;
  };
}

// Agent Response Interface
export interface AgentResponse {
  agentType: AgentType;
  content: string;
  confidence: number;
  processingTime: number;
  metadata: {
    reasoning?: string;
    interventions?: string[];
    recommendations?: string[];
    followUpActions?: string[];
    error?: string;
    urgency?: 'immediate' | 'urgent' | 'moderate' | 'low';
  };
}

// Routing Decision
export interface RoutingDecision {
  selectedAgent: AgentType;
  workflowMode: WorkflowMode;
  confidence: number;
  reasoning: string;
  urgency: 'immediate' | 'urgent' | 'moderate' | 'low';
  context: {
    emotionalState?: EmotionAnalysis;
    crisisLevel?: CrisisAssessment;
    therapeuticGoals?: string[];
  };
}

// Memory Types
export interface MemoryEntry {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  type: 'conversation' | 'insight' | 'progress' | 'crisis' | 'goal';
  emotionalContext: EmotionAnalysis;
  importance: number; // 0-100
  tags: string[];
  vectorEmbedding?: number[];
}

// User Context
export interface UserContext {
  userId: string;
  sessionId: string;
  emotionalHistory: EmotionAnalysis[];
  recentMemories: MemoryEntry[];
  activeGoals: string[];
  crisisHistory: CrisisAssessment[];
  culturalProfile?: {
    primaryCulture: string;
    languages: string[];
    culturalValues: string[];
    therapyPreferences: string[];
  };
}

// Agent Configuration
export interface AgentConfig {
  type: AgentType;
  enabled: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  fallbackAgent?: AgentType;
}

// Workflow Configuration
export interface WorkflowConfig {
  mode: WorkflowMode;
  maxProcessingTime: number;
  requiredAgents: AgentType[];
  parallelProcessing: boolean;
  crisisOverride: boolean;
}

// Session Types
export interface TherapySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'interrupted';
  messages: Message[];
  emotionalJourney: EmotionAnalysis[];
  crisisEvents: CrisisAssessment[];
  interventions: string[];
  outcomes: string[];
  workflowModes: WorkflowMode[];
}

// Error Types
export interface AgentError {
  agentType: AgentType;
  errorType: 'timeout' | 'model_error' | 'validation_error' | 'system_error';
  message: string;
  timestamp: Date;
  context?: any;
}

// Performance Metrics
export interface PerformanceMetrics {
  agentType: AgentType;
  responseTime: number;
  accuracy: number;
  userSatisfaction?: number;
  interventionSuccess?: number;
  timestamp: Date;
}