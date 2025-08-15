-- Memory System Schema for FACET
-- Supports vector-based memory storage with Pinecone integration
-- Phase 2: Enhanced Multi-Agent System

-- Create memory-related enum types
CREATE TYPE memory_type AS ENUM ('event', 'insight', 'pattern', 'preference', 'goal', 'crisis');
CREATE TYPE sensitivity_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Memory entries table (backup and metadata for Pinecone vectors)
CREATE TABLE public.memory_entries (
  id TEXT PRIMARY KEY, -- Matches Pinecone vector ID format: "memory_{userId}_{timestamp}"
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  memory_type memory_type NOT NULL,
  
  -- Importance and context
  importance DECIMAL(3,2) NOT NULL CHECK (importance BETWEEN 0.0 AND 1.0),
  emotional_valence DECIMAL(3,2) NOT NULL CHECK (emotional_valence BETWEEN -1.0 AND 1.0),
  
  -- Categorization
  categories TEXT[] DEFAULT '{}',
  related_goals TEXT[] DEFAULT '{}',
  therapeutic_relevance DECIMAL(3,2) NOT NULL CHECK (therapeutic_relevance BETWEEN 0.0 AND 1.0),
  sensitivity_level sensitivity_level NOT NULL,
  
  -- Access tracking
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Retention policy
  retention_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Vector embedding dimension info (for reference, actual vectors in Pinecone)
  embedding_model TEXT DEFAULT 'text-embedding-ada-002',
  embedding_dimension INTEGER DEFAULT 1536
);

-- User memory statistics
CREATE TABLE public.user_memory_stats (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Memory counts by type
  total_memories INTEGER DEFAULT 0,
  event_memories INTEGER DEFAULT 0,
  insight_memories INTEGER DEFAULT 0,
  pattern_memories INTEGER DEFAULT 0,
  preference_memories INTEGER DEFAULT 0,
  goal_memories INTEGER DEFAULT 0,
  crisis_memories INTEGER DEFAULT 0,
  
  -- Memory quality metrics
  avg_importance DECIMAL(3,2) DEFAULT 0.0,
  avg_therapeutic_relevance DECIMAL(3,2) DEFAULT 0.0,
  high_importance_memories INTEGER DEFAULT 0,
  
  -- Access patterns
  most_accessed_memory_id TEXT,
  avg_memory_age_days DECIMAL(5,1) DEFAULT 0.0,
  
  -- Storage metrics
  total_storage_kb INTEGER DEFAULT 0,
  pinecone_vectors INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory search analytics (track what users search for in their memories)
CREATE TABLE public.memory_search_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Search query
  search_query TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'semantic', -- 'semantic', 'contextual', 'goal-related'
  
  -- Search results
  results_count INTEGER NOT NULL DEFAULT 0,
  top_result_score DECIMAL(4,3),
  avg_result_score DECIMAL(4,3),
  
  -- Context
  session_id UUID REFERENCES public.therapy_sessions(id),
  emotional_context JSONB,
  search_filters JSONB,
  
  -- Performance
  search_duration_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory consolidation jobs (for background processing)
CREATE TABLE public.memory_consolidation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Job details
  job_type TEXT NOT NULL CHECK (job_type IN ('cleanup_expired', 'consolidate_similar', 'update_importance', 'recompute_relevance')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  
  -- Processing
  memories_processed INTEGER DEFAULT 0,
  memories_modified INTEGER DEFAULT 0,
  memories_deleted INTEGER DEFAULT 0,
  
  -- Results
  processing_duration_ms INTEGER,
  error_message TEXT,
  results_summary JSONB,
  
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_memory_entries_user_id ON public.memory_entries(user_id);
CREATE INDEX idx_memory_entries_memory_type ON public.memory_entries(memory_type);
CREATE INDEX idx_memory_entries_importance ON public.memory_entries(importance DESC);
CREATE INDEX idx_memory_entries_created_at ON public.memory_entries(created_at);
CREATE INDEX idx_memory_entries_retention_expires ON public.memory_entries(retention_expires_at);
CREATE INDEX idx_memory_entries_sensitivity ON public.memory_entries(sensitivity_level);
CREATE INDEX idx_memory_entries_therapeutic_relevance ON public.memory_entries(therapeutic_relevance DESC);

-- Composite indexes for common queries
CREATE INDEX idx_memory_entries_user_type_importance ON public.memory_entries(user_id, memory_type, importance DESC);
CREATE INDEX idx_memory_entries_user_access ON public.memory_entries(user_id, last_accessed_at DESC);

CREATE INDEX idx_memory_search_analytics_user_id ON public.memory_search_analytics(user_id);
CREATE INDEX idx_memory_search_analytics_created_at ON public.memory_search_analytics(created_at);

CREATE INDEX idx_memory_consolidation_jobs_user_id ON public.memory_consolidation_jobs(user_id);
CREATE INDEX idx_memory_consolidation_jobs_status ON public.memory_consolidation_jobs(status);

-- Enable Row Level Security
ALTER TABLE public.memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_consolidation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own memory data
CREATE POLICY "Users can view own memory entries" ON public.memory_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own memory stats" ON public.user_memory_stats
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own memory search analytics" ON public.memory_search_analytics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own memory consolidation jobs" ON public.memory_consolidation_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Memory maintenance functions

-- Function to update user memory statistics
CREATE OR REPLACE FUNCTION update_user_memory_stats(target_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_memory_stats (user_id) VALUES (target_user_id)
  ON CONFLICT (user_id) DO UPDATE SET
    total_memories = (
      SELECT COUNT(*) FROM public.memory_entries 
      WHERE user_id = target_user_id AND retention_expires_at > NOW()
    ),
    event_memories = (
      SELECT COUNT(*) FROM public.memory_entries 
      WHERE user_id = target_user_id AND memory_type = 'event' AND retention_expires_at > NOW()
    ),
    insight_memories = (
      SELECT COUNT(*) FROM public.memory_entries 
      WHERE user_id = target_user_id AND memory_type = 'insight' AND retention_expires_at > NOW()
    ),
    pattern_memories = (
      SELECT COUNT(*) FROM public.memory_entries 
      WHERE user_id = target_user_id AND memory_type = 'pattern' AND retention_expires_at > NOW()
    ),
    preference_memories = (
      SELECT COUNT(*) FROM public.memory_entries 
      WHERE user_id = target_user_id AND memory_type = 'preference' AND retention_expires_at > NOW()
    ),
    goal_memories = (
      SELECT COUNT(*) FROM public.memory_entries 
      WHERE user_id = target_user_id AND memory_type = 'goal' AND retention_expires_at > NOW()
    ),
    crisis_memories = (
      SELECT COUNT(*) FROM public.memory_entries 
      WHERE user_id = target_user_id AND memory_type = 'crisis' AND retention_expires_at > NOW()
    ),
    avg_importance = COALESCE((
      SELECT AVG(importance) FROM public.memory_entries 
      WHERE user_id = target_user_id AND retention_expires_at > NOW()
    ), 0.0),
    avg_therapeutic_relevance = COALESCE((
      SELECT AVG(therapeutic_relevance) FROM public.memory_entries 
      WHERE user_id = target_user_id AND retention_expires_at > NOW()
    ), 0.0),
    high_importance_memories = (
      SELECT COUNT(*) FROM public.memory_entries 
      WHERE user_id = target_user_id AND importance >= 0.8 AND retention_expires_at > NOW()
    ),
    most_accessed_memory_id = (
      SELECT id FROM public.memory_entries 
      WHERE user_id = target_user_id AND retention_expires_at > NOW()
      ORDER BY access_count DESC LIMIT 1
    ),
    avg_memory_age_days = COALESCE((
      SELECT AVG(EXTRACT(DAY FROM (NOW() - created_at))) FROM public.memory_entries 
      WHERE user_id = target_user_id AND retention_expires_at > NOW()
    ), 0.0),
    pinecone_vectors = (
      SELECT COUNT(*) FROM public.memory_entries 
      WHERE user_id = target_user_id AND retention_expires_at > NOW()
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired memories from PostgreSQL
CREATE OR REPLACE FUNCTION cleanup_expired_memories()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired memories
  DELETE FROM public.memory_entries 
  WHERE retention_expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Update user stats for affected users
  PERFORM update_user_memory_stats(user_id) 
  FROM (SELECT DISTINCT user_id FROM public.memory_entries) AS users;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update memory stats when memories are added/modified
CREATE OR REPLACE FUNCTION trigger_update_memory_stats()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_memory_stats(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER memory_stats_update_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.memory_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_update_memory_stats();

-- Trigger for updated_at on user_memory_stats
CREATE TRIGGER update_user_memory_stats_updated_at 
  BEFORE UPDATE ON public.user_memory_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create initial memory stats for existing users
INSERT INTO public.user_memory_stats (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;