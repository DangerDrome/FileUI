(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.UI) {
            console.error("UI core not loaded");
            return;
        }

        const headerPanel = document.getElementById('header-panel');
        if (!headerPanel) {
            console.error("Header panel container not found");
            return;
        }

        // Create the main panel header structure
        const panelHeader = document.createElement('div');
        panelHeader.className = 'panel-header';

        // Title / Left Nav Toggle
        const titleDiv = document.createElement('div');
        titleDiv.className = 'panel-title';
        const titleButton = UI.button({
            icon: 'library',
            variant: 'ghost',
            tooltip: 'Toggle Navigation'
        });
        titleButton.addEventListener('click', () => {
            document.querySelector('.style-guide-layout').classList.toggle('collapsed');
        });
        titleDiv.appendChild(titleButton);

        // Horizontal Navigation
        const navContainer = document.createElement('div');
        navContainer.id = 'header-nav-container';
        
        const sections = [
            'variables', 'colors', 'typography', 'grid', 'panels', 'scrollbars',
            'buttons', 'cards', 'forms', 'icons', 'menus', 'modals', 'progress',
            'spinners', 'tags', 'toasts', 'tooltips', 'trees', 'patterns'
        ];
        
        const iconMap = {
            'variables': 'book-marked', 'colors': 'palette', 'typography': 'type',
            'grid': 'layout-grid', 'panels': 'layout-template', 'scrollbars': 'move-vertical',
            'buttons': 'mouse-pointer-click', 'cards': 'square', 'forms': 'text-cursor-input',
            'icons': 'award', 'menus': 'list', 'modals': 'layout', 'progress': 'loader-2',
            'spinners': 'loader', 'tags': 'tag', 'toasts': 'bell', 'tooltips': 'message-square',
            'trees': 'tree-pine', 'patterns': 'grip'
        };

        sections.forEach(sectionName => {
            const label = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
            const navButton = UI.button({
                icon: iconMap[sectionName] || 'box',
                variant: 'ghost',
                tooltip: label,
                onclick: () => {
                    const section = document.getElementById(`section-${sectionName}`);
                    if (section) {
                        section.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
            navContainer.appendChild(navButton);
        });

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'panel-actions';

        const settingsButton = UI.button({
            icon: 'settings',
            variant: 'ghost',
            tooltip: 'Settings'
        });
        settingsButton.addEventListener('click', () => {
            document.getElementById('footer-panel').classList.toggle('visible');
        });
        actionsDiv.appendChild(settingsButton);

        const githubButton = UI.button({
            icon: 'github',
            label: 'GitHub',
            variant: 'ghost',
            onclick: () => {
                window.open('https://github.com/Danger-Noodle/FileUI', '_blank');
            }
        });
        actionsDiv.appendChild(githubButton);

        // Assemble Header
        panelHeader.appendChild(titleDiv);
        panelHeader.appendChild(navContainer);
        panelHeader.appendChild(actionsDiv);

        headerPanel.innerHTML = '';
        headerPanel.appendChild(panelHeader);

        UI.icons();
    });

})(); 