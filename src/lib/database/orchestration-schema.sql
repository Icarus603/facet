-- FACET Multi-Agent Orchestration Database Schema
-- Implements exact specifications from SPECS.md lines 639-724
-- Developer A: AI Systems Engineer - Database Tables for Orchestration Logging

-- =============================================================================
-- AGENT ORCHESTRATION LOGGING
-- =============================================================================

-- Agent Orchestration Logs
-- Stores complete orchestration strategy, execution plan, and results
CREATE TABLE IF NOT EXISTS agent_orchestration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  conversation_id UUID NOT NULL REFERENCES therapy_sessions(id),
  message_id UUID NOT NULL,                       -- Links to specific chat message
  
  -- Orchestration Strategy
  strategy TEXT NOT NULL,                          -- Human-readable strategy description
  execution_plan JSONB NOT NULL,                  -- Complete execution plan and results
  agents_used TEXT[] NOT NULL,                    -- List of agents involved
  execution_pattern TEXT NOT NULL CHECK (execution_pattern IN ('serial', 'parallel', 'hybrid', 'crisis_priority')),
  
  -- Performance Metrics
  total_processing_time_ms INTEGER NOT NULL,      -- Total milliseconds
  parallel_execution_time_ms INTEGER,             -- Parallel processing time
  agent_coordination_overhead_ms INTEGER,         -- Orchestration overhead
  planning_time_ms INTEGER,                       -- Time to plan execution
  synthesis_time_ms INTEGER,                      -- Time to synthesize final response
  
  -- Quality Metrics
  orchestrator_confidence DECIMAL(3,2) NOT NULL CHECK (orchestrator_confidence >= 0 AND orchestrator_confidence <= 1), -- 0.0-1.0
  agent_agreement_score DECIMAL(3,2),             -- Agent consensus level (0.0-1.0)
  response_quality_score DECIMAL(3,2),            -- Response quality (0.0-1.0)
  user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating >= 1 AND user_satisfaction_rating <= 5), -- Post-interaction rating (1-5)
  effectiveness_score DECIMAL(3,2),               -- Therapeutic effectiveness (0.0-1.0)
  
  -- Agent-Specific Results (JSONB for flexibility)
  emotion_analysis_result JSONB,
  memory_retrieval_result JSONB,
  crisis_assessment_result JSONB,
  therapy_advice_result JSONB,
  progress_tracking_result JSONB,
  
  -- Orchestration Context
  user_preferences JSONB,                         -- User preferences at time of execution
  urgency_level TEXT CHECK (urgency_level IN ('normal', 'elevated', 'crisis')),
  reasoning_transparency TEXT,                     -- Generated reasoning explanation
  adaptations TEXT[],                             -- Adaptations made during execution
  learnings TEXT[],                               -- Insights about user patterns
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- AGENT PERFORMANCE METRICS
-- =============================================================================

-- Agent Performance Analytics
-- Tracks individual agent performance and effectiveness
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orchestration_log_id UUID NOT NULL REFERENCES agent_orchestration_logs(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,                       -- 'emotion_analyzer', 'memory_manager', etc.
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Task Assignment
  assigned_task TEXT NOT NULL,                    -- Specific task given to agent
  input_data_hash TEXT,                          -- Hash of input data for deduplication
  
  -- Performance Data
  execution_time_ms INTEGER NOT NULL,             -- Individual agent execution time
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1), -- Agent confidence in result
  success BOOLEAN NOT NULL DEFAULT TRUE,          -- Execution success/failure
  error_message TEXT,                            -- Error details if success = false
  
  -- Execution Context
  execution_type TEXT NOT NULL CHECK (execution_type IN ('parallel', 'serial', 'hybrid', 'priority')),
  start_time_offset_ms INTEGER NOT NULL,          -- Start time relative to orchestration start
  end_time_offset_ms INTEGER NOT NULL,           -- End time relative to orchestration start
  dependencies TEXT[],                           -- Required previous step IDs
  
  -- Results Quality
  result_data JSONB,                             -- Agent-specific result data (sanitized)
  reasoning TEXT,                                -- Agent's reasoning process
  key_insights TEXT[],                           -- Important findings
  recommendations_to_orchestrator TEXT[],        -- Agent's recommendations
  influence_on_final_response DECIMAL(3,2),     -- 0.0-1.0 how much this affected final response
  contributed_insights TEXT[],                   -- Specific insights used in final response
  
  -- User Feedback (collected asynchronously)
  user_found_helpful BOOLEAN,                    -- User feedback on agent contribution
  accuracy_rating DECIMAL(3,2),                 -- Post-hoc accuracy assessment (0.0-1.0)
  professional_review_score INTEGER CHECK (professional_review_score >= 1 AND professional_review_score <= 5), -- Professional validation (1-5)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- USER AGENT PREFERENCES
-- =============================================================================

-- User Agent Preferences
-- Stores user preferences for agent orchestration and transparency
CREATE TABLE IF NOT EXISTS user_agent_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Transparency Preferences
  transparency_level TEXT NOT NULL DEFAULT 'standard' CHECK (transparency_level IN ('minimal', 'standard', 'detailed')),
  show_agent_reasoning BOOLEAN DEFAULT TRUE,
  show_execution_timeline BOOLEAN DEFAULT TRUE,
  show_confidence_scores BOOLEAN DEFAULT FALSE,
  show_agent_personalities BOOLEAN DEFAULT TRUE,
  
  -- Performance Preferences
  response_speed_preference TEXT NOT NULL DEFAULT 'balanced' CHECK (response_speed_preference IN ('fast', 'balanced', 'thorough')),
  parallel_processing_enabled BOOLEAN DEFAULT TRUE,
  max_wait_time_seconds INTEGER DEFAULT 8 CHECK (max_wait_time_seconds > 0),
  
  -- Agent Personality & Communication
  communication_style TEXT NOT NULL DEFAULT 'professional_warm' CHECK (communication_style IN ('professional_warm', 'clinical_precise', 'casual_supportive')),
  verbosity_level TEXT DEFAULT 'standard' CHECK (verbosity_level IN ('concise', 'standard', 'detailed')),
  include_insights_in_responses BOOLEAN DEFAULT TRUE,
  mention_agent_names BOOLEAN DEFAULT FALSE,
  
  -- Learning & Personalization Preferences
  enable_personalization BOOLEAN DEFAULT TRUE,
  enable_agent_learning BOOLEAN DEFAULT TRUE,
  share_anonymous_analytics BOOLEAN DEFAULT TRUE,
  data_retention_days INTEGER DEFAULT 730 CHECK (data_retention_days > 0), -- 2 years default
  allow_crisis_sharing BOOLEAN DEFAULT TRUE,     -- Share crisis data with professionals
  
  -- Accessibility Preferences
  reduced_motion BOOLEAN DEFAULT FALSE,          -- Minimize animations
  high_contrast BOOLEAN DEFAULT FALSE,
  larger_text BOOLEAN DEFAULT FALSE,
  audio_descriptions BOOLEAN DEFAULT FALSE,      -- For agent status updates
  
  -- Agent-Specific Preferences (JSONB for flexibility)
  agent_preferences JSONB DEFAULT '{}',          -- Per-agent customization settings
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- EXECUTION STEPS TRACKING
-- =============================================================================

-- Detailed Execution Steps
-- Tracks granular execution timeline for orchestration transparency
CREATE TABLE IF NOT EXISTS execution_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orchestration_log_id UUID NOT NULL REFERENCES agent_orchestration_logs(id) ON DELETE CASCADE,
  
  -- Step Information
  step_id TEXT NOT NULL,                         -- Unique step identifier within orchestration
  step_number INTEGER NOT NULL,                  -- Sequential step number (1, 2, 3...)
  description TEXT NOT NULL,                     -- Human-readable step description
  
  -- Agent Information
  agents_involved TEXT[] NOT NULL,               -- Agents participating in this step
  execution_type TEXT NOT NULL CHECK (execution_type IN ('parallel', 'serial', 'hybrid', 'conditional', 'crisis_priority')),
  
  -- Timing & Dependencies
  start_time_ms INTEGER NOT NULL,               -- Relative start time from orchestration start
  duration_ms INTEGER NOT NULL,                 -- Step duration
  dependencies TEXT[],                          -- Required previous step IDs
  
  -- Status & Results
  status TEXT NOT NULL CHECK (status IN ('completed', 'running', 'pending', 'error', 'skipped')),
  error_message TEXT,                           -- Error details if status = 'error'
  results JSONB,                                -- Step-specific results data
  
  -- Performance Metrics
  parallel_efficiency DECIMAL(3,2),            -- Efficiency of parallel execution (0.0-1.0)
  coordination_overhead_ms INTEGER,             -- Overhead for coordinating this step
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ORCHESTRATION ANALYTICS VIEWS
-- =============================================================================

-- Agent Effectiveness Summary View
CREATE OR REPLACE VIEW agent_effectiveness_summary AS
SELECT 
    apm.agent_name,
    apm.user_id,
    COUNT(*) as total_invocations,
    AVG(apm.execution_time_ms) as avg_execution_time_ms,
    AVG(apm.confidence_score) as avg_confidence,
    AVG(apm.influence_on_final_response) as avg_influence,
    COUNT(*) FILTER (WHERE apm.success = true) * 100.0 / COUNT(*) as success_rate,
    AVG(apm.accuracy_rating) FILTER (WHERE apm.accuracy_rating IS NOT NULL) as avg_accuracy,
    COUNT(*) FILTER (WHERE apm.user_found_helpful = true) * 100.0 / 
        COUNT(*) FILTER (WHERE apm.user_found_helpful IS NOT NULL) as helpfulness_rate
FROM agent_performance_metrics apm
GROUP BY apm.agent_name, apm.user_id;

-- Orchestration Strategy Effectiveness View
CREATE OR REPLACE VIEW orchestration_strategy_effectiveness AS
SELECT 
    aol.strategy,
    aol.execution_pattern,
    COUNT(*) as usage_count,
    AVG(aol.total_processing_time_ms) as avg_processing_time_ms,
    AVG(aol.orchestrator_confidence) as avg_confidence,
    AVG(aol.agent_agreement_score) as avg_agent_agreement,
    AVG(aol.user_satisfaction_rating) FILTER (WHERE aol.user_satisfaction_rating IS NOT NULL) as avg_user_satisfaction,
    COUNT(*) FILTER (WHERE aol.effectiveness_score > 0.7) * 100.0 / 
        COUNT(*) FILTER (WHERE aol.effectiveness_score IS NOT NULL) as effectiveness_rate
FROM agent_orchestration_logs aol
GROUP BY aol.strategy, aol.execution_pattern;

-- User Orchestration Patterns View
CREATE OR REPLACE VIEW user_orchestration_patterns AS
SELECT 
    aol.user_id,
    COUNT(*) as total_interactions,
    AVG(aol.total_processing_time_ms) as avg_response_time_ms,
    string_agg(DISTINCT unnest(aol.agents_used), ', ' ORDER BY unnest(aol.agents_used)) as most_used_agents,
    MODE() WITHIN GROUP (ORDER BY aol.execution_pattern) as preferred_execution_pattern,
    AVG(aol.orchestrator_confidence) as avg_orchestration_confidence,
    COUNT(*) FILTER (WHERE aol.urgency_level = 'crisis') as crisis_interactions,
    COUNT(*) FILTER (WHERE aol.user_satisfaction_rating >= 4) * 100.0 / 
        COUNT(*) FILTER (WHERE aol.user_satisfaction_rating IS NOT NULL) as satisfaction_rate
FROM agent_orchestration_logs aol
WHERE aol.created_at >= NOW() - INTERVAL '30 days'
GROUP BY aol.user_id;

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Orchestration Logs Indexes
CREATE INDEX IF NOT EXISTS idx_orchestration_logs_user_id ON agent_orchestration_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_logs_conversation_id ON agent_orchestration_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_logs_message_id ON agent_orchestration_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_logs_created_at ON agent_orchestration_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_orchestration_logs_strategy ON agent_orchestration_logs(strategy);
CREATE INDEX IF NOT EXISTS idx_orchestration_logs_execution_pattern ON agent_orchestration_logs(execution_pattern);
CREATE INDEX IF NOT EXISTS idx_orchestration_logs_urgency_level ON agent_orchestration_logs(urgency_level);

-- Agent Performance Indexes
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_name ON agent_performance_metrics(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_performance_user_id ON agent_performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_orchestration_log_id ON agent_performance_metrics(orchestration_log_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_created_at ON agent_performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_performance_success ON agent_performance_metrics(success);
CREATE INDEX IF NOT EXISTS idx_agent_performance_execution_type ON agent_performance_metrics(execution_type);

-- Execution Steps Indexes
CREATE INDEX IF NOT EXISTS idx_execution_steps_orchestration_log_id ON execution_steps(orchestration_log_id);
CREATE INDEX IF NOT EXISTS idx_execution_steps_step_number ON execution_steps(step_number);
CREATE INDEX IF NOT EXISTS idx_execution_steps_status ON execution_steps(status);
CREATE INDEX IF NOT EXISTS idx_execution_steps_execution_type ON execution_steps(execution_type);

-- User Preferences Index
CREATE INDEX IF NOT EXISTS idx_user_agent_preferences_updated_at ON user_agent_preferences(updated_at);

-- Composite Indexes for Common Queries
CREATE INDEX IF NOT EXISTS idx_orchestration_user_date ON agent_orchestration_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_performance_user_agent ON agent_performance_metrics(user_id, agent_name);
CREATE INDEX IF NOT EXISTS idx_orchestration_strategy_pattern ON agent_orchestration_logs(strategy, execution_pattern);

-- =============================================================================
-- DATA RETENTION FUNCTIONS
-- =============================================================================

-- Function to clean up old orchestration data based on user preferences
CREATE OR REPLACE FUNCTION cleanup_orchestration_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Clean up data for each user based on their retention preferences
    FOR user_record IN 
        SELECT user_id, data_retention_days 
        FROM user_agent_preferences 
        WHERE data_retention_days IS NOT NULL
    LOOP
        -- Delete old orchestration logs
        DELETE FROM agent_orchestration_logs 
        WHERE user_id = user_record.user_id 
        AND created_at < NOW() - (user_record.data_retention_days || ' days')::INTERVAL;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END LOOP;
    
    -- Clean up orphaned records (users without explicit preferences get 2 year default)
    DELETE FROM agent_orchestration_logs 
    WHERE user_id NOT IN (SELECT user_id FROM user_agent_preferences)
    AND created_at < NOW() - INTERVAL '730 days';
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER FUNCTIONS
-- =============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_agent_orchestration_logs_updated_at 
    BEFORE UPDATE ON agent_orchestration_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_agent_preferences_updated_at 
    BEFORE UPDATE ON user_agent_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SECURITY POLICIES (Row Level Security)
-- =============================================================================

-- Enable RLS on orchestration tables
ALTER TABLE agent_orchestration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agent_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_steps ENABLE ROW LEVEL SECURITY;

-- Users can only access their own orchestration data
CREATE POLICY user_orchestration_logs_policy ON agent_orchestration_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_agent_performance_policy ON agent_performance_metrics
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_agent_preferences_policy ON user_agent_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_execution_steps_policy ON execution_steps
    FOR ALL USING (
        auth.uid() = (
            SELECT user_id FROM agent_orchestration_logs 
            WHERE id = execution_steps.orchestration_log_id
        )
    );

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE agent_orchestration_logs IS 'Complete orchestration strategy, execution plan, and results for agent coordination transparency';
COMMENT ON TABLE agent_performance_metrics IS 'Individual agent performance tracking for optimization and user insights';
COMMENT ON TABLE user_agent_preferences IS 'User preferences for agent orchestration, transparency, and personalization';
COMMENT ON TABLE execution_steps IS 'Granular execution timeline for orchestration transparency and debugging';

COMMENT ON VIEW agent_effectiveness_summary IS 'Aggregated agent performance metrics per user for insights generation';
COMMENT ON VIEW orchestration_strategy_effectiveness IS 'Strategy effectiveness analysis for orchestration optimization';
COMMENT ON VIEW user_orchestration_patterns IS 'User interaction patterns for personalization and insights';

-- End of FACET Multi-Agent Orchestration Database Schema