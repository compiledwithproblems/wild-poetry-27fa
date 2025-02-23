import { useCallback, useEffect, useState } from 'react';
import { Note, Tag, TOKYO_NIGHT_COLORS } from '@/types/tools';
import { useCanvasContext } from '@/context/CanvasContext';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  DocumentIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

export default function NoteList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [editingTags, setEditingTags] = useState<Tag[]>([]);
  const router = useRouter();
  const { currentNote, loadNote, createNewNote, deleteNote, saveNote } = useCanvasContext();

  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem('notes') || '[]');
    // Sort by updatedAt and take only last 5
    const recentNotes = savedNotes
      .sort((a: Note, b: Note) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
    setNotes(recentNotes);
  }, [currentNote]); // Reload when current note changes

  const handleCreateNote = useCallback(async () => {
    const newNote = await createNewNote();
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
    setEditingTags(note.tags || []);
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;

    const colorKeys = Object.keys(TOKYO_NIGHT_COLORS) as (keyof typeof TOKYO_NIGHT_COLORS)[];
    const randomColor = colorKeys[Math.floor(Math.random() * (colorKeys.length - 2))];

    const newTag: Tag = {
      id: Date.now().toString(),
      name: newTagName.trim(),
      color: randomColor,
    };

    setEditingTags(prev => [...prev, newTag]);
    setNewTagName('');
  };

  const removeTag = (tagId: string) => {
    setEditingTags(prev => prev.filter(tag => tag.id !== tagId));
  };

  const saveTitle = () => {
    if (!editingNoteId || !editingTitle.trim()) return;
    
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const noteIndex = notes.findIndex((n: Note) => n.id === editingNoteId);
    
    if (noteIndex >= 0) {
      notes[noteIndex].title = editingTitle.trim();
      notes[noteIndex].tags = editingTags;
      localStorage.setItem('notes', JSON.stringify(notes));
      setNotes(notes);
      
      if (currentNote?.id === editingNoteId) {
        loadNote(editingNoteId);
      }
    }
    
    setEditingNoteId(null);
    setEditingTitle('');
    setEditingTags([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      setEditingNoteId(null);
      setEditingTitle('');
      setEditingTags([]);
    }
  };

  return (
    <div className={`fixed right-6 top-4 bg-[#1f2335] rounded-lg shadow-lg overflow-hidden transition-all duration-200 ${
      isExpanded ? 'w-80' : 'w-12'
    }`}>
      <div className={`flex items-center justify-between ${isExpanded ? 'p-4' : 'p-0'} border-b border-[#292e42]`}>
        <h2 className={`text-[#c0caf5] font-semibold ${isExpanded ? '' : 'hidden'}`}>
          Recent Notes
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
          <div className="flex items-center justify-between p-2 border-b border-[#292e42]">
            <button
              onClick={() => router.push('/notes')}
              className="flex items-center gap-2 text-[#c0caf5] hover:bg-[#292e42] px-3 py-1.5 rounded-lg transition-colors"
            >
              <HomeIcon className="w-5 h-5" />
              All Notes
            </button>
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-2 text-[#c0caf5] hover:bg-[#292e42] px-3 py-1.5 rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              New
            </button>
          </div>

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
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center gap-1">
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
                            setEditingTags([]);
                          }}
                          className="p-1 text-[#f7768e] hover:bg-[#506187] rounded"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="Add tag"
                          className="flex-1 bg-[#1a1b26] text-[#c0caf5] px-2 py-1 rounded text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                        />
                        <button
                          onClick={handleAddTag}
                          className="text-xs px-2 py-1 bg-[#414868] text-[#c0caf5] rounded hover:bg-[#506187]"
                        >
                          Add
                        </button>
                      </div>

                      {editingTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {editingTags.map(tag => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                              style={{ 
                                backgroundColor: `${TOKYO_NIGHT_COLORS[tag.color]}20`,
                                color: TOKYO_NIGHT_COLORS[tag.color]
                              }}
                            >
                              {tag.name}
                              <button
                                onClick={() => removeTag(tag.id)}
                                className="hover:opacity-75"
                              >
                                <XMarkIcon className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
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
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {note.tags.map(tag => (
                              <span
                                key={tag.id}
                                className="px-1.5 py-0.5 text-xs rounded"
                                style={{ 
                                  backgroundColor: `${TOKYO_NIGHT_COLORS[tag.color]}20`,
                                  color: TOKYO_NIGHT_COLORS[tag.color]
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
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