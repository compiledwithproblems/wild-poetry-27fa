import { useEffect, useRef, useState, useCallback } from 'react';
import { useCanvasContext } from '@/context/CanvasContext';
import { Point } from '@/types/tools';
import Pressure from 'pressure';
import { getStroke } from 'perfect-freehand';

interface CanvasProps {
  width: number;
  height: number;
}

// Helper function to convert a stroke to SVG path
const getSvgPathFromStroke = (points: Point[], width: number) => {
  const freehandPoints = points.map(p => [p.x, p.y, p.pressure]);
  const stroke = getStroke(freehandPoints, {
    size: width,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t: number) => t,
    last: true,
  });

  if (!stroke.length) return '';

  const [first, ...rest] = stroke;
  return `M ${first[0]} ${first[1]} ${rest.map((point) => `L ${point[0]} ${point[1]}`).join(' ')}`;
};

// Add iPad-specific types at the top
interface ExtendedPointerEvent extends Omit<PointerEvent, 'tangentialPressure' | 'tiltX' | 'tiltY'> {
  tangentialPressure: number | undefined;
  tiltX: number | undefined;
  tiltY: number | undefined;
}

interface ExtendedCSSProperties extends CSSStyleDeclaration {
  WebkitTouchCallout: 'none' | 'default';
  WebkitUserSelect: 'none' | 'text' | 'auto';
}

// Configuration for Perfect Freehand
const getPerfectFreehandOptions = (width: number) => ({
  size: width,
  thinning: 0.5,      // How much the stroke thins out
  smoothing: 0.5,     // How much to smooth the stroke
  streamline: 0.5,    // How much to streamline the stroke
  easing: (t: number) => t, // Linear easing
  last: true,         // End the line with a sharp point
});

// Helper function to check if input is likely from Apple Pencil
const isApplePencil = (e: PointerEvent): boolean => {
  const event = e as ExtendedPointerEvent;
  return (
    e.pointerType === 'pen' &&
    typeof event.tangentialPressure !== 'undefined' &&
    typeof event.tiltX !== 'undefined' &&
    typeof event.tiltY !== 'undefined'
  );
};

// Helper function to draw a stroke with Perfect Freehand
const drawStroke = (
  ctx: CanvasRenderingContext2D, 
  points: Point[], 
  width: number,
  color: string
) => {
  // Convert points to format expected by perfect-freehand
  const freehandPoints = points.map(p => [p.x, p.y, p.pressure]);
  
  // Get the smoothed stroke points
  const stroke = getStroke(freehandPoints, getPerfectFreehandOptions(width));
  
  if (!stroke.length) return;

  // Draw the stroke
  ctx.beginPath();
  ctx.fillStyle = color;
  
  // Move to the first point
  const [first, ...rest] = stroke;
  ctx.moveTo(first[0], first[1]);
  
  // Draw lines to each point
  rest.forEach(([x, y]) => {
    ctx.lineTo(x, y);
  });
  
  // Close the path and fill
  ctx.closePath();
  ctx.fill();
};

export default function Canvas({ width, height }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStrokeRef = useRef<Point[]>([]);
  const isPencilDrawing = useRef(false);
  
  const { 
    currentTool,
    strokeColor,
    strokeWidth,
    setIsDrawing,
    addStroke,
    currentStrokes,
    removeStrokes,
    isDrawing
  } = useCanvasContext();
  
  const [isErasing, setIsErasing] = useState(false);
  const [erasedStrokes, setErasedStrokes] = useState<number[]>([]);

  const startNewStroke = useCallback((x: number, y: number, pressure: number) => {
    if (currentTool !== 'pencil') return;
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Add first point to current stroke
    const point = { x, y, pressure };
    currentStrokeRef.current = [point];
    
    // Clear canvas and start new stroke
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth * pressure;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, [currentTool, strokeColor, strokeWidth, width, height]);

  const continueStroke = useCallback((x: number, y: number, pressure: number) => {
    if (currentTool !== 'pencil') return;
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Add point to current stroke
    const point = { x, y, pressure };
    currentStrokeRef.current.push(point);
    
    // Clear and redraw current stroke
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth * pressure;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const [first, ...rest] = currentStrokeRef.current;
    ctx.moveTo(first.x, first.y);
    rest.forEach(point => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }, [currentTool, strokeColor, strokeWidth, width, height]);

  const finalizeStroke = useCallback(() => {
    if (currentTool !== 'pencil' || currentStrokeRef.current.length < 2) return;

    // Create new stroke object
    const newStroke = {
      id: Date.now(),
      tool: currentTool,
      points: currentStrokeRef.current,
      color: strokeColor,
      width: strokeWidth,
      path: getSvgPathFromStroke(currentStrokeRef.current, strokeWidth)
    };

    // Add stroke to context
    addStroke(newStroke);

    // Clear the canvas
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }

    currentStrokeRef.current = [];
  }, [currentTool, strokeColor, strokeWidth, addStroke, width, height]);

  const checkErasedStrokes = useCallback((x: number, y: number) => {
    const eraserRadius = strokeWidth * 10;
    
    const newErasedStrokes = currentStrokes
      .filter(stroke => {
        // Check if any point in the stroke is within eraser radius
        const shouldErase = stroke.points.some(point => {
          const dx = x - point.x;
          const dy = y - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance <= eraserRadius;
        });
        return shouldErase;
      })
      .map(stroke => stroke.id);

    if (newErasedStrokes.length > 0) {
      setErasedStrokes(prev => [...new Set([...prev, ...newErasedStrokes])]);
    }
  }, [currentStrokes, strokeWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    // Initialize Pressure.js
    Pressure.set(canvas, {
      change: (force: number) => {
        if (!isDrawing || currentTool !== 'pencil' || !isPencilDrawing.current) return;
        
        const pressure = 0.1 + (force * 0.9);
        
        if (currentStrokeRef.current.length > 0) {
          const lastPoint = currentStrokeRef.current[currentStrokeRef.current.length - 1];
          continueStroke(lastPoint.x, lastPoint.y, pressure);
        }
      },
      start: () => {
        console.log('Pressure detection started');
      },
      end: () => {
        console.log('Pressure detection ended');
        if (currentTool === 'pencil' && isPencilDrawing.current) {
          finalizeStroke();
        }
      },
      unsupported: () => {
        console.log('Pressure detection not supported, using fallback');
      }
    }, {
      polyfill: false,
      only: 'touch'
    });
    
    const handlePointerDown = (e: PointerEvent) => {
      if (!isApplePencil(e) && currentTool === 'pencil') {
        return;
      }

      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pressure = e.pressure || 0.5;

      isPencilDrawing.current = isApplePencil(e);

      if (currentTool === 'pencil') {
        setIsDrawing(true);
        setIsErasing(false);
        currentStrokeRef.current = [];
        startNewStroke(x, y, pressure);
      } else if (currentTool === 'eraser') {
        setIsDrawing(false);
        setIsErasing(true);
        currentStrokeRef.current = [];
        if (currentStrokes.length > 0) {
          checkErasedStrokes(x, y);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPencilDrawing.current && currentTool === 'pencil') {
        return;
      }

      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pressure = e.pressure || 0.5;

      if (currentTool === 'eraser' && isErasing) {
        checkErasedStrokes(x, y);
      } else if (currentTool === 'pencil' && currentStrokeRef.current.length > 0) {
        continueStroke(x, y, pressure);
      }
    };

    const handlePointerUp = () => {
      if (!isPencilDrawing.current && currentTool === 'pencil') {
        return;
      }

      if (currentTool === 'eraser') {
        setIsErasing(false);
        if (erasedStrokes.length > 0) {
          removeStrokes(erasedStrokes);
          setErasedStrokes([]);
        }
      } else if (currentTool === 'pencil') {
        setIsDrawing(false);
        finalizeStroke();
      }
      
      isPencilDrawing.current = false;
      currentStrokeRef.current = [];
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerout', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    canvas.style.touchAction = 'none';
    
    const style = canvas.style as unknown as ExtendedCSSProperties;
    style.WebkitTouchCallout = 'none';
    style.WebkitUserSelect = 'none';

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerout', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [
    width,
    height,
    currentTool,
    isErasing,
    strokeWidth,
    strokeColor,
    currentStrokes,
    erasedStrokes,
    isDrawing,
    checkErasedStrokes,
    continueStroke,
    finalizeStroke,
    removeStrokes,
    setIsDrawing,
    startNewStroke
  ]);

  return (
    <div className="relative" style={{ width: `${width}px`, height: `${height}px` }}>
      {/* SVG layer for completed strokes */}
      <svg
        className="absolute top-0 left-0 bg-[#1a1b26]"
        width={width}
        height={height}
        style={{ 
          pointerEvents: 'none',
          WebkitTapHighlightColor: 'transparent',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        {currentStrokes
          .filter(stroke => !erasedStrokes.includes(stroke.id))
          .map(stroke => (
            <path
              key={stroke.id}
              d={stroke.path}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
      </svg>

      {/* Canvas only for active stroke */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 touch-none"
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      />
    </div>
  );
} 