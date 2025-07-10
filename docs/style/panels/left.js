(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.UI) {
            console.error("UI core not loaded");
            return;
        }

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
                    'trees': 'tree-pine', 'patterns': 'grip'
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

        // This data was previously in sections_loader.js
        const sections = [
            { name: 'Foundations', children: ['variables', 'colors', 'typography'] },
            { name: 'Layout', children: ['grid', 'panels', 'scrollbars'] },
            { name: 'Components', children: ['buttons', 'cards', 'forms', 'icons', 'menus', 'modals', 'progress', 'spinners', 'tags', 'toasts', 'tooltips', 'trees'] },
            { name: 'Patterns', children: ['patterns'] }
        ];

        createNavigation(sections);

        // --- Add toggle logic from old layout.js ---
        const layoutContainer = document.querySelector('.style-guide-layout');
        const leftToggleTrigger = document.getElementById('left-panel-toggle');

        if (layoutContainer && leftToggleTrigger) {
            leftToggleTrigger.addEventListener('click', () => {
                layoutContainer.classList.toggle('collapsed');
            });
        }
    });
})(); 