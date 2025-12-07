import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });

// Validate required env vars (critical for app to work)
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY'  // OpenAI is required for prompt enhancement and Vision AI
];

// Optional env vars (app can work without these)
const optionalEnvVars = [
  'REPLICATE_API_TOKEN',  // Optional - for Nano Banana Pro model
  'GEMINI_API_KEY'        // Optional - for Gemini features
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease check your .env file or Vercel Environment Variables.');
  
  // On Vercel, don't exit - let it continue with warnings
  // This allows the function to start even with missing env vars (will fail on actual API calls)
  if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
    console.error('⚠️  Exiting in development mode. Production mode will continue with warnings.');
    process.exit(1);
  } else {
    console.warn('⚠️  Continuing with missing env vars (production/Vercel mode). API calls may fail.');
  }
}

// Check optional env vars
const missingOptionalVars = optionalEnvVars.filter(varName => !process.env[varName]);
if (missingOptionalVars.length > 0) {
  console.warn('⚠️  Missing optional environment variables:');
  missingOptionalVars.forEach(varName => {
    console.warn(`   - ${varName}`);
  });
  console.warn('   Some features may not work without these.');
}

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  
  replicate: {
    apiToken: process.env.REPLICATE_API_TOKEN
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  
  gemini: {
    apiKey: process.env.GEMINI_API_KEY
  },
  
  cors: {
    origins: process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3000', 'https://serhiidubei.github.io']
  },
  
  rateLimit: parseInt(process.env.RATE_LIMIT) || 100,
  logLevel: process.env.LOG_LEVEL || 'info'
};

export default config;
