/**
 * FACET Multi-Agent Therapy System
 * Core types and interfaces for specialized therapeutic agents
 */

export interface AgentCapability {
  name: string;
  description: string;
  cultural_contexts: string[];
  intervention_types: string[];
  evidence_base: string[];
}

export interface AgentPersonality {
  communication_style: 'empathetic' | 'directive' | 'supportive' | 'analytical' | 'collaborative';
  cultural_sensitivity_level: 'high' | 'medium' | 'specialized';
  intervention_approach: 'proactive' | 'reactive' | 'balanced';
  preferred_modalities: string[];
}

export interface TherapeuticAgent {
  id: string;
  name: string;
  type: string;
  specialty: string;
  description: string;
  capabilities: AgentCapability[];
  personality: AgentPersonality;
  cultural_specializations: string[];
  intervention_triggers: string[];
  response_patterns: ResponsePattern[];
  ethical_guidelines: string[];
  collaboration_preferences: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResponsePattern {
  trigger_type: 'emotion' | 'behavior' | 'crisis' | 'progress' | 'cultural' | 'creative';
  trigger_keywords: string[];
  response_template: string;
  cultural_adaptations: CulturalAdaptation[];
  follow_up_actions: string[];
  escalation_conditions: string[];
}

export interface CulturalAdaptation {
  culture: string;
  adaptations: {
    language_style: string;
    cultural_references: string[];
    respect_protocols: string[];
    family_involvement: string;
    spiritual_considerations: string[];
  };
}

export interface AgentInteraction {
  id: string;
  session_id: string;
  agent_id: string;
  user_id: string;
  interaction_type: 'assessment' | 'intervention' | 'support' | 'crisis' | 'progress' | 'cultural';
  trigger: string;
  context: Record<string, any>;
  response: string;
  cultural_context?: string;
  effectiveness_score?: number;
  user_feedback?: 'helpful' | 'neutral' | 'unhelpful';
  follow_up_needed: boolean;
  escalation_required: boolean;
  timestamp: string;
}

export interface AgentCollaboration {
  primary_agent: string;
  supporting_agents: string[];
  collaboration_type: 'consultation' | 'handoff' | 'joint_intervention' | 'supervision';
  context: string;
  outcome: string;
  timestamp: string;
}

export interface CrisisAssessment {
  severity_level: 'low' | 'moderate' | 'high' | 'critical';
  risk_factors: string[];
  protective_factors: string[];
  immediate_actions: string[];
  follow_up_timeline: string;
  escalation_contacts: string[];
  safety_plan: string[];
}

export interface ProgressMetrics {
  agent_id: string;
  session_id: string;
  user_id: string;
  metrics: {
    engagement_score: number;
    therapeutic_alliance: number;
    goal_progress: number;
    symptom_reduction: number;
    cultural_resonance: number;
    intervention_effectiveness: number;
  };
  qualitative_notes: string[];
  recommended_adjustments: string[];
  timestamp: string;
}

export interface CulturalContent {
  id: string;
  culture: string;
  content_type: 'story' | 'proverb' | 'ritual' | 'metaphor' | 'practice' | 'value';
  title: string;
  content: string;
  therapeutic_applications: string[];
  context_notes: string;
  source: string;
  verified_by: string;
  tags: string[];
}

export interface AgentConfig {
  max_concurrent_sessions: number;
  response_time_target: number; // milliseconds
  escalation_thresholds: {
    crisis_keywords: string[];
    mood_deterioration_rate: number;
    session_abandonment_rate: number;
  };
  cultural_adaptation_settings: {
    auto_detect_culture: boolean;
    require_cultural_confirmation: boolean;
    fallback_to_general: boolean;
  };
  collaboration_rules: {
    required_consultations: string[];
    automatic_handoffs: Record<string, string>;
    supervision_frequency: string;
  };
}