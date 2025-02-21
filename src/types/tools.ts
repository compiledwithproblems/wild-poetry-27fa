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
    id: 'daily-tasks',
    name: 'Daily Tasks',
    description: 'Simple template for daily task planning',
    svgPattern: `
      <pattern id="daily-tasks" patternUnits="userSpaceOnUse" width="100%" height="100%">
        <!-- Date section at top -->
        <rect x="40" y="130" width="200" height="2" fill="${TOKYO_NIGHT_COLORS.grey}" fill-opacity="0.4"/>
        
        <!-- Task lines with circles -->
        ${Array.from({ length: 15 }, (_, i) => `
          <circle cx="50" cy="${240 + i * 45}" r="6" stroke="${TOKYO_NIGHT_COLORS.grey}" stroke-width="1" fill="none" opacity="0.35"/>
          <line x1="80" y1="${240 + i * 45}" x2="90%" y2="${240 + i * 45}" stroke="${TOKYO_NIGHT_COLORS.grey}" stroke-width="1" opacity="0.25"/>
        `).join('')}
        
        <!-- Date text guide -->
        <text x="40" y="120" fill="${TOKYO_NIGHT_COLORS.grey}" opacity="0.45" font-size="14">Date:</text>
      </pattern>
      <rect width="100%" height="100%" fill="url(#daily-tasks)"/>
    `,
  },
  {
    id: 'grid',
    name: 'Grid',
    description: 'Graph paper style grid for technical notes',
    svgPattern: `
      <pattern id="grid" patternUnits="userSpaceOnUse" width="25" height="25">
        <!-- Small grid -->
        <path d="M 25 0 L 0 0 0 25" fill="none" stroke="${TOKYO_NIGHT_COLORS.grey}" stroke-width="0.5" stroke-opacity="0.2"/>
        
        <!-- Larger grid every 5 cells -->
        <path d="M 0 0 L 25 0 L 25 25 L 0 25 L 0 0" fill="none" stroke="${TOKYO_NIGHT_COLORS.grey}" stroke-width="0.5" stroke-opacity="0.3"/>
      </pattern>
      <rect width="100%" height="100%" fill="url(#grid)"/>
    `,
  },
  {
    id: 'dot-grid',
    name: 'Dot Grid',
    description: 'Subtle dot pattern for bullet journaling',
    svgPattern: `
      <pattern id="dot-grid" patternUnits="userSpaceOnUse" width="25" height="25">
        <circle cx="12.5" cy="12.5" r="1" fill="${TOKYO_NIGHT_COLORS.grey}" fill-opacity="0.35"/>
      </pattern>
      <rect width="100%" height="100%" fill="url(#dot-grid)"/>
    `,
  },
]; 