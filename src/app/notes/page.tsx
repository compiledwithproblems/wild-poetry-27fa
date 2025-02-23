'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Note, Tag, TOKYO_NIGHT_COLORS, TEMPLATES } from '@/types/tools';
import { dbHelpers } from '@/services/db';
import { 
  PlusIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  TagIcon,
  EllipsisHorizontalIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTags, setFilterTags] = useState<Tag[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTags, setEditingTags] = useState<Tag[]>([]);
  const [editTagName, setEditTagName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]); // Default to blank template

  // Get all unique tags from notes
  const availableTags = useMemo(() => {
    const tagMap = new Map<string, Tag>();
    notes.forEach(note => {
      note.tags?.forEach(tag => {
        tagMap.set(tag.id, tag);
      });
    });
    return Array.from(tagMap.values());
  }, [notes]);

  // Filter notes based on search query and selected filter tags
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      // Filter by search query (title or date)
      const searchLower = searchQuery.toLowerCase();
      const titleMatch = note.title.toLowerCase().includes(searchLower);
      const dateMatch = new Date(note.createdAt).toLocaleDateString().toLowerCase().includes(searchLower);
      const matchesSearch = !searchQuery || titleMatch || dateMatch;

      // Filter by selected tags
      const matchesTags = !filterTags.length || 
        filterTags.every(filterTag => 
          note.tags?.some(noteTag => noteTag.id === filterTag.id)
        );

      return matchesSearch && matchesTags;
    });
  }, [notes, searchQuery, filterTags]);

  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem('notes') || '[]');
    // Sort notes by last updated
    savedNotes.sort((a: Note, b: Note) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setNotes(savedNotes);
  }, []);

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }

    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return;

    const newNote: Note = {
      id: Date.now().toString(),
      title: newNoteTitle.trim(),
      elements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: selectedTags,
      template: {
        id: selectedTemplate.id
      }
    };

    // Save to localStorage
    try {
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      notes.push(newNote);
      localStorage.setItem('notes', JSON.stringify(notes));
      console.log('✅ localStorage: Note saved successfully');
    } catch (error) {
      console.error('❌ localStorage: Error saving note:', error);
    }

    // Save to IndexedDB
    try {
      await dbHelpers.saveNote(newNote);
      console.log('✅ IndexedDB: Note saved successfully');
    } catch (error) {
      console.error('❌ IndexedDB: Error saving note:', error);
    }

    // Navigate to canvas with this note
    router.push(`/canvas/${newNote.id}`);
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    if (selectedTags.length >= 4) return; // Prevent adding more than 4 tags

    const colorKeys = Object.keys(TOKYO_NIGHT_COLORS) as (keyof typeof TOKYO_NIGHT_COLORS)[];
    const randomColor = colorKeys[Math.floor(Math.random() * (colorKeys.length - 2))]; // Exclude white and grey

    const newTag: Tag = {
      id: Date.now().toString(),
      name: newTagName.trim(),
      color: randomColor,
    };

    setSelectedTags(prev => [...prev, newTag]);
    setNewTagName('');
  };

  const removeTag = (tagId: string) => {
    setSelectedTags(prev => prev.filter(tag => tag.id !== tagId));
  };

  const toggleFilterTag = (tag: Tag) => {
    setFilterTags(prev => 
      prev.some(t => t.id === tag.id)
        ? prev.filter(t => t.id !== tag.id)
        : [...prev, tag]
    );
  };

  const handleEditNote = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to canvas
    setEditingNote(note);
    setEditingTitle(note.title);
    setEditingTags(note.tags || []);
    setEditTagName('');
  };

  const handleAddEditTag = () => {
    if (!editTagName.trim() || editingTags.length >= 4) return;

    const colorKeys = Object.keys(TOKYO_NIGHT_COLORS) as (keyof typeof TOKYO_NIGHT_COLORS)[];
    const randomColor = colorKeys[Math.floor(Math.random() * (colorKeys.length - 2))];

    const newTag: Tag = {
      id: Date.now().toString(),
      name: editTagName.trim(),
      color: randomColor,
    };

    setEditingTags(prev => [...prev, newTag]);
    setEditTagName('');
  };

  const handleSaveEdit = () => {
    if (!editingNote || !editingTitle.trim()) return;

    const updatedNote = {
      ...editingNote,
      title: editingTitle.trim(),
      tags: editingTags,
      updatedAt: new Date().toISOString(),
    };

    // Update in localStorage
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const noteIndex = notes.findIndex((n: Note) => n.id === editingNote.id);
    if (noteIndex >= 0) {
      notes[noteIndex] = updatedNote;
      localStorage.setItem('notes', JSON.stringify(notes));
      setNotes(notes);
    }

    setEditingNote(null);
    setEditingTitle('');
    setEditingTags([]);
  };

  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to canvas
    
    // Delete from localStorage
    try {
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      const updatedNotes = notes.filter((note: Note) => note.id !== noteId);
      localStorage.setItem('notes', JSON.stringify(updatedNotes));
      setNotes(updatedNotes);
    } catch (error) {
      console.error('Error deleting from localStorage:', error);
    }

    // Delete from IndexedDB
    try {
      await dbHelpers.deleteNote(noteId);
    } catch (error) {
      console.error('Error deleting from IndexedDB:', error);
    }

    // Close the edit modal and redirect to notes page
    setEditingNote(null);
    setEditingTitle('');
    setEditingTags([]);
  };

  return (
    <main className="min-h-screen bg-[#1a1b26] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-[#c0caf5] text-2xl font-semibold">My Notes</h1>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#414868] text-[#c0caf5] px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#506187] transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              New Note
            </button>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#565f89]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or date..."
                className="w-full bg-[#1f2335] text-[#c0caf5] pl-10 pr-4 py-2 rounded-xl border border-[#292e42] focus:outline-none focus:border-[#414868]"
              />
            </div>
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                  filterTags.length > 0 
                    ? 'bg-[#414868] text-[#c0caf5]' 
                    : 'bg-[#1f2335] text-[#565f89] border border-[#292e42]'
                }`}
              >
                <FunnelIcon className="w-5 h-5" />
                {filterTags.length > 0 ? `${filterTags.length} filters` : 'Filter'}
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#1f2335] rounded-xl shadow-lg border border-[#292e42] p-4 z-10">
                  <h3 className="text-[#c0caf5] font-medium mb-2 flex items-center gap-2">
                    <TagIcon className="w-4 h-4" />
                    Filter by Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleFilterTag(tag)}
                        className={`px-2 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                          filterTags.some(t => t.id === tag.id)
                            ? 'bg-[#414868] text-[#c0caf5]'
                            : 'bg-[#292e42] text-[#565f89]'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => router.push(`/canvas/${note.id}`)}
              className="group cursor-pointer"
            >
              <div className="aspect-square bg-[#1f2335] rounded-2xl p-6 flex flex-col hover:bg-[#292e42] transition-all duration-200 hover:shadow-lg relative">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-[#c0caf5] text-lg font-medium truncate flex-1">
                    {note.title}
                  </h2>
                  <button
                    onClick={(e) => handleEditNote(note, e)}
                    className="p-1 rounded-lg hover:bg-[#414868] transition-colors"
                  >
                    <EllipsisHorizontalIcon className="w-5 h-5 text-[#565f89]" />
                  </button>
                </div>
                <div className="flex-1" />
                <div className="h-[72px] flex flex-wrap gap-2 content-start mt-2 overflow-hidden">
                  {note.tags?.slice(0, 4).map(tag => (
                    <span
                      key={tag.id}
                      className="px-2 py-1 text-xs rounded-lg whitespace-nowrap"
                      style={{ 
                        backgroundColor: `${TOKYO_NIGHT_COLORS[tag.color]}20`,
                        color: TOKYO_NIGHT_COLORS[tag.color]
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
                <p className="text-[#565f89] text-sm mt-2">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1f2335] rounded-lg p-6 w-full max-w-md">
            <h2 className="text-[#c0caf5] text-xl font-semibold mb-4">Edit Note</h2>
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              placeholder="Note title"
              className="w-full bg-[#292e42] text-[#c0caf5] px-4 py-2 rounded-lg mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') {
                  setEditingNote(null);
                  setEditingTitle('');
                  setEditingTags([]);
                }
              }}
            />

            <div className="mb-4">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  placeholder="Add a tag"
                  className="flex-1 bg-[#292e42] text-[#c0caf5] px-4 py-2 rounded-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEditTag();
                    }
                  }}
                />
                <button
                  onClick={handleAddEditTag}
                  disabled={editingTags.length >= 4}
                  className="px-4 py-2 bg-[#414868] text-[#c0caf5] rounded-lg hover:bg-[#506187] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              {editingTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editingTags.map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm"
                      style={{ 
                        backgroundColor: `${TOKYO_NIGHT_COLORS[tag.color]}20`,
                        color: TOKYO_NIGHT_COLORS[tag.color]
                      }}
                    >
                      {tag.name}
                      <button
                        onClick={() => setEditingTags(prev => prev.filter(t => t.id !== tag.id))}
                        className="hover:opacity-75"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={(e) => handleDeleteNote(editingNote.id, e)}
                className="px-4 py-2 rounded-lg text-[#f7768e] hover:bg-[#292e42] transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setEditingNote(null);
                  setEditingTitle('');
                  setEditingTags([]);
                }}
                className="px-4 py-2 rounded-lg text-[#565f89] hover:bg-[#292e42] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-[#414868] text-[#c0caf5] px-4 py-2 rounded-lg hover:bg-[#506187] transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Note Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#1f2335] rounded-lg p-6 w-full max-w-md">
            <h2 className="text-[#c0caf5] text-xl font-semibold mb-4">Create New Note</h2>
            
            {/* Title Input */}
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Enter note title"
              className="w-full bg-[#292e42] text-[#c0caf5] px-4 py-2 rounded-lg mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNote();
                if (e.key === 'Escape') setIsCreateModalOpen(false);
              }}
            />

            {/* Template Selection */}
            <div className="mb-4">
              <label className="text-[#c0caf5] text-sm font-medium mb-2 block">
                Choose Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedTemplate.id === template.id
                        ? 'border-[#7aa2f7] bg-[#292e42]'
                        : 'border-[#292e42] hover:border-[#414868]'
                    }`}
                  >
                    <h3 className="text-[#c0caf5] font-medium mb-1">{template.name}</h3>
                    <p className="text-[#565f89] text-sm">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tag Section */}
            <div className="mb-4">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Add a tag"
                  className="flex-1 bg-[#292e42] text-[#c0caf5] px-4 py-2 rounded-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <button
                  onClick={handleAddTag}
                  disabled={selectedTags.length >= 4}
                  className="px-4 py-2 bg-[#414868] text-[#c0caf5] rounded-lg hover:bg-[#506187] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm"
                      style={{ 
                        backgroundColor: `${TOKYO_NIGHT_COLORS[tag.color]}20`,
                        color: TOKYO_NIGHT_COLORS[tag.color]
                      }}
                    >
                      {tag.name}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(tag.id);
                        }}
                        className="hover:opacity-75"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setSelectedTags([]);
                  setNewTagName('');
                  setSelectedTemplate(TEMPLATES[0]);
                }}
                className="px-4 py-2 rounded-lg text-[#565f89] hover:bg-[#292e42] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNote}
                className="bg-[#414868] text-[#c0caf5] px-4 py-2 rounded-lg hover:bg-[#506187] transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 