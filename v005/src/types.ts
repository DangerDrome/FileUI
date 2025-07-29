// TypeScript type definitions for FileUI v005

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export enum Direction {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical'
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

export interface Panel {
  node: BSPNode;
  element: HTMLElement;
}

export interface HistoryState {
  action: string;
  tree: BSPNodeData;
  markdown: Record<string, string>;
}

export interface LayoutData {
  version: string;
  timestamp: string;
  tree: BSPNodeData;
}

export interface BSPNode {
  id: string;
  parent: BSPNode | null;
  direction: 'horizontal' | 'vertical' | null;
  split: number;
  children: BSPNode[];
  element?: HTMLElement;
  rect?: Rect;
  isPinned: boolean;
  isCollapsed: boolean;
  isMainContent: boolean;
  isToolbar: boolean;
  
  isLeaf(): boolean;
  toJSON(): BSPNodeData;
  getDepth(): number;
  findDeepestUnpinnedNode(): BSPNode | null;
}

export interface PanelManagerConfig {
  RESIZER_THICKNESS: number;
  MIN_PANEL_SIZE: number;
  COLLAPSED_SIZE: number;
  TOOLBAR_SIZE: number;
  ALIGN_THRESHOLD: number;
  DROP_PREVIEW_OPACITY: number;
  MIN_CONTENT_SIZE: number;
  PANEL_HEADER_HEIGHT: number;
}

export interface DragState {
  source: HTMLElement | null;
  offset: Point;
  startPos: Point;
  threshold: number;
  isActive: boolean;
}

export interface PreviewState {
  active: boolean;
  targetNode: BSPNode | null;
  side: 'left' | 'right' | 'top' | 'bottom' | null;
  overlay: HTMLElement | null;
}