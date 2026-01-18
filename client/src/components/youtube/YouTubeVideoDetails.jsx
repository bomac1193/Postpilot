import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/useAppStore';
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

  const [title, setTitle] = useState(video?.title || '');
  const [description, setDescription] = useState(video?.description || '');
  const [status, setStatus] = useState(video?.status || 'draft');
  const [scheduledDate, setScheduledDate] = useState(video?.scheduledDate || '');
  const [scheduledTime, setScheduledTime] = useState(video?.scheduledTime || '12:00');
  const [showTruncatePreview, setShowTruncatePreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fileInputRef = useRef(null);

  // Update local state when video changes
  useEffect(() => {
    if (video) {
      setTitle(video.title || '');
      setDescription(video.description || '');
      setStatus(video.status || 'draft');
      setScheduledDate(video.scheduledDate || '');
      setScheduledTime(video.scheduledTime || '12:00');
    }
  }, [video?.id]);

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

  const videoId = video.id;

  const handleTitleChange = (value) => {
    if (value.length <= TITLE_MAX) {
      setTitle(value);
    }
  };

  const handleTitleBlur = () => {
    updateYoutubeVideo(videoId, { title });
  };

  const handleDescriptionChange = (value) => {
    setDescription(value);
  };

  const handleDescriptionBlur = () => {
    updateYoutubeVideo(videoId, { description });
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    updateYoutubeVideo(videoId, { status: newStatus });
  };

  const handleScheduleChange = () => {
    updateYoutubeVideo(videoId, {
      scheduledDate,
      scheduledTime,
      status: scheduledDate ? 'scheduled' : status,
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
