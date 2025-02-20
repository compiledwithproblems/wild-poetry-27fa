export type Tool = 'pencil' | 'eraser' | 'selector';

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  id: number;
  tool: Tool;
  points: Point[];
  color: string;
  width: number;
  path: string;
}

export interface Image {
  id: number;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasElement {
  type: 'stroke' | 'image';
  data: Stroke | Image;
}

export interface Note {
  id: string;
  title: string;
  elements: CanvasElement[];
  createdAt: string;
  updatedAt: string;
}

// Tokyo Night theme colors
export const TOKYO_NIGHT_COLORS = {
  blue: '#7aa2f7',
  red: '#f7768e',
  pink: '#bb9af7',
  green: '#9ece6a',
  yellow: '#e0af68',
  orange: '#ff9e64',
  turquoise: '#73daca',
  purple: '#9d7cd8',
  white: '#c0caf5',
  grey: '#565f89',
} as const;

export type TokyoNightColor = keyof typeof TOKYO_NIGHT_COLORS; 