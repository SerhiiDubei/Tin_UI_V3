/**
 * Models configuration for different content types
 */

export const MODELS_CONFIG = {
  image: {
    'seedream-4': {
      name: 'Seedream 4',
      description: 'High-quality images with native 2K resolution',
      price: '$0.03',
      speed: 'Середньо (~1 хв)',
      provider: 'replicate',
      replicateId: 'bytedance/seedream-4',
      version: 'latest',
      isDefault: true,
      params: {
        width: 2048,
        height: 2048,
        num_inference_steps: 4
      }
    },
    'nano-banana-pro': {
      name: 'Nano Banana Pro',
      description: 'Ultra-fast AI with 14 reference images support, precision editing, 4K resolution',
      price: '$0.15',
      speed: 'Ultra Fast (~1.2 сек)',
      provider: 'replicate',
      replicateId: 'google/nano-banana-pro',
      version: 'latest',
      features: [
        'Up to 14 reference images (6 objects + 5 characters)',
        'Precision image editing',
        'Style transfer',
        'Object replacement',
        'Background changes',
        'Up to 4K resolution'
      ],
      params: {
        width: 2048,  // Increased from 1024 to 2048 (supports up to 4K)
        height: 2048,
        num_inference_steps: 20,
        // Reference images support
        image_urls: [],  // Array of up to 14 image URLs
        guidance_scale: 7.5
      },
      supportsReferenceImages: true,
      maxReferenceImages: 14,
      supportsImageEditing: true
    },
    'flux-schnell': {
      name: 'FLUX Schnell',
      description: 'Fast image generation',
      price: '$0.003',
      speed: 'Швидко (~30 сек)',
      replicateId: 'black-forest-labs/flux-schnell',
      version: 'latest',
      params: {
        width: 1024,
        height: 1024,
        num_inference_steps: 4
      }
    },
    'flux-dev': {
      name: 'FLUX Dev',
      description: 'High-quality detailed images',
      price: '$0.025',
      speed: 'Повільно (~2 хв)',
      replicateId: 'black-forest-labs/flux-dev',
      version: 'latest',
      params: {
        width: 1024,
        height: 1024,
        num_inference_steps: 28
      }
    },
    'sdxl': {
      name: 'Stable Diffusion XL',
      description: 'Stable and reliable image generation',
      price: '$0.008',
      speed: 'Середньо (~1 хв)',
      replicateId: 'stability-ai/sdxl',
      version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      params: {
        width: 1024,
        height: 1024,
        num_inference_steps: 25
      }
    }
  },
  
  video: {
    'ltx-video': {
      name: 'LTX Video',
      description: 'Recommended for video generation',
      price: '$0.05',
      speed: '~1-2 хв',
      replicateId: 'lightricks/ltx-video',
      version: '8c47da666861d081eeb4d1261853087de23923a268a69b63febdf5dc1dee08e4',
      isDefault: true,
      params: {
        num_frames: 121,
        frame_rate: 25
      }
    },
    'cogvideox': {
      name: 'CogVideoX-5B',
      description: 'High-quality video generation',
      price: '$0.03',
      speed: '~2-3 хв',
      replicateId: 'fofr/cogvideox-5b',
      version: '4b245eb6225de6a2fd444ff752ee93dcfb49088c53249d61b4ca3f1e9e8b5b99',
      params: {
        num_frames: 49,
        fps: 8
      }
    },
    'svd': {
      name: 'Stable Video Diffusion',
      description: 'Stable video from image',
      price: '$0.08',
      speed: '~3-4 хв',
      replicateId: 'stability-ai/stable-video-diffusion',
      version: '3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
      params: {
        frames_per_second: 6,
        num_frames: 25
      }
    }
  },
  
  audio: {
    'lyria-2': {
      name: 'Google Lyria 2',
      description: 'Recommended for music generation',
      price: '$0.03',
      speed: '~30-60 сек',
      replicateId: 'google/lyria-2',
      version: 'latest',
      isDefault: true,
      params: {
        duration: 30
      }
    },
    'musicgen': {
      name: 'MusicGen (Meta)',
      description: 'Music and sound generation',
      price: '$0.05',
      speed: '~1-2 хв',
      replicateId: 'meta/musicgen',
      version: '671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb',
      params: {
        duration: 30,
        model_version: 'stereo-large'
      }
    },
    'riffusion': {
      name: 'Riffusion',
      description: 'Music from text prompts',
      price: '$0.03',
      speed: '~30-60 сек',
      replicateId: 'riffusion/riffusion',
      version: '8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05',
      params: {
        duration: 30
      }
    }
  },
  
  text: {
    'gpt-4o': {
      name: 'GPT-4o',
      description: 'Advanced text generation',
      price: '$0.01',
      speed: '~5 сек',
      provider: 'openai',
      model: 'gpt-4o',
      isDefault: true,
      params: {
        max_tokens: 1000,
        temperature: 0.7
      }
    }
  }
};

/**
 * Get default model for content type
 */
export function getDefaultModel(contentType) {
  const models = MODELS_CONFIG[contentType];
  if (!models) return null;
  
  // Find model with isDefault flag
  const defaultModel = Object.entries(models).find(([key, model]) => model.isDefault);
  if (defaultModel) return defaultModel[0];
  
  // Return first model if no default
  return Object.keys(models)[0];
}

/**
 * Get model config by key
 */
export function getModelConfig(contentType, modelKey) {
  return MODELS_CONFIG[contentType]?.[modelKey] || null;
}

/**
 * Get all models for content type
 */
export function getModelsForType(contentType) {
  return MODELS_CONFIG[contentType] || {};
}

export default MODELS_CONFIG;
