import { openDB, DBSchema, IDBPDatabase, deleteDB } from 'idb';
import { Note, Stroke } from '@/types/tools';

interface NotesDB extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: { 'by-updatedAt': string };
  };
  strokes: {
    key: number;
    value: Stroke & { noteId: string };
    indexes: { 'by-noteId': string };
  };
}

// Initialize database
export const initDB = async () => {
  return await openDB<NotesDB>('canvas_notes_db', 1, {
    upgrade(db) {
      // Create notes store if it doesn't exist
      if (!db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('by-updatedAt', 'updatedAt');
      }
      
      // Create strokes store if it doesn't exist
      if (!db.objectStoreNames.contains('strokes')) {
        const strokesStore = db.createObjectStore('strokes', { 
          keyPath: 'id',
          autoIncrement: true 
        });
        strokesStore.createIndex('by-noteId', 'noteId');
      }
    },
  });
};

// Helper functions for database operations
export const dbHelpers = {
  // Save note to IndexedDB
  async saveNote(note: Note) {
    console.log('📝 IndexedDB: Saving note:', { 
      id: note.id, 
      title: note.title,
      updatedAt: new Date().toISOString() 
    });
    const db = await initDB();
    await db.put('notes', {
      ...note,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ IndexedDB: Note saved successfully');
  },

  // Save strokes to IndexedDB
  async saveStrokes(noteId: string, strokes: Stroke[]) {
    console.log('✏️ IndexedDB: Saving strokes:', { 
      noteId, 
      strokeCount: strokes.length 
    });
    try {
      const db = await initDB();
      
      // Start a transaction and get the store
      const tx = db.transaction('strokes', 'readwrite');
      const store = tx.store;
      
      // First, remove existing strokes for this note
      const index = store.index('by-noteId');
      const existingKeys = await index.getAllKeys(noteId);
      await Promise.all(existingKeys.map(key => store.delete(key)));
      
      // Then add all current strokes
      await Promise.all(strokes.map(stroke => 
        store.add({
          ...stroke,
          noteId
        })
      ));
      
      await tx.done;
      console.log('✅ IndexedDB: Strokes saved successfully');
    } catch (error) {
      console.error('❌ IndexedDB: Error saving strokes:', error);
      throw error;
    }
  },

  // Get note by ID
  async getNote(noteId: string): Promise<Note | undefined> {
    console.log('🔍 IndexedDB: Fetching note:', noteId);
    const db = await initDB();
    const note = await db.get('notes', noteId);
    console.log('📄 IndexedDB: Note found:', note ? 'yes' : 'no');
    return note;
  },

  // Get strokes for a note
  async getStrokes(noteId: string): Promise<Stroke[]> {
    console.log('🔍 IndexedDB: Fetching strokes for note:', noteId);
    try {
      const db = await initDB();
      
      // Check if store exists
      if (!db.objectStoreNames.contains('strokes')) {
        console.log('⚠️ IndexedDB: Strokes store not found');
        return [];
      }

      // Start a transaction
      const tx = db.transaction('strokes', 'readonly');
      const store = tx.store;

      // Check if index exists
      const indexExists = Array.from(store.indexNames).includes('by-noteId');
      if (!indexExists) {
        console.log('⚠️ IndexedDB: by-noteId index not found, recreating database');
        // Close current database connection
        db.close();
        // Delete the database to force upgrade
        await deleteDB('canvas_notes_db');
        // Reinitialize database (this will recreate the index)
        await initDB();
        return [];
      }

      const index = store.index('by-noteId');
      const strokes = await index.getAll(noteId);
      
      console.log('✏️ IndexedDB: Found strokes:', strokes.length);
      return strokes.map(({ noteId, ...stroke }) => stroke);
    } catch (error) {
      console.error('❌ IndexedDB: Error fetching strokes:', error);
      return [];
    }
  },

  // Get all notes
  async getAllNotes(): Promise<Note[]> {
    console.log('🔍 IndexedDB: Fetching all notes');
    const db = await initDB();
    const notes = await db.getAll('notes');
    console.log('📚 IndexedDB: Found notes:', notes.length);
    return notes;
  },

  // Delete note and its strokes
  async deleteNote(noteId: string) {
    console.log('🗑️ IndexedDB: Deleting note and strokes:', noteId);
    try {
      const db = await initDB();
      const tx = db.transaction(['notes', 'strokes'], 'readwrite');
      
      // Delete note
      await tx.objectStore('notes').delete(noteId);
      
      // Delete associated strokes
      const strokesIndex = tx.objectStore('strokes').index('by-noteId');
      const strokeKeys = await strokesIndex.getAllKeys(noteId);
      await Promise.all(strokeKeys.map(key => 
        tx.objectStore('strokes').delete(key)
      ));
      
      await tx.done;
      console.log('✅ IndexedDB: Note and strokes deleted successfully');
    } catch (error) {
      console.error('❌ IndexedDB: Error deleting note:', error);
      throw error;
    }
  }
}; 