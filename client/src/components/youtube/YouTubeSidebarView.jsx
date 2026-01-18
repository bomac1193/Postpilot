import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../../stores/useAppStore';
import {
  Upload,
  Youtube,
  GripVertical,
  Trash2,
  Calendar,
  Clock,
  Eye,
  FileVideo,
} from 'lucide-react';

// Sortable list item component
function SortableVideoItem({ video, isSelected, isLocked, onClick, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusColors = {
    draft: 'bg-dark-500 text-dark-300',
    scheduled: 'bg-amber-500/20 text-amber-400',
    published: 'bg-green-500/20 text-green-400',
  };

  const statusLabels = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    published: 'Published',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'bg-red-500/20 border border-red-500/50'
          : 'bg-dark-700 hover:bg-dark-600 border border-transparent'
      }`}
    >
      {/* Drag Handle */}
      {!isLocked && (
        <div
          {...attributes}
          {...listeners}
          className="p-1 text-dark-500 hover:text-dark-300 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative w-32 aspect-video rounded-md overflow-hidden flex-shrink-0 bg-dark-600">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title || 'Video thumbnail'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileVideo className="w-6 h-6 text-dark-500" />
          </div>
        )}
        {/* Duration placeholder */}
        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[10px] text-white font-medium">
          {video.duration || '0:00'}
        </div>
      </div>

      {/* Video Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-dark-100 truncate">
          {video.title || 'Untitled Video'}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[video.status] || statusColors.draft}`}>
            {statusLabels[video.status] || 'Draft'}
          </span>
          {video.scheduledDate && (
            <span className="flex items-center gap-1 text-[10px] text-dark-400">
              <Calendar className="w-3 h-3" />
              {new Date(video.scheduledDate).toLocaleDateString()}
            </span>
          )}
        </div>
        {video.description && (
          <p className="text-xs text-dark-400 mt-1 line-clamp-1">
            {video.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 text-dark-500 hover:text-red-400 hover:bg-dark-600 rounded transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function YouTubeSidebarView({ isLocked, onUpload }) {
  const youtubeVideos = useAppStore((state) => state.youtubeVideos);
  const reorderYoutubeVideos = useAppStore((state) => state.reorderYoutubeVideos);
  const selectedYoutubeVideoId = useAppStore((state) => state.selectedYoutubeVideoId);
  const selectYoutubeVideo = useAppStore((state) => state.selectYoutubeVideo);
  const deleteYoutubeVideo = useAppStore((state) => state.deleteYoutubeVideo);

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

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (isLocked || !over || active.id === over.id) return;

    const oldIndex = youtubeVideos.findIndex((v) => v.id === active.id);
    const newIndex = youtubeVideos.findIndex((v) => v.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newVideos = arrayMove(youtubeVideos, oldIndex, newIndex);
      reorderYoutubeVideos(newVideos);
    }
  }, [isLocked, youtubeVideos, reorderYoutubeVideos]);

  const handleDelete = useCallback((id) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      deleteYoutubeVideo(id);
    }
  }, [deleteYoutubeVideo]);

  // Empty state
  if (youtubeVideos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center py-16 px-8 border-2 border-dashed border-dark-600 rounded-xl max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <Youtube className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-dark-100 mb-2">
            No Videos Yet
          </h3>
          <p className="text-dark-400 mb-6">
            Upload thumbnails to start planning your YouTube content.
          </p>
          <label className="btn-primary cursor-pointer inline-flex">
            <Upload className="w-4 h-4" />
            <span>Upload Thumbnails</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={onUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
        <div className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          <span className="text-sm font-medium text-dark-200">
            {youtubeVideos.length} Videos
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-dark-400">
          <Eye className="w-3.5 h-3.5" />
          <span>List View</span>
        </div>
      </div>

      {/* Video List */}
      <div className="flex-1 overflow-auto p-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={youtubeVideos.map((v) => v.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {youtubeVideos.map((video) => (
                <SortableVideoItem
                  key={video.id}
                  video={video}
                  isSelected={video.id === selectedYoutubeVideoId}
                  isLocked={isLocked}
                  onClick={() => selectYoutubeVideo(video.id)}
                  onDelete={() => handleDelete(video.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add New Button */}
        <label className="mt-3 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-dark-600 hover:border-red-500 rounded-lg cursor-pointer text-dark-400 hover:text-red-500 transition-colors">
          <Upload className="w-4 h-4" />
          <span className="text-sm font-medium">Add Video</span>
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-dark-700 flex items-center gap-4 text-xs text-dark-400">
        <span>{youtubeVideos.filter((v) => v.status === 'draft').length} drafts</span>
        <span>{youtubeVideos.filter((v) => v.status === 'scheduled').length} scheduled</span>
        <span className="text-red-400 ml-auto">
          {isLocked ? 'List locked' : 'Drag to reorder'}
        </span>
      </div>
    </div>
  );
}

export default YouTubeSidebarView;
