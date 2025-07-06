/**
 * WorkspaceManager Module
 * Manages the overall IDE layout including fixed regions and BSP areas
 */

import { BSPTree } from './BSPTree.js';

export class WorkspaceManager {
    constructor(options = {}) {
        this.options = {
            defaultSidebarWidth: 240,
            defaultInspectorWidth: 300,
            defaultTerminalHeight: 200,
            minSidebarWidth: 170,
            maxSidebarWidth: 500,
            minInspectorWidth: 200,
            maxInspectorWidth: 600,
            minTerminalHeight: 100,
            maxTerminalHeight: 600,
            ...options
        };

        // DOM elements
        this.elements = {
            workspace: null,
            header: null,
            statusBar: null,
            activityBar: null,
            sidebar: null,
            sidebarResizer: null,
            mainContent: null,
            editorContainer: null,
            terminalContainer: null,
            terminalResizer: null,
            inspector: null,
            inspectorResizer: null
        };

        // State
        this.state = {
            sidebarVisible: true,
            sidebarWidth: this.options.defaultSidebarWidth,
            inspectorVisible: true,
            inspectorWidth: this.options.defaultInspectorWidth,
            terminalVisible: true,
            terminalHeight: this.options.defaultTerminalHeight,
            activeView: 'explorer',
            activeEditor: null,
            activeTerminal: null
        };

        // BSP Trees for flexible areas
        this.editorTree = null;
        this.terminalTree = null;

        // Event handlers
        this.eventHandlers = {
            onLayoutChange: options.onLayoutChange || (() => {}),
            onViewChange: options.onViewChange || (() => {}),
            onPanelFocus: options.onPanelFocus || (() => {})
        };

        // Bind methods
        this.handleSidebarResize = this.handleSidebarResize.bind(this);
        this.handleInspectorResize = this.handleInspectorResize.bind(this);
        this.handleTerminalResize = this.handleTerminalResize.bind(this);
    }

    /**
     * Initialize the workspace manager
     */
    initialize() {
        this.queryElements();
        this.setupBSPTrees();
        this.attachEventListeners();
        this.applyInitialLayout();
        this.restoreState();
    }

    /**
     * Query and cache DOM elements
     */
    queryElements() {
        this.elements = {
            workspace: document.getElementById('workspace'),
            header: document.getElementById('main-header'),
            statusBar: document.getElementById('status-bar'),
            activityBar: document.getElementById('activity-bar'),
            sidebar: document.getElementById('sidebar'),
            sidebarResizer: document.getElementById('sidebar-resizer'),
            mainContent: document.getElementById('main-content'),
            editorContainer: document.getElementById('editor-container'),
            terminalContainer: document.getElementById('terminal-container'),
            terminalResizer: document.getElementById('terminal-resizer'),
            inspector: document.getElementById('inspector'),
            inspectorResizer: document.getElementById('inspector-resizer')
        };
    }

    /**
     * Setup BSP trees for editor and terminal areas
     */
    setupBSPTrees() {
        // Editor BSP Tree
        this.editorTree = new BSPTree(this.elements.editorContainer, {
            minPanelWidth: 200,
            minPanelHeight: 100,
            onPanelCreate: (node) => this.handleEditorPanelCreate(node),
            onPanelRemove: (node) => this.handleEditorPanelRemove(node),
            onPanelActivate: (node) => this.handleEditorPanelActivate(node),
            onLayoutChange: () => this.eventHandlers.onLayoutChange('editor')
        });

        // Terminal BSP Tree
        this.terminalTree = new BSPTree(this.elements.terminalContainer.querySelector('.terminal-panels'), {
            minPanelWidth: 200,
            minPanelHeight: 80,
            onPanelCreate: (node) => this.handleTerminalPanelCreate(node),
            onPanelRemove: (node) => this.handleTerminalPanelRemove(node),
            onPanelActivate: (node) => this.handleTerminalPanelActivate(node),
            onLayoutChange: () => this.eventHandlers.onLayoutChange('terminal')
        });

        // Initialize with default panels
        this.editorTree.initialize('editor', { filename: 'Welcome' });
        this.terminalTree.initialize('terminal', { shellType: 'bash' });
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Resizers
        this.elements.sidebarResizer.addEventListener('mousedown', this.handleSidebarResize);
        this.elements.inspectorResizer.addEventListener('mousedown', this.handleInspectorResize);
        this.elements.terminalResizer.addEventListener('mousedown', this.handleTerminalResize);

        // Window resize
        window.addEventListener('resize', () => this.handleWindowResize());

        // Activity bar clicks
        this.elements.activityBar.addEventListener('click', (e) => {
            const btn = e.target.closest('.activity-btn');
            if (btn) {
                const view = btn.dataset.view;
                this.setActiveView(view);
            }
        });

        // Toggle buttons
        document.getElementById('toggle-left-panel-btn')?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        document.getElementById('toggle-right-panel-btn')?.addEventListener('click', () => {
            this.toggleInspector();
        });

        document.getElementById('toggle-terminal-btn')?.addEventListener('click', () => {
            this.toggleTerminal();
        });
    }

    /**
     * Apply initial layout styles
     */
    applyInitialLayout() {
        // Set initial widths and heights
        this.elements.sidebar.style.width = `${this.state.sidebarWidth}px`;
        this.elements.inspector.style.width = `${this.state.inspectorWidth}px`;
        this.elements.terminalContainer.style.height = `${this.state.terminalHeight}px`;
        
        this.updateLayout();
    }

    /**
     * Update layout calculations
     */
    updateLayout() {
        // Calculate main content width
        const workspaceWidth = this.elements.workspace.offsetWidth;
        const activityBarWidth = this.elements.activityBar.offsetWidth;
        const sidebarWidth = this.state.sidebarVisible ? this.state.sidebarWidth : 0;
        const inspectorWidth = this.state.inspectorVisible ? this.state.inspectorWidth : 0;
        const resizerWidth = 4; // Width of each resizer

        const mainContentWidth = workspaceWidth - activityBarWidth - sidebarWidth - inspectorWidth - (resizerWidth * 2);
        
        // Update main content area
        this.elements.mainContent.style.marginLeft = `${sidebarWidth + resizerWidth}px`;
        this.elements.mainContent.style.marginRight = `${inspectorWidth + resizerWidth}px`;
        this.elements.mainContent.style.width = `${mainContentWidth}px`;

        // Update editor container height
        const mainContentHeight = this.elements.mainContent.offsetHeight;
        const terminalHeight = this.state.terminalVisible ? this.state.terminalHeight : 0;
        const editorHeight = mainContentHeight - terminalHeight - (terminalHeight > 0 ? resizerWidth : 0);
        
        this.elements.editorContainer.style.height = `${editorHeight}px`;

        // Relayout BSP trees
        this.editorTree?.layout();
        this.terminalTree?.layout();

        // Notify layout change
        this.eventHandlers.onLayoutChange('workspace');
    }

    /**
     * Handle sidebar resize
     */
    handleSidebarResize(e) {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = this.state.sidebarWidth;

        const handleMouseMove = (e) => {
            const delta = e.clientX - startX;
            const newWidth = Math.max(
                this.options.minSidebarWidth,
                Math.min(this.options.maxSidebarWidth, startWidth + delta)
            );
            
            this.state.sidebarWidth = newWidth;
            this.elements.sidebar.style.width = `${newWidth}px`;
            this.updateLayout();
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            this.elements.sidebarResizer.classList.remove('resizing');
            this.saveState();
        };

        this.elements.sidebarResizer.classList.add('resizing');
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    /**
     * Handle inspector resize
     */
    handleInspectorResize(e) {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = this.state.inspectorWidth;

        const handleMouseMove = (e) => {
            const delta = startX - e.clientX; // Reverse because resizing from left
            const newWidth = Math.max(
                this.options.minInspectorWidth,
                Math.min(this.options.maxInspectorWidth, startWidth + delta)
            );
            
            this.state.inspectorWidth = newWidth;
            this.elements.inspector.style.width = `${newWidth}px`;
            this.updateLayout();
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            this.elements.inspectorResizer.classList.remove('resizing');
            this.saveState();
        };

        this.elements.inspectorResizer.classList.add('resizing');
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    /**
     * Handle terminal resize
     */
    handleTerminalResize(e) {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = this.state.terminalHeight;

        const handleMouseMove = (e) => {
            const delta = startY - e.clientY; // Reverse because resizing from top
            const newHeight = Math.max(
                this.options.minTerminalHeight,
                Math.min(this.options.maxTerminalHeight, startHeight + delta)
            );
            
            this.state.terminalHeight = newHeight;
            this.elements.terminalContainer.style.height = `${newHeight}px`;
            this.updateLayout();
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            this.elements.terminalResizer.classList.remove('resizing');
            this.saveState();
        };

        this.elements.terminalResizer.classList.add('resizing');
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        this.updateLayout();
    }

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
        this.state.sidebarVisible = !this.state.sidebarVisible;
        this.elements.sidebar.classList.toggle('collapsed', !this.state.sidebarVisible);
        document.getElementById('toggle-left-panel-btn')?.classList.toggle('active', this.state.sidebarVisible);
        this.updateLayout();
        this.saveState();
    }

    /**
     * Toggle inspector visibility
     */
    toggleInspector() {
        this.state.inspectorVisible = !this.state.inspectorVisible;
        this.elements.inspector.classList.toggle('collapsed', !this.state.inspectorVisible);
        document.getElementById('toggle-right-panel-btn')?.classList.toggle('active', this.state.inspectorVisible);
        this.updateLayout();
        this.saveState();
    }

    /**
     * Toggle terminal visibility
     */
    toggleTerminal() {
        this.state.terminalVisible = !this.state.terminalVisible;
        this.elements.terminalContainer.classList.toggle('collapsed', !this.state.terminalVisible);
        document.getElementById('toggle-terminal-btn')?.classList.toggle('active', this.state.terminalVisible);
        this.updateLayout();
        this.saveState();
    }

    /**
     * Set active sidebar view
     */
    setActiveView(view) {
        this.state.activeView = view;
        
        // Update activity bar
        this.elements.activityBar.querySelectorAll('.activity-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Update sidebar views
        this.elements.sidebar.querySelectorAll('.sidebar-view').forEach(v => {
            v.classList.toggle('active', v.dataset.view === view);
        });

        // Ensure sidebar is visible
        if (!this.state.sidebarVisible) {
            this.toggleSidebar();
        }

        this.eventHandlers.onViewChange(view);
        this.saveState();
    }

    /**
     * Handle editor panel creation
     */
    handleEditorPanelCreate(node) {
        // Add default content
        const content = node.element.querySelector('.panel-content');
        content.innerHTML = `
            <div class="editor-placeholder">
                <div style="font-size: 24px; margin-bottom: 16px;">Welcome to FileUI v4</div>
                <div style="color: var(--text-secondary);">
                    Click on a file in the Explorer to open it here<br><br>
                    <strong>Keyboard Shortcuts:</strong><br>
                    • Ctrl+B - Toggle Sidebar<br>
                    • Ctrl+\` - Toggle Terminal<br>
                    • Ctrl+N - New File<br>
                    • Ctrl+S - Save File
                </div>
            </div>
        `;
        
        // Add panel event listeners
        const splitV = node.element.querySelector('.panel-split-v');
        const splitH = node.element.querySelector('.panel-split-h');
        const close = node.element.querySelector('.panel-close');

        splitV?.addEventListener('click', () => {
            this.editorTree.splitNode(node, 'vertical');
        });

        splitH?.addEventListener('click', () => {
            this.editorTree.splitNode(node, 'horizontal');
        });

        close?.addEventListener('click', () => {
            this.editorTree.removeNode(node);
        });

        // Focus panel on click
        node.element.addEventListener('click', () => {
            this.editorTree.setActiveNode(node);
        });
    }

    /**
     * Handle editor panel removal
     */
    handleEditorPanelRemove(node) {
        // Cleanup if needed
    }

    /**
     * Handle editor panel activation
     */
    handleEditorPanelActivate(node) {
        this.state.activeEditor = node.id;
        this.eventHandlers.onPanelFocus('editor', node);
    }

    /**
     * Handle terminal panel creation
     */
    handleTerminalPanelCreate(node) {
        // Add terminal content
        const content = node.element.querySelector('.panel-content');
        content.innerHTML = `
            <div class="terminal-placeholder">
                <div style="color: #4ec9b0;">$ FileUI Terminal v4.0</div>
                <div style="color: #969696;">Type 'help' for available commands</div>
                <br>
                <div>$ <span style="opacity: 0.6;">|</span></div>
            </div>
        `;
        
        // Add panel event listeners
        const splitV = node.element.querySelector('.panel-split-v');
        const splitH = node.element.querySelector('.panel-split-h');
        const close = node.element.querySelector('.panel-close');

        splitV?.addEventListener('click', () => {
            this.terminalTree.splitNode(node, 'vertical');
        });

        splitH?.addEventListener('click', () => {
            this.terminalTree.splitNode(node, 'horizontal');
        });

        close?.addEventListener('click', () => {
            this.terminalTree.removeNode(node);
        });

        // Focus panel on click
        node.element.addEventListener('click', () => {
            this.terminalTree.setActiveNode(node);
        });
    }

    /**
     * Handle terminal panel removal
     */
    handleTerminalPanelRemove(node) {
        // Cleanup if needed
    }

    /**
     * Handle terminal panel activation
     */
    handleTerminalPanelActivate(node) {
        this.state.activeTerminal = node.id;
        this.eventHandlers.onPanelFocus('terminal', node);
    }

    /**
     * Save workspace state to localStorage
     */
    saveState() {
        const state = {
            ...this.state,
            editorLayout: this.editorTree.serialize(),
            terminalLayout: this.terminalTree.serialize()
        };
        localStorage.setItem('fileui-workspace-state', JSON.stringify(state));
    }

    /**
     * Restore workspace state from localStorage
     */
    restoreState() {
        const saved = localStorage.getItem('fileui-workspace-state');
        if (!saved) return;

        try {
            const state = JSON.parse(saved);
            
            // Restore dimensions
            this.state = { ...this.state, ...state };
            
            // Apply restored state
            this.elements.sidebar.style.width = `${this.state.sidebarWidth}px`;
            this.elements.inspector.style.width = `${this.state.inspectorWidth}px`;
            this.elements.terminalContainer.style.height = `${this.state.terminalHeight}px`;
            
            // Apply visibility
            this.elements.sidebar.classList.toggle('collapsed', !this.state.sidebarVisible);
            this.elements.inspector.classList.toggle('collapsed', !this.state.inspectorVisible);
            this.elements.terminalContainer.classList.toggle('collapsed', !this.state.terminalVisible);
            
            // Restore layouts
            if (state.editorLayout) {
                this.editorTree.deserialize(state.editorLayout);
            }
            if (state.terminalLayout) {
                this.terminalTree.deserialize(state.terminalLayout);
            }
            
            // Set active view
            this.setActiveView(this.state.activeView);
            
            this.updateLayout();
        } catch (e) {
            console.error('Failed to restore workspace state:', e);
        }
    }

    /**
     * Reset workspace to default layout
     */
    resetLayout() {
        // Clear saved state
        localStorage.removeItem('fileui-workspace-state');
        
        // Reset dimensions
        this.state = {
            sidebarVisible: true,
            sidebarWidth: this.options.defaultSidebarWidth,
            inspectorVisible: true,
            inspectorWidth: this.options.defaultInspectorWidth,
            terminalVisible: true,
            terminalHeight: this.options.defaultTerminalHeight,
            activeView: 'explorer',
            activeEditor: null,
            activeTerminal: null
        };
        
        // Reset BSP trees
        this.elements.editorContainer.innerHTML = '<div class="drop-indicator" id="drop-indicator"></div>';
        this.elements.terminalContainer.querySelector('.terminal-panels').innerHTML = '';
        
        this.setupBSPTrees();
        this.applyInitialLayout();
    }
}