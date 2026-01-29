/**
 * Folio API Integration
 * Connects Slayt to Folio's creative intelligence platform
 */

const defaultFolioBase = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/folio`
  : (typeof window !== 'undefined'
      ? `${window.location.origin.replace(/\/$/, '')}/folio`
      : 'http://localhost:3002/folio');
const FOLIO_API_URL = import.meta.env.VITE_FOLIO_API_URL || defaultFolioBase;

// Store Folio session user
let folioUser = JSON.parse(localStorage.getItem('folio_user') || 'null');

/**
 * Set Folio authentication
 */
export const setFolioAuth = (user) => {
  folioUser = user;
  if (user) {
    localStorage.setItem('folio_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('folio_user');
  }
};

/**
 * Get current Folio user
 */
export const getFolioUser = () => folioUser;

/**
 * Check if connected to Folio
 */
export const isFolioConnected = () => !!folioUser;

/**
 * Make authenticated request to Folio API
 */
const folioFetch = async (endpoint, options = {}) => {
  const response = await fetch(`${FOLIO_API_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (response.status === 401) {
      setFolioAuth(null);
      throw new Error('Folio session expired');
    }
    const error = isJson ? await response.json().catch(() => ({})) : { message: await response.text().catch(() => '') };
    throw new Error(error.message || `Folio API error: ${response.status}`);
  }

  if (!isJson) {
    return { raw: await response.text() };
  }

  return response.json();
};

/**
 * Folio Authentication
 */
export const folioAuth = {
  /**
   * Login to Folio
   */
  async login(email, password) {
    // Fetch CSRF token first
    const csrfRes = await fetch(`${FOLIO_API_URL}/api/auth/csrf`, {
      credentials: 'include',
    });
    if (!csrfRes.ok) {
      throw new Error('Unable to start Folio auth');
    }
    const { csrfToken } = await csrfRes.json();

    const body = new URLSearchParams();
    body.append('csrfToken', csrfToken);
    body.append('email', email);
    body.append('password', password);
    body.append('json', 'true');

   const response = await fetch(`${FOLIO_API_URL}/api/auth/callback/credentials`, {
     method: 'POST',
     credentials: 'include',
     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
     body,
   });

   if (!response.ok) {
     const text = await response.text().catch(() => '');
     throw new Error(text || 'Invalid credentials');
   }

    // Session cookie is now set; fetch session to get user
    const session = await this.getSession();
    if (!session?.user) {
      // Sometimes NextAuth returns HTML on failure; surface minimal message
      const text = await response.text().catch(() => '');
      throw new Error(text || 'Unable to establish Folio session');
    }
    setFolioAuth(session.user);
    return { user: session.user };
  },

  /**
   * Check current session
   */
  async getSession() {
    try {
      const data = await folioFetch('/api/auth/session');
      return data;
    } catch {
      return null;
    }
  },

  /**
   * Logout from Folio
   */
  logout() {
    setFolioAuth(null);
  },

  /**
   * Check if connected
   */
  isConnected: isFolioConnected,

  /**
   * Get current user
   */
  getUser: getFolioUser,
};

/**
 * Folio Taste Profile API
 */
export const folioTasteProfile = {
  /**
   * Get user's taste profile from Folio
   */
  async get() {
    return folioFetch('/api/taste-profile');
  },

  /**
   * Check if rebuild is needed
   */
  async checkRebuild() {
    return folioFetch('/api/taste-profile/rebuild');
  },

  /**
   * Rebuild taste profile from collections
   */
  async rebuild() {
    return folioFetch('/api/taste-profile/rebuild', { method: 'POST' });
  },
};

/**
 * Folio Content Generation API
 */
export const folioGenerate = {
  /**
   * Generate content variants using Folio's AI
   * @param {string} topic - Topic to generate for
   * @param {string} platform - Target platform (YOUTUBE_SHORT, TIKTOK, INSTAGRAM_REEL, etc.)
   * @param {number} count - Number of variants to generate
   * @param {string[]} referenceItems - Collection IDs to use as reference
   * @param {string} mode - 'generate' or 'randomize'
   * @param {string} language - Output language
   */
  async variants(topic, platform = 'INSTAGRAM_REEL', count = 5, referenceItems = [], mode = 'generate', language = 'English') {
    return folioFetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        topic,
        platform,
        count,
        referenceItems,
        mode,
        language,
      }),
    });
  },

  /**
   * Generate random ideas from taste profile
   */
  async randomize(platform = 'INSTAGRAM_REEL', count = 5, referenceItems = []) {
    return folioFetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        platform,
        count,
        referenceItems,
        mode: 'randomize',
      }),
    });
  },
};

/**
 * Folio Content Analysis API
 */
export const folioAnalyze = {
  /**
   * Analyze content and get DNA
   */
  async content(title, platform, views = 0, engagement = 0) {
    return folioFetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ title, platform, views, engagement }),
    });
  },
};

/**
 * Folio Collections API
 */
export const folioCollections = {
  /**
   * Get user's saved collections
   */
  async list(limit = 50, offset = 0) {
    return folioFetch(`/api/collections?limit=${limit}&offset=${offset}`);
  },

  /**
   * Get single collection
   */
  async get(id) {
    return folioFetch(`/api/collections/${id}`);
  },

  /**
   * Save new content to collection
   */
  async save(content) {
    return folioFetch('/api/collections', {
      method: 'POST',
      body: JSON.stringify(content),
    });
  },
};

/**
 * Folio Training API
 */
export const folioTraining = {
  /**
   * Get training suggestions
   */
  async getSuggestions(mode = 'pair', count = 10) {
    return folioFetch(`/api/training/suggestions?mode=${mode}&count=${count}`);
  },

  /**
   * Submit a rating
   */
  async rate(ratingData) {
    return folioFetch('/api/training/rate', {
      method: 'POST',
      body: JSON.stringify(ratingData),
    });
  },

  /**
   * Get training stats
   */
  async getStats() {
    return folioFetch('/api/training/stats');
  },

  /**
   * Refine profile from all ratings
   */
  async refine() {
    return folioFetch('/api/training/refine', { method: 'POST' });
  },
};

export default {
  auth: folioAuth,
  tasteProfile: folioTasteProfile,
  generate: folioGenerate,
  analyze: folioAnalyze,
  collections: folioCollections,
  training: folioTraining,
};
