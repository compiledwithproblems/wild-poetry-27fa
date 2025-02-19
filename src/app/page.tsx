'use client';

import { CanvasProvider } from '@/context/CanvasContext';
import Canvas from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import NoteList from '@/components/NoteList';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export default function Home() {
  return (
    <CanvasProvider>
      <main className="min-h-screen bg-[#1a1b26] overflow-hidden">
        <div className="relative w-full h-screen flex items-center justify-center">
          <Canvas width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
          <Toolbar />
          <NoteList />
        </div>
      </main>
    </CanvasProvider>
  );
}
