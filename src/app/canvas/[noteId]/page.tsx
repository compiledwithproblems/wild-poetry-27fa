'use client';

import { CanvasProvider } from '@/context/CanvasContext';
import Canvas from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import NoteList from '@/components/NoteList';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export default function CanvasPage({ params }: { params: Promise<{ noteId: string }> }) {
  const router = useRouter();
  const { noteId } = use(params);

  useEffect(() => {
    // Verify note exists
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const note = notes.find((n: any) => n.id === noteId);
    if (!note) {
      router.push('/notes');
    }
  }, [noteId, router]);

  return (
    <CanvasProvider initialNoteId={noteId}>
      <main className="min-h-screen bg-[#1a1b26] overflow-hidden">
        <div className="relative w-full h-screen flex items-center justify-center">
          <Canvas width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
          <Toolbar width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
          <NoteList />
        </div>
      </main>
    </CanvasProvider>
  );
} 