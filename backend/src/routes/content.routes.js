import express from 'express';
import supabase from '../db/supabase.js';
import { generateContent, batchGenerate } from '../services/replicate.service.js';
// ⚠️ DEPRECATED: This route uses old system without weights
// For V3 generation with weights, use /api/generation instead
import { enhancePrompt, detectCategory } from '../services/openai.service.js';
import { getUserInsights } from '../services/insights.service.js';
import { getDefaultModel } from '../config/models.js';

const router = express.Router();

/**
 * POST /api/content/generate
 * Generate new content (single or batch)
 */
router.post('/generate', async (req, res) => {
  try {
    const { 
      prompt, 
      userId, 
      templateId, 
      contentType = 'image',
      modelKey,
      count = 1,
      customParams = {}
    } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    console.log('\n' + '🎨'.repeat(40));
    console.log('🎨 CONTENT GENERATION REQUEST - START');
    console.log('🎨'.repeat(40));
    console.log('📝 Original Prompt:', prompt);
    console.log('🎬 Content Type:', contentType);
    console.log('🔢 Count:', count);
    console.log('👤 User ID:', userId || 'anonymous');
    console.log('📋 Template ID:', templateId || 'none');
    console.log('🎛️  Model Key:', modelKey || 'default');
    console.log('⚙️  Custom Params:', customParams ? JSON.stringify(customParams) : 'none');
    
    // Get template if provided
    let template = null;
    if (templateId) {
      const { data } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      template = data;
    }
    
    // Get user insights if userId provided
    let userInsights = null;
    if (userId) {
      console.log('\n🔍 Fetching user insights...');
      userInsights = await getUserInsights(userId);
      if (userInsights) {
        console.log('✅ User insights found:');
        console.log('   Total swipes:', userInsights.total_swipes || 0);
        console.log('   Likes keywords:', (userInsights.likes_json || []).length);
        console.log('   Dislikes keywords:', (userInsights.dislikes_json || []).length);
      } else {
        console.log('⚠️  No user insights available');
      }
    }
    
    // Build context for enhancement
    const templateLikes = template?.insights_json?.likes || [];
    const templateDislikes = template?.insights_json?.dislikes || [];
    const userLikes = userInsights?.likes_json || [];
    const userDislikes = userInsights?.dislikes_json || [];
    
    const context = {
      systemInstructions: template?.system_instructions,
      insights: {
        likes: [...templateLikes, ...userLikes],
        dislikes: [...templateDislikes, ...userDislikes]
      }
    };
    
    console.log('\n📊 CONTEXT FOR ENHANCEMENT:');
    console.log('   Template likes:', templateLikes.length);
    console.log('   User likes:', userLikes.length);
    console.log('   Template dislikes:', templateDislikes.length);
    console.log('   User dislikes:', userDislikes.length);
    console.log('   Total likes in context:', context.insights.likes.length);
    console.log('   Total dislikes in context:', context.insights.dislikes.length);
    
    // Detect category automatically
    const { category } = await detectCategory(prompt, contentType);
    console.log(`📂 Detected category: ${category}`);
    
    // Add category to context
    context.category = category;
    
    // Determine model to use
    const selectedModel = modelKey || getDefaultModel(contentType);
    
    // Batch or single generation
    if (count > 1) {
      console.log(`🔄 Batch generation: ${count} items with UNIQUE prompts`);
      
      // Generate UNIQUE enhanced prompt for EACH item
      const enhancedPrompts = [];
      for (let i = 0; i < count; i++) {
        const variantContext = { 
          ...context, 
          variationIndex: i 
        };
        const { enhancedPrompt } = await enhancePrompt(prompt, variantContext);
        enhancedPrompts.push(enhancedPrompt);
        console.log(`  ✓ Prompt ${i + 1}/${count}: ${enhancedPrompt.substring(0, 80)}...`);
      }
      
      // Batch generation with different prompts
      const promises = [];
      for (let i = 0; i < count; i++) {
        promises.push(
          generateContent(
            enhancedPrompts[i], 
            contentType, 
            selectedModel,
            { ...template?.model_params, ...customParams },
            userId
          )
        );
      }
      
      const results = await Promise.all(promises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      if (failed.length === count) {
        return res.status(500).json({ error: 'All generations failed', details: { failed: failed.length } });
      }
      
      // Save all successful generations to database with their unique prompts
      // First one is the parent, others are variations
      const contentToInsert = results
        .map((r, idx) => r.success ? {
          url: r.url,
          type: contentType,
          original_prompt: prompt,
          enhanced_prompt: enhancedPrompts[idx],
          final_prompt: enhancedPrompts[idx],
          model: r.model,
          template_id: templateId || null,
          user_id: userId || null,
          parent_id: null, // Will be set after first insert
          meta_json: { 
            ...template?.model_params, 
            ...customParams, 
            modelKey: selectedModel,
            contentType: contentType,
            category: category,
            variationIndex: idx,
            isVariation: idx > 0 // Mark variations
          }
        } : null)
        .filter(Boolean);
      
      // Insert first (parent) item
      if (contentToInsert.length === 0) {
        return res.status(500).json({ error: 'All generations failed' });
      }
      
      const { data: firstContent, error: firstError } = await supabase
        .from('content')
        .insert([contentToInsert[0]])
        .select()
        .single();
      
      if (firstError) throw firstError;
      
      // Insert remaining items as variations (with parent_id)
      let savedVariations = [];
      if (contentToInsert.length > 1) {
        const variations = contentToInsert.slice(1).map(item => ({
          ...item,
          parent_id: firstContent.id // Link to parent
        }));
        
        const { data: variationsData, error: variationsError } = await supabase
          .from('content')
          .insert(variations)
          .select();
        
        if (variationsError) throw variationsError;
        savedVariations = variationsData || [];
      }
      
      const savedContent = [firstContent, ...savedVariations];
      
      return res.json({
        success: true,
        batch: true,
        total: count,
        successful: successful.length,
        failed: failed.length,
        content: savedContent,
        parentId: firstContent.id // ID of parent content
      });
    } else {
      // Single generation
      const { enhancedPrompt } = await enhancePrompt(prompt, context);
      console.log(`✨ Enhanced prompt: ${enhancedPrompt}`);
      
      const result = await generateContent(
        enhancedPrompt, 
        contentType, 
        selectedModel,
        { ...template?.model_params, ...customParams },
        userId
      );
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      // Save to database
      const { data: content, error } = await supabase
        .from('content')
        .insert({
          url: result.url,
          type: contentType,
          original_prompt: prompt,
          enhanced_prompt: enhancedPrompt,
          final_prompt: enhancedPrompt,
          model: result.model,
          template_id: templateId || null,
          user_id: userId || null,
          parent_id: null,
          meta_json: { 
            ...template?.model_params, 
            ...customParams, 
            modelKey: selectedModel,
            contentType: contentType,
            category: category
          }
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('\n✅ CONTENT SAVED TO DATABASE');
      console.log('   ID:', content.id);
      console.log('   Type:', content.type);
      console.log('   Model:', content.model);
      console.log('   URL:', content.url.substring(0, 60) + '...');
      
      console.log('\n' + '🎨'.repeat(40));
      console.log('🎨 CONTENT GENERATION REQUEST - SUCCESS');
      console.log('🎨'.repeat(40) + '\n');
      
      res.json({
        success: true,
        content: content
      });
    }
  } catch (error) {
    console.error('\n❌ CONTENT GENERATION ERROR:', error);
    console.log('🎨'.repeat(40) + '\n');
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/content/:id
 * Get content by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, data: data });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/content
 * Get content list with filters
 */
router.get('/', async (req, res) => {
  try {
    const { 
      userId, 
      templateId, 
      type,
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      order = 'desc'
    } = req.query;
    
    let query = supabase
      .from('content')
      .select('*', { count: 'exact' });
    
    if (userId) query = query.eq('user_id', userId);
    if (templateId) query = query.eq('template_id', templateId);
    if (type) query = query.eq('type', type);
    
    query = query
      .order(sortBy, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      content: data,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Get content list error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/content/random
 * Get random content for swipe
 */
router.get('/random/next', async (req, res) => {
  try {
    const { userId, excludeIds = '' } = req.query;
    
    let query = supabase
      .from('content')
      .select('*');
    
    // Exclude already rated content
    if (excludeIds) {
      const ids = excludeIds.split(',');
      query = query.not('id', 'in', `(${ids.join(',')})`);
    }
    
    // Exclude user's own ratings if userId provided
    // BUT include skipped items (direction = 'down') so they can be reviewed again
    if (userId) {
      const { data: ratedIds } = await supabase
        .from('ratings')
        .select('content_id, direction')
        .eq('user_id', userId)
        .neq('direction', 'down'); // Don't exclude skipped items
      
      console.log(`🔍 User ${userId} has ${ratedIds?.length || 0} rated items (excluding skipped)`);
      
      if (ratedIds && ratedIds.length > 0) {
        const ids = ratedIds.map(r => r.content_id);
        query = query.not('id', 'in', `(${ids.join(',')})`);
      }
    }
    
    // Get random (simple approach)
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`📊 Found ${data?.length || 0} available content items`);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return res.json({ success: false, message: 'No content available' });
    }
    
    // Pick random from top 10
    const randomContent = data[Math.floor(Math.random() * data.length)];
    
    res.json({
      success: true,
      content: randomContent
    });
  } catch (error) {
    console.error('Get random content error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
