import { useState, useRef, useCallback, useEffect } from 'react';
import { User, Upload, ZoomIn, ZoomOut, X, Check, Camera, RotateCcw, Save, GripVertical, Replace, Layers, Trash2, Eye, EyeOff, Play } from 'lucide-react';
import { setInternalDragActive } from '../../utils/dragState';
import { generateVideoThumbnail, formatDuration } from '../../utils/videoUtils';
import { contentApi } from '../../lib/api';
import api from '../../lib/api';
import ReelPlayer from './ReelPlayer';
import ReelThumbnailSelector from './ReelThumbnailSelector';
import ReelEditor from './ReelEditor';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useAppStore } from '../../stores/useAppStore';

// Remap zoom: slider 80%-200% maps to actual 80%-400%
// Uses quadratic scaling for zoom > 1 so 2.0 → 4.0
const getActualZoom = (sliderValue) => {
  if (sliderValue <= 1) return sliderValue;
  // Quadratic: 1→1, 1.5→2.25, 2→4
  return sliderValue * sliderValue;
};

// Sortable row component with drag handle
function SortableRow({ rowId, rowIndex, children, showHandle = true }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: rowId,
    disabled: !showHandle, // Disable sorting when handle is hidden
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      {/* Drag Handle - conditionally visible */}
      {showHandle && (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center px-2 py-4 cursor-grab active:cursor-grabbing hover:bg-dark-700/50 rounded-l transition-colors"
          title="Drag to reorder row"
        >
          <GripVertical className="w-5 h-5 text-dark-500 hover:text-dark-300" />
        </div>
      )}
      {/* Row Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

// Draggable grid item with drop zone (handles both internal drags AND file drops from explorer)
// Default drag = rearrange, Shift+drag = replace/carousel, File drop = replace/carousel
function DraggableGridItem({ post, postId, onDragStart, onDragEnd, onFileDrop, onReorder, onReplaceOrCarousel, isSelected, onSelect, onDelete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [isFileOver, setIsFileOver] = useState(false);
  const [isShiftDrag, setIsShiftDrag] = useState(false);
  const dragCounterRef = useRef(0); // Counter to handle nested element drag events

  // Get all images for this post (for carousel support)
  const images = post.images || (post.image ? [post.image] : []);
  const isCarousel = images.length > 1;

  // Handle click to select
  const handleClick = (e) => {
    e.stopPropagation();
    onSelect?.(postId);
  };

  // Handle trash icon click
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete?.(postId);
  };

  const handleDragStart = (e) => {
    e.stopPropagation();

    // Set global flag IMMEDIATELY to prevent file drop overlay
    setInternalDragActive(true);

    // Check if shift is held - store in dataTransfer for the drop handler
    const shiftHeld = e.shiftKey;
    setIsShiftDrag(shiftHeld);

    setIsDragging(true);
    e.dataTransfer.setData('application/postpilot-item', postId);
    e.dataTransfer.setData('application/postpilot-shift', shiftHeld ? 'true' : 'false');
    e.dataTransfer.effectAllowed = 'move';

    // Create a custom drag image
    const dragImage = e.target.cloneNode(true);
    dragImage.style.width = '80px';
    dragImage.style.height = '80px';
    dragImage.style.borderRadius = '8px';
    dragImage.style.opacity = '0.9';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 40, 40);
    setTimeout(() => document.body.removeChild(dragImage), 0);

    onDragStart?.(postId, post);
  };

  const handleDragEnd = (e) => {
    e.stopPropagation();
    setIsDragging(false);
    setIsShiftDrag(false);
    dragCounterRef.current = 0;

    // Clear global flag
    setInternalDragActive(false);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Increment counter - this handles nested elements
    dragCounterRef.current++;

    // Set global flag for file drags to block parent overlay
    if (e.dataTransfer.types.includes('Files')) {
      setInternalDragActive(true);
      setIsFileOver(true);
      setIsOver(false);
    } else if (e.dataTransfer.types.includes('application/postpilot-item')) {
      setIsOver(true);
      setIsFileOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if it's an internal item drag
    if (e.dataTransfer.types.includes('application/postpilot-item')) {
      e.dataTransfer.dropEffect = 'move';
    }
    // Check if it's a file drag from outside (Windows Explorer)
    else if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      // Keep setting the flag to ensure overlay stays hidden
      setInternalDragActive(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Decrement counter - only clear highlights when truly leaving
    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsOver(false);
      setIsFileOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset state
    dragCounterRef.current = 0;
    setIsOver(false);
    setIsFileOver(false);

    // Check for internal item drag first
    const sourceId = e.dataTransfer.getData('application/postpilot-item');

    if (sourceId && sourceId !== postId) {
      // Check if shift was held during drag
      const wasShiftDrag = e.dataTransfer.getData('application/postpilot-shift') === 'true';

      if (wasShiftDrag) {
        // Shift+drag = show replace/carousel modal
        onReplaceOrCarousel?.(sourceId, postId);
      } else {
        // Normal drag = reorder
        onReorder?.(sourceId, postId);
      }
      return;
    }

    // Check for file drop from Windows Explorer - always show modal
    const files = Array.from(e.dataTransfer.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length > 0 && onFileDrop) {
      onFileDrop(postId, post, imageFiles);
    }
  };

  return (
    <div
      draggable
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`aspect-square bg-dark-700 overflow-hidden cursor-grab active:cursor-grabbing relative select-none ${
        isDragging ? 'opacity-40' : ''
      } ${isSelected ? 'ring-4 ring-accent-purple' : ''} ${isOver ? 'ring-4 ring-accent-purple scale-105 transition-all duration-150' : ''} ${isFileOver ? 'ring-4 ring-green-500 scale-105 transition-all duration-150' : ''}`}
    >
      {images.length > 0 ? (
        <>
          <img
            src={images[0]}
            alt=""
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
          {/* Carousel indicator */}
          {isCarousel && (
            <div className="absolute top-2 right-2 bg-dark-900/70 rounded px-1.5 py-0.5 flex items-center gap-1 pointer-events-none">
              <Layers className="w-3 h-3 text-white" />
              <span className="text-xs text-white font-medium">{images.length}</span>
            </div>
          )}
        </>
      ) : post.color ? (
        <div
          className="w-full h-full pointer-events-none"
          style={{ backgroundColor: post.color }}
        />
      ) : (
        <div className="w-full h-full bg-dark-600 pointer-events-none" />
      )}

      {/* Selected state - show trash icon */}
      {isSelected && (
        <div className="absolute inset-0 bg-black/30 pointer-events-none">
          <button
            onClick={handleDeleteClick}
            className="absolute bottom-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors pointer-events-auto"
            title="Delete image"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* File drop indicator overlay */}
      {isFileOver && (
        <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center pointer-events-none">
          <div className="bg-dark-900/90 rounded-lg px-3 py-2">
            <span className="text-sm text-white font-medium">Drop to add</span>
          </div>
        </div>
      )}

      {/* Internal drag indicator overlay */}
      {isOver && (
        <div className="absolute inset-0 bg-accent-purple/30 flex items-center justify-center pointer-events-none">
          <div className="bg-dark-900/90 rounded-lg px-3 py-2">
            <span className="text-sm text-white font-medium">Drop here</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Sortable reel row component with drag handle
function SortableReelRow({ rowId, rowIndex, children, showHandle = true }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: rowId,
    disabled: !showHandle, // Disable sorting when handle is hidden
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      {/* Drag Handle */}
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
      {/* Row Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

// Draggable reel grid item component
function DraggableReelItem({ reel, reelId, onEdit, onPlay, onReorder }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragStart = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    e.dataTransfer.setData('application/postpilot-reel', reelId);
    e.dataTransfer.effectAllowed = 'move';

    // Create a custom drag image
    const dragImage = e.target.cloneNode(true);
    dragImage.style.width = '60px';
    dragImage.style.height = '107px';
    dragImage.style.borderRadius = '8px';
    dragImage.style.opacity = '0.9';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 30, 53);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnd = (e) => {
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    // Only handle internal reel drags, let file drops bubble up
    if (e.dataTransfer.types.includes('application/postpilot-reel')) {
      e.stopPropagation();
      dragCounterRef.current++;
      setIsOver(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    // Only handle internal reel drags, let file drops bubble up
    if (e.dataTransfer.types.includes('application/postpilot-reel')) {
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Only handle internal reel drags
    if (e.dataTransfer.types.includes('application/postpilot-reel')) {
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsOver(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();

    // Only handle internal reel drags, let file drops bubble up to parent
    const sourceId = e.dataTransfer.getData('application/postpilot-reel');
    if (sourceId && sourceId !== reelId) {
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsOver(false);
      onReorder?.(sourceId, reelId);
    }
    // File drops will bubble up to the parent container for video upload
  };

  const handleClick = (e) => {
    // Don't open editor if we just finished dragging
    if (!isDragging) {
      onEdit?.(reel);
    }
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
      className={`aspect-[9/16] bg-dark-700 relative overflow-hidden cursor-grab active:cursor-grabbing group select-none ${
        isDragging ? 'opacity-40' : ''
      } ${isOver ? 'ring-4 ring-accent-purple scale-105 transition-all duration-150' : ''}`}
    >
      <img
        src={reel.thumbnailUrl || reel.mediaUrl}
        alt=""
        className="w-full h-full object-cover transition-transform group-hover:scale-105 pointer-events-none"
        draggable={false}
      />

      {/* Overlay with play button */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors pointer-events-none">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay?.(reel);
          }}
          className="w-12 h-12 bg-white/20 group-hover:bg-white/40 rounded-full flex items-center justify-center transition-all opacity-70 group-hover:opacity-100 pointer-events-auto"
        >
          <Play className="w-6 h-6 text-white fill-white ml-0.5" />
        </button>
      </div>

      {/* Duration badge */}
      {reel.metadata?.duration && (
        <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-xs text-white pointer-events-none">
          {formatDuration(reel.metadata.duration)}
        </div>
      )}

      {/* Edit indicator on hover */}
      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-black/70 px-2 py-1 rounded text-xs text-white">
          Click to edit
        </div>
      </div>

      {/* Drop indicator overlay */}
      {isOver && (
        <div className="absolute inset-0 bg-accent-purple/30 flex items-center justify-center pointer-events-none">
          <div className="bg-dark-900/90 rounded-lg px-3 py-2">
            <span className="text-sm text-white font-medium">Drop here</span>
          </div>
        </div>
      )}
    </div>
  );
}

function GridPreview({ posts, layout, showRowHandles = true, onDeletePost }) {
  const cols = layout?.cols || 3;
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const setGridPosts = useAppStore((state) => state.setGridPosts);

  // Group posts into rows
  const rows = [];
  for (let i = 0; i < posts.length; i += cols) {
    rows.push(posts.slice(i, i + cols));
  }

  // Row IDs for sortable context
  const rowIds = rows.map((_, index) => `row-${index}`);

  // Drag and drop state for rows
  const [activeRowId, setActiveRowId] = useState(null);
  const rowSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Handle row drag start
  const handleRowDragStart = (event) => {
    setActiveRowId(event.active.id);
  };

  // Handle row drag end
  const handleRowDragEnd = (event) => {
    const { active, over } = event;
    setActiveRowId(null);

    if (over && active.id !== over.id) {
      const oldIndex = rowIds.indexOf(active.id);
      const newIndex = rowIds.indexOf(over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder the rows
        const newRows = arrayMove([...rows], oldIndex, newIndex);
        // Flatten back to single array
        const newPosts = newRows.flat();
        setGridPosts(newPosts);
      }
    }
  };

  // Get active row for drag overlay
  const activeRowIndex = activeRowId ? parseInt(activeRowId.replace('row-', '')) : null;
  const activeRow = activeRowIndex !== null ? rows[activeRowIndex] : null;

  // Item drag and drop state (for replace/carousel)
  const [showDropModal, setShowDropModal] = useState(false);
  const [dropSource, setDropSource] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  // Selection and delete state
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Tab state for Posts/Reels/Tagged
  const [activeTab, setActiveTab] = useState('posts');

  // Reels state
  const reels = useAppStore((state) => state.reels);
  const setReels = useAppStore((state) => state.setReels);
  const addReel = useAppStore((state) => state.addReel);
  const [isVideoDragOver, setIsVideoDragOver] = useState(false);
  const [uploadingReel, setUploadingReel] = useState(false);
  const videoDragCounterRef = useRef(0);

  // Reel player, editor, and thumbnail selector state
  const [selectedReel, setSelectedReel] = useState(null);
  const [showReelPlayer, setShowReelPlayer] = useState(false);
  const [showReelEditor, setShowReelEditor] = useState(false);
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
  const [pendingReelUpload, setPendingReelUpload] = useState(null); // Stores video file for thumbnail selection after upload
  const [reelRowDragActiveId, setReelRowDragActiveId] = useState(null);

  // Group reels into rows of 3
  const reelRows = [];
  for (let i = 0; i < reels.length; i += 3) {
    reelRows.push(reels.slice(i, i + 3));
  }
  const reelRowIds = reelRows.map((_, index) => `reel-row-${index}`);

  // Reel row drag sensors
  const reelRowSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle item selection
  const handleSelectItem = useCallback((postId) => {
    setSelectedItemId(prevId => prevId === postId ? null : postId);
  }, []);

  // Handle delete request (from trash icon or keyboard)
  const handleDeleteRequest = useCallback((postId) => {
    const post = posts.find(p => (p.id || p._id) === postId);
    if (post) {
      setItemToDelete(post);
      setShowDeleteConfirm(true);
    }
  }, [posts]);

  // Confirm delete
  const handleConfirmDelete = useCallback(() => {
    if (itemToDelete) {
      const itemId = itemToDelete.id || itemToDelete._id;
      // Call the parent's delete handler which persists to backend
      if (onDeletePost) {
        onDeletePost(itemId);
      } else {
        // Fallback to local-only delete if no handler provided
        const newPosts = posts.filter(p => (p.id || p._id) !== itemId);
        setGridPosts(newPosts);
      }
      setSelectedItemId(null);
    }
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  }, [itemToDelete, posts, setGridPosts, onDeletePost]);

  // Cancel delete
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  }, []);

  // Keyboard listener for Delete/Backspace and Enter to confirm delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If delete modal is open, Enter confirms delete, Escape cancels
      if (showDeleteConfirm) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirmDelete();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancelDelete();
        }
        return;
      }

      // Normal selection mode
      if (selectedItemId && (e.key === 'Delete' || e.key === 'Backspace')) {
        // Don't trigger if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        handleDeleteRequest(selectedItemId);
      }
      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedItemId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, handleDeleteRequest, showDeleteConfirm, handleConfirmDelete, handleCancelDelete]);

  // Click outside to deselect
  const handleBackgroundClick = useCallback(() => {
    setSelectedItemId(null);
  }, []);

  // Video drag handlers for Reels tab
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

    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Please log in to upload reels');
      alert('Please log in to upload reels');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(f => f.type.startsWith('video/'));

    if (!videoFile) {
      console.error('No video file found in drop');
      return;
    }

    setUploadingReel(true);

    try {
      // Generate initial thumbnail
      const { thumbnailBlob, duration, width, height, isVertical } =
        await generateVideoThumbnail(videoFile);

      // Upload video with thumbnail
      const result = await contentApi.uploadReel(videoFile, thumbnailBlob, {
        title: videoFile.name.replace(/\.[^/.]+$/, ''),
        mediaType: 'video',
        duration,
        width,
        height,
        isReel: true,
        recommendedType: isVertical ? 'reel' : 'video'
      });

      // Add to reels state - the response contains both message and content
      const uploadedReel = result.content || result;
      addReel(uploadedReel);

      // Show thumbnail selector for the newly uploaded reel
      setSelectedReel(uploadedReel);
      setPendingReelUpload(videoFile);
      setShowThumbnailSelector(true);
    } catch (err) {
      console.error('Reel upload failed:', err);
      if (err.response?.status === 401) {
        alert('Please log in to upload reels');
      }
    } finally {
      setUploadingReel(false);
    }
  };

  // Fetch reels on component mount (only if authenticated)
  useEffect(() => {
    const fetchReels = async () => {
      // Only fetch if user is authenticated (has token)
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      try {
        const response = await api.get('/api/content', {
          params: { mediaType: 'video' }
        });
        const data = response.data;
        // Filter for reels (vertical videos or those marked as reel)
        const reelContent = (data.content || data).filter(c =>
          c.aiSuggestions?.recommendedType === 'reel' ||
          c.metadata?.isReel === true ||
          (c.metadata?.height && c.metadata?.width && c.metadata.height > c.metadata.width)
        );
        setReels(reelContent);
      } catch (err) {
        console.error('Failed to fetch reels:', err);
      }
    };
    fetchReels();
  }, [setReels, user]);

  // Handle clicking on a reel to edit it
  const handleReelEdit = (reel) => {
    setSelectedReel(reel);
    setShowReelEditor(true);
  };

  // Handle playing a reel
  const handleReelPlay = (reel) => {
    setSelectedReel(reel);
    setShowReelPlayer(true);
  };

  // Handle reordering reels by dragging
  const handleReelReorder = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceIndex = reels.findIndex(r => (r._id || r.id) === sourceId);
    const targetIndex = reels.findIndex(r => (r._id || r.id) === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Swap the reels
    const newReels = [...reels];
    [newReels[sourceIndex], newReels[targetIndex]] = [newReels[targetIndex], newReels[sourceIndex]];
    setReels(newReels);
  };

  // Handle opening thumbnail selector from editor
  const handleOpenThumbnailSelector = () => {
    setShowReelEditor(false);
    setShowReelPlayer(false);
    setShowThumbnailSelector(true);
  };

  // Handle saving reel edits
  const handleSaveReelEdits = async (updates) => {
    if (!selectedReel) return;

    const reelId = selectedReel._id || selectedReel.id;

    try {
      await api.put(`/api/content/${reelId}`, updates);

      // Update the reel in local state
      const updatedReels = reels.map(r =>
        (r._id || r.id) === reelId
          ? { ...r, ...updates }
          : r
      );
      setReels(updatedReels);

      // Close the editor
      setShowReelEditor(false);
      setSelectedReel(null);
    } catch (err) {
      console.error('Failed to save reel:', err);
      throw err;
    }
  };

  // Handle deleting a reel
  const handleDeleteReel = async () => {
    if (!selectedReel) return;

    const reelId = selectedReel._id || selectedReel.id;

    try {
      await api.delete(`/api/content/${reelId}`);

      // Remove from local state
      const updatedReels = reels.filter(r => (r._id || r.id) !== reelId);
      setReels(updatedReels);

      // Close the editor
      setShowReelEditor(false);
      setSelectedReel(null);
    } catch (err) {
      console.error('Failed to delete reel:', err);
      throw err;
    }
  };

  // Handle reel row drag start
  const handleReelRowDragStart = (event) => {
    setReelRowDragActiveId(event.active.id);
  };

  // Handle reel row drag end - reorder rows
  const handleReelRowDragEnd = (event) => {
    const { active, over } = event;
    setReelRowDragActiveId(null);

    if (!over || active.id === over.id) return;

    const oldRowIndex = parseInt(active.id.replace('reel-row-', ''));
    const newRowIndex = parseInt(over.id.replace('reel-row-', ''));

    if (isNaN(oldRowIndex) || isNaN(newRowIndex)) return;

    // Swap the rows by reordering the reels array
    const newReelRows = arrayMove(reelRows, oldRowIndex, newRowIndex);
    const newReels = newReelRows.flat();
    setReels(newReels);
    // Note: You might want to persist this order to the backend
  };

  // Handle saving thumbnail
  const handleSaveThumbnail = async (thumbnailBlob, thumbnailUrl) => {
    if (!selectedReel) return;

    const reelId = selectedReel._id || selectedReel.id;

    try {
      // Upload the new thumbnail
      const formData = new FormData();
      formData.append('thumbnail', thumbnailBlob, 'thumbnail.jpg');

      await api.put(`/api/content/${reelId}/thumbnail`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Update the reel in local state
      const updatedReels = reels.map(r =>
        (r._id || r.id) === reelId
          ? { ...r, thumbnailUrl: thumbnailUrl }
          : r
      );
      setReels(updatedReels);

      // Close the thumbnail selector
      setShowThumbnailSelector(false);
      setPendingReelUpload(null);
    } catch (err) {
      console.error('Failed to save thumbnail:', err);
      alert('Failed to save thumbnail. Please try again.');
    }
  };

  // Handle closing thumbnail selector
  const handleCloseThumbnailSelector = () => {
    setShowThumbnailSelector(false);
    setPendingReelUpload(null);
    // Don't clear selectedReel - might want to go back to editor
  };

  // Handle closing reel player
  const handleCloseReelPlayer = () => {
    setShowReelPlayer(false);
    setSelectedReel(null);
  };

  // Handle closing reel editor
  const handleCloseReelEditor = () => {
    setShowReelEditor(false);
    setSelectedReel(null);
  };

  // Handle item drag start (just for tracking)
  const handleItemDragStart = (postId, post) => {
    // Could track dragging state here if needed
  };

  // Handle reorder (default drag without shift) - just swap positions, no modal
  const handleReorder = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceIndex = posts.findIndex(p => (p.id || p._id) === sourceId);
    const targetIndex = posts.findIndex(p => (p.id || p._id) === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Swap the posts
    const newPosts = [...posts];
    [newPosts[sourceIndex], newPosts[targetIndex]] = [newPosts[targetIndex], newPosts[sourceIndex]];
    setGridPosts(newPosts);
  };

  // Handle replace/carousel drag (shift+drag) - show modal
  const handleReplaceOrCarouselDrag = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourcePost = posts.find(p => (p.id || p._id) === sourceId);
    const targetPost = posts.find(p => (p.id || p._id) === targetId);

    if (sourcePost && targetPost) {
      setDropSource(sourcePost);
      setDropTarget(targetPost);
      setShowDropModal(true);
    }
  };

  // Handle replace action
  const handleReplace = () => {
    if (!dropSource || !dropTarget) return;

    const sourceId = dropSource.id || dropSource._id;
    const targetId = dropTarget.id || dropTarget._id;

    // Get source images
    const sourceImages = dropSource.images || (dropSource.image ? [dropSource.image] : []);

    // Replace target with source content
    const newPosts = posts.map(p => {
      const postId = p.id || p._id;
      if (postId === targetId) {
        return {
          ...p,
          image: sourceImages[0] || dropSource.image,
          images: sourceImages.length > 1 ? sourceImages : undefined,
        };
      }
      return p;
    }).filter(p => (p.id || p._id) !== sourceId); // Remove source post

    setGridPosts(newPosts);
    setShowDropModal(false);
    setDropSource(null);
    setDropTarget(null);
  };

  // Handle carousel action
  const handleCreateCarousel = () => {
    if (!dropSource || !dropTarget) return;

    const sourceId = dropSource.id || dropSource._id;
    const targetId = dropTarget.id || dropTarget._id;

    // Collect all images from both posts
    const sourceImages = dropSource.images || (dropSource.image ? [dropSource.image] : []);
    const targetImages = dropTarget.images || (dropTarget.image ? [dropTarget.image] : []);
    const combinedImages = [...targetImages, ...sourceImages];

    // Update target to be a carousel and remove source
    const newPosts = posts.map(p => {
      const postId = p.id || p._id;
      if (postId === targetId) {
        return {
          ...p,
          image: combinedImages[0], // First image for backwards compatibility
          images: combinedImages,
        };
      }
      return p;
    }).filter(p => (p.id || p._id) !== sourceId); // Remove source post

    setGridPosts(newPosts);
    setShowDropModal(false);
    setDropSource(null);
    setDropTarget(null);
  };

  // Cancel drop action
  const handleCancelDrop = () => {
    setShowDropModal(false);
    setDropSource(null);
    setDropTarget(null);
    setDroppedFiles(null);
  };

  // State for file drops from Windows Explorer
  const [droppedFiles, setDroppedFiles] = useState(null);

  // Handle file drop from Windows Explorer onto a grid item
  const handleFileDrop = async (targetPostId, targetPost, files) => {
    // Convert files to data URLs
    const imagePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    const imageDataUrls = await Promise.all(imagePromises);

    // Create a fake "source" post representing the dropped files
    const fakeSource = {
      id: 'file-drop',
      images: imageDataUrls,
      image: imageDataUrls[0],
    };

    setDropSource(fakeSource);
    setDropTarget(targetPost);
    setDroppedFiles(imageDataUrls);
    setShowDropModal(true);
  };

  // Modified replace handler to handle file drops
  const handleReplaceWithCheck = () => {
    if (!dropSource || !dropTarget) return;

    const targetId = dropTarget.id || dropTarget._id;

    // Check if this is a file drop (source id is 'file-drop')
    if (dropSource.id === 'file-drop') {
      // Replace target with dropped file
      const newPosts = posts.map(p => {
        const postId = p.id || p._id;
        if (postId === targetId) {
          return {
            ...p,
            image: dropSource.images[0],
            images: dropSource.images.length > 1 ? dropSource.images : undefined,
          };
        }
        return p;
      });
      setGridPosts(newPosts);
    } else {
      // Original behavior for internal drags
      handleReplace();
      return;
    }

    setShowDropModal(false);
    setDropSource(null);
    setDropTarget(null);
    setDroppedFiles(null);
  };

  // Modified carousel handler to handle file drops
  const handleCreateCarouselWithCheck = () => {
    if (!dropSource || !dropTarget) return;

    const targetId = dropTarget.id || dropTarget._id;

    // Collect all images
    const sourceImages = dropSource.images || (dropSource.image ? [dropSource.image] : []);
    const targetImages = dropTarget.images || (dropTarget.image ? [dropTarget.image] : []);
    const combinedImages = [...targetImages, ...sourceImages];

    // Check if this is a file drop
    if (dropSource.id === 'file-drop') {
      // Add to carousel without removing any post
      const newPosts = posts.map(p => {
        const postId = p.id || p._id;
        if (postId === targetId) {
          return {
            ...p,
            image: combinedImages[0],
            images: combinedImages,
          };
        }
        return p;
      });
      setGridPosts(newPosts);
    } else {
      // Original behavior for internal drags
      handleCreateCarousel();
      return;
    }

    setShowDropModal(false);
    setDropSource(null);
    setDropTarget(null);
    setDroppedFiles(null);
  };

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
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 transition-colors ${activeTab === 'posts' ? 'border-b-2 border-dark-100 text-dark-100' : 'text-dark-500 hover:text-dark-300'}`}
        >
          <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          onClick={() => setActiveTab('reels')}
          className={`flex-1 py-3 transition-colors ${activeTab === 'reels' ? 'border-b-2 border-dark-100 text-dark-100' : 'text-dark-500 hover:text-dark-300'}`}
        >
          <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button
          onClick={() => setActiveTab('tagged')}
          className={`flex-1 py-3 transition-colors ${activeTab === 'tagged' ? 'border-b-2 border-dark-100 text-dark-100' : 'text-dark-500 hover:text-dark-300'}`}
        >
          <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>

      {/* Posts Tab Content */}
      {activeTab === 'posts' && (
        <>
          {/* Grid with Row Drag (via grip handle) and Item Drag (for replace/carousel) */}
          {/* This wrapper blocks parent overlay by setting flag, but lets items handle their own drops */}
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Set flag when entering preview grid - blocks parent overlay
              setInternalDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Keep flag set while dragging over preview grid
              setInternalDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Only clear flag if actually leaving the grid container entirely
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX;
              const y = e.clientY;
              if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                setInternalDragActive(false);
              }
            }}
            onDrop={(e) => {
              // This catches drops that miss all grid items (dropped on empty space)
              e.preventDefault();
              e.stopPropagation();
              setInternalDragActive(false);
              // Don't do anything else - drop was on empty space, not an item
            }}
          >
        {/* Row Drag and Drop */}
        <DndContext
          sensors={rowSensors}
          collisionDetection={closestCenter}
          onDragStart={handleRowDragStart}
          onDragEnd={handleRowDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col">
              {rows.map((row, rowIndex) => (
                <SortableRow key={`row-${rowIndex}`} rowId={`row-${rowIndex}`} rowIndex={rowIndex} showHandle={showRowHandles}>
                  <div
                    className="grid gap-0.5"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    }}
                  >
                    {row.map((post) => (
                      <DraggableGridItem
                        key={post.id || post._id}
                        post={post}
                        postId={post.id || post._id}
                        onDragStart={handleItemDragStart}
                        onReorder={handleReorder}
                        onReplaceOrCarousel={handleReplaceOrCarouselDrag}
                        onFileDrop={handleFileDrop}
                        isSelected={selectedItemId === (post.id || post._id)}
                        onSelect={handleSelectItem}
                        onDelete={handleDeleteRequest}
                      />
                    ))}
                  </div>
                </SortableRow>
              ))}
            </div>
          </SortableContext>

          {/* Row Drag Overlay */}
          <DragOverlay>
            {activeRow ? (
              <div className="flex items-center bg-dark-800/90 shadow-2xl rounded-lg border border-dark-600">
                <div className="flex items-center justify-center px-2 py-4">
                  <GripVertical className="w-5 h-5 text-dark-400" />
                </div>
                <div
                  className="grid gap-0.5 flex-1"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  }}
                >
                  {activeRow.map((post) => {
                    const images = post.images || (post.image ? [post.image] : []);
                    return (
                      <div
                        key={post.id || post._id}
                        className="aspect-square bg-dark-700 overflow-hidden relative"
                      >
                        {images.length > 0 ? (
                          <>
                            <img
                              src={images[0]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            {images.length > 1 && (
                              <div className="absolute top-1 right-1 bg-dark-900/70 rounded px-1 py-0.5 flex items-center gap-0.5">
                                <Layers className="w-2.5 h-2.5 text-white" />
                                <span className="text-[10px] text-white font-medium">{images.length}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{ backgroundColor: post.color || '#3f3f46' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

          {/* Empty State for Posts */}
          {posts.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-dark-400">No posts to preview</p>
            </div>
          )}
        </>
      )}

      {/* Reels Tab Content */}
      {activeTab === 'reels' && (
        <div
          className={`min-h-[300px] transition-colors relative ${
            isVideoDragOver
              ? 'bg-accent-purple/20 border-2 border-dashed border-accent-purple'
              : ''
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
                <svg className="w-16 h-16 text-accent-purple mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xl font-medium text-dark-100">Drop Video to Upload</p>
                <p className="text-sm text-dark-400 mt-2">MP4, MOV, AVI, or WebM</p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadingReel && (
            <div className="py-8 text-center">
              <div className="w-12 h-12 border-4 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin mx-auto mb-4" />
              <p className="text-dark-200">Uploading reel...</p>
            </div>
          )}

          {/* Reels Grid with Row Drag and Drop */}
          {!uploadingReel && reels.length > 0 && (
            <DndContext
              sensors={reelRowSensors}
              collisionDetection={closestCenter}
              onDragStart={handleReelRowDragStart}
              onDragEnd={handleReelRowDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={reelRowIds} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col">
                  {reelRows.map((row, rowIndex) => (
                    <SortableReelRow
                      key={`reel-row-${rowIndex}`}
                      rowId={`reel-row-${rowIndex}`}
                      rowIndex={rowIndex}
                      showHandle={showRowHandles}
                    >
                      <div className="grid grid-cols-3 gap-0.5">
                        {row.map((reel) => (
                          <DraggableReelItem
                            key={reel._id || reel.id}
                            reel={reel}
                            reelId={reel._id || reel.id}
                            onEdit={handleReelEdit}
                            onPlay={handleReelPlay}
                            onReorder={handleReelReorder}
                          />
                        ))}
                        {/* Fill empty cells in incomplete rows */}
                        {row.length < 3 &&
                          Array.from({ length: 3 - row.length }).map((_, i) => (
                            <div
                              key={`empty-reel-${rowIndex}-${i}`}
                              className="aspect-[9/16] bg-dark-700/30 rounded-lg border border-dashed border-dark-600"
                            />
                          ))}
                      </div>
                    </SortableReelRow>
                  ))}
                </div>
              </SortableContext>

              {/* Row Drag Overlay */}
              <DragOverlay>
                {reelRowDragActiveId ? (
                  <div className="flex items-center bg-dark-800/90 rounded-lg ring-2 ring-accent-purple shadow-xl">
                    <div className="px-2 py-8">
                      <GripVertical className="w-5 h-5 text-accent-purple" />
                    </div>
                    <div className="grid grid-cols-3 gap-0.5 flex-1">
                      {(() => {
                        const rowIndex = parseInt(reelRowDragActiveId.replace('reel-row-', ''));
                        const draggedRow = reelRows[rowIndex] || [];
                        return draggedRow.map((reel) => (
                          <div key={reel._id || reel.id} className="aspect-[9/16] bg-dark-700 overflow-hidden rounded">
                            <img
                              src={reel.thumbnailUrl || reel.mediaUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {/* Empty State */}
          {!uploadingReel && reels.length === 0 && !isVideoDragOver && (
            <div className="py-16 text-center">
              <svg className="w-16 h-16 text-dark-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-dark-400 text-lg font-medium mt-3">No Reels Yet</p>
              <p className="text-dark-500 text-sm">Drag a video here to upload</p>
            </div>
          )}
        </div>
      )}

      {/* Tagged Tab Content */}
      {activeTab === 'tagged' && (
        <div className="py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <svg className="w-16 h-16 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-dark-400 text-lg font-medium">No Tagged Photos</p>
            <p className="text-dark-500 text-sm">Photos you're tagged in will appear here</p>
          </div>
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

      {/* Replace/Carousel Modal */}
      {showDropModal && dropSource && dropTarget && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={handleCancelDrop}
        >
          <div
            className="bg-dark-800 rounded-2xl p-6 w-full max-w-sm border border-dark-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-dark-100">What would you like to do?</h3>
              <button onClick={handleCancelDrop} className="text-dark-400 hover:text-dark-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview of the two posts */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-dark-700 mb-2">
                  {(dropSource.images?.[0] || dropSource.image) ? (
                    <img
                      src={dropSource.images?.[0] || dropSource.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: dropSource.color || '#3f3f46' }}
                    />
                  )}
                </div>
                <p className="text-xs text-dark-400">{dropSource?.id === 'file-drop' ? 'New Image' : 'Dragged'}</p>
              </div>
              <div className="text-dark-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-dark-700 mb-2 relative">
                  {(dropTarget.images?.[0] || dropTarget.image) ? (
                    <>
                      <img
                        src={dropTarget.images?.[0] || dropTarget.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {dropTarget.images?.length > 1 && (
                        <div className="absolute top-1 right-1 bg-dark-900/70 rounded px-1 py-0.5 flex items-center gap-0.5">
                          <Layers className="w-2.5 h-2.5 text-white" />
                          <span className="text-[10px] text-white font-medium">{dropTarget.images.length}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: dropTarget.color || '#3f3f46' }}
                    />
                  )}
                </div>
                <p className="text-xs text-dark-400">Target</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleReplaceWithCheck}
                className="w-full flex items-center justify-center gap-3 py-3 bg-dark-700 hover:bg-dark-600 text-dark-100 rounded-lg transition-colors"
              >
                <Replace className="w-5 h-5" />
                <span className="font-medium">Replace Image</span>
              </button>
              <button
                onClick={handleCreateCarouselWithCheck}
                className="w-full flex items-center justify-center gap-3 py-3 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg transition-colors"
              >
                <Layers className="w-5 h-5" />
                <span className="font-medium">Create Carousel</span>
              </button>
              <button
                onClick={handleCancelDrop}
                className="w-full py-2 text-dark-400 hover:text-dark-200 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && itemToDelete && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={handleCancelDelete}
        >
          <div
            className="bg-dark-800 rounded-2xl p-6 w-full max-w-sm border border-dark-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-dark-100">Delete Image?</h3>
              <button onClick={handleCancelDelete} className="text-dark-400 hover:text-dark-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview of the image to delete */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-dark-700">
                {(itemToDelete.images?.[0] || itemToDelete.image) ? (
                  <img
                    src={itemToDelete.images?.[0] || itemToDelete.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{ backgroundColor: itemToDelete.color || '#3f3f46' }}
                  />
                )}
              </div>
            </div>

            <p className="text-dark-300 text-center mb-6">
              Are you sure you want to delete this image? This action cannot be undone.
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 py-2.5 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reel Editor Modal */}
      {showReelEditor && selectedReel && (
        <ReelEditor
          reel={selectedReel}
          onSave={handleSaveReelEdits}
          onDelete={handleDeleteReel}
          onClose={handleCloseReelEditor}
          onChangeThumbnail={handleOpenThumbnailSelector}
          onPlay={() => {
            setShowReelEditor(false);
            setShowReelPlayer(true);
          }}
        />
      )}

      {/* Reel Player Modal */}
      {showReelPlayer && selectedReel && (
        <ReelPlayer
          reel={selectedReel}
          onClose={handleCloseReelPlayer}
          onSelectThumbnail={handleOpenThumbnailSelector}
        />
      )}

      {/* Reel Thumbnail Selector Modal */}
      {showThumbnailSelector && selectedReel && (
        <ReelThumbnailSelector
          reel={selectedReel}
          videoFile={pendingReelUpload}
          onSave={handleSaveThumbnail}
          onClose={handleCloseThumbnailSelector}
        />
      )}
    </div>
  );
}

export default GridPreview;
