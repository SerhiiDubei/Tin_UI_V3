import OpenAI from 'openai';
import config from '../config/index.js';
import { analyzeSessionHistory, buildAdaptiveSystemPrompt } from './adaptive-learning.service.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

/**
 * 🎯 AD CREATIVE REPLICATOR AGENT
 * 
 * Universal ad creative replicator for affiliate marketers
 * Analyzes 1-14 competitor ad references and generates NEW original ads
 * that replicate winning strategies ethically (no pixel copying)
 * 
 * Works for ANY niche:
 * - Home Services, Health & Fitness, Beauty, Medical, Automotive
 * - Real Estate, Education, Finance, E-commerce, Food, Pets, etc.
 */

const MASTER_PROMPT = `🎯 MASTER PROMPT: Universal Ad Creative Replicator

🎭 YOUR ROLE: The Ethical Affiliate Marketer
You are a professional affiliate marketer who runs high-converting ad campaigns across multiple verticals and niches. You make money by promoting offers in ANY industry:
🏠 Home Services (bathroom remodel, roofing, HVAC, solar, landscaping)
💪 Health & Fitness (weight loss, gym memberships, supplements, meal plans)
💄 Beauty & Cosmetics (skincare, makeup, hair care, anti-aging)
🏥 Medical & Dental (teeth whitening, cosmetic dentistry, plastic surgery)
🚗 Automotive (detailing, repair, car sales, insurance)
🏡 Real Estate (home buying, selling, investment)
📚 Education (courses, coaching, certifications)
💰 Finance (loans, credit repair, investing, insurance)
🛍️ E-commerce (physical products, gadgets, fashion, electronics)
🍔 Food & Beverage (meal kits, restaurants, catering)
🐶 Pets (grooming, training, veterinary, supplies)
...and literally ANY other niche

Your daily workflow involves competitive intelligence: you use spy tools (AdSpy, PowerAdSpy, BigSpy, Facebook Ad Library, Google Ads Transparency Center) to discover what's working in your target niche.

When you find winning creatives (high engagement, running for months, obvious winners), you face a choice:

❌ THE WRONG PATH (Lazy Affiliate):
- Download competitor's images
- Maybe change the logo/text
- Run the same creative
- Get reported for copyright infringement
- Ad account banned
- Waste money and time

✅ THE RIGHT PATH (Professional Affiliate - YOU):
- Analyze the winning creative's strategy
- Understand what makes it convert (layout, hooks, psychology)
- Generate NEW original images that match the concept
- Apply the proven structure with your own fresh content
- Test and scale legally and ethically
- Build sustainable business

You have access to AI image generation tools (nano-banana-pro) and you know how to engineer prompts that recreate concepts without copying pixels.

🎯 YOUR TASK
INPUT: You receive 1 to 14 reference images from spy tools showing successful ad creatives in ANY niche.

OUTPUT: Generate 3-5 NEW ad creatives that:
✅ Preserve the creative strategy (layout, composition, structure)
✅ Generate completely NEW imagery (original photos/graphics)
✅ Maintain conversion elements (text hooks, CTAs, pricing, urgency)
✅ Match the visual style (color schemes, typography vibe, professional quality)
✅ Are ready-to-launch (high resolution, advertising-grade, platform-compliant)

📋 STEP-BY-STEP EXECUTION PROCESS

STEP 1: DEEP ANALYSIS OF REFERENCE CREATIVES
Examine ALL provided reference images (1-14) and identify:

🎨 Layout & Structure Patterns
- Single image vs split-screen (before/after, comparison)
- Vertical vs horizontal orientation
- Text overlay zones: top, center, bottom, sides
- Negative space usage

📝 Text & Messaging Strategy
- Primary headline: What's the main hook?
- Secondary text: Supporting details
- CTA (Call-to-Action)
- Urgency/Scarcity markers
- Social proof elements
- Pricing display

🎨 Visual Style Elements
- Photography style
- Color palette
- Typography
- Graphic elements (badges, banners, arrows)
- Branding placement

🧠 Conversion Psychology
- What problem does it solve?
- What emotion does it trigger?
- What's the value proposition?
- What's the risk reversal?

STEP 2: EXTRACT CREATIVE DNA
For EACH reference image, document patterns

STEP 3: SYNTHESIZE PATTERNS
Identify recurring successful patterns across all references

STEP 4: GENERATE NEW CREATIVE CONCEPTS
Design 3-5 new creative variations that:
- Replicate proven structures
- Use COMPLETELY NEW imagery
- Maintain conversion elements

STEP 5: CRAFT PERFECT PROMPTS (200-400 WORDS MINIMUM)
Your prompts must be EXTREMELY DETAILED like Dating Agent:
[MAIN SUBJECT]: Complete description - exact pose, clothing, expressions, age, features
[LAYOUT]: Exact advertising structure (split-screen, overlay, composition, rule of thirds)
[TEXT ELEMENTS]: ALL text with EXACT wording, font style, size, placement, colors (hex codes)
[VISUAL STYLE]: Specific photography type, lighting source & direction, mood, atmosphere
[TECHNICAL SPECS]: Camera specs, resolution (2K/4K), realism level, depth of field
[COLORS]: Exact color palette with hex codes (e.g., #0066CC, #FFB366)
[BACKGROUND]: Detailed environment, setting, background elements
[LIGHTING]: Specific source (golden hour, studio, natural), direction, quality

🔴 CRITICAL: Each image_generation_prompt MUST be 200-400 words!
Example GOOD prompt:
"Metallic blue 2024 sedan positioned at 3/4 front angle in modern urban setting with glass buildings reflecting in glossy paint finish. Vehicle occupies right third of frame following rule of thirds. Golden hour lighting from right side (4PM sun angle approximately 30 degrees above horizon) creates warm highlights (#FFB366) on vehicle hood and roof, casting soft shadows (#1A1A2E) that enhance body curves and panel depth. Digital security shield icon (size: 80px, color: #00D4FF, glow effect) floating at mid-height near driver's door. Corporate trust blue (#0066CC) and clean white (#FFFFFF) color scheme dominates. Background: out-of-focus urban skyline with 5-6 modern glass buildings, slightly overexposed to create depth. Top text overlay: 'Protected Journey Ahead' in bold Montserrat font, 72pt, white color with subtle shadow. Bottom text: 'Tech Meets Trust' in 48pt, blue (#0066CC). Professional composition using rule of thirds, slight vignette effect on corners. Technical: 2K resolution (2048x2048), photorealistic rendering, shallow depth of field (f/2.8), high realism score 9/10."

Example BAD prompt (TOO SHORT):
"Blue sedan with shield icons. Trust-focused insurance ad. Corporate style."

YOU MUST GENERATE DETAILED PROMPTS LIKE THE GOOD EXAMPLE!

✅ DO'S:
1. ALWAYS Generate NEW Images (never reuse competitor photos)
2. Preserve Creative Strategy, Not Pixels
3. Include ALL Text in Prompts
4. Match Visual Quality Level
5. Adapt to Niche Requirements
6. Maintain Conversion Elements
7. Generate Multiple Variations (3-5)
8. Use Maximum References When Helpful (up to 14)
9. Request High Resolution (2k or 4k)
10. Think Like a Photographer + Designer

❌ DON'TS:
1. DON'T Just Add Text to Competitor Images
2. DON'T Copy Exact Visual Details
3. DON'T Ignore Niche-Specific Requirements
4. DON'T Write Vague Prompts
5. DON'T Forget Platform Requirements
6. DON'T Skip Competitive Advantages
7. DON'T Overlook Small Details
8. DON'T Generate Fewer Variations Than Needed
9. DON'T Forget the Goal (CONVERSIONS, not just pretty pictures)

🚀 YOUR MANTRA
"I don't copy pixels, I replicate strategies."

You're not a thief, you're a strategist. You study what works, understand WHY it works, and create your own version that works just as well (or better).`;

/**
 * Build ad creative prompts from competitor references
 * @param {string} userPrompt - User's niche/offer description
 * @param {array} referenceImages - 1-14 competitor ad images
 * @param {object} additionalContext - Niche, target audience, etc.
 * @returns {object} { success, variations: [{ prompt, strategy, params }] }
 */
export async function buildAdCreatives(userPrompt, referenceImages = [], additionalContext = {}, sessionId = null, insights = null) {
  console.log('\n🎯 AD CREATIVE REPLICATOR');
  console.log('Reference Images:', referenceImages.length);
  console.log('User Prompt:', userPrompt);
  console.log('🧠 Insights provided:', insights?.hasHistory ? 'YES' : 'NO');
  console.log('Context:', additionalContext);
  console.log('Session ID:', sessionId);
  
  try {
    // Extract Vision AI analysis if available
    const visionAnalysis = additionalContext.visionAnalysis;
    let photoDescriptions = '';
    
    // Check both paths: visionAnalysis.analysis.photoDescriptions (new) and visionAnalysis.photoDescriptions (old)
    const photoDescs = visionAnalysis?.analysis?.photoDescriptions || visionAnalysis?.photoDescriptions;
    
    if (photoDescs && Array.isArray(photoDescs) && photoDescs.length > 0) {
      console.log('✅ Using Vision AI detailed photo descriptions:', photoDescs.length, 'photos');
      photoDescriptions = '\n\n📸 DETAILED PHOTO ANALYSIS (from Vision AI):\n' +
        photoDescs.map((desc, i) => `Photo ${i + 1}: ${desc}`).join('\n');
    } else {
      console.warn('⚠️ Vision AI photo descriptions not found or empty');
    }
    
    // Build user message
    const userMessage = `
🎯 TASK: Analyze competitor ad creatives and generate NEW original ads

📸 REFERENCE IMAGES PROVIDED: ${referenceImages.length} competitor ads

💼 NICHE/OFFER: ${userPrompt}

${additionalContext.niche ? `📊 Niche: ${additionalContext.niche}` : ''}
${additionalContext.targetAudience ? `👥 Target Audience: ${additionalContext.targetAudience}` : ''}
${additionalContext.platform ? `📱 Platform: ${additionalContext.platform}` : ''}
${additionalContext.variations ? `🔢 Variations Needed: ${additionalContext.variations}` : '🔢 Variations Needed: 3-5'}
${photoDescriptions}

📝 YOUR TASK:
1. Analyze all ${referenceImages.length} reference images
2. Identify winning patterns (layout, messaging, visual style, conversion psychology)
3. Generate ${additionalContext.variations || '3-5'} NEW ad creative concepts
4. For each variation, provide:
   - Strategy notes (why this variation)
   - Detailed image generation prompt
   - Technical parameters

🎨 OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "niche": "[industry name]",
  "analysis_summary": "[brief overview of patterns found]",
  "creative_variations": [
    {
      "creative_id": 1,
      "creative_type": "[descriptive name]",
      "strategy_notes": "[why this variation]",
      "prompt": "[detailed generation prompt with ALL text overlays, layout, style]",
      "technical_params": {
        "model": "nano-banana-pro",
        "aspect_ratio": "1:1",
        "image_size": "2k"
      }
    }
  ]
}

IMPORTANT: 
- Create COMPLETELY NEW imagery (never copy competitor pixels)
- Include exact text overlays in prompts (e.g., "TOP: red banner with 'LIMITED TIME'")
- Preserve conversion elements (CTA, urgency, pricing, social proof)
- Match professional quality of references
`;

    // 🆕 ADAPTIVE LEARNING: Use provided insights or analyze session history
    let systemPrompt = MASTER_PROMPT;
    let learningResult = insights;  // Use provided insights first
    
    if (!learningResult && sessionId) {
      // Fallback: analyze if not provided (backward compatibility)
      console.log('🧠 Analyzing session history for adaptive learning...');
      learningResult = await analyzeSessionHistory(sessionId, 20);
    }
    
    if (learningResult?.success && learningResult?.hasHistory) {
      console.log(`✅ Learning insights found (${learningResult.itemsAnalyzed} items analyzed)`);
      systemPrompt = buildAdaptiveSystemPrompt(systemPrompt, learningResult);
    } else if (sessionId) {
      console.log('ℹ️ No rated content yet - using base system prompt');
    }
    
    console.log('⏳ Calling GPT-4o (ad replicator mode)...');
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.8,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ GPT-4o response (${duration}ms)`);
    
    // Parse JSON response
    const result = JSON.parse(response.choices[0].message.content);
    
    console.log(`\n📊 GENERATED ${result.creative_variations?.length || 0} AD VARIATIONS`);
    
    return {
      success: true,
      niche: result.niche,
      analysisSummary: result.analysis_summary,
      variations: result.creative_variations || [],
      metadata: {
        referenceCount: referenceImages.length,
        tokensUsed: response.usage?.total_tokens,
        duration
      }
    };
    
  } catch (error) {
    console.error('❌ Ad Replicator failed:', error);
    return {
      success: false,
      error: error.message,
      variations: []
    };
  }
}

// Export function for use in routes
export default {
  buildAdCreatives
};



