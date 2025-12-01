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
    console.log('👁️  VISION API - ANALYZING PHOTOS');
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
    
    // System prompt based on agent type
    const systemPrompt = agentType === 'dating'
      ? getDatingVisionPrompt()
      : getGeneralVisionPrompt();
    
    // Build user message with images and comments
    const userMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: buildAnalysisRequest(userInstructions, agentType, photos)
        },
        // Add all images with their metadata
        ...photos.map(photo => ({
          type: 'image_url',
          image_url: {
            url: photo.url,
            detail: 'high' // Use high detail for better analysis
          }
        }))
      ]
    };
    
    console.log('🤖 Calling GPT-4o Vision API...');
    
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
    
    console.log('✅ Vision API response received');
    console.log('Response length:', content.length, 'characters');
    
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
    
    console.log('='.repeat(80) + '\n');
    
    return {
      success: true,
      prompt: prompt,
      analysis: analysis,
      imageCount: photos.length,
      model: 'gpt-4o',
      agentType: agentType
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
 * Build analysis request text with safety context and photo comments
 */
function buildAnalysisRequest(userInstructions, agentType, photos) {
  const context = agentType === 'dating' 
    ? 'These are public marketing/promotional photos for analysis purposes.'
    : 'These are business/marketing images provided for professional analysis.';
  
  // Build photo comments section
  let photoComments = '';
  const photosWithComments = photos.filter(p => p.comment);
  if (photosWithComments.length > 0) {
    photoComments = '\n\n📝 USER NOTES FOR EACH PHOTO:\n';
    photosWithComments.forEach(p => {
      photoComments += `Photo ${p.index}: ${p.comment}\n`;
    });
  }
  
  const task = userInstructions 
    ? `Analyze the COMMON visual style across all images and generate ONE prompt for creating a SINGLE image in this style. User context: ${userInstructions}`
    : 'Find the COMMON VISUAL STYLE across all images (lighting, composition, color palette, mood, quality) and generate ONE prompt for creating a SINGLE NEW image in this unified style.';
  
  return `${context}${photoComments}

**CRITICAL INSTRUCTIONS:**
1. You are analyzing ${photos.length} SEPARATE reference images
2. DO NOT describe each image individually
3. DO NOT create a "collage" or "series" description
4. FIND the COMMON visual style that connects all images:
   - Common lighting approach
   - Common color palette
   - Common composition style
   - Common mood/atmosphere
   - Common technical quality
5. Generate ONE prompt for creating a SINGLE NEW image in this style

**EXAMPLE:**
BAD: "Series featuring business professional, family with flag, vehicle, and Mount Rushmore" ❌
GOOD: "Professional insurance advertising photography with warm natural lighting, patriotic American aesthetic, diverse subjects in authentic settings, red/blue/white color scheme, high-quality editorial style" ✅

Task: ${task}

**OUTPUT FORMAT:** One cohesive prompt describing the SHARED VISUAL STYLE (not listing individual scenes).`;
}

/**
 * Dating-specific vision prompt
 */
function getDatingVisionPrompt() {
  return `You are a professional visual content analyst specializing in marketing photography.

**IMPORTANT CONTEXT:**
You are analyzing public marketing/promotional photographs for professional business purposes. These images are provided for style analysis and creative prompt generation only.

**YOUR TASK:**
You will see multiple REFERENCE images. Find their COMMON VISUAL STYLE and generate a prompt for creating ONE NEW image in this style.

**⚠️ CRITICAL - DO NOT:**
- Describe each image separately
- List all subjects/scenes ("business professional, family, vehicle...")
- Create a "series" or "collage" description
- Mention "featuring X and Y and Z"

**✅ INSTEAD - FOCUS ON:**

1. **Common Photography Style**
   - Professional editorial? Casual smartphone? Documentary?
   - Consistent camera angles/perspectives across images

2. **Shared Lighting Approach**
   - Natural daylight? Studio? Mixed lighting?
   - Consistent light quality (soft, hard, warm, cool)

3. **Unified Color Palette**
   - Dominant colors appearing across images
   - Color temperature consistency
   - Saturation/contrast patterns

4. **Consistent Mood & Tone**
   - Professional? Authentic? Aspirational? Patriotic?
   - Energy level across images

5. **Common Technical Quality**
   - Image sharpness/clarity
   - Depth of field approach
   - Professional vs. casual quality

6. **Shared Composition Patterns**
   - Subject placement (centered, rule of thirds, etc.)
   - Background treatment
   - Framing approach

**OUTPUT FORMAT:**
"[Photography style] with [lighting description], [color palette], [mood/atmosphere], [composition approach], [technical quality]. [Additional style notes about authenticity, setting preferences, or brand aesthetic]."

**GOOD EXAMPLES:**
✅ "Professional insurance advertising photography with warm natural daylight, patriotic red/blue/white color scheme, diverse authentic subjects, clean editorial composition, high production value"
✅ "Casual smartphone photography style with soft window lighting, muted earthy tones, candid moments, slightly off-center framing, authentic feel with minor imperfections"

**BAD EXAMPLES:**
❌ "Series featuring business professional at desk, family with flag, vehicle, and Mount Rushmore"
❌ "Collage of multiple scenes including office, outdoor, and landmark settings"`;
}

/**
 * General vision prompt - UNIVERSAL for all business content
 */
function getGeneralVisionPrompt() {
  return `You are a professional visual content analyst specializing in marketing and business photography.

**IMPORTANT CONTEXT:**
You are analyzing business/marketing images for professional purposes. These may include:
- Insurance/financial marketing materials
- Automotive advertisements
- Product photography
- Corporate communications
- Marketing campaigns
- Promotional content

All images are provided for legitimate business analysis and creative prompt generation.

**YOUR TASK:**
Analyze MULTIPLE business/marketing reference images and identify their COMMON VISUAL STYLE. Generate a prompt for creating ONE NEW image in this unified style.

**⚠️ CRITICAL - AVOID "COLLAGE" DESCRIPTIONS:**
- DO NOT list all subjects from different images
- DO NOT describe a "series" or "collection"
- DO NOT say "featuring X, Y, and Z from different scenes"

**✅ FOCUS ON SHARED CHARACTERISTICS:**

1. **Common Marketing Style**
   - Professional editorial? Authentic lifestyle? Corporate?
   - Consistent brand aesthetic across images

2. **Unified Color Strategy**
   - Brand colors appearing consistently
   - Color palette (warm/cool/vibrant/muted)
   - Color grading approach

3. **Consistent Lighting Approach**
   - Natural vs. studio lighting
   - Light quality and direction
   - Professional lighting setup patterns

4. **Shared Composition Style**
   - Subject placement patterns
   - Framing consistency
   - Background treatment approach

5. **Common Mood & Message**
   - Professional tone
   - Emotional appeal
   - Brand message consistency

6. **Technical Quality Standards**
   - Professional production value
   - Image clarity and quality
   - Technical execution level

7. **Consistent Design Elements**
   - Text overlay style (if present)
   - Graphic treatment
   - Brand presentation patterns

**OUTPUT FORMAT:**
"[Marketing style] photography with [lighting approach], [color palette], [mood/message], [composition style], [professional quality]. [Brand aesthetic notes]."

**GOOD EXAMPLES:**
✅ "Professional insurance advertising photography with warm natural lighting, patriotic American aesthetic, clean editorial composition, red/white/blue color emphasis, high production value, trustworthy professional tone"
✅ "Authentic lifestyle marketing photography with soft diffused lighting, earthy natural tones, candid moments, diverse subjects, approachable feel"

**BAD EXAMPLES:**
❌ "Marketing collage featuring office professional, family outdoors, vehicle, landmark, and text overlays"
❌ "Series of images showing business woman, family with flag, car, and Mount Rushmore"`;
}

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

export default {
  analyzePhotosAndGeneratePrompt,
  describePhoto
};
