import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, Image } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-gray-500',
  scheduled: 'bg-blue-500',
  published: 'bg-green-500',
};

const STATUS_LABELS = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
};

function YouTubeVideoCard({ video, isSelected, isLocked, onClick, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: video.id,
    disabled: isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // YouTube title limits: 100 chars max, ~60 visible in search
  const titleLength = video.title?.length || 0;
  const isTitleTruncated = titleLength > 60;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isLocked ? { ...attributes, ...listeners } : {})}
      className={`relative bg-dark-700 rounded-lg overflow-hidden transition-all duration-200 group ${
        isSelected
          ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-dark-800'
          : 'hover:ring-2 hover:ring-dark-500'
      } ${isDragging ? 'z-10 cursor-grabbing' : isLocked ? 'cursor-pointer' : 'cursor-grab'}`}
      onClick={onClick}
    >
      {/* 16:9 Thumbnail */}
      <div className="relative aspect-video bg-dark-600">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title || 'Video thumbnail'}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-dark-600">
            <Image className="w-10 h-10 text-dark-400" />
          </div>
        )}

        {/* Status Badge */}
        {video.status && (
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${STATUS_COLORS[video.status] || STATUS_COLORS.draft}`}>
              {STATUS_LABELS[video.status] || 'Draft'}
            </span>
          </div>
        )}

        {/* Duration placeholder (if we add it later) */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-xs text-white font-medium">
            {video.duration}
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 pointer-events-none">
          {!isLocked && (
            <div className="p-2 bg-dark-800/80 rounded-lg text-dark-200">
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="p-2 bg-dark-800/80 rounded-lg text-dark-200 hover:text-red-400 transition-colors pointer-events-auto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title Section */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-dark-100 line-clamp-2 min-h-[2.5rem]">
          {video.title || 'Untitled Video'}
        </h3>

        {/* Character count indicator */}
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${isTitleTruncated ? 'text-amber-400' : 'text-dark-500'}`}>
            {titleLength}/100
          </span>
          {isTitleTruncated && (
            <span className="text-xs text-amber-400">Title may be cut off</span>
          )}
        </div>
      </div>

      {/* Position Number */}
      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white/80 font-medium">
        {(video.position ?? 0) + 1}
      </div>
    </div>
  );
}

export default YouTubeVideoCard;
