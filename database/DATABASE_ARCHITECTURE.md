# 🗄️ Database Architecture - Tin UI V3

## 📊 Overview

Tin UI V3 використовує **гібридну систему** для зберігання контенту та рейтингів з підтримкою AI навчання.

---

## 🎯 Core Tables

### 1. **`content_v3`** - Generated Content
**Призначення:** Зберігає весь згенерований контент (фото, відео)

**Ключові поля:**
```sql
- id (UUID)
- session_id, project_id, user_id
- url, type (image/video)
- original_prompt, enhanced_prompt, final_prompt
- model, agent_type
- rating (INTEGER: -3, -1, null, +1, +3) ← Швидкий доступ
- rated_at, comment
- weights_used (JSONB) ← Знімок ваг параметрів
- qa_validation (JSONB) ← QA Agent результати
```

**Чому rating тут?**
- ✅ Денормалізація для швидкого доступу
- ✅ Легко фільтрувати контент по оцінкам
- ✅ Не потребує JOIN для простих запитів

---

### 2. **`session_ratings`** ⭐ **AI LEARNING TABLE**
**Призначення:** Зберігає рейтинги З ПАРАМЕТРАМИ для навчання агента

**Поля:**
```sql
- id (UUID)
- session_id (UUID) → sessions.id
- content_id (UUID) → content_v3.id
- rating (INTEGER: -3, -1, +1, +3)
- parameters_used (JSONB) ← КЛЮЧОВЕ ПОЛЕ!
- created_at
```

**Приклад `parameters_used`:**
```json
{
  "category": "dating",
  "parameters": [
    { "parameter": "smartphone_style", "value": "iPhone_13_HEIC_2022", "weight": 100 },
    { "parameter": "subject", "value": "woman_26_30_confident", "weight": 115 },
    { "parameter": "lighting", "value": "bright_daylight_clear", "weight": 105 },
    { "parameter": "composition", "value": "mirror_selfie_full_body", "weight": 120 }
  ]
}
```

**Як агент використовує:**
1. Юзер ставить 👍 (rating = 1)
2. Система дивиться які параметри були використані
3. **Збільшує ваги** параметрів що отримали like
4. **Зменшує ваги** параметрів що отримали dislike
5. Наступна генерація використовує оновлені ваги

**Код навчання:**
```javascript
// backend/src/services/weights.service.js
const { data: ratings } = await supabase
  .from('session_ratings')
  .select('*')
  .eq('session_id', sessionId);

// Аналізує parameters_used і коригує ваги
ratings.forEach(rating => {
  if (rating.rating > 0) {
    // Like → збільшити ваги параметрів
    increaseWeights(rating.parameters_used);
  } else {
    // Dislike → зменшити ваги
    decreaseWeights(rating.parameters_used);
  }
});
```

---

### 3. **`ratings`** 🗑️ **LEGACY TABLE (можна видалити)**
**Призначення:** Стара система для SwipePage (left/right/up/down)

**Чому застаріла:**
- Використовувала `direction` замість `rating`
- Не зберігала параметри для навчання
- Прив'язана до старої архітектури

**Статус:** 
- ❌ **НЕ використовується** в новій системі (GeneratePageV3)
- ✅ **МОЖНА ВИДАЛИТИ** якщо не плануєте використовувати старий SwipePage

---

## 🔄 Data Flow

### Генерація контенту:
```
1. User запитує генерацію
   ↓
2. Agent бере поточні ваги з weight_parameters
   ↓
3. Генерує контент з цими вагами
   ↓
4. Зберігає в content_v3 (weights_used = snapshot ваг)
```

### Оцінка контенту:
```
1. User ставить оцінку (👍 Like = +1)
   ↓
2. Оновлюється content_v3.rating = 1
   ↓
3. TRIGGER auto-sync → session_ratings
   ↓
4. Agent аналізує session_ratings
   ↓
5. Коригує weight_parameters
   ↓
6. Наступна генерація використовує нові ваги
```

---

## 📋 Related Tables

### **`weight_parameters`** - Current Weights
Зберігає поточні ваги параметрів для кожної сесії:
```sql
- session_id
- parameter_name (e.g., "smartphone_style")
- sub_parameter (e.g., "iPhone_13_HEIC_2022")
- weight (FLOAT, default 100.0)
```

Це **живі ваги** які постійно оновлюються на основі `session_ratings`.

### **`projects`** & **`sessions`**
Організаційна структура:
```
User → Projects → Sessions → Content
```

---

## ✅ Recommendations

### **Видалити стару систему?**

**Опція 1: Видалити `ratings` таблицю** ✅ **РЕКОМЕНДУЮ**
```sql
-- Якщо не використовуєте старий SwipePage
DROP TABLE ratings CASCADE;
```

**Опція 2: Залишити для історії** ⚠️
- Якщо хочете зберегти старі дані
- Але не буде синхронізації з новою системою

### **Застосувати міграцію:**
```bash
# Запустити SQL скрипт
psql -h [host] -U [user] -d [database] -f database/ADD_SESSION_RATINGS_TABLE.sql

# Або через Supabase SQL Editor
# Copy-paste весь вміст файлу
```

### **Перевірити що все працює:**
```sql
-- Перевірити що таблиця існує
SELECT * FROM session_ratings LIMIT 5;

-- Перевірити trigger
UPDATE content_v3 
SET rating = 1, rated_at = NOW() 
WHERE id = 'some-id';

-- Має автоматично з'явитися запис в session_ratings
SELECT * FROM session_ratings WHERE content_id = 'some-id';
```

---

## 🎓 Summary

### **Core Tables:**
1. **`content_v3`** = Контент + швидкий rating + weights_used
2. **`session_ratings`** = Детальні рейтинги + параметри для AI навчання 🧠
3. **`weight_parameters`** = Поточні ваги параметрів (динамічні)
4. **`agent_configs`** = AI агенти (Dating Expert + General Purpose AI)
5. **`projects`** + **`sessions`** = Організаційна структура

### **Legacy (можна видалити):**
- ⚠️ **`ratings`** = Стара таблиця (SwipePage V1)
- ⚠️ **`prompt_templates`** = Старі статичні шаблони (V2)

### **AI Agents:**

**1. Dating Photo Expert** (tag: 'dating')
- 11-Parameter System (smartphone_style, subject, lighting, etc.)
- Weighted Learning з session_ratings
- MASTER PROMPT для smartphone realism
- Authenticity through Imperfection

**2. General Purpose AI** (tag: any other)
- 8 Specialized Modes (text-to-image, style transfer, editing, multi-ref, etc.)
- Multi-model support (Nano Banana Pro, Seedream, Flux)
- Reference images (up to 14)
- Ad Replicator для affiliate marketing

### **Learning Flow:**
```
session_ratings.parameters_used + rating 
   → weights.service.js analyzes
   → updates weight_parameters
   → next generation uses new weights! 🚀
```

---

## 🗄️ Database Status

**Active Tables:** ✅
- content_v3 (141+ items)
- session_ratings (335+ records)
- weight_parameters (dynamic)
- agent_configs (2 agents)
- projects, sessions, users

**Legacy Tables:** ⚠️
- ratings (optional cleanup)
- prompt_templates (optional cleanup)

**SQL Scripts:**
- `UPDATE_GENERAL_AGENT.sql` - Update General AI agent
- `REMOVE_LEGACY_TABLES.sql` - Optional cleanup

---

**✅ Database готова для роботи!**


