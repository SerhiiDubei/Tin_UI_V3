import { supabase } from '../db/supabase.js';

/**
 * 🔥 HYBRID WEIGHTS SERVICE
 * 
 * Weighted learning БЕЗ обмежень:
 * - Параметри створюються динамічно GPT-4o
 * - Зберігаються в БД з вагами
 * - Навчається з кожної оцінки
 * - Немає фіксованого списку!
 */

/**
 * Save parameters from generation for weighted learning
 * Зберігає параметри які GPT-4o використав
 * 
 * @param {string} sessionId - Session ID
 * @param {Object} parameters - Parameters від GPT-4o
 * @returns {Object} Success status
 */
export async function saveGenerationParameters(sessionId, parameters) {
  console.log('\n💾 SAVING GENERATION PARAMETERS (HYBRID)');
  console.log('Session ID:', sessionId);
  console.log('Parameters:', Object.keys(parameters).length);
  
  if (!parameters || Object.keys(parameters).length === 0) {
    console.warn('⚠️ No parameters to save');
    return { success: false, error: 'No parameters provided' };
  }
  
  try {
    const parametersToInsert = [];
    
    // Convert parameters to weight_parameters format
    for (const [paramName, value] of Object.entries(parameters)) {
      // Skip arrays і special fields
      if (Array.isArray(value) || paramName === 'imperfections') {
        // Handle arrays (e.g., imperfections)
        if (Array.isArray(value)) {
          for (const item of value) {
            parametersToInsert.push({
              session_id: sessionId,
              parameter_name: paramName,
              sub_parameter: String(item),
              weight: 100.0  // Default weight
            });
          }
        }
        continue;
      }
      
      parametersToInsert.push({
        session_id: sessionId,
        parameter_name: paramName,
        sub_parameter: String(value),
        weight: 100.0  // Default weight для нових параметрів
      });
    }
    
    console.log('📝 Parameters to insert:', parametersToInsert.length);
    
    // Check if parameters already exist
    for (const param of parametersToInsert) {
      const { data: existing } = await supabase
        .from('weight_parameters')
        .select('id, weight')
        .eq('session_id', sessionId)
        .eq('parameter_name', param.parameter_name)
        .eq('sub_parameter', param.sub_parameter)
        .single();
      
      if (existing) {
        // Параметр вже існує - skip (вага оновиться при rating)
        console.log(`  ✓ Exists: ${param.parameter_name}.${param.sub_parameter} (weight: ${existing.weight})`);
      } else {
        // Новий параметр - insert
        const { error } = await supabase
          .from('weight_parameters')
          .insert([param]);
        
        if (error) {
          console.error(`  ❌ Failed to insert: ${param.parameter_name}.${param.sub_parameter}`, error.message);
        } else {
          console.log(`  ✅ Inserted: ${param.parameter_name}.${param.sub_parameter} (weight: 100)`);
        }
      }
    }
    
    console.log('✅ Parameters saved successfully');
    
    return {
      success: true,
      parametersProcessed: parametersToInsert.length
    };
    
  } catch (error) {
    console.error('❌ Failed to save parameters:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update weights based on rating (INSTANT)
 * Оновлює ваги ВСІх параметрів що використовувались у генерації
 * 
 * @param {string} contentId - Content ID
 * @param {number} rating - Rating (-3, -1, 0, +1, +3)
 * @returns {Object} Update result
 */
export async function updateWeightsInstantly(contentId, rating) {
  console.log('\n⚡ INSTANT WEIGHT UPDATE (HYBRID)');
  console.log('Content ID:', contentId);
  console.log('Rating:', rating);
  
  try {
    // 1. Get content with weights snapshot
    const { data: content, error: contentError } = await supabase
      .from('content_v3')
      .select('session_id, weights_used')
      .eq('id', contentId)
      .single();
    
    if (contentError) throw contentError;
    
    if (!content || !content.weights_used || !content.weights_used.parameters) {
      console.log('⚠️ No weights snapshot found');
      return { success: false, error: 'No weights data' };
    }
    
    const sessionId = content.session_id;
    const usedParams = content.weights_used.parameters;
    
    console.log(`📊 Updating ${usedParams.length} parameters`);
    
    // 2. Calculate weight delta
    const weightDelta = rating * 5;  // -3→-15, -1→-5, +1→+5, +3→+15
    
    console.log(`📈 Weight delta: ${weightDelta > 0 ? '+' : ''}${weightDelta}`);
    
    // 3. Update each parameter's weight
    const updates = [];
    
    for (const param of usedParams) {
      const paramName = param.parameter;
      const paramValue = param.value;
      
      // Get current weight
      const { data: currentWeight } = await supabase
        .from('weight_parameters')
        .select('id, weight')
        .eq('session_id', sessionId)
        .eq('parameter_name', paramName)
        .eq('sub_parameter', paramValue)
        .single();
      
      if (!currentWeight) {
        console.warn(`  ⚠️ Parameter not found: ${paramName}.${paramValue}`);
        continue;
      }
      
      // Calculate new weight (clamped 0-200)
      const oldWeight = currentWeight.weight;
      const newWeight = Math.max(0, Math.min(200, oldWeight + weightDelta));
      
      // Update in DB
      const { error: updateError } = await supabase
        .from('weight_parameters')
        .update({ weight: newWeight })
        .eq('id', currentWeight.id);
      
      if (updateError) {
        console.error(`  ❌ Failed to update: ${paramName}.${paramValue}`, updateError.message);
      } else {
        console.log(`  ✅ ${paramName}.${paramValue}: ${Math.round(oldWeight)} → ${Math.round(newWeight)} (${weightDelta > 0 ? '+' : ''}${weightDelta})`);
        
        updates.push({
          parameter: paramName,
          value: paramValue,
          oldWeight,
          newWeight,
          delta: weightDelta
        });
      }
    }
    
    console.log(`✅ Updated ${updates.length} parameters`);
    
    return {
      success: true,
      updatesApplied: updates.length,
      updates
    };
    
  } catch (error) {
    console.error('❌ Weight update failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get weight history for visualization
 */
export async function getWeightHistory(sessionId) {
  console.log('\n📊 FETCHING WEIGHT HISTORY');
  console.log('Session ID:', sessionId);
  
  try {
    // Get all content with ratings
    const { data: content, error } = await supabase
      .from('content_v3')
      .select('id, rating, weights_used, created_at')
      .eq('session_id', sessionId)
      .not('rating', 'is', null)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    if (!content || content.length === 0) {
      return {
        success: true,
        history: [],
        message: 'No rated content yet'
      };
    }
    
    // Build history timeline
    const history = [];
    const parameterTimeline = {};
    
    for (const item of content) {
      if (!item.weights_used || !item.weights_used.parameters) continue;
      
      const timestamp = new Date(item.created_at).getTime();
      const rating = item.rating;
      const weightDelta = rating * 5;
      
      for (const param of item.weights_used.parameters) {
        const key = `${param.parameter}.${param.value}`;
        
        if (!parameterTimeline[key]) {
          parameterTimeline[key] = {
            parameter: param.parameter,
            value: param.value,
            points: []
          };
        }
        
        // Calculate cumulative weight
        const lastPoint = parameterTimeline[key].points[parameterTimeline[key].points.length - 1];
        const currentWeight = lastPoint ? lastPoint.weight + weightDelta : 100 + weightDelta;
        
        parameterTimeline[key].points.push({
          timestamp,
          weight: Math.max(0, Math.min(200, currentWeight)),
          rating,
          delta: weightDelta
        });
      }
    }
    
    // Convert to array
    for (const [key, data] of Object.entries(parameterTimeline)) {
      history.push(data);
    }
    
    console.log(`✅ History built: ${history.length} parameters tracked`);
    
    return {
      success: true,
      history,
      totalRatings: content.length
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
  saveGenerationParameters,
  updateWeightsInstantly,
  getWeightHistory
};




