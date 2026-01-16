import { useState, useRef, useCallback } from 'react';
import { User, Upload, ZoomIn, ZoomOut, X, Check, Camera, RotateCcw, Save, GripVertical } from 'lucide-react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../../stores/useAppStore';

// Remap zoom: slider 80%-200% maps to actual 80%-400%
// Uses quadratic scaling for zoom > 1 so 2.0 → 4.0
const getActualZoom = (sliderValue) => {
  if (sliderValue <= 1) return sliderValue;
  // Quadratic: 1→1, 1.5→2.25, 2→4
  return sliderValue * sliderValue;
};

// Sortable grid item component
function SortableGridItem({ post, id }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="aspect-square bg-dark-700 overflow-hidden cursor-grab active:cursor-grabbing"
    >
      {post.image ? (
        <img
          src={post.image}
          alt=""
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      ) : (
        <div
          className="w-full h-full"
          style={{ backgroundColor: post.color || '#3f3f46' }}
        />
      )}
    </div>
  );
}

// Row drag handle component
function RowDragHandle({ rowIndex, onMoveRow, totalRows }) {
  const handleMoveUp = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (rowIndex > 0) {
      onMoveRow(rowIndex, rowIndex - 1);
    }
  };

  const handleMoveDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (rowIndex < totalRows - 1) {
      onMoveRow(rowIndex, rowIndex + 1);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-1 px-2">
      <button
        onClick={handleMoveUp}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={rowIndex === 0}
        className={`p-1 rounded transition-colors ${
          rowIndex === 0 ? 'text-dark-600 cursor-not-allowed' : 'text-dark-400 hover:text-dark-100 hover:bg-dark-600 active:bg-dark-500'
        }`}
        title="Move row up"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <GripVertical className="w-4 h-4 text-dark-500" />
      <button
        onClick={handleMoveDown}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={rowIndex === totalRows - 1}
        className={`p-1 rounded transition-colors ${
          rowIndex === totalRows - 1 ? 'text-dark-600 cursor-not-allowed' : 'text-dark-400 hover:text-dark-100 hover:bg-dark-600 active:bg-dark-500'
        }`}
        title="Move row down"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}

function GridPreview({ posts, layout }) {
  const cols = layout?.cols || 3;
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const setGridPosts = useAppStore((state) => state.setGridPosts);

  // Drag and drop state
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  // Get post IDs for sortable context
  const postIds = posts.map((p) => p.id || p._id);

  // Handle drag start
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // Handle drag end - reorder posts
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = posts.findIndex((p) => (p.id || p._id) === active.id);
      const newIndex = posts.findIndex((p) => (p.id || p._id) === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newPosts = arrayMove([...posts], oldIndex, newIndex);
        setGridPosts(newPosts);
      }
    }
  };

  // Handle row move
  const handleMoveRow = (fromRow, toRow) => {
    if (toRow < 0) return;

    const totalRows = Math.ceil(posts.length / cols);
    if (toRow >= totalRows) return;

    // Group posts into rows
    const rowsArray = [];
    for (let i = 0; i < posts.length; i += cols) {
      rowsArray.push(posts.slice(i, i + cols));
    }

    // Swap the rows
    const temp = rowsArray[fromRow];
    rowsArray[fromRow] = rowsArray[toRow];
    rowsArray[toRow] = temp;

    // Flatten back to single array
    const newPosts = rowsArray.flat();
    setGridPosts(newPosts);
  };

  // Get active post for drag overlay
  const activePost = activeId ? posts.find((p) => (p.id || p._id) === activeId) : null;

  // Group posts into rows for row controls
  const rows = [];
  for (let i = 0; i < posts.length; i += cols) {
    rows.push(posts.slice(i, i + cols));
  }

  // Avatar editor state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Edit profile state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editBrandName, setEditBrandName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  // Open modal with current avatar (use original if available for non-destructive editing)
  const handleAvatarClick = () => {
    if (user?.avatar) {
      // Always use the original image for editing
      setTempImage(user.avatar);
      // Load existing position if stored
      setPosition(user.avatarPosition || { x: 0, y: 0 });
      setZoom(user.avatarZoom || 1);
    } else {
      setTempImage(null);
      setPosition({ x: 0, y: 0 });
      setZoom(1);
    }
    setShowAvatarModal(true);
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setTempImage(event.target?.result);
      setPosition({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  // Drag handling
  const handleMouseDown = (e) => {
    if (!tempImage) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Limit movement based on zoom - allow more movement at higher zoom
    const maxOffset = Math.max(50, 128 * (zoom - 0.5));
    setPosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY))
    });
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handling for mobile
  const handleTouchStart = (e) => {
    if (!tempImage) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;

    // Limit movement based on zoom - allow more movement at higher zoom
    const maxOffset = Math.max(50, 128 * (zoom - 0.5));
    setPosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY))
    });
  }, [isDragging, dragStart, zoom]);

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Save avatar non-destructively (original image + position/zoom settings)
  const handleSave = () => {
    if (!tempImage) {
      setShowAvatarModal(false);
      return;
    }

    // Save the original image with position/zoom settings (non-destructive)
    setUser({
      ...user,
      avatar: tempImage, // Store original image
      avatarPosition: position,
      avatarZoom: zoom
    });

    setShowAvatarModal(false);
  };

  // Cancel and close modal
  const handleCancel = () => {
    setShowAvatarModal(false);
    setTempImage(null);
    setPosition({ x: 0, y: 0 });
    setZoom(1);
  };

  // Open edit profile modal
  const handleEditProfile = () => {
    setEditBrandName(user?.brandName || '');
    setEditBio(user?.bio || '');
    setShowEditProfile(true);
  };

  // Save profile changes
  const handleSaveProfile = () => {
    setIsSaving(true);

    // Update user in store (will be persisted via zustand persist)
    setUser({
      ...user,
      brandName: editBrandName,
      bio: editBio,
    });

    setTimeout(() => {
      setIsSaving(false);
      setShowEditProfile(false);
    }, 300);
  };

  // Cancel edit profile
  const handleCancelEditProfile = () => {
    setShowEditProfile(false);
    setEditBrandName('');
    setEditBio('');
  };

  return (
    <div className="max-w-md mx-auto bg-dark-800 rounded-2xl overflow-hidden border border-dark-700">
      {/* Profile Header */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center gap-4">
          {/* Clickable Avatar */}
          <button
            onClick={handleAvatarClick}
            className="relative w-20 h-20 rounded-full bg-gradient-to-br from-accent-purple via-accent-pink to-accent-orange p-0.5 group cursor-pointer"
          >
            <div className="w-full h-full rounded-full bg-dark-800 overflow-hidden relative">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.brandName || user.name || 'Profile'}
                  className="absolute pointer-events-none"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    left: '50%',
                    top: '50%',
                    transformOrigin: 'center center',
                    transform: `translate(-50%, -50%) translate(${(user.avatarPosition?.x || 0) * 0.3}px, ${(user.avatarPosition?.y || 0) * 0.3}px) scale(${getActualZoom(user.avatarZoom || 1)})`,
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-dark-200" />
                </div>
              )}
            </div>
            {/* Hover overlay */}
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-6 mb-2">
              <div className="text-center">
                <p className="font-semibold text-dark-100">{posts.length}</p>
                <p className="text-xs text-dark-400">posts</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-dark-100">12.4K</p>
                <p className="text-xs text-dark-400">followers</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-dark-100">892</p>
                <p className="text-xs text-dark-400">following</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <p className="font-semibold text-dark-100">{user?.brandName || 'Your Brand'}</p>
          {user?.bio && <p className="text-sm text-dark-300 whitespace-pre-line">{user.bio}</p>}
        </div>
        <button
          onClick={handleEditProfile}
          className="w-full mt-4 py-1.5 bg-dark-700 text-dark-200 text-sm font-medium rounded-lg hover:bg-dark-600 transition-colors"
        >
          Edit Profile
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-dark-700">
        <button className="flex-1 py-3 border-b-2 border-dark-100">
          <svg className="w-6 h-6 mx-auto text-dark-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button className="flex-1 py-3 text-dark-500">
          <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button className="flex-1 py-3 text-dark-500">
          <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>

      {/* Grid with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={postIds} strategy={rectSortingStrategy}>
          <div className="flex">
            {/* Row Controls */}
            {posts.length > 0 && (
              <div className="flex flex-col justify-around">
                {rows.map((_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="flex items-center flex-1"
                  >
                    <RowDragHandle
                      rowIndex={rowIndex}
                      onMoveRow={handleMoveRow}
                      totalRows={rows.length}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Grid */}
            <div
              className="grid gap-0.5 flex-1"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {posts.map((post) => (
                <SortableGridItem
                  key={post.id || post._id}
                  id={post.id || post._id}
                  post={post}
                />
              ))}
            </div>
          </div>
        </SortableContext>

        {/* Drag Overlay */}
        <DragOverlay>
          {activePost ? (
            <div className="aspect-square bg-dark-700 overflow-hidden shadow-2xl rounded-lg opacity-90">
              {activePost.image ? (
                <img
                  src={activePost.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: activePost.color || '#3f3f46' }}
                />
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {posts.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-dark-400">No posts to preview</p>
        </div>
      )}

      {/* Avatar Edit Modal */}
      {showAvatarModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={handleCancel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="bg-dark-800 rounded-2xl p-6 w-full max-w-md border border-dark-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-dark-100">Edit Profile Photo</h3>
              <button onClick={handleCancel} className="text-dark-400 hover:text-dark-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Area */}
            <div className="relative mb-4">
              {/* Circular crop viewport */}
              <div
                className="w-64 h-64 mx-auto rounded-full overflow-hidden bg-dark-700 relative cursor-move border-2 border-dark-600"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                {tempImage ? (
                  <img
                    src={tempImage}
                    alt="Preview"
                    className="absolute pointer-events-none select-none"
                    draggable={false}
                    style={{
                      // Use transform scale for zoom - more reliable
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      left: '50%',
                      top: '50%',
                      transformOrigin: 'center center',
                      transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${getActualZoom(zoom)})`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-dark-400">
                    <User className="w-16 h-16 mb-2" />
                    <p className="text-sm">No photo selected</p>
                  </div>
                )}
              </div>

              {/* Drag hint */}
              {tempImage && (
                <p className="text-center text-dark-500 text-xs mt-2">
                  Drag to reposition
                </p>
              )}
            </div>

            {/* Zoom Control */}
            {tempImage && (
              <div className="flex items-center gap-3 mb-4 px-4">
                <ZoomOut className="w-4 h-4 text-dark-400" />
                <input
                  type="range"
                  min="0.8"
                  max="2"
                  step="0.02"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-dark-600 rounded-lg appearance-none cursor-pointer accent-accent-purple"
                />
                <ZoomIn className="w-4 h-4 text-dark-400" />
                {/* Reset button */}
                <button
                  onClick={() => { setPosition({ x: 0, y: 0 }); setZoom(1); }}
                  className="p-1.5 rounded-lg hover:bg-dark-600 text-dark-400 hover:text-dark-200 transition-colors"
                  title="Reset position and zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <span className="text-xs text-dark-500 w-12 text-right">{Math.round(getActualZoom(zoom) * 100)}%</span>
              </div>
            )}

            {/* Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full btn-secondary mb-3"
            >
              <Upload className="w-4 h-4" />
              {tempImage ? 'Choose Different Photo' : 'Upload Photo'}
            </button>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button onClick={handleCancel} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 btn-primary"
                disabled={!tempImage}
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={handleCancelEditProfile}
        >
          <div
            className="bg-dark-800 rounded-2xl p-6 w-full max-w-md border border-dark-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-dark-100">Edit Profile</h3>
              <button onClick={handleCancelEditProfile} className="text-dark-400 hover:text-dark-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Brand Name */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={editBrandName}
                  onChange={(e) => setEditBrandName(e.target.value)}
                  placeholder="Your Brand"
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:border-accent-purple focus:ring-1 focus:ring-accent-purple outline-none transition-colors"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Bio
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Write your bio..."
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:border-accent-purple focus:ring-1 focus:ring-accent-purple outline-none transition-colors resize-none"
                />
                <p className="text-xs text-dark-500 mt-1">{editBio.length}/150 characters</p>
              </div>

              {/* Preview */}
              <div className="p-3 bg-dark-700/50 rounded-lg">
                <p className="text-xs text-dark-400 mb-2">Preview</p>
                <p className="font-semibold text-dark-100">{editBrandName || 'Your Brand'}</p>
                {editBio && <p className="text-sm text-dark-300 whitespace-pre-line">{editBio}</p>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button onClick={handleCancelEditProfile} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 btn-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GridPreview;
