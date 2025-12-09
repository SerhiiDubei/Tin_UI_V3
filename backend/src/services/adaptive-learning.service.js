import { supabase } from '../db/supabase.js';
import OpenAI from 'openai';
import config from '../config/index.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

/**
 * 🧠 ADAPTIVE LEARNING SERVICE
 * 
 * Аналізує історію сесії (ratings + comments) і створює insights
 * для адаптації Master Prompt при наступній генерації.
 * 
 * ЦЕ ВИРІШУЄ КРИТИЧНУ ПРОБЛЕМУ: Comments НЕ використовувалися!
 */

/**
 * Аналізує всю історію сесії для витягування insights
 * 
 * @param {string} sessionId - ID сесії
 * @param {number} limit - Скільки останніх оцінок аналізувати (default: 20)
 * @returns {Object} - Insights з preferences, dislikes, suggestions
 */
export async function analyzeSessionHistory(sessionId, limit = 20) {
  try {
    console.log('\n' + '🧠'.repeat(40));
    console.log('🧠 ADAPTIVE LEARNING - ANALYZE SESSION HISTORY');
    console.log('🧠'.repeat(40));
    console.log('📋 Session ID:', sessionId);
    console.log('📊 Analyzing last', limit, 'rated items');
    
    // 1. Читати rated content з БД
    const { data: ratedContent, error } = await supabase
      .from('content_v3')
      .select('id, rating, comment, weights_used, final_prompt, created_at')
      .eq('session_id', sessionId)
      .not('rating', 'is', null)  // Тільки rated content
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    if (!ratedContent || ratedContent.length === 0) {
      console.log('⚠️ No rated content found in this session');
      return {
        success: true,
        hasHistory: false,
        itemsAnalyzed: 0,
        insights: null
      };
    }
    
    console.log(`✅ Found ${ratedContent.length} rated items`);
    
    // 2. Фільтрувати по rating
    // Конвертація: 1-5 stars
    // В БД: -3, -1, 1, 3 (старий формат) АБО 1-5 (новий)
    const liked = ratedContent.filter(c => {
      // Новий формат (1-5 stars)
      if (c.rating >= 1 && c.rating <= 5) {
        return c.rating >= 4; // 4-5 stars = liked
      }
      // Старий формат (-3, -1, 1, 3)
      return c.rating > 0; // Positive = liked
    });
    
    const disliked = ratedContent.filter(c => {
      if (c.rating >= 1 && c.rating <= 5) {
        return c.rating <= 2; // 1-2 stars = disliked
      }
      return c.rating < 0; // Negative = disliked
    });
    
    console.log(`   ❤️  Liked: ${liked.length} items`);
    console.log(`   💔 Disliked: ${disliked.length} items`);
    
    // 3. Витягти comments
    const likeComments = liked
      .map(c => c.comment)
      .filter(Boolean); // Remove nulls/empty
    
    const dislikeComments = disliked
      .map(c => c.comment)
      .filter(Boolean);
    
    console.log(`   💬 Like comments: ${likeComments.length}`);
    console.log(`   💬 Dislike comments: ${dislikeComments.length}`);
    
    // Якщо немає жодного коментаря - повернути базову інформацію
    if (likeComments.length === 0 && dislikeComments.length === 0) {
      console.log('⚠️ No comments found - returning statistical insights only');
      return {
        success: true,
        hasHistory: true,
        itemsAnalyzed: ratedContent.length,
        insights: {
          loves: [`User rated ${liked.length} items positively`],
          hates: [`User rated ${disliked.length} items negatively`],
          suggestions: ['Continue generating similar content to liked items']
        },
        statistics: {
          totalRated: ratedContent.length,
          liked: liked.length,
          disliked: disliked.length,
          neutral: ratedContent.length - liked.length - disliked.length
        }
      };
    }
    
    // 4. Аналізувати з GPT-4o
    console.log('\n🤖 Calling GPT-4o to analyze comments...');
    
    const analysisPrompt = `Analyze user feedback from an AI image generation session.

**LIKED CONTENT (${liked.length} items):**
${likeComments.length > 0 ? 
  likeComments.map((c, i) => `${i+1}. "${c}"`).join('\n') : 
  'No comments, but user liked these items'}

**DISLIKED CONTENT (${disliked.length} items):**
${dislikeComments.length > 0 ? 
  dislikeComments.map((c, i) => `${i+1}. "${c}"`).join('\n') : 
  'No comments, but user disliked these items'}

**YOUR TASK:**
Extract actionable insights to improve future generations. Be SPECIFIC.

**OUTPUT FORMAT (JSON):**
{
  "loves": [
    "Specific things user loves (from comments + high ratings)",
    "Example: golden hour lighting",
    "Example: natural outdoor settings",
    "Example: candid expressions"
  ],
  "hates": [
    "Specific things user hates (from comments + low ratings)",
    "Example: artificial studio lighting",
    "Example: too much contrast",
    "Example: stiff poses"
  ],
  "suggestions": [
    "Actionable suggestions for next generation",
    "Example: Use more natural light sources",
    "Example: Focus on relaxed, candid moments",
    "Example: Avoid overly saturated colors"
  ]
}

**RULES:**
1. Extract SPECIFIC preferences (not generic)
2. Focus on actionable insights (что конкретно изменить)
3. If no comments but high ratings - infer from patterns
4. Each array should have 3-7 items
5. Be concrete: "golden hour lighting" not "good lighting"`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: 'You are an expert at analyzing user feedback for AI image generation. Extract specific, actionable insights.'
      }, {
        role: 'user',
        content: analysisPrompt
      }],
      response_format: { type: 'json_object' },
      temperature: 0.3  // Lower temperature for consistency
    });
    
    const insights = JSON.parse(response.choices[0].message.content);
    
    console.log('\n✅ GPT-4o Analysis Complete');
    console.log('   ❤️  Loves:', insights.loves?.length || 0, 'items');
    console.log('   💔 Hates:', insights.hates?.length || 0, 'items');
    console.log('   💡 Suggestions:', insights.suggestions?.length || 0, 'items');
    
    // Show first item from each
    if (insights.loves?.length > 0) {
      console.log('      Example love:', insights.loves[0]);
    }
    if (insights.hates?.length > 0) {
      console.log('      Example hate:', insights.hates[0]);
    }
    if (insights.suggestions?.length > 0) {
      console.log('      Example suggestion:', insights.suggestions[0]);
    }
    
    console.log('🧠'.repeat(40) + '\n');
    
    return {
      success: true,
      hasHistory: true,
      itemsAnalyzed: ratedContent.length,
      insights: insights,
      statistics: {
        totalRated: ratedContent.length,
        liked: liked.length,
        disliked: disliked.length,
        neutral: ratedContent.length - liked.length - disliked.length,
        likeCommentsCount: likeComments.length,
        dislikeCommentsCount: dislikeComments.length
      }
    };
    
  } catch (error) {
    console.error('❌ Adaptive Learning Error:', error);
    return {
      success: false,
      error: error.message,
      hasHistory: false
    };
  }
}

/**
 * Створює adaptive system prompt на основі insights
 * 
 * @param {string} basePrompt - Базовий system prompt
 * @param {Object} insights - Insights з analyzeSessionHistory()
 * @returns {string} - Adaptive system prompt
 */
export function buildAdaptiveSystemPrompt(basePrompt, insights) {
  if (!insights || !insights.insights) {
    // Немає insights - повернути базовий промпт
    return basePrompt;
  }
  
  const { loves, hates, suggestions } = insights.insights;
  
  const adaptiveSection = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 LEARNED USER PREFERENCES (from ${insights.itemsAnalyzed} rated items)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❤️ USER LOVES (incorporate these):
${loves.map((item, i) => `${i+1}. ${item}`).join('\n')}

💔 USER HATES (AVOID these):
${hates.map((item, i) => `${i+1}. ${item}`).join('\n')}

💡 SUGGESTIONS (apply these):
${suggestions.map((item, i) => `${i+1}. ${item}`).join('\n')}

⚠️ CRITICAL: Adapt your generation to match these learned preferences!
Use the "loves", avoid the "hates", and follow the suggestions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  
  return basePrompt + adaptiveSection;
}

/**
 * Helper: Get quick summary of session learning state
 */
export async function getSessionLearningSummary(sessionId) {
  try {
    const { data, error } = await supabase
      .from('content_v3')
      .select('rating')
      .eq('session_id', sessionId)
      .not('rating', 'is', null);
    
    if (error) throw error;
    
    return {
      totalRatings: data.length,
      canLearn: data.length >= 3,  // Need at least 3 ratings to learn
      message: data.length < 3 ? 
        `Need ${3 - data.length} more ratings to enable learning` : 
        'Learning enabled'
    };
  } catch (error) {
    return {
      totalRatings: 0,
      canLearn: false,
      error: error.message
    };
  }
}

export default {
  analyzeSessionHistory,
  buildAdaptiveSystemPrompt,
  getSessionLearningSummary
};
