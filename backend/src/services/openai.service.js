import OpenAI from 'openai';
import config from '../config/index.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

// ⚠️ DEPRECATED FUNCTION REMOVED
// enhancePrompt() was not using the weight system
// Use V3 generation system instead:
// - selectParametersWeighted() from weights.service.js
// - buildPromptFromParameters() from agent.service.js

// ⚠️ DEPRECATED FUNCTION REMOVED (detectCategory - 73 lines)
// Use agent.service.js version instead with updated categories list

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
  analyzeComments,
  detectUsedParameters
};
