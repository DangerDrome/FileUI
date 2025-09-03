// TypeScript type definitions for FileUI v005

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BSPNodeData {
  id: string;
  direction: 'horizontal' | 'vertical' | null;
  split: number;
  isPinned: boolean;
  isCollapsed: boolean;
  isMainContent: boolean;
  isToolbar: boolean;
  children: BSPNodeData[];
  leaf?: boolean;
}