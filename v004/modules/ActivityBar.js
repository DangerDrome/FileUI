/**
 * ActivityBar Module
 * Manages the left activity bar for switching between different views
 */

export class ActivityBar {
    constructor(options = {}) {
        this.element = options.element || document.getElementById('activity-bar');
        this.currentView = options.defaultView || 'explorer';
        
        // Available views with their configurations
        this.views = {
            explorer: {
                icon: 'files',
                label: 'Explorer',
                shortcut: 'Ctrl+Shift+E'
            },
            search: {
                icon: 'search',
                label: 'Search',
                shortcut: 'Ctrl+Shift+F'
            },
            git: {
                icon: 'git-branch',
                label: 'Source Control',
                shortcut: 'Ctrl+Shift+G'
            },
            debug: {
                icon: 'bug',
                label: 'Run and Debug',
                shortcut: 'Ctrl+Shift+D'
            },
            extensions: {
                icon: 'puzzle',
                label: 'Extensions',
                shortcut: 'Ctrl+Shift+X'
            }
        };

        // Bottom views (settings, accounts, etc.)
        this.bottomViews = {
            account: {
                icon: 'user',
                label: 'Accounts'
            },
            settings: {
                icon: 'settings-2',
                label: 'Manage'
            }
        };

        // Event callbacks
        this.onViewChange = options.onViewChange || (() => {});
        this.onViewAction = options.onViewAction || (() => {});

        // Badge counts
        this.badges = new Map();

        // Initialize
        this.initialize();
    }

    /**
     * Initialize the activity bar
     */
    initialize() {
        this.render();
        this.attachEventListeners();
        this.setupKeyboardShortcuts();
        this.setActiveView(this.currentView);
    }

    /**
     * Render the activity bar
     */
    render() {
        if (!this.element) return;

        // Clear existing content
        this.element.innerHTML = '';

        // Create top section
        const topSection = document.createElement('div');
        topSection.className = 'activity-bar-top';

        // Add main views
        Object.entries(this.views).forEach(([viewId, config]) => {
            const button = this.createActivityButton(viewId, config);
            topSection.appendChild(button);
        });

        // Create bottom section
        const bottomSection = document.createElement('div');
        bottomSection.className = 'activity-bar-bottom';

        // Add bottom views
        Object.entries(this.bottomViews).forEach(([viewId, config]) => {
            const button = this.createActivityButton(viewId, config, true);
            bottomSection.appendChild(button);
        });

        // Append sections
        this.element.appendChild(topSection);
        this.element.appendChild(bottomSection);
    }

    /**
     * Create an activity button
     */
    createActivityButton(viewId, config, isBottom = false) {
        const button = document.createElement('button');
        button.className = 'activity-btn';
        button.dataset.view = viewId;
        button.setAttribute('aria-label', config.label);
        
        if (config.shortcut) {
            button.title = `${config.label} (${config.shortcut})`;
        } else {
            button.title = config.label;
        }

        // Icon
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', config.icon);
        button.appendChild(icon);

        // Badge container
        if (!isBottom) {
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'activity-badge-container';
            badgeContainer.style.display = 'none';
            
            const badge = document.createElement('span');
            badge.className = 'activity-badge';
            badgeContainer.appendChild(badge);
            
            button.appendChild(badgeContainer);
        }

        return button;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.element.addEventListener('click', (e) => {
            const button = e.target.closest('.activity-btn');
            if (!button) return;

            const viewId = button.dataset.view;
            
            // Handle bottom buttons differently
            if (this.bottomViews[viewId]) {
                this.handleBottomAction(viewId);
            } else {
                this.setActiveView(viewId);
            }
        });

        // Context menu on activity buttons
        this.element.addEventListener('contextmenu', (e) => {
            const button = e.target.closest('.activity-btn');
            if (!button) return;

            e.preventDefault();
            const viewId = button.dataset.view;
            this.showContextMenu(viewId, e.clientX, e.clientY);
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Check if Ctrl/Cmd + Shift is pressed
            if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;

            console.log('ActivityBar keyboard shortcut:', e.key.toUpperCase());

            switch (e.key.toUpperCase()) {
                case 'E':
                    e.preventDefault();
                    console.log('Switching to Explorer view');
                    this.setActiveView('explorer');
                    break;
                case 'F':
                    e.preventDefault();
                    console.log('Switching to Search view');
                    this.setActiveView('search');
                    break;
                case 'G':
                    e.preventDefault();
                    console.log('Switching to Git view');
                    this.setActiveView('git');
                    break;
                case 'D':
                    e.preventDefault();
                    console.log('Switching to Debug view');
                    this.setActiveView('debug');
                    break;
                case 'X':
                    e.preventDefault();
                    console.log('Switching to Extensions view');
                    this.setActiveView('extensions');
                    break;
            }
        });
    }

    /**
     * Set the active view
     */
    setActiveView(viewId) {
        if (!this.views[viewId] || viewId === this.currentView) return;

        // Update active state
        this.element.querySelectorAll('.activity-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewId);
        });

        this.currentView = viewId;
        this.onViewChange(viewId);
    }

    /**
     * Handle bottom action buttons
     */
    handleBottomAction(actionId) {
        this.onViewAction(actionId);

        // Show relevant UI based on action
        switch (actionId) {
            case 'settings':
                this.showSettingsMenu();
                break;
            case 'account':
                this.showAccountMenu();
                break;
        }
    }

    /**
     * Update badge count for a view
     */
    updateBadge(viewId, count) {
        const button = this.element.querySelector(`[data-view="${viewId}"]`);
        if (!button) return;

        const badgeContainer = button.querySelector('.activity-badge-container');
        const badge = button.querySelector('.activity-badge');
        
        if (!badgeContainer || !badge) return;

        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count.toString();
            badgeContainer.style.display = 'block';
            this.badges.set(viewId, count);
        } else {
            badgeContainer.style.display = 'none';
            this.badges.delete(viewId);
        }
    }

    /**
     * Show context menu for a view
     */
    showContextMenu(viewId, x, y) {
        // Remove existing context menu
        const existingMenu = document.querySelector('.activity-context-menu');
        if (existingMenu) existingMenu.remove();

        const menu = document.createElement('div');
        menu.className = 'activity-context-menu';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        const items = [
            { label: 'Hide Activity Bar', action: 'hide' },
            { label: 'Move to Top', action: 'move-top' },
            { label: 'Move to Bottom', action: 'move-bottom' },
            { separator: true },
            { label: 'Reset Location', action: 'reset' }
        ];

        items.forEach(item => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.className = 'menu-separator';
                menu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'menu-item';
                menuItem.textContent = item.label;
                menuItem.addEventListener('click', () => {
                    this.handleContextMenuAction(viewId, item.action);
                    menu.remove();
                });
                menu.appendChild(menuItem);
            }
        });

        document.body.appendChild(menu);

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
     * Handle context menu actions
     */
    handleContextMenuAction(viewId, action) {
        switch (action) {
            case 'hide':
                // Hide activity bar (would need workspace manager integration)
                this.onViewAction('hide-activity-bar');
                break;
            case 'move-top':
            case 'move-bottom':
            case 'reset':
                // These would require reordering logic
                console.log(`Action ${action} for view ${viewId}`);
                break;
        }
    }

    /**
     * Show settings menu
     */
    showSettingsMenu() {
        // This would show a dropdown menu with settings options
        const button = this.element.querySelector('[data-view="settings"]');
        if (!button) return;

        const rect = button.getBoundingClientRect();
        
        // Create and show menu (simplified for now)
        console.log('Show settings menu at', rect);
    }

    /**
     * Show account menu
     */
    showAccountMenu() {
        // This would show account options
        const button = this.element.querySelector('[data-view="account"]');
        if (!button) return;

        const rect = button.getBoundingClientRect();
        
        // Create and show menu (simplified for now)
        console.log('Show account menu at', rect);
    }

    /**
     * Get current view
     */
    getCurrentView() {
        return this.currentView;
    }

    /**
     * Get all badge counts
     */
    getBadges() {
        return new Map(this.badges);
    }

    /**
     * Clear all badges
     */
    clearAllBadges() {
        this.badges.clear();
        this.element.querySelectorAll('.activity-badge-container').forEach(container => {
            container.style.display = 'none';
        });
    }

    /**
     * Enable/disable a view
     */
    setViewEnabled(viewId, enabled) {
        const button = this.element.querySelector(`[data-view="${viewId}"]`);
        if (!button) return;

        button.disabled = !enabled;
        button.classList.toggle('disabled', !enabled);
    }

    /**
     * Add custom styles for activity bar context menu
     */
    static injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .activity-badge-container {
                position: absolute;
                top: 4px;
                right: 4px;
            }
            
            .activity-badge {
                background: var(--error-color);
                color: white;
                font-size: 10px;
                font-weight: 600;
                padding: 1px 4px;
                border-radius: 10px;
                min-width: 18px;
                text-align: center;
                display: inline-block;
            }
            
            .activity-context-menu {
                background: var(--bg-tertiary);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
                padding: var(--spacing-xs);
                min-width: 150px;
                z-index: 1000;
            }
            
            .activity-btn.disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }
}

// Auto-inject styles when module is loaded
ActivityBar.injectStyles();