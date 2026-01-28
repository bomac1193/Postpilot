import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isInternalDragActive } from '../utils/dragState';
import { generateVideoThumbnail } from '../utils/videoUtils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useAppStore } from '../stores/useAppStore';
import { gridApi, contentApi, authApi } from '../lib/api';
import GridItem from '../components/grid/GridItem';
import GridPreview from '../components/grid/GridPreview';
import TikTokPreview from '../components/grid/TikTokPreview';
import PostDetails from '../components/grid/PostDetails';
import {
  Grid3X3,
  Grid2X2,
  LayoutGrid,
  Lock,
  Unlock,
  Download,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Instagram,
  Loader2,
  ChevronDown,
  FolderPlus,
  RefreshCw,
  Upload,
  ImagePlus,
  LogIn,
  AlertCircle,
  GripVertical,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  ZoomIn,
  ZoomOut,
  Minus,
  Pencil,
  Check,
  X,
  MoreVertical,
  Music2,
  Palette,
  Link2,
  Unlink,
} from 'lucide-react';

// Preset colors for grids
const GRID_COLORS = [
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

// TikTok icon component
function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  );
}

const GRID_LAYOUTS = [
  { id: '3x3', label: '3x3', cols: 3, icon: Grid3X3 },
  { id: '4x4', label: '4x4', cols: 4, icon: Grid2X2 },
  { id: '6x3', label: '6x3', cols: 3, icon: LayoutGrid },
];

function GridPlanner() {
  const navigate = useNavigate();
  const gridPosts = useAppStore((state) => state.gridPosts);
  const setGridPosts = useAppStore((state) => state.setGridPosts);
  const selectedPostId = useAppStore((state) => state.selectedPostId);
  const selectPost = useAppStore((state) => state.selectPost);
  const removeFromGrid = useAppStore((state) => state.removeFromGrid);

  // Grid metadata (colors/rollout assignments)
  const gridMeta = useAppStore((state) => state.gridMeta);
  const updateGridColor = useAppStore((state) => state.updateGridColor);
  const assignGridToRollout = useAppStore((state) => state.assignGridToRollout);
  const unassignGridFromRollout = useAppStore((state) => state.unassignGridFromRollout);

  // Rollouts for assignment
  const rollouts = useAppStore((state) => state.rollouts);

  // Current profile for filtering
  const currentProfileId = useAppStore((state) => state.currentProfileId);

  // Backend state
  const [grids, setGrids] = useState([]);
  const [currentGridId, setCurrentGridId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGridSelector, setShowGridSelector] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  // Grid editing state
  const [editingGridId, setEditingGridId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showColorPickerFor, setShowColorPickerFor] = useState(null);
  const [showRolloutPickerFor, setShowRolloutPickerFor] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await authApi.getMe();
          setUser(data.user);
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Auth check failed:', err);
          setIsAuthenticated(false);
          localStorage.removeItem('token');
        }
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const [activeLayout, setActiveLayout] = useState('3x3');
  const [isLocked, setIsLocked] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [gridZoom, setGridZoom] = useState(100); // Zoom percentage (50-150)
  const [showRowHandles, setShowRowHandles] = useState(false); // Toggle for row drag handles in preview (default off for post preview mode)
  const [selectedPlatform, setSelectedPlatform] = useState('instagram'); // 'instagram' | 'tiktok'
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);

  // Drag-drop upload state
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const dragCounterRef = useRef(0);

  // Reels state from store
  const addReel = useAppStore((state) => state.addReel);

  // Load a specific grid's content (defined first since fetchGrids depends on it)
  const loadGridContent = useCallback(async (grid) => {
    console.log('[loadGridContent] Called with grid:', grid?._id, 'cells:', grid?.cells?.length);
    if (!grid || !grid.cells) {
      console.log('[loadGridContent] No grid or cells, clearing posts');
      setGridPosts([]);
      return;
    }

    // Set layout based on columns
    const layoutId = grid.columns === 4 ? '4x4' : grid.columns === 3 ? '3x3' : '3x3';
    setActiveLayout(layoutId);

    // Transform cells to posts format
    const posts = [];
    for (const cell of grid.cells) {
      if (!cell.isEmpty && cell.contentId) {
        // contentId might be populated or just an ID
        const content = typeof cell.contentId === 'object' ? cell.contentId : null;
        console.log('[loadGridContent] Cell at', cell.position, 'contentId type:', typeof cell.contentId, 'populated:', !!content, 'mediaUrl:', content?.mediaUrl);
        // Get carousel images or fall back to single image
        const carouselImages = content?.carouselImages?.length > 0 ? content.carouselImages : null;
        const mainImage = carouselImages?.[0] || content?.mediaUrl || null;
        posts.push({
          id: content?._id || cell.contentId,
          image: mainImage,
          images: carouselImages || (mainImage ? [mainImage] : []),
          caption: content?.caption || content?.title || '',
          hashtags: content?.hashtags || [],
          color: '#8b5cf6',
          mediaType: content?.mediaType || 'image',
          gridPosition: cell.position?.row * (grid.columns || 3) + cell.position?.col,
          crop: cell.crop,
        });
      }
    }

    // Sort by grid position
    posts.sort((a, b) => (a.gridPosition || 0) - (b.gridPosition || 0));
    console.log('[loadGridContent] Setting', posts.length, 'posts:', posts.map(p => ({ id: p.id, image: p.image?.substring(0, 50) })));
    setGridPosts(posts);
  }, [setGridPosts]);

  // Fetch all grids from backend
  const fetchGrids = useCallback(async () => {
    console.log('[GridPlanner] fetchGrids called, currentProfileId:', currentProfileId);
    setLoading(true);
    setError(null);
    try {
      // Pass currentProfileId to filter grids by profile
      const data = await gridApi.getAll(currentProfileId);
      console.log('[GridPlanner] API response:', data);
      const gridList = Array.isArray(data) ? data : data.grids || [];
      console.log('[GridPlanner] Parsed gridList:', gridList.length, 'grids');

      // If we have grids, select the first one (or active one)
      if (gridList.length > 0) {
        const activeGrid = gridList.find(g => g.isActive) || gridList[0];
        setCurrentGridId(activeGrid._id);
        await loadGridContent(activeGrid);
      } else {
        setGridPosts([]);
      }
    } catch (err) {
      console.error('Failed to fetch grids:', err);
      setError(err.message || 'Failed to load grids');
    } finally {
      setLoading(false);
    }
  }, [setGridPosts, loadGridContent, currentProfileId]);

  // Refresh current grid from server
  const refreshCurrentGrid = useCallback(async () => {
    if (!currentGridId) return;
    try {
      const response = await gridApi.getById(currentGridId);
      const freshGrid = response.grid || response;
      await loadGridContent(freshGrid);
      // Update local grids array with fresh data
      setGrids(prev => prev.map(g => g._id === freshGrid._id ? freshGrid : g));
    } catch (err) {
      console.error('Failed to refresh grid:', err);
    }
  }, [currentGridId, loadGridContent]);

  // Select a different grid - fetch fresh data from server
  const handleSelectGrid = async (grid) => {
    setCurrentGridId(grid._id);
    setShowGridSelector(false);
    try {
      // Fetch fresh grid data from server to get latest content
      const response = await gridApi.getById(grid._id);
      const freshGrid = response.grid || response;
      await loadGridContent(freshGrid);
      // Update local grids array with fresh data
      setGrids(prev => prev.map(g => g._id === freshGrid._id ? freshGrid : g));
    } catch (err) {
      console.error('Failed to fetch grid:', err);
      // Fall back to cached data
      await loadGridContent(grid);
    }
  };

  // Create a new grid
  const handleCreateGrid = async () => {
    try {
      const newGrid = await gridApi.create({
        name: `Grid ${grids.length + 1}`,
        platform: 'instagram',
        columns: 3,
        profileId: currentProfileId || undefined, // Associate with current profile
      });
      setGrids([...grids, newGrid]);
      setCurrentGridId(newGrid._id);
      setGridPosts([]);
      setShowGridSelector(false);
    } catch (err) {
      console.error('Failed to create grid:', err);
    }
  };

  // Start editing a grid name
  const handleStartRename = (e, grid) => {
    e.stopPropagation();
    setEditingGridId(grid._id);
    setEditingName(grid.name);
  };

  // Save the renamed grid
  const handleSaveRename = async (e, gridId) => {
    e.stopPropagation();
    if (!editingName.trim()) {
      setEditingGridId(null);
      return;
    }

    try {
      await gridApi.update(gridId, { name: editingName.trim() });
      setGrids(grids.map(g =>
        g._id === gridId ? { ...g, name: editingName.trim() } : g
      ));
      setEditingGridId(null);
    } catch (err) {
      console.error('Failed to rename grid:', err);
    }
  };

  // Cancel editing
  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingGridId(null);
    setEditingName('');
  };

  // Delete a grid
  const handleDeleteGrid = async (e, gridId) => {
    e.stopPropagation();

    try {
      await gridApi.delete(gridId);
      const updatedGrids = grids.filter(g => g._id !== gridId);
      setGrids(updatedGrids);

      // If we deleted the current grid, switch to another one
      if (currentGridId === gridId) {
        if (updatedGrids.length > 0) {
          setCurrentGridId(updatedGrids[0]._id);
          await loadGridContent(updatedGrids[0]);
        } else {
          setCurrentGridId(null);
          setGridPosts([]);
        }
      }

      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete grid:', err);
    }
  };

  // Handle color selection for grid
  const handleGridColorSelect = useCallback((e, gridId, color) => {
    e.stopPropagation();
    updateGridColor(gridId, color);
    setShowColorPickerFor(null);
  }, [updateGridColor]);

  // Handle rollout assignment for grid
  const handleAssignGridToRollout = useCallback((e, gridId, rolloutId, sectionId) => {
    e.stopPropagation();
    assignGridToRollout(gridId, rolloutId, sectionId);
    setShowRolloutPickerFor(null);
  }, [assignGridToRollout]);

  // Handle unassign grid from rollout
  const handleUnassignGridFromRollout = useCallback((e, gridId) => {
    e.stopPropagation();
    unassignGridFromRollout(gridId);
    setShowRolloutPickerFor(null);
  }, [unassignGridFromRollout]);

  // Get rollout and section info for a grid
  const getGridRolloutInfo = useCallback((gridId) => {
    const meta = gridMeta[gridId];
    if (!meta?.rolloutId || !meta?.sectionId) return null;
    const rollout = rollouts.find(r => r.id === meta.rolloutId);
    if (!rollout) return null;
    const section = rollout.sections.find(s => s.id === meta.sectionId);
    if (!section) return null;
    return { rollout, section };
  }, [gridMeta, rollouts]);

  useEffect(() => {
    console.log('[GridPlanner] Initial mount, isAuthenticated:', isAuthenticated);
    fetchGrids();
  }, [fetchGrids]);

  // Refetch grids when profile changes
  useEffect(() => {
    // Always refetch when profile changes (including when it becomes set for the first time)
    console.log('[GridPlanner] Profile changed to:', currentProfileId);
    fetchGrids();
  }, [currentProfileId]); // eslint-disable-line react-hooks-exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event) => {
    if (isLocked) return;
    setActiveId(event.active.id);
  }, [isLocked]);

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (isLocked || !over || active.id === over.id) return;

    const oldIndex = gridPosts.findIndex((p) => p.id === active.id);
    const newIndex = gridPosts.findIndex((p) => p.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newPosts = arrayMove(gridPosts, oldIndex, newIndex);
      const updatedPosts = newPosts.map((p, i) => ({ ...p, gridPosition: i }));
      setGridPosts(updatedPosts);

      // Save reorder to backend
      if (currentGridId) {
        try {
          await gridApi.reorder(currentGridId, updatedPosts.map((p, i) => ({
            contentId: p.id,
            position: i,
          })));
        } catch (err) {
          console.error('Failed to save reorder:', err);
        }
      }
    }
  }, [isLocked, gridPosts, setGridPosts, currentGridId]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const activePost = activeId ? gridPosts.find((p) => p.id === activeId || p._id === activeId) : null;
  const selectedPost = selectedPostId ? gridPosts.find((p) => p.id === selectedPostId || p._id === selectedPostId) : null;
  const currentLayout = GRID_LAYOUTS.find((l) => l.id === activeLayout);
  const currentGrid = grids.find(g => g._id === currentGridId);

  const handleAddDemoPost = () => {
    const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f97316', '#ec4899'];
    const newPost = {
      id: crypto.randomUUID(),
      image: null,
      caption: '',
      color: colors[gridPosts.length % colors.length],
      createdAt: Date.now(),
      gridPosition: gridPosts.length,
    };
    setGridPosts([...gridPosts, newPost]);
  };

  // Handle delete - remove from backend AND local state
  const handleDeletePost = useCallback(async (postId) => {
    // Remove from local state immediately for responsiveness
    removeFromGrid(postId);

    // Remove from backend
    if (currentGridId) {
      try {
        await gridApi.removeContent(currentGridId, postId);
      } catch (err) {
        console.error('Failed to remove from grid:', err);
        // Optionally: refetch grid to sync state if delete failed
      }
    }
  }, [currentGridId, removeFromGrid]);

  const handleExport = async (format) => {
    // Export grid as image
    console.log('Exporting as', format);
  };

  // Group posts into rows for row-based operations
  const getRows = useCallback(() => {
    const cols = currentLayout?.cols || 3;
    const rows = [];
    for (let i = 0; i < gridPosts.length; i += cols) {
      rows.push(gridPosts.slice(i, i + cols));
    }
    return rows;
  }, [gridPosts, currentLayout]);

  // Move an entire row up or down
  const handleMoveRow = useCallback(async (rowIndex, direction) => {
    const cols = currentLayout?.cols || 3;
    const rows = getRows();

    const targetIndex = direction === 'up' ? rowIndex - 1 : rowIndex + 1;

    // Check bounds
    if (targetIndex < 0 || targetIndex >= rows.length) return;

    // Swap the rows
    const newRows = [...rows];
    [newRows[rowIndex], newRows[targetIndex]] = [newRows[targetIndex], newRows[rowIndex]];

    // Flatten back to posts array and update positions
    const newPosts = newRows.flat().map((post, i) => ({
      ...post,
      gridPosition: i,
    }));

    setGridPosts(newPosts);

    // Save to backend
    if (currentGridId) {
      try {
        await gridApi.reorder(currentGridId, newPosts.map((p, i) => ({
          contentId: p.id,
          position: i,
        })));
      } catch (err) {
        console.error('Failed to save row reorder:', err);
      }
    }
  }, [currentLayout, getRows, setGridPosts, currentGridId]);

  // Helper to add delay between uploads
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Handle file drop for batch upload
  const handleFileDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
    setIsDraggingVideo(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer?.files || []);
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    // Handle video files - upload as reels
    if (videoFiles.length > 0) {
      setUploading(true);
      setUploadProgress({ current: 0, total: videoFiles.length });

      for (let i = 0; i < videoFiles.length; i++) {
        const videoFile = videoFiles[i];
        setUploadProgress({ current: i + 1, total: videoFiles.length });

        try {
          // Generate thumbnail
          const { thumbnailBlob, duration, width, height, isVertical } =
            await generateVideoThumbnail(videoFile);

          // Upload video with thumbnail as reel
          const result = await contentApi.uploadReel(videoFile, thumbnailBlob, {
            title: videoFile.name.replace(/\.[^/.]+$/, ''),
            mediaType: 'video',
            duration,
            width,
            height,
            isReel: true,
            recommendedType: isVertical ? 'reel' : 'video'
          });

          // Add to reels state
          if (result.content) {
            addReel(result.content);
          } else {
            addReel(result);
          }
        } catch (err) {
          console.error('Reel upload failed for', videoFile.name, err);
        }
      }

      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });

      // If only videos were dropped, we're done
      if (imageFiles.length === 0) return;
    }

    // Handle image files - add to grid
    if (imageFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: imageFiles.length });

    // Ensure we have a grid - create one if needed
    let gridId = currentGridId;
    let cols = currentLayout?.cols || 3;

    if (!gridId && isAuthenticated) {
      try {
        const newGrid = await gridApi.create({
          name: 'My Grid',
          platform: 'instagram',
          columns: cols,
          totalRows: Math.ceil(imageFiles.length / cols) + 3,
          profileId: currentProfileId || undefined, // Associate with current profile
        });
        const createdGrid = newGrid.grid || newGrid;
        gridId = createdGrid._id;
        setCurrentGridId(gridId);
        setGrids(prev => [...prev, createdGrid]);
      } catch (err) {
        console.error('Failed to create grid:', err);
      }
    }

    const newPosts = [];
    const startPosition = gridPosts.length;

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      setUploadProgress({ current: i + 1, total: imageFiles.length });

      try {
        // Upload to backend
        const result = await contentApi.upload(file, {
          title: file.name.replace(/\.[^/.]+$/, ''),
          mediaType: file.type.startsWith('video/') ? 'video' : 'image',
        });

        // Add to grid
        const content = result.content || result;
        const position = startPosition + newPosts.length;
        const row = Math.floor(position / cols);
        const col = position % cols;

        newPosts.push({
          id: content._id,
          image: content.mediaUrl,
          images: content.carouselImages?.length > 0 ? content.carouselImages : [content.mediaUrl],
          caption: content.caption || content.title || '',
          hashtags: content.hashtags || [],
          color: '#8b5cf6',
          mediaType: content.mediaType || 'image',
          gridPosition: position,
        });

        // Add content to grid cell
        if (gridId && content._id) {
          try {
            await gridApi.addContent(gridId, content._id, { row, col });
          } catch (err) {
            console.error('Failed to add to grid:', err);
          }
        }

        // Add delay between uploads to avoid rate limiting (500ms)
        if (i < imageFiles.length - 1) {
          await delay(500);
        }
      } catch (err) {
        console.error('Upload failed for', file.name, err);
        // If rate limited, wait longer and retry
        if (err.response?.status === 429) {
          await delay(2000);
          i--; // Retry this file
        }
      }
    }

    // Update grid posts
    if (newPosts.length > 0) {
      console.log('[handleFileDrop] Uploaded', newPosts.length, 'files, refreshing from server...');
      // Refresh from server to ensure state is synced - load the actual server data
      if (gridId) {
        try {
          const response = await gridApi.getById(gridId);
          const freshGrid = response.grid || response;
          console.log('[handleFileDrop] Got fresh grid from server, cells:', freshGrid?.cells?.length);
          setGrids(prev => prev.map(g => g._id === freshGrid._id ? freshGrid : g));
          // IMPORTANT: Reload the posts from the fresh server data
          await loadGridContent(freshGrid);
        } catch (err) {
          console.error('Failed to refresh grid after upload:', err);
          // Fall back to using local data if server refresh fails
          setGridPosts([...gridPosts, ...newPosts]);
        }
      } else {
        // No grid ID - just use local data
        setGridPosts([...gridPosts, ...newPosts]);
      }
    }

    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });
  }, [gridPosts, setGridPosts, currentGridId, currentLayout, grids, isAuthenticated, addReel, loadGridContent]);

  // Helper to check if any items in dataTransfer are videos
  const hasVideoFiles = useCallback((dataTransfer) => {
    if (!dataTransfer?.items) return false;
    for (const item of dataTransfer.items) {
      if (item.kind === 'file' && item.type.startsWith('video/')) {
        return true;
      }
    }
    return false;
  }, []);

  // Drag event handlers
  const handleDragOver = useCallback((e) => {
    // Check global flag first - ignore internal preview drags
    if (isInternalDragActive()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      const isVideo = hasVideoFiles(e.dataTransfer);
      setIsDraggingFiles(true);
      setIsDraggingVideo(isVideo);
    }
  }, [hasVideoFiles]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    // Only set to false if we're leaving the drop zone entirely
    if (dragCounterRef.current === 0) {
      setIsDraggingFiles(false);
      setIsDraggingVideo(false);
    }
  }, []);

  const handleDragEnter = useCallback((e) => {
    // Check global flag first - ignore internal preview drags
    if (isInternalDragActive()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer?.types?.includes('Files')) {
      const isVideo = hasVideoFiles(e.dataTransfer);
      setIsDraggingFiles(true);
      setIsDraggingVideo(isVideo);
    }
  }, [hasVideoFiles]);

  // File input handler for click-to-upload
  const handleFileInputChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Create a fake drop event
      const fakeEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        dataTransfer: { files },
      };
      handleFileDrop(fakeEvent);
    }
    // Reset input
    e.target.value = '';
  }, [handleFileDrop]);

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="h-full flex gap-6 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDragEnter={handleDragEnter}
      onDrop={handleFileDrop}
    >
      {/* Drop Overlay */}
      {isDraggingFiles && (
        <div className="absolute inset-0 z-50 bg-dark-900/90 backdrop-blur-sm flex items-center justify-center rounded-2xl border-2 border-dashed border-accent-purple">
          <div className="text-center">
            {isDraggingVideo ? (
              <>
                <svg className="w-16 h-16 text-accent-purple mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xl font-semibold text-dark-100 mb-2">Drop Video to Upload</p>
                <p className="text-dark-400">Release to upload as a Reel</p>
              </>
            ) : (
              <>
                <ImagePlus className="w-16 h-16 text-accent-purple mx-auto mb-4" />
                <p className="text-xl font-semibold text-dark-100 mb-2">Drop images here</p>
                <p className="text-dark-400">Release to upload and add to grid</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="absolute inset-0 z-50 bg-dark-900/90 backdrop-blur-sm flex items-center justify-center rounded-2xl">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-accent-purple mx-auto mb-4 animate-spin" />
            <p className="text-lg font-semibold text-dark-100 mb-2">
              Uploading {uploadProgress.current} of {uploadProgress.total}
            </p>
            <div className="w-64 h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-purple transition-all duration-300"
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
            {/* Grid Selector */}
            <div className="relative">
              <button
                onClick={() => setShowGridSelector(!showGridSelector)}
                className="flex items-center gap-2 px-3 py-2 bg-dark-800 rounded-lg text-dark-200 hover:bg-dark-700 transition-colors"
              >
                <LayoutGrid className="w-4 h-4 text-accent-purple" />
                <span className="text-sm max-w-32 truncate">
                  {currentGrid?.name || 'Select Grid'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showGridSelector ? 'rotate-180' : ''}`} />
              </button>

              {showGridSelector && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-dark-700 rounded-lg shadow-xl border border-dark-600 z-20">
                  <div className="p-2 border-b border-dark-600">
                    <p className="text-xs text-dark-400 uppercase tracking-wide">Your Collections ({grids.length}) {loading ? '(loading...)' : ''}</p>
                    {console.log('[Dropdown] Rendering with grids:', grids.length, 'loading:', loading, grids)}
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {grids.map((grid) => (
                      <div
                        key={grid._id}
                        className={`group relative ${
                          currentGridId === grid._id
                            ? 'bg-accent-purple/20'
                            : 'hover:bg-dark-600'
                        }`}
                      >
                        {/* Editing Mode */}
                        {editingGridId === grid._id ? (
                          <div className="px-3 py-2 flex items-center gap-2">
                            <Grid3X3 className="w-4 h-4 text-dark-400 flex-shrink-0" />
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(e, grid._id);
                                if (e.key === 'Escape') handleCancelRename(e);
                              }}
                              className="flex-1 bg-dark-800 border border-dark-500 rounded px-2 py-1 text-sm text-dark-100 focus:outline-none focus:border-accent-purple"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => handleSaveRename(e, grid._id)}
                              className="p-1 text-green-400 hover:bg-dark-500 rounded"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelRename}
                              className="p-1 text-dark-400 hover:bg-dark-500 rounded"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : showDeleteConfirm === grid._id ? (
                          /* Delete Confirmation */
                          <div className="px-3 py-2">
                            <p className="text-sm text-dark-200 mb-2">Delete "{grid.name}"?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => handleDeleteGrid(e, grid._id)}
                                className="flex-1 px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                              >
                                Delete
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(null); }}
                                className="flex-1 px-2 py-1 text-xs bg-dark-600 text-dark-300 rounded hover:bg-dark-500"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Normal View */
                          <>
                            <button
                              onClick={() => handleSelectGrid(grid)}
                              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                                currentGridId === grid._id
                                  ? 'text-accent-purple'
                                  : 'text-dark-200'
                              }`}
                            >
                              {/* Color dot */}
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0 border border-dark-500"
                                style={{ backgroundColor: gridMeta[grid._id]?.color || '#6b7280' }}
                              />
                              <Grid3X3 className="w-4 h-4 flex-shrink-0" />
                              <span className="flex-1 truncate">{grid.name}</span>
                              <span className="text-xs text-dark-500 mr-1">
                                {grid.cells?.filter(c => !c.isEmpty).length || 0}
                              </span>

                              {/* Action Buttons - show on hover */}
                              <div className="hidden group-hover:flex items-center gap-1">
                                {/* Color picker button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowColorPickerFor(showColorPickerFor === grid._id ? null : grid._id);
                                    setShowRolloutPickerFor(null);
                                  }}
                                  className="p-1 text-dark-400 hover:text-accent-purple hover:bg-dark-500 rounded"
                                  title="Set Color"
                                >
                                  <Palette className="w-3.5 h-3.5" />
                                </button>
                                {/* Rollout assignment button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowRolloutPickerFor(showRolloutPickerFor === grid._id ? null : grid._id);
                                    setShowColorPickerFor(null);
                                  }}
                                  className={`p-1 hover:bg-dark-500 rounded ${
                                    gridMeta[grid._id]?.rolloutId ? 'text-green-400' : 'text-dark-400 hover:text-accent-purple'
                                  }`}
                                  title={gridMeta[grid._id]?.rolloutId ? 'Change Rollout' : 'Assign to Rollout'}
                                >
                                  {gridMeta[grid._id]?.rolloutId ? <Link2 className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={(e) => handleStartRename(e, grid)}
                                  className="p-1 text-dark-400 hover:text-accent-purple hover:bg-dark-500 rounded"
                                  title="Rename"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(grid._id); }}
                                className="p-1 text-dark-400 hover:text-red-400 hover:bg-dark-500 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </button>

                            {/* Rollout info badge */}
                            {getGridRolloutInfo(grid._id) && (
                              <div className="px-3 pb-2 -mt-1">
                                <div
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                                  style={{
                                    backgroundColor: `${getGridRolloutInfo(grid._id).section.color}20`,
                                    color: getGridRolloutInfo(grid._id).section.color
                                  }}
                                >
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getGridRolloutInfo(grid._id).section.color }} />
                                  {getGridRolloutInfo(grid._id).rollout.name} → {getGridRolloutInfo(grid._id).section.name}
                                </div>
                              </div>
                            )}

                            {/* Color Picker Dropdown */}
                            {showColorPickerFor === grid._id && (
                              <div className="absolute left-full top-0 ml-1 w-36 bg-dark-900 border border-dark-600 rounded-lg shadow-xl z-50 p-2" onClick={(e) => e.stopPropagation()}>
                                <p className="text-xs text-dark-400 mb-2 px-1">Select Color</p>
                                <div className="grid grid-cols-5 gap-1">
                                  {GRID_COLORS.map((color) => (
                                    <button
                                      key={color.id}
                                      onClick={(e) => handleGridColorSelect(e, grid._id, color.value)}
                                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                                        gridMeta[grid._id]?.color === color.value ? 'border-white' : 'border-transparent'
                                      }`}
                                      style={{ backgroundColor: color.value }}
                                      title={color.name}
                                    />
                                  ))}
                                </div>
                                <button
                                  onClick={(e) => handleGridColorSelect(e, grid._id, null)}
                                  className="w-full mt-2 px-2 py-1 text-xs text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded"
                                >
                                  Clear Color
                                </button>
                              </div>
                            )}

                            {/* Rollout Picker Dropdown */}
                            {showRolloutPickerFor === grid._id && (
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
                                            onClick={(e) => handleAssignGridToRollout(e, grid._id, rollout.id, section.id)}
                                            className={`w-full flex items-center gap-2 px-2 py-1.5 text-left rounded hover:bg-dark-700 ${
                                              gridMeta[grid._id]?.sectionId === section.id ? 'bg-dark-700' : ''
                                            }`}
                                          >
                                            <span
                                              className="w-3 h-3 rounded-full flex-shrink-0"
                                              style={{ backgroundColor: section.color || '#6b7280' }}
                                            />
                                            <span className="text-xs text-dark-200 truncate">{section.name}</span>
                                            {gridMeta[grid._id]?.sectionId === section.id && (
                                              <Check className="w-3 h-3 text-green-400 ml-auto" />
                                            )}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  ))
                                )}
                                {gridMeta[grid._id]?.rolloutId && (
                                  <button
                                    onClick={(e) => handleUnassignGridFromRollout(e, grid._id)}
                                    className="w-full mt-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/20 rounded flex items-center gap-2"
                                  >
                                    <Unlink className="w-3 h-3" />
                                    Remove from Rollout
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {grids.length === 0 && !loading && (
                      <p className="px-3 py-4 text-sm text-dark-400 text-center">No collections yet</p>
                    )}
                    {grids.length === 0 && loading && (
                      <div className="px-3 py-4 flex justify-center">
                        <Loader2 className="w-5 h-5 text-dark-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 border-t border-dark-600">
                    <button
                      onClick={handleCreateGrid}
                      className="w-full px-3 py-2 text-sm text-accent-purple hover:bg-dark-600 rounded-md flex items-center gap-2"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Create New Collection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Collection Actions */}
            <div className="flex items-center gap-1">
              <button onClick={fetchGrids} className="btn-icon" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>

              {currentGrid && (
                <>
                  <button
                    onClick={(e) => handleStartRename(e, currentGrid)}
                    className="btn-icon"
                    title="Rename Collection"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(currentGrid._id); }}
                    className="btn-icon hover:text-red-400"
                    title="Delete Collection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Inline Rename Modal */}
            {editingGridId && !showGridSelector && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancelRename}>
                <div className="bg-dark-800 rounded-xl p-4 w-80 border border-dark-600" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-sm font-medium text-dark-200 mb-3">Rename Collection</h3>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(e, editingGridId);
                      if (e.key === 'Escape') handleCancelRename(e);
                    }}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-purple mb-3"
                    autoFocus
                    placeholder="Collection name"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelRename}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => handleSaveRename(e, editingGridId)}
                      className="flex-1 btn-primary"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && !showGridSelector && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(null)}>
                <div className="bg-dark-800 rounded-xl p-4 w-80 border border-dark-600" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-sm font-medium text-dark-200 mb-2">Delete Collection</h3>
                  <p className="text-dark-400 text-sm mb-4">
                    Are you sure you want to delete "{grids.find(g => g._id === showDeleteConfirm)?.name}"? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => handleDeleteGrid(e, showDeleteConfirm)}
                      className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Layout Selector */}
            <div className="flex items-center gap-1 p-1 bg-dark-800 rounded-lg">
              {GRID_LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => setActiveLayout(layout.id)}
                  className={`p-2 rounded-md transition-colors ${
                    activeLayout === layout.id
                      ? 'bg-accent-purple text-white'
                      : 'text-dark-400 hover:text-dark-200'
                  }`}
                  title={layout.label}
                >
                  <layout.icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            {/* Lock Toggle */}
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isLocked
                  ? 'bg-accent-orange/20 text-accent-orange'
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

            {/* Row Handles Toggle (for Preview mode) */}
            <button
              onClick={() => setShowRowHandles(!showRowHandles)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showRowHandles
                  ? 'bg-accent-purple/20 text-accent-purple'
                  : 'bg-dark-700 text-dark-300 hover:text-dark-100'
              }`}
              title={showRowHandles ? 'Hide row handles' : 'Show row handles'}
            >
              <GripVertical className="w-4 h-4" />
              {showRowHandles ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Platform Selector */}
            <div className="relative">
              <button
                onClick={() => setShowPlatformSelector(!showPlatformSelector)}
                className="flex items-center gap-2 px-3 py-2 bg-dark-800 rounded-lg text-dark-200 hover:bg-dark-700 transition-colors border border-dark-600"
              >
                {selectedPlatform === 'instagram' ? (
                  <Instagram className="w-4 h-4 text-pink-500" />
                ) : (
                  <TikTokIcon className="w-4 h-4" />
                )}
                <span className="text-sm capitalize">{selectedPlatform}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showPlatformSelector ? 'rotate-180' : ''}`} />
              </button>

              {showPlatformSelector && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-dark-700 rounded-lg shadow-xl border border-dark-600 z-20 overflow-hidden">
                  <button
                    onClick={() => { setSelectedPlatform('instagram'); setShowPlatformSelector(false); }}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${
                      selectedPlatform === 'instagram'
                        ? 'bg-accent-purple/20 text-accent-purple'
                        : 'text-dark-200 hover:bg-dark-600'
                    }`}
                  >
                    <Instagram className="w-5 h-5 text-pink-500" />
                    <div>
                      <span className="font-medium">Instagram</span>
                      <p className="text-xs text-dark-400">Posts, Reels, Stories</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setSelectedPlatform('tiktok'); setShowPlatformSelector(false); }}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${
                      selectedPlatform === 'tiktok'
                        ? 'bg-accent-purple/20 text-accent-purple'
                        : 'text-dark-200 hover:bg-dark-600'
                    }`}
                  >
                    <TikTokIcon className="w-5 h-5" />
                    <div>
                      <span className="font-medium">TikTok</span>
                      <p className="text-xs text-dark-400">Videos, Sounds</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Preview Toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showPreview
                  ? 'bg-accent-purple/20 text-accent-purple'
                  : 'bg-dark-700 text-dark-300 hover:text-dark-100'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm">Preview</span>
            </button>

            {/* Export */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 bg-dark-700 text-dark-300 hover:text-dark-100 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                <span className="text-sm">Export</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-40 bg-dark-700 rounded-lg shadow-xl border border-dark-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('png')}
                  className="w-full px-4 py-2 text-left text-sm text-dark-200 hover:bg-dark-600 rounded-t-lg"
                >
                  Export as PNG
                </button>
                <button
                  onClick={() => handleExport('jpg')}
                  className="w-full px-4 py-2 text-left text-sm text-dark-200 hover:bg-dark-600 rounded-b-lg"
                >
                  Export as JPG
                </button>
              </div>
            </div>

            {/* Upload Images */}
            <label className="btn-primary cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400">
            {error}
            <button onClick={fetchGrids} className="ml-4 underline">
              Retry
            </button>
          </div>
        )}

        {/* Login Required Banner */}
        {!isAuthenticated && (
          <div className="mb-4 p-4 bg-accent-purple/20 border border-accent-purple/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-accent-purple flex-shrink-0" />
            <div className="flex-1">
              <p className="text-dark-100 font-medium">Sign in to save your grids</p>
              <p className="text-sm text-dark-400">Your uploads won't be saved until you log in</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          {showPreview ? (
            selectedPlatform === 'tiktok' ? (
              <TikTokPreview showRowHandles={showRowHandles} />
            ) : (
              <GridPreview posts={gridPosts} layout={currentLayout} showRowHandles={showRowHandles} onDeletePost={handleDeletePost} gridId={currentGridId} onGridChange={refreshCurrentGrid} />
            )
          ) : (
            <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
              {/* Platform Header Mock */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-dark-700">
                <div className={`w-10 h-10 rounded-full ${
                  selectedPlatform === 'tiktok'
                    ? 'bg-gradient-to-br from-cyan-400 to-pink-500'
                    : 'bg-gradient-to-br from-accent-purple to-accent-pink'
                }`} />
                <div>
                  <p className="text-sm font-medium text-dark-100">
                    {selectedPlatform === 'tiktok' ? '@your_username' : 'your_username'}
                  </p>
                  <p className="text-xs text-dark-400">
                    {selectedPlatform === 'tiktok' ? 'TikTok Preview' : 'Instagram Preview'}
                  </p>
                </div>
                {selectedPlatform === 'tiktok' ? (
                  <TikTokIcon className="w-5 h-5 text-dark-400 ml-auto" />
                ) : (
                  <Instagram className="w-5 h-5 text-dark-400 ml-auto" />
                )}
              </div>

              {/* Grid with Row Controls */}
              <div
                className="transition-all duration-200 mx-auto"
                style={{ maxWidth: `${gridZoom}%` }}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext
                    items={gridPosts.map((p) => p.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="space-y-1">
                      {getRows().map((row, rowIndex) => (
                        <div key={rowIndex} className="flex items-center gap-2 group/row">
                        {/* Row Controls */}
                        <div className="flex flex-col gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleMoveRow(rowIndex, 'up')}
                            disabled={rowIndex === 0 || isLocked}
                            className={`p-1 rounded transition-colors ${
                              rowIndex === 0 || isLocked
                                ? 'text-dark-600 cursor-not-allowed'
                                : 'text-dark-400 hover:text-accent-purple hover:bg-dark-700'
                            }`}
                            title="Move row up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <div className="px-1 text-xs text-dark-500 text-center font-medium">
                            {rowIndex + 1}
                          </div>
                          <button
                            onClick={() => handleMoveRow(rowIndex, 'down')}
                            disabled={rowIndex === getRows().length - 1 || isLocked}
                            className={`p-1 rounded transition-colors ${
                              rowIndex === getRows().length - 1 || isLocked
                                ? 'text-dark-600 cursor-not-allowed'
                                : 'text-dark-400 hover:text-accent-purple hover:bg-dark-700'
                            }`}
                            title="Move row down"
                          >
                            <ChevronDownIcon className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Row Items */}
                        <div
                          className="flex-1 grid gap-1"
                          style={{
                            gridTemplateColumns: `repeat(${currentLayout?.cols || 3}, minmax(0, 1fr))`,
                          }}
                        >
                          {row.map((post) => (
                            <GridItem
                              key={post.id}
                              post={post}
                              isSelected={post.id === selectedPostId}
                              isLocked={isLocked}
                              onClick={() => selectPost(post.id)}
                              onDelete={() => handleDeletePost(post.id)}
                            />
                          ))}
                          {/* Fill empty cells in incomplete rows */}
                          {row.length < (currentLayout?.cols || 3) &&
                            Array.from({ length: (currentLayout?.cols || 3) - row.length }).map((_, i) => (
                              <div
                                key={`empty-${rowIndex}-${i}`}
                                className="aspect-square bg-dark-700/30 rounded-lg border border-dashed border-dark-600"
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </SortableContext>

                  <DragOverlay>
                    {activePost ? (
                      <div className="aspect-square bg-dark-600 rounded-lg overflow-hidden opacity-80 ring-2 ring-accent-purple">
                        {activePost.image ? (
                          <img
                            src={activePost.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{ backgroundColor: activePost.color }}
                          />
                        )}
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>

              {gridPosts.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-dark-600 rounded-xl mt-4">
                  <ImagePlus className="w-16 h-16 text-dark-500 mx-auto mb-4" />
                  <p className="text-dark-300 text-lg mb-2">Drop images here to get started</p>
                  <p className="text-dark-500 mb-4">or click to browse</p>
                  <label className="btn-primary cursor-pointer inline-flex">
                    <Upload className="w-4 h-4" />
                    <span>Upload Images</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats & Zoom Slider */}
        <div className="mt-4 flex items-center gap-6 text-sm text-dark-400">
          <span>{gridPosts.length} posts</span>
          <span>{Math.ceil(gridPosts.length / (currentLayout?.cols || 3))} rows</span>
          <span className="text-accent-purple">
            {isLocked ? 'Grid locked' : 'Drag to reorder'}
          </span>

          {/* Zoom Slider */}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setGridZoom(Math.max(50, gridZoom - 10))}
              className="p-1 text-dark-400 hover:text-dark-200 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="50"
                max="150"
                value={gridZoom}
                onChange={(e) => setGridZoom(Number(e.target.value))}
                className="w-24 h-1.5 bg-dark-600 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-accent-purple
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:hover:bg-accent-purple/80
                  [&::-moz-range-thumb]:w-3
                  [&::-moz-range-thumb]:h-3
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-accent-purple
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-pointer"
              />
              <span className="text-xs text-dark-500 w-8">{gridZoom}%</span>
            </div>
            <button
              onClick={() => setGridZoom(Math.min(150, gridZoom + 10))}
              className="p-1 text-dark-400 hover:text-dark-200 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridZoom(100)}
              className="px-2 py-0.5 text-xs text-dark-500 hover:text-dark-300 bg-dark-700 rounded transition-colors"
              title="Reset zoom"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Post Details */}
      <div className="w-80 flex-shrink-0">
        <PostDetails post={selectedPost} />
      </div>
    </div>
  );
}

export default GridPlanner;
