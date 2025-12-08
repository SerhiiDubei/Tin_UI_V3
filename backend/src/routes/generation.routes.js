import express from 'express';
import { supabase } from '../db/supabase.js';
import { selectParametersWeighted, updateWeightsInstantly, initializeSessionWeights } from '../services/weights.service.js';
import { buildPromptFromParameters } from '../services/agent.service.js';
import { buildPromptHybrid } from '../services/agent-hybrid.service.js';
import agentGeneral from '../services/agent-general.service.js';
import agentAdReplicator from '../services/agent-ad-replicator.service.js';

const { buildPromptGeneral } = agentGeneral;
const { buildAdCreatives } = agentAdReplicator;
import { generateImage as generateImageReplicate } from '../services/replicate.service.js';
import { generateImage as generateImageGenSpark } from '../services/genspark.service.js';
import { MODELS_CONFIG, getModelsForType } from '../config/models.js';
import { quickValidate } from '../services/qa-agent.service.js';

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
      model = 'seedream-4',
      enableQA = false,  // Optional QA validation
      mode = 'text-to-image',  // 🎨 General AI mode
      modeInputs = {}  // 🎨 General AI mode inputs (reference images, etc.)
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
    
    // 🎯 PARAMETERS HANDLING:
    // - Dating: Parameters exist (11 fixed params created on session creation)
    // - General: Parameters created dynamically on first generation
    
    let parameters = {};
    
    if (!weights || weights.length === 0) {
      if (agentType === 'dating') {
        // Dating projects MUST have parameters
      return res.status(400).json({
        success: false,
          error: 'Dating session has no parameters. Was it created properly?'
      });
      } else {
        // General projects: Create parameters dynamically on first generation
        console.log('🎨 General project: Creating parameters dynamically...');
        console.log('   - User prompt:', userPrompt);
        console.log('   - Mode:', mode);
        console.log('   - Reference images:', modeInputs?.referenceImages?.length || 0);
        
        // Create dynamic parameters based on input
        const dynamicParams = await createDynamicParametersGeneral(
          sessionId,
          projectId,
          userPrompt,
          mode,
          modeInputs
        );
        
        parameters = dynamicParams;
        console.log('✅ Created dynamic parameters:', Object.keys(parameters));
      }
    } else {
      // Group existing parameters (dating format)
    for (const w of weights) {
      if (!parameters[w.parameter_name]) {
        parameters[w.parameter_name] = [];
      }
      parameters[w.parameter_name].push(w.sub_parameter);
    }
    console.log('⚖️  Session has', Object.keys(parameters).length, 'parameter categories');
    }
    
    // 🚀 PARALLEL GENERATION - Generate all items simultaneously
    console.log(`\n🔥 Starting PARALLEL generation of ${count} items...`);
    
    // Create array of generation promises
    const generationPromises = [];
    
    for (let i = 0; i < count; i++) {
      generationPromises.push(
        (async () => {
          const itemNumber = i + 1;
          console.log(`\n--- STARTING GENERATION ${itemNumber}/${count} ---`);
          
          try {
            // Step 1: Select parameters (weighted random)
            const selectionResult = await selectParametersWeighted(sessionId, parameters);
            
            if (!selectionResult.success) {
              throw new Error('Failed to select parameters: ' + selectionResult.error);
            }
            
            const selectedParams = selectionResult.selected;
            
            console.log(`✅ [${itemNumber}/${count}] Parameters selected:`, Object.keys(selectedParams).length);
            
            // Step 2: Build prompt with agent (🎨 Agent Selection)
            let promptResult;
            
            if (agentType === 'dating') {
              // 💝 Dating Photo Expert (existing agent)
              console.log(`🎨 Using Dating Photo Expert (Hybrid)`);
              promptResult = await buildPromptHybrid(
              userPrompt,
              agentType,
              category,
                sessionId
              );
            } else if (mode === 'ad-replicator') {
              // 🎯 Ad Creative Replicator (special mode)
              console.log(`🎯 Using Ad Creative Replicator`);
              console.log(`   Reference Images: ${modeInputs.reference_images?.length || 0}`);
              
              // Ad Replicator returns MULTIPLE variations, not single prompt
              // We'll handle this specially
              const adResult = await buildAdCreatives(
                userPrompt,
                modeInputs.reference_images || [],
                {
                  niche: modeInputs.niche,
                  targetAudience: modeInputs.target_audience,
                  platform: modeInputs.platform,
                  variations: count  // Use count as number of variations
                }
              );
              
              if (!adResult.success) {
                throw new Error('Ad Replicator failed: ' + adResult.error);
              }
              
              // For ad-replicator, we'll generate ONE image per iteration
              // and use the variation's prompt
              const variationIndex = (itemNumber - 1) % adResult.variations.length;
              const variation = adResult.variations[variationIndex];
              
              promptResult = {
                success: true,
                prompt: variation.prompt,
                originalPrompt: userPrompt,
                parameters: {
                  mode: 'ad-replicator',
                  creative_type: variation.creative_type,
                  strategy_notes: variation.strategy_notes,
                  ...variation.technical_params
                },
                metadata: {
                  approach: 'ad-replicator',
                  variationId: variation.creative_id,
                  analysisSummary: adResult.analysisSummary,
                  ...adResult.metadata
                }
              };
              
            } else {
              // 🎨 General Purpose AI (other modes)
              console.log(`🎨 Using General Purpose AI (Mode: ${mode})`);
              promptResult = await buildPromptGeneral(
                userPrompt,
                mode,
                modeInputs,
                sessionId
              );
            }
            
            if (!promptResult.success) {
              throw new Error('Failed to build prompt: ' + promptResult.error);
            }
            
            const enhancedPrompt = promptResult.prompt;
            
            // Step 2.5: QA Validation (Optional)
            let qaResult = null;
            if (enableQA) {
              console.log(`🔍 [${itemNumber}/${count}] Running QA validation...`);
              qaResult = await quickValidate(enhancedPrompt, agentType, model);
              
              if (qaResult.success) {
                console.log(`📊 [${itemNumber}/${count}] QA Score: ${qaResult.validation.score}/100 - ${qaResult.validation.status}`);
                
                if (qaResult.validation.issues && qaResult.validation.issues.length > 0) {
                  console.log(`⚠️  [${itemNumber}/${count}] QA Issues found:`, qaResult.validation.issues.length);
                  qaResult.validation.issues.forEach(issue => {
                    console.log(`   - [${issue.severity}] ${issue.message}`);
                  });
                }
                
                // If validation failed critically, skip generation
                if (qaResult.validation.status === 'rejected') {
                  throw new Error(`QA rejected prompt: ${qaResult.validation.issues[0]?.message || 'Quality too low'}`);
                }
              } else {
                console.warn(`⚠️  [${itemNumber}/${count}] QA validation failed:`, qaResult.error);
              }
            }
            
            // Step 3: Generate image
            console.log(`🎨 [${itemNumber}/${count}] Generating image with`, model);
            
            // Build generation options
            const generationOptions = { modelKey: model };
            
            // 📸 Add image URLs if provided (for General AI modes)
            if (promptResult.parameters?.image_urls && promptResult.parameters.image_urls.length > 0) {
              generationOptions.image_urls = promptResult.parameters.image_urls;
              console.log(`📸 [${itemNumber}/${count}] Using ${promptResult.parameters.image_urls.length} reference images`);
            }
            
            // All models now use Replicate (including nano-banana-pro)
            const generationResult = await generateImageReplicate(
              enhancedPrompt,
              generationOptions,
              userId
            );
            
            if (!generationResult.success) {
              // Enhanced error message with details
              const errorInfo = {
                message: generationResult.error || 'Unknown error',
                originalModel: model,
                usedFallback: generationResult.usedFallback || false,
                attempts: generationResult.attempts || 1,
                modelUsed: generationResult.modelKey || model
              };
              throw new Error(JSON.stringify(errorInfo));
            }
            
            // Log if fallback was used
            if (generationResult.usedFallback) {
              console.log(`⚠️  [${itemNumber}/${count}] Used fallback model: ${generationResult.modelKey}`);
            }
            
            console.log(`✅ [${itemNumber}/${count}] Image generated successfully`);
            
            // Step 4: Save to database
            const weightsSnapshot = {
              category: category,
              parameters: Object.entries(selectedParams).map(([param, data]) => ({
                parameter: param,
                value: data.value,
                weight: data.weight
              }))
            };
            
            // Include QA results if validation was performed
            const qaSnapshot = qaResult?.success ? {
              validated: true,
              score: qaResult.validation.score,
              status: qaResult.validation.status,
              issues: qaResult.validation.issues || [],
              timestamp: new Date().toISOString()
            } : null;
            
            // Prepare content data (without qa_validation for now)
            const contentData = {
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
            };
            
            // Add qa_validation only if column exists (optional for backward compatibility)
            if (qaSnapshot && enableQA) {
              // Try to add qa_validation, but don't fail if column doesn't exist
              contentData.qa_validation = qaSnapshot;
            }
            
            const { data: content, error: contentError } = await supabase
              .from('content_v3')
              .insert([contentData])
              .select()
              .single();
            
            if (contentError) throw contentError;
            
            console.log(`✅ [${itemNumber}/${count}] Content saved:`, content.id);
            
            return {
              success: true,
              content,
              url: generationResult.url,
              parametersUsed: selectedParams,
              itemNumber
            };
            
          } catch (error) {
            console.error(`❌ [${itemNumber}/${count}] Generation failed:`, error);
            
            // Try to parse enhanced error info
            let errorDetails = null;
            try {
              errorDetails = JSON.parse(error.message);
            } catch (e) {
              // Not JSON, use raw message
              errorDetails = { message: error.message };
            }
            
            return {
              success: false,
              error: errorDetails.message || error.message,
              errorDetails: errorDetails,
              itemNumber
            };
          }
        })()
      );
    }
    
    // Wait for all generations to complete in parallel
    console.log(`⏳ Waiting for ${count} parallel generations to complete...`);
    const results = await Promise.all(generationPromises);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 GENERATION COMPLETE');
    console.log('   Total:', count);
    console.log('   Successful:', successful);
    console.log('   Failed:', failed);
    console.log('='.repeat(80) + '\n');
    
    // ✅ Success if at least ONE generation succeeded
    // Frontend will filter successful items
    res.json({
      success: successful > 0,  // ← Changed! Was: failed === 0
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

/**
 * GET /api/generation/unrated
 * Get all unrated content for a session (for resuming swiping)
 * 
 * Query params:
 *   sessionId: string (required)
 *   limit?: number (optional, default 50)
 */
router.get('/unrated', async (req, res) => {
  try {
    const { sessionId, limit = 50 } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    console.log('\n📋 FETCHING UNRATED CONTENT');
    console.log('Session ID:', sessionId);
    console.log('Limit:', limit);
    
    // Get all unrated content (rating is null)
    const { data: unratedContent, error } = await supabase
      .from('content_v3')
      .select('*')
      .eq('session_id', sessionId)
      .is('rating', null)
      .order('created_at', { ascending: true })  // Oldest first
      .limit(parseInt(limit));
    
    if (error) throw error;
    
    // Get total stats for session
    const { data: allContent, error: statsError } = await supabase
      .from('content_v3')
      .select('id, rating')
      .eq('session_id', sessionId);
    
    if (statsError) throw statsError;
    
    const rated = allContent.filter(c => c.rating !== null);
    
    console.log('✅ Found unrated content:', unratedContent.length);
    console.log('   Total content:', allContent.length);
    console.log('   Rated:', rated.length);
    console.log('   Unrated:', allContent.length - rated.length);
    
    res.json({
      success: true,
      data: unratedContent,
      stats: {
        total: allContent.length,
        rated: rated.length,
        unrated: allContent.length - rated.length,
        hasUnrated: unratedContent.length > 0
      }
    });
    
  } catch (error) {
    console.error('❌ Unrated fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🎨 Create Dynamic Parameters for General AI
 * Analyzes first generation input and creates relevant parameters
 */
async function createDynamicParametersGeneral(sessionId, projectId, prompt, mode, modeInputs) {
  console.log('🎯 Creating dynamic parameters for General AI session...');
  console.log('   Session ID:', sessionId);
  console.log('   Project ID:', projectId);
  
  const parameters = {};
  
  // 1. MODE parameter (always included)
  parameters.mode = mode || 'text-to-image';
  
  // 2. Analyze prompt for style keywords
  const promptLower = (prompt || '').toLowerCase();
  
  // Style detection
  const styles = [];
  if (promptLower.match(/\b(realistic|photo|photorealistic)\b/)) styles.push('realistic');
  if (promptLower.match(/\b(artistic|painting|watercolor|oil painting)\b/)) styles.push('artistic');
  if (promptLower.match(/\b(cartoon|anime|illustration|drawing)\b/)) styles.push('cartoon');
  if (promptLower.match(/\b(3d|render|cgi)\b/)) styles.push('3d');
  if (promptLower.match(/\b(minimalist|simple|clean)\b/)) styles.push('minimalist');
  
  if (styles.length > 0) {
    parameters.style = styles[0]; // Primary style
  } else {
    parameters.style = 'realistic'; // Default
  }
  
  // 3. Color scheme detection
  const colors = [];
  if (promptLower.match(/\b(vibrant|colorful|bright|saturated)\b/)) colors.push('vibrant');
  if (promptLower.match(/\b(dark|moody|noir|black)\b/)) colors.push('dark');
  if (promptLower.match(/\b(pastel|soft|light|gentle)\b/)) colors.push('pastel');
  if (promptLower.match(/\b(monochrome|black and white|grayscale)\b/)) colors.push('monochrome');
  if (promptLower.match(/\b(warm|orange|red|yellow)\b/)) colors.push('warm');
  if (promptLower.match(/\b(cool|blue|cyan|cold)\b/)) colors.push('cool');
  
  if (colors.length > 0) {
    parameters.color_scheme = colors[0];
  } else {
    parameters.color_scheme = 'natural';
  }
  
  // 4. Subject type detection
  if (promptLower.match(/\b(person|woman|man|portrait|face|people)\b/)) {
    parameters.subject_type = 'portrait';
  } else if (promptLower.match(/\b(landscape|nature|scenery|mountain|forest|beach)\b/)) {
    parameters.subject_type = 'landscape';
  } else if (promptLower.match(/\b(product|item|object)\b/)) {
    parameters.subject_type = 'product';
  } else if (promptLower.match(/\b(interior|room|office|house)\b/)) {
    parameters.subject_type = 'interior';
  } else {
    parameters.subject_type = 'general';
  }
  
  // 5. Mood detection
  const moods = [];
  if (promptLower.match(/\b(happy|joyful|cheerful|bright)\b/)) moods.push('happy');
  if (promptLower.match(/\b(sad|melancholy|somber|dark)\b/)) moods.push('sad');
  if (promptLower.match(/\b(dramatic|epic|cinematic|intense)\b/)) moods.push('dramatic');
  if (promptLower.match(/\b(calm|peaceful|serene|relaxing)\b/)) moods.push('calm');
  if (promptLower.match(/\b(energetic|dynamic|action)\b/)) moods.push('energetic');
  
  if (moods.length > 0) {
    parameters.mood = moods[0];
  } else {
    parameters.mood = 'neutral';
  }
  
  // 6. Reference images analysis
  if (modeInputs?.referenceImages && modeInputs.referenceImages.length > 0) {
    parameters.has_reference = 'yes';
    parameters.reference_count = Math.min(modeInputs.referenceImages.length, 14).toString();
  } else {
    parameters.has_reference = 'no';
    parameters.reference_count = '0';
  }
  
  console.log('📊 Dynamic parameters created:');
  console.log('   - mode:', parameters.mode);
  console.log('   - style:', parameters.style);
  console.log('   - color_scheme:', parameters.color_scheme);
  console.log('   - subject_type:', parameters.subject_type);
  console.log('   - mood:', parameters.mood);
  console.log('   - has_reference:', parameters.has_reference);
  console.log('   - reference_count:', parameters.reference_count);
  
  // 7. Save parameters to database
  try {
    console.log('💾 Saving parameters to weight_parameters table...');
    console.log('📝 Parameters to save:', JSON.stringify(parameters, null, 2));
    const result = await initializeSessionWeights(sessionId, projectId, parameters);
    console.log('📊 Save result:', result);
    if (result.success) {
      console.log(`✅ Parameters saved successfully! (${result.weightsCount} weights)`);
    } else {
      console.error('❌ Failed to save parameters:', result.error);
    }
  } catch (error) {
    console.error('❌ Failed to save parameters (exception):', error);
    console.error('Error details:', error);
    // Continue anyway - parameters will be used in-memory
  }
  
  return parameters;
}

export default router;
