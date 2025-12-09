# 🗄️ SQL Migrations - Required for Production

## Міграція 1: user_insights Table Structure

### Проблема:
```
❌ column user_insights.session_id does not exist
```

### Рішення:

**Варіант A: Якщо таблиця вже існує (додати колонку)**

```sql
-- Add missing session_id column
ALTER TABLE user_insights 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_insights_session_id 
ON user_insights(session_id);

-- Add updated_at column if missing
ALTER TABLE user_insights 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_insights_updated_at 
BEFORE UPDATE ON user_insights
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Варіант B: Якщо таблиця НЕ існує або потрібно створити заново**

```sql
-- Drop old table if exists (УВАГА: втратиш дані!)
DROP TABLE IF EXISTS user_insights CASCADE;

-- Create new user_insights table
CREATE TABLE user_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  loves TEXT[] DEFAULT '{}',
  hates TEXT[] DEFAULT '{}',
  suggestions TEXT[] DEFAULT '{}',
  items_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_user_insights_session_id ON user_insights(session_id);
CREATE INDEX idx_user_insights_user_id ON user_insights(user_id);
CREATE INDEX idx_user_insights_created_at ON user_insights(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_user_insights_updated_at 
BEFORE UPDATE ON user_insights
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies (if using Row Level Security)
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights"
  ON user_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights"
  ON user_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
  ON user_insights FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Міграція 2: sessions Table (use_dynamic_parameters)

### Вже застосована раніше, але для повноти:

```sql
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS use_dynamic_parameters BOOLEAN DEFAULT false;

COMMENT ON COLUMN sessions.use_dynamic_parameters IS 
'Enable dynamic parameter extraction (experimental feature)';

CREATE INDEX IF NOT EXISTS idx_sessions_dynamic_params 
ON sessions(use_dynamic_parameters) 
WHERE use_dynamic_parameters = true;
```

---

## Міграція 3: content_v3 - qa_validation column (Optional)

### Якщо хочеш зберігати QA результати:

```sql
-- Add qa_validation column (JSONB for structured data)
ALTER TABLE content_v3 
ADD COLUMN IF NOT EXISTS qa_validation JSONB;

-- Add index for querying QA status
CREATE INDEX IF NOT EXISTS idx_content_v3_qa_status 
ON content_v3 ((qa_validation->>'status'));

-- Example structure:
-- {
--   "validated": true,
--   "score": 85,
--   "status": "approved",
--   "issues": [],
--   "timestamp": "2025-12-09T12:00:00Z"
-- }
```

---

## Міграція 4: session_ratings Table (Якщо використовуєш)

### Перевірка структури:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'session_ratings'
);

-- Expected structure:
-- CREATE TABLE session_ratings (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
--   content_id UUID REFERENCES content_v3(id) ON DELETE CASCADE,
--   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
--   rating INTEGER CHECK (rating BETWEEN -1 AND 5),
--   comment TEXT,
--   created_at TIMESTAMPTZ DEFAULT now()
-- );

-- Add indexes if missing
CREATE INDEX IF NOT EXISTS idx_session_ratings_session_id 
ON session_ratings(session_id);

CREATE INDEX IF NOT EXISTS idx_session_ratings_content_id 
ON session_ratings(content_id);

CREATE INDEX IF NOT EXISTS idx_session_ratings_created_at 
ON session_ratings(created_at DESC);
```

---

## Як застосувати міграції:

### Спосіб 1: Через Supabase Dashboard (рекомендую)

1. Зайди на https://supabase.com/dashboard
2. Відкрий свій проект
3. Перейди в "SQL Editor"
4. Скопіюй SQL з відповідної міграції
5. Натисни "Run"

### Спосіб 2: Через Supabase CLI

```bash
# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Create migration file
supabase migration new add_user_insights_session_id

# Edit migration file (додай SQL)
# migrations/YYYYMMDDHHMMSS_add_user_insights_session_id.sql

# Apply migration
supabase db push
```

### Спосіб 3: Через код (не рекомендую для production)

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const { error } = await supabase.rpc('exec_sql', {
  sql: `ALTER TABLE user_insights ADD COLUMN IF NOT EXISTS session_id UUID;`
});
```

---

## ⚠️ ВАЖЛИВО:

1. **Backup перед міграцією**: Зроби snapshot БД в Supabase
2. **Тестуй на dev**: Спочатку застосуй на тестовій БД
3. **RLS Policies**: Перевір Row Level Security після міграції
4. **Indexes**: Додай індекси для продуктивності

---

## Перевірка після міграції:

```sql
-- Check user_insights structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_insights'
ORDER BY ordinal_position;

-- Should show:
-- id          | uuid      | NO
-- session_id  | uuid      | YES
-- user_id     | uuid      | YES
-- loves       | ARRAY     | YES
-- hates       | ARRAY     | YES
-- suggestions | ARRAY     | YES
-- items_analyzed | integer | YES
-- created_at  | timestamptz | YES
-- updated_at  | timestamptz | YES
```

---

🎯 **Застосуй Міграцію 1 (user_insights) ЗАРАЗ!**

Потім перезапусти test-db-connection.js:
```bash
cd backend && node test-db-connection.js
```

Має показати:
```
✅ user_insights: X records
```
