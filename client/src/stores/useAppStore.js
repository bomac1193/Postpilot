import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Main application store
export const useAppStore = create(
  persist(
    (set, get) => ({
      // User state
      user: null,
      isAuthenticated: false,

      // Theme
      theme: 'dark',

      // Posts/Content
      posts: [],
      selectedPostId: null,

      // Grid planner
      gridPosts: [],
      gridLayout: '3x3',

      // Editor state
      editorMode: 'quick', // 'quick' | 'pro'
      currentImage: null,
      editorHistory: [],
      historyIndex: -1,

      // Calendar
      scheduledPosts: [],

      // Platform connections
      connectedPlatforms: {
        instagram: { connected: false, account: null },
        tiktok: { connected: false, account: null },
        facebook: { connected: false, account: null },
        twitter: { connected: false, account: null },
        linkedin: { connected: false, account: null },
        youtube: { connected: false, account: null },
        pinterest: { connected: false, account: null },
        threads: { connected: false, account: null },
      },

      // UI state
      sidebarCollapsed: false,
      activePanel: 'grid', // 'grid' | 'editor' | 'calendar' | 'ai' | 'settings'

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      // Post actions
      setPosts: (posts) => set({ posts }),
      addPost: (post) => set((state) => ({
        posts: [{ ...post, id: post.id || crypto.randomUUID(), createdAt: Date.now() }, ...state.posts]
      })),
      updatePost: (id, updates) => set((state) => ({
        posts: state.posts.map((p) => (p.id === id || p._id === id) ? { ...p, ...updates } : p),
        // Also update gridPosts if the post exists there
        gridPosts: state.gridPosts.map((p) => (p.id === id || p._id === id) ? { ...p, ...updates } : p)
      })),
      deletePost: (id) => set((state) => ({
        posts: state.posts.filter((p) => p.id !== id && p._id !== id),
        selectedPostId: state.selectedPostId === id ? null : state.selectedPostId
      })),
      selectPost: (id) => set({ selectedPostId: id }),

      // Grid actions
      setGridPosts: (gridPosts) => set({ gridPosts }),
      addToGrid: (post) => set((state) => ({
        gridPosts: [...state.gridPosts, { ...post, gridPosition: state.gridPosts.length }]
      })),
      removeFromGrid: (id) => set((state) => ({
        gridPosts: state.gridPosts.filter((p) => p.id !== id)
      })),
      reorderGrid: (fromIndex, toIndex) => set((state) => {
        const newGridPosts = [...state.gridPosts];
        const [removed] = newGridPosts.splice(fromIndex, 1);
        newGridPosts.splice(toIndex, 0, removed);
        return { gridPosts: newGridPosts.map((p, i) => ({ ...p, gridPosition: i })) };
      }),

      // Editor actions
      setEditorMode: (mode) => set({ editorMode: mode }),
      setCurrentImage: (image) => set({ currentImage: image }),

      // History for undo/redo
      pushHistory: (state) => set((prev) => {
        const newHistory = prev.editorHistory.slice(0, prev.historyIndex + 1);
        newHistory.push(state);
        return {
          editorHistory: newHistory.slice(-50), // Keep last 50 states
          historyIndex: newHistory.length - 1
        };
      }),
      undo: () => set((state) => {
        if (state.historyIndex > 0) {
          return { historyIndex: state.historyIndex - 1 };
        }
        return state;
      }),
      redo: () => set((state) => {
        if (state.historyIndex < state.editorHistory.length - 1) {
          return { historyIndex: state.historyIndex + 1 };
        }
        return state;
      }),
      clearHistory: () => set({ editorHistory: [], historyIndex: -1 }),

      // Calendar actions
      setScheduledPosts: (posts) => set({ scheduledPosts: posts }),
      schedulePost: (post, date) => set((state) => ({
        scheduledPosts: [...state.scheduledPosts, { ...post, scheduledAt: date, status: 'scheduled' }]
      })),
      unschedulePost: (id) => set((state) => ({
        scheduledPosts: state.scheduledPosts.filter((p) => p.id !== id)
      })),

      // Platform actions
      connectPlatform: (platform, account) => set((state) => ({
        connectedPlatforms: {
          ...state.connectedPlatforms,
          [platform]: { connected: true, account }
        }
      })),
      disconnectPlatform: (platform) => set((state) => ({
        connectedPlatforms: {
          ...state.connectedPlatforms,
          [platform]: { connected: false, account: null }
        }
      })),

      // UI actions
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setActivePanel: (panel) => set({ activePanel: panel }),

      // Get selected post helper
      getSelectedPost: () => {
        const state = get();
        return state.posts.find((p) => p.id === state.selectedPostId) || null;
      },
    }),
    {
      name: 'postpilot-storage',
      partialize: (state) => ({
        theme: state.theme,
        posts: state.posts,
        // gridPosts removed - should always come from MongoDB to avoid stale data
        sidebarCollapsed: state.sidebarCollapsed,
        // User profile data for persistence
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Custom merge to ensure persisted data takes precedence
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
        // Ensure user data is preserved if it exists in persisted state
        user: persistedState?.user || currentState.user,
        isAuthenticated: persistedState?.isAuthenticated || currentState.isAuthenticated,
      }),
    }
  )
);

// Editor-specific store (not persisted - canvas state is transient)
export const useEditorStore = create((set, get) => ({
  // Canvas state
  canvas: null,
  activeObject: null,
  zoom: 1,
  pan: { x: 0, y: 0 },

  // Tool state
  activeTool: 'select', // 'select' | 'crop' | 'text' | 'draw'
  brushSize: 10,
  brushColor: '#ffffff',

  // Crop state
  cropMode: false,
  cropAspectRatio: '1:1', // '1:1' | '4:5' | '16:9' | '9:16' | 'free'
  cropRect: null,

  // Adjustments
  adjustments: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    highlights: 0,
    shadows: 0,
    temperature: 0,
    tint: 0,
    vibrance: 0,
    sharpness: 0,
  },

  // Filters
  activeFilter: null,
  filterIntensity: 100,

  // Transform
  rotation: 0,
  flipH: false,
  flipV: false,
  scale: 1,

  // Layers
  layers: [],
  activeLayerId: null,

  // Actions
  setCanvas: (canvas) => set({ canvas }),
  setActiveObject: (obj) => set({ activeObject: obj }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setPan: (pan) => set({ pan }),

  setActiveTool: (tool) => set({ activeTool: tool }),
  setBrushSize: (size) => set({ brushSize: size }),
  setBrushColor: (color) => set({ brushColor: color }),

  setCropMode: (enabled) => set({ cropMode: enabled }),
  setCropAspectRatio: (ratio) => set({ cropAspectRatio: ratio }),
  setCropRect: (rect) => set({ cropRect: rect }),

  setAdjustment: (key, value) => set((state) => ({
    adjustments: { ...state.adjustments, [key]: value }
  })),
  resetAdjustments: () => set({
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      highlights: 0,
      shadows: 0,
      temperature: 0,
      tint: 0,
      vibrance: 0,
      sharpness: 0,
    }
  }),

  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setFilterIntensity: (intensity) => set({ filterIntensity: intensity }),

  setRotation: (deg) => set({ rotation: deg % 360 }),
  rotate90: () => set((state) => ({ rotation: (state.rotation + 90) % 360 })),
  toggleFlipH: () => set((state) => ({ flipH: !state.flipH })),
  toggleFlipV: () => set((state) => ({ flipV: !state.flipV })),
  setScale: (scale) => set({ scale: Math.max(0.1, Math.min(10, scale)) }),

  resetTransform: () => set({ rotation: 0, flipH: false, flipV: false, scale: 1 }),

  // Layer management
  addLayer: (layer) => set((state) => ({
    layers: [...state.layers, { ...layer, id: layer.id || crypto.randomUUID() }]
  })),
  removeLayer: (id) => set((state) => ({
    layers: state.layers.filter((l) => l.id !== id),
    activeLayerId: state.activeLayerId === id ? null : state.activeLayerId
  })),
  updateLayer: (id, updates) => set((state) => ({
    layers: state.layers.map((l) => l.id === id ? { ...l, ...updates } : l)
  })),
  setActiveLayer: (id) => set({ activeLayerId: id }),
  reorderLayers: (fromIndex, toIndex) => set((state) => {
    const newLayers = [...state.layers];
    const [removed] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, removed);
    return { layers: newLayers };
  }),

  // Reset all
  reset: () => set({
    canvas: null,
    activeObject: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    activeTool: 'select',
    cropMode: false,
    cropRect: null,
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      highlights: 0,
      shadows: 0,
      temperature: 0,
      tint: 0,
      vibrance: 0,
      sharpness: 0,
    },
    activeFilter: null,
    filterIntensity: 100,
    rotation: 0,
    flipH: false,
    flipV: false,
    scale: 1,
    layers: [],
    activeLayerId: null,
  }),
}));
