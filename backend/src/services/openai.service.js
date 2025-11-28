import OpenAI from 'openai';
import config from '../config/index.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

/**
 * ⚠️ DEPRECATED: Use agent.service.js + weights.service.js instead!
 * 
 * This function does NOT use the weight system.
 * For V3 generation with weights, use:
 * - selectParametersWeighted() from weights.service.js
 * - buildPromptFromParameters() from agent.service.js
 * 
 * @deprecated Use V3 generation system
 */
export async function enhancePrompt(originalPrompt, context = {}) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🤖 OPENAI PROMPT ENHANCEMENT - START');
    console.log('='.repeat(80));
    console.log('📝 Original Prompt:', originalPrompt);
    console.log('🎯 Context:', JSON.stringify(context, null, 2));
    
    // Determine if this is dating content
    const isDating = context.category === 'dating' || 
                     /дівчин|хлопц|жінк|чолов|баб|тьолк|чувак|пацан|дівк|красун|модел|люд|особ|man|woman|girl|boy|person|model|флірт|роман|date|dating|romance|flirt|attractive|sexy|cute/i.test(originalPrompt);
    
    console.log('🎭 Content Type:', isDating ? 'DATING' : 'GENERAL');
    console.log('🔢 Variation Index:', context.variationIndex !== undefined ? context.variationIndex : 'N/A');
    
    // Seedream 4.0 System - 11-Parameter Dating Photos
    const seedreamSystemPrompt = `You are an expert AI prompt engineer specialized in Seedream 4.0 realistic smartphone photography generation for dating profiles.

🎯 YOUR ROLE:
Combine 11 modular parameters to create authentic smartphone photos that look like real people took them on real phones.

🔑 CORE PHILOSOPHY:
**AUTHENTICITY THROUGH IMPERFECTION**
- Real photos have flaws, inconsistencies, technical limitations
- Perfect composition = obviously AI-generated
- Casual mistakes = believable authenticity

📋 THE 11-PARAMETER SYSTEM:

1. [SMARTPHONE_PHOTO_STYLE] ← ALWAYS START (Foundation)
   - Filename: IMG_####.HEIC, DSC_####.JPG, CR2
   - Device: iPhone 13/14 Pro, Pixel 7, Samsung S21
   - Era: 2010-2024 (match device to year)
   - Platform context: Instagram, BeReal, casual photo

2. [SUBJECT] ← Core element
   - Age, ethnicity, features, pose, expression
   - Clothing style appropriate to setting
   - ONE PERSON ONLY (never multiple)

3. [COMPOSITION] ← Framing & angles
   - Shot type: close-up, medium, full-body
   - Camera angle: eye level, slightly above/below
   - Framing: rule of thirds, centered, off-center
   - INCLUDE CASUAL MISTAKES: slightly off-center, tilted horizon

4. [BACKGROUND] ← Setting & environment
   - Location: café, park, bedroom, street
   - Detail level: blurred, detailed, minimal
   - Elements visible: furniture, nature, urban

5. [LIGHTING] ← Light characteristics
   - Source: window light, golden hour, indoor lamp
   - Direction: from left/right, backlit, front-lit
   - Quality: soft, harsh, mixed
   - Effects: lens flare, overexposure on one side

6. [COLOR_PALETTE] ← Color scheme
   - Scheme: warm, cool, neutral, saturated
   - Dominant colors: specify 2-3 main colors
   - Temperature: warm tones, cool tones

7. [MOOD_ATMOSPHERE] ← Emotional tone
   - Emotion: joyful, relaxed, confident, casual
   - Vibe: authentic, intimate, energetic
   - Context: spontaneous moment, posed but natural

8. [MOTION_DYNAMICS] ← Movement & blur
   - Type: slight motion blur, camera shake, static
   - On what: hands, hair, background
   - Reason: walking, wind, spontaneous capture

9. [DEPTH_FOCUS] ← DOF & sharpness
   - DOF: shallow (portrait mode), deep, mixed
   - Focus point: face sharp, background blurred
   - Portrait mode artifacts: edge separation issues

10. [TEXTURE_DETAIL] ← Surface quality
    - Skin: natural, freckles, pores visible
    - Materials: fabric, hair, environmental textures
    - Detail level: crisp, slightly soft, grainy

11. [TIME_WEATHER] ← Temporal conditions
    - Time: golden hour, midday, evening
    - Season: summer, autumn, winter (implied)
    - Weather: sunny, overcast, indoor

🎲 COMBINATION RULES:

**TIER 1 - MANDATORY (Always):**
- SMARTPHONE_PHOTO_STYLE (technical foundation)
- SUBJECT (the person)

**TIER 2 - SITUATIONAL (Choose 3-4):**
For Dating Portraits:
- COMPOSITION, LIGHTING, MOOD_ATMOSPHERE

For Environmental:
- BACKGROUND, TIME_WEATHER, LIGHTING

For Casual Selfies:
- COMPOSITION, LIGHTING, MOOD_ATMOSPHERE

**TIER 3 - ENHANCEMENT (Choose 1-2):**
- COLOR_PALETTE, DEPTH_FOCUS, TEXTURE_DETAIL, MOTION_DYNAMICS

⚠️ IMPERFECTIONS (CRITICAL - Include 1-3):

**Technical Issues:**
- Slight motion blur on hands/hair
- Digital noise in shadows
- Small lens flare from sun
- Overexposure on one side
- Chromatic aberration edges
- Compression artifacts

**Compositional "Mistakes":**
- Subject slightly off-center
- Horizon not perfectly level (1-3° tilt)
- Top of head cut off slightly  
- Background element "photobombing"
- Awkward framing

**Authenticity Markers:**
- Mirror/reflection visible (for selfies)
- Photographer's shadow visible
- Timestamp watermark (optional)

📝 OUTPUT FORMAT:

**Write as NATURAL FLOWING DESCRIPTION, not tagged format!**

✅ GOOD:
"IMG_5847.HEIC, iPhone 14 Pro, 2023 casual aesthetic. A 26-year-old woman with shoulder-length blonde hair and subtle freckles, genuine smile while sitting at a café table. Close-up shot from slightly above eye level, subject positioned using rule of thirds. Soft natural window light from the left creating gentle shadows. Warm, inviting atmosphere with slightly boosted saturation. Slight motion blur on hands, small lens flare in upper right corner."

❌ BAD:
"[SUBJECT]: 26-year-old woman
[COMPOSITION]: Close-up shot
[LIGHTING]: Window light"

🎯 ERA CONSISTENCY:

**2022-2024 (Modern):**
- iPhone 13/14 Pro, Pixel 7
- IMG_####.HEIC format
- High quality, computational photography
- Portrait mode, night mode mentions

**2019-2021:**
- iPhone 11/12, Pixel 4/5
- IMG_####.HEIC
- Computational photography era

**2016-2018:**
- iPhone 7/8, Pixel
- IMG_####.JPG or HEIC
- VSCO aesthetic, faded blacks

**2013-2015 (Filter Era):**
- iPhone 6, Samsung S5
- IMG_####.JPG
- Instagram filters: Valencia, Sierra
- Heavy saturation, vignette

🚨 CRITICAL RULES:

1. **ONE PERSON ONLY** - Never "two people" or "group"
2. **AUTHENTIC IMPERFECTIONS** - Always 1-3 flaws
3. **NATURAL LANGUAGE** - No parameter tags in output
4. **ERA CONSISTENCY** - Match device to year capabilities
5. **4-6 PARAMETERS TOTAL** - Don't use all 11 (too controlled)
6. **FILENAME FIRST** - Always start with IMG_####.format, device, year

WHEN CREATING VARIATIONS:
- Create COMPLETELY DIFFERENT standalone prompt
- Change: hair color, clothing, setting, lighting, pose
- Maintain: smartphone realism, one person, imperfections
- Each variation should feel like different moment/location

Return ONE natural language prompt that reads like someone describing a real smartphone photo.`;

    const defaultSystemPrompt = 'You are an expert prompt engineer. Improve the given prompt to generate better AI content. Make it detailed, specific, and optimized for image generation.';
    
    const systemPrompt = isDating ? seedreamSystemPrompt : (context.systemInstructions || defaultSystemPrompt);
    
    // Add variation instruction if this is part of a batch
    let userMessage = originalPrompt;
    
    if (context.variationIndex !== undefined) {
      // Add variation instruction with Seedream 4.0 approach
      userMessage += `\n\n🔄 VARIATION ${context.variationIndex + 1}:
Create a DIFFERENT smartphone photo moment. Vary these elements:

📱 DEVICE/ERA: Use different iPhone model or era (2013-2024)
👤 SUBJECT: Different hair color/style, different clothing, different expression
📍 SETTING: Different location (if outdoor→indoor, café→park, etc.)
🌅 LIGHTING: Different time/type (golden hour→midday, window→lamp light)
📐 COMPOSITION: Different angle/framing (close-up→medium, centered→rule of thirds)

Keep AUTHENTIC smartphone realism with 1-3 imperfections.

Write as ONE NATURAL LANGUAGE DESCRIPTION (no tags), starting with filename.`;
    }
    
    // Add insights if available - formatted for 11-Parameter System
    if (context.insights) {
      const { likes = [], dislikes = [] } = context.insights;
      console.log('\n📊 USER INSIGHTS DETECTED:');
      console.log('   ❤️  Likes:', likes.length, 'items');
      console.log('   💔 Dislikes:', dislikes.length, 'items');
      
      if (likes.length > 0 || dislikes.length > 0) {
        userMessage += '\n\n💡 USER INSIGHTS (apply to appropriate parameters):';
        
        if (likes.length > 0) {
          const likesList = likes.slice(0, 8).map(l => l.keyword || l);
          userMessage += '\n\n✅ LIKES (incorporate these):';
          likesList.forEach(like => {
            userMessage += `\n  • ${like}`;
          });
          console.log('   ✅ Adding likes to prompt:', likesList.join(', '));
        }
        
        if (dislikes.length > 0) {
          const dislikesList = dislikes.slice(0, 8).map(d => d.keyword || d);
          userMessage += '\n\n❌ DISLIKES (avoid these):';
          dislikesList.forEach(dislike => {
            userMessage += `\n  • ${dislike}`;
          });
          console.log('   ❌ Adding dislikes to prompt:', dislikesList.join(', '));
        }
        
        userMessage += '\n\nMap these preferences to relevant parameters (SUBJECT, COMPOSITION, LIGHTING, MOOD, etc.) naturally.';
      }
    } else {
      console.log('\n📊 No user insights available');
    }
    
    // Temperature: Higher for variations to ensure diversity
    const temperature = context.variationIndex !== undefined ? 0.9 : 0.7;
    
    // Max tokens: Increased for 11-parameter detailed prompts
    const maxTokens = 800;
    
    console.log('\n🔧 OpenAI Request Configuration:');
    console.log('   Model: gpt-4o');
    console.log('   Temperature:', temperature);
    console.log('   Max Tokens:', maxTokens);
    console.log('   System: Seedream 4.0 (11-Parameter)');
    
    console.log('\n📤 SYSTEM PROMPT (First 500 chars):');
    console.log('─'.repeat(80));
    console.log(systemPrompt.substring(0, 500) + '...');
    console.log('─'.repeat(80));
    
    console.log('\n📤 USER MESSAGE:');
    console.log('─'.repeat(80));
    console.log(userMessage);
    console.log('─'.repeat(80));
    
    console.log('\n⏳ Calling OpenAI API...');
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: temperature,
      max_tokens: maxTokens
    });
    
    const duration = Date.now() - startTime;
    const enhancedPrompt = response.choices[0].message.content.trim();
    
    console.log('\n✅ OpenAI Response Received!');
    console.log('   Duration:', duration, 'ms');
    console.log('   Finish Reason:', response.choices[0].finish_reason);
    console.log('   Total Tokens:', response.usage?.total_tokens || 'N/A');
    console.log('   Prompt Tokens:', response.usage?.prompt_tokens || 'N/A');
    console.log('   Completion Tokens:', response.usage?.completion_tokens || 'N/A');
    
    console.log('\n📥 ENHANCED PROMPT:');
    console.log('─'.repeat(80));
    console.log(enhancedPrompt);
    console.log('─'.repeat(80));
    
    // Detect which parameters were used
    const paramAnalysis = detectUsedParameters(enhancedPrompt);
    
    console.log('\n📊 SEEDREAM 4.0 ANALYSIS:');
    console.log('   Parameters Used:', paramAnalysis.usedCount, '/ 11');
    console.log('   Parameters:', paramAnalysis.usedList.join(', '));
    
    // Validate optimal range (4-6 parameters recommended)
    if (paramAnalysis.usedCount < 4) {
      console.log('   ⚠️  Warning: Too few parameters (< 4) - may lack detail');
    } else if (paramAnalysis.usedCount > 8) {
      console.log('   ⚠️  Warning: Too many parameters (> 8) - may be over-specified');
    } else {
      console.log('   ✅ Optimal parameter count (4-8)');
    }
    
    // Check for mandatory parameters
    if (!paramAnalysis.parameters.SMARTPHONE_PHOTO_STYLE) {
      console.log('   ⚠️  Missing: SMARTPHONE_PHOTO_STYLE (filename/device)');
    }
    if (!paramAnalysis.parameters.SUBJECT && isDating) {
      console.log('   ⚠️  Missing: SUBJECT (person description)');
    }
    
    console.log('\n📊 COMPARISON:');
    console.log('   Original length:', originalPrompt.length, 'chars');
    console.log('   Enhanced length:', enhancedPrompt.length, 'chars');
    console.log('   Change:', (enhancedPrompt.length - originalPrompt.length > 0 ? '+' : '') + (enhancedPrompt.length - originalPrompt.length), 'chars');
    
    console.log('\n' + '='.repeat(80));
    console.log('🤖 OPENAI PROMPT ENHANCEMENT - END');
    console.log('='.repeat(80) + '\n');
    
    return {
      success: true,
      enhancedPrompt: enhancedPrompt,
      meta: {
        duration,
        tokens: response.usage?.total_tokens,
        originalLength: originalPrompt.length,
        enhancedLength: enhancedPrompt.length,
        seedream: {
          parametersUsed: paramAnalysis.usedCount,
          parametersList: paramAnalysis.usedList,
          isOptimal: paramAnalysis.usedCount >= 4 && paramAnalysis.usedCount <= 8,
          hasSmartphoneStyle: paramAnalysis.parameters.SMARTPHONE_PHOTO_STYLE,
          hasSubject: paramAnalysis.parameters.SUBJECT
        }
      }
    };
  } catch (error) {
    console.error('OpenAI enhance error:', error);
    return {
      success: false,
      error: error.message,
      enhancedPrompt: originalPrompt // fallback
    };
  }
}

/**
 * Detect category from prompt using GPT-4o-mini
 */
/**
 * ⚠️ DEPRECATED: Use agent.service.js detectCategory() instead!
 * 
 * @deprecated Use agent.service.js
 */
export async function detectCategory(prompt, contentType = 'image') {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 OPENAI CATEGORY DETECTION - START');
    console.log('='.repeat(80));
    console.log('📝 Prompt:', prompt);
    console.log('🎬 Content Type:', contentType);
    console.log('\n⏳ Calling OpenAI API...');
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `You are a content categorization expert. Analyze the user's prompt and determine the most appropriate category.

PRIORITY: If the prompt mentions ANY person (дівчина, хлопець, жінка, чоловік, баба, тьолка, чувак, пацан, дівка, красуня, модель, людина, особа, man, woman, girl, boy, person, model, etc.) or romantic/flirty context (флірт, романтика, побачення, свідання, date, dating, romance, flirt, attractive, sexy, cute, etc.) - ALWAYS return "dating".

Available categories:
- dating (знайомства: БУДЬ-ЯКА згадка людини, портрети, профільні фото, романтичний контекст, флірт, привабливість, красиві люди, dating додатки)
- nature (природа: пейзажі, тварини, рослини, погода - БЕЗ людей)
- architecture (архітектура: будівлі, інтер'єри, міста - БЕЗ людей)
- food (їжа: страви, напої, кулінарія - БЕЗ людей)
- technology (технології: гаджети, техніка, майбутнє - БЕЗ людей)
- art (мистецтво: живопис, графіка, ілюстрації - БЕЗ людей)
- abstract (абстракція: художні концепти, нереалістичне - БЕЗ людей)
- other (інше: все що не підходить під інші категорії)

IMPORTANT: Even single mention of person = dating category!

Return ONLY the category name in lowercase English, nothing else.`
      }, {
        role: 'user',
        content: `Content type: ${contentType}\nPrompt: ${prompt}`
      }],
      temperature: 0.3,
      max_tokens: 20
    });
    
    const duration = Date.now() - startTime;
    const category = response.choices[0].message.content.trim().toLowerCase();
    
    console.log('\n✅ Category Detected!');
    console.log('   Duration:', duration, 'ms');
    console.log('   Total Tokens:', response.usage?.total_tokens || 'N/A');
    console.log('   🎭 Category:', category.toUpperCase());
    console.log('\n' + '='.repeat(80));
    console.log('🎯 OPENAI CATEGORY DETECTION - END');
    console.log('='.repeat(80) + '\n');
    
    return {
      success: true,
      category: category,
      meta: {
        duration,
        tokens: response.usage?.total_tokens
      }
    };
  } catch (error) {
    console.error('Category detection error:', error);
    return {
      success: false,
      error: error.message,
      category: 'dating' // fallback to dating as priority
    };
  }
}

/**
 * Analyze comments using GPT-4o-mini
 */
export async function analyzeComments(comments) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧠 OPENAI COMMENT ANALYSIS - START');
    console.log('='.repeat(80));
    
    if (!comments || comments.length === 0) {
      console.log('⚠️  No comments to analyze');
      console.log('='.repeat(80) + '\n');
      return {
        success: true,
        analysis: {
          likes: [],
          dislikes: [],
          suggestions: []
        }
      };
    }
    
    console.log('📝 Total Comments:', comments.length);
    const validComments = comments.filter(c => c && c.trim());
    console.log('✅ Valid Comments:', validComments.length);
    
    console.log('\n💬 COMMENTS TO ANALYZE:');
    console.log('─'.repeat(80));
    validComments.forEach((comment, idx) => {
      console.log(`${idx + 1}. ${comment}`);
    });
    console.log('─'.repeat(80));
    
    const commentsText = validComments.join('\n---\n');
    
    console.log('\n⏳ Calling OpenAI API for comment analysis...');
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `Analyze user comments about generated content.
Extract common themes, complaints, and preferences.

Output JSON format:
{
  "likes": ["keyword1", "keyword2", ...],
  "dislikes": ["keyword1", "keyword2", ...],
  "suggestions": ["suggestion1", "suggestion2", ...]
}`
      }, {
        role: 'user',
        content: commentsText
      }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });
    
    const duration = Date.now() - startTime;
    const analysis = JSON.parse(response.choices[0].message.content);
    
    console.log('\n✅ Analysis Complete!');
    console.log('   Duration:', duration, 'ms');
    console.log('   Total Tokens:', response.usage?.total_tokens || 'N/A');
    
    console.log('\n📊 ANALYSIS RESULTS:');
    console.log('─'.repeat(80));
    console.log('❤️  LIKES:', analysis.likes?.length || 0, 'keywords');
    if (analysis.likes && analysis.likes.length > 0) {
      analysis.likes.forEach((like, idx) => {
        console.log(`   ${idx + 1}. ${like}`);
      });
    }
    
    console.log('\n💔 DISLIKES:', analysis.dislikes?.length || 0, 'keywords');
    if (analysis.dislikes && analysis.dislikes.length > 0) {
      analysis.dislikes.forEach((dislike, idx) => {
        console.log(`   ${idx + 1}. ${dislike}`);
      });
    }
    
    console.log('\n💡 SUGGESTIONS:', analysis.suggestions?.length || 0, 'items');
    if (analysis.suggestions && analysis.suggestions.length > 0) {
      analysis.suggestions.forEach((suggestion, idx) => {
        console.log(`   ${idx + 1}. ${suggestion}`);
      });
    }
    console.log('─'.repeat(80));
    
    console.log('\n' + '='.repeat(80));
    console.log('🧠 OPENAI COMMENT ANALYSIS - END');
    console.log('='.repeat(80) + '\n');
    
    return {
      success: true,
      analysis: {
        likes: analysis.likes || [],
        dislikes: analysis.dislikes || [],
        suggestions: analysis.suggestions || []
      },
      meta: {
        duration,
        tokens: response.usage?.total_tokens,
        commentsAnalyzed: validComments.length
      }
    };
  } catch (error) {
    console.error('Comments analysis error:', error);
    return {
      success: false,
      error: error.message,
      analysis: { likes: [], dislikes: [], suggestions: [] }
    };
  }
}

/**
 * Detect which 11 parameters were used in a Seedream prompt
 * (For logging and analysis purposes)
 */
export function detectUsedParameters(prompt) {
  const parameters = {
    SMARTPHONE_PHOTO_STYLE: false,
    SUBJECT: false,
    COMPOSITION: false,
    BACKGROUND: false,
    LIGHTING: false,
    COLOR_PALETTE: false,
    MOOD_ATMOSPHERE: false,
    MOTION_DYNAMICS: false,
    DEPTH_FOCUS: false,
    TEXTURE_DETAIL: false,
    TIME_WEATHER: false
  };
  
  const promptLower = prompt.toLowerCase();
  
  // Detect SMARTPHONE_PHOTO_STYLE (filename, device, era)
  if (/img_\d+\.(heic|jpg|jpeg|cr2)|dsc_\d+\.jpg/i.test(prompt)) {
    parameters.SMARTPHONE_PHOTO_STYLE = true;
  }
  
  // Detect SUBJECT (age, person description)
  if (/\d{2}-year-old|woman|man|person|girl|boy/i.test(prompt)) {
    parameters.SUBJECT = true;
  }
  
  // Detect COMPOSITION (shot type, angle, framing)
  if (/close-up|medium shot|full-body|rule of thirds|eye level|angle|framing|centered|off-center/i.test(prompt)) {
    parameters.COMPOSITION = true;
  }
  
  // Detect BACKGROUND (setting, location)
  if (/background|setting|café|park|bedroom|street|indoor|outdoor|location/i.test(prompt)) {
    parameters.BACKGROUND = true;
  }
  
  // Detect LIGHTING (light source, direction)
  if (/light|lighting|window|golden hour|sun|lamp|backlit|shadows|illuminat/i.test(prompt)) {
    parameters.LIGHTING = true;
  }
  
  // Detect COLOR_PALETTE
  if (/warm|cool|saturated|color|palette|tone|orange|blue|green|red/i.test(prompt)) {
    parameters.COLOR_PALETTE = true;
  }
  
  // Detect MOOD_ATMOSPHERE
  if (/mood|atmosphere|vibe|emotion|joyful|relaxed|casual|intimate|authentic/i.test(prompt)) {
    parameters.MOOD_ATMOSPHERE = true;
  }
  
  // Detect MOTION_DYNAMICS
  if (/motion blur|movement|camera shake|blur|dynamic|walking|spinning/i.test(prompt)) {
    parameters.MOTION_DYNAMICS = true;
  }
  
  // Detect DEPTH_FOCUS
  if (/depth|focus|dof|blurred|sharp|portrait mode|bokeh|background blur/i.test(prompt)) {
    parameters.DEPTH_FOCUS = true;
  }
  
  // Detect TEXTURE_DETAIL
  if (/texture|detail|skin|freckles|pores|fabric|hair|surface|crisp|grainy/i.test(prompt)) {
    parameters.TEXTURE_DETAIL = true;
  }
  
  // Detect TIME_WEATHER
  if (/golden hour|midday|evening|sunset|sunrise|season|weather|sunny|overcast/i.test(prompt)) {
    parameters.TIME_WEATHER = true;
  }
  
  const usedCount = Object.values(parameters).filter(v => v).length;
  const usedList = Object.keys(parameters).filter(k => parameters[k]);
  
  return {
    parameters,
    usedCount,
    usedList
  };
}

export default {
  enhancePrompt,
  analyzeComments,
  detectCategory,
  detectUsedParameters
};
