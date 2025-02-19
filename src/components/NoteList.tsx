import { useCallback, useEffect, useState } from 'react';
import { Note } from '@/types/tools';
import { useCanvasContext } from '@/context/CanvasContext';
import { 
  PlusIcon, 
  DocumentIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

export default function NoteList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const { currentNote, loadNote, createNewNote, deleteNote, saveNote } = useCanvasContext();

  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem('notes') || '[]');
    setNotes(savedNotes);
  }, [currentNote]); // Reload when current note changes

  const handleCreateNote = useCallback(() => {
    const newNote = createNewNote();
    setNotes(prev => [...prev, newNote]);
    setIsExpanded(true);
  }, [createNewNote]);

  const handleDeleteNote = useCallback((noteId: string) => {
    deleteNote(noteId);
    setNotes(prev => prev.filter(note => note.id !== noteId));
  }, [deleteNote]);

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingTitle(note.title || '');
  };

  const saveTitle = () => {
    if (!editingNoteId || !editingTitle.trim()) return;
    
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const noteIndex = notes.findIndex((n: Note) => n.id === editingNoteId);
    
    if (noteIndex >= 0) {
      notes[noteIndex].title = editingTitle.trim();
      localStorage.setItem('notes', JSON.stringify(notes));
      setNotes(notes);
      
      if (currentNote?.id === editingNoteId) {
        loadNote(editingNoteId);
      }
    }
    
    setEditingNoteId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveTitle();
    } else if (e.key === 'Escape') {
      setEditingNoteId(null);
      setEditingTitle('');
    }
  };

  return (
    <div className={`fixed right-6 top-4 bg-[#1f2335] rounded-lg shadow-lg overflow-hidden transition-all duration-200 ${
      isExpanded ? 'w-80' : 'w-12'
    }`}>
      <div className={`flex items-center justify-between ${isExpanded ? 'p-4' : 'p-0'} border-b border-[#292e42]`}>
        <h2 className={`text-[#c0caf5] font-semibold ${isExpanded ? '' : 'hidden'}`}>
          My Notes
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-12 h-12 rounded hover:bg-[#292e42] transition-colors flex justify-center items-center"
        >
          <ChevronDownIcon 
            className={`w-6 h-6 text-[#c0caf5] transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {isExpanded && (
        <>
          <button
            onClick={handleCreateNote}
            className="w-full flex items-center justify-center gap-2 p-2 hover:bg-[#292e42] transition-colors text-[#c0caf5]"
          >
            <PlusIcon className="w-5 h-5" />
            New Note
          </button>

          <div className="max-h-[60vh] overflow-y-auto">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`p-3 border-b border-[#292e42] hover:bg-[#292e42] transition-colors ${
                  currentNote?.id === note.id ? 'bg-[#414868]' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <DocumentIcon className="w-4 h-4 text-[#565f89] flex-shrink-0" />
                  {editingNoteId === note.id ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-[#1a1b26] text-[#c0caf5] px-2 py-1 rounded text-sm"
                        autoFocus
                      />
                      <button
                        onClick={saveTitle}
                        className="p-1 text-[#9ece6a] hover:bg-[#506187] rounded"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingNoteId(null);
                          setEditingTitle('');
                        }}
                        className="p-1 text-[#f7768e] hover:bg-[#506187] rounded"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="text-[#c0caf5] text-sm font-medium truncate cursor-pointer"
                          onClick={() => loadNote(note.id)}
                        >
                          {note.title}
                        </h3>
                        <p className="text-[#565f89] text-xs">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => startEditing(note)}
                          className="p-1 rounded hover:bg-[#506187] transition-colors"
                        >
                          <PencilSquareIcon className="w-4 h-4 text-[#c0caf5]" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 rounded hover:bg-[#506187] transition-colors"
                        >
                          <TrashIcon className="w-4 h-4 text-[#f7768e]" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 