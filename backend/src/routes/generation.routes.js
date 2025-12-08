import express from 'express';
import { supabase } from '../db/supabase.js';
import { 
  selectParametersWeighted, 
  updateWeightsInstantly, 
  initializeSessionWeights, 
  createParametersForCategory,
  extractDynamicParameters // 🆕 New function
} from '../services/weights.service.js';
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

// 🚩 FEATURE FLAG: Enable dynamic parameter extraction
// Set to false to use universal parameters (safe default)
// Set to true to use context-aware dynamic extraction (experimental)
const USE_DYNAMIC_PARAMETERS = false; // ← Change to true for testing

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
    
    console.log('📊 Weight check:', {
      weightsCount: weights?.length || 0,
      agentType,
      sessionId: sessionId.substring(0, 8) + '...'
    });
    
    if (!weights || weights.length === 0) {
      console.log('⚠️ No weights found - will create dynamically');
      
      if (agentType === 'dating') {
        // Dating projects MUST have parameters
        console.error('❌ Dating session missing parameters!');
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
        
        // 🎯 INTELLIGENT CATEGORY DETECTION:
        // Priority: Vision AI Category > Prompt Analysis > Mode > Project Tag
        let targetCategory = category; // Fallback to project tag
        
        // 1. Check if Vision AI already detected category (from modeInputs)
        if (modeInputs?.visionCategory) {
          targetCategory = modeInputs.visionCategory;
          console.log('✅ Using Vision AI detected category:', targetCategory);
        }
        // 2. Check Vision AI analysis for niche (ad-replicator specific)
        else if (modeInputs?.visionAnalysis?.analysis?.niche) {
          // For ad-replicator, Vision AI detects the niche (e.g., 'automotive_insurance')
          const detectedNiche = modeInputs.visionAnalysis.analysis.niche;
          targetCategory = detectedNiche.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
          console.log('✅ Using Vision AI detected niche as category:', targetCategory);
        }
        // 3. Try to detect category from prompt (with more specific subcategories)
        else if (userPrompt) {
          // Enhanced keyword-based detection with subcategories
          const promptLower = userPrompt.toLowerCase();
          
          // Insurance subcategories
          if (promptLower.match(/\b(auto|car|vehicle)\b/) && promptLower.match(/\b(insurance|coverage|policy)\b/)) {
            targetCategory = 'automotive_insurance';
            console.log('✅ Detected automotive insurance category from prompt');
          } else if (promptLower.match(/\b(health|medical|life)\b/) && promptLower.match(/\b(insurance|coverage|policy)\b/)) {
            targetCategory = 'health_insurance';
            console.log('✅ Detected health insurance category from prompt');
          } else if (promptLower.match(/\b(home|house|property)\b/) && promptLower.match(/\b(insurance|coverage|policy)\b/)) {
            targetCategory = 'home_insurance';
            console.log('✅ Detected home insurance category from prompt');
          } else if (promptLower.match(/\b(insurance|coverage|policy|agent|claim)\b/)) {
            targetCategory = 'insurance_advertising';
            console.log('✅ Detected general insurance category from prompt');
          }
          // Automotive
          else if (promptLower.match(/\b(car|vehicle|automotive|mercedes|bmw|toyota|sedan|suv|truck)\b/)) {
            targetCategory = 'automotive_advertising';
            console.log('✅ Detected automotive category from prompt');
          }
          // Real Estate
          else if (promptLower.match(/\b(real estate|property|house|home|apartment)\b/)) {
            targetCategory = 'real_estate_advertising';
            console.log('✅ Detected real estate category from prompt');
          }
          // Product
          else if (promptLower.match(/\b(product|commercial|advertisement|marketing)\b/)) {
            targetCategory = 'product_advertising';
            console.log('✅ Detected product advertising from prompt');
          }
          // Food & Beverage
          else if (promptLower.match(/\b(food|recipe|restaurant|dish|meal)\b/)) {
            targetCategory = 'food_beverage';
            console.log('✅ Detected food category from prompt');
          }
          // Music
          else if (promptLower.match(/\b(music|instrument|guitar|piano|drum)\b/)) {
            targetCategory = 'music';
            console.log('✅ Detected music category from prompt');
          }
          // Dating
          else if (promptLower.match(/\b(dating|date|profile|match|swipe|relationship)\b/)) {
            targetCategory = 'dating_lifestyle';
            console.log('✅ Detected dating category from prompt');
          }
          // Fallback to mode-based if nothing detected
          else if (mode && mode !== 'text-to-image') {
            targetCategory = `mode_${mode}`;
            console.log('ℹ️ Using mode-based category:', targetCategory);
          } else {
            console.log('ℹ️ Using fallback category:', targetCategory);
          }
        }
        // 4. Mode-based fallback (lowest priority)
        else if (mode && mode !== 'text-to-image') {
          targetCategory = `mode_${mode}`;
          console.log('ℹ️ Using mode-based category as last resort:', targetCategory);
        }
        
        // 🔧 PARAMETER GENERATION STRATEGY
        console.log('🤖 Generating parameter categories...');
        console.log('   Target category:', targetCategory);
        console.log('   User prompt:', userPrompt?.substring(0, 100) || 'N/A');
        console.log('   Dynamic extraction enabled:', USE_DYNAMIC_PARAMETERS);
        
        try {
          let result;
          
          // 🆕 TRY DYNAMIC EXTRACTION (if enabled and Vision AI data available)
          if (USE_DYNAMIC_PARAMETERS && modeInputs?.visionAnalysis) {
            console.log('🔍 Attempting DYNAMIC parameter extraction from content...');
            
            try {
              result = await extractDynamicParameters(
                modeInputs.visionAnalysis,
                userPrompt || '',
                targetCategory
              );
              
              if (result && result.success && result.parameters) {
                console.log('✅ Dynamic extraction successful!');
                console.log('   Method:', result.metadata?.method);
                console.log('   Source:', result.metadata?.source);
              } else {
                console.warn('⚠️ Dynamic extraction failed, falling back to universal parameters');
                result = null; // Force fallback
              }
            } catch (dynamicError) {
              console.error('❌ Dynamic extraction error:', dynamicError.message);
              console.log('↩️ Falling back to universal parameters');
              result = null; // Force fallback
            }
          }
          
          // FALLBACK: Use universal parameters (original method)
          if (!result) {
            console.log('🔄 Using UNIVERSAL parameter generation (fallback)');
            result = await createParametersForCategory(targetCategory, userPrompt || '');
          }
          
          if (!result || !result.success || !result.parameters) {
            console.error('❌ GPT-4o returned empty parameters!');
            throw new Error('Failed to generate parameters');
          }
          
          const generatedParams = result.parameters;
          
          console.log('✅ GPT-4o generated parameters:', Object.keys(generatedParams).length, 'categories');
          console.log('   Categories:', Object.keys(generatedParams).join(', '));
          console.log('   Generation method:', result.metadata?.method || 'universal');
          
          // Initialize session weights with generated parameters
          console.log('💾 Initializing session weights...');
          // Pass both parameters and metadata for proper category tracking
          const paramsWithMeta = {
            ...generatedParams,
            metadata: result.metadata
          };
          const initResult = await initializeSessionWeights(sessionId, projectId, paramsWithMeta);
          
          if (!initResult || !initResult.success) {
            console.error('❌ Failed to initialize weights:', initResult?.error || 'Unknown error');
            throw new Error('Failed to save parameters to database');
          }
          
          console.log('✅ Initialized weights:', initResult.weightsCount, 'total weights');
        } catch (paramError) {
          console.error('❌ Parameter generation/initialization failed:', paramError);
          console.error('   Stack:', paramError.stack);
          
          // Continue with empty parameters (will use defaults)
          console.warn('⚠️ Continuing with empty parameters - generation may not learn properly');
        }
        
        // Reload weights from database
        console.log('🔄 Reloading weights from database...');
        const { data: freshWeights, error: reloadError } = await supabase
          .from('weight_parameters')
          .select('*')
          .eq('session_id', sessionId);
        
        if (reloadError) {
          console.error('❌ Failed to reload weights:', reloadError);
          throw reloadError;
        }
        
        console.log('📦 Reloaded weights count:', freshWeights?.length || 0);
        
        // Group into parameters object
        parameters = {};
        for (const w of freshWeights) {
          if (!parameters[w.parameter_name]) {
            parameters[w.parameter_name] = [];
          }
          parameters[w.parameter_name].push(w.sub_parameter);
        }
        
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
                  variations: count,  // Use count as number of variations
                  visionAnalysis: modeInputs.visionAnalysis  // 🆕 Pass Vision AI analysis
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
// createDynamicParametersGeneral() removed - now using proper GPT-4o generation
// via createParametersForCategory() from weights.service.js

export default router;
