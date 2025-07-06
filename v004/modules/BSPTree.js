/**
 * Binary Space Partitioning Tree Module
 * Handles flexible panel splitting and layout management
 */

export class BSPNode {
    constructor(options = {}) {
        this.id = options.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.parent = options.parent || null;
        this.children = options.children || [];
        this.direction = options.direction || null; // 'horizontal' or 'vertical'
        this.split = options.split || 0.5; // Split ratio (0.0 to 1.0)
        this.element = options.element || null; // DOM element for leaf nodes
        this.type = options.type || 'panel'; // Panel type for leaf nodes
        this.metadata = options.metadata || {}; // Additional data
    }

    isLeaf() {
        return this.children.length === 0;
    }

    isRoot() {
        return this.parent === null;
    }

    getSibling() {
        if (!this.parent) return null;
        return this.parent.children.find(child => child !== this);
    }

    getDepth() {
        let depth = 0;
        let node = this;
        while (node.parent) {
            depth++;
            node = node.parent;
        }
        return depth;
    }

    getAllLeaves() {
        if (this.isLeaf()) return [this];
        return this.children.flatMap(child => child.getAllLeaves());
    }
}

export class BSPTree {
    constructor(container, options = {}) {
        this.container = container;
        this.root = null;
        this.nodes = new Map(); // Map of node IDs to nodes
        this.activeNode = null;
        
        // Configuration
        this.config = {
            minPanelWidth: options.minPanelWidth || 100,
            minPanelHeight: options.minPanelHeight || 100,
            resizerSize: options.resizerSize || 4,
            animationDuration: options.animationDuration || 200,
            ...options
        };

        // Event handlers
        this.eventHandlers = {
            onPanelCreate: options.onPanelCreate || (() => {}),
            onPanelRemove: options.onPanelRemove || (() => {}),
            onPanelResize: options.onPanelResize || (() => {}),
            onPanelActivate: options.onPanelActivate || (() => {}),
            onLayoutChange: options.onLayoutChange || (() => {})
        };

        // Bind methods
        this.handleResizerMouseDown = this.handleResizerMouseDown.bind(this);
    }

    /**
     * Initialize the tree with a single root panel
     */
    initialize(panelType = 'default', metadata = {}) {
        const element = this.createPanelElement(panelType, metadata);
        this.root = new BSPNode({
            element,
            type: panelType,
            metadata
        });
        this.nodes.set(this.root.id, this.root);
        this.container.appendChild(element);
        this.activeNode = this.root;
        this.layout();
        this.eventHandlers.onPanelCreate(this.root);
        return this.root;
    }

    /**
     * Split a node in the specified direction
     */
    splitNode(node, direction, ratio = 0.5, newPanelType = 'default', metadata = {}) {
        if (!node || !node.isLeaf()) return null;

        // Check minimum size constraints
        const rect = this.getNodeRect(node);
        if (direction === 'vertical' && rect.width < this.config.minPanelWidth * 2) {
            console.warn('Panel too narrow to split vertically');
            return null;
        }
        if (direction === 'horizontal' && rect.height < this.config.minPanelHeight * 2) {
            console.warn('Panel too short to split horizontally');
            return null;
        }

        // Create new panel element
        const newElement = this.createPanelElement(newPanelType, metadata);
        
        // Create new node for the new panel
        const newNode = new BSPNode({
            element: newElement,
            type: newPanelType,
            metadata
        });

        // Create split node to replace the current node
        const splitNode = new BSPNode({
            direction,
            split: ratio,
            parent: node.parent,
            children: [node, newNode]
        });

        // Update parent relationships
        node.parent = splitNode;
        newNode.parent = splitNode;

        // Update tree structure
        if (node === this.root) {
            this.root = splitNode;
        } else {
            const parentIndex = node.parent.children.indexOf(node);
            node.parent.children[parentIndex] = splitNode;
        }

        // Update node map
        this.nodes.set(splitNode.id, splitNode);
        this.nodes.set(newNode.id, newNode);

        // Add new element to container
        this.container.appendChild(newElement);

        // Relayout and notify
        this.layout();
        this.eventHandlers.onPanelCreate(newNode);
        this.eventHandlers.onLayoutChange();

        return newNode;
    }

    /**
     * Remove a node from the tree
     */
    removeNode(node) {
        if (!node || node === this.root) {
            console.warn('Cannot remove root node');
            return false;
        }

        const parent = node.parent;
        const sibling = node.getSibling();

        if (!parent || !sibling) return false;

        // Remove the node's element
        if (node.element) {
            node.element.remove();
        }

        // Remove any descendant elements
        if (!node.isLeaf()) {
            const leaves = node.getAllLeaves();
            leaves.forEach(leaf => {
                if (leaf.element) leaf.element.remove();
                this.nodes.delete(leaf.id);
            });
        }

        // Update tree structure
        if (parent.parent) {
            // Replace parent with sibling in grandparent
            const grandParent = parent.parent;
            const parentIndex = grandParent.children.indexOf(parent);
            grandParent.children[parentIndex] = sibling;
            sibling.parent = grandParent;
        } else {
            // Parent is root, make sibling the new root
            this.root = sibling;
            sibling.parent = null;
        }

        // Clean up nodes
        this.nodes.delete(node.id);
        this.nodes.delete(parent.id);

        // If active node was removed, activate sibling
        if (this.activeNode === node) {
            this.setActiveNode(sibling.isLeaf() ? sibling : sibling.getAllLeaves()[0]);
        }

        // Relayout and notify
        this.layout();
        this.eventHandlers.onPanelRemove(node);
        this.eventHandlers.onLayoutChange();

        return true;
    }

    /**
     * Set the active panel node
     */
    setActiveNode(node) {
        if (this.activeNode) {
            this.activeNode.element?.classList.remove('active');
        }
        this.activeNode = node;
        if (node && node.element) {
            node.element.classList.add('active');
            this.eventHandlers.onPanelActivate(node);
        }
    }

    /**
     * Perform layout of all panels
     */
    layout() {
        if (!this.root) return;

        const containerRect = this.container.getBoundingClientRect();
        const rect = {
            x: 0,
            y: 0,
            width: containerRect.width,
            height: containerRect.height
        };

        // Remove existing resizers
        this.container.querySelectorAll('.panel-resizer').forEach(r => r.remove());

        // Recursive layout
        this.layoutNode(this.root, rect);
    }

    /**
     * Recursively layout a node and its children
     */
    layoutNode(node, rect) {
        node.rect = rect; // Store for later use

        if (node.isLeaf()) {
            // Position leaf panel
            if (node.element) {
                Object.assign(node.element.style, {
                    left: `${rect.x}px`,
                    top: `${rect.y}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`
                });
            }
            return;
        }

        // Calculate child rectangles
        const [child1, child2] = node.children;
        let rect1, rect2;

        if (node.direction === 'horizontal') {
            // Split horizontally (top/bottom)
            const splitY = rect.height * node.split;
            rect1 = { ...rect, height: splitY - this.config.resizerSize / 2 };
            rect2 = {
                ...rect,
                y: rect.y + splitY + this.config.resizerSize / 2,
                height: rect.height - splitY - this.config.resizerSize / 2
            };

            // Create horizontal resizer
            this.createResizer(node, {
                x: rect.x,
                y: rect.y + splitY - this.config.resizerSize / 2,
                width: rect.width,
                height: this.config.resizerSize
            }, 'horizontal');
        } else {
            // Split vertically (left/right)
            const splitX = rect.width * node.split;
            rect1 = { ...rect, width: splitX - this.config.resizerSize / 2 };
            rect2 = {
                ...rect,
                x: rect.x + splitX + this.config.resizerSize / 2,
                width: rect.width - splitX - this.config.resizerSize / 2
            };

            // Create vertical resizer
            this.createResizer(node, {
                x: rect.x + splitX - this.config.resizerSize / 2,
                y: rect.y,
                width: this.config.resizerSize,
                height: rect.height
            }, 'vertical');
        }

        // Recursively layout children
        this.layoutNode(child1, rect1);
        this.layoutNode(child2, rect2);
    }

    /**
     * Create a resizer element
     */
    createResizer(node, rect, direction) {
        const resizer = document.createElement('div');
        resizer.className = `panel-resizer ${direction}`;
        Object.assign(resizer.style, {
            position: 'absolute',
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
        });
        resizer.dataset.nodeId = node.id;
        resizer.addEventListener('mousedown', this.handleResizerMouseDown);
        this.container.appendChild(resizer);
    }

    /**
     * Handle resizer drag start
     */
    handleResizerMouseDown(e) {
        e.preventDefault();
        const resizer = e.currentTarget;
        const nodeId = resizer.dataset.nodeId;
        const node = this.nodes.get(nodeId);
        if (!node) return;

        resizer.classList.add('resizing');
        const startPos = node.direction === 'horizontal' ? e.clientY : e.clientX;
        const startSplit = node.split;
        const parentSize = node.direction === 'horizontal' ? node.rect.height : node.rect.width;

        const handleMouseMove = (e) => {
            const currentPos = node.direction === 'horizontal' ? e.clientY : e.clientX;
            const delta = currentPos - startPos;
            const newSplit = startSplit + (delta / parentSize);
            
            // Apply constraints
            node.split = Math.max(0.1, Math.min(0.9, newSplit));
            this.layout();
            this.eventHandlers.onPanelResize(node);
        };

        const handleMouseUp = () => {
            resizer.classList.remove('resizing');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            this.eventHandlers.onLayoutChange();
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    /**
     * Get the bounding rectangle of a node
     */
    getNodeRect(node) {
        if (node.rect) return node.rect;
        if (node.element) {
            const rect = node.element.getBoundingClientRect();
            const containerRect = this.container.getBoundingClientRect();
            return {
                x: rect.left - containerRect.left,
                y: rect.top - containerRect.top,
                width: rect.width,
                height: rect.height
            };
        }
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    /**
     * Create a panel element
     */
    createPanelElement(type, metadata) {
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.dataset.panelType = type;
        panel.dataset.panelId = `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Basic panel structure
        panel.innerHTML = `
            <div class="panel-header">
                <div class="panel-tabs"></div>
                <div class="panel-actions">
                    <button class="icon-btn panel-split-v" title="Split Vertical">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <line x1="12" y1="3" x2="12" y2="21"/>
                        </svg>
                    </button>
                    <button class="icon-btn panel-split-h" title="Split Horizontal">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <line x1="3" y1="12" x2="21" y2="12"/>
                        </svg>
                    </button>
                    <button class="icon-btn panel-close" title="Close Panel">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="panel-content"></div>
        `;

        return panel;
    }

    /**
     * Serialize the tree structure
     */
    serialize() {
        if (!this.root) return null;
        
        const serializeNode = (node) => {
            const data = {
                id: node.id,
                direction: node.direction,
                split: node.split,
                type: node.type,
                metadata: node.metadata
            };

            if (node.isLeaf()) {
                data.isLeaf = true;
            } else {
                data.children = node.children.map(serializeNode);
            }

            return data;
        };

        return serializeNode(this.root);
    }

    /**
     * Deserialize and rebuild the tree
     */
    deserialize(data) {
        if (!data) return;

        // Clear existing panels
        this.container.innerHTML = '';
        this.nodes.clear();

        const buildNode = (nodeData, parent = null) => {
            const node = new BSPNode({
                id: nodeData.id,
                parent,
                direction: nodeData.direction,
                split: nodeData.split,
                type: nodeData.type,
                metadata: nodeData.metadata
            });

            if (nodeData.isLeaf) {
                node.element = this.createPanelElement(node.type, node.metadata);
                this.container.appendChild(node.element);
            } else if (nodeData.children) {
                node.children = nodeData.children.map(childData => buildNode(childData, node));
            }

            this.nodes.set(node.id, node);
            return node;
        };

        this.root = buildNode(data);
        this.layout();
        
        // Set first leaf as active
        const firstLeaf = this.root.getAllLeaves()[0];
        if (firstLeaf) this.setActiveNode(firstLeaf);
    }
}