-- =====================================================
-- TIN_UI_V3 - FINAL DATABASE MIGRATION
-- Version: 3.1.0
-- Date: 2025-12-01
-- Description: Complete database setup with QA Agent and weighted learning
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
  'Specialized in realistic smartphone dating photos',
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
  category TEXT DEFAULT 'general',
  parameter_name TEXT NOT NULL,
  sub_parameter TEXT NOT NULL,
  weight FLOAT DEFAULT 100.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, parameter_name, sub_parameter)
);

CREATE INDEX IF NOT EXISTS idx_weight_parameters_session_id ON weight_parameters(session_id);
CREATE INDEX IF NOT EXISTS idx_weight_parameters_category ON weight_parameters(category);
CREATE INDEX IF NOT EXISTS idx_weight_parameters_name ON weight_parameters(parameter_name);
CREATE INDEX IF NOT EXISTS idx_weight_parameters_weight ON weight_parameters(weight DESC);

COMMENT ON COLUMN weight_parameters.category IS 'Parameter category (dating, cars, nature, etc.)';

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
  rated_at TIMESTAMPTZ,
  comment TEXT,
  weights_used JSONB DEFAULT '{}',  -- Snapshot of weights used
  generation_metadata JSONB DEFAULT '{}',
  qa_validation JSONB DEFAULT NULL,  -- QA Agent results
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_v3_session_id ON content_v3(session_id);
CREATE INDEX IF NOT EXISTS idx_content_v3_project_id ON content_v3(project_id);
CREATE INDEX IF NOT EXISTS idx_content_v3_user_id ON content_v3(user_id);
CREATE INDEX IF NOT EXISTS idx_content_v3_rating ON content_v3(rating);
CREATE INDEX IF NOT EXISTS idx_content_v3_rated_at ON content_v3(rated_at DESC) WHERE rated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_v3_created_at ON content_v3(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_v3_qa_status ON content_v3((qa_validation->>'status')) WHERE qa_validation IS NOT NULL;

COMMENT ON COLUMN content_v3.qa_validation IS 'QA Agent validation results: score, status, issues, timestamp';
COMMENT ON COLUMN content_v3.rated_at IS 'Timestamp when user rated this content (for tracking rating timeline)';

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

-- Session statistics with counts (including QA)
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
  COUNT(DISTINCT CASE WHEN c.qa_validation IS NOT NULL THEN c.id END) as qa_validated_count,
  COALESCE(AVG(c.rating), 0) as avg_rating,
  ROUND(COALESCE(AVG(CAST(c.qa_validation->>'score' AS NUMERIC)), 0), 2) as avg_qa_score,
  MAX(c.created_at) as last_generation_at
FROM sessions s
LEFT JOIN content_v3 c ON c.session_id = s.id
LEFT JOIN weight_parameters wp ON wp.session_id = s.id
GROUP BY s.id, s.name, s.project_id, s.user_id, s.created_at;

-- QA Statistics by session
CREATE OR REPLACE VIEW qa_stats_by_session AS
SELECT 
  s.id as session_id,
  s.name as session_name,
  s.project_id,
  COUNT(DISTINCT c.id) FILTER (WHERE c.qa_validation IS NOT NULL) as validated_count,
  ROUND(AVG(CAST(c.qa_validation->>'score' AS NUMERIC)), 2) FILTER (WHERE c.qa_validation IS NOT NULL) as avg_qa_score,
  COUNT(*) FILTER (WHERE c.qa_validation->>'status' = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE c.qa_validation->>'status' = 'needs_revision') as needs_revision_count,
  COUNT(*) FILTER (WHERE c.qa_validation->>'status' = 'rejected') as rejected_count
FROM sessions s
LEFT JOIN content_v3 c ON c.session_id = s.id
GROUP BY s.id, s.name, s.project_id;

COMMENT ON VIEW qa_stats_by_session IS 'QA Agent statistics aggregated by session';

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

-- Function to get QA validation history
CREATE OR REPLACE FUNCTION get_qa_validation_history(
  p_session_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  content_id UUID,
  score INTEGER,
  status TEXT,
  issues_count INTEGER,
  created_at TIMESTAMPTZ,
  qa_timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as content_id,
    CAST(c.qa_validation->>'score' AS INTEGER) as score,
    c.qa_validation->>'status' as status,
    jsonb_array_length(COALESCE(c.qa_validation->'issues', '[]'::jsonb)) as issues_count,
    c.created_at,
    CAST(c.qa_validation->>'timestamp' AS TIMESTAMPTZ) as qa_timestamp
  FROM content_v3 c
  WHERE c.session_id = p_session_id
    AND c.qa_validation IS NOT NULL
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_qa_validation_history IS 'Get QA validation history for a session (used by Agent for learning)';

-- Function to get common QA issues
CREATE OR REPLACE FUNCTION get_common_qa_issues(
  p_session_id UUID,
  p_min_occurrences INTEGER DEFAULT 2
)
RETURNS TABLE (
  issue_message TEXT,
  severity TEXT,
  occurrences BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH issues_expanded AS (
    SELECT 
      c.id,
      issue->>'message' as message,
      issue->>'severity' as severity
    FROM content_v3 c,
    LATERAL jsonb_array_elements(c.qa_validation->'issues') as issue
    WHERE c.session_id = p_session_id
      AND c.qa_validation IS NOT NULL
  )
  SELECT 
    ie.message as issue_message,
    ie.severity,
    COUNT(*) as occurrences
  FROM issues_expanded ie
  GROUP BY ie.message, ie.severity
  HAVING COUNT(*) >= p_min_occurrences
  ORDER BY occurrences DESC, ie.severity;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_common_qa_issues IS 'Find common QA issues in a session (helps Agent improve)';

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
  RAISE NOTICE '✅ TIN_UI_V3.1 DATABASE MIGRATION COMPLETE';
  RAISE NOTICE '✅ ═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables created: %', table_count;
  RAISE NOTICE '   - users (% accounts)', user_count;
  RAISE NOTICE '   - projects';
  RAISE NOTICE '   - sessions';
  RAISE NOTICE '   - agent_configs (Dating + General)';
  RAISE NOTICE '   - weight_parameters (with category)';
  RAISE NOTICE '   - content_v3 (with QA validation & rated_at)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Features:';
  RAISE NOTICE '   ✅ Weighted learning (unlimited parameters)';
  RAISE NOTICE '   ✅ QA Agent integration (score, status, issues)';
  RAISE NOTICE '   ✅ Rating timeline tracking (rated_at)';
  RAISE NOTICE '   ✅ Parameter categorization';
  RAISE NOTICE '   ✅ Dating Photo Expert with specialized prompts';
  RAISE NOTICE '   ✅ General Purpose AI for all other categories';
  RAISE NOTICE '   ✅ Row Level Security (RLS) enabled';
  RAISE NOTICE '   ✅ Statistics views (project_stats, session_stats, qa_stats)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Test accounts:';
  RAISE NOTICE '   - admin / (hash) (role: admin)';
  RAISE NOTICE '   - test / (hash) (role: user)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT:';
  RAISE NOTICE '   1. Update user password hashes with bcrypt!';
  RAISE NOTICE '   2. Create storage bucket: generated-content';
  RAISE NOTICE '   3. Set up authentication in Supabase Dashboard';
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









