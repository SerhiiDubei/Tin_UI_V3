import express from 'express';
import { analyzePhotosAndGeneratePrompt, describePhoto } from '../services/vision.service.js';

const router = express.Router();

/**
 * POST /api/vision/analyze
 * Analyze uploaded photos and generate a prompt
 * 
 * Body: {
 *   imageUrls: string[] (1-20 URLs),
 *   userInstructions?: string,
 *   agentType?: 'dating' | 'general' (default: 'general')
 * }
 * 
 * Note: Images should be temporary URLs (not saved to DB)
 * They can be base64 data URLs or temporary uploaded URLs
 */
router.post('/analyze', async (req, res) => {
  try {
    const { imageUrls, userInstructions = '', agentType = 'general', mode = null } = req.body;
    
    console.log('\n' + '='.repeat(80));
    console.log('📸 VISION ANALYSIS REQUEST');
    console.log('='.repeat(80));
    console.log('Images:', imageUrls?.length || 0);
    console.log('Agent type:', agentType);
    console.log('Mode:', mode || 'not specified');
    console.log('Has instructions:', !!userInstructions);
    
    // Validation
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'imageUrls is required and must be a non-empty array'
      });
    }
    
    if (imageUrls.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 images allowed'
      });
    }
    
    if (!['dating', 'general'].includes(agentType)) {
      return res.status(400).json({
        success: false,
        error: 'agentType must be "dating" or "general"'
      });
    }
    
    // Analyze photos
    const result = await analyzePhotosAndGeneratePrompt(
      imageUrls,
      userInstructions,
      agentType,
      mode // Pass mode to service
    );
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    console.log('✅ Analysis complete');
    console.log('Generated prompt length:', result.prompt.length, 'characters');
    console.log('='.repeat(80) + '\n');
    
    res.json({
      success: true,
      data: {
        prompt: result.prompt,
        analysis: result.analysis,
        imageCount: result.imageCount,
        model: result.model,
        agentType: result.agentType
      }
    });
    
  } catch (error) {
    console.error('❌ Vision analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vision/describe
 * Get a quick description of a single photo
 * 
 * Body: {
 *   imageUrl: string,
 *   detailLevel?: 'low' | 'medium' | 'high' (default: 'medium')
 * }
 */
router.post('/describe', async (req, res) => {
  try {
    const { imageUrl, detailLevel = 'medium' } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'imageUrl is required'
      });
    }
    
    if (!['low', 'medium', 'high'].includes(detailLevel)) {
      return res.status(400).json({
        success: false,
        error: 'detailLevel must be "low", "medium", or "high"'
      });
    }
    
    console.log('📸 Describing photo:', imageUrl.substring(0, 50) + '...');
    
    const result = await describePhoto(imageUrl, detailLevel);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    res.json({
      success: true,
      data: {
        description: result.description
      }
    });
    
  } catch (error) {
    console.error('❌ Photo description error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vision/batch-analyze
 * Analyze multiple sets of photos separately
 * Useful for comparing different photo styles or generating multiple prompts
 * 
 * Body: {
 *   photoSets: Array<{
 *     imageUrls: string[],
 *     userInstructions?: string,
 *     agentType?: 'dating' | 'general'
 *   }>
 * }
 */
router.post('/batch-analyze', async (req, res) => {
  try {
    const { photoSets } = req.body;
    
    if (!photoSets || !Array.isArray(photoSets) || photoSets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'photoSets is required and must be a non-empty array'
      });
    }
    
    if (photoSets.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 5 photo sets allowed'
      });
    }
    
    console.log(`\n🔥 Batch analyzing ${photoSets.length} photo sets...`);
    
    // Analyze all sets in parallel
    const promises = photoSets.map((set, index) => 
      analyzePhotosAndGeneratePrompt(
        set.imageUrls,
        set.userInstructions || '',
        set.agentType || 'general'
      ).then(result => ({ ...result, setIndex: index }))
    );
    
    const results = await Promise.all(promises);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Batch complete: ${successful.length} successful, ${failed.length} failed\n`);
    
    res.json({
      success: failed.length === 0,
      total: photoSets.length,
      successful: successful.length,
      failed: failed.length,
      results: results.map(r => ({
        success: r.success,
        setIndex: r.setIndex,
        prompt: r.prompt,
        analysis: r.analysis,
        imageCount: r.imageCount,
        error: r.error
      }))
    });
    
  } catch (error) {
    console.error('❌ Batch analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
