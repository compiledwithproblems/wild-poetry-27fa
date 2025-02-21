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

export interface Template {
  id: string;
  name: string;
  description: string;
  svgPattern: string;
}

export interface Note {
  id: string;
  title: string;
  elements: CanvasElement[];
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  template: {
    id: string;
    options?: Record<string, any>;
  };
}

export interface Tag {
  id: string;
  name: string;
  color: keyof typeof TOKYO_NIGHT_COLORS;
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

// Define our initial templates
export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank Page',
    description: 'A clean, blank canvas for free-form notes',
    svgPattern: '',
  },
  {
    id: 'college-ruled',
    name: 'College Ruled',
    description: 'Traditional lined paper with college rule spacing',
    svgPattern: `
      <pattern id="college-ruled" patternUnits="userSpaceOnUse" width="100%" height="25">
        <line x1="0" y1="24" x2="100%" y2="24" stroke="#565f89" stroke-width="0.5" stroke-opacity="0.2"/>
      </pattern>
      <rect width="100%" height="100%" fill="url(#college-ruled)"/>
    `,
  },
]; 