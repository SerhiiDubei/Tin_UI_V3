import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectsAPI, sessionsAPI, generationAPI } from '../services/api-v3';
import Button from '../components/Button';
import Loading from '../components/Loading';
import './GalleryPage.css';

function GalleryPage() {
  const [project, setProject] = useState(null);
  const [session, setSession] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [filter, setFilter] = useState('all'); // all, liked, superliked, disliked
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const { projectId, sessionId } = useParams();
  const navigate = useNavigate();

  const loadGallery = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load project and session
      const projectResponse = await projectsAPI.getById(projectId);
      if (projectResponse.success) {
        setProject(projectResponse.data);
      }

      const sessionResponse = await sessionsAPI.getById(sessionId);
      if (sessionResponse.success) {
        setSession(sessionResponse.data);
      }

      // Load gallery with filter
      const galleryResponse = await generationAPI.getGallery(sessionId, filter);
      if (galleryResponse.success) {
        setGallery(galleryResponse.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, sessionId, filter]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const getRatingIcon = (rating) => {
    if (rating === null || rating === undefined) return '⏭️';
    if (rating >= 3) return '🔥'; // Super like
    if (rating > 0) return '👍';  // Like
    if (rating < -1) return '😡'; // Super dislike
    return '👎';  // Dislike
  };

  const getRatingLabel = (rating) => {
    if (rating === null || rating === undefined) return 'Не оцінено';
    if (rating >= 3) return 'Чудово!';
    if (rating > 0) return 'Подобається';
    if (rating < -1) return 'Жахливо';
    return 'Не подобається';
  };

  // Filter gallery based on rating
  const filteredGallery = gallery.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'superliked') return item.rating >= 3;
    if (filter === 'liked') return item.rating === 1;
    if (filter === 'disliked') return item.rating === -1;
    if (filter === 'superdisliked') return item.rating <= -3;
    return true;
  });

  const filterCounts = {
    all: gallery.length,
    superliked: gallery.filter(item => item.rating >= 3).length,
    liked: gallery.filter(item => item.rating === 1).length,
    disliked: gallery.filter(item => item.rating === -1).length,
    superdisliked: gallery.filter(item => item.rating <= -3).length
  };

  if (loading) {
    return (
      <div className="gallery-page">
        <Loading text="Завантаження галереї..." />
      </div>
    );
  }

  if (!project || !session) {
    return (
      <div className="gallery-page">
        <div className="error-container">
          <h2>❌ Сесія не знайдена</h2>
          <Button onClick={() => navigate('/projects')}>← Назад до проєктів</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-page">
      <div className="gallery-container">
        {/* Header */}
        <div className="gallery-header">
          <div>
            <Button
              variant="secondary"
              size="small"
              onClick={() => navigate(`/projects/${projectId}/sessions`)}
              style={{ marginBottom: '1rem' }}
            >
              ← Назад до сесій
            </Button>
            <h1>🖼️ Галерея: {session.name}</h1>
            <div className="gallery-meta-header">
              <span className="project-badge">{project.name}</span>
              <span className="category-badge">{project.category}</span>
            </div>
          </div>
          <Button
            onClick={() => navigate(`/projects/${projectId}/sessions/${sessionId}/generate`)}
            size="large"
          >
            ➕ Згенерувати ще
          </Button>
        </div>

        {error && (
          <div className="error-banner">
            ❌ {error}
          </div>
        )}

        {/* Filters */}
        <div className="gallery-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            📚 Всі ({filterCounts.all})
          </button>
          <button
            className={`filter-btn filter-superlike ${filter === 'superliked' ? 'active' : ''}`}
            onClick={() => setFilter('superliked')}
          >
            🔥 Чудово! (+3) · {filterCounts.superliked}
          </button>
          <button
            className={`filter-btn filter-like ${filter === 'liked' ? 'active' : ''}`}
            onClick={() => setFilter('liked')}
          >
            👍 Подобається (+1) · {filterCounts.liked}
          </button>
          <button
            className={`filter-btn filter-dislike ${filter === 'disliked' ? 'active' : ''}`}
            onClick={() => setFilter('disliked')}
          >
            👎 Не подобається (-1) · {filterCounts.disliked}
          </button>
          <button
            className={`filter-btn filter-superdislike ${filter === 'superdisliked' ? 'active' : ''}`}
            onClick={() => setFilter('superdisliked')}
          >
            😡 Жахливо (-3) · {filterCounts.superdisliked}
          </button>
        </div>

        {/* Gallery Grid */}
        {filteredGallery.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎨</div>
            <h2>Немає зображень</h2>
            <p>
              {filter === 'all'
                ? 'Поки що немає згенерованого контенту в цій сесії'
                : `Немає зображень з фільтром "${filter === 'superliked' ? 'Чудово!' : filter === 'liked' ? 'Подобається' : 'Не подобається'}"`}
            </p>
            <Button
              onClick={() => navigate(`/projects/${projectId}/sessions/${sessionId}/generate`)}
              size="large"
            >
              🚀 Згенерувати контент
            </Button>
          </div>
        ) : (
          <div className="gallery-grid">
            {filteredGallery.map((item) => (
              <div
                key={item.id}
                className="gallery-item"
                onClick={() => setSelectedImage(item)}
              >
                <div className="gallery-image-wrapper">
                  <img
                    src={item.url}
                    alt={item.original_prompt}
                    className="gallery-image"
                  />
                  {item.rating !== null && item.rating !== undefined && (
                    <div className={`rating-badge rating-${item.rating >= 0 ? 'positive' : 'negative'}`}>
                      {getRatingIcon(item.rating)}
                    </div>
                  )}
                </div>
                <div className="gallery-item-info">
                  <p className="gallery-prompt">
                    {item.original_prompt?.substring(0, 60)}
                    {item.original_prompt?.length > 60 ? '...' : ''}
                  </p>
                  {item.rating_comment && (
                    <p className="gallery-comment">
                      💬 {item.rating_comment.substring(0, 50)}
                      {item.rating_comment.length > 50 ? '...' : ''}
                    </p>
                  )}
                  <div className="gallery-meta">
                    <span>{new Date(item.created_at).toLocaleDateString('uk-UA')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="image-modal-overlay" onClick={() => setSelectedImage(null)}>
          <button className="modal-close-btn" onClick={() => setSelectedImage(null)}>
            ✕
          </button>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage.url}
              alt={selectedImage.original_prompt}
              className="modal-image"
            />
            <div className="modal-details">
              <div className="modal-section">
                <h3>📝 Original Prompt</h3>
                <p>{selectedImage.original_prompt}</p>
              </div>
              {selectedImage.enhanced_prompt && (
                <div className="modal-section">
                  <h3>✨ Enhanced Prompt</h3>
                  <p className="scrollable">{selectedImage.enhanced_prompt}</p>
                </div>
              )}
              {selectedImage.rating !== null && selectedImage.rating !== undefined && (
                <div className="modal-section">
                  <h3>⭐ Оцінка</h3>
                  <div className="rating-info">
                    <span className={`rating-badge-large rating-${selectedImage.rating >= 0 ? 'positive' : 'negative'}`}>
                      {getRatingIcon(selectedImage.rating)} {getRatingLabel(selectedImage.rating)}
                    </span>
                    <div className="rating-value-display">
                      Значення: <strong>{selectedImage.rating > 0 ? '+' : ''}{selectedImage.rating}</strong>
                    </div>
                    {selectedImage.comment && (
                      <p className="rating-comment-full">💬 {selectedImage.comment}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="modal-section">
                <h3>ℹ️ Metadata</h3>
                <div className="metadata-grid">
                  <div className="metadata-item">
                    <span className="metadata-label">Model:</span>
                    <span>{selectedImage.model || 'Seedream 4'}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Created:</span>
                    <span>{new Date(selectedImage.created_at).toLocaleString('uk-UA')}</span>
                  </div>
                  {selectedImage.generation_time && (
                    <div className="metadata-item">
                      <span className="metadata-label">Time:</span>
                      <span>{selectedImage.generation_time}s</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GalleryPage;
