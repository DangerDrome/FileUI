/**
 * FileUI Panels v4 - Integrated
 * Combines v003's excellent BSP panel system with v004's VS Code-like UI
 */

(function() {
    'use strict';

    // ===== CONFIGURATION =====
    const CONFIG = {
        PANEL_MIN_WIDTH: 200,
        PANEL_MIN_HEIGHT: 100,
        COLLAPSED_SIZE: 30,
        RESIZER_THICKNESS: 6,
        DRAG_PREVIEW_OPACITY: 0.5,
        DRAG_THRESHOLD: 10,
        SNAP_THRESHOLD: 15,
        PANEL_ANIMATION_CLASS: 'panel-grow-in',
        HISTORY_LIMIT: 50
    };

    // ===== DEFAULT LAYOUT =====
    const DEFAULT_LAYOUT = {
        "version": "4.0",
        "timestamp": new Date().toISOString(),
        "tree": {
            "id": "root",
            "direction": "horizontal",
            "split": 0.2,
            "isPinned": false,
            "isCollapsed": false,
            "children": [
                {
                    "id": "sidebar",
                    "direction": null,
                    "split": 0.5,
                    "isPinned": true,
                    "isCollapsed": false,
                    "isVSCodePanel": true,
                    "panelType": "sidebar",
                    "children": [],
                    "leaf": true
                },
                {
                    "id": "main-area",
                    "direction": "vertical",
                    "split": 0.75,
                    "isPinned": false,
                    "isCollapsed": false,
                    "children": [
                        {
                            "id": "editor-area",
                            "direction": "horizontal",
                            "split": 0.5,
                            "isPinned": false,
                            "isCollapsed": false,
                            "children": [
                                {
                                    "id": "editor-1",
                                    "direction": null,
                                    "split": 0.5,
                                    "isPinned": false,
                                    "isCollapsed": false,
                                    "panelType": "editor",
                                    "children": [],
                                    "leaf": true
                                },
                                {
                                    "id": "editor-2",
                                    "direction": null,
                                    "split": 0.5,
                                    "isPinned": false,
                                    "isCollapsed": false,
                                    "panelType": "editor",
                                    "children": [],
                                    "leaf": true
                                }
                            ]
                        },
                        {
                            "id": "terminal",
                            "direction": null,
                            "split": 0.5,
                            "isPinned": true,
                            "isCollapsed": false,
                            "isVSCodePanel": true,
                            "panelType": "terminal",
                            "children": [],
                            "leaf": true
                        }
                    ]
                }
            ]
        }
    };

    // ===== HISTORY MANAGER =====
    class HistoryManager {
        constructor(limit = 50) {
            this.states = [];
            this.currentIndex = -1;
            this.limit = limit;
            this.listeners = new Map();
        }

        add(state) {
            this.states = this.states.slice(0, this.currentIndex + 1);
            this.states.push(JSON.parse(JSON.stringify(state)));
            if (this.states.length > this.limit) {
                this.states.shift();
            } else {
                this.currentIndex++;
            }
            this.notifyListeners();
        }

        undo() {
            if (this.canUndo()) {
                this.currentIndex--;
                this.notifyListeners();
                return this.getCurrentState();
            }
            return null;
        }

        redo() {
            if (this.canRedo()) {
                this.currentIndex++;
                this.notifyListeners();
                return this.getCurrentState();
            }
            return null;
        }

        getCurrentState() {
            return this.currentIndex >= 0 ? this.states[this.currentIndex] : null;
        }

        canUndo() {
            return this.currentIndex > 0;
        }

        canRedo() {
            return this.currentIndex < this.states.length - 1;
        }

        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(callback);
        }

        notifyListeners() {
            const changeListeners = this.listeners.get('change') || [];
            changeListeners.forEach(callback => 
                callback({ canUndo: this.canUndo(), canRedo: this.canRedo() })
            );
        }

        clear() {
            this.states = [];
            this.currentIndex = -1;
            this.notifyListeners();
        }
    }

    // ===== BSP NODE =====
    class BSPNode {
        constructor(options = {}) {
            this.id = options.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.parent = options.parent || null;
            this.children = options.children || [];
            this.direction = options.direction || null;
            this.split = options.split || 0.5;
            this.element = options.element || null;
            this.rect = options.rect || null;
            this.isPinned = options.isPinned || false;
            this.isCollapsed = options.isCollapsed || false;
            this.isMainContent = options.isMainContent || false;
            this.isToolbar = options.isToolbar || false;
            this.isVSCodePanel = options.isVSCodePanel || false;
            this.panelType = options.panelType || 'panel';
            this.metadata = options.metadata || {};
        }

        isLeaf() {
            return this.children.length === 0;
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

        toJSON() {
            const json = {
                id: this.id,
                direction: this.direction,
                split: this.split,
                isPinned: this.isPinned,
                isCollapsed: this.isCollapsed,
                isMainContent: this.isMainContent,
                isToolbar: this.isToolbar,
                isVSCodePanel: this.isVSCodePanel,
                panelType: this.panelType,
                metadata: this.metadata
            };
            if (this.isLeaf()) {
                json.leaf = true;
                json.children = [];
            } else {
                json.children = this.children.map(child => child.toJSON());
            }
            return json;
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

    // ===== PANEL MANAGER =====
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
            this.markdownConverter = window.showdown ? new showdown.Converter() : null;
            this.markdownContent = new Map();
            this.alignmentGuides = [];

            // Bind methods
            this.handlePointerDown = this.handlePointerDown.bind(this);
            this.handlePointerMove = this.handlePointerMove.bind(this);
            this.handlePointerUp = this.handlePointerUp.bind(this);
            this.handleDragOver = this.handleDragOver.bind(this);
            this.updatePreviewLayout = this.updatePreviewLayout.bind(this);

            // VS Code integration
            this.activityBar = null;
            this.statusBar = null;
            this.fileSystemManager = null;
        }

        init() {
            this.setupUI();
            this.loadLayout(DEFAULT_LAYOUT);
            this.setupEventListeners();
            this.initializeVSCodeComponents();
        }

        setupUI() {
            // Add VS Code structure if not present
            if (!document.getElementById('activity-bar')) {
                this.createVSCodeStructure();
            }
        }

        createVSCodeStructure() {
            // This is handled by the HTML, but we'll initialize references
            this.activityBar = document.getElementById('activity-bar');
            this.statusBar = document.getElementById('status-bar');
        }

        initializeVSCodeComponents() {
            // Initialize Lucide icons
            if (window.lucide) {
                window.lucide.createIcons();
            }

            // Setup activity bar
            if (this.activityBar) {
                this.activityBar.addEventListener('click', (e) => {
                    const btn = e.target.closest('.activity-btn');
                    if (btn) {
                        this.handleActivityBarClick(btn.dataset.view);
                    }
                });
            }

            // Setup header buttons
            document.getElementById('split-editor-btn')?.addEventListener('click', () => {
                this.splitActiveEditor();
            });

            document.getElementById('toggle-sidebar-btn')?.addEventListener('click', () => {
                this.toggleSidebar();
            });

            document.getElementById('toggle-panel-btn')?.addEventListener('click', () => {
                this.toggleTerminal();
            });
        }

        setupEventListeners() {
            this.container.addEventListener('pointerdown', this.handlePointerDown);
            window.addEventListener('resize', () => this.layout());
            
            // Double-click for markdown editing
            this.container.addEventListener('dblclick', this.handleDoubleClick.bind(this));
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'z' && !e.shiftKey) {
                        e.preventDefault();
                        this.undo();
                    } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                        e.preventDefault();
                        this.redo();
                    } else if (e.key === 'b') {
                        e.preventDefault();
                        this.toggleSidebar();
                    } else if (e.key === '`') {
                        e.preventDefault();
                        this.toggleTerminal();
                    }
                }
            });

            // History change listener
            this.history.on('change', ({ canUndo, canRedo }) => {
                // Update UI buttons if needed
            });
        }

        createPanelElement(panelType = 'panel', metadata = {}) {
            const element = document.createElement('div');
            element.className = `panel ${CONFIG.PANEL_ANIMATION_CLASS}`;
            element.dataset.panelType = panelType;

            // Different content based on panel type
            if (panelType === 'sidebar') {
                element.innerHTML = this.createSidebarContent();
                element.classList.add('vs-sidebar');
            } else if (panelType === 'terminal') {
                element.innerHTML = this.createTerminalContent();
                element.classList.add('vs-terminal');
            } else if (panelType === 'editor') {
                element.innerHTML = this.createEditorContent(metadata);
                element.classList.add('vs-editor');
            } else {
                // Regular BSP panel
                element.innerHTML = `
                    <div class="panel-header">
                        <div class="panel-header-left">
                            <button class="panel-action-btn" data-action="pin" title="Pin Panel">
                                <svg class="icon-pin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="17" x2="12" y2="22"></line>
                                    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"></path>
                                </svg>
                                <svg class="icon-pin-off" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="2" y1="2" x2="22" y2="22"></line>
                                    <line x1="12" y1="17" x2="12" y2="22"></line>
                                    <path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h12"></path>
                                    <path d="M15 9.34V6h1a2 2 0 0 0 0-4H7.89"></path>
                                </svg>
                            </button>
                            <span class="panel-title">Panel ${this.nextPanelNumber}</span>
                        </div>
                        <div class="panel-actions">
                            <button class="panel-action-btn" data-action="collapse" title="Collapse Panel">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                            <button class="panel-action-btn" data-action="split-v" title="Split Vertically">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                                    <line x1="12" y1="3" x2="12" y2="21"/>
                                </svg>
                            </button>
                            <button class="panel-action-btn" data-action="split-h" title="Split Horizontally">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                                    <line x1="3" y1="12" x2="21" y2="12"/>
                                </svg>
                            </button>
                            <button class="panel-action-btn" data-action="close" title="Close Panel">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="panel-content"></div>`;
            }

            element.addEventListener('animationend', () => element.classList.remove(CONFIG.PANEL_ANIMATION_CLASS), { once: true });
            return element;
        }

        createSidebarContent() {
            return `
                <div class="sidebar-view active" data-view="explorer">
                    <div class="sidebar-header">
                        <h3 class="sidebar-title">EXPLORER</h3>
                        <div class="sidebar-actions">
                            <button class="icon-btn" aria-label="New File">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="12" y1="18" x2="12" y2="12"></line>
                                    <line x1="9" y1="15" x2="15" y2="15"></line>
                                </svg>
                            </button>
                            <button class="icon-btn" aria-label="New Folder">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                    <line x1="12" y1="11" x2="12" y2="17"></line>
                                    <line x1="9" y1="14" x2="15" y2="14"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="file-tree" id="file-tree">
                        <div class="file-tree-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <span>src</span>
                        </div>
                        <div class="file-tree-item" style="padding-left: 20px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            <span>index.js</span>
                        </div>
                    </div>
                </div>`;
        }

        createTerminalContent() {
            return `
                <div class="terminal-tabs">
                    <div class="tabs-list">
                        <button class="tab active">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="4 17 10 11 4 5"></polyline>
                                <line x1="12" y1="19" x2="20" y2="19"></line>
                            </svg>
                            <span>Terminal</span>
                        </button>
                    </div>
                </div>
                <div class="terminal-content">
                    <div class="terminal-placeholder">
                        <div style="color: #4ec9b0;">$ FileUI Terminal v4.0</div>
                        <div style="color: #969696;">Type 'help' for available commands</div>
                        <br>
                        <div>$ <span style="opacity: 0.6;">|</span></div>
                    </div>
                </div>`;
        }

        createEditorContent(metadata) {
            const filename = metadata.filename || 'untitled.txt';
            return `
                <div class="editor-header">
                    <div class="editor-tabs">
                        <div class="editor-tab active">
                            <span>${filename}</span>
                            <button class="tab-close">×</button>
                        </div>
                    </div>
                </div>
                <div class="editor-content">
                    <div class="editor-placeholder">
                        <h2>Welcome to FileUI v4</h2>
                        <p>Double-click to edit in markdown</p>
                        <p>Drag panels to rearrange</p>
                        <p>Use Ctrl+B to toggle sidebar</p>
                        <p>Use Ctrl+\` to toggle terminal</p>
                    </div>
                </div>`;
        }

        createPanel(panelType = 'panel', metadata = {}) {
            const element = this.createPanelElement(panelType, metadata);
            const id = `panel-${this.nextPanelNumber++}-${Date.now()}`;
            element.dataset.panelId = id;
            this.container.appendChild(element);
            return { id, element };
        }

        // ... Continue with more methods ...

        loadLayout(layoutData) {
            // Clear existing panels
            this.panels.clear();
            this.container.querySelectorAll('.panel').forEach(p => p.remove());
            this.resizers = [];

            // Create panel elements
            const panelElementsMap = new Map();
            const createPanelsFromTree = (nodeData) => {
                if (nodeData.leaf) {
                    const { id, element } = this.createPanel(nodeData.panelType, nodeData.metadata);
                    // Use the ID from the layout data if it's a special panel
                    const panelId = nodeData.isVSCodePanel ? nodeData.id : id;
                    element.dataset.panelId = panelId;
                    panelElementsMap.set(nodeData.id, element);
                    
                    // Apply collapsed state
                    if (nodeData.isCollapsed) {
                        element.classList.add('is-collapsed');
                    }
                    if (nodeData.isPinned) {
                        element.classList.add('is-pinned');
                    }
                } else {
                    nodeData.children.forEach(createPanelsFromTree);
                }
            };
            createPanelsFromTree(layoutData.tree);

            // Build BSP tree
            this.root = BSPNode.fromJSON(layoutData.tree, null, panelElementsMap);

            // Update panels map
            const updatePanelsMap = (node) => {
                if (node.isLeaf()) {
                    this.panels.set(node.id, { node, element: node.element });
                } else {
                    node.children.forEach(updatePanelsMap);
                }
            };
            updatePanelsMap(this.root);

            // Perform layout
            this.layout();

            // Save initial state
            this.saveState('Initial layout');
        }

        layout() {
            if (!this.root) return;

            const containerRect = this.container.getBoundingClientRect();
            this.layoutNode(this.root, {
                x: 0,
                y: 0,
                width: containerRect.width,
                height: containerRect.height
            });

            // Update Lucide icons after layout
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }

        layoutNode(node, rect) {
            node.rect = rect;

            if (node.isLeaf()) {
                if (node.element) {
                    // Handle collapsed state
                    if (node.isCollapsed) {
                        if (node.parent && node.parent.direction === 'horizontal') {
                            // Vertical collapse
                            rect.width = CONFIG.COLLAPSED_SIZE;
                        } else {
                            // Horizontal collapse
                            rect.height = CONFIG.COLLAPSED_SIZE;
                        }
                    }

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
                const splitX = rect.width * node.split;
                rect1 = { ...rect, width: splitX - CONFIG.RESIZER_THICKNESS / 2 };
                rect2 = {
                    ...rect,
                    x: rect.x + splitX + CONFIG.RESIZER_THICKNESS / 2,
                    width: rect.width - splitX - CONFIG.RESIZER_THICKNESS / 2
                };

                // Create resizer
                this.createResizer(node, {
                    x: rect.x + splitX - CONFIG.RESIZER_THICKNESS / 2,
                    y: rect.y,
                    width: CONFIG.RESIZER_THICKNESS,
                    height: rect.height
                }, 'vertical');
            } else {
                const splitY = rect.height * node.split;
                rect1 = { ...rect, height: splitY - CONFIG.RESIZER_THICKNESS / 2 };
                rect2 = {
                    ...rect,
                    y: rect.y + splitY + CONFIG.RESIZER_THICKNESS / 2,
                    height: rect.height - splitY - CONFIG.RESIZER_THICKNESS / 2
                };

                // Create resizer
                this.createResizer(node, {
                    x: rect.x,
                    y: rect.y + splitY - CONFIG.RESIZER_THICKNESS / 2,
                    width: rect.width,
                    height: CONFIG.RESIZER_THICKNESS
                }, 'horizontal');
            }

            // Layout children
            this.layoutNode(child1, rect1);
            this.layoutNode(child2, rect2);
        }

        createResizer(node, rect, type) {
            // Remove existing resizer for this node
            const existingResizer = this.container.querySelector(`.panel-resizer[data-node-id="${node.id}"]`);
            if (existingResizer) {
                existingResizer.remove();
            }

            const resizer = document.createElement('div');
            resizer.className = `panel-resizer ${type}`;
            resizer.dataset.nodeId = node.id;
            
            Object.assign(resizer.style, {
                position: 'absolute',
                left: `${rect.x}px`,
                top: `${rect.y}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`
            });

            // Disable resizer if either child is pinned
            if (node.children.some(child => child.isPinned)) {
                resizer.classList.add('is-disabled');
            }

            this.container.appendChild(resizer);
            this.resizers.push({ element: resizer, node, type });
        }

        handlePointerDown(e) {
            const resizer = e.target.closest('.panel-resizer');
            if (resizer && !resizer.classList.contains('is-disabled')) {
                this.startResize(e, resizer);
                return;
            }

            const header = e.target.closest('.panel-header');
            if (header) {
                const panel = header.closest('.panel');
                if (panel) {
                    const action = e.target.closest('[data-action]')?.dataset.action;
                    if (action) {
                        this.handlePanelAction(panel.dataset.panelId, action);
                    } else if (!e.target.closest('.panel-actions')) {
                        // Start drag
                        this.startDrag(e, panel);
                    }
                }
            }
        }

        handlePanelAction(panelId, action) {
            const panel = this.panels.get(panelId);
            if (!panel) return;

            switch (action) {
                case 'close':
                    this.removePanel(panelId);
                    break;
                case 'split-v':
                    this.splitPanel(panelId, 'horizontal');
                    break;
                case 'split-h':
                    this.splitPanel(panelId, 'vertical');
                    break;
                case 'collapse':
                    this.toggleCollapse(panelId);
                    break;
                case 'pin':
                    this.togglePin(panelId);
                    break;
            }
        }

        splitPanel(targetId, direction) {
            const target = this.panels.get(targetId);
            if (!target || !target.node.rect) return;

            const targetNode = target.node;

            // Check size constraints
            if (direction === 'horizontal') {
                if (targetNode.rect.width < CONFIG.PANEL_MIN_WIDTH * 2) return;
            } else {
                if (targetNode.rect.height < CONFIG.PANEL_MIN_HEIGHT * 2) return;
            }

            // Create new panel
            const newPanel = this.createPanel('panel');
            const newNode = new BSPNode({ 
                id: newPanel.id, 
                element: newPanel.element 
            });
            
            // Create split node
            const splitNode = new BSPNode({
                parent: targetNode.parent,
                direction,
                children: [targetNode, newNode],
                split: 0.5
            });

            // Update relationships
            targetNode.parent = splitNode;
            newNode.parent = splitNode;

            // Update tree
            if (this.root === targetNode) {
                this.root = splitNode;
            } else {
                const oldParent = splitNode.parent;
                const targetIndex = oldParent.children.indexOf(targetNode);
                oldParent.children[targetIndex] = splitNode;
            }

            // Update panels map
            this.panels.set(newPanel.id, { node: newNode, element: newPanel.element });

            // Relayout and save state
            this.layout();
            this.saveState(`Split ${direction}`);
        }

        removePanel(panelId) {
            const panel = this.panels.get(panelId);
            if (!panel) return;

            const node = panel.node;
            
            // Don't remove if it's the root or a VS Code panel
            if (node === this.root || node.isVSCodePanel) return;

            const parent = node.parent;
            const sibling = node.getSibling();

            if (!parent || !sibling) return;

            // Remove element
            panel.element.remove();
            this.panels.delete(panelId);

            // Update tree
            if (parent.parent) {
                const grandParent = parent.parent;
                const parentIndex = grandParent.children.indexOf(parent);
                grandParent.children[parentIndex] = sibling;
                sibling.parent = grandParent;
            } else {
                this.root = sibling;
                sibling.parent = null;
            }

            // Relayout and save state
            this.layout();
            this.saveState('Remove panel');
        }

        toggleCollapse(panelId) {
            const panel = this.panels.get(panelId);
            if (!panel) return;

            const node = panel.node;
            node.isCollapsed = !node.isCollapsed;
            panel.element.classList.toggle('is-collapsed', node.isCollapsed);

            // Update collapse direction class
            if (node.parent) {
                const collapseClass = node.parent.direction === 'horizontal' 
                    ? 'is-collapsed-vertically' 
                    : 'is-collapsed-horizontally';
                panel.element.classList.toggle(collapseClass, node.isCollapsed);
            }

            this.layout();
            this.saveState('Toggle collapse');
        }

        togglePin(panelId) {
            const panel = this.panels.get(panelId);
            if (!panel) return;

            const node = panel.node;
            node.isPinned = !node.isPinned;
            panel.element.classList.toggle('is-pinned', node.isPinned);

            this.layout();
            this.saveState('Toggle pin');
        }

        toggleSidebar() {
            const sidebarPanel = Array.from(this.panels.values())
                .find(p => p.node.panelType === 'sidebar');
            
            if (sidebarPanel) {
                this.toggleCollapse(sidebarPanel.node.id);
            }
        }

        toggleTerminal() {
            const terminalPanel = Array.from(this.panels.values())
                .find(p => p.node.panelType === 'terminal');
            
            if (terminalPanel) {
                this.toggleCollapse(terminalPanel.node.id);
            }
        }

        splitActiveEditor() {
            // Find active editor panel
            const editorPanel = Array.from(this.panels.values())
                .find(p => p.node.panelType === 'editor' && p.element.classList.contains('active'));
            
            if (editorPanel) {
                this.splitPanel(editorPanel.node.id, 'horizontal');
            } else {
                // Split first editor found
                const firstEditor = Array.from(this.panels.values())
                    .find(p => p.node.panelType === 'editor');
                if (firstEditor) {
                    this.splitPanel(firstEditor.node.id, 'horizontal');
                }
            }
        }

        handleActivityBarClick(view) {
            // Update sidebar content based on view
            const sidebarPanel = Array.from(this.panels.values())
                .find(p => p.node.panelType === 'sidebar');
            
            if (sidebarPanel) {
                // Update sidebar view
                const views = sidebarPanel.element.querySelectorAll('.sidebar-view');
                views.forEach(v => v.classList.remove('active'));
                
                const targetView = sidebarPanel.element.querySelector(`.sidebar-view[data-view="${view}"]`);
                if (targetView) {
                    targetView.classList.add('active');
                }

                // Update activity bar
                document.querySelectorAll('.activity-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.view === view);
                });

                // Make sure sidebar is visible
                if (sidebarPanel.node.isCollapsed) {
                    this.toggleCollapse(sidebarPanel.node.id);
                }
            }
        }

        startResize(e, resizerElement) {
            e.preventDefault();
            
            const resizer = this.resizers.find(r => r.element === resizerElement);
            if (!resizer) return;

            const startPos = resizer.type === 'vertical' ? e.clientX : e.clientY;
            const startSplit = resizer.node.split;
            const parentSize = resizer.type === 'vertical' 
                ? resizer.node.rect.width 
                : resizer.node.rect.height;

            const handleMove = (e) => {
                const currentPos = resizer.type === 'vertical' ? e.clientX : e.clientY;
                const delta = currentPos - startPos;
                const newSplit = startSplit + (delta / parentSize);
                
                // Clamp between 0.1 and 0.9
                resizer.node.split = Math.max(0.1, Math.min(0.9, newSplit));
                this.layout();
            };

            const handleUp = () => {
                document.removeEventListener('pointermove', handleMove);
                document.removeEventListener('pointerup', handleUp);
                this.saveState('Resize');
            };

            document.addEventListener('pointermove', handleMove);
            document.addEventListener('pointerup', handleUp);
        }

        startDrag(e, panelElement) {
            const panelId = panelElement.dataset.panelId;
            const panel = this.panels.get(panelId);
            if (!panel || panel.node.isPinned || panel.node.isVSCodePanel) return;

            e.preventDefault();

            const startX = e.clientX;
            const startY = e.clientY;
            let isDragging = false;

            const handleMove = (e) => {
                const dx = Math.abs(e.clientX - startX);
                const dy = Math.abs(e.clientY - startY);

                if (!isDragging && (dx > CONFIG.DRAG_THRESHOLD || dy > CONFIG.DRAG_THRESHOLD)) {
                    isDragging = true;
                    this.enterPreviewMode();
                    panelElement.classList.add('is-dragging');
                    document.body.classList.add('is-dragging');
                }

                if (isDragging) {
                    this.updateDragPreview(e, panelElement);
                }
            };

            const handleUp = (e) => {
                document.removeEventListener('pointermove', handleMove);
                document.removeEventListener('pointerup', handleUp);

                if (isDragging) {
                    panelElement.classList.remove('is-dragging');
                    document.body.classList.remove('is-dragging');
                    this.completeDrag(e, panelElement);
                    this.exitPreviewMode();
                }
            };

            document.addEventListener('pointermove', handleMove);
            document.addEventListener('pointerup', handleUp);
        }

        enterPreviewMode() {
            this.isPreviewMode = true;
            this.container.classList.add('preview-mode');
            
            // Clone current tree for preview
            this.previewRoot = JSON.parse(JSON.stringify(this.root.toJSON()));
        }

        exitPreviewMode() {
            this.isPreviewMode = false;
            this.container.classList.remove('preview-mode');
            this.previewRoot = null;
            
            // Clear drop zones
            this.container.querySelectorAll('.drop-zone').forEach(zone => zone.remove());
        }

        updateDragPreview(e, draggedElement) {
            // Find target panel under cursor
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const targetPanel = target?.closest('.panel:not(.is-dragging)');
            
            if (targetPanel) {
                const targetId = targetPanel.dataset.panelId;
                const targetPanelData = this.panels.get(targetId);
                
                if (targetPanelData && !targetPanelData.node.isPinned) {
                    this.showDropZones(targetPanel, e);
                }
            }
        }

        showDropZones(targetPanel, e) {
            // Clear existing zones
            this.container.querySelectorAll('.drop-zone').forEach(zone => zone.remove());

            const rect = targetPanel.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Determine zone based on position
            const zones = [
                { side: 'left', active: x < rect.width * 0.25 },
                { side: 'right', active: x > rect.width * 0.75 },
                { side: 'top', active: y < rect.height * 0.25 },
                { side: 'bottom', active: y > rect.height * 0.75 }
            ];

            zones.forEach(zone => {
                if (zone.active) {
                    const dropZone = document.createElement('div');
                    dropZone.className = `drop-zone drop-zone-${zone.side}`;
                    targetPanel.appendChild(dropZone);
                }
            });
        }

        completeDrag(e, draggedElement) {
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const targetPanel = target?.closest('.panel:not(.is-dragging)');
            const dropZone = target?.closest('.drop-zone');
            
            if (targetPanel && dropZone) {
                const draggedId = draggedElement.dataset.panelId;
                const targetId = targetPanel.dataset.panelId;
                const side = dropZone.className.match(/drop-zone-(\w+)/)[1];
                
                this.movePanel(draggedId, targetId, side);
            }
        }

        movePanel(draggedId, targetId, side) {
            const draggedData = this.panels.get(draggedId);
            const targetData = this.panels.get(targetId);
            
            if (!draggedData || !targetData) return;
            
            const draggedNode = draggedData.node;
            const targetNode = targetData.node;
            
            // Can't move pinned panels
            if (draggedNode.isPinned) return;
            
            // Save state before move
            this.saveState('Move panel');
            
            // Remove dragged node from its current position
            const draggedParent = draggedNode.parent;
            if (draggedParent) {
                const siblingIndex = draggedParent.children.indexOf(draggedNode);
                const sibling = draggedParent.children[1 - siblingIndex];
                
                // Replace parent with sibling
                if (draggedParent.parent) {
                    const grandParentIndex = draggedParent.parent.children.indexOf(draggedParent);
                    draggedParent.parent.children[grandParentIndex] = sibling;
                    sibling.parent = draggedParent.parent;
                } else {
                    this.root = sibling;
                    sibling.parent = null;
                }
            }
            
            // Determine split direction based on side
            const direction = (side === 'left' || side === 'right') ? 'horizontal' : 'vertical';
            const isFirst = (side === 'left' || side === 'top');
            
            // Create new split node
            const splitNode = new BSPNode({
                direction,
                split: 0.5,
                children: isFirst ? [draggedNode, targetNode] : [targetNode, draggedNode]
            });
            
            // Update relationships
            draggedNode.parent = splitNode;
            targetNode.parent = splitNode;
            splitNode.parent = targetNode.parent;
            
            // Replace target node with split node
            if (targetNode.parent) {
                const targetIndex = targetNode.parent.children.indexOf(targetNode);
                targetNode.parent.children[targetIndex] = splitNode;
            } else {
                this.root = splitNode;
            }
            
            // Re-render
            this.render();
        }

        handleDoubleClick(e) {
            const panelContent = e.target.closest('.panel-content');
            if (!panelContent || !this.markdownConverter) return;

            const panel = panelContent.closest('.panel');
            const panelId = panel?.dataset.panelId;
            if (!panelId) return;

            // Create markdown editor
            const currentContent = this.markdownContent.get(panelId) || '';
            const editor = document.createElement('textarea');
            editor.className = 'markdown-editor';
            editor.value = currentContent;
            
            panelContent.innerHTML = '';
            panelContent.appendChild(editor);
            editor.focus();
            editor.select();

            const saveEdit = () => {
                const markdown = editor.value;
                this.markdownContent.set(panelId, markdown);
                const html = this.markdownConverter.makeHtml(markdown);
                panelContent.innerHTML = `<div class="markdown-content">${html}</div>`;
                this.saveState('Edit content');
            };

            editor.addEventListener('blur', saveEdit);
            editor.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    editor.blur();
                }
            });
        }

        saveState(action) {
            const serializedTree = this.root.toJSON();
            const markdownData = Object.fromEntries(this.markdownContent);
            this.history.add({ action, tree: serializedTree, markdown: markdownData });
        }

        undo() {
            const state = this.history.undo();
            if (state) {
                this.restoreState(state);
            }
        }

        redo() {
            const state = this.history.redo();
            if (state) {
                this.restoreState(state);
            }
        }

        restoreState(state) {
            if (!state || !state.tree) return;
            
            // Clear current panels
            this.container.innerHTML = '';
            this.panels.clear();
            
            // Rebuild tree from state
            const buildNode = (nodeData, parent = null) => {
                const node = new BSPNode({
                    id: nodeData.id,
                    direction: nodeData.direction,
                    split: nodeData.split,
                    isPinned: nodeData.isPinned,
                    isCollapsed: nodeData.isCollapsed,
                    isVSCodePanel: nodeData.isVSCodePanel,
                    panelType: nodeData.panelType,
                    parent
                });
                
                if (nodeData.children && nodeData.children.length > 0) {
                    node.children = nodeData.children.map(child => buildNode(child, node));
                } else {
                    node.leaf = true;
                }
                
                return node;
            };
            
            this.root = buildNode(state.tree);
            
            // Restore markdown content
            if (state.markdown) {
                this.markdownContent = new Map(Object.entries(state.markdown));
            }
            
            // Re-render
            this.render();
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('main-workspace') || document.getElementById('workspace');
        if (container) {
            window.panelManager = new PanelManager(container);
            window.panelManager.init();
            
            // Add keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch(e.key) {
                        case 'z':
                            if (e.shiftKey) {
                                window.panelManager.redo();
                            } else {
                                window.panelManager.undo();
                            }
                            e.preventDefault();
                            break;
                        case 's':
                            window.panelManager.saveLayout();
                            e.preventDefault();
                            break;
                    }
                }
            });
        }
    });
})();