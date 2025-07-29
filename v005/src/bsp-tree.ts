// BSP Tree implementation for panel management
import { BSPNodeData, Rect } from './types';

export class BSPNode {
  id: string;
  parent: BSPNode | null;
  children: BSPNode[];
  direction: 'horizontal' | 'vertical' | null;
  split: number;
  element?: HTMLElement;
  rect?: Rect;
  isPinned: boolean;
  isCollapsed: boolean;
  isMainContent: boolean;
  isToolbar: boolean;

  constructor(options: Partial<BSPNode> = {}) {
    this.id = options.id || crypto.randomUUID();
    this.parent = options.parent || null;
    this.children = options.children || [];
    this.direction = options.direction || null;
    this.split = options.split ?? 0.5;
    this.element = options.element;
    this.isPinned = options.isPinned || false;
    this.isCollapsed = options.isCollapsed || false;
    this.isMainContent = options.isMainContent || false;
    this.isToolbar = options.isToolbar || false;
  }

  isLeaf(): boolean {
    return this.children.length === 0;
  }

  getSibling(): BSPNode | null {
    if (!this.parent) return null;
    return this.parent.children.find(child => child !== this) || null;
  }

  getDepth(): number {
    let depth = 0;
    let node: BSPNode | null = this.parent;
    while (node) {
      depth++;
      node = node.parent;
    }
    return depth;
  }


  findDeepestUnpinnedNode(): BSPNode | null {
    if (this.isLeaf()) {
      return this.isPinned ? null : this;
    }

    let deepestNode: BSPNode | null = null;
    let maxDepth = -1;

    const traverse = (node: BSPNode, depth: number): void => {
      if (node.isLeaf() && !node.isPinned) {
        if (depth > maxDepth) {
          maxDepth = depth;
          deepestNode = node;
        }
      } else {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    };

    traverse(this, 0);
    return deepestNode;
  }

  clone(parent: BSPNode | null = null): BSPNode {
    const newChildren: BSPNode[] = [];
    const newInstance = new BSPNode({
      id: this.id,
      parent,
      direction: this.direction,
      split: this.split,
      isPinned: this.isPinned,
      isCollapsed: this.isCollapsed,
      isMainContent: this.isMainContent,
      isToolbar: this.isToolbar,
      children: newChildren,
      element: this.element // Keep reference to original element
    });
    newChildren.push(...this.children.map(c => c.clone(newInstance)));
    return newInstance;
  }

  toJSON(): BSPNodeData {
    const obj: BSPNodeData = {
      id: this.id,
      direction: this.direction,
      split: this.split,
      isPinned: this.isPinned,
      isCollapsed: this.isCollapsed,
      isMainContent: this.isMainContent,
      isToolbar: this.isToolbar,
      children: this.children.map(c => c.toJSON())
    };
    if (this.isLeaf()) {
      obj.leaf = true;
    }
    return obj;
  }

  static fromJSON(
    json: BSPNodeData, 
    parent: BSPNode | null, 
    panelElementsMap: Map<string, HTMLElement>
  ): BSPNode {
    const node = new BSPNode({ ...json, parent });
    if (json.leaf) {
      node.element = panelElementsMap.get(json.id);
    } else {
      node.children = json.children.map(childJson => 
        BSPNode.fromJSON(childJson, node, panelElementsMap)
      );
    }
    return node;
  }
}