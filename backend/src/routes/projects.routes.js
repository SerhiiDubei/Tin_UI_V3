import express from 'express';
import { supabase } from '../db/supabase.js';

const router = express.Router();

/**
 * GET /api/projects
 * Get all projects for a user
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    // Add statistics for each project
    const projectsWithStats = await Promise.all(
      (projects || []).map(async (project) => {
        // Count sessions
        const { count: sessionsCount } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);
        
        // Count generations
        const { count: generationsCount } = await supabase
          .from('content_v3')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);
        
        // Count ratings
        const { count: ratingsCount } = await supabase
          .from('content_v3')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .not('rating', 'is', null);
        
        return {
          ...project,
          sessions_count: sessionsCount || 0,
          generations_count: generationsCount || 0,
          ratings_count: ratingsCount || 0
        };
      })
    );
    
    res.json({
      success: true,
      data: projectsWithStats
    });
    
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/projects/:id
 * Get project details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    // Add statistics
    const { count: sessionsCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id);
    
    const { count: generationsCount } = await supabase
      .from('content_v3')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id);
    
    const { count: ratingsCount } = await supabase
      .from('content_v3')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id)
      .not('rating', 'is', null);
    
    res.json({
      success: true,
      data: {
        ...project,
        sessions_count: sessionsCount || 0,
        generations_count: generationsCount || 0,
        ratings_count: ratingsCount || 0
      }
    });
    
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/projects
 * Create new project
 * Body: { userId, name, tag, description }
 */
router.post('/', async (req, res) => {
  try {
    const { userId, name, tag, description } = req.body;
    
    if (!userId || !name || !tag) {
      return res.status(400).json({
        success: false,
        error: 'userId, name, and tag are required'
      });
    }
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert([{
        user_id: userId,
        name,
        tag,
        description: description || null
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Project created:', project.id);
    
    res.json({
      success: true,
      data: project
    });
    
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 * Body: { name?, tag?, description? }
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.tag !== undefined) updates.tag = req.body.tag;
    if (req.body.description !== undefined) updates.description = req.body.description;
    
    const { data: project, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: project
    });
    
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project (cascades to sessions, content, weights)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    console.log('✅ Project deleted:', id);
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/projects/:id/stats
 * Get project statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (projectError) throw projectError;
    
    // Get sessions count
    const { count: sessionsCount, error: sessionsError } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id);
    
    if (sessionsError) throw sessionsError;
    
    // Get content count
    const { count: contentCount, error: contentError } = await supabase
      .from('content_v3')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id);
    
    if (contentError) throw contentError;
    
    // Get rated content count
    const { count: ratedCount, error: ratedError } = await supabase
      .from('content_v3')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id)
      .not('rating', 'is', null);
    
    if (ratedError) throw ratedError;
    
    // Get average rating
    const { data: avgData, error: avgError } = await supabase
      .from('content_v3')
      .select('rating')
      .eq('project_id', id)
      .not('rating', 'is', null);
    
    if (avgError) throw avgError;
    
    const avgRating = avgData && avgData.length > 0
      ? avgData.reduce((sum, item) => sum + item.rating, 0) / avgData.length
      : 0;
    
    res.json({
      success: true,
      data: {
        project,
        stats: {
          totalSessions: sessionsCount || 0,
          totalGenerations: contentCount || 0,
          totalRatings: ratedCount || 0,
          avgRating: parseFloat(avgRating.toFixed(2))
        }
      }
    });
    
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
