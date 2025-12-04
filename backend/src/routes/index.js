import express from 'express';
import contentRoutes from './content.routes.js';
// import ratingsRoutes from './ratings.routes.js'; // LEGACY - removed, using session_ratings now
import insightsRoutes from './insights.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import projectsRoutes from './projects.routes.js';
import sessionsRoutes from './sessions.routes.js';
import generationRoutes from './generation.routes.js';
import visionRoutes from './vision.routes.js';
import qaRoutes from './qa.routes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Tin_UI_V3 API',
    version: '3.0.0'
  });
});

// V3 Routes
router.use('/projects', projectsRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/generation', generationRoutes);
router.use('/vision', visionRoutes);
router.use('/qa', qaRoutes);

// V2 Routes (legacy support)
router.use('/content', contentRoutes);
// router.use('/ratings', ratingsRoutes); // LEGACY - removed, using session_ratings now
router.use('/insights', insightsRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

export default router;
