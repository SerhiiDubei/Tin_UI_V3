import React from 'react';
import './ModeSelector.css';

/**
 * 🎨 Mode Selector Component
 * Allows users to choose generation mode for General Purpose AI
 */

const MODES = [
  {
    id: 'text-to-image',
    name: 'Text-to-Image',
    icon: '📝',
    description: 'Generate from text (fast)',
    speed: '⚡ 1.8s',
    badge: 'Fast'
  },
  {
    id: 'style-transfer',
    name: 'Style Transfer',
    icon: '🎨',
    description: 'Apply style from reference',
    speed: '⚡ 1.2s',
    badge: 'Fast'
  },
  {
    id: 'image-editing',
    name: 'Image Editing',
    icon: '✏️',
    description: 'Edit existing images',
    speed: '⚡ 1.2s',
    badge: 'Fast'
  },
  {
    id: 'multi-reference',
    name: 'Multi-Reference',
    icon: '🖼️',
    description: 'Combine 2-14 images',
    speed: '⚡ 1.5s',
    badge: 'Pro'
  },
  {
    id: 'object-replace',
    name: 'Object Replace',
    icon: '🔄',
    description: 'Replace objects precisely',
    speed: '⚡ 1.2s',
    badge: 'Fast'
  },
  {
    id: 'background-change',
    name: 'Background Change',
    icon: '🌅',
    description: 'Replace backgrounds',
    speed: '⚡ 1.2s',
    badge: 'Fast'
  },
  {
    id: 'pro-quality',
    name: 'Pro Quality',
    icon: '📸',
    description: 'Maximum quality (slower)',
    speed: '🐌 25s',
    badge: 'Quality'
  },
  {
    id: 'ad-replicator',
    name: 'Ad Replicator',
    icon: '🎯',
    description: 'Analyze competitor ads (1-14)',
    speed: '⚡ 1.5s',
    badge: 'Marketing'
  }
];

function ModeSelector({ selectedMode, onModeChange, disabled = false, filterMode = 'all' }) {
  const handleModeClick = (modeId) => {
    if (!disabled && onModeChange) {
      onModeChange(modeId);
    }
  };
  
  // Filter modes based on context
  const filteredModes = MODES.filter(mode => {
    if (filterMode === 'reference-only') {
      // Only modes that require reference images
      return ['style-transfer', 'image-editing', 'multi-reference', 'object-replace', 'background-change', 'ad-replicator'].includes(mode.id);
    }
    return true; // 'all' - show all modes
  });

  return (
    <div className="mode-selector">
      <div className="mode-selector-header">
        <h3>📋 Generation Mode</h3>
        <p className="mode-selector-subtitle">
          {filterMode === 'reference-only' 
            ? 'Choose a mode that uses reference images' 
            : 'Choose how you want to create'}
        </p>
      </div>

      <div className="mode-grid">
        {filteredModes.map((mode) => {
          const isSelected = selectedMode === mode.id;
          const isDisabled = disabled;

          return (
            <div
              key={mode.id}
              className={`mode-card ${isSelected ? 'mode-card-selected' : ''} ${isDisabled ? 'mode-card-disabled' : ''}`}
              onClick={() => handleModeClick(mode.id)}
              role="button"
              tabIndex={isDisabled ? -1 : 0}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleModeClick(mode.id);
                }
              }}
            >
              <div className="mode-card-header">
                <span className="mode-icon">{mode.icon}</span>
                {isSelected && <span className="mode-checkmark">✓</span>}
              </div>

              <div className="mode-card-body">
                <h4 className="mode-name">{mode.name}</h4>
                <p className="mode-description">{mode.description}</p>
              </div>

              <div className="mode-card-footer">
                <span className={`mode-badge mode-badge-${mode.badge.toLowerCase()}`}>
                  {mode.badge}
                </span>
                <span className="mode-speed">{mode.speed}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mode-specific info */}
      {selectedMode && (
        <div className="mode-info">
          {getModeInfo(selectedMode)}
        </div>
      )}
    </div>
  );
}

/**
 * Get detailed info for selected mode
 */
function getModeInfo(modeId) {
  const info = {
    'text-to-image': {
      inputs: '💬 Prompt only',
      example: 'A modern office space with plants',
      tip: 'Be specific about composition, lighting, and style'
    },
    'style-transfer': {
      inputs: '💬 Prompt + 📸 1 Reference Image',
      example: 'Portrait in the same artistic style',
      tip: 'Upload a reference image with the style you want'
    },
    'image-editing': {
      inputs: '💬 Edit Instructions + 📸 1 Source Image',
      example: 'Enhance colors, remove power lines',
      tip: 'Be specific about what to change or improve'
    },
    'multi-reference': {
      inputs: '💬 Prompt + 📸 2-14 Reference Images',
      example: 'Combine character from image 1 with scene from image 2',
      tip: 'Up to 6 object images + 5 character images for best results'
    },
    'object-replace': {
      inputs: '💬 Object + Replacement + 📸 1 Source Image',
      example: 'Replace wooden table with glass table',
      tip: 'Describe both the object to replace and the new object'
    },
    'background-change': {
      inputs: '💬 New Background + 📸 1 Source Image',
      example: 'Change background to tropical beach',
      tip: 'Subject will be kept, only background changes'
    },
    'pro-quality': {
      inputs: '💬 Detailed Prompt',
      example: 'Professional product photo with studio lighting',
      tip: 'Slower but maximum quality - best for final renders'
    },
    'ad-replicator': {
      inputs: '💬 Niche/Offer + 📸 1-14 Competitor Ads',
      example: 'Teeth whitening kit → upload competitor ads from Facebook',
      tip: 'Ethical replication: Copies STRATEGY, not pixels. Generates 3-5 NEW original ads'
    }
  };

  const modeInfo = info[modeId];
  if (!modeInfo) return null;

  return (
    <>
      <div className="mode-info-item">
        <strong>Inputs:</strong> {modeInfo.inputs}
      </div>
      <div className="mode-info-item">
        <strong>Example:</strong> <em>{modeInfo.example}</em>
      </div>
      <div className="mode-info-tip">
        💡 <strong>Tip:</strong> {modeInfo.tip}
      </div>
    </>
  );
}

export default ModeSelector;

