-- =====================================================
-- TIN_UI_V3 - ENHANCED DATABASE SCHEMA
-- Universal Weight Learning System
-- =====================================================

-- =====================================================
-- TABLE: projects
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Project info
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  tag TEXT NOT NULL, -- dating, cars, insurance, space_pigs, general, etc.
  description TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Stats
  total_sessions INTEGER DEFAULT 0,
  total_generations INTEGER DEFAULT 0
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_tag ON projects(tag);

-- =====================================================
-- TABLE: sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Session info
  name TEXT, -- nullable, user can rename
  session_number INTEGER NOT NULL, -- auto-increment per project
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  
  -- Stats
  total_generations INTEGER DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  avg_rating FLOAT DEFAULT 0.0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_project ON sessions(project_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE UNIQUE INDEX idx_sessions_project_number ON sessions(project_id, session_number);

-- =====================================================
-- TABLE: weight_parameters (Dynamic Parameter Schema)
-- IMPORTANT: Weights are FIXED per session (created once, never modified)
-- 11-14 parameter categories, 4-6 sub-parameters each
-- =====================================================
CREATE TABLE IF NOT EXISTS weight_parameters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- Parameter structure (dynamically created by agent at session start)
  category TEXT NOT NULL, -- e.g., "dating", "cars", "insurance"
  parameter_name TEXT NOT NULL, -- e.g., "subject", "vehicle", "lighting"
  sub_parameter TEXT NOT NULL, -- e.g., "young_adult", "ferrari_488", "golden_hour"
  
  -- Weight value (FIXED for this session, inherited from previous session + learning)
  weight FLOAT DEFAULT 100.0,
  
  -- Metadata (statistics only, weight itself doesn't change)
  times_used INTEGER DEFAULT 0,
  times_selected INTEGER DEFAULT 0, -- How many times this parameter was selected in generation
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weight_parameters_session ON weight_parameters(session_id);
CREATE INDEX idx_weight_parameters_category ON weight_parameters(category);
CREATE UNIQUE INDEX idx_weight_unique ON weight_parameters(session_id, parameter_name, sub_parameter);

-- =====================================================
-- TABLE: session_ratings (Track ratings to calculate weights for NEXT session)
-- =====================================================
CREATE TABLE IF NOT EXISTS session_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content_v3(id) ON DELETE CASCADE,
  
  -- Rating data
  rating INTEGER NOT NULL CHECK (rating IN (-3, -1, 1, 3)),
  
  -- Which parameters were used in this generation
  parameters_used JSONB NOT NULL, -- Array of {parameter, sub_parameter, weight}
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_ratings_session ON session_ratings(session_id);
CREATE INDEX idx_session_ratings_content ON session_ratings(content_id);

-- =====================================================
-- TABLE: content_v3 (Enhanced content table)
-- =====================================================
CREATE TABLE IF NOT EXISTS content_v3 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Content data
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'text')),
  
  -- Prompts
  original_prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  final_prompt TEXT,
  
  -- Generation metadata
  model TEXT NOT NULL,
  agent_type TEXT, -- 'dating', 'general', etc.
  
  -- Weight snapshot (параметри що використовувались)
  weights_used JSONB DEFAULT '{}',
  
  -- Rating
  rating INTEGER, -- -3, -1, 1, 3
  comment TEXT,
  rated_at TIMESTAMPTZ,
  
  -- Stats
  generation_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_v3_session ON content_v3(session_id);
CREATE INDEX idx_content_v3_project ON content_v3(project_id);
CREATE INDEX idx_content_v3_user ON content_v3(user_id);
CREATE INDEX idx_content_v3_rating ON content_v3(rating);

-- =====================================================
-- TABLE: agent_configs (Multiple agents support)
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Agent info
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'dating', 'general', 'cars', etc.
  description TEXT,
  
  -- System prompt for this agent
  system_prompt TEXT NOT NULL,
  
  -- Default parameters schema for this category
  default_parameters JSONB DEFAULT '{}',
  
  -- Active/inactive
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_configs_type ON agent_configs(type);
CREATE INDEX idx_agent_configs_active ON agent_configs(active);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update session stats after new content
CREATE OR REPLACE FUNCTION update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sessions
  SET
    total_generations = (SELECT COUNT(*) FROM content_v3 WHERE session_id = NEW.session_id),
    total_ratings = (SELECT COUNT(*) FROM content_v3 WHERE session_id = NEW.session_id AND rating IS NOT NULL),
    avg_rating = (SELECT AVG(rating) FROM content_v3 WHERE session_id = NEW.session_id AND rating IS NOT NULL),
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_stats
AFTER INSERT OR UPDATE ON content_v3
FOR EACH ROW
EXECUTE FUNCTION update_session_stats();

-- Update project stats
CREATE OR REPLACE FUNCTION update_project_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET
    total_sessions = (SELECT COUNT(*) FROM sessions WHERE project_id = NEW.project_id),
    total_generations = (SELECT COUNT(*) FROM content_v3 WHERE project_id = NEW.project_id),
    updated_at = NOW()
  WHERE id = NEW.project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_stats_from_session
AFTER INSERT ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_project_stats();

CREATE TRIGGER trigger_update_project_stats_from_content
AFTER INSERT ON content_v3
FOR EACH ROW
EXECUTE FUNCTION update_project_stats();

-- Track ratings for calculating weights for NEXT session
CREATE OR REPLACE FUNCTION track_session_rating()
RETURNS TRIGGER AS $$
DECLARE
  param JSONB;
BEGIN
  -- Only process if rating exists
  IF NEW.rating IS NOT NULL THEN
    -- Insert rating record for weight calculation in next session
    INSERT INTO session_ratings (session_id, content_id, rating, parameters_used)
    VALUES (NEW.session_id, NEW.id, NEW.rating, NEW.weights_used);
    
    -- Update usage statistics (but NOT weights)
    FOR param IN SELECT jsonb_array_elements(NEW.weights_used->'parameters')
    LOOP
      UPDATE weight_parameters
      SET 
        times_used = times_used + 1,
        times_selected = times_selected + 1
      WHERE 
        session_id = NEW.session_id 
        AND parameter_name = param->>'parameter'
        AND sub_parameter = param->>'value';
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_session_rating
AFTER INSERT OR UPDATE ON content_v3
FOR EACH ROW
EXECUTE FUNCTION track_session_rating();

-- =====================================================
-- SEED DATA - Default Agents
-- =====================================================

INSERT INTO agent_configs (name, type, description, system_prompt, default_parameters)
VALUES 
(
  'Dating Photo Expert',
  'dating',
  'Specialized in generating realistic dating profile photos using Seedream 4.0 system',
  'You are an expert AI prompt engineer specialized in Seedream 4.0 realistic smartphone photography generation for dating profiles. Create authentic, attractive photos that look like real people took them on real phones.',
  '{
    "subject": ["age", "gender", "pose", "expression", "clothing", "hair_style"],
    "technical": ["device", "platform", "orientation", "year"],
    "composition": ["shot_type", "framing", "angle"],
    "environment": ["setting", "background", "location"],
    "lighting": ["source", "direction", "quality", "time"],
    "style": ["mood", "color_palette", "saturation"]
  }'::jsonb
),
(
  'General Purpose AI',
  'general',
  'Versatile AI for any type of content generation',
  'You are a versatile AI assistant that can generate prompts for any type of visual content. Analyze the user request and create appropriate parameters dynamically.',
  '{}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Tin_UI_V3 database schema created successfully!';
  RAISE NOTICE '📊 New tables: projects, sessions, weight_parameters, content_v3, agent_configs';
  RAISE NOTICE '🤖 Default agents: Dating Photo Expert, General Purpose AI';
END $$;
