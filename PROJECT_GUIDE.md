# 📚 TIN UI V3 - Project Guide

## 🎯 Огляд проекту

**TIN UI V3** - це AI-powered платформа для генерації та оцінки контенту з weighted learning системою.

### Ключові особливості:
- ✅ **Weighted Learning** - AI вчиться з твоїх оцінок (лайки/дизлайки)
- ✅ **Vision AI** - завантаж фото → AI аналізує стиль → генерує промпт
- ✅ **QA Agent** - автоматична перевірка якості промптів перед генерацією
- ✅ **Streaming Generation** - фото з'являються по мірі готовності (не чекаєш всіх)
- ✅ **Multiple Models** - підтримка Seedream 4, Nano Banana Pro
- ✅ **Project/Session Organization** - організація роботи по проектах та сесіях
- ✅ **Photo Comments** - додавай коментарі до завантажених фото для точнішого аналізу
- ✅ **Auto Compression** - автоматичне стиснення великих фото (до 50MB)

---

## 🏗️ Архітектура

### Frontend (React)
```
frontend/
├── src/
│   ├── pages/
│   │   ├── DashboardPage.jsx       # Головна сторінка
│   │   ├── GeneratePageV3.jsx      # Генерація та swipe
│   │   ├── GalleryPage.jsx         # Перегляд всіх фото
│   │   └── WeightHistoryPage.jsx   # Історія змін ваг
│   ├── components/                  # Переиспользуемые компоненты
│   ├── services/                    # API клієнти
│   └── App.js
```

### Backend (Node.js + Express)
```
backend/
├── src/
│   ├── routes/
│   │   ├── generation.routes.js    # Генерація контенту
│   │   ├── rating.routes.js        # Оцінка контенту
│   │   ├── projects.routes.js      # CRUD проектів
│   │   └── qa.routes.js            # QA Agent API
│   ├── services/
│   │   ├── agent.service.js        # AI prompt builder
│   │   ├── vision.service.js       # 🆕 Vision AI photo analysis
│   │   ├── weights.service.js      # Weighted learning
│   │   ├── qa-agent.service.js     # QA validation
│   │   └── replicate.service.js    # Image generation
│   └── server.js
```

### Database (Supabase PostgreSQL)
```
Tables:
├── users                 # Користувачі
├── projects              # Проекти
├── sessions              # Сесії
├── agent_configs         # Конфігурації AI агентів
├── weight_parameters     # Параметри з вагами
└── content_v3            # Згенерований контент
```

---

## 🚀 Quick Start

### 1. Database Setup
```sql
-- Запустити в Supabase SQL Editor
-- database/FINAL_MIGRATION.sql
```

### 2. Backend
```bash
cd backend
npm install
npm run dev
```

**Environment variables:**
```env
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
OPENAI_API_KEY=your_key
REPLICATE_API_TOKEN=your_token
PORT=5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

**Environment variables:**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🧠 Weighted Learning System

### Як працює:

1. **Ініціалізація** (перша генерація)
   - Всі параметри мають вагу 100 (neutral)
   
2. **Генерація**
   - AI обирає параметри на основі ваг (weighted random)
   - Чим більша вага → більша ймовірність вибору

3. **Оцінка** (Swipe)
   ```
   ❤️  +3 (super like) → +5 до ваги
   👍  +1 (like)       → +1 до ваги
   😐   0 (neutral)    →  0 (без змін)
   👎  -1 (dislike)    → -1 до ваги
   💔  -3 (hate)       → -5 до ваги
   ```

4. **Навчання**
   - Ваги оновлюються після кожної оцінки
   - AI генерує нові фото з урахуванням оновлених ваг
   - З часом AI вчиться твоїм вподобанням

### Приклад:
```
Генерація 1:
  device: iPhone_14_Pro (вага: 100)
  User: ❤️ Super Like
  
Після оцінки:
  device: iPhone_14_Pro (вага: 105) ✅ більша ймовірність

Генерація 2:
  device: iPhone_14_Pro (вага: 105) ← вибрано знову!
  User: 👍 Like
  
Після оцінки:
  device: iPhone_14_Pro (вага: 106) ✅ ще більша ймовірність
```

---

## 🔍 QA Agent System

### Що робить QA Agent:

1. **Валідація промптів** перед генерацією
2. **Перевірка якості** (score 0-100)
3. **Виявлення проблем** (issues)
4. **Статус**: `approved` / `needs_revision` / `rejected`

### Інтеграція:

```javascript
// Backend автоматично перевіряє якщо enableQA: true
if (enableQA) {
  const qaResult = await quickValidate(prompt, agentType, model);
  
  if (qaResult.validation.status === 'rejected') {
    // Промпт відхилено - не генеруємо
    throw new Error('QA rejected prompt');
  }
}
```

### QA → Agent Learning:

Agent завантажує попередні QA результати і вчиться на них:

```javascript
// agent.service.js
const qaHistory = await loadSessionQAHistory(sessionId);

// Додає в system prompt:
"⚠️ COMMON ISSUES TO AVOID:
❌ Missing lighting direction
❌ Too many elements in frame
❌ Unnatural poses

💡 Fix these to improve QA score (target: 85+)"
```

---

## ⚡ Generation Strategies

### Strategy 1: Streaming (Рекомендовано)

**Use case**: Швидкий старт, progressive loading

```
Frontend sends: 10 separate requests (delay 2-3 sec)
Backend processes: Each independently
User experience: Start swiping after 45 sec! ✅
```

**Pros:**
- ✅ Start swiping immediately
- ✅ Progressive visual feedback
- ✅ No "freezing" feel
- ✅ Better UX for 50-100 photos

**Cons:**
- ⚠️ More network requests
- ⚠️ Slightly more backend load

### Strategy 2: Parallel (Backend)

**Use case**: All-or-nothing, batch processing

```
Frontend sends: 1 request (count=10)
Backend processes: Promise.all() - all 10 simultaneously
User experience: Wait 30-40 sec, then all 10 ready
```

**Pros:**
- ✅ Single request
- ✅ All photos arrive together
- ✅ Less network overhead

**Cons:**
- ❌ Wait for ALL photos
- ❌ No progress feedback
- ❌ Bad for 50-100 photos

### Performance Comparison:

| Photos | Streaming | Parallel |
|--------|-----------|----------|
| 10 | First at 45s ✅ | All at 40s |
| 50 | First at 45s ✅ | All at 60s ❌ |
| 100 | First at 45s ✅ | All at 90s ❌ |

**Current Implementation**: **Streaming** (default)

---

## 📊 Models

### Seedream 4 (Рекомендовано)
- **Success rate**: 95-100%
- **Speed**: ~15-20 sec
- **Quality**: High
- **Stability**: Excellent ✅

### Nano Banana Pro
- **Success rate**: 60-80%
- **Speed**: ~20-30 sec
- **Quality**: SOTA (найкраща)
- **Stability**: Unstable ⚠️
- **Issues**: Часто повертає `null`

**Рекомендація**: Використовуй Seedream 4 для production!

---

## 📸 Vision AI - Photo Analysis

### 🆕 NEW FEATURE: Upload Photos → AI Generates Prompt

Замість писати промпт вручну, можеш **завантажити 1-20 фото** і AI проаналізує їх стиль!

### Як працює:

```
1. Upload 5 photos (insurance ads)
   ↓
2. Add comments to each photo (optional):
   Photo 1: "Geico, suburban setting"
   Photo 2: "State Farm, family theme"
   ...
   ↓
3. Click "Analyze"
   ↓
4. GPT-4o Vision analyzes COMMON style:
   - Lighting (warm natural)
   - Color palette (red/blue/white)
   - Mood (professional, trustworthy)
   - Composition (clean, centered)
   ↓
5. Generates ONE unified prompt:
   "Professional insurance advertising with..."
   ↓
6. Use this prompt for generation! 🎉
```

### Features:

#### 1. **Photo Comments** 💬
Додавай коментарі до кожного фото:
- Назва компанії: "Geico Insurance"
- Побажання: "Focus on the lighting"
- Контекст: "Suburban family setting"

#### 2. **Unified Analysis** 🎯
AI знаходить **СПІЛЬНИЙ СТИЛЬ** всіх фото, а не описує кожне окремо:

```
❌ BAD (collage description):
"Series featuring business professional, family with flag, vehicle, Mount Rushmore..."

✅ GOOD (unified style):
"Professional insurance advertising with warm natural lighting, 
patriotic aesthetic, clean composition, high production value"
```

#### 3. **Auto Compression** 🗜️
- Автоматично стискає фото **>2MB**
- Resize до **max 1920px**
- JPEG quality **85%**
- Reduction: **~70%** (5MB → 1.5MB)

#### 4. **Large Upload Support** 📦
- **Request limit**: 50MB
- **File limit**: 15MB per photo
- **Max photos**: 20
- **Compression**: automatic for large files

#### 5. **Safety Disclaimers** 🔒
AI включає **business context disclaimers** для OpenAI safety filters:

```javascript
"These are business/marketing images provided for professional analysis."
```

Працює для:
- ✅ Insurance/Financial
- ✅ Automotive
- ✅ Dating/Lifestyle
- ✅ Product Photography
- ✅ Corporate Materials
- ✅ Real Estate
- ✅ Food & Beverage

### Usage Example:

```
📸 Upload 6 insurance ad photos

💬 Add comments:
#1: "Geico, suburban"
#2: "State Farm, rural"
#3: "Progressive, city"
#4: "Allstate, family"
#5: "Liberty Mutual, professional"
#6: "Farmers, outdoor"

📝 User Instructions:
"Focus on American insurance advertising style"

🔍 Analyze → ONE prompt:
"Professional American insurance advertising photography 
with warm natural lighting, diverse authentic subjects, 
suburban/rural settings, patriotic color palette 
(red/white/blue), clean editorial composition, 
trustworthy professional tone, high production value"

🚀 Generate → New photos in this style! ✨
```

### Technical Details:

**Frontend:**
```jsx
<PhotoUploadModal>
  - Upload up to 20 photos
  - Add comment to each photo
  - Auto-compress large files
  - Send to Vision API
</PhotoUploadModal>
```

**Backend:**
```javascript
// vision.service.js
export async function analyzePhotosAndGeneratePrompt(photosData) {
  // photosData: [{ url, comment, index }, ...]
  
  // 1. Build request with safety disclaimers
  const request = buildAnalysisRequest(photos, userInstructions);
  
  // 2. Call GPT-4o Vision
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: request + images }
    ]
  });
  
  // 3. Return unified prompt
  return { prompt: response.content };
}
```

**System Prompt (key points):**
```
CRITICAL INSTRUCTIONS:
1. Analyze SEPARATE reference images
2. DO NOT describe each image individually ❌
3. DO NOT create "collage" or "series" description ❌
4. FIND the COMMON visual style ✅
5. Generate ONE prompt for a SINGLE NEW image ✅
```

### Configuration:

**Backend `.env`:**
```env
# Vision API uses OpenAI GPT-4o
OPENAI_API_KEY=sk-your-key

# Request size limits (already configured)
EXPRESS_JSON_LIMIT=50mb
EXPRESS_URLENCODED_LIMIT=50mb
```

**Vercel `vercel.json`:**
```json
{
  "builds": [{
    "config": {
      "maxDuration": 60,
      "memory": 3008
    }
  }]
}
```

---

## 🚀 Streaming Generation

### NEW: Photos appear as they generate!

Замість чекати всі 100 фото, тепер вони з'являються **по мірі готовності**!

### Як працює:

```
User: Generate 10 photos
  ↓
Frontend: Sends 10 SEPARATE requests (with 2-3 sec delay)
  Request 1 → Backend → Replicate (40 sec)
  Request 2 → Backend → Replicate (40 sec) [2 sec later]
  Request 3 → Backend → Replicate (40 sec) [2 sec later]
  ...
  ↓
Backend: Processes each independently
  Photo 1 ready at ~45 sec ✅
  Photo 2 ready at ~47 sec ✅
  Photo 3 ready at ~49 sec ✅
  ...
  ↓
Frontend: Displays IMMEDIATELY upon arrival
  User can START SWIPING after first photo! 🎉
```

### Benefits:

1. **Start swiping immediately** (after first photo)
2. **No waiting** for all 100 photos
3. **Progressive loading** (visual feedback)
4. **Better UX** (не зависає)

### Implementation:

**Frontend:**
```javascript
for (let i = 0; i < count; i++) {
  // Add delay between requests
  if (i > 0) await delay(2000 + random(1000)); // 2-3 sec
  
  // Send individual request (count=1)
  (async (index) => {
    const response = await generationAPI.generate({
      count: 1, // 1 photo per request
      ...params
    });
    
    // Add photo to UI IMMEDIATELY
    setGeneratedItems(prev => [...prev, response.content]);
    
    // User can swipe now!
    if (index === 0) setGenerating(false);
  })(i);
}
```

**Backend:**
```javascript
// generation.routes.js
// Each request (count=1) processes independently
// No waiting for other requests
// Returns result as soon as ready
```

### Performance:

```
Traditional (wait for all):
10 photos × 40 sec = 400 sec wait = 6.7 min ❌
User can start: after 6.7 min

Streaming (progressive):
Photo 1: 45 sec ✅ User can START SWIPING!
Photo 2: 47 sec ✅
Photo 3: 49 sec ✅
...
Photo 10: 65 sec ✅
User can start: after 45 sec! 🎉
```

### Auto-Load Unrated:

Після нових генерацій, старі **не оцінені фото** автоматично додаються в кінець:

```
New Generation: 10 photos
Old Unrated: 6 photos
  ↓
Queue: [new 1, new 2, ..., new 10, old 1, ..., old 6]
  ↓
User swipes: new photos first, then old ones
```

---

## 🎯 User Flow

### 1. Створення проекту
```
Dashboard → "Create Project"
  ├─ Name: "Dating Photos"
  ├─ Category: "dating"
  └─ Description: "AI dating photos"
```

### 2. Створення сесії
```
Project → "New Session"
  └─ Name: "Test Session 1"
```

### 3. Генерація
```
Session → Generate
  ├─ Prompt: "Ukrainian girl, 25 years old"
  ├─ Model: Seedream 4
  ├─ Count: 10
  ├─ QA: ✅ Enabled
  └─ Click "Generate"
```

### 4. Swipe & Rate
```
Swipe interface:
  ├─ View photo
  ├─ Rate: ❤️ 👍 😐 👎 💔
  ├─ Optional: Add comment
  └─ Next photo
```

### 5. View Results
```
Gallery:
  ├─ All generated photos
  ├─ Filter by rating
  └─ View QA results
```

### 6. Generate More
```
Completion Screen:
  ├─ "🔄 Generate More (same prompt)"
  ├─ "🎨 New Prompt"
  └─ "🖼️ Gallery"
```

---

## 🐛 Common Issues

### 1. "Failed to fetch" при login
**Причина:** CORS не налаштований

**Рішення:**
```bash
# Vercel Environment Variables
CORS_ORIGINS=https://your-frontend-url.github.io
```

### 2. "Prediction failed: null"
**Причина:** Nano Banana Pro нестабільний

**Рішення:**
- Змінити model на Seedream 4
- Або повторити генерацію

### 3. Фото не з'являються після генерації
**Причина:** Не оновився state

**Рішення:**
- Перезавантажити сторінку
- Або перевірити console.log для помилок

### 4. "Column qa_validation does not exist"
**Причина:** База даних не оновлена

**Рішення:**
```sql
-- Запустити в Supabase
ALTER TABLE content_v3 
ADD COLUMN IF NOT EXISTS qa_validation JSONB;
```

---

## 📈 Performance Tips

### Backend:
1. ✅ Використовуй Replicate для швидшої генерації
2. ✅ Увімкни QA валідацію (запобігає bad prompts)
3. ✅ Паралельна генерація (Promise.all)

### Frontend:
1. ✅ Генеруй 10-20 фото за раз (оптимально)
2. ✅ Використовуй "Generate More" для швидкого workflow
3. ✅ Додавай коментарі до оцінок для точнішого навчання

### Database:
1. ✅ Індекси на rating, created_at, qa_validation
2. ✅ Views для статистики
3. ✅ Functions для швидких запитів

---

## 🔐 Security

### Row Level Security (RLS):
```sql
-- Users can only access their own data
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);
```

### API Authentication:
```javascript
// Всі routes захищені JWT
router.use(authenticateToken);
```

### Environment Variables:
- ✅ НІКОЛИ не комітити .env файли
- ✅ Використовуй .env.example для документації
- ✅ Різні .env для dev/prod

---

## 🚀 Deployment

### Backend (Vercel):
```bash
# vercel.json вже налаштований
vercel --prod
```

### Frontend (GitHub Pages):
```bash
# GitHub Actions автоматично деплоїть
git push origin main
```

### Database (Supabase):
```sql
-- Запустити database/FINAL_MIGRATION.sql
-- Створити storage bucket: generated-content
```

---

## 📝 API Endpoints

### Generation:
```
POST /api/generate
Body: {
  sessionId, projectId, userId,
  userPrompt, count, model, enableQA
}
```

### Rating:
```
POST /api/rate/:contentId
Body: { rating, comment }
```

### Projects:
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
```

### QA:
```
POST /api/qa/validate
Body: { prompt, agentType, model }
```

---

## 🧪 Testing

### Test Scenario 1: Generate 10 photos
```
1. Open Generate page
2. Enter prompt: "Test photo"
3. Select model: Seedream 4
4. Count: 10
5. QA: ✅ Enabled
6. Click "Generate"
7. Wait ~25 seconds
8. Should see all 10 photos
9. Start swiping and rating
```

### Test Scenario 2: Weighted Learning
```
1. Generate 5 photos (session 1)
2. Rate all with ❤️ (super like)
3. Generate 5 more photos (session 1)
4. Should see similar photos (learned)
5. Check Weight History page
6. Should see increased weights
```

### Test Scenario 3: QA Agent
```
1. Enable QA validation
2. Generate 5 photos
3. Check QA results in swipe interface
4. Should see QA score, status, issues
5. Generate more in same session
6. Agent should fix common issues
```

---

## 📚 Key Files

### Database:
- `database/FINAL_MIGRATION.sql` - Complete DB setup

### Backend:
- `backend/src/routes/generation.routes.js` - Generation logic
- `backend/src/services/agent.service.js` - AI prompt builder
- `backend/src/services/weights.service.js` - Weighted learning
- `backend/src/services/qa-agent.service.js` - QA validation

### Frontend:
- `frontend/src/pages/GeneratePageV3.jsx` - Main generation UI
- `frontend/src/pages/WeightHistoryPage.jsx` - Learning visualization

---

## 🎓 Best Practices

### 1. Weighted Learning:
- ✅ Оцінюй чесно (AI вчиться з твоїх оцінок)
- ✅ Додавай коментарі для складних випадків
- ✅ Використовуй різні оцінки (не тільки ❤️ або 💔)

### 2. QA Agent:
- ✅ Завжди увімкнений (запобігає bad prompts)
- ✅ Перевіряй QA issues для розуміння проблем
- ✅ Agent автоматично вчиться на попередніх помилках

### 3. Generation:
- ✅ Seedream 4 для production (надійніший)
- ✅ 10-20 фото за раз (оптимально)
- ✅ Використовуй "Generate More" для швидкого workflow

### 4. Organization:
- ✅ Створюй окремі projects для різних категорій
- ✅ Використовуй sessions для різних експериментів
- ✅ Переглядай Gallery та Weight History

---

## 🔧 Troubleshooting

### Console logs:
```javascript
// Backend
console.log('🔥 Starting generation...');
console.log('✅ Parameters selected:', selectedParams);
console.log('📤 FINAL PROMPT:', prompt);
console.log('📊 QA Score:', qaResult.score);
```

### Check:
1. ✅ Backend запущений? (http://localhost:5000/api/health)
2. ✅ Database налаштована? (Supabase Dashboard)
3. ✅ Environment variables? (.env файли)
4. ✅ CORS налаштований? (Vercel settings)

---

## 📞 Support

### Logs:
- Backend: `backend/` console
- Frontend: Browser DevTools
- Database: Supabase Dashboard → Logs

### Debug mode:
```javascript
// Enable verbose logging
console.log('DEBUG:', { ...allData });
```

---

**Ready to build! 🚀**

For detailed QA system documentation, see `QA_SYSTEM_GUIDE.md`
For general project info, see `README.md`

