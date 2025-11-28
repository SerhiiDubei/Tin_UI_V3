# 🛠 Tin UI V3 - Детальна інструкція з налаштування

## 📋 Зміст

1. [Вимоги](#вимоги)
2. [Налаштування бази даних](#налаштування-бази-даних)
3. [Налаштування backend](#налаштування-backend)
4. [Налаштування frontend](#налаштування-frontend)
5. [Запуск додатку](#запуск-додатку)
6. [Конфігурація API ключів](#конфігурація-api-ключів)
7. [Деплой](#деплой)
8. [Усунення проблем](#усунення-проблем)

---

## 🎯 Вимоги

### Необхідне програмне забезпечення
- **Node.js** 18.0.0 або вище
- **npm** 9.0.0 або вище
- **Git** (для клонування репозиторію)
- Сучасний браузер (Chrome, Firefox, Safari, Edge)

### Необхідні акаунти
- **Supabase** - https://supabase.com (безкоштовний tier)
- **OpenAI** - https://platform.openai.com (потрібні кредити)
- **Replicate** (опціонально) - https://replicate.com
- **Seedream** (опціонально) - контакт для API доступу

---

## 🗄 Налаштування бази даних

### Крок 1: Створення Supabase проекту

1. Перейдіть на https://supabase.com
2. Натисніть "Start your project"
3. Створіть організацію (якщо ще немає)
4. Натисніть "New Project"
5. Заповніть дані:
   - **Name**: tin-ui-v3 (або будь-яка назва)
   - **Database Password**: створіть надійний пароль (збережіть його!)
   - **Region**: оберіть найближчий (Europe West для України)
   - **Pricing Plan**: Free
6. Натисніть "Create new project"
7. Зачекайте 2-3 хвилини поки проект створюється

### Крок 2: Отримання API ключів

1. В панелі Supabase відкрийте ваш проект
2. Перейдіть: **Settings** → **API**
3. Скопіюйте:
   - **Project URL** (наприклад: `https://xxxxx.supabase.co`)
   - **anon public** ключ (починається з `eyJ...`)

### Крок 3: Виконання міграції

1. В Supabase панелі перейдіть: **SQL Editor**
2. Натисніть "New query"
3. Відкрийте файл `database/MIGRATION.sql` з проекту
4. Скопіюйте **ВЕСЬ** вміст файлу
5. Вставте в SQL Editor
6. Натисніть "Run" або `Ctrl+Enter`
7. Зачекайте завершення (5-10 секунд)

**Перевірка успішності:**
- В SQL Editor виконайте: `SELECT * FROM users;`
- Має показати 2 користувачів: admin та testuser
- Якщо помилка - перевірте повідомлення і виконайте SQL знову

### Крок 4: Перевірка таблиць

Перейдіть в **Table Editor** і переконайтесь що створені таблиці:
- ✅ users
- ✅ projects
- ✅ sessions
- ✅ parameters
- ✅ content
- ✅ ratings
- ✅ prompt_templates
- ✅ user_insights

### Крок 5: Налаштування Storage (опціонально)

1. Перейдіть: **Storage**
2. Натисніть "Create bucket"
3. Назва: `generated-content`
4. Public bucket: **Yes** (щоб контент був доступний)
5. Натисніть "Create bucket"

---

## ⚙️ Налаштування Backend

### Крок 1: Встановлення залежностей

```bash
cd backend
npm install
```

### Крок 2: Створення .env файлу

Створіть файл `backend/.env`:

```env
# ============================================
# SUPABASE CONFIGURATION (ОБОВ'ЯЗКОВО)
# ============================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# OPENAI (ОБОВ'ЯЗКОВО для покращення промптів)
# ============================================
OPENAI_API_KEY=sk-proj-...

# ============================================
# REPLICATE (Опціонально - для додаткових моделей)
# ============================================
REPLICATE_API_TOKEN=r8_...

# ============================================
# SEEDREAM (Опціонально - для Seedream 4)
# ============================================
SEEDREAM_API_KEY=your-seedream-key

# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=5000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Крок 3: Перевірка конфігурації

```bash
# Перевірка підключення до бази даних
node -e "console.log(require('./src/config/index.js').default)"
```

### Крок 4: Тестовий запуск

```bash
npm start
```

**Очікуваний вивід:**
```
🔌 Testing database connection...
✅ Database connected successfully!
📦 Checking storage...
🚀 Server started successfully!
📡 API running on: http://localhost:5000
```

Якщо є помилки - перевірте `.env` файл!

---

## 🎨 Налаштування Frontend

### Крок 1: Встановлення залежностей

```bash
cd frontend
npm install
```

### Крок 2: Створення .env файлу

Створіть файл `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

**Для production:**
```env
REACT_APP_API_URL=https://your-backend.com/api
```

### Крок 3: Тестовий запуск

```bash
npm start
```

**Очікуваний результат:**
- Браузер відкривається на `http://localhost:3000`
- Показується сторінка логіну
- Немає помилок в консолі

---

## 🚀 Запуск додатку

### Режим розробки (Development)

**Варіант 1: Два окремих термінала**

Terminal 1 - Backend:
```bash
cd backend
npm start
```

Terminal 2 - Frontend:
```bash
cd frontend
npm start
```

**Варіант 2: PM2 (рекомендовано для розробки)**

```bash
# Встановити PM2 глобально
npm install -g pm2

# Запустити backend
cd backend
pm2 start src/server.js --name tin-backend --watch

# Запустити frontend
cd ../frontend
pm2 start npm --name tin-frontend -- start

# Переглянути статус
pm2 status

# Переглянути логи
pm2 logs

# Зупинити все
pm2 stop all
```

### Перший вхід

1. Відкрийте `http://localhost:3000`
2. Спробуйте тестові акаунти:
   - **Admin**: `admin` / `admin123`
   - **User**: `testuser` / `test123`
3. Або зареєструйте новий акаунт через "✨ Реєстрація"

---

## 🔑 Конфігурація API ключів

### OpenAI API Key

**Обов'язковий** для покращення промптів AI.

1. Перейдіть: https://platform.openai.com/api-keys
2. Увійдіть в акаунт (або створіть новий)
3. Натисніть "Create new secret key"
4. Назва: `tin-ui-v3`
5. Скопіюйте ключ (показується тільки раз!)
6. Додайте в `backend/.env`: `OPENAI_API_KEY=sk-...`

**Ціни (станом на 2025):**
- GPT-4o: ~$5 за 1M токенів input
- Промпт enhancement коштує ~$0.001-0.01 за запит

### Replicate API Token (опціонально)

Для додаткових AI моделей (Stable Diffusion, FLUX, тощо).

1. Перейдіть: https://replicate.com
2. Увійдіть / Зареєструйтесь
3. Перейдіть: Account → API tokens
4. Створіть новий токен
5. Додайте в `backend/.env`: `REPLICATE_API_TOKEN=r8_...`

**Ціни:**
- Залежить від моделі ($0.0001 - $0.01 за генерацію)
- Безкоштовний tier: $10 кредитів на старт

### Seedream API Key (опціонально)

Для Seedream 4 моделі (висока якість зображень).

1. Контакт з Seedream для отримання доступу
2. Отримайте API ключ
3. Додайте в `backend/.env`: `SEEDREAM_API_KEY=your-key`

---

## 🚢 Деплой

### Frontend на Vercel

1. **Підготовка:**
```bash
cd frontend
npm run build
```

2. **Деплой через Vercel CLI:**
```bash
npm install -g vercel
vercel login
vercel --prod
```

3. **Або через GitHub:**
- Push код на GitHub
- Імпортуйте в Vercel
- Встановіть environment variables:
  - `REACT_APP_API_URL`: URL вашого backend

### Backend на Railway/Render

**Railway:**
```bash
# Встановити Railway CLI
npm install -g @railway/cli

# Логін
railway login

# Деплой
cd backend
railway up
```

**Render:**
1. Створіть Web Service
2. Підключіть GitHub репозиторій
3. Build Command: `cd backend && npm install`
4. Start Command: `cd backend && npm start`
5. Додайте Environment Variables з `.env`

### Backend на VPS (Ubuntu)

```bash
# Підключитись до VPS
ssh user@your-server.com

# Встановити Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Встановити PM2
sudo npm install -g pm2

# Клонувати проект
git clone <your-repo>
cd Tin_UI_V3/backend

# Встановити залежності
npm install

# Створити .env файл
nano .env
# (вставити конфігурацію)

# Запустити з PM2
pm2 start src/server.js --name tin-backend
pm2 startup
pm2 save

# Налаштувати Nginx
sudo apt install nginx
sudo nano /etc/nginx/sites-available/tin-backend
```

**Nginx конфігурація:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🐛 Усунення проблем

### Backend не запускається

**Помилка: `Cannot connect to Supabase`**
- ✅ Перевірте `SUPABASE_URL` та `SUPABASE_ANON_KEY` в `.env`
- ✅ Переконайтесь що Supabase проект активний
- ✅ Перевірте інтернет з'єднання

**Помилка: `Port 5000 already in use`**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

**Помилка: `Module not found`**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Frontend не запускається

**Помилка: `Invalid API URL`**
- ✅ Перевірте `frontend/.env` файл існує
- ✅ Перевірте `REACT_APP_API_URL` правильний
- ✅ Backend працює на цьому URL

**Помилка: `npm ERR! ELIFECYCLE`**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Проблеми з базою даних

**Помилка: `relation "users" does not exist`**
- ✅ Виконайте `database/MIGRATION.sql` в Supabase SQL Editor
- ✅ Перевірте таблиці в Table Editor

**Помилка: `column "password_hash" does not exist`**
- ✅ Повторно виконайте міграцію
- ✅ Або додайте колонку вручну:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
```

### Не можу залогінитись

**Невірний пароль:**
- Тестові акаунти: `admin/admin123`, `testuser/test123`
- Перевірте в Supabase Table Editor: `SELECT * FROM users;`

**Користувача не існує:**
```sql
-- Створити вручну в Supabase SQL Editor
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES ('admin', 'admin@example.com', 'admin123', 'Admin', 'admin');
```

### AI генерація не працює

**Помилка: `OpenAI API key invalid`**
- ✅ Перевірте ключ в `backend/.env`
- ✅ Перевірте баланс на https://platform.openai.com/usage

**Помилка: `Rate limit exceeded`**
- Зачекайте хвилину
- Перевірте ліміти на OpenAI dashboard

**Генерація занадто повільна:**
- Нормальний час: 5-30 секунд на зображення
- Перевірте інтернет швидкість
- Перевірте логи backend для помилок

### Проблеми з Storage

**Зображення не завантажуються:**
- ✅ Створіть bucket `generated-content` в Supabase Storage
- ✅ Встановіть bucket як Public
- ✅ Перевірте CORS налаштування в Supabase

---

## 📚 Додаткові ресурси

### Документація
- [Supabase Docs](https://supabase.com/docs)
- [React Router v6](https://reactrouter.com)
- [OpenAI API](https://platform.openai.com/docs)
- [Replicate Docs](https://replicate.com/docs)

### Корисні команди

```bash
# Перевірка версій
node --version
npm --version

# Очистка кешу
npm cache clean --force

# Перевірка портів
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Mac/Linux

# PM2 команди
pm2 list
pm2 logs
pm2 restart all
pm2 stop all
pm2 delete all

# Git команди
git status
git pull origin main
git add .
git commit -m "message"
git push origin main
```

### Логи та дебаг

**Backend логи:**
```bash
# Якщо запущено через npm start
# Логи в консолі

# Якщо запущено через PM2
pm2 logs tin-backend
```

**Frontend логи:**
- Відкрийте DevTools в браузері (F12)
- Перейдіть на вкладку Console
- Шукайте червоні помилки

**Supabase логи:**
- Dashboard → Logs → Explorer
- Фільтруйте по типу: Errors

---

## 🎓 Навчальні ресурси

### Для початківців
1. [Node.js Tutorial](https://nodejs.dev/learn)
2. [React Tutorial](https://react.dev/learn)
3. [Git Basics](https://git-scm.com/book/en/v2)

### Для просунутих
1. [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
2. [React Performance](https://react.dev/learn/render-and-commit)
3. [PostgreSQL Optimization](https://www.postgresql.org/docs/current/performance-tips.html)

---

## 📞 Підтримка

Якщо виникли проблеми:
1. Перевірте цей файл SETUP.md
2. Подивіться логи (backend і browser console)
3. Перевірте Supabase dashboard
4. Створіть Issue на GitHub з описом проблеми

---

**Успішного налаштування! 🚀**

