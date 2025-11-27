import express from 'express';
import { supabase } from '../db/supabase.js';
import { createParametersForCategory, initializeSessionWeights } from '../services/weights.service.js';

const router = express.Router();

/**
 * GET /api/sessions
 * Get sessions for a project
 * Query: projectId
 */
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId is required'
      });
    }
    
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('project_id', projectId)
      .order('session_number', { ascending: true });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: sessions
    });
    
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/:id
 * Get session details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      data: session
    });
    
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/sessions
 * Create new session
 * Body: { projectId, userId, name?, userPrompt }
 * 
 * IMPORTANT: This creates parameters and initializes weights
 */
router.post('/', async (req, res) => {
  try {
    const { projectId, userId, name, userPrompt } = req.body;
    
    if (!projectId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'projectId and userId are required'
      });
    }
    
    console.log('\n🚀 CREATING NEW SESSION');
    console.log('Project ID:', projectId);
    console.log('User Prompt:', userPrompt);
    
    // Get project to know the category
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError) throw projectError;
    
    const category = project.tag; // dating, cars, insurance, etc.
    
    // Get next session number
    const { data: existingSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('session_number')
      .eq('project_id', projectId)
      .order('session_number', { ascending: false })
      .limit(1);
    
    if (sessionsError) throw sessionsError;
    
    const nextNumber = existingSessions && existingSessions.length > 0
      ? existingSessions[0].session_number + 1
      : 1;
    
    // Create session
    const { data: session, error: createError } = await supabase
      .from('sessions')
      .insert([{
        project_id: projectId,
        user_id: userId,
        name: name || `Session ${nextNumber}`,
        session_number: nextNumber,
        status: 'active'
      }])
      .select()
      .single();
    
    if (createError) throw createError;
    
    console.log('✅ Session created:', session.id);
    
    // Create parameters dynamically
    console.log('🤖 Creating parameters for category:', category);
    const parametersResult = await createParametersForCategory(category, userPrompt || 'default');
    
    if (!parametersResult.success) {
      throw new Error('Failed to create parameters: ' + parametersResult.error);
    }
    
    const parameters = parametersResult.parameters;
    
    // Initialize weights (inherits from previous sessions or starts at 100)
    console.log('⚖️ Initializing weights...');
    const weightsResult = await initializeSessionWeights(session.id, projectId, parameters);
    
    if (!weightsResult.success) {
      throw new Error('Failed to initialize weights: ' + weightsResult.error);
    }
    
    console.log('✅ Session fully initialized with parameters and weights');
    
    res.json({
      success: true,
      data: {
        session,
        parameters: parametersResult.parameters,
        parametersMetadata: parametersResult.metadata,
        weightsInitialized: weightsResult.weightsCount
      }
    });
    
  } catch (error) {
    console.error('❌ Create session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/sessions/:id
 * Update session (mainly for renaming)
 * Body: { name?, status? }
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.status !== undefined) updates.status = req.body.status;
    
    const { data: session, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: session
    });
    
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete session
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    console.log('✅ Session deleted:', id);
    
    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/:id/stats
 * Get session statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (sessionError) throw sessionError;
    
    // Get content count
    const { count: contentCount, error: contentError } = await supabase
      .from('content_v3')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', id);
    
    if (contentError) throw contentError;
    
    // Get ratings breakdown
    const { data: ratings, error: ratingsError } = await supabase
      .from('content_v3')
      .select('rating')
      .eq('session_id', id)
      .not('rating', 'is', null);
    
    if (ratingsError) throw ratingsError;
    
    const ratingsBreakdown = {
      superlike: ratings.filter(r => r.rating === 3).length,
      like: ratings.filter(r => r.rating === 1).length,
      dislike: ratings.filter(r => r.rating === -1).length,
      superDislike: ratings.filter(r => r.rating === -3).length
    };
    
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length
      : 0;
    
    res.json({
      success: true,
      data: {
        session,
        stats: {
          totalGenerations: contentCount || 0,
          totalRatings: ratings.length,
          avgRating: parseFloat(avgRating.toFixed(2)),
          ratingsBreakdown
        }
      }
    });
    
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/:id/parameters
 * Get session parameters and current weights
 */
router.get('/:id/parameters', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: weights, error } = await supabase
      .from('weight_parameters')
      .select('*')
      .eq('session_id', id);
    
    if (error) throw error;
    
    // Group by parameter
    const parameters = {};
    for (const w of weights) {
      if (!parameters[w.parameter_name]) {
        parameters[w.parameter_name] = [];
      }
      parameters[w.parameter_name].push({
        value: w.sub_parameter,
        weight: w.weight,
        times_used: w.times_used,
        times_selected: w.times_selected
      });
    }
    
    res.json({
      success: true,
      data: {
        parameters,
        totalParameters: weights.length,
        categories: Object.keys(parameters).length
      }
    });
    
  } catch (error) {
    console.error('Get session parameters error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
