(function() {
    'use strict';

    // ===== CONFIGURATION CONSTANTS =====
    const CONFIG = {
        // Layout and sizing
        RESIZER_THICKNESS: 5,
        INITIAL_PANEL_COUNT: 4,
        PANEL_MIN_HEIGHT: 28, // Just enough for header visibility (content can collapse)
        PANEL_MIN_WIDTH: 100,  // Minimum width to keep panel header controls on one line
        // Note: These minimums are calculated recursively to prevent header overlap
        
        // Animation settings
        ANIMATION_DURATION: {
            DROP_PREVIEW: 150,
            PANEL_GROW: 200,
            DRAG_GHOST: 200
        },
        EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
        
        // Panel creation animations
        PANEL_ANIMATIONS: {
            GROW: { 
                class: 'panel-grow-in', 
                keyframeName: 'panelGrowIn',
                description: 'Scale and fade in'
            },
            SLIDE: { 
                class: 'panel-slide-in', 
                keyframeName: 'panelSlideIn',
                description: 'Slide from left'
            },
            FADE: { 
                class: 'panel-fade-in', 
                keyframeName: 'panelFadeIn',
                description: 'Simple fade in'
            }
        },
        
        // Default animation type for new panels
        // Change this to 'SLIDE' or 'FADE' to set a different default
        DEFAULT_ANIMATION: 'SLIDE',
        
        // Panel splitting constraints
        SPLIT_CONSTRAINTS: {
            MIN: 0.1,
            MAX: 0.9
        },
        
        // Drag and drop
        TRANSPARENT_IMAGE: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        DRAG_GHOST_SHADOW: '0 8px 32px rgba(0, 0, 0, 0.3)'
    };

    // ===== BSP NODE CLASS =====
    /**
     * Binary Space Partitioning Node for managing panel layout hierarchy
     * Each node represents either a panel (leaf) or a split container (internal)
     */
    class BSPNode {
        constructor(options = {}) {
            this.parent = options.parent || null;        // Parent node in the tree
            this.element = options.element || null;      // DOM element (for leaf nodes)
            this.children = options.children || [];      // Child nodes (for internal nodes)
            this.direction = options.direction || null;  // 'vertical' or 'horizontal' split
            this.split = options.split || 0.5;          // Split position (0.0 to 1.0)

            // Set unique ID from element if it exists
            if (this.element) {
                this.id = this.element.dataset.panelId;
            }
        }

        /**
         * Check if this node is a leaf (contains a panel) or internal (contains splits)
         */
        isLeaf() {
            return this.children.length === 0;
        }
    }

    // ===== MAIN PANEL GRID CONTROLLER =====
    const panelGrid = {
        // ===== CORE PROPERTIES =====
        container: null,                    // Main container element
        root: null,                        // Root of BSP tree
        dropIndicator: null,               // Visual drop indicator element
        nextPanelId: CONFIG.INITIAL_PANEL_COUNT,  // Counter for new panel IDs
        currentAnimationType: CONFIG.DEFAULT_ANIMATION,  // Current panel animation type

        // ===== DRAG STATE MANAGEMENT =====
        draggedNode: null,                 // Currently dragged panel node
        dragGhostElement: null,            // Visual ghost element during drag
        dragGhostOffset: { x: 0, y: 0 },  // Mouse offset for ghost positioning
        dropHandled: false,                // Flag to track if drop was handled

        // ===== PREVIEW STATE MANAGEMENT =====
        previewAnimation: null,            // Current preview animation for the panel
        indicatorAnimation: null,          // Current preview animation for the indicator
        lastPreviewTarget: null,           // Last panel that was previewed
        lastPreviewZone: null,            // Last drop zone that was previewed
        lastPreviewTargetOriginalRect: null, // Original dimensions before preview

        // ===== INITIALIZATION =====
        /**
         * Initialize the panel grid system
         * Sets up DOM references, builds initial BSP tree, and attaches event listeners
         */
        init() {
            // Sync config with CSS variables to ensure calculations are based on rendered styles
            this.syncConfigWithCSS();

            // Get required DOM elements
            this.container = document.getElementById('panel-grid-container');
            this.dropIndicator = document.getElementById('drop-indicator');
            
            if (!this.container) {
                console.error('Panel grid container not found');
                return;
            }

            // Build initial tree from existing panels
            const panels = Array.from(this.container.querySelectorAll('.panel-grid-item'));
            if (panels.length === 0) return;

            this.buildInitialTree(panels);
            
            // Bind methods and setup
            this.updateDragGhostPosition = this.updateDragGhostPosition.bind(this);
            this.layout();
            this.addEventListeners();
        },

        /**
         * Reads layout-critical values from CSS custom properties.
         * This makes CSS the single source of truth for dimensions, preventing
         * conflicts between JS calculations and CSS rendering.
         */
        syncConfigWithCSS() {
            const style = getComputedStyle(document.documentElement);
            const parse = (val) => parseFloat(val);

            CONFIG.PANEL_MIN_WIDTH = parse(style.getPropertyValue('--panel-min-width')) || CONFIG.PANEL_MIN_WIDTH;
            CONFIG.PANEL_MIN_HEIGHT = parse(style.getPropertyValue('--panel-min-height')) || CONFIG.PANEL_MIN_HEIGHT;
            CONFIG.RESIZER_THICKNESS = parse(style.getPropertyValue('--panel-resizer-size')) || CONFIG.RESIZER_THICKNESS;
        },

        /**
         * Build initial BSP tree from existing panel elements
         * Creates a simple tree structure for demo purposes
         */
        buildInitialTree(panels) {
            const node1 = new BSPNode({ element: panels[0] });
            
            if (panels.length === 1) {
                this.root = node1;
                return;
            }

            // Create vertical split for two panels
            const node2 = new BSPNode({ element: panels[1] });
            this.root = new BSPNode({
                children: [node1, node2],
                direction: 'vertical',
                split: 0.5,
            });
            node1.parent = this.root;
            node2.parent = this.root;

            // Add third panel with horizontal split
            if (panels.length >= 3) {
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
        },

        // ===== LAYOUT MANAGEMENT =====
        /**
         * Recursively layout all panels according to BSP tree structure
         * Positions panels absolutely and creates resizers between them
         */
        layout() {
            // Remove existing resizers
            this.container.querySelectorAll('.panel-resizer').forEach(r => r.remove());

            /**
             * Recursive function to layout nodes within given rectangle
             */
            const layoutRecursive = (node, rect) => {
                // Store the calculated rectangle on the node for later reference (e.g., resizing)
                node.rect = rect;

                if (node.isLeaf()) {
                    // Position leaf panel
                    const el = node.element;
                    el.style.left = `${rect.x}px`;
                    el.style.top = `${rect.y}px`;
                    el.style.width = `${rect.width}px`;
                    el.style.height = `${rect.height}px`;

                    // Update panel controls based on new size
                    this.updatePanelControls(node);
                    return;
                }

                // Split rectangle for internal nodes
                const [child1, child2] = node.children;
                let rect1, rect2;

                if (node.direction === 'vertical') {
                    const availableWidth = rect.width - CONFIG.RESIZER_THICKNESS;
                    if (availableWidth < 0) return;

                    const minWidth1 = this.calculateMinimumWidth(child1);
                    const minWidth2 = this.calculateMinimumWidth(child2);
                    
                    // If total minWidths are larger than available space, we must adjust the split ratio
                    if (minWidth1 + minWidth2 > availableWidth) {
                        const totalMinWidth = minWidth1 + minWidth2;
                        node.split = (totalMinWidth > 0) ? (minWidth1 / totalMinWidth) : 0.5;
                    }

                    let width1 = availableWidth * node.split;
                    let width2 = availableWidth - width1;

                    // If a split violates min constraints, adjust one panel and derive the other
                    if (width1 < minWidth1) {
                        width1 = minWidth1;
                        width2 = availableWidth - width1;
                    } else if (width2 < minWidth2) {
                        width2 = minWidth2;
                        width1 = availableWidth - width2;
                    }
                    
                    // Ensure widths are non-negative
                    width1 = Math.max(0, width1);
                    width2 = Math.max(0, width2);
                    
                    rect1 = { ...rect, width: width1 };
                    rect2 = { ...rect, x: rect.x + width1 + CONFIG.RESIZER_THICKNESS, width: width2 };

                    this.createResizer(node, rect.x + width1, rect.y, CONFIG.RESIZER_THICKNESS, rect.height, 'vertical');
                } else { // horizontal split
                    const availableHeight = rect.height - CONFIG.RESIZER_THICKNESS;
                    if (availableHeight < 0) return;

                    const minHeight1 = this.calculateMinimumHeight(child1);
                    const minHeight2 = this.calculateMinimumHeight(child2);

                    // If total minHeights are larger than available space, we must adjust the split ratio
                    if (minHeight1 + minHeight2 > availableHeight) {
                        const totalMinHeight = minHeight1 + minHeight2;
                        node.split = (totalMinHeight > 0) ? (minHeight1 / totalMinHeight) : 0.5;
                    }

                    let height1 = availableHeight * node.split;
                    let height2 = availableHeight - height1;

                    // If a split violates min constraints, adjust one panel and derive the other
                    if (height1 < minHeight1) {
                        height1 = minHeight1;
                        height2 = availableHeight - height1;
                    } else if (height2 < minHeight2) {
                        height2 = minHeight2;
                        height1 = availableHeight - height2;
                    }

                    // Ensure heights are non-negative
                    height1 = Math.max(0, height1);
                    height2 = Math.max(0, height2);

                    rect1 = { ...rect, height: height1 };
                    rect2 = { ...rect, y: rect.y + height1 + CONFIG.RESIZER_THICKNESS, height: height2 };

                    this.createResizer(node, rect.x, rect.y + height1, rect.width, CONFIG.RESIZER_THICKNESS, 'horizontal');
                }

                // Recursively layout children
                layoutRecursive(child1, rect1);
                layoutRecursive(child2, rect2);
            };

            // Start layout from container bounds
            const containerRect = this.container.getBoundingClientRect();
            const relativeRect = { 
                x: 0, 
                y: 0, 
                width: containerRect.width, 
                height: containerRect.height 
            };
            layoutRecursive(this.root, relativeRect);
        },

        /**
         * Create a resizer element between panels
         */
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

        // ===== RESIZING FUNCTIONALITY =====
        /**
         * Handle mouse down on resizer to start resize operation
         */
        handleResizerMouseDown(e, node) {
            e.preventDefault();
            
            // Disable transitions during resize for performance
            this.toggleTransitions(false);

            const nodeRect = node.rect; // Use the stored rect from the last layout pass
            if (!nodeRect) return; // Exit if layout hasn't happened yet

            const handleMouseMove = (moveEvent) => {
                let newSplit;
                if (node.direction === 'vertical') {
                    newSplit = (moveEvent.clientX - nodeRect.x) / nodeRect.width;
                } else {
                    newSplit = (moveEvent.clientY - nodeRect.y) / nodeRect.height;
                }
                
                // Apply minimum dimension constraints considering all panels
                if (node.direction === 'horizontal') {
                    // Constrain horizontal splits to maintain minimum height for all panels
                    const availableHeight = nodeRect.height - CONFIG.RESIZER_THICKNESS;
                    const [child1, child2] = node.children;
                    
                    // Calculate minimum height needed for each side (considering nested panels)
                    const minHeightChild1 = this.calculateMinimumHeight(child1);
                    const minHeightChild2 = this.calculateMinimumHeight(child2);
                    
                    const minSplitForChild1 = minHeightChild1 / availableHeight;
                    const maxSplitForChild2 = (availableHeight - minHeightChild2) / availableHeight;
                    
                    newSplit = Math.max(minSplitForChild1, Math.min(maxSplitForChild2, newSplit));
                } else {
                    // Constrain vertical splits to maintain minimum width for all panels
                    const availableWidth = nodeRect.width - CONFIG.RESIZER_THICKNESS;
                    const [child1, child2] = node.children;
                    
                    // Calculate minimum width needed for each side (considering nested panels)
                    const minWidthChild1 = this.calculateMinimumWidth(child1);
                    const minWidthChild2 = this.calculateMinimumWidth(child2);
                    
                    const minSplitForChild1 = minWidthChild1 / availableWidth;
                    const maxSplitForChild2 = (availableWidth - minWidthChild2) / availableWidth;
                    
                    newSplit = Math.max(minSplitForChild1, Math.min(maxSplitForChild2, newSplit));
                }
                
                // Constrain split position
                node.split = Math.max(
                    CONFIG.SPLIT_CONSTRAINTS.MIN, 
                    Math.min(CONFIG.SPLIT_CONSTRAINTS.MAX, newSplit)
                );
                this.layout();
            };

            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                this.toggleTransitions(true);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },

        /**
         * Get the bounding rectangle of a node's parent
         */
        getParentRect(node) {
            const parent = node.parent;
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
        },

        /**
         * Get the bounding rectangle of a node (panel or combined children)
         */
        getNodeRect(node) {
            if (node.isLeaf()) {
                const rect = node.element.getBoundingClientRect();
                const containerRect = this.container.getBoundingClientRect();
                return { 
                    x: rect.left - containerRect.left, 
                    y: rect.top - containerRect.top, 
                    width: rect.width, 
                    height: rect.height 
                };
            }

            // Combine children rectangles for internal nodes
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

        /**
         * Calculate the minimum height required for a node and all its children
         * Recursively considers the layout structure to prevent header overlap
         */
        calculateMinimumHeight(node) {
            if (node.isLeaf()) {
                return CONFIG.PANEL_MIN_HEIGHT;
            }

            const [child1, child2] = node.children;
            const minHeight1 = this.calculateMinimumHeight(child1);
            const minHeight2 = this.calculateMinimumHeight(child2);

            if (node.direction === 'horizontal') {
                // Horizontal split: heights add up (stacked vertically)
                return minHeight1 + minHeight2 + CONFIG.RESIZER_THICKNESS;
            } else {
                // Vertical split: take the maximum height needed (side by side)
                return Math.max(minHeight1, minHeight2);
            }
        },

        /**
         * Calculate the minimum width required for a node and all its children
         * Recursively considers the layout structure to maintain functionality
         */
        calculateMinimumWidth(node) {
            if (node.isLeaf()) {
                return CONFIG.PANEL_MIN_WIDTH;
            }

            const [child1, child2] = node.children;
            const minWidth1 = this.calculateMinimumWidth(child1);
            const minWidth2 = this.calculateMinimumWidth(child2);

            if (node.direction === 'vertical') {
                // Vertical split: widths add up (side by side)
                return minWidth1 + minWidth2 + CONFIG.RESIZER_THICKNESS;
            } else {
                // Horizontal split: take the maximum width needed (stacked vertically)
                return Math.max(minWidth1, minWidth2);
            }
        },

        // ===== EVENT MANAGEMENT =====
        /**
         * Add all event listeners for the panel system
         */
        addEventListeners() {
            // Add drag and button listeners to existing panels
            this.container.querySelectorAll('.panel-grid-item').forEach(panel => {
                this.addPanelEventListeners(panel);
            });

            // Handle panel actions (close, split)
            this.container.addEventListener('click', (e) => {
                const closeButton = e.target.closest('.panel-close-btn');
                const splitButton = e.target.closest('.panel-action-btn');
                
                if (closeButton) {
                    this.handleClosePanel(closeButton);
                } else if (splitButton) {
                    this.handleSplitPanel(splitButton);
                }
            });

            // Drag and drop listeners
            this.container.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.container.addEventListener('drop', (e) => this.handleDrop(e));
            
            // Layout on window resize
            window.addEventListener('resize', () => this.layout());
            
            // Keyboard shortcut to cycle animation types (Ctrl/Cmd + A)
            window.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                    e.preventDefault();
                    this.cycleAnimationType();
                }
            });
        },

        /**
         * Add drag event listeners to a panel element
         */
        addPanelEventListeners(panelElement) {
            panelElement.draggable = true;
            panelElement.addEventListener('dragstart', (e) => this.handleDragStart(e));
            panelElement.addEventListener('dragend', () => this.handleDragEnd());
        },

        // ===== UTILITY FUNCTIONS =====
        /**
         * Find BSP node by its DOM element
         */
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

        /**
         * Toggle CSS transitions on all panels (for performance during operations)
         */
        toggleTransitions(enabled) {
            const method = enabled ? 'remove' : 'add';
            this.container.querySelectorAll('.panel-grid-item').forEach(p => 
                p.classList[method]('no-transition')
            );
        },

        /**
         * Set the panel animation type directly
         * @param {string} animationType - One of: 'GROW', 'SLIDE', 'FADE'
         * @returns {boolean} True if successfully set, false if invalid type
         */
        setAnimationType(animationType) {
            if (!CONFIG.PANEL_ANIMATIONS[animationType]) {
                console.warn(`Invalid animation type: ${animationType}. Valid types:`, 
                    Object.keys(CONFIG.PANEL_ANIMATIONS));
                return false;
            }
            
            this.currentAnimationType = animationType;
            const animation = CONFIG.PANEL_ANIMATIONS[animationType];
            console.log(`Panel animation set to: ${animation.description}`);
            return true;
        },

        /**
         * Cycle to the next panel animation type
         */
        cycleAnimationType() {
            const animationKeys = Object.keys(CONFIG.PANEL_ANIMATIONS);
            const currentIndex = animationKeys.indexOf(this.currentAnimationType);
            const nextIndex = (currentIndex + 1) % animationKeys.length;
            this.currentAnimationType = animationKeys[nextIndex];
            
            const animation = CONFIG.PANEL_ANIMATIONS[this.currentAnimationType];
            console.log(`Panel animation cycled to: ${animation.description}`);
            return animation;
        },

        /**
         * Get the current animation configuration
         */
        getCurrentAnimation() {
            return CONFIG.PANEL_ANIMATIONS[this.currentAnimationType];
        },

        /**
         * Get all available animation types and their descriptions
         */
        getAvailableAnimations() {
            return Object.entries(CONFIG.PANEL_ANIMATIONS).map(([key, config]) => ({
                type: key,
                description: config.description
            }));
        },

        // ===== DRAG AND DROP FUNCTIONALITY =====
        /**
         * Handle the start of a panel drag operation
         */
        handleDragStart(e) {
            this.dropHandled = false;
            e.stopPropagation();
            
            this.draggedNode = this.findNodeByElement(e.target);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', this.draggedNode.id);

            // Store mouse offset for ghost positioning
            const rect = e.target.getBoundingClientRect();
            this.dragGhostOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };

            this.toggleTransitions(false);
            this.createDragGhost(e.target);

            // Hide default drag image
            const img = new Image();
            img.src = CONFIG.TRANSPARENT_IMAGE;
            e.dataTransfer.setDragImage(img, 0, 0);

            // Hide original element after drag starts
            setTimeout(() => {
                if (this.draggedNode) {
                    this.draggedNode.element.style.visibility = 'hidden';
                }
            }, 0);
        },

        /**
         * Handle the end of a panel drag operation
         */
        handleDragEnd() {
            if (!this.dropHandled) {
                // Restore visibility if drop wasn't handled
                if (this.draggedNode) {
                    this.draggedNode.element.style.visibility = 'visible';
                    this.draggedNode = null;
                }
                this.removeDragGhost();
                this.clearDropPreview();
                this.toggleTransitions(true);
            }
            
            // Always hide drop indicator
            this.dropIndicator.style.display = 'none';
        },

        /**
         * Create visual ghost element for dragging
         */
        createDragGhost(sourceElement) {
            if (this.dragGhostElement) {
                this.dragGhostElement.remove();
            }
            
            this.dragGhostElement = sourceElement.cloneNode(true);
            this.dragGhostElement.classList.add('drag-ghost');
            
            // Style the ghost element
            Object.assign(this.dragGhostElement.style, {
                position: 'absolute',
                pointerEvents: 'none',
                zIndex: '9999',
                opacity: '1',
                boxShadow: CONFIG.DRAG_GHOST_SHADOW
            });
            
            const rect = sourceElement.getBoundingClientRect();
            this.dragGhostElement.style.width = `${rect.width}px`;
            this.dragGhostElement.style.height = `${rect.height}px`;

            document.body.appendChild(this.dragGhostElement);
            document.addEventListener('dragover', this.updateDragGhostPosition);
        },

        /**
         * Update ghost element position during drag
         */
        updateDragGhostPosition(e) {
            if (!this.dragGhostElement) return;
            
            const x = e.clientX - this.dragGhostOffset.x;
            const y = e.clientY - this.dragGhostOffset.y;
            this.dragGhostElement.style.left = `${x}px`;
            this.dragGhostElement.style.top = `${y}px`;
        },

        /**
         * Remove drag ghost element and cleanup
         */
        removeDragGhost() {
            if (this.dragGhostElement) {
                this.dragGhostElement.remove();
                this.dragGhostElement = null;
            }
            document.removeEventListener('dragover', this.updateDragGhostPosition);
        },

        /**
         * Handle drag over events to show drop previews
         */
        handleDragOver(e) {
            e.preventDefault();
            
            let targetElement = this.findTargetElement(e);
            let zone = '';

            if (targetElement) {
                zone = this.calculateDropZone(e, targetElement);
            }

            // Only update if target or zone changed
            if (targetElement === this.lastPreviewTarget && zone === this.lastPreviewZone) {
                return;
            }

            this.clearDropPreview();

            if (targetElement && zone) {
                this.createDropPreview(targetElement, zone);
            }
        },

        /**
         * Find the target element under the mouse cursor
         */
        findTargetElement(e) {
            // Check if still over last previewed panel (prevents flickering)
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
                    return this.lastPreviewTarget;
                }
            }
            
            // Find new target panel
            const allPanels = this.container.querySelectorAll('.panel-grid-item');
            for (const panel of allPanels) {
                if (panel === this.lastPreviewTarget || 
                    (this.draggedNode && panel === this.draggedNode.element)) {
                    continue;
                }
                
                const rect = panel.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    return panel;
                }
            }
            
            return null;
        },

        /**
         * Calculate which drop zone the mouse is in (top, bottom, left, right)
         */
        calculateDropZone(e, targetElement) {
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
            
            // Calculate distances to each edge and return closest
            const distances = {
                top: y,
                bottom: rect.height - y,
                left: x,
                right: rect.width - x
            };
            
            const closestEdge = Object.keys(distances).reduce((a, b) => 
                distances[a] < distances[b] ? a : b
            );
            
            return closestEdge;
        },

        /**
         * Create animated preview of drop result
         */
        createDropPreview(targetElement, zone) {
            if (this.previewAnimation) this.previewAnimation.cancel();
            if (this.indicatorAnimation) this.indicatorAnimation.cancel();

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
            
            this.lastPreviewTargetOriginalRect = original;

            const targetNewRect = { ...original };
            const indicatorRect = { ...original };
            const indicatorInitialRect = { ...original };

            // Calculate new positions based on drop zone
            switch (zone) {
                case 'top':
                    targetNewRect.height /= 2;
                    targetNewRect.top += targetNewRect.height;
                    indicatorRect.height /= 2;
                    indicatorInitialRect.height = 0;
                    break;
                case 'bottom':
                    targetNewRect.height /= 2;
                    indicatorRect.top += indicatorRect.height / 2;
                    indicatorRect.height /= 2;
                    indicatorInitialRect.top = original.top + original.height;
                    indicatorInitialRect.height = 0;
                    break;
                case 'left':
                    targetNewRect.width /= 2;
                    targetNewRect.left += targetNewRect.width;
                    indicatorRect.width /= 2;
                    indicatorInitialRect.width = 0;
                    break;
                case 'right':
                    targetNewRect.width /= 2;
                    indicatorRect.left += indicatorRect.width / 2;
                    indicatorRect.width /= 2;
                    indicatorInitialRect.left = original.left + original.width;
                    indicatorInitialRect.width = 0;
                    break;
            }

            // Animate target panel resize
            this.previewAnimation = targetElement.animate([
                {
                    left: `${original.left}px`, 
                    top: `${original.top}px`,
                    width: `${original.width}px`, 
                    height: `${original.height}px`
                },
                {
                    left: `${targetNewRect.left}px`, 
                    top: `${targetNewRect.top}px`,
                    width: `${targetNewRect.width}px`, 
                    height: `${targetNewRect.height}px`
                }
            ], {
                duration: CONFIG.ANIMATION_DURATION.DROP_PREVIEW,
                easing: CONFIG.EASING,
                fill: 'forwards'
            });

            // Animate the drop indicator to fill the gap
            const indicator = this.dropIndicator;
            indicator.style.display = 'block';
            this.indicatorAnimation = indicator.animate([
                {
                    left: `${indicatorInitialRect.left}px`,
                    top: `${indicatorInitialRect.top}px`,
                    width: `${indicatorInitialRect.width}px`,
                    height: `${indicatorInitialRect.height}px`
                },
                {
                    left: `${indicatorRect.left}px`,
                    top: `${indicatorRect.top}px`,
                    width: `${indicatorRect.width}px`,
                    height: `${indicatorRect.height}px`
                }
            ], {
                duration: CONFIG.ANIMATION_DURATION.DROP_PREVIEW,
                easing: CONFIG.EASING,
                fill: 'forwards'
            });
        },

        /**
         * Clear drop preview and restore original panel size
         */
        clearDropPreview() {
            if (this.previewAnimation) {
                this.previewAnimation.cancel();
                this.previewAnimation = null;
            }
            if (this.indicatorAnimation) {
                this.indicatorAnimation.cancel();
                this.indicatorAnimation = null;
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
                    duration: CONFIG.ANIMATION_DURATION.DROP_PREVIEW,
                    easing: CONFIG.EASING,
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

        /**
         * Handle successful drop operation
         */
        handleDrop(e) {
            e.preventDefault();
            this.dropHandled = true;

            if (this.previewAnimation) {
                this.previewAnimation.cancel();
                this.previewAnimation = null;
            }
            if (this.indicatorAnimation) {
                this.indicatorAnimation.cancel();
                this.indicatorAnimation = null;
            }

            const targetId = this.lastPreviewTarget ? this.lastPreviewTarget.dataset.panelId : null;
            const zone = this.lastPreviewZone;

            this.lastPreviewTarget = null;
            this.lastPreviewZone = null;

            // Validate drop conditions
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

            this.performDrop(targetNode, zone);
        },

        /**
         * Execute the drop operation by restructuring the BSP tree
         */
        performDrop(targetNode, zone) {
            // A more robust way to handle the drop:
            // 1. Remove the dragged node. This simplifies the tree and returns it to a valid state.
            //    The sibling of the dragged node is promoted to take its place.
            this.removeNodeFromTree(this.draggedNode);

            // 2. Create the new split node that will contain the target and the dragged node.
            const targetParent = targetNode.parent;
            const newSplitNode = new BSPNode({ parent: targetParent });

            // 3. Configure the split direction and the order of children based on the drop zone.
            if (zone === 'left' || zone === 'right') {
                newSplitNode.direction = 'vertical';
                newSplitNode.children = zone === 'left' ? 
                    [this.draggedNode, targetNode] : [targetNode, this.draggedNode];
            } else {
                newSplitNode.direction = 'horizontal';
                newSplitNode.children = zone === 'top' ? 
                    [this.draggedNode, targetNode] : [targetNode, this.draggedNode];
            }

            // 4. Update the parent pointers for the nodes being nested.
            this.draggedNode.parent = newSplitNode;
            targetNode.parent = newSplitNode;

            // 5. Insert the new split node into the tree, replacing the original target node.
            if (targetParent) {
                const targetIndex = targetParent.children.indexOf(targetNode);
                targetParent.children.splice(targetIndex, 1, newSplitNode);
            } else {
                // If the target had no parent, it was the root. The new split is now the root.
                this.root = newSplitNode;
            }

            // 6. Relayout the entire grid and animate the completion.
            this.layout();
            this.animateDropCompletion();
        },

        /**
         * Remove a node from the BSP tree and restructure
         */
        removeNodeFromTree(nodeToRemove) {
            const oldParent = nodeToRemove.parent;
            if (!oldParent) return; // Cannot remove the root node this way

            const sibling = oldParent.children.find(c => c !== nodeToRemove);
            if (!sibling) {
                // This case should not happen in a valid tree, but as a safeguard:
                // If there's no sibling, we can't promote anything.
                // The parent itself should be removed if it's not the root.
                const grandParent = oldParent.parent;
                if (grandParent) {
                    const oldParentIndex = grandParent.children.indexOf(oldParent);
                    if (oldParentIndex !== -1) {
                        grandParent.children.splice(oldParentIndex, 1);
                    }
                }
                return;
            }
            
            const grandParent = oldParent.parent;

            if (grandParent) {
                const oldParentIndex = grandParent.children.indexOf(oldParent);
                grandParent.children.splice(oldParentIndex, 1, sibling);
                sibling.parent = grandParent;
            } else {
                this.root = sibling;
                sibling.parent = null;
            }
        },

        /**
         * Animate the completion of a drop operation
         */
        animateDropCompletion() {
            const ghost = this.dragGhostElement;
            if (!ghost) return;

            // Use the calculated rect from layout to avoid DOM race conditions.
            const finalRect = this.draggedNode.rect;
            if (!finalRect) { // Failsafe if layout didn't run
                if (this.draggedNode) this.draggedNode.element.style.visibility = 'visible';
                this.removeDragGhost();
                return;
            }
            
            const containerRect = this.container.getBoundingClientRect();

            const animation = ghost.animate([
                {
                    top: ghost.style.top,
                    left: ghost.style.left,
                    width: ghost.style.width,
                    height: ghost.style.height,
                },
                {
                    top: `${finalRect.y + containerRect.top}px`,
                    left: `${finalRect.x + containerRect.left}px`,
                    width: `${finalRect.width}px`,
                    height: `${finalRect.height}px`,
                }
            ], {
                duration: CONFIG.ANIMATION_DURATION.DRAG_GHOST,
                easing: CONFIG.EASING,
            });

            animation.onfinish = () => {
                if (this.draggedNode) {
                    this.draggedNode.element.style.visibility = 'visible';
                    this.draggedNode.element.classList.remove('no-transition');
                    this.draggedNode = null;
                }
                this.removeDragGhost();
                this.toggleTransitions(true);
            };
        },

        // ===== PANEL MANAGEMENT =====
        /**
         * Handle panel close button click
         */
        handleClosePanel(button) {
            const panelElement = button.closest('.panel-grid-item');
            if (!panelElement) return;

            const nodeToClose = this.findNodeByElement(panelElement);
            if (!nodeToClose) return;

            // Prevent closing the last panel
            if (this.root === nodeToClose) {
                console.warn("Cannot close the last panel.");
                return;
            }

            this.removeNodeFromTree(nodeToClose);
            panelElement.remove();
            this.layout();
        },

        /**
         * Handle panel split button click
         */
        handleSplitPanel(button) {
            const direction = button.dataset.splitDirection;
            const panelElement = button.closest('.panel-grid-item');
            if (!panelElement || !direction) return;

            const nodeToSplit = this.findNodeByElement(panelElement);
            if (!nodeToSplit) return;
            
            const rect = this.getNodeRect(nodeToSplit);

            // Prevent splitting if the resulting panels would be too small
            if (direction === 'vertical' && rect.width < (CONFIG.PANEL_MIN_WIDTH * 2) + CONFIG.RESIZER_THICKNESS) {
                // TODO: Add visual feedback to user that panel is too small to split
                console.warn('Panel too narrow to split vertically.');
                return;
            } else if (direction === 'horizontal' && rect.height < (CONFIG.PANEL_MIN_HEIGHT * 2) + CONFIG.RESIZER_THICKNESS) {
                // TODO: Add visual feedback to user that panel is too small to split
                console.warn('Panel too short to split horizontally.');
                return;
            }
            
            // Create new panel and node
            const newElement = this.createNewPanelElement();
            const newNode = new BSPNode({ element: newElement });
            this.addPanelEventListeners(newElement);

            // Create split structure
            const targetParent = nodeToSplit.parent;
            const newSplitNode = new BSPNode({
                parent: targetParent,
                direction: direction,
                children: [nodeToSplit, newNode]
            });

            // Update relationships
            nodeToSplit.parent = newSplitNode;
            newNode.parent = newSplitNode;

            // Insert into tree
            if (targetParent) {
                const targetIndex = targetParent.children.indexOf(nodeToSplit);
                targetParent.children.splice(targetIndex, 1, newSplitNode);
            } else {
                this.root = newSplitNode;
            }

            this.layout();
        },

        /**
         * Create a new panel element with animation
         */
        createNewPanelElement() {
            const panelId = this.nextPanelId++;
            const element = document.createElement('div');
            const currentAnimation = this.getCurrentAnimation();
            element.className = `panel-grid-item ${currentAnimation.class}`;
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

            // Remove animation class after animation completes
            element.addEventListener('animationend', (e) => {
                // Check if this is one of our panel animations
                const animationTypes = Object.values(CONFIG.PANEL_ANIMATIONS);
                const matchingAnimation = animationTypes.find(anim => 
                    e.animationName === anim.keyframeName
                );
                
                if (matchingAnimation) {
                    element.classList.remove(matchingAnimation.class);
                }
            });

            this.container.appendChild(element);
            return element;
        },

        /**
         * Update the state of panel controls (e.g., disable split buttons)
         */
        updatePanelControls(node) {
            if (!node.isLeaf()) return;

            const panelElement = node.element;
            const rect = this.getNodeRect(node);

            const verticalSplitBtn = panelElement.querySelector('[data-split-direction="vertical"]');
            const horizontalSplitBtn = panelElement.querySelector('[data-split-direction="horizontal"]');

            if (verticalSplitBtn) {
                const canSplitVertically = rect.width >= (CONFIG.PANEL_MIN_WIDTH * 2) + CONFIG.RESIZER_THICKNESS;
                verticalSplitBtn.classList.toggle('disabled', !canSplitVertically);
            }

            if (horizontalSplitBtn) {
                const canSplitHorizontally = rect.height >= (CONFIG.PANEL_MIN_HEIGHT * 2) + CONFIG.RESIZER_THICKNESS;
                horizontalSplitBtn.classList.toggle('disabled', !canSplitHorizontally);
            }
        },
    };

    // ===== INITIALIZATION =====
    /**
     * Initialize the panel grid system when DOM is ready
     */
    document.addEventListener('DOMContentLoaded', () => panelGrid.init());

    // ===== GLOBAL API =====
    /**
     * Expose panel grid functionality globally for easy access
     */
    window.PanelGrid = {
        /**
         * Set the animation type for new panels
         * @param {string} type - 'GROW', 'SLIDE', or 'FADE'
         */
        setAnimation(type) {
            return panelGrid.setAnimationType(type);
        },

        /**
         * Cycle to the next animation type
         */
        cycleAnimation() {
            return panelGrid.cycleAnimationType();
        },

        /**
         * Get the current animation type
         */
        getCurrentAnimation() {
            return panelGrid.getCurrentAnimation();
        },

        /**
         * Get all available animation types
         */
        getAvailableAnimations() {
            return panelGrid.getAvailableAnimations();
        }
    };
})();
