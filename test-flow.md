# 🧪 Manual Testing Flow for Tin UI V3

## Prerequisites
1. ✅ Database migration applied (`use_dynamic_parameters` column exists)
2. ✅ Backend running (Vercel or local)
3. ✅ Frontend running
4. ✅ Valid API keys (OpenAI, Replicate, Seedream)

---

## Test Flow: Complete User Journey

### Phase 1: Project & Session Creation

#### Test 1.1: Create Project
**Endpoint:** `POST /api/projects`
```json
{
  "name": "Test Dating Project",
  "category": "dating",
  "userId": "test-user-id"
}
```

**Expected:**
- ✅ Status 200
- ✅ Returns `projectId`
- ✅ Project stored in DB

---

#### Test 1.2: Create Session (WITHOUT Dynamic Parameters)
**Endpoint:** `POST /api/sessions`
```json
{
  "projectId": "<projectId>",
  "userId": "test-user-id",
  "name": "Session 1 - Standard",
  "useDynamicParameters": false
}
```

**Expected:**
- ✅ Status 200
- ✅ Returns `sessionId`
- ✅ Parameters initialized (44-84 weights for dating)
- ✅ `use_dynamic_parameters` = false in DB

---

#### Test 1.3: Create Session (WITH Dynamic Parameters)
**Endpoint:** `POST /api/sessions`
```json
{
  "projectId": "<projectId>",
  "userId": "test-user-id", 
  "name": "Session 2 - Dynamic",
  "useDynamicParameters": true
}
```

**Expected:**
- ✅ Status 200
- ✅ Returns `sessionId`
- ✅ `use_dynamic_parameters` = true in DB
- ⚠️ **IF FAILS:** Migration not applied! Run SQL from BUG-001

---

### Phase 2: First Generation (No Learning Yet)

#### Test 2.1: Generate Content
**Endpoint:** `POST /api/generation/generate`
```json
{
  "sessionId": "<sessionId>",
  "projectId": "<projectId>",
  "userId": "test-user-id",
  "userPrompt": "Beautiful woman in casual outfit, natural lighting, outdoor setting",
  "count": 2,
  "model": "seedream-4"
}
```

**Expected Logs:**
```
🧠 Checking for learning insights...
ℹ️  No learning history yet (need ratings first)
🔥 Starting PARALLEL generation of 2 items...
🎨 Using Dating Photo Expert (Hybrid)
🔥 BUILDING PROMPT (HYBRID APPROACH)
🧠 Insights provided: NO
⏳ Calling GPT-4o (hybrid mode)...
✅ GPT-4o response (XXXms, XXX tokens)
```

**Expected Response:**
- ✅ Status 200
- ✅ Returns array with 2 items
- ✅ Each item has: `id`, `imageUrl`, `prompt`, `weights_used`
- ✅ No insights used (first generation)

---

### Phase 3: Rating Content (Building Learning Data)

#### Test 3.1: Rate Content - Positive
**Endpoint:** `POST /api/generation/rate`
```json
{
  "contentId": "<content-id-1>",
  "rating": 3,
  "comment": "Perfect natural lighting! Love the outdoor setting. Want more like this."
}
```

**Expected:**
- ✅ Status 200
- ✅ Weights updated instantly
- ✅ Comment stored in DB

---

#### Test 3.2: Rate Content - Negative
**Endpoint:** `POST /api/generation/rate`
```json
{
  "contentId": "<content-id-2>",
  "rating": -3,
  "comment": "Too much artificial lighting. Background is too busy. Avoid studio settings."
}
```

**Expected:**
- ✅ Status 200
- ✅ Weights adjusted down
- ✅ Comment stored

---

### Phase 4: Second Generation (WITH Learning!)

#### Test 4.1: Generate Again (Learning Active)
**Endpoint:** `POST /api/generation/generate`
```json
{
  "sessionId": "<same-sessionId>",
  "projectId": "<projectId>",
  "userId": "test-user-id",
  "userPrompt": "Attractive person in beautiful location",
  "count": 2,
  "model": "seedream-4"
}
```

**Expected Logs (CRITICAL!):**
```
🧠 Checking for learning insights...
🧠 ADAPTIVE LEARNING - ANALYZE SESSION HISTORY
✅ Found 2 rated items
   ❤️  Liked: 1 items
   💔 Disliked: 1 items
🤖 Calling GPT-4o to analyze comments...
✅ GPT-4o Analysis Complete
   ❤️  Loves: 3-7 items
   💔 Hates: 3-7 items
   💡 Suggestions: 3-7 items
✅ Found insights from 2 rated items
   ❤️  Loves: X
   💔 Hates: X
   💡 Suggestions: X

🎨 Using Dating Photo Expert (Hybrid)
🧠 Insights provided: YES
🧠 Using structured insights (analyzed by GPT-4o)
   ❤️  Loves: X
   💔 Hates: X
   💡 Suggestions: X
```

**Expected Behavior:**
- ✅ `analyzeSessionHistory()` called BEFORE generation
- ✅ GPT-4o analyzes comments
- ✅ Insights (loves/hates/suggestions) extracted
- ✅ Insights passed to agent
- ✅ Agent uses insights in prompt
- ✅ Generated content reflects learning!

**Verification:**
1. Check if new prompts avoid "artificial lighting" (from negative comment)
2. Check if new prompts emphasize "natural lighting, outdoor" (from positive comment)
3. Compare prompts - should be different from first generation

---

### Phase 5: Verify Learning Impact

#### Test 5.1: Check Weights Changed
**Endpoint:** `GET /api/sessions/<sessionId>`

**Expected:**
- ✅ Weights for "outdoor", "natural lighting" increased (>100)
- ✅ Weights for "studio", "artificial lighting" decreased (<100)

---

#### Test 5.2: Generate 3rd Time (Stronger Learning)
Rate 2-3 more items, then generate again.

**Expected:**
- ✅ More items analyzed (4-5 total)
- ✅ Stronger insights
- ✅ Clearer adaptation in prompts

---

## Success Criteria

### ✅ Core Flow Working:
1. Project & session creation works
2. First generation succeeds (no learning)
3. Rating updates weights + stores comments
4. Second generation **USES** learning insights
5. Generated content **ADAPTS** to user preferences

### 🧠 Learning Integration Working:
1. `analyzeSessionHistory()` called before generation
2. GPT-4o analyzes comments successfully
3. Insights (loves/hates/suggestions) extracted
4. Insights passed to all 3 agents
5. Agents incorporate insights into prompts

### 📊 Verifiable Changes:
1. Weights change after rating
2. Prompts differ between generations
3. Negative feedback → avoided in next generation
4. Positive feedback → emphasized in next generation

---

## Common Issues & Fixes

### ❌ "use_dynamic_parameters column not found"
**Fix:** Apply migration from `database/migrations/add_dynamic_parameters_flag.sql`

### ❌ "No insights found"
**Cause:** Not enough ratings (need 3+ rated items for best results)
**Fix:** Rate at least 2-3 items before testing learning

### ❌ "analyzeSessionHistory() not called"
**Check:** Backend logs should show "🧠 Checking for learning insights..."
**Fix:** Verify `generation.routes.js` line ~354

### ❌ "Insights provided: NO" after rating
**Check:** Verify ratings saved to DB: `SELECT * FROM content_v3 WHERE rating IS NOT NULL`
**Fix:** Ensure `/api/generation/rate` endpoint working

---

## Manual Testing Checklist

- [ ] Database migration applied
- [ ] Backend syntax check passed
- [ ] Create project successfully
- [ ] Create session (standard) successfully
- [ ] Create session (dynamic) successfully
- [ ] First generation works (no learning)
- [ ] Rate content (positive) works
- [ ] Rate content (negative) works
- [ ] Second generation shows learning logs
- [ ] `analyzeSessionHistory()` called in logs
- [ ] GPT-4o analysis appears in logs
- [ ] Insights extracted (loves/hates/suggestions)
- [ ] Agent receives insights
- [ ] Generated prompts differ from first gen
- [ ] Weights changed after rating
- [ ] Third generation shows stronger adaptation

---

## Next Steps After Testing

If all tests pass:
1. ✅ Update CODE_REVIEW_REPORT.md with results
2. ✅ Document learning flow in README.md
3. ✅ Deploy to production

If issues found:
1. ❌ Document specific errors
2. ❌ Fix critical issues first
3. ❌ Re-test

---

**Notes:**
- Learning requires **at least 2-3 rated items** to work effectively
- First generation will NOT have insights (expected)
- GPT-4o analysis adds ~2-3 seconds to generation time (only once per generation batch)
- Insights are cached per generation call (not per item)
