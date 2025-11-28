import express from 'express';
import { supabase } from '../db/supabase.js';
import { selectParametersWeighted, updateWeightsInstantly } from '../services/weights.service.js';
import { buildPromptFromParameters } from '../services/agent.service.js';
import { generateImage as generateImageReplicate } from '../services/replicate.service.js';
import { generateImage as generateImageGenSpark } from '../services/genspark.service.js';
import { MODELS_CONFIG, getModelsForType } from '../config/models.js';

const router = express.Router();

/**
 * GET /api/generation/models
 * Get available models for content generation
 * 
 * Query params:
 *   type: 'image' | 'video' | 'audio' | 'text' (optional)
 */
router.get('/models', (req, res) => {
  try {
    const { type } = req.query;
    
    if (type) {
      const models = getModelsForType(type);
      return res.json({ success: true, type, models });
    }
    
    // Return all models if no type specified
    return res.json({ 
      success: true, 
      models: MODELS_CONFIG 
    });
  } catch (error) {
    console.error('❌ Error getting models:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/generation/generate
 * Generate content with weight-based parameter selection
 * 
 * Body: {
 *   sessionId: string,
 *   projectId: string,
 *   userId: string,
 *   userPrompt: string,
 *   count: number (default 1),
 *   model: string (default 'nano-banana-pro')
 * }
 */
router.post('/generate', async (req, res) => {
  try {
    const { 
      sessionId, 
      projectId, 
      userId, 
      userPrompt, 
      count = 1,
      model = 'seedream-4'
    } = req.body;
    
    if (!sessionId || !projectId || !userId || !userPrompt) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, projectId, userId, and userPrompt are required'
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🚀 GENERATION REQUEST - V3');
    console.log('='.repeat(80));
    console.log('Session ID:', sessionId);
    console.log('Project ID:', projectId);
    console.log('User Prompt:', userPrompt);
    console.log('Count:', count);
    console.log('Model:', model);
    
    // Get session info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) throw sessionError;
    
    // Get project info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError) throw projectError;
    
    const category = project.tag;
    const agentType = category === 'dating' ? 'dating' : 'general';
    
    console.log('📊 Context:');
    console.log('   Category:', category);
    console.log('   Agent:', agentType);
    
    // Get session parameters
    const { data: weights, error: weightsError } = await supabase
      .from('weight_parameters')
      .select('*')
      .eq('session_id', sessionId);
    
    if (weightsError) throw weightsError;
    
    if (!weights || weights.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Session has no parameters. Was it created properly?'
      });
    }
    
    // Group parameters
    const parameters = {};
    for (const w of weights) {
      if (!parameters[w.parameter_name]) {
        parameters[w.parameter_name] = [];
      }
      parameters[w.parameter_name].push(w.sub_parameter);
    }
    
    console.log('⚖️  Session has', Object.keys(parameters).length, 'parameter categories');
    
    // Generate multiple items
    const results = [];
    
    for (let i = 0; i < count; i++) {
      console.log(`\n--- GENERATION ${i + 1}/${count} ---`);
      
      try {
        // Step 1: Select parameters (weighted random)
        const selectionResult = await selectParametersWeighted(sessionId, parameters);
        
        if (!selectionResult.success) {
          throw new Error('Failed to select parameters: ' + selectionResult.error);
        }
        
        const selectedParams = selectionResult.selected;
        
        console.log('✅ Parameters selected:', Object.keys(selectedParams).length);
        
        // Step 2: Build prompt with agent
        const promptResult = await buildPromptFromParameters(
          userPrompt,
          selectedParams,
          agentType,
          category,
          sessionId  // 🔥 Pass sessionId for comments loading
        );
        
        if (!promptResult.success) {
          throw new Error('Failed to build prompt: ' + promptResult.error);
        }
        
        const enhancedPrompt = promptResult.prompt;
        
        // Step 3: Generate image
        console.log('🎨 Generating image with', model);
        
        // All models now use Replicate (including nano-banana-pro)
        const generationResult = await generateImageReplicate(
          enhancedPrompt,
          { modelKey: model },
          userId
        );
        
        if (!generationResult.success) {
          throw new Error('Generation failed: ' + generationResult.error);
        }
        
        // Step 4: Save to database
        const weightsSnapshot = {
          category: category,
          parameters: Object.entries(selectedParams).map(([param, data]) => ({
            parameter: param,
            value: data.value,
            weight: data.weight
          }))
        };
        
        const { data: content, error: contentError } = await supabase
          .from('content_v3')
          .insert([{
            session_id: sessionId,
            project_id: projectId,
            user_id: userId,
            url: generationResult.url,
            type: 'image',
            original_prompt: userPrompt,
            enhanced_prompt: enhancedPrompt,
            final_prompt: enhancedPrompt,
            model: model,
            agent_type: agentType,
            weights_used: weightsSnapshot
          }])
          .select()
          .single();
        
        if (contentError) throw contentError;
        
        console.log('✅ Content saved:', content.id);
        
        results.push({
          success: true,
          content,
          url: generationResult.url,
          parametersUsed: selectedParams
        });
        
      } catch (error) {
        console.error(`❌ Generation ${i + 1} failed:`, error);
        results.push({
          success: false,
          error: error.message
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 GENERATION COMPLETE');
    console.log('   Total:', count);
    console.log('   Successful:', successful);
    console.log('   Failed:', failed);
    console.log('='.repeat(80) + '\n');
    
    res.json({
      success: failed === 0,
      total: count,
      successful,
      failed,
      results
    });
    
  } catch (error) {
    console.error('❌ Generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/generation/rate
 * Rate generated content and track for weight learning
 * 
 * Body: {
 *   contentId: string,
 *   rating: number (-3, -1, 1, 3),
 *   comment?: string
 * }
 */
router.post('/rate', async (req, res) => {
  try {
    const { contentId, rating, comment } = req.body;
    
    if (!contentId || rating === undefined) {
      return res.status(400).json({
        success: false,
        error: 'contentId and rating are required'
      });
    }
    
    if (![- 3, -1, 1, 3].includes(rating)) {
      return res.status(400).json({
        success: false,
        error: 'rating must be -3, -1, 1, or 3'
      });
    }
    
    console.log('\n⭐ RATING CONTENT');
    console.log('Content ID:', contentId);
    console.log('Rating:', rating);
    
    // Update content with rating
    const { data: content, error } = await supabase
      .from('content_v3')
      .update({
        rating: rating,
        comment: comment || null,
        rated_at: new Date().toISOString()
      })
      .eq('id', contentId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Rating saved');
    
    // 🔥 INSTANT WEIGHT UPDATE (method.txt approach)
    const weightUpdateResult = await updateWeightsInstantly(contentId, rating);
    
    if (weightUpdateResult.success) {
      console.log(`✅ Weights updated instantly: ${weightUpdateResult.updatesCount} parameters`);
    } else {
      console.warn('⚠️  Weight update failed:', weightUpdateResult.error);
    }
    
    res.json({
      success: true,
      data: content,
      weightsUpdated: weightUpdateResult.success,
      updatesCount: weightUpdateResult.updatesCount
    });
    
  } catch (error) {
    console.error('❌ Rating error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate with Nano Banana Pro (GenSpark)
 * This is a placeholder - you'll need to integrate with GenSpark API
 */
async function generateWithNanoBananaPro(prompt) {
  console.log('🍌 Using Nano Banana Pro');
  
  // TODO: Integrate with GenSpark API
  // For now, fallback to Replicate
  console.warn('⚠️  GenSpark integration not yet implemented, using Seedream 4 fallback');
  
  return await generateImageReplicate(prompt, { modelKey: 'seedream-4' }, 'system');
}

/**
 * GET /api/generation/gallery
 * Get all generated content for a session
 */
router.get('/gallery', async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const { data: content, error } = await supabase
      .from('content_v3')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Get statistics
    const rated = content.filter(c => c.rating !== null);
    const avgRating = rated.length > 0
      ? rated.reduce((sum, c) => sum + c.rating, 0) / rated.length
      : 0;
    
    res.json({
      success: true,
      data: content,
      stats: {
        total: content.length,
        rated: rated.length,
        unrated: content.length - rated.length,
        avgRating: parseFloat(avgRating.toFixed(2))
      }
    });
    
  } catch (error) {
    console.error('Gallery error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
