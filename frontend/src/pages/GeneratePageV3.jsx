import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectsAPI, sessionsAPI, generationAPI } from '../services/api-v3';
import Button from '../components/Button';
import Card from '../components/Card';
import Loading from '../components/Loading';
import PhotoUploadModal from '../components/PhotoUpload/PhotoUploadModal';
import './GeneratePageV3.css';

// Доступні моделі для генерації
const AVAILABLE_MODELS = [
  {
    key: 'seedream-4',
    name: '🌟 Seedream 4',
    description: 'Висока якість, 2K роздільність',
    speed: '~1 хв',
    price: '$0.03',
    recommended: true
  },
  {
    key: 'nano-banana-pro',
    name: '🍌 Nano Banana Pro',
    description: 'Gemini SOTA, швидко',
    speed: '~45 сек',
    price: '$0.025',
    recommended: false
  },
  {
    key: 'flux-schnell',
    name: '⚡ FLUX Schnell',
    description: 'Найшвидша генерація',
    speed: '~30 сек',
    price: '$0.003',
    recommended: false
  },
  {
    key: 'flux-dev',
    name: '🎨 FLUX Dev',
    description: 'Максимальна деталізація',
    speed: '~2 хв',
    price: '$0.025',
    recommended: false
  },
  {
    key: 'sdxl',
    name: '🔮 Stable Diffusion XL',
    description: 'Стабільна класика',
    speed: '~1 хв',
    price: '$0.008',
    recommended: false
  }
];

function GeneratePageV3() {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [session, setSession] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('seedream-4');
  const [count, setCount] = useState(10); // За замовчуванням 10
  const [enableQA, setEnableQA] = useState(true); // QA включено за замовчуванням
  const [generating, setGenerating] = useState(false);
  const [failedGenerations, setFailedGenerations] = useState([]); // Список failed генерацій
  const [generatedItems, setGeneratedItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState('');
  const [pendingRating, setPendingRating] = useState(null);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [unratedStats, setUnratedStats] = useState(null);
  const [loadingUnrated, setLoadingUnrated] = useState(false);
  
  // Photo upload modal state
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [generatedPromptData, setGeneratedPromptData] = useState(null);
  
  // 🎨 General AI mode state
  const [generationMode, setGenerationMode] = useState('text-to-image');
  const [referenceImages, setReferenceImages] = useState([]);
  
  // Swipe state
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const { projectId, sessionId } = useParams();
  const navigate = useNavigate();
  
  // 🔥 Determine agent type based on project tag
  const agentType = project?.tag === 'dating' ? 'dating' : 'general';
  const isGeneralMode = agentType === 'general';

  const checkUnratedContent = useCallback(async () => {
    try {
      const response = await generationAPI.getUnrated(sessionId, 1);
      if (response.success) {
        setUnratedStats(response.stats);
      }
    } catch (err) {
      console.error('Failed to check unrated:', err);
    }
  }, [sessionId]);

  const loadProjectAndSession = useCallback(async () => {
    try {
      const projectResponse = await projectsAPI.getById(projectId);
      if (projectResponse.success) {
        setProject(projectResponse.data);
      }

      const sessionResponse = await sessionsAPI.getById(sessionId);
      if (sessionResponse.success) {
        setSession(sessionResponse.data);
      }
      
      // 🔥 Check for unrated content
      await checkUnratedContent();
    } catch (err) {
      setError('Помилка завантаження: ' + err.message);
    }
  }, [projectId, sessionId, checkUnratedContent]);

  useEffect(() => {
    loadProjectAndSession();
  }, [loadProjectAndSession]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Будь ласка, введіть prompt');
      return;
    }

    setGenerating(true);
    setGeneratedItems([]);
    setCurrentIndex(0);
    setProgress({ current: 0, total: count });
    setError(null);
    setLoadingNext(false);
    setGenerationComplete(false);

    try {
      // 🚀 PARALLEL GENERATION: одночасна генерація всіх зображень
      console.log(`🔥 Starting PARALLEL generation of ${count} images...`);
      console.log(`🎯 Agent Type: ${agentType}`);
      if (isGeneralMode) {
        console.log(`🎨 Mode: ${generationMode}`);
        console.log(`📸 Reference Images: ${referenceImages.length}`);
      }
      
      // Build generation request
      const generationRequest = {
        sessionId: sessionId,
        projectId: projectId,
        userId: user.id,
        userPrompt: prompt,
        count: count,
        model: selectedModel
      };
      
      // 🎨 Add General AI mode data if applicable
      if (isGeneralMode) {
        generationRequest.mode = generationMode;
        generationRequest.modeInputs = {};
        
        // Add reference images if any
        if (referenceImages.length > 0) {
          // TODO: Upload images to storage and get URLs
          // For now, use data URLs directly (not recommended for production)
          generationRequest.modeInputs.reference_images = referenceImages.map(img => img.dataUrl || img.preview);
        }
      }
      
      const response = await generationAPI.generate(generationRequest);

      console.log('📦 Received generation response:', response);

      if (response.success) {
        // Фільтруємо тільки успішні результати
        const successfulItems = response.results
          .filter(r => r.success && r.content)
          .map(r => r.content);
        
        const failedCount = response.results.filter(r => !r.success).length;
        
        console.log(`✅ Successfully generated ${successfulItems.length}/${count} images`);
        if (failedCount > 0) {
          console.warn(`⚠️ ${failedCount} generations failed`);
        }
        
        if (successfulItems.length > 0) {
          setGeneratedItems(successfulItems);
          setProgress({ current: successfulItems.length, total: count });
          setGenerating(false);
          setLoadingNext(false);
          setGenerationComplete(true);
          
          console.log('🎉 All images ready for swiping!');
        } else {
          throw new Error('Не вдалося згенерувати жодного зображення');
        }
      } else {
        throw new Error(response.error || 'Невідома помилка генерації');
      }
    } catch (err) {
      setError(err.message || 'Помилка генерації контенту');
      setGenerating(false);
      setLoadingNext(false);
    }
  };

  const handleSwipe = async (direction) => {
    const currentItem = generatedItems[currentIndex];
    
    // 🔥 UX FIX: Перевірка чи наступне фото вже готове
    const isLastItem = currentIndex === generatedItems.length - 1;
    
    // Якщо це останнє фото і генерація ще йде - блокуємо!
    if (isLastItem && (loadingNext || generating)) {
      console.log('⏳ Next photo is not ready yet, please wait...');
      // Користувач бачить warning під кнопками
      return;
    }
    
    if (direction === 'down') {
      // Skip - no rating
      moveToNext();
    } else {
      // Show comment modal for rating
      setPendingRating({
        content_id: currentItem.id,
        direction: direction
      });
      setShowCommentModal(true);
    }
  };

  const submitRating = async () => {
    if (!pendingRating) return;

    // Конвертуємо rating
    const ratingMap = {
      'up': 3,
      'right': 1,
      'left': -1,
      'super-down': -3,
      'down': 0
    };

    const ratingData = {
      contentId: pendingRating.content_id,
      rating: ratingMap[pendingRating.direction],
      comment: comment || null
    };

    // 🔥 Закриваємо modal і переходимо далі ОДРАЗУ (не чекаємо API)
    setShowCommentModal(false);
    setComment('');
    setPendingRating(null);
    moveToNext();

    // Відправляємо rating в фоні
    try {
      await generationAPI.rate(ratingData);
      console.log('✅ Rating saved in background');
    } catch (err) {
      console.error('❌ Failed to save rating:', err);
      // Не показуємо alert щоб не переривати flow
    }
  };

  const skipRating = () => {
    setShowCommentModal(false);
    setComment('');
    setPendingRating(null);
    moveToNext();
  };

  const moveToNext = () => {
    // Якщо є наступне фото - показуємо
    if (currentIndex < generatedItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } 
    // Якщо генерація ще йде - нічого не робимо (loader покаже)
    else if (loadingNext || generating) {
      // Залишаємось на поточному індексі, UI покаже loader
      console.log('⏳ Waiting for next generation...');
    }
    // Якщо все згенеровано і оцінено - показуємо completion
    else if (generationComplete) {
      setShowCompletionScreen(true);
    }
  };

  const handleGenerateMore = () => {
    setShowCompletionScreen(false);
    setGeneratedItems([]);
    setCurrentIndex(0);
    setPrompt('');
    setLoadingNext(false);
    setGenerationComplete(false);
    setFailedGenerations([]);
  };

  const handleGenerateMoreSamePrompt = async () => {
    // Генерувати ще раз з тим же промптом
    setShowCompletionScreen(false);
    setGeneratedItems([]);
    setCurrentIndex(0);
    setLoadingNext(false);
    setGenerationComplete(false);
    setFailedGenerations([]);
    
    // Автоматично запустити генерацію
    setTimeout(() => handleGenerate(), 100);
  };

  const handleViewGallery = () => {
    navigate(`/projects/${projectId}/sessions/${sessionId}/gallery`);
  };

  const handlePhotoUpload = () => {
    setShowPhotoUploadModal(true);
  };

  const handlePromptGenerated = (generatedPrompt, analysisData) => {
    console.log('✅ Prompt generated from photos:', generatedPrompt);
    console.log('Analysis data:', analysisData);
    
    // Set the generated prompt
    setPrompt(generatedPrompt);
    
    // Store analysis data for potential "Generate More" use
    setGeneratedPromptData({
      prompt: generatedPrompt,
      analysis: analysisData,
      timestamp: new Date().toISOString()
    });
    
    // Close modal
    setShowPhotoUploadModal(false);
    
    // Show success message
    alert('✅ Prompt згенеровано з ваших фото! Тепер можете запустити генерацію.');
  };
  
  // Handle General AI mode data from modal
  const handleModeDataReady = (data) => {
    console.log('✅ General AI mode data ready:', data);
    
    // Set mode and reference images
    setGenerationMode(data.mode);
    setReferenceImages(data.referenceImages || []);
    
    // If there are instructions, prepend to prompt
    if (data.instructions) {
      setPrompt(data.instructions);
    }
    
    // Close modal
    setShowPhotoUploadModal(false);
    
    // Show success message
    const needsPhotos = ['style-transfer', 'image-editing', 'multi-reference', 'object-replace', 'background-change', 'ad-replicator'].includes(data.mode);
    if (needsPhotos && data.referenceImages && data.referenceImages.length > 0) {
      alert(`✅ Mode: ${data.mode} | ${data.referenceImages.length} reference image(s) ready!`);
    }
  };

  const handleResumeRating = async () => {
    setLoadingUnrated(true);
    try {
      console.log('📋 Loading unrated content for session:', sessionId);
      
      const response = await generationAPI.getUnrated(sessionId, 50);
      
      if (response.success && response.data.length > 0) {
        console.log(`✅ Found ${response.data.length} unrated items`);
        
        // Завантажуємо неоцінені фото
        setGeneratedItems(response.data);
        setCurrentIndex(0);
        setGenerating(false);
        setLoadingNext(false);
        setGenerationComplete(false);
        setShowCompletionScreen(false);
        setUnratedStats(null); // Hide the button
      } else {
        alert('Немає неоцінених фото для продовження');
      }
    } catch (err) {
      console.error('❌ Failed to load unrated:', err);
      setError('Не вдалося завантажити неоцінені фото: ' + err.message);
    } finally {
      setLoadingUnrated(false);
    }
  };

  // Touch handlers for swipe
  const handleTouchStart = (e) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setTouchEnd({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    setTouchEnd({ x: currentX, y: currentY });
    setDragOffset({
      x: currentX - touchStart.x,
      y: currentY - touchStart.y
    });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const minSwipeDistance = 50;
    
    // Determine swipe direction
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          // Swipe down - Skip
          handleSwipe('down');
        } else {
          // Swipe up - Superlike (+3)
          handleSwipe('up');
        }
      }
    } else {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          // Swipe right - Like (+1)
          handleSwipe('right');
        } else {
          // Swipe left - Dislike (-1)
          handleSwipe('left');
        }
      }
    }
    
    // Reset drag offset
    setDragOffset({ x: 0, y: 0 });
  };

  // Mouse handlers (for desktop)
  const handleMouseDown = (e) => {
    setTouchStart({ x: e.clientX, y: e.clientY });
    setTouchEnd({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    setTouchEnd({ x: e.clientX, y: e.clientY });
    setDragOffset({
      x: e.clientX - touchStart.x,
      y: e.clientY - touchStart.y
    });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const minSwipeDistance = 80;
    
    // Determine swipe direction
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          handleSwipe('down');
        } else {
          handleSwipe('up');
        }
      }
    } else {
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          handleSwipe('right');
        } else {
          handleSwipe('left');
        }
      }
    }
    
    setDragOffset({ x: 0, y: 0 });
  };

  const currentItem = generatedItems[currentIndex];

  if (!project || !session) {
    return (
      <div className="generate-page-v3">
        <Loading text="Завантаження..." />
      </div>
    );
  }

  return (
    <div className="generate-page-v3">
      <div className="generate-container-v3">
        {/* Header */}
        <div className="generate-header-v3">
          <div>
            <Button
              variant="secondary"
              size="small"
              onClick={() => navigate(`/projects/${projectId}/sessions`)}
              style={{ marginBottom: '1rem' }}
            >
              ← Назад до сесій
            </Button>
            <h1>🎨 {session.name}</h1>
            <div className="session-meta-header">
              <span className="project-badge">{project.name}</span>
              <span className="category-badge">{project.category}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            ❌ {error}
          </div>
        )}

        {/* Resume Rating Banner */}
        {!generating && generatedItems.length === 0 && unratedStats && unratedStats.unrated > 0 && (
          <Card className="resume-rating-card" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            marginBottom: '2rem',
            padding: '1.5rem',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                  📋 Є неоцінені фото!
                </h3>
                <p style={{ margin: 0, opacity: 0.9 }}>
                  У вас залишилось <strong>{unratedStats.unrated}</strong> неоцінених фото з попередньої сесії.
                  Продовжіть оцінювання щоб покращити навчання AI.
                </p>
              </div>
              <Button
                variant="primary"
                size="large"
                onClick={handleResumeRating}
                disabled={loadingUnrated}
                style={{ 
                  background: 'white',
                  color: '#667eea',
                  fontWeight: 'bold',
                  minWidth: '200px'
                }}
              >
                {loadingUnrated ? '⏳ Завантаження...' : '▶️ Продовжити оцінювання'}
              </Button>
            </div>
          </Card>
        )}

        {/* Prompt Input Section */}
        {!generating && generatedItems.length === 0 && (
          <Card className="prompt-card-v3">
            <h2>✨ Генерація AI контенту</h2>
            <p className="prompt-hint">
              {session.generations_count === 0
                ? '🆕 Це перша генерація в цій сесії. Агент створить нові параметри на основі вашого prompt.'
                : '📊 Агент проаналізує попередні оцінки та створить оптимізований контент.'}
            </p>

            {/* Model Selection */}
            <div className="form-section">
              <label className="form-label">🤖 Оберіть модель AI:</label>
              <div className="models-grid">
                {AVAILABLE_MODELS.map(model => (
                  <div
                    key={model.key}
                    className={`model-card ${selectedModel === model.key ? 'selected' : ''} ${model.recommended ? 'recommended' : ''}`}
                    onClick={() => setSelectedModel(model.key)}
                  >
                    {model.recommended && <span className="recommended-badge">Рекомендовано</span>}
                    <div className="model-name">{model.name}</div>
                    <div className="model-description">{model.description}</div>
                    <div className="model-stats">
                      <span className="model-speed">⏱️ {model.speed}</span>
                      <span className="model-price">💰 {model.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Count Selection */}
            <div className="form-section">
              <label className="form-label">📊 Кількість генерацій:</label>
              
              <div className="count-input-wrapper">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={count}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setCount(Math.min(100, Math.max(1, val)));
                  }}
                  placeholder="1-100"
                  className="count-input-field"
                />
                <span className="count-label">зображень</span>
              </div>

              <div className="count-quick-buttons">
                <span className="quick-label">Швидкий вибір:</span>
                {[5, 10, 20, 50, 100].map(num => (
                  <button
                    key={num}
                    type="button"
                    className={`count-quick-btn ${count === num ? 'active' : ''}`}
                    onClick={() => setCount(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="count-info">
                <span>⏱️ ~{Math.ceil(count * 1)} хв</span>
                <span>💰 ~${(count * 0.03).toFixed(2)}</span>
                <span>📊 {count} {count === 1 ? 'зображення' : count < 5 ? 'зображення' : 'зображень'}</span>
              </div>
            </div>

            <div className="form-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Ваш Prompt:</label>
                <button
                  type="button"
                  onClick={handlePhotoUpload}
                  className="photo-upload-btn"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📸 Upload Photos
                </button>
              </div>
              
              {/* 🎨 General AI: Show selected mode & reference images summary */}
              {isGeneralMode && (generationMode !== 'text-to-image' || referenceImages.length > 0) && (
                <div className="mode-summary" style={{ 
                  marginTop: '1rem', 
                  padding: '0.75rem', 
                  background: '#f5f5f5', 
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <strong>🎨 Mode:</strong> {generationMode}
                  </div>
                  {referenceImages.length > 0 && (
                    <div style={{ flex: 1 }}>
                      <strong>📸 References:</strong> {referenceImages.length} image(s)
                      <button
                        onClick={() => setReferenceImages([])}
                        style={{
                          marginLeft: '0.5rem',
                          padding: '0.25rem 0.5rem',
                          background: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  <button
                    onClick={handlePhotoUpload}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    ⚙️ Change Mode
                  </button>
                </div>
              )}
              
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isGeneralMode 
                  ? (generationMode === 'ad-replicator' 
                    ? `Describe your niche and offer...

Example: "Teeth whitening kit for women 30-50"
Example: "Bathroom remodel service - walk-in showers"
Example: "Weight loss supplement - 30-day transformation"
Example: "Car detailing service - ceramic coating"

Upload 1-14 competitor ads above, then describe YOUR offer!`
                    : `Describe what you want based on selected mode...

Example for Text-to-Image: "Modern office with plants"
Example for Style Transfer: "Portrait in the same style"
Example for Image Editing: "Enhance colors, fix lighting"
Example for Multi-Reference: "Combine character from image 1 with scene from image 2"

Select mode above and upload images if needed!`)
                  : `Опишіть що ви хочете згенерувати...

Приклад для Dating: "Beautiful woman on the beach at sunset"
Приклад для Cars: "Red sports car on mountain road"
Приклад для Insurance: "Happy family with insurance protection"

АБО натисніть "Upload Photos" щоб завантажити фото для AI аналізу!`}
                rows={5}
                className="prompt-textarea"
              />
              {generatedPromptData && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: '#e8f5e9',
                  border: '1px solid #4caf50',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#2e7d32'
                }}>
                  ✅ Prompt згенеровано з фото · Аналізовано {generatedPromptData.analysis?.imageCount || 'N/A'} фото
                </div>
              )}
            </div>

            <div className="generation-info">
              <div className="info-item">
                <span className="info-icon">🤖</span>
                <div>
                  <strong>Модель:</strong> {AVAILABLE_MODELS.find(m => m.key === selectedModel)?.name || 'Seedream 4'}
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">📷</span>
                <div>
                  <strong>Кількість:</strong> {count} {count === 1 ? 'зображення' : count < 5 ? 'зображення' : 'зображень'}
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">⚡</span>
                <div>
                  <strong>Режим:</strong> 🚀 Паралельна генерація (всі одразу)
                </div>
              </div>
            </div>

            {/* QA Toggle */}
            <div className="qa-toggle-section" style={{
              marginTop: '1rem',
              padding: '1rem',
              background: enableQA ? '#e3f2fd' : '#f5f5f5',
              borderRadius: '8px',
              border: enableQA ? '2px solid #2196f3' : '1px solid #ddd'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                gap: '0.75rem'
              }}>
                <input
                  type="checkbox"
                  checked={enableQA}
                  onChange={(e) => setEnableQA(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: enableQA ? '#1976d2' : '#666',
                    marginBottom: '0.25rem'
                  }}>
                    🔍 QA Валідація промптів
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    lineHeight: '1.4'
                  }}>
                    {enableQA 
                      ? '✅ AI перевіряє якість промптів перед генерацією (слідкує за помилками агента)'
                      : '⚠️ Валідація вимкнена - промпти генеруються без перевірки'
                    }
                  </div>
                </div>
              </label>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              size="large"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              🚀 Згенерувати та почати свайпати
            </Button>
          </Card>
        )}

        {/* Generation Progress */}
        {generating && (
          <Card className="progress-card-v3">
            <Loading text={`Генерація контенту... ${progress.current}/${progress.total}`} />
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="progress-hint">
              🚀 Streaming генерація: запити з інтервалом 2-3 сек. Фото з'являються ВІДРАЗУ! Можна свайпати! Отримано: {generatedItems.length}/{count}
            </p>
          </Card>
        )}

        {/* Completion Screen */}
        {showCompletionScreen && (
          <Card className="completion-card-v3">
            <div className="completion-content">
              <div className="completion-icon">🎉</div>
              <h2>Всі зображення оцінені!</h2>
              <p className="completion-text">
                Ви оцінили {generatedItems.length} {generatedItems.length === 1 ? 'зображення' : generatedItems.length < 5 ? 'зображення' : 'зображень'}.
                <br />
                Система навчилася на ваших оцінках!
              </p>
              
              <div className="completion-stats">
                <div className="stat-item">
                  <span className="stat-icon">✅</span>
                  <span className="stat-label">Успішно</span>
                  <span className="stat-value">{generatedItems.length}</span>
                </div>
                {failedGenerations.length > 0 && (
                  <div className="stat-item stat-warning">
                    <span className="stat-icon">⚠️</span>
                    <span className="stat-label">Помилки</span>
                    <span className="stat-value">{failedGenerations.length}</span>
                  </div>
                )}
                <div className="stat-item">
                  <span className="stat-icon">🎯</span>
                  <span className="stat-label">Проект</span>
                  <span className="stat-value">{project?.name}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">📁</span>
                  <span className="stat-label">Сесія</span>
                  <span className="stat-value">{session?.name}</span>
                </div>
              </div>

              {/* Show failed generations details */}
              {failedGenerations.length > 0 && (
                <div className="failed-generations-info">
                  <h4>⚠️ Помилки генерації ({failedGenerations.length}):</h4>
                  <ul className="failed-list">
                    {failedGenerations.slice(0, 3).map((failed, idx) => (
                      <li key={idx}>
                        <span className="failed-number">#{failed.index}</span>
                        <span className="failed-error">{failed.error}</span>
                      </li>
                    ))}
                    {failedGenerations.length > 3 && (
                      <li className="failed-more">
                        ...та ще {failedGenerations.length - 3} помилок
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="completion-actions">
                <button 
                  className="btn-primary-v3 completion-btn"
                  onClick={handleGenerateMoreSamePrompt}
                  title="Згенерувати ще з тим же промптом"
                >
                  <span className="btn-icon">🔄</span>
                  <span>Згенерувати ще (той же промпт)</span>
                </button>
                <button 
                  className="btn-secondary-v3 completion-btn"
                  onClick={handleGenerateMore}
                >
                  <span className="btn-icon">🎨</span>
                  <span>Новий промпт</span>
                </button>
                <button 
                  className="btn-secondary-v3 completion-btn"
                  onClick={handleViewGallery}
                >
                  <span className="btn-icon">🖼️</span>
                  <span>Галерея</span>
                </button>
              </div>

              <p className="completion-hint">
                💡 Наступні генерації будуть кращими завдяки вашим оцінкам!
              </p>
            </div>
          </Card>
        )}

        {/* Loading Next Item */}
        {!generating && !showCompletionScreen && generatedItems.length > 0 && !currentItem && loadingNext && (
          <Card className="loading-next-card-v3">
            <div className="loading-next-content">
              <div className="loading-spinner-large"></div>
              <h2>⏳ Генерується наступне зображення...</h2>
              <p className="loading-next-text">
                Згенеровано: {progress.current} з {progress.total}
              </p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
              <p className="loading-hint">
                💡 Зображення з'являться автоматично, як тільки будуть готові
              </p>
            </div>
          </Card>
        )}

        {/* Swipe Section */}
        {!generating && !showCompletionScreen && generatedItems.length > 0 && currentItem && (
          <div className="swipe-section-v3">
            <div className="swipe-header-v3">
              <h2>
                👆 Оцініть зображення {currentIndex + 1} з {generatedItems.length}
              </h2>
              <div className="swipe-progress-badges">
                <span className="badge-current">Поточне: {currentIndex + 1}</span>
                <span className="badge-remaining">Оцінено: {currentIndex}</span>
                {loadingNext && (
                  <span className="badge-generating">
                    🎨 Генерується: {progress.current}/{progress.total}
                  </span>
                )}
              </div>
            </div>

            <div className="swipe-layout-v3">
              {/* Left: Original Prompt */}
              <Card className="prompt-display-card">
                <h3>📝 Ваш Prompt</h3>
                <p>{currentItem.original_prompt || prompt}</p>
                <div className="prompt-meta">
                  <span className="meta-badge">Original</span>
                </div>
              </Card>

              {/* Center: Image & Rating Buttons */}
              <div className="rating-card-container-v3">
                <Card 
                  className="image-card-v3"
                  style={{
                    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.05}deg)`,
                    transition: isDragging ? 'none' : 'transform 0.3s ease',
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => isDragging && handleMouseUp()}
                >
                  <img 
                    src={currentItem.url} 
                    alt="Generated content" 
                    className="generated-image-v3"
                    draggable={false}
                  />
                  
                  {/* Swipe indicators */}
                  {isDragging && (
                    <>
                      {Math.abs(dragOffset.x) > Math.abs(dragOffset.y) && Math.abs(dragOffset.x) > 30 && (
                        <div className={`swipe-indicator ${dragOffset.x > 0 ? 'right' : 'left'}`}>
                          {dragOffset.x > 0 ? '👍 +1' : '👎 -1'}
                        </div>
                      )}
                      {Math.abs(dragOffset.y) > Math.abs(dragOffset.x) && Math.abs(dragOffset.y) > 30 && (
                        <div className={`swipe-indicator ${dragOffset.y > 0 ? 'down' : 'up'}`}>
                          {dragOffset.y > 0 ? '⏭️ Пропустити' : '🔥 +3'}
                        </div>
                      )}
                    </>
                  )}
                </Card>
                
                {/* 4 Rating Buttons (method.txt style) */}
                <div className="rating-buttons-v3">
                  <button
                    className="rating-btn super-dislike"
                    onClick={() => handleSwipe('super-down')}
                    disabled={currentIndex === generatedItems.length - 1 && (loadingNext || generating)}
                    title="Супер дизлайк: -15 до всіх параметрів"
                  >
                    <span className="rating-icon">😡</span>
                    <span className="rating-label">Жахливо</span>
                    <span className="rating-value">-3</span>
                  </button>
                  
                  <button
                    className="rating-btn dislike"
                    onClick={() => handleSwipe('left')}
                    disabled={currentIndex === generatedItems.length - 1 && (loadingNext || generating)}
                    title="Дизлайк: -5 до всіх параметрів"
                  >
                    <span className="rating-icon">👎</span>
                    <span className="rating-label">Не подобається</span>
                    <span className="rating-value">-1</span>
                  </button>
                  
                  <button
                    className="rating-btn like"
                    onClick={() => handleSwipe('right')}
                    disabled={currentIndex === generatedItems.length - 1 && (loadingNext || generating)}
                    title="Лайк: +5 до всіх параметрів"
                  >
                    <span className="rating-icon">👍</span>
                    <span className="rating-label">Подобається</span>
                    <span className="rating-value">+1</span>
                  </button>
                  
                  <button
                    className="rating-btn super-like"
                    onClick={() => handleSwipe('up')}
                    disabled={currentIndex === generatedItems.length - 1 && (loadingNext || generating)}
                    title="Супер лайк: +15 до всіх параметрів"
                  >
                    <span className="rating-icon">🔥</span>
                    <span className="rating-label">Чудово!</span>
                    <span className="rating-value">+3</span>
                  </button>
                </div>
                
                {/* Показуємо warning якщо наступне фото не готове */}
                {currentIndex === generatedItems.length - 1 && (loadingNext || generating) && (
                  <div className="next-photo-loading-warning">
                    <span className="loading-spinner-small"></span>
                    <span>⏳ Генерується наступне фото ({progress.current}/{progress.total})...</span>
                  </div>
                )}
                
                <button
                  className="skip-btn-v3"
                  onClick={() => handleSwipe('down')}
                  disabled={currentIndex === generatedItems.length - 1 && (loadingNext || generating)}
                >
                  ⏭️ Пропустити (без оцінки)
                </button>
              </div>

              {/* Right: Enhanced Prompt */}
              <Card className="prompt-display-card enhanced">
                <h3>✨ AI Enhanced</h3>
                <p className="scrollable-text">{currentItem.enhanced_prompt || currentItem.final_prompt}</p>
                <div className="prompt-meta">
                  <span className="meta-badge enhanced">Enhanced</span>
                  <span className="meta-info">{currentItem.model || 'GPT-4o + Seedream 4'}</span>
                </div>
              </Card>

              {/* QA Validation Results */}
              {currentItem.qa_validation && (
                <Card className="qa-results-card" style={{
                  marginTop: '1rem',
                  background: currentItem.qa_validation.status === 'approved' ? '#e8f5e9' : 
                              currentItem.qa_validation.status === 'needs_revision' ? '#fff3e0' : '#ffebee',
                  border: `2px solid ${currentItem.qa_validation.status === 'approved' ? '#4caf50' : 
                                        currentItem.qa_validation.status === 'needs_revision' ? '#ff9800' : '#f44336'}`
                }}>
                  <h3 style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    fontSize: '1rem',
                    marginBottom: '0.75rem'
                  }}>
                    🔍 QA Валідація
                    <span style={{
                      marginLeft: 'auto',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      background: currentItem.qa_validation.status === 'approved' ? '#4caf50' : 
                                  currentItem.qa_validation.status === 'needs_revision' ? '#ff9800' : '#f44336',
                      color: 'white'
                    }}>
                      {currentItem.qa_validation.score}/100
                    </span>
                  </h3>
                  
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      background: currentItem.qa_validation.status === 'approved' ? '#4caf50' : 
                                  currentItem.qa_validation.status === 'needs_revision' ? '#ff9800' : '#f44336',
                      color: 'white'
                    }}>
                      {currentItem.qa_validation.status === 'approved' ? '✅ Схвалено' :
                       currentItem.qa_validation.status === 'needs_revision' ? '⚠️ Потребує покращення' :
                       '❌ Відхилено'}
                    </div>
                  </div>

                  {currentItem.qa_validation.issues && currentItem.qa_validation.issues.length > 0 && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.5)',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#d32f2f' }}>
                        ⚠️ Знайдено проблем: {currentItem.qa_validation.issues.length}
                      </div>
                      {currentItem.qa_validation.issues.map((issue, idx) => (
                        <div key={idx} style={{ 
                          marginBottom: '0.25rem',
                          paddingLeft: '1rem',
                          color: '#666'
                        }}>
                          • [{issue.severity}] {issue.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {(!currentItem.qa_validation.issues || currentItem.qa_validation.issues.length === 0) && (
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#2e7d32',
                      fontStyle: 'italic'
                    }}>
                      ✨ Проблем не знайдено! Промпт відповідає всім правилам.
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Photo Upload Modal */}
        <PhotoUploadModal
          isOpen={showPhotoUploadModal}
          onClose={() => setShowPhotoUploadModal(false)}
          onPromptGenerated={handlePromptGenerated}
          onModeDataReady={handleModeDataReady}
          agentType={project?.tag === 'dating' ? 'dating' : 'general'}
        />

        {/* Comment Modal */}
        {showCommentModal && (
          <div className="modal-overlay" onClick={() => setShowCommentModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>💬 Додати коментар (необов'язково)</h3>
                <button className="modal-close" onClick={() => setShowCommentModal(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <p>
                  {pendingRating?.direction === 'up' && '⭐ Що вам сподобалось?'}
                  {pendingRating?.direction === 'right' && '👍 Чому ви поставили лайк?'}
                  {pendingRating?.direction === 'left' && '👎 Що не сподобалось?'}
                </p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Введіть ваш відгук..."
                  rows={4}
                  className="modal-textarea"
                  autoFocus
                />
              </div>

              <div className="modal-footer">
                <Button variant="secondary" onClick={skipRating}>
                  Пропустити
                </Button>
                <Button onClick={submitRating}>
                  Зберегти оцінку
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GeneratePageV3;
