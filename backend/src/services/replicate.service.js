import Replicate from 'replicate';
import config from '../config/index.js';
import { getModelConfig } from '../config/models.js';
import { uploadFromUrl } from './storage.service.js';

const replicate = new Replicate({
  auth: config.replicate.apiToken
});

/**
 * Generate content using Replicate (unified function)
 * Now with permanent storage - uploads files to Supabase Storage
 */
export async function generateContent(prompt, contentType, modelKey, customParams = {}, userId = 'anonymous') {
  try {
    const modelConfig = getModelConfig(contentType, modelKey);
    
    if (!modelConfig) {
      throw new Error(`Model ${modelKey} not found for content type ${contentType}`);
    }

    console.log(`Generating ${contentType} with model ${modelConfig.name}...`);
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
      throw new Error('No image content found in response (Replicate returned null/empty)');
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
      throw new Error(`Invalid URL from Replicate: ${temporaryUrl}`);
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
        modelKey: modelKey,
        contentType: contentType
      };
    }

    console.log(`✅ Uploaded to permanent storage: ${uploadResult.url}`);

    return {
      success: true,
      url: uploadResult.url,
      permanentUrl: true,
      model: modelConfig.name,
      modelKey: modelKey,
      contentType: contentType
    };

  } catch (error) {
    console.error(`${contentType} generation error:`, error);
    return {
      success: false,
      error: error.message,
      contentType: contentType
    };
  }
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
