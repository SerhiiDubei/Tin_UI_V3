import React, { useState, useRef, useEffect } from 'react';
import './SwipeCard.css';

const SwipeCard = ({ content, onSwipe }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const cardRef = useRef(null);

  // Reset card position and errors when content changes
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setImageError(false);
    setVideoError(false);
  }, [content]);

  const handleStart = (clientX, clientY) => {
    setIsDragging(true);
    setStartPos({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMove = (clientX, clientY) => {
    if (!isDragging) return;

    const newX = clientX - startPos.x;
    const newY = clientY - startPos.y;
    
    setPosition({ x: newX, y: newY });
    setRotation(newX * 0.1); // Slight rotation based on horizontal movement
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 100;
    const { x, y } = position;

    // Determine swipe direction
    if (Math.abs(x) > Math.abs(y)) {
      // Horizontal swipe
      if (x > threshold) {
        onSwipe('right'); // Like
      } else if (x < -threshold) {
        onSwipe('left'); // Reject
      } else {
        resetPosition();
      }
    } else {
      // Vertical swipe
      if (y < -threshold) {
        onSwipe('up'); // Superlike
      } else if (y > threshold) {
        onSwipe('down'); // Reroll
      } else {
        resetPosition();
      }
    }
  };

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const getSwipeHint = () => {
    if (!position) return null;
    
    const threshold = 50;
    const { x, y } = position;

    if (Math.abs(x) > Math.abs(y)) {
      if (x > threshold) return { text: '👍 Like', className: 'positive' };
      if (x < -threshold) return { text: '👎 Dislike', className: 'negative' };
    } else {
      if (y < -threshold) return { text: '⭐ Superlike', className: 'positive' };
      if (y > threshold) return { text: '⏭️ Skip', className: 'neutral' };
    }
    return null;
  };

  const swipeHint = getSwipeHint();

  const cardStyle = {
    transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
    opacity: isDragging ? 0.9 : 1,
  };

  if (!content) {
    return (
      <div className="swipe-container">
        <div className="empty-state">
          <p>🎉 No more content!</p>
          <p className="hint">You've reviewed everything available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="swipe-container">
      <div
        ref={cardRef}
        className={`swipe-card ${isDragging ? 'dragging' : ''}`}
        style={cardStyle}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => isDragging && handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={() => isDragging && handleEnd()}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => isDragging && handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEnd}
      >
        {/* Content Display - Clean, no text overlay */}
        <div className="card-content">
          {(content.media_type === 'image' || content.type === 'image') && content.url && !imageError && (
            <img
              key={content.id} 
              src={content.url}
              alt="Generated content"
              className="card-image"
              draggable="false"
              onError={() => {
                console.error('❌ Image failed to load:', {
                  id: content.id,
                  url: content.url,
                  isReplicate: content.url.includes('replicate.delivery'),
                  isSupabase: content.url.includes('supabase.co/storage')
                });
                setImageError(true);
              }}
              onLoad={() => {
                console.log('✅ Image loaded:', {
                  id: content.id,
                  urlType: content.url.includes('supabase.co/storage') ? 'Supabase Storage' : 'Replicate (temp)'
                });
              }}
            />
          )}
          
          {(content.media_type === 'video' || content.type === 'video') && content.url && !videoError && (
            <video
              key={content.id}
              src={content.url}
              className="card-video"
              controls
              playsInline
              preload="metadata"
              onError={() => setVideoError(true)}
            />
          )}
          
          {(content.media_type === 'audio' || content.type === 'audio') && content.url && (
            <div className="card-audio-container" key={content.id}>
              <div className="audio-icon">🎵</div>
              <audio src={content.url} controls className="card-audio" preload="metadata" />
            </div>
          )}
          
          {/* Show error if image or video failed to load */}
          {(imageError || videoError) && (
            <div className="card-error">
              <div>
                <p>❌ {imageError ? 'Image' : 'Video'} failed to load</p>
                <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '0.5rem' }}>
                  URL may have expired. Try regenerating this content.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Swipe Hint Overlay */}
        {swipeHint && (
          <div className={`swipe-hint ${swipeHint.className}`}>
            {swipeHint.text}
          </div>
        )}
      </div>

      {/* Swipe Action Buttons */}
      <div className="swipe-buttons">
        <button
          className="swipe-btn swipe-btn-dislike"
          onClick={() => onSwipe('left')}
          title="Dislike"
        >
          👎
        </button>
        <button
          className="swipe-btn swipe-btn-skip"
          onClick={() => onSwipe('down')}
          title="Skip"
        >
          ⏭️
        </button>
        <button
          className="swipe-btn swipe-btn-like"
          onClick={() => onSwipe('right')}
          title="Like"
        >
          👍
        </button>
        <button
          className="swipe-btn swipe-btn-superlike"
          onClick={() => onSwipe('up')}
          title="Superlike"
        >
          ⭐
        </button>
      </div>
    </div>
  );
};

export default SwipeCard;
