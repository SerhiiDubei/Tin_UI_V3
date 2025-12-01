import OpenAI from 'openai';
import config from '../config/index.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

/**
 * Analyze uploaded photos using GPT-4o Vision API
 * Generate a detailed prompt for content generation based on the photos
 * 
 * @param {Array<string>} imageUrls - Array of image URLs (up to 20)
 * @param {string} userInstructions - Optional user instructions/context
 * @param {string} agentType - 'dating' or 'general'
 * @returns {Object} { success, prompt, analysis, error }
 */
export async function analyzePhotosAndGeneratePrompt(imageUrls, userInstructions = '', agentType = 'general') {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('👁️  VISION API - ANALYZING PHOTOS');
    console.log('='.repeat(80));
    console.log('Photos count:', imageUrls.length);
    console.log('Agent type:', agentType);
    console.log('User instructions:', userInstructions || 'None');
    
    if (!imageUrls || imageUrls.length === 0) {
      throw new Error('No images provided');
    }
    
    if (imageUrls.length > 20) {
      throw new Error('Maximum 20 images allowed');
    }
    
    // System prompt based on agent type
    const systemPrompt = agentType === 'dating'
      ? getDatingVisionPrompt()
      : getGeneralVisionPrompt();
    
    // Build user message with images
    const userMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: userInstructions 
            ? `Analyze these photos and generate a detailed prompt based on them. User instructions: ${userInstructions}`
            : 'Analyze these photos and generate a detailed, comprehensive prompt for AI content generation that captures the style, mood, composition, and key visual elements.'
        },
        // Add all images
        ...imageUrls.map(url => ({
          type: 'image_url',
          image_url: {
            url: url,
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
      imageCount: imageUrls.length,
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
 * Dating-specific vision prompt
 */
function getDatingVisionPrompt() {
  return `You are an expert AI image analyst specializing in dating profile photography.

🎯 YOUR TASK:
Analyze the provided photos and generate a detailed prompt for creating similar smartphone dating photos using Seedream 4.0.

📋 ANALYSIS FRAMEWORK - Extract these elements:

1. **SUBJECT & APPEARANCE**
   - Age range (22-25, 26-30, 31-35)
   - Gender and style
   - Clothing style (casual, confident, mature, athletic, professional)
   - Physical features and expression

2. **SMARTPHONE AUTHENTICITY**
   - Device simulation (iPhone 13/14, Pixel 7, Samsung S21)
   - Filename style (IMG_####.HEIC, DSC_####.JPG)
   - Photo quality indicators (slight blur, grain, compression)
   - Authentic imperfections (off-center, casual mistakes)

3. **COMPOSITION & FRAMING**
   - Shot distance (selfie, portrait, full-body, environmental)
   - Camera angle (eye-level, slightly above, low angle)
   - Subject position (centered, rule-of-thirds, off-center)
   - Cropping style

4. **BACKGROUND & SETTING**
   - Location type (urban, nature, indoor, café, gym, beach, etc.)
   - Background complexity (plain, blurred, detailed, busy)
   - Depth and bokeh
   - Environmental context

5. **LIGHTING & ATMOSPHERE**
   - Light source (natural daylight, golden hour, indoor, window light, artificial)
   - Direction (front, side, backlight)
   - Quality (soft, harsh, mixed)
   - Shadows and highlights

6. **COLOR & MOOD**
   - Color palette (warm, cool, neutral, vibrant, muted)
   - Saturation level
   - Contrast
   - Overall mood (casual, confident, romantic, energetic, relaxed)

7. **MOTION & DYNAMICS**
   - Subject state (static, walking, laughing, candid action)
   - Movement blur
   - Energy level

8. **DEPTH & FOCUS**
   - Focus type (sharp subject, slight background blur, bokeh, everything sharp)
   - Depth of field simulation

9. **TEXTURE & DETAIL**
   - Skin texture (natural, slightly smooth)
   - Fabric detail
   - Material rendering
   - Fine details vs. smartphone limitations

10. **TIME & WEATHER**
    - Time of day
    - Season indicators
    - Weather conditions
    - Atmospheric effects

11. **IMPERFECTIONS (KEY!)**
    - 1-3 authentic flaws that make it look real:
      * Slight off-center framing
      * Tiny bit of motion blur
      * Subtle compression artifacts
      * Casual angle
      * Background not perfectly clean
      * Natural lighting inconsistencies

📤 OUTPUT FORMAT:
Generate a comprehensive prompt that combines all these elements in natural language.
Focus on authenticity - real dating photos have imperfections!

Example output structure:
"Smartphone selfie of [subject description], [clothing], taken with [device], [composition details], [background], [lighting], [mood], [imperfections]. Filename: IMG_####.HEIC. Natural smartphone photography feel with [specific authentic touches]."

🔑 REMEMBER:
- Perfect = Fake. Casual imperfections = Authentic.
- Think like someone taking a quick photo for their dating profile
- Capture the spontaneous, real-person feel
- Include 1-3 subtle imperfections that make it believable`;
}

/**
 * General vision prompt
 */
function getGeneralVisionPrompt() {
  return `You are an expert AI image analyst and prompt engineer.

🎯 YOUR TASK:
Analyze the provided photos and generate a detailed, comprehensive prompt for AI content generation that accurately captures the visual style, composition, and key elements.

📋 ANALYSIS FRAMEWORK:

1. **SUBJECT & CONTENT**
   - Main subject(s) and objects
   - Actions and activities
   - Key visual elements
   - Story or narrative

2. **STYLE & AESTHETICS**
   - Art style (photorealistic, illustration, digital art, painting, etc.)
   - Visual treatment (cinematic, editorial, documentary, artistic)
   - Artistic influences or references

3. **COMPOSITION**
   - Framing and perspective
   - Rule of thirds, symmetry, or other composition techniques
   - Subject placement
   - Negative space

4. **LIGHTING**
   - Light source and direction
   - Quality (soft, hard, diffused, dramatic)
   - Time of day feel
   - Shadow and highlight treatment

5. **COLOR**
   - Color palette and harmony
   - Saturation and vibrancy
   - Contrast levels
   - Color grading or toning

6. **TECHNICAL DETAILS**
   - Camera/lens simulation (if applicable)
   - Depth of field
   - Focus points
   - Technical effects

7. **MOOD & ATMOSPHERE**
   - Emotional tone
   - Atmosphere and feeling
   - Energy level

8. **BACKGROUND & SETTING**
   - Environment type
   - Level of detail
   - Context and location

9. **TEXTURE & DETAIL**
   - Surface qualities
   - Material rendering
   - Level of detail vs. abstraction

10. **SPECIAL EFFECTS**
    - Motion blur, bokeh, lens flares
    - Weather effects
    - Atmospheric elements

📤 OUTPUT FORMAT:
Generate a detailed, flowing prompt that combines all these elements naturally.
Be specific and descriptive, capturing both the technical and artistic aspects.

Example structure:
"[Style description] of [subject], [composition details], [lighting description], [color treatment], [mood], [background/setting], [technical details], [special notes about texture, effects, or unique characteristics]."

🔑 KEY PRINCIPLES:
- Be specific and detailed
- Use natural, flowing language
- Include both what to show and how to show it
- Capture the unique character and style of the images
- Think about what makes these images distinctive`;
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
