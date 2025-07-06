/**
 * FileUI Panels v4
 * Main application entry point
 */

import { WorkspaceManager } from '../modules/WorkspaceManager.js';
import { ActivityBar } from '../modules/ActivityBar.js';
import { StatusBar } from '../modules/StatusBar.js';
import { FileSystemManager } from '../modules/FileSystemManager.js';

class FileUIApp {
    constructor() {
        // Core managers
        this.workspaceManager = null;
        this.activityBar = null;
        this.statusBar = null;
        this.fileSystemManager = null;
        
        // Menu system
        this.menuBar = null;
        this.activeMenu = null;
        
        // State
        this.isReady = false;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        console.log('Initializing FileUI v4...');
        
        try {
            // Initialize core components
            this.initializeFileSystem();
            this.initializeWorkspace();
            this.initializeActivityBar();
            this.initializeStatusBar();
            this.initializeMenuBar();
            
            // Setup global event handlers
            this.setupEventHandlers();
            
            // Initialize Lucide icons
            this.initializeIcons();
            
            // Populate file tree
            this.populateFileTree();
            
            // Mark as ready
            this.isReady = true;
            
            // Show welcome message
            this.showWelcome();
            
            // Update toggle button icons
            this.updateToggleButtonIcons();
            
            console.log('FileUI v4 initialized successfully');
        } catch (error) {
            console.error('Failed to initialize FileUI:', error);
            this.showError('Failed to initialize application', error.message);
        }
    }

    /**
     * Initialize file system manager
     */
    initializeFileSystem() {
        this.fileSystemManager = new FileSystemManager();
        this.fileSystemManager.onFileOpen = (path, file) => {
            console.log('File opened:', path);
            this.openFileInEditor(path, file);
        };
    }

    /**
     * Initialize workspace manager
     */
    initializeWorkspace() {
        this.workspaceManager = new WorkspaceManager({
            onLayoutChange: (area) => {
                console.log('Layout changed:', area);
            },
            onViewChange: (view) => {
                console.log('View changed:', view);
                this.updateViewContent(view);
            },
            onPanelFocus: (type, node) => {
                console.log('Panel focused:', type, node.id);
                this.updateStatusBar(type, node);
            }
        });
        
        this.workspaceManager.initialize();
    }

    /**
     * Initialize activity bar
     */
    initializeActivityBar() {
        this.activityBar = new ActivityBar({
            element: document.getElementById('activity-bar'),
            defaultView: 'explorer',
            onViewChange: (viewId) => {
                console.log('Activity view changed:', viewId);
                this.workspaceManager.setActiveView(viewId);
            },
            onViewAction: (actionId) => {
                console.log('Activity action:', actionId);
                this.handleActivityAction(actionId);
            }
        });
    }

    /**
     * Initialize status bar
     */
    initializeStatusBar() {
        this.statusBar = new StatusBar({
            element: document.getElementById('status-bar'),
            onItemClick: (itemId) => {
                console.log('Status item clicked:', itemId);
            },
            onMenuShow: (menuId, data) => {
                console.log('Status menu:', menuId, data);
                this.handleStatusMenu(menuId, data);
            }
        });
        
        // Set initial status
        this.statusBar.updateBranch('main', false);
        this.statusBar.updateProblems(0, 0, 0);
        this.statusBar.updatePosition(1, 1);
        this.statusBar.updateIndentation(true, 4);
        this.statusBar.updateEncoding('UTF-8');
        this.statusBar.updateLanguage('Plain Text');
    }

    /**
     * Initialize menu bar
     */
    initializeMenuBar() {
        const menuBar = document.getElementById('menubar');
        const dropdownMenus = document.getElementById('dropdown-menus');
        
        if (!menuBar || !dropdownMenus) return;
        
        this.menuBar = menuBar;
        
        // Menu button clicks
        menuBar.addEventListener('click', (e) => {
            const button = e.target.closest('.menu-button');
            if (!button) return;
            
            const menuId = button.dataset.menu;
            this.toggleMenu(menuId);
        });
        
        // Menu item clicks
        dropdownMenus.addEventListener('click', (e) => {
            const item = e.target.closest('.menu-item');
            if (!item) return;
            
            const action = item.dataset.action;
            this.handleMenuAction(action);
            this.closeAllMenus();
        });
        
        // Close menus on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-button') && !e.target.closest('.dropdown-menu')) {
                this.closeAllMenus();
            }
        });
        
        // Keyboard shortcuts for menus
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllMenus();
            }
        });
    }

    /**
     * Setup global event handlers
     */
    setupEventHandlers() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.workspaceManager?.updateLayout();
        });
        
        // Handle keyboard shortcuts - bind to this context
        document.addEventListener('keydown', this.handleKeyboardShortcut.bind(this));
        
        // Header button handlers
        document.getElementById('split-editor-btn')?.addEventListener('click', () => {
            this.splitActiveEditor();
        });
        
        document.getElementById('toggle-sidebar-btn')?.addEventListener('click', () => {
            this.workspaceManager?.toggleSidebar();
            this.updateToggleButtonIcons();
        });
        
        document.getElementById('toggle-panel-btn')?.addEventListener('click', () => {
            this.workspaceManager?.toggleTerminal();
            this.updateToggleButtonIcons();
        });
        
        document.getElementById('layout-btn')?.addEventListener('click', () => {
            this.showLayoutMenu();
        });
        
        document.getElementById('more-actions-btn')?.addEventListener('click', () => {
            this.showMoreActionsMenu();
        });
        
        // Handle file drops
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleFileDrop(e);
        });
    }

    /**
     * Initialize Lucide icons
     */
    initializeIcons() {
        console.log('Initializing icons, lucide available:', typeof window.lucide);
        if (window.lucide) {
            window.lucide.createIcons();
            console.log('Lucide icons created');
        } else {
            console.error('Lucide icons not loaded');
        }
    }

    /**
     * Toggle menu visibility
     */
    toggleMenu(menuId) {
        const menus = document.querySelectorAll('.dropdown-menu');
        const targetMenu = document.querySelector(`.dropdown-menu[data-menu="${menuId}"]`);
        const button = document.querySelector(`.menu-button[data-menu="${menuId}"]`);
        
        // Close all other menus
        menus.forEach(menu => {
            if (menu !== targetMenu) {
                menu.classList.remove('active');
            }
        });
        
        // Remove active from all buttons
        document.querySelectorAll('.menu-button').forEach(btn => {
            if (btn !== button) {
                btn.classList.remove('active');
            }
        });
        
        if (targetMenu) {
            const isActive = targetMenu.classList.toggle('active');
            button?.classList.toggle('active', isActive);
            
            if (isActive) {
                // Position menu under button
                const rect = button.getBoundingClientRect();
                targetMenu.style.left = `${rect.left}px`;
                targetMenu.style.top = `${rect.bottom}px`;
            }
        }
    }

    /**
     * Close all menus
     */
    closeAllMenus() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('active');
        });
        document.querySelectorAll('.menu-button').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    /**
     * Handle menu actions
     */
    handleMenuAction(action) {
        console.log('Menu action:', action);
        
        switch (action) {
            case 'new-file':
                this.createNewFile();
                break;
            case 'open-file':
                this.openFile();
                break;
            case 'save':
                this.saveFile();
                break;
            case 'save-as':
                this.saveFileAs();
                break;
            case 'close-editor':
                this.closeEditor();
                break;
            case 'exit':
                this.exitApp();
                break;
            case 'undo':
            case 'redo':
            case 'cut':
            case 'copy':
            case 'paste':
                this.handleEditAction(action);
                break;
            case 'find':
            case 'replace':
                this.handleSearchAction(action);
                break;
            case 'toggle-sidebar':
                this.workspaceManager?.toggleSidebar();
                break;
            case 'toggle-terminal':
                this.workspaceManager?.toggleTerminal();
                break;
            case 'toggle-inspector':
                this.workspaceManager?.toggleInspector();
                break;
            case 'zoom-in':
            case 'zoom-out':
            case 'reset-zoom':
                this.handleZoomAction(action);
                break;
            default:
                console.warn('Unknown menu action:', action);
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcut(e) {
        // File shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    this.createNewFile();
                    break;
                case 'o':
                    e.preventDefault();
                    this.openFile();
                    break;
                case 's':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.saveFileAs();
                    } else {
                        this.saveFile();
                    }
                    break;
                case 'w':
                    e.preventDefault();
                    this.closeEditor();
                    break;
                case 'b':
                    e.preventDefault();
                    this.workspaceManager?.toggleSidebar();
                    break;
                case '`':
                case '~':  // Also handle tilde for keyboards where backtick requires shift
                    e.preventDefault();
                    this.workspaceManager?.toggleTerminal();
                    break;
            }
        }
    }

    /**
     * Handle activity bar actions
     */
    handleActivityAction(actionId) {
        switch (actionId) {
            case 'settings':
                this.showSettings();
                break;
            case 'account':
                this.showAccount();
                break;
            case 'hide-activity-bar':
                // Would need to implement activity bar hiding
                break;
        }
    }

    /**
     * Handle status bar menus
     */
    handleStatusMenu(menuId, data) {
        switch (menuId) {
            case 'problems-panel':
                this.showProblemsPanel();
                break;
            case 'go-to-line':
                this.showGoToLineDialog();
                break;
            case 'notifications':
                this.showNotificationsPanel(data);
                break;
            case 'branch-action':
            case 'indentation-action':
            case 'encoding-action':
            case 'language-action':
                console.log(`Status menu action: ${menuId}`, data);
                break;
        }
    }

    /**
     * Update view content when switching views
     */
    updateViewContent(viewId) {
        // This would update the sidebar content based on the selected view
        console.log('Updating view content for:', viewId);
    }

    /**
     * Update status bar based on active panel
     */
    updateStatusBar(type, node) {
        if (type === 'editor') {
            // Update language mode, encoding, etc. based on file
            const fileInfo = node.metadata || {};
            if (fileInfo.language) {
                this.statusBar.updateLanguage(fileInfo.language);
            }
        }
    }

    /**
     * Handle file drops
     */
    handleFileDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        console.log('Files dropped:', files);
        
        // Would implement file opening logic here
        files.forEach(file => {
            console.log('Would open file:', file.name);
        });
    }

    /**
     * Show welcome message
     */
    showWelcome() {
        this.statusBar.addNotification({
            type: 'info',
            message: 'Welcome to FileUI v4',
            actions: [
                { label: 'Get Started', action: 'get-started' },
                { label: 'Documentation', action: 'docs' }
            ]
        });
    }

    /**
     * Show error message
     */
    showError(title, message) {
        console.error(title, message);
        this.statusBar.addNotification({
            type: 'error',
            message: `${title}: ${message}`
        });
    }

    // Placeholder methods for file operations
    createNewFile() {
        console.log('Create new file');
        // Would implement file creation
    }

    openFile() {
        console.log('Open file');
        // Would implement file picker
    }

    saveFile() {
        console.log('Save file');
        // Would implement file saving
    }

    saveFileAs() {
        console.log('Save file as');
        // Would implement save dialog
    }

    closeEditor() {
        console.log('Close editor');
        // Would close active editor
    }

    exitApp() {
        console.log('Exit app');
        // Would implement app exit
    }

    handleEditAction(action) {
        console.log('Edit action:', action);
        // Would implement edit operations
    }

    handleSearchAction(action) {
        console.log('Search action:', action);
        // Would implement search operations
    }

    handleZoomAction(action) {
        console.log('Zoom action:', action);
        // Would implement zoom functionality
    }

    showSettings() {
        console.log('Show settings');
        // Would show settings UI
    }

    showAccount() {
        console.log('Show account');
        // Would show account UI
    }

    showProblemsPanel() {
        console.log('Show problems panel');
        // Would show problems panel
    }

    showGoToLineDialog() {
        console.log('Show go to line dialog');
        // Would show go to line dialog
    }

    showNotificationsPanel(notifications) {
        console.log('Show notifications:', notifications);
        // Would show notifications panel
    }

    /**
     * Populate the file tree in the explorer
     */
    populateFileTree() {
        const fileTree = this.fileSystemManager.getFileTree();
        const treeContainer = document.getElementById('file-tree');
        if (!treeContainer) return;

        // Clear existing tree
        treeContainer.innerHTML = '';

        // Build tree HTML
        const buildTreeHTML = (items, level = 0) => {
            const ul = document.createElement('ul');
            ul.className = level === 0 ? 'file-tree-root' : 'file-tree-nested';
            
            items.forEach(item => {
                const li = document.createElement('li');
                li.className = item.type === 'folder' ? 'folder' : 'file';
                
                const itemElement = document.createElement('div');
                itemElement.className = 'file-tree-item';
                itemElement.style.paddingLeft = `${level * 20 + 10}px`;
                
                // Icon
                const icon = document.createElement('i');
                if (item.type === 'folder') {
                    icon.setAttribute('data-lucide', 'folder');
                } else {
                    const iconName = this.getFileIcon(item.name);
                    icon.setAttribute('data-lucide', iconName);
                }
                
                // Label
                const label = document.createElement('span');
                label.textContent = item.name;
                
                itemElement.appendChild(icon);
                itemElement.appendChild(label);
                li.appendChild(itemElement);
                
                // Add click handler
                if (item.type === 'file') {
                    itemElement.addEventListener('click', () => {
                        this.fileSystemManager.openFile(item.path);
                    });
                    itemElement.style.cursor = 'pointer';
                } else {
                    itemElement.addEventListener('click', () => {
                        li.classList.toggle('open');
                        this.initializeIcons(); // Re-render icons
                    });
                    itemElement.style.cursor = 'pointer';
                    
                    // Add children
                    if (item.children && item.children.length > 0) {
                        const childTree = buildTreeHTML(item.children, level + 1);
                        li.appendChild(childTree);
                        li.classList.add('open'); // Start expanded
                    }
                }
                
                ul.appendChild(li);
            });
            
            return ul;
        };

        const tree = buildTreeHTML(fileTree);
        treeContainer.appendChild(tree);
        
        // Re-initialize icons
        this.initializeIcons();
    }

    /**
     * Get appropriate icon for file type
     */
    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'js': 'file-code',
            'jsx': 'file-code',
            'ts': 'file-code',
            'tsx': 'file-code',
            'css': 'file-type',
            'scss': 'file-type',
            'html': 'file-code',
            'json': 'file-json',
            'md': 'file-text',
            'txt': 'file-text',
            'gitignore': 'file-x',
            'env': 'file-lock'
        };
        return iconMap[ext] || 'file';
    }

    /**
     * Open file in editor
     */
    openFileInEditor(path, file) {
        // Get active editor panel
        const activeNode = this.workspaceManager.editorTree.activeNode;
        if (!activeNode || !activeNode.element) return;

        const content = activeNode.element.querySelector('.panel-content');
        if (!content) return;

        // Create simple editor view
        content.innerHTML = `
            <div class="editor-view">
                <div class="editor-header">
                    <span class="editor-filename">${path}</span>
                    <span class="editor-language">${file.language}</span>
                </div>
                <div class="editor-content">
                    <textarea class="code-editor" spellcheck="false">${this.escapeHtml(file.content)}</textarea>
                </div>
            </div>
        `;

        // Update status bar
        this.statusBar.updateLanguage(file.language);
        this.statusBar.updatePosition(1, 1);
    }

    /**
     * Escape HTML for safe display
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Split the active editor
     */
    splitActiveEditor() {
        const activeNode = this.workspaceManager?.editorTree?.activeNode;
        if (activeNode) {
            this.workspaceManager.editorTree.splitNode(activeNode, 'vertical');
        }
    }

    /**
     * Show layout menu
     */
    showLayoutMenu() {
        // TODO: Implement layout presets menu
        console.log('Show layout menu');
    }

    /**
     * Show more actions menu
     */
    showMoreActionsMenu() {
        // TODO: Implement more actions menu
        console.log('Show more actions menu');
    }

    /**
     * Update toggle button icons based on state
     */
    updateToggleButtonIcons() {
        // Update sidebar toggle icon
        const sidebarBtn = document.getElementById('toggle-sidebar-btn');
        const sidebarIcon = sidebarBtn?.querySelector('i');
        if (sidebarIcon && this.workspaceManager) {
            const isVisible = this.workspaceManager.state.sidebarVisible;
            sidebarIcon.setAttribute('data-lucide', isVisible ? 'sidebar-close' : 'sidebar-open');
        }

        // Update panel toggle icon
        const panelBtn = document.getElementById('toggle-panel-btn');
        const panelIcon = panelBtn?.querySelector('i');
        if (panelIcon && this.workspaceManager) {
            const isVisible = this.workspaceManager.state.terminalVisible;
            panelIcon.setAttribute('data-lucide', isVisible ? 'panel-bottom-close' : 'panel-bottom-open');
        }

        // Re-initialize Lucide icons
        this.initializeIcons();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new FileUIApp();
    
    // Wait a bit for Lucide to load
    setTimeout(() => {
        app.initialize();
    }, 100);
    
    // Expose app instance for debugging
    window.fileUIApp = app;
});