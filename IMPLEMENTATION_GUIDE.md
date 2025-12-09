# 🔧 Повний Гайд Реалізації - Tin UI V3

## 📋 Зміст

1. [Comment-Based Learning](#1-comment-based-learning)
2. [Ad Creative Replicator](#2-ad-creative-replicator)
3. [QA Agent System](#3-qa-agent-system)
4. [Database Integration](#4-database-integration)
5. [API Endpoints](#5-api-endpoints)
6. [Configuration](#6-configuration)

---

## 1. Comment-Based Learning

### 🎯 Концепція

AI вчиться з користувацьких коментарів та рейтингів, адаптуючи Master Prompt для кращих результатів.

### 📁 Файл: `backend/src/services/adaptive-learning.service.js`

### 🔧 Основні Функції:

#### 1.1 `analyzeSessionHistory(sessionId, limit)`

**Що робить:**
- Витягує останні N rated items з БД
- Аналізує ratings + comments через GPT-4o
- Генерує structured insights

**Вхід:**
```javascript
sessionId: "uuid-string"
limit: 20  // кількість items для аналізу
```

**Вихід:**
```javascript
{
  success: true,
  hasHistory: true,
  itemsAnalyzed: 5,
  insights: {
    loves: ["Natural lighting", "Outdoor settings", "Casual poses"],
    hates: ["Studio lighting", "Stiff poses", "Too much editing"],
    suggestions: ["Use golden hour", "Focus on authenticity"]
  },
  averageRating: 4.2,
  model: 'gpt-4o',
  tokensUsed: 1234,
  duration: 2500
}
```

**GPT-4o Prompt:**
```javascript
const systemPrompt = `Analyze user feedback and extract:
- LOVES: What user consistently likes (3-5 items)
- HATES: What to avoid (3-5 items)
- SUGGESTIONS: Actionable improvements (2-3 items)

Return JSON format with arrays.`;
```

**SQL Query:**
```sql
SELECT 
  original_prompt, 
  enhanced_prompt, 
  rating, 
  comment,
  created_at
FROM content_v3
WHERE session_id = $1
  AND rating IS NOT NULL
ORDER BY created_at DESC
LIMIT $2;
```

---

#### 1.2 `buildAdaptiveSystemPrompt(basePrompt, learningResult)`

**Що робить:**
- Приймає base system prompt
- Додає insights з analyzeSessionHistory
- Повертає адаптований prompt

**Вхід:**
```javascript
basePrompt: "You are an AI assistant..."
learningResult: {
  success: true,
  insights: { loves: [...], hates: [...], suggestions: [...] },
  itemsAnalyzed: 5
}
```

**Вихід:**
```javascript
`You are an AI assistant...

🧠 LEARNED USER PREFERENCES (from 5 rated items):

✅ USER LOVES:
- Natural lighting
- Outdoor settings
- Casual poses

❌ USER HATES:
- Studio lighting
- Stiff poses
- Too much editing

💡 SUGGESTIONS:
- Use golden hour lighting
- Focus on authenticity

Incorporate these preferences naturally into your prompts.`
```

---

#### 1.3 `getSessionLearningSummary(sessionId)`

**Що робить:**
- Швидка перевірка чи є достатньо даних для learning
- Не викликає GPT-4o (безкоштовна перевірка)

**Вихід:**
```javascript
{
  hasEnoughData: true,
  totalRatings: 8,
  ratingDistribution: { 5: 3, 4: 2, 3: 1, 2: 1, 1: 1 },
  averageRating: 3.9,
  hasComments: 5
}
```

---

### 🔗 Інтеграція з Агентами

#### Dating Agent (agent-hybrid.service.js):

```javascript
export async function buildPromptHybrid(
  userPrompt, 
  agentType = 'general', 
  category = null, 
  sessionId = null,
  insights = null  // 🆕 Новий параметр
) {
  let systemPrompt = getSystemPrompt();
  
  // 🧠 Adaptive Learning
  let learningResult = insights;
  if (!learningResult && sessionId) {
    learningResult = await analyzeSessionHistory(sessionId, 20);
  }
  
  if (learningResult?.success && learningResult?.hasHistory) {
    systemPrompt = buildAdaptiveSystemPrompt(systemPrompt, learningResult);
  }
  
  // ... rest of the code
}
```

#### General Agent (agent-general.service.js):

```javascript
export async function buildPromptGeneral(
  userPrompt,
  modeId = 'text-to-image',
  modeInputs = {},
  sessionId = null,
  insights = null  // 🆕 Новий параметр
) {
  let systemPrompt = agentConfig?.system_prompt || getDefaultSystemPrompt();
  
  // 🧠 Adaptive Learning
  let learningResult = insights;
  if (!learningResult && sessionId) {
    learningResult = await analyzeSessionHistory(sessionId, 20);
  }
  
  if (learningResult?.success && learningResult?.hasHistory) {
    systemPrompt = buildAdaptiveSystemPrompt(systemPrompt, learningResult);
  }
  
  // ... rest of the code
}
```

#### Ad Replicator (agent-ad-replicator.service.js):

```javascript
export async function buildAdCreatives(
  userPrompt,
  referenceImages = [],
  additionalContext = {},
  sessionId = null,
  insights = null  // 🆕 Новий параметр
) {
  const MASTER_PROMPT = getMasterPrompt();
  
  // 🧠 Adaptive Learning
  let learningResult = insights;
  if (!learningResult && sessionId) {
    learningResult = await analyzeSessionHistory(sessionId, 20);
  }
  
  let adaptedPrompt = MASTER_PROMPT;
  if (learningResult?.success && learningResult?.hasHistory) {
    adaptedPrompt = buildAdaptiveSystemPrompt(MASTER_PROMPT, learningResult);
  }
  
  // ... rest of the code
}
```

---

### 📊 Generation Flow з Learning

```javascript
// backend/src/routes/generation.routes.js

router.post('/generate', async (req, res) => {
  const { sessionId, count } = req.body;
  
  // 🧠 Step 1: Analyze session history ONCE
  let sessionInsights = null;
  if (sessionId) {
    console.log('🧠 Analyzing session history...');
    sessionInsights = await analyzeSessionHistory(sessionId, 20);
    
    if (sessionInsights?.success && sessionInsights?.hasHistory) {
      console.log(`✅ Insights: ${sessionInsights.itemsAnalyzed} items analyzed`);
    }
  }
  
  // 🔄 Step 2: Generate multiple items
  for (let i = 0; i < count; i++) {
    // Dating Agent
    const promptResult = await buildPromptHybrid(
      userPrompt,
      agentType,
      category,
      sessionId,
      sessionInsights  // 🆕 Pass insights
    );
    
    // OR General Agent
    const promptResult = await buildPromptGeneral(
      userPrompt,
      modeId,
      modeInputs,
      sessionId,
      sessionInsights  // 🆕 Pass insights
    );
    
    // OR Ad Replicator
    const adResult = await buildAdCreatives(
      userPrompt,
      referenceImages,
      additionalContext,
      sessionId,
      sessionInsights  // 🆕 Pass insights
    );
  }
});
```

**Переваги:**
- ✅ GPT-4o викликається ОДИН РАЗ (не N раз)
- ✅ Insights переданні всім items
- ✅ Економія токенів і часу

---

## 2. Ad Creative Replicator

### 🎯 Концепція

Аналізує 1-14 reference images конкурентів, витягує "Creative DNA" і генерує 3-5 нових оригінальних креативів.

### 📁 Файл: `backend/src/services/agent-ad-replicator.service.js`

### 🔧 MASTER_PROMPT (334 lines)

**Структура:**

```javascript
const MASTER_PROMPT = `
🎨 YOU ARE: Ethical Affiliate Marketer

📋 YOUR TASK:
Analyze 1-14 competitor ad references and generate 3-5 NEW ad creatives.

⚠️ CRITICAL RULES:
❌ DON'T: Copy pixels from competitors
✅ DO: Replicate winning strategies

🔍 5-STEP EXECUTION:

STEP 1: DEEP ANALYSIS
- Layout patterns
- Color psychology
- Messaging hooks
- Visual hierarchy
- Conversion elements

STEP 2: EXTRACT CREATIVE DNA
- What makes it convert?
- Which emotions triggered?
- How attention grabbed?

STEP 3: SYNTHESIS
- Identify winning patterns
- Stack successful elements
- Adapt to niche

STEP 4: GENERATE NEW CONCEPTS
- 3-5 variations
- ORIGINAL imagery
- Same strategy, different execution

STEP 5: CRAFT AI PROMPTS (200-400 words each)
- Exact text overlays (word-for-word)
- Hex color codes (#RRGGBB)
- Layout descriptions
- Technical specs (2K/4K, aspect ratio)
- Photographer-style details

📋 OUTPUT FORMAT (JSON):
{
  "analysis_summary": "...",
  "creative_variations": [
    {
      "creative_id": 1,
      "creative_type": "Image + Text Overlay",
      "strategy_notes": "...",
      "prompt": "200-400 word detailed prompt...",
      "technical_params": {
        "model": "nano-banana-pro",
        "aspect_ratio": "1:1",
        "image_size": "2k"
      }
    }
  ]
}

✅ DO'S (12 items):
1. Always generate NEW images
2. Preserve creative STRATEGY not pixels
3. Include all text in prompts (word-for-word)
4. Match visual quality
5. Adapt to niche
6. Maintain conversion elements
7. Generate multiple variations (3-5)
8. Use maximum references available
9. Request high resolution (2K/4K)
10. Think like photographer + designer
11. Include hex colors
12. Specify exact layout

❌ DON'TS (10 items):
1. Don't just add text to competitor images
2. Don't copy exact visual details
3. Don't ignore niche requirements
4. Don't write vague prompts
5. Don't forget platform specs
6. Don't skip competitive advantages
7. Don't overlook small details
8. Don't generate fewer variations
9. Don't use wrong model
10. Don't forget conversion goal

💡 ADVANCED TIPS (5 items):
1. Pattern Stacking: Combine 2-3 winning patterns
2. Niche Adaptation: Customize for specific audience
3. Reference Usage: More refs = better insights
4. Iteration Strategy: Generate variations with tweaks
5. Platform Optimization: Instagram, FB, TikTok specs

✅ FINAL CHECKLIST (12 items):
□ 3-5 variations generated?
□ Each prompt 200-400 words?
□ Hex colors included?
□ Resolution specified (2K/4K)?
□ Text overlays word-for-word?
□ Layout described?
□ Technical params set?
□ Niche adapted?
□ Conversion elements preserved?
□ Original imagery (not copied)?
□ Model: nano-banana-pro?
□ JSON format correct?

🎯 FULL WORKFLOW EXAMPLE: Teeth Whitening

INPUT:
- 5 reference images (competitors)
- Niche: Teeth Whitening
- Target: Adults 25-45
- Platform: Instagram

ANALYSIS:
- Common pattern: Before/after comparisons
- Colors: White (#FFFFFF), Blue (#2E86AB)
- Hook: "7 Days to Whiter Teeth"
- CTA: "Try Risk-Free"

OUTPUT (3 variations):

VARIATION 1: Close-up Smile
"Professional photograph of a young woman (28-32) with a bright, 
natural smile showing perfectly white teeth, shot in soft natural 
daylight streaming from the left... [200-400 words total]

Text overlays:
- Headline (top): "Whiter Teeth in 7 Days" (#2C3E50, 48px)
- Subhead: "Clinically Proven" (#34495E, 24px)
- CTA button: "Try Risk-Free" (bg: #E74C3C, text: #FFFFFF, 200x60px)

Colors: White #FFFFFF, Blue #3498DB, Red #E74C3C
Resolution: 2K (2048x2048)
Aspect ratio: 1:1 (Instagram)
Model: nano-banana-pro"

[+ 2 more variations]

🚀 YOUR MANTRA:
"I don't copy pixels, I replicate strategies."
`;
```

---

### 🔗 Vision AI Integration

```javascript
// Якщо є reference images, викликається Vision AI
if (referenceImages && referenceImages.length > 0) {
  const visionResult = await analyzeImages(referenceImages);
  
  // visionResult.analysis містить:
  // - niche: 'dating_app_lifestyle'
  // - targetAudience: 'young adults 18-30...'
  // - platform: 'Instagram'
  // - styleAnalysis: { colors, composition, mood }
  // - photoDescriptions: [detailed descriptions]
}
```

---

### 📊 Generation Flow

```javascript
// 1. Vision AI аналіз (якщо є images)
const visionAnalysis = modeInputs.visionAnalysis;

// 2. Extract niche/audience/platform
const niche = modeInputs.niche || visionAnalysis?.analysis?.niche;
const targetAudience = modeInputs.target_audience || 
                       visionAnalysis?.analysis?.targetAudience;
const platform = modeInputs.platform || visionAnalysis?.analysis?.platform;

// 3. Build context
const additionalContext = {
  niche,
  targetAudience,
  platform,
  variations: count,
  visionAnalysis
};

// 4. Call Ad Replicator
const adResult = await buildAdCreatives(
  userPrompt,
  referenceImages,
  additionalContext,
  sessionId,
  sessionInsights
);

// 5. Generate images for each variation
for (const variation of adResult.variations) {
  const imageResult = await generateImageGenSpark({
    prompt: variation.prompt,
    model: 'nano-banana-pro',
    aspect_ratio: '1:1',
    image_size: '2k'
  });
}
```

---

## 3. QA Agent System

### 🎯 Концепція

Автоматична валідація згенерованих промптів перед генерацією зображень.

### 📁 Файл: `backend/src/services/qa-agent.service.js`

### 🔧 Функції:

#### 3.1 `quickValidate(enhancedPrompt, agentType, model)`

**Rule-Based перевірка (без GPT-4o):**

**For Ad Replicator:**
```javascript
// 1. Word count (200-400)
const wordCount = prompt.split(/\s+/).length;
if (wordCount < 200) {
  issues.push({ 
    severity: 'critical',
    message: `Too short (${wordCount} words, need 200-400)`
  });
}

// 2. Hex colors
const hexColors = prompt.match(/#[0-9A-Fa-f]{6}/g);
if (!hexColors) {
  issues.push({ 
    severity: 'major',
    message: 'Missing hex color codes'
  });
}

// 3. Resolution
const resKeywords = ['2k', '4k', '1080p', '2160p'];
const hasRes = resKeywords.some(kw => prompt.toLowerCase().includes(kw));
if (!hasRes) {
  issues.push({ 
    severity: 'major',
    message: 'Missing resolution specification'
  });
}

// 4. Text overlays
const textKeywords = ['text:', 'headline:', 'cta:', 'button:'];
const hasText = textKeywords.some(kw => prompt.toLowerCase().includes(kw));
if (!hasText) {
  issues.push({ 
    severity: 'major',
    message: 'Missing text overlay specification'
  });
}
```

**For Dating:**
```javascript
// 1. Filename check
if (!prompt.match(/IMG_\d{4}|DSC_\d{4}/i)) {
  issues.push({ 
    severity: 'critical',
    message: 'Missing smartphone filename'
  });
}

// 2. Technical jargon
const jargon = ['aperture', 'bokeh', 'diffusion'];
if (jargon.some(term => prompt.toLowerCase().includes(term))) {
  issues.push({ 
    severity: 'major',
    message: 'Technical jargon detected'
  });
}

// 3. Imperfections
const imperfectionKeywords = ['slight', 'subtle', 'casual', 'off-center'];
if (!imperfectionKeywords.some(kw => prompt.toLowerCase().includes(kw))) {
  issues.push({ 
    severity: 'major',
    message: 'Missing authentic imperfections'
  });
}
```

**Scoring:**
```javascript
const score = Math.max(0, 100 - (issues.length * 15));
const status = score >= 70 ? 'approved' : 
               score >= 50 ? 'needs_revision' : 'rejected';
```

---

#### 3.2 `validatePrompt(promptData)` (GPT-4o)

**Повна валідація через GPT-4o:**

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: getQASystemPrompt(agentType) },
    { role: 'user', content: buildValidationPrompt(promptData) }
  ],
  max_tokens: 3000,  // 🆕 Збільшено з 1500
  temperature: 0.3,
  response_format: { type: "json_object" }
});

// Expected output:
{
  "status": "approved",
  "score": 85,
  "issues": [],
  "strengths": ["Detailed description", "Good color spec"],
  "modelCompatibility": { compatible: true },
  "feedbackUsage": { commentsUsed: true },
  "overallFeedback": "..."
}
```

---

### 🔗 Integration в Generation Flow

```javascript
// Step 2.5: QA Validation (Optional)
let qaResult = null;
if (enableQA) {
  qaResult = await quickValidate(enhancedPrompt, agentType, model);
  
  console.log(`QA Score: ${qaResult.validation.score}/100`);
  
  if (qaResult.validation.status === 'rejected') {
    throw new Error('QA rejected prompt');
  }
  
  if (qaResult.validation.issues.length > 0) {
    console.log('QA Issues:', qaResult.validation.issues);
  }
}
```

---

## 4. Database Integration

### 🗄️ Tables Schema

#### content_v3:
```sql
CREATE TABLE content_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  project_id UUID,
  user_id UUID,
  url TEXT,
  type TEXT DEFAULT 'image',
  original_prompt TEXT,
  enhanced_prompt TEXT,
  final_prompt TEXT,
  model TEXT,
  agent_type TEXT,  -- 'dating', 'general', 'ad-replicator'
  weights_used JSONB,
  rating INTEGER CHECK (rating BETWEEN -1 AND 5),
  comment TEXT,
  rated_at TIMESTAMPTZ,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  qa_validation JSONB  -- QA results
);
```

#### session_ratings:
```sql
CREATE TABLE session_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  content_id UUID REFERENCES content_v3(id),
  user_id UUID,
  rating INTEGER CHECK (rating BETWEEN -1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### user_insights:
```sql
CREATE TABLE user_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),  -- 🆕 ADDED
  user_id UUID,
  loves TEXT[],
  hates TEXT[],
  suggestions TEXT[],
  items_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 📊 Save to DB

```javascript
// Prepare data
const contentData = {
  session_id: sessionId,
  project_id: projectId,
  user_id: userId,
  url: generationResult.url,
  type: 'image',
  original_prompt: userPrompt,
  enhanced_prompt: enhancedPrompt,
  final_prompt: enhancedPrompt,
  model: model,
  agent_type: agentType,
  weights_used: weightsSnapshot
};

// Add QA validation (optional)
if (qaSnapshot && enableQA) {
  contentData.qa_validation = qaSnapshot;
}

// Insert
const { data: content, error } = await supabase
  .from('content_v3')
  .insert([contentData])
  .select()
  .single();
```

---

## 5. API Endpoints

### POST `/api/generation/generate`

**Request:**
```javascript
{
  "userPrompt": "Young woman...",
  "sessionId": "uuid",
  "projectId": "uuid",
  "userId": "uuid",
  "agentType": "dating",  // or 'general', 'ad-replicator'
  "model": "seedream-4",
  "count": 3,
  "enableQA": true,
  
  // For ad-replicator:
  "modeId": "ad-replicator",
  "modeInputs": {
    "reference_images": ["url1", "url2"],
    "niche": "dating_app",
    "target_audience": "young adults 18-30",
    "platform": "Instagram"
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "results": [
    {
      "success": true,
      "content": {
        "id": "uuid",
        "url": "https://...",
        "enhanced_prompt": "...",
        "agent_type": "dating",
        "weights_used": {...},
        "created_at": "2025-12-09T..."
      },
      "itemNumber": 1
    }
  ],
  "sessionId": "uuid",
  "generated": 3,
  "failed": 0
}
```

---

## 6. Configuration

### Environment Variables (.env):
```bash
# Supabase
SUPABASE_URL=https://...
SUPABASE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# API Keys
OPENAI_API_KEY=sk-...
REPLICATE_API_KEY=r8_...
GEMINI_API_KEY=AIza...

# Server
PORT=5000
NODE_ENV=production

# CORS
CORS_ORIGINS=https://yourdomain.com
```

### Token Limits (GPT-4o):
```javascript
// Ad Replicator
max_tokens: 6000

// General Agent
max_tokens: 1600

// Hybrid (Dating)
max_tokens: 1600

// QA Agent
max_tokens: 3000

// Agent Service
max_tokens: 1000
```

---

## 🎉 Summary

**Всі 3 системи інтегровані:**
- ✅ Comment-Based Learning
- ✅ Ad Creative Replicator
- ✅ QA Agent

**Тести:**
- ✅ 52/52 passed

**Готово до production:** ✅ YES

---

**Last Updated:** 2025-12-09  
**File:** IMPLEMENTATION_GUIDE.md
