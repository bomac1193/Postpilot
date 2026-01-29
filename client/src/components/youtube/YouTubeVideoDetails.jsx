import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { intelligenceApi, youtubeApi, genomeApi } from '../../lib/api';
import {
  Image,
  Type,
  Calendar,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  Youtube,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  ChevronDown,
  Star,
  Check,
  Dice5,
  ThumbsDown,
  SkipForward,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-500' },
  { value: 'published', label: 'Published', color: 'bg-green-500' },
];

// YouTube title character limits
const TITLE_MAX = 100;
const TITLE_VISIBLE = 60; // Characters visible in search results

function YouTubeVideoDetails({ video, onThumbnailUpload }) {
  const updateYoutubeVideo = useAppStore((state) => state.updateYoutubeVideo);
  const deleteYoutubeVideo = useAppStore((state) => state.deleteYoutubeVideo);
  const currentProfileId = useAppStore((state) => state.currentProfileId);
  const activeFolioId = useAppStore((state) => state.activeFolioId);
  const activeProjectId = useAppStore((state) => state.activeProjectId);

  const videoId = video?.id || video?._id;

  const [title, setTitle] = useState(video?.title || '');
  const [description, setDescription] = useState(video?.description || '');
  const [status, setStatus] = useState(video?.status || 'draft');
  const [scheduledDate, setScheduledDate] = useState(video?.scheduledDate || '');
  const [scheduledTime, setScheduledTime] = useState(video?.scheduledTime || '12:00');
  const [showTruncatePreview, setShowTruncatePreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // AI Generation state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiVideoType, setAiVideoType] = useState('standard');
  const [generating, setGenerating] = useState(false);
  const [aiVariants, setAiVariants] = useState([]);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const fileInputRef = useRef(null);
  const autosaveTimer = useRef(null);
  const lastSavedRef = useRef({
    title: video?.title || '',
    description: video?.description || '',
  });

  // Update local state when video changes
  useEffect(() => {
    if (video) {
      setTitle(video.title || '');
      setDescription(video.description || '');
      setStatus(video.status || 'draft');
      setScheduledDate(video.scheduledDate || '');
      setScheduledTime(video.scheduledTime || '12:00');
      lastSavedRef.current = {
        title: video.title || '',
        description: video.description || '',
      };
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    }
  }, [video?.id]);

  // Debounced autosave for title/description so refresh/collection switch doesn't lose edits
  useEffect(() => {
    if (!video) return undefined;
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }
    autosaveTimer.current = setTimeout(() => {
      const dirtyTitle = title !== lastSavedRef.current.title;
      const dirtyDescription = description !== lastSavedRef.current.description;
      if (dirtyTitle || dirtyDescription) {
        persistVideoUpdates({ title, description });
        lastSavedRef.current = { title, description };
      }
    }, 700);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [title, description, video?.id]);

  // Final flush on unmount
  useEffect(() => () => {
    if (videoId) {
      const dirtyTitle = title !== lastSavedRef.current.title;
      const dirtyDescription = description !== lastSavedRef.current.description;
      if (dirtyTitle || dirtyDescription) {
        persistVideoUpdates({ title, description });
        lastSavedRef.current = { title, description };
      }
    }
  }, [videoId, title, description]);

  if (!video) {
    return (
      <div className="h-full bg-dark-800 rounded-2xl border border-dark-700 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
          <Youtube className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-dark-300 mb-2">No video selected</p>
        <p className="text-sm text-dark-500">
          Click on a video to view and edit its details
        </p>
      </div>
    );
  }

  // Persist updates to the backend and keep local state in sync
  const persistVideoUpdates = async (updates) => {
    if (!videoId) return;

    // Optimistic local update
    updateYoutubeVideo(videoId, updates);

    try {
      const { video: savedVideo } = await youtubeApi.updateVideo(videoId, updates);
      if (savedVideo) {
        updateYoutubeVideo(videoId, { ...savedVideo, id: savedVideo._id || videoId });
        if (typeof updates.title === 'string' || typeof updates.description === 'string') {
          lastSavedRef.current = {
            title: updates.title ?? lastSavedRef.current.title,
            description: updates.description ?? lastSavedRef.current.description,
          };
        }
      }
    } catch (error) {
      console.error('Failed to save YouTube video update:', error);
    }
  };

  const handleTitleChange = (value) => {
    if (value.length <= TITLE_MAX) {
      setTitle(value);
    }
  };

  const handleTitleBlur = () => {
    persistVideoUpdates({ title });
    lastSavedRef.current = { ...lastSavedRef.current, title };
  };

  const handleDescriptionChange = (value) => {
    setDescription(value);
  };

  const handleDescriptionBlur = () => {
    persistVideoUpdates({ description });
    lastSavedRef.current = { ...lastSavedRef.current, description };
  };

  // Taste feedback signals (dislike/skip)
  const sendTasteSignal = async (type, reason) => {
    if (!videoId) return;
    setSendingFeedback(true);
    try {
      await genomeApi.signal(
        type,
        `youtube_${reason}`,
        {
          platform: 'youtube',
          videoId,
          title: title || video.title || '',
          description: description || video.description || '',
        },
        currentProfileId || null
      );
    } catch (err) {
      console.error('Failed to send taste signal:', err);
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    persistVideoUpdates({ status: newStatus });
  };

  const handleScheduleChange = () => {
    const nextStatus = scheduledDate ? 'scheduled' : status;
    setStatus(nextStatus);
    persistVideoUpdates({
      scheduledDate,
      scheduledTime,
      status: nextStatus,
    });
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onThumbnailUpload?.(file, videoId);
    }
    e.target.value = '';
  };

  const handleDelete = () => {
    deleteYoutubeVideo(videoId);
    setShowDeleteConfirm(false);
  };

  // AI Generation
  const handleGenerateAI = async (topicOverride = null) => {
    const topic =
      topicOverride ??
      (aiTopic.trim() || title || description || 'taste-aligned ideas');
    if (!topic) return;
    setGenerating(true);
    try {
      const result = await intelligenceApi.generateYouTube(topic, {
        videoType: aiVideoType,
        count: 5,
        profileId: currentProfileId || undefined,
        folioId: activeFolioId || undefined,
        projectId: activeProjectId || undefined,
      });
      const variants = result.variants || [];
      setAiVariants(variants);

      // Auto-apply the first (best) variant
      if (variants.length > 0) {
        const best = variants[0];
        setTitle(best.title);
        setDescription(best.description);
        persistVideoUpdates({
          title: best.title,
          description: best.description,
        });
      }
    } catch (error) {
      console.error('AI generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const applyAIVariant = (variant) => {
    setTitle(variant.title);
    setDescription(variant.description);
    persistVideoUpdates({
      title: variant.title,
      description: variant.description,
    });
    setShowAIPanel(false);
    setAiVariants([]);
  };

  const handleRateVariant = async (variant, rating) => {
    try {
      await intelligenceApi.rate(
        {
          variant: variant.title,
          hookType: variant.hookType,
          tone: variant.tone,
          performanceScore: variant.performanceScore,
          tasteScore: variant.tasteScore,
        },
        rating,
        {},
        {
          topic: aiTopic,
          platform: 'youtube',
          source: 'local',
          folioId: activeFolioId || undefined,
          projectId: activeProjectId || undefined,
        },
        false,
        currentProfileId || null
      );
    } catch (error) {
      console.error('Failed to save rating:', error);
    }
  };

  const titleLength = title.length;
  const isTitleLong = titleLength > TITLE_VISIBLE;
  const truncatedTitle = isTitleLong ? title.slice(0, TITLE_VISIBLE) + '...' : title;

  return (
    <div className="h-full bg-dark-800 rounded-2xl border border-dark-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-dark-100">Video Details</h2>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
          title="Delete video"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Thumbnail Preview */}
        <div className="relative aspect-video bg-dark-700 rounded-lg overflow-hidden group">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title || 'Video thumbnail'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="w-12 h-12 text-dark-500" />
            </div>
          )}

          {/* Upload Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <label className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer">
              <Upload className="w-4 h-4 text-white" />
              <span className="text-white font-medium text-sm">
                {video.thumbnail ? 'Replace Thumbnail' : 'Upload Thumbnail'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-dark-200">
              <Type className="w-4 h-4" />
              Title
            </label>
            <button
              onClick={() => setShowTruncatePreview(!showTruncatePreview)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                showTruncatePreview ? 'text-red-400' : 'text-dark-400 hover:text-dark-200'
              }`}
              title="Preview how title appears in search"
            >
              {showTruncatePreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>Search preview</span>
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Enter video title..."
            className="input w-full"
            maxLength={TITLE_MAX}
          />

          {/* Character Count */}
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-2">
              <span className={`text-xs ${titleLength > TITLE_VISIBLE ? 'text-amber-400' : 'text-dark-500'}`}>
                {titleLength}/{TITLE_MAX}
              </span>
              {isTitleLong && (
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Title will be truncated in search
                </span>
              )}
            </div>
          </div>

          {/* Truncated Preview */}
          {showTruncatePreview && isTitleLong && (
            <div className="mt-2 p-3 bg-dark-700 rounded-lg">
              <p className="text-xs text-dark-400 mb-1">How it appears in search results:</p>
              <p className="text-sm text-dark-100">{truncatedTitle}</p>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-dark-200 mb-2">
            <FileText className="w-4 h-4" />
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Add a description (optional)..."
            className="input w-full min-h-[80px] resize-none"
          />
        </div>

        {/* Taste Feedback */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-400">Feedback to Taste Genome:</span>
          <button
            type="button"
            onClick={() => sendTasteSignal('dislike', 'dislike')}
            disabled={sendingFeedback}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-dark-700 hover:bg-dark-600 text-xs text-white disabled:opacity-50"
            title="Dislike this suggestion"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            Dislike
          </button>
          <button
            type="button"
            onClick={() => sendTasteSignal('skip', 'skip')}
            disabled={sendingFeedback}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-dark-700 hover:bg-dark-600 text-xs text-white disabled:opacity-50"
            title="Skip this video"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip
          </button>
        </div>

        {/* AI Generation */}
        <div className="border-t border-dark-700 pt-4">
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">AI Generate Title & Description</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-red-400 transition-transform ${showAIPanel ? 'rotate-180' : ''}`} />
          </button>

          {showAIPanel && (
            <div className="mt-3 p-3 bg-dark-700 rounded-lg space-y-3">
              <div>
                <label className="block text-xs text-dark-400 mb-1">What's this video about?</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Enter your video topic..."
                  className="input w-full text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateAI()}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={aiVideoType}
                  onChange={(e) => setAiVideoType(e.target.value)}
                  className="input text-sm flex-1"
                >
                  <option value="short">Short</option>
                  <option value="standard">Standard</option>
                  <option value="long">Long-form</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="vlog">Vlog</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateAI()}
                    disabled={generating || (!aiTopic.trim() && !title && !description)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                  >
                    {generating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateAI('taste-aligned refresh')}
                    disabled={generating}
                    className="px-3 py-2 bg-dark-700 border border-dark-600 text-white rounded-lg hover:border-red-500 transition-colors disabled:opacity-50 flex items-center gap-1 text-sm"
                    title="Randomise with taste profile"
                  >
                    <Dice5 className="w-4 h-4" />
                    <span>Shuffle</span>
                  </button>
                </div>
              </div>

              {/* AI Results */}
              {aiVariants.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <p className="text-xs text-green-400">Top result applied. Click another to switch:</p>
                  {aiVariants.map((variant, i) => (
                    <div
                      key={i}
                      className="p-2 bg-dark-800 rounded-lg hover:bg-dark-600 transition-colors cursor-pointer group"
                      onClick={() => applyAIVariant(variant)}
                    >
                      <p className="text-sm text-white font-medium mb-1 line-clamp-2">{variant.title}</p>
                      <p className="text-xs text-dark-400 line-clamp-2">{variant.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                            {variant.hookType}
                          </span>
                          <span className="text-xs text-dark-500">{variant.performanceScore}%</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRateVariant(variant, star);
                              }}
                              className="p-0.5"
                            >
                              <Star className="w-3 h-3 text-dark-500 hover:text-yellow-400 hover:fill-yellow-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-dark-200 mb-2">
            <Clock className="w-4 h-4" />
            Status
          </label>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  status === opt.value
                    ? `${opt.color} text-white`
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-dark-200 mb-2">
            <Calendar className="w-4 h-4" />
            Schedule
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              onBlur={handleScheduleChange}
              className="input"
              min={new Date().toISOString().split('T')[0]}
            />
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              onBlur={handleScheduleChange}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-sm mx-4 p-4">
            <h3 className="text-lg font-semibold text-dark-100 mb-2">Delete Video</h3>
            <p className="text-dark-400 text-sm mb-4">
              Are you sure you want to delete "{title || 'this video'}"? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default YouTubeVideoDetails;
