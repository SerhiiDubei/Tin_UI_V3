import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './middleware/logger.js';
import { testConnection } from './db/supabase.js';
import { initializeStorage } from './services/storage.service.js';

const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (config.cors.origins.indexOf(origin) !== -1 || config.cors.origins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      console.warn(`   Allowed origins: ${config.cors.origins.join(', ')}`);
      callback(null, true); // Allow anyway for now to debug
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Tinder AI Feedback API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      content: '/api/content',
      ratings: '/api/ratings',
      insights: '/api/insights'
    }
  });
});

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.warn('⚠️  Failed to connect to database. Server will start but DB operations will fail.');
      console.warn('   To fix: Apply migrations at https://ffnmlfnzufddmecfpive.supabase.co');
    } else {
      console.log('✅ Database connected successfully!');
    }
    
    // Initialize storage bucket
    console.log('📦 Checking storage...');
    const storageReady = await initializeStorage();
    if (!storageReady) {
      console.log('⚠️  Storage not ready, but server will continue...');
      console.log('   Files will use temporary URLs until bucket is created.');
    }
    
    // Start listening (only in non-serverless environment)
    if (process.env.VERCEL !== '1') {
      app.listen(config.port, () => {
        console.log('');
        console.log('🚀 Server started successfully!');
        console.log('');
        console.log(`📡 API running on: http://localhost:${config.port}`);
        console.log(`🌍 Environment: ${config.nodeEnv}`);
        console.log(`📊 CORS origins: ${config.cors.origins.join(', ')}`);
        console.log('');
        console.log('Available endpoints:');
        console.log(`  - Health: http://localhost:${config.port}/api/health`);
        console.log(`  - Content: http://localhost:${config.port}/api/content`);
        console.log(`  - Ratings: http://localhost:${config.port}/api/ratings`);
        console.log(`  - Insights: http://localhost:${config.port}/api/insights`);
        console.log('');
        console.log('Press Ctrl+C to stop');
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
  }
}

// Initialize server
startServer();

// Export for Vercel serverless
export default app;
