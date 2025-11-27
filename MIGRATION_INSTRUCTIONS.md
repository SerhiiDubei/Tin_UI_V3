# 📋 Database Migration Instructions

## Застосування міграцій до Supabase

### Крок 1: Відкрити Supabase Dashboard

1. Перейди на: **https://ffnmlfnzufddmecfpive.supabase.co**
2. Увійди в свій обліковий запис
3. Обери проєкт (якщо у тебе їх декілька)

### Крок 2: Відкрити SQL Editor

1. У лівому меню натисни **"SQL Editor"** (іконка `</>`)
2. Натисни **"New query"** або `+ New query`

### Крок 3: Скопіювати SQL

1. Відкрий файл: `/home/user/webapp/database/APPLY_TO_SUPABASE.sql`
2. Скопіюй **весь** SQL код (11+ KB)
3. Вставсь його в SQL Editor

### Крок 4: Виконати міграцію

1. Натисни **"Run"** (або `Ctrl+Enter` / `Cmd+Enter`)
2. Почекай ~10-30 секунд
3. Перевір результат внизу екрану

### Очікуваний результат:

```
Success. No rows returned
✅ Database setup complete!
📊 V2 tables: users, prompt_templates, content, ratings, user_insights
📊 V3 tables: projects, sessions, weight_parameters, content_v3, agent_configs
🤖 Default agents: Dating Photo Expert, General Purpose AI
👤 Default users: demo (user), admin (admin)
```

### Крок 5: Перевірка

Після виконання, перевір що таблиці створені:

1. Перейди до **"Table Editor"** в лівому меню
2. Ти повинен побачити таблиці:
   - ✅ `projects`
   - ✅ `sessions`
   - ✅ `weight_parameters`
   - ✅ `content_v3`
   - ✅ `session_ratings`
   - ✅ `agent_configs`
   - ✅ `users`
   - ✅ `prompt_templates`
   - ✅ `content`
   - ✅ `ratings`
   - ✅ `user_insights`

---

## Альтернативний метод (якщо SQL Editor не працює)

### Використання Supabase CLI:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref ffnmlfnzufddmecfpive

# Apply migration
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.ffnmlfnzufddmecfpive.supabase.co:5432/postgres"
```

---

## Якщо виникли помилки:

### Помилка: "already exists"
- ✅ **Це нормально!** Деякі об'єкти вже існують
- Просто проігноруй це повідомлення

### Помилка: "permission denied"
- ❌ Переконайся, що ти адмін проєкту
- Спробуй увійти з правильного облікового запису

### Помилка: "syntax error"
- ❌ Переконайся, що скопіював весь SQL код
- Перевір, чи не обрізався код при копіюванні

---

## Після успішної міграції:

1. **Рестартуй backend:**
   ```bash
   cd /home/user/webapp
   pm2 restart backend-v3
   ```

2. **Перевір підключення:**
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Запусти тести:**
   ```bash
   cd /home/user/webapp/backend
   node test-v3-api.js
   ```

---

## 🎉 Готово!

Після успішного застосування міграцій, backend зможе працювати з базою даних.
