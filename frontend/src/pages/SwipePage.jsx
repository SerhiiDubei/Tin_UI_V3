import React, { useEffect, useState, useCallback } from 'react';
import SwipeCard from '../components/SwipeCard';
import useSwipe from '../hooks/useSwipe';
import { useAuth } from '../contexts/AuthContext';
import './SwipePage.css';

function SwipePage() {
  const { user } = useAuth();
  const userId = user?.id || 'demo-user-123';
  const { currentContent, loading, error, swipeHistory, loadNext, handleSwipe, getSkippedCount, loadSkipped } = useSwipe(userId);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [pendingDirection, setPendingDirection] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [stats, setStats] = useState(null);
  
  const skippedCount = getSkippedCount();
  
  const loadStats = useCallback(async () => {
    try {
      const { ratingsAPI } = await import('../services/api');
      const response = await ratingsAPI.getStats(userId);
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadNext();
    loadStats();
  }, [loadNext, loadStats]);
  
  const onSwipe = async (direction) => {
    // Show comment modal for all swipes except skip (optional for all)
    if (direction === 'down') {
      // Skip - immediately without comment
      await handleSwipe(direction);
      loadStats(); // Refresh stats after skip
    } else {
      // For all other directions - show comment modal
      setPendingDirection(direction);
      setShowComment(true);
    }
  };
  
  const submitWithComment = async () => {
    if (pendingDirection) {
      await handleSwipe(pendingDirection, comment || null);
      setShowComment(false);
      setComment('');
      setPendingDirection(null);
      loadStats(); // Refresh stats after rating
    }
  };
  
  const skipComment = async () => {
    if (pendingDirection) {
      await handleSwipe(pendingDirection, null);
      setShowComment(false);
      setComment('');
      setPendingDirection(null);
      loadStats(); // Refresh stats after rating
    }
  };
  
  if (loading && !currentContent) {
    return (
      <div className="swipe-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading content...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="swipe-page">
        <div className="error-container">
          <p>❌ {error}</p>
          <button onClick={loadNext}>Try Again</button>
        </div>
      </div>
    );
  }
  
  if (!currentContent) {
    return (
      <div className="swipe-page">
        <div className="empty-container">
          {swipeHistory.length === 0 ? (
            <>
              <p>🎭 No content available yet</p>
              <p>Generate some content first to start swiping!</p>
              <button 
                onClick={() => window.location.href = '/generate'}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  background: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: '#667eea'
                }}
              >
                Go to Generate Page →
              </button>
            </>
          ) : (
            <>
              <p>🎉 No more content to review!</p>
              <p>You've reviewed {swipeHistory.length} items.</p>
            </>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="swipe-page">
      <div className="header">
        <h1>🎯 AI Feedback Platform</h1>
        <div className="stats">
          <div className="stats-badges">
            <span className="stat-badge reviewed">
              ✅ Reviewed: {stats?.totalRatings || swipeHistory.length}
            </span>
            {stats?.unrated !== undefined && stats.unrated > 0 && (
              <span className="stat-badge remaining">
                ⏳ Remaining: {stats.unrated}
              </span>
            )}
            {stats?.totalContent !== undefined && (
              <span className="stat-badge total">
                📚 Total: {stats.totalContent}
              </span>
            )}
          </div>
          {skippedCount > 0 && (
            <button 
              className="skipped-button"
              onClick={loadSkipped}
              title="Review skipped items"
            >
              ⏭️ Skipped ({skippedCount})
            </button>
          )}
        </div>
      </div>
      
      <div className="swipe-layout">
        {/* Left Column - Original Prompt */}
        <div className="prompt-column left-column">
          <div className="prompt-card">
            <div className="prompt-header">
              <span className="prompt-icon">📝</span>
              <h3>Your Prompt</h3>
            </div>
            <div className="prompt-content">
              <p>{currentContent.original_prompt || currentContent.prompt || 'No prompt available'}</p>
            </div>
            <div className="prompt-meta">
              <span className="meta-badge">Original</span>
              <span className="meta-info">{currentContent.type || currentContent.media_type}</span>
            </div>
          </div>
        </div>

        {/* Center Column - Image + Controls */}
        <div className="content-column">
          <div className="content-wrapper">
            <SwipeCard
              content={currentContent}
              onSwipe={onSwipe}
            />
            <button 
              className="zoom-button"
              onClick={() => setShowImageModal(true)}
              title="Click to enlarge"
            >
              🔍 View Full Size
            </button>
          </div>
          
          <div className="instructions">
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

        {/* Right Column - Enhanced Prompt */}
        <div className="prompt-column right-column">
          <div className="prompt-card enhanced">
            <div className="prompt-header">
              <span className="prompt-icon">✨</span>
              <h3>AI Enhanced</h3>
            </div>
            <div className="prompt-content scrollable">
              <p>{currentContent.enhanced_prompt || currentContent.final_prompt || 'No enhanced prompt available'}</p>
            </div>
            <div className="prompt-meta">
              <span className="meta-badge enhanced">Enhanced</span>
              <span className="meta-info">{currentContent.model || 'GPT-4o'}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Comment Modal */}
      {showComment && (
        <div className="comment-modal" onClick={() => setShowComment(false)}>
          <div className="comment-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>💬 Add a comment (optional)</h3>
            <p>
              {pendingDirection === 'up' && 'Help us understand what you loved! ⭐'}
              {pendingDirection === 'right' && 'What did you like about this? 👍'}
              {pendingDirection === 'left' && 'What didn\'t you like? 👎'}
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Type your feedback here..."
              rows={4}
              autoFocus
            />
            <div className="comment-modal-actions">
              <button className="btn-primary" onClick={submitWithComment}>
                Submit
              </button>
              <button className="btn-secondary" onClick={skipComment}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {showImageModal && (
        <div className="image-modal" onClick={() => setShowImageModal(false)}>
          <button className="close-modal" onClick={() => setShowImageModal(false)}>
            ×
          </button>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            {currentContent.type === 'image' || currentContent.media_type === 'image' ? (
              <img 
                src={currentContent.url} 
                alt="Full size view"
                className="modal-image"
              />
            ) : currentContent.type === 'video' || currentContent.media_type === 'video' ? (
              <video 
                src={currentContent.url} 
                controls 
                autoPlay
                className="modal-video"
              />
            ) : (
              <div className="modal-audio">
                <div className="audio-icon">🎵</div>
                <audio src={currentContent.url} controls autoPlay />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SwipePage;
