-- =====================================================
-- TIN_UI_V3 - COMPLETE DATABASE MIGRATION
-- Version: 1.0
-- Date: 2025-11-28
-- Description: Full database setup for Tin UI V3
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

-- Insert default users (demo passwords - NOT SECURE)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
  ('admin', 'admin@example.com', 'admin123', 'Admin User', 'admin'),
  ('testuser', 'test@example.com', 'test123', 'Test User', 'user')
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- TABLE: projects
-- Description: User projects for organizing AI generations
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);

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
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);

CREATE TRIGGER trigger_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: parameters
-- Description: AI generation parameters for sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS parameters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parameters_session_id ON parameters(session_id);

-- =====================================================
-- TABLE: content
-- Description: Generated AI content (images, videos, audio)
-- =====================================================
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
  original_prompt TEXT,
  enhanced_prompt TEXT,
  final_prompt TEXT,
  model TEXT,
  generation_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_session_id ON content(session_id);
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_media_type ON content(media_type);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);

-- =====================================================
-- TABLE: ratings
-- Description: User ratings/swipes for content
-- =====================================================
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right', 'up', 'down')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_content_id ON ratings(content_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_direction ON ratings(direction);

-- =====================================================
-- TABLE: prompt_templates (V2 legacy)
-- Description: Reusable prompt templates
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON prompt_templates(active);

-- =====================================================
-- TABLE: user_insights (V2 legacy)
-- Description: AI-analyzed user preferences
-- =====================================================
CREATE TABLE IF NOT EXISTS user_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_ratings INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  dislikes_count INTEGER DEFAULT 0,
  superlikes_count INTEGER DEFAULT 0,
  skips_count INTEGER DEFAULT 0,
  preferences JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_insights_user_id ON user_insights(user_id);

-- =====================================================
-- VIEWS: Useful aggregated data
-- =====================================================

-- Project statistics view
CREATE OR REPLACE VIEW project_stats AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.user_id,
  COUNT(DISTINCT s.id) as session_count,
  COUNT(DISTINCT c.id) as content_count,
  COUNT(DISTINCT r.id) as rating_count,
  MAX(c.created_at) as last_generation_at
FROM projects p
LEFT JOIN sessions s ON s.project_id = p.id
LEFT JOIN content c ON c.session_id = s.id
LEFT JOIN ratings r ON r.content_id = c.id
GROUP BY p.id, p.name, p.user_id;

-- Session statistics view
CREATE OR REPLACE VIEW session_stats AS
SELECT 
  s.id as session_id,
  s.name as session_name,
  s.project_id,
  COUNT(DISTINCT c.id) as content_count,
  COUNT(DISTINCT r.id) as rating_count,
  COUNT(DISTINCT p.id) as parameter_count
FROM sessions s
LEFT JOIN content c ON c.session_id = s.id
LEFT JOIN ratings r ON r.content_id = c.id
LEFT JOIN parameters p ON p.session_id = s.id
GROUP BY s.id, s.name, s.project_id;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE users IS 'User accounts for authentication and authorization';
COMMENT ON TABLE projects IS 'User projects for organizing AI generation work';
COMMENT ON TABLE sessions IS 'Generation sessions within projects with fixed parameters';
COMMENT ON TABLE parameters IS 'AI model parameters and weights for sessions';
COMMENT ON TABLE content IS 'Generated AI content (images, videos, audio)';
COMMENT ON TABLE ratings IS 'User ratings/feedback on generated content';
COMMENT ON TABLE prompt_templates IS 'Reusable prompt templates (V2 legacy)';
COMMENT ON TABLE user_insights IS 'AI-analyzed user preferences (V2 legacy)';

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ TIN_UI_V3 DATABASE MIGRATION COMPLETE';
  RAISE NOTICE '✅ ═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables created:';
  RAISE NOTICE '   - users (with admin & testuser)';
  RAISE NOTICE '   - projects';
  RAISE NOTICE '   - sessions';
  RAISE NOTICE '   - parameters';
  RAISE NOTICE '   - content';
  RAISE NOTICE '   - ratings';
  RAISE NOTICE '   - prompt_templates (V2)';
  RAISE NOTICE '   - user_insights (V2)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Test accounts:';
  RAISE NOTICE '   - admin / admin123 (role: admin)';
  RAISE NOTICE '   - testuser / test123 (role: user)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Ready to use! Start your backend server.';
  RAISE NOTICE '';
END $$;

-- Show tables
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

