-- FACET Database Schema
-- Mental Health Management System
-- Based on SPECS.md requirements

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create enum types
CREATE TYPE workflow_mode AS ENUM ('light', 'standard', 'crisis', 'deep');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'interrupted');
CREATE TYPE risk_level AS ENUM ('minimal', 'mild', 'moderate', 'severe', 'extreme');
CREATE TYPE agent_type AS ENUM ('smart_router', 'emotion_analyzer', 'crisis_assessor', 'therapeutic_advisor');
CREATE TYPE message_type AS ENUM ('user', 'agent', 'system');
CREATE TYPE goal_status AS ENUM ('active', 'completed', 'paused', 'archived');
CREATE TYPE intervention_status AS ENUM ('assigned', 'in_progress', 'completed', 'skipped');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Profile information
  display_name TEXT,
  date_of_birth DATE,
  timezone TEXT DEFAULT 'UTC',
  language_preference TEXT DEFAULT 'en',
  
  -- Settings
  privacy_settings JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{}',
  emergency_contacts JSONB DEFAULT '[]'
);

-- Mental health profiles
CREATE TABLE public.user_mental_health_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Initial assessment
  initial_assessment_completed BOOLEAN DEFAULT FALSE,
  primary_concerns TEXT[],
  therapy_experience TEXT,
  medication_status TEXT,
  support_network_strength INTEGER CHECK (support_network_strength BETWEEN 1 AND 10),
  
  -- Current state
  current_stressors TEXT[],
  coping_strategies TEXT[],
  therapeutic_goals TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Therapy sessions
CREATE TABLE public.therapy_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  session_type workflow_mode NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Session context
  primary_emotion TEXT,
  emotion_intensity INTEGER CHECK (emotion_intensity BETWEEN 0 AND 10),
  risk_level risk_level DEFAULT 'minimal',
  workflow_used workflow_mode,
  
  -- Outcomes
  user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
  therapeutic_progress INTEGER CHECK (therapeutic_progress BETWEEN 1 AND 10),
  follow_up_needed BOOLEAN DEFAULT FALSE,
  follow_up_scheduled_for TIMESTAMP WITH TIME ZONE,
  
  session_summary TEXT,
  therapist_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation messages
CREATE TABLE public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.therapy_sessions(id) ON DELETE CASCADE,
  
  message_type message_type NOT NULL,
  content TEXT NOT NULL,
  
  -- Agent information (for agent messages)
  agent_type agent_type,
  workflow_mode workflow_mode,
  response_time_ms INTEGER,
  
  -- Analysis results
  emotion_analysis JSONB,
  crisis_assessment JSONB,
  therapeutic_interventions JSONB,
  
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Privacy & compliance
  encrypted_content TEXT,
  retention_expires_at TIMESTAMP WITH TIME ZONE
);

-- Emotion tracking
CREATE TABLE public.emotion_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.therapy_sessions(id),
  
  -- Emotion data
  primary_emotion TEXT NOT NULL,
  emotion_intensity INTEGER NOT NULL CHECK (emotion_intensity BETWEEN 0 AND 10),
  emotion_vector DECIMAL(3,2)[] NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  
  -- Context
  triggers TEXT[],
  contextual_factors TEXT[],
  user_reported_emotion TEXT,
  
  -- Metadata
  detection_method TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mood patterns
CREATE TABLE public.mood_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  date_recorded DATE NOT NULL,
  avg_mood_score DECIMAL(3,2) NOT NULL,
  mood_variance DECIMAL(3,2) NOT NULL,
  
  dominant_emotions TEXT[],
  significant_events TEXT[],
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
  
  -- Computed insights
  mood_trend TEXT CHECK (mood_trend IN ('improving', 'stable', 'declining')),
  risk_factors TEXT[],
  protective_factors TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, date_recorded)
);

-- Crisis assessments
CREATE TABLE public.crisis_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.therapy_sessions(id),
  
  -- Risk assessment
  risk_level risk_level NOT NULL,
  suicide_risk_score INTEGER NOT NULL CHECK (suicide_risk_score BETWEEN 0 AND 10),
  self_harm_risk_score INTEGER NOT NULL CHECK (self_harm_risk_score BETWEEN 0 AND 10),
  
  -- Risk factors
  identified_risk_factors JSONB NOT NULL,
  protective_factors JSONB NOT NULL,
  
  -- Intervention
  immediate_intervention_needed BOOLEAN NOT NULL,
  emergency_services_contacted BOOLEAN DEFAULT FALSE,
  emergency_contacts_notified BOOLEAN DEFAULT FALSE,
  
  -- Follow-up
  safety_plan_created BOOLEAN DEFAULT FALSE,
  safety_plan JSONB,
  professional_referral_made BOOLEAN DEFAULT FALSE,
  follow_up_scheduled BOOLEAN DEFAULT FALSE,
  
  -- Assessment metadata
  assessment_method TEXT NOT NULL,
  assessor_confidence DECIMAL(3,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Compliance and audit
  reviewed_by_professional BOOLEAN DEFAULT FALSE,
  professional_reviewer_id UUID,
  review_notes TEXT
);

-- Safety plans
CREATE TABLE public.safety_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Warning signs
  warning_signs TEXT[] NOT NULL,
  triggers TEXT[] NOT NULL,
  
  -- Coping strategies
  internal_coping_strategies TEXT[] NOT NULL,
  social_supports JSONB NOT NULL,
  professional_contacts JSONB NOT NULL,
  
  -- Environmental safety
  means_restriction_plan TEXT,
  safe_environment_steps TEXT[],
  
  -- Plan status
  is_active BOOLEAN DEFAULT TRUE,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Therapeutic goals
CREATE TABLE public.therapeutic_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  goal_title TEXT NOT NULL,
  goal_description TEXT NOT NULL,
  goal_category TEXT NOT NULL CHECK (goal_category IN ('emotional', 'behavioral', 'cognitive', 'relational')),
  
  -- Progress tracking
  target_completion_date DATE,
  current_progress INTEGER DEFAULT 0 CHECK (current_progress BETWEEN 0 AND 100),
  success_metrics JSONB,
  
  -- Status
  status goal_status DEFAULT 'active',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Therapeutic interventions
CREATE TABLE public.therapeutic_interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.therapy_sessions(id),
  
  intervention_type TEXT NOT NULL,
  intervention_name TEXT NOT NULL,
  intervention_description TEXT NOT NULL,
  
  -- Implementation
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_status intervention_status DEFAULT 'assigned',
  
  -- Effectiveness
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  effectiveness_notes TEXT,
  
  -- Follow-up
  repeat_recommended BOOLEAN DEFAULT FALSE,
  next_intervention_suggested TEXT
);

-- Progress measurements
CREATE TABLE public.progress_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  measurement_type TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  
  -- Context
  measurement_date DATE NOT NULL,
  notes TEXT,
  measured_by TEXT DEFAULT 'self_report',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, measurement_type, measurement_date)
);

-- Indexes for performance
CREATE INDEX idx_therapy_sessions_user_id ON public.therapy_sessions(user_id);
CREATE INDEX idx_therapy_sessions_started_at ON public.therapy_sessions(started_at);
CREATE INDEX idx_conversation_messages_session_id ON public.conversation_messages(session_id);
CREATE INDEX idx_conversation_messages_timestamp ON public.conversation_messages(timestamp);
CREATE INDEX idx_emotion_tracking_user_id ON public.emotion_tracking(user_id);
CREATE INDEX idx_emotion_tracking_recorded_at ON public.emotion_tracking(recorded_at);
CREATE INDEX idx_crisis_assessments_user_id ON public.crisis_assessments(user_id);
CREATE INDEX idx_crisis_assessments_risk_level ON public.crisis_assessments(risk_level);
CREATE INDEX idx_mood_patterns_user_date ON public.mood_patterns(user_id, date_recorded);

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mental_health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapeutic_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapeutic_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_measurements ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own mental health profile" ON public.user_mental_health_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own therapy sessions" ON public.therapy_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own conversation messages" ON public.conversation_messages
  FOR ALL USING (auth.uid() = (SELECT user_id FROM public.therapy_sessions WHERE id = session_id));

CREATE POLICY "Users can view own emotion tracking" ON public.emotion_tracking
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own mood patterns" ON public.mood_patterns
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own crisis assessments" ON public.crisis_assessments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own safety plans" ON public.safety_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own therapeutic goals" ON public.therapeutic_goals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own therapeutic interventions" ON public.therapeutic_interventions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own progress measurements" ON public.progress_measurements
  FOR ALL USING (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mental_health_profiles_updated_at BEFORE UPDATE ON public.user_mental_health_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_plans_updated_at BEFORE UPDATE ON public.safety_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_therapeutic_goals_updated_at BEFORE UPDATE ON public.therapeutic_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();