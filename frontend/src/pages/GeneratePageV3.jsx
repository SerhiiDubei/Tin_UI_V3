import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectsAPI, sessionsAPI, generationAPI } from '../services/api-v3';
import Button from '../components/Button';
import Card from '../components/Card';
import Loading from '../components/Loading';
import SwipeCard from '../components/SwipeCard';
import './GeneratePageV3.css';

function GeneratePageV3() {
  const [project, setProject] = useState(null);
  const [session, setSession] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedItems, setGeneratedItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState('');
  const [pendingRating, setPendingRating] = useState(null);
  
  const { user } = useAuth();
  const { projectId, sessionId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadProjectAndSession();
  }, [projectId, sessionId]);

  const loadProjectAndSession = async () => {
    try {
      const projectResponse = await projectsAPI.getById(projectId);
      if (projectResponse.success) {
        setProject(projectResponse.data);
      }

      const sessionResponse = await sessionsAPI.getById(sessionId);
      if (sessionResponse.success) {
        setSession(sessionResponse.data);
      }
    } catch (err) {
      setError('Помилка завантаження: ' + err.message);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Будь ласка, введіть prompt');
      return;
    }

    setGenerating(true);
    setGeneratedItems([]);
    setCurrentIndex(0);
    setProgress({ current: 0, total: 10 });
    setError(null);

    try {
      // Step-by-step generation
      const response = await generationAPI.generate({
        session_id: sessionId,
        prompt: prompt,
        count: 10,
        model: 'seedream-4'
      });

      if (response.success && response.data.items) {
        // Process items as they arrive
        const items = response.data.items;
        setGeneratedItems(items);
        setProgress({ current: items.length, total: 10 });
        
        if (items.length === 0) {
          setError('Не вдалося згенерувати контент');
        }
      } else {
        throw new Error('Помилка генерації');
      }
    } catch (err) {
      setError(err.message || 'Помилка генерації контенту');
    } finally {
      setGenerating(false);
    }
  };

  const handleSwipe = async (direction) => {
    const currentItem = generatedItems[currentIndex];
    
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

    try {
      await generationAPI.rate({
        session_id: sessionId,
        content_id: pendingRating.content_id,
        direction: pendingRating.direction,
        comment: comment || null
      });

      setShowCommentModal(false);
      setComment('');
      setPendingRating(null);
      moveToNext();
    } catch (err) {
      alert('Помилка збереження оцінки: ' + err.message);
    }
  };

  const skipRating = () => {
    setShowCommentModal(false);
    setComment('');
    setPendingRating(null);
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex < generatedItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All items rated
      alert('Всі зображення оцінені! Ви можете згенерувати ще.');
      setGeneratedItems([]);
      setCurrentIndex(0);
      setPrompt('');
    }
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

        {/* Prompt Input Section */}
        {!generating && generatedItems.length === 0 && (
          <Card className="prompt-card-v3">
            <h2>✨ Генерація AI контенту</h2>
            <p className="prompt-hint">
              {session.content_count === 0
                ? '🆕 Це перша генерація в цій сесії. Агент створить нові параметри на основі вашого prompt.'
                : '📊 Агент проаналізує попередні оцінки та створить оптимізований контент.'}
            </p>

            <div className="form-section">
              <label className="form-label">Ваш Prompt:</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Опишіть що ви хочете згенерувати...

Приклад для Dating: "Beautiful woman on the beach at sunset"
Приклад для Cars: "Red sports car on mountain road"
Приклад для Insurance: "Happy family with insurance protection"`}
                rows={5}
                className="prompt-textarea"
              />
            </div>

            <div className="generation-info">
              <div className="info-item">
                <span className="info-icon">🤖</span>
                <div>
                  <strong>Модель:</strong> Seedream 4
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">📷</span>
                <div>
                  <strong>Кількість:</strong> 10 зображень
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">⚡</span>
                <div>
                  <strong>Режим:</strong> Step-by-step (свайп одразу після генерації)
                </div>
              </div>
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
              Зображення з'являться одразу після генерації. Ви зможете свайпати кожне окремо.
            </p>
          </Card>
        )}

        {/* Swipe Section */}
        {!generating && generatedItems.length > 0 && currentItem && (
          <div className="swipe-section-v3">
            <div className="swipe-header-v3">
              <h2>
                👆 Оцініть зображення {currentIndex + 1} з {generatedItems.length}
              </h2>
              <div className="swipe-progress-badges">
                <span className="badge-current">Поточне: {currentIndex + 1}</span>
                <span className="badge-remaining">Залишилось: {generatedItems.length - currentIndex - 1}</span>
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

              {/* Center: Swipe Card */}
              <div className="swipe-card-container-v3">
                <SwipeCard
                  content={currentItem}
                  onSwipe={handleSwipe}
                />
                <div className="swipe-instructions-v3">
                  <div className="instruction-item">
                    <span className="arrow">←</span>
                    <span>Dislike</span>
                  </div>
                  <div className="instruction-item">
                    <span className="arrow">→</span>
                    <span>Like</span>
                  </div>
                  <div className="instruction-item">
                    <span className="arrow">↑</span>
                    <span>Superlike</span>
                  </div>
                  <div className="instruction-item">
                    <span className="arrow">↓</span>
                    <span>Skip</span>
                  </div>
                </div>
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
            </div>
          </div>
        )}

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
