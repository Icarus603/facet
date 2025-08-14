-- FACET Missing Tables Setup
-- Copy and paste this into Supabase SQL Editor

-- Journal Entries Table
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  title TEXT,
  content TEXT NOT NULL,
  emotions TEXT[] DEFAULT '{}',
  cultural_context JSONB,
  ai_insights JSONB,
  therapeutic_insights JSONB,
  emotions_expressed TEXT[] DEFAULT '{}',
  mood_before INTEGER,
  mood_after INTEGER,
  tags TEXT[] DEFAULT '{}',
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mood Entries Table
CREATE TABLE IF NOT EXISTS public.mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  mood_score INTEGER NOT NULL CHECK (mood_score >= 1 AND mood_score <= 10),
  anxiety_level INTEGER CHECK (anxiety_level >= 1 AND anxiety_level <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  emotions TEXT[] DEFAULT '{}',
  cultural_context JSONB,
  triggers TEXT[] DEFAULT '{}',
  notes TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Art Therapy Drawings Table
CREATE TABLE IF NOT EXISTS public.art_therapy_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  title TEXT,
  image_data TEXT NOT NULL,
  drawing_prompt TEXT,
  emotions_before TEXT[] DEFAULT '{}',
  emotions_after TEXT[] DEFAULT '{}',
  therapeutic_insights JSONB,
  cultural_elements JSONB,
  color_analysis JSONB,
  symbol_analysis JSONB,
  ai_analysis JSONB,
  tags TEXT[] DEFAULT '{}',
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Therapy Sessions Table (if not exists)
CREATE TABLE IF NOT EXISTS public.therapy_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'individual',
  primary_concern TEXT,
  cultural_context JSONB,
  session_goals TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  satisfaction_rating INTEGER,
  cultural_relevance_rating INTEGER,
  crisis_detected BOOLEAN DEFAULT false,
  agent_coordination_summary JSONB
);

-- Therapy Interactions Table (if not exists)
CREATE TABLE IF NOT EXISTS public.therapy_interactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id UUID NOT NULL REFERENCES public.therapy_sessions(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  agent_type TEXT,
  user_input TEXT,
  agent_response TEXT,
  cultural_content_used JSONB,
  emotional_analysis JSONB,
  processing_time_ms INTEGER,
  coordination_events JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Cultural Profiles Table (if not exists)
CREATE TABLE IF NOT EXISTS public.user_cultural_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_culture TEXT,
  secondary_cultures TEXT[] DEFAULT '{}',
  language_preferences TEXT[] DEFAULT '{}',
  religious_spiritual_background TEXT,
  generational_status TEXT,
  cultural_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON public.journal_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON public.mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_timestamp ON public.mood_entries(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_art_therapy_drawings_user_id ON public.art_therapy_drawings(user_id);
CREATE INDEX IF NOT EXISTS idx_art_therapy_drawings_created_at ON public.art_therapy_drawings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_therapy_sessions_user_id ON public.therapy_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_started_at ON public.therapy_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_therapy_interactions_session_id ON public.therapy_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_therapy_interactions_timestamp ON public.therapy_interactions(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_user_cultural_profiles_user_id ON public.user_cultural_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.art_therapy_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapy_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cultural_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journal_entries
DROP POLICY IF EXISTS "Users can manage their own journal entries" ON public.journal_entries;
CREATE POLICY "Users can manage their own journal entries" ON public.journal_entries
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for mood_entries
DROP POLICY IF EXISTS "Users can manage their own mood entries" ON public.mood_entries;
CREATE POLICY "Users can manage their own mood entries" ON public.mood_entries
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for art_therapy_drawings
DROP POLICY IF EXISTS "Users can manage their own art therapy drawings" ON public.art_therapy_drawings;
CREATE POLICY "Users can manage their own art therapy drawings" ON public.art_therapy_drawings
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for therapy_sessions
DROP POLICY IF EXISTS "Users can manage their own therapy sessions" ON public.therapy_sessions;
CREATE POLICY "Users can manage their own therapy sessions" ON public.therapy_sessions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for therapy_interactions
DROP POLICY IF EXISTS "Users can manage their own therapy interactions" ON public.therapy_interactions;
CREATE POLICY "Users can manage their own therapy interactions" ON public.therapy_interactions
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM public.therapy_sessions WHERE id = session_id
  ));

-- RLS Policies for user_cultural_profiles
DROP POLICY IF EXISTS "Users can manage their own cultural profiles" ON public.user_cultural_profiles;
CREATE POLICY "Users can manage their own cultural profiles" ON public.user_cultural_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON public.journal_entries;
DROP TRIGGER IF EXISTS update_art_therapy_drawings_updated_at ON public.art_therapy_drawings;

CREATE TRIGGER update_journal_entries_updated_at 
  BEFORE UPDATE ON public.journal_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_art_therapy_drawings_updated_at 
  BEFORE UPDATE ON public.art_therapy_drawings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();