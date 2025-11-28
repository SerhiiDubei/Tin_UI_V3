# 🧪 Test Dashboard API

## Можливі причини помилки "Помилка завантаження даних"

### 1. Backend не підключений до Supabase

**Перевірка в backend терміналі:**
```
❌ Немає: ✅ Connected to Supabase
```

**Рішення:** Перевірте `.env` файл backend:
```env
SUPABASE_URL=https://ffnmlfnzufddmecfpive.supabase.co
SUPABASE_KEY=ваш_anon_key
SUPABASE_SERVICE_ROLE_KEY=ваш_service_key
```

---

### 2. Frontend не підключається до Backend

**Перевірка:**
- Відкрити F12 → Network
- Оновити Dashboard
- Подивитись чи є запити до `http://localhost:5000/api/projects`

**Можливі помилки:**
- `Failed to fetch` - Backend не працює
- `CORS error` - Backend не дозволяє frontend origin
- `404` - Endpoint не існує
- `500` - Backend помилка

---

### 3. userId не передається

**Перевірка в Browser Console (F12):**
```javascript
// Має показати userId
console.log('Loading dashboard for user:', userId);
```

**Якщо `undefined`:**
- Користувач не залогінений
- Рішення: Зайти через `/login`

---

### 4. projectsAPI.getAll повертає помилку

**Перевірка:**
```javascript
// В консолі має бути:
Projects response: { success: true, data: [...] }

// Якщо замість цього:
Projects response: { success: false, error: "..." }
```

**Тест вручну:**
```bash
# В терміналі:
curl http://localhost:5000/api/projects?userId=YOUR_USER_ID
```

---

### 5. Таблиця projects порожня

**Якщо немає проектів:**
- Dashboard покаже 0 в статистиці (це нормально)
- Покаже "Швидкий старт" гід

**Якщо помилка:**
- Перевірте чи існує таблиця `projects` в Supabase
- SQL: `SELECT * FROM projects;`

---

## 🔧 Швидка діагностика

### Крок 1: Відкрити Browser Console (F12)

Перейти на http://localhost:3000/#/dashboard

Подивитись логи:
```
✅ НОРМА:
Loading dashboard for user: 2a1ac34f-...
Projects response: {success: true, data: Array(2)}
Dashboard loaded successfully

❌ ПОМИЛКА:
Failed to load dashboard data: <error message>
```

### Крок 2: Перевірити Network

F12 → Network → Reload

**Очікувані запити:**
```
GET /api/projects?userId=<id>    → 200 OK
GET /api/sessions?projectId=<id> → 200 OK
```

**Якщо:**
- `Failed to fetch` → Backend не працює
- `401 Unauthorized` → Проблема з auth
- `500 Internal Error` → Backend помилка

### Крок 3: Тест Backend напряму

```bash
# Перевірити чи працює backend
curl http://localhost:5000/api/health

# Тест projects API
curl "http://localhost:5000/api/projects?userId=2a1ac34f-775c-4088-82d9-3a5d909c2eaf"
```

**Очікуваний результат:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "...",
      "sessions_count": 1,
      "generations_count": 3,
      "ratings_count": 0
    }
  ]
}
```

---

## 🚀 Швидке рішення

Якщо все інше не працює:

1. **Перезапустити backend:**
```bash
cd backend
# Ctrl+C щоб зупинити
npm run dev
```

2. **Очистити кеш браузера:**
```
F12 → Application → Clear storage → Clear site data
```

3. **Перелогінитись:**
```
Logout → Login знову
```

4. **Перевірити що є хоч один проект:**
```sql
-- В Supabase SQL Editor:
SELECT * FROM projects WHERE user_id = '2a1ac34f-775c-4088-82d9-3a5d909c2eaf';
```

Якщо проектів немає - це OK, Dashboard покаже "Quick Start Guide".

---

## 📊 Детальне логування увімкнено

В новій версії DashboardPage додано детальні `console.log()`, тому в Browser Console будуть видно точну причину помилки.

**Відкрийте F12 → Console і поділіться логами!**

