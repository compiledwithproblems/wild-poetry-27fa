import { useEffect, useRef, useState } from 'react';
import { useCanvasContext } from '@/context/CanvasContext';
import { Point } from '@/types/tools';
import Pressure from 'pressure';
import { getStroke } from 'perfect-freehand';

interface CanvasProps {
  width: number;
  height: number;
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
  return (
    e.pointerType === 'pen' &&
    // Check for iPad-specific pointer properties
    typeof (e as any).tangentialPressure !== 'undefined' &&
    typeof (e as any).tiltX !== 'undefined' &&
    typeof (e as any).tiltY !== 'undefined'
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
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentStrokeRef = useRef<Point[]>([]);
  const isPencilDrawing = useRef(false); // Track if current stroke is from Apple Pencil
  
  const { 
    currentTool,
    strokeColor,
    strokeWidth,
    setIsDrawing,
    addStroke,
    currentStrokes,
    redrawCanvas,
    removeStrokes,
    isDrawing
  } = useCanvasContext();
  
  const [isErasing, setIsErasing] = useState(false);
  const [erasedStrokes, setErasedStrokes] = useState<number[]>([]);

  // Setup canvases
  useEffect(() => {
    const baseCanvas = baseCanvasRef.current;
    const activeCanvas = activeCanvasRef.current;
    if (!baseCanvas || !activeCanvas) return;

    // Set up base canvas
    baseCanvas.width = width;
    baseCanvas.height = height;

    // Set up active canvas
    activeCanvas.width = width;
    activeCanvas.height = height;

    // Initial draw of all strokes on base canvas
    redrawCanvas(baseCanvas, []);
  }, [width, height]);
  
  useEffect(() => {
    const activeCanvas = activeCanvasRef.current;
    if (!activeCanvas) return;

    // Initialize Pressure.js on the active canvas
    Pressure.set(activeCanvas, {
      change: (force: number) => {
        if (!isDrawing || currentTool !== 'pencil' || !isPencilDrawing.current) return;
        
        // Scale pressure to desired range (0.1 to 1)
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
    
    // Set up pointer events for Apple Pencil
    const handlePointerDown = (e: PointerEvent) => {
      // Only proceed if it's the Apple Pencil or if we're using the eraser
      if (!isApplePencil(e) && currentTool === 'pencil') {
        return;
      }

      e.preventDefault();
      const rect = activeCanvas.getBoundingClientRect();
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
      // Only proceed if we started with the Apple Pencil or if we're using the eraser
      if (!isPencilDrawing.current && currentTool === 'pencil') {
        return;
      }

      e.preventDefault();
      const rect = activeCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pressure = e.pressure || 0.5;

      if (currentTool === 'eraser' && isErasing) {
        checkErasedStrokes(x, y);
      } else if (currentTool === 'pencil' && currentStrokeRef.current.length > 0) {
        continueStroke(x, y, pressure);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
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

    // Add pointer event listeners
    activeCanvas.addEventListener('pointerdown', handlePointerDown);
    activeCanvas.addEventListener('pointermove', handlePointerMove);
    activeCanvas.addEventListener('pointerup', handlePointerUp);
    activeCanvas.addEventListener('pointerout', handlePointerUp);
    activeCanvas.addEventListener('pointercancel', handlePointerUp);

    // Set touch-action to none to prevent scrolling while drawing
    activeCanvas.style.touchAction = 'none';
    
    // Enable Apple Pencil specific features
    (activeCanvas.style as any).WebkitTouchCallout = 'none';
    (activeCanvas.style as any).WebkitUserSelect = 'none';

    return () => {
      activeCanvas.removeEventListener('pointerdown', handlePointerDown);
      activeCanvas.removeEventListener('pointermove', handlePointerMove);
      activeCanvas.removeEventListener('pointerup', handlePointerUp);
      activeCanvas.removeEventListener('pointerout', handlePointerUp);
      activeCanvas.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [currentTool, isErasing, strokeWidth, strokeColor, currentStrokes, erasedStrokes, isDrawing]);

  // Redraw base canvas when strokes change
  useEffect(() => {
    redrawCanvas(baseCanvasRef.current, isErasing ? erasedStrokes : []);
  }, [currentStrokes, erasedStrokes, redrawCanvas, isErasing]);

  const startNewStroke = (x: number, y: number, pressure: number) => {
    if (currentTool !== 'pencil') return;
    
    const ctx = activeCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Add first point to current stroke
    const point = { x, y, pressure };
    currentStrokeRef.current = [point];
    
    // Clear active canvas and draw the initial point
    ctx.clearRect(0, 0, width, height);
    drawStroke(ctx, [point], strokeWidth, strokeColor);
  };

  const continueStroke = (x: number, y: number, pressure: number) => {
    if (currentTool !== 'pencil') return;
    
    const ctx = activeCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Add point to current stroke
    const point = { x, y, pressure };
    currentStrokeRef.current.push(point);
    
    // Clear active canvas and redraw current stroke
    ctx.clearRect(0, 0, width, height);
    drawStroke(ctx, currentStrokeRef.current, strokeWidth, strokeColor);
  };

  const finalizeStroke = () => {
    if (currentTool !== 'pencil' || currentStrokeRef.current.length < 2) return;

    // Create new stroke object
    const newStroke = {
      id: Date.now(),
      tool: currentTool,
      points: currentStrokeRef.current,
      color: strokeColor,
      width: strokeWidth
    };

    // Add stroke to context (this will trigger a redraw of the base canvas)
    addStroke(newStroke);

    // Clear the active canvas
    const ctx = activeCanvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }

    currentStrokeRef.current = [];
  };

  const checkErasedStrokes = (x: number, y: number) => {
    const eraserRadius = strokeWidth * 10;
    console.log('Eraser check at:', { x, y, eraserRadius, currentStrokes: currentStrokes.length });
    
    // Debug visualization
    const ctx = activeCanvasRef.current?.getContext('2d');
    if (ctx) {
      // Save current state
      ctx.save();
      
      // Draw eraser circle
      ctx.beginPath();
      ctx.arc(x, y, eraserRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.stroke();
      
      // Draw points being checked
      currentStrokes.forEach(stroke => {
        stroke.points.forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
          ctx.fill();
        });
      });
      
      // Restore state
      ctx.restore();
    }
    
    const newErasedStrokes = currentStrokes
      .filter(stroke => {
        // Check if any point in the stroke is within eraser radius
        const shouldErase = stroke.points.some(point => {
          const dx = x - point.x;
          const dy = y - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const withinRadius = distance <= eraserRadius;
          if (withinRadius) {
            console.log('Found point to erase:', { strokeId: stroke.id, distance, point });
          }
          return withinRadius;
        });
        return shouldErase;
      })
      .map(stroke => stroke.id);

    console.log('Strokes to erase:', newErasedStrokes);

    if (newErasedStrokes.length > 0) {
      setErasedStrokes(prev => {
        const updated = [...new Set([...prev, ...newErasedStrokes])];
        console.log('Updated erased strokes:', updated);
        return updated;
      });
    }

    // Schedule a redraw to clear debug visualization
    requestAnimationFrame(() => {
      redrawCanvas(activeCanvasRef.current, erasedStrokes);
    });
  };

  return (
    <div className="relative" style={{ width: `${width}px`, height: `${height}px` }}>
      <canvas
        ref={baseCanvasRef}
        className="absolute top-0 left-0 bg-[#1a1b26] touch-none"
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      />
      <canvas
        ref={activeCanvasRef}
        className="absolute top-0 left-0 touch-none"
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  );
} 