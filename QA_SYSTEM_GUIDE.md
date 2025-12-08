# 🔍 QA System - Повний гайд

## 🎯 Концепція: Дві системи навчання

```
┌─────────────────────────────────────────────────────────────┐
│                    СИСТЕМА НАВЧАННЯ АГЕНТА                   │
└─────────────────────────────────────────────────────────────┘

🎯 ОСНОВНЕ НАВЧАННЯ: User Ratings (weights.service.js)
   ├─ 👍 Лайки/дизлайки → змінюють ваги параметрів
   ├─ 💬 Коментарі → контекст для агента
   └─ 📊 Weighted learning → агент вчиться що подобається

🔍 ДОПОМІЖНЕ НАВЧАННЯ: QA Agent (qa-agent.service.js)
   ├─ Слідкує за технічними помилками
   ├─ Перевіряє якість промптів
   └─ Поправляє агента (уникай це, додай те)
```

---

## 📊 Як це працює разом

### 1. User Feedback (Головне)

```javascript
User оцінює фото:
👍 +1 → +5 до всіх параметрів що використались
🔥 +3 → +15 до всіх параметрів
👎 -1 → -5 до всіх параметрів
💔 -3 → -15 до всіх параметрів

+ Коментар: "Не подобається освітлення"
```

**Результат**: 
- Параметри з високими вагами частіше вибираються
- Агент бачить коментарі і адаптується
- **ЦЕ ОСНОВА НАВЧАННЯ!** ✅

---

### 2. QA Feedback (Технічний наглядач)

```javascript
Agent генерує промпт →
QA перевіряє →
  ✅ Score 85/100 - Approved
  ⚠️ Issues:
     - Missing smartphone filename (minor)
     - Consider adding lighting direction (minor)
     
QA зберігає результати →
Agent наступного разу бачить історію QA →
Agent: "Ага, QA постійно скаржиться що немає filename"
Agent: "Додам filename в промпт!" ✅
```

**Результат**:
- QA ловить технічні помилки
- Agent бачить частІ проблеми
- Agent поправляється автоматично
- **ЦЕ ДОПОМІЖНА КОРЕКЦІЯ!** 🔧

---

## 💻 Як використовувати в UI

### 1. Увімкнути/вимкнути QA

```javascript
// Frontend: GeneratePageV3.jsx

const [enableQA, setEnableQA] = useState(true); // За замовчуванням ВКЛ

// Чекбокс в UI:
🔍 QA Валідація промптів
✅ AI перевіряє якість промптів перед генерацією
```

### 2. Бачити QA результати

Після генерації, під кожним фото:

```
┌─────────────────────────────────┐
│ 🔍 QA Валідація                 │
│                                  │
│ Score: 85/100 ✅ Схвалено       │
│                                  │
│ ⚠️ Знайдено проблем: 2          │
│ • [minor] Consider adding...    │
│ • [minor] Missing lighting...   │
└─────────────────────────────────┘
```

**Що означають оцінки:**
- **90-100**: ⭐ Відмінно! Немає проблем
- **70-89**: ✅ Схвалено (мінорні проблеми)
- **50-69**: ⚠️ Потребує покращення (середні проблеми)
- **0-49**: ❌ Відхилено (критичні проблеми - генерація пропущена)

---

## 🔄 Feedback Loop (як QA навчає Agent)

### Крок 1: Генерація #1

```javascript
User: "Beautiful woman on beach"

Agent генерує:
"Perfect woman, studio lighting, bokeh effect"

QA перевіряє:
❌ Score: 45/100 - REJECTED
Issues:
- Missing smartphone filename
- Technical jargon: "bokeh"
- Too perfect (not authentic)

→ Генерація ПРОПУЩЕНА (не витрачаємо гроші на погані промпти)
```

---

### Крок 2: Генерація #2 (Agent бачить QA історію)

```javascript
Agent завантажує контекст:

💬 USER FEEDBACK:
  (No comments yet)

🔍 QA AGENT FEEDBACK:
  QA Average Score: 45/100
  Validations analyzed: 1
  
  ⚠️ COMMON TECHNICAL ISSUES:
  1. [critical] Missing smartphone filename
  2. [major] Technical jargon detected: bokeh
  3. [major] Too perfect (not authentic)
  
  💡 QA INSTRUCTIONS:
  - Fix them to improve QA score (target: 85+)
  - Avoid technical mistakes!

Agent генерує (з урахуванням QA feedback):
"IMG_4527.HEIC, iPhone 14 Pro, woman on beach, 
slightly off-center, natural lighting, relaxed pose"

QA перевіряє:
✅ Score: 85/100 - APPROVED
Issues: []

→ Генерація УСПІШНА! ✅
```

---

### Крок 3: Генерація #3-10 (Agent вже навчився)

```javascript
Agent пам'ятає QA правила:
✅ Додає filename
✅ Уникає технічного жаргону
✅ Додає недоліки (authentic)

QA перевіряє:
✅ Score: 90-95/100 - APPROVED
Issues: []

User оцінює:
👍 +1, +1, 🔥 +3, +1, +1...

→ Agent навчився генерувати якісні промпти!
→ QA більше не знаходить технічних помилок!
→ User задоволений результатами!
```

---

## 📝 Що зберігається в БД

### content_v3 таблиця

```javascript
{
  id: "...",
  session_id: "...",
  enhanced_prompt: "IMG_4527.HEIC, woman on beach...",
  rating: 1,  // User rating (+1)
  comment: "Подобається освітлення!",  // User comment
  
  // Ваги що використались (для weighted learning)
  weights_used: {
    parameters: [
      { parameter: "lighting", value: "natural", weight: 115 },
      { parameter: "pose", value: "sitting", weight: 95 },
      ...
    ]
  },
  
  // QA результати (для technical learning)
  qa_validation: {
    validated: true,
    score: 85,
    status: "approved",
    issues: [
      {
        type: "parameter_error",
        severity: "minor",
        message: "Consider adding lighting direction"
      }
    ],
    timestamp: "2025-12-01T..."
  }
}
```

---

## 🧠 Як Agent використовує обидві системи

### GPT-4o prompt context:

```
SYSTEM PROMPT:
You are an AI agent for generating Seedream 4.0 prompts...

USER MESSAGE:
Create a detailed generation prompt based on:

USER REQUEST: Beautiful woman on beach

PARAMETER CONSTRAINTS (selected by AI based on user preferences):
- lighting: natural (weight: 115) ← HIGH! User likes this
- pose: sitting (weight: 95)
- mood: relaxed (weight: 140) ← VERY HIGH! User loves this
...

💬 USER FEEDBACK (Previous ratings with comments):

✅ WHAT USER LIKES:
  1. (LOVES IT!) "Чудове природне освітлення!" [Rating: +3]
  2. (likes) "Подобається розслаблена поза" [Rating: +1]

❌ WHAT USER DISLIKES:
  1. (dislikes) "Занадто темно" [Rating: -1]

🔍 QA AGENT FEEDBACK (Technical issues to AVOID):

QA Average Score: 75/100
Validations analyzed: 5

⚠️ COMMON TECHNICAL ISSUES (fix these!):
  1. [minor] Missing smartphone filename (appeared 3x)
  2. [minor] Consider specifying device (appeared 2x)

💡 QA INSTRUCTIONS:
  - These are TECHNICAL issues QA agent found repeatedly
  - Fix them to improve QA score (target: 85+)
  - User feedback (above) is MORE important than QA
  - But avoid technical mistakes that QA catches!

IMPORTANT:
- 🔥 CRITICAL: Apply user feedback from comments above (HIGH PRIORITY!)
- 🔍 CRITICAL: Avoid technical issues listed by QA Agent above!
```

### Agent розуміє:

1. **User хоче** (з коментарів і ваг):
   - ✅ Природне освітлення (вага 115, коментар "loves it")
   - ✅ Розслаблену позу (вага 140, коментар "loves it")
   - ❌ НЕ темно (коментар "dislikes")

2. **QA вимагає** (технічно):
   - ✅ Додай filename (IMG_####.HEIC)
   - ✅ Вкажи device (iPhone 14 Pro)

3. **Agent генерує**:
```
"IMG_4527.HEIC, iPhone 14 Pro, woman sitting on beach,
natural daylight, relaxed pose, soft lighting from side,
slightly off-center, casual angle"
```

4. **Результат**:
   - User: 👍 "Perfect! Саме те що хотів!" (+3)
   - QA: ✅ Score 92/100 - Approved, no issues
   - Weights: `lighting.natural` → +15, `pose.sitting` → +15

---

## ⚙️ Налаштування

### Frontend (GeneratePageV3.jsx)

```javascript
// За замовчуванням QA увімкнено
const [enableQA, setEnableQA] = useState(true);

// Передати в API
const response = await generationAPI.generate({
  ...
  enableQA: enableQA
});
```

### Backend (generation.routes.js)

```javascript
// Отримати з body
const { enableQA = false } = req.body;

// Якщо увімкнено - валідувати
if (enableQA) {
  qaResult = await quickValidate(enhancedPrompt, agentType, model);
  
  // Якщо rejected - пропустити генерацію
  if (qaResult.validation.status === 'rejected') {
    throw new Error('QA rejected prompt');
  }
}
```

### Agent (agent.service.js)

```javascript
// Завантажити QA історію
const qaResult = await loadSessionQAHistory(sessionId);

// Додати в context
if (qaResult.commonIssues.length > 0) {
  qaFeedbackSection = buildQAFeedbackSection(qaResult);
}

// GPT-4o бачить QA feedback і адаптується
```

---

## 📊 Метрики успіху

### Як оцінити що система працює:

**До QA:**
```
Генерація #1-5:
- QA Score: 45, 50, 55, 60, 65
- User Ratings: 👎, 👎, 👍, 👎, 👍
- Issues: багато технічних помилок
```

**Після QA (5-10 генерацій):**
```
Генерація #6-15:
- QA Score: 75, 80, 85, 90, 92, 95...
- User Ratings: 👍, 👍, 🔥, 👍, 🔥, 🔥...
- Issues: мінімальні або немає
```

**Результат:**
- ✅ QA score зростає (Agent навчається уникати технічних помилок)
- ✅ User ratings покращуються (Agent вчиться що подобається)
- ✅ Витрати зменшуються (менше rejected генерацій)
- ✅ Якість зростає (обидві системи працюють разом)

---

## 🎯 Пріоритети

### Важливість feedback:

1. **User Ratings & Comments** (100%) 👑
   - ЦЕ НАЙВАЖЛИВІШЕ!
   - User каже що йому подобається
   - Agent адаптується під user preferences

2. **QA Technical Feedback** (30%) 🔧
   - Допоміжна система
   - Ловить технічні помилки
   - Поправляє явні косяки

### Аналогія:

```
User = Клієнт в ресторані
  "Мені подобається гострі страви!"
  "Не люблю солодке"

QA = Санітарна інспекція
  "Це м'ясо не прожарене - небезпечно!"
  "Тут не вистачає солі (технічно неправильно)"

Agent = Кухар
  - ГОЛОВНЕ: готувати те що подобається клієнту ✅
  - ТАКОЖ: не отруїти клієнта (слухати санітарну інспекцію) ✅
```

---

## 🚀 Результат

### Що ви отримуєте:

1. **Розумний Agent**
   - Вчиться на user feedback (що подобається)
   - Уникає технічних помилок (що неправильно)
   - Генерує все кращі промпти з кожною сесією

2. **Прозорість**
   - Бачите QA scores в UI
   - Розумієте чому промпт схвалено/відхилено
   - Можете вимкнути QA якщо не потрібно

3. **Економія**
   - QA блокує погані промпти (не витрачаємо гроші)
   - Менше rejected генерацій
   - Більше якісних результатів

4. **Контроль**
   - Ви керуєте через ratings & comments (головне)
   - QA слідкує за технічними косяками (допоміжне)
   - Обидві системи працюють на вас! ✅

---

## 📞 Підсумок

```
┌─────────────────────────────────────────────────────────────┐
│                    ЯК ЦЕ ПРАЦЮЄ                              │
└─────────────────────────────────────────────────────────────┘

User генерує контент →
  Agent створює промпт (з урахуванням ваг + QA історії) →
    QA перевіряє промпт →
      ✅ Approved → Генерувати →
        User оцінює (👍/👎 + коментар) →
          Weights оновлюються ✅
          QA результат зберігається ✅
          
      ❌ Rejected → Пропустити генерацію →
        QA результат зберігається ✅
        
Наступна генерація →
  Agent бачить:
    ✅ Оновлені ваги (що user подобається)
    ✅ QA історію (які технічні помилки були)
    
  Agent генерує КРАЩИЙ промпт! 🎯
```

---

**Статус**: ✅ Готово до використання!  
**Версія**: 1.0.0  
**Дата**: 1 грудня 2025








