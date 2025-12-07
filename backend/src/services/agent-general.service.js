import OpenAI from 'openai';
import config from '../config/index.js';
import { supabase } from '../db/supabase.js';
import { getMode, validateModeInputs } from '../config/generation-modes.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

/**
 * 🎨 GENERAL PURPOSE AI AGENT
 * Multi-modal image generation with 7 specialized modes
 * 
 * Capabilities:
 * - Text-to-Image generation
 * - Style transfer from references
 * - Image editing and enhancement
 * - Multi-reference combining (up to 14 images)
 * - Object replacement
 * - Background changes
 * - Pro quality renders
 */

/**
 * Build prompt for General Purpose AI based on mode
 * @param {string} userPrompt - User's input
 * @param {string} modeId - Generation mode ID
 * @param {object} modeInputs - Mode-specific inputs (images, parameters)
 * @param {string} sessionId - Session ID for learning (optional)
 * @returns {object} { prompt, parameters, model, metadata }
 */
export async function buildPromptGeneral(userPrompt, modeId = 'text-to-image', modeInputs = {}, sessionId = null) {
  console.log('\n🎨 BUILDING PROMPT (GENERAL PURPOSE AI)');
  console.log('Mode:', modeId);
  console.log('User Prompt:', userPrompt);
  console.log('Mode Inputs:', Object.keys(modeInputs));
  
  try {
    // 1. Get mode configuration
    const mode = getMode(modeId);
    console.log(`📋 Selected Mode: ${mode.name} (${mode.icon})`);
    console.log(`🤖 Using Model: ${mode.model}`);
    
    // 2. Validate inputs
    const validation = validateModeInputs(modeId, modeInputs);
    if (!validation.valid) {
      throw new Error(`Invalid inputs: ${validation.errors.join(', ')}`);
    }
    
    // 3. Get agent config
    const { data: agentConfig } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('type', 'general')
      .eq('active', true)
      .single();
    
    const systemPrompt = agentConfig?.system_prompt || getDefaultSystemPrompt();
    
    // 4. Load user preferences (if session exists)
    let preferences = [];
    if (sessionId) {
      preferences = await loadUserPreferences(sessionId);
      console.log(`📊 Loaded ${preferences.length} user preferences`);
    }
    
    // 5. Build mode-specific message
    const userMessage = buildModeMessage(userPrompt, mode, modeInputs, preferences);
    
    console.log('\n📝 USER MESSAGE (first 400 chars):');
    console.log(userMessage.substring(0, 400) + '...\n');
    
    // 6. Call GPT-4o for prompt enhancement
    const messages = [
      {
        role: 'system',
        content: systemPrompt + getModeInstruction(mode)
      },
      {
        role: 'user',
        content: userMessage
      }
    ];
    
    console.log('⏳ Calling GPT-4o (general mode)...');
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.8,
      max_tokens: 800
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ GPT-4o response (${duration}ms, ${response.usage?.total_tokens} tokens)`);
    
    // 7. Parse response
    const enhancedPrompt = response.choices[0].message.content.trim();
    
    console.log('\n🎨 ENHANCED PROMPT:');
    console.log('─'.repeat(80));
    console.log(enhancedPrompt);
    console.log('─'.repeat(80));
    
    // 8. Build parameters for model
    const modelParameters = buildModelParameters(mode, modeInputs);
    
    return {
      success: true,
      prompt: enhancedPrompt,
      originalPrompt: userPrompt,
      mode: modeId,
      model: mode.model,
      parameters: modelParameters,
      metadata: {
        mode: mode.name,
        modeIcon: mode.icon,
        speed: mode.speed,
        price: mode.price,
        capabilities: mode.capabilities,
        preferencesUsed: preferences.length,
        tokensUsed: response.usage?.total_tokens,
        duration
      }
    };
    
  } catch (error) {
    console.error('❌ General prompt building failed:', error);
    return {
      success: false,
      error: error.message,
      prompt: userPrompt,
      mode: modeId,
      model: getMode(modeId).model,
      parameters: {}
    };
  }
}

/**
 * Load user preferences from session (optional learning)
 */
async function loadUserPreferences(sessionId) {
  if (!sessionId) return [];
  
  try {
    // Get top weighted parameters from previous generations
    const { data: weights } = await supabase
      .from('weight_parameters')
      .select('parameter_name, sub_parameter, weight')
      .eq('session_id', sessionId)
      .order('weight', { ascending: false })
      .limit(10);
    
    return weights || [];
  } catch (error) {
    console.error('Error loading preferences:', error);
    return [];
  }
}

/**
 * Build mode-specific message for GPT-4o
 */
function buildModeMessage(userPrompt, mode, modeInputs, preferences) {
  const parts = [];
  
  // User request
  parts.push(`🎯 USER REQUEST:\n${userPrompt}\n`);
  
  // Mode context
  parts.push(`📋 GENERATION MODE: ${mode.name} (${mode.icon})`);
  parts.push(`Description: ${mode.description}`);
  parts.push(`Model: ${mode.model}\n`);
  
  // Mode-specific inputs
  if (modeInputs.reference_image) {
    parts.push(`📸 Reference Image: Provided (will be used for style transfer)`);
  }
  
  if (modeInputs.source_image) {
    parts.push(`📸 Source Image: Provided (will be edited)`);
  }
  
  if (modeInputs.reference_images && modeInputs.reference_images.length > 0) {
    parts.push(`📸 Reference Images: ${modeInputs.reference_images.length} images provided`);
  }
  
  if (modeInputs.object_to_replace) {
    parts.push(`🎯 Object to Replace: "${modeInputs.object_to_replace}"`);
    parts.push(`✨ Replacement: "${modeInputs.replacement}"`);
  }
  
  if (modeInputs.new_background) {
    parts.push(`🌅 New Background: "${modeInputs.new_background}"`);
  }
  
  // User preferences (learning)
  if (preferences && preferences.length > 0) {
    parts.push(`\n📊 USER PREFERENCES (guidance from previous sessions):`);
    preferences.slice(0, 5).forEach(p => {
      parts.push(`  • ${p.parameter_name}: ${p.sub_parameter} (confidence: ${Math.round(p.weight)}%)`);
    });
    parts.push(`Note: These are suggestions, feel free to adapt based on current request\n`);
  }
  
  // Examples
  if (mode.examples && mode.examples.length > 0) {
    parts.push(`\n💡 EXAMPLE PROMPTS FOR THIS MODE:`);
    mode.examples.slice(0, 3).forEach((ex, i) => {
      parts.push(`  ${i + 1}. "${ex}"`);
    });
  }
  
  return parts.join('\n');
}

/**
 * Get mode-specific instruction for GPT-4o
 */
function getModeInstruction(mode) {
  return `\n\n🎯 MODE-SPECIFIC INSTRUCTIONS:

**Current Mode:** ${mode.name} (${mode.icon})
**Model:** ${mode.model}
**Capabilities:** ${mode.capabilities.join(', ')}

**Your Task:**
1. Analyze the user's request and mode context
2. ${getModeSpecificTask(mode.id)}
3. Write a detailed, optimized prompt for ${mode.model}
4. Consider the ${mode.capabilities.join(', ')} capabilities
5. Return ONLY the enhanced prompt (no explanations)

**Output Format:**
- Natural, flowing language
- Specific, detailed descriptions
- Optimized for ${mode.model} model
- ${mode.id.includes('reference') ? 'Mention how to use reference images' : ''}
- ${mode.id.includes('edit') ? 'Focus on specific changes needed' : ''}`;
}

/**
 * Get task description for each mode
 */
function getModeSpecificTask(modeId) {
  const tasks = {
    'text-to-image': 'Create a detailed, vivid description for image generation',
    'style-transfer': 'Describe how to apply the reference style to new content',
    'image-editing': 'Specify precise edits and enhancements needed',
    'multi-reference': 'Explain how to combine elements from multiple references',
    'object-replace': 'Detail the object replacement with natural integration',
    'background-change': 'Describe the new background and blending approach',
    'pro-quality': 'Emphasize quality, lighting, and professional details'
  };
  
  return tasks[modeId] || 'Create an optimized prompt for generation';
}

/**
 * Build model parameters based on mode and inputs
 */
function buildModelParameters(mode, modeInputs) {
  const params = {
    mode: mode.id,
    model: mode.model
  };
  
  // Add aspect ratio
  if (modeInputs.aspect_ratio) {
    params.aspect_ratio = modeInputs.aspect_ratio;
  } else if (mode.inputs.aspect_ratio?.default) {
    params.aspect_ratio = mode.inputs.aspect_ratio.default;
  }
  
  // Add image size
  if (modeInputs.image_size) {
    params.image_size = modeInputs.image_size;
  } else if (mode.inputs.image_size?.default) {
    params.image_size = mode.inputs.image_size.default;
  }
  
  // Add mode-specific parameters
  if (modeInputs.style_strength !== undefined) {
    params.style_strength = modeInputs.style_strength;
  }
  
  if (modeInputs.edit_strength !== undefined) {
    params.edit_strength = modeInputs.edit_strength;
  }
  
  if (modeInputs.blend_mode) {
    params.blend_mode = modeInputs.blend_mode;
  }
  
  if (modeInputs.quality) {
    params.quality = modeInputs.quality;
  }
  
  // Image URLs for reference-based modes
  const imageUrls = [];
  
  if (modeInputs.reference_image) {
    imageUrls.push(modeInputs.reference_image);
  }
  
  if (modeInputs.source_image) {
    imageUrls.push(modeInputs.source_image);
  }
  
  if (modeInputs.reference_images && modeInputs.reference_images.length > 0) {
    imageUrls.push(...modeInputs.reference_images);
  }
  
  if (modeInputs.object_images && modeInputs.object_images.length > 0) {
    imageUrls.push(...modeInputs.object_images);
  }
  
  if (modeInputs.character_images && modeInputs.character_images.length > 0) {
    imageUrls.push(...modeInputs.character_images);
  }
  
  if (imageUrls.length > 0) {
    params.image_urls = imageUrls;
  }
  
  return params;
}

/**
 * Default system prompt (fallback)
 */
function getDefaultSystemPrompt() {
  return `You are an expert AI assistant for visual content generation.

You specialize in creating detailed, optimized prompts for various image generation tasks:
- Text-to-image generation
- Style transfer and artistic transformations
- Image editing and enhancement
- Multi-reference combining
- Object replacement and background changes

Your goal is to transform user requests into detailed, specific prompts that maximize the quality and accuracy of AI-generated images.

Key principles:
- Be specific and detailed
- Consider composition, lighting, style, and mood
- Optimize for the target model's strengths
- Use clear, descriptive language
- Focus on what matters most for the task`;
}

// Export function for use in routes
export default {
  buildPromptGeneral
};



