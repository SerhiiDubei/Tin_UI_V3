import { supabase } from '../db/supabase.js';
import OpenAI from 'openai';
import config from '../config/index.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

/**
 * Weight Learning System Service
 * 
 * IMPORTANT RULES:
 * - Weights are FIXED per session (created once at session start)
 * - 11-14 parameter categories, 4-6 sub-parameters each
 * - Ratings are tracked and used to calculate weights for NEXT session
 */

/**
 * Create parameters dynamically based on category and user prompt
 * Agent decides what parameters are needed for this specific use case
 * 
 * @param {string} category - e.g., "dating", "cars", "insurance", "space_pigs"
 * @param {string} userPrompt - What user wants to generate
 * @returns {Object} Parameter structure with 11-14 categories
 */
export async function createParametersForCategory(category, userPrompt) {
  console.log('\n🤖 CREATING DYNAMIC PARAMETERS');
  console.log('Category:', category);
  console.log('User Prompt:', userPrompt);
  
  try {
    const systemPrompt = `You are an AI parameter architect. Create a comprehensive parameter system for ${category} generation.

CRITICAL REQUIREMENTS:
- Create EXACTLY 11-14 parameter categories
- Each category must have 4-6 sub-parameters
- Total parameters: 44-84 (11*4 minimum, 14*6 maximum)
- Parameters must be specific to ${category} context
- Sub-parameters should be diverse and cover the full range of possibilities

EXAMPLES OF GOOD PARAMETER STRUCTURE:

For "dating" category:
{
  "device": ["iPhone_14_Pro", "iPhone_13", "Pixel_7", "Samsung_S21", "iPhone_X"],
  "platform": ["Instagram_Story", "Instagram_Feed", "Snapchat", "TikTok"],
  "orientation": ["vertical_9_16", "square_1_1", "horizontal_16_9", "horizontal_4_3"],
  "year": ["2024", "2023", "2022", "2021", "2020"],
  "age": ["teen", "young_adult", "middle_aged", "mature"],
  "gender": ["woman", "man", "non_binary", "diverse"],
  "pose": ["front_camera_selfie", "mirror_selfie", "portrait_shot", "candid", "action"],
  "expression": ["genuine_smile", "soft_smile", "serious", "laughing", "confident"],
  "clothing": ["casual", "formal", "sporty", "trendy", "professional"],
  "setting": ["indoor", "outdoor", "cafe", "bedroom", "gym", "park"],
  "lighting": ["natural_window", "golden_hour", "studio", "evening", "mixed"],
  "mood": ["casual", "professional", "romantic", "energetic", "relaxed"],
  "color_tone": ["warm", "cool", "neutral", "vibrant"],
  "saturation": ["low", "moderate", "high", "boosted"]
}

For "cars" category, create similar structure with:
- Vehicle parameters (brand, model, color, condition)
- Technical parameters (angle, shot_type, lens_type)
- Environment parameters (location, weather, time_of_day)
- Style parameters (artistic_style, color_grading, lighting)
- etc.

Return ONLY valid JSON with 11-14 categories, each having 4-6 options.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Category: ${category}\nUser wants: ${userPrompt}\n\nCreate parameter structure.` 
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const parameters = JSON.parse(response.choices[0].message.content);
    
    // Validate structure
    const categoryCount = Object.keys(parameters).length;
    if (categoryCount < 11 || categoryCount > 14) {
      console.warn(`⚠️ Parameter count ${categoryCount} outside range 11-14. Adjusting...`);
    }
    
    // Validate sub-parameters
    for (const [cat, options] of Object.entries(parameters)) {
      if (options.length < 4 || options.length > 6) {
        console.warn(`⚠️ Category "${cat}" has ${options.length} options (should be 4-6)`);
      }
    }
    
    console.log('✅ Parameters created:');
    console.log(`   Categories: ${Object.keys(parameters).length}`);
    console.log(`   Total sub-parameters: ${Object.values(parameters).reduce((sum, arr) => sum + arr.length, 0)}`);
    
    return {
      success: true,
      parameters,
      metadata: {
        category,
        categoriesCount: categoryCount,
        totalSubParameters: Object.values(parameters).reduce((sum, arr) => sum + arr.length, 0)
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to create parameters:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initialize weights for a new session
 * If project has previous sessions, inherit and update weights
 * Otherwise, start with default 100
 * 
 * @param {string} sessionId - Current session ID
 * @param {string} projectId - Project ID
 * @param {Object} parameters - Parameter structure from createParametersForCategory
 * @returns {Object} Weights initialized
 */
export async function initializeSessionWeights(sessionId, projectId, parameters) {
  console.log('\n⚖️ INITIALIZING SESSION WEIGHTS');
  console.log('Session ID:', sessionId);
  console.log('Project ID:', projectId);
  
  try {
    // Get previous sessions in this project
    const { data: previousSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, created_at')
      .eq('project_id', projectId)
      .neq('id', sessionId)
      .order('created_at', { ascending: false });
    
    if (sessionsError) throw sessionsError;
    
    let baseWeights = {};
    
    if (previousSessions && previousSessions.length > 0) {
      console.log(`📊 Found ${previousSessions.length} previous sessions, calculating learned weights...`);
      
      // Calculate weights based on all previous sessions' ratings
      baseWeights = await calculateLearnedWeights(projectId, parameters);
      
    } else {
      console.log('🆕 First session in project, starting with default weights (100)');
      
      // Initialize all parameters with weight 100
      for (const [paramName, options] of Object.entries(parameters)) {
        for (const option of options) {
          baseWeights[`${paramName}.${option}`] = 100.0;
        }
      }
    }
    
    // Save weights to database (FIXED for this session)
    const weightRecords = [];
    for (const [key, weight] of Object.entries(baseWeights)) {
      const [paramName, subParam] = key.split('.');
      weightRecords.push({
        session_id: sessionId,
        category: (parameters.metadata && parameters.metadata.category) || 'general',
        parameter_name: paramName,
        sub_parameter: subParam,
        weight: weight
      });
    }
    
    const { error: insertError } = await supabase
      .from('weight_parameters')
      .insert(weightRecords);
    
    if (insertError) throw insertError;
    
    console.log(`✅ Initialized ${weightRecords.length} weight parameters for session`);
    
    return {
      success: true,
      weightsCount: weightRecords.length,
      weights: baseWeights
    };
    
  } catch (error) {
    console.error('❌ Failed to initialize weights:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate learned weights from previous sessions
 * Analyzes all ratings from previous sessions to determine optimal weights
 * 
 * @param {string} projectId - Project ID
 * @param {Object} parameters - Current parameter structure
 * @returns {Object} Calculated weights
 */
async function calculateLearnedWeights(projectId, parameters) {
  console.log('🧠 Calculating learned weights from previous sessions...');
  
  try {
    // Get all ratings from previous sessions in this project
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('project_id', projectId);
    
    if (!sessions || sessions.length === 0) {
      return initializeDefaultWeights(parameters);
    }
    
    const sessionIds = sessions.map(s => s.id);
    
    const { data: ratings, error } = await supabase
      .from('session_ratings')
      .select('*')
      .in('session_id', sessionIds);
    
    if (error) throw error;
    
    if (!ratings || ratings.length === 0) {
      console.log('No ratings found, using default weights');
      return initializeDefaultWeights(parameters);
    }
    
    console.log(`📊 Analyzing ${ratings.length} ratings from previous sessions`);
    
    // Initialize weights
    const weights = initializeDefaultWeights(parameters);
    const parameterStats = {};
    
    // Track usage and ratings for each parameter
    for (const rating of ratings) {
      const usedParams = rating.parameters_used?.parameters || [];
      const ratingValue = rating.rating;
      
      // Weight change based on rating
      const weightChange = {
        '3': 15,   // Super like
        '1': 5,    // Like
        '-1': -5,  // Dislike
        '-3': -15  // Super dislike
      }[ratingValue] || 0;
      
      // Apply to all used parameters
      for (const param of usedParams) {
        const key = `${param.parameter}.${param.value}`;
        
        if (!parameterStats[key]) {
          parameterStats[key] = {
            totalChange: 0,
            timesUsed: 0
          };
        }
        
        parameterStats[key].totalChange += weightChange;
        parameterStats[key].timesUsed += 1;
      }
    }
    
    // Calculate final weights
    for (const [key, stats] of Object.entries(parameterStats)) {
      if (weights[key] !== undefined) {
        // Apply cumulative changes, bounded by [0, 200]
        weights[key] = Math.max(0, Math.min(200, 100 + stats.totalChange));
      }
    }
    
    console.log('✅ Learned weights calculated');
    console.log(`   Parameters analyzed: ${Object.keys(parameterStats).length}`);
    
    // Show top and bottom weights
    const sortedWeights = Object.entries(weights)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    console.log('   🔥 Top 5 weights:', sortedWeights);
    
    return weights;
    
  } catch (error) {
    console.error('Error calculating learned weights:', error);
    return initializeDefaultWeights(parameters);
  }
}

/**
 * Initialize default weights (all = 100)
 */
function initializeDefaultWeights(parameters) {
  const weights = {};
  for (const [paramName, options] of Object.entries(parameters)) {
    if (Array.isArray(options)) {
      for (const option of options) {
        weights[`${paramName}.${option}`] = 100.0;
      }
    }
  }
  return weights;
}

/**
 * Select parameters for generation using weighted random
 * Higher weight = higher probability of selection
 * 
 * @param {string} sessionId - Session ID
 * @param {Object} parameters - Parameter structure
 * @returns {Object} Selected parameters
 */
export async function selectParametersWeighted(sessionId, parameters) {
  console.log('\n🎲 SELECTING PARAMETERS (Weighted Random)');
  
  try {
    // Get weights for this session
    const { data: weights, error } = await supabase
      .from('weight_parameters')
      .select('*')
      .eq('session_id', sessionId);
    
    if (error) throw error;
    
    // Convert to lookup object
    const weightLookup = {};
    for (const w of weights) {
      const key = `${w.parameter_name}.${w.sub_parameter}`;
      weightLookup[key] = w.weight;
    }
    
    const selected = {};
    
    // Select one option from each parameter category
    for (const [paramName, options] of Object.entries(parameters)) {
      if (!Array.isArray(options)) continue;
      
      // Get weights for this parameter's options
      const optionWeights = options.map(opt => {
        const key = `${paramName}.${opt}`;
        return weightLookup[key] || 100;
      });
      
      // Weighted random selection
      const totalWeight = optionWeights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;
      
      let selectedOption = options[0]; // fallback
      for (let i = 0; i < options.length; i++) {
        random -= optionWeights[i];
        if (random <= 0) {
          selectedOption = options[i];
          break;
        }
      }
      
      selected[paramName] = {
        value: selectedOption,
        weight: weightLookup[`${paramName}.${selectedOption}`] || 100
      };
    }
    
    console.log('✅ Parameters selected:', Object.keys(selected).length);
    
    return {
      success: true,
      selected
    };
    
  } catch (error) {
    console.error('❌ Failed to select parameters:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get session weights visualization data
 */
export async function getSessionWeightsVisualization(sessionId) {
  try {
    const { data: weights, error } = await supabase
      .from('weight_parameters')
      .select('*')
      .eq('session_id', sessionId)
      .order('weight', { ascending: false });
    
    if (error) throw error;
    
    // Group by parameter
    const grouped = {};
    for (const w of weights) {
      if (!grouped[w.parameter_name]) {
        grouped[w.parameter_name] = [];
      }
      grouped[w.parameter_name].push({
        sub_parameter: w.sub_parameter,
        weight: w.weight,
        times_used: w.times_used
      });
    }
    
    // Get top and bottom 10
    const sorted = weights.sort((a, b) => b.weight - a.weight);
    const top10 = sorted.slice(0, 10);
    const bottom10 = sorted.slice(-10);
    
    return {
      success: true,
      data: {
        grouped,
        top10,
        bottom10,
        stats: {
          total: weights.length,
          avgWeight: weights.reduce((sum, w) => sum + w.weight, 0) / weights.length,
          minWeight: sorted[sorted.length - 1]?.weight || 0,
          maxWeight: sorted[0]?.weight || 0
        }
      }
    };
    
  } catch (error) {
    console.error('Failed to get weights visualization:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  createParametersForCategory,
  initializeSessionWeights,
  selectParametersWeighted,
  getSessionWeightsVisualization
};
