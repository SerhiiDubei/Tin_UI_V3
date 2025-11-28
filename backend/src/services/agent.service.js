import OpenAI from 'openai';
import config from '../config/index.js';
import { supabase } from '../db/supabase.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

/**
 * Agent Service - Smart prompt building with weights
 * Supports multiple agents: Dating, General, etc.
 */

/**
 * Build prompt from user input and selected parameters
 * Agent combines user prompt with parameter-based enhancements
 * 
 * @param {string} userPrompt - What user wants to generate
 * @param {Object} selectedParams - Parameters selected by weight system
 * @param {string} agentType - 'dating' or 'general'
 * @param {string} category - Category tag from project
 * @returns {Object} Enhanced prompt ready for generation
 */
export async function buildPromptFromParameters(userPrompt, selectedParams, agentType = 'general', category = null, sessionId = null) {
  console.log('\n🤖 BUILDING PROMPT WITH AGENT');
  console.log('Agent Type:', agentType);
  console.log('Category:', category);
  console.log('User Prompt:', userPrompt);
  console.log('Selected Parameters:', Object.keys(selectedParams).length);
  
  try {
    // Get agent config
    const { data: agentConfig, error } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('type', agentType)
      .eq('active', true)
      .single();
    
    if (error) {
      console.warn('Agent config not found, using default');
    }
    
    const systemPrompt = agentConfig?.system_prompt || getDefaultSystemPrompt(agentType);
    
    // Convert selected parameters to natural language description
    const parameterDescription = convertParametersToDescription(selectedParams, category);
    
    console.log('\n📝 PARAMETER DESCRIPTION:');
    console.log(parameterDescription);
    
    // 🔥 LOAD COMMENTS FROM PREVIOUS RATINGS (method.txt)
    let commentsSection = '';
    if (sessionId) {
      const commentsResult = await loadSessionComments(sessionId);
      if (commentsResult.success && commentsResult.comments.length > 0) {
        console.log('\n💬 PREVIOUS COMMENTS LOADED:', commentsResult.comments.length);
        commentsSection = buildCommentsSection(commentsResult.comments);
      } else {
        console.log('\n💬 No previous comments found');
      }
    }
    
    // Build final prompt using AI
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Create a detailed generation prompt based on:

USER REQUEST: ${userPrompt}

PARAMETER CONSTRAINTS (selected by AI based on user preferences):
${parameterDescription}${commentsSection}

IMPORTANT:
- Combine user request with parameter constraints naturally
- Maintain authenticity and realism
- Don't mention technical parameters explicitly
- Create flowing, natural description
- For dating: follow Seedream 4.0 style (smartphone photo realism)
- For other categories: adapt style appropriately${commentsSection ? '\n- 🔥 CRITICAL: Apply user feedback from comments above (HIGH PRIORITY!)' : ''}

Return ONLY the final prompt text, nothing else.`
      }
    ];
    
    console.log('\n⏳ Calling GPT-4o for prompt enhancement...');
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.8,
      max_tokens: 500
    });
    
    const duration = Date.now() - startTime;
    const enhancedPrompt = response.choices[0].message.content.trim();
    
    console.log('\n✅ PROMPT BUILT SUCCESSFULLY');
    console.log('Duration:', duration, 'ms');
    console.log('Tokens:', response.usage?.total_tokens);
    console.log('\n📤 FINAL PROMPT:');
    console.log('─'.repeat(80));
    console.log(enhancedPrompt);
    console.log('─'.repeat(80));
    
    return {
      success: true,
      prompt: enhancedPrompt,
      metadata: {
        originalPrompt: userPrompt,
        parametersUsed: selectedParams,
        agentType,
        category,
        tokensUsed: response.usage?.total_tokens,
        duration
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to build prompt:', error);
    return {
      success: false,
      error: error.message,
      prompt: userPrompt // Fallback to user prompt
    };
  }
}

/**
 * Convert selected parameters to natural language description
 */
function convertParametersToDescription(selectedParams, category) {
  const lines = [];
  
  // Group parameters by type
  const technical = [];
  const creative = [];
  const subject = [];
  
  for (const [param, data] of Object.entries(selectedParams)) {
    const value = data.value;
    const weight = data.weight;
    
    // Categorize parameters
    if (['device', 'platform', 'orientation', 'year'].includes(param)) {
      technical.push(`${param}: ${value} (confidence: ${weight})`);
    } else if (['subject', 'age', 'gender', 'pose', 'expression', 'clothing'].includes(param)) {
      subject.push(`${param}: ${value} (preference: ${weight})`);
    } else {
      creative.push(`${param}: ${value} (weight: ${weight})`);
    }
  }
  
  if (technical.length > 0) {
    lines.push('TECHNICAL PARAMETERS:');
    lines.push(...technical.map(p => `  - ${p}`));
    lines.push('');
  }
  
  if (subject.length > 0) {
    lines.push('SUBJECT PREFERENCES:');
    lines.push(...subject.map(p => `  - ${p}`));
    lines.push('');
  }
  
  if (creative.length > 0) {
    lines.push('CREATIVE ELEMENTS:');
    lines.push(...creative.map(p => `  - ${p}`));
  }
  
  return lines.join('\n');
}

/**
 * Get default system prompt for agent type
 */
function getDefaultSystemPrompt(agentType) {
  const prompts = {
    dating: `You are an expert AI prompt engineer specialized in creating realistic smartphone dating photos.

Your role:
- Combine user requests with technical parameters
- Create natural, flowing descriptions
- Focus on authentic smartphone photography feel
- Include subtle imperfections for realism
- Follow Seedream 4.0 principles

Style: Natural language, no technical jargon in output.`,
    
    general: `You are a versatile AI prompt engineer.

Your role:
- Analyze user requests and combine with parameters
- Create detailed, specific prompts
- Adapt style based on content category
- Balance technical accuracy with creativity

Style: Clear, descriptive, natural language.`
  };
  
  return prompts[agentType] || prompts.general;
}

/**
 * Detect category from user prompt
 * Used when creating new projects
 */
export async function detectCategory(userPrompt) {
  console.log('\n🎯 DETECTING CATEGORY');
  console.log('Prompt:', userPrompt);
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `You are a content categorization expert.

Analyze the user's prompt and determine the most appropriate category:

CATEGORIES:
- dating: People, portraits, dating profiles, selfies, romantic context
- cars: Vehicles, automobiles, supercars, racing
- insurance: Family, safety, home, peace of mind, happy families
- space_pigs: Pigs, cosmic battles, space themes (yes, really!)
- food: Dishes, cuisine, restaurants, cooking
- nature: Landscapes, animals, plants, outdoor scenes
- architecture: Buildings, interiors, urban design
- technology: Gadgets, tech, futuristic themes
- art: Artistic, creative, illustrations
- general: Everything else

Return ONLY the category name in lowercase, nothing else.`
      }, {
        role: 'user',
        content: userPrompt
      }],
      temperature: 0.3,
      max_tokens: 20
    });
    
    const category = response.choices[0].message.content.trim().toLowerCase();
    
    console.log('✅ Category detected:', category.toUpperCase());
    
    return {
      success: true,
      category
    };
    
  } catch (error) {
    console.error('❌ Category detection failed:', error);
    return {
      success: false,
      category: 'general'
    };
  }
}

/**
 * Analyze session history and provide insights
 * Used for understanding what works and what doesn't
 */
export async function analyzeSessionHistory(sessionId) {
  console.log('\n🧠 ANALYZING SESSION HISTORY');
  console.log('Session ID:', sessionId);
  
  try {
    // Get all ratings from this session
    const { data: ratings, error } = await supabase
      .from('session_ratings')
      .select('*')
      .eq('session_id', sessionId);
    
    if (error) throw error;
    
    if (!ratings || ratings.length === 0) {
      return {
        success: true,
        insights: {
          totalRatings: 0,
          message: 'No ratings yet in this session'
        }
      };
    }
    
    // Analyze ratings
    const positive = ratings.filter(r => r.rating > 0);
    const negative = ratings.filter(r => r.rating < 0);
    
    // Find most liked parameters
    const parameterScores = {};
    
    for (const rating of ratings) {
      const params = rating.parameters_used?.parameters || [];
      const score = rating.rating;
      
      for (const param of params) {
        const key = `${param.parameter}.${param.value}`;
        if (!parameterScores[key]) {
          parameterScores[key] = { total: 0, count: 0 };
        }
        parameterScores[key].total += score;
        parameterScores[key].count += 1;
      }
    }
    
    // Calculate averages
    const parameterAverages = {};
    for (const [key, data] of Object.entries(parameterScores)) {
      parameterAverages[key] = data.total / data.count;
    }
    
    // Sort by average score
    const sorted = Object.entries(parameterAverages)
      .sort(([, a], [, b]) => b - a);
    
    const topLiked = sorted.slice(0, 5).map(([param, score]) => ({
      parameter: param,
      avgScore: parseFloat(score.toFixed(2))
    }));
    
    const topDisliked = sorted.slice(-5).reverse().map(([param, score]) => ({
      parameter: param,
      avgScore: parseFloat(score.toFixed(2))
    }));
    
    console.log('✅ Analysis complete');
    console.log('   Total ratings:', ratings.length);
    console.log('   Positive:', positive.length);
    console.log('   Negative:', negative.length);
    
    return {
      success: true,
      insights: {
        totalRatings: ratings.length,
        positiveRatings: positive.length,
        negativeRatings: negative.length,
        avgRating: ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length,
        topLiked,
        topDisliked
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to analyze session:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Load all rated content with comments from session
 * @param {string} sessionId 
 * @returns {Object} { success, comments: [{ rating, comment, prompt }] }
 */
async function loadSessionComments(sessionId) {
  try {
    const { data: content, error } = await supabase
      .from('content_v3')
      .select('rating, comment, original_prompt, enhanced_prompt')
      .eq('session_id', sessionId)
      .not('comment', 'is', null)
      .not('rating', 'is', null)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    const comments = content.map(item => ({
      rating: item.rating,
      comment: item.comment,
      prompt: item.original_prompt || item.enhanced_prompt
    }));
    
    return {
      success: true,
      comments
    };
  } catch (error) {
    console.error('Error loading session comments:', error);
    return {
      success: false,
      comments: [],
      error: error.message
    };
  }
}

/**
 * Build comments section for GPT-4o prompt
 * @param {Array} comments 
 * @returns {string}
 */
function buildCommentsSection(comments) {
  if (!comments || comments.length === 0) return '';
  
  const positive = comments.filter(c => c.rating > 0);
  const negative = comments.filter(c => c.rating < 0);
  
  let section = '\n\n🔥 USER FEEDBACK (Previous ratings with comments):';
  
  if (positive.length > 0) {
    section += '\n\n✅ WHAT USER LIKES (incorporate these):';
    positive.forEach((c, i) => {
      const intensity = c.rating >= 3 ? '(LOVES IT!)' : '(likes)';
      section += `\n  ${i + 1}. ${intensity} "${c.comment}"`;
      if (c.prompt) section += ` [from: "${c.prompt.substring(0, 50)}..."]`;
    });
  }
  
  if (negative.length > 0) {
    section += '\n\n❌ WHAT USER DISLIKES (avoid these):';
    negative.forEach((c, i) => {
      const intensity = c.rating <= -3 ? '(HATES IT!)' : '(dislikes)';
      section += `\n  ${i + 1}. ${intensity} "${c.comment}"`;
      if (c.prompt) section += ` [from: "${c.prompt.substring(0, 50)}..."]`;
    });
  }
  
  return section;
}

export default {
  buildPromptFromParameters,
  detectCategory,
  analyzeSessionHistory
};
