(function() {
    'use strict';

    // ===== CONFIGURATION =====
    const CONFIG = {
        RESIZER_THICKNESS: 10,
        PANEL_MIN_HEIGHT: 40,
        PANEL_MIN_WIDTH: 150,
        DEFAULT_SPLIT: 0.5,
        HISTORY_LIMIT: 50,
        ANIMATION_DURATION: 150,
        EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
        PANEL_ANIMATION_CLASS: 'panel-grow-in',
    };

    // ===== UTILITY CLASSES =====

    /**
     * A simple event emitter for pub/sub communication.
     */
    class EventEmitter {
        constructor() {
            this.events = new Map();
        }
        on(event, listener) {
            if (!this.events.has(event)) {
                this.events.set(event, []);
            }
            this.events.get(event).push(listener);
        }
        emit(event, payload) {
            if (this.events.has(event)) {
                this.events.get(event).forEach(listener => listener(payload));
            }
        }
    }

    /**
     * Manages the state history for undo/redo functionality.
     */
    class HistoryManager {
        constructor(limit) {
            this.limit = limit;
            this.history = [];
            this.pointer = -1;
            this.emitter = new EventEmitter();
        }
        
        add(state) {
            if (this.pointer < this.history.length - 1) {
                this.history.splice(this.pointer + 1);
            }
            this.history.push(state);
            if (this.history.length > this.limit) {
                this.history.shift();
            }
            this.pointer = this.history.length - 1;
            this.emitChange();
        }

        undo() {
            if (this.canUndo()) {
                this.pointer--;
                this.emitChange();
                return this.history[this.pointer];
            }
            return null;
        }

        redo() {
            if (this.canRedo()) {
                this.pointer++;
                this.emitChange();
                return this.history[this.pointer];
            }
            return null;
        }

        canUndo() { return this.pointer > 0; }
        canRedo() { return this.pointer < this.history.length - 1; }
        
        on(event, listener) { this.emitter.on(event, listener); }
        emitChange() { this.emitter.emit('change', { canUndo: this.canUndo(), canRedo: this.canRedo() }); }
        
        clear() {
            this.history = [];
            this.pointer = -1;
            this.emitChange();
        }
    }

    /**
     * Represents a node in the Binary Space Partitioning (BSP) tree.
     */
    class BSPNode {
        constructor(options = {}) {
            this.id = options.id || self.crypto.randomUUID();
            this.parent = options.parent || null;
            this.children = options.children || [];
            this.direction = options.direction || null;
            this.split = options.split || CONFIG.DEFAULT_SPLIT;
            this.element = options.element || null; 
        }

        isLeaf() { return this.children.length === 0; }

        getSibling() {
            if (!this.parent) return null;
            return this.parent.children.find(child => child !== this);
        }

        clone(parent = null) {
            const newChildren = [];
            const newInstance = new BSPNode({
                id: this.id,
                parent,
                direction: this.direction,
                split: this.split,
                children: newChildren,
                element: this.element // Keep reference to original element
            });
            newChildren.push(...this.children.map(c => c.clone(newInstance)));
            return newInstance;
        }

        toJSON() {
            const obj = {
                id: this.id,
                direction: this.direction,
                split: this.split,
                children: this.children.map(c => c.toJSON())
            };
            if (this.isLeaf()) obj.leaf = true;
            return obj;
        }

        static fromJSON(json, parent, panelElementsMap) {
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

    /**
     * Manages the entire panel grid system.
     */
    class PanelManager {
        constructor(container) {
            this.container = container;
            this.panels = new Map();
            this.resizers = [];
            this.root = null;
            this.previewRoot = null;
            this.isPreviewMode = false;
            this.lastDragOverTarget = { panelId: null, zone: null };
            this.nextPanelNumber = 1;
            this.history = new HistoryManager(CONFIG.HISTORY_LIMIT);
            this.minSizeCache = new Map();

            this.handlePointerDown = this.handlePointerDown.bind(this);
            this.handlePointerMove = this.handlePointerMove.bind(this);
            this.handlePointerUp = this.handlePointerUp.bind(this);
            this.handleDragOver = this.handleDragOver.bind(this);
            this.updatePreviewLayout = this.updatePreviewLayout.bind(this);
        }

        init() {
            this.setupUI();
            this.resetLayout();
            this.setupEventListeners();
        }

        setupUI() {
            this.dom = {
                addPanelBtn: document.getElementById('add-panel-btn'),
                resetLayoutBtn: document.getElementById('reset-layout-btn'),
                undoBtn: document.getElementById('undo-btn'),
                redoBtn: document.getElementById('redo-btn'),
            };

            // Only bind events if buttons exist
            if (this.dom.addPanelBtn) this.dom.addPanelBtn.onclick = () => this.addPanel();
            if (this.dom.resetLayoutBtn) this.dom.resetLayoutBtn.onclick = () => this.resetLayout();
            if (this.dom.undoBtn) this.dom.undoBtn.onclick = () => this.undo();
            if (this.dom.redoBtn) this.dom.redoBtn.onclick = () => this.redo();
            
            this.history.on('change', ({ canUndo, canRedo }) => {
                if (this.dom.undoBtn) this.dom.undoBtn.disabled = !canUndo;
                if (this.dom.redoBtn) this.dom.redoBtn.disabled = !canRedo;
            });
        }
        
        setupEventListeners() {
            this.container.addEventListener('pointerdown', this.handlePointerDown);
            window.addEventListener('resize', () => this.layout());
            
            window.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'z') { e.preventDefault(); this.undo(); }
                    if (e.key === 'y') { e.preventDefault(); this.redo(); }
                }
            });
        }

        resetLayout() {
            this.container.innerHTML = '';
            this.panels.clear();
            this.resizers = [];
            this.nextPanelNumber = 1;
            this.history.clear();

            const panel = this.createPanel();
            this.root = new BSPNode({ id: panel.id, element: panel.element });
            this.panels.set(panel.id, { node: this.root, element: panel.element });
            
            this.layout();
            this.saveState("Initial Layout");
        }

        saveState(action) {
            const serializedTree = this.root.toJSON();
            this.history.add({ action, tree: serializedTree });
        }
        
        restoreState(state) {
            const panelElementsMap = new Map();
            this.panels.forEach(p => panelElementsMap.set(p.node.id, p.element));
            
            this.root = BSPNode.fromJSON(state.tree, null, panelElementsMap);
            
            this.panels.clear();
            const syncPanels = (node) => {
                if (node.isLeaf()) {
                    this.panels.set(node.id, { node, element: node.element });
                } else {
                    node.children.forEach(syncPanels);
                }
            };
            syncPanels(this.root);
            
            this.layout();
        }
        
        undo() {
            const state = this.history.undo();
            if (state) this.restoreState(state);
        }

        redo() {
            const state = this.history.redo();
            if (state) this.restoreState(state);
        }

        layout(isPreview = false) {
            const tree = isPreview ? this.previewRoot : this.root;
            if (!tree) return;

            const computedStyle = getComputedStyle(this.container);
            const paddingLeft = parseFloat(computedStyle.paddingLeft);
            const paddingTop = parseFloat(computedStyle.paddingTop);
            const paddingRight = parseFloat(computedStyle.paddingRight);
            const paddingBottom = parseFloat(computedStyle.paddingBottom);

            this.minSizeCache.clear();
            
            if (!isPreview) {
                this.resizers.forEach(r => r.remove());
                this.resizers = [];
            }

            const layoutRecursive = (node, rect) => {
                node.rect = rect;

                if (node.isLeaf()) {
                    Object.assign(node.element.style, {
                        left: `${rect.x}px`, top: `${rect.y}px`,
                        width: `${rect.width}px`, height: `${rect.height}px`
                    });
                    if (!isPreview) {
                       this.updatePanelControls(node);
                    }
                    return;
                }

                const [child1, child2] = node.children;
                let rect1, rect2;

                if (node.direction === 'vertical') {
                    const availableWidth = rect.width - CONFIG.RESIZER_THICKNESS;
                    const minWidth1 = this.calculateMinimumWidth(child1);
                    const minWidth2 = this.calculateMinimumWidth(child2);
                    const totalMinWidth = minWidth1 + minWidth2;
                    if (totalMinWidth > availableWidth) {
                        node.split = (totalMinWidth > 0) ? (minWidth1 / totalMinWidth) : 0.5;
                    }

                    let width1 = Math.max(minWidth1, availableWidth * node.split);
                    let width2 = availableWidth - width1;
                    if (width2 < minWidth2) {
                        width2 = minWidth2;
                        width1 = availableWidth - width2;
                    }
                    
                    rect1 = { ...rect, width: width1 };
                    rect2 = { ...rect, x: rect.x + width1 + CONFIG.RESIZER_THICKNESS, width: width2 };

                    if (!isPreview) {
                        const resizerX = rect.x + width1;
                        const resizer = this.createResizer(node, resizerX, rect.y, CONFIG.RESIZER_THICKNESS, rect.height, 'vertical');
                        this.resizers.push(resizer);
                    }
                } else {
                    const availableHeight = rect.height - CONFIG.RESIZER_THICKNESS;
                    const minHeight1 = this.calculateMinimumHeight(child1);
                    const minHeight2 = this.calculateMinimumHeight(child2);
                    const totalMinHeight = minHeight1 + minHeight2;
                    if (totalMinHeight > availableHeight) {
                        node.split = (totalMinHeight > 0) ? (minHeight1 / totalMinHeight) : 0.5;
                    }

                    let height1 = Math.max(minHeight1, availableHeight * node.split);
                    let height2 = availableHeight - height1;
                    if (height2 < minHeight2) {
                        height2 = minHeight2;
                        height1 = availableHeight - height2;
                    }
                    
                    rect1 = { ...rect, height: height1 };
                    rect2 = { ...rect, y: rect.y + height1 + CONFIG.RESIZER_THICKNESS, height: height2 };
                    
                    if (!isPreview) {
                        const resizerY = rect.y + height1;
                        const resizer = this.createResizer(node, rect.x, resizerY, rect.width, CONFIG.RESIZER_THICKNESS, 'horizontal');
                        this.resizers.push(resizer);
                    }
                }

                layoutRecursive(child1, rect1);
                layoutRecursive(child2, rect2);
            };
            
            const containerRect = this.container.getBoundingClientRect();
            const layoutWidth = containerRect.width - paddingLeft - paddingRight;
            const layoutHeight = containerRect.height - paddingTop - paddingBottom;
            
            layoutRecursive(tree, { x: paddingLeft, y: paddingTop, width: layoutWidth, height: layoutHeight });
        }

        createPanelElement(panelNumber) {
            const element = document.createElement('div');
            element.className = `panel ${CONFIG.PANEL_ANIMATION_CLASS}`;
            element.innerHTML = `
                <div class="panel-header">
                    <span class="panel-title">Panel ${panelNumber}</span>
                    <div class="panel-actions">
                        <button class="panel-action-btn" data-action="split-v" title="Split Vertically"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg></button>
                        <button class="panel-action-btn" data-action="split-h" title="Split Horizontally"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/></svg></button>
                        <button class="panel-action-btn" data-action="close" title="Close Panel"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                    </div>
                </div>
                <div class="panel-content">Content for panel ${panelNumber}</div>`;
            
            element.addEventListener('animationend', () => element.classList.remove(CONFIG.PANEL_ANIMATION_CLASS), { once: true });
            this.container.appendChild(element);
            return element;
        }

        createPanel() {
            const panelNumber = this.nextPanelNumber++;
            const element = this.createPanelElement(panelNumber);
            const id = `panel-${panelNumber}-${Date.now()}`;
            element.dataset.panelId = id;
            return { id, element };
        }
        
        addPanel() {
            let largestLeaf = null;
            let maxArea = -1;

            const findLargestLeaf = (node) => {
                if (node.isLeaf()) {
                    const area = node.rect.width * node.rect.height;
                    if (area > maxArea) {
                        maxArea = area;
                        largestLeaf = node;
                    }
                } else {
                    node.children.forEach(findLargestLeaf);
                }
            };

            findLargestLeaf(this.root);

            if (largestLeaf) {
                const targetNode = largestLeaf;
                const canSplitV = targetNode.rect.width >= CONFIG.PANEL_MIN_WIDTH * 2 + CONFIG.RESIZER_THICKNESS;
                const canSplitH = targetNode.rect.height >= CONFIG.PANEL_MIN_HEIGHT * 2 + CONFIG.RESIZER_THICKNESS;

                const isWider = targetNode.rect.width > targetNode.rect.height;

                if (isWider) {
                    // Prefer vertical split for wider panels
                    if (canSplitV) {
                        this.splitPanel(targetNode.id, 'vertical');
                    } else if (canSplitH) {
                        this.splitPanel(targetNode.id, 'horizontal');
                    }
                } else {
                    // Prefer horizontal split for taller or square panels
                    if (canSplitH) {
                        this.splitPanel(targetNode.id, 'horizontal');
                    } else if (canSplitV) {
                        this.splitPanel(targetNode.id, 'vertical');
                    }
                }
            }
        }
        
        splitPanel(targetId, direction) {
            const target = this.panels.get(targetId);
            if (!target) return;
            const { node: targetNode } = target;

            if (!targetNode.rect) return; // Should not happen in normal flow

            if (direction === 'vertical') {
                const canSplitV = targetNode.rect.width >= CONFIG.PANEL_MIN_WIDTH * 2 + CONFIG.RESIZER_THICKNESS;
                if (!canSplitV) return;
            } else { // horizontal
                const canSplitH = targetNode.rect.height >= CONFIG.PANEL_MIN_HEIGHT * 2 + CONFIG.RESIZER_THICKNESS;
                if (!canSplitH) return;
            }

            const newPanel = this.createPanel();
            const newNode = new BSPNode({ id: newPanel.id, element: newPanel.element });
            this.panels.set(newPanel.id, { node: newNode, element: newPanel.element });
            
            const newParent = new BSPNode({
                parent: targetNode.parent,
                direction,
                children: [targetNode, newNode]
            });

            targetNode.parent = newParent;
            newNode.parent = newParent;

            if (this.root === targetNode) {
                this.root = newParent;
            } else {
                const oldParent = newParent.parent;
                const targetIndex = oldParent.children.indexOf(targetNode);
                oldParent.children.splice(targetIndex, 1, newParent);
            }
            
            this.layout();
            this.saveState(`Split ${direction}`);
        }
        
        closePanel(targetId) {
            const target = this.panels.get(targetId);
            if (!target || this.panels.size <= 1) return;
            const { node: targetNode } = target;

            const parent = targetNode.parent;
            const sibling = targetNode.getSibling();
            const grandparent = parent.parent;

            if (grandparent) {
                const parentIndex = grandparent.children.indexOf(parent);
                grandparent.children.splice(parentIndex, 1, sibling);
                sibling.parent = grandparent;
            } else {
                this.root = sibling;
                sibling.parent = null;
            }

            targetNode.element.remove();
            this.panels.delete(targetId);
            this.layout();
            this.saveState("Close Panel");
        }

        calculateMinimumHeight(node) {
            if (this.minSizeCache.has(node.id + '-h')) return this.minSizeCache.get(node.id + '-h');
            if (node.isLeaf()) return CONFIG.PANEL_MIN_HEIGHT;
            
            const [child1, child2] = node.children;
            const h1 = this.calculateMinimumHeight(child1);
            const h2 = this.calculateMinimumHeight(child2);
            
            const result = node.direction === 'horizontal' 
                ? h1 + h2 + CONFIG.RESIZER_THICKNESS 
                : Math.max(h1, h2);
            
            this.minSizeCache.set(node.id + '-h', result);
            return result;
        }

        calculateMinimumWidth(node) {
            if (this.minSizeCache.has(node.id + '-w')) return this.minSizeCache.get(node.id + '-w');
            if (node.isLeaf()) return CONFIG.PANEL_MIN_WIDTH;
            
            const [child1, child2] = node.children;
            const w1 = this.calculateMinimumWidth(child1);
            const w2 = this.calculateMinimumWidth(child2);
            
            const result = node.direction === 'vertical' 
                ? w1 + w2 + CONFIG.RESIZER_THICKNESS 
                : Math.max(w1, w2);

            this.minSizeCache.set(node.id + '-w', result);
            return result;
        }
        
        handlePointerDown(e) {
            const resizer = e.target.closest('.panel-resizer');
            const header = e.target.closest('.panel-header');
            const actionBtn = e.target.closest('.panel-action-btn');

            if (actionBtn) { this.handleActionClick(actionBtn); return; }
            
            if (resizer) {
                const nodeId = resizer.dataset.nodeId;
                const targetNode = this._findNodeById(this.root, nodeId);
                if (!targetNode) return;
                this.activeDrag = { type: 'resize', resizer, target: targetNode };
            } else if (header) {
                this.activeDrag = { type: 'move', header, target: this.findNodeByElement(header.parentElement) };
            } else {
                return;
            }
            
            e.preventDefault();
            this.activeDrag.startX = e.clientX;
            this.activeDrag.startY = e.clientY;
            
            this.container.classList.add('no-transition');
            document.body.style.cursor = this.activeDrag.type === 'resize' ? getComputedStyle(resizer).cursor : 'grabbing';

            window.addEventListener('pointermove', this.handlePointerMove);
            window.addEventListener('pointerup', this.handlePointerUp, { once: true });
        }
        
        handlePointerMove(e) {
            if (!this.activeDrag) return;

            if (this.activeDrag.type === 'resize') {
                this.handleResize(e);
            } else if (this.activeDrag.type === 'move' && !this.activeDrag.isDragging) {
                const dx = e.clientX - this.activeDrag.startX;
                const dy = e.clientY - this.activeDrag.startY;
                if (Math.hypot(dx, dy) > 5) {
                    this.initDrag();
                }
            }
        }
        
        handlePointerUp() {
            if (this.activeDrag?.isDragging) {
                this.handleDrop();
            } else if (this.activeDrag?.type === 'resize') {
                this.saveState("Resize");
            }
            
            const wasDragging = this.activeDrag?.isDragging;

            this.exitPreviewMode();

            this.container.classList.remove('no-transition');
            document.body.style.cursor = '';
            this.activeDrag = null;
            window.removeEventListener('pointermove', this.handlePointerMove);

            if (wasDragging) {
                this.layout();
            }
        }

        handleActionClick(button) {
            const action = button.dataset.action;
            const panelId = button.closest('.panel')?.dataset.panelId;
            if (!panelId) return;

            switch(action) {
                case 'split-v': this.splitPanel(panelId, 'vertical'); break;
                case 'split-h': this.splitPanel(panelId, 'horizontal'); break;
                case 'close': this.closePanel(panelId); break;
            }
        }
        
        handleResize(e) {
            const { target: node } = this.activeDrag;
            if (!node || node.isLeaf()) return;
            
            const parentRect = node.rect;
            if (node.direction === 'vertical') {
                node.split = (e.clientX - parentRect.x) / (parentRect.width - CONFIG.RESIZER_THICKNESS);
            } else {
                node.split = (e.clientY - parentRect.y) / (parentRect.height - CONFIG.RESIZER_THICKNESS);
            }
            this.layout();
        }

        initDrag() {
            this.activeDrag.isDragging = true;
            const draggedElement = this.activeDrag.target.element;
            this.enterPreviewMode(draggedElement);
            this.container.addEventListener('pointermove', this.handleDragOver);
        }
        
        handleDragOver(e) {
            if (!this.activeDrag?.isDragging) return;
            
            const containerRect = this.container.getBoundingClientRect();
            const relativeX = e.clientX - containerRect.left;
            const relativeY = e.clientY - containerRect.top;
            
            let targetPanel = null;
            let dropZone = null;
            
            const findTarget = (node) => {
                if (!node || targetPanel) return;
                if (node.isLeaf()) {
                    if (node.element === this.activeDrag.target.element) return;
                    const rect = node.rect;
                    if (relativeX >= rect.x && relativeX <= rect.x + rect.width &&
                        relativeY >= rect.y && relativeY <= rect.y + rect.height) {
                            
                        targetPanel = node.element;
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
            findTarget(this.root);

            const hasChangedTarget = this.lastDragOverTarget.panelId !== (targetPanel?.dataset.panelId || null) || this.lastDragOverTarget.zone !== dropZone;

            if (targetPanel && dropZone && hasChangedTarget) {
                this.lastDragOverTarget = { panelId: targetPanel.dataset.panelId, zone: dropZone };
                this.activeDrag.currentTargetPanel = targetPanel;
                this.activeDrag.currentDropZone = dropZone;
                requestAnimationFrame(this.updatePreviewLayout);
            }

            this.layout(true);
        }
        
        updatePreviewLayout() {
            if (!this.isPreviewMode) return;
            
            this.previewRoot = this.root.clone();

            const { target, currentTargetPanel, currentDropZone } = this.activeDrag;
            if (currentTargetPanel && currentDropZone) {
                this.previewRoot = this._performMove(this.previewRoot, target.id, currentTargetPanel.dataset.panelId, currentDropZone);
            }
            
            this.layout(true);
        }

        _findNodeById(node, nodeId) {
            if (node.id === nodeId) return node;
            if (node.isLeaf()) return null;

            for (const child of node.children) {
                const found = this._findNodeById(child, nodeId);
                if (found) return found;
            }
            return null;
        }

        _findLeafNodeById(tree, panelId) {
            if (tree.isLeaf()) {
                return tree.id === panelId ? tree : null;
            }
            for (const child of tree.children) {
                const found = this._findLeafNodeById(child, panelId);
                if (found) return found;
            }
            return null;
        }

        _performMove(tree, draggedId, targetId, zone) {
            if (draggedId === targetId) return tree;

            const draggedNode = this._findLeafNodeById(tree, draggedId);
            const targetNode = this._findLeafNodeById(tree, targetId);
            
            if (!draggedNode || !targetNode) return tree;

            // Detach dragged node
            const draggedParent = draggedNode.parent;
            if (draggedParent) {
                const sibling = draggedNode.getSibling();
                const grandparent = draggedParent.parent;
                if (grandparent) {
                    const parentIndex = grandparent.children.indexOf(draggedParent);
                    grandparent.children.splice(parentIndex, 1, sibling);
                    sibling.parent = grandparent;
                } else {
                    tree = sibling;
                    sibling.parent = null;
                }
            } else { return tree; } // Should not happen if tree is valid

            // Attach dragged node to target
            const targetParent = targetNode.parent;
            const direction = (zone === 'left' || zone === 'right') ? 'vertical' : 'horizontal';
            const children = (zone === 'left' || zone === 'top') ? [draggedNode, targetNode] : [targetNode, draggedNode];
            const newSplitNode = new BSPNode({ parent: targetParent, direction, children });

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

        enterPreviewMode(draggedElement) {
            this.isPreviewMode = true;
            this.previewRoot = this.root.clone();
            draggedElement.classList.add('is-dragging');
            this.container.classList.add('preview-mode');
            this.layout(true);
        }

        exitPreviewMode() {
            if (!this.isPreviewMode) return;
            
            const draggedElement = this.activeDrag?.target.element;
            if (draggedElement) {
                draggedElement.classList.remove('is-dragging');
            }

            this.container.classList.remove('preview-mode');
            this.isPreviewMode = false;
            this.previewRoot = null;
            this.lastDragOverTarget = { panelId: null, zone: null };
            
            this.container.removeEventListener('pointermove', this.handleDragOver);
        }
        
        handleDrop() {
            const { currentTargetPanel, currentDropZone } = this.activeDrag;
            
            if (currentTargetPanel && currentDropZone) {
                this.root = this.previewRoot;

                this.panels.clear();
                const sync = (node) => {
                    if (node.isLeaf()) {
                        this.panels.set(node.id, { node, element: node.element });
                    } else {
                        node.children.forEach(sync);
                    }
                };
                sync(this.root);
                
                this.saveState("Move Panel");
            }
        }
        
        findNodeByElement(element) {
            const panelId = element.dataset.panelId;
            return this.panels.get(panelId)?.node;
        }

        createResizer(node, x, y, width, height, direction) {
            const resizer = document.createElement('div');
            resizer.className = `panel-resizer ${direction}`;
            resizer.dataset.nodeId = node.id;
            Object.assign(resizer.style, {
                left: `${x}px`, top: `${y}px`,
                width: `${width}px`, height: `${height}px`
            });
            this.container.appendChild(resizer);
            return resizer;
        }
        
        updatePanelControls(node) {
            if (!node.isLeaf()) return;
            const { element, rect } = node;

            const canSplitV = rect.width >= CONFIG.PANEL_MIN_WIDTH * 2 + CONFIG.RESIZER_THICKNESS;
            const canSplitH = rect.height >= CONFIG.PANEL_MIN_HEIGHT * 2 + CONFIG.RESIZER_THICKNESS;

            element.querySelector('[data-action="split-v"]').disabled = !canSplitV;
            element.querySelector('[data-action="split-h"]').disabled = !canSplitH;
            element.querySelector('[data-action="close"]').disabled = (this.panels.size <= 1);
        }
    }

    // ===== INITIALIZATION =====
    document.addEventListener('DOMContentLoaded', () => {
        const panelContainer = document.getElementById('panel-container');
        if (panelContainer) {
            window.panelManager = new PanelManager(panelContainer);
            window.panelManager.init();
        } else {
            console.error('Panel container not found.');
        }
    });

})();
