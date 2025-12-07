import React, { useState } from 'react';
import ModeSelector from '../ModeSelector';
import './PhotoUploadModal.css';

/**
 * 📸 Photo Upload Modal - Universal
 * 
 * For DATING projects:
 *   - Upload photos → Vision AI analysis → Generate prompt
 * 
 * For GENERAL projects:
 *   - Select Generation Mode (8 modes)
 *   - Upload reference images (if needed for mode)
 *   - Set mode-specific options
 */
const PhotoUploadModal = ({ 
  isOpen, 
  onClose, 
  onPromptGenerated, 
  agentType = 'general',
  onModeDataReady // New callback for General AI (mode + reference images)
}) => {
  // All hooks MUST be before any conditional return
  const [photos, setPhotos] = useState([]);
  const [userInstructions, setUserInstructions] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedMode, setSelectedMode] = useState('style-transfer'); // Default to first reference-based mode
  const [isDragging, setIsDragging] = useState(false);
  const [useAIAnalysis, setUseAIAnalysis] = useState(true); // Auto-analyze photos with Vision AI

  if (!isOpen) return null;
  
  // Check max photos based on mode
  const getMaxPhotos = () => {
    if (agentType === 'dating') return 20;
    if (['multi-reference', 'ad-replicator'].includes(selectedMode)) return 14;
    if (['style-transfer', 'image-editing', 'object-replace', 'background-change'].includes(selectedMode)) return 1;
    return 0; // text-to-image, pro-quality don't need photos
  };
  
  const maxPhotos = getMaxPhotos();
  const needsPhotos = maxPhotos > 0;

  // Convert files to base64 data URLs
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    
    if (photos.length + files.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed for this mode`);
      return;
    }

    setError(null);
    setProgress({ current: 0, total: files.length });

    const newPhotos = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size (max 15MB)
      if (file.size > 15 * 1024 * 1024) {
        setError(`File ${file.name} is too large (max 15MB)`);
        continue;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError(`File ${file.name} is not an image`);
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        newPhotos.push({
          id: `${Date.now()}_${i}`,
          file: file,
          preview: base64,
          dataUrl: base64,
          name: file.name,
          comment: '' // Коментар користувача для кожного фото
        });
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
      } catch (err) {
        console.error('Error reading file:', err);
        setError(`Error reading ${file.name}`);
      }
    }

    setPhotos(prev => [...prev, ...newPhotos]);
    setProgress({ current: 0, total: 0 });
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      // Компресуємо велике зображення
      if (file.size > 2 * 1024 * 1024) { // Якщо більше 2MB
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Зменшуємо до max 1920px
            const maxSize = 1920;
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
              } else {
                width = (width / height) * maxSize;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress to JPEG 85% quality
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            console.log(`✅ Compressed ${file.name}: ${Math.round(file.size/1024)}KB → ${Math.round(compressed.length*0.75/1024)}KB`);
            resolve(compressed);
          };
          img.src = e.target.result;
        };
        
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      } else {
        // Малі файли не компресуємо
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      }
    });
  };

  const removePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const updatePhotoComment = (id, comment) => {
    setPhotos(prev => prev.map(p => 
      p.id === id ? { ...p, comment } : p
    ));
  };
  
  // Drag & Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    
    if (files.length === 0) {
      setError('Please drop only image files');
      return;
    }
    
    // Simulate file input event
    const mockEvent = {
      target: {
        files: files
      }
    };
    
    await handleFileSelect(mockEvent);
  };

  const handleAnalyze = async () => {
    console.log('========================================');
    console.log('🚀 handleAnalyze called!');
    console.log('   - agentType:', agentType);
    console.log('   - selectedMode:', selectedMode);
    console.log('   - photos.length:', photos.length);
    console.log('   - useAIAnalysis:', useAIAnalysis);
    console.log('   - needsPhotos:', needsPhotos);
    console.log('========================================');
    
    // Check if photos required
    if (needsPhotos && photos.length === 0) {
      setError(`Please upload ${maxPhotos === 1 ? '1 reference image' : `${maxPhotos} reference images`}`);
      return;
    }
    
    // UNIVERSAL: Vision AI Analysis (for both Dating and General if photos uploaded)
    if (photos.length > 0 && useAIAnalysis) {
      console.log('✅ CALLING VISION AI...');
      setAnalyzing(true);
      setError(null);

      try {
        // Import API service
        const { visionAPI } = await import('../../services/api-v3.js');
        
        // Build photos array with comments
        const photosData = photos.map((p, index) => ({
          url: p.dataUrl,
          comment: p.comment || '',
          index: index + 1
        }));

        console.log('🔍 Analyzing', photos.length, 'photos with Vision AI...');
        console.log('📝 Mode:', selectedMode);
        console.log('📝 Agent type:', agentType);
        
        const response = await visionAPI.analyzePhotos(
          photosData,
          userInstructions || `Analyze these images for ${selectedMode} mode`,
          agentType,
          selectedMode // Pass mode to backend
        );

        if (response.success) {
          console.log('✅ Vision AI analysis complete!');
          console.log('Generated prompt:', response.data.prompt);
          
          if (agentType === 'dating') {
            // DATING: Pass generated prompt
            onPromptGenerated(response.data.prompt, response.data);
          } else {
            // GENERAL: Pass prompt + mode + photos
            onModeDataReady?.({
              mode: selectedMode,
              referenceImages: photos,
              generatedPrompt: response.data.prompt, // AI-generated description
              instructions: userInstructions,
              analysis: response.data
            });
          }
          
          // Close modal
          handleClose();
        } else {
          throw new Error(response.error || 'Analysis failed');
        }
      } catch (err) {
        console.error('Vision AI analysis error:', err);
        setError(err.message || 'Failed to analyze photos');
      } finally {
        setAnalyzing(false);
      }
    } else {
      // GENERAL: No AI analysis - pass mode + photos only
      console.log('========================================');
      console.log('⚠️ SKIPPING VISION AI!');
      console.log('   Reason: photos.length === 0 OR useAIAnalysis === false');
      console.log('   - photos.length:', photos.length);
      console.log('   - useAIAnalysis:', useAIAnalysis);
      console.log('========================================');
      console.log('✅ General AI mode ready (no AI analysis):', selectedMode);
      console.log('📸 Reference images:', photos.length);
      
      onModeDataReady?.({
        mode: selectedMode,
        referenceImages: photos,
        instructions: userInstructions
      });
      
      // Close modal
      handleClose();
    }
  };

  const handleClose = () => {
    setPhotos([]);
    setUserInstructions('');
    setError(null);
    setProgress({ current: 0, total: 0 });
    onClose();
  };

  return (
    <div className="photo-upload-modal-overlay" onClick={handleClose}>
      <div className="photo-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="photo-upload-modal-header">
          <h2>
            {agentType === 'dating' 
              ? '📸 Upload Photos for AI Analysis' 
              : '🎨 Generation Setup'}
          </h2>
          <button className="close-button" onClick={handleClose}>✕</button>
        </div>

        <div className="photo-upload-modal-body">
          {error && (
            <div className="error-banner">
              ❌ {error}
            </div>
          )}

          {/* GENERAL AI: Mode Selector */}
          {agentType !== 'dating' && (
            <div className="mode-selector-section">
              <label className="section-label">📋 Select Generation Mode:</label>
              <ModeSelector 
                selectedMode={selectedMode}
                onModeChange={setSelectedMode}
                disabled={analyzing}
                filterMode="reference-only"
              />
            </div>
          )}

          {/* Upload Area (shown only if mode needs photos OR dating) */}
          {(agentType === 'dating' || needsPhotos) && (
            <div className="upload-section">
              {agentType !== 'dating' && (
                <label className="section-label">
                  📸 {maxPhotos === 1 ? 'Upload Reference Image:' : `Upload Reference Images (up to ${maxPhotos}):`}
                </label>
              )}
              
              <div 
                className={`upload-area ${isDragging ? 'dragging' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="photo-upload-input"
                  multiple={maxPhotos > 1}
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  disabled={analyzing || photos.length >= maxPhotos}
                />
                <label 
                  htmlFor="photo-upload-input" 
                  className={`upload-label ${photos.length >= maxPhotos ? 'disabled' : ''}`}
                >
                  <div className="upload-icon">{isDragging ? '⬇️' : '📤'}</div>
                  <div className="upload-text">
                    {isDragging 
                      ? 'Drop images here!' 
                      : agentType === 'dating' 
                        ? 'Click to upload or drag & drop photos' 
                        : maxPhotos === 1 
                          ? 'Click to upload or drag & drop image'
                          : 'Click to upload or drag & drop images'}
                    <br />
                    <span className="upload-hint">
                      {photos.length}/{maxPhotos} {maxPhotos === 1 ? 'image' : 'images'} · Max 15MB per file
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Progress */}
          {progress.total > 0 && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p>Uploading {progress.current}/{progress.total} photos...</p>
            </div>
          )}

          {/* Photos Grid */}
          {photos.length > 0 && (
            <div className="photos-grid">
              {photos.map((photo, index) => (
                <div key={photo.id} className="photo-item">
                  <div className="photo-number">#{index + 1}</div>
                  <img src={photo.preview} alt={photo.name} />
                  <button
                    className="remove-photo-btn"
                    onClick={() => removePhoto(photo.id)}
                    disabled={analyzing}
                  >
                    ✕
                  </button>
                  <div className="photo-name">{photo.name}</div>
                  <input
                    type="text"
                    className="photo-comment-input"
                    placeholder="💬 Коментар (компанія, фон, побажання...)"
                    value={photo.comment}
                    onChange={(e) => updatePhotoComment(photo.id, e.target.value)}
                    disabled={analyzing}
                  />
                </div>
              ))}
            </div>
          )}

          {/* AI Analysis Option (General AI only) - PROMINENT! */}
          {agentType !== 'dating' && photos.length > 0 && (
            <div className="ai-analysis-option" style={{ 
              marginTop: '1.5rem', 
              marginBottom: '1.5rem',
              padding: '1.5rem', 
              background: useAIAnalysis ? '#e8f5e9' : '#fff3e0',
              borderRadius: '12px',
              border: `3px solid ${useAIAnalysis ? '#4caf50' : '#ff9800'}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                cursor: 'pointer',
                fontSize: '1.1rem'
              }}>
                <input
                  type="checkbox"
                  checked={useAIAnalysis}
                  onChange={(e) => setUseAIAnalysis(e.target.checked)}
                  disabled={analyzing}
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    cursor: 'pointer',
                    accentColor: '#4caf50'
                  }}
                />
                <span style={{ fontWeight: 700, color: useAIAnalysis ? '#2e7d32' : '#e65100' }}>
                  {useAIAnalysis ? '✅' : '⚠️'} Аналіз фото з Vision AI
                </span>
              </label>
              <p style={{ 
                margin: '1rem 0 0 0', 
                fontSize: '0.95rem', 
                color: '#333',
                marginLeft: '2rem',
                lineHeight: '1.5'
              }}>
                {useAIAnalysis 
                  ? '✅ AI детально опише ваші фото і автоматично створить промпт для генерації'
                  : '❌ Фото будуть використані як reference без аналізу. Ви маєте написати промпт вручну!'}
              </p>
              {!useAIAnalysis && (
                <div style={{
                  marginTop: '0.75rem',
                  marginLeft: '2rem',
                  padding: '0.75rem',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '2px solid #ff9800',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#e65100'
                }}>
                  ⚠️ УВАГА: Без аналізу AI промпт НЕ буде згенеровано автоматично!
                </div>
              )}
            </div>
          )}

          {/* User Instructions */}
          {photos.length > 0 && (
            <div className="instructions-section">
              <label className="instructions-label">
                📝 Additional instructions (optional):
              </label>
              <textarea
                className="instructions-textarea"
                value={userInstructions}
                onChange={(e) => setUserInstructions(e.target.value)}
                placeholder={agentType === 'dating' 
                  ? "E.g., 'Focus on the lighting style' or 'Capture the casual vibe'"
                  : useAIAnalysis
                    ? "E.g., 'Focus on colors' or 'Emphasize the mood'"
                    : "Describe what you want to generate based on these reference images"}
                rows={3}
                disabled={analyzing}
              />
            </div>
          )}

          {/* Agent Type Info */}
          <div className="agent-info">
            <span className="agent-badge">
              {agentType === 'dating' ? '💝 Dating Style Analysis' : `🎨 Mode: ${selectedMode}`}
            </span>
            {agentType !== 'dating' && photos.length > 0 && (
              <span className="agent-badge" style={{ 
                marginLeft: '0.5rem', 
                background: useAIAnalysis ? '#4caf50' : '#ff9800' 
              }}>
                {useAIAnalysis ? '🤖 AI Analysis' : '📸 Reference Only'}
              </span>
            )}
          </div>
        </div>

        <div className="photo-upload-modal-footer">
          <button
            className="btn-secondary"
            onClick={handleClose}
            disabled={analyzing}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleAnalyze}
            disabled={
              (needsPhotos && photos.length === 0) ||
              analyzing
            }
          >
            {analyzing 
              ? '🔍 Analyzing with AI...' 
              : agentType === 'dating'
                ? `🚀 Analyze ${photos.length} ${photos.length === 1 ? 'Photo' : 'Photos'}`
                : needsPhotos && photos.length === 0
                  ? `Upload ${maxPhotos === 1 ? 'Image' : 'Images'} Required`
                  : useAIAnalysis && photos.length > 0
                    ? `🤖 Analyze ${photos.length} ${photos.length === 1 ? 'Photo' : 'Photos'} with AI`
                    : '✅ Ready to Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoUploadModal;
