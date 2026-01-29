import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { youtubeApi } from '../lib/api';
import YouTubeGridView from '../components/youtube/YouTubeGridView';
import YouTubeSidebarView from '../components/youtube/YouTubeSidebarView';
import YouTubeVideoDetails from '../components/youtube/YouTubeVideoDetails';
import YouTubeThumbnailEditor from '../components/youtube/YouTubeThumbnailEditor';
import {
  Lock,
  Unlock,
  Upload,
  ImagePlus,
  Loader2,
  LayoutGrid,
  List,
  Download,
  Youtube,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  FolderOpen,
  Copy,
  Palette,
  Link2,
  Unlink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

// Preset colors for collections
const COLLECTION_COLORS = [
  { id: 'purple', value: '#8b5cf6', name: 'Purple' },
  { id: 'blue', value: '#3b82f6', name: 'Blue' },
  { id: 'green', value: '#10b981', name: 'Green' },
  { id: 'orange', value: '#f97316', name: 'Orange' },
  { id: 'pink', value: '#ec4899', name: 'Pink' },
  { id: 'indigo', value: '#6366f1', name: 'Indigo' },
  { id: 'teal', value: '#14b8a6', name: 'Teal' },
  { id: 'amber', value: '#f59e0b', name: 'Amber' },
  { id: 'red', value: '#ef4444', name: 'Red' },
  { id: 'cyan', value: '#06b6d4', name: 'Cyan' },
];

function YouTubePlanner() {
  const youtubeVideos = useAppStore((state) => state.youtubeVideos);
  const addYoutubeVideo = useAppStore((state) => state.addYoutubeVideo);
  const updateYoutubeVideo = useAppStore((state) => state.updateYoutubeVideo);
  const selectedYoutubeVideoId = useAppStore((state) => state.selectedYoutubeVideoId);
  const youtubeViewMode = useAppStore((state) => state.youtubeViewMode);
  const setYoutubeViewMode = useAppStore((state) => state.setYoutubeViewMode);

  // Collections
  const youtubeCollections = useAppStore((state) => state.youtubeCollections);
  const currentYoutubeCollectionId = useAppStore((state) => state.currentYoutubeCollectionId);
  const setYoutubeCollections = useAppStore((state) => state.setYoutubeCollections);
  const addYoutubeCollection = useAppStore((state) => state.addYoutubeCollection);
  const renameYoutubeCollection = useAppStore((state) => state.renameYoutubeCollection);
  const duplicateYoutubeCollection = useAppStore((state) => state.duplicateYoutubeCollection);
  const deleteYoutubeCollection = useAppStore((state) => state.deleteYoutubeCollection);
  const setCurrentYoutubeCollection = useAppStore((state) => state.setCurrentYoutubeCollection);
  const setYoutubeVideos = useAppStore((state) => state.setYoutubeVideos);
  const updateCollectionColor = useAppStore((state) => state.updateCollectionColor);
  const assignCollectionToRollout = useAppStore((state) => state.assignCollectionToRollout);
  const unassignCollectionFromRollout = useAppStore((state) => state.unassignCollectionFromRollout);

  // Rollouts for assignment
  const rollouts = useAppStore((state) => state.rollouts);

  const [isLocked, setIsLocked] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [editingThumbnail, setEditingThumbnail] = useState(null);
  const [editingVideoId, setEditingVideoId] = useState(null);

  // Loading and error states for cloud sync
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Collections dropdown state
  const [showCollectionsDropdown, setShowCollectionsDropdown] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState(null);
  const [editingCollectionName, setEditingCollectionName] = useState('');
  const [showColorPickerFor, setShowColorPickerFor] = useState(null);
  const [showRolloutPickerFor, setShowRolloutPickerFor] = useState(null);
  const collectionsDropdownRef = useRef(null);

  // Get videos by collection for showing counts
  const youtubeVideosByCollection = useAppStore((state) => state.youtubeVideosByCollection);

  const dragCounterRef = useRef(0);

  // Get current collection - use _id for backend collections
  const currentCollection = youtubeCollections?.find(c => (c._id || c.id) === currentYoutubeCollectionId)
    || youtubeCollections?.[0]
    || { id: 'default', name: 'My Videos' };

  // Fetch collections from backend
  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await youtubeApi.getCollections();
      const collections = data.collections || [];

      // Transform backend data to local format
      const transformedCollections = collections.map(c => ({
        ...c,
        id: c._id, // Use _id as id for consistency
        videoCount: c.videoCount || 0,
      }));

      // Update Zustand store
      setYoutubeCollections(transformedCollections);

      // If we have collections and none is selected, select the first one
      if (transformedCollections.length > 0) {
        const currentId = currentYoutubeCollectionId;
        const exists = transformedCollections.some(c => c._id === currentId || c.id === currentId);
        if (!exists) {
          const firstCollection = transformedCollections[0];
          setCurrentYoutubeCollection(firstCollection._id || firstCollection.id);
        }
        // Load videos for current/first collection
        const targetId = exists ? currentId : (transformedCollections[0]._id || transformedCollections[0].id);
        await fetchVideosForCollection(targetId);
      } else {
        // No collections - create a default one
        await handleCreateCollection();
      }
    } catch (err) {
      console.error('Failed to fetch YouTube collections:', err);
      setError('Failed to load collections from cloud. Using local data.');
    } finally {
      setLoading(false);
    }
  }, [currentYoutubeCollectionId]);

  // Fetch videos for a specific collection
  const fetchVideosForCollection = useCallback(async (collectionId) => {
    if (!collectionId) return;
    try {
      const data = await youtubeApi.getVideos(collectionId);
      const videos = data.videos || [];

      // Transform backend data
      const transformedVideos = videos.map(v => ({
        ...v,
        id: v._id,
      }));

      setYoutubeVideos(transformedVideos);
    } catch (err) {
      console.error('Failed to fetch videos for collection:', err);
    }
  }, [setYoutubeVideos]);

  // Load data on mount
  useEffect(() => {
    fetchCollections();
  }, []);

  // Load videos when collection changes
  useEffect(() => {
    if (currentYoutubeCollectionId && !loading) {
      fetchVideosForCollection(currentYoutubeCollectionId);
    }
  }, [currentYoutubeCollectionId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (collectionsDropdownRef.current && !collectionsDropdownRef.current.contains(e.target)) {
        setShowCollectionsDropdown(false);
        setEditingCollectionId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Switch to different collection
  const handleSwitchCollection = useCallback(async (collectionId) => {
    if (collectionId === currentYoutubeCollectionId) {
      setShowCollectionsDropdown(false);
      return;
    }
    setCurrentYoutubeCollection(collectionId);
    setShowCollectionsDropdown(false);
    // Videos will be loaded by the useEffect
  }, [currentYoutubeCollectionId, setCurrentYoutubeCollection]);

  // Handle create new collection - saves to cloud
  const handleCreateCollection = useCallback(async () => {
    setSyncing(true);
    try {
      const data = await youtubeApi.createCollection({ name: 'New Collection' });
      const newCollection = {
        ...data.collection,
        id: data.collection._id,
        videoCount: 0,
      };

      // Update local state
      setYoutubeCollections([...youtubeCollections, newCollection]);
      setCurrentYoutubeCollection(newCollection._id);
      setYoutubeVideos([]);
      setShowCollectionsDropdown(false);
    } catch (err) {
      console.error('Failed to create collection:', err);
      setError('Failed to create collection. Please try again.');
    } finally {
      setSyncing(false);
    }
  }, [youtubeCollections, setYoutubeCollections, setCurrentYoutubeCollection, setYoutubeVideos]);

  // Handle rename collection
  const handleStartRename = useCallback((e, collection) => {
    e.stopPropagation();
    setEditingCollectionId(collection._id || collection.id);
    setEditingCollectionName(collection.name);
  }, []);

  const handleSaveRename = useCallback(async (e) => {
    e.stopPropagation();
    if (editingCollectionName.trim()) {
      setSyncing(true);
      try {
        await youtubeApi.updateCollection(editingCollectionId, { name: editingCollectionName.trim() });
        // Update local state
        setYoutubeCollections(youtubeCollections.map(c =>
          (c._id || c.id) === editingCollectionId ? { ...c, name: editingCollectionName.trim() } : c
        ));
      } catch (err) {
        console.error('Failed to rename collection:', err);
        setError('Failed to rename collection.');
      } finally {
        setSyncing(false);
      }
    }
    setEditingCollectionId(null);
    setEditingCollectionName('');
  }, [editingCollectionId, editingCollectionName, youtubeCollections, setYoutubeCollections]);

  const handleCancelRename = useCallback((e) => {
    e.stopPropagation();
    setEditingCollectionId(null);
    setEditingCollectionName('');
  }, []);

  // Handle duplicate collection - creates a copy in the cloud
  const handleDuplicateCollection = useCallback(async (e, collectionId) => {
    e.stopPropagation();
    setSyncing(true);
    try {
      const sourceCollection = youtubeCollections.find(c => (c._id || c.id) === collectionId);
      if (!sourceCollection) return;

      // Create new collection with copied name
      const data = await youtubeApi.createCollection({
        name: `${sourceCollection.name} (Copy)`,
        color: sourceCollection.color,
        tags: sourceCollection.tags || [],
      });

      const newCollection = {
        ...data.collection,
        id: data.collection._id,
        videoCount: 0,
      };

      // TODO: Also copy videos if needed
      setYoutubeCollections([...youtubeCollections, newCollection]);
      setShowCollectionsDropdown(false);
    } catch (err) {
      console.error('Failed to duplicate collection:', err);
      setError('Failed to duplicate collection.');
    } finally {
      setSyncing(false);
    }
  }, [youtubeCollections, setYoutubeCollections]);

  // Handle delete collection - removes from cloud
  const handleDeleteCollection = useCallback(async (e, collectionId) => {
    e.stopPropagation();
    if (youtubeCollections.length <= 1) {
      return; // Can't delete last collection
    }
    if (window.confirm('Are you sure you want to delete this collection? All videos in it will be lost.')) {
      setSyncing(true);
      try {
        await youtubeApi.deleteCollection(collectionId);

        // Update local state
        const newCollections = youtubeCollections.filter(c => (c._id || c.id) !== collectionId);
        setYoutubeCollections(newCollections);

        // If we deleted the current collection, switch to another
        if (currentYoutubeCollectionId === collectionId && newCollections.length > 0) {
          setCurrentYoutubeCollection(newCollections[0]._id || newCollections[0].id);
        }
      } catch (err) {
        console.error('Failed to delete collection:', err);
        setError('Failed to delete collection.');
      } finally {
        setSyncing(false);
      }
    }
  }, [youtubeCollections, setYoutubeCollections, currentYoutubeCollectionId, setCurrentYoutubeCollection]);

  // Handle color selection - saves to cloud
  const handleColorSelect = useCallback(async (e, collectionId, color) => {
    e.stopPropagation();
    try {
      await youtubeApi.updateCollection(collectionId, { color });
      setYoutubeCollections(youtubeCollections.map(c =>
        (c._id || c.id) === collectionId ? { ...c, color } : c
      ));
    } catch (err) {
      console.error('Failed to update collection color:', err);
    }
    setShowColorPickerFor(null);
  }, [youtubeCollections, setYoutubeCollections]);

  // Handle rollout assignment
  const handleAssignToRollout = useCallback((e, collectionId, rolloutId, sectionId) => {
    e.stopPropagation();
    assignCollectionToRollout(collectionId, rolloutId, sectionId);
    setShowRolloutPickerFor(null);
  }, [assignCollectionToRollout]);

  // Handle unassign from rollout
  const handleUnassignFromRollout = useCallback((e, collectionId) => {
    e.stopPropagation();
    unassignCollectionFromRollout(collectionId);
    setShowRolloutPickerFor(null);
  }, [unassignCollectionFromRollout]);

  // Get rollout and section info for a collection
  const getCollectionRolloutInfo = useCallback((collection) => {
    if (!collection.rolloutId || !collection.sectionId) return null;
    const rollout = rollouts.find(r => r.id === collection.rolloutId);
    if (!rollout) return null;
    const section = rollout.sections.find(s => s.id === collection.sectionId);
    if (!section) return null;
    return { rollout, section };
  }, [rollouts]);

  const selectedVideo = selectedYoutubeVideoId
    ? youtubeVideos.find((v) => v.id === selectedYoutubeVideoId)
    : null;

  // Compress image to reduce localStorage size
  // YouTube thumbnails are 1280x720, we'll store at 640x360 for preview
  const compressImage = useCallback((dataUrl, maxWidth = 640, maxHeight = 360, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with compression
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl); // Fallback to original on error
      img.src = dataUrl;
    });
  }, []);

  // Process uploaded file and create compressed thumbnail
  const processImageFile = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Compress the image before storing
          const compressed = await compressImage(e.target.result);
          resolve(compressed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, [compressImage]);

  // Handle file upload from input or drop - saves to cloud
  const handleFileUpload = useCallback(async (e) => {
    const files = e.target?.files || e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    // Make sure we have a collection to add to
    if (!currentYoutubeCollectionId) {
      setError('Please create a collection first before uploading thumbnails.');
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: imageFiles.length });

    const newVideos = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      setUploadProgress({ current: i + 1, total: imageFiles.length });

      try {
        const thumbnail = await processImageFile(file);
        const title = file.name
          .replace(/\.[^/.]+$/, '') // Remove extension
          .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
          .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize words

        // Save to cloud
        const data = await youtubeApi.createVideo({
          title: title.slice(0, 100),
          description: '',
          thumbnail,
          collectionId: currentYoutubeCollectionId,
          status: 'draft',
        });

        const newVideo = {
          ...data.video,
          id: data.video._id,
        };
        newVideos.push(newVideo);
      } catch (err) {
        console.error('Failed to upload video:', file.name, err);
      }
    }

    // Update local state with all new videos
    if (newVideos.length > 0) {
      setYoutubeVideos([...youtubeVideos, ...newVideos]);
    }

    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });

    // Reset input
    if (e.target?.value) {
      e.target.value = '';
    }
  }, [processImageFile, currentYoutubeCollectionId, youtubeVideos, setYoutubeVideos]);

  // Handle thumbnail replacement for existing video
  const handleThumbnailUpload = useCallback(async (file, videoId) => {
    const thumbnail = await processImageFile(file);
    // Open editor for cropping
    setEditingThumbnail(thumbnail);
    setEditingVideoId(videoId);
  }, [processImageFile]);

  // Save edited thumbnail - saves to cloud
  const handleSaveThumbnail = useCallback(async (croppedThumbnail) => {
    if (editingVideoId) {
      try {
        await youtubeApi.updateVideo(editingVideoId, { thumbnail: croppedThumbnail });
        // Update local state
        setYoutubeVideos(youtubeVideos.map(v =>
          (v._id || v.id) === editingVideoId ? { ...v, thumbnail: croppedThumbnail } : v
        ));
      } catch (err) {
        console.error('Failed to save thumbnail:', err);
        setError('Failed to save thumbnail.');
      }
    }
    setEditingThumbnail(null);
    setEditingVideoId(null);
  }, [editingVideoId, youtubeVideos, setYoutubeVideos]);

  // Drag & drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDraggingFiles(true);
    }
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDraggingFiles(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDraggingFiles(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
    dragCounterRef.current = 0;
    handleFileUpload(e);
  }, [handleFileUpload]);

  // Export thumbnails as ZIP (placeholder for Phase 3)
  const handleExport = () => {
    console.log('Export functionality coming in Phase 3');
  };

  return (
    <div
      className="h-full flex gap-6 relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop Overlay */}
      {isDraggingFiles && (
        <div className="absolute inset-0 z-50 bg-dark-900/90 backdrop-blur-sm flex items-center justify-center rounded-2xl border-2 border-dashed border-red-500">
          <div className="text-center">
            <ImagePlus className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-xl font-semibold text-dark-100 mb-2">Drop thumbnails here</p>
            <p className="text-dark-400">
              Adding to <span className="text-red-400 font-medium">{currentCollection.name}</span>
            </p>
          </div>
        </div>
      )}

      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="absolute inset-0 z-50 bg-dark-900/90 backdrop-blur-sm flex items-center justify-center rounded-2xl">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-red-500 mx-auto mb-4 animate-spin" />
            <p className="text-lg font-semibold text-dark-100 mb-2">
              Uploading {uploadProgress.current} of {uploadProgress.total}
            </p>
            <p className="text-sm text-dark-400 mb-3">
              to <span className="text-red-400">{currentCollection.name}</span>
            </p>
            <div className="w-64 h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-40 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-red-500 mx-auto mb-3 animate-spin" />
            <p className="text-dark-200">Loading collections from cloud...</p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-40 bg-red-900/90 border border-red-700 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-200 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Syncing Indicator */}
      {syncing && (
        <div className="absolute top-4 right-4 z-40 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
          <span className="text-sm text-dark-300">Syncing...</span>
        </div>
      )}

      {/* Main Grid Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Collections Dropdown */}
            <div className="relative" ref={collectionsDropdownRef}>
              <button
                onClick={() => setShowCollectionsDropdown(!showCollectionsDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-dark-200 max-w-[150px] truncate">
                  {currentCollection.name}
                </span>
                <ChevronDown className={`w-4 h-4 text-dark-400 transition-transform ${showCollectionsDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showCollectionsDropdown && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    {youtubeCollections?.map((collection) => {
                      const rolloutInfo = getCollectionRolloutInfo(collection);
                      return (
                        <div
                          key={collection._id || collection.id}
                          className={`relative ${
                            (collection._id || collection.id) === currentYoutubeCollectionId
                              ? 'bg-red-500/20'
                              : 'hover:bg-dark-700'
                          }`}
                        >
                          <div
                            onClick={() => handleSwitchCollection(collection._id || collection.id)}
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                              (collection._id || collection.id) === currentYoutubeCollectionId
                                ? 'text-red-400'
                                : 'text-dark-200'
                            }`}
                          >
                            {editingCollectionId === (collection._id || collection.id) ? (
                              <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editingCollectionName}
                                  onChange={(e) => setEditingCollectionName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(e);
                                    if (e.key === 'Escape') handleCancelRename(e);
                                  }}
                                  className="flex-1 bg-dark-900 border border-dark-600 rounded px-2 py-1 text-sm text-dark-100 focus:outline-none focus:border-red-500"
                                  autoFocus
                                />
                                <button onClick={handleSaveRename} className="p-1 text-green-400 hover:bg-dark-600 rounded">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={handleCancelRename} className="p-1 text-dark-400 hover:bg-dark-600 rounded">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                {/* Color dot */}
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0 border border-dark-500"
                                  style={{ backgroundColor: collection.color || '#6b7280' }}
                                />
                                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 text-sm truncate">{collection.name}</span>
                                <span className="text-xs text-dark-500">
                                  {(collection._id || collection.id) === currentYoutubeCollectionId ? youtubeVideos.length : (youtubeVideosByCollection?.[collection.id]?.length || 0)}
                                </span>
                                {/* Color picker button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowColorPickerFor(showColorPickerFor === (collection._id || collection.id) ? null : collection.id);
                                    setShowRolloutPickerFor(null);
                                  }}
                                  className="p-1 text-dark-500 hover:text-dark-200 hover:bg-dark-600 rounded"
                                  title="Set Color"
                                >
                                  <Palette className="w-3.5 h-3.5" />
                                </button>
                                {/* Rollout assignment button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowRolloutPickerFor(showRolloutPickerFor === (collection._id || collection.id) ? null : collection.id);
                                    setShowColorPickerFor(null);
                                  }}
                                  className={`p-1 hover:bg-dark-600 rounded ${
                                    collection.rolloutId ? 'text-green-400' : 'text-dark-500 hover:text-dark-200'
                                  }`}
                                  title={collection.rolloutId ? 'Change Rollout' : 'Assign to Rollout'}
                                >
                                  {collection.rolloutId ? <Link2 className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={(e) => handleStartRename(e, collection)}
                                  className="p-1 text-dark-500 hover:text-dark-200 hover:bg-dark-600 rounded"
                                  title="Rename"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleDuplicateCollection(e, collection.id)}
                                  className="p-1 text-dark-500 hover:text-dark-200 hover:bg-dark-600 rounded"
                                  title="Duplicate"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                {youtubeCollections.length > 1 && (
                                  <button
                                    onClick={(e) => handleDeleteCollection(e, collection.id)}
                                    className="p-1 text-dark-500 hover:text-red-400 hover:bg-dark-600 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          {/* Rollout info badge */}
                          {rolloutInfo && (
                            <div className="px-3 pb-2 -mt-1">
                              <div
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                                style={{ backgroundColor: `${rolloutInfo.section.color}20`, color: rolloutInfo.section.color }}
                              >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rolloutInfo.section.color }} />
                                {rolloutInfo.rollout.name} → {rolloutInfo.section.name}
                              </div>
                            </div>
                          )}

                          {/* Color Picker Dropdown */}
                          {showColorPickerFor === (collection._id || collection.id) && (
                            <div className="absolute left-full top-0 ml-1 w-36 bg-dark-900 border border-dark-600 rounded-lg shadow-xl z-50 p-2" onClick={(e) => e.stopPropagation()}>
                              <p className="text-xs text-dark-400 mb-2 px-1">Select Color</p>
                              <div className="grid grid-cols-5 gap-1">
                                {COLLECTION_COLORS.map((color) => (
                                  <button
                                    key={color.id}
                                    onClick={(e) => handleColorSelect(e, collection.id, color.value)}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                                      collection.color === color.value ? 'border-white' : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                  />
                                ))}
                              </div>
                              <button
                                onClick={(e) => handleColorSelect(e, collection.id, null)}
                                className="w-full mt-2 px-2 py-1 text-xs text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded"
                              >
                                Clear Color
                              </button>
                            </div>
                          )}

                          {/* Rollout Picker Dropdown */}
                          {showRolloutPickerFor === (collection._id || collection.id) && (
                            <div className="absolute left-full top-0 ml-1 w-56 bg-dark-900 border border-dark-600 rounded-lg shadow-xl z-50 p-2 max-h-64 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                              <p className="text-xs text-dark-400 mb-2 px-1">Assign to Phase</p>
                              {rollouts.length === 0 ? (
                                <p className="text-xs text-dark-500 px-1">No rollouts created yet</p>
                              ) : (
                                rollouts.map((rollout) => (
                                  <div key={rollout.id} className="mb-2">
                                    <p className="text-xs font-medium text-dark-300 px-1 mb-1">{rollout.name}</p>
                                    {rollout.sections.length === 0 ? (
                                      <p className="text-xs text-dark-500 px-1 ml-2">No phases</p>
                                    ) : (
                                      rollout.sections.map((section) => (
                                        <button
                                          key={section.id}
                                          onClick={(e) => handleAssignToRollout(e, collection.id, rollout.id, section.id)}
                                          className={`w-full flex items-center gap-2 px-2 py-1.5 text-left rounded hover:bg-dark-700 ${
                                            collection.sectionId === section.id ? 'bg-dark-700' : ''
                                          }`}
                                        >
                                          <span
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: section.color || '#6b7280' }}
                                          />
                                          <span className="text-xs text-dark-200 truncate">{section.name}</span>
                                          {collection.sectionId === section.id && (
                                            <Check className="w-3 h-3 text-green-400 ml-auto" />
                                          )}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                ))
                              )}
                              {collection.rolloutId && (
                                <button
                                  onClick={(e) => handleUnassignFromRollout(e, collection._id || collection.id)}
                                  className="w-full mt-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/20 rounded flex items-center gap-2"
                                >
                                  <Unlink className="w-3 h-3" />
                                  Remove from Rollout
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Create New Collection */}
                  <div className="border-t border-dark-700">
                    <button
                      onClick={handleCreateCollection}
                      className="w-full flex items-center gap-2 px-3 py-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">New Collection</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Video Count */}
            <div className="flex items-center gap-2 px-3 py-2 bg-dark-800 rounded-lg">
              <Youtube className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-dark-200">
                {youtubeVideos.length} Videos
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchCollections}
              disabled={loading || syncing}
              className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh from cloud"
            >
              <RefreshCw className={`w-4 h-4 text-dark-400 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-dark-800 rounded-lg">
              <button
                onClick={() => setYoutubeViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  youtubeViewMode === 'grid'
                    ? 'bg-red-500 text-white'
                    : 'text-dark-400 hover:text-dark-200'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setYoutubeViewMode('sidebar')}
                className={`p-2 rounded-md transition-colors ${
                  youtubeViewMode === 'sidebar'
                    ? 'bg-red-500 text-white'
                    : 'text-dark-400 hover:text-dark-200'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Lock Toggle */}
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isLocked
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-dark-700 text-dark-300 hover:text-dark-100'
              }`}
            >
              {isLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Locked</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span className="text-sm">Unlocked</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-dark-700 text-dark-300 hover:text-dark-100 rounded-lg transition-colors"
              disabled
              title="Coming in Phase 3"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>

            {/* Upload Button */}
            <label className="btn-primary bg-red-600 hover:bg-red-700 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload Thumbnails</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-auto">
          {youtubeViewMode === 'grid' ? (
            <YouTubeGridView
              isLocked={isLocked}
              onUpload={handleFileUpload}
            />
          ) : (
            <YouTubeSidebarView
              isLocked={isLocked}
              onUpload={handleFileUpload}
            />
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-6 text-sm text-dark-400">
          <span>{youtubeVideos.length} videos</span>
          <span>{youtubeVideos.filter((v) => v.status === 'draft').length} drafts</span>
          <span>{youtubeVideos.filter((v) => v.status === 'scheduled').length} scheduled</span>
          <span className="text-red-400">
            {isLocked ? 'Grid locked' : 'Drag to reorder'}
          </span>
          <span className="ml-auto text-green-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Cloud synced
          </span>
        </div>
      </div>

      {/* Right Sidebar - Video Details */}
      <div className="w-80 flex-shrink-0">
        <YouTubeVideoDetails
          video={selectedVideo}
          onThumbnailUpload={handleThumbnailUpload}
        />
      </div>

      {/* Thumbnail Editor Modal */}
      {editingThumbnail && (
        <YouTubeThumbnailEditor
          image={editingThumbnail}
          onSave={handleSaveThumbnail}
          onCancel={() => {
            setEditingThumbnail(null);
            setEditingVideoId(null);
          }}
        />
      )}
    </div>
  );
}

export default YouTubePlanner;
