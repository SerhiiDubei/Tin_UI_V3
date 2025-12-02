import Replicate from 'replicate';
import config from '../config/index.js';
import { getModelConfig } from '../config/models.js';
import { uploadFromUrl } from './storage.service.js';

const replicate = new Replicate({
  auth: config.replicate.apiToken
});

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate content using Replicate (unified function)
 * Now with permanent storage - uploads files to Supabase Storage
 * With retry mechanism and fallback support
 */
export async function generateContent(prompt, contentType, modelKey, customParams = {}, userId = 'anonymous') {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 3000; // 3 seconds
  
  let currentModelKey = modelKey;
  let lastError = null;
  let attemptNumber = 0;
  let usedFallback = false;
  
  // Try with original model (with retries)
  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    attemptNumber++;
    
    try {
      const modelConfig = getModelConfig(contentType, currentModelKey);
      
      if (!modelConfig) {
        throw new Error(`Model ${currentModelKey} not found for content type ${contentType}`);
      }

      if (retry > 0) {
        console.log(`🔄 Retry ${retry}/${MAX_RETRIES} for ${modelConfig.name}...`);
      } else {
        console.log(`Generating ${contentType} with model ${modelConfig.name}...`);
      }
      console.log(`Replicate ID: ${modelConfig.replicateId}`);

      // Build model identifier
      let modelIdentifier = modelConfig.replicateId;
      if (modelConfig.version && modelConfig.version !== 'latest') {
        modelIdentifier = `${modelConfig.replicateId}:${modelConfig.version}`;
      }

      // Merge params: default model params + custom params
      const inputParams = {
        prompt: prompt,
        ...modelConfig.params,
        ...customParams
      };

      console.log('Input params:', inputParams);

      // Run prediction
      const output = await replicate.run(modelIdentifier, {
        input: inputParams
      });

      console.log('Generation output:', output);

      // Check if output is valid
      if (!output || (Array.isArray(output) && output.length === 0)) {
        throw new Error('Model returned null/empty output');
      }

      // Extract temporary URL from output
      let temporaryUrl;
      if (Array.isArray(output)) {
        temporaryUrl = output[0];
      } else if (typeof output === 'string') {
        temporaryUrl = output;
      } else if (output && output.url) {
        temporaryUrl = output.url;
      } else {
        temporaryUrl = output;
      }
      
      // Validate URL
      if (!temporaryUrl || typeof temporaryUrl !== 'string') {
        throw new Error(`Invalid URL from model: ${temporaryUrl}`);
      }

      console.log(`📥 Temporary URL from Replicate: ${temporaryUrl}`);

      // Upload to permanent storage (Supabase Storage)
      console.log('📦 Uploading to permanent storage...');
      const uploadResult = await uploadFromUrl(temporaryUrl, contentType, userId);

      if (!uploadResult.success) {
        console.error('⚠️ Failed to upload to permanent storage, using temporary URL');
        // Fallback to temporary URL if upload fails
        return {
          success: true,
          url: temporaryUrl,
          permanentUrl: false,
          model: modelConfig.name,
          modelKey: currentModelKey,
          contentType: contentType,
          usedFallback: usedFallback,
          attempts: attemptNumber
        };
      }

      console.log(`✅ Uploaded to permanent storage: ${uploadResult.url}`);

      return {
        success: true,
        url: uploadResult.url,
        permanentUrl: true,
        model: modelConfig.name,
        modelKey: currentModelKey,
        contentType: contentType,
        usedFallback: usedFallback,
        attempts: attemptNumber
      };

    } catch (error) {
      console.error(`❌ Generation attempt ${attemptNumber} failed:`, error.message);
      lastError = error;
      
      // Check if this is a null/timeout error
      const isNullError = error.message.includes('null') || 
                          error.message.includes('empty') ||
                          error.message.includes('timeout') ||
                          error.message.includes('Prediction failed');
      
      // If not last retry, wait and retry
      if (retry < MAX_RETRIES && isNullError) {
        console.log(`⏳ Waiting ${RETRY_DELAY}ms before retry...`);
        await sleep(RETRY_DELAY);
        continue;
      }
      
      // If all retries exhausted and this is nano-banana-pro, try fallback
      if (retry === MAX_RETRIES && currentModelKey === 'nano-banana-pro' && !usedFallback) {
        console.log('');
        console.log('⚠️ ═══════════════════════════════════════════════════════');
        console.log('⚠️  nano-banana-pro failed after all retries');
        console.log('🔄  Falling back to seedream-4...');
        console.log('⚠️ ═══════════════════════════════════════════════════════');
        console.log('');
        
        currentModelKey = 'seedream-4';
        usedFallback = true;
        retry = -1; // Reset retry counter for fallback model
        await sleep(2000);
        continue;
      }
      
      // If we're here, all attempts failed
      break;
    }
  }
  
  // All attempts failed
  const errorMessage = lastError ? lastError.message : 'Unknown error';
  const userFriendlyMessage = lastError && lastError.message.includes('null') 
    ? `Model timeout/overload (returned null). Tried ${attemptNumber} times${usedFallback ? ' including fallback to seedream-4' : ''}.`
    : errorMessage;
  
  console.error(`❌ Generation completely failed after ${attemptNumber} attempts`);
  
  return {
    success: false,
    error: userFriendlyMessage,
    errorDetails: errorMessage,
    contentType: contentType,
    modelKey: currentModelKey,
    usedFallback: usedFallback,
    attempts: attemptNumber
  };
}

/**
 * Generate image using Replicate (backward compatibility)
 */
export async function generateImage(prompt, modelParams = {}, userId = 'anonymous') {
  const modelKey = modelParams.modelKey || 'seedream-4';
  return generateContent(prompt, 'image', modelKey, modelParams, userId);
}

/**
 * Generate video using Replicate (backward compatibility)
 */
export async function generateVideo(prompt, modelParams = {}, userId = 'anonymous') {
  const modelKey = modelParams.modelKey || 'ltx-video';
  return generateContent(prompt, 'video', modelKey, modelParams, userId);
}

/**
 * Generate audio using Replicate
 */
export async function generateAudio(prompt, modelParams = {}, userId = 'anonymous') {
  const modelKey = modelParams.modelKey || 'lyria-2';
  return generateContent(prompt, 'audio', modelKey, modelParams, userId);
}

/**
 * Batch generation - generate multiple items
 */
export async function batchGenerate(prompt, contentType, modelKey, count = 1, customParams = {}, userId = 'anonymous') {
  try {
    console.log(`Batch generating ${count} ${contentType} items...`);
    
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(generateContent(prompt, contentType, modelKey, customParams, userId));
    }

    const results = await Promise.all(promises);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      success: failed.length === 0,
      total: count,
      successful: successful.length,
      failed: failed.length,
      results: results
    };

  } catch (error) {
    console.error('Batch generation error:', error);
    return {
      success: false,
      error: error.message,
      total: count,
      successful: 0,
      failed: count
    };
  }
}

/**
 * Check if generation is complete
 */
export async function checkPrediction(predictionId) {
  try {
    const prediction = await replicate.predictions.get(predictionId);
    return prediction;
  } catch (error) {
    console.error('Prediction check error:', error);
    return null;
  }
}

export default {
  generateContent,
  generateImage,
  generateVideo,
  generateAudio,
  batchGenerate,
  checkPrediction
};
