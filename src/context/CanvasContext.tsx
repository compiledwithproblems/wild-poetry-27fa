import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { Tool, Stroke, Point, TOKYO_NIGHT_COLORS, CanvasElement, Note } from '@/types/tools';
import { getStroke } from 'perfect-freehand';
import { dbHelpers } from '@/services/db';
import { useRouter } from 'next/navigation';

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
  createNewNote: () => Promise<Note>;
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
  const isLoadingRef = useRef(false);
  const router = useRouter();

  const loadNote = useCallback(async (noteId: string) => {
    if (isLoadingRef.current) return; // Prevent duplicate loads
    isLoadingRef.current = true;
    
    console.log('🔍 Starting load operation for note:', noteId);
    
    try {
      // Try to load from IndexedDB first
      const note = await dbHelpers.getNote(noteId);
      if (!note) {
        console.log('⚠️ Note not found in IndexedDB, checking localStorage');
        // Only check localStorage if not in IndexedDB
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const localNote = notes.find((n: Note) => n.id === noteId);
        
        if (!localNote) {
          console.log('⚠️ Note not found in either storage');
          return;
        }
        
        setCurrentNote(localNote);
        const strokes = localNote.elements
          .filter((element: CanvasElement) => element.type === 'stroke')
          .map((element: CanvasElement) => element.data as Stroke);
        
        setCurrentStrokes(strokes);
        setErasedStrokes([]);
        console.log('✅ Note loaded from localStorage');
        return;
      }

      // If we have a note, get its strokes
      const strokes = await dbHelpers.getStrokes(noteId);
      setCurrentNote(note);
      setCurrentStrokes(strokes);
      setErasedStrokes([]);
      console.log('✅ Note loaded from IndexedDB');
    } catch (error) {
      console.error('❌ Error loading note:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  // Load initial note if provided
  useEffect(() => {
    if (initialNoteId && !isLoadingRef.current && !currentNote) {
      loadNote(initialNoteId);
    }
  }, [initialNoteId, loadNote, currentNote]);

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

  const saveNote = useCallback(async () => {
    if (!currentNote) return;

    console.log('💾 Starting save operation for note:', { 
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

    // Save to localStorage (keeping existing functionality)
    try {
      console.log('💾 localStorage: Saving note');
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      const noteIndex = notes.findIndex((note: Note) => note.id === currentNote.id);
      
      if (noteIndex >= 0) {
        notes[noteIndex] = updatedNote;
        console.log('📝 localStorage: Updated existing note');
      } else {
        notes.push(updatedNote);
        console.log('📝 localStorage: Added new note');
      }

      localStorage.setItem('notes', JSON.stringify(notes));
      console.log('✅ localStorage: Save successful');
    } catch (error) {
      console.error('❌ localStorage: Error saving:', error);
    }

    // Also save to IndexedDB
    try {
      await dbHelpers.saveNote(updatedNote);
      await dbHelpers.saveStrokes(currentNote.id, currentStrokes);
    } catch (error) {
      console.error('❌ IndexedDB: Error saving:', error);
    }

    setCurrentNote(updatedNote);
    console.log('✅ Save operation completed');
  }, [currentNote, currentStrokes]);

  const createNewNote = useCallback(async (): Promise<Note> => {
    console.log('📝 Creating new note');
    const newNote: Note = {
      id: Date.now().toString(),
      title: `Note ${Date.now()}`,
      elements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      template: {
        id: 'blank'
      }
    };

    // Save to both storages
    try {
      console.log('💾 Saving new note to both storages');
      
      // Save to localStorage
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      notes.push(newNote);
      localStorage.setItem('notes', JSON.stringify(notes));
      console.log('✅ localStorage: New note saved');

      // Save to IndexedDB
      await dbHelpers.saveNote(newNote);
      console.log('✅ IndexedDB: New note saved');
    } catch (error) {
      console.error('❌ Error saving new note:', error);
    }

    // Set as current note
    setCurrentNote(newNote);
    setCurrentStrokes([]);
    setErasedStrokes([]);
    
    console.log('✅ New note created:', newNote.id);
    return newNote;
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    console.log('Deleting note:', noteId);
    
    // Delete from localStorage
    try {
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      const updatedNotes = notes.filter((note: Note) => note.id !== noteId);
      localStorage.setItem('notes', JSON.stringify(updatedNotes));
    } catch (error) {
      console.error('Error deleting from localStorage:', error);
    }

    // Delete from IndexedDB
    try {
      await dbHelpers.deleteNote(noteId);
    } catch (error) {
      console.error('Error deleting from IndexedDB:', error);
    }

    // If current note was deleted, redirect to homepage
    if (currentNote?.id === noteId) {
      router.push('/notes');
    }
  }, [currentNote]);

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