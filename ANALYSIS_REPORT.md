# 🔍 АНАЛІЗ АГЕНТІВ ТА СИСТЕМА QA

## 📊 ПОТОЧНА АРХІТЕКТУРА

### 1️⃣ ДВА АГЕНТИ

#### **Dating Agent** (`agent.service.js`)
**Спеціалізація:** Realistic smartphone dating photos (Seedream 4.0 style)

**Що робить:**
1. Завантажує конфігурацію з БД (`agent_configs` table, type='dating')
2. Обирає параметри з фіксованих 11 категорій (з `dating-parameters.js`)
3. Конвертує параметри в natural language через `getParameterDescription()`
4. Додає imperfections для автентичності через `getImperfections()`
5. Завантажує коментарі з попередніх оцінок
6. Викликає GPT-4o з MASTER PROMPT
7. Повертає prompt для генерації

**Правила Dating Agent:**
- ✅ Використовувати IMG_####.HEIC або DSC_####.JPG filename
- ✅ Вказувати device (iPhone 14 Pro, Pixel 7, тощо)
- ✅ Включати 1-3 realistic imperfections
- ✅ Natural flowing language (БЕЗ technical tags як [SUBJECT]:)
- ✅ Era-consistent (device year відповідає можливостям)
- ✅ Smartphone photo aesthetic (portrait mode, selfie style)
- ✅ Дотримуватись 11 категорій параметрів з DATING_PARAMETERS
- ✅ Враховувати коментарі користувача (HIGH PRIORITY)

---

#### **General Agent** (`agent.service.js` + `agent-hybrid.service.js`)
**Спеціалізація:** Універсальні зображення (cars, nature, space_pigs, тощо)

**Два підходи:**

**A) Standard Approach** (`agent.service.js`)
- Схожий до Dating, але без жорстких обмежень MASTER PROMPT
- Менше technical requirements
- Більше креативності

**B) Hybrid Approach** (`agent-hybrid.service.js`) - 🔥 НОВИЙ
- GPT-4o САМА створює параметри (не обмежена фіксованим списком)
- Завантажує топ-20 weighted parameters як "guidance" (не обмеження!)
- Може використовувати існуючі параметри АБО створювати нові
- Повертає:
  ```
  ---PROMPT---
  [Natural language prompt]
  
  ---PARAMETERS---
  {
    "device": "iPhone_14_Pro",
    "setting": "space_station",
    "subjects": "three_pigs_viking_armor",
    ...
  }
  ```
- Параметри зберігаються для weighted learning

**Правила General Agent:**
- ✅ Адаптувати стиль до категорії (space, cars, nature)
- ✅ Балансувати technical accuracy + creativity
- ✅ Створювати detailed, specific prompts
- ✅ Враховувати weighted preferences (якщо є)
- ✅ Враховувати коментарі користувача
- ❌ НЕ вимагати smartphone style (це для dating)
- ❌ НЕ обмежуватись фіксованими параметрами (може створювати нові)

---

## 🎯 ПРОБЛЕМИ, ЯКІ ВИЯВИВ

### ❌ Проблема 1: nano-banana-pro через Replicate
**Локація:** `generation.routes.js:168`
```javascript
// All models now use Replicate (including nano-banana-pro)
const generationResult = await generateImageReplicate(
  enhancedPrompt,
  { modelKey: model },
  userId
);
```

**ПРОБЛЕМА:**
- `nano-banana-pro` має `replicateId: 'google/nano-banana-pro'` в `models.js`
- АЛЕ! Replicate НЕ має моделі `google/nano-banana-pro`! 
- Це неіснуюча модель на Replicate!
- Має бути через GenSpark API (`genspark.service.js`), але він НЕ використовується

**Чому агент НЕ розуміє інструмент:**
- Агент (`agent.service.js`) тільки генерує prompt text
- Вибір моделі відбувається ПОЗА агентом (у `generation.routes.js`)
- Агент НЕ знає про nano-banana-pro vs seedream-4
- Вибір моделі = frontend UI вибір користувача

---

### ❌ Проблема 2: Немає валідації prompt structure
**Локація:** `agent.service.js:104-112`
```javascript
const enhancedPrompt = response.choices[0].message.content.trim();
// ❌ НЕМАЄ ПЕРЕВІРКИ!
return { success: true, prompt: enhancedPrompt };
```

**Що може піти не так:**
- GPT-4o може не додати imperfections (для dating)
- GPT-4o може використати technical tags як "[SUBJECT]: woman"
- GPT-4o може забути device/filename (для dating)
- GPT-4o може не врахувати коментарі користувача
- Hybrid agent може не повернути `---PARAMETERS---` section

---

### ❌ Проблема 3: Немає валідації parameters
**Для dating:**
- Чи всі 11 категорій представлені?
- Чи значення з допустимого списку DATING_PARAMETERS?
- Чи логічні комбінації (iPhone_14_Pro + 2020 year = ❌)?

**Для hybrid:**
- Чи є JSON parameters в відповіді?
- Чи параметри мають смисл?
- Чи параметри корелюють з prompt?

---

### ❌ Проблема 4: Немає feedback loop
- Якщо prompt поганий → генерується погане фото
- Користувач ставить dislike
- АЛЕ система НЕ знає ЧИ це проблема:
  - Prompt (агент погано написав)
  - Parameters (погані параметри обрані)
  - Model (nano-banana-pro не працює)
  - Weights (неправильно навчились)

---

## 🤖 QA-АГЕНТ АРХІТЕКТУРА

### 📋 ЩО МАЄ ПЕРЕВІРЯТИ QA-АГЕНТ

#### **Перевірка #1: Prompt Structure** ⭐⭐⭐
**Dating specific:**
- ✅ Починається з filename (IMG_####.HEIC або DSC_####.JPG)
- ✅ Вказано device (iPhone, Pixel, Samsung)
- ✅ Є 1-3 imperfections згадані
- ✅ БЕЗ technical tags ([SUBJECT]:, [LIGHTING]:)
- ✅ Natural flowing language
- ✅ Smartphone aesthetic (selfie, portrait mode, тощо)

**General specific:**
- ✅ Detailed and specific description
- ✅ Адаптовано до категорії (space, cars, тощо)
- ✅ Balanced technical + creative

**Для обох:**
- ✅ Prompt не пустий
- ✅ Довжина 50-500 слів
- ✅ Враховує user request (схожість з original prompt)
- ✅ Згадує елементи з коментарів (якщо є позитивні)

---

#### **Перевірка #2: Parameters Logic** ⭐⭐⭐
**Dating parameters:**
```javascript
{
  smartphone_style: "iPhone_14_Pro_HEIC_2023",
  subject: "woman_22_25_casual",
  composition: "close_selfie_slight_angle",
  background: "bedroom_personal_casual",
  lighting: "soft_window_natural",
  color_palette: "warm_golden_saturated",
  mood_atmosphere: "casual_relaxed_authentic",
  motion_dynamics: "static_perfectly_sharp",
  depth_focus: "portrait_mode_soft_bokeh",
  texture_detail: "skin_natural_pores_visible",
  time_weather: "morning_fresh_bright"
}
```

**Перевірки:**
- ✅ Всі 11 категорій присутні
- ✅ Значення з DATING_PARAMETERS списку
- ✅ Логічна узгодженість:
  - Device year ≈ style year (iPhone_14_Pro + 2023 ✅, iPhone_14_Pro + 2020 ❌)
  - Lighting + time_weather (golden_hour_outdoor + morning ✅, golden_hour + night ❌)
  - Setting + composition (bedroom + mirror_selfie ✅, gym + mirror_selfie ❓)
  - Subject age + clothing (woman_22_25 + casual ✅, woman_31_35 + teenage_style ❌)

**Hybrid parameters:**
```javascript
{
  "visual_style": "realistic_3d",
  "subjects": "three_astronaut_pigs",
  "action": "aerial_combat",
  "weapons": "plasma_swords",
  "setting": "near_planet",
  "lighting": "dramatic_backlight",
  "colors": "vibrant_neon",
  "effects": "zero_gravity_float",
  ...
}
```

**Перевірки:**
- ✅ Є JSON parameters (формат правильний)
- ✅ 6-10 параметрів
- ✅ Descriptive values (не просто "yes/no")
- ✅ Параметри відповідають prompt content

---

#### **Перевірка #3: Comments Integration** ⭐⭐
**Якщо є коментарі:**
- ✅ Позитивні коментарі враховані в prompt
- ✅ Негативні коментарі уникнені
- ✅ Конкретні елементи з коментарів присутні

**Приклад:**
- User comment: "Love the soft lighting!" (rating: +3)
- QA перевіряє: чи prompt містить "soft light" або "gentle illumination"

---

#### **Перевірка #4: Weighted Preferences** ⭐
**Якщо є high-weight parameters (>120):**
- ✅ Агент віддав перевагу цим параметрам (якщо relevantні)
- ✅ АБО є пояснення чому НЕ використані

**Приклад:**
- `Instagram_Story` має weight 130 (дуже популярно)
- QA перевіряє: чи параметри включають `platform: Instagram_Story`
- Якщо НІ → QA може дозволити (якщо є вагоміша причина)

---

#### **Перевірка #5: Model Selection Awareness** ⭐⭐⭐
**КРИТИЧНО для nano-banana-pro!**
- ✅ Якщо model = "nano-banana-pro" → перевірити чи він працює через GenSpark
- ❌ Якщо через Replicate → ERROR (модель не існує)
- ✅ Якщо model = "seedream-4" → OK (Replicate працює)

---

### 🔄 QA-AGENT WORKFLOW

```
┌─────────────────────────────────────────────────────┐
│ 1. Agent генерує prompt + parameters                │
└──────────────┬──────────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────────┐
│ 2. QA-Agent отримує:                                │
│    - prompt (text)                                  │
│    - parameters (object)                            │
│    - agentType (dating/general)                     │
│    - category (dating/cars/space_pigs)              │
│    - userPrompt (original)                          │
│    - comments (array)                               │
│    - weights (top 20)                               │
│    - model (seedream-4/nano-banana-pro)             │
└──────────────┬──────────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────────┐
│ 3. QA-Agent перевіряє (GPT-4o + rules engine)      │
│    ✅ Prompt structure                              │
│    ✅ Parameters logic                              │
│    ✅ Comments integration                          │
│    ✅ Weighted preferences                          │
│    ✅ Model compatibility                           │
└──────────────┬──────────────────────────────────────┘
               │
         ┌─────┴─────┐
         │           │
    ❌ FAIL      ✅ PASS
         │           │
         v           v
┌─────────────┐ ┌─────────────────┐
│ 4A. REJECT  │ │ 4B. APPROVE     │
│             │ │                 │
│ Повернути:  │ │ Продовжити:     │
│ - Errors    │ │ - Generate      │
│ - Warnings  │ │ - Save to DB    │
│ - Fixes     │ │                 │
└─────┬───────┘ └─────────────────┘
      │
      v
┌─────────────────────────────────┐
│ 5. Agent ПЕРЕГЕНЕРУЄ з fixes    │
│    (максимум 2-3 спроби)        │
└─────────────────────────────────┘
```

---

## 💾 БАЗА ДАНИХ - НОВІ ТАБЛИЦІ

### `qa_validations` - Історія перевірок
```sql
CREATE TABLE qa_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id),
  content_id UUID REFERENCES content_v3(id),  -- якщо вже згенеровано
  agent_type TEXT NOT NULL,  -- 'dating' | 'general'
  category TEXT NOT NULL,
  
  -- Input
  original_prompt TEXT NOT NULL,
  user_request TEXT NOT NULL,
  parameters JSONB NOT NULL,
  model TEXT NOT NULL,
  
  -- QA Results
  status TEXT NOT NULL,  -- 'passed' | 'failed' | 'warning'
  score INTEGER,  -- 0-100
  
  -- Detailed checks
  checks JSONB NOT NULL,  -- { prompt_structure: {...}, parameters_logic: {...}, ... }
  errors JSONB,  -- [{ type: 'missing_imperfections', severity: 'high', ... }]
  warnings JSONB,
  suggestions JSONB,  -- Що покращити
  
  -- Metadata
  qa_duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qa_validations_session ON qa_validations(session_id);
CREATE INDEX idx_qa_validations_status ON qa_validations(status);
CREATE INDEX idx_qa_validations_agent_type ON qa_validations(agent_type);
```

### `qa_rules` - Правила для QA
```sql
CREATE TABLE qa_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name TEXT UNIQUE NOT NULL,
  agent_type TEXT,  -- NULL = всі агенти
  category TEXT,    -- NULL = всі категорії
  
  rule_type TEXT NOT NULL,  -- 'prompt_structure' | 'parameters_logic' | 'comments' | ...
  severity TEXT NOT NULL,   -- 'critical' | 'warning' | 'info'
  
  description TEXT,
  validation_logic JSONB,  -- { regex: "...", conditions: [...], ... }
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🛠 ТЕХНІЧНА РЕАЛІЗАЦІЯ

### Файл: `backend/src/services/qa-agent.service.js`
```javascript
/**
 * QA Agent - Validates prompts and parameters
 * Checks compliance with agent rules
 */

/**
 * Validate prompt and parameters
 * @returns { 
 *   passed: boolean, 
 *   score: number, 
 *   errors: [], 
 *   warnings: [], 
 *   suggestions: [] 
 * }
 */
export async function validateGeneration(data) {
  const {
    prompt,
    parameters,
    agentType,
    category,
    userPrompt,
    comments,
    weights,
    model
  } = data;
  
  const results = {
    passed: true,
    score: 100,
    checks: {},
    errors: [],
    warnings: [],
    suggestions: []
  };
  
  // 1. Prompt Structure
  const promptCheck = validatePromptStructure(prompt, agentType, category);
  results.checks.prompt_structure = promptCheck;
  if (!promptCheck.passed) {
    results.passed = false;
    results.errors.push(...promptCheck.errors);
  }
  results.score -= promptCheck.penalty;
  
  // 2. Parameters Logic
  const paramsCheck = validateParametersLogic(parameters, agentType, category);
  results.checks.parameters_logic = paramsCheck;
  if (!paramsCheck.passed) {
    results.passed = false;
    results.errors.push(...paramsCheck.errors);
  }
  results.score -= paramsCheck.penalty;
  
  // 3. Comments Integration
  if (comments && comments.length > 0) {
    const commentsCheck = validateCommentsIntegration(prompt, comments);
    results.checks.comments_integration = commentsCheck;
    results.warnings.push(...commentsCheck.warnings);
    results.score -= commentsCheck.penalty;
  }
  
  // 4. Weighted Preferences
  if (weights && weights.length > 0) {
    const weightsCheck = validateWeightedPreferences(parameters, weights);
    results.checks.weights_preferences = weightsCheck;
    results.suggestions.push(...weightsCheck.suggestions);
  }
  
  // 5. Model Compatibility
  const modelCheck = validateModelCompatibility(model, prompt, agentType);
  results.checks.model_compatibility = modelCheck;
  if (!modelCheck.passed) {
    results.passed = false;
    results.errors.push(...modelCheck.errors);
  }
  
  // Save validation to DB
  await saveValidation(data, results);
  
  return results;
}

function validatePromptStructure(prompt, agentType, category) {
  const check = {
    passed: true,
    errors: [],
    warnings: [],
    penalty: 0
  };
  
  // Dating specific checks
  if (agentType === 'dating') {
    // Check filename
    if (!/(IMG_|DSC_)\d{4}\.(HEIC|JPG|heic|jpg)/.test(prompt)) {
      check.errors.push({
        type: 'missing_filename',
        severity: 'high',
        message: 'Dating prompt must start with IMG_#### or DSC_####',
        fix: 'Add smartphone filename at the beginning'
      });
      check.passed = false;
      check.penalty += 30;
    }
    
    // Check imperfections
    const imperfectionKeywords = [
      'blur', 'slight', 'minor', 'cut off', 'tilted', 
      'overexposed', 'artifacts', 'flare', 'shake'
    ];
    const hasImperfection = imperfectionKeywords.some(kw => 
      prompt.toLowerCase().includes(kw)
    );
    
    if (!hasImperfection) {
      check.errors.push({
        type: 'missing_imperfections',
        severity: 'medium',
        message: 'Dating prompt needs 1-3 realistic imperfections',
        fix: 'Add subtle imperfections like "slight motion blur" or "subject slightly off-center"'
      });
      check.penalty += 20;
    }
    
    // Check for technical tags (should NOT exist)
    if (/\[.*?\]:|^\s*[A-Z_]+:/.test(prompt)) {
      check.errors.push({
        type: 'technical_tags_present',
        severity: 'high',
        message: 'Prompt contains technical tags like [SUBJECT]: or LIGHTING:',
        fix: 'Remove all technical tags, use natural flowing language'
      });
      check.passed = false;
      check.penalty += 25;
    }
  }
  
  // General checks (both agents)
  if (prompt.length < 50) {
    check.warnings.push({
      type: 'prompt_too_short',
      severity: 'low',
      message: 'Prompt is very short (< 50 chars)',
      suggestion: 'Add more details for better generation'
    });
    check.penalty += 10;
  }
  
  if (prompt.length > 800) {
    check.warnings.push({
      type: 'prompt_too_long',
      severity: 'low',
      message: 'Prompt is very long (> 800 chars)',
      suggestion: 'Consider shortening to avoid model confusion'
    });
  }
  
  return check;
}

function validateParametersLogic(parameters, agentType, category) {
  // Dating: check all 11 categories
  if (agentType === 'dating') {
    const required = [
      'smartphone_style', 'subject', 'composition', 'background',
      'lighting', 'color_palette', 'mood_atmosphere', 'motion_dynamics',
      'depth_focus', 'texture_detail', 'time_weather'
    ];
    
    const missing = required.filter(r => !parameters[r]);
    
    if (missing.length > 0) {
      return {
        passed: false,
        errors: [{
          type: 'missing_parameters',
          severity: 'critical',
          message: `Missing required dating parameters: ${missing.join(', ')}`,
          fix: 'Ensure all 11 categories are present'
        }],
        penalty: 40
      };
    }
    
    // Consistency checks
    const style = parameters.smartphone_style || '';
    const yearMatch = style.match(/\d{4}/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      const device = style.toLowerCase();
      
      // iPhone 14 Pro з'явився у 2022
      if (device.includes('iphone_14') && year < 2022) {
        return {
          passed: false,
          errors: [{
            type: 'inconsistent_device_year',
            severity: 'high',
            message: `iPhone 14 Pro не існував у ${year}`,
            fix: 'Change year to 2022+ or use older iPhone model'
          }],
          penalty: 30
        };
      }
    }
  }
  
  // Hybrid: check JSON format
  if (agentType === 'general' && category !== 'dating') {
    if (Object.keys(parameters).length < 5) {
      return {
        passed: false,
        errors: [{
          type: 'insufficient_parameters',
          severity: 'medium',
          message: 'Too few parameters (< 5)',
          fix: 'Generate 6-10 descriptive parameters'
        }],
        penalty: 15
      };
    }
  }
  
  return {
    passed: true,
    errors: [],
    warnings: [],
    penalty: 0
  };
}

function validateModelCompatibility(model, prompt, agentType) {
  // CRITICAL: nano-banana-pro через Replicate НЕ ПРАЦЮЄ
  if (model === 'nano-banana-pro') {
    return {
      passed: false,
      errors: [{
        type: 'invalid_model_provider',
        severity: 'critical',
        message: 'nano-banana-pro через Replicate НЕ існує! Model ID google/nano-banana-pro не знайдено',
        fix: 'Use GenSpark API (genspark.service.js) OR switch to seedream-4/flux-schnell'
      }]
    };
  }
  
  return {
    passed: true,
    errors: []
  };
}
```

---

## 🚀 ІНТЕГРАЦІЯ В GENERATION FLOW

### У `generation.routes.js`:
```javascript
// BEFORE generation
const qaResult = await validateGeneration({
  prompt: enhancedPrompt,
  parameters: selectedParams,
  agentType,
  category,
  userPrompt,
  comments,
  weights,
  model
});

if (!qaResult.passed) {
  console.error('❌ QA FAILED:', qaResult.errors);
  
  // Option A: Retry with fixes (1-2 attempts)
  if (retryCount < 2) {
    return await regenerateWithFixes(qaResult);
  }
  
  // Option B: Return error to user
  return res.status(400).json({
    success: false,
    error: 'QA validation failed',
    qaResult
  });
}

console.log('✅ QA PASSED (score:', qaResult.score, ')');
// Continue with generation...
```

---

## 📊 ПРИКЛАД QA RESPONSE

```json
{
  "passed": false,
  "score": 65,
  "checks": {
    "prompt_structure": {
      "passed": false,
      "errors": [
        {
          "type": "missing_imperfections",
          "severity": "medium",
          "message": "Dating prompt needs 1-3 realistic imperfections",
          "fix": "Add subtle imperfections"
        }
      ],
      "penalty": 20
    },
    "parameters_logic": {
      "passed": false,
      "errors": [
        {
          "type": "inconsistent_device_year",
          "severity": "high",
          "message": "iPhone 14 Pro не існував у 2020",
          "fix": "Change year to 2022+"
        }
      ],
      "penalty": 30
    },
    "model_compatibility": {
      "passed": false,
      "errors": [
        {
          "type": "invalid_model_provider",
          "severity": "critical",
          "message": "nano-banana-pro через Replicate НЕ існує!",
          "fix": "Use GenSpark API or switch to seedream-4"
        }
      ]
    }
  },
  "errors": [/* всі з checks */],
  "warnings": [],
  "suggestions": ["Consider adding more detail to background description"]
}
```

---

## ✅ ВИСНОВКИ ТА РЕКОМЕНДАЦІЇ

### 🔴 КРИТИЧНІ ПРОБЛЕМИ:
1. **nano-banana-pro НЕ ПРАЦЮЄ** - model ID не існує на Replicate
   - Потрібно: або використати GenSpark API, або видалити цю опцію

2. **Агент НЕ знає про модель** - вибір моделі поза агентом
   - Агент генерує prompt, але не знає яка модель використовується

### 🟡 QA-AGENT МЕТА:
1. Перевіряти **prompt structure** (filename, imperfections, no tags)
2. Перевіряти **parameters logic** (всі категорії, consistency)
3. Перевіряти **comments integration** (чи враховані)
4. Перевіряти **model compatibility** (чи модель існує)
5. Надавати **feedback loop** для покращення

### 🟢 ЩО ПРАЦЮЄ ДОБРЕ:
- ✅ Dating agent має чіткі rules (MASTER PROMPT)
- ✅ Weights system працює
- ✅ Comments завантажуються та передаються
- ✅ Hybrid approach дозволяє креативність

---

## 🎯 НАСТУПНІ КРОКИ:
1. ✅ Створити `qa-agent.service.js`
2. ✅ Додати `qa_validations` та `qa_rules` таблиці в БД
3. ✅ Інтегрувати QA в `generation.routes.js`
4. ✅ Виправити nano-banana-pro (GenSpark API або видалити)
5. ✅ Додати UI для перегляду QA results
6. ✅ Тестування на real sessions

---

**Готово до імплементації!** 🚀
