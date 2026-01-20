import { useState, useRef, useCallback, useEffect } from 'react';
import { User, Settings, Share2, Plus, Play, Heart, MessageCircle, Bookmark, MoreHorizontal, GripVertical, Music2, X, Check, Loader2, ChevronDown, Mail, FolderPlus, Pencil, Trash2, LayoutGrid, CalendarPlus, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { contentApi, reelCollectionApi, rolloutApi } from '../../lib/api';
import api from '../../lib/api';
import { generateVideoThumbnail, formatDuration } from '../../utils/videoUtils';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import ReelThumbnailSelector from './ReelThumbnailSelector';
import ReelPlayer from './ReelPlayer';
import ReelEditor from './ReelEditor';

// TikTok icon component
function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  );
}

// Rollout Picker Modal - for adding collections to rollouts
function RolloutPickerModal({ collectionId, collectionName, platform, rollouts, onSelect, onClose }) {
  const [expandedRolloutId, setExpandedRolloutId] = useState(null);

  // Get platform color for badge
  const getPlatformColor = () => {
    switch (platform) {
      case 'instagram-reels':
        return '#c13584';
      case 'tiktok-reels':
        return '#ff0050';
      default:
        return '#00f2ea';
    }
  };

  const platformColor = getPlatformColor();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-dark-800 rounded-xl w-full max-w-md border border-dark-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">Add to Rollout</h3>
            <p className="text-sm text-dark-400 mt-0.5">
              Adding "<span style={{ color: platformColor }}>{collectionName}</span>" to a rollout
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-dark-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rollout List */}
        <div className="max-h-80 overflow-y-auto">
          {rollouts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-dark-400 mb-2">No rollouts created yet</p>
              <p className="text-xs text-dark-500">Create a rollout in the Rollout Planner first</p>
            </div>
          ) : (
            rollouts.map((rollout) => (
              <div key={rollout.id} className="border-b border-dark-700 last:border-b-0">
                {/* Rollout Header */}
                <button
                  onClick={() => setExpandedRolloutId(expandedRolloutId === rollout.id ? null : rollout.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-dark-750 transition-colors"
                >
                  <ChevronRight
                    className={`w-4 h-4 text-dark-400 transition-transform ${
                      expandedRolloutId === rollout.id ? 'rotate-90' : ''
                    }`}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-white">{rollout.name}</span>
                    <span className="text-xs text-dark-500 ml-2">
                      {rollout.sections?.length || 0} sections
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      rollout.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : rollout.status === 'completed'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-dark-600 text-dark-300'
                    }`}
                  >
                    {rollout.status}
                  </span>
                </button>

                {/* Sections List */}
                {expandedRolloutId === rollout.id && (
                  <div className="bg-dark-750 px-4 py-2">
                    {rollout.sections?.length === 0 ? (
                      <p className="text-sm text-dark-500 py-2 text-center">No sections in this rollout</p>
                    ) : (
                      rollout.sections
                        .sort((a, b) => a.order - b.order)
                        .map((section, idx) => {
                          const isAlreadyAdded = section.collectionIds?.includes(collectionId);
                          return (
                            <button
                              key={section.id}
                              onClick={() => !isAlreadyAdded && onSelect(rollout.id, section.id)}
                              disabled={isAlreadyAdded}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 last:mb-0 transition-colors ${
                                isAlreadyAdded
                                  ? 'bg-dark-600/50 cursor-not-allowed'
                                  : 'hover:bg-dark-600'
                              }`}
                            >
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: section.color || '#00f2ea' }}
                              />
                              <span className="flex-1 text-sm text-left">
                                <span className="text-dark-400">Phase {idx + 1}:</span>{' '}
                                <span className={isAlreadyAdded ? 'text-dark-500' : 'text-dark-200'}>
                                  {section.name}
                                </span>
                              </span>
                              {isAlreadyAdded ? (
                                <span className="text-xs text-dark-500">Already added</span>
                              ) : (
                                <span className="text-xs text-cyan-400 opacity-0 group-hover:opacity-100">
                                  Add here
                                </span>
                              )}
                            </button>
                          );
                        })
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-dark-700 bg-dark-750">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Draggable TikTok video item
function DraggableTikTokItem({ video, videoId, onEdit, onPlay, onReorder }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const dragCounterRef = useRef(0);

  // Stable fake view count - seeded by videoId to stay consistent
  const stableViewCount = useRef(null);
  if (stableViewCount.current === null) {
    // Generate a consistent number based on videoId hash
    let hash = 0;
    const id = videoId || 'default';
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    stableViewCount.current = Math.abs(hash % 50000) + 1000;
  }

  const handleDragStart = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    e.dataTransfer.setData('application/postpanda-tiktok', videoId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e) => {
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/postpanda-tiktok')) {
      e.stopPropagation();
      dragCounterRef.current++;
      setIsOver(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/postpanda-tiktok')) {
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/postpanda-tiktok')) {
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsOver(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('application/postpanda-tiktok');
    if (sourceId && sourceId !== videoId) {
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsOver(false);
      onReorder?.(sourceId, videoId);
    }
  };

  const handleClick = () => {
    if (!isDragging) {
      onEdit?.(video);
    }
  };

  // Format view count
  const formatViews = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`aspect-[9/16] bg-dark-700 relative overflow-hidden cursor-grab active:cursor-grabbing group select-none rounded-sm ${
        isDragging ? 'opacity-40' : ''
      } ${isOver ? 'ring-2 ring-cyan-400 scale-105 transition-all duration-150' : ''}`}
    >
      <img
        src={video.thumbnailUrl || video.mediaUrl}
        alt=""
        className="w-full h-full object-cover transition-transform group-hover:scale-105 pointer-events-none"
        draggable={false}
      />

      {/* Play icon overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay?.(video);
          }}
          className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center pointer-events-auto"
        >
          <Play className="w-6 h-6 text-white fill-white ml-0.5" />
        </button>
      </div>

      {/* View count */}
      <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs pointer-events-none">
        <Play className="w-3 h-3 fill-white" />
        <span>{formatViews(video.metadata?.views || stableViewCount.current)}</span>
      </div>

      {/* Drop indicator */}
      {isOver && (
        <div className="absolute inset-0 bg-cyan-400/30 flex items-center justify-center pointer-events-none">
          <div className="bg-dark-900/90 rounded-lg px-3 py-2">
            <span className="text-sm text-white font-medium">Drop here</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Sortable row component for TikTok
function SortableTikTokRow({ rowId, children, showHandle = true }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: rowId,
    disabled: !showHandle,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      {showHandle && (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center px-2 py-8 cursor-grab active:cursor-grabbing hover:bg-dark-700/50 rounded-l transition-colors"
          title="Drag to reorder row"
        >
          <GripVertical className="w-5 h-5 text-dark-500 hover:text-dark-300" />
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TikTokPreview({ showRowHandles = true }) {
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);

  // TikTok videos state (reuse reels)
  const reels = useAppStore((state) => state.reels);
  const setReels = useAppStore((state) => state.setReels);
  const addReel = useAppStore((state) => state.addReel);
  const reorderReels = useAppStore((state) => state.reorderReels);

  // TikTok Reel Collections state
  const reelCollections = useAppStore((state) => state.reelCollections);
  const setReelCollections = useAppStore((state) => state.setReelCollections);
  const addReelCollection = useAppStore((state) => state.addReelCollection);
  const updateReelCollection = useAppStore((state) => state.updateReelCollection);
  const deleteReelCollection = useAppStore((state) => state.deleteReelCollection);
  const currentReelCollectionId = useAppStore((state) => state.currentReelCollectionId);
  const setCurrentReelCollection = useAppStore((state) => state.setCurrentReelCollection);

  // Tab state
  const [activeTab, setActiveTab] = useState('videos');

  // TikTok Reel Collection UI state
  const [showReelCollectionSelector, setShowReelCollectionSelector] = useState(false);
  const [editingReelCollectionId, setEditingReelCollectionId] = useState(null);
  const [editingReelCollectionName, setEditingReelCollectionName] = useState('');
  const [showDeleteReelCollectionConfirm, setShowDeleteReelCollectionConfirm] = useState(null);

  // Rollout picker state (for adding reel collections to rollouts)
  const [showRolloutPicker, setShowRolloutPicker] = useState(false);
  const [rolloutPickerCollectionId, setRolloutPickerCollectionId] = useState(null);
  const rollouts = useAppStore((state) => state.rollouts);
  const setRollouts = useAppStore((state) => state.setRollouts);

  // Loading state for collections
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);

  // Video drag state
  const [isVideoDragOver, setIsVideoDragOver] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoDragCounterRef = useRef(0);

  // Modal states
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
  const [pendingVideoUpload, setPendingVideoUpload] = useState(null);

  // Edit profile state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Inline username editing state
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [inlineUsername, setInlineUsername] = useState('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const usernameInputRef = useRef(null);

  // Row drag state
  const [rowDragActiveId, setRowDragActiveId] = useState(null);

  // Filter collections for TikTok platform
  const tiktokCollections = reelCollections.filter(c => c.platform === 'tiktok' || c.platform === 'both');

  // Get current reel collection (must be a tiktok collection)
  // If current selection isn't a tiktok collection, fall back to first tiktok collection
  let currentReelCollection = tiktokCollections.find(c => (c._id || c.id) === currentReelCollectionId);
  if (!currentReelCollection && tiktokCollections.length > 0) {
    currentReelCollection = tiktokCollections[0];
  }

  // Get videos for current collection only (populated contentId objects)
  // Handle both populated objects and raw ObjectId strings
  const collectionVideos = currentReelCollection?.reels
    ?.map((r, index) => {
      // If contentId is a populated object with mediaUrl, return it
      if (r.contentId && typeof r.contentId === 'object' && r.contentId.mediaUrl) {
        return r.contentId;
      }
      // Log why this video is being skipped
      console.log(`[TikTok Display] Skipping reel ${index}:`, {
        hasContentId: !!r.contentId,
        contentIdType: typeof r.contentId,
        hasMediaUrl: r.contentId?.mediaUrl ? 'yes' : 'no',
        contentId: r.contentId
      });
      return null;
    })
    ?.filter(Boolean) || [];

  // Debug logging
  if (currentReelCollection) {
    console.log('[TikTok Display] Current collection:', currentReelCollection.name, 'ID:', currentReelCollection._id);
    console.log('[TikTok Display] Total reels in collection:', currentReelCollection.reels?.length || 0);
    console.log('[TikTok Display] Displayable videos (with mediaUrl):', collectionVideos.length);
    if (currentReelCollection.reels?.length !== collectionVideos.length) {
      console.warn('[TikTok Display] WARNING: Some videos are not displayable!');
    }
  }

  // Group videos into rows of 3
  const videoRows = [];
  for (let i = 0; i < collectionVideos.length; i += 3) {
    videoRows.push(collectionVideos.slice(i, i + 3));
  }
  const rowIds = videoRows.map((_, index) => `tiktok-row-${index}`);

  // Row sensors
  const rowSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Video drag handlers - stop propagation to prevent GridPlanner from handling
  const handleVideoDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    videoDragCounterRef.current++;
    console.log('[TikTok Drag] Enter - counter:', videoDragCounterRef.current, 'types:', e.dataTransfer?.types);
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsVideoDragOver(true);
    }
  };

  const handleVideoDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleVideoDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    videoDragCounterRef.current--;
    if (videoDragCounterRef.current === 0) {
      setIsVideoDragOver(false);
    }
  };

  const handleVideoDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[TikTok Drop] Drop event received');
    setIsVideoDragOver(false);
    videoDragCounterRef.current = 0;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('[TikTok Drop] No auth token');
      alert('Please log in to upload videos');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    console.log('[TikTok Drop] Files dropped:', files.length, files.map(f => f.name + ' (' + f.type + ')'));
    const videoFile = files.find(f => f.type.startsWith('video/'));

    if (!videoFile) {
      console.error('[TikTok Drop] No video file found in dropped files');
      alert('Please drop a video file (MP4, MOV, WebM)');
      return;
    }

    console.log('[TikTok Drop] Video file:', videoFile.name, 'Size:', (videoFile.size / 1024 / 1024).toFixed(2) + 'MB');
    setUploadingVideo(true);

    try {
      console.log('[TikTok Drop] Generating thumbnail...');
      const { thumbnailBlob, duration, width, height, isVertical } =
        await generateVideoThumbnail(videoFile);
      console.log('[TikTok Drop] Thumbnail generated:', { duration, width, height, isVertical });

      console.log('[TikTok Drop] Uploading to server...');
      const result = await contentApi.uploadReel(videoFile, thumbnailBlob, {
        title: videoFile.name.replace(/\.[^/.]+$/, ''),
        mediaType: 'video',
        duration,
        width,
        height,
        isReel: true,
        recommendedType: 'video'
      });
      console.log('[TikTok Drop] Upload response:', result);

      const uploadedVideo = result.content || result;
      console.log('[TikTok Drop] Uploaded video ID:', uploadedVideo._id || uploadedVideo.id);
      addReel(uploadedVideo);

      // Add video to current collection - use the displayed collection (with fallback) or create one
      // Get the currently displayed collection (same logic as display)
      const displayedTiktokCollections = reelCollections.filter(c => c.platform === 'tiktok' || c.platform === 'both');
      let targetCollection = displayedTiktokCollections.find(c => (c._id || c.id) === currentReelCollectionId);
      if (!targetCollection && displayedTiktokCollections.length > 0) {
        targetCollection = displayedTiktokCollections[0];
      }

      let collectionId = targetCollection?._id || targetCollection?.id;
      console.log('[TikTok Upload] Starting - targetCollection:', targetCollection?.name, 'ID:', collectionId);
      console.log('[TikTok Upload] Uploaded video ID:', uploadedVideo._id || uploadedVideo.id);

      // If no collection exists, create one first
      if (!collectionId) {
        console.log('[TikTok Upload] No collection exists, creating new one...');
        try {
          const newCollection = await reelCollectionApi.create({
            name: `TikTok ${displayedTiktokCollections.length + 1}`,
            platform: 'tiktok'
          });
          console.log('[TikTok Upload] Created collection:', newCollection);
          addReelCollection(newCollection);
          setCurrentReelCollection(newCollection._id);
          collectionId = newCollection._id;
        } catch (createErr) {
          console.error('[TikTok Upload] Failed to create collection:', createErr);
        }
      }

      // Now add the video to the collection
      if (collectionId) {
        console.log('[TikTok Upload] Adding video to collection:', collectionId);
        try {
          const updatedCollection = await reelCollectionApi.addReel(collectionId, uploadedVideo._id || uploadedVideo.id);
          console.log('[TikTok Upload] Updated collection:', updatedCollection);
          console.log('[TikTok Upload] Collection reels:', updatedCollection?.reels);
          // Update the collection in state so the video shows immediately
          updateReelCollection(collectionId, updatedCollection);

          // Also refetch all collections to ensure state is synced
          const freshCollections = await reelCollectionApi.getAll();
          console.log('[TikTok Upload] Fresh collections:', freshCollections);
          setReelCollections(freshCollections);
        } catch (collErr) {
          console.error('[TikTok Upload] Failed to add video to collection:', collErr);
        }
      } else {
        console.error('[TikTok Upload] No collectionId available!');
      }

      console.log('[TikTok Upload] SUCCESS! Video uploaded and added to collection. Opening thumbnail selector...');
      setSelectedVideo(uploadedVideo);
      setPendingVideoUpload(videoFile);
      setShowThumbnailSelector(true);
    } catch (err) {
      console.error('[TikTok Drop] Video upload failed:', err);
      console.error('[TikTok Drop] Error details:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        alert('Please log in to upload videos');
      } else {
        alert('Video upload failed: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setUploadingVideo(false);
    }
  };

  // Fetch reel collections on mount (always fetch fresh data to ensure populated content)
  useEffect(() => {
    const fetchReelCollections = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoadingCollections(false);
        return;
      }
      try {
        console.log('[TikTok] Fetching fresh collections from backend...');
        setIsLoadingCollections(true);
        const collections = await reelCollectionApi.getAll(); // Get all collections with populated contentId
        console.log('[TikTok] Fetched collections:', collections.length);
        if (collections.length > 0) {
          console.log('[TikTok] First collection reels:', collections[0]?.reels?.length);
          console.log('[TikTok] First reel contentId:', collections[0]?.reels?.[0]?.contentId);
        }
        setReelCollections(collections);
      } catch (err) {
        console.error('Failed to fetch reel collections:', err);
      } finally {
        setIsLoadingCollections(false);
      }
    };
    // Always fetch fresh data on mount to ensure contentId is populated
    fetchReelCollections();
  }, [setReelCollections]);

  // Auto-select first TikTok collection if none selected
  useEffect(() => {
    if (tiktokCollections.length > 0 && !currentReelCollectionId) {
      setCurrentReelCollection(tiktokCollections[0]._id);
    }
  }, [tiktokCollections.length, currentReelCollectionId, setCurrentReelCollection]);

  // TikTok Reel collection handlers
  const handleCreateReelCollection = async () => {
    try {
      const collection = await reelCollectionApi.create({
        name: `TikTok ${tiktokCollections.length + 1}`,
        platform: 'tiktok'
      });
      addReelCollection(collection);
      setCurrentReelCollection(collection._id);
      setShowReelCollectionSelector(false);
    } catch (err) {
      console.error('Failed to create TikTok collection:', err);
    }
  };

  const handleSelectReelCollection = (collection) => {
    setCurrentReelCollection(collection._id || collection.id);
    setShowReelCollectionSelector(false);
  };

  const handleStartRenameReelCollection = (e, collection) => {
    e.stopPropagation();
    setEditingReelCollectionId(collection._id || collection.id);
    setEditingReelCollectionName(collection.name);
  };

  const handleSaveRenameReelCollection = async (e, collectionId) => {
    e.stopPropagation();
    if (!editingReelCollectionName.trim()) {
      setEditingReelCollectionId(null);
      return;
    }
    try {
      await reelCollectionApi.update(collectionId, { name: editingReelCollectionName.trim() });
      updateReelCollection(collectionId, { name: editingReelCollectionName.trim() });
      setEditingReelCollectionId(null);
    } catch (err) {
      console.error('Failed to rename TikTok collection:', err);
    }
  };

  const handleCancelRenameReelCollection = (e) => {
    e.stopPropagation();
    setEditingReelCollectionId(null);
    setEditingReelCollectionName('');
  };

  const handleDeleteReelCollection = async (e, collectionId) => {
    e.stopPropagation();
    try {
      await reelCollectionApi.delete(collectionId);
      deleteReelCollection(collectionId);
      // Select another TikTok collection if we deleted the current one
      if (currentReelCollectionId === collectionId && tiktokCollections.length > 1) {
        const remaining = tiktokCollections.filter(c => (c._id || c.id) !== collectionId);
        if (remaining.length > 0) {
          setCurrentReelCollection(remaining[0]._id || remaining[0].id);
        }
      }
      setShowDeleteReelCollectionConfirm(null);
    } catch (err) {
      console.error('Failed to delete TikTok collection:', err);
    }
  };

  // Note: Videos are fetched by GridPreview and stored in the shared reels state.
  // TikTokPreview uses the same reels data for consistency.

  // Handlers
  const handleVideoEdit = (video) => {
    setSelectedVideo(video);
    setShowVideoEditor(true);
  };

  const handleVideoPlay = (video) => {
    setSelectedVideo(video);
    setShowVideoPlayer(true);
  };

  const handleVideoReorder = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    if (!currentReelCollection) return;

    const collectionId = currentReelCollection._id || currentReelCollection.id;
    const currentReels = currentReelCollection.reels || [];

    // Normalize IDs to strings for comparison
    const normalizeId = (id) => (id?._id || id?.id || id || '').toString();
    const sourceIdStr = normalizeId(sourceId);
    const targetIdStr = normalizeId(targetId);

    console.log('[TikTok Reorder] Starting reorder:', { sourceId: sourceIdStr, targetId: targetIdStr });
    console.log('[TikTok Reorder] Current reels count:', currentReels.length);

    // Find indices in the collection's reels array
    const sourceIndex = currentReels.findIndex(r => {
      const contentIdStr = normalizeId(r.contentId);
      return contentIdStr === sourceIdStr;
    });
    const targetIndex = currentReels.findIndex(r => {
      const contentIdStr = normalizeId(r.contentId);
      return contentIdStr === targetIdStr;
    });

    if (sourceIndex === -1 || targetIndex === -1) {
      console.error('[TikTok Reorder] Could not find videos in collection:', { sourceId, targetId, sourceIndex, targetIndex });
      return;
    }

    // Create new reels array with swapped positions
    const newReels = [...currentReels];
    [newReels[sourceIndex], newReels[targetIndex]] = [newReels[targetIndex], newReels[sourceIndex]];

    // Update local state immediately for instant UI feedback
    const updatedCollection = { ...currentReelCollection, reels: newReels };
    updateReelCollection(collectionId, updatedCollection);
    console.log('[TikTok Reorder] Local state updated, swapped:', sourceIndex, '<->', targetIndex);

    // Persist to backend and update with returned data
    try {
      const reelIds = newReels.map(r => normalizeId(r.contentId));
      console.log('[TikTok Reorder] Sending reelIds to backend:', reelIds);
      const returnedCollection = await reelCollectionApi.reorderReels(collectionId, reelIds);
      console.log('[TikTok Reorder] Backend returned collection with', returnedCollection?.reels?.length, 'reels');
      // Update with the populated collection from backend
      if (returnedCollection) {
        updateReelCollection(collectionId, returnedCollection);
      }
    } catch (err) {
      console.error('[TikTok Reorder] Failed to persist:', err);
      console.error('[TikTok Reorder] Error details:', err.response?.data || err.message);
      // Revert local state on error
      updateReelCollection(collectionId, currentReelCollection);
    }
  };

  const handleRowDragStart = (event) => {
    setRowDragActiveId(event.active.id);
  };

  const handleRowDragEnd = (event) => {
    const { active, over } = event;
    setRowDragActiveId(null);

    if (!over || active.id === over.id) return;

    const oldRowIndex = parseInt(active.id.replace('tiktok-row-', ''));
    const newRowIndex = parseInt(over.id.replace('tiktok-row-', ''));

    if (isNaN(oldRowIndex) || isNaN(newRowIndex)) return;

    const newRows = arrayMove(videoRows, oldRowIndex, newRowIndex);
    const newVideos = newRows.flat();
    reorderReels(newVideos);
  };

  const handleSaveThumbnail = async (thumbnailBlob) => {
    if (!selectedVideo) return;

    const videoId = selectedVideo._id || selectedVideo.id;

    try {
      const formData = new FormData();
      formData.append('thumbnail', thumbnailBlob, 'thumbnail.jpg');

      const response = await api.put(`/api/content/${videoId}/thumbnail`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Use the server-returned URL instead of creating a blob URL
      const thumbnailUrl = response.data.content?.thumbnailUrl || response.data.thumbnailUrl;
      console.log('[TikTok Thumbnail] New thumbnail URL:', thumbnailUrl);

      // Helper to normalize IDs for comparison
      const normalizeId = (id) => (id?._id || id?.id || id || '').toString();
      const videoIdStr = normalizeId(videoId);

      // Update the global reels state
      const updatedVideos = reels.map(v =>
        normalizeId(v) === videoIdStr
          ? { ...v, thumbnailUrl }
          : v
      );
      setReels(updatedVideos);

      // Also update the thumbnail in the current collection's reels for instant UI update
      if (currentReelCollection) {
        const collectionId = currentReelCollection._id || currentReelCollection.id;
        const updatedReels = currentReelCollection.reels?.map(r => {
          const contentIdStr = normalizeId(r.contentId);
          if (contentIdStr === videoIdStr && r.contentId) {
            return { ...r, contentId: { ...r.contentId, thumbnailUrl } };
          }
          return r;
        });
        updateReelCollection(collectionId, { ...currentReelCollection, reels: updatedReels });
        console.log('[TikTok Thumbnail] Updated collection state');
      }

      setShowThumbnailSelector(false);
      setPendingVideoUpload(null);
    } catch (err) {
      console.error('Failed to save thumbnail:', err);
      throw err;
    }
  };

  const handleSaveVideoEdits = async (updates) => {
    if (!selectedVideo) return;

    const videoId = selectedVideo._id || selectedVideo.id;

    try {
      await api.put(`/api/content/${videoId}`, updates);

      const updatedVideos = reels.map(v =>
        (v._id || v.id) === videoId ? { ...v, ...updates } : v
      );
      setReels(updatedVideos);

      setShowVideoEditor(false);
      setSelectedVideo(null);
    } catch (err) {
      console.error('Failed to save video:', err);
      throw err;
    }
  };

  const handleDeleteVideo = async () => {
    if (!selectedVideo) return;

    const videoId = selectedVideo._id || selectedVideo.id;

    // Helper to normalize IDs for comparison
    const normalizeId = (id) => (id?._id || id?.id || id || '').toString();
    const videoIdStr = normalizeId(videoId);

    try {
      await api.delete(`/api/content/${videoId}`);

      // Update global reels state
      const updatedVideos = reels.filter(v => (v._id || v.id) !== videoId);
      setReels(updatedVideos);

      // Also update the current collection's reels for instant UI update
      if (currentReelCollection) {
        const collectionId = currentReelCollection._id || currentReelCollection.id;
        const updatedReels = currentReelCollection.reels?.filter(r => {
          const contentIdStr = normalizeId(r.contentId);
          return contentIdStr !== videoIdStr;
        }) || [];

        // Re-order remaining reels
        updatedReels.forEach((r, i) => { r.order = i; });

        updateReelCollection(collectionId, { ...currentReelCollection, reels: updatedReels });
      }

      setShowVideoEditor(false);
      setSelectedVideo(null);
    } catch (err) {
      console.error('Failed to delete video:', err);
      throw err;
    }
  };

  // Edit profile handlers
  const handleEditProfile = () => {
    setEditUsername(user?.username || user?.brandName || '');
    setEditBio(user?.bio || '');
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updates = {
        username: editUsername,
        bio: editBio,
      };

      await api.put('/api/auth/profile', updates);

      setUser({
        ...user,
        username: editUsername,
        bio: editBio,
      });

      setShowEditProfile(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEditProfile = () => {
    setShowEditProfile(false);
    setEditUsername('');
    setEditBio('');
  };

  // Inline username editing handlers
  const handleUsernameClick = () => {
    setInlineUsername(user?.username || '');
    setIsEditingUsername(true);
    setTimeout(() => usernameInputRef.current?.focus(), 0);
  };

  const handleUsernameBlur = () => {
    if (inlineUsername !== (user?.username || '')) {
      setShowSavePrompt(true);
    } else {
      setIsEditingUsername(false);
    }
  };

  const handleUsernameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inlineUsername !== (user?.username || '')) {
        setShowSavePrompt(true);
      } else {
        setIsEditingUsername(false);
      }
    } else if (e.key === 'Escape') {
      setIsEditingUsername(false);
      setInlineUsername('');
    }
  };

  // Use ref to track saving state to avoid stale closures
  const savingRef = useRef(false);
  const inlineUsernameRef = useRef('');
  inlineUsernameRef.current = inlineUsername;

  const handleSaveUsername = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const newUsername = inlineUsernameRef.current;
      await api.put('/api/auth/profile', { username: newUsername });
      setUser({
        ...user,
        username: newUsername,
      });
      setShowSavePrompt(false);
      setIsEditingUsername(false);
      setInlineUsername('');
    } catch (err) {
      console.error('Failed to save username:', err);
      alert('Failed to save username. Please try again.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  // Handle Enter key for save prompt
  useEffect(() => {
    if (!showSavePrompt) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleSaveUsername();
      } else if (e.key === 'Escape') {
        handleCancelUsernameEdit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSavePrompt]);

  const handleCancelUsernameEdit = () => {
    setShowSavePrompt(false);
    setIsEditingUsername(false);
    setInlineUsername('');
  };

  return (
    <div
      className="max-w-md mx-auto bg-dark-800 rounded-2xl overflow-hidden border border-dark-700"
      onDragEnter={handleVideoDragEnter}
      onDragOver={handleVideoDragOver}
      onDragLeave={handleVideoDragLeave}
      onDrop={handleVideoDrop}
    >
      {/* TikTok Profile Header */}
      <div className="p-4 border-b border-dark-700">
        {/* Avatar - Centered */}
        <div className="flex justify-center mb-3">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-pink-500 p-0.5">
            <div className="w-full h-full rounded-full bg-dark-800 flex items-center justify-center overflow-hidden">
              {user?.profileImage || user?.avatar ? (
                <img src={user.profileImage || user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-dark-400" />
              )}
            </div>
          </div>
        </div>

        {/* Screen Name - Centered without @ */}
        <h2 className="text-lg font-bold text-dark-100 text-center">
          {user?.brandName || user?.name || 'Display Name'}
        </h2>

        {/* Username - Centered with @ - Clickable to edit */}
        {isEditingUsername ? (
          <div className="flex justify-center mb-3">
            <div className="flex items-center">
              <span className="text-sm text-dark-400">@</span>
              <input
                ref={usernameInputRef}
                type="text"
                value={inlineUsername}
                onChange={(e) => setInlineUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                onBlur={handleUsernameBlur}
                onKeyDown={handleUsernameKeyDown}
                className="bg-transparent text-sm text-dark-400 border-b border-cyan-400 outline-none text-center w-32"
                placeholder="username"
              />
            </div>
          </div>
        ) : (
          <p
            onClick={handleUsernameClick}
            className="text-sm text-dark-400 text-center mb-3 cursor-pointer hover:text-cyan-400 transition-colors"
            title="Click to edit username"
          >
            @{user?.username || 'username'}
          </p>
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-5 mb-4">
          <div className="text-center">
            <p className="font-bold text-dark-100">{user?.following || '142'}</p>
            <p className="text-xs text-dark-400">Following</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-dark-100">{user?.followers || '10.2K'}</p>
            <p className="text-xs text-dark-400">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-dark-100">{user?.likes || '52.4K'}</p>
            <p className="text-xs text-dark-400">Likes</p>
          </div>
        </div>

        {/* Action Buttons Row - Follow, Message, Dropdown */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {/* Follow Button */}
          <button className="flex-1 max-w-[140px] py-2 bg-[#fe2c55] hover:bg-[#ef2950] text-white text-sm font-semibold rounded-md transition-colors">
            Follow
          </button>
          {/* Message Button */}
          <button className="w-10 h-9 bg-dark-700 hover:bg-dark-600 rounded-md flex items-center justify-center transition-colors">
            <Mail className="w-4 h-4 text-dark-200" />
          </button>
          {/* Dropdown Button */}
          <button className="w-10 h-9 bg-dark-700 hover:bg-dark-600 rounded-md flex items-center justify-center transition-colors">
            <ChevronDown className="w-4 h-4 text-dark-200" />
          </button>
        </div>

        {/* Bio/Slogan */}
        {user?.bio && (
          <p className="text-sm text-dark-300 text-center whitespace-pre-line">{user.bio}</p>
        )}

        {/* Edit Profile Button (for owner view) */}
        <button
          onClick={handleEditProfile}
          className="w-full mt-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-200 text-xs font-medium rounded transition-colors"
        >
          Edit Profile
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-dark-700">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex-1 py-3 transition-colors ${activeTab === 'videos' ? 'border-b-2 border-dark-100 text-dark-100' : 'text-dark-500 hover:text-dark-300'}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 mx-auto">
            <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
            <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
            <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
            <rect x="14" y="14" width="7" height="7" strokeWidth="2" />
          </svg>
        </button>
        <button
          onClick={() => setActiveTab('liked')}
          className={`flex-1 py-3 transition-colors ${activeTab === 'liked' ? 'border-b-2 border-dark-100 text-dark-100' : 'text-dark-500 hover:text-dark-300'}`}
        >
          <Heart className="w-6 h-6 mx-auto" />
        </button>
      </div>

      {/* Videos Grid */}
      {activeTab === 'videos' && (
        <div>
          {/* TikTok Collection Selector */}
          <div className="p-3 border-b border-dark-700">
            <div className="relative">
              <button
                onClick={() => setShowReelCollectionSelector(!showReelCollectionSelector)}
                className="flex items-center gap-2 px-3 py-2 bg-dark-700 rounded-lg text-dark-200 hover:bg-dark-600 transition-colors w-full"
              >
                <LayoutGrid className="w-4 h-4 text-cyan-400" />
                <span className="text-sm flex-1 text-left truncate">
                  {currentReelCollection?.name || 'Select Collection'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showReelCollectionSelector ? 'rotate-180' : ''}`} />
              </button>

              {showReelCollectionSelector && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-dark-700 rounded-lg shadow-xl border border-dark-600 z-20">
                  <div className="p-2 border-b border-dark-600">
                    <p className="text-xs text-dark-400 uppercase tracking-wide">TikTok Collections ({tiktokCollections.length})</p>
                  </div>
                  <div className="max-h-48 overflow-auto">
                    {tiktokCollections.map((collection) => (
                      <div
                        key={collection._id || collection.id}
                        className={`group relative ${
                          currentReelCollectionId === (collection._id || collection.id)
                            ? 'bg-cyan-500/20'
                            : 'hover:bg-dark-600'
                        }`}
                      >
                        {editingReelCollectionId === (collection._id || collection.id) ? (
                          <div className="px-3 py-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingReelCollectionName}
                              onChange={(e) => setEditingReelCollectionName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRenameReelCollection(e, collection._id || collection.id);
                                if (e.key === 'Escape') handleCancelRenameReelCollection(e);
                              }}
                              className="flex-1 bg-dark-800 border border-dark-500 rounded px-2 py-1 text-sm text-dark-100 focus:outline-none focus:border-cyan-400"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => handleSaveRenameReelCollection(e, collection._id || collection.id)}
                              className="p-1 text-green-400 hover:bg-dark-500 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelRenameReelCollection}
                              className="p-1 text-dark-400 hover:bg-dark-500 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : showDeleteReelCollectionConfirm === (collection._id || collection.id) ? (
                          <div className="px-3 py-2">
                            <p className="text-sm text-dark-200 mb-2">Delete "{collection.name}"?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => handleDeleteReelCollection(e, collection._id || collection.id)}
                                className="flex-1 px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                              >
                                Delete
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowDeleteReelCollectionConfirm(null); }}
                                className="flex-1 px-2 py-1 text-xs bg-dark-600 text-dark-300 rounded hover:bg-dark-500"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectReelCollection(collection)}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                              currentReelCollectionId === (collection._id || collection.id)
                                ? 'text-cyan-400'
                                : 'text-dark-200'
                            }`}
                          >
                            <LayoutGrid className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 truncate">{collection.name}</span>
                            <span className="text-xs text-dark-500 mr-1">
                              {collection.reels?.length || 0}
                            </span>
                            <div className="hidden group-hover:flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRolloutPickerCollectionId(collection._id || collection.id);
                                  setShowRolloutPicker(true);
                                  setShowReelCollectionSelector(false);
                                }}
                                className="p-1 text-dark-400 hover:text-green-400 hover:bg-dark-500 rounded"
                                title="Add to Rollout"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleStartRenameReelCollection(e, collection)}
                                className="p-1 text-dark-400 hover:text-cyan-400 hover:bg-dark-500 rounded"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowDeleteReelCollectionConfirm(collection._id || collection.id); }}
                                className="p-1 text-dark-400 hover:text-red-400 hover:bg-dark-500 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </button>
                        )}
                      </div>
                    ))}
                    {tiktokCollections.length === 0 && (
                      <p className="px-3 py-4 text-sm text-dark-400 text-center">No collections yet</p>
                    )}
                  </div>
                  <div className="p-2 border-t border-dark-600">
                    <button
                      onClick={handleCreateReelCollection}
                      className="w-full px-3 py-2 text-sm text-cyan-400 hover:bg-dark-600 rounded-md flex items-center gap-2"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Create New Collection
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Videos Grid Area */}
          <div
            className={`min-h-[300px] transition-colors relative ${
              isVideoDragOver ? 'bg-cyan-500/20 border-2 border-dashed border-cyan-400' : ''
            }`}
            onDragEnter={handleVideoDragEnter}
            onDragOver={handleVideoDragOver}
            onDragLeave={handleVideoDragLeave}
            onDrop={handleVideoDrop}
          >
          {/* Drop Overlay */}
          {isVideoDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-dark-900/80 z-10">
              <div className="text-center">
                <TikTokIcon className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                <p className="text-xl font-medium text-dark-100">Drop Video to Upload</p>
                <p className="text-sm text-dark-400 mt-2">MP4, MOV, WebM</p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadingVideo && (
            <div className="py-8 text-center">
              <div className="w-12 h-12 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-dark-200">Uploading video...</p>
            </div>
          )}

          {/* Videos Grid with Row Drag */}
          {!uploadingVideo && !isLoadingCollections && collectionVideos.length > 0 && (
            <DndContext
              sensors={rowSensors}
              collisionDetection={closestCenter}
              onDragStart={handleRowDragStart}
              onDragEnd={handleRowDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col">
                  {videoRows.map((row, rowIndex) => (
                    <SortableTikTokRow
                      key={`tiktok-row-${rowIndex}`}
                      rowId={`tiktok-row-${rowIndex}`}
                      showHandle={showRowHandles}
                    >
                      <div className="grid grid-cols-3 gap-0.5">
                        {row.map((video) => (
                          <DraggableTikTokItem
                            key={video._id || video.id}
                            video={video}
                            videoId={video._id || video.id}
                            onEdit={handleVideoEdit}
                            onPlay={handleVideoPlay}
                            onReorder={handleVideoReorder}
                          />
                        ))}
                        {/* Fill empty cells */}
                        {row.length < 3 &&
                          Array.from({ length: 3 - row.length }).map((_, i) => (
                            <div
                              key={`empty-${rowIndex}-${i}`}
                              className="aspect-[9/16] bg-dark-700/30 rounded-sm"
                            />
                          ))}
                      </div>
                    </SortableTikTokRow>
                  ))}
                </div>
              </SortableContext>

              {/* Row Drag Overlay */}
              <DragOverlay>
                {rowDragActiveId ? (
                  <div className="flex items-center bg-dark-800/90 rounded-lg ring-2 ring-cyan-400 shadow-xl">
                    <div className="px-2 py-8">
                      <GripVertical className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="grid grid-cols-3 gap-0.5 p-2">
                      {videoRows[parseInt(rowDragActiveId.replace('tiktok-row-', ''))]?.map((video) => (
                        <div key={video._id || video.id} className="aspect-[9/16] bg-dark-700 rounded-sm overflow-hidden w-16">
                          <img
                            src={video.thumbnailUrl || video.mediaUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {/* Loading State */}
          {isLoadingCollections && (
            <div className="py-16 text-center">
              <Loader2 className="w-12 h-12 text-cyan-400 mx-auto animate-spin" />
              <p className="text-dark-400 text-lg font-medium mt-3">Loading videos...</p>
            </div>
          )}

          {/* Empty State */}
          {!uploadingVideo && !isLoadingCollections && collectionVideos.length === 0 && !isVideoDragOver && (
            <div className="py-16 text-center">
              <TikTokIcon className="w-16 h-16 text-dark-500 mx-auto" />
              {currentReelCollection ? (
                <>
                  <p className="text-dark-400 text-lg font-medium mt-3">No Videos Yet</p>
                  <p className="text-dark-500 text-sm">Drag a video here to upload to "{currentReelCollection.name}"</p>
                </>
              ) : (
                <>
                  <p className="text-dark-400 text-lg font-medium mt-3">No Collection Selected</p>
                  <p className="text-dark-500 text-sm">Create a collection first using the dropdown above</p>
                </>
              )}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Liked Tab - Empty State */}
      {activeTab === 'liked' && (
        <div className="py-16 text-center">
          <Heart className="w-16 h-16 text-dark-500 mx-auto" />
          <p className="text-dark-400 text-lg font-medium mt-3">Liked Videos</p>
          <p className="text-dark-500 text-sm">Videos you've liked will appear here</p>
        </div>
      )}

      {/* Modals */}
      {showThumbnailSelector && selectedVideo && (
        <ReelThumbnailSelector
          reel={selectedVideo}
          videoFile={pendingVideoUpload}
          onSave={handleSaveThumbnail}
          onClose={() => {
            setShowThumbnailSelector(false);
            setPendingVideoUpload(null);
          }}
        />
      )}

      {showVideoPlayer && selectedVideo && (
        <ReelPlayer
          reel={selectedVideo}
          onClose={() => {
            setShowVideoPlayer(false);
            setSelectedVideo(null);
          }}
        />
      )}

      {showVideoEditor && selectedVideo && (
        <ReelEditor
          reel={selectedVideo}
          onSave={handleSaveVideoEdits}
          onDelete={handleDeleteVideo}
          onClose={() => {
            setShowVideoEditor(false);
            setSelectedVideo(null);
          }}
          onChangeThumbnail={() => {
            setShowVideoEditor(false);
            setShowThumbnailSelector(true);
          }}
          onPlay={() => {
            setShowVideoEditor(false);
            setShowVideoPlayer(true);
          }}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <button
                onClick={handleCancelEditProfile}
                className="text-dark-400 hover:text-dark-200"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-semibold text-dark-100">Edit Profile</h2>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Check className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Profile Picture Preview */}
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-pink-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-dark-800 flex items-center justify-center overflow-hidden">
                    {user?.profileImage || user?.avatar ? (
                      <img src={user.profileImage || user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-dark-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm text-dark-400 mb-1">Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="your_username"
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm text-dark-400 mb-1">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell the world about yourself..."
                  rows={4}
                  maxLength={80}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-cyan-400 resize-none"
                />
                <p className="text-xs text-dark-500 mt-1 text-right">{editBio.length}/80</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-dark-700">
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Username Prompt */}
      {showSavePrompt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-xs overflow-hidden border border-dark-700">
            <div className="p-4 text-center">
              <p className="text-dark-100 font-medium mb-2">Save username?</p>
              <p className="text-dark-400 text-sm mb-4">
                Change username to <span className="text-cyan-400">@{inlineUsername}</span>?
              </p>
              <p className="text-dark-500 text-xs mb-4">Press Enter to save</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelUsernameEdit}
                  className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveUsername()}
                  disabled={isSaving}
                  className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 text-white rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Yes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rollout Picker Modal */}
      {showRolloutPicker && rolloutPickerCollectionId && (
        <RolloutPickerModal
          collectionId={rolloutPickerCollectionId}
          collectionName={tiktokCollections.find(c => (c._id || c.id) === rolloutPickerCollectionId)?.name || 'Collection'}
          platform="tiktok-reels"
          rollouts={rollouts}
          onSelect={async (rolloutId, sectionId) => {
            try {
              const data = await rolloutApi.addCollectionToSection(rolloutId, sectionId, rolloutPickerCollectionId);
              // Update rollouts in store
              setRollouts(rollouts.map(r =>
                (r._id || r.id) === rolloutId
                  ? { ...data.rollout, id: data.rollout._id }
                  : r
              ));
            } catch (err) {
              console.error('Failed to add collection to rollout:', err);
            }
            setShowRolloutPicker(false);
            setRolloutPickerCollectionId(null);
          }}
          onClose={() => {
            setShowRolloutPicker(false);
            setRolloutPickerCollectionId(null);
          }}
        />
      )}
    </div>
  );
}

export default TikTokPreview;
