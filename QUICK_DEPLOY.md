# ⚡ Швидкий Deploy - 5 хвилин

## 1️⃣ Backend на Vercel (2 хв)

```bash
# Встановити Vercel CLI
npm i -g vercel

# Deploy
cd backend
vercel login
vercel --prod
```

Під час deploy додайте env vars:
- `SUPABASE_URL`
- `SUPABASE_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `REPLICATE_API_TOKEN`
- `CORS_ORIGINS=http://localhost:3000`

**Збережіть URL:** `https://your-project.vercel.app`

---

## 2️⃣ Frontend на GitHub Pages (2 хв)

### GitHub Secrets:
```
Settings → Secrets → New secret

Name: REACT_APP_API_URL
Value: https://your-project.vercel.app/api
```

### Enable Pages:
```
Settings → Pages → Source: GitHub Actions
```

### Deploy:
```bash
git add .
git commit -m "Deploy"
git push origin main
```

Чекайте 2-3 хвилини → Actions → Deploy Frontend

---

## 3️⃣ Оновити CORS (1 хв)

```
Vercel → Settings → Environment Variables

CORS_ORIGINS = http://localhost:3000,https://YOURNAME.github.io

→ Save → Redeploy
```

---

## ✅ Готово!

```
Frontend: https://YOURNAME.github.io/Tin_UI_V3/
Backend:  https://your-project.vercel.app
```

**Логін:** admin / admin123

---

❌ Проблеми? Дивіться `GITHUB_PAGES_CHECKLIST.md`

