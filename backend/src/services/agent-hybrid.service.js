import OpenAI from 'openai';
import config from '../config/index.js';
import { supabase } from '../db/supabase.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

/**
 * 🔥 HYBRID APPROACH: Weighted Learning БЕЗ обмежень
 * 
 * GPT-4o динамічно створює параметри, але система навчається:
 * - Завантажує топ weighted параметри як "preferences"
 * - GPT-4o може використовувати їх або створювати нові
 * - Всі параметри зберігаються і оновлюються з вагами
 * - Необмежена креативність + персоналізація!
 */

/**
 * Build prompt with HYBRID approach
 * @returns {Object} { prompt, parameters }  - parameters для weighted learning
 */
export async function buildPromptHybrid(userPrompt, agentType = 'general', category = null, sessionId = null) {
  console.log('\n🔥 BUILDING PROMPT (HYBRID APPROACH)');
  console.log('Agent Type:', agentType);
  console.log('Category:', category);
  console.log('User Prompt:', userPrompt);
  
  try {
    // 1. Get agent config (MASTER PROMPT для dating)
    const { data: agentConfig } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('type', agentType)
      .eq('active', true)
      .single();
    
    const systemPrompt = agentConfig?.system_prompt || getDefaultSystemPrompt(agentType);
    
    // 2. 🔥 Завантажити weighted preferences (guidance, не обмеження!)
    const preferences = await getWeightedPreferences(sessionId);
    
    console.log('📊 Loaded preferences:', preferences?.length || 0);
    if (preferences && preferences.length > 0) {
      console.log('Top 5:', preferences.slice(0, 5).map(p => `${p.parameter}.${p.value} (${Math.round(p.weight)})`));
    }
    
    // 3. 🔥 Завантажити коментарі
    const comments = await loadComments(sessionId);
    
    console.log('💬 Loaded comments:', comments?.length || 0);
    
    // 4. 🔥 Build user message з preferences + comments
    const userMessage = buildHybridMessage(userPrompt, preferences, comments, category);
    
    console.log('\n📝 HYBRID MESSAGE (first 400 chars):');
    console.log(userMessage.substring(0, 400) + '...\n');
    
    // 5. 🔥 Call GPT-4o з інструкцією повертати prompt + parameters
    const messages = [
      {
        role: 'system',
        content: systemPrompt + getParametersInstruction(category)
      },
      {
        role: 'user',
        content: userMessage
      }
    ];
    
    console.log('⏳ Calling GPT-4o (hybrid mode)...');
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.85,  // Вище для креативності
      max_tokens: 800
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ GPT-4o response (${duration}ms, ${response.usage?.total_tokens} tokens)`);
    
    // 6. 🔥 Parse відповідь (prompt + parameters)
    const fullResponse = response.choices[0].message.content.trim();
    const { prompt, parameters } = parseHybridResponse(fullResponse);
    
    console.log('\n🎨 FINAL PROMPT:');
    console.log('─'.repeat(80));
    console.log(prompt);
    console.log('─'.repeat(80));
    
    console.log('\n📊 EXTRACTED PARAMETERS:', Object.keys(parameters || {}).length);
    if (parameters) {
      console.log(JSON.stringify(parameters, null, 2));
    }
    
    return {
      success: true,
      prompt,
      parameters,  // 🔥 Це буде збережено для weighted learning!
      metadata: {
        originalPrompt: userPrompt,
        preferencesUsed: preferences?.length || 0,
        commentsUsed: comments?.length || 0,
        approach: 'hybrid',
        agentType,
        category,
        tokensUsed: response.usage?.total_tokens,
        duration
      }
    };
    
  } catch (error) {
    console.error('❌ Hybrid prompt building failed:', error);
    return {
      success: false,
      error: error.message,
      prompt: userPrompt,  // Fallback
      parameters: {}
    };
  }
}

/**
 * Get weighted preferences from session
 * Топ параметри з найвищими вагами як "guidance"
 */
async function getWeightedPreferences(sessionId) {
  if (!sessionId) return [];
  
  try {
    const { data: weights } = await supabase
      .from('weight_parameters')
      .select('parameter_name, sub_parameter, weight')
      .eq('session_id', sessionId)
      .order('weight', { ascending: false })
      .limit(20);  // Топ 20 параметрів
    
    if (!weights || weights.length === 0) return [];
    
    return weights.map(w => ({
      parameter: w.parameter_name,
      value: w.sub_parameter,
      weight: w.weight,
      confidence: w.weight > 120 ? 'high' : w.weight > 100 ? 'medium' : 'low'
    }));
    
  } catch (error) {
    console.error('Error loading preferences:', error);
    return [];
  }
}

/**
 * Load comments from session
 */
async function loadComments(sessionId) {
  if (!sessionId) return [];
  
  try {
    const { data: content } = await supabase
      .from('content_v3')
      .select('id, rating, comment, created_at')
      .eq('session_id', sessionId)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);  // Останні 10 коментарів
    
    if (!content || content.length === 0) return [];
    
    return content.map(c => ({
      text: c.comment,
      rating: c.rating,
      date: c.created_at
    }));
    
  } catch (error) {
    console.error('Error loading comments:', error);
    return [];
  }
}

/**
 * Build hybrid user message
 * Preferences як guidance + comments як priority
 */
function buildHybridMessage(userPrompt, preferences, comments, category) {
  const parts = [];
  
  parts.push(`🎯 USER REQUEST:\n${userPrompt}\n`);
  
  // Preferences як guidance (не обмеження!)
  if (preferences && preferences.length > 0) {
    parts.push(`📊 LEARNED PREFERENCES (guidance, NOT restrictions):\n`);
    parts.push(`Based on previous ratings, user tends to prefer:\n`);
    
    // Group by parameter
    const grouped = {};
    for (const pref of preferences) {
      if (!grouped[pref.parameter]) {
        grouped[pref.parameter] = [];
      }
      grouped[pref.parameter].push(pref);
    }
    
    // Show top per category
    for (const [param, values] of Object.entries(grouped)) {
      const top = values[0];  // Найвищий weight
      if (top.weight > 105) {  // Тільки якщо є preference
        parts.push(`  • ${param}: "${top.value}" (weight: ${Math.round(top.weight)}, confidence: ${top.confidence})`);
      }
    }
    
    parts.push('\n✨ These are SUGGESTIONS based on learning. Feel free to:');
    parts.push('   - Use these parameters if they fit');
    parts.push('   - Create NEW parameters if needed');
    parts.push('   - Mix preferred and new elements\n');
  }
  
  // Comments (HIGHEST PRIORITY!)
  if (comments && comments.length > 0) {
    parts.push(`💬 PREVIOUS USER COMMENTS (⚠️ HIGH PRIORITY!):\n`);
    
    for (const comment of comments.slice(0, 5)) {  // Top 5
      const ratingEmoji = comment.rating >= 3 ? '🔥' : comment.rating >= 1 ? '👍' : comment.rating <= -3 ? '😡' : '👎';
      parts.push(`  ${ratingEmoji} "${comment.text}" (rating: ${comment.rating})`);
    }
    
    parts.push('\n🔥 CRITICAL: Apply user feedback from comments above!\n');
  }
  
  // Category-specific instructions
  if (category === 'dating') {
    parts.push(`📱 DATING PHOTO REQUIREMENTS:`);
    parts.push(`- Follow MASTER PROMPT guidelines (smartphone realism)`);
    parts.push(`- Start with device/filename (IMG_####.HEIC or DSC_####.JPG)`);
    parts.push(`- Include 1-3 authentic imperfections`);
    parts.push(`- Natural flowing language (NO parameter tags like [SUBJECT]:)`);
    parts.push(`- Era-consistent device capabilities`);
    parts.push(`- Realistic smartphone photo aesthetic\n`);
  }
  
  return parts.join('\n');
}

/**
 * Get parameters instruction for GPT-4o
 */
function getParametersInstruction(category) {
  return `\n\n🔥 CRITICAL OUTPUT FORMAT:

You MUST return two parts separated by markers:

1. PROMPT: Natural language generation prompt
2. PARAMETERS: JSON object with parameters you used

Format:
---PROMPT---
[Your natural language prompt for image generation]

---PARAMETERS---
{
  "device": "iPhone_14_Pro",
  "age": "25",
  "setting": "bedroom",
  "lighting": "soft_window",
  "mood": "casual_relaxed",
  "composition": "close_selfie",
  "style": "natural",
  "imperfections": ["slight_blur", "head_cut_off"]
}

IMPORTANT ABOUT PARAMETERS:
- Create ANY parameters you need (not limited to predefined list!)
- Use descriptive values (e.g., "soft_window" not just "soft")
- Include 6-10 key parameters
- These will be saved for weighted learning
- If user liked "iPhone_14_Pro" before, you can reuse it
- But you can also create "iPhone_15" or "Pixel_8" if needed!

The parameters are for learning, the prompt is for generation.`;
}

/**
 * Parse hybrid response (prompt + parameters)
 */
function parseHybridResponse(fullResponse) {
  try {
    // Розділити за markers
    const promptMatch = fullResponse.match(/---PROMPT---\s*([\s\S]*?)\s*---PARAMETERS---/);
    const parametersMatch = fullResponse.match(/---PARAMETERS---\s*([\s\S]*)/);
    
    if (!promptMatch || !parametersMatch) {
      console.warn('⚠️ Failed to parse hybrid response, using full text as prompt');
      return {
        prompt: fullResponse,
        parameters: {}
      };
    }
    
    const prompt = promptMatch[1].trim();
    const parametersText = parametersMatch[1].trim();
    
    // Parse JSON
    let parameters = {};
    try {
      // Clean JSON (видалити markdown backticks якщо є)
      const cleanJson = parametersText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      parameters = JSON.parse(cleanJson);
    } catch (jsonError) {
      console.warn('⚠️ Failed to parse parameters JSON:', jsonError.message);
    }
    
    return { prompt, parameters };
    
  } catch (error) {
    console.error('Error parsing hybrid response:', error);
    return {
      prompt: fullResponse,
      parameters: {}
    };
  }
}

/**
 * Default system prompt (fallback)
 */
function getDefaultSystemPrompt(agentType) {
  const prompts = {
    dating: `You are an expert AI prompt engineer for realistic smartphone dating photos.
Create prompts that produce authentic-looking photos indistinguishable from real smartphone captures.
Key principles: authenticity through imperfection, natural lighting, casual composition.`,
    
    general: `You are an expert AI prompt engineer.
Create detailed, specific prompts optimized for high-quality image generation.
Balance technical accuracy with creative expression.`
  };
  
  return prompts[agentType] || prompts.general;
}

export default {
  buildPromptHybrid
};






