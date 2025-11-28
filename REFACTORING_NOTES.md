# 🔧 Refactoring Notes - API Systems

## 📊 Current State (2 Parallel Systems)

### ❌ OLD SYSTEM (Deprecated)
**Location:** `/api/content` routes
**Files:**
- `backend/src/routes/content.routes.js`
- `backend/src/services/openai.service.js` (partially)

**Problems:**
- ❌ Does NOT use weight system
- ❌ Does NOT learn from ratings
- ❌ Does NOT use weighted parameter selection
- ❌ GPT-4o decides everything "blindly"

**Flow:**
```
User prompt → detectCategory() → enhancePrompt() → Generate
              (no weights!)
```

---

### ✅ NEW SYSTEM (V3 - Active)
**Location:** `/api/generation` routes
**Files:**
- `backend/src/routes/generation.routes.js`
- `backend/src/services/weights.service.js`
- `backend/src/services/agent.service.js`

**Features:**
- ✅ Weighted parameter selection
- ✅ Learns from user ratings (-3, -1, +1, +3)
- ✅ Instant weight updates after each rating
- ✅ 11-14 dynamic parameters per category
- ✅ Inherits weights from previous sessions
- ✅ Supabase DB persistence

**Flow:**
```
User prompt → createParametersForCategory() → 11-14 parameters
           ↓
initializeSessionWeights() → Load from DB or defaults (100)
           ↓
selectParametersWeighted() → 🎲 Weighted random selection
           ↓
buildPromptFromParameters() → GPT-4o builds natural language
           ↓
Generate image → Save with weights_used snapshot
           ↓
User rates (-3/-1/+1/+3) → updateWeightsInstantly()
           ↓
Weights updated in DB (±5, ±15) → Next generation uses new weights
```

---

## 📋 Function Usage Map

### openai.service.js
| Function | Used By | Status |
|----------|---------|--------|
| `enhancePrompt()` | content.routes.js | ⚠️ DEPRECATED |
| `detectCategory()` | content.routes.js | ⚠️ DEPRECATED (use agent.service.js) |
| `analyzeComments()` | insights.service.js | ✅ ACTIVE |
| `detectUsedParameters()` | Not used | ❌ DELETE |

### agent.service.js (V3)
| Function | Used By | Status |
|----------|---------|--------|
| `buildPromptFromParameters()` | generation.routes.js | ✅ ACTIVE |
| `detectCategory()` | sessions.routes.js | ✅ ACTIVE |
| `analyzeSessionRatings()` | Not yet used | 🔮 FUTURE |

### weights.service.js (V3)
| Function | Used By | Status |
|----------|---------|--------|
| `createParametersForCategory()` | sessions.routes.js | ✅ ACTIVE |
| `initializeSessionWeights()` | sessions.routes.js | ✅ ACTIVE |
| `selectParametersWeighted()` | generation.routes.js | ✅ ACTIVE |
| `updateWeightsInstantly()` | generation.routes.js | ✅ ACTIVE |
| `getSessionWeightsVisualization()` | sessions.routes.js | ✅ ACTIVE |

---

## 🎯 Migration Path

### Phase 1: Mark as Deprecated (DONE ✅)
- [x] Add `@deprecated` comments to old functions
- [x] Add warnings in content.routes.js

### Phase 2: Update Documentation
- [x] Create this refactoring notes file
- [ ] Update README with V3 system explanation
- [ ] Update API documentation

### Phase 3: Deprecate Old Routes (Future)
Options:
1. **Keep both** - old routes for backward compatibility
2. **Migrate clients** - update all clients to use V3
3. **Remove old** - delete content.routes.js after migration

**Recommendation:** Keep old routes for now, add deprecation warnings in responses.

---

## 🔥 Key Differences

| Feature | Old System | V3 System |
|---------|-----------|-----------|
| **Weight system** | ❌ No | ✅ Yes |
| **Learning** | ❌ No | ✅ From ratings |
| **Parameters** | Static (11 hardcoded) | Dynamic (11-14 by GPT-4o) |
| **Selection** | Random | Weighted random |
| **Persistence** | ❌ No | ✅ Supabase DB |
| **Session memory** | ❌ No | ✅ Inherits from project |
| **Categories** | Only dating | Any (dynamic) |

---

## 📝 Next Steps

1. **Frontend:** Ensure all new features use `/api/generation` endpoints
2. **Testing:** Test V3 flow end-to-end
3. **Monitoring:** Track which endpoints are still using old system
4. **Migration:** Plan deprecation timeline for old endpoints

---

## 🚀 V3 API Endpoints

### Generation
- `POST /api/generation/generate` - Generate with weights
- `POST /api/generation/rate` - Rate and update weights
- `GET /api/generation/gallery` - View session gallery
- `GET /api/generation/models` - Get available models

### Sessions
- `POST /api/sessions` - Create session (initializes weights)
- `GET /api/sessions/:id` - Get session details
- `GET /api/sessions/:id/weights` - Visualize weights

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id/sessions` - List project sessions

---

## ✅ Verification Checklist

Before removing old system:
- [ ] All frontend components use V3 endpoints
- [ ] No external clients depend on old endpoints
- [ ] Database has all necessary migrations
- [ ] Weights system tested thoroughly
- [ ] Performance benchmarks meet requirements
- [ ] Error handling is robust
- [ ] Logging is comprehensive

---

**Last Updated:** 2025-11-28
**Status:** V3 system is production-ready, old system deprecated but not removed

