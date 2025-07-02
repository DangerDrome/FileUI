(function() {
    'use strict';

    class BSPNode {
        constructor(options = {}) {
            this.parent = options.parent || null;
            this.element = options.element || null; // For leaf nodes
            this.children = options.children || []; // For internal nodes
            this.direction = options.direction || null; // 'vertical' or 'horizontal'
            this.split = options.split || 0.5;

            if (this.element) {
                this.id = this.element.dataset.panelId;
            }
        }

        isLeaf() {
            return this.children.length === 0;
        }
    }

    const panelGrid = {
        container: null,
        root: null,
        draggedNode: null,
        dropIndicator: null,
        dragGhostElement: null,
        dragGhostOffset: { x: 0, y: 0 },
        nextPanelId: 4,
        dropHandled: false,

        // Properties for live resize preview
        previewAnimation: null,
        lastPreviewTarget: null,
        lastPreviewZone: null,
        lastPreviewTargetOriginalRect: null,

        init() {
            this.container = document.getElementById('panel-grid-container');
            this.dropIndicator = document.getElementById('drop-indicator');
            if (!this.container) return;

            const panels = Array.from(this.container.querySelectorAll('.panel-grid-item'));
            if (panels.length === 0) return;

            const node1 = new BSPNode({ element: panels[0] });
            if (panels.length === 1) {
                this.root = node1;
            } else {
                // Manually construct a tree for 2 or more panels for demo
                const node2 = new BSPNode({ element: panels[1] });
                this.root = new BSPNode({
                    children: [node1, node2],
                    direction: 'vertical',
                    split: 0.5,
                });
                node1.parent = this.root;
                node2.parent = this.root;

                if (panels.length === 3) {
                    const node3 = new BSPNode({ element: panels[2] });
                    const oldRoot = this.root;
                    this.root = new BSPNode({
                        children: [oldRoot, node3],
                        direction: 'horizontal',
                        split: 0.5
                    });
                    oldRoot.parent = this.root;
                    node3.parent = this.root;
                }
            }
            
            this.updateDragGhostPosition = this.updateDragGhostPosition.bind(this);
            this.layout();
            this.addEventListeners();
        },
        
        layout() {
            this.container.querySelectorAll('.panel-resizer').forEach(r => r.remove());
        
            const _layoutRecursive = (node, rect) => {
                if (node.isLeaf()) {
                    const el = node.element;
                    el.style.left = `${rect.x}px`;
                    el.style.top = `${rect.y}px`;
                    el.style.width = `${rect.width}px`;
                    el.style.height = `${rect.height}px`;
                    return;
                }
        
                const [child1, child2] = node.children;
                let rect1, rect2;
                const resizerThickness = 5;
        
                if (node.direction === 'vertical') {
                    const splitPos = rect.width * node.split;
                    rect1 = { ...rect, width: splitPos - resizerThickness / 2 };
                    rect2 = { ...rect, x: rect.x + splitPos + resizerThickness / 2, width: rect.width - splitPos - resizerThickness / 2 };
                    this.createResizer(node, rect.x + splitPos - resizerThickness / 2, rect.y, resizerThickness, rect.height, 'vertical');
                } else { // horizontal
                    const splitPos = rect.height * node.split;
                    rect1 = { ...rect, height: splitPos - resizerThickness / 2 };
                    rect2 = { ...rect, y: rect.y + splitPos + resizerThickness / 2, height: rect.height - splitPos - resizerThickness / 2 };
                    this.createResizer(node, rect.x, rect.y + splitPos - resizerThickness / 2, rect.width, resizerThickness, 'horizontal');
                }
        
                _layoutRecursive(child1, rect1);
                _layoutRecursive(child2, rect2);
            };
        
            const containerRect = this.container.getBoundingClientRect();
            const relativeRect = { x: 0, y: 0, width: containerRect.width, height: containerRect.height };
            _layoutRecursive(this.root, relativeRect);
        },

        createResizer(node, x, y, width, height, direction) {
            const resizer = document.createElement('div');
            resizer.className = `panel-resizer ${direction}`;
            resizer.style.left = `${x}px`;
            resizer.style.top = `${y}px`;
            resizer.style.width = `${width}px`;
            resizer.style.height = `${height}px`;
            this.container.appendChild(resizer);
            
            resizer.addEventListener('mousedown', (e) => this.handleResizerMouseDown(e, node));
        },

        handleResizerMouseDown(e, node) {
            e.preventDefault();
            
            // Add no-transition class to all panels
            this.container.querySelectorAll('.panel-grid-item').forEach(p => p.classList.add('no-transition'));

            const getParentRect = (n) => {
                const parent = n.parent;
                if (!parent) return this.container.getBoundingClientRect();
                
                const childrenRects = parent.children.map(c => this.getNodeRect(c));
                const combinedRect = childrenRects.reduce((acc, r) => {
                    return {
                        minX: Math.min(acc.minX, r.x),
                        minY: Math.min(acc.minY, r.y),
                        maxX: Math.max(acc.maxX, r.x + r.width),
                        maxY: Math.max(acc.maxY, r.y + r.height),
                    };
                }, {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity});

                return {
                    x: combinedRect.minX,
                    y: combinedRect.minY,
                    width: combinedRect.maxX - combinedRect.minX,
                    height: combinedRect.maxY - combinedRect.minY
                };
            };
            
            const parentRect = getParentRect(node);

            const handleMouseMove = (moveEvent) => {
                if (node.direction === 'vertical') {
                    const newSplit = (moveEvent.clientX - parentRect.x) / parentRect.width;
                    node.split = Math.max(0.1, Math.min(0.9, newSplit));
                } else {
                    const newSplit = (moveEvent.clientY - parentRect.y) / parentRect.height;
                    node.split = Math.max(0.1, Math.min(0.9, newSplit));
                }
                this.layout();
            };

            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                // Remove no-transition class from all panels
                this.container.querySelectorAll('.panel-grid-item').forEach(p => p.classList.remove('no-transition'));
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        
        getNodeRect(node) {
            if (node.isLeaf()) {
                const rect = node.element.getBoundingClientRect();
                const containerRect = this.container.getBoundingClientRect();
                return { x: rect.left - containerRect.left, y: rect.top - containerRect.top, width: rect.width, height: rect.height };
            }
        
            const childrenRects = node.children.map(c => this.getNodeRect(c));
            const combinedRect = childrenRects.reduce((acc, r) => {
                if (!r) return acc;
                return {
                    minX: Math.min(acc.minX, r.x),
                    minY: Math.min(acc.minY, r.y),
                    maxX: Math.max(acc.maxX, r.x + r.width),
                    maxY: Math.max(acc.maxY, r.y + r.height),
                };
            }, {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity});
        
            return {
                x: combinedRect.minX,
                y: combinedRect.minY,
                width: combinedRect.maxX - combinedRect.minX,
                height: combinedRect.maxY - combinedRect.minY
            };
        },

        addEventListeners() {
            this.container.querySelectorAll('.panel-grid-item').forEach(panel => {
                this.addPanelEventListeners(panel);
            });

            this.container.addEventListener('click', (e) => {
                const closeButton = e.target.closest('.panel-close-btn');
                const splitButton = e.target.closest('.panel-action-btn');
                if (closeButton) {
                    this.handleClosePanel(closeButton);
                }
                if (splitButton) {
                    this.handleSplitPanel(splitButton);
                }
            });

            this.container.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.container.addEventListener('drop', (e) => this.handleDrop(e));
            window.addEventListener('resize', () => this.layout());
        },
        
        addPanelEventListeners(panelElement) {
            panelElement.draggable = true;
            panelElement.addEventListener('dragstart', (e) => this.handleDragStart(e));
            panelElement.addEventListener('dragend', () => this.handleDragEnd());
        },

        findNodeByElement(element, node = this.root) {
             if (node.isLeaf()) {
                return node.element === element ? node : null;
            }
            for (const child of node.children) {
                const found = this.findNodeByElement(element, child);
                if (found) return found;
            }
            return null;
        },

        handleDragStart(e) {
            this.dropHandled = false; // Reset on new drag
            e.stopPropagation();
            this.draggedNode = this.findNodeByElement(e.target);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', this.draggedNode.id);

            const rect = e.target.getBoundingClientRect();
            this.dragGhostOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };

            // Add no-transition class to all panels
            this.container.querySelectorAll('.panel-grid-item').forEach(p => p.classList.add('no-transition'));

            this.createDragGhost(e.target);

            // Use a transparent image to hide default drag preview
            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(img, 0, 0);

            // Defer hiding the element to ensure the drag operation has started.
            setTimeout(() => {
                if (this.draggedNode) {
                    this.draggedNode.element.style.visibility = 'hidden';
                }
            }, 0);
        },
        
        handleDragEnd() {
            // If drop was not on a valid target, cleanup is handled here.
            // Otherwise, handleDrop's animation callback will perform cleanup.
            if (!this.dropHandled) {
                if (this.draggedNode) {
                    this.draggedNode.element.style.visibility = 'visible';
                    this.draggedNode = null;
                }
                this.removeDragGhost();
                this.clearDropPreview(); // Restore any previewed panel
                // Remove no-transition class if drop was cancelled
                this.container.querySelectorAll('.panel-grid-item').forEach(p => p.classList.remove('no-transition'));
            }
            
            // Always ensure the drop indicator is hidden after a drag operation.
            this.dropIndicator.style.display = 'none';
        },

        createDragGhost(sourceElement) {
            if (this.dragGhostElement) {
                this.dragGhostElement.remove();
            }
            this.dragGhostElement = sourceElement.cloneNode(true);
            this.dragGhostElement.classList.add('drag-ghost');
            this.dragGhostElement.style.position = 'absolute';
            this.dragGhostElement.style.pointerEvents = 'none';
            this.dragGhostElement.style.zIndex = '9999';
            this.dragGhostElement.style.opacity = '1';
            
            const rect = sourceElement.getBoundingClientRect();
            this.dragGhostElement.style.width = `${rect.width}px`;
            this.dragGhostElement.style.height = `${rect.height}px`;

            document.body.appendChild(this.dragGhostElement);
            document.addEventListener('dragover', this.updateDragGhostPosition);
        },

        updateDragGhostPosition(e) {
            if (!this.dragGhostElement) return;
            let x = e.clientX - this.dragGhostOffset.x;
            let y = e.clientY - this.dragGhostOffset.y;
            this.dragGhostElement.style.left = `${x}px`;
            this.dragGhostElement.style.top = `${y}px`;
        },

        removeDragGhost() {
            if (this.dragGhostElement) {
                this.dragGhostElement.remove();
                this.dragGhostElement = null;
            }
            document.removeEventListener('dragover', this.updateDragGhostPosition);
        },

        handleDragOver(e) {
            e.preventDefault();
            
            let targetElement = null;

            // First, check if we are still within the bounds of the panel we are currently previewing.
            // This prevents flickering when the panel shrinks and the mouse is temporarily not over it.
            if (this.lastPreviewTarget && this.lastPreviewTargetOriginalRect) {
                const containerRect = this.container.getBoundingClientRect();
                const originalRect = {
                    left: parseFloat(this.lastPreviewTargetOriginalRect.left) + containerRect.left,
                    top: parseFloat(this.lastPreviewTargetOriginalRect.top) + containerRect.top,
                    width: parseFloat(this.lastPreviewTargetOriginalRect.width),
                    height: parseFloat(this.lastPreviewTargetOriginalRect.height),
                };
                originalRect.right = originalRect.left + originalRect.width;
                originalRect.bottom = originalRect.top + originalRect.height;
                
                if (e.clientX >= originalRect.left && e.clientX <= originalRect.right &&
                    e.clientY >= originalRect.top && e.clientY <= originalRect.bottom) {
                    targetElement = this.lastPreviewTarget;
                }
            }
            
            // If we're not over the last previewed panel, find a new one.
            if (!targetElement) {
                const allPanels = this.container.querySelectorAll('.panel-grid-item');
                for (const panel of allPanels) {
                    // Don't check against the last previewed panel again, or the dragged panel.
                    if (panel === this.lastPreviewTarget || (this.draggedNode && panel === this.draggedNode.element)) {
                        continue;
                    }
                    const rect = panel.getBoundingClientRect();
                    if (e.clientX >= rect.left && e.clientX <= rect.right &&
                        e.clientY >= rect.top && e.clientY <= rect.bottom) {
                        targetElement = panel;
                        break;
                    }
                }
            }

            let zone = '';
            if (targetElement) {
                // To calculate the zone, we must use the original rect if we are previewing,
                // because the visual rect is shrunk.
                const rect = (targetElement === this.lastPreviewTarget && this.lastPreviewTargetOriginalRect)
                    ? { 
                        left: parseFloat(this.lastPreviewTargetOriginalRect.left) + this.container.getBoundingClientRect().left,
                        top: parseFloat(this.lastPreviewTargetOriginalRect.top) + this.container.getBoundingClientRect().top,
                        width: parseFloat(this.lastPreviewTargetOriginalRect.width),
                        height: parseFloat(this.lastPreviewTargetOriginalRect.height)
                      }
                    : targetElement.getBoundingClientRect();
                
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const dropZoneSize = 0.25;

                if (y < rect.height * dropZoneSize) zone = 'top';
                else if (y > rect.height * (1 - dropZoneSize)) zone = 'bottom';
                else if (x < rect.width * dropZoneSize) zone = 'left';
                else if (x > rect.width * (1 - dropZoneSize)) zone = 'right';
            }

            // If the target and zone are the same as the last frame, do nothing.
            if (targetElement === this.lastPreviewTarget && zone === this.lastPreviewZone) {
                return;
            }

            // If the state has changed, clear the old preview first.
            this.clearDropPreview();

            // If we have a new valid target and zone, create a new preview.
            if (targetElement && zone) {
                this.createDropPreview(targetElement, zone);
            }
        },
        
        createDropPreview(targetElement, zone) {
            if (this.previewAnimation) {
                this.previewAnimation.cancel();
            }

            this.lastPreviewTarget = targetElement;
            this.lastPreviewZone = zone;
        
            const rect = targetElement.getBoundingClientRect();
            const containerRect = this.container.getBoundingClientRect();

            const original = {
                left: rect.left - containerRect.left,
                top: rect.top - containerRect.top,
                width: rect.width,
                height: rect.height,
            };
            
            // Store the original rect to be used for restoration
            this.lastPreviewTargetOriginalRect = original;
        
            const targetNewRect = { ...original };
            const indicatorRect = { ...original };
        
            switch (zone) {
                case 'top':
                    targetNewRect.height /= 2;
                    targetNewRect.top += targetNewRect.height;
                    indicatorRect.height /= 2;
                    break;
                case 'bottom':
                    targetNewRect.height /= 2;
                    indicatorRect.top += indicatorRect.height / 2;
                    indicatorRect.height /= 2;
                    break;
                case 'left':
                    targetNewRect.width /= 2;
                    targetNewRect.left += targetNewRect.width;
                    indicatorRect.width /= 2;
                    break;
                case 'right':
                    targetNewRect.width /= 2;
                    indicatorRect.left += indicatorRect.width / 2;
                    indicatorRect.width /= 2;
                    break;
            }
            
            this.previewAnimation = targetElement.animate([
                {
                    left: `${original.left}px`, top: `${original.top}px`,
                    width: `${original.width}px`, height: `${original.height}px`
                },
                {
                    left: `${targetNewRect.left}px`, top: `${targetNewRect.top}px`,
                    width: `${targetNewRect.width}px`, height: `${targetNewRect.height}px`
                }
            ], {
                duration: 150,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards'
            });
            
            const ind = this.dropIndicator;
            ind.style.display = 'block';
            Object.assign(ind.style, {
                left: `${indicatorRect.left}px`,
                top: `${indicatorRect.top}px`,
                width: `${indicatorRect.width}px`,
                height: `${indicatorRect.height}px`,
            });
        },
        
        clearDropPreview() {
            if (this.previewAnimation) {
                this.previewAnimation.cancel();
                this.previewAnimation = null;
            }

            if (this.lastPreviewTarget && this.lastPreviewTargetOriginalRect) {
                const target = this.lastPreviewTarget;
                const original = this.lastPreviewTargetOriginalRect;
                
                const currentRect = target.getBoundingClientRect();
                const containerRect = this.container.getBoundingClientRect();

                this.previewAnimation = target.animate([
                    {
                        left: `${currentRect.left - containerRect.left}px`,
                        top: `${currentRect.top - containerRect.top}px`,
                        width: `${currentRect.width}px`,
                        height: `${currentRect.height}px`,
                    },
                    {
                        left: `${original.left}px`,
                        top: `${original.top}px`,
                        width: `${original.width}px`,
                        height: `${original.height}px`,
                    }
                ], {
                    duration: 150,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    fill: 'forwards'
                });

                this.previewAnimation.onfinish = () => {
                    target.style.left = '';
                    target.style.top = '';
                    target.style.width = '';
                    target.style.height = '';
                    this.previewAnimation = null;
                };
            }

            this.dropIndicator.style.display = 'none';
            this.lastPreviewTarget = null;
            this.lastPreviewZone = null;
            this.lastPreviewTargetOriginalRect = null;
        },

        showDropIndicator(targetElement, zone) {
            // This function is now effectively replaced by the logic in handleDragOver
            // but we'll keep it to avoid breaking anything that might call it, just in case.
        },

        handleDrop(e) {
            e.preventDefault();
            this.dropHandled = true;
        
            if (this.previewAnimation) {
                this.previewAnimation.cancel();
                this.previewAnimation = null;
            }

            const performDropLogic = () => {
                const targetId = this.lastPreviewTarget ? this.lastPreviewTarget.dataset.panelId : null;
                const zone = this.lastPreviewZone;
        
                this.lastPreviewTarget = null;
                this.lastPreviewZone = null;
        
                if (!targetId || !zone || !this.draggedNode) {
                    if (this.draggedNode) this.draggedNode.element.style.visibility = 'visible';
                    this.removeDragGhost();
                    return;
                }
        
                const targetElement = this.container.querySelector(`[data-panel-id='${targetId}']`);
                const targetNode = this.findNodeByElement(targetElement);
        
                if (!targetNode || targetNode === this.draggedNode) {
                    if (this.draggedNode) this.draggedNode.element.style.visibility = 'visible';
                    this.removeDragGhost();
                    return;
                }
        
                const oldParent = this.draggedNode.parent;
                if (oldParent) {
                     const sibling = oldParent.children.find(c => c !== this.draggedNode);
                     const grandParent = oldParent.parent;
                     if (grandParent) {
                        const oldParentIndex = grandParent.children.indexOf(oldParent);
                        grandParent.children.splice(oldParentIndex, 1, sibling);
                        sibling.parent = grandParent;
                     } else {
                        this.root = sibling;
                        sibling.parent = null;
                     }
                } else { 
                     if (this.root.isLeaf()) return;
                }
        
                const targetParent = targetNode.parent;
                const newSplitNode = new BSPNode({ parent: targetParent });
                
                if (zone === 'left' || zone === 'right') {
                    newSplitNode.direction = 'vertical';
                    newSplitNode.children = zone === 'left' ? [this.draggedNode, targetNode] : [targetNode, this.draggedNode];
                } else {
                    newSplitNode.direction = 'horizontal';
                    newSplitNode.children = zone === 'top' ? [this.draggedNode, targetNode] : [targetNode, this.draggedNode];
                }
        
                this.draggedNode.parent = newSplitNode;
                targetNode.parent = newSplitNode;
                
                if (targetParent) {
                    const targetIndex = targetParent.children.indexOf(targetNode);
                    targetParent.children.splice(targetIndex, 1, newSplitNode);
                } else {
                    this.root = newSplitNode;
                }
                
                this.layout();
        
                const ghost = this.dragGhostElement;
                if (!ghost) return;
        
                const finalRect = this.draggedNode.element.getBoundingClientRect();
        
                const animation = ghost.animate([
                    {
                        top: ghost.style.top, left: ghost.style.left,
                        width: ghost.style.width, height: ghost.style.height,
                    },
                    {
                        top: `${finalRect.top}px`, left: `${finalRect.left}px`,
                        width: `${finalRect.width}px`, height: `${finalRect.height}px`,
                    }
                ], {
                    duration: 200,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                });
        
                animation.onfinish = () => {
                    if (this.draggedNode) {
                        this.draggedNode.element.style.visibility = 'visible';
                        this.draggedNode.element.classList.remove('no-transition');
                        this.draggedNode = null;
                    }
                    this.removeDragGhost();
                    this.container.querySelectorAll('.panel-grid-item').forEach(p => p.classList.remove('no-transition'));
                };
            };
        
            // We no longer need to wait for an animation to reverse.
            performDropLogic();
        },

        handleClosePanel(button) {
            const panelElement = button.closest('.panel-grid-item');
            if (!panelElement) return;

            const nodeToClose = this.findNodeByElement(panelElement);
            if (!nodeToClose) return;

            if (this.root === nodeToClose) {
                console.warn("Cannot close the last panel.");
                return;
            }

            const parent = nodeToClose.parent;
            const sibling = parent.children.find(c => c !== nodeToClose);
            const grandParent = parent.parent;

            panelElement.remove();
            
            if (grandParent) {
                const parentIndex = grandParent.children.indexOf(parent);
                grandParent.children.splice(parentIndex, 1, sibling);
                sibling.parent = grandParent;
            } else {
                this.root = sibling;
                sibling.parent = null;
            }

            this.layout();
        },

        handleSplitPanel(button) {
            const direction = button.dataset.splitDirection;
            const panelElement = button.closest('.panel-grid-item');
            if (!panelElement || !direction) return;
            
            const targetNode = this.findNodeByElement(panelElement);
            if (!targetNode) return;

            const newElement = this.createNewPanelElement();
            const newNode = new BSPNode({ element: newElement });
            this.addPanelEventListeners(newElement);

            const targetParent = targetNode.parent;
            const newSplitNode = new BSPNode({
                parent: targetParent,
                direction: direction,
                children: [targetNode, newNode]
            });
            
            targetNode.parent = newSplitNode;
            newNode.parent = newSplitNode;
            
            if (targetParent) {
                const targetIndex = targetParent.children.indexOf(targetNode);
                targetParent.children.splice(targetIndex, 1, newSplitNode);
            } else {
                this.root = newSplitNode;
            }

            this.layout();
        },

        createNewPanelElement() {
            const panelId = this.nextPanelId++;
            const element = document.createElement('div');
            element.className = 'panel-grid-item';
            element.dataset.panelId = panelId;

            element.innerHTML = `
                <div class="panel-grid-item-header">
                    <div class="panel-header-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                        Panel ${panelId}
                    </div>
                    <div class="panel-header-actions">
                        <button class="panel-action-btn" data-split-direction="vertical" title="Split Vertically">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-columns"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="12" x2="12" y1="3" y2="21"/></svg>
                        </button>
                        <button class="panel-action-btn" data-split-direction="horizontal" title="Split Horizontally">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rows"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="12" y2="12"/></svg>
                        </button>
                        <button class="panel-close-btn" title="Close Panel">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                </div>
                <div class="panel-grid-item-content">Content of panel ${panelId}</div>
            `;
            this.container.appendChild(element);
            return element;
        },
    };

    document.addEventListener('DOMContentLoaded', () => panelGrid.init());
})();
