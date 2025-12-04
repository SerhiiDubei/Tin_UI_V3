import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = 'AIzaSyC4l1mFJNJEqB-i279aifZ3e7tTH_7VD8M';

async function testGeminiImagen() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING GEMINI IMAGEN 3 (Nano Banana Pro)');
  console.log('='.repeat(80));
  
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    console.log('✅ API Key configured');
    console.log('📋 Checking available models...');
    
    // List all available models
    const models = await genAI.listModels();
    console.log('\n📊 Available models:');
    
    const imageModels = [];
    for await (const model of models) {
      if (model.name.includes('imagen') || 
          model.name.includes('image') ||
          model.displayName?.toLowerCase().includes('image')) {
        imageModels.push(model);
        console.log(`\n✨ ${model.displayName || model.name}`);
        console.log(`   Name: ${model.name}`);
        console.log(`   Description: ${model.description || 'N/A'}`);
        console.log(`   Supported methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      }
    }
    
    if (imageModels.length === 0) {
      console.log('\n⚠️  No image generation models found in available models');
      console.log('ℹ️  Imagen 3 may not be available through standard Gemini API');
      console.log('ℹ️  It might require:');
      console.log('   - Vertex AI access (Google Cloud)');
      console.log('   - Special API access/waitlist');
      console.log('   - Different API endpoint');
    }
    
    // Try to generate with Imagen (if available)
    console.log('\n🎨 Attempting image generation...');
    try {
      const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' });
      
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: 'A beautiful sunset over mountains' }]
        }]
      });
      
      console.log('✅ Generation successful!');
      console.log('Result:', result);
      
    } catch (genError) {
      console.log('\n❌ Image generation failed:', genError.message);
      
      if (genError.message.includes('not found')) {
        console.log('\n💡 Imagen 3 is NOT available through free Gemini API');
        console.log('   Options:');
        console.log('   1. Use Replicate ($0.15 per image)');
        console.log('   2. Use Google Cloud Vertex AI (requires billing account)');
        console.log('   3. Use alternative free models (FLUX Schnell on Replicate is $0.003)');
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\n' + '='.repeat(80));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(80) + '\n');
  }
}

testGeminiImagen();
