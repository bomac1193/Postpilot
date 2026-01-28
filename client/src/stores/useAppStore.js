import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Note: Previous cleanup code removed - it was deleting YouTube collections.
// YouTube collections are now persisted locally since the backend API isn't connected to the frontend yet.

// Main application store
export const useAppStore = create(
  persist(
    (set, get) => ({
      // User state
      user: null,
      isAuthenticated: false,

      // Profile state
      profiles: [],
      currentProfileId: null,

      // Theme
      theme: 'dark',

      // Posts/Content
      posts: [],
      selectedPostId: null,

      // Grid planner
      gridPosts: [],
      gridLayout: '3x3',
      // Grid metadata (color and rollout assignments for backend grids)
      gridMeta: {}, // { [gridId]: { color, rolloutId, sectionId } }

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

      // Reel Collections (separate from photo grid collections)
      reelCollections: [],
      currentReelCollectionId: null,

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
        { id: 'default', name: 'My Videos', createdAt: new Date().toISOString(), tags: [], color: null, rolloutId: null, sectionId: null }
      ],
      currentYoutubeCollectionId: 'default',
      // Videos stored by collection ID for persistence
      youtubeVideosByCollection: { default: [] },

      // Rollouts
      rollouts: [],
      currentRolloutId: null,

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
      logout: () => set({ user: null, isAuthenticated: false, profiles: [], currentProfileId: null }),

      // Profile actions
      setProfiles: (profiles) => set({ profiles }),
      addProfile: (profile) => set((state) => ({
        profiles: [...state.profiles, profile]
      })),
      updateProfile: (id, updates) => set((state) => ({
        profiles: state.profiles.map(p =>
          (p._id || p.id) === id ? { ...p, ...updates } : p
        )
      })),
      deleteProfile: (id) => set((state) => ({
        profiles: state.profiles.filter(p => (p._id || p.id) !== id),
        currentProfileId: state.currentProfileId === id
          ? (state.profiles.find(p => (p._id || p.id) !== id)?._id || state.profiles.find(p => (p._id || p.id) !== id)?.id || null)
          : state.currentProfileId
      })),
      setCurrentProfile: (id) => set({ currentProfileId: id }),
      getCurrentProfile: () => {
        const state = get();
        return state.profiles.find(p => (p._id || p.id) === state.currentProfileId) || null;
      },
      // Set current profile to default if not set
      ensureCurrentProfile: () => {
        const state = get();
        if (!state.currentProfileId && state.profiles.length > 0) {
          const defaultProfile = state.profiles.find(p => p.isDefault) || state.profiles[0];
          set({ currentProfileId: defaultProfile._id || defaultProfile.id });
        }
      },

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

      // Grid metadata actions (for backend grids)
      updateGridMeta: (gridId, meta) => set((state) => ({
        gridMeta: {
          ...state.gridMeta,
          [gridId]: { ...state.gridMeta[gridId], ...meta }
        }
      })),
      updateGridColor: (gridId, color) => set((state) => ({
        gridMeta: {
          ...state.gridMeta,
          [gridId]: { ...state.gridMeta[gridId], color }
        }
      })),
      assignGridToRollout: (gridId, rolloutId, sectionId) => set((state) => ({
        gridMeta: {
          ...state.gridMeta,
          [gridId]: { ...state.gridMeta[gridId], rolloutId, sectionId }
        }
      })),
      unassignGridFromRollout: (gridId) => set((state) => ({
        gridMeta: {
          ...state.gridMeta,
          [gridId]: { ...state.gridMeta[gridId], rolloutId: null, sectionId: null }
        }
      })),
      deleteGridMeta: (gridId) => set((state) => {
        const { [gridId]: _, ...remaining } = state.gridMeta;
        return { gridMeta: remaining };
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

      // Reel Collection actions
      setReelCollections: (collections) => set({ reelCollections: collections }),
      addReelCollection: (collection) => set((state) => ({
        reelCollections: [collection, ...state.reelCollections]
      })),
      updateReelCollection: (id, updates) => set((state) => ({
        reelCollections: state.reelCollections.map(c =>
          (c._id || c.id) === id ? { ...c, ...updates } : c
        )
      })),
      deleteReelCollection: (id) => set((state) => ({
        reelCollections: state.reelCollections.filter(c => (c._id || c.id) !== id),
        currentReelCollectionId: state.currentReelCollectionId === id ? null : state.currentReelCollectionId
      })),
      setCurrentReelCollection: (id) => set({ currentReelCollectionId: id }),

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
          tags: [],
          color: null,
          rolloutId: null,
          sectionId: null,
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
          tags: [...(sourceCollection.tags || [])],
          color: sourceCollection.color || null,
          rolloutId: null, // Don't copy rollout assignment
          sectionId: null,
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

      // Collection tag actions
      updateYoutubeCollectionTags: (collectionId, tags) => set((state) => ({
        youtubeCollections: state.youtubeCollections.map(c =>
          c.id === collectionId ? { ...c, tags } : c
        )
      })),
      addTagToCollection: (collectionId, tag) => set((state) => ({
        youtubeCollections: state.youtubeCollections.map(c =>
          c.id === collectionId && !(c.tags || []).includes(tag)
            ? { ...c, tags: [...(c.tags || []), tag] }
            : c
        )
      })),
      removeTagFromCollection: (collectionId, tag) => set((state) => ({
        youtubeCollections: state.youtubeCollections.map(c =>
          c.id === collectionId
            ? { ...c, tags: (c.tags || []).filter(t => t !== tag) }
            : c
        )
      })),

      // Collection color and rollout assignment actions
      updateCollectionColor: (collectionId, color) => set((state) => ({
        youtubeCollections: state.youtubeCollections.map(c =>
          c.id === collectionId ? { ...c, color } : c
        )
      })),
      assignCollectionToRollout: (collectionId, rolloutId, sectionId) => set((state) => {
        // First, remove from any existing section in any rollout
        let updatedRollouts = state.rollouts.map(r => ({
          ...r,
          sections: r.sections.map(s => ({
            ...s,
            collectionIds: s.collectionIds.filter(id => id !== collectionId)
          }))
        }));

        // If assigning to a new section, add the collection there
        if (rolloutId && sectionId) {
          updatedRollouts = updatedRollouts.map(r =>
            r.id === rolloutId
              ? {
                  ...r,
                  sections: r.sections.map(s =>
                    s.id === sectionId
                      ? { ...s, collectionIds: [...s.collectionIds, collectionId] }
                      : s
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : r
          );
        }

        return {
          youtubeCollections: state.youtubeCollections.map(c =>
            c.id === collectionId ? { ...c, rolloutId, sectionId } : c
          ),
          rollouts: updatedRollouts,
        };
      }),
      unassignCollectionFromRollout: (collectionId) => set((state) => {
        const collection = state.youtubeCollections.find(c => c.id === collectionId);
        if (!collection) return state;

        return {
          youtubeCollections: state.youtubeCollections.map(c =>
            c.id === collectionId ? { ...c, rolloutId: null, sectionId: null } : c
          ),
          rollouts: state.rollouts.map(r => ({
            ...r,
            sections: r.sections.map(s => ({
              ...s,
              collectionIds: s.collectionIds.filter(id => id !== collectionId)
            })),
            updatedAt: new Date().toISOString(),
          })),
        };
      }),

      // Rollout actions
      setRollouts: (rollouts) => set({ rollouts }),
      addRollout: (rollout) => set((state) => {
        const newRollout = {
          id: crypto.randomUUID(),
          name: rollout?.name || 'Untitled Rollout',
          description: rollout?.description || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: rollout?.status || 'draft',
          sections: rollout?.sections || [],
        };
        return {
          rollouts: [newRollout, ...state.rollouts],
          currentRolloutId: newRollout.id,
        };
      }),
      updateRollout: (id, updates) => set((state) => ({
        rollouts: state.rollouts.map(r =>
          r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
        )
      })),
      deleteRollout: (id) => set((state) => ({
        rollouts: state.rollouts.filter(r => r.id !== id),
        currentRolloutId: state.currentRolloutId === id ? null : state.currentRolloutId,
      })),
      setCurrentRollout: (id) => set({ currentRolloutId: id }),

      // Rollout section actions
      addRolloutSection: (rolloutId, section) => set((state) => {
        const rollout = state.rollouts.find(r => r.id === rolloutId);
        if (!rollout) return state;
        // Default phase colors
        const phaseColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#f59e0b'];
        const newSection = {
          id: crypto.randomUUID(),
          name: section?.name || 'New Section',
          order: rollout.sections.length,
          collectionIds: section?.collectionIds || [],
          color: section?.color || phaseColors[rollout.sections.length % phaseColors.length],
        };
        return {
          rollouts: state.rollouts.map(r =>
            r.id === rolloutId
              ? { ...r, sections: [...r.sections, newSection], updatedAt: new Date().toISOString() }
              : r
          ),
        };
      }),
      updateRolloutSection: (rolloutId, sectionId, updates) => set((state) => ({
        rollouts: state.rollouts.map(r =>
          r.id === rolloutId
            ? {
                ...r,
                sections: r.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s),
                updatedAt: new Date().toISOString(),
              }
            : r
        )
      })),
      deleteRolloutSection: (rolloutId, sectionId) => set((state) => ({
        rollouts: state.rollouts.map(r =>
          r.id === rolloutId
            ? {
                ...r,
                sections: r.sections.filter(s => s.id !== sectionId).map((s, idx) => ({ ...s, order: idx })),
                updatedAt: new Date().toISOString(),
              }
            : r
        )
      })),
      reorderRolloutSections: (rolloutId, sourceIndex, targetIndex) => set((state) => {
        const rollout = state.rollouts.find(r => r.id === rolloutId);
        if (!rollout || sourceIndex === targetIndex) return state;
        const sections = [...rollout.sections];
        const [moved] = sections.splice(sourceIndex, 1);
        sections.splice(targetIndex, 0, moved);
        const reordered = sections.map((s, idx) => ({ ...s, order: idx }));
        return {
          rollouts: state.rollouts.map(r =>
            r.id === rolloutId
              ? { ...r, sections: reordered, updatedAt: new Date().toISOString() }
              : r
          ),
        };
      }),

      // Collection in section actions
      addCollectionToSection: (rolloutId, sectionId, collectionId) => set((state) => ({
        rollouts: state.rollouts.map(r =>
          r.id === rolloutId
            ? {
                ...r,
                sections: r.sections.map(s =>
                  s.id === sectionId && !s.collectionIds.includes(collectionId)
                    ? { ...s, collectionIds: [...s.collectionIds, collectionId] }
                    : s
                ),
                updatedAt: new Date().toISOString(),
              }
            : r
        )
      })),
      removeCollectionFromSection: (rolloutId, sectionId, collectionId) => set((state) => ({
        rollouts: state.rollouts.map(r =>
          r.id === rolloutId
            ? {
                ...r,
                sections: r.sections.map(s =>
                  s.id === sectionId
                    ? { ...s, collectionIds: s.collectionIds.filter(id => id !== collectionId) }
                    : s
                ),
                updatedAt: new Date().toISOString(),
              }
            : r
        )
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
      name: 'slayt-storage',
      storage: {
        getItem: (name) => {
          try {
            // First try the current storage name
            let str = localStorage.getItem(name);
            let source = name;

            // If not found or empty, try migrating from old storage names
            const oldNames = ['postpanda-storage', 'postpilot-storage', 'postpanda-store', 'postpilot-store'];

            if (!str) {
              for (const oldName of oldNames) {
                const oldStr = localStorage.getItem(oldName);
                if (oldStr) {
                  console.log(`[Slayt] Found data in ${oldName}, migrating to ${name}`);
                  str = oldStr;
                  source = oldName;
                  // Save to new name
                  localStorage.setItem(name, oldStr);
                  break;
                }
              }
            }

            // Log what we found
            if (str) {
              const parsed = JSON.parse(str);
              const videoCount = parsed?.state?.youtubeVideos?.length || 0;
              const collectionCount = parsed?.state?.youtubeCollections?.length || 0;
              const videosByCollectionKeys = Object.keys(parsed?.state?.youtubeVideosByCollection || {});
              console.log(`[Slayt] Loaded from ${source}:`, {
                youtubeVideos: videoCount,
                youtubeCollections: collectionCount,
                videosByCollectionKeys,
              });
              return parsed;
            } else {
              console.log('[Slayt] No saved data found in localStorage');
              return null;
            }
          } catch (e) {
            console.error('[Slayt] Failed to load from localStorage:', e);
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
        // Don't persist posts - they come from MongoDB
        // posts: state.posts,
        // Grid metadata (colors/rollout assignments) - stored locally
        gridMeta: state.gridMeta,
        sidebarCollapsed: state.sidebarCollapsed,
        // User profile - avatar URL is now small (Cloudinary URL), so we can persist it
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // Current profile selection (profiles themselves come from backend)
        currentProfileId: state.currentProfileId,
        // Reel order for custom sorting (just IDs, not full objects)
        reelOrder: state.reelOrder,
        // YouTube Planner - only persist UI settings, data comes from MongoDB
        youtubeViewMode: state.youtubeViewMode,
        youtubeCompetitors: state.youtubeCompetitors,
        youtubeChannelSettings: state.youtubeChannelSettings,
        // YouTube collections/videos are now stored in MongoDB - only persist selection ID
        currentYoutubeCollectionId: state.currentYoutubeCollectionId,
        // Reel collections - just the current selection
        currentReelCollectionId: state.currentReelCollectionId,
        // Rollouts - persist selection (data should come from backend)
        currentRolloutId: state.currentRolloutId,
      }),
      // Merge persisted state with current state
      merge: (persistedState, currentState) => {
        return {
          ...currentState,
          ...persistedState,
          // Preserve small settings
          gridMeta: persistedState?.gridMeta || currentState.gridMeta,
          sidebarCollapsed: persistedState?.sidebarCollapsed ?? currentState.sidebarCollapsed,
          youtubeViewMode: persistedState?.youtubeViewMode || currentState.youtubeViewMode,
          youtubeCompetitors: persistedState?.youtubeCompetitors || currentState.youtubeCompetitors,
          youtubeChannelSettings: persistedState?.youtubeChannelSettings || currentState.youtubeChannelSettings,
          // YouTube data comes from backend now - only preserve selection ID
          currentYoutubeCollectionId: persistedState?.currentYoutubeCollectionId || currentState.currentYoutubeCollectionId,
          // Preserve reel collection selection
          currentReelCollectionId: persistedState?.currentReelCollectionId || currentState.currentReelCollectionId,
          currentRolloutId: persistedState?.currentRolloutId || currentState.currentRolloutId,
          // Preserve profile selection (profiles list comes from backend)
          currentProfileId: persistedState?.currentProfileId || currentState.currentProfileId,
        };
      },
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
