# 🔍 Чеклист GitHub Pages для Tin_UI_V3

## Проблема:
Відкривається стара версія (Tin_UI_V2) замість нової (Tin_UI_V3)

---

## ✅ Перевірте по порядку:

### 1️⃣ GitHub Pages увімкнено?

**URL:** https://github.com/SerhiiDubei/Tin_UI_V3/settings/pages

**Має бути:**
```
Build and deployment
└── Source: GitHub Actions ✅
```

**Якщо інше:**
- Змініть на "GitHub Actions"
- Save

---

### 2️⃣ GitHub Actions успішні?

**URL:** https://github.com/SerhiiDubei/Tin_UI_V3/actions

**Перевірте:**
- Останній run "Deploy Frontend to GitHub Pages"
- Має бути зелена галочка ✅

**Якщо червоний хрестик ❌:**
1. Клікніть на run
2. Подивіться помилку
3. Найчастіші проблеми:
   - Відсутній Secret `REACT_APP_API_URL`
   - GitHub Pages не увімкнено (крок 1)

---

### 3️⃣ Secret доданий?

**URL:** https://github.com/SerhiiDubei/Tin_UI_V3/settings/secrets/actions

**Має бути:**
```
REACT_APP_API_URL = https://tin-ui-v3.vercel.app/api
```

**Якщо немає:**
1. New repository secret
2. Name: `REACT_APP_API_URL`
3. Value: `https://tin-ui-v3.vercel.app/api`
4. Add secret

---

### 4️⃣ Правильний URL

**Правильно:**
```
https://serhiidubei.github.io/Tin_UI_V3/
```
⚠️ З `/Tin_UI_V3/` в кінці!

**Неправильно:**
```
https://serhiidubei.github.io/
або
https://serhiidubei.github.io/Tin_UI_V2/
```

---

## 🚀 Якщо все налаштовано, але не працює:

### Перезапустіть deploy:

**Варіант 1 - Push:**
```bash
git add .
git commit -m "Fix GitHub Pages"
git push origin main
```

**Варіант 2 - Вручну:**
1. https://github.com/SerhiiDubei/Tin_UI_V3/actions
2. "Deploy Frontend to GitHub Pages"
3. "Run workflow" → "Run workflow"

---

## 📊 Моніторинг deploy:

1. Зайдіть в Actions: https://github.com/SerhiiDubei/Tin_UI_V3/actions
2. Клікніть на останній run
3. Дочекайтеся завершення (2-3 хвилини)
4. Має бути: ✅ Success!

---

## 🎯 Перевірка після deploy:

1. Відкрийте: https://serhiidubei.github.io/Tin_UI_V3/
2. Має відкритись нова версія
3. Ctrl+Shift+R (hard refresh) якщо бачите старе
4. Залогіньтесь: admin / admin123

---

## 🐛 Troubleshooting:

### "Все ще бачу стару версію"
- Ctrl+Shift+R (hard refresh)
- Відкрийте в приватному вікні
- Перевірте URL (має бути `/Tin_UI_V3/`)

### "GitHub Actions falling"
- Перевірте Secret доданий
- Перевірте GitHub Pages увімкнено
- Подивіться error logs в Actions

### "404 Not Found"
- GitHub Pages ще не готовий (зачекайте 2-3 хв)
- Перевірте що deploy успішний (зелена галочка)

---

## ✅ Фінальний чеклист:

- [ ] Settings → Pages → Source: GitHub Actions
- [ ] Settings → Secrets → REACT_APP_API_URL доданий
- [ ] Actions → Deploy успішний (зелена галочка)
- [ ] Відкривається правильний URL: `/Tin_UI_V3/`
- [ ] Сайт працює, можна залогінитись

---

**Якщо всі пункти ✅ - маєте побачити нову версію! 🎉**

