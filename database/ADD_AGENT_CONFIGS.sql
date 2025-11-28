-- =====================================================
-- TABLE: agent_configs
-- Description: AI Agent configurations for different content types
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,  -- 'dating', 'general', 'cars', 'fashion'...
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  version TEXT DEFAULT 'v1',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_configs_type ON agent_configs(type);
CREATE INDEX IF NOT EXISTS idx_agent_configs_active ON agent_configs(active);

-- Insert default agents
INSERT INTO agent_configs (type, name, description, system_prompt, active) VALUES
(
  'dating',
  'Dating Photo Expert',
  'Specialized in realistic smartphone dating photos with authentic imperfections',
  'You are an expert AI prompt engineer specialized in creating realistic smartphone dating photos.

Focus on:
- Authentic smartphone photography style (iPhone, Android)
- Natural poses and expressions for dating profiles
- Real-world lighting and casual settings
- Technical imperfections for realism (slight blur, lens flare, off-center framing)
- Dating-specific elements: genuine smiles, casual clothing, relatable backgrounds

Create prompts that feel like real people took them on real phones.

Style: Natural, casual, authentic, relatable.',
  true
),
(
  'general',
  'General Purpose AI',
  'Universal AI for any content type with dynamic parameter adaptation',
  'You are an expert AI prompt engineer.

Create detailed, professional prompts for AI image generation.

Focus on:
- Clear, descriptive language
- Technical details when appropriate
- Strong composition and lighting
- Style consistency across generations
- Adaptability to any content category

Analyze user intent and create prompts that match their vision.

Style: Clear, descriptive, natural language.',
  true
)
ON CONFLICT DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER trigger_agent_configs_updated_at
  BEFORE UPDATE ON agent_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON agent_configs TO authenticated;
GRANT SELECT ON agent_configs TO anon;

