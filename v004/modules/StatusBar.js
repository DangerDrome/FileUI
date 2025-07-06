/**
 * StatusBar Module
 * Manages the bottom status bar with contextual information
 */

export class StatusBar {
    constructor(options = {}) {
        this.element = options.element || document.getElementById('status-bar');
        
        // Status items configuration
        this.items = {
            left: [],
            center: [],
            right: []
        };

        // Default status items
        this.defaultItems = {
            branch: {
                icon: 'git-branch',
                text: 'main',
                tooltip: 'Git branch',
                onClick: () => this.showGitMenu()
            },
            problems: {
                icon: 'alert-circle',
                text: '0 problems',
                tooltip: 'View problems',
                onClick: () => this.showProblemsPanel()
            },
            position: {
                text: 'Ln 1, Col 1',
                tooltip: 'Go to line',
                onClick: () => this.showGoToLine()
            },
            indentation: {
                text: 'Spaces: 4',
                tooltip: 'Select indentation',
                onClick: () => this.showIndentationMenu()
            },
            encoding: {
                text: 'UTF-8',
                tooltip: 'Select encoding',
                onClick: () => this.showEncodingMenu()
            },
            language: {
                text: 'Plain Text',
                tooltip: 'Select language mode',
                onClick: () => this.showLanguageMenu()
            },
            notifications: {
                icon: 'bell',
                tooltip: 'Notifications',
                onClick: () => this.showNotifications()
            }
        };

        // Event callbacks
        this.onItemClick = options.onItemClick || (() => {});
        this.onMenuShow = options.onMenuShow || (() => {});

        // State
        this.notifications = [];
        this.problems = { errors: 0, warnings: 0, infos: 0 };

        // Initialize
        this.initialize();
    }

    /**
     * Initialize the status bar
     */
    initialize() {
        this.setupDefaultItems();
        this.render();
        this.attachEventListeners();
    }

    /**
     * Setup default status items
     */
    setupDefaultItems() {
        // Left items
        this.addItem('branch', this.defaultItems.branch, 'left');
        this.addItem('problems', this.defaultItems.problems, 'left');

        // Center items
        this.addItem('position', this.defaultItems.position, 'center');
        this.addItem('indentation', this.defaultItems.indentation, 'center');
        this.addItem('encoding', this.defaultItems.encoding, 'center');

        // Right items
        this.addItem('language', this.defaultItems.language, 'right');
        this.addItem('notifications', this.defaultItems.notifications, 'right');
    }

    /**
     * Add a status item
     */
    addItem(id, config, position = 'left') {
        const item = {
            id,
            ...config,
            element: null
        };

        this.items[position].push(item);
        return item;
    }

    /**
     * Remove a status item
     */
    removeItem(id) {
        ['left', 'center', 'right'].forEach(position => {
            const index = this.items[position].findIndex(item => item.id === id);
            if (index !== -1) {
                const item = this.items[position][index];
                if (item.element) {
                    item.element.remove();
                }
                this.items[position].splice(index, 1);
            }
        });
    }

    /**
     * Update a status item
     */
    updateItem(id, updates) {
        const item = this.findItem(id);
        if (!item) return;

        Object.assign(item, updates);
        
        if (item.element) {
            this.updateItemElement(item);
        }
    }

    /**
     * Find a status item by ID
     */
    findItem(id) {
        for (const position of ['left', 'center', 'right']) {
            const item = this.items[position].find(item => item.id === id);
            if (item) return item;
        }
        return null;
    }

    /**
     * Render the status bar
     */
    render() {
        if (!this.element) return;

        // Clear existing content
        this.element.innerHTML = '';

        // Create sections
        ['left', 'center', 'right'].forEach(position => {
            const section = document.createElement('div');
            section.className = `status-${position}`;
            
            this.items[position].forEach(item => {
                const element = this.createItemElement(item);
                item.element = element;
                section.appendChild(element);
            });

            this.element.appendChild(section);
        });
    }

    /**
     * Create a status item element
     */
    createItemElement(item) {
        const element = document.createElement('span');
        element.className = 'status-item';
        element.dataset.itemId = item.id;
        
        if (item.tooltip) {
            element.title = item.tooltip;
        }

        this.updateItemElement(item, element);
        
        return element;
    }

    /**
     * Update a status item element
     */
    updateItemElement(item, element = item.element) {
        if (!element) return;

        element.innerHTML = '';

        if (item.icon) {
            const icon = document.createElement('i');
            icon.setAttribute('data-lucide', item.icon);
            element.appendChild(icon);
        }

        if (item.text) {
            const text = document.createElement('span');
            text.textContent = item.text;
            element.appendChild(text);
        }

        // Update Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.element.addEventListener('click', (e) => {
            const item = e.target.closest('.status-item');
            if (!item) return;

            const itemId = item.dataset.itemId;
            const itemConfig = this.findItem(itemId);
            
            if (itemConfig && itemConfig.onClick) {
                itemConfig.onClick();
            }
            
            this.onItemClick(itemId);
        });
    }

    /**
     * Update Git branch
     */
    updateBranch(branchName, isDirty = false) {
        const text = isDirty ? `${branchName}*` : branchName;
        this.updateItem('branch', { text });
    }

    /**
     * Update problems count
     */
    updateProblems(errors = 0, warnings = 0, infos = 0) {
        this.problems = { errors, warnings, infos };
        
        const parts = [];
        if (errors > 0) parts.push(`${errors} error${errors > 1 ? 's' : ''}`);
        if (warnings > 0) parts.push(`${warnings} warning${warnings > 1 ? 's' : ''}`);
        if (infos > 0) parts.push(`${infos} info${infos > 1 ? 's' : ''}`);
        
        const text = parts.length > 0 ? parts.join(', ') : '0 problems';
        const icon = errors > 0 ? 'x-circle' : warnings > 0 ? 'alert-circle' : 'check-circle';
        
        this.updateItem('problems', { text, icon });
    }

    /**
     * Update cursor position
     */
    updatePosition(line, column, selection = null) {
        let text = `Ln ${line}, Col ${column}`;
        
        if (selection) {
            text += ` (${selection.length} selected)`;
        }
        
        this.updateItem('position', { text });
    }

    /**
     * Update indentation
     */
    updateIndentation(useSpaces, size) {
        const text = useSpaces ? `Spaces: ${size}` : `Tab Size: ${size}`;
        this.updateItem('indentation', { text });
    }

    /**
     * Update encoding
     */
    updateEncoding(encoding) {
        this.updateItem('encoding', { text: encoding });
    }

    /**
     * Update language mode
     */
    updateLanguage(language) {
        this.updateItem('language', { text: language });
    }

    /**
     * Add notification
     */
    addNotification(notification) {
        this.notifications.push({
            id: Date.now(),
            timestamp: new Date(),
            ...notification
        });

        // Update notification badge
        const count = this.notifications.filter(n => !n.read).length;
        const icon = count > 0 ? 'bell-dot' : 'bell';
        this.updateItem('notifications', { icon });
    }

    /**
     * Show Git menu
     */
    showGitMenu() {
        this.showDropdownMenu('branch', [
            { label: 'Checkout Branch...', action: 'checkout' },
            { label: 'Create Branch...', action: 'create-branch' },
            { separator: true },
            { label: 'Pull', action: 'pull' },
            { label: 'Push', action: 'push' },
            { label: 'Sync', action: 'sync' },
            { separator: true },
            { label: 'Commit...', action: 'commit' },
            { label: 'Stage All', action: 'stage-all' },
            { label: 'Unstage All', action: 'unstage-all' }
        ]);
    }

    /**
     * Show problems panel
     */
    showProblemsPanel() {
        this.onMenuShow('problems-panel');
    }

    /**
     * Show go to line dialog
     */
    showGoToLine() {
        this.onMenuShow('go-to-line');
    }

    /**
     * Show indentation menu
     */
    showIndentationMenu() {
        this.showDropdownMenu('indentation', [
            { label: 'Indent Using Spaces', action: 'spaces', checked: true },
            { label: 'Indent Using Tabs', action: 'tabs' },
            { separator: true },
            { label: '2', action: 'size-2' },
            { label: '4', action: 'size-4', checked: true },
            { label: '8', action: 'size-8' },
            { separator: true },
            { label: 'Detect Indentation', action: 'detect' },
            { label: 'Convert Indentation to Spaces', action: 'convert-spaces' },
            { label: 'Convert Indentation to Tabs', action: 'convert-tabs' }
        ]);
    }

    /**
     * Show encoding menu
     */
    showEncodingMenu() {
        this.showDropdownMenu('encoding', [
            { label: 'UTF-8', action: 'utf8', checked: true },
            { label: 'UTF-16 LE', action: 'utf16le' },
            { label: 'UTF-16 BE', action: 'utf16be' },
            { separator: true },
            { label: 'Western (ISO 8859-1)', action: 'iso88591' },
            { label: 'Western (Windows 1252)', action: 'windows1252' },
            { separator: true },
            { label: 'Save with Encoding...', action: 'save-with-encoding' }
        ]);
    }

    /**
     * Show language menu
     */
    showLanguageMenu() {
        this.showDropdownMenu('language', [
            { label: 'Auto Detect', action: 'auto' },
            { separator: true },
            { label: 'Plain Text', action: 'plaintext', checked: true },
            { label: 'JavaScript', action: 'javascript' },
            { label: 'TypeScript', action: 'typescript' },
            { label: 'HTML', action: 'html' },
            { label: 'CSS', action: 'css' },
            { label: 'JSON', action: 'json' },
            { label: 'Markdown', action: 'markdown' },
            { separator: true },
            { label: 'Configure File Association...', action: 'configure' }
        ]);
    }

    /**
     * Show notifications
     */
    showNotifications() {
        // Mark all as read
        this.notifications.forEach(n => n.read = true);
        this.updateItem('notifications', { icon: 'bell' });
        
        this.onMenuShow('notifications', this.notifications);
    }

    /**
     * Show dropdown menu for a status item
     */
    showDropdownMenu(itemId, items) {
        const item = this.findItem(itemId);
        if (!item || !item.element) return;

        const rect = item.element.getBoundingClientRect();
        
        // Remove existing menu
        const existingMenu = document.querySelector('.status-dropdown-menu');
        if (existingMenu) existingMenu.remove();

        const menu = document.createElement('div');
        menu.className = 'status-dropdown-menu';
        menu.style.position = 'fixed';
        menu.style.bottom = `${window.innerHeight - rect.top}px`;
        menu.style.left = `${rect.left}px`;

        items.forEach(menuItem => {
            if (menuItem.separator) {
                const separator = document.createElement('div');
                separator.className = 'menu-separator';
                menu.appendChild(separator);
            } else {
                const element = document.createElement('div');
                element.className = 'menu-item';
                
                if (menuItem.checked) {
                    element.classList.add('checked');
                    const check = document.createElement('i');
                    check.setAttribute('data-lucide', 'check');
                    element.appendChild(check);
                }
                
                const label = document.createElement('span');
                label.textContent = menuItem.label;
                element.appendChild(label);
                
                element.addEventListener('click', () => {
                    this.onMenuShow(`${itemId}-action`, menuItem.action);
                    menu.remove();
                });
                
                menu.appendChild(element);
            }
        });

        document.body.appendChild(menu);

        // Update Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Remove menu on click outside
        const removeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', removeMenu), 0);
    }

    /**
     * Show progress
     */
    showProgress(id, message, indeterminate = false) {
        const progress = {
            id,
            message,
            indeterminate,
            element: null
        };

        // Create progress element
        const element = document.createElement('div');
        element.className = 'status-progress';
        element.innerHTML = `
            <div class="status-progress-message">${message}</div>
            <div class="status-progress-bar ${indeterminate ? 'indeterminate' : ''}">
                <div class="status-progress-fill"></div>
            </div>
        `;

        progress.element = element;
        
        // Add to center section temporarily
        const center = this.element.querySelector('.status-center');
        if (center) {
            center.appendChild(element);
        }

        return {
            update: (percent) => this.updateProgress(id, percent),
            done: () => this.hideProgress(id)
        };
    }

    /**
     * Update progress
     */
    updateProgress(id, percent) {
        const progress = this.element.querySelector(`.status-progress`);
        if (!progress) return;

        const fill = progress.querySelector('.status-progress-fill');
        if (fill && !progress.classList.contains('indeterminate')) {
            fill.style.width = `${percent}%`;
        }
    }

    /**
     * Hide progress
     */
    hideProgress(id) {
        const progress = this.element.querySelector('.status-progress');
        if (progress) {
            progress.remove();
        }
    }

    /**
     * Add custom styles for status bar
     */
    static injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .status-dropdown-menu {
                background: var(--bg-tertiary);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.4);
                padding: var(--spacing-xs);
                min-width: 200px;
                max-width: 400px;
                max-height: 400px;
                overflow-y: auto;
                z-index: 1000;
            }
            
            .status-dropdown-menu .menu-item.checked {
                padding-left: var(--spacing-lg);
                position: relative;
            }
            
            .status-dropdown-menu .menu-item.checked i {
                position: absolute;
                left: var(--spacing-xs);
                width: 16px;
                height: 16px;
            }
            
            .status-progress {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
                padding: 0 var(--spacing-sm);
            }
            
            .status-progress-message {
                font-size: var(--font-size-xs);
            }
            
            .status-progress-bar {
                width: 100px;
                height: 3px;
                background: var(--bg-quaternary);
                border-radius: 2px;
                overflow: hidden;
            }
            
            .status-progress-fill {
                height: 100%;
                background: var(--accent-color);
                transition: width 200ms ease;
            }
            
            .status-progress-bar.indeterminate .status-progress-fill {
                width: 30%;
                animation: indeterminate-progress 1.5s ease-in-out infinite;
            }
            
            @keyframes indeterminate-progress {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(400%); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Auto-inject styles when module is loaded
StatusBar.injectStyles();