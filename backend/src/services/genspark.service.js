/**
 * GenSpark AI Image Generation Service
 * Uses Nano Banana Pro model for high-quality image generation
 */

import fetch from 'node-fetch';

const GENSPARK_API_URL = 'https://www.genspark.ai/api';

/**
 * Generate image using GenSpark Nano Banana Pro
 * 
 * @param {string} prompt - Enhanced prompt from agent
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result with image URL
 */
export async function generateImage(prompt, options = {}) {
  const {
    model = 'nano-banana-pro',
    aspectRatio = '1:1',
    imageSize = 'auto',
    taskSummary = 'Generate AI image'
  } = options;

  console.log('\n🎨 GENSPARK IMAGE GENERATION');
  console.log('Model:', model);
  console.log('Prompt:', prompt.substring(0, 100) + '...');

  try {
    const response = await fetch(`${GENSPARK_API_URL}/image-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: prompt,
        model: model,
        aspect_ratio: aspectRatio,
        image_size: imageSize,
        image_urls: [],
        task_summary: taskSummary
      })
    });

    if (!response.ok) {
      throw new Error(`GenSpark API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.result || !data.result.url) {
      throw new Error('Invalid response from GenSpark API');
    }

    console.log('✅ Image generated:', data.result.url);

    return {
      success: true,
      url: data.result.url,
      model: model,
      prompt: prompt,
      generationTime: data.result.generation_time || null,
      metadata: {
        aspectRatio,
        imageSize,
        provider: 'genspark'
      }
    };

  } catch (error) {
    console.error('❌ GenSpark generation failed:', error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Batch generate multiple images
 * Generates images one by one and returns them as they complete
 * 
 * @param {string} basePrompt - Base prompt
 * @param {number} count - Number of images to generate
 * @param {Function} onProgress - Callback for each completed image
 * @returns {Promise<Array>} Array of generated images
 */
export async function batchGenerate(basePrompt, count = 10, onProgress = null) {
  console.log(`\n🔄 BATCH GENERATION: ${count} images`);
  
  const results = [];
  const errors = [];

  for (let i = 0; i < count; i++) {
    console.log(`\n📸 Generating image ${i + 1}/${count}...`);

    try {
      // Add variation to prompt
      const variedPrompt = `${basePrompt} [variation ${i + 1}]`;
      
      const result = await generateImage(variedPrompt, {
        model: 'nano-banana-pro',
        taskSummary: `Batch generation ${i + 1}/${count}`
      });

      if (result.success) {
        results.push({
          index: i,
          url: result.url,
          prompt: basePrompt,
          enhancedPrompt: variedPrompt,
          model: result.model,
          generationTime: result.generationTime
        });

        // Call progress callback if provided
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: count,
            result: result
          });
        }
      } else {
        errors.push({
          index: i,
          error: result.error
        });
      }

    } catch (error) {
      console.error(`Failed to generate image ${i + 1}:`, error);
      errors.push({
        index: i,
        error: error.message
      });
    }

    // Small delay to avoid rate limiting
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n✅ Batch complete: ${results.length}/${count} successful`);
  
  if (errors.length > 0) {
    console.warn(`⚠️  ${errors.length} errors occurred`);
  }

  return {
    success: results.length > 0,
    results,
    errors,
    stats: {
      total: count,
      successful: results.length,
      failed: errors.length
    }
  };
}

/**
 * Test GenSpark connection
 */
export async function testConnection() {
  try {
    const result = await generateImage('Test prompt: A simple red circle', {
      model: 'nano-banana-pro',
      taskSummary: 'Connection test'
    });

    return result.success;
  } catch (error) {
    console.error('GenSpark connection test failed:', error);
    return false;
  }
}

export default {
  generateImage,
  batchGenerate,
  testConnection
};
