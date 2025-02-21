import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Tool, Stroke, Point, TOKYO_NIGHT_COLORS, CanvasElement, Note } from '@/types/tools';
import { getStroke } from 'perfect-freehand';

// Configuration for Perfect Freehand
const getPerfectFreehandOptions = (width: number) => ({
  size: width,
  thinning: 0.5,      // How much the stroke thins out
  smoothing: 0.5,     // How much to smooth the stroke
  streamline: 0.5,    // How much to streamline the stroke
  easing: (t: number) => t, // Linear easing
  last: true,         // End the line with a sharp point
});

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

interface CanvasContextType {
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;
  currentStrokes: Stroke[];
  addStroke: (stroke: Stroke) => void;
  removeStrokes: (strokeIds: number[]) => void;
  currentNote: Note | null;
  setCurrentNote: (note: Note | null) => void;
  saveNote: () => void;
  redrawCanvas: (canvas: HTMLCanvasElement | null, erasedStrokeIds?: number[]) => void;
  loadNote: (noteId: string) => void;
  createNewNote: () => Note;
  deleteNote: (noteId: string) => void;
  isErasing: boolean;
  setIsErasing: (isErasing: boolean) => void;
  erasedStrokes: number[];
  setErasedStrokes: (erasedStrokes: number[]) => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ 
  children,
  initialNoteId
}: { 
  children: ReactNode;
  initialNoteId?: string;
}) {
  const [currentTool, setCurrentTool] = useState<Tool>('pencil');
  const [strokeColor, setStrokeColor] = useState<string>(TOKYO_NIGHT_COLORS.white);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStrokes, setCurrentStrokes] = useState<Stroke[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isErasing, setIsErasing] = useState(false);
  const [erasedStrokes, setErasedStrokes] = useState<number[]>([]);

  // Load initial note if provided
  useEffect(() => {
    if (initialNoteId) {
      loadNote(initialNoteId);
    }
  }, [initialNoteId]);

  const handleSetCurrentTool = useCallback((tool: Tool) => {
    console.log('CanvasContext: Changing tool from', currentTool, 'to', tool);
    setCurrentTool(tool);
  }, [currentTool]);

  const addStroke = useCallback((stroke: Stroke) => {
    setCurrentStrokes(prev => [...prev, stroke]);
  }, []);

  const removeStrokes = useCallback((strokeIds: number[]) => {
    setCurrentStrokes(prev => prev.filter(stroke => !strokeIds.includes(stroke.id)));
  }, []);

  const saveNote = useCallback(() => {
    if (!currentNote) return;

    console.log('Saving note:', { 
      noteId: currentNote.id, 
      strokeCount: currentStrokes.length 
    });

    const updatedNote = {
      ...currentNote,
      elements: currentStrokes.map(stroke => ({
        type: 'stroke' as const,
        data: stroke,
      })),
      updatedAt: new Date().toISOString(),
    };

    // Save to localStorage
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const noteIndex = notes.findIndex((note: Note) => note.id === currentNote.id);
    
    if (noteIndex >= 0) {
      notes[noteIndex] = updatedNote;
    } else {
      notes.push(updatedNote);
    }

    localStorage.setItem('notes', JSON.stringify(notes));
    setCurrentNote(updatedNote);
  }, [currentNote, currentStrokes]);

  const loadNote = useCallback((noteId: string) => {
    console.log('Loading note:', noteId);
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const note = notes.find((n: Note) => n.id === noteId);
    
    if (note) {
      setCurrentNote(note);
      // Extract strokes from note elements
      const strokes = note.elements
        .filter((element: CanvasElement) => element.type === 'stroke')
        .map((element: CanvasElement) => element.data as Stroke);
      
      setCurrentStrokes(strokes);
      setErasedStrokes([]);
      console.log('Loaded note with', strokes.length, 'strokes');
    }
  }, []);

  const createNewNote = useCallback((): Note => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: `Note ${Date.now()}`,
      elements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to localStorage
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.push(newNote);
    localStorage.setItem('notes', JSON.stringify(notes));

    // Set as current note
    setCurrentNote(newNote);
    setCurrentStrokes([]);
    setErasedStrokes([]);
    
    console.log('Created new note:', newNote.id);
    return newNote;
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    console.log('Deleting note:', noteId);
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const updatedNotes = notes.filter((note: Note) => note.id !== noteId);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));

    // If current note was deleted, create a new one
    if (currentNote?.id === noteId) {
      createNewNote();
    }
  }, [currentNote, createNewNote]);

  // Auto-save effect
  useEffect(() => {
    if (currentNote && currentStrokes.length > 0) {
      const timeoutId = setTimeout(() => {
        saveNote();
      }, 1000); // Auto-save after 1 second of no changes

      return () => clearTimeout(timeoutId);
    }
  }, [currentNote, currentStrokes, saveNote]);

  const redrawCanvas = useCallback((canvas: HTMLCanvasElement | null, erasedStrokeIds: number[] = []) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('Redrawing canvas:', {
      totalStrokes: currentStrokes.length,
      erasedIds: erasedStrokeIds,
    });

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes except erased ones
    const strokesToDraw = currentStrokes.filter(stroke => !erasedStrokeIds.includes(stroke.id));
    console.log('Drawing strokes:', strokesToDraw.length);

    strokesToDraw.forEach(stroke => {
      if (stroke.points.length < 2) return;
      drawStroke(ctx, stroke.points, stroke.width, stroke.color);
    });
  }, [currentStrokes]);

  return (
    <CanvasContext.Provider
      value={{
        currentTool,
        setCurrentTool: handleSetCurrentTool,
        strokeColor,
        setStrokeColor,
        strokeWidth,
        setStrokeWidth,
        isDrawing,
        setIsDrawing,
        currentStrokes,
        addStroke,
        removeStrokes,
        currentNote,
        setCurrentNote,
        saveNote,
        redrawCanvas,
        loadNote,
        createNewNote,
        deleteNote,
        isErasing,
        setIsErasing,
        erasedStrokes,
        setErasedStrokes,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvasContext() {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvasContext must be used within a CanvasProvider');
  }
  return context;
} 