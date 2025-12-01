import React, { useState } from 'react';
import './PhotoUploadModal.css';

/**
 * Photo Upload Modal for AI Analysis
 * Upload up to 20 photos → AI analyzes them → generates a prompt
 * Photos are NOT saved to database (temporary analysis only)
 */
const PhotoUploadModal = ({ isOpen, onClose, onPromptGenerated, agentType = 'general' }) => {
  const [photos, setPhotos] = useState([]);
  const [userInstructions, setUserInstructions] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  if (!isOpen) return null;

  // Convert files to base64 data URLs
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    
    if (photos.length + files.length > 20) {
      setError('Maximum 20 photos allowed');
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

  const handleAnalyze = async () => {
    if (photos.length === 0) {
      setError('Please upload at least one photo');
      return;
    }

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

      console.log('🔍 Analyzing', photos.length, 'photos...');
      console.log('📝 Photo comments:', photosData.map(p => `${p.index}: ${p.comment || 'none'}`));
      
      const response = await visionAPI.analyzePhotos(
        photosData,
        userInstructions,
        agentType
      );

      if (response.success) {
        console.log('✅ Analysis complete!');
        console.log('Generated prompt:', response.data.prompt);
        
        // Pass generated prompt to parent component
        onPromptGenerated(response.data.prompt, response.data);
        
        // Close modal
        handleClose();
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze photos');
    } finally {
      setAnalyzing(false);
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
          <h2>📸 Upload Photos for AI Analysis</h2>
          <button className="close-button" onClick={handleClose}>✕</button>
        </div>

        <div className="photo-upload-modal-body">
          {error && (
            <div className="error-banner">
              ❌ {error}
            </div>
          )}

          {/* Upload Area */}
          <div className="upload-area">
            <input
              type="file"
              id="photo-upload-input"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={analyzing || photos.length >= 20}
            />
            <label 
              htmlFor="photo-upload-input" 
              className={`upload-label ${photos.length >= 20 ? 'disabled' : ''}`}
            >
              <div className="upload-icon">📤</div>
              <div className="upload-text">
                Click to upload photos
                <br />
                <span className="upload-hint">
                  {photos.length}/20 photos · Max 15MB per file
                </span>
              </div>
            </label>
          </div>

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
                placeholder="E.g., 'Focus on the lighting style' or 'Capture the casual vibe'"
                rows={3}
                disabled={analyzing}
              />
            </div>
          )}

          {/* Agent Type Info */}
          <div className="agent-info">
            <span className="agent-badge">
              {agentType === 'dating' ? '💝 Dating Style Analysis' : '🎨 General Style Analysis'}
            </span>
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
            disabled={photos.length === 0 || analyzing}
          >
            {analyzing ? '🔍 Analyzing...' : `🚀 Analyze ${photos.length} ${photos.length === 1 ? 'Photo' : 'Photos'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoUploadModal;
