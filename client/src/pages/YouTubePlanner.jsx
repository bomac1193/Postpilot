import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
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
} from 'lucide-react';

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
  const addYoutubeCollection = useAppStore((state) => state.addYoutubeCollection);
  const renameYoutubeCollection = useAppStore((state) => state.renameYoutubeCollection);
  const duplicateYoutubeCollection = useAppStore((state) => state.duplicateYoutubeCollection);
  const deleteYoutubeCollection = useAppStore((state) => state.deleteYoutubeCollection);
  const setCurrentYoutubeCollection = useAppStore((state) => state.setCurrentYoutubeCollection);
  const setYoutubeVideos = useAppStore((state) => state.setYoutubeVideos);

  const [isLocked, setIsLocked] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [editingThumbnail, setEditingThumbnail] = useState(null);
  const [editingVideoId, setEditingVideoId] = useState(null);

  // Collections dropdown state
  const [showCollectionsDropdown, setShowCollectionsDropdown] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState(null);
  const [editingCollectionName, setEditingCollectionName] = useState('');
  const collectionsDropdownRef = useRef(null);

  // Get videos by collection for showing counts
  const youtubeVideosByCollection = useAppStore((state) => state.youtubeVideosByCollection);

  const dragCounterRef = useRef(0);

  // Get current collection
  const currentCollection = youtubeCollections?.find(c => c.id === currentYoutubeCollectionId)
    || youtubeCollections?.[0]
    || { id: 'default', name: 'My Videos' };

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
  const handleSwitchCollection = useCallback((collectionId) => {
    if (collectionId === currentYoutubeCollectionId) {
      setShowCollectionsDropdown(false);
      return;
    }
    setCurrentYoutubeCollection(collectionId);
    setShowCollectionsDropdown(false);
  }, [currentYoutubeCollectionId, setCurrentYoutubeCollection]);

  // Handle create new collection
  const handleCreateCollection = useCallback(() => {
    addYoutubeCollection('New Collection');
    setShowCollectionsDropdown(false);
  }, [addYoutubeCollection]);

  // Handle rename collection
  const handleStartRename = useCallback((e, collection) => {
    e.stopPropagation();
    setEditingCollectionId(collection.id);
    setEditingCollectionName(collection.name);
  }, []);

  const handleSaveRename = useCallback((e) => {
    e.stopPropagation();
    if (editingCollectionName.trim()) {
      renameYoutubeCollection(editingCollectionId, editingCollectionName.trim());
    }
    setEditingCollectionId(null);
    setEditingCollectionName('');
  }, [editingCollectionId, editingCollectionName, renameYoutubeCollection]);

  const handleCancelRename = useCallback((e) => {
    e.stopPropagation();
    setEditingCollectionId(null);
    setEditingCollectionName('');
  }, []);

  // Handle duplicate collection
  const handleDuplicateCollection = useCallback((e, collectionId) => {
    e.stopPropagation();
    duplicateYoutubeCollection(collectionId);
    setShowCollectionsDropdown(false);
  }, [duplicateYoutubeCollection]);

  // Handle delete collection
  const handleDeleteCollection = useCallback((e, collectionId) => {
    e.stopPropagation();
    if (youtubeCollections.length <= 1) {
      return; // Can't delete last collection
    }
    if (window.confirm('Are you sure you want to delete this collection? All videos in it will be lost.')) {
      deleteYoutubeCollection(collectionId);
    }
  }, [youtubeCollections, deleteYoutubeCollection]);

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

  // Handle file upload from input or drop
  const handleFileUpload = useCallback(async (e) => {
    const files = e.target?.files || e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: imageFiles.length });

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      setUploadProgress({ current: i + 1, total: imageFiles.length });

      try {
        const thumbnail = await processImageFile(file);
        const title = file.name
          .replace(/\.[^/.]+$/, '') // Remove extension
          .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
          .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize words

        addYoutubeVideo({
          thumbnail,
          title: title.slice(0, 100), // YouTube title limit
          description: '',
          status: 'draft',
          scheduledDate: null,
        });
      } catch (err) {
        console.error('Failed to process file:', file.name, err);
      }
    }

    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });

    // Reset input
    if (e.target?.value) {
      e.target.value = '';
    }
  }, [addYoutubeVideo, processImageFile]);

  // Handle thumbnail replacement for existing video
  const handleThumbnailUpload = useCallback(async (file, videoId) => {
    const thumbnail = await processImageFile(file);
    // Open editor for cropping
    setEditingThumbnail(thumbnail);
    setEditingVideoId(videoId);
  }, [processImageFile]);

  // Save edited thumbnail
  const handleSaveThumbnail = useCallback((croppedThumbnail) => {
    if (editingVideoId) {
      updateYoutubeVideo(editingVideoId, { thumbnail: croppedThumbnail });
    }
    setEditingThumbnail(null);
    setEditingVideoId(null);
  }, [editingVideoId, updateYoutubeVideo]);

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
            <p className="text-dark-400">Release to add to your YouTube grid</p>
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
            <div className="w-64 h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
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
                <div className="absolute top-full left-0 mt-1 w-64 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {youtubeCollections?.map((collection) => (
                      <div
                        key={collection.id}
                        onClick={() => handleSwitchCollection(collection.id)}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                          collection.id === currentYoutubeCollectionId
                            ? 'bg-red-500/20 text-red-400'
                            : 'hover:bg-dark-700 text-dark-200'
                        }`}
                      >
                        {editingCollectionId === collection.id ? (
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
                            <FolderOpen className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 text-sm truncate">{collection.name}</span>
                            <span className="text-xs text-dark-500">
                              {collection.id === currentYoutubeCollectionId ? youtubeVideos.length : (youtubeVideosByCollection?.[collection.id]?.length || 0)}
                            </span>
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
                    ))}
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
