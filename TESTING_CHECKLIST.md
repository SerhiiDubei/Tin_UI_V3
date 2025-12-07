# ✅ Setup & Testing - General AI System

> **Quick start guide** для налаштування та тестування General Purpose AI

---

## 📋 System Status

**✅ Completed:**
- 8 спеціалізованих режимів інтегровано
- Автоматичний вибір агента (dating vs general)
- Ad Replicator для affiliate marketing
- Multi-model support (14 reference images)
- Документація створена
- Всі помилки виправлені
- Session creation без параметрів для general (динамічні параметри)

**⚠️ Required:**
- Apply SQL: `UPDATE_GENERAL_AGENT.sql`
- Test functionality

**🔄 TODO (для подальшого розвитку):**
- Динамічне створення параметрів для General AI на основі:
  - Першого промпту юзера
  - Завантажених фото (Vision AI аналіз)
  - Комбінованого підходу

---

## 🎯 Pre-Test Setup

### ⚠️ **Step 1: Apply SQL Update (REQUIRED!)**

```bash
# В Supabase SQL Editor:
1. Відкрити: database/UPDATE_GENERAL_AGENT.sql
2. Скопіювати весь вміст
3. Execute (Run)
4. Перевірити: SELECT * FROM agent_configs WHERE type = 'general';
```

### **Step 2: Verify Backend Running**
```bash
# Check terminal: backend should be running on port 5000
# Look for: "🚀 Server running on port 5000"
```

### **Step 3: Verify Frontend Running**
```bash
# Check terminal: frontend should be on port 3000
# Look for: "webpack compiled successfully"
```

---

## 🧪 Test Suite

### **Test 1: Dating Project (Existing Functionality)** ✅

**Should work as before:**

```
1. Login
2. Create Project
   - Name: "Test Dating"
   - Tag: 'dating'
3. Create Session
4. Generate Page opens
   ✅ Should see: Vision AI button
   ✅ Should see: Standard prompt textarea
   ✅ Should NOT see: ModeSelector
5. Enter prompt: "Woman on beach"
6. Generate
   ✅ Should work with Dating Expert agent
```

---

### **Test 2: General AI - Text-to-Image** 📝

**Basic mode (no references):**

```
1. Create Project
   - Name: "Test General"
   - Tag: 'art' (or 'general', 'products', anything non-dating)
2. Create Session
3. Generate Page opens
   ✅ Should see: ModeSelector (8 cards)
   ✅ Should NOT see: Vision AI button
   ✅ Default mode: Text-to-Image selected
4. Enter prompt: "Modern office with plants"
5. Count: 2
6. Generate
   ✅ Should call agent-general.service
   ✅ Should generate 2 images
   ✅ Check console: "🎨 Using General Purpose AI"
```

---

### **Test 3: Style Transfer** 🎨

**With 1 reference image:**

```
1. In Test General project/session
2. Select mode: 🎨 Style Transfer
   ✅ File input should appear
3. Upload 1 image (e.g., watercolor painting)
   ✅ Preview should show
4. Prompt: "Portrait of a woman in park"
5. Generate
   ✅ Should pass image as reference
   ✅ Check backend logs: "📸 Using X reference images"
```

---

### **Test 4: Multi-Reference** 🖼️

**With 3-5 images:**

```
1. Select mode: 🖼️ Multi-Reference
   ✅ File input should allow multiple
2. Upload 3 images
   ✅ All 3 should preview
   ✅ Counter: "3/14"
3. Prompt: "Combine elements from all images"
4. Generate
   ✅ Should work with 3 references
```

---

### **Test 5: Ad Replicator** 🎯 (Special!)

**Affiliate marketing mode:**

```
1. Create Project
   - Name: "Test Marketing"
   - Tag: 'marketing'
2. Create Session
3. Select mode: 🎯 Ad Replicator
   ✅ Should see: "Competitor Ads (1-14)" label
   ✅ Should see: Tip about ethical replication
4. Upload 3 competitor ad screenshots
   ✅ Preview grid: 3 images
5. Prompt: "Teeth whitening kit for women 30-50"
6. Count: 3 (will generate 3 variations)
7. Generate
   ✅ Should call agent-ad-replicator
   ✅ Check logs: "🎯 AD CREATIVE REPLICATOR"
   ✅ Should analyze patterns
   ✅ Should generate 3 NEW original ads
```

---

## 🐛 Expected Behaviors

### **Conditional Rendering:**

| Project Tag | UI Shows | Agent Used |
|-------------|----------|------------|
| `'dating'` | Vision AI button | Dating Expert |
| Any other | ModeSelector (8 modes) | General AI |

### **Mode-Specific Inputs:**

| Mode | File Input | Multiple Files |
|------|------------|----------------|
| text-to-image | ❌ No | - |
| style-transfer | ✅ Yes | ❌ Single |
| image-editing | ✅ Yes | ❌ Single |
| multi-reference | ✅ Yes | ✅ Up to 14 |
| object-replace | ✅ Yes | ❌ Single |
| background-change | ✅ Yes | ❌ Single |
| pro-quality | ❌ No | - |
| ad-replicator | ✅ Yes | ✅ Up to 14 |

---

## 🔍 Debug Checklist

### **If ModeSelector not showing:**
- [ ] Check project.tag in database (should NOT be 'dating')
- [ ] Refresh browser (Ctrl+Shift+R)
- [ ] Check console for import errors
- [ ] Verify ModeSelector.jsx exists in components/

### **If generation fails:**
- [ ] Check backend logs in terminal
- [ ] Verify OpenAI API key in .env
- [ ] Check Replicate API key in .env
- [ ] Look for error messages in response

### **If reference images not working:**
- [ ] Check file size (<10MB recommended)
- [ ] Check format (PNG, JPG, WEBP)
- [ ] Check browser console for errors
- [ ] Try with fewer images first (1-2)

### **If Ad Replicator fails:**
- [ ] Upload at least 1 competitor ad
- [ ] Describe niche clearly
- [ ] Check backend logs for GPT-4o errors
- [ ] Verify response_format in openai call

---

## 📊 Success Criteria

### **✅ System is working if:**
1. Dating projects show Vision AI (existing)
2. Non-dating projects show ModeSelector
3. All 8 modes are selectable
4. File upload works for relevant modes
5. Generation completes without errors
6. Images appear in gallery
7. Backend logs show correct agent selection

---

## 🚀 Performance Expectations

| Test | Expected Time |
|------|---------------|
| Text-to-Image (1 image) | ~2-3 seconds |
| Style Transfer (1 ref) | ~2-3 seconds |
| Multi-Reference (3 refs) | ~3-4 seconds |
| Ad Replicator (3 ads, 3 variations) | ~5-10 seconds |

---

## 📝 Testing Notes Template

**Use this when testing:**

```markdown
## Test Results

**Date:** [date]
**Tester:** [name]

### Test 1: Dating Project
- [ ] Vision AI button visible
- [ ] Generation works
- [ ] Status: PASS / FAIL
- [ ] Notes: 

### Test 2: General - Text-to-Image
- [ ] ModeSelector visible
- [ ] Default mode selected
- [ ] Generation works
- [ ] Status: PASS / FAIL
- [ ] Notes:

### Test 3: Style Transfer
- [ ] File input appears
- [ ] Upload works
- [ ] Generation with reference works
- [ ] Status: PASS / FAIL
- [ ] Notes:

### Test 4: Ad Replicator
- [ ] Multi-file upload works
- [ ] Tip message shows
- [ ] Generation creates variations
- [ ] Status: PASS / FAIL
- [ ] Notes:

### Overall Status: PASS / FAIL

**Issues Found:**
1. [List issues]

**Fixes Applied:**
1. [List fixes]
```

---

## 🎉 Post-Testing

**If all tests pass:**
- ✅ System готовий до production
- ✅ Можна використовувати для реальних проектів
- ✅ Документація актуальна

**If issues found:**
- 📝 Document issues
- 🔧 Apply fixes
- 🔄 Re-test
- ✅ Update documentation

---

**Ready to test! 🚀**


