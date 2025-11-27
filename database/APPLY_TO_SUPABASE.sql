-- =====================================================
-- COMPLETE DATABASE SETUP FOR TIN_UI_V3
-- Apply this SQL in Supabase Dashboard > SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- V2 TABLES (Legacy Support)
-- =====================================================

-- Table: users (simple auth for demo)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: prompt_templates (V2)
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model_config JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: content (V2)
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  template_id UUID REFERENCES prompt_templates(id),
  url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  original_prompt TEXT,
  enhanced_prompt TEXT,
  final_prompt TEXT,
  model TEXT,
  generation_metadata JSONB DEFAULT '{}',
  total_ratings INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  dislikes_count INTEGER DEFAULT 0,
  superlikes_count INTEGER DEFAULT 0,
  like_rate FLOAT DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: ratings (V2)
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right', 'up', 'down')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: user_insights (V2)
CREATE TABLE IF NOT EXISTS user_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  total_ratings INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  dislikes_count INTEGER DEFAULT 0,
  superlikes_count INTEGER DEFAULT 0,
  skips_count INTEGER DEFAULT 0,
  preferences JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for V2 tables
CREATE INDEX IF NOT EXISTS idx_content_user ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_template ON content(template_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_content ON ratings(content_id);

-- =====================================================
-- V3 TABLES (New Architecture)
-- =====================================================

-- Table: projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  total_sessions INTEGER DEFAULT 0,
  total_generations INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_tag ON projects(tag);

-- Table: sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT,
  session_number INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  total_generations INTEGER DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  avg_rating FLOAT DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_project_number ON sessions(project_id, session_number);

-- Table: weight_parameters
CREATE TABLE IF NOT EXISTS weight_parameters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  parameter_name TEXT NOT NULL,
  sub_parameter TEXT NOT NULL,
  weight FLOAT DEFAULT 100.0,
  times_used INTEGER DEFAULT 0,
  times_selected INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_parameters_session ON weight_parameters(session_id);
CREATE INDEX IF NOT EXISTS idx_weight_parameters_category ON weight_parameters(category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_unique ON weight_parameters(session_id, parameter_name, sub_parameter);

-- Table: content_v3
CREATE TABLE IF NOT EXISTS content_v3 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'text')),
  original_prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  final_prompt TEXT,
  model TEXT NOT NULL,
  agent_type TEXT,
  weights_used JSONB DEFAULT '{}',
  rating INTEGER CHECK (rating IN (-3, -1, 1, 3)),
  comment TEXT,
  rated_at TIMESTAMPTZ,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_v3_session ON content_v3(session_id);
CREATE INDEX IF NOT EXISTS idx_content_v3_project ON content_v3(project_id);
CREATE INDEX IF NOT EXISTS idx_content_v3_user ON content_v3(user_id);
CREATE INDEX IF NOT EXISTS idx_content_v3_rating ON content_v3(rating);

-- Table: session_ratings
CREATE TABLE IF NOT EXISTS session_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content_v3(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating IN (-3, -1, 1, 3)),
  parameters_used JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_ratings_session ON session_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_session_ratings_content ON session_ratings(content_id);

-- Table: agent_configs
CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  default_parameters JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_configs_type ON agent_configs(type);
CREATE INDEX IF NOT EXISTS idx_agent_configs_active ON agent_configs(active);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update session stats
CREATE OR REPLACE FUNCTION update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sessions
  SET
    total_generations = (SELECT COUNT(*) FROM content_v3 WHERE session_id = NEW.session_id),
    total_ratings = (SELECT COUNT(*) FROM content_v3 WHERE session_id = NEW.session_id AND rating IS NOT NULL),
    avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM content_v3 WHERE session_id = NEW.session_id AND rating IS NOT NULL),
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_session_stats ON content_v3;
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

DROP TRIGGER IF EXISTS trigger_update_project_stats_from_session ON sessions;
CREATE TRIGGER trigger_update_project_stats_from_session
AFTER INSERT ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_project_stats();

DROP TRIGGER IF EXISTS trigger_update_project_stats_from_content ON content_v3;
CREATE TRIGGER trigger_update_project_stats_from_content
AFTER INSERT ON content_v3
FOR EACH ROW
EXECUTE FUNCTION update_project_stats();

-- Track session ratings
CREATE OR REPLACE FUNCTION track_session_rating()
RETURNS TRIGGER AS $$
DECLARE
  param JSONB;
BEGIN
  IF NEW.rating IS NOT NULL THEN
    INSERT INTO session_ratings (session_id, content_id, rating, parameters_used)
    VALUES (NEW.session_id, NEW.id, NEW.rating, NEW.weights_used)
    ON CONFLICT DO NOTHING;
    
    IF NEW.weights_used ? 'parameters' THEN
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_session_rating ON content_v3;
CREATE TRIGGER trigger_track_session_rating
AFTER INSERT OR UPDATE ON content_v3
FOR EACH ROW
EXECUTE FUNCTION track_session_rating();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Default user
INSERT INTO users (id, username, email, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'demo', 'demo@tinui.com', 'user'),
  ('00000000-0000-0000-0000-000000000002', 'admin', 'admin@tinui.com', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Default prompt template (V2)
INSERT INTO prompt_templates (name, category, system_prompt, model_config)
VALUES (
  'dating_photos_v1',
  'dating',
  'You are an expert AI prompt engineer specialized in creating realistic dating profile photos.',
  '{"model": "seedream-4", "parameters": {"width": 2048, "height": 2048}}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Default agents (V3)
INSERT INTO agent_configs (name, type, description, system_prompt, default_parameters)
VALUES 
(
  'Dating Photo Expert',
  'dating',
  'Specialized in generating realistic dating profile photos',
  'You are an expert AI prompt engineer specialized in realistic smartphone photography for dating profiles.',
  '{"subject": ["age", "gender", "pose"], "technical": ["device", "platform"], "style": ["mood", "lighting"]}'::jsonb
),
(
  'General Purpose AI',
  'general',
  'Versatile AI for any type of content generation',
  'You are a versatile AI assistant for visual content generation.',
  '{}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database setup complete!';
  RAISE NOTICE '📊 V2 tables: users, prompt_templates, content, ratings, user_insights';
  RAISE NOTICE '📊 V3 tables: projects, sessions, weight_parameters, content_v3, agent_configs';
  RAISE NOTICE '🤖 Default agents: Dating Photo Expert, General Purpose AI';
  RAISE NOTICE '👤 Default users: demo (user), admin (admin)';
END $$;
