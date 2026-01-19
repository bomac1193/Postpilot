import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Canvas, FabricImage, filters } from 'fabric';
import { useAppStore } from '../stores/useAppStore';
import { useEditorStore } from '../stores/useAppStore';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Download,
  Upload,
  Sun,
  Contrast,
  Droplets,
  Sparkles,
  Check,
  X,
  Square,
  RectangleVertical,
  RectangleHorizontal,
  Smartphone,
} from 'lucide-react';

// Filter presets
const FILTER_PRESETS = [
  { id: 'none', name: 'Original', filters: [] },
  { id: 'clarendon', name: 'Clarendon', filters: [{ type: 'brightness', value: 0.1 }, { type: 'contrast', value: 0.1 }, { type: 'saturation', value: 0.15 }] },
  { id: 'gingham', name: 'Gingham', filters: [{ type: 'brightness', value: 0.05 }, { type: 'hue', value: -0.05 }] },
  { id: 'moon', name: 'Moon', filters: [{ type: 'grayscale', value: 1 }, { type: 'contrast', value: 0.1 }] },
  { id: 'lark', name: 'Lark', filters: [{ type: 'brightness', value: 0.08 }, { type: 'saturation', value: -0.1 }] },
  { id: 'reyes', name: 'Reyes', filters: [{ type: 'brightness', value: 0.1 }, { type: 'saturation', value: -0.25 }] },
  { id: 'juno', name: 'Juno', filters: [{ type: 'saturation', value: 0.3 }, { type: 'contrast', value: 0.1 }] },
  { id: 'slumber', name: 'Slumber', filters: [{ type: 'brightness', value: -0.05 }, { type: 'saturation', value: -0.1 }] },
  { id: 'crema', name: 'Crema', filters: [{ type: 'brightness', value: 0.05 }, { type: 'saturation', value: -0.15 }] },
  { id: 'ludwig', name: 'Ludwig', filters: [{ type: 'brightness', value: 0.05 }, { type: 'saturation', value: -0.05 }] },
  { id: 'aden', name: 'Aden', filters: [{ type: 'brightness', value: 0.12 }, { type: 'saturation', value: -0.15 }, { type: 'hue', value: 0.02 }] },
  { id: 'perpetua', name: 'Perpetua', filters: [{ type: 'brightness', value: 0.05 }, { type: 'saturation', value: 0.1 }] },
];

// Aspect ratio presets
const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square', icon: Square, width: 1, height: 1 },
  { id: '4:5', label: 'Portrait', icon: RectangleVertical, width: 4, height: 5 },
  { id: '16:9', label: 'Landscape', icon: RectangleHorizontal, width: 16, height: 9 },
  { id: '9:16', label: 'Story', icon: Smartphone, width: 9, height: 16 },
];

function QuickEditor() {
  const location = useLocation();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const imageRef = useRef(null);
  const lastDimensionsRef = useRef({ width: 0, height: 0 });

  const posts = useAppStore((state) => state.posts);
  const updatePost = useAppStore((state) => state.updatePost);
  const selectedPostId = location.state?.postId || useAppStore((state) => state.selectedPostId);

  const {
    zoom,
    setZoom,
    rotation,
    setRotation,
    rotate90,
    flipH,
    flipV,
    toggleFlipH,
    toggleFlipV,
    adjustments,
    setAdjustment,
    resetAdjustments,
    activeFilter,
    setActiveFilter,
    cropAspectRatio,
    setCropAspectRatio,
    cropMode,
    setCropMode,
    reset,
  } = useEditorStore();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);

  const selectedPost = posts.find((p) => p.id === selectedPostId);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      backgroundColor: '#18181b',
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    // Handle resize - with dimension check to prevent infinite loops
    const handleResize = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();

      // Only update if dimensions actually changed (prevents infinite loop)
      const lastDims = lastDimensionsRef.current;
      if (Math.abs(width - lastDims.width) < 1 && Math.abs(height - lastDims.height) < 1) {
        return;
      }

      lastDimensionsRef.current = { width, height };
      canvas.setDimensions({ width, height });
      canvas.renderAll();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial size with slight delay to ensure container is sized
    setTimeout(handleResize, 0);

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  // Load image when post changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (selectedPost?.image) {
      loadImage(selectedPost.image);
    } else if (selectedPost?.originalImage) {
      loadImage(selectedPost.originalImage);
    } else {
      canvas.clear();
      canvas.backgroundColor = selectedPost?.color || '#18181b';
      canvas.renderAll();
      setImageLoaded(false);
    }
  }, [selectedPost?.id, selectedPost?.image, selectedPost?.originalImage]);

  const loadImage = async (src) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' });

      // Store original
      setOriginalImage(src);

      // Clear canvas
      canvas.clear();

      // Scale image to fit canvas
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const scale = Math.min(
        (canvasWidth * 0.9) / img.width,
        (canvasHeight * 0.9) / img.height
      );

      img.scale(scale);
      img.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });

      canvas.add(img);
      imageRef.current = img;
      canvas.renderAll();
      setImageLoaded(true);

      // Reset editor state
      reset();
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  };

  // Apply adjustments
  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const fabricFilters = [];

    // Brightness
    if (adjustments.brightness !== 0) {
      fabricFilters.push(new filters.Brightness({ brightness: adjustments.brightness }));
    }

    // Contrast
    if (adjustments.contrast !== 0) {
      fabricFilters.push(new filters.Contrast({ contrast: adjustments.contrast }));
    }

    // Saturation
    if (adjustments.saturation !== 0) {
      fabricFilters.push(new filters.Saturation({ saturation: adjustments.saturation }));
    }

    img.filters = fabricFilters;
    img.applyFilters();
    fabricCanvasRef.current?.renderAll();
  }, [adjustments.brightness, adjustments.contrast, adjustments.saturation]);

  // Apply rotation
  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    img.set({ angle: rotation });
    fabricCanvasRef.current?.renderAll();
  }, [rotation]);

  // Apply flip
  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    img.set({
      flipX: flipH,
      flipY: flipV,
    });
    fabricCanvasRef.current?.renderAll();
  }, [flipH, flipV]);

  // Apply zoom
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.setZoom(zoom);
    canvas.renderAll();
  }, [zoom]);

  // Handle file upload
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        loadImage(dataUrl);
        // If we have a selected post, update it
        if (selectedPostId) {
          updatePost(selectedPostId, { image: dataUrl, originalImage: dataUrl });
        }
      }
    };
    reader.readAsDataURL(file);
  }, [selectedPostId, updatePost]);

  // Apply filter preset
  const applyFilterPreset = useCallback((preset) => {
    setActiveFilter(preset.id);
    resetAdjustments();

    preset.filters.forEach((f) => {
      if (f.type === 'brightness') setAdjustment('brightness', f.value);
      if (f.type === 'contrast') setAdjustment('contrast', f.value);
      if (f.type === 'saturation') setAdjustment('saturation', f.value);
    });
  }, [setActiveFilter, resetAdjustments, setAdjustment]);

  // Export image
  const handleExport = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    // Download
    const link = document.createElement('a');
    link.download = `postpanda-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  // Save to post
  const handleSave = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedPostId) return;

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
    });

    updatePost(selectedPostId, { image: dataUrl });
  }, [selectedPostId, updatePost]);

  return (
    <div className="h-full flex gap-6">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
              <button
                onClick={() => setZoom(zoom - 0.1)}
                className="btn-icon"
                disabled={zoom <= 0.1}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="w-16 text-center text-sm text-dark-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(zoom + 0.1)}
                className="btn-icon"
                disabled={zoom >= 3}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Undo/Redo */}
            <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
              <button className="btn-icon" title="Undo (Ctrl+Z)">
                <Undo className="w-4 h-4" />
              </button>
              <button className="btn-icon" title="Redo (Ctrl+Shift+Z)">
                <Redo className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Upload */}
            <label className="btn-secondary cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Export */}
            <button onClick={handleExport} className="btn-secondary">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            {/* Save */}
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={!selectedPostId}
            >
              <Check className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Canvas Container */}
        <div
          ref={containerRef}
          className="flex-1 bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden relative min-h-0"
        >
          <canvas ref={canvasRef} className="absolute inset-0" />

          {/* No Image State */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Upload className="w-16 h-16 text-dark-500 mb-4" />
              <p className="text-dark-400 mb-2">No image loaded</p>
              <label className="btn-primary cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Tools */}
      <div className="w-80 flex-shrink-0 space-y-4 overflow-auto">
        {/* Transform Tools */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <h3 className="text-sm font-medium text-dark-200 mb-3">Transform</h3>

          <div className="grid grid-cols-4 gap-2 mb-4">
            <button
              onClick={() => setRotation(rotation - 90)}
              className="btn-icon flex flex-col items-center gap-1 py-3"
              title="Rotate Left"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="text-xs">-90°</span>
            </button>
            <button
              onClick={() => setRotation(rotation + 90)}
              className="btn-icon flex flex-col items-center gap-1 py-3"
              title="Rotate Right"
            >
              <RotateCw className="w-5 h-5" />
              <span className="text-xs">+90°</span>
            </button>
            <button
              onClick={toggleFlipH}
              className={`btn-icon flex flex-col items-center gap-1 py-3 ${flipH ? 'bg-accent-purple/20 text-accent-purple' : ''}`}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-5 h-5" />
              <span className="text-xs">Flip H</span>
            </button>
            <button
              onClick={toggleFlipV}
              className={`btn-icon flex flex-col items-center gap-1 py-3 ${flipV ? 'bg-accent-purple/20 text-accent-purple' : ''}`}
              title="Flip Vertical"
            >
              <FlipVertical className="w-5 h-5" />
              <span className="text-xs">Flip V</span>
            </button>
          </div>

          {/* Rotation Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-dark-400">Fine Rotation</span>
              <span className="text-xs text-dark-300">{rotation}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Crop / Aspect Ratio */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <h3 className="text-sm font-medium text-dark-200 mb-3">Aspect Ratio</h3>
          <div className="grid grid-cols-4 gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.id}
                onClick={() => setCropAspectRatio(ratio.id)}
                className={`btn-icon flex flex-col items-center gap-1 py-3 ${
                  cropAspectRatio === ratio.id
                    ? 'bg-accent-purple/20 text-accent-purple'
                    : ''
                }`}
              >
                <ratio.icon className="w-5 h-5" />
                <span className="text-xs">{ratio.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Adjustments */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-dark-200">Adjustments</h3>
            <button
              onClick={resetAdjustments}
              className="text-xs text-dark-400 hover:text-dark-200"
            >
              Reset
            </button>
          </div>

          <div className="space-y-4">
            {/* Brightness */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-dark-400 flex items-center gap-1">
                  <Sun className="w-3 h-3" /> Brightness
                </span>
                <span className="text-xs text-dark-300">
                  {Math.round(adjustments.brightness * 100)}
                </span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={adjustments.brightness}
                onChange={(e) => setAdjustment('brightness', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-dark-400 flex items-center gap-1">
                  <Contrast className="w-3 h-3" /> Contrast
                </span>
                <span className="text-xs text-dark-300">
                  {Math.round(adjustments.contrast * 100)}
                </span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={adjustments.contrast}
                onChange={(e) => setAdjustment('contrast', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-dark-400 flex items-center gap-1">
                  <Droplets className="w-3 h-3" /> Saturation
                </span>
                <span className="text-xs text-dark-300">
                  {Math.round(adjustments.saturation * 100)}
                </span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={adjustments.saturation}
                onChange={(e) => setAdjustment('saturation', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <h3 className="text-sm font-medium text-dark-200 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Filters
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {FILTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyFilterPreset(preset)}
                className={`p-2 rounded-lg text-center transition-colors ${
                  activeFilter === preset.id
                    ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple'
                    : 'bg-dark-700 text-dark-300 hover:text-dark-100 border border-transparent'
                }`}
              >
                <div className="w-full aspect-square bg-dark-600 rounded mb-1" />
                <span className="text-xs">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickEditor;
