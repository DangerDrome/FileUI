(function() {
    'use strict';

    // Minimal UI utilities for panels (without navigation/controls)
    window.UI = {
        toast: function(message, type = 'info', options = {}) {
            const container = document.getElementById('toast-container') || (() => {
                const div = document.createElement('div');
                div.id = 'toast-container';
                div.className = 'toast-container';
                document.body.appendChild(div);
                return div;
            })();

            const toast = document.createElement('div');
            toast.className = `toast toast-${type} ${options.dismissible ? 'toast-dismissible' : ''}`;
            
            let content = `<span class="toast-message">${message}</span>`;
            if (options.dismissible) {
                content += '<button class="toast-close" onclick="this.parentElement.remove()"><i data-lucide="x"></i></button>';
            }
            
            toast.innerHTML = content;
            container.appendChild(toast);
            
            if (lucide) lucide.createIcons();
            
            setTimeout(() => toast.remove(), options.duration || 3000);
        }
    };

    // ===== CONFIGURATION =====
    const CONFIG = {
        RESIZER_THICKNESS: 5,
        PANEL_MIN_HEIGHT: 40,
        PANEL_MIN_WIDTH: 150,
        COLLAPSED_SIZE: 30,
        DRAG_COLLAPSE_THRESHOLD: 20,
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
            this.isPinned = options.isPinned || false;
            this.isCollapsed = options.isCollapsed || false;
            this.isMainContent = options.isMainContent || false;
            this.isToolbar = options.isToolbar || false;
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
                isPinned: this.isPinned,
                isCollapsed: this.isCollapsed,
                isMainContent: this.isMainContent,
                isToolbar: this.isToolbar,
                children: newChildren,
                element: this.element
            });
            newChildren.push(...this.children.map(c => c.clone(newInstance)));
            return newInstance;
        }

        toJSON() {
            const obj = {
                id: this.id,
                direction: this.direction,
                split: this.split,
                isPinned: this.isPinned,
                isCollapsed: this.isCollapsed,
                isMainContent: this.isMainContent,
                isToolbar: this.isToolbar,
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
            this.panelContent = new Map();
            this.alignmentGuides = [];
            this.activeDrag = null;

            // Bind methods
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
            this.initializeTheme();
        }

        setupUI() {
            this.dom = {
                addPanelBtn: document.getElementById('add-panel-btn'),
                undoBtn: document.getElementById('undo-btn'),
                redoBtn: document.getElementById('redo-btn'),
                saveLayoutBtn: document.getElementById('save-layout-btn'),
                loadLayoutBtn: document.getElementById('load-layout-btn'),
                loadLayoutInput: document.getElementById('load-layout-input'),
                resetLayoutBtn: document.getElementById('reset-layout-btn'),
                themeToggle: document.getElementById('theme-toggle'),
                accentToggle: document.getElementById('accent-toggle'),
                previewRoot: document.getElementById('preview-root'),
                panelMenu: document.getElementById('panel-menu')
            };
        }

        initializeTheme() {
            const savedTheme = localStorage.getItem('theme') || 'dark';
            if (savedTheme === 'dark') {
                document.body.classList.add('dark');
            } else {
                document.body.classList.remove('dark');
            }
            this.updateThemeIcon();
            
            const savedAccent = localStorage.getItem('accent') || 'mint';
            document.documentElement.setAttribute('data-accent', savedAccent);
        }

        updateThemeIcon() {
            const isDark = document.body.classList.contains('dark');
            const icon = isDark ? 'sun' : 'moon';
            if (this.dom.themeToggle) {
                this.dom.themeToggle.innerHTML = `<i data-lucide="${icon}"></i>`;
                lucide.createIcons();
            }
        }

        toggleTheme() {
            const isDark = document.body.classList.contains('dark');
            if (isDark) {
                document.body.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
            this.updateThemeIcon();
        }
        
        toggleAccent() {
            const accents = ['mint', 'blue', 'pink', 'purple', 'yellow'];
            const currentAccent = document.documentElement.getAttribute('data-accent') || 'mint';
            const currentIndex = accents.indexOf(currentAccent);
            const nextIndex = (currentIndex + 1) % accents.length;
            const newAccent = accents[nextIndex];
            
            document.documentElement.setAttribute('data-accent', newAccent);
            localStorage.setItem('accent', newAccent);
            
            // Show toast with new accent color
            UI.toast(`Accent color: ${newAccent}`, 'info', { duration: 2000 });
        }
        
        setupEventListeners() {
            this.container.addEventListener('pointerdown', this.handlePointerDown);
            window.addEventListener('resize', () => this.layout());
            
            // Double-click for editing panel titles
            this.container.addEventListener('dblclick', this.handleDoubleClick.bind(this));
            
            // Button event handlers
            if (this.dom.addPanelBtn) this.dom.addPanelBtn.addEventListener('click', () => this.addPanel());
            if (this.dom.undoBtn) this.dom.undoBtn.addEventListener('click', () => this.undo());
            if (this.dom.redoBtn) this.dom.redoBtn.addEventListener('click', () => this.redo());
            if (this.dom.resetLayoutBtn) this.dom.resetLayoutBtn.addEventListener('click', () => this.resetLayout());
            if (this.dom.themeToggle) this.dom.themeToggle.addEventListener('click', () => this.toggleTheme());
            if (this.dom.accentToggle) this.dom.accentToggle.addEventListener('click', () => this.toggleAccent());
            if (this.dom.saveLayoutBtn) this.dom.saveLayoutBtn.addEventListener('click', () => this.saveLayout());
            if (this.dom.loadLayoutBtn) this.dom.loadLayoutBtn.addEventListener('click', () => this.dom.loadLayoutInput.click());
            if (this.dom.loadLayoutInput) {
                this.dom.loadLayoutInput.addEventListener('change', (e) => this.loadLayoutFromFile(e));
            }
            
            // History change listener for undo/redo button states
            this.history.on('change', ({ canUndo, canRedo }) => {
                if (this.dom.undoBtn) this.dom.undoBtn.disabled = !canUndo;
                if (this.dom.redoBtn) this.dom.redoBtn.disabled = !canRedo;
            });
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'z' && !e.shiftKey) {
                        e.preventDefault();
                        this.undo();
                    } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                        e.preventDefault();
                        this.redo();
                    }
                }
            });

            // Context menu
            this.container.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const panel = e.target.closest('.panel');
                if (panel) {
                    this.showPanelMenu(e, panel);
                }
            });

            // Hide context menu on click outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#panel-menu')) {
                    this.dom.panelMenu.style.display = 'none';
                }
            });

            // Context menu actions
            if (this.dom.panelMenu) {
                this.dom.panelMenu.addEventListener('click', (e) => {
                    const action = e.target.closest('[data-action]')?.dataset.action;
                    if (action && this.currentMenuPanel) {
                        this.handlePanelMenuAction(action, this.currentMenuPanel);
                        this.dom.panelMenu.style.display = 'none';
                    }
                });
            }
        }

        showPanelMenu(event, panelElement) {
            const panelId = this.getPanelId(panelElement);
            const panel = this.panels.get(panelId);
            if (!panel) return;

            this.currentMenuPanel = panelElement;
            
            // Update menu items based on panel state
            const pinText = this.dom.panelMenu.querySelector('.pin-text');
            const collapseText = this.dom.panelMenu.querySelector('.collapse-text');
            const toolbarText = this.dom.panelMenu.querySelector('.toolbar-text');
            
            if (pinText) pinText.textContent = panel.node.isPinned ? 'Unpin Panel' : 'Pin Panel';
            if (collapseText) collapseText.textContent = panel.node.isCollapsed ? 'Expand Panel' : 'Collapse Panel';
            if (toolbarText) toolbarText.textContent = panel.node.isToolbar ? 'Normal Panel' : 'Make Toolbar';

            // Position and show menu
            const rect = this.container.getBoundingClientRect();
            this.dom.panelMenu.style.left = `${event.clientX - rect.left}px`;
            this.dom.panelMenu.style.top = `${event.clientY - rect.top}px`;
            this.dom.panelMenu.style.display = 'block';
        }

        handlePanelMenuAction(action, panelElement) {
            const panelId = this.getPanelId(panelElement);
            const panel = this.panels.get(panelId);
            if (!panel) return;

            switch (action) {
                case 'split-horizontal':
                    this.splitPanel(panelId, 'horizontal');
                    break;
                case 'split-vertical':
                    this.splitPanel(panelId, 'vertical');
                    break;
                case 'pin':
                    this.togglePinPanel(panelId);
                    break;
                case 'collapse':
                    this.toggleCollapsePanel(panelId);
                    break;
                case 'toolbar':
                    this.toggleToolbarPanel(panelId);
                    break;
                case 'close':
                    this.closePanel(panelId);
                    break;
            }
        }

        resetLayout() {
            // Clear existing panels
            this.panels.forEach(panel => panel.element.remove());
            this.panels.clear();
            this.resizers.forEach(resizer => resizer.remove());
            this.resizers = [];
            
            // Create initial layout with 3 panels
            const panel1 = this.createPanelElement(1, 'Panel 1');
            const panel2 = this.createPanelElement(2, 'Panel 2');
            const panel3 = this.createPanelElement(3, 'Panel 3');
            
            // Set panel IDs
            panel1.dataset.panelId = 'panel-1';
            panel2.dataset.panelId = 'panel-2';
            panel3.dataset.panelId = 'panel-3';
            
            this.container.appendChild(panel1);
            this.container.appendChild(panel2);
            this.container.appendChild(panel3);
            
            // Create BSP tree
            const node1 = new BSPNode({ element: panel1, id: `panel-1` });
            const node2 = new BSPNode({ element: panel2, id: `panel-2` });
            const node3 = new BSPNode({ element: panel3, id: `panel-3` });
            
            const rightNode = new BSPNode({
                direction: 'horizontal',
                split: 0.5,
                children: [node2, node3]
            });
            
            node2.parent = rightNode;
            node3.parent = rightNode;
            
            this.root = new BSPNode({
                direction: 'vertical',
                split: 0.3,
                children: [node1, rightNode]
            });
            
            node1.parent = this.root;
            rightNode.parent = this.root;
            
            // Register panels
            this.panels.set(node1.id, { node: node1, element: panel1 });
            this.panels.set(node2.id, { node: node2, element: panel2 });
            this.panels.set(node3.id, { node: node3, element: panel3 });
            
            this.nextPanelNumber = 4;
            
            // Layout and save initial state
            this.layout();
            this.history.clear();
            this.saveState('Initial layout');
        }

        createPanelElement(panelNumber, customName = null) {
            const element = document.createElement('div');
            element.className = `panel ${CONFIG.PANEL_ANIMATION_CLASS}`;
            
            const panelTitle = customName || `Panel ${panelNumber}`;
            
            element.innerHTML = `
                <div class="panel-header">
                    <div class="panel-header-left">
                        <button class="btn btn-ghost btn-xs panel-action-btn" data-action="pin" title="Pin Panel">
                            <i data-lucide="pin" class="icon-pin"></i>
                            <i data-lucide="pin-off" class="icon-pin-off"></i>
                        </button>
                        <span class="panel-title">${panelTitle}</span>
                    </div>
                    <div class="panel-actions">
                        <button class="btn btn-ghost btn-xs panel-action-btn" data-action="collapse" title="Collapse Panel">
                            <i data-lucide="chevron-left" class="icon-collapse"></i>
                            <i data-lucide="chevron-right" class="icon-expand"></i>
                        </button>
                        <button class="btn btn-ghost btn-xs panel-action-btn" data-action="menu" title="Panel Menu">
                            <i data-lucide="more-vertical"></i>
                        </button>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="panel-content">
                        <p>Panel ${panelNumber} content</p>
                        <p class="text-secondary">Right-click for options</p>
                    </div>
                </div>
            `;
            
            // Initialize Lucide icons
            setTimeout(() => lucide.createIcons(), 0);
            
            // Add event listeners for panel actions
            const pinBtn = element.querySelector('[data-action="pin"]');
            const collapseBtn = element.querySelector('[data-action="collapse"]');
            const menuBtn = element.querySelector('[data-action="menu"]');
            
            if (pinBtn) pinBtn.addEventListener('click', () => this.togglePinPanel(this.getPanelId(element)));
            if (collapseBtn) collapseBtn.addEventListener('click', () => this.toggleCollapsePanel(this.getPanelId(element)));
            if (menuBtn) menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showPanelMenu(e, element);
            });
            
            return element;
        }

        getPanelId(element) {
            return element.dataset.panelId;
        }

        findNodeByElement(element) {
            const panelId = element.dataset.panelId;
            return this.panels.get(panelId)?.node;
        }

        togglePinPanel(panelId) {
            const panel = this.panels.get(panelId);
            if (!panel) return;
            
            panel.node.isPinned = !panel.node.isPinned;
            panel.element.classList.toggle('is-pinned', panel.node.isPinned);
            
            this.saveState('Toggle pin');
        }

        toggleCollapsePanel(panelId) {
            const panel = this.panels.get(panelId);
            if (!panel) return;
            
            panel.node.isCollapsed = !panel.node.isCollapsed;
            panel.element.classList.toggle('is-collapsed', panel.node.isCollapsed);
            
            // Update collapse direction based on position
            if (panel.node.isCollapsed && panel.node.rect) {
                const rect = panel.node.rect;
                const containerRect = this.container.getBoundingClientRect();
                
                // Determine if panel is on edge
                const onLeft = rect.x < 50;
                const onRight = rect.x + rect.width > containerRect.width - 50;
                const onTop = rect.y < 50;
                const onBottom = rect.y + rect.height > containerRect.height - 50;
                
                panel.element.classList.toggle('is-collapsed-vertically', onLeft || onRight);
                panel.element.classList.toggle('is-collapsed-horizontally', onTop || onBottom);
            }
            
            this.layout();
            this.saveState('Toggle collapse');
        }

        toggleToolbarPanel(panelId) {
            const panel = this.panels.get(panelId);
            if (!panel) return;
            
            panel.node.isToolbar = !panel.node.isToolbar;
            panel.element.classList.toggle('is-toolbar', panel.node.isToolbar);
            
            this.layout();
            this.saveState('Toggle toolbar');
        }

        addPanel() {
            let largestUnpinnedLeaf = null;
            let maxArea = -1;

            const findLargestLeaf = (node) => {
                if (node.isLeaf() && !node.isPinned) {
                    const area = node.rect.width * node.rect.height;
                    if (area > maxArea) {
                        maxArea = area;
                        largestUnpinnedLeaf = node;
                    }
                } else if (!node.isLeaf()) {
                    node.children.forEach(findLargestLeaf);
                }
            };

            findLargestLeaf(this.root);

            if (largestUnpinnedLeaf) {
                const targetNode = largestUnpinnedLeaf;
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

        splitPanel(panelId, direction) {
            const panel = this.panels.get(panelId);
            if (!panel || !panel.node.isLeaf()) return;
            
            const oldNode = panel.node;
            const parent = oldNode.parent;
            
            // Create new panel
            const newPanelElement = this.createPanelElement(this.nextPanelNumber++);
            const newPanelId = `panel-${this.nextPanelNumber - 1}`;
            newPanelElement.dataset.panelId = newPanelId;
            this.container.appendChild(newPanelElement);
            
            // Create new nodes
            const newLeaf1 = new BSPNode({
                element: oldNode.element,
                id: oldNode.id,
                isPinned: oldNode.isPinned,
                isCollapsed: oldNode.isCollapsed,
                isMainContent: oldNode.isMainContent,
                isToolbar: oldNode.isToolbar
            });
            
            const newLeaf2 = new BSPNode({
                element: newPanelElement,
                id: newPanelId
            });
            
            const newParent = new BSPNode({
                direction,
                split: 0.5,
                children: [newLeaf1, newLeaf2]
            });
            
            newLeaf1.parent = newParent;
            newLeaf2.parent = newParent;
            
            // Update tree structure
            if (parent) {
                const index = parent.children.indexOf(oldNode);
                parent.children[index] = newParent;
                newParent.parent = parent;
            } else {
                this.root = newParent;
            }
            
            // Update panels map
            this.panels.set(newLeaf1.id, { node: newLeaf1, element: oldNode.element });
            this.panels.set(newLeaf2.id, { node: newLeaf2, element: newPanelElement });
            
            this.layout();
            this.saveState('Split panel');
        }

        closePanel(panelId) {
            const panel = this.panels.get(panelId);
            if (!panel || this.panels.size <= 1) return;
            
            const node = panel.node;
            const parent = node.parent;
            if (!parent) return;
            
            const sibling = node.getSibling();
            if (!sibling) return;
            
            const grandparent = parent.parent;
            
            // Remove panel element
            panel.element.remove();
            this.panels.delete(panelId);
            
            // Update tree structure
            if (grandparent) {
                const index = grandparent.children.indexOf(parent);
                grandparent.children[index] = sibling;
                sibling.parent = grandparent;
            } else {
                this.root = sibling;
                sibling.parent = null;
            }
            
            this.layout();
            this.saveState('Close panel');
        }

        handleDoubleClick(e) {
            const titleElement = e.target.closest('.panel-title');
            if (!titleElement) return;
            
            const panel = e.target.closest('.panel');
            if (!panel) return;
            
            const panelId = this.getPanelId(panel);
            if (!panelId) return;
            
            // Create inline editor
            const currentTitle = titleElement.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'panel-title-editor';
            input.value = currentTitle;
            
            titleElement.style.display = 'none';
            titleElement.parentNode.insertBefore(input, titleElement);
            input.focus();
            input.select();
            
            const finishEdit = () => {
                const newTitle = input.value.trim() || currentTitle;
                titleElement.textContent = newTitle;
                titleElement.style.display = '';
                input.remove();
                this.saveState('Edit panel title');
            };
            
            input.addEventListener('blur', finishEdit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    finishEdit();
                } else if (e.key === 'Escape') {
                    input.value = currentTitle;
                    finishEdit();
                }
            });
        }

        // ===== DRAG AND DROP IMPLEMENTATION FROM V003 =====
        
        handlePointerDown(e) {
            const resizer = e.target.closest('.resizer');
            const header = e.target.closest('.panel-header');
            
            // Ignore clicks on buttons
            if (e.target.closest('button') || e.target.closest('.panel-actions')) {
                return;
            }
            
            if (resizer) {
                const node = resizer._node;
                if (!node) return;
                this.activeDrag = { type: 'resize', resizer, target: node };
            } else if (header) {
                const targetNode = this.findNodeByElement(header.parentElement);
                if (targetNode && !targetNode.isPinned) {
                    this.activeDrag = { type: 'move', header, target: targetNode };
                }
            }
            
            if (!this.activeDrag) return;

            e.preventDefault();
            this.activeDrag.startX = e.clientX;
            this.activeDrag.startY = e.clientY;
            
            this.container.classList.add('no-transition');
            document.body.style.cursor = this.activeDrag.type === 'resize' ? 
                (resizer.classList.contains('resizer-vertical') ? 'col-resize' : 'row-resize') : 'grabbing';

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

        initDrag() {
            this.activeDrag.isDragging = true;
            const draggedElement = this.activeDrag.target.element;
            this.enterPreviewMode(draggedElement);
            this.container.addEventListener('pointermove', this.handleDragOver);

            // Create alignment guides
            ['horizontal', 'horizontal', 'vertical', 'vertical'].forEach(direction => {
                const guide = document.createElement('div');
                guide.className = `alignment-guide alignment-guide-${direction}`;
                this.container.appendChild(guide);
                this.alignmentGuides.push(guide);
            });
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
                    if (node.isPinned || node.element === this.activeDrag.target.element) return;
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

        enterPreviewMode(draggedElement) {
            this.isPreviewMode = true;
            this.previewRoot = this.root.clone();
            draggedElement.classList.add('is-dragging');
            this.container.classList.add('preview-mode');
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

        exitPreviewMode() {
            if (!this.isPreviewMode) return;
            
            this.alignmentGuides.forEach(guide => guide.remove());
            this.alignmentGuides = [];
            
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

        _performMove(tree, draggedId, targetId, zone) {
            if (draggedId === targetId) return tree;

            const draggedNode = this._findNodeById(tree, draggedId);
            const targetNode = this._findNodeById(tree, targetId);
            
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
            } else { return tree; }

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

        _findNodeById(node, id) {
            if (!node) return null;
            if (node.id === id) return node;
            for (const child of node.children) {
                const found = this._findNodeById(child, id);
                if (found) return found;
            }
            return null;
        }

        // ===== END DRAG AND DROP =====

        // Layout and rendering methods
        saveState(action) {
            const serializedTree = this.root.toJSON();
            const contentData = Object.fromEntries(this.panelContent);
            this.history.add({ action, tree: serializedTree, content: contentData });
        }
        
        restoreState(state) {
            const panelElementsMap = new Map();
            this.panels.forEach(p => panelElementsMap.set(p.node.id, p.element));
            
            this.panelContent = new Map(Object.entries(state.content || {}));
            this.root = BSPNode.fromJSON(state.tree, null, panelElementsMap);
            
            this.panels.clear();
            const syncPanels = (node) => {
                if (node.isLeaf()) {
                    this.panels.set(node.id, { node, element: node.element });
                    this.updatePanelState(node);
                } else {
                    node.children.forEach(syncPanels);
                }
            };
            syncPanels(this.root);
            
            this.layout();
        }

        updatePanelState(node) {
            const panel = this.panels.get(node.id);
            if (!panel) return;
            
            panel.element.classList.toggle('is-pinned', node.isPinned);
            panel.element.classList.toggle('is-collapsed', node.isCollapsed);
            panel.element.classList.toggle('is-toolbar', node.isToolbar);
            panel.element.classList.toggle('is-main-content', node.isMainContent);
        }

        undo() {
            const state = this.history.undo();
            if (state) this.restoreState(state);
        }

        redo() {
            const state = this.history.redo();
            if (state) this.restoreState(state);
        }

        saveLayout() {
            const layoutData = {
                version: '2.0',
                timestamp: new Date().toISOString(),
                tree: this.root.toJSON(),
                content: Object.fromEntries(this.panelContent),
                panelCount: this.nextPanelNumber
            };
            
            const blob = new Blob([JSON.stringify(layoutData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `panel-layout-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            UI.toast('Layout saved successfully', 'success');
        }

        loadLayoutFromFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const layoutData = JSON.parse(e.target.result);
                    this.loadLayout(layoutData);
                    UI.toast('Layout loaded successfully', 'success');
                } catch (error) {
                    UI.toast('Failed to load layout file', 'error');
                    console.error('Layout load error:', error);
                }
            };
            reader.readAsText(file);
            
            // Reset input
            event.target.value = '';
        }

        loadLayout(layoutData) {
            // Implementation would be similar to v003's loadLayout
            // but adapted for the new structure
            this.history.clear();
            // ... implement layout loading
            this.saveState('Load layout');
        }

        // Layout calculation methods
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
                    let width1, width2;
                    const child1Collapsed = child1.isLeaf() && child1.isCollapsed;
                    const child2Collapsed = child2.isLeaf() && child2.isCollapsed;
                    const child1Toolbar = child1.isLeaf() && child1.isToolbar;
                    const child2Toolbar = child2.isLeaf() && child2.isToolbar;

                    if (child1Collapsed || child1Toolbar) {
                        width1 = CONFIG.COLLAPSED_SIZE;
                        width2 = availableWidth - width1;
                    } else if (child2Collapsed || child2Toolbar) {
                        width2 = CONFIG.COLLAPSED_SIZE;
                        width1 = availableWidth - width2;
                    } else {
                        const minWidth1 = this.calculateMinimumWidth(child1);
                        const minWidth2 = this.calculateMinimumWidth(child2);
                        const totalMinWidth = minWidth1 + minWidth2;
                        if (totalMinWidth > availableWidth) {
                            node.split = (totalMinWidth > 0) ? (minWidth1 / totalMinWidth) : 0.5;
                        }

                        width1 = Math.max(minWidth1, availableWidth * node.split);
                        width2 = availableWidth - width1;
                        if (width2 < minWidth2) {
                            width2 = minWidth2;
                            width1 = availableWidth - width2;
                        }
                    }
                    if (availableWidth > 0) node.split = width1 / availableWidth;
                    
                    rect1 = { ...rect, width: width1 };
                    rect2 = { ...rect, x: rect.x + width1 + CONFIG.RESIZER_THICKNESS, width: width2 };

                    if (!isPreview) {
                        const resizerX = rect.x + width1;
                        const resizer = this.createResizer(node, resizerX, rect.y, CONFIG.RESIZER_THICKNESS, rect.height, 'vertical');
                        this.resizers.push(resizer);
                    }
                } else {
                    const availableHeight = rect.height - CONFIG.RESIZER_THICKNESS;
                    let height1, height2;
                    const child1Collapsed = child1.isLeaf() && child1.isCollapsed;
                    const child2Collapsed = child2.isLeaf() && child2.isCollapsed;
                    const child1Toolbar = child1.isLeaf() && child1.isToolbar;
                    const child2Toolbar = child2.isLeaf() && child2.isToolbar;

                    if (child1Collapsed || child1Toolbar) {
                        height1 = CONFIG.COLLAPSED_SIZE;
                        height2 = availableHeight - height1;
                    } else if (child2Collapsed || child2Toolbar) {
                        height2 = CONFIG.COLLAPSED_SIZE;
                        height1 = availableHeight - height2;
                    } else {
                        const minHeight1 = this.calculateMinimumHeight(child1);
                        const minHeight2 = this.calculateMinimumHeight(child2);
                        const totalMinHeight = minHeight1 + minHeight2;
                        if (totalMinHeight > availableHeight) {
                            node.split = (totalMinHeight > 0) ? (minHeight1 / totalMinHeight) : 0.5;
                        }

                        height1 = Math.max(minHeight1, availableHeight * node.split);
                        height2 = availableHeight - height1;
                        if (height2 < minHeight2) {
                            height2 = minHeight2;
                            height1 = availableHeight - height2;
                        }
                    }
                    if (availableHeight > 0) node.split = height1 / availableHeight;
                    
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

        calculateMinimumWidth(node) {
            if (this.minSizeCache.has(node)) {
                return this.minSizeCache.get(node);
            }
            
            let minWidth;
            if (node.isLeaf()) {
                minWidth = (node.isCollapsed || node.isToolbar) ? CONFIG.COLLAPSED_SIZE : CONFIG.PANEL_MIN_WIDTH;
            } else {
                const [child1, child2] = node.children;
                if (node.direction === 'vertical') {
                    minWidth = this.calculateMinimumWidth(child1) + CONFIG.RESIZER_THICKNESS + this.calculateMinimumWidth(child2);
                } else {
                    minWidth = Math.max(this.calculateMinimumWidth(child1), this.calculateMinimumWidth(child2));
                }
            }
            
            this.minSizeCache.set(node, minWidth);
            return minWidth;
        }

        calculateMinimumHeight(node) {
            if (this.minSizeCache.has(node)) {
                return this.minSizeCache.get(node);
            }
            
            let minHeight;
            if (node.isLeaf()) {
                minHeight = (node.isCollapsed || node.isToolbar) ? CONFIG.COLLAPSED_SIZE : CONFIG.PANEL_MIN_HEIGHT;
            } else {
                const [child1, child2] = node.children;
                if (node.direction === 'horizontal') {
                    minHeight = this.calculateMinimumHeight(child1) + CONFIG.RESIZER_THICKNESS + this.calculateMinimumHeight(child2);
                } else {
                    minHeight = Math.max(this.calculateMinimumHeight(child1), this.calculateMinimumHeight(child2));
                }
            }
            
            this.minSizeCache.set(node, minHeight);
            return minHeight;
        }

        updatePanelControls(node) {
            // Update visual state of panel controls based on node state
            const panel = this.panels.get(node.id);
            if (!panel) return;
            
            // Update collapse button icon
            const collapseBtn = panel.element.querySelector('[data-action="collapse"]');
            if (collapseBtn) {
                const isVertical = panel.element.classList.contains('is-collapsed-vertically');
                const expandIcon = isVertical ? 'chevron-right' : 'chevron-down';
                const collapseIcon = isVertical ? 'chevron-left' : 'chevron-up';
                
                collapseBtn.innerHTML = node.isCollapsed 
                    ? `<i data-lucide="${expandIcon}"></i>`
                    : `<i data-lucide="${collapseIcon}"></i>`;
                lucide.createIcons();
            }
        }

        createResizer(node, x, y, width, height, type) {
            const resizer = document.createElement('div');
            resizer.className = `resizer resizer-${type}`;
            resizer.style.left = `${x}px`;
            resizer.style.top = `${y}px`;
            resizer.style.width = `${width}px`;
            resizer.style.height = `${height}px`;
            
            this.container.appendChild(resizer);
            
            // Store reference to node for resize handling
            resizer._node = node;
            resizer._type = type;
            
            return resizer;
        }

        handleResize(e) {
            const { target: node } = this.activeDrag;
            const { startX, startY } = this.activeDrag;
            
            if (node.direction === 'vertical') {
                const deltaX = e.clientX - startX;
                const availableWidth = node.rect.width - CONFIG.RESIZER_THICKNESS;
                const currentSplitPx = availableWidth * node.split;
                const newSplitPx = currentSplitPx + deltaX;
                node.split = Math.max(0.1, Math.min(0.9, newSplitPx / availableWidth));
            } else {
                const deltaY = e.clientY - startY;
                const availableHeight = node.rect.height - CONFIG.RESIZER_THICKNESS;
                const currentSplitPx = availableHeight * node.split;
                const newSplitPx = currentSplitPx + deltaY;
                node.split = Math.max(0.1, Math.min(0.9, newSplitPx / availableHeight));
            }
            
            this.layout();
        }
    }

    // Initialize the panel manager when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('panels-container');
        if (container) {
            window.panelManager = new PanelManager(container);
            window.panelManager.init();
        }
    });

})();