# 🚀 Tin_UI_V3 - Architecture Documentation

## 📋 Загальний Огляд

**Version 3** - це повна переробка з фокусом на:
- ✅ Універсальну систему параметрів (Weight Learning System)
- ✅ Проєкти та сесії з історією
- ✅ Множинні AI агенти (Dating + General)
- ✅ Step-by-step генерацію
- ✅ Fine-tuning на основі оцінок

---

## 🏗️ Архітектура Системи

### 1. Navigation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        LOGIN                                 │
│                    (Authentication)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   PROJECTS DASHBOARD                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Project 1    │  │ Project 2    │  │ + Create New    │   │
│  │ Dating Photos│  │ Super Cars   │  │   Project       │   │
│  │ 3 sessions   │  │ 1 session    │  └─────────────────┘   │
│  └──────────────┘  └──────────────┘                         │
└────────────────────────┬────────────────────────────────────┘
                         │ (Click on project)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              PROJECT: "Dating Photos"                        │
│              Tag: dating                                     │
│              Description: Generate dating profile photos     │
│                                                              │
│                    SESSIONS LIST                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Session 1 - 27.11.2025  (15 photos, avg +2)        │   │
│  │ Session 2 - 28.11.2025  (8 photos, avg +1)         │   │
│  │ + Create New Session                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ (Select or create session)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            SESSION ACTIONS                                   │
│                                                              │
│    ┌──────────────────┐        ┌──────────────────┐        │
│    │   See Photos     │        │  Start Session   │        │
│    │    (Gallery)     │        │      OR          │        │
│    │                  │        │ Continue Session │        │
│    └──────────────────┘        └──────────────────┘        │
└─────────┬─────────────────────────────┬───────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────┐    ┌────────────────────────────────┐
│      GALLERY        │    │       GENERATION               │
│  • Photo grid       │    │  1. Agent analyzes session     │
│  • Prompt details   │    │  2. User enters prompt         │
│  • Ratings          │    │  3. Step-by-step generation    │
│  • Weights used     │    │  4. Swipe & rate               │
└─────────────────────┘    └────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Core Tables

#### 1. **projects**
```sql
- id (UUID)
- user_id (UUID)
- name (TEXT) -- "Dating Photos", "Super Cars"
- tag (TEXT) -- "dating", "cars", "insurance"
- description (TEXT)
- total_sessions (INT)
- total_generations (INT)
- created_at, updated_at
```

#### 2. **sessions**
```sql
- id (UUID)
- project_id (UUID) → projects
- user_id (UUID)
- name (TEXT) -- User can rename, e.g., "Beach Photos"
- session_number (INT) -- Auto-increment per project
- status (TEXT) -- 'active', 'completed', 'archived'
- total_generations (INT)
- total_ratings (INT)
- avg_rating (FLOAT)
- created_at, updated_at, last_activity_at
```

#### 3. **weight_parameters** (Universal & Dynamic!)
```sql
- id (UUID)
- session_id (UUID) → sessions
- category (TEXT) -- "dating", "cars", "insurance"
- parameter_name (TEXT) -- "subject", "vehicle", "lighting"
- sub_parameter (TEXT) -- "young_adult", "ferrari_488"
- weight (FLOAT) -- 0-200, starts at 100
- times_used (INT)
- times_liked (INT)
- times_disliked (INT)
- created_at, updated_at
```

**Example for Dating:**
```json
{
  "session_id": "abc-123",
  "category": "dating",
  "parameter_name": "subject",
  "sub_parameter": "young_adult",
  "weight": 115
}
```

**Example for Cars:**
```json
{
  "session_id": "xyz-789",
  "category": "cars",
  "parameter_name": "brand",
  "sub_parameter": "ferrari",
  "weight": 95
}
```

#### 4. **content_v3**
```sql
- id (UUID)
- session_id (UUID) → sessions
- project_id (UUID) → projects
- user_id (UUID)
- url (TEXT) -- Image/video URL
- type (TEXT) -- 'image', 'video', 'audio'
- original_prompt (TEXT)
- enhanced_prompt (TEXT)
- final_prompt (TEXT)
- model (TEXT) -- 'nano-banana-pro', 'seedream-4'
- agent_type (TEXT) -- 'dating', 'general'
- weights_used (JSONB) -- Snapshot of parameters
- rating (INT) -- -3, -1, 1, 3
- comment (TEXT)
- rated_at (TIMESTAMPTZ)
- created_at
```

**weights_used structure:**
```json
{
  "category": "dating",
  "parameters": [
    {"parameter": "subject", "value": "young_adult", "weight": 115},
    {"parameter": "device", "value": "iPhone_14_Pro", "weight": 100},
    {"parameter": "lighting", "value": "golden_hour", "weight": 95}
  ]
}
```

#### 5. **agent_configs**
```sql
- id (UUID)
- name (TEXT) -- "Dating Photo Expert"
- type (TEXT) -- "dating", "general"
- description (TEXT)
- system_prompt (TEXT) -- Agent's system instructions
- default_parameters (JSONB) -- Parameter schema
- active (BOOLEAN)
- created_at, updated_at
```

---

## 🤖 Weight Learning System

### How It Works

#### Phase 1: Parameter Creation (Dynamic!)

Agent **automatically creates** parameters based on category:

**Example: Dating**
```python
parameters = {
  "subject": ["teen", "young_adult", "middle_aged"],
  "device": ["iPhone_14_Pro", "iPhone_13", "Pixel_7"],
  "lighting": ["golden_hour", "natural_window", "studio"],
  "mood": ["casual", "professional", "romantic"]
}
```

**Example: Cars**
```python
parameters = {
  "brand": ["ferrari", "lamborghini", "porsche"],
  "angle": ["front_view", "side_profile", "action_shot"],
  "environment": ["studio", "mountain_road", "city_street"],
  "style": ["photorealistic", "cinematic", "dramatic"]
}
```

**Example: Space Pigs** 🐷🚀
```python
parameters = {
  "pig_type": ["viking_pigs", "astronaut_pigs", "cyber_pigs"],
  "weapons": ["plasma_swords", "laser_cannons", "energy_shields"],
  "location": ["asteroid_field", "space_station", "near_planet"],
  "style": ["realistic_3d", "retro_sci_fi", "cyberpunk"]
}
```

#### Phase 2: Weight Initialization

All parameters start at **weight = 100**

```python
# Initial weights
{
  "subject.young_adult": 100,
  "device.iPhone_14_Pro": 100,
  "lighting.golden_hour": 100
}
```

#### Phase 3: Generation with Weights

Agent selects parameters using **weighted random**:

```python
def select_parameter(parameter_options, weights):
    # Higher weight = higher probability
    choices = []
    probabilities = []
    
    for option in parameter_options:
        weight = weights.get(option, 100)
        choices.append(option)
        probabilities.append(weight)
    
    # Normalize probabilities
    total = sum(probabilities)
    probabilities = [p/total for p in probabilities]
    
    return random.choices(choices, weights=probabilities)[0]

# Example:
selected_age = select_parameter(
    ["teen", "young_adult", "middle_aged"],
    {
        "teen": 60,           # Lower probability
        "young_adult": 115,   # Higher probability
        "middle_aged": 85
    }
)
# Result: "young_adult" more likely to be selected
```

#### Phase 4: Rating & Weight Update

User swipes and rates: **-3, -1, +1, +3**

```python
def update_weights(used_parameters, rating):
    weight_change = {
        3: +15,   # Super like
        1: +5,    # Like
        -1: -5,   # Dislike
        -3: -15   # Super dislike
    }[rating]
    
    # Update ALL parameters used in this generation
    for param in used_parameters:
        current_weight = db.get_weight(param)
        new_weight = max(0, min(200, current_weight + weight_change))
        db.update_weight(param, new_weight)

# Example: Super dislike (-3)
{
  "subject.teen": 60 - 15 = 45,
  "device.iPhone_X": 85 - 15 = 70,
  "lighting.natural_window": 90 - 15 = 75
}
```

#### Phase 5: Learning Over Time

After 20+ ratings, weights evolve:

```python
# Initial state (all 100)
"young_adult": 100
"teen": 100
"middle_aged": 100

# After 20 ratings
"young_adult": 115  # ✅ Consistently liked
"teen": 60          # ❌ Consistently disliked
"middle_aged": 85   # 😐 Mixed results
```

---

## 🎯 Agent Logic

### Agent Types

#### 1. Dating Photo Expert
- **Specialization:** Seedream 4.0 smartphone photos
- **Parameters:** subject, device, lighting, composition, mood
- **System Prompt:** Focus on realistic, authentic dating photos

#### 2. General Purpose AI
- **Specialization:** Universal, creates parameters dynamically
- **Parameters:** Analyzed from user prompt
- **System Prompt:** Adaptable to any content type

### Agent Workflow

```python
class SmartAgent:
    def process_generation(self, user_prompt, session_id):
        # Step 1: Analyze session history
        session = db.get_session(session_id)
        
        if session.is_first_generation():
            # First time - create parameters
            category = self.detect_category(user_prompt)
            parameters = self.create_parameters(category)
            weights = self.initialize_weights(parameters, value=100)
            db.save_parameters(session_id, parameters, weights)
        else:
            # Continuation - load and analyze
            parameters = db.get_parameters(session_id)
            weights = db.get_weights(session_id)
            history = db.get_session_history(session_id)
            
            # Analyze what worked and what didn't
            insights = self.analyze_history(history)
            print(f"📊 Insights: Users liked {insights.top_liked}, disliked {insights.top_disliked}")
        
        # Step 2: Select parameters (weighted random)
        selected = self.select_parameters(parameters, weights)
        
        # Step 3: Build prompt
        prompt = self.build_prompt(user_prompt, selected)
        
        # Step 4: Generate
        result = generate_image(prompt, model='nano-banana-pro')
        
        # Step 5: Save with weight snapshot
        db.save_content(
            session_id=session_id,
            url=result.url,
            prompt=prompt,
            weights_used=selected
        )
        
        return result
```

### Category Detection

```python
def detect_category(prompt):
    """Detect category from user prompt using AI"""
    
    categories = {
        "dating": ["woman", "man", "girl", "boy", "dating", "profile", "selfie"],
        "cars": ["car", "vehicle", "ferrari", "lamborghini", "supercar"],
        "insurance": ["family", "insurance", "happy", "home", "safety"],
        "space_pigs": ["pig", "swine", "battle", "space", "cosmic"]
    }
    
    # Use GPT to analyze
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "system",
            "content": f"Detect category from prompt. Options: {list(categories.keys())}"
        }, {
            "role": "user",
            "content": prompt
        }]
    )
    
    return response.choices[0].message.content.strip()
```

### Dynamic Parameter Creation

```python
def create_parameters(category, user_prompt):
    """Agent creates parameters dynamically"""
    
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "system",
            "content": f"""You are creating parameter schema for {category} generation.
            
            Analyze the user's needs and create 8-12 parameters with 3-5 options each.
            
            Return JSON format:
            {{
              "parameter1": ["option1", "option2", "option3"],
              "parameter2": ["optionA", "optionB", "optionC"]
            }}"""
        }, {
            "role": "user",
            "content": f"User wants: {user_prompt}"
        }],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)

# Example output for "Generate super cars":
{
  "brand": ["ferrari", "lamborghini", "porsche", "bugatti"],
  "model": ["488_gtb", "aventador", "911_turbo", "chiron"],
  "color": ["rosso_corsa", "nero", "bianco", "giallo"],
  "angle": ["front_3_4", "side_profile", "rear_view"],
  "environment": ["studio", "mountain_road", "city_street"],
  "lighting": ["dramatic", "golden_hour", "studio_light"],
  "style": ["photorealistic", "cinematic", "artistic"]
}
```

---

## 🔄 Step-by-Step Generation

### Implementation Options

#### Option A: Server-Sent Events (SSE)
```python
@app.route('/api/generate/stream', methods=['POST'])
def generate_stream():
    def event_stream():
        for i in range(10):
            # Generate one image
            result = generate_image(prompt, count=1)
            
            # Send to client immediately
            yield f"data: {json.dumps({
                'index': i,
                'url': result.url,
                'status': 'ready'
            })}\n\n"
    
    return Response(event_stream(), mimetype='text/event-stream')
```

#### Option B: WebSocket
```python
@socketio.on('generate')
def handle_generate(data):
    for i in range(10):
        result = generate_image(data['prompt'], count=1)
        socketio.emit('generation_complete', {
            'index': i,
            'url': result.url
        })
```

---

## 📱 Frontend Structure

### New Pages

```
/projects                    # Projects dashboard
/projects/new                # Create new project
/projects/:id                # Project details & sessions
/projects/:id/sessions/:sid  # Session actions
/generate                    # Generation page
/gallery                     # Photo gallery
```

### Key Components

```jsx
<ProjectCard />           // Display project info
<SessionList />           // List of sessions
<GenerationFlow />        // Step-by-step generation UI
<WeightVisualization />   // Show current weights
<SwipeCard />            // Enhanced swipe with buttons
<Gallery />              // Photo grid with filters
```

---

## 🎨 UI/UX Improvements

### 1. Step-by-Step Loading
```
┌─────────────────────────────────────┐
│  Generating 10 photos...            │
│  ████████░░░░░░░░░░░░ 40%           │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ ✓   │ │ ✓   │ │ ✓   │ │ ...  │  │
│  │Image│ │Image│ │Image│ │     │  │
│  │  1  │ │  2  │ │  3  │ │  4  │  │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
└─────────────────────────────────────┘
```

### 2. Swipe Buttons
```
┌─────────────────────────────────────┐
│         [Current Photo]             │
│                                     │
│   ┌──────┐  ┌──────┐  ┌──────┐    │
│   │  👎  │  │  👍  │  │  ⭐  │    │
│   │ -3   │  │  +1  │  │  +3  │    │
│   └──────┘  └──────┘  └──────┘    │
└─────────────────────────────────────┘
```

### 3. Weight Visualization
```
📊 Current Learning State:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
young_adult    ████████████░ 115
iPhone_14_Pro  ██████████░░░ 100
golden_hour    ███████████░░ 110
teen           ████░░░░░░░░░ 60
warm_tone      ███░░░░░░░░░░ 50
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🚀 API Endpoints

### Projects
```
POST   /api/projects              # Create project
GET    /api/projects              # List user's projects
GET    /api/projects/:id          # Get project details
PUT    /api/projects/:id          # Update project
DELETE /api/projects/:id          # Delete project
```

### Sessions
```
POST   /api/sessions              # Create session
GET    /api/sessions?project_id=  # List project sessions
GET    /api/sessions/:id          # Get session details
PUT    /api/sessions/:id          # Update session (rename)
GET    /api/sessions/:id/stats    # Session statistics
```

### Generation
```
POST   /api/generate/stream       # Step-by-step generation (SSE)
POST   /api/generate              # Batch generation
GET    /api/generate/:id/status   # Check generation status
```

### Weights
```
GET    /api/weights/:session_id   # Get session weights
POST   /api/weights/analyze       # Analyze session & update
GET    /api/weights/visualize     # Visualization data
```

### Content
```
GET    /api/content?session_id=   # Get session content
POST   /api/content/:id/rate      # Rate content
GET    /api/gallery/:session_id   # Gallery view
```

---

## ✅ Checklist для імплементації

- [ ] Database migrations (002_v3_architecture.sql)
- [ ] Backend API endpoints
- [ ] Weight Learning System logic
- [ ] Agent system (Dating + General)
- [ ] Dynamic parameter creation
- [ ] Step-by-step generation
- [ ] Frontend pages (Projects, Sessions, Gallery)
- [ ] Swipe buttons + touch events
- [ ] Weight visualization
- [ ] Nano Banana Pro integration
- [ ] Testing & optimization

---

**Status:** 📋 Planning Complete
**Next:** Start implementation 🚀
