(function() {
    'use strict';

    if (!window.UI) window.UI = {};

    const createNavigation = (sectionGroups) => {
        const treeContainer = document.getElementById('navigation-tree-container');
        const collapsedContainer = document.getElementById('collapsed-navigation-container');
        if (!treeContainer || !collapsedContainer) {
            console.error('Navigation containers not found.');
            return;
        }

        // --- Icon Mappings ---
        const getIconForSection = (sectionName) => {
            const iconMap = {
                'variables': 'book-marked', 'colors': 'palette', 'typography': 'type',
                'grid': 'layout-grid', 'panels': 'layout-template', 'scrollbars': 'move-vertical',
                'buttons': 'mouse-pointer-click', 'cards': 'square', 'forms': 'text-cursor-input',
                'icons': 'award', 'menus': 'list', 'modals': 'layout', 'progress': 'loader-2',
                'spinners': 'loader', 'tags': 'tag', 'toasts': 'bell', 'tooltips': 'message-square',
                'trees': 'file-tree', 'patterns': 'clone'
            };
            return iconMap[sectionName] || 'box';
        };

        const getIconForGroup = (groupName) => {
            const iconMap = {
                'Foundations': 'book', 'Layout': 'layout', 'Components': 'puzzle', 'Patterns': 'wand'
            };
            return iconMap[groupName] || 'folder';
        };
        
        // --- 1. Build Full Hierarchical Tree ---
        const treeData = sectionGroups.map(group => ({
            label: group.name,
            icon: getIconForGroup(group.name),
            startExpanded: true,
            children: group.children.map(section => ({
                label: section.charAt(0).toUpperCase() + section.slice(1),
                icon: getIconForSection(section),
                href: `#section-${section}`
            }))
        }));
        treeContainer.appendChild(UI.tree(treeData));
        
        // --- 2. Build Collapsed Icon Bar ---
        sectionGroups.forEach(group => {
            group.children.forEach(sectionName => {
                const sectionId = `section-${sectionName}`;
                const button = UI.button({
                    icon: getIconForSection(sectionName),
                    variant: 'ghost',
                    onclick: () => {
                        const element = document.getElementById(sectionId);
                        if (element) element.scrollIntoView({ behavior: 'smooth' });
                    }
                });
                UI.tooltip(button, sectionName.charAt(0).toUpperCase() + sectionName.slice(1), 'right');
                collapsedContainer.appendChild(button);
            });

            // Add a divider after each group, except the last one
            if (sectionGroups.indexOf(group) < sectionGroups.length - 1) {
                const divider = document.createElement('hr');
                divider.className = 'nav-divider';
                collapsedContainer.appendChild(divider);
            }
        });

        // --- Finalize ---
        UI.icons(); 
    };

    UI.createNavigationTree = createNavigation;

})(); 