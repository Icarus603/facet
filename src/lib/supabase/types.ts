export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          display_name: string | null
          date_of_birth: string | null
          timezone: string
          language_preference: string
          privacy_settings: Json
          notification_preferences: Json
          emergency_contacts: Json
        }
        Insert: {
          id: string
          email: string
          created_at?: string
          updated_at?: string
          display_name?: string | null
          date_of_birth?: string | null
          timezone?: string
          language_preference?: string
          privacy_settings?: Json
          notification_preferences?: Json
          emergency_contacts?: Json
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          display_name?: string | null
          date_of_birth?: string | null
          timezone?: string
          language_preference?: string
          privacy_settings?: Json
          notification_preferences?: Json
          emergency_contacts?: Json
        }
      }
      user_mental_health_profiles: {
        Row: {
          id: string
          user_id: string
          initial_assessment_completed: boolean
          primary_concerns: string[] | null
          therapy_experience: string | null
          medication_status: string | null
          support_network_strength: number | null
          current_stressors: string[] | null
          coping_strategies: string[] | null
          therapeutic_goals: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          initial_assessment_completed?: boolean
          primary_concerns?: string[] | null
          therapy_experience?: string | null
          medication_status?: string | null
          support_network_strength?: number | null
          current_stressors?: string[] | null
          coping_strategies?: string[] | null
          therapeutic_goals?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          initial_assessment_completed?: boolean
          primary_concerns?: string[] | null
          therapy_experience?: string | null
          medication_status?: string | null
          support_network_strength?: number | null
          current_stressors?: string[] | null
          coping_strategies?: string[] | null
          therapeutic_goals?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      therapy_sessions: {
        Row: {
          id: string
          user_id: string
          session_type: Database['public']['Enums']['workflow_mode']
          started_at: string
          ended_at: string | null
          duration_seconds: number | null
          primary_emotion: string | null
          emotion_intensity: number | null
          risk_level: Database['public']['Enums']['risk_level']
          workflow_used: Database['public']['Enums']['workflow_mode'] | null
          user_satisfaction: number | null
          therapeutic_progress: number | null
          follow_up_needed: boolean
          follow_up_scheduled_for: string | null
          session_summary: string | null
          therapist_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_type: Database['public']['Enums']['workflow_mode']
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          primary_emotion?: string | null
          emotion_intensity?: number | null
          risk_level?: Database['public']['Enums']['risk_level']
          workflow_used?: Database['public']['Enums']['workflow_mode'] | null
          user_satisfaction?: number | null
          therapeutic_progress?: number | null
          follow_up_needed?: boolean
          follow_up_scheduled_for?: string | null
          session_summary?: string | null
          therapist_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_type?: Database['public']['Enums']['workflow_mode']
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          primary_emotion?: string | null
          emotion_intensity?: number | null
          risk_level?: Database['public']['Enums']['risk_level']
          workflow_used?: Database['public']['Enums']['workflow_mode'] | null
          user_satisfaction?: number | null
          therapeutic_progress?: number | null
          follow_up_needed?: boolean
          follow_up_scheduled_for?: string | null
          session_summary?: string | null
          therapist_notes?: string | null
          created_at?: string
        }
      }
      conversation_messages: {
        Row: {
          id: string
          session_id: string
          message_type: Database['public']['Enums']['message_type']
          content: string
          agent_type: Database['public']['Enums']['agent_type'] | null
          workflow_mode: Database['public']['Enums']['workflow_mode'] | null
          response_time_ms: number | null
          emotion_analysis: Json | null
          crisis_assessment: Json | null
          therapeutic_interventions: Json | null
          timestamp: string
          encrypted_content: string | null
          retention_expires_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          message_type: Database['public']['Enums']['message_type']
          content: string
          agent_type?: Database['public']['Enums']['agent_type'] | null
          workflow_mode?: Database['public']['Enums']['workflow_mode'] | null
          response_time_ms?: number | null
          emotion_analysis?: Json | null
          crisis_assessment?: Json | null
          therapeutic_interventions?: Json | null
          timestamp?: string
          encrypted_content?: string | null
          retention_expires_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          message_type?: Database['public']['Enums']['message_type']
          content?: string
          agent_type?: Database['public']['Enums']['agent_type'] | null
          workflow_mode?: Database['public']['Enums']['workflow_mode'] | null
          response_time_ms?: number | null
          emotion_analysis?: Json | null
          crisis_assessment?: Json | null
          therapeutic_interventions?: Json | null
          timestamp?: string
          encrypted_content?: string | null
          retention_expires_at?: string | null
        }
      }
      emotion_tracking: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          primary_emotion: string
          emotion_intensity: number
          emotion_vector: number[]
          confidence_score: number
          triggers: string[] | null
          contextual_factors: string[] | null
          user_reported_emotion: string | null
          detection_method: string
          recorded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          primary_emotion: string
          emotion_intensity: number
          emotion_vector: number[]
          confidence_score: number
          triggers?: string[] | null
          contextual_factors?: string[] | null
          user_reported_emotion?: string | null
          detection_method: string
          recorded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          primary_emotion?: string
          emotion_intensity?: number
          emotion_vector?: number[]
          confidence_score?: number
          triggers?: string[] | null
          contextual_factors?: string[] | null
          user_reported_emotion?: string | null
          detection_method?: string
          recorded_at?: string
        }
      }
      crisis_assessments: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          risk_level: Database['public']['Enums']['risk_level']
          suicide_risk_score: number
          self_harm_risk_score: number
          identified_risk_factors: Json
          protective_factors: Json
          immediate_intervention_needed: boolean
          emergency_services_contacted: boolean
          emergency_contacts_notified: boolean
          safety_plan_created: boolean
          safety_plan: Json | null
          professional_referral_made: boolean
          follow_up_scheduled: boolean
          assessment_method: string
          assessor_confidence: number
          created_at: string
          reviewed_by_professional: boolean
          professional_reviewer_id: string | null
          review_notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          risk_level: Database['public']['Enums']['risk_level']
          suicide_risk_score: number
          self_harm_risk_score: number
          identified_risk_factors: Json
          protective_factors: Json
          immediate_intervention_needed: boolean
          emergency_services_contacted?: boolean
          emergency_contacts_notified?: boolean
          safety_plan_created?: boolean
          safety_plan?: Json | null
          professional_referral_made?: boolean
          follow_up_scheduled?: boolean
          assessment_method: string
          assessor_confidence: number
          created_at?: string
          reviewed_by_professional?: boolean
          professional_reviewer_id?: string | null
          review_notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          risk_level?: Database['public']['Enums']['risk_level']
          suicide_risk_score?: number
          self_harm_risk_score?: number
          identified_risk_factors?: Json
          protective_factors?: Json
          immediate_intervention_needed?: boolean
          emergency_services_contacted?: boolean
          emergency_contacts_notified?: boolean
          safety_plan_created?: boolean
          safety_plan?: Json | null
          professional_referral_made?: boolean
          follow_up_scheduled?: boolean
          assessment_method?: string
          assessor_confidence?: number
          created_at?: string
          reviewed_by_professional?: boolean
          professional_reviewer_id?: string | null
          review_notes?: string | null
        }
      }
      safety_plans: {
        Row: {
          id: string
          user_id: string
          warning_signs: string[]
          triggers: string[]
          internal_coping_strategies: string[]
          social_supports: Json
          professional_contacts: Json
          means_restriction_plan: string | null
          safe_environment_steps: string[] | null
          is_active: boolean
          last_reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          warning_signs: string[]
          triggers: string[]
          internal_coping_strategies: string[]
          social_supports: Json
          professional_contacts: Json
          means_restriction_plan?: string | null
          safe_environment_steps?: string[] | null
          is_active?: boolean
          last_reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          warning_signs?: string[]
          triggers?: string[]
          internal_coping_strategies?: string[]
          social_supports?: Json
          professional_contacts?: Json
          means_restriction_plan?: string | null
          safe_environment_steps?: string[] | null
          is_active?: boolean
          last_reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      therapeutic_goals: {
        Row: {
          id: string
          user_id: string
          goal_title: string
          goal_description: string
          goal_category: string
          target_completion_date: string | null
          current_progress: number
          success_metrics: Json | null
          status: Database['public']['Enums']['goal_status']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_title: string
          goal_description: string
          goal_category: string
          target_completion_date?: string | null
          current_progress?: number
          success_metrics?: Json | null
          status?: Database['public']['Enums']['goal_status']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_title?: string
          goal_description?: string
          goal_category?: string
          target_completion_date?: string | null
          current_progress?: number
          success_metrics?: Json | null
          status?: Database['public']['Enums']['goal_status']
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      workflow_mode: 'light' | 'standard' | 'crisis' | 'deep'
      session_status: 'active' | 'completed' | 'interrupted'
      risk_level: 'minimal' | 'mild' | 'moderate' | 'severe' | 'extreme'
      agent_type: 'smart_router' | 'emotion_analyzer' | 'crisis_assessor' | 'therapeutic_advisor'
      message_type: 'user' | 'agent' | 'system'
      goal_status: 'active' | 'completed' | 'paused' | 'archived'
      intervention_status: 'assigned' | 'in_progress' | 'completed' | 'skipped'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}