import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });

// Validate required env vars
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'REPLICATE_API_TOKEN',
  'OPENAI_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease check your .env file.');
  process.exit(1);
}

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  },
  
  replicate: {
    apiToken: process.env.REPLICATE_API_TOKEN
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || 'AIzaSyC4l1mFJNJEqB-i279aifZ3e7tTH_7VD8M'
  },
  
  cors: {
    origins: process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000']
  },
  
  rateLimit: parseInt(process.env.RATE_LIMIT) || 100,
  logLevel: process.env.LOG_LEVEL || 'info'
};

export default config;
