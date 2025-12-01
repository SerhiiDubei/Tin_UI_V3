# Nano Banana Pro - Setup and Testing Guide

## Model Information

**Model**: `google/nano-banana-pro`  
**Provider**: Replicate  
**Status**: ✅ Model exists and is public  
**URL**: https://replicate.com/google/nano-banana-pro

## Current Configuration

The model is already configured in `backend/src/config/models.js`:

```javascript
{
  key: 'nano-banana-pro',
  name: 'Nano Banana Pro',
  description: "Google's SOTA image generation with Gemini 3 Pro",
  price: '$0.025',
  speed: 'Швидко (~45 сек)',
  replicateId: 'google/nano-banana-pro',
  params: {
    width: 1024,
    height: 1024
  }
}
```

## Prerequisites

You need a **Replicate API Token** to use this model:

1. Go to https://replicate.com/account/api-tokens
2. Create or copy your API token (starts with `r8_...`)
3. Add it to your backend `.env` file:

```bash
REPLICATE_API_TOKEN=r8_your_token_here
```

4. Or set it as an environment variable in Vercel Dashboard:
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add: `REPLICATE_API_TOKEN` = `r8_your_token_here`
   - Apply to: Production, Preview, Development

## Testing

### Manual Test

You can test the model directly using the test script:

```bash
cd backend
node test-nano-banana-pro.js
```

Expected output:
```
================================================================================
🍌 TESTING NANO BANANA PRO MODEL
================================================================================
✅ API Token found
📋 Fetching model info for google/nano-banana-pro...
✅ Model found!
🎨 Testing image generation...
✅ Generation successful!
📸 Generated image URL: https://replicate.delivery/...
================================================================================
✅ NANO BANANA PRO TEST SUCCESSFUL!
================================================================================
```

### Test via Frontend

1. Go to https://serhiidubei.github.io/Tin_UI_V3/
2. Login (admin/admin123)
3. Create a project (if not exists)
4. Create a session
5. In generation page, select **"Nano Banana Pro"** from model dropdown
6. Enter a prompt and click "Згенерувати"
7. Check if images are generated successfully

## Model Features

According to Replicate documentation, Nano Banana Pro supports:

- **Text-to-Image**: Generate images from text prompts
- **Image Editing**: Edit existing images with prompts
- **Multi-Image Blending**: Combine up to 14 images
- **Character Consistency**: Preserve up to 5 people's appearance
- **High Resolution**: Up to 4K (3840x2160)
- **Text Rendering**: Generate legible text in images
- **Google Search Integration**: Connect to real-time facts (optional)
- **SynthID Watermark**: All images include invisible watermark

## Parameter Schema (Inferred)

```javascript
{
  prompt: "string (required)",
  width: 1024,  // up to 3840
  height: 1024, // up to 2160
  num_outputs: 1,
  steps: 50,
  guidance_scale: 7.5,
  seed: null,
  // For editing
  images: [],  // up to 14 image URLs
  mask: null,  // mask image URL
  mode: "generate",  // or "edit", "blend", "inpaint"
  // Advanced
  preserve_people: 5,
  enable_search: false,
  target_language: null,
  style: null,
  lighting: null,
  camera_angle: null,
  negative_prompt: null,
  output_format: "png"
}
```

## Implementation Status

### ✅ Completed
- Model configuration in `models.js`
- Model available in frontend dropdown
- Replicate service integration (`replicate.service.js`)
- Parallel generation support (`Promise.all()`)

### ⚠️ Requires Setup
- Add `REPLICATE_API_TOKEN` to environment variables
- Test generation to verify model access
- Update model parameters if needed (based on official schema)

## Troubleshooting

### Error: "REPLICATE_API_TOKEN is not set"
**Solution**: Add the token to your `.env` file or Vercel environment variables

### Error: "Model not found"
**Solution**: The model might be:
- Not public yet (check Replicate page)
- Requires special access (contact Replicate)
- Renamed or moved (update `replicateId` in config)

### Error: "Invalid parameters"
**Solution**: Get the official parameter schema:
```bash
curl -H "Authorization: Token $REPLICATE_API_TOKEN" \
  "https://api.replicate.com/v1/models/google/nano-banana-pro/versions"
```

## Next Steps

1. **Add API Token**: Set `REPLICATE_API_TOKEN` in environment
2. **Run Test**: Execute `node test-nano-banana-pro.js`
3. **Verify in UI**: Test generation via frontend
4. **Update Parameters**: If needed, adjust params based on official schema
5. **Document Results**: Add test results and screenshots

## Related Files

- Configuration: `backend/src/config/models.js`
- Service: `backend/src/services/replicate.service.js`
- Routes: `backend/src/routes/generation.routes.js`
- Frontend: `frontend/src/pages/GeneratePageV3.jsx`
- Test script: `backend/test-nano-banana-pro.js`

---

**Last Updated**: 2025-12-01  
**Status**: Ready for testing (requires API token)
