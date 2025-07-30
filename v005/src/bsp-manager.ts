// BSP Panel Manager for FileUI v005 - Ultra-thin design
// Based on v003 but adapted for the main content area only

export interface BSPConfig {
  DEFAULT_SPLIT: number;
  PANEL_MIN_WIDTH: number;
  PANEL_MIN_HEIGHT: number;
  RESIZER_THICKNESS: number;
  COLLAPSED_SIZE: number;
  HEADER_HEIGHT: number;
}

export const BSP_CONFIG: BSPConfig = {
  DEFAULT_SPLIT: 0.5,
  PANEL_MIN_WIDTH: 120,
  PANEL_MIN_HEIGHT: 80,
  RESIZER_THICKNESS: 12, // Gap between panels
  COLLAPSED_SIZE: 24,
  HEADER_HEIGHT: 24
};

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class BSPNode {
  id: string;
  parent: BSPNode | null;
  children: BSPNode[];
  direction: 'horizontal' | 'vertical' | null;
  split: number;
  element: HTMLElement | null;
  isPinned: boolean;
  isCollapsed: boolean;
  rect?: Rect;

  constructor(options: Partial<BSPNode> = {}) {
    this.id = options.id || crypto.randomUUID();
    this.parent = options.parent || null;
    this.children = options.children || [];
    this.direction = options.direction || null;
    this.split = options.split || BSP_CONFIG.DEFAULT_SPLIT;
    this.element = options.element || null;
    this.isPinned = options.isPinned || false;
    this.isCollapsed = options.isCollapsed || false;
  }

  isLeaf(): boolean {
    return this.children.length === 0;
  }

  getSibling(): BSPNode | null {
    if (!this.parent) return null;
    return this.parent.children.find(child => child !== this) || null;
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
      children: newChildren,
      element: this.element
    });
    newChildren.push(...this.children.map(c => c.clone(newInstance)));
    return newInstance;
  }

  toJSON(): any {
    const obj: any = {
      id: this.id,
      direction: this.direction,
      split: this.split,
      isPinned: this.isPinned,
      isCollapsed: this.isCollapsed,
      children: this.children.map(c => c.toJSON())
    };
    if (this.isLeaf()) obj.leaf = true;
    return obj;
  }

  static fromJSON(json: any, parent: BSPNode | null, panelElementsMap: Map<string, HTMLElement>): BSPNode {
    const node = new BSPNode({ ...json, parent });
    if (json.leaf) {
      node.element = panelElementsMap.get(json.id) || null;
    } else {
      node.children = json.children.map((childJson: any) => 
        BSPNode.fromJSON(childJson, node, panelElementsMap)
      );
    }
    return node;
  }
}

export class BSPPanelManager {
  private container: HTMLElement;
  private panels: Map<string, { node: BSPNode; element: HTMLElement }> = new Map();
  private resizers: HTMLElement[] = [];
  private root: BSPNode | null = null;
  private nextPanelNumber: number = 1;
  private activeResizer: { element: HTMLElement; node: BSPNode; startX: number; startY: number } | null = null;
  private isResizing: boolean = false;
  private activeDrag: {
    type: 'move' | 'resize' | null;
    target: { node: BSPNode; element: HTMLElement } | null;
    startX: number;
    startY: number;
    isDragging: boolean;
    currentTargetPanel: HTMLElement | null;
    currentDropZone: 'top' | 'bottom' | 'left' | 'right' | null;
    offsetX: number;
    offsetY: number;
  } = {
    type: null,
    target: null,
    startX: 0,
    startY: 0,
    isDragging: false,
    currentTargetPanel: null,
    currentDropZone: null,
    offsetX: 0,
    offsetY: 0
  };
  private focusedPanel: HTMLElement | null = null;
  private isPreviewMode: boolean = false;
  private previewRoot: BSPNode | null = null;
  private alignmentGuides: HTMLElement[] = [];
  private dropPreview: HTMLElement | null = null;
  private lastDragOverTarget: { panelId: string | null; zone: string | null } = { panelId: null, zone: null };

  constructor(container: HTMLElement) {
    this.container = container;
  }

  init(): void {
    // Create initial panel
    const initialPanel = this.createPanel('Main Content');
    this.root = new BSPNode({ 
      id: initialPanel.id, 
      element: initialPanel.element 
    });
    this.panels.set(initialPanel.id, { node: this.root, element: initialPanel.element });
    
    // Set initial focused panel
    this.setFocusedPanel(initialPanel.element);
    
    this.layout();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Handle panel dragging for reordering (v003 style)
    this.container.addEventListener('mousedown', (e) => {
      const header = (e.target as HTMLElement).closest('.panel-header');
      if (header && !((e.target as HTMLElement).closest('.panel-action-btn'))) {
        const panel = header.closest('.bsp-panel') as HTMLElement;
        if (panel) {
          const panelId = panel.dataset.panelId;
          const panelData = this.panels.get(panelId!);
          if (panelData) {
            // Calculate offset relative to container coordinate system
            const panelRect = panel.getBoundingClientRect();
            const containerRect = this.container.getBoundingClientRect();
            
            this.activeDrag.type = 'move';
            this.activeDrag.target = panelData;
            this.activeDrag.startX = e.clientX;
            this.activeDrag.startY = e.clientY;
            
            // Calculate mouse position relative to container
            const containerRelativeMouseX = e.clientX - containerRect.left;
            const containerRelativeMouseY = e.clientY - containerRect.top;
            
            // Calculate panel position relative to container
            const containerRelativePanelX = panelRect.left - containerRect.left;
            const containerRelativePanelY = panelRect.top - containerRect.top;
            
            // Store offset from mouse to panel (both in container coordinates)
            this.activeDrag.offsetX = containerRelativeMouseX - containerRelativePanelX;
            this.activeDrag.offsetY = containerRelativeMouseY - containerRelativePanelY;
            
            // Focus the panel being dragged
            this.setFocusedPanel(panel);
            
            // Start dragging immediately (no delay/threshold)
            this.initDrag();
            
            e.preventDefault();
          }
        }
      }
      
      // Handle resizer dragging
      const resizer = (e.target as HTMLElement).closest('.bsp-resizer');
      if (resizer && resizer instanceof HTMLElement) {
        const nodeId = resizer.dataset.nodeId;
        const node = this.findNodeById(this.root!, nodeId!);
        if (node) {
          this.activeResizer = {
            element: resizer,
            node,
            startX: e.clientX,
            startY: e.clientY
          };
          this.isResizing = true;
          e.preventDefault();
          document.body.style.cursor = node.direction === 'vertical' ? 'ew-resize' : 'ns-resize';
        }
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.activeDrag.type === 'move' && this.activeDrag.isDragging) {
        this.handleDragOver(e);
      } else if (this.activeResizer && this.isResizing) {
        const { node } = this.activeResizer;
        const containerRect = this.container.getBoundingClientRect();
        
        if (node.direction === 'vertical') {
          const relativeX = e.clientX - containerRect.left;
          const availableWidth = node.rect!.width - BSP_CONFIG.RESIZER_THICKNESS;
          const firstChildWidth = relativeX - node.rect!.x;
          const newSplit = Math.max(0.1, Math.min(0.9, firstChildWidth / availableWidth));
          node.split = newSplit;
        } else {
          const relativeY = e.clientY - containerRect.top;
          const availableHeight = node.rect!.height - BSP_CONFIG.RESIZER_THICKNESS;
          const firstChildHeight = relativeY - node.rect!.y;
          const newSplit = Math.max(0.1, Math.min(0.9, firstChildHeight / availableHeight));
          node.split = newSplit;
        }
        
        this.layout();
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.activeDrag?.isDragging) {
        this.handleDrop();
      }
      if (this.activeResizer) {
        this.activeResizer = null;
        this.isResizing = false;
        document.body.style.cursor = '';
      }
      this.activeDrag = {
        type: null,
        target: null,
        startX: 0,
        startY: 0,
        isDragging: false,
        currentTargetPanel: null,
        currentDropZone: null,
        offsetX: 0,
        offsetY: 0
      };
    });

    // Handle panel actions
    this.container.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('.panel-action-btn[data-action]');
      if (button && button instanceof HTMLElement) {
        const action = button.dataset.action;
        const panel = button.closest('.bsp-panel');
        if (panel && panel instanceof HTMLElement) {
          const panelId = panel.dataset.panelId;
          if (panelId) {
            e.stopPropagation(); // Stop event from bubbling to panel-manager
            this.handlePanelAction(action!, panelId);
          }
        }
      } else {
        // Check if clicking on a panel (not a button)
        const panel = (e.target as HTMLElement).closest('.bsp-panel');
        if (panel && panel instanceof HTMLElement) {
          this.setFocusedPanel(panel);
        }
      }
    });
  }

  private handlePanelAction(action: string, panelId: string): void {
    switch(action) {
      case 'pin':
        this.togglePinPanel(panelId);
        break;
      case 'split-v':
        this.splitPanel(panelId, 'vertical');
        break;
      case 'split-h':
        this.splitPanel(panelId, 'horizontal');
        break;
      case 'close':
        this.closePanel(panelId);
        break;
    }
  }

  private setFocusedPanel(panel: HTMLElement): void {
    // Remove focus from previous panel
    if (this.focusedPanel) {
      this.focusedPanel.classList.remove('focused');
    }
    
    // Set new focused panel
    this.focusedPanel = panel;
    panel.classList.add('focused');
  }

  splitPanel(targetId: string, direction: 'horizontal' | 'vertical', position: 'left' | 'right' | 'top' | 'bottom' = 'right'): string {
    console.log(`Splitting panel ${targetId} ${direction} at ${position}`);
    const target = this.panels.get(targetId);
    if (!target) {
      console.error(`Panel ${targetId} not found`);
      return '';
    }
    
    const { node: targetNode } = target;
    console.log('Target node:', targetNode);
    
    // Save original parent before modifying
    const originalParent = targetNode.parent;
    
    // Create new panel
    const newPanel = this.createPanel(`Panel ${this.nextPanelNumber}`);
    const newNode = new BSPNode({ id: newPanel.id, element: newPanel.element });
    this.panels.set(newPanel.id, { node: newNode, element: newPanel.element });
    
    // Order children based on position
    const shouldNewPanelBeFirst = position === 'left' || position === 'top';
    const children = shouldNewPanelBeFirst ? [newNode, targetNode] : [targetNode, newNode];
    
    // Create parent node
    const newParent = new BSPNode({
      parent: originalParent,
      direction,
      children,
      split: 0.5
    });

    // Update parent relationships
    targetNode.parent = newParent;
    newNode.parent = newParent;

    // Replace in tree
    if (originalParent) {
      const index = originalParent.children.indexOf(targetNode);
      originalParent.children[index] = newParent;
    } else {
      this.root = newParent;
    }

    console.log('New tree structure:', this.root);
    
    // Focus the newly created panel
    this.setFocusedPanel(newPanel.element);
    
    this.layout();
    return newPanel.id;
  }

  closePanel(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel || this.panels.size === 1) return; // Don't close last panel
    
    // Clean up any active drag operation involving this panel
    if (this.draggedPanel && this.draggedPanel.node.id === panelId) {
      this.cleanupDrag();
    }
    if (this.dropTarget && this.dropTarget.node.id === panelId) {
      this.clearDropTarget();
    }
    
    const { node: targetNode } = panel;
    const parent = targetNode.parent;
    if (!parent) return;
    
    const sibling = targetNode.getSibling();
    if (!sibling) return;
    
    // Replace parent with sibling
    if (parent.parent) {
      const index = parent.parent.children.indexOf(parent);
      parent.parent.children[index] = sibling;
      sibling.parent = parent.parent;
    } else {
      this.root = sibling;
      sibling.parent = null;
    }
    
    // Remove panel
    targetNode.element?.remove();
    this.panels.delete(panelId);
    
    this.layout();
  }

  private createPanel(title: string): { id: string; element: HTMLElement } {
    const panelNumber = this.nextPanelNumber++;
    const id = `bsp-panel-${panelNumber}-${Date.now()}`;
    
    const element = document.createElement('div');
    element.className = 'panel fileui-panel bsp-panel';
    element.dataset.panelId = id;
    
    element.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <span>${title}</span>
        </div>
        <div class="panel-actions">
          <button class="panel-action-btn" data-action="pin" title="Pin Panel">
            <i data-lucide="pin" class="lucide icon-pin"></i>
            <i data-lucide="pin-off" class="lucide icon-pin-off" style="display: none;"></i>
          </button>
          <button class="panel-action-btn" data-action="split-v" title="Split Vertical">
            <i data-lucide="columns-2" class="lucide"></i>
          </button>
          <button class="panel-action-btn" data-action="split-h" title="Split Horizontal">
            <i data-lucide="rows-2" class="lucide"></i>
          </button>
          <button class="panel-action-btn" data-action="close" title="Close Panel">
            <i data-lucide="x" class="lucide"></i>
          </button>
        </div>
      </div>
      <div class="panel-body">
        <div class="panel-content">
          <p>Panel ${panelNumber} content</p>
        </div>
      </div>
    `;
    
    return { id, element };
  }

  layout(isPreview: boolean = false): void {
    const layoutRoot = isPreview ? this.previewRoot : this.root;
    if (!layoutRoot) return;
    
    // Only clear elements when not in preview mode
    if (!isPreview) {
      this.container.innerHTML = '';
      this.resizers = [];
    }
    
    // Calculate container bounds
    const containerRect = this.container.getBoundingClientRect();
    
    // Ensure container has dimensions
    if (containerRect.width === 0 || containerRect.height === 0) {
      console.warn('BSP Container has no dimensions, retrying layout...');
      // Force layout by querying offsetHeight
      this.container.offsetHeight;
      // Try again after next frame
      requestAnimationFrame(() => this.layout(isPreview));
      return;
    }
    
    const rootRect: Rect = {
      x: 0,
      y: 0,
      width: containerRect.width,
      height: containerRect.height
    };
    
    // Layout tree
    this.layoutNode(layoutRoot, rootRect, isPreview);
    
    // Re-initialize Lucide icons only when not in preview
    if (!isPreview) {
      setTimeout(() => {
        if ((window as any).lucide) {
          (window as any).lucide.createIcons();
        }
      }, 10);
    }
  }

  private layoutNode(node: BSPNode, rect: Rect, isPreview: boolean = false): void {
    node.rect = rect;
    
    if (node.isLeaf()) {
      // Position panel element
      if (node.element) {
        // Don't reposition the dragged element during preview mode (it follows mouse)
        const isDraggedElement = isPreview && this.activeDrag?.target?.element === node.element;
        
        if (!isDraggedElement) {
          Object.assign(node.element.style, {
            position: 'absolute',
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            margin: '0',
            padding: '0'
          });
        }
        
        // Only append if not already in container (prevents duplicate elements)
        if (!node.element.parentElement || node.element.parentElement !== this.container) {
          this.container.appendChild(node.element);
        }
      }
    } else {
      // Layout children
      const [first, second] = node.children;
      
      if (node.direction === 'vertical') {
        const availableWidth = rect.width - BSP_CONFIG.RESIZER_THICKNESS;
        const firstWidth = availableWidth * node.split;
        
        this.layoutNode(first, {
          x: rect.x,
          y: rect.y,
          width: firstWidth,
          height: rect.height
        }, isPreview);
        
        this.layoutNode(second, {
          x: rect.x + firstWidth + BSP_CONFIG.RESIZER_THICKNESS,
          y: rect.y,
          width: availableWidth - firstWidth,
          height: rect.height
        }, isPreview);
        
        // Only create resizers when not in preview mode
        if (!isPreview) {
          const resizer = this.createResizer('vertical', {
            x: rect.x + firstWidth,
            y: rect.y,
            width: BSP_CONFIG.RESIZER_THICKNESS,
            height: rect.height
          }, node.id);
          this.container.appendChild(resizer);
          this.resizers.push(resizer);
        }
      } else {
        const availableHeight = rect.height - BSP_CONFIG.RESIZER_THICKNESS;
        const firstHeight = availableHeight * node.split;
        
        this.layoutNode(first, {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: firstHeight
        }, isPreview);
        
        this.layoutNode(second, {
          x: rect.x,
          y: rect.y + firstHeight + BSP_CONFIG.RESIZER_THICKNESS,
          width: rect.width,
          height: availableHeight - firstHeight
        }, isPreview);
        
        // Only create resizers when not in preview mode
        if (!isPreview) {
          const resizer = this.createResizer('horizontal', {
            x: rect.x,
            y: rect.y + firstHeight,
            width: rect.width,
            height: BSP_CONFIG.RESIZER_THICKNESS
          }, node.id);
          this.container.appendChild(resizer);
          this.resizers.push(resizer);
        }
      }
    }
  }

  private createResizer(direction: 'horizontal' | 'vertical', rect: Rect, nodeId: string): HTMLElement {
    const resizer = document.createElement('div');
    resizer.className = `bsp-resizer bsp-resizer-${direction}`;
    resizer.dataset.nodeId = nodeId;
    
    Object.assign(resizer.style, {
      position: 'absolute',
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
    
    resizer.innerHTML = '<div class="bsp-resizer-handle"></div>';
    return resizer;
  }

  private findNodeById(node: BSPNode, id: string): BSPNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = this.findNodeById(child, id);
      if (found) return found;
    }
    return null;
  }

  private initDrag(): void {
    this.activeDrag.isDragging = true;
    const draggedElement = this.activeDrag.target!.element;
    this.enterPreviewMode(draggedElement);

    // Create alignment guides (initially hidden)
    ['horizontal', 'vertical'].forEach(direction => {
      const guide = document.createElement('div');
      guide.className = `alignment-guide ${direction}`;
      guide.style.display = 'none';
      this.container.appendChild(guide);
      this.alignmentGuides.push(guide);
    });
  }

  private handleDragOver(e: MouseEvent): void {
    if (!this.activeDrag?.isDragging) return;
    
    // Hide the dragged element since we show it in the drop preview
    if (this.activeDrag.target?.element) {
      const draggedElement = this.activeDrag.target.element;
      draggedElement.style.opacity = '0';
      draggedElement.style.pointerEvents = 'none';
    }
    
    const containerRect = this.container.getBoundingClientRect();
    const relativeX = e.clientX - containerRect.left;
    const relativeY = e.clientY - containerRect.top;
    
    let targetPanel: HTMLElement | null = null;
    let dropZone: 'top' | 'bottom' | 'left' | 'right' | null = null;
    
    const findTarget = (node: BSPNode): void => {
      if (!node || targetPanel) return;
      if (node.isLeaf()) {
        if (node.element === this.activeDrag.target!.element) return;
        const rect = node.rect!;
        if (relativeX >= rect.x && relativeX <= rect.x + rect.width &&
            relativeY >= rect.y && relativeY <= rect.y + rect.height) {
              
            targetPanel = node.element!;
            const x = relativeX - rect.x;
            const y = relativeY - rect.y;
            const w = rect.width;
            const h = rect.height;

            const distTop = y;
            const distBottom = h - y;
            const distLeft = x;
            const distRight = w - x;

            const minDist = Math.min(distTop, distBottom, distLeft, distRight);

            if (minDist === distTop) {
              dropZone = 'top';
            } else if (minDist === distBottom) {
              dropZone = 'bottom';
            } else if (minDist === distLeft) {
              dropZone = 'left';
            } else {
              dropZone = 'right';
            }
        }
      } else {
        node.children.forEach(findTarget);
      }
    };
    findTarget(this.root!);

    const hasChangedTarget = this.lastDragOverTarget.panelId !== (targetPanel?.dataset.panelId || null) || this.lastDragOverTarget.zone !== dropZone;

    if (targetPanel && dropZone && hasChangedTarget) {
      this.lastDragOverTarget = { panelId: targetPanel.dataset.panelId!, zone: dropZone };
      this.activeDrag.currentTargetPanel = targetPanel;
      this.activeDrag.currentDropZone = dropZone;
      
      // Update drop preview immediately (no delay)
      this.updateDropPreview(targetPanel, dropZone);
      
      // Update preview immediately (no requestAnimationFrame delay)
      this.updatePreviewLayout();
    } else if (!targetPanel) {
      // Show full container preview when dragging over empty space
      if (this.lastDragOverTarget.panelId !== null) {
        this.lastDragOverTarget = { panelId: null, zone: null };
        this.activeDrag.currentTargetPanel = null;
        this.activeDrag.currentDropZone = null;
        
        // Show full container preview
        this.updateDropPreviewForEmptySpace();
        this.updatePreviewLayout();
      }
    }

    this.layout(true); // Call with preview mode during drag
  }


  private updateDropPreviewForEmptySpace(): void {
    const containerRect = this.container.getBoundingClientRect();
    
    // Remove existing preview
    if (this.dropPreview) {
      this.dropPreview.remove();
    }
    
    // Create drop preview container that fills the entire BSP container
    this.dropPreview = document.createElement('div');
    this.dropPreview.className = 'drop-preview-rectangle drop-preview-full';
    
    // Create inner preview showing the dragged panel
    const innerPreview = document.createElement('div');
    innerPreview.className = 'drag-preview-inside-drop';
    
    // Copy the dragged panel's content for preview
    if (this.activeDrag.target?.element) {
      const draggedPanel = this.activeDrag.target.element;
      const panelTitle = draggedPanel.querySelector('.panel-title span')?.textContent || 'Panel';
      innerPreview.innerHTML = `
        <div class="preview-panel-header">
          <span class="preview-panel-title">${panelTitle}</span>
        </div>
        <div class="preview-panel-body">
          <div class="preview-content">Drop to fill container</div>
        </div>
      `;
    }
    
    this.dropPreview.appendChild(innerPreview);
    
    // Fill the entire container
    Object.assign(this.dropPreview.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '9999'
    });
    
    // Make inner preview fill the drop area with padding
    Object.assign(innerPreview.style, {
      position: 'absolute',
      top: '8px',
      left: '8px',
      right: '8px',
      bottom: '8px',
      background: 'rgba(0, 204, 139, 0.1)',
      border: '2px solid rgba(0, 204, 139, 0.6)',
      borderRadius: '4px'
    });
    
    this.container.appendChild(this.dropPreview);
    
    // Trigger animation
    requestAnimationFrame(() => {
      if (this.dropPreview) {
        this.dropPreview.classList.add('active');
      }
    });
  }

  private updateDropPreview(targetPanel: HTMLElement, dropZone: string): void {
    const rect = targetPanel.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    // Convert to container-relative coordinates
    const panelX = rect.left - containerRect.left;
    const panelY = rect.top - containerRect.top;
    const panelW = rect.width;
    const panelH = rect.height;
    
    // Remove existing preview
    if (this.dropPreview) {
      this.dropPreview.remove();
    }
    
    // Create drop preview container
    this.dropPreview = document.createElement('div');
    this.dropPreview.className = 'drop-preview-rectangle';
    
    // Create inner preview showing the dragged panel
    const innerPreview = document.createElement('div');
    innerPreview.className = 'drag-preview-inside-drop';
    
    // Copy the dragged panel's content for preview
    if (this.activeDrag.target?.element) {
      const draggedPanel = this.activeDrag.target.element;
      const panelTitle = draggedPanel.querySelector('.panel-title span')?.textContent || 'Panel';
      innerPreview.innerHTML = `
        <div class="preview-panel-header">
          <span class="preview-panel-title">${panelTitle}</span>
        </div>
        <div class="preview-panel-body">
          <div class="preview-content">Drop here</div>
        </div>
      `;
    }
    
    this.dropPreview.appendChild(innerPreview);
    
    // Calculate preview rectangle dimensions based on drop zone
    let previewX, previewY, previewW, previewH;
    
    if (dropZone === 'top') {
      previewX = panelX;
      previewY = panelY;
      previewW = panelW;
      previewH = panelH / 2;
    } else if (dropZone === 'bottom') {
      previewX = panelX;
      previewY = panelY + panelH / 2;
      previewW = panelW;
      previewH = panelH / 2;
    } else if (dropZone === 'left') {
      previewX = panelX;
      previewY = panelY;
      previewW = panelW / 2;
      previewH = panelH;
    } else { // right
      previewX = panelX + panelW / 2;
      previewY = panelY;
      previewW = panelW / 2;
      previewH = panelH;
    }
    
    // Position the preview rectangle
    Object.assign(this.dropPreview.style, {
      position: 'absolute',
      left: `${previewX}px`,
      top: `${previewY}px`,
      width: `${previewW}px`,
      height: `${previewH}px`,
      pointerEvents: 'none',
      zIndex: '9999'
    });
    
    // Position the inner preview to fill the drop area
    Object.assign(innerPreview.style, {
      position: 'absolute',
      top: '4px',
      left: '4px',
      right: '4px',
      bottom: '4px',
      background: 'rgba(0, 204, 139, 0.1)',
      border: '1px solid rgba(0, 204, 139, 0.5)',
      borderRadius: '2px'
    });
    
    this.container.appendChild(this.dropPreview);
    
    // Trigger animation
    requestAnimationFrame(() => {
      if (this.dropPreview) {
        this.dropPreview.classList.add('active');
      }
    });
  }

  private updatePreviewLayout(): void {
    if (!this.isPreviewMode) return;
    
    // Start fresh with original tree
    this.previewRoot = this.root!.clone();

    const { target, currentTargetPanel, currentDropZone } = this.activeDrag;
    if (currentTargetPanel && currentDropZone && target) {
      console.log('Updating preview: moving', target.node.id, 'to', currentTargetPanel.dataset.panelId, currentDropZone);
      this.previewRoot = this.performMove(this.previewRoot, target.node.id, currentTargetPanel.dataset.panelId!, currentDropZone);
    } else if (!currentTargetPanel && target) {
      // When dragging over empty space, show the dragged panel filling the entire container
      // Simply set the preview root to a single node (the dragged panel)
      const draggedNode = this.findLeafNodeById(this.previewRoot, target.node.id);
      if (draggedNode) {
        this.previewRoot = new BSPNode({
          id: draggedNode.id,
          element: draggedNode.element,
          isPinned: draggedNode.isPinned,
          isCollapsed: draggedNode.isCollapsed
        });
      }
    }
    
    this.layout(true); // Call with preview mode
  }

  private performMove(tree: BSPNode, draggedId: string, targetId: string, zone: 'top' | 'bottom' | 'left' | 'right'): BSPNode {
    if (draggedId === targetId) return tree;

    const draggedNode = this.findLeafNodeById(tree, draggedId);
    const targetNode = this.findLeafNodeById(tree, targetId);
    
    if (!draggedNode || !targetNode) return tree;

    // Detach dragged node (v003 logic)
    const draggedParent = draggedNode.parent;
    if (draggedParent) {
      const sibling = draggedNode.getSibling();
      if (!sibling) return tree;
      
      const grandparent = draggedParent.parent;
      if (grandparent) {
        const parentIndex = grandparent.children.indexOf(draggedParent);
        grandparent.children.splice(parentIndex, 1, sibling);
        sibling.parent = grandparent;
      } else {
        tree = sibling;
        sibling.parent = null;
      }
    } else { 
      return tree; // Should not happen if tree is valid
    }

    // Attach dragged node to target (v003 logic)
    const targetParent = targetNode.parent;
    const direction = (zone === 'left' || zone === 'right') ? 'vertical' : 'horizontal';
    const children = (zone === 'left' || zone === 'top') ? [draggedNode, targetNode] : [targetNode, draggedNode];
    const newSplitNode = new BSPNode({ parent: targetParent, direction, children, split: 0.5 });

    draggedNode.parent = newSplitNode;
    targetNode.parent = newSplitNode;

    if (targetParent) {
      const targetIndex = targetParent.children.indexOf(targetNode);
      targetParent.children.splice(targetIndex, 1, newSplitNode);
    } else {
      tree = newSplitNode;
    }
    
    return tree;
  }
  
  private findLeafNodeById(tree: BSPNode, panelId: string): BSPNode | null {
    if (tree.isLeaf()) {
      return tree.id === panelId ? tree : null;
    }
    for (const child of tree.children) {
      const found = this.findLeafNodeById(child, panelId);
      if (found) return found;
    }
    return null;
  }
  
  private removeNode(tree: BSPNode, nodeId: string): BSPNode {
    if (tree.id === nodeId) {
      // Can't remove root if it's the only node
      return tree;
    }
    
    const node = this.findNodeById(tree, nodeId);
    if (!node || !node.parent) return tree;
    
    const parent = node.parent;
    const sibling = node.getSibling();
    
    if (!sibling) return tree;
    
    // Replace parent with sibling
    if (parent.parent) {
      const index = parent.parent.children.indexOf(parent);
      parent.parent.children[index] = sibling;
      sibling.parent = parent.parent;
    } else {
      // Parent was root
      tree = sibling;
      sibling.parent = null;
    }
    
    return tree;
  }

  private enterPreviewMode(draggedElement: HTMLElement): void {
    this.isPreviewMode = true;
    this.previewRoot = this.root!.clone();
    draggedElement.classList.add('is-dragging');
    this.container.classList.add('preview-mode');
    document.body.classList.add('is-dragging');
    this.layout();
  }

  private exitPreviewMode(): void {
    if (!this.isPreviewMode) return;
    
    // Hide and clean up alignment guides
    this.alignmentGuides.forEach(guide => {
      guide.style.display = 'none';
      guide.remove();
    });
    this.alignmentGuides = [];
    
    // Clean up drop preview
    if (this.dropPreview) {
      this.dropPreview.remove();
      this.dropPreview = null;
    }
    
    const draggedElement = this.activeDrag?.target?.element;
    if (draggedElement) {
      draggedElement.classList.remove('is-dragging');
      // Reset positioning styles
      draggedElement.style.position = '';
      draggedElement.style.left = '';
      draggedElement.style.top = '';
      draggedElement.style.pointerEvents = '';
      draggedElement.style.zIndex = '';
      draggedElement.style.opacity = ''; // Restore visibility
    }

    this.container.classList.remove('preview-mode');
    document.body.classList.remove('is-dragging');
    this.isPreviewMode = false;
    this.previewRoot = null;
    this.lastDragOverTarget = { panelId: null, zone: null };
  }

  private handleDrop(): void {
    const { currentTargetPanel, currentDropZone, target } = this.activeDrag;
    
    if ((currentTargetPanel && currentDropZone) || (!currentTargetPanel && target)) {
      // Accept the preview as the new layout
      this.root = this.previewRoot;

      this.panels.clear();
      const sync = (node: BSPNode): void => {
        if (node.isLeaf()) {
          this.panels.set(node.id, { node, element: node.element! });
        } else {
          node.children.forEach(sync);
        }
      };
      sync(this.root!);
    }
    
    this.exitPreviewMode();
    this.layout();
  }
  
  private swapPanels(node1: BSPNode, node2: BSPNode): void {
    if (!node1.isLeaf() || !node2.isLeaf()) return;
    
    // Swap the elements
    const tempElement = node1.element;
    node1.element = node2.element;
    node2.element = tempElement;
    
    // Swap the IDs
    const tempId = node1.id;
    node1.id = node2.id;
    node2.id = tempId;
    
    // Update the panels map
    const panel1 = this.panels.get(node1.id)!;
    const panel2 = this.panels.get(node2.id)!;
    panel1.node = node1;
    panel2.node = node2;
    
    // Update panel data attributes
    if (node1.element) node1.element.dataset.panelId = node1.id;
    if (node2.element) node2.element.dataset.panelId = node2.id;
    
    // Re-layout
    this.layout();
  }

  addPanel(position: 'left' | 'right' | 'top' | 'bottom' = 'right'): string | null {
    // Find largest leaf node
    let largestLeaf: BSPNode | null = null;
    let maxArea = 0;
    
    const findLargestLeaf = (node: BSPNode) => {
      if (node.isLeaf() && node.rect) {
        const area = node.rect.width * node.rect.height;
        if (area > maxArea) {
          maxArea = area;
          largestLeaf = node;
        }
      } else {
        node.children.forEach(findLargestLeaf);
      }
    };
    
    if (this.root) {
      findLargestLeaf(this.root);
      if (largestLeaf) {
        // Determine split direction based on position
        const isHorizontal = position === 'left' || position === 'right';
        const direction = isHorizontal ? 'vertical' : 'horizontal';
        return this.splitPanel(largestLeaf.id, direction, position);
      }
    }
    return null;
  }

  private togglePinPanel(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;
    
    const { node, element } = panel;
    node.isPinned = !node.isPinned;
    
    // Update visual state
    const pinBtn = element.querySelector('[data-action="pin"]');
    const pinIcon = pinBtn?.querySelector('.icon-pin') as HTMLElement;
    const pinOffIcon = pinBtn?.querySelector('.icon-pin-off') as HTMLElement;
    
    if (node.isPinned) {
      element.classList.add('is-pinned');
      if (pinIcon) pinIcon.style.display = 'none';
      if (pinOffIcon) pinOffIcon.style.display = 'block';
      if (pinBtn) pinBtn.setAttribute('title', 'Unpin Panel');
    } else {
      element.classList.remove('is-pinned');
      if (pinIcon) pinIcon.style.display = 'block';
      if (pinOffIcon) pinOffIcon.style.display = 'none';
      if (pinBtn) pinBtn.setAttribute('title', 'Pin Panel');
    }
  }

  updateFocusedPanelContent(title: string, content: string): void {
    let targetPanel = this.focusedPanel;
    
    // If no focused panel or focused panel is pinned, find an unpinned panel
    if (!targetPanel || this.isPanelPinned(targetPanel)) {
      targetPanel = this.findUnpinnedPanel();
      if (!targetPanel) {
        // All panels are pinned, nothing to update
        return;
      }
      // Focus the unpinned panel we found
      this.setFocusedPanel(targetPanel);
    }
    
    // Update panel title
    const panelTitle = targetPanel.querySelector('.panel-title span');
    if (panelTitle) {
      panelTitle.textContent = title;
    }
    
    // Update panel content
    const panelContent = targetPanel.querySelector('.panel-content');
    if (panelContent) {
      // Create a code/text display
      const extension = title.split('.').pop()?.toLowerCase() || '';
      const isCode = ['js', 'ts', 'tsx', 'jsx', 'py', 'cpp', 'c', 'h', 'java', 'cs', 'json', 'html', 'htm', 'css', 'scss', 'sass'].includes(extension);
      
      if (isCode) {
        panelContent.innerHTML = `
          <div class="file-viewer">
            <div class="file-header">
              <span class="file-name">${title}</span>
              <span class="file-extension">.${extension}</span>
            </div>
            <pre class="code-content"><code>${this.escapeHtml(content)}</code></pre>
          </div>
        `;
      } else {
        panelContent.innerHTML = `
          <div class="file-viewer">
            <div class="file-header">
              <span class="file-name">${title}</span>
            </div>
            <div class="text-content">${this.escapeHtml(content).replace(/\n/g, '<br>')}</div>
          </div>
        `;
      }
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private isPanelPinned(panel: HTMLElement): boolean {
    const panelId = panel.dataset.panelId;
    if (!panelId) return false;
    
    const panelData = this.panels.get(panelId);
    return panelData ? panelData.node.isPinned : false;
  }

  private findUnpinnedPanel(): HTMLElement | null {
    // Find the first unpinned panel
    for (const [id, panelData] of this.panels) {
      if (!panelData.node.isPinned) {
        return panelData.element;
      }
    }
    return null;
  }
}