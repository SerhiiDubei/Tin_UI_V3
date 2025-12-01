import Replicate from 'replicate';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, 'backend/.env') });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

async function testNanoBananaPro() {
  console.log('\n' + '='.repeat(80));
  console.log('🍌 TESTING NANO BANANA PRO MODEL');
  console.log('='.repeat(80));
  
  try {
    // Check if API token is set
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN is not set in environment');
    }
    
    console.log('✅ API Token found (length:', process.env.REPLICATE_API_TOKEN.length, ')');
    
    // Try to get model info
    console.log('\n📋 Fetching model info for google/nano-banana-pro...');
    
    const model = await replicate.models.get('google', 'nano-banana-pro');
    
    console.log('✅ Model found!');
    console.log('Model details:', JSON.stringify(model, null, 2));
    
    console.log('\n🔍 Latest version:');
    if (model.latest_version) {
      console.log('   ID:', model.latest_version.id);
      console.log('   Created:', model.latest_version.created_at);
    }
    
    // Try to generate a simple test image
    console.log('\n🎨 Testing image generation...');
    console.log('Prompt: "Beautiful woman smiling, smartphone photo"');
    
    const output = await replicate.run(
      'google/nano-banana-pro',
      {
        input: {
          prompt: "Beautiful woman smiling, smartphone photo, natural lighting, candid moment"
        }
      }
    );
    
    console.log('\n✅ Generation successful!');
    console.log('Output:', output);
    
    if (Array.isArray(output) && output.length > 0) {
      console.log('\n📸 Generated image URL:', output[0]);
    } else if (typeof output === 'string') {
      console.log('\n📸 Generated image URL:', output);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ NANO BANANA PRO TEST SUCCESSFUL!');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    if (error.message.includes('not found')) {
      console.log('\n💡 Model might not exist or is not public yet.');
      console.log('   Check https://replicate.com/google/nano-banana-pro');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(80) + '\n');
  }
}

testNanoBananaPro();
