-- =====================================================
-- TIN_UI_V3 - COMPLETE DATABASE MIGRATION
-- Version: 3.0 (HYBRID APPROACH)
-- Date: 2025-11-30
-- Description: Full database setup with Hybrid weighted learning
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FUNCTION: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABLE: users
-- Description: User accounts and authentication
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default users (demo passwords - CHANGE IN PRODUCTION!)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
  ('admin', 'admin@example.com', '$2b$10$hash', 'Admin User', 'admin'),
  ('test', 'test@example.com', '$2b$10$hash', 'Test User', 'user')
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- TABLE: projects
-- Description: User projects for organizing generations
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,  -- 'dating', 'cars', 'nature', etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_tag ON projects(tag);

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: sessions
-- Description: Generation sessions within projects
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TRIGGER trigger_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: agent_configs
-- Description: AI Agent configurations (Dating, General, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL UNIQUE,  -- 'dating', 'general'
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  default_parameters JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_configs_type ON agent_configs(type);
CREATE INDEX IF NOT EXISTS idx_agent_configs_active ON agent_configs(active);

CREATE TRIGGER trigger_agent_configs_updated_at
  BEFORE UPDATE ON agent_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default agents
INSERT INTO agent_configs (type, name, description, system_prompt, active) VALUES
(
  'general',
  'General Purpose AI',
  'Universal AI for any content type',
  'You are an expert AI prompt engineer. Create detailed prompts for high-quality AI image generation. Focus on clear descriptions, technical details, and natural language.',
  true
),
(
  'dating',
  'Dating Photo Expert',
  'Specialized in realistic smartphone dating photos (uses MASTER PROMPT)',
  'You are an expert AI prompt engineer specialized in realistic smartphone dating photos. Focus on authentic photography style, natural poses, real-world lighting, and technical imperfections for realism. Create prompts that feel like real people took them on real phones.',
  true
)
ON CONFLICT (type) DO NOTHING;

-- =====================================================
-- TABLE: weight_parameters
-- Description: Weighted parameters for learning system
-- =====================================================
CREATE TABLE IF NOT EXISTS weight_parameters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  parameter_name TEXT NOT NULL,
  sub_parameter TEXT NOT NULL,
  weight FLOAT DEFAULT 100.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, parameter_name, sub_parameter)
);

CREATE INDEX IF NOT EXISTS idx_weight_parameters_session_id ON weight_parameters(session_id);
CREATE INDEX IF NOT EXISTS idx_weight_parameters_name ON weight_parameters(parameter_name);
CREATE INDEX IF NOT EXISTS idx_weight_parameters_weight ON weight_parameters(weight DESC);

CREATE TRIGGER trigger_weight_parameters_updated_at
  BEFORE UPDATE ON weight_parameters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: content_v3
-- Description: Generated AI content with V3 system
-- =====================================================
CREATE TABLE IF NOT EXISTS content_v3 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'image',  -- 'image', 'video', 'audio'
  url TEXT NOT NULL,
  original_prompt TEXT,
  enhanced_prompt TEXT,
  final_prompt TEXT,
  model TEXT,
  agent_type TEXT,
  rating INTEGER,  -- -3, -1, 0, +1, +3
  comment TEXT,
  weights_used JSONB DEFAULT '{}',  -- Snapshot of weights used
  generation_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_v3_session_id ON content_v3(session_id);
CREATE INDEX IF NOT EXISTS idx_content_v3_project_id ON content_v3(project_id);
CREATE INDEX IF NOT EXISTS idx_content_v3_user_id ON content_v3(user_id);
CREATE INDEX IF NOT EXISTS idx_content_v3_rating ON content_v3(rating);
CREATE INDEX IF NOT EXISTS idx_content_v3_created_at ON content_v3(created_at DESC);

CREATE TRIGGER trigger_content_v3_updated_at
  BEFORE UPDATE ON content_v3
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS: Statistics and aggregations
-- =====================================================

-- Project statistics with counts
CREATE OR REPLACE VIEW project_stats AS
SELECT 
  p.id,
  p.name,
  p.tag,
  p.user_id,
  p.created_at,
  COUNT(DISTINCT s.id) as sessions_count,
  COUNT(DISTINCT c.id) as generations_count,
  COUNT(DISTINCT CASE WHEN c.rating IS NOT NULL THEN c.id END) as ratings_count,
  COALESCE(AVG(c.rating), 0) as avg_rating,
  MAX(c.created_at) as last_generation_at
FROM projects p
LEFT JOIN sessions s ON s.project_id = p.id
LEFT JOIN content_v3 c ON c.project_id = p.id
GROUP BY p.id, p.name, p.tag, p.user_id, p.created_at;

-- Session statistics with counts
CREATE OR REPLACE VIEW session_stats AS
SELECT 
  s.id,
  s.name,
  s.project_id,
  s.user_id,
  s.created_at,
  COUNT(DISTINCT c.id) as generations_count,
  COUNT(DISTINCT CASE WHEN c.rating IS NOT NULL THEN c.id END) as ratings_count,
  COUNT(DISTINCT wp.id) as parameters_count,
  COALESCE(AVG(c.rating), 0) as avg_rating,
  MAX(c.created_at) as last_generation_at
FROM sessions s
LEFT JOIN content_v3 c ON c.session_id = s.id
LEFT JOIN weight_parameters wp ON wp.session_id = s.id
GROUP BY s.id, s.name, s.project_id, s.user_id, s.created_at;

-- =====================================================
-- FUNCTIONS: Helper functions
-- =====================================================

-- Function to get top weighted parameters for a session
CREATE OR REPLACE FUNCTION get_top_weighted_parameters(
  p_session_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  parameter_name TEXT,
  sub_parameter TEXT,
  weight FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wp.parameter_name,
    wp.sub_parameter,
    wp.weight
  FROM weight_parameters wp
  WHERE wp.session_id = p_session_id
  ORDER BY wp.weight DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORAGE: Supabase Storage buckets setup
-- =====================================================
-- Run this in Supabase Dashboard SQL Editor:
-- 
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('generated-content', 'generated-content', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- CREATE POLICY "Public Access"
-- ON storage.objects FOR SELECT
-- USING ( bucket_id = 'generated-content' );
--
-- CREATE POLICY "Authenticated Upload"
-- ON storage.objects FOR INSERT
-- WITH CHECK ( bucket_id = 'generated-content' AND auth.role() = 'authenticated' );

-- =====================================================
-- PERMISSIONS: Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_parameters ENABLE ROW LEVEL SECURITY;

-- Projects: users can only access their own
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Sessions: users can only access their own
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Content: users can only access their own
CREATE POLICY "Users can view own content"
  ON content_v3 FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own content"
  ON content_v3 FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content"
  ON content_v3 FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content"
  ON content_v3 FOR DELETE
  USING (auth.uid() = user_id);

-- Weight parameters: users can access through sessions
CREATE POLICY "Users can view session weights"
  ON weight_parameters FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sessions s 
    WHERE s.id = weight_parameters.session_id 
    AND s.user_id = auth.uid()
  ));

-- Agent configs: everyone can read
CREATE POLICY "Everyone can view agent configs"
  ON agent_configs FOR SELECT
  USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  table_count INTEGER;
  user_count INTEGER;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
  
  -- Count users
  SELECT COUNT(*) INTO user_count FROM users;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ TIN_UI_V3 DATABASE MIGRATION COMPLETE (HYBRID VERSION)';
  RAISE NOTICE '✅ ═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables created: %', table_count;
  RAISE NOTICE '   - users (% accounts)', user_count;
  RAISE NOTICE '   - projects';
  RAISE NOTICE '   - sessions';
  RAISE NOTICE '   - agent_configs (Dating + General)';
  RAISE NOTICE '   - weight_parameters (for learning)';
  RAISE NOTICE '   - content_v3 (with ratings)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Features:';
  RAISE NOTICE '   ✅ Hybrid weighted learning (unlimited parameters)';
  RAISE NOTICE '   ✅ Dating Photo Expert with MASTER PROMPT';
  RAISE NOTICE '   ✅ General Purpose AI for all other categories';
  RAISE NOTICE '   ✅ Row Level Security (RLS) enabled';
  RAISE NOTICE '   ✅ Statistics views (project_stats, session_stats)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Test accounts:';
  RAISE NOTICE '   - admin / (hash) (role: admin)';
  RAISE NOTICE '   - test / (hash) (role: user)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT:';
  RAISE NOTICE '   1. Update user password hashes with bcrypt!';
  RAISE NOTICE '   2. Create storage bucket: generated-content';
  RAISE NOTICE '   3. Update UPDATE_DATING_AGENT.sql to add MASTER PROMPT';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Ready to use! Start your backend server.';
  RAISE NOTICE '';
END $$;

-- Show all tables
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

