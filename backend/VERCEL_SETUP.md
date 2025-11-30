# 🚀 Vercel Backend Deployment Guide

## Проблема CORS

Якщо ви бачите помилку:
```
Access to fetch at 'https://tin-ui-v3.vercel.app/api/auth/login' from origin 'https://serhiidubei.github.io' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

Це означає, що backend не дозволяє запити з вашого фронтенд домену.

## ✅ Рішення

### 1. Додайте Environment Variable в Vercel

1. Перейдіть до [Vercel Dashboard](https://vercel.com/dashboard)
2. Оберіть проект `tin-ui-v3`
3. Перейдіть до **Settings** → **Environment Variables**
4. Додайте нову змінну:

   **Name**: `CORS_ORIGINS`
   
   **Value**: `https://serhiidubei.github.io`
   
   *(Якщо у вас кілька доменів, розділіть їх комою: `https://serhiidubei.github.io,https://another-domain.com`)*

5. Виберіть для яких оточень застосувати:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

6. Натисніть **Save**

### 2. Redeploy проект

Після додавання змінної середовища:

**Опція А - Через Dashboard:**
1. Перейдіть до **Deployments**
2. Знайдіть останній deployment
3. Натисніть три крапки `⋮` → **Redeploy**

**Опція Б - Через Git:**
```bash
git add .
git commit -m "fix: Update CORS configuration for Vercel"
git push origin main
```

### 3. Перевірте Environment Variables у Vercel

Переконайтеся, що у вас встановлені всі необхідні змінні:

#### Обов'язкові:
- ✅ `SUPABASE_URL` - URL вашого Supabase проекту
- ✅ `SUPABASE_KEY` - Anon public key з Supabase
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service role key з Supabase
- ✅ `OPENAI_API_KEY` - OpenAI API ключ
- ✅ `REPLICATE_API_TOKEN` - Replicate API токен
- ✅ `CORS_ORIGINS` - Дозволені origins (ваш GitHub Pages URL)

#### Опціональні:
- `SEEDREAM_API_KEY` - Для Seedream моделей (якщо використовуєте)
- `NODE_ENV` - Встановлюється автоматично на `production`

### 4. Перевірте, що працює

1. Відкрийте консоль браузера (F12)
2. Спробуйте залогінитись на `https://serhiidubei.github.io/Tin_UI_V3/`
3. Якщо все добре, ви побачите успішний запит, а не CORS error

### 5. Додаткова перевірка

Перевірте чи працює API:
```bash
curl -X GET https://tin-ui-v3.vercel.app/api/health
```

Повинен повернути:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected"
}
```

## 🔍 Troubleshooting

### Проблема: CORS помилка все ще є після redeploy

**Рішення:**
1. Зробіть hard refresh у браузері: `Ctrl + Shift + R` (Windows/Linux) або `Cmd + Shift + R` (Mac)
2. Очистіть кеш браузера
3. Спробуйте в інкогніто режимі

### Проблема: Environment variables не застосовуються

**Рішення:**
1. Переконайтеся, що змінні додані для **Production** environment
2. Зробіть **Redeploy** (не просто новий commit)
3. Зачекайте 1-2 хвилини після deploy

### Проблема: API повертає 500 Internal Server Error

**Рішення:**
1. Перевірте Vercel Logs: Dashboard → Your Project → Logs
2. Переконайтеся, що всі обов'язкові environment variables встановлені
3. Перевірте, що Supabase база даних доступна

### Проблема: 404 Not Found на API endpoints

**Рішення:**
1. Переконайтеся, що URL правильний: `https://tin-ui-v3.vercel.app/api/auth/login` (з `/api`)
2. Перевірте, що `vercel.json` правильно налаштований
3. Перевірте в Vercel Logs чи endpoint існує

## 📝 Корисні команди

### Перевірити CORS з командного рядка:
```bash
curl -X OPTIONS https://tin-ui-v3.vercel.app/api/auth/login \
  -H "Origin: https://serhiidubei.github.io" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Повинен повернути headers:
```
Access-Control-Allow-Origin: https://serhiidubei.github.io
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Тестування API endpoint:
```bash
# Health check
curl https://tin-ui-v3.vercel.app/api/health

# Login test
curl -X POST https://tin-ui-v3.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://serhiidubei.github.io" \
  -d '{"username":"admin","password":"admin123"}'
```

## 🎯 Чеклист після deployment

- [ ] Всі environment variables додані в Vercel
- [ ] `CORS_ORIGINS` містить ваш GitHub Pages URL
- [ ] Проект redeploy після додавання змінних
- [ ] API health endpoint відповідає успішно
- [ ] Login працює без CORS помилок
- [ ] Hard refresh виконано в браузері

---

**Потрібна допомога?** Перевірте Vercel Logs або Supabase Dashboard для деталей про помилки.
