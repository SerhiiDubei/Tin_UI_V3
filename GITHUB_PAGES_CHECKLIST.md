# ✅ GitHub Pages + Vercel Checklist

## 📋 Поточний статус підключень

### ✅ ЩО ВЖЕ НАЛАШТОВАНО:

#### Frontend (GitHub Pages)
- ✅ **HashRouter** - використовується для правильної роботи роутингу
- ✅ **404.html** - редірект для SPA
- ✅ **index.html** - скрипт для GitHub Pages SPA
- ✅ **API_BASE_URL** - читає з `process.env.REACT_APP_API_URL`
- ✅ **package.json** - homepage: "./" для relative paths
- ✅ **GitHub Actions** - автоматичний deploy workflow

#### Backend (Vercel)
- ✅ **vercel.json** - правильна конфігурація (без конфлікту builds/functions)
- ✅ **CORS** - динамічна конфігурація через `CORS_ORIGINS`
- ✅ **Routes** - всі API endpoints під `/api/*`
- ✅ **maxDuration: 60** - для тривалих операцій (AI generation)

---

## 🚀 КРОКИ ДЛЯ DEPLOY

### 1️⃣ Backend на Vercel (СПОЧАТКУ!)

#### A. Через Vercel Dashboard

1. **Зайдіть на [vercel.com](https://vercel.com)**
2. **New Project** → Import ваш GitHub репозиторій
3. **Налаштування:**
   ```
   Framework Preset: Other
   Root Directory: backend
   Build Command: (порожнє)
   Output Directory: (порожнє)
   Install Command: npm install
   ```

4. **Environment Variables** (додайте ВСІ):
   ```env
   SUPABASE_URL=https://ffnmlfnzufddmecfpive.supabase.co
   SUPABASE_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=sk-your-key
   REPLICATE_API_TOKEN=r8_your-token
   GEMINI_API_KEY=your-gemini-key
   CORS_ORIGINS=http://localhost:3000
   NODE_ENV=production
   PORT=5000
   RATE_LIMIT=100
   LOG_LEVEL=info
   ```
   
   ⚠️ **ВАЖЛИВО:** На цьому етапі в `CORS_ORIGINS` додайте тільки localhost!

5. **Deploy** → збережіть URL (наприклад: `https://tin-ui-backend.vercel.app`)

#### B. Перевірка Backend

Відкрийте в браузері:
```
https://your-backend-url.vercel.app/
```

Має показати JSON:
```json
{
  "name": "Tinder AI Feedback API",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {...}
}
```

Перевірте health:
```
https://your-backend-url.vercel.app/api/health
```

✅ Якщо працює - переходимо далі!

---

### 2️⃣ Frontend на GitHub Pages

#### A. Додайте GitHub Secret

1. **GitHub Repository** → Settings → Secrets and variables → Actions
2. **New repository secret:**
   ```
   Name: REACT_APP_API_URL
   Value: https://your-backend-url.vercel.app/api
   ```
   
   ⚠️ **ВАЖЛИВО:** URL має закінчуватися на `/api` (без слешу в кінці)

#### B. Enable GitHub Pages

1. **Settings** → Pages
2. **Source:** GitHub Actions ⚠️ (НЕ Deploy from branch!)
3. **Save**

#### C. Deploy

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

#### D. Моніторинг Deploy

1. **Actions** → "Deploy Frontend to GitHub Pages"
2. Чекайте завершення (2-5 хвилин)
3. Після success: **Settings** → Pages → Your site is live at...

---

### 3️⃣ Оновлення CORS (КРИТИЧНО!)

Після успішного deploy frontend, **ОБОВ'ЯЗКОВО** додайте GitHub Pages URL в CORS:

1. **Vercel Dashboard** → ваш проект
2. **Settings** → Environment Variables
3. **Знайдіть `CORS_ORIGINS`** → Edit
4. **Додайте GitHub Pages URL:**
   ```
   http://localhost:3000,https://yourusername.github.io
   ```
   
   Замініть `yourusername` на ваш реальний GitHub username!

5. **Save**
6. **Deployments** → три крапки → **Redeploy**

⚠️ **БЕЗ ЦЬОГО КРОКУ FRONTEND НЕ ЗМОЖЕ ПІДКЛЮЧИТИСЬ ДО BACKEND!**

---

## 🧪 Тестування

### Після повного deploy:

1. **Відкрийте ваш сайт:**
   ```
   https://yourusername.github.io/Tin_UI_V3/
   ```

2. **Відкрийте DevTools (F12) → Console**

3. **Залогіньтесь:**
   - Username: `admin`
   - Password: `admin123`

4. **Перевірте що немає помилок:**
   - ❌ CORS errors
   - ❌ Network errors
   - ❌ 404 errors

5. **Тест повного flow:**
   - ✅ Логін
   - ✅ Dashboard відображається
   - ✅ Створення проекту
   - ✅ Створення сесії
   - ✅ Генерація контенту
   - ✅ Swipe та оцінка

---

## 🐛 Troubleshooting

### Проблема: CORS Error

```
Access to fetch at 'https://your-backend.vercel.app/api/...' 
from origin 'https://yourusername.github.io' has been blocked by CORS policy
```

**Рішення:**
1. Vercel Dashboard → Environment Variables
2. Перевірте `CORS_ORIGINS` містить ваш GitHub Pages URL
3. URL має бути **ТОЧНИЙ** (з https://, без слешу в кінці)
4. Після зміни → **Redeploy!**

---

### Проблема: 404 при перезавантаженні сторінки

**Причина:** GitHub Pages не підтримує SPA routing out of the box

**Рішення:** ✅ Вже налаштовано!
- `404.html` редіректить на головну
- `HashRouter` використовує `/#/` замість `/`
- Працює автоматично

---

### Проблема: API не відповідає

**Симптом:** 
```
API request error: Failed to fetch
```

**Перевірте:**
1. ✅ Backend працює: `https://your-backend.vercel.app/`
2. ✅ Environment Variables в Vercel додані
3. ✅ `REACT_APP_API_URL` в GitHub Secrets правильний
4. ✅ CORS налаштований

**Debug:**
```javascript
// В Console браузера:
console.log(process.env.REACT_APP_API_URL)
// Має показати ваш Vercel URL
```

Якщо показує `undefined`:
- Перевірте GitHub Secret
- Re-deploy frontend (push пустий commit)

---

### Проблема: Build fails на GitHub Actions

**Перевірте Actions logs:**
```
Actions → Deploy Frontend to GitHub Pages → View logs
```

**Частi помилки:**

1. **"REACT_APP_API_URL is not defined"**
   - Додайте secret в GitHub Settings → Secrets

2. **"npm ci failed"**
   - `package-lock.json` застарілий
   - Локально: `cd frontend && npm install`
   - Commit і push новий `package-lock.json`

3. **"Build failed"**
   - Є помилки в коді
   - Перевірте локально: `npm run build`

---

## 📝 Фінальні URLs

Після успішного deploy:

```
✅ Backend API:  https://your-project.vercel.app
✅ Frontend:     https://yourusername.github.io/Tin_UI_V3/
✅ Health Check: https://your-project.vercel.app/api/health
```

---

## 🔄 Автоматичні Updates

### Frontend:
```bash
# Будь-який push в main автоматично deploy
git push origin main
```

### Backend:
- Vercel автоматично deploy при push
- Або вручну: Vercel Dashboard → Redeploy

---

## 📊 Monitoring

### Vercel (Backend):
- Dashboard → Analytics
- Logs → Runtime Logs
- Deployments → Build logs

### GitHub Pages (Frontend):
- Actions → Deployment history
- Settings → Pages → Live URL

---

## 🎉 Готово!

Якщо все працює:
- ✅ Сайт відкривається
- ✅ Логін працює
- ✅ Dashboard показує дані
- ✅ Можна створювати проекти
- ✅ Генерація працює
- ✅ Немає CORS помилок в Console

**Ваш проект live в production! 🚀**

---

## 💡 Tips

### Швидкий re-deploy:

**Frontend:**
```bash
git commit --allow-empty -m "Trigger rebuild"
git push origin main
```

**Backend:**
```bash
vercel --prod
# або в Dashboard → Redeploy
```

### Локальне тестування production build:

```bash
# Frontend
cd frontend
REACT_APP_API_URL=https://your-backend.vercel.app/api npm run build
npx serve -s build

# Backend
cd backend  
NODE_ENV=production npm start
```

---

**Успішного deploy! 🎊**

