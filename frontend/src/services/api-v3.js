/**
 * API Service for Tin_UI_V3
 * Handles all V3 API calls: Projects, Sessions, Generation
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Generic request handler
 */
async function request(endpoint, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// ==========================================
// PROJECTS API
// ==========================================

export const projectsAPI = {
  /**
   * Get all projects for user
   */
  getAll: async (userId) => {
    return request(`/projects?userId=${userId}`);
  },

  /**
   * Get single project
   */
  getById: async (projectId) => {
    return request(`/projects/${projectId}`);
  },

  /**
   * Create new project
   */
  create: async (data) => {
    return request('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Update project
   */
  update: async (projectId, data) => {
    return request(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Delete project
   */
  delete: async (projectId) => {
    return request(`/projects/${projectId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Get project statistics
   */
  getStats: async (projectId) => {
    return request(`/projects/${projectId}/stats`);
  }
};

// ==========================================
// SESSIONS API
// ==========================================

export const sessionsAPI = {
  /**
   * Get sessions for project
   */
  getByProject: async (projectId) => {
    return request(`/sessions?projectId=${projectId}`);
  },

  /**
   * Get single session
   */
  getById: async (sessionId) => {
    return request(`/sessions/${sessionId}`);
  },

  /**
   * Create new session (generates parameters!)
   */
  create: async (data) => {
    return request('/sessions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Update session (rename)
   */
  update: async (sessionId, data) => {
    return request(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Delete session
   */
  delete: async (sessionId) => {
    return request(`/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Get session statistics
   */
  getStats: async (sessionId) => {
    return request(`/sessions/${sessionId}/stats`);
  },

  /**
   * Get session parameters and weights
   */
  getParameters: async (sessionId) => {
    return request(`/sessions/${sessionId}/parameters`);
  },

  /**
   * Get weight history for visualization
   */
  getWeightHistory: async (sessionId) => {
    return request(`/sessions/${sessionId}/weight-history`);
  }
};

// ==========================================
// GENERATION API
// ==========================================

export const generationAPI = {
  /**
   * Generate content with weight-based parameters
   */
  generate: async (data) => {
    return request('/generation/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Rate generated content
   */
  rate: async (data) => {
    return request('/generation/rate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Get gallery for session
   */
  getGallery: async (sessionId, filter = 'all') => {
    return request(`/generation/gallery?sessionId=${sessionId}&filter=${filter}`);
  },

  /**
   * Get unrated content for session (for resuming swiping)
   */
  getUnrated: async (sessionId, limit = 50) => {
    return request(`/generation/unrated?sessionId=${sessionId}&limit=${limit}`);
  }
};

// ==========================================
// VISION API (Photo Upload & AI Analysis)
// ==========================================

export const visionAPI = {
  /**
   * Analyze uploaded photos and generate a prompt
   * @param {string[]} imageUrls - Array of image URLs (1-20)
   * @param {string} userInstructions - Optional user instructions
   * @param {string} agentType - 'dating' or 'general'
   * @param {string} mode - Generation mode (for General AI)
   */
  analyzePhotos: async (imageUrls, userInstructions = '', agentType = 'general', mode = null) => {
    return request('/vision/analyze', {
      method: 'POST',
      body: JSON.stringify({
        imageUrls,
        userInstructions,
        agentType,
        mode
      })
    });
  },
  
  /**
   * Get a quick description of a single photo
   * @param {string} imageUrl - Image URL
   * @param {string} detailLevel - 'low', 'medium', or 'high'
   */
  describePhoto: async (imageUrl, detailLevel = 'medium') => {
    return request('/vision/describe', {
      method: 'POST',
      body: JSON.stringify({
        imageUrl,
        detailLevel
      })
    });
  },
  
  /**
   * Batch analyze multiple photo sets
   * @param {Array} photoSets - Array of photo set objects
   */
  batchAnalyze: async (photoSets) => {
    return request('/vision/batch-analyze', {
      method: 'POST',
      body: JSON.stringify({
        photoSets
      })
    });
  }
};

// ==========================================
// QA API (Quality Assurance)
// ==========================================

export const qaAPI = {
  /**
   * Validate a prompt (full AI-powered validation)
   * @param {Object} promptData - Prompt validation data
   */
  validate: async (promptData) => {
    return request('/qa/validate', {
      method: 'POST',
      body: JSON.stringify(promptData)
    });
  },
  
  /**
   * Quick validation (rule-based, fast)
   * @param {string} enhancedPrompt - Prompt to validate
   * @param {string} agentType - 'dating' or 'general'
   * @param {string} model - Model ID
   */
  quickValidate: async (enhancedPrompt, agentType, model) => {
    return request('/qa/quick-validate', {
      method: 'POST',
      body: JSON.stringify({
        enhancedPrompt,
        agentType,
        model
      })
    });
  },
  
  /**
   * Get QA statistics for a session
   * @param {string} sessionId - Session ID
   */
  getStats: async (sessionId) => {
    return request(`/qa/stats?sessionId=${sessionId}`);
  }
};

// ==========================================
// HEALTH CHECK
// ==========================================

export const healthAPI = {
  check: async () => {
    return request('/health');
  }
};

const apiV3Service = {
  projects: projectsAPI,
  sessions: sessionsAPI,
  generation: generationAPI,
  vision: visionAPI,
  qa: qaAPI,
  health: healthAPI
};

export default apiV3Service;
