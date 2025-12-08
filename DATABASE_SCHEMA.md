# 🗄️ Database Schema - Tin UI V3

Complete PostgreSQL database schema documentation for the Tin UI V3 weighted learning system.

---

## 📊 Overview

**Database Provider:** Supabase (PostgreSQL 15+)  
**Schema Version:** 3.1.0  
**Last Updated:** 2025-12-08

### Key Features
- **Cascading deletes** for data integrity
- **Auto-updating timestamps** via triggers
- **Indexed queries** for performance
- **JSONB fields** for flexible metadata
- **UUID primary keys** for security

---

## 📋 Tables

### 1. `users`
User accounts and authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | User unique identifier |
| `username` | TEXT | UNIQUE, NOT NULL | Username for login |
| `email` | TEXT | UNIQUE, NOT NULL | User email address |
| `password_hash` | TEXT | NOT NULL | Bcrypt hashed password |
| `full_name` | TEXT | | User's full name |
| `role` | TEXT | NOT NULL, DEFAULT 'user' | User role (user, admin) |
| `is_active` | BOOLEAN | DEFAULT true | Account active status |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Account creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |
| `last_login_at` | TIMESTAMPTZ | | Last login timestamp |

**Indexes:**
- `idx_users_username` - Username lookup
- `idx_users_email` - Email lookup
- `idx_users_role` - Role filtering

**Triggers:**
- Auto-updates `updated_at` on modifications

---

### 2. `projects`
User projects for organizing content generation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Project unique identifier |
| `user_id` | UUID | FOREIGN KEY → users(id) | Project owner |
| `name` | TEXT | NOT NULL | Project display name |
| `tag` | TEXT | NOT NULL | Project category (dating, general) |
| `description` | TEXT | | Project description |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification time |

**Indexes:**
- `idx_projects_user_id` - User's projects lookup
- `idx_projects_tag` - Category filtering

**Relationships:**
- Each project belongs to ONE user
- Deleting user → cascades delete projects
- Projects can have MANY sessions

---

### 3. `sessions`
Generation sessions within projects. Each session tracks learning progress.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Session unique identifier |
| `project_id` | UUID | FOREIGN KEY → projects(id) | Parent project |
| `user_id` | UUID | FOREIGN KEY → users(id) | Session owner |
| `name` | TEXT | NOT NULL | Session display name |
| `use_dynamic_parameters` | BOOLEAN | DEFAULT false | Enable dynamic parameter extraction |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Session creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_sessions_project_id` - Project's sessions lookup
- `idx_sessions_user_id` - User's sessions lookup
- `idx_sessions_dynamic_params` - Dynamic parameter filtering (where enabled)

**Relationships:**
- Each session belongs to ONE project
- Deleting project → cascades delete sessions
- Sessions have MANY weight_parameters
- Sessions have MANY content_v3 records

**New Features (v3.1):**
- `use_dynamic_parameters` - Experimental feature toggle (added 2025-12-08)

---

### 4. `agent_configs`
AI Agent configuration and system prompts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Config unique identifier |
| `type` | TEXT | UNIQUE, NOT NULL | Agent type (dating, general) |
| `name` | TEXT | NOT NULL | Agent display name |
| `description` | TEXT | | Agent description |
| `system_prompt` | TEXT | NOT NULL | AI system prompt template |
| `default_parameters` | JSONB | DEFAULT '{}' | Default parameter structure |
| `active` | BOOLEAN | DEFAULT true | Agent enabled status |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification time |

**Indexes:**
- `idx_agent_configs_type` - Agent type lookup
- `idx_agent_configs_active` - Active agents filtering

**Pre-configured Agents:**
1. **`general`** - Universal AI for any content type
2. **`dating`** - Specialized for realistic smartphone dating photos

---

### 5. `weight_parameters` ⭐ (Core Learning System)
Weighted parameters for the adaptive learning system. This is the heart of the AI's personalization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Parameter unique identifier |
| `session_id` | UUID | FOREIGN KEY → sessions(id) | Parent session |
| `category` | TEXT | DEFAULT 'general' | Parameter category/niche |
| `parameter_name` | TEXT | NOT NULL | Parameter category name |
| `sub_parameter` | TEXT | NOT NULL | Specific option/value |
| `weight` | FLOAT | DEFAULT 100.0 | Learning weight (0-1000+) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last weight update time |

**Unique Constraint:**
- `(session_id, parameter_name, sub_parameter)` - Prevents duplicates

**Indexes:**
- `idx_weight_parameters_session_id` - Session's weights lookup
- `idx_weight_parameters_category` - Category filtering
- `idx_weight_parameters_name` - Parameter name lookup
- `idx_weight_parameters_weight DESC` - Weight-based sorting (high → low)

**How Weights Work:**

**Initial State:**
```json
{
  "lighting.golden_hour": 100,
  "lighting.studio_bright": 100,
  "composition.centered": 100,
  "composition.rule_of_thirds": 100
}
```

**After User Ratings:**
```json
{
  "lighting.golden_hour": 130,  // ↑ User liked content with this
  "lighting.studio_bright": 85,  // ↓ User disliked content with this
  "composition.centered": 120,
  "composition.rule_of_thirds": 110
}
```

**Next Generation:**
- AI selects parameters weighted by these values
- Higher weights = more likely to be selected
- Continuous learning across generations

**Weight Update Formula:**
```
New Weight = Old Weight + (Rating × Multiplier)

Rating Scale:
  ⭐ 1 star = -20 points
  ⭐⭐ 2 stars = -10 points
  ⭐⭐⭐ 3 stars = 0 points (neutral)
  ⭐⭐⭐⭐ 4 stars = +10 points
  ⭐⭐⭐⭐⭐ 5 stars = +20 points

Swipe:
  ← Left = Rating 2 (-10 points)
  → Right = Rating 4 (+10 points)
```

**Parameter Structure Examples:**

**Universal Parameters (12 categories):**
```
composition: [centered, rule_of_thirds, diagonal, symmetrical, asymmetrical]
lighting: [golden_hour, studio_bright, natural_soft, dramatic_shadow, backlit]
color_palette: [warm_tones, cool_tones, monochromatic, vibrant, pastel]
mood: [professional, casual, energetic, serene, dramatic]
subject_type: [portrait, object, scene, abstract, action]
setting: [indoor, outdoor, urban, natural, studio]
camera_angle: [eye_level, high_angle, low_angle, birds_eye, worms_eye]
depth_of_field: [shallow, medium, deep, bokeh, hyperfocal]
visual_style: [realistic, artistic, cinematic, editorial, documentary]
time_of_day: [morning, midday, afternoon, evening, night]
texture_detail: [smooth, rough, glossy, matte, grainy]
perspective: [straight_on, tilted, wide_angle, telephoto, macro]
```

**Dynamic Parameters (automotive_insurance example):**
```
vehicle_positioning: [front_3_4_angle, side_profile, rear_angle, full_frontal]
trust_visual_elements: [shield_icon, checkmark, padlock, stars, badge]
brand_color_palette: [corporate_blue, trust_green, neutral_gray, premium_black]
lighting_atmosphere: [golden_hour, bright_daylight, studio_perfect, sunset_glow]
setting_context: [urban_modern, highway_open, parking_secure, home_driveway]
```

---

### 6. `content_v3`
Generated AI content (images, videos, audio) with ratings and metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Content unique identifier |
| `session_id` | UUID | FOREIGN KEY → sessions(id) | Parent session |
| `project_id` | UUID | FOREIGN KEY → projects(id) | Parent project |
| `user_id` | UUID | FOREIGN KEY → users(id) | Content owner |
| `type` | TEXT | DEFAULT 'image' | Content type (image, video, audio) |
| `url` | TEXT | NOT NULL | Storage URL (Supabase Storage) |
| `original_prompt` | TEXT | | User's original input |
| `enhanced_prompt` | TEXT | | AI-enhanced prompt (Vision AI) |
| `final_prompt` | TEXT | | Final prompt sent to generator |
| `model` | TEXT | | AI model used (seedream-4, flux, etc.) |
| `agent_type` | TEXT | | Agent used (dating, general, ad-replicator) |
| `rating` | INTEGER | | User rating (1-5 stars) |
| `rated_at` | TIMESTAMPTZ | | Rating timestamp |
| `comment` | TEXT | | User comment/feedback |
| `weights_used` | JSONB | DEFAULT '{}' | Snapshot of weights at generation |
| `generation_metadata` | JSONB | DEFAULT '{}' | Additional generation data |
| `qa_validation` | JSONB | | QA Agent validation results |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Generation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_content_v3_session_id` - Session's content lookup
- `idx_content_v3_project_id` - Project's content lookup
- `idx_content_v3_user_id` - User's content lookup
- `idx_content_v3_rating` - Rating filtering
- `idx_content_v3_rated_at DESC` - Recently rated content
- `idx_content_v3_created_at DESC` - Recently created content
- `idx_content_v3_qa_status` - QA validation status filtering

**JSONB Fields:**

**`weights_used` structure:**
```json
{
  "lighting.golden_hour": 130,
  "composition.centered": 120,
  "mood.professional": 110,
  "total_parameters": 58
}
```

**`generation_metadata` structure:**
```json
{
  "seed": 42,
  "inference_steps": 28,
  "guidance_scale": 7.5,
  "negative_prompt": "blurry, low quality",
  "generation_time_ms": 45000,
  "cost_usd": 0.03,
  "model_version": "4.0",
  "parameters_count": 12
}
```

**`qa_validation` structure:**
```json
{
  "status": "approved",
  "score": 8.5,
  "flags": [],
  "feedback": {
    "quality": "excellent",
    "prompt_match": true,
    "technical_issues": []
  },
  "validated_at": "2025-12-08T10:30:00Z"
}
```

---

## 🔄 Relationships Diagram

```
┌─────────┐
│  users  │
└────┬────┘
     │ 1
     │
     │ N
┌────┴────────┐
│  projects   │
└────┬────────┘
     │ 1
     │
     │ N
┌────┴─────────┐
│  sessions    │────┐
└────┬─────────┘    │
     │ 1            │ 1
     │              │
     │ N            │ N
┌────┴──────────────┴──────┐
│  weight_parameters        │
└───────────────────────────┘
     
┌────────────┐
│  sessions  │
└────┬───────┘
     │ 1
     │
     │ N
┌────┴───────────┐
│  content_v3    │
└────────────────┘
```

**Cascade Delete Rules:**
- Delete User → Delete Projects → Delete Sessions → Delete Weights + Content
- Delete Project → Delete Sessions → Delete Weights + Content
- Delete Session → Delete Weights + Content

---

## 🔒 Security

### Row-Level Security (RLS)
Supabase RLS policies ensure users can only access their own data:

```sql
-- Users can only view/modify their own data
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own projects" ON projects
  USING (user_id = auth.uid());

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own sessions" ON sessions
  USING (user_id = auth.uid());

ALTER TABLE content_v3 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own content" ON content_v3
  USING (user_id = auth.uid());
```

### Authentication
- **Provider:** Supabase Auth
- **Method:** JWT tokens
- **Password:** Bcrypt hashed (cost factor 10)

---

## 📈 Performance

### Query Optimization
All frequently queried fields are indexed:
- Foreign keys for JOIN operations
- `created_at` for chronological queries
- `rating` for filtering rated content
- `weight DESC` for weighted selection

### JSONB Indexing
```sql
-- Index for QA validation status queries
CREATE INDEX idx_content_v3_qa_status 
  ON content_v3((qa_validation->>'status')) 
  WHERE qa_validation IS NOT NULL;
```

### Estimated Query Times (10K records)
- Get user's projects: ~5ms
- Get session's weights: ~10ms
- Get session's content: ~15ms
- Weight history analysis: ~50ms
- Full project statistics: ~100ms

---

## 🗃️ Storage

### Supabase Storage Buckets

**`generated-content` bucket:**
```
generated-content/
├── {user_id}/
│   └── {session_id}/
│       └── {content_id}.jpg
```

**Storage Policies:**
- Public read access for generated content
- Authenticated write access only
- Max file size: 50MB
- Allowed types: image/*, video/*, audio/*

---

## 🔧 Migrations

### Applied Migrations
1. `FINAL_MIGRATION.sql` - Core schema (v3.1.0)
2. `add_dynamic_parameters_flag.sql` - Dynamic parameters feature (2025-12-08)

### Running Migrations

**In Supabase Dashboard:**
1. Go to SQL Editor
2. Paste migration SQL
3. Run

**Via CLI:**
```bash
supabase db push --file database/migrations/add_dynamic_parameters_flag.sql
```

---

## 📊 Example Queries

### Get User's Projects with Stats
```sql
SELECT 
  p.*,
  COUNT(DISTINCT s.id) as sessions_count,
  COUNT(DISTINCT c.id) as content_count,
  AVG(c.rating) as avg_rating
FROM projects p
LEFT JOIN sessions s ON s.project_id = p.id
LEFT JOIN content_v3 c ON c.project_id = p.id
WHERE p.user_id = 'user-uuid'
GROUP BY p.id
ORDER BY p.created_at DESC;
```

### Get Session's Weights Sorted by Strength
```sql
SELECT 
  parameter_name,
  sub_parameter,
  weight,
  category
FROM weight_parameters
WHERE session_id = 'session-uuid'
ORDER BY weight DESC
LIMIT 20;
```

### Get Unrated Content
```sql
SELECT *
FROM content_v3
WHERE session_id = 'session-uuid'
  AND rating IS NULL
ORDER BY created_at ASC;
```

### Get Weight Learning History
```sql
-- Get initial and current weights
WITH initial_weights AS (
  SELECT 
    parameter_name,
    sub_parameter,
    weight as initial_weight
  FROM weight_parameters
  WHERE session_id = 'session-uuid'
    AND updated_at = created_at
),
current_weights AS (
  SELECT 
    parameter_name,
    sub_parameter,
    weight as current_weight
  FROM weight_parameters
  WHERE session_id = 'session-uuid'
)
SELECT 
  i.parameter_name,
  i.sub_parameter,
  i.initial_weight,
  c.current_weight,
  (c.current_weight - i.initial_weight) as change,
  ROUND(((c.current_weight - i.initial_weight) / i.initial_weight * 100)::numeric, 2) as percent_change
FROM initial_weights i
JOIN current_weights c 
  ON i.parameter_name = c.parameter_name 
  AND i.sub_parameter = c.sub_parameter
WHERE c.current_weight != i.initial_weight
ORDER BY ABS(c.current_weight - i.initial_weight) DESC;
```

---

## 📝 Notes

### Parameter Count Guidelines
- **Dating Agent:** 11 fixed parameters
- **General Agent (Universal):** 12 categories × 5-6 options = 60-72 weights
- **General Agent (Dynamic):** 11-14 categories × 4-6 options = 44-84 weights

### Weight Value Ranges
- **Default:** 100 (neutral)
- **Minimum:** 0 (never select)
- **Maximum:** No hard limit (1000+ possible with high ratings)
- **Typical range:** 50-200

### Session Lifecycle
1. **Create session** → Initialize weights (all 100)
2. **Generate content** → Select params by weights
3. **User rates** → Update weights
4. **Next generation** → Use updated weights
5. **New session** → Inherit final weights from previous session

---

**Last Updated:** 2025-12-08  
**Schema Version:** 3.1.0  
**Migration Files:** `database/FINAL_MIGRATION.sql`, `database/migrations/add_dynamic_parameters_flag.sql`
