# 📦 Supabase Storage Bucket Setup

## Проблема

```
Upload from URL error: StorageApiError: Bucket not found
status: 400, statusCode: '404'
```

Ця помилка виникає тому, що bucket `generated-content` не створений в Supabase Storage.

## Рішення

### Крок 1: Зайти в Supabase Dashboard

1. Відкрити https://supabase.com/dashboard
2. Вибрати ваш проект

### Крок 2: Створити Bucket

1. В лівому меню натиснути **Storage**
2. Натиснути **Create a new bucket**
3. Заповнити форму:
   - **Name**: `generated-content`
   - **Public bucket**: ✅ **Так** (увімкнути)
   - **File size limit**: 50 MB (або більше)
   - **Allowed MIME types**: `image/*` (або залишити порожнім для всіх типів)

4. Натиснути **Create bucket**

### Крок 3: Налаштувати RLS Policy (опціонально)

Якщо bucket публічний, можна додати політику для публічного читання:

```sql
-- Policy: Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-content');

-- Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-content');
```

### Крок 4: Перезапустити сервер

```bash
# Backend
cd backend
npm run dev

# Або якщо використовується PM2
pm2 restart all
```

## Перевірка

Після створення bucket, в логах має з'явитися:

```
✅ Storage bucket exists
```

Замість:

```
📦 Bucket 'generated-content' not found.
```

## Що це дає?

- ✅ Постійні URL для згенерованого контенту
- ✅ URL не експіруються через 24-48 годин (як у Replicate)
- ✅ Швидший доступ до файлів
- ✅ Централізоване зберігання

## Альтернатива (якщо не хочете створювати bucket)

Система працюватиме з тимчасовими URL від Replicate, але вони експіруються через 24-48 годин.

В логах буде:

```
⚠️ Failed to upload to permanent storage, using temporary URL
```

Контент буде доступний, але URL стануть недійсними через деякий час.

