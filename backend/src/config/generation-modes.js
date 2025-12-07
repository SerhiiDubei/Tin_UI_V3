/**
 * 🎨 GENERATION MODES CONFIGURATION
 * Defines different modes for General Purpose AI Agent
 * Each mode has specific capabilities, models, and parameters
 */

export const GENERATION_MODES = {
  /**
   * 📝 TEXT_TO_IMAGE - Basic generation from prompt
   * Best for: Quick creation, concept visualization
   */
  'text-to-image': {
    id: 'text-to-image',
    name: 'Text-to-Image',
    icon: '📝',
    description: 'Generate images from text description (fast)',
    model: 'seedream-4',
    speed: 'Ultra Fast (~1.8s)',
    price: '$0.03',
    capabilities: ['text_prompt'],
    inputs: {
      prompt: { required: true, type: 'text' },
      aspect_ratio: { required: false, type: 'select', default: '16:9' },
      image_size: { required: false, type: 'select', default: '2k' }
    },
    examples: [
      'A modern office space with minimalist design',
      'Product photo of wireless headphones on marble',
      'Abstract art with geometric shapes'
    ]
  },

  /**
   * 🎨 STYLE_TRANSFER - Apply style from reference image
   * Best for: Artistic transformations, brand consistency
   */
  'style-transfer': {
    id: 'style-transfer',
    name: 'Style Transfer',
    icon: '🎨',
    description: 'Apply artistic style from reference image',
    model: 'nano-banana-pro',
    speed: 'Ultra Fast (~1.2s)',
    price: '$0.15',
    capabilities: ['text_prompt', 'single_reference'],
    inputs: {
      prompt: { required: true, type: 'text' },
      reference_image: { required: true, type: 'image', max: 1 },
      style_strength: { required: false, type: 'slider', range: [0, 1], default: 0.7 },
      aspect_ratio: { required: false, type: 'select', default: 'auto' }
    },
    examples: [
      'Portrait in the same artistic style',
      'Landscape with watercolor effect from reference',
      'Product shot matching brand aesthetic'
    ]
  },

  /**
   * ✏️ IMAGE_EDITING - Edit existing image with AI
   * Best for: Photo enhancement, corrections, adjustments
   */
  'image-editing': {
    id: 'image-editing',
    name: 'Image Editing',
    icon: '✏️',
    description: 'Edit and enhance existing images',
    model: 'nano-banana-pro',
    speed: 'Ultra Fast (~1.2s)',
    price: '$0.15',
    capabilities: ['text_prompt', 'single_reference', 'precision_editing'],
    inputs: {
      prompt: { required: true, type: 'text' },
      source_image: { required: true, type: 'image', max: 1 },
      edit_strength: { required: false, type: 'slider', range: [0, 1], default: 0.5 },
      aspect_ratio: { required: false, type: 'select', default: 'auto' }
    },
    examples: [
      'Enhance colors and lighting',
      'Remove distracting elements',
      'Change time of day to golden hour',
      'Fix overexposure, sharpen details'
    ]
  },

  /**
   * 🖼️ MULTI_REFERENCE - Combine elements from multiple images
   * Best for: Character consistency, complex compositions
   */
  'multi-reference': {
    id: 'multi-reference',
    name: 'Multi-Reference Combine',
    icon: '🖼️',
    description: 'Combine elements from 2-14 reference images',
    model: 'nano-banana-pro',
    speed: 'Fast (~1.5s)',
    price: '$0.15',
    capabilities: ['text_prompt', 'multi_reference', 'character_consistency'],
    inputs: {
      prompt: { required: true, type: 'text' },
      reference_images: { required: true, type: 'images', min: 2, max: 14 },
      object_images: { required: false, type: 'images', max: 6, label: 'Objects (high fidelity)' },
      character_images: { required: false, type: 'images', max: 5, label: 'Characters (consistency)' },
      aspect_ratio: { required: false, type: 'select', default: '16:9' }
    },
    examples: [
      'Combine character from image 1 with background from image 2',
      'Merge product styles from multiple references',
      'Create consistent character across scenes'
    ],
    note: 'Up to 6 object images + 5 character images for maximum consistency'
  },

  /**
   * 🔄 OBJECT_REPLACE - Replace objects in image
   * Best for: Product swaps, furniture placement, material changes
   */
  'object-replace': {
    id: 'object-replace',
    name: 'Object Replacement',
    icon: '🔄',
    description: 'Replace specific objects with AI precision',
    model: 'nano-banana-pro',
    speed: 'Ultra Fast (~1.2s)',
    price: '$0.15',
    capabilities: ['text_prompt', 'single_reference', 'object_detection'],
    inputs: {
      prompt: { required: true, type: 'text' },
      source_image: { required: true, type: 'image', max: 1 },
      object_to_replace: { required: true, type: 'text', placeholder: 'e.g., "the sofa"' },
      replacement: { required: true, type: 'text', placeholder: 'e.g., "modern leather chair"' },
      aspect_ratio: { required: false, type: 'select', default: 'auto' }
    },
    examples: [
      'Replace wooden table with glass table',
      'Change shirt color from blue to red',
      'Swap laptop with tablet on desk'
    ]
  },

  /**
   * 🌅 BACKGROUND_CHANGE - Change image background
   * Best for: Product photos, portraits, scene changes
   */
  'background-change': {
    id: 'background-change',
    name: 'Background Change',
    icon: '🌅',
    description: 'Replace background while keeping subject',
    model: 'nano-banana-pro',
    speed: 'Ultra Fast (~1.2s)',
    price: '$0.15',
    capabilities: ['text_prompt', 'single_reference', 'background_removal'],
    inputs: {
      prompt: { required: true, type: 'text' },
      source_image: { required: true, type: 'image', max: 1 },
      new_background: { required: true, type: 'text', placeholder: 'e.g., "tropical beach sunset"' },
      blend_mode: { required: false, type: 'select', options: ['natural', 'sharp'], default: 'natural' },
      aspect_ratio: { required: false, type: 'select', default: 'auto' }
    },
    examples: [
      'Portrait with mountain landscape background',
      'Product on clean white background',
      'Change office to coffee shop setting'
    ]
  },

  /**
   * 📸 PRO_QUALITY - Maximum quality (slower)
   * Best for: Final renders, print materials, professional work
   */
  'pro-quality': {
    id: 'pro-quality',
    name: 'Pro Quality',
    icon: '📸',
    description: 'Maximum quality with exceptional detail (slower)',
    model: 'flux-2-pro',
    speed: 'Slower (~25s)',
    price: '$0.05',
    capabilities: ['text_prompt', 'high_resolution', 'exceptional_detail'],
    inputs: {
      prompt: { required: true, type: 'text' },
      aspect_ratio: { required: false, type: 'select', default: '16:9' },
      quality: { required: false, type: 'select', options: ['standard', 'high', 'ultra'], default: 'ultra' }
    },
    examples: [
      'Professional product photography with perfect lighting',
      'Architectural render with photorealistic details',
      'High-end fashion photography'
    ],
    note: 'Best for final outputs where quality matters more than speed'
  },

  /**
   * 🎯 AD_REPLICATOR - Competitive ad creative replication
   * Best for: Affiliate marketing, ad campaigns, converting creatives
   */
  'ad-replicator': {
    id: 'ad-replicator',
    name: 'Ad Replicator',
    icon: '🎯',
    description: 'Analyze competitor ads (1-14) and generate NEW winning creatives',
    model: 'nano-banana-pro',
    speed: 'Fast (~1.5s)',
    price: '$0.15',
    capabilities: ['text_prompt', 'multi_reference', 'competitive_analysis', 'conversion_optimization'],
    inputs: {
      prompt: { required: true, type: 'text', placeholder: 'Describe your niche/offer (e.g., "teeth whitening kit")' },
      reference_images: { required: true, type: 'images', min: 1, max: 14, label: 'Competitor Ads (1-14)' },
      niche: { required: false, type: 'text', placeholder: 'e.g., "Health & Fitness"' },
      target_audience: { required: false, type: 'text', placeholder: 'e.g., "Women 25-45"' },
      platform: { required: false, type: 'select', options: ['facebook', 'instagram', 'google', 'pinterest'], default: 'facebook' },
      variations: { required: false, type: 'number', min: 1, max: 10, default: 3 },
      aspect_ratio: { required: false, type: 'select', default: '1:1' }
    },
    examples: [
      'Upload competitor ads for teeth whitening → get 3 NEW winning creatives',
      'Analyze home remodel ads → generate original before/after variations',
      'Study weight loss ads → create NEW transformation creatives'
    ],
    note: 'Ethical ad replication: Copies STRATEGY, not pixels. Generates original imagery. Perfect for affiliate marketers.',
    additionalInfo: {
      works_for_niches: [
        'Home Services', 'Health & Fitness', 'Beauty', 'Medical', 'Automotive',
        'Real Estate', 'Education', 'Finance', 'E-commerce', 'Food', 'Pets'
      ],
      analyzes: [
        'Layout patterns', 'Text hooks', 'Visual style', 'Conversion psychology',
        'CTA placement', 'Urgency tactics', 'Social proof'
      ],
      generates: [
        'Before/after splits', 'Urgency discounts', 'Social proof testimonials',
        'Product hero shots', 'Multi-angle variations'
      ]
    }
  }
};

/**
 * Get mode configuration by ID
 */
export function getMode(modeId) {
  return GENERATION_MODES[modeId] || GENERATION_MODES['text-to-image'];
}

/**
 * Get all available modes
 */
export function getAllModes() {
  return Object.values(GENERATION_MODES);
}

/**
 * Get modes by capability
 */
export function getModesByCapability(capability) {
  return Object.values(GENERATION_MODES).filter(mode => 
    mode.capabilities.includes(capability)
  );
}

/**
 * Validate mode inputs
 */
export function validateModeInputs(modeId, inputs) {
  const mode = getMode(modeId);
  const errors = [];

  for (const [key, config] of Object.entries(mode.inputs)) {
    if (config.required && !inputs[key]) {
      errors.push(`${key} is required for ${mode.name} mode`);
    }

    // Validate image count
    if (config.type === 'images' || config.type === 'image') {
      const imageCount = inputs[key]?.length || 0;
      if (config.min && imageCount < config.min) {
        errors.push(`${key} requires at least ${config.min} images`);
      }
      if (config.max && imageCount > config.max) {
        errors.push(`${key} allows maximum ${config.max} images`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  GENERATION_MODES,
  getMode,
  getAllModes,
  getModesByCapability,
  validateModeInputs
};


