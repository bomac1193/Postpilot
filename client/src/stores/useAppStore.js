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

      // Reels
      reels: [],
      reelOrder: [], // Persisted array of reel IDs for custom ordering

      // YouTube Planner
      youtubeVideos: [],
      youtubeViewMode: 'grid', // 'grid' | 'sidebar'
      selectedYoutubeVideoId: null,
      youtubeCompetitors: [],
      youtubeChannelSettings: {
        channelName: 'Your Channel',
        channelAvatar: null,
        useSharedProfile: false, // Use same name/avatar as IG/TikTok
      },
      // YouTube Collections
      youtubeCollections: [
        { id: 'default', name: 'My Videos', createdAt: new Date().toISOString() }
      ],
      currentYoutubeCollectionId: 'default',
      // Videos stored by collection ID for persistence
      youtubeVideosByCollection: { default: [] },

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

      // Reels actions
      setReels: (reels) => set((state) => {
        // Sort reels according to saved order if available
        if (state.reelOrder && state.reelOrder.length > 0) {
          const orderMap = new Map(state.reelOrder.map((id, index) => [id, index]));
          const sortedReels = [...reels].sort((a, b) => {
            const aId = a._id || a.id;
            const bId = b._id || b.id;
            const aOrder = orderMap.has(aId) ? orderMap.get(aId) : Infinity;
            const bOrder = orderMap.has(bId) ? orderMap.get(bId) : Infinity;
            return aOrder - bOrder;
          });
          return { reels: sortedReels };
        }
        return { reels };
      }),
      addReel: (reel) => set((state) => {
        const reelId = reel._id || reel.id;
        return {
          reels: [reel, ...state.reels],
          reelOrder: [reelId, ...state.reelOrder]
        };
      }),
      // Update reels AND order together (for manual reordering - bypasses sorting)
      reorderReels: (reels) => set({
        reels: reels,
        reelOrder: reels.map(r => r._id || r.id)
      }),

      // YouTube Planner actions
      setYoutubeVideos: (videos) => set({ youtubeVideos: videos }),
      addYoutubeVideo: (video) => set((state) => ({
        youtubeVideos: [...state.youtubeVideos, {
          ...video,
          id: video.id || crypto.randomUUID(),
          createdAt: video.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          position: state.youtubeVideos.length,
        }]
      })),
      updateYoutubeVideo: (id, updates) => set((state) => ({
        youtubeVideos: state.youtubeVideos.map(v =>
          v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
        )
      })),
      deleteYoutubeVideo: (id) => set((state) => ({
        youtubeVideos: state.youtubeVideos.filter(v => v.id !== id),
        selectedYoutubeVideoId: state.selectedYoutubeVideoId === id ? null : state.selectedYoutubeVideoId
      })),
      reorderYoutubeVideos: (videos) => set({
        youtubeVideos: videos.map((v, i) => ({ ...v, position: i }))
      }),
      selectYoutubeVideo: (id) => set({ selectedYoutubeVideoId: id }),
      setYoutubeViewMode: (mode) => set({ youtubeViewMode: mode }),

      // YouTube Competitors actions
      setYoutubeCompetitors: (competitors) => set({ youtubeCompetitors: competitors }),
      addYoutubeCompetitor: (competitor) => set((state) => ({
        youtubeCompetitors: [...state.youtubeCompetitors, {
          ...competitor,
          id: competitor.id || crypto.randomUUID(),
        }]
      })),
      updateYoutubeCompetitor: (id, updates) => set((state) => ({
        youtubeCompetitors: state.youtubeCompetitors.map(c =>
          c.id === id ? { ...c, ...updates } : c
        )
      })),
      deleteYoutubeCompetitor: (id) => set((state) => ({
        youtubeCompetitors: state.youtubeCompetitors.filter(c => c.id !== id)
      })),
      reorderYoutubeCompetitors: (competitors) => set({ youtubeCompetitors: competitors }),

      // YouTube Collections actions
      setYoutubeCollections: (collections) => set({ youtubeCollections: collections }),
      addYoutubeCollection: (name) => set((state) => {
        const newCollection = {
          id: crypto.randomUUID(),
          name: name || 'New Collection',
          createdAt: new Date().toISOString(),
        };
        // Save current collection's videos before switching
        const updatedVideosByCollection = {
          ...state.youtubeVideosByCollection,
          [state.currentYoutubeCollectionId]: state.youtubeVideos,
          [newCollection.id]: [], // Initialize empty array for new collection
        };
        return {
          youtubeCollections: [...state.youtubeCollections, newCollection],
          currentYoutubeCollectionId: newCollection.id,
          youtubeVideos: [], // Start fresh for new collection
          youtubeVideosByCollection: updatedVideosByCollection,
          selectedYoutubeVideoId: null,
        };
      }),
      renameYoutubeCollection: (id, name) => set((state) => ({
        youtubeCollections: state.youtubeCollections.map(c =>
          c.id === id ? { ...c, name } : c
        )
      })),
      duplicateYoutubeCollection: (id) => set((state) => {
        const sourceCollection = state.youtubeCollections.find(c => c.id === id);
        if (!sourceCollection) return state;

        const newId = crypto.randomUUID();
        const newCollection = {
          id: newId,
          name: `${sourceCollection.name} (Copy)`,
          createdAt: new Date().toISOString(),
        };

        // Get videos from source collection
        const sourceVideos = id === state.currentYoutubeCollectionId
          ? state.youtubeVideos
          : (state.youtubeVideosByCollection[id] || []);

        // Deep copy videos with new IDs
        const duplicatedVideos = sourceVideos.map(v => ({
          ...v,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }));

        // Save current videos before switching
        const updatedVideosByCollection = {
          ...state.youtubeVideosByCollection,
          [state.currentYoutubeCollectionId]: state.youtubeVideos,
          [newId]: duplicatedVideos,
        };

        return {
          youtubeCollections: [...state.youtubeCollections, newCollection],
          currentYoutubeCollectionId: newId,
          youtubeVideos: duplicatedVideos,
          youtubeVideosByCollection: updatedVideosByCollection,
          selectedYoutubeVideoId: null,
        };
      }),
      deleteYoutubeCollection: (id) => set((state) => {
        // Can't delete the last collection
        if (state.youtubeCollections.length <= 1) return state;

        const newCollections = state.youtubeCollections.filter(c => c.id !== id);
        const wasCurrentCollection = state.currentYoutubeCollectionId === id;
        const newCurrentId = wasCurrentCollection
          ? newCollections[0]?.id || 'default'
          : state.currentYoutubeCollectionId;

        // Remove deleted collection from videos map
        const { [id]: _, ...remainingVideosByCollection } = state.youtubeVideosByCollection;

        return {
          youtubeCollections: newCollections,
          currentYoutubeCollectionId: newCurrentId,
          youtubeVideos: wasCurrentCollection
            ? (remainingVideosByCollection[newCurrentId] || [])
            : state.youtubeVideos,
          youtubeVideosByCollection: remainingVideosByCollection,
          selectedYoutubeVideoId: wasCurrentCollection ? null : state.selectedYoutubeVideoId,
        };
      }),
      setCurrentYoutubeCollection: (id) => set((state) => {
        // Save current collection's videos before switching
        const updatedVideosByCollection = {
          ...state.youtubeVideosByCollection,
          [state.currentYoutubeCollectionId]: state.youtubeVideos,
        };
        return {
          currentYoutubeCollectionId: id,
          youtubeVideos: updatedVideosByCollection[id] || [],
          youtubeVideosByCollection: updatedVideosByCollection,
          selectedYoutubeVideoId: null,
        };
      }),
      // Save current videos to collection (call before switching or on unmount)
      saveCurrentYoutubeCollectionVideos: () => set((state) => ({
        youtubeVideosByCollection: {
          ...state.youtubeVideosByCollection,
          [state.currentYoutubeCollectionId]: state.youtubeVideos,
        }
      })),

      // YouTube Channel Settings actions
      setYoutubeChannelSettings: (settings) => set((state) => ({
        youtubeChannelSettings: { ...state.youtubeChannelSettings, ...settings }
      })),
      updateYoutubeChannelAvatar: (avatar) => set((state) => ({
        youtubeChannelSettings: { ...state.youtubeChannelSettings, channelAvatar: avatar }
      })),
      updateYoutubeChannelName: (name) => set((state) => ({
        youtubeChannelSettings: { ...state.youtubeChannelSettings, channelName: name }
      })),
      toggleYoutubeUseSharedProfile: () => set((state) => ({
        youtubeChannelSettings: {
          ...state.youtubeChannelSettings,
          useSharedProfile: !state.youtubeChannelSettings.useSharedProfile
        }
      })),

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
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (e) {
            console.error('Failed to save to localStorage:', e);
            // If quota exceeded, try to clear old data and retry
            if (e.name === 'QuotaExceededError' || e.code === 22) {
              console.warn('localStorage quota exceeded, attempting to clear space...');
              try {
                // Try to save without YouTube thumbnails as fallback
                const reducedValue = {
                  ...value,
                  state: {
                    ...value.state,
                    youtubeVideos: value.state?.youtubeVideos?.map(v => ({
                      ...v,
                      thumbnail: null // Remove thumbnails if quota exceeded
                    })) || []
                  }
                };
                localStorage.setItem(name, JSON.stringify(reducedValue));
                console.warn('Saved without thumbnails due to storage limit');
              } catch (e2) {
                console.error('Failed to save even without thumbnails:', e2);
              }
            }
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (e) {
            console.error('Failed to remove from localStorage:', e);
          }
        },
      },
      partialize: (state) => ({
        theme: state.theme,
        posts: state.posts,
        // gridPosts removed - should always come from MongoDB to avoid stale data
        sidebarCollapsed: state.sidebarCollapsed,
        // User profile data for persistence
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // Reel order for custom sorting
        reelOrder: state.reelOrder,
        // YouTube Planner data
        youtubeVideos: state.youtubeVideos,
        youtubeViewMode: state.youtubeViewMode,
        youtubeCompetitors: state.youtubeCompetitors,
        youtubeChannelSettings: state.youtubeChannelSettings,
        // YouTube Collections
        youtubeCollections: state.youtubeCollections,
        currentYoutubeCollectionId: state.currentYoutubeCollectionId,
        youtubeVideosByCollection: state.youtubeVideosByCollection,
      }),
      // Custom merge to ensure persisted data takes precedence
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
        // Ensure user data is preserved if it exists in persisted state
        user: persistedState?.user || currentState.user,
        isAuthenticated: persistedState?.isAuthenticated || currentState.isAuthenticated,
        // Ensure YouTube data is preserved
        youtubeVideos: persistedState?.youtubeVideos || currentState.youtubeVideos,
        youtubeViewMode: persistedState?.youtubeViewMode || currentState.youtubeViewMode,
        youtubeCompetitors: persistedState?.youtubeCompetitors || currentState.youtubeCompetitors,
        youtubeChannelSettings: persistedState?.youtubeChannelSettings || currentState.youtubeChannelSettings,
        // Ensure YouTube Collections are preserved
        youtubeCollections: persistedState?.youtubeCollections || currentState.youtubeCollections,
        currentYoutubeCollectionId: persistedState?.currentYoutubeCollectionId || currentState.currentYoutubeCollectionId,
        youtubeVideosByCollection: persistedState?.youtubeVideosByCollection || currentState.youtubeVideosByCollection,
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
