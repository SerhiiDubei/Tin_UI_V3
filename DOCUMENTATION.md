# 📚 Tin UI V3 - Complete Documentation

> Intelligent AI Content Generation Platform with Weighted Learning

---

## 📖 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Key Features](#key-features)
4. [Technology Stack](#technology-stack)
5. [Getting Started](#getting-started)
6. [User Guide](#user-guide)
7. [Developer Guide](#developer-guide)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)
10. [Deployment](#deployment)

---

## 🎯 Project Overview

**Tin UI V3** is an advanced AI-powered content generation platform that learns from user preferences through a sophisticated weighted learning system.

### What Makes It Special?

- **🧠 Weighted Learning:** AI learns from your ratings and improves over time
- **🎨 Multiple Agents:** Dating Agent, General Agent, Ad Replicator
- **👁️ Vision AI:** Analyzes photos to generate detailed prompts
- **⚖️ Dynamic Parameters:** Creates parameters based on YOUR content
- **📊 Session-Based:** Tracks learning progress across sessions

### Use Cases

- 🖼️ **Dating Profile Photos:** Generate authentic, appealing profile pictures
- 🚗 **Automotive Advertising:** Create insurance ads, car photos
- 🍕 **Food Photography:** Professional food shots for restaurants
- 🏠 **Real Estate:** Property photos, interior design
- 🎭 **General Content:** Any creative visual content

---

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  React.js + TailwindCSS + React Router                     │
│  - Projects Management                                      │
│  - Sessions & Content Generation                           │
│  - Swipe Interface (Rating System)                         │
│  - Photo Upload & Analysis                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓ REST API
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│  Express.js + Node.js                                       │
│  ┌─────────────┬──────────────┬──────────────┬───────────┐ │
│  │ Projects    │ Sessions     │ Generation   │ Weights   │ │
│  │ API         │ API          │ API          │ Service   │ │
│  └─────────────┴──────────────┴──────────────┴───────────┘ │
│  ┌─────────────┬──────────────┬──────────────┬───────────┐ │
│  │ Dating      │ General      │ Ad Replicator│ Vision    │ │
│  │ Agent       │ Agent        │ Agent        │ AI        │ │
│  └─────────────┴──────────────┴──────────────┴───────────┘ │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                        │
│  ┌──────────────┬──────────────┬──────────────────────────┐│
│  │ OpenAI       │ Replicate    │ GenSpark Image Gen      ││
│  │ GPT-4o       │ Image Gen    │ (seedream, flux, etc.)  ││
│  │ Vision API   │ (ByteDance)  │                          ││
│  └──────────────┴──────────────┴──────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                              │
│  Supabase (PostgreSQL)                                      │
│  - users, projects, sessions, content_v3                   │
│  - weight_parameters (learning system)                      │
│  - Storage (generated images)                              │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. **Weighted Learning System**
The heart of the platform - learns from user ratings.

**How it works:**
- Each session has 11-14 parameter categories (lighting, composition, mood, etc.)
- Each category has 4-6 sub-parameters (golden_hour, studio_bright, etc.)
- Total: 44-84 individual weights per session
- User rates content (1-5 stars or swipe)
- Weights adjust based on ratings
- Next session inherits learned weights

**Example:**
```javascript
// Session 1
weights = {
  "lighting.golden_hour": 100,
  "composition.centered": 100,
  "mood.professional": 100
}

// User likes content with golden_hour
// After rating:
weights = {
  "lighting.golden_hour": 130,  // ↑ increased
  "composition.centered": 120,
  "mood.professional": 110
}

// Session 2 (inherits weights)
// AI is more likely to use golden_hour lighting!
```

#### 2. **Parameter Generation Strategies**

**A. Universal Parameters (Default)**
- 12 fixed categories that work for any content
- Examples: composition, lighting, color_palette, mood
- ✅ Stable, tested, works across all content types
- ✅ Learning transfers between categories (cars → food)

**B. Dynamic Parameters (Experimental) 🆕**
- Extracts parameters from YOUR actual content
- Analyzes Vision AI descriptions + Master Prompt
- Creates context-specific parameters
- ✅ More precise learning (vehicle_positioning vs generic composition)
- ✅ Reflects YOUR photos, not generic templates
- ⚠️ Experimental, user can enable per session

#### 3. **Agent Types**

**Dating Agent**
- Specialized for dating profile photos
- Fixed 11 parameters optimized for portraits
- Focuses on: age, gender, expression, lighting, setting
- Trained on dating app best practices

**General Agent**
- Universal agent for any content type
- Adapts to: automotive, food, real estate, products, etc.
- Uses universal OR dynamic parameters
- Powered by Vision AI for context understanding

**Ad Replicator Agent**
- Analyzes competitor ads (1-14 references)
- Extracts winning strategies (layout, messaging, visuals)
- Generates NEW original ads (no pixel copying)
- Includes: niche detection, audience targeting, platform optimization

#### 4. **Vision AI Integration**

**Purpose:** Analyze user photos to generate detailed prompts

**Process:**
1. **Content Detection:** Identify category (automotive, food, dating, etc.)
2. **Detailed Analysis:** Extract specific details from each photo
   - Subjects (exact poses, expressions, clothing)
   - Setting (environment, background elements)
   - Technical (lighting, composition, camera angle)
   - Colors (specific palette, tones)
3. **Style Analysis:** Visual style, color scheme, mood
4. **Prompt Generation:** Create 200-400 word detailed prompt

**Example Output:**
```
Photo 1: Metallic blue 2024 sedan positioned at 3/4 front angle 
in modern urban setting with glass buildings reflecting in glossy 
paint finish. Golden hour lighting from right side creates warm 
highlights on vehicle hood and roof, casting soft shadows that 
enhance body curves. Digital security shield icons floating around 
vehicle in AR style. Corporate trust blue (#0066CC) and clean 
white color scheme dominates. Professional composition using rule 
of thirds. Visible text overlay at top: 'Protected Journey Ahead' 
in bold white sans-serif font...
```

---

## ⚡ Key Features

### For Users

1. **📁 Project Management**
   - Create projects by category (dating, general, custom)
   - Multiple sessions per project
   - Track progress and statistics

2. **🎨 Content Generation**
   - Text-to-image
   - Photo analysis → smart prompts
   - Ad replicator (competitor analysis)
   - Multi-reference style transfer
   - Multiple AI models (Seedream, Flux, etc.)

3. **⭐ Rating System**
   - Swipe interface (Tinder-style)
   - 5-star ratings
   - Instant weight updates
   - Visual feedback on learning

4. **📊 Learning Dashboard**
   - See weight changes over time
   - Compare sessions
   - Understand what AI learned

5. **🧪 Experimental Features**
   - Dynamic parameter extraction (toggle in UI)
   - A/B testing between approaches
   - User-controlled learning strategies

### For Developers

1. **🔧 Modular Architecture**
   - Separate agents for different use cases
   - Easy to add new agents
   - Service-based design

2. **🗄️ Robust Database Schema**
   - Normalized structure
   - Cascading deletes
   - Proper indexing

3. **🎯 Type-Safe APIs**
   - Clear request/response formats
   - Error handling
   - Validation

4. **📈 Scalable Design**
   - Parallel image generation
   - Efficient database queries
   - Stateless backend

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 18.x
- **Styling:** TailwindCSS
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **State Management:** React Hooks (useState, useContext)
- **UI Components:** Custom components + Button library

### Backend
- **Runtime:** Node.js 20.x
- **Framework:** Express.js
- **Language:** JavaScript (ES6+)
- **API Design:** RESTful
- **File Uploads:** Multer
- **CORS:** Enabled for frontend

### Database
- **Provider:** Supabase (PostgreSQL)
- **ORM:** Supabase Client SDK
- **Storage:** Supabase Storage (for images)
- **Auth:** Supabase Auth

### AI Services
- **GPT-4o:** OpenAI API (prompts, parameters, analysis)
- **Image Generation:** 
  - Replicate (ByteDance Seedream, Flux)
  - GenSpark API (multiple models)
- **Vision AI:** OpenAI GPT-4o Vision

### Deployment
- **Frontend:** Vercel (auto-deploy from main branch)
- **Backend:** Vercel Serverless Functions
- **Database:** Supabase Cloud
- **Domain:** tin-ui-v3.vercel.app

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account
- OpenAI API key
- GenSpark API key (optional)

### Installation

1. **Clone repository**
```bash
git clone https://github.com/SerhiiDubei/Tin_UI_V3.git
cd Tin_UI_V3
```

2. **Install dependencies**
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

3. **Environment variables**

Create `.env` files:

**Backend `.env`:**
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# GenSpark (optional)
GENSPARK_API_KEY=your_genspark_key

# Replicate (optional)
REPLICATE_API_TOKEN=your_replicate_token

# Server
PORT=5000
NODE_ENV=development
```

**Frontend `.env`:**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

4. **Database setup**

Run migrations in Supabase SQL Editor:
```bash
# Main schema
cat database/FINAL_MIGRATION.sql | supabase db push

# Latest features
cat database/migrations/add_dynamic_parameters_flag.sql | supabase db push
```

5. **Run development servers**

```bash
# Backend (terminal 1)
cd backend
npm run dev

# Frontend (terminal 2)
cd frontend
npm start
```

6. **Open browser**
```
http://localhost:3000
```

---

## 📱 User Guide

### Creating Your First Project

1. Click "Create New Project"
2. Enter project name (e.g., "My Dating Photos")
3. Select category:
   - `dating` → Dating Agent (specialized)
   - `general` → General Agent (flexible)
4. Click "Create"

### Starting a Session

1. Open your project
2. Click "New Session"
3. Enter session name (e.g., "Winter Photos")
4. **Optional:** Check "🧪 Динамічні параметри" for experimental feature
5. Click "Create & Start"

### Generating Content

**Method 1: Text Prompt**
1. Enter your description
2. Select model (seedream-4 recommended)
3. Choose count (1-10 images)
4. Click "Generate"

**Method 2: Photo Upload (Vision AI)**
1. Click "📷 Upload Photos"
2. Select 1-14 reference images
3. Add optional instructions
4. Choose mode:
   - Multi-Reference: Extract common style
   - Ad Replicator: Analyze as ads
5. Click "Analyze & Generate"
6. Vision AI creates detailed prompt
7. Review and generate

### Rating Content

**Swipe Interface:**
- ← Swipe Left: Dislike (rating = 2)
- → Swipe Right: Like (rating = 4)
- Click stars: 1-5 rating

**What Happens:**
- Weights update instantly
- AI learns your preferences
- Next generation uses learned weights

### Understanding Parameters

**View Parameters:**
1. Go to session
2. Click "Parameters" tab
3. See all 11-14 categories
4. Each has 4-6 options
5. Click to see weight values

**Track Learning:**
1. Go to "Weight History"
2. See weight changes over time
3. Compare before/after ratings
4. Understand what AI learned

---

## 👨‍💻 Developer Guide

### Project Structure

```
Tin_UI_V3/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API clients
│   │   ├── context/         # React Context
│   │   └── App.jsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── config/          # Configuration
│   │   ├── db/              # Database client
│   │   └── server.js
│   └── package.json
├── database/
│   ├── FINAL_MIGRATION.sql
│   └── migrations/
└── README.md
```

### Adding a New Agent

1. Create agent service file:
```javascript
// backend/src/services/agent-my-agent.service.js
export async function buildMyAgentPrompt(userInput, parameters) {
  // Your logic here
  return {
    success: true,
    prompt: "Generated prompt...",
    parameters: { /* selected params */ }
  };
}
```

2. Import in generation routes:
```javascript
import myAgent from '../services/agent-my-agent.service.js';
const { buildMyAgentPrompt } = myAgent;
```

3. Add to agent selection logic:
```javascript
if (agentType === 'my-agent') {
  promptResult = await buildMyAgentPrompt(userPrompt, parameters);
}
```

### Adding a New Parameter Category

**For Universal Parameters:**

Edit `backend/src/services/weights.service.js`:

```javascript
const systemPrompt = `...
UNIVERSAL PARAMETER STRUCTURE (use this as base):
{
  // ... existing params
  "my_new_category": ["option1", "option2", "option3", "option4", "option5"]
}
`;
```

**For Dynamic Parameters:**

No code changes needed! Dynamic extraction will automatically detect relevant parameters from content.

### API Development Best Practices

1. **Always validate inputs:**
```javascript
if (!sessionId || !projectId) {
  return res.status(400).json({
    success: false,
    error: 'Required fields missing'
  });
}
```

2. **Use consistent response format:**
```javascript
// Success
res.json({
  success: true,
  data: { ... }
});

// Error
res.status(500).json({
  success: false,
  error: 'Error message'
});
```

3. **Add logging:**
```javascript
console.log('🚀 API Request:', endpoint);
console.log('📊 Processing:', data);
console.log('✅ Success:', result);
console.error('❌ Error:', error);
```

4. **Handle async properly:**
```javascript
try {
  const result = await someAsyncFunction();
  // handle success
} catch (error) {
  console.error('Error:', error);
  // handle error
}
```

---

## 🔌 API Reference

See separate file: [API_REFERENCE.md](./API_REFERENCE.md)

Quick overview:

- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `POST /api/sessions` - Create session
- `POST /api/generation/generate` - Generate content
- `POST /api/generation/rate` - Rate content
- `GET /api/sessions/:id/weight-history` - Get learning history

---

## 🗄️ Database Schema

See separate file: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

Key tables:
- `users` - User accounts
- `projects` - User projects
- `sessions` - Generation sessions
- `weight_parameters` - Learning system
- `content_v3` - Generated content

---

## 🚀 Deployment

### Vercel Deployment

**Automatic:**
- Push to `main` branch
- Vercel auto-deploys frontend + backend
- Environment variables set in Vercel dashboard

**Manual:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Database Migration

**After deployment, run migrations:**
1. Go to Supabase Dashboard
2. SQL Editor
3. Paste migration SQL
4. Run

### Environment Variables

Set in Vercel dashboard:
- All backend `.env` variables
- Frontend variables prefixed with `REACT_APP_`

---

## 📄 License

Private project - All rights reserved

---

## 🤝 Contributing

Internal project - Contact maintainer for access

---

## 📞 Support

For issues or questions:
- Create GitHub issue
- Contact: [your-email]

---

**Last Updated:** 2025-12-08  
**Version:** 3.0  
**Status:** Production
