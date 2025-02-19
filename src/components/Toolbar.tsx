import { useCanvasContext } from '@/context/CanvasContext';
import { TOKYO_NIGHT_COLORS, Tool } from '@/types/tools';
import { 
  PencilIcon,
  MinusIcon,
  Square2StackIcon,
  ArrowsPointingOutIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

const tools: { id: Tool; icon: typeof PencilIcon; label: string }[] = [
  { id: 'pencil', icon: PencilIcon, label: 'Pencil' },
  { id: 'eraser', icon: MinusIcon, label: 'Eraser' },
  { id: 'selector', icon: Square2StackIcon, label: 'Select' },
];

const strokeWidths = [1, 2, 4, 6, 8];

export default function Toolbar() {
  const { 
    currentTool, 
    setCurrentTool, 
    strokeColor, 
    setStrokeColor,
    strokeWidth,
    setStrokeWidth
  } = useCanvasContext();

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
      <div className="flex flex-col gap-2">
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
          onClick={() => {/* TODO: Open shape library */}}
          className="p-2 rounded-lg text-[#565f89] hover:bg-[#292e42] transition-colors"
          title="Shape Library"
        >
          <ArrowsPointingOutIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
} 