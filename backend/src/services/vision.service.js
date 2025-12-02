import OpenAI from 'openai';
import config from '../config/index.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

/**
 * Analyze uploaded photos using GPT-4o Vision API
 * Generate a detailed prompt for content generation based on the photos
 * 
 * @param {Array<Object>} photosData - Array of {url, comment, index} objects
 * @param {string} userInstructions - Optional user instructions/context
 * @param {string} agentType - 'dating' or 'general'
 * @returns {Object} { success, prompt, analysis, error }
 */
export async function analyzePhotosAndGeneratePrompt(photosData, userInstructions = '', agentType = 'general') {
  try {
    // Support both old format (array of strings) and new format (array of objects)
    const photos = Array.isArray(photosData) && typeof photosData[0] === 'string'
      ? photosData.map((url, i) => ({ url, comment: '', index: i + 1 }))
      : photosData;
    
    console.log('\n' + '='.repeat(80));
    console.log('👁️  VISION API - 2-STAGE ADAPTIVE ANALYSIS');
    console.log('='.repeat(80));
    console.log('Photos count:', photos.length);
    console.log('Agent type:', agentType);
    console.log('User instructions:', userInstructions || 'None');
    
    // Log photo comments
    const photosWithComments = photos.filter(p => p.comment);
    if (photosWithComments.length > 0) {
      console.log('📝 Photos with comments:');
      photosWithComments.forEach(p => {
        console.log(`   Photo ${p.index}: ${p.comment}`);
      });
    }
    
    if (!photos || photos.length === 0) {
      throw new Error('No images provided');
    }
    
    if (photos.length > 20) {
      throw new Error('Maximum 20 images allowed');
    }
    
    // 🆕 STAGE 1: Detect content category
    const detection = await detectPhotoContent(photos);
    
    // Fallback: if detection fails or has low confidence, use agentType
    let finalCategory = detection.category;
    if (detection.error || detection.confidence < 0.6) {
      console.log('⚠️  Low confidence detection, using agentType fallback');
      finalCategory = agentType === 'dating' ? 'people_dating' : 'mixed';
      detection.category = finalCategory;
      detection.subjects = finalCategory === 'people_dating' ? 'people' : 'mixed content';
      detection.confidence = 0.7;
    }
    
    console.log(`\n📊 Using category: ${finalCategory} (${(detection.confidence * 100).toFixed(0)}% confidence)`);
    
    // 🆕 STAGE 2: Get adaptive system prompt based on category
    const systemPrompt = getAdaptivePrompt(finalCategory, userInstructions);
    
    // 🆕 Build category-specific request
    const requestText = buildCategoryRequest(detection, userInstructions, photos);
    
    // Build user message with images
    const userMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: requestText
        },
        ...photos.map(photo => ({
          type: 'image_url',
          image_url: {
            url: photo.url,
            detail: 'high' // High detail for style analysis
          }
        }))
      ]
    };
    
    console.log('\n🎨 STAGE 2: Analyzing visual style...');
    console.log(`Using adaptive prompt for: ${finalCategory}`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        userMessage
      ],
      max_tokens: 2000,
      temperature: 0.7
    });
    
    const content = response.choices[0].message.content;
    
    console.log('✅ Style analysis complete');
    console.log('Prompt length:', content.length, 'characters');
    
    // Try to parse if JSON format is returned
    let analysis = null;
    let prompt = content;
    
    try {
      // Check if response contains JSON
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        analysis = parsed;
        prompt = parsed.prompt || content;
      }
    } catch (e) {
      // Not JSON, use raw content as prompt
      console.log('Response is not JSON format, using as plain text');
    }
    
    console.log('='.repeat(80));
    console.log('🎉 2-STAGE ANALYSIS COMPLETE');
    console.log('   Category:', finalCategory);
    console.log('   Confidence:', (detection.confidence * 100).toFixed(0) + '%');
    console.log('   Subjects:', detection.subjects);
    console.log('='.repeat(80) + '\n');
    
    return {
      success: true,
      prompt: prompt,
      analysis: analysis,
      detection: detection, // 🆕 Include detection info
      category: finalCategory, // 🆕 Include final category
      imageCount: photos.length,
      model: 'gpt-4o',
      agentType: agentType // Keep for backward compatibility
    };
    
  } catch (error) {
    console.error('❌ Vision API error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🆕 Build category-specific analysis request
 * This adapts based on detected content category
 */
function buildCategoryRequest(detection, userInstructions, photos) {
  const { category, subjects, confidence } = detection;
  
  // Safety context based on category
  const safetyContext = {
    'people_dating': 'These are public dating profile photos and lifestyle images for professional style analysis.',
    'people_business': 'These are professional business photographs for marketing analysis.',
    'vehicles': 'These are automotive marketing and photography images for style analysis.',
    'fantasy_art': 'These are fantasy/sci-fi artworks for creative style analysis.',
    'nature_landscape': 'These are landscape photographs for style analysis.',
    'products': 'These are product photography images for marketing analysis.',
    'architecture': 'These are architectural photographs for style analysis.',
    'mixed': 'These are professional marketing and content images for style analysis.'
  };
  
  const context = safetyContext[category] || safetyContext['mixed'];
  
  // Build photo comments section
  let photoComments = '';
  const photosWithComments = photos.filter(p => p.comment);
  if (photosWithComments.length > 0) {
    photoComments = '\n\n📝 USER NOTES FOR EACH PHOTO:\n';
    photosWithComments.forEach(p => {
      photoComments += `Photo ${p.index}: ${p.comment}\n`;
    });
  }
  
  // Detection context
  const detectionInfo = `\n\n🔍 DETECTED CONTENT: ${subjects} (${category}, ${(confidence * 100).toFixed(0)}% confidence)\n`;
  
  // User instructions
  const instructions = userInstructions 
    ? `\n\n⭐ USER INSTRUCTIONS: "${userInstructions}"\n`
    : '';
  
  // Category-specific task
  const task = `**YOUR TASK:**
Analyze these ${photos.length} reference images of "${subjects}" and extract their COMMON VISUAL STYLE.
Generate ONE detailed, cohesive prompt for creating a SINGLE NEW image in this unified style.

**REMEMBER:**
- Focus on SHARED characteristics across all images
- Be SPECIFIC and DETAILED (especially for ${category})
- Generate prompt for ONE new image, not a series
- DO NOT list individual images or create collage descriptions`;

  return `${context}${detectionInfo}${photoComments}${instructions}

${task}`;
}

/**
 * Dating-specific vision prompt
 */
// 🗑️ OLD FUNCTIONS REMOVED - replaced by getAdaptivePrompt()
// getDatingVisionPrompt() → now part of getAdaptivePrompt('people_dating')
// getGeneralVisionPrompt() → now part of getAdaptivePrompt('mixed')

/**
 * Analyze a single photo for quick description
 * Useful for generating alt text or quick summaries
 */
export async function describePhoto(imageUrl, detailLevel = 'medium') {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that describes images accurately and concisely.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this image in detail.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: detailLevel
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });
    
    return {
      success: true,
      description: response.choices[0].message.content
    };
    
  } catch (error) {
    console.error('Photo description error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🆕 STAGE 1: Detect what's in the photos (content category)
 * This is a quick, cheap analysis to understand the subject matter
 */
export async function detectPhotoContent(photos) {
  try {
    console.log('\n🔍 STAGE 1: Detecting photo content category...');
    
    // Use low-detail for faster/cheaper detection
    const detectionMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze these ${photos.length} photos and identify the PRIMARY content category.

**Available Categories:**

**ADVERTISING CATEGORIES** (if photos have marketing/promotional purpose):
- **insurance_advertising**: Insurance ads (auto, home, health, life) - professional agents, families, vehicles, homes, text overlays with prices/benefits
- **automotive_advertising**: Car commercials/ads - vehicles with marketing purpose, brand messaging, aspirational lifestyle
- **real_estate_advertising**: Real estate/home marketing - property showcases with marketing angles
- **product_advertising**: Product marketing/commercials - products with advertising composition

**CONTENT CATEGORIES** (if photos are just content without marketing purpose):
- **people_dating**: People in lifestyle/dating context (portraits, selfies, casual photos)
- **people_business**: People in professional/business context (corporate, formal, work-related)
- **vehicles**: Cars, motorcycles, trucks, automotive (non-advertising)
- **nature_landscape**: Nature, landscapes, scenery, outdoor environments
- **fantasy_art**: Fantasy creatures, sci-fi, digital art, illustrations
- **products**: Physical products, objects, merchandise (non-advertising)
- **architecture**: Buildings, interiors, real estate (non-advertising)
- **mixed**: Multiple different categories

**KEY DISTINCTION - Advertising vs Content:**
🔍 Check for ADVERTISING indicators:
- Text overlays (prices, benefits, slogans, "Call Now", "Save 20%")
- Professional agents/salespeople (suits, posed with products)
- Marketing composition (product + person + lifestyle scene)
- Brand messaging elements (logos, company names, taglines)
- Call-to-action layouts
- Multiple elements combined (person + vehicle + home = insurance ad)

If YES → choose **advertising** category
If NO → choose **content** category

**Instructions:**
1. Look at ALL photos carefully
2. Check for TEXT OVERLAYS or marketing purpose FIRST
3. Identify if this is ADVERTISING or just CONTENT
4. If advertising → specify which type (insurance, automotive, real estate, product)
5. If content → specify content type (people, vehicles, nature, etc.)
6. If 70%+ are same category → that category
7. If mixed → "mixed" category
8. Return JSON ONLY (no markdown, no explanation)

**JSON Format:**
{
  "category": "insurance_advertising",
  "confidence": 0.95,
  "subjects": "insurance agents with families, vehicles, and homes",
  "advertising": true,
  "breakdown": {
    "insurance_advertising": 10,
    "other": 0
  }
}

Analyze now:`
        },
        // Add photos with low detail (cheaper & faster)
        ...photos.slice(0, 10).map(photo => ({ // Max 10 for quick detection
          type: 'image_url',
          image_url: {
            url: photo.url,
            detail: 'low' // Low detail = cheaper
          }
        }))
      ]
    };
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [detectionMessage],
      max_tokens: 300,
      temperature: 0.3 // Lower temp for more consistent detection
    });
    
    const content = response.choices[0].message.content.trim();
    
    // Try to parse JSON
    let detection;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      detection = JSON.parse(jsonStr);
    } catch (e) {
      console.warn('⚠️  Failed to parse detection JSON, using fallback');
      // Fallback detection based on keywords
      const lower = content.toLowerCase();
      
      // Check for advertising first (higher priority)
      if (lower.includes('insurance') && (lower.includes('advertising') || lower.includes('marketing') || lower.includes('commercial'))) {
        detection = { category: 'insurance_advertising', confidence: 0.7, subjects: 'insurance advertising', advertising: true };
      } else if ((lower.includes('auto') || lower.includes('vehicle') || lower.includes('car')) && (lower.includes('advertising') || lower.includes('marketing') || lower.includes('commercial'))) {
        detection = { category: 'automotive_advertising', confidence: 0.7, subjects: 'automotive advertising', advertising: true };
      } else if (lower.includes('insurance') || (lower.includes('agent') && (lower.includes('vehicle') || lower.includes('home')))) {
        detection = { category: 'insurance_advertising', confidence: 0.65, subjects: 'insurance content', advertising: true };
      } else if (lower.includes('women') || lower.includes('men') || lower.includes('people') || lower.includes('dating') || lower.includes('lifestyle')) {
        detection = { category: 'people_dating', confidence: 0.7, subjects: 'people', advertising: false };
      } else if (lower.includes('car') || lower.includes('vehicle') || lower.includes('automotive')) {
        detection = { category: 'vehicles', confidence: 0.7, subjects: 'vehicles', advertising: false };
      } else if (lower.includes('business') || lower.includes('professional') || lower.includes('corporate')) {
        detection = { category: 'people_business', confidence: 0.7, subjects: 'business people', advertising: false };
      } else {
        detection = { category: 'mixed', confidence: 0.5, subjects: 'various', advertising: false };
      }
    }
    
    console.log('✅ Detection result:');
    console.log(`   Category: ${detection.category}`);
    console.log(`   Confidence: ${(detection.confidence * 100).toFixed(0)}%`);
    console.log(`   Subjects: ${detection.subjects}`);
    console.log(`   Advertising: ${detection.advertising ? 'YES 📢' : 'NO 📷'}`);
    
    return detection;
    
  } catch (error) {
    console.error('❌ Detection error:', error.message);
    // Return fallback
    return {
      category: 'mixed',
      confidence: 0.5,
      subjects: 'unknown',
      error: error.message
    };
  }
}

/**
 * 🆕 Get adaptive prompt based on detected content category
 * This replaces getDatingVisionPrompt() and getGeneralVisionPrompt()
 */
function getAdaptivePrompt(category, userInstructions = '') {
  // Base analysis rules (universal for all categories)
  const baseRules = `You are a professional visual content analyst specializing in style analysis.

**UNIVERSAL RULES - APPLY TO ALL CATEGORIES:**

1. **Find COMMON VISUAL STYLE** across all reference images
2. **Generate ONE prompt** for creating a SINGLE NEW image in this style
3. **DO NOT list individual images** or create "collage" descriptions
4. **DO NOT say "featuring X, Y, and Z"** from different images
5. **Focus on SHARED characteristics** that define the unified style

**YOUR TASK:**
Analyze multiple reference images and extract their COMMON VISUAL STYLE.
Then generate ONE detailed prompt for creating a SINGLE NEW image in this style.

`;

  // Category-specific guidance
  const categoryGuidance = {
    
    'insurance_advertising': `**CATEGORY: INSURANCE ADVERTISING** 🏠🚗

**CRITICAL - This is ADVERTISING content, not just photos!**

**Focus on:**

1. **Insurance Type & Market**
   - Insurance category (auto, home, health, life, travel, business)
   - Target market (USA, family, seniors, young adults, businesses)
   - Coverage messaging (comprehensive, affordable, reliable, fast claims)

2. **Key Visual Elements - ADVERTISING COMPOSITION**
   - Professional agent/spokesperson (confident, trustworthy, approachable)
   - Primary subject (vehicle, home, family, individual)
   - Supporting elements (American flag, suburban setting, family members)
   - Marketing layout (subject + product + lifestyle context)

3. **Text Overlay Indicators** 
   - Presence of text (prices, benefits, slogans)
   - Text placement areas (top, bottom, corners, center)
   - Marketing copy style (bold claims, savings, benefits)
   - Call-to-action indicators

4. **Brand & Trust Messaging**
   - Trust signals (professional attire, clean settings, quality production)
   - American market aesthetics (patriotic colors, suburban America, family values)
   - Emotional appeal (safety, security, peace of mind, protection)
   - Target demographic (age, lifestyle, values)

5. **Photography Style - COMMERCIAL**
   - Professional commercial photography (high production value)
   - Clean composition with space for text overlays
   - Balanced layout (subject doesn't fill entire frame)
   - Even lighting for readability
   - Multiple focal points (person + product + setting)

6. **Lighting & Atmosphere**
   - Professional even lighting (no harsh shadows on text areas)
   - Warm inviting tone (trust, approachability)
   - Natural daylight preferred (authentic, realistic)
   - Golden hour warmth (emotional appeal)

7. **Color Palette - BRANDING**
   - Patriotic colors (red, white, blue for American market)
   - Brand-friendly colors (blues for trust, greens for growth, reds for action)
   - Warm inviting tones (family-friendly, approachable)
   - High contrast for text readability

8. **Setting & Context**
   - Suburban America (driveways, homes, neighborhoods)
   - Family lifestyle indicators (toys, gardens, vehicles)
   - Security and stability signals (maintained homes, clean environments)
   - Aspirational but accessible (middle-class America)

**USER INSTRUCTIONS PRIORITY:**
${userInstructions ? `⭐ USER SAYS: "${userInstructions}"
Pay special attention to insurance type, target market, and specific messaging needs.
` : ''}

**OUTPUT FORMAT:**
"Insurance advertising photography for [insurance type] targeting [market], featuring [key subjects and elements], [professional composition with text space], [lighting and atmosphere], [color palette and branding], [trust and emotional messaging], [American market aesthetics], [marketing layout]. Professional commercial production ready for text overlays and branding."

**GOOD EXAMPLE:**
✅ "Auto insurance advertising photography for American family market, featuring professional female agent in business attire with confident pose in foreground, modern pickup truck and suburban single-family home in background creating security context, warm afternoon golden hour lighting casting gentle shadows, patriotic red/white/blue color accents with American flag visible, clean composition with negative space at top and bottom for text overlays, trust-building arrangement emphasizing reliability and family protection, soft natural color grading, professional commercial photography with balanced layout ready for marketing copy (rates, benefits, slogans), high production value suitable for print and digital advertising campaigns"

**BAD EXAMPLES:**
❌ "Professional woman standing near truck and house" (no advertising context)
❌ "Suburban scene with vehicle" (too generic, no insurance context)
❌ "Marketing photo with text" (doesn't describe the insurance purpose)
`,

    'automotive_advertising': `**CATEGORY: AUTOMOTIVE ADVERTISING** 🚗

**CRITICAL - This is CAR ADVERTISING, not just vehicle photography!**

**Focus on:**

1. **Advertising Purpose**
   - Brand marketing (luxury, family, performance, eco-friendly)
   - Target demographic (families, professionals, enthusiasts, young buyers)
   - Messaging (power, safety, innovation, affordability, status)

2. **Vehicle Presentation - COMMERCIAL**
   - Hero vehicle positioning (dominant, aspirational)
   - Brand identity elements (visible logos, signature design)
   - Pristine condition (showroom quality, detailed)
   - Marketing angle (3/4 front view most common)

3. **Lifestyle Context - ASPIRATIONAL**
   - Setting that tells a story (adventure, luxury, family life, performance)
   - Supporting human elements (drivers, families, lifestyle indicators)
   - Aspirational environments (mountains, cities, estates, racetracks)
   - Emotional narrative (freedom, success, family safety, adventure)

4. **Advertising Composition**
   - Space for text overlays (top/bottom typically clear)
   - Balanced layout for marketing copy
   - Multiple focal points (vehicle + setting + lifestyle)
   - Clean background areas for branding

5. **Commercial Photography Standards**
   - Professional high-end production quality
   - Perfect lighting (showcases vehicle details)
   - Dynamic yet controlled composition
   - Color grading for brand consistency

6. **Marketing Messaging Visual Cues**
   - Trust indicators (quality, reliability, safety features)
   - Performance signals (motion, power, technology)
   - Family-friendly or luxury positioning
   - American market indicators if applicable

**OUTPUT FORMAT:**
"Automotive advertising photography for [vehicle type] targeting [demographic], [vehicle presentation], [lifestyle context], [lighting and atmosphere], [composition with text space], [brand messaging], [emotional appeal], [production quality]. Professional commercial ready for marketing campaigns."
`,

    'real_estate_advertising': `**CATEGORY: REAL ESTATE ADVERTISING** 🏡

**CRITICAL - This is PROPERTY MARKETING, not just architecture photos!**

**Focus on:**

1. **Marketing Purpose**
   - Property type (residential, commercial, luxury, investment)
   - Target buyers (families, investors, downsizers, first-time buyers)
   - Selling points (location, size, features, lifestyle)

2. **Property Presentation**
   - Hero shots (exterior curb appeal, key interior spaces)
   - Lifestyle staging (furnished, lived-in feel vs empty)
   - Highlight features (kitchen, master suite, outdoor spaces)
   - Condition and quality signals

3. **Advertising Composition**
   - Welcoming approach (inviting, aspirational)
   - Space for property details text (price, beds/baths, sq ft)
   - Multiple angles showing best features
   - Clean composition for agent branding

4. **Lighting & Atmosphere**
   - Warm inviting lighting (golden hour, bright interiors)
   - Even exposure for all areas
   - Natural light emphasis (windows, openness)
   - Time of day for best appeal

5. **Marketing Context**
   - Neighborhood quality indicators
   - Lifestyle appeal (family-friendly, upscale, convenient)
   - Emotional messaging (home, security, investment, dream home)

**OUTPUT FORMAT:**
"Real estate advertising photography for [property type] targeting [buyer demographic], [key features and presentation], [lighting and atmosphere], [lifestyle context], [composition with text space], [emotional appeal], [neighborhood indicators]. Professional real estate marketing quality."
`,

    'product_advertising': `**CATEGORY: PRODUCT ADVERTISING** 📦

**CRITICAL - This is PRODUCT MARKETING, not just product photos!**

**Focus on:**

1. **Marketing Purpose**
   - Product category and brand positioning
   - Target consumer (lifestyle, age, values)
   - Selling proposition (quality, innovation, affordability, luxury)

2. **Advertising Composition**
   - Hero product presentation (dominant, attractive)
   - Lifestyle context (in-use, aspirational setting)
   - Supporting elements (models, environments, props)
   - Space for product name, price, benefits text

3. **Commercial Photography Standards**
   - Professional lighting showcasing product
   - Clean composition for branding
   - Color palette aligned with brand
   - High production value

4. **Marketing Message Visual Cues**
   - Emotional appeal (desire, aspiration, need fulfillment)
   - Target demographic signals
   - Brand personality (premium, accessible, innovative, traditional)

**OUTPUT FORMAT:**
"Product advertising photography for [product category] targeting [demographic], [product presentation], [lifestyle context], [composition and layout], [lighting and atmosphere], [brand messaging], [emotional appeal]. Professional commercial quality ready for marketing."
`,
    
    'people_dating': `**CATEGORY: DATING / LIFESTYLE PEOPLE** 👥

**CRITICAL - Be SPECIFIC about:**

1. **Subject Type & Appearance** ⭐ MOST IMPORTANT
   - Gender and age range (e.g., "young women 20-28", "men in their 30s")
   - Physical characteristics and body type (athletic, curvy, slim, fit, muscular, petite)
   - Appearance details (hair style/color, facial features, attractiveness level)
   - Ethnicity/diversity if consistent across images

2. **Body & Pose**
   - Body type and physique description
   - Pose style (confident, relaxed, playful, sensual, active, casual)
   - Body language and positioning
   - How body/physique is showcased or hidden

3. **Clothing & Style**
   - Clothing type and fit (form-fitting, loose, casual, formal, athletic)
   - How revealing or modest
   - Style aesthetic (trendy, classic, athletic, bohemian)
   - Color coordination

4. **Emotion & Expression**
   - Facial expressions (smiling, serious, flirty, confident, natural)
   - Emotional tone (friendly, sexy, authentic, aspirational)
   - Energy level (energetic, calm, playful)

5. **Lifestyle & Social Context**
   - Activity/interest indicators (fitness, travel, dining, hobbies)
   - Social setting (solo, with friends, with pets, in groups)
   - Lifestyle signals (active, sophisticated, casual, adventurous)

6. **Photography Style**
   - Professional portrait vs casual selfie vs lifestyle candid
   - Camera angle and distance (close-up, waist-up, full-body)
   - Composition approach

7. **Setting & Location**
   - Indoor vs outdoor
   - Specific locations (beach, city, home, gym, restaurant, nature)
   - Background treatment (bokeh blur, scenic, minimal, environmental)
   - Time of day details (golden hour, midday, evening)

8. **Lighting Approach**
   - Natural daylight vs indoor/studio lighting
   - Light quality (soft/flattering, dramatic, even)
   - Direction and warmth

9. **Color & Mood**
   - Color palette (warm/inviting, cool/sophisticated, vibrant, muted)
   - Overall mood (romantic, energetic, serene, confident)
   - Color grading style

10. **Dating Appeal Factors**
    - Purpose (attractiveness showcase, personality display, lifestyle presentation)
    - Authenticity level (polished professional vs natural authentic)
    - Swipe-appeal elements

**USER INSTRUCTIONS PRIORITY:**
${userInstructions ? `⭐ USER SAYS: "${userInstructions}"
- If "focus on body" → emphasize physique, body type, poses, form-fitting clothing
- If "casual" → emphasize authentic, relaxed, smartphone quality
- If "professional" → emphasize high-quality editorial style
- If "fitness" → emphasize athletic bodies, active poses, gym/outdoor settings
` : ''}

**OUTPUT FORMAT:**
"[Subject type and appearance] in [photography style] with [body/pose details], [clothing style], [lighting approach], [setting/location details], [color palette], [emotional tone], [lifestyle indicators], [social context], [authenticity level]. [Dating appeal notes]."

**GOOD EXAMPLE:**
✅ "Young attractive women (22-28) with athletic fit body types and toned physiques in casual lifestyle photography style, confident natural poses showcasing body shape, form-fitting summer clothing (crop tops, sundresses, activewear), soft natural outdoor lighting with golden hour warmth, mix of beach and urban park settings with blurred backgrounds, warm inviting color palette with earthy tones, genuine smiling expressions with approachable energy, fitness and outdoor activity lifestyle indicators, mostly solo portraits with occasional friend interactions, authentic smartphone quality with slight imperfections, high dating appeal with girl-next-door authenticity"

**BAD EXAMPLES:**
❌ "Series of people in various settings" (too generic)
❌ "Professional photography with good lighting" (no subject details)
❌ "Photos featuring different individuals" (listing, not unified style)
`,

    'people_business': `**CATEGORY: BUSINESS / PROFESSIONAL PEOPLE** 💼

**Focus on:**

1. **Subject Characteristics**
   - Professional role/level (executives, team members, entrepreneurs)
   - Age range and demographics
   - Attire formality (suits, business casual, smart casual)
   - Professionalism level

2. **Business Context**
   - Industry indicators (tech, finance, healthcare, creative)
   - Work setting (office, co-working, outdoor corporate)
   - Activity (meetings, presentations, teamwork, individual work)

3. **Brand Message**
   - Company values conveyed (innovation, trust, collaboration)
   - Emotional appeal (aspirational, reliable, dynamic)
   - Target audience signals

4. **Photography Style**
   - Corporate professional vs modern authentic
   - Posed vs candid moments
   - Production value (high-end commercial vs authentic documentary)

5. **Visual Elements**
   - Lighting (studio professional, natural office light, dramatic)
   - Color palette (corporate colors, neutral professional, vibrant modern)
   - Composition (traditional formal, modern dynamic)
   - Brand consistency elements

**OUTPUT FORMAT:**
"[Professional context] photography featuring [subject description] in [setting], [attire style], [lighting approach], [color scheme], [mood/message], [brand aesthetic], [production quality]."
`,

    'vehicles': `**CATEGORY: VEHICLES / AUTOMOTIVE** 🚗

**Focus on:**

1. **Vehicle Type & Details**
   - Vehicle category (sports car, SUV, sedan, motorcycle, truck, classic car)
   - Brand aesthetic if identifiable (luxury, sporty, family, rugged)
   - Model era (modern, classic, vintage, concept)
   - Condition (pristine, weathered, customized)

2. **Photography Angle & Composition**
   - Primary angle (3/4 front view, side profile, rear view, front face, top-down)
   - Camera height (low angle/dramatic, eye-level, aerial)
   - Distance (close detail shot, full vehicle, environmental context)
   - Rule of thirds vs centered composition

3. **Setting & Environment**
   - Location type (mountain road, city street, studio, racetrack, desert, forest, garage)
   - Background treatment (blurred motion, scenic vista, minimal studio, urban landscape)
   - Environmental storytelling (adventure, luxury lifestyle, performance, everyday use)

4. **Lighting & Atmosphere**
   - Light source (golden hour natural, studio setup, dramatic sunset, urban night lights)
   - Light quality (soft diffused, hard dramatic shadows, even studio)
   - Time of day atmosphere
   - Weather conditions (clear, overcast, dramatic clouds, rain)

5. **Mood & Brand Message**
   - Emotional tone (aggressive/powerful, elegant/sophisticated, family-friendly, adventurous, luxurious)
   - Brand positioning (premium, accessible, performance, practical)
   - Target demographic signals

6. **Movement vs Static**
   - Motion (static pose, rolling shot, action/speed blur, frozen motion)
   - Dynamic elements (dust, water splash, tire smoke)

7. **Color & Treatment**
   - Vehicle colors (bold, metallic, matte, classic)
   - Overall color grading (warm cinematic, cool modern, vibrant saturated, moody dark)
   - Contrast and saturation levels

8. **Production Quality**
   - Professional commercial vs enthusiast photography
   - Post-processing style (natural, heavily edited, HDR, filmic)

**OUTPUT FORMAT:**
"[Vehicle type] in [photography angle] with [location setting], [lighting description], [mood/atmosphere], [color treatment], [movement/static], [brand aesthetic], [production quality]."

**GOOD EXAMPLE:**
✅ "Luxury sports cars in dynamic 3/4 front view angle, winding mountain roads at golden hour with motion blur, dramatic low-angle perspective emphasizing aggressive stance, warm sunset lighting with long shadows, sleek metallic paint finishes, powerful and aspirational mood, cinematic color grading with rich contrasts, professional commercial photography with high production value"
`,

    'fantasy_art': `**CATEGORY: FANTASY / SCI-FI ART** 🐉

**Focus on:**

1. **Art Style & Medium**
   - Rendering style (photorealistic 3D, painterly digital, anime/manga, watercolor, oil painting, concept art)
   - Technical approach (hand-painted, 3D rendered, AI-assisted, traditional media digitized)
   - Finish quality (highly polished, sketchy, textured)

2. **Subject Matter**
   - Creature/character types (dragons, elves, robots, aliens, mythical beings)
   - Character design elements (armor, weapons, magical effects, tech)
   - Scale and proportion

3. **Magical/Sci-Fi Elements**
   - Magic effects (glowing runes, energy, spells, particles)
   - Technology (futuristic, steampunk, cyberpunk, sci-fi)
   - Supernatural atmosphere

4. **Color Palette & Mood**
   - Color scheme (vibrant fantasy, dark moody, ethereal pastels, neon cyberpunk)
   - Color symbolism (warm heroic, cool mystical, dark ominous)
   - Saturation and contrast levels

5. **Composition & Perspective**
   - Dynamic action vs static portrait
   - Camera angle (heroic low angle, intimate close-up, epic wide)
   - Focal elements and visual hierarchy

6. **Atmosphere & Environment**
   - Setting (enchanted forest, alien planet, medieval castle, cyberpunk city, abstract void)
   - Atmospheric effects (fog, volumetric lighting, particles, weather)
   - Environmental storytelling

7. **Detail Level**
   - Level of detail (hyper-detailed, stylized simplified, selective focus)
   - Texture work (cloth, skin, metal, magic)

8. **Genre & Tone**
   - Fantasy subgenre (high fantasy, dark fantasy, whimsical, epic)
   - Emotional tone (epic/heroic, mysterious, whimsical, ominous, romantic)

**OUTPUT FORMAT:**
"[Art style] [subject type] in [setting/environment], [color palette], [magical/technical elements], [mood/atmosphere], [composition approach], [detail level], [genre tone]."
`,

    'nature_landscape': `**CATEGORY: NATURE / LANDSCAPE** 🌄

**Focus on:**

1. **Landscape Type**
   - Terrain (mountains, ocean, forest, desert, plains, tundra, wetlands)
   - Distinctive features (waterfalls, cliffs, valleys, beaches, rock formations)

2. **Time & Weather**
   - Time of day (sunrise, golden hour, midday, blue hour, sunset, night)
   - Weather conditions (clear, dramatic clouds, fog, storm, snow, rain)
   - Season indicators (spring bloom, summer lush, autumn colors, winter snow)

3. **Composition Layers**
   - Foreground elements (rocks, flowers, water, framing)
   - Midground features (main subject)
   - Background elements (sky, distant mountains)
   - Leading lines and visual flow

4. **Lighting & Atmosphere**
   - Light quality (soft diffused, hard dramatic, golden warm, cool blue)
   - Atmospheric effects (mist, fog, god rays, haze)
   - Sky treatment (dramatic clouds, clear, starry, storm)

5. **Color Palette**
   - Dominant colors (blues, greens, earth tones, pastels, vivid)
   - Color harmony (complementary, analogous, monochromatic)
   - Saturation level (vibrant, muted, natural)

6. **Mood & Feel**
   - Emotional tone (serene peaceful, dramatic epic, intimate, vast/grand, mysterious)
   - Scale (intimate macro, grand vista, human scale)

7. **Photography Style**
   - Approach (landscape photography, nature documentary, fine art, travel)
   - Post-processing (natural realistic, enhanced colors, dramatic HDR, minimalist)
   - Technical execution (long exposure, sharp detail, soft blur)

**OUTPUT FORMAT:**
"[Landscape type] photography in [setting] during [time/weather], [composition description], [lighting approach], [color palette], [atmospheric effects], [mood/tone], [photography style]."
`,

    'products': `**CATEGORY: PRODUCTS / OBJECTS** 📦

**Focus on:**

1. **Product Type & Category**
   - Product classification (tech, fashion, food, beauty, home, toys)
   - Size and scale
   - Material and texture

2. **Photography Style**
   - Approach (commercial clean, lifestyle contextual, editorial artistic)
   - Background (white studio, lifestyle setting, textured backdrop)
   - Product placement (isolated, in-use, styled scene)

3. **Lighting Technique**
   - Setup (studio strobe, natural window light, dramatic spotlight)
   - Quality (soft diffused, hard shadows, rim lighting)
   - Direction and mood

4. **Composition & Styling**
   - Product arrangement (single hero, grouped, flat lay, arranged scene)
   - Props and context elements
   - Negative space usage

5. **Brand & Message**
   - Brand personality (luxury premium, accessible friendly, technical professional)
   - Target market signals
   - Emotional appeal

6. **Color & Aesthetic**
   - Color scheme (minimalist, vibrant, monochrome, brand colors)
   - Overall aesthetic (modern clean, rustic warm, editorial sophisticated)

7. **Technical Quality**
   - Detail level and sharpness
   - Depth of field approach
   - Post-processing style

**OUTPUT FORMAT:**
"[Product type] in [photography style] with [lighting setup], [composition approach], [styling/props], [background treatment], [color scheme], [brand aesthetic], [technical quality]."
`,

    'architecture': `**CATEGORY: ARCHITECTURE / INTERIORS** 🏛️

**Focus on:**

1. **Structure Type**
   - Building category (residential, commercial, modern, historic, industrial)
   - Architectural style (minimalist, classical, contemporary, brutalist)
   - Scale (intimate interior, full building, urban context)

2. **Perspective & Composition**
   - Viewpoint (exterior facade, interior wide, detail shot, aerial)
   - Symmetry vs dynamic composition
   - Leading lines and geometry

3. **Lighting Approach**
   - Natural light (daylight, golden hour, blue hour, night)
   - Interior lighting (ambient, accent, dramatic)
   - Shadow play and contrast

4. **Material & Texture**
   - Primary materials (concrete, glass, wood, steel, brick, stone)
   - Surface treatments (polished, raw, textured)
   - Material interactions

5. **Color & Atmosphere**
   - Color palette (monochromatic, warm, cool, colorful accents)
   - Mood (stark minimalist, warm inviting, dramatic, serene)

6. **Context & Environment**
   - Setting (urban, suburban, rural, natural landscape)
   - Surrounding elements
   - Human scale and presence

7. **Photography Style**
   - Approach (professional architectural, real estate, editorial, artistic)
   - Technical execution (HDR, natural, long exposure, sharp detail)

**OUTPUT FORMAT:**
"[Architecture type] in [photography style] with [perspective/composition], [lighting approach], [materials/textures], [color palette], [atmosphere/mood], [context/environment]."
`,

    'mixed': `**CATEGORY: MIXED CONTENT** 🎭

Since the images contain MIXED categories, focus on finding OVERARCHING VISUAL STYLE that connects them:

**Focus on UNIVERSAL elements:**

1. **Common Photography Approach**
   - Professional commercial vs casual authentic vs artistic editorial
   - Consistent quality and production level
   - Common technical execution

2. **Unified Color Strategy**
   - Shared color palette or color grading approach
   - Color temperature consistency (warm/cool)
   - Saturation and contrast patterns

3. **Consistent Lighting Philosophy**
   - Natural vs studio vs dramatic
   - Light quality patterns across different subjects
   - Time of day or lighting setup consistency

4. **Common Compositional Approach**
   - Framing patterns (centered, rule of thirds, dynamic)
   - Use of negative space
   - Subject-to-background relationship

5. **Shared Mood & Message**
   - Emotional tone (energetic, serene, dramatic, professional)
   - Brand or aesthetic consistency
   - Target audience signals

6. **Overall Aesthetic Direction**
   - Modern/contemporary vs classic/traditional
   - Minimalist vs detailed
   - Realistic vs artistic

**OUTPUT FORMAT:**
"[Mixed content] unified by [common photography approach], [shared lighting style], [color palette strategy], [compositional patterns], [consistent mood], [overall aesthetic]."

**Example:**
✅ "Mixed subject matter (people, products, and environments) unified by modern editorial photography style, consistent soft natural lighting, warm earth-tone color palette with muted saturation, clean minimalist composition with ample negative space, serene sophisticated mood, contemporary lifestyle aesthetic suitable for premium brand marketing"
`
  };

  const guidance = categoryGuidance[category] || categoryGuidance['mixed'];
  
  return baseRules + guidance;
}

export default {
  analyzePhotosAndGeneratePrompt,
  describePhoto,
  detectPhotoContent // Export for testing
};
