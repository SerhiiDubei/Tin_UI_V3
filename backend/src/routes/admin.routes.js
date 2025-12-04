import express from 'express';
import { supabase } from '../db/supabase.js';
import { migrateExistingUrls } from '../services/storage.service.js';

const router = express.Router();

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
router.get('/users', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, full_name, role, created_at, updated_at, last_login_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users/:userId/details
 * Get detailed information about a specific user
 */
router.get('/users/:userId/details', async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Get user's projects with counts
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (projectsError) throw projectsError;

    // Get user's sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sessionsError) throw sessionsError;

    // Get user's content (using content_v3 table) - ALL content, no limit
    const { data: content, error: contentError } = await supabase
      .from('content_v3')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (contentError) throw contentError;

    // Calculate statistics from content (ratings are stored in content_v3.rating)
    // These ratings are auto-synced to session_ratings table for AI learning
    const ratedContent = content?.filter(c => c.rating !== null && c.rating !== undefined) || [];

    const stats = {
      totalProjects: projects?.length || 0,
      totalSessions: sessions?.length || 0,
      totalContent: content?.length || 0,
      totalRatings: ratedContent.length,
      likes: ratedContent.filter(c => c.rating === 1).length,
      dislikes: ratedContent.filter(c => c.rating === -1).length,
      superlikes: ratedContent.filter(c => c.rating === 3).length,
      rerolls: ratedContent.filter(c => c.rating === -3).length
    };

    res.json({
      success: true,
      data: {
        user,
        projects: projects || [],
        sessions: sessions || [],
        recentContent: content || [],
        recentRatings: ratedContent || [],
        stats
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/all-content
 * Get all content from content_v3 table
 */
router.get('/all-content', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('content_v3')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/stats
 * Get system statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [usersCount, contentCount] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('content_v3').select('id', { count: 'exact', head: true })
    ]);

    // Count rated content (ratings are in content_v3)
    const { count: ratingsCount } = await supabase
      .from('content_v3')
      .select('id', { count: 'exact', head: true })
      .not('rating', 'is', null);

    res.json({
      success: true,
      data: {
        users: usersCount.count || 0,
        content: contentCount.count || 0,
        ratings: ratingsCount || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/migrate-urls
 * Migrate existing temporary Replicate URLs to permanent Supabase Storage
 * This fixes the issue where URLs expire after 24-48 hours
 */
router.post('/migrate-urls', async (req, res, next) => {
  try {
    console.log('🔄 Starting URL migration...');
    
    const result = await migrateExistingUrls();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'URL migration completed',
      data: {
        total: result.total,
        migrated: result.migrated,
        failed: result.failed
      }
    });
  } catch (error) {
    console.error('Migration error:', error);
    next(error);
  }
});

export default router;
