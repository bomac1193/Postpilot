import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useNavigate } from 'react-router-dom';
import { aiApi, postingApi, intelligenceApi } from '../../lib/api';
import {
  Image,
  Type,
  Hash,
  Clock,
  Sparkles,
  Send,
  Calendar,
  Edit3,
  Wand2,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  Music,
  Play,
  Eye,
  X,
  Loader2,
  Check,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  ZoomIn,
  ZoomOut,
  Move,
  Undo2,
  Save,
  SunMedium,
  Contrast,
  Dice5,
} from 'lucide-react';

// Crop aspect ratio presets
const CROP_PRESETS = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:5', label: '4:5', ratio: 4/5 },
  { id: '9:16', label: '9:16', ratio: 9/16 },
  { id: '16:9', label: '16:9', ratio: 16/9 },
  { id: '4:3', label: '4:3', ratio: 4/3 },
  { id: '3:4', label: '3:4', ratio: 3/4 },
];

// Platform tabs
const PLATFORMS = [
  { id: 'details', name: 'Details' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'twitter', name: 'X/Twitter' },
];

// Fake comments for preview
const FAKE_COMMENTS = {
  instagram: [
    { user: 'sarah.designs', text: 'Love this! 😍🔥', verified: false },
    { user: 'mike_photo', text: 'Amazing content as always', verified: false },
    { user: 'lifestyle.mag', text: 'This is incredible! Can we feature this?', verified: true },
  ],
  tiktok: [
    { user: 'user8273', text: 'This is so satisfying to watch', likes: '2.4K' },
    { user: 'creativequeen', text: 'Tutorial please! 🙏', likes: '892' },
    { user: 'viralking', text: 'POV: you found the best content', likes: '1.1K' },
  ],
  twitter: [
    { user: 'techbro', text: 'This is the content I signed up for', likes: '142', retweets: '23' },
    { user: 'designlover', text: 'Bookmarked! 🔖', likes: '89', retweets: '12' },
  ],
};

// Random engagement generator
const getRandomEngagement = () => ({
  likes: Math.floor(Math.random() * 50000) + 1000,
  comments: Math.floor(Math.random() * 500) + 50,
  shares: Math.floor(Math.random() * 200) + 20,
  views: Math.floor(Math.random() * 500000) + 10000,
});

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

function PostDetails({ post }) {
  const navigate = useNavigate();
  const updatePost = useAppStore((state) => state.updatePost);
  const user = useAppStore((state) => state.user);
  const currentProfileId = useAppStore((state) => state.currentProfileId);
  const activeFolioId = useAppStore((state) => state.activeFolioId);
  const activeProjectId = useAppStore((state) => state.activeProjectId);
  const [caption, setCaption] = useState(post?.caption || '');
  const [hashtags, setHashtags] = useState(post?.hashtags?.join(' ') || '');
  const [activeTab, setActiveTab] = useState('details');
  const [engagement] = useState(getRandomEngagement);

  // User display info for previews
  const displayName = user?.name || 'Your Name';
  const username = user?.name?.toLowerCase().replace(/\s+/g, '_') || 'your_username';
  const userAvatar = user?.avatar;

  // Modal and loading states
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [generatingHashtags, setGeneratingHashtags] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showBestTimeModal, setShowBestTimeModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['instagram']);
  const [scheduling, setScheduling] = useState(false);
  const [posting, setPosting] = useState(false);
  const [tasteProfile, setTasteProfile] = useState(null);

  // Quick Edit state
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [editedImage, setEditedImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [editSettings, setEditSettings] = useState({
    scale: 100,
    rotation: 0,
    flipH: false,
    flipV: false,
    brightness: 100,
    contrast: 100,
    cropAspect: 'free',
  });
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Drag state for crop box
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, box: null });
  const previewContainerRef = useRef(null);

  // Crop box state for resizable crop
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 100, height: 100 }); // percentages of actual image
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null); // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, box: null });

  // Track actual image bounds within container (for accurate crop overlay)
  const [imageBounds, setImageBounds] = useState({ x: 0, y: 0, width: 100, height: 100 });

  // Shift key state for free movement (no grid snap)
  const [shiftHeld, setShiftHeld] = useState(false);

  // Grid snap settings
  const GRID_SNAP = 5; // Snap to 5% increments
  const snapToGrid = (value, forceSnap = false) => {
    if (shiftHeld && !forceSnap) return value; // Free movement when shift is held
    return Math.round(value / GRID_SNAP) * GRID_SNAP;
  };
  const [bestTimes, setBestTimes] = useState(null);
  const [loadingBestTimes, setLoadingBestTimes] = useState(false);

  // Track shift key for free movement
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') setShiftHeld(true);
    };
    const handleKeyUp = (e) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Load taste profile once for dice rolls
  useEffect(() => {
    const loadTaste = async () => {
      try {
        const res = await intelligenceApi.getProfile(currentProfileId || null);
        if (res?.tasteProfile) setTasteProfile(res.tasteProfile);
      } catch (err) {
        console.error('Failed to load taste profile for grid dice:', err);
      }
    };
    loadTaste();
  }, [currentProfileId]);

  // Calculate actual image bounds within container (for object-contain)
  const calculateImageBounds = () => {
    if (!imageRef.current || !previewContainerRef.current) return;

    const img = imageRef.current;
    const container = previewContainerRef.current;
    const containerRect = container.getBoundingClientRect();

    const imgNaturalWidth = img.naturalWidth;
    const imgNaturalHeight = img.naturalHeight;

    if (!imgNaturalWidth || !imgNaturalHeight) return;

    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect = imgNaturalWidth / imgNaturalHeight;

    let renderedWidth, renderedHeight, offsetX, offsetY;

    if (imageAspect > containerAspect) {
      // Image is wider - fits width, letterboxed top/bottom
      renderedWidth = containerRect.width;
      renderedHeight = containerRect.width / imageAspect;
      offsetX = 0;
      offsetY = (containerRect.height - renderedHeight) / 2;
    } else {
      // Image is taller - fits height, pillarboxed left/right
      renderedHeight = containerRect.height;
      renderedWidth = containerRect.height * imageAspect;
      offsetX = (containerRect.width - renderedWidth) / 2;
      offsetY = 0;
    }

    setImageBounds({
      x: offsetX,
      y: offsetY,
      width: renderedWidth,
      height: renderedHeight,
      containerWidth: containerRect.width,
      containerHeight: containerRect.height,
    });
  };

  // Recalculate bounds when image loads or quick edit opens
  useEffect(() => {
    if (isQuickEditing && imageRef.current) {
      const img = imageRef.current;
      if (img.complete) {
        calculateImageBounds();
      } else {
        img.onload = calculateImageBounds;
      }
      // Also recalc on resize
      window.addEventListener('resize', calculateImageBounds);
      return () => window.removeEventListener('resize', calculateImageBounds);
    }
  }, [isQuickEditing, editedImage]);

  if (!post) {
    return (
      <div className="h-full bg-dark-800 rounded-2xl border border-dark-700 p-6 flex flex-col items-center justify-center text-center">
        <Image className="w-12 h-12 text-dark-500 mb-4" />
        <p className="text-dark-300 mb-2">No post selected</p>
        <p className="text-sm text-dark-500">
          Click on a grid item to view and edit its details
        </p>
      </div>
    );
  }

  // Get the correct post ID (works for both local and MongoDB posts)
  const postId = post.id || post._id;

  // Update local state immediately for responsive typing
  const handleCaptionChange = (value) => {
    setCaption(value);
  };

  // Save to store only on blur to prevent re-render issues
  const handleCaptionBlur = () => {
    if (postId) {
      updatePost(postId, { caption });
    }
  };

  const handleHashtagsChange = (value) => {
    setHashtags(value);
  };

  // Save hashtags to store on blur
  const handleHashtagsBlur = () => {
    const tags = hashtags
      .split(/[\s,#]+/)
      .filter((tag) => tag.length > 0)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
    if (postId) {
      updatePost(postId, { hashtags: tags });
    }
  };

  // Generate caption with AI - completely replaces existing caption
  const handleGenerateCaption = async () => {
    setGeneratingCaption(true);
    try {
      // Use a generic prompt to generate fresh caption (not based on existing)
      const captions = await aiApi.generateCaption('engaging social media post', 'casual');
      if (captions && captions.length > 0) {
        const newCaption = captions[0];
        setCaption(newCaption);
        if (postId) {
          updatePost(postId, { caption: newCaption });
        }
      }
    } catch (error) {
      console.error('Failed to generate caption:', error);
      // Fallback: generate a simple caption locally
      const fallbackCaptions = [
        "✨ New post alert! Double tap if you love this! 💕",
        "Living my best life 🌟 What do you think?",
        "Good vibes only ✌️ Drop a comment below!",
        "Sharing a moment with you all 📸 #blessed",
        "Making memories one post at a time 📷",
        "This is your sign to do something amazing today ✨",
        "Caught in the moment 🌈",
        "Creating my own sunshine ☀️",
      ];
      const newCaption = fallbackCaptions[Math.floor(Math.random() * fallbackCaptions.length)];
      setCaption(newCaption);
      if (postId) {
        updatePost(postId, { caption: newCaption });
      }
    } finally {
      setGeneratingCaption(false);
    }
  };

  // Taste-aligned roll (uses taste genome + Folio context)
  const handleTasteRoll = async () => {
    setGeneratingCaption(true);
    try {
      const baseTopic = caption || post?.title || 'taste-aligned social post';
      const glyph = tasteProfile?.glyph ? `Glyph ${tasteProfile.glyph}` : null;
      const tones = tasteProfile?.aestheticPatterns?.dominantTones?.slice(0, 3) || [];
      const hooks = tasteProfile?.performancePatterns?.hooks?.slice(0, 2) || [];
      const tags = hashtags ? hashtags.split(/\s+/).filter(Boolean).join(', ') : '';

      const topic = [
        baseTopic,
        glyph && `style: ${glyph}`,
        hooks.length ? `hooks: ${hooks.join(', ')}` : null,
        tones.length ? `tones: ${tones.join(', ')}` : null,
        tags && `hashtags: ${tags}`,
        'avoid generic intros; give 3 sharp, specific options; keep to 2 sentences max',
      ]
        .filter(Boolean)
        .join(' · ');

      const { variants = [] } = await intelligenceApi.generate(topic, {
        platform: selectedPlatforms[0] || 'instagram',
        count: 4,
        profileId: currentProfileId || undefined,
        folioId: activeFolioId || undefined,
        projectId: activeProjectId || undefined,
        tasteContext: tasteProfile ? {
          glyph: tasteProfile.glyph,
          tones: tasteProfile?.aestheticPatterns?.dominantTones,
          hooks: tasteProfile?.performancePatterns?.hooks,
          confidence: tasteProfile?.confidence,
        } : undefined,
        directives: [
          'No fluff, no generic “new post” language',
          'Lead with the hook, not context',
          'Stay within platform tone and glyph voice',
        ],
      });
      const pick = variants[0];
      if (pick) {
        const newCaption = pick.caption || pick.variant || pick.title || caption;
        setCaption(newCaption);
        if (postId) {
          updatePost(postId, { caption: newCaption });
        }
      }
    } catch (error) {
      console.error('Taste-aligned generation failed:', error);
    } finally {
      setGeneratingCaption(false);
    }
  };

  // Suggest hashtags with AI
  const handleSuggestHashtags = async () => {
    setGeneratingHashtags(true);
    try {
      const suggestedTags = await aiApi.generateHashtags(post.id || post._id, 10);
      if (suggestedTags && suggestedTags.length > 0) {
        const newHashtags = suggestedTags.join(' ');
        setHashtags(newHashtags);
        updatePost(post.id, { hashtags: suggestedTags });
      }
    } catch (error) {
      console.error('Failed to suggest hashtags:', error);
      // Fallback: generate common hashtags
      const fallbackTags = ['#instagood', '#photooftheday', '#love', '#beautiful', '#happy', '#picoftheday', '#instadaily', '#amazing', '#style', '#lifestyle'];
      const selectedTags = fallbackTags.slice(0, 5 + Math.floor(Math.random() * 5));
      const newHashtags = selectedTags.join(' ');
      setHashtags(newHashtags);
      updatePost(post.id, { hashtags: selectedTags });
    } finally {
      setGeneratingHashtags(false);
    }
  };

  // Open schedule modal
  const handleOpenScheduleModal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    setScheduleTime('12:00');
    setSelectedPlatforms(['instagram']);
    setShowScheduleModal(true);
  };

  // Schedule post
  const handleSchedulePost = async () => {
    if (!scheduleDate || !scheduleTime) return;
    setScheduling(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
      await postingApi.schedulePost(post.id || post._id, selectedPlatforms, scheduledAt.toISOString(), { caption, hashtags: hashtags.split(/[\s,#]+/).filter(t => t) });
      setShowScheduleModal(false);
      alert('Post scheduled successfully!');
    } catch (error) {
      console.error('Failed to schedule post:', error);
      alert('Failed to schedule post. Please try again.');
    } finally {
      setScheduling(false);
    }
  };

  // Post now
  const handlePostNow = async () => {
    setPosting(true);
    try {
      await postingApi.postNow(post.id || post._id, selectedPlatforms, { caption, hashtags: hashtags.split(/[\s,#]+/).filter(t => t) });
      alert('Post published successfully!');
    } catch (error) {
      console.error('Failed to post:', error);
      alert('Failed to publish post. Please check your platform connections.');
    } finally {
      setPosting(false);
    }
  };

  // Get best time to post
  const handleGetBestTime = async () => {
    setShowBestTimeModal(true);
    setLoadingBestTimes(true);
    try {
      const data = await aiApi.getOptimalTiming('instagram', 'image');
      setBestTimes(data);
    } catch (error) {
      console.error('Failed to get best times:', error);
      // Fallback best times
      setBestTimes({
        bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
        bestHours: ['9:00 AM', '12:00 PM', '7:00 PM'],
        recommendation: 'Based on general engagement patterns, posting on weekday mornings or evenings tends to perform best.',
      });
    } finally {
      setLoadingBestTimes(false);
    }
  };

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  // Quick Edit Functions
  const startQuickEdit = () => {
    // Always work with the original image for non-destructive editing
    const sourceImage = post.originalImage || post.image;
    setOriginalImage(sourceImage);
    setEditedImage(sourceImage);

    // Restore previous edit settings if they exist, otherwise use defaults
    const savedSettings = post.editSettings;
    if (savedSettings) {
      setEditSettings({
        scale: savedSettings.scale || 100,
        rotation: savedSettings.rotation || 0,
        flipH: savedSettings.flipH || false,
        flipV: savedSettings.flipV || false,
        brightness: savedSettings.brightness || 100,
        contrast: savedSettings.contrast || 100,
        cropAspect: savedSettings.cropAspect || 'free',
      });
      // Restore crop box position
      if (savedSettings.cropBox) {
        setCropBox(savedSettings.cropBox);
      } else {
        setCropBox({ x: 0, y: 0, width: 100, height: 100 });
      }
    } else {
      setEditSettings({
        scale: 100,
        rotation: 0,
        flipH: false,
        flipV: false,
        brightness: 100,
        contrast: 100,
        cropAspect: 'free',
      });
      setCropBox({ x: 0, y: 0, width: 100, height: 100 });
    }
    setIsQuickEditing(true);
  };

  const cancelQuickEdit = () => {
    setIsQuickEditing(false);
    setEditedImage(null);
    setIsCropping(false);
  };

  // Reset current edits but keep working
  const resetEdits = () => {
    setEditSettings({
      scale: 100,
      rotation: 0,
      flipH: false,
      flipV: false,
      brightness: 100,
      contrast: 100,
      cropAspect: 'free',
    });
    setCropBox({ x: 0, y: 0, width: 100, height: 100 });
  };

  // Completely restore to original image (remove all edits)
  const restoreOriginal = () => {
    const postId = post.id || post._id;
    const originalImg = post.originalImage || post.image;

    updatePost(postId, {
      image: originalImg,
      editSettings: null,
      lastEdited: new Date().toISOString(),
    });

    // Reset local state
    setEditSettings({
      scale: 100,
      rotation: 0,
      flipH: false,
      flipV: false,
      brightness: 100,
      contrast: 100,
      cropAspect: 'free',
    });
    setCropBox({ x: 0, y: 0, width: 100, height: 100 });
    setEditedImage(originalImg);
  };

  // Update crop box when aspect ratio changes
  const updateCropAspect = (aspectId) => {
    updateEditSetting('cropAspect', aspectId);
    const selectedCrop = CROP_PRESETS.find(p => p.id === aspectId);

    if (selectedCrop?.ratio && imageRef.current) {
      const targetRatio = selectedCrop.ratio; // width/height we want
      const imgWidth = imageRef.current.naturalWidth;
      const imgHeight = imageRef.current.naturalHeight;

      if (!imgWidth || !imgHeight) {
        setCropBox({ x: 0, y: 0, width: 100, height: 100 });
        return;
      }

      const imageRatio = imgWidth / imgHeight;

      // Calculate crop dimensions in percentages that result in correct pixel ratio
      // If targetRatio > imageRatio: crop is wider than image, so we're limited by width
      // If targetRatio < imageRatio: crop is taller than image, so we're limited by height

      let cropWidthPercent, cropHeightPercent;

      if (targetRatio > imageRatio) {
        // Target is wider - use full width, calculate height
        cropWidthPercent = 100;
        // targetRatio = (cropWidthPercent/100 * imgWidth) / (cropHeightPercent/100 * imgHeight)
        // cropHeightPercent = (cropWidthPercent * imgWidth) / (targetRatio * imgHeight) * 100 / 100
        cropHeightPercent = (cropWidthPercent * imageRatio) / targetRatio;
      } else {
        // Target is taller - use full height, calculate width
        cropHeightPercent = 100;
        // targetRatio = (cropWidthPercent/100 * imgWidth) / (cropHeightPercent/100 * imgHeight)
        // cropWidthPercent = (targetRatio * cropHeightPercent * imgHeight) / imgWidth
        cropWidthPercent = (targetRatio * cropHeightPercent) / imageRatio;
      }

      // Center the crop box
      setCropBox({
        x: snapToGrid((100 - cropWidthPercent) / 2),
        y: snapToGrid((100 - cropHeightPercent) / 2),
        width: snapToGrid(cropWidthPercent),
        height: snapToGrid(cropHeightPercent),
      });
    } else {
      // Free crop - use full image
      setCropBox({ x: 0, y: 0, width: 100, height: 100 });
    }
  };

  // Resize handlers for crop box corners
  const handleResizeStart = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    setResizeStart({ x: clientX, y: clientY, box: { ...cropBox } });
  };

  const handleResizeMove = (e) => {
    if (!isResizing || !resizeHandle || !imageBounds.width) return;
    e.preventDefault();
    e.stopPropagation();

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    // Calculate delta in percentage relative to ACTUAL IMAGE bounds
    const deltaX = ((clientX - resizeStart.x) / imageBounds.width) * 100;
    const deltaY = ((clientY - resizeStart.y) / imageBounds.height) * 100;

    let newBox = { ...resizeStart.box };
    const minSize = 10; // Minimum 10% size

    // Get aspect ratio constraint if not free
    const selectedCrop = CROP_PRESETS.find(p => p.id === editSettings.cropAspect);
    const targetRatio = selectedCrop?.ratio;

    // Get actual image aspect ratio for correct calculations
    const imgWidth = imageRef.current?.naturalWidth || 1;
    const imgHeight = imageRef.current?.naturalHeight || 1;
    const imageRatio = imgWidth / imgHeight;

    // Helper: calculate height% from width% to maintain target aspect ratio
    // targetRatio = (widthPct/100 * imgW) / (heightPct/100 * imgH)
    // heightPct = widthPct * imageRatio / targetRatio
    const getHeightForWidth = (widthPct) => {
      if (!targetRatio) return null;
      return widthPct * imageRatio / targetRatio;
    };

    // Helper: calculate width% from height% to maintain target aspect ratio
    const getWidthForHeight = (heightPct) => {
      if (!targetRatio) return null;
      return heightPct * targetRatio / imageRatio;
    };

    switch (resizeHandle) {
      case 'se': // Bottom-right
        newBox.width = Math.max(minSize, resizeStart.box.width + deltaX);
        if (targetRatio) {
          newBox.height = getHeightForWidth(newBox.width);
        } else {
          newBox.height = Math.max(minSize, resizeStart.box.height + deltaY);
        }
        break;
      case 'sw': // Bottom-left
        const newWidthSW = Math.max(minSize, resizeStart.box.width - deltaX);
        newBox.x = resizeStart.box.x + (resizeStart.box.width - newWidthSW);
        newBox.width = newWidthSW;
        if (targetRatio) {
          newBox.height = getHeightForWidth(newBox.width);
        } else {
          newBox.height = Math.max(minSize, resizeStart.box.height + deltaY);
        }
        break;
      case 'ne': // Top-right
        newBox.width = Math.max(minSize, resizeStart.box.width + deltaX);
        if (targetRatio) {
          const newHeightNE = getHeightForWidth(newBox.width);
          newBox.y = resizeStart.box.y + (resizeStart.box.height - newHeightNE);
          newBox.height = newHeightNE;
        } else {
          const newHeightNE = Math.max(minSize, resizeStart.box.height - deltaY);
          newBox.y = resizeStart.box.y + (resizeStart.box.height - newHeightNE);
          newBox.height = newHeightNE;
        }
        break;
      case 'nw': // Top-left
        const newWidthNW = Math.max(minSize, resizeStart.box.width - deltaX);
        if (targetRatio) {
          const newHeightNW = getHeightForWidth(newWidthNW);
          newBox.x = resizeStart.box.x + (resizeStart.box.width - newWidthNW);
          newBox.y = resizeStart.box.y + (resizeStart.box.height - newHeightNW);
          newBox.width = newWidthNW;
          newBox.height = newHeightNW;
        } else {
          const newHeightNW = Math.max(minSize, resizeStart.box.height - deltaY);
          newBox.x = resizeStart.box.x + (resizeStart.box.width - newWidthNW);
          newBox.y = resizeStart.box.y + (resizeStart.box.height - newHeightNW);
          newBox.width = newWidthNW;
          newBox.height = newHeightNW;
        }
        break;
      case 'n': // Top
        if (!targetRatio) {
          const newHeightN = Math.max(minSize, resizeStart.box.height - deltaY);
          newBox.y = resizeStart.box.y + (resizeStart.box.height - newHeightN);
          newBox.height = newHeightN;
        }
        break;
      case 's': // Bottom
        if (!targetRatio) {
          newBox.height = Math.max(minSize, resizeStart.box.height + deltaY);
        }
        break;
      case 'e': // Right
        newBox.width = Math.max(minSize, resizeStart.box.width + deltaX);
        if (targetRatio) newBox.height = getHeightForWidth(newBox.width);
        break;
      case 'w': // Left
        const newWidthW = Math.max(minSize, resizeStart.box.width - deltaX);
        newBox.x = resizeStart.box.x + (resizeStart.box.width - newWidthW);
        newBox.width = newWidthW;
        if (targetRatio) newBox.height = getHeightForWidth(newBox.width);
        break;
    }

    // Snap to grid
    newBox.x = snapToGrid(Math.max(0, Math.min(newBox.x, 100 - newBox.width)));
    newBox.y = snapToGrid(Math.max(0, Math.min(newBox.y, 100 - newBox.height)));
    newBox.width = snapToGrid(Math.min(newBox.width, 100 - newBox.x));
    newBox.height = snapToGrid(Math.min(newBox.height, 100 - newBox.y));

    setCropBox(newBox);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeHandle(null);
  };

  // Move crop box (drag the entire crop area)
  const handleCropBoxDragStart = (e) => {
    if (isResizing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY, box: { ...cropBox } });
  };

  const handleCropBoxDragMove = (e) => {
    if (!isDragging || isResizing || !imageBounds.width) return;
    e.preventDefault();
    e.stopPropagation();

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    // Calculate delta relative to ACTUAL IMAGE bounds
    const deltaX = ((clientX - dragStart.x) / imageBounds.width) * 100;
    const deltaY = ((clientY - dragStart.y) / imageBounds.height) * 100;

    let newX = snapToGrid(dragStart.box.x + deltaX);
    let newY = snapToGrid(dragStart.box.y + deltaY);

    // Keep within bounds
    newX = Math.max(0, Math.min(newX, 100 - cropBox.width));
    newY = Math.max(0, Math.min(newY, 100 - cropBox.height));

    setCropBox(prev => ({ ...prev, x: newX, y: newY }));
  };

  const updateEditSetting = (key, value) => {
    setEditSettings(prev => ({ ...prev, [key]: value }));
  };

  // Handle tab change - auto-save quick edits when switching tabs
  const handleTabChange = async (tabId) => {
    if (isQuickEditing && tabId !== 'details') {
      // Auto-save edits before switching tabs
      await saveQuickEdit();
    }
    setActiveTab(tabId);
  };

  const rotateImage = (degrees) => {
    setEditSettings(prev => ({
      ...prev,
      rotation: (prev.rotation + degrees + 360) % 360
    }));
  };

  const flipImage = (direction) => {
    if (direction === 'horizontal') {
      setEditSettings(prev => ({ ...prev, flipH: !prev.flipH }));
    } else {
      setEditSettings(prev => ({ ...prev, flipV: !prev.flipV }));
    }
  };

  // Apply edits and save
  const saveQuickEdit = async () => {
    // Always work from original image for non-destructive editing
    const sourceImage = post.originalImage || post.image;
    if (!sourceImage) return;

    setSaving(true);
    try {
      // Get the correct post ID (MongoDB uses _id, local might use id)
      const postId = post.id || post._id;
      if (!postId) {
        throw new Error('Post ID not found');
      }

      // Create a canvas to apply transformations
      const img = new window.Image();

      // Load the ORIGINAL image (not the current edited one)
      await new Promise((resolve, reject) => {
        img.onload = () => {
          if (img.width === 0 || img.height === 0) {
            reject(new Error('Image loaded with zero dimensions'));
          } else {
            resolve();
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));

        // Don't set crossOrigin for data URLs or blob URLs
        if (!sourceImage.startsWith('data:') && !sourceImage.startsWith('blob:')) {
          img.crossOrigin = 'anonymous';
        }
        img.src = sourceImage;
      });

      // Use cropBox percentages to calculate actual crop dimensions
      const srcX = (cropBox.x / 100) * img.width;
      const srcY = (cropBox.y / 100) * img.height;
      const srcWidth = (cropBox.width / 100) * img.width;
      const srcHeight = (cropBox.height / 100) * img.height;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calculate output dimensions
      const isRotated90 = editSettings.rotation === 90 || editSettings.rotation === 270;
      const scaleFactor = editSettings.scale / 100;

      let outWidth = srcWidth * scaleFactor;
      let outHeight = srcHeight * scaleFactor;

      if (isRotated90) {
        canvas.width = Math.round(outHeight);
        canvas.height = Math.round(outWidth);
      } else {
        canvas.width = Math.round(outWidth);
        canvas.height = Math.round(outHeight);
      }

      // Apply transformations
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((editSettings.rotation * Math.PI) / 180);

      if (editSettings.flipH) ctx.scale(-1, 1);
      if (editSettings.flipV) ctx.scale(1, -1);

      // Apply filters
      ctx.filter = `brightness(${editSettings.brightness}%) contrast(${editSettings.contrast}%)`;

      // Draw the cropped and scaled image
      ctx.drawImage(
        img,
        srcX, srcY, srcWidth, srcHeight,  // Source rectangle (for cropping)
        -outWidth / 2, -outHeight / 2, outWidth, outHeight  // Destination
      );
      ctx.restore();

      // Get the edited image as data URL
      const editedDataUrl = canvas.toDataURL('image/jpeg', 0.92);

      // Save to post (non-destructive - we keep original in a separate field)
      const originalImg = post.originalImage || post.image;

      // Update the post in the store
      updatePost(postId, {
        image: editedDataUrl,
        originalImage: originalImg,
        lastEdited: new Date().toISOString(),
        editSettings: { ...editSettings, cropBox: { ...cropBox } }
      });

      // Exit quick edit mode
      setIsQuickEditing(false);
      setEditedImage(null);

      console.log('Quick edit saved successfully');
    } catch (error) {
      console.error('Failed to save edits:', error);
      alert('Failed to save edits: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Instagram Preview Component
  const InstagramPreview = () => (
    <div className="bg-black rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{username}</p>
            <p className="text-gray-400 text-xs">Original</p>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-white" />
      </div>

      {/* Image */}
      <div className="aspect-square bg-gray-900">
        {post.image ? (
          <img src={post.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: post.color || '#1f1f1f' }}>
            <Image className="w-12 h-12 text-gray-600" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Heart className="w-6 h-6 text-white cursor-pointer hover:text-red-500 transition-colors" fill="none" />
            <MessageCircle className="w-6 h-6 text-white cursor-pointer" />
            <Share2 className="w-6 h-6 text-white cursor-pointer" />
          </div>
          <Bookmark className="w-6 h-6 text-white cursor-pointer" />
        </div>

        {/* Likes */}
        <p className="text-white text-sm font-semibold mb-1">
          {formatNumber(engagement.likes)} likes
        </p>

        {/* Caption */}
        <p className="text-white text-sm">
          <span className="font-semibold">{username}</span>{' '}
          <span className="text-gray-300">{caption || 'Your caption will appear here...'}</span>
        </p>

        {/* Comments */}
        <p className="text-gray-400 text-sm mt-2 cursor-pointer">
          View all {engagement.comments} comments
        </p>

        <div className="mt-2 space-y-1">
          {FAKE_COMMENTS.instagram.map((comment, i) => (
            <p key={i} className="text-sm">
              <span className="text-white font-semibold">{comment.user}</span>{' '}
              <span className="text-gray-300">{comment.text}</span>
            </p>
          ))}
        </div>

        <p className="text-gray-500 text-xs mt-2 uppercase">2 hours ago</p>
      </div>
    </div>
  );

  // TikTok Preview Component
  const TikTokPreview = () => (
    <div className="bg-black rounded-xl overflow-hidden relative" style={{ aspectRatio: '9/16', maxHeight: '500px' }}>
      {/* Background Image/Video */}
      <div className="absolute inset-0">
        {post.image ? (
          <img src={post.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: post.color || '#1f1f1f' }}>
            <Play className="w-16 h-16 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>

      {/* Right Actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-white overflow-hidden">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="w-5 h-5 rounded-full bg-red-500 -mt-2 flex items-center justify-center">
            <span className="text-white text-xs">+</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <Heart className="w-8 h-8 text-white" fill="white" />
          <span className="text-white text-xs mt-1">{formatNumber(engagement.likes)}</span>
        </div>

        <div className="flex flex-col items-center">
          <MessageCircle className="w-8 h-8 text-white" />
          <span className="text-white text-xs mt-1">{formatNumber(engagement.comments)}</span>
        </div>

        <div className="flex flex-col items-center">
          <Bookmark className="w-8 h-8 text-white" />
          <span className="text-white text-xs mt-1">{formatNumber(engagement.shares)}</span>
        </div>

        <div className="flex flex-col items-center">
          <Share2 className="w-8 h-8 text-white" />
          <span className="text-white text-xs mt-1">Share</span>
        </div>

        <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-600 overflow-hidden animate-spin" style={{ animationDuration: '3s' }}>
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-4 left-3 right-16">
        <p className="text-white font-semibold text-sm mb-1">@{username}</p>
        <p className="text-white text-sm mb-2 line-clamp-2">
          {caption || 'Your caption will appear here...'} {hashtags || '#fyp #viral #trending'}
        </p>
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-white" />
          <p className="text-white text-xs">Original Sound - {username}</p>
        </div>
      </div>

      {/* View count */}
      <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/50 px-2 py-1 rounded">
        <Eye className="w-4 h-4 text-white" />
        <span className="text-white text-xs">{formatNumber(engagement.views)}</span>
      </div>

      {/* Comments Overlay */}
      <div className="absolute bottom-32 left-3 right-16 space-y-2">
        {FAKE_COMMENTS.tiktok.slice(0, 2).map((comment, i) => (
          <div key={i} className="bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1">
            <p className="text-white text-xs">
              <span className="font-semibold">{comment.user}</span> {comment.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  // Twitter/X Preview Component
  const TwitterPreview = () => (
    <div className="bg-black rounded-xl overflow-hidden border border-gray-800">
      {/* Header */}
      <div className="p-3">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 overflow-hidden">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-sm">{displayName}</span>
              <span className="text-gray-500 text-sm">@{username}</span>
              <span className="text-gray-500 text-sm">· 2h</span>
            </div>

            {/* Tweet Text */}
            <p className="text-white text-sm mt-1">
              {caption || 'Your tweet will appear here...'}
            </p>

            {/* Image */}
            {post.image && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-gray-800">
                <img src={post.image} alt="" className="w-full object-cover" style={{ maxHeight: '300px' }} />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 max-w-md">
              <div className="flex items-center gap-1 text-gray-500 hover:text-blue-400 cursor-pointer">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">{engagement.comments}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500 hover:text-green-400 cursor-pointer">
                <Share2 className="w-4 h-4" />
                <span className="text-xs">{engagement.shares}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500 hover:text-red-400 cursor-pointer">
                <Heart className="w-4 h-4" />
                <span className="text-xs">{formatNumber(engagement.likes)}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500 hover:text-blue-400 cursor-pointer">
                <Eye className="w-4 h-4" />
                <span className="text-xs">{formatNumber(engagement.views)}</span>
              </div>
              <Bookmark className="w-4 h-4 text-gray-500 hover:text-blue-400 cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="border-t border-gray-800">
        {FAKE_COMMENTS.twitter.map((comment, i) => (
          <div key={i} className="p-3 border-b border-gray-800 flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-white font-bold text-sm">{comment.user}</span>
                <span className="text-gray-500 text-xs">· 1h</span>
              </div>
              <p className="text-gray-300 text-sm">{comment.text}</p>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-gray-500 text-xs">{comment.likes} likes</span>
                <span className="text-gray-500 text-xs">{comment.retweets} reposts</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Details Tab Content (stored as JSX, not a component, to prevent focus loss)
  const detailsContent = (
    <>
      {/* Preview Image / Quick Edit Area */}
      <div className={`bg-dark-700 relative flex-shrink-0 ${isQuickEditing ? 'aspect-auto' : 'aspect-square'}`}>
        {isQuickEditing ? (
          // Quick Edit Mode
          <div className="p-4 space-y-4">
            {/* Edit Preview */}
            <div
              ref={previewContainerRef}
              className="relative aspect-square bg-dark-900 rounded-lg overflow-hidden flex items-center justify-center select-none"
              onMouseMove={(e) => {
                if (isResizing) handleResizeMove(e);
                else if (isDragging) handleCropBoxDragMove(e);
              }}
              onMouseUp={() => {
                if (isResizing) handleResizeEnd();
                else if (isDragging) setIsDragging(false);
              }}
              onMouseLeave={() => {
                if (isResizing) handleResizeEnd();
                else if (isDragging) setIsDragging(false);
              }}
              onTouchMove={(e) => {
                if (isResizing) handleResizeMove(e);
                else if (isDragging) handleCropBoxDragMove(e);
              }}
              onTouchEnd={() => {
                if (isResizing) handleResizeEnd();
                else if (isDragging) setIsDragging(false);
              }}
            >
              {(editedImage || post.originalImage || post.image) ? (
                <>
                  <img
                    ref={imageRef}
                    src={editedImage || post.originalImage || post.image}
                    alt="Edit preview"
                    className="w-full h-full object-contain select-none"
                    style={{
                      filter: `brightness(${editSettings.brightness}%) contrast(${editSettings.contrast}%)`,
                      transform: `rotate(${editSettings.rotation}deg) scaleX(${editSettings.flipH ? -1 : 1}) scaleY(${editSettings.flipV ? -1 : 1})`,
                      transition: 'filter 0.2s, transform 0.2s',
                    }}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  {/* Interactive Crop Box - positioned over actual image bounds */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: imageBounds.x,
                      top: imageBounds.y,
                      width: imageBounds.width,
                      height: imageBounds.height,
                    }}
                  >
                    {/* Darkened overlay outside crop area */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `linear-gradient(to right,
                          rgba(0,0,0,0.7) ${cropBox.x}%,
                          transparent ${cropBox.x}%,
                          transparent ${cropBox.x + cropBox.width}%,
                          rgba(0,0,0,0.7) ${cropBox.x + cropBox.width}%)`
                      }}
                    />
                    {/* Top darkened area */}
                    <div
                      className="absolute pointer-events-none bg-black/70"
                      style={{
                        left: `${cropBox.x}%`,
                        width: `${cropBox.width}%`,
                        top: 0,
                        height: `${cropBox.y}%`
                      }}
                    />
                    {/* Bottom darkened area */}
                    <div
                      className="absolute pointer-events-none bg-black/70"
                      style={{
                        left: `${cropBox.x}%`,
                        width: `${cropBox.width}%`,
                        top: `${cropBox.y + cropBox.height}%`,
                        bottom: 0
                      }}
                    />

                    {/* Grid lines for snap visualization - only show when not holding shift */}
                    {!shiftHeld && (
                      <div className="absolute inset-0 pointer-events-none opacity-20">
                        {[20, 40, 60, 80].map((pos) => (
                          <div key={`v-${pos}`} className="absolute h-full border-l border-white/30" style={{ left: `${pos}%` }} />
                        ))}
                        {[20, 40, 60, 80].map((pos) => (
                          <div key={`h-${pos}`} className="absolute w-full border-t border-white/30" style={{ top: `${pos}%` }} />
                        ))}
                      </div>
                    )}

                    {/* Crop Box */}
                    <div
                      className="absolute border-2 border-white cursor-move pointer-events-auto"
                      style={{
                        left: `${cropBox.x}%`,
                        top: `${cropBox.y}%`,
                        width: `${cropBox.width}%`,
                        height: `${cropBox.height}%`,
                      }}
                      onMouseDown={handleCropBoxDragStart}
                      onTouchStart={handleCropBoxDragStart}
                    >
                      {/* Rule of thirds grid inside crop */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/40" />
                        <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/40" />
                        <div className="absolute top-1/3 left-0 right-0 border-t border-white/40" />
                        <div className="absolute top-2/3 left-0 right-0 border-t border-white/40" />
                      </div>

                      {/* Corner resize handles */}
                      <div
                        className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-accent-purple rounded-sm cursor-nw-resize hover:bg-accent-purple hover:scale-110 transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'nw')}
                        onTouchStart={(e) => handleResizeStart(e, 'nw')}
                      />
                      <div
                        className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-accent-purple rounded-sm cursor-ne-resize hover:bg-accent-purple hover:scale-110 transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'ne')}
                        onTouchStart={(e) => handleResizeStart(e, 'ne')}
                      />
                      <div
                        className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-accent-purple rounded-sm cursor-sw-resize hover:bg-accent-purple hover:scale-110 transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'sw')}
                        onTouchStart={(e) => handleResizeStart(e, 'sw')}
                      />
                      <div
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-accent-purple rounded-sm cursor-se-resize hover:bg-accent-purple hover:scale-110 transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'se')}
                        onTouchStart={(e) => handleResizeStart(e, 'se')}
                      />

                      {/* Edge resize handles */}
                      <div
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-white border-2 border-accent-purple rounded-sm cursor-n-resize hover:bg-accent-purple hover:scale-110 transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'n')}
                        onTouchStart={(e) => handleResizeStart(e, 'n')}
                      />
                      <div
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-white border-2 border-accent-purple rounded-sm cursor-s-resize hover:bg-accent-purple hover:scale-110 transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 's')}
                        onTouchStart={(e) => handleResizeStart(e, 's')}
                      />
                      <div
                        className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-white border-2 border-accent-purple rounded-sm cursor-w-resize hover:bg-accent-purple hover:scale-110 transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'w')}
                        onTouchStart={(e) => handleResizeStart(e, 'w')}
                      />
                      <div
                        className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-white border-2 border-accent-purple rounded-sm cursor-e-resize hover:bg-accent-purple hover:scale-110 transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'e')}
                        onTouchStart={(e) => handleResizeStart(e, 'e')}
                      />

                      {/* Dimensions label */}
                      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs text-white bg-black/80 px-2 py-0.5 rounded whitespace-nowrap">
                        {cropBox.width.toFixed(0)}% × {cropBox.height.toFixed(0)}%
                        {editSettings.cropAspect !== 'free' && ` (${editSettings.cropAspect})`}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-dark-500">No image to edit</div>
              )}
            </div>

            {/* Quick Edit Controls */}
            <div className="space-y-4">
              {/* Transform Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-dark-400 uppercase tracking-wider">Transform</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => rotateImage(-90)}
                    className="flex-1 btn-secondary py-2 text-sm"
                    title="Rotate Left"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => rotateImage(90)}
                    className="flex-1 btn-secondary py-2 text-sm"
                    title="Rotate Right"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => flipImage('horizontal')}
                    className={`flex-1 btn-secondary py-2 text-sm ${editSettings.flipH ? 'bg-accent-purple/20 text-accent-purple' : ''}`}
                    title="Flip Horizontal"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => flipImage('vertical')}
                    className={`flex-1 btn-secondary py-2 text-sm ${editSettings.flipV ? 'bg-accent-purple/20 text-accent-purple' : ''}`}
                    title="Flip Vertical"
                  >
                    <FlipVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scale Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-dark-400 uppercase tracking-wider">Scale</h4>
                  <span className="text-xs text-dark-300">{editSettings.scale}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomOut className="w-4 h-4 text-dark-400" />
                  <input
                    type="range"
                    min="25"
                    max="200"
                    value={editSettings.scale}
                    onChange={(e) => updateEditSetting('scale', parseInt(e.target.value))}
                    className="flex-1 accent-accent-purple"
                  />
                  <ZoomIn className="w-4 h-4 text-dark-400" />
                </div>
              </div>

              {/* Crop Aspect Ratio */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-dark-400 uppercase tracking-wider">Crop Ratio</h4>
                <div className="flex flex-wrap gap-1">
                  {CROP_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => updateCropAspect(preset.id)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        editSettings.cropAspect === preset.id
                          ? 'bg-accent-purple text-white'
                          : 'bg-dark-600 text-dark-300 hover:bg-dark-500'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-dark-500 flex items-center gap-1">
                    <Move className="w-3 h-3" />
                    Drag corners to resize, drag center to move.
                  </p>
                  <p className={`text-xs flex items-center gap-1 ${shiftHeld ? 'text-accent-purple font-medium' : 'text-dark-500'}`}>
                    {shiftHeld ? '⚡ Free movement active' : '💡 Hold Shift for free movement (no snap)'}
                  </p>
                </div>
              </div>

              {/* Brightness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-dark-400 uppercase tracking-wider">Brightness</h4>
                  <span className="text-xs text-dark-300">{editSettings.brightness}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <SunMedium className="w-4 h-4 text-dark-400" />
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={editSettings.brightness}
                    onChange={(e) => updateEditSetting('brightness', parseInt(e.target.value))}
                    className="flex-1 accent-accent-purple"
                  />
                </div>
              </div>

              {/* Contrast */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-dark-400 uppercase tracking-wider">Contrast</h4>
                  <span className="text-xs text-dark-300">{editSettings.contrast}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Contrast className="w-4 h-4 text-dark-400" />
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={editSettings.contrast}
                    onChange={(e) => updateEditSetting('contrast', parseInt(e.target.value))}
                    className="flex-1 accent-accent-purple"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {/* Restore Original - only show if edits exist */}
                {post.originalImage && post.image !== post.originalImage && (
                  <button
                    onClick={restoreOriginal}
                    className="w-full btn-secondary py-2 text-sm text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
                  >
                    <Undo2 className="w-4 h-4" />
                    Restore Original Photo
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={resetEdits}
                    className="btn-secondary py-2 text-sm"
                    title="Reset crop to full image"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelQuickEdit}
                    className="flex-1 btn-secondary py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveQuickEdit}
                    disabled={saving}
                    className="flex-1 btn-primary py-2 text-sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
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
          </div>
        ) : (
          // Normal View Mode
          <>
            {post.image ? (
              <img
                src={post.image}
                alt={post.caption || 'Post preview'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: post.color || '#3f3f46' }}
              >
                <Image className="w-16 h-16 text-white/30" />
              </div>
            )}

            {/* Edit Overlay */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <div className="flex flex-col gap-2">
                <button
                  onClick={startQuickEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                  <Crop className="w-4 h-4 text-white" />
                  <span className="text-white font-medium">Quick Edit</span>
                </button>
                <button
                  onClick={() => navigate('/editor', { state: { postId: post.id } })}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-white" />
                  <span className="text-white font-medium">Full Editor</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Caption */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-dark-200">
              <Type className="w-4 h-4" />
              Caption
            </label>
            <button
              onClick={handleTasteRoll}
              disabled={generatingCaption}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-dark-700 text-white hover:bg-dark-600 disabled:opacity-50"
              title="Taste-aligned roll for caption"
            >
              {generatingCaption ? <Loader2 className="w-3 h-3 animate-spin" /> : <Dice5 className="w-3 h-3" />}
              <span>Dice</span>
            </button>
          </div>
          <textarea
            value={caption}
            onChange={(e) => handleCaptionChange(e.target.value)}
            onBlur={handleCaptionBlur}
            placeholder="Write a caption..."
            className="input min-h-[100px] resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-dark-500">
              {caption.length}/2200 characters
            </span>
            <button
              onClick={handleGenerateCaption}
              disabled={generatingCaption}
              className="text-xs text-accent-purple hover:text-accent-purple/80 flex items-center gap-1 disabled:opacity-50"
            >
              {generatingCaption ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Generate with AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hashtags */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-dark-200 mb-2">
            <Hash className="w-4 h-4" />
            Hashtags
          </label>
          <textarea
            value={hashtags}
            onChange={(e) => handleHashtagsChange(e.target.value)}
            onBlur={handleHashtagsBlur}
            placeholder="#fashion #style #ootd"
            className="input min-h-[60px] resize-none text-accent-blue"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-dark-500">
              {post.hashtags?.length || 0}/30 hashtags
            </span>
            <button
              onClick={handleSuggestHashtags}
              disabled={generatingHashtags}
              className="text-xs text-accent-purple hover:text-accent-purple/80 flex items-center gap-1 disabled:opacity-50"
            >
              {generatingHashtags ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Suggesting...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Suggest hashtags
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-2 space-y-2">
          <button
            onClick={() => navigate('/editor', { state: { postId: post.id } })}
            className="w-full btn-secondary justify-start"
          >
            <Wand2 className="w-4 h-4" />
            Open in Editor
          </button>

          <button onClick={handleOpenScheduleModal} className="w-full btn-secondary justify-start">
            <Calendar className="w-4 h-4" />
            Schedule Post
          </button>

          <button onClick={handleGetBestTime} className="w-full btn-secondary justify-start">
            <Clock className="w-4 h-4" />
            Best Time to Post
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-full bg-dark-800 rounded-2xl border border-dark-700 flex flex-col overflow-hidden">
      {/* Platform Tabs */}
      <div className="flex border-b border-dark-700 flex-shrink-0">
        {PLATFORMS.map((platform) => (
          <button
            key={platform.id}
            onClick={() => handleTabChange(platform.id)}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeTab === platform.id
                ? 'text-accent-purple border-b-2 border-accent-purple bg-accent-purple/5'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            {platform.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto flex flex-col">
        {activeTab === 'details' && detailsContent}
        {activeTab === 'instagram' && (
          <div className="p-4">
            <p className="text-xs text-dark-400 mb-3 text-center">Preview how your post will look on Instagram</p>
            <InstagramPreview />
          </div>
        )}
        {activeTab === 'tiktok' && (
          <div className="p-4 flex justify-center">
            <div className="w-full max-w-[280px]">
              <p className="text-xs text-dark-400 mb-3 text-center">Preview how your post will look on TikTok</p>
              <TikTokPreview />
            </div>
          </div>
        )}
        {activeTab === 'twitter' && (
          <div className="p-4">
            <p className="text-xs text-dark-400 mb-3 text-center">Preview how your post will look on X/Twitter</p>
            <TwitterPreview />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-dark-700 flex gap-2 flex-shrink-0">
        <button onClick={handleOpenScheduleModal} className="flex-1 btn-secondary">
          <Calendar className="w-4 h-4" />
          Schedule
        </button>
        <button
          onClick={handlePostNow}
          disabled={posting}
          className="flex-1 btn-primary disabled:opacity-50"
        >
          {posting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Post Now
            </>
          )}
        </button>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-dark-100">Schedule Post</h3>
              <button onClick={() => setShowScheduleModal(false)} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="input w-full"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {['instagram', 'tiktok', 'twitter', 'facebook'].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                        selectedPlatforms.includes(platform)
                          ? 'bg-accent-purple text-white'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-dark-700 flex gap-2">
              <button onClick={() => setShowScheduleModal(false)} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSchedulePost}
                disabled={!scheduleDate || !scheduleTime || scheduling}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {scheduling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Best Time Modal */}
      {showBestTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-dark-100">Best Time to Post</h3>
              <button onClick={() => setShowBestTimeModal(false)} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {loadingBestTimes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
                </div>
              ) : bestTimes ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-dark-200 mb-2">Best Days</h4>
                    <div className="flex flex-wrap gap-2">
                      {bestTimes.bestDays?.map((day) => (
                        <span key={day} className="px-3 py-1 bg-accent-purple/20 text-accent-purple rounded-lg text-sm">
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-dark-200 mb-2">Best Times</h4>
                    <div className="flex flex-wrap gap-2">
                      {bestTimes.bestHours?.map((time) => (
                        <span key={time} className="px-3 py-1 bg-accent-blue/20 text-accent-blue rounded-lg text-sm">
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>

                  {bestTimes.recommendation && (
                    <div className="p-3 bg-dark-700 rounded-lg">
                      <p className="text-sm text-dark-300">{bestTimes.recommendation}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-dark-400 py-4">Unable to load best times</p>
              )}
            </div>

            <div className="p-4 border-t border-dark-700">
              <button onClick={() => setShowBestTimeModal(false)} className="w-full btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PostDetails;
