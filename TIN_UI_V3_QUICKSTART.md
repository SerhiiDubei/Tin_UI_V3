# 🚀 Tin_UI_V3 - Quick Start Guide

## 📋 Progress Status

### ✅ Backend (COMPLETED)

1. **Database Schema** ✅
   - Projects, Sessions, Weight Parameters tables
   - Content_v3, Session Ratings
   - Agent Configs
   - Triggers and functions

2. **API Routes** ✅
   - `/api/projects` - CRUD operations
   - `/api/sessions` - Session management
   - `/api/sessions/:id/parameters` - Get weights
   - `/api/projects/:id/stats` - Statistics
   - `/api/sessions/:id/stats` - Session stats

3. **Weight Learning System** ✅
   - Dynamic parameter creation (11-14 categories)
   - Weight initialization (inherits from previous sessions)
   - Weighted random selection
   - Rating tracking for next session

4. **Models** ✅
   - Nano Banana Pro added as default
   - Seedream 4, FLUX models
   - Gemini API key configured

### 🔄 In Progress

5. **Agent System** (80% done)
   - Smart parameter creation
   - Category detection
   - Need: Prompt building with weights

6. **Generation API** (Next)
   - Step-by-step generation
   - Integration with Nano Banana Pro
   - WebSocket or SSE for real-time updates

### ⏳ Pending

7. **Frontend**
   - Projects Dashboard
   - Sessions List
   - Generation Flow
   - Swipe interface with buttons
   - Gallery

---

## 🗄️ Database Setup

### Step 1: Apply Migration

```bash
cd /home/user/webapp

# Connect to Supabase and run migration
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f database/migrations/002_v3_architecture.sql
```

**Or via Supabase Dashboard:**
1. Go to SQL Editor
2. Copy contents of `database/migrations/002_v3_architecture.sql`
3. Execute

### Step 2: Verify Tables

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'sessions', 'weight_parameters', 'content_v3', 'agent_configs');

-- Check agent configs
SELECT * FROM agent_configs;
```

Should show:
- Dating Photo Expert
- General Purpose AI

---

## 🔧 Backend Setup

### Step 1: Environment Variables

Create `.env` file in `/home/user/webapp/backend/`:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# APIs
REPLICATE_API_TOKEN=your_replicate_token
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=AIzaSyC4l1mFJNJEqB-i279aifZ3e7tTH_7VD8M

# Server
PORT=5000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000

# Optional
RATE_LIMIT=100
LOG_LEVEL=info
```

### Step 2: Install Dependencies

```bash
cd /home/user/webapp/backend
npm install
```

### Step 3: Start Backend

```bash
cd /home/user/webapp/backend
npm run dev
```

Backend runs on http://localhost:5000

---

## 🧪 Testing API

### 1. Health Check

```bash
curl http://localhost:5000/api/health
```

Expected:
```json
{
  "status": "ok",
  "timestamp": "2025-11-27T...",
  "service": "Tin_UI_V3 API",
  "version": "3.0.0"
}
```

### 2. Create Project

```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "name": "Dating Photos",
    "tag": "dating",
    "description": "Generate realistic dating profile photos"
  }'
```

Expected:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "test-user-123",
    "name": "Dating Photos",
    "tag": "dating",
    ...
  }
}
```

### 3. Create Session (Creates Parameters!)

```bash
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "userId": "test-user-123",
    "name": "Beach Photos",
    "userPrompt": "Generate photos of women at the beach"
  }'
```

Expected:
```json
{
  "success": true,
  "data": {
    "session": {...},
    "parameters": {
      "device": ["iPhone_14_Pro", "iPhone_13", ...],
      "age": ["teen", "young_adult", ...],
      ...
    },
    "parametersMetadata": {
      "category": "dating",
      "categoriesCount": 14,
      "totalSubParameters": 70
    },
    "weightsInitialized": 70
  }
}
```

### 4. Get Session Parameters

```bash
curl http://localhost:5000/api/sessions/YOUR_SESSION_ID/parameters
```

Expected:
```json
{
  "success": true,
  "data": {
    "parameters": {
      "device": [
        {"value": "iPhone_14_Pro", "weight": 100, ...},
        {"value": "iPhone_13", "weight": 100, ...}
      ],
      ...
    },
    "totalParameters": 70,
    "categories": 14
  }
}
```

---

## 📊 How It Works

### Workflow Example

```
1. User logs in
   ↓
2. User creates Project: "Dating Photos" (tag: dating)
   ↓
3. User creates Session 1
   ↓
   Agent creates parameters:
   - device: [iPhone_14_Pro, iPhone_13, ...]
   - age: [teen, young_adult, ...]
   - lighting: [golden_hour, natural_window, ...]
   - ... (11-14 categories total)
   ↓
   Weights initialized: ALL = 100
   ↓
4. User generates 10 photos
   ↓
   For each photo:
   - Agent selects parameters (weighted random)
   - Generates photo
   - User swipes: -3/-1/+1/+3
   ↓
   Ratings tracked in session_ratings table
   (Weights DON'T change in current session!)
   ↓
5. User creates Session 2
   ↓
   Agent analyzes Session 1 ratings:
   - young_adult got +3 (5 times) → weight 115
   - teen got -3 (3 times) → weight 55
   - golden_hour got +1 (7 times) → weight 135
   ↓
   Session 2 starts with learned weights!
   young_adult more likely to be selected now
```

---

## 🎯 Key Features

### 1. **Fixed Weights Per Session**
- Session 1: Create parameters, start at 100
- Session 2: Inherit weights from Session 1 + learning
- Session 3: Inherit from Session 1+2 + learning
- Weights NEVER change within a session

### 2. **Dynamic Parameters** 
Agent creates 11-14 categories based on context:
- **Dating**: device, age, pose, lighting, mood, etc.
- **Cars**: brand, model, angle, environment, style, etc.
- **Insurance**: family, emotion, setting, context, etc.
- **Custom**: Agent analyzes prompt and creates relevant parameters

### 3. **Weight Learning**
```
Rating → Weight Change
+3     → +15 (super like)
+1     → +5  (like)
-1     → -5  (dislike)
-3     → -15 (super dislike)
```

Applied to ALL parameters used in that generation.

### 4. **Weighted Selection**
Higher weight = higher probability:
```
young_adult: 115 → 35% chance
teen: 55        → 17% chance
middle_aged: 95 → 28% chance
```

---

## 📁 File Structure

```
webapp/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── index.js (✅ Gemini API added)
│   │   │   └── models.js (✅ Nano Banana Pro added)
│   │   ├── routes/
│   │   │   ├── projects.routes.js (✅ NEW)
│   │   │   ├── sessions.routes.js (✅ NEW)
│   │   │   └── index.js (✅ Updated)
│   │   ├── services/
│   │   │   ├── weights.service.js (✅ NEW)
│   │   │   ├── openai.service.js
│   │   │   └── replicate.service.js
│   │   └── server.js
│   └── .env (⚠️ Create this!)
├── database/
│   └── migrations/
│       ├── 001_initial_schema.sql (V2)
│       └── 002_v3_architecture.sql (✅ V3 NEW)
├── TIN_UI_V3_ARCHITECTURE.md (✅ Full docs)
└── TIN_UI_V3_QUICKSTART.md (✅ This file)
```

---

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check Supabase credentials
echo $SUPABASE_URL
echo $SUPABASE_KEY

# Test connection
curl $SUPABASE_URL/rest/v1/?apikey=$SUPABASE_KEY
```

### Parameters Not Created
Check logs for GPT-4o errors:
```bash
# Backend logs should show:
🤖 CREATING DYNAMIC PARAMETERS
Category: dating
✅ Parameters created: Categories: 14
```

If failed, check OPENAI_API_KEY

### Weights Not Initializing
```sql
-- Check if weight_parameters exist
SELECT COUNT(*) FROM weight_parameters WHERE session_id = 'YOUR_SESSION_ID';

-- Should return 44-84 (11-14 categories * 4-6 sub-parameters)
```

---

## 🎓 Next Steps

1. **Complete Agent System** - Build prompt from selected parameters
2. **Generation API** - Integrate with Nano Banana Pro + Gemini
3. **Step-by-Step** - WebSocket for real-time generation updates
4. **Frontend** - Build UI components
5. **Testing** - Full end-to-end testing

---

**Status:** Backend 90% Complete ✅
**Next:** Agent prompt building + Generation API 🚀
