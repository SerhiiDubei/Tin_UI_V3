import express from 'express';
// import contentRoutes from './content.routes.js'; // LEGACY V2 - uses prompt_templates
// import ratingsRoutes from './ratings.routes.js'; // LEGACY V2 - uses old ratings table
// import insightsRoutes from './insights.routes.js'; // LEGACY V2 - uses prompt_templates
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

// V3 Routes (Active)
router.use('/projects', projectsRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/generation', generationRoutes);
router.use('/vision', visionRoutes);
router.use('/qa', qaRoutes);

// V2 Routes (legacy support) - DISABLED, using V3 architecture
// router.use('/content', contentRoutes); // LEGACY - uses prompt_templates table
// router.use('/ratings', ratingsRoutes); // LEGACY - uses old ratings table
// router.use('/insights', insightsRoutes); // LEGACY - uses prompt_templates table

// Core routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

export default router;

