import { useState, useRef, useCallback, useEffect } from 'react';
import { User, Settings, Share2, Plus, Play, Heart, MessageCircle, Bookmark, MoreHorizontal, GripVertical, Music2, X, Check, Loader2, ChevronDown, Mail } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { contentApi } from '../../lib/api';
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

  // Tab state
  const [activeTab, setActiveTab] = useState('videos');

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

  // Group videos into rows of 3
  const videoRows = [];
  for (let i = 0; i < reels.length; i += 3) {
    videoRows.push(reels.slice(i, i + 3));
  }
  const rowIds = videoRows.map((_, index) => `tiktok-row-${index}`);

  // Row sensors
  const rowSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Video drag handlers
  const handleVideoDragEnter = (e) => {
    e.preventDefault();
    videoDragCounterRef.current++;
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsVideoDragOver(true);
    }
  };

  const handleVideoDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleVideoDragLeave = (e) => {
    e.preventDefault();
    videoDragCounterRef.current--;
    if (videoDragCounterRef.current === 0) {
      setIsVideoDragOver(false);
    }
  };

  const handleVideoDrop = async (e) => {
    e.preventDefault();
    setIsVideoDragOver(false);
    videoDragCounterRef.current = 0;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to upload videos');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(f => f.type.startsWith('video/'));

    if (!videoFile) {
      return;
    }

    setUploadingVideo(true);

    try {
      const { thumbnailBlob, duration, width, height, isVertical } =
        await generateVideoThumbnail(videoFile);

      const result = await contentApi.uploadReel(videoFile, thumbnailBlob, {
        title: videoFile.name.replace(/\.[^/.]+$/, ''),
        mediaType: 'video',
        duration,
        width,
        height,
        isReel: true,
        recommendedType: 'video'
      });

      const uploadedVideo = result.content || result;
      addReel(uploadedVideo);

      setSelectedVideo(uploadedVideo);
      setPendingVideoUpload(videoFile);
      setShowThumbnailSelector(true);
    } catch (err) {
      console.error('Video upload failed:', err);
      if (err.response?.status === 401) {
        alert('Please log in to upload videos');
      }
    } finally {
      setUploadingVideo(false);
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

  const handleVideoReorder = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceIndex = reels.findIndex(r => (r._id || r.id) === sourceId);
    const targetIndex = reels.findIndex(r => (r._id || r.id) === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newVideos = [...reels];
    [newVideos[sourceIndex], newVideos[targetIndex]] = [newVideos[targetIndex], newVideos[sourceIndex]];
    reorderReels(newVideos);
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

      await api.put(`/api/content/${videoId}/thumbnail`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
      const updatedVideos = reels.map(v =>
        (v._id || v.id) === videoId
          ? { ...v, thumbnailUrl }
          : v
      );
      setReels(updatedVideos);

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

    try {
      await api.delete(`/api/content/${videoId}`);

      const updatedVideos = reels.filter(v => (v._id || v.id) !== videoId);
      setReels(updatedVideos);

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
    <div className="max-w-md mx-auto bg-dark-800 rounded-2xl overflow-hidden border border-dark-700">
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
          {!uploadingVideo && reels.length > 0 && (
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

          {/* Empty State */}
          {!uploadingVideo && reels.length === 0 && !isVideoDragOver && (
            <div className="py-16 text-center">
              <TikTokIcon className="w-16 h-16 text-dark-500 mx-auto" />
              <p className="text-dark-400 text-lg font-medium mt-3">No Videos Yet</p>
              <p className="text-dark-500 text-sm">Drag a video here to upload</p>
            </div>
          )}
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
    </div>
  );
}

export default TikTokPreview;
