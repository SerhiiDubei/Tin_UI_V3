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
  health: healthAPI
};

export default apiV3Service;
