# 🔥 Tin UI V3 - AI Content Generation Platform

**Tinder-style AI feedback platform for content generation and optimization**

Modern full-stack application that generates AI content (images, videos, audio) and learns from user preferences through swipe-based feedback.

---

## 🎯 Features

### 🎨 Content Generation
- **Multi-modal AI**: Generate images, videos, and audio
- **Smart Prompts**: AI-enhanced prompts using GPT-4o
- **Vision AI**: 📸 Upload 1-20 photos → AI analyzes style → generates prompt
- **Multiple Models**: Seedream 4, Nano Banana Pro, and more
- **Streaming Generation**: Photos appear progressively as they generate

### 👆 Swipe Feedback
- **Tinder-style Interface**: Swipe left (dislike), right (like), up (superlike), down (skip)
- **Comment System**: Add detailed feedback to ratings
- **Learning Algorithm**: AI learns from your preferences
- **Parameter Optimization**: Weighted parameters adjust based on ratings

### 📊 Project Management
- **Projects & Sessions**: Organize your work into projects and sessions
- **Gallery View**: Browse all generated content with filters
- **Statistics**: Track likes, dislikes, and engagement
- **User Insights**: AI-analyzed preferences and suggestions

### 🔐 Authentication
- **User Accounts**: Registration and login system
- **Role-based Access**: User and admin roles
- **Test Accounts**: Pre-configured for quick testing

---

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern UI library
- **React Router v6** - Client-side routing
- **Context API** - State management
- **CSS3** - Custom responsive styling

### Backend
- **Node.js + Express** - REST API server
- **Supabase (PostgreSQL)** - Database and storage
- **OpenAI GPT-4o** - Prompt enhancement + Vision AI
- **Replicate API** - AI model integration (Nano Banana Pro)
- **Seedream API** - Image generation (Seedream 4)

### Infrastructure
- **Supabase** - Database, Storage, Auth
- **Vercel** - Frontend deployment (optional)
- **PM2** - Process management

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- OpenAI API key
- Replicate API key (optional)
- Seedream API key (optional)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd Tin_UI_V3

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. Open SQL Editor in Supabase Dashboard
3. Copy and run the entire `database/MIGRATION.sql` file
4. Wait for completion - this creates all tables and test users

### 3. Backend Configuration

Create `backend/.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# OpenAI (for prompt enhancement)
OPENAI_API_KEY=sk-your-key

# Replicate (optional - for additional models)
REPLICATE_API_TOKEN=r8_your-token

# Seedream (optional - for Seedream 4 model)
SEEDREAM_API_KEY=your-seedream-key

# Server
PORT=5000
NODE_ENV=development
```

### 4. Frontend Configuration

Create `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 5. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Frontend opens at `http://localhost:3000`

### 6. Login

Use test accounts:
- **Admin**: `admin` / `admin123`
- **User**: `testuser` / `test123`

Or register a new account!

---

## 📁 Project Structure

```
Tin_UI_V3/
├── backend/                # Node.js API server
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── db/            # Database connection
│   │   ├── middleware/    # Express middleware
│   │   └── config/        # Configuration
│   └── package.json
│
├── frontend/              # React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API client
│   │   └── hooks/         # Custom hooks
│   └── package.json
│
├── database/              # Database migrations
│   └── MIGRATION.sql      # Complete DB setup
│
├── README.md              # This file
└── SETUP.md              # Detailed setup guide
```

---

## 🎮 Usage

### Creating a Project
1. Login to the application
2. Click "➕ Створити Проєкт"
3. Enter project name, category, and description
4. Click "Створити проєкт"

### Starting a Session
1. Open your project
2. Click "➕ Нова Сесія"
3. Enter session name
4. AI generates initial parameters automatically

### Generating Content

**Option 1: Text Prompt**
1. Open a session
2. Enter your prompt (e.g., "Professional insurance advertising")
3. Click "🚀 Згенерувати та почати свайпати"
4. Photos appear progressively as they generate
5. Start swiping immediately after first photo!

**Option 2: 🆕 Vision AI (Upload Photos)**
1. Click "📸 Upload Photos" button
2. Select 1-20 reference photos
3. Add optional comments to each photo:
   - "Geico Insurance, suburban setting"
   - "Focus on warm natural lighting"
4. Add global instructions (optional)
5. Click "🔍 Analyze"
6. AI generates unified prompt based on common style
7. Use prompt to generate new photos! ✨

### Swiping Content
- **Swipe Left** / **←**: Dislike
- **Swipe Right** / **→**: Like
- **Swipe Up** / **↑**: Superlike (love it!)
- **Swipe Down** / **↓**: Skip
- Add optional comments for detailed feedback

### Viewing Gallery
1. Click "🖼️ Галерея" in session view
2. Filter by: All, Superliked, Liked, Disliked
3. Click any image to view details

---

## 🔑 API Keys Setup

### OpenAI (Required)
**Used for:** Prompt enhancement + Vision AI photo analysis

1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Add to `backend/.env` as `OPENAI_API_KEY`

**Models used:**
- GPT-4o (prompt enhancement)
- GPT-4o Vision (photo analysis)

### Replicate (Optional)
**Used for:** Nano Banana Pro model

1. Go to https://replicate.com/account/api-tokens
2. Create token
3. Add to `backend/.env` as `REPLICATE_API_TOKEN`

### Seedream (Recommended)
**Used for:** Seedream 4 model (most stable)

1. Contact Seedream for API access
2. Add key to `backend/.env` as `SEEDREAM_API_KEY`

---

## 🐛 Troubleshooting

### Backend won't start
- Check `.env` file exists in `backend/`
- Verify Supabase credentials are correct
- Run `npm install` in backend folder

### Database errors
- Ensure `MIGRATION.sql` was executed successfully
- Check Supabase dashboard for connection
- Verify tables exist in Table Editor

### Can't login
- Check backend is running on port 5000
- Verify test users exist in database
- Try registering a new account

### Generation fails
- Verify API keys in `.env`
- Check backend logs for errors
- Ensure you have API credits
- Try Seedream 4 instead of Nano Banana Pro

### Photo upload fails ("request entity too large")
- ✅ **FIXED**: Auto-compression enabled
- Large photos (>2MB) automatically compressed
- Max upload: 50MB total, 15MB per photo
- Support up to 20 photos

### Vision AI fails ("I'm sorry, but I can't assist")
- ✅ **FIXED**: Safety disclaimers added
- Works for: Insurance, Automotive, Dating, Products, Corporate
- Add context in comments for better results

---

## 🚢 Deployment

📖 **Детальна інструкція: [SETUP.md](./SETUP.md#-деплой-в-production)**

### Quick Deploy

**Backend → Vercel:**
1. Go to [vercel.com](https://vercel.com) → Add New Project
2. Import repository → **Root Directory: `backend`**
3. Add Environment Variables:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=sk-your-key
   CORS_ORIGINS=https://yourusername.github.io
   NODE_ENV=production
   ```
4. Deploy!

**Frontend → GitHub Pages:**
1. Repository Settings → Secrets → Add:
   - `REACT_APP_API_URL` = `https://your-backend.vercel.app/api`
2. Settings → Pages → Source: **GitHub Actions**
3. Push to main branch:
   ```bash
   git push origin main
   ```

### Production URLs
- **Backend API:** `https://your-project.vercel.app/api`
- **Frontend:** `https://yourusername.github.io/Tin_UI_V3/`

### ⚠️ Common Issues

**"Failed to fetch" при логіні:**
- Перевірте `CORS_ORIGINS` в Vercel містить точний GitHub Pages URL
- Перевірте `REACT_APP_API_URL` в GitHub Secrets
- Hard refresh (Ctrl+Shift+R) після deploy

---

## 📝 License

MIT License - Feel free to use for personal and commercial projects

---

## 👥 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

---

## 📞 Support

For issues and questions:
- Check `SETUP.md` for detailed configuration
- Review backend logs for errors
- Check Supabase dashboard for database issues

---

**Built with ❤️ using React, Node.js, and AI**
