import { supabase } from '../db/supabase.js';
import OpenAI from 'openai';
import config from '../config/index.js';
import { DATING_PARAMETERS } from '../config/dating-parameters.js';

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
  console.log('\n🤖 CREATING PARAMETERS FOR CATEGORY');
  console.log('Category:', category);
  console.log('User Prompt:', userPrompt);
  
  // 🎯 SPECIAL CASE: Dating uses fixed MASTER PROMPT parameters
  if (category === 'dating') {
    console.log('✅ Using FIXED Dating Parameters (MASTER PROMPT based)');
    return {
      success: true,
      parameters: DATING_PARAMETERS,
      metadata: {
        category: 'dating',
        categoriesCount: Object.keys(DATING_PARAMETERS).length,
        totalSubParameters: Object.values(DATING_PARAMETERS).reduce((sum, arr) => sum + arr.length, 0),
        type: 'fixed',
        source: 'MASTER_PROMPT'
      }
    };
  }
  
  // For other categories: use UNIVERSAL PARAMETERS for flexibility
  try {
    const systemPrompt = `You are an AI parameter architect for a GENERAL-PURPOSE content generation system.

🎯 GOAL: Create UNIVERSAL parameters that work for ANY content category.

WHY UNIVERSAL?
- Users generate different content (cars, food, dating, insurance, real estate)
- Learning must transfer between categories
- Same parameters = accumulated experience across all sessions

CRITICAL REQUIREMENTS:
- Create EXACTLY 12 UNIVERSAL parameter categories
- Each category must have 5-6 sub-parameters AS AN ARRAY
- Total parameters: 60-72 (12*5 minimum, 12*6 maximum)
- Parameters must be CONTENT-AGNOSTIC (work for anything)
- Sub-parameters should be diverse and universal
- IMPORTANT: Each category value MUST be an array of strings, NOT nested objects

UNIVERSAL PARAMETER STRUCTURE (use this as base):

{
  "subject_type": ["person", "vehicle", "product", "food", "interior", "landscape"],
  "composition": ["centered", "rule_of_thirds", "symmetrical", "asymmetric", "dynamic"],
  "lighting": ["natural_soft", "golden_hour", "studio_bright", "dramatic_shadow", "evening", "backlit"],
  "color_palette": ["warm_tones", "cool_tones", "vibrant", "muted", "monochrome", "pastel"],
  "mood": ["professional", "casual", "dramatic", "playful", "elegant", "energetic"],
  "setting": ["indoor", "outdoor", "urban", "nature", "studio", "minimal"],
  "camera_angle": ["eye_level", "low_angle", "high_angle", "birds_eye", "worm_view"],
  "depth_of_field": ["shallow_bokeh", "medium", "deep_focus", "selective", "tilt_shift"],
  "visual_style": ["realistic", "artistic", "minimal", "luxury", "editorial", "candid"],
  "time_of_day": ["morning", "afternoon", "golden_hour", "evening", "night", "blue_hour"],
  "texture_quality": ["smooth", "rough", "glossy", "matte", "soft", "sharp"],
  "framing": ["close_up", "medium_shot", "wide_shot", "extreme_close_up", "full_body"]
}

CONTEXT HINT: User is generating "${category}" content.
- Adjust subject_type options to include relevant subjects (e.g., "vehicle" for automotive)
- Keep all other parameters UNIVERSAL and content-agnostic
- Do NOT create category-specific parameters like "vehicle_brand" or "food_type"

WHY THIS WORKS:
✅ Cars: subject_type=vehicle, composition=centered, lighting=golden_hour
✅ Food: subject_type=food, composition=rule_of_thirds, lighting=natural_soft
✅ Dating: subject_type=person, mood=casual, setting=outdoor
✅ Insurance: subject_type=vehicle, mood=professional, visual_style=realistic

Return ONLY valid JSON with 12 universal categories, each having an ARRAY of 5-6 options.`;

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

    let parameters = JSON.parse(response.choices[0].message.content);
    
    // 🔧 FIX: Normalize structure - convert nested objects to arrays
    const normalizedParams = {};
    for (const [cat, value] of Object.entries(parameters)) {
      if (cat === 'metadata') continue; // Skip metadata if present
      
      if (Array.isArray(value)) {
        // Already an array - good!
        normalizedParams[cat] = value;
      } else if (typeof value === 'object' && value !== null) {
        // Nested object - extract values as array
        console.warn(`⚠️ Category "${cat}" is nested object, extracting values...`);
        normalizedParams[cat] = Object.values(value);
      } else {
        // Single value - wrap in array
        console.warn(`⚠️ Category "${cat}" is single value, wrapping...`);
        normalizedParams[cat] = [value];
      }
    }
    
    parameters = normalizedParams;
    
    // Validate structure
    const categoryCount = Object.keys(parameters).length;
    if (categoryCount < 11 || categoryCount > 14) {
      console.warn(`⚠️ Parameter count ${categoryCount} outside range 11-14. Adjusting...`);
    }
    
    // Validate sub-parameters
    for (const [cat, options] of Object.entries(parameters)) {
      if (!Array.isArray(options)) {
        console.error(`❌ Category "${cat}" is not an array after normalization!`);
        continue;
      }
      if (options.length < 4 || options.length > 6) {
        console.warn(`⚠️ Category "${cat}" has ${options.length} options (should be 4-6)`);
      }
    }
    
    console.log('✅ Dynamic Parameters created:');
    console.log(`   Categories: ${Object.keys(parameters).length}`);
    console.log(`   Total sub-parameters: ${Object.values(parameters).reduce((sum, arr) => sum + arr.length, 0)}`);
    
    return {
      success: true,
      parameters,
      metadata: {
        category,
        categoriesCount: categoryCount,
        totalSubParameters: Object.values(parameters).reduce((sum, arr) => sum + arr.length, 0),
        type: 'dynamic',
        source: 'GPT-4o'
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
      // Check if parameters is object with options (dating) or different format (general)
      if (parameters && typeof parameters === 'object') {
        console.log('🔍 Processing parameters for weights:', Object.keys(parameters));
        for (const [paramName, options] of Object.entries(parameters)) {
          // Skip metadata
          if (paramName === 'metadata') continue;
          
          console.log(`  📌 ${paramName}: ${typeof options} = ${Array.isArray(options) ? `[${options.length} items]` : options}`);
          
          // If options is array (dating parameters)
          if (Array.isArray(options)) {
            for (const option of options) {
              baseWeights[`${paramName}.${option}`] = 100.0;
              console.log(`     ✅ Created weight: ${paramName}.${option}`);
            }
          } else {
            // For general mode or single value parameters (store as paramName.value)
            const key = `${paramName}.${options}`;
            baseWeights[key] = 100.0;
            console.log(`     ✅ Created weight: ${key}`);
          }
        }
        console.log(`🎯 Total baseWeights created: ${Object.keys(baseWeights).length}`);
      } else {
        console.log('⚠️ Parameters is not a valid object:', typeof parameters);
      }
    }
    
    // Save weights to database (FIXED for this session)
    const weightRecords = [];
    for (const [key, weight] of Object.entries(baseWeights)) {
      const parts = key.split('.');
      const paramName = parts[0];
      const subParam = parts.length > 1 ? parts[1] : parts[0]; // Use paramName if no sub_parameter
      
      weightRecords.push({
        session_id: sessionId,
        category: (parameters.metadata?.category && typeof parameters.metadata.category === 'string') 
          ? parameters.metadata.category 
          : 'general',
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
      // Skip metadata
      if (paramName === 'metadata') continue;
      
      // Handle BOTH formats:
      // Dating AI: {style: ["realistic", "artistic"]} - select from array
      // General AI: {style: "realistic"} - use value directly
      
      if (Array.isArray(options)) {
        // Dating AI: Weighted random selection from array
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
      } else {
        // General AI: Use value directly (already set)
        const key = `${paramName}.${options}`;
        selected[paramName] = {
          value: options,
          weight: weightLookup[key] || 100
        };
      }
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

/**
 * Update weights instantly after rating (method.txt approach)
 * Apply rating to ALL parameters that were used in the prompt
 * 
 * @param {string} contentId - Content ID that was rated
 * @param {number} rating - Rating score: -3, -1, +1, +3
 */
export async function updateWeightsInstantly(contentId, rating) {
  console.log(`\n⚖️  INSTANT WEIGHT UPDATE`);
  console.log(`Content ID: ${contentId}`);
  console.log(`Rating: ${rating}`);
  
  try {
    // Step 1: Get content with weights_used
    const { data: content, error: contentError } = await supabase
      .from('content_v3')
      .select('session_id, weights_used')
      .eq('id', contentId)
      .single();
    
    if (contentError) throw contentError;
    
    if (!content || !content.weights_used || !content.weights_used.parameters) {
      console.log('⚠️  No weights snapshot found for this content');
      return { success: false, error: 'No weights data' };
    }
    
    const sessionId = content.session_id;
    const parameters = content.weights_used.parameters;
    
    console.log(`📊 Updating ${parameters.length} parameters`);
    
    // Step 2: Calculate weight delta based on rating
    // -3 → -15, -1 → -5, +1 → +5, +3 → +15
    const weightDelta = rating * 5;
    
    console.log(`📈 Weight delta: ${weightDelta > 0 ? '+' : ''}${weightDelta}`);
    
    // Step 3: Update each parameter that was used in this generation
    const updates = [];
    
    for (const param of parameters) {
      const { parameter, value } = param;
      
      // Get current weight
      const { data: currentWeight, error: getError } = await supabase
        .from('weight_parameters')
        .select('weight')
        .eq('session_id', sessionId)
        .eq('parameter_name', parameter)
        .eq('sub_parameter', value)
        .single();
      
      if (getError) {
        console.error(`Error getting weight for ${parameter}.${value}:`, getError);
        continue;
      }
      
      // Calculate new weight (clamp between 0 and 200)
      const newWeight = Math.max(0, Math.min(200, currentWeight.weight + weightDelta));
      
      // Update in database
      const { error: updateError } = await supabase
        .from('weight_parameters')
        .update({ weight: newWeight })
        .eq('session_id', sessionId)
        .eq('parameter_name', parameter)
        .eq('sub_parameter', value);
      
      if (updateError) {
        console.error(`Error updating weight for ${parameter}.${value}:`, updateError);
      } else {
        updates.push({
          parameter: `${parameter}.${value}`,
          oldWeight: currentWeight.weight,
          newWeight: newWeight,
          delta: weightDelta
        });
      }
    }
    
    console.log(`✅ Updated ${updates.length} weights`);
    
    // Show top changes
    if (updates.length > 0) {
      console.log('📊 Weight changes:');
      updates.slice(0, 5).forEach(u => {
        console.log(`   ${u.parameter}: ${u.oldWeight} → ${u.newWeight} (${u.delta > 0 ? '+' : ''}${u.delta})`);
      });
    }
    
    return {
      success: true,
      updatesCount: updates.length,
      weightDelta: weightDelta,
      updates: updates
    };
    
  } catch (error) {
    console.error('Error updating weights instantly:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get weight history for a session
 * Shows how weights changed over time based on ratings
 * 
 * @param {string} sessionId 
 * @returns {Object} History of weight changes
 */
export async function getWeightHistory(sessionId) {
  try {
    console.log('📊 Getting weight history for session:', sessionId);
    
    // Get all rated content for this session with timestamps
    const { data: ratedContent, error: contentError } = await supabase
      .from('content_v3')
      .select('id, rating, comment, rated_at, weights_used, created_at')
      .eq('session_id', sessionId)
      .not('rating', 'is', null)
      .order('rated_at', { ascending: true });
    
    if (contentError) throw contentError;
    
    if (!ratedContent || ratedContent.length === 0) {
      return {
        success: true,
        data: {
          history: [],
          parameters: [],
          snapshots: []
        }
      };
    }
    
    // Get current weights
    const { data: currentWeights, error: weightsError } = await supabase
      .from('weight_parameters')
      .select('parameter_name, sub_parameter, weight')
      .eq('session_id', sessionId);
    
    if (weightsError) throw weightsError;
    
    // Build weight lookup
    const weightLookup = {};
    for (const w of currentWeights) {
      const key = `${w.parameter_name}.${w.sub_parameter}`;
      weightLookup[key] = w.weight;
    }
    
    // Collect all unique parameters
    const allParameters = new Set();
    for (const content of ratedContent) {
      if (content.weights_used?.parameters) {
        for (const param of content.weights_used.parameters) {
          const key = `${param.parameter}.${param.value}`;
          allParameters.add(key);
        }
      }
    }
    
    // Simulate weight changes over time
    // Start with initial weight 100 for all
    const weightHistory = {};
    for (const param of allParameters) {
      weightHistory[param] = [{ timestamp: ratedContent[0].created_at, weight: 100, rating: null }];
    }
    
    // Process each rating chronologically
    for (const content of ratedContent) {
      if (!content.weights_used?.parameters) continue;
      
      const rating = content.rating;
      const delta = rating * 5; // -3→-15, -1→-5, +1→+5, +3→+15
      const timestamp = content.rated_at || content.created_at;
      
      // Update weights for parameters used in this content
      for (const param of content.weights_used.parameters) {
        const key = `${param.parameter}.${param.value}`;
        
        // Get last weight
        const history = weightHistory[key] || [{ timestamp: content.created_at, weight: 100 }];
        const lastWeight = history[history.length - 1].weight;
        
        // Calculate new weight (clamped 0-200)
        const newWeight = Math.max(0, Math.min(200, lastWeight + delta));
        
        // Add to history
        if (!weightHistory[key]) {
          weightHistory[key] = [{ timestamp: content.created_at, weight: 100, rating: null }];
        }
        
        weightHistory[key].push({
          timestamp: timestamp,
          weight: newWeight,
          rating: rating,
          contentId: content.id,
          comment: content.comment
        });
      }
    }
    
    // Convert to array format for charting
    const parameters = Array.from(allParameters).sort();
    const snapshots = ratedContent.map((content, index) => ({
      index: index + 1,
      timestamp: content.rated_at || content.created_at,
      rating: content.rating,
      comment: content.comment,
      contentId: content.id
    }));
    
    console.log(`✅ Weight history generated: ${parameters.length} parameters, ${snapshots.length} snapshots`);
    
    return {
      success: true,
      data: {
        parameters: parameters, // ['lighting.natural', 'pose.sitting', ...]
        history: weightHistory, // { 'lighting.natural': [{timestamp, weight, rating}, ...], ... }
        snapshots: snapshots,   // [{index, timestamp, rating, comment}, ...]
        currentWeights: weightLookup
      }
    };
    
  } catch (error) {
    console.error('Failed to get weight history:', error);
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
  getSessionWeightsVisualization,
  updateWeightsInstantly,
  getWeightHistory
};
