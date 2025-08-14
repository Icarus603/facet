/**
 * FACET Analytics & Visualization Types
 * Advanced data visualization types for therapy progress tracking
 */

import { AgentType } from './chat';

// ============================================================================
// PROGRESS TRACKING TYPES
// ============================================================================

export interface ProgressMetric {
  date: string;
  mood_score: number;
  anxiety_level: number;
  cultural_integration: number;
  therapeutic_alliance: number;
  session_satisfaction?: number;
  sleep_quality?: number;
  coping_skills?: number;
}

export interface CulturalProfile {
  ethnicity: string[];
  languages: string[];
  traditions: string[];
  values: string[];
  beliefs: string[];
  familyStructure: string;
  collectivismScore: number; // 0-100
  powerDistanceScore: number; // 0-100
  uncertaintyAvoidanceScore: number; // 0-100
  masculinityScore: number; // 0-100
  longTermOrientationScore: number; // 0-100
  indulgenceScore: number; // 0-100
}

export interface SessionData {
  session_id: string;
  date: string;
  duration: number;
  satisfaction_rating: number;
  agents_involved: AgentType[];
  cultural_content_used: string[];
  mood_before: number;
  mood_after: number;
  key_insights: string[];
  breakthrough_moments?: string[];
  challenges_identified?: string[];
  homework_assigned?: string[];
  crisis_indicators?: CrisisIndicator[];
}

export interface CulturalMetric {
  cultural_theme: string;
  relevance_score: number;
  usage_frequency: number;
  user_feedback: number;
  expert_validation: boolean;
  effectiveness_rating: number;
  bias_score: number;
  cultural_dimensions: {
    collectivism: number;
    powerDistance: number;
    uncertaintyAvoidance: number;
    masculinity: number;
    longTermOrientation: number;
    indulgence: number;
  };
}

// ============================================================================
// AGENT COORDINATION TYPES
// ============================================================================

export interface AgentStatus {
  agent_id: string;
  agent_type: AgentType;
  status: 'active' | 'thinking' | 'coordinating' | 'idle' | 'error';
  current_task: string;
  response_time: number;
  confidence_level: number;
  load_percentage: number;
  last_active: string;
  session_count: number;
  error_rate: number;
  uptime_percentage: number;
}

export interface AgentCoordinationFlow {
  coordination_id: string;
  session_id: string;
  timestamp: string;
  initiating_agent: AgentType;
  involved_agents: AgentType[];
  coordination_type: 'handoff' | 'collaboration' | 'escalation' | 'consultation';
  reason: string;
  duration_ms: number;
  success: boolean;
  cultural_context_preserved: boolean;
  user_satisfaction_impact: number;
}

export interface AgentPerformanceMetric {
  agent_type: AgentType;
  response_time_avg: number;
  response_time_p95: number;
  success_rate: number;
  user_satisfaction: number;
  cultural_accuracy: number;
  coordination_efficiency: number;
  error_count: number;
  uptime_percentage: number;
  cost_per_session: number;
  tokens_used: number;
  sessions_handled: number;
  date: string;
}

// ============================================================================
// CRISIS MANAGEMENT TYPES
// ============================================================================

export interface CrisisIndicator {
  type: 'verbal' | 'behavioral' | 'contextual' | 'historical';
  indicator: string;
  severity: number; // 0-100
  confidence: number; // 0-100
  detected_at: string;
  agent_id: string;
  cultural_context?: string;
}

export interface CrisisAlert {
  alert_id: string;
  session_id: string;
  risk_level: 'low' | 'medium' | 'high' | 'imminent';
  detected_indicators: CrisisIndicator[];
  recommended_actions: string[];
  emergency_contacts: EmergencyContact[];
  safety_plan: SafetyPlan;
  cultural_considerations: string[];
  escalation_path: string[];
  triggered_at: string;
  resolved_at?: string;
  resolution_method?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  is_primary: boolean;
  cultural_notes?: string;
  availability?: {
    timezone: string;
    preferred_hours: string;
    language: string;
  };
}

export interface SafetyPlan {
  id: string;
  user_id: string;
  warning_signs: string[];
  coping_strategies: CopingStrategy[];
  support_network: EmergencyContact[];
  professional_contacts: EmergencyContact[];
  safe_environment_steps: string[];
  crisis_resources: CrisisResource[];
  cultural_coping_mechanisms: string[];
  last_updated: string;
}

export interface CopingStrategy {
  id: string;
  strategy: string;
  effectiveness_rating: number;
  cultural_relevance: number;
  accessibility: 'immediate' | 'requires_preparation' | 'requires_assistance';
  type: 'grounding' | 'distraction' | 'self_soothing' | 'connection' | 'physical' | 'spiritual';
}

export interface CrisisResource {
  id: string;
  name: string;
  type: 'hotline' | 'text_service' | 'app' | 'website' | 'in_person';
  contact_info: string;
  availability: string;
  languages_supported: string[];
  cultural_specialization?: string[];
  cost: 'free' | 'insurance' | 'paid';
}

// ============================================================================
// VISUALIZATION COMPONENT PROPS
// ============================================================================

export interface ProgressChartProps {
  data: ProgressMetric[];
  timeRange: '7d' | '30d' | '90d' | '1y';
  culturalContext?: CulturalProfile;
  showPredictions?: boolean;
  className?: string;
  onDataPointClick?: (data: ProgressMetric) => void;
}

export interface SessionHistoryVisualizationProps {
  sessions: SessionData[];
  timeRange: '7d' | '30d' | '90d' | '1y';
  filterBy?: {
    agents?: AgentType[];
    satisfaction_min?: number;
    cultural_themes?: string[];
  };
  className?: string;
  onSessionClick?: (session: SessionData) => void;
}

export interface CulturalIntegrationMetricsProps {
  metrics: CulturalMetric[];
  culturalProfile: CulturalProfile;
  showBiasDetection?: boolean;
  className?: string;
  onMetricClick?: (metric: CulturalMetric) => void;
}

export interface AgentActivityVisualizationProps {
  agentStatuses: AgentStatus[];
  coordinationFlows: AgentCoordinationFlow[];
  performanceMetrics: AgentPerformanceMetric[];
  updateInterval?: number;
  className?: string;
  onAgentClick?: (agent: AgentStatus) => void;
}

export interface CrisisAlertInterfaceProps {
  activeAlerts: CrisisAlert[];
  alertHistory: CrisisAlert[];
  safetyPlan: SafetyPlan;
  className?: string;
  onAlertAction?: (alertId: string, action: string) => void;
  onEmergencyContact?: (contact: EmergencyContact) => void;
}

export interface SafetyPlanBuilderProps {
  safetyPlan: SafetyPlan;
  culturalProfile: CulturalProfile;
  onUpdate: (safetyPlan: Partial<SafetyPlan>) => void;
  className?: string;
  readOnly?: boolean;
}

// ============================================================================
// CHART CONFIGURATION TYPES
// ============================================================================

export interface ChartTheme {
  colors: {
    mood: string;
    anxiety: string;
    cultural: string;
    alliance: string;
    crisis: string;
    success: string;
    warning: string;
    error: string;
  };
  gradients: {
    progress: string[];
    alert: string[];
    cultural: string[];
  };
  accessibility: {
    highContrast: boolean;
    colorBlindSafe: boolean;
    patterns: boolean;
  };
}

export interface AnimationConfig {
  duration: number;
  easing: string;
  stagger: number;
  enabled: boolean;
}

export interface ResponsiveConfig {
  mobile: {
    height: number;
    showLegend: boolean;
    simplifyData: boolean;
  };
  tablet: {
    height: number;
    showLegend: boolean;
    simplifyData: boolean;
  };
  desktop: {
    height: number;
    showLegend: boolean;
    simplifyData: boolean;
  };
}

// ============================================================================
// ANALYTICS AGGREGATION TYPES
// ============================================================================

export interface TherapyAnalytics {
  overview: {
    total_sessions: number;
    avg_session_duration: number;
    overall_progress_trend: 'improving' | 'stable' | 'declining';
    cultural_integration_score: number;
    crisis_incidents: number;
    agent_coordination_efficiency: number;
  };
  progress_trends: ProgressMetric[];
  session_analytics: SessionData[];
  cultural_metrics: CulturalMetric[];
  agent_performance: AgentPerformanceMetric[];
  crisis_history: CrisisAlert[];
  user_engagement: {
    daily_usage: Array<{ date: string; sessions: number; duration: number }>;
    feature_usage: Array<{ feature: string; usage_count: number; effectiveness: number }>;
    satisfaction_trends: Array<{ date: string; rating: number; feedback: string[] }>;
  };
}

export interface DashboardMetrics {
  realtime: {
    active_sessions: number;
    agents_online: number;
    current_response_time: number;
    crisis_alerts: number;
  };
  daily: {
    sessions_completed: number;
    user_satisfaction_avg: number;
    cultural_content_effectiveness: number;
    coordination_success_rate: number;
  };
  trends: {
    user_progress: 'up' | 'down' | 'stable';
    system_performance: 'up' | 'down' | 'stable';
    cultural_integration: 'up' | 'down' | 'stable';
  };
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface ExportConfig {
  format: 'pdf' | 'csv' | 'json' | 'png';
  dateRange: { start: string; end: string };
  includePersonalData: boolean;
  includeCulturalData: boolean;
  includeProgressData: boolean;
  includeSessionData: boolean;
  anonymize: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  culturalConsiderations: boolean;
  complianceLevel: 'HIPAA' | 'GDPR' | 'CCPA';
  generateFrequency: 'weekly' | 'monthly' | 'quarterly';
}