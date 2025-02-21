import { useCanvasContext } from '@/context/CanvasContext';
import { TOKYO_NIGHT_COLORS, Tool, Stroke, TEMPLATES, Template } from '@/types/tools';
import { 
  PencilIcon,
  MinusIcon,
  Square2StackIcon,
  ArrowDownTrayIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

const tools: { id: Tool; icon: typeof PencilIcon; label: string }[] = [
  { id: 'pencil', icon: PencilIcon, label: 'Pencil' },
  { id: 'eraser', icon: MinusIcon, label: 'Eraser' },
  { id: 'selector', icon: Square2StackIcon, label: 'Select' },
];

const strokeWidths = [1, 2, 4, 6, 8];

interface ToolbarProps {
  width?: number;
  height?: number;
}

export default function Toolbar({ width = 1920, height = 1080 }: ToolbarProps) {
  const { 
    currentTool, 
    setCurrentTool, 
    strokeColor, 
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    currentStrokes,
    currentNote
  } = useCanvasContext();

  const handleExport = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set export canvas size (A4 proportions at 150 DPI)
    const exportWidth = 1240; // ~8.27 inches at 150 DPI
    const exportHeight = 1754; // ~11.7 inches at 150 DPI
    const scale = exportWidth / width;

    // Set canvas size to export dimensions
    canvas.width = exportWidth;
    canvas.height = exportHeight;

    // Scale the context to maintain proportions
    ctx.scale(scale, scale);

    // Draw background
    ctx.fillStyle = '#1a1b26';
    ctx.fillRect(0, 0, width, height);

    // Draw template if exists
    if (currentNote?.template?.id) {
      const templateSvg = TEMPLATES.find((t: Template) => t.id === currentNote.template.id)?.svgPattern;
      if (templateSvg) {
        // Create a temporary SVG element
        const svg = new Blob([templateSvg], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const svgUrl = URL.createObjectURL(svg);

        // Create an Image to draw the SVG
        const img = new Image();
        img.src = svgUrl;

        // Wait for image to load before proceeding with export
        img.onload = () => {
          // Draw the template
          ctx.drawImage(img, 0, 0, width, height);

          // Draw all strokes
          currentStrokes.forEach(stroke => {
            const path = new Path2D(stroke.path);
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke(path);
          });

          // Generate filename from note title or use default
          const filename = currentNote?.title 
            ? `${currentNote.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
            : 'canvas-note.png';

          // Convert to PNG and download
          canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            URL.revokeObjectURL(svgUrl);
          }, 'image/png');
        };
      }
    } else {
      // If no template, just draw strokes
      currentStrokes.forEach(stroke => {
        const path = new Path2D(stroke.path);
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(path);
      });

      // Generate filename and export
      const filename = currentNote?.title 
        ? `${currentNote.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
        : 'canvas-note.png';

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    }
  };

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 bg-[#1f2335] p-2 rounded-lg shadow-lg">
      {/* Tools */}
      <div className="flex flex-col gap-2">
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => {
              console.log('Toolbar: Setting tool to:', id);
              setCurrentTool(id);
            }}
            className={`p-2 rounded-lg transition-colors ${
              currentTool === id 
                ? 'bg-[#414868] text-[#c0caf5]' 
                : 'text-[#565f89] hover:bg-[#292e42]'
            }`}
            title={label}
          >
            <Icon className="w-6 h-6" />
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-[#292e42]" />

      {/* Colors */}
      <div className="flex flex-col gap-2 items-center">
        {Object.entries(TOKYO_NIGHT_COLORS).map(([name, color]) => (
          <button
            key={name}
            onClick={() => setStrokeColor(color)}
            className={`w-6 h-6 rounded-full transition-transform ${
              strokeColor === color ? 'scale-110 ring-2 ring-[#c0caf5]' : ''
            }`}
            style={{ backgroundColor: color }}
            title={name}
          />
        ))}
      </div>

      <div className="w-full h-px bg-[#292e42]" />

      {/* Stroke Width */}
      <div className="flex flex-col gap-2">
        {strokeWidths.map(width => (
          <button
            key={width}
            onClick={() => setStrokeWidth(width)}
            className={`w-full p-2 rounded-lg transition-colors ${
              strokeWidth === width 
                ? 'bg-[#414868]' 
                : 'hover:bg-[#292e42]'
            }`}
            title={`${width}px`}
          >
            <div 
              className="w-full rounded-full bg-current"
              style={{ height: `${width}px` }}
            />
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-[#292e42]" />

      {/* Image Tools */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {/* TODO: Implement image upload */}}
          className="p-2 rounded-lg text-[#565f89] hover:bg-[#292e42] transition-colors"
          title="Upload Image"
        >
          <PhotoIcon className="w-6 h-6" />
        </button>
        <button
          onClick={handleExport}
          className="p-2 rounded-lg text-[#565f89] hover:bg-[#292e42] transition-colors"
          title="Export as PNG"
        >
          <ArrowDownTrayIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
} 