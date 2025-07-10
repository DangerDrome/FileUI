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

        // --- Scroll Spy: highlight nav tree based on scroll position ---
        function initScrollSpy() {
            const sectionElements = Array.from(document.querySelectorAll('section[id^="section-"]'));
            if (!sectionElements.length) {
                // Sections may not be in the DOM yet; retry shortly.
                return setTimeout(initScrollSpy, 100);
            }

            const headerHeightValue = getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '60px';
            const headerHeight = parseInt(headerHeightValue, 10) || 60;
            const treeRoot = document.querySelector('#navigation-tree-container .tree');
            if (!treeRoot) return;

            let currentSectionId = null;

            const highlightNav = (sectionId) => {
                if (!sectionId || sectionId === currentSectionId) return;
                currentSectionId = sectionId;

                // Clear previous highlights
                treeRoot.querySelectorAll('.selected, .ancestor, .path-sibling-connector').forEach(el => {
                    el.classList.remove('selected', 'ancestor', 'path-sibling-connector');
                });

                const link = treeRoot.querySelector(`a[href="#${sectionId}"]`);
                if (!link) return;

                const contentEl = link.closest('.tree-item-content');
                const itemEl = link.closest('.tree-item');
                if (!contentEl || !itemEl) return;

                contentEl.classList.add('selected');
                itemEl.classList.add('selected');

                // Mark ancestor path
                let ancestor = itemEl.parentElement.closest('.tree-item');
                while (ancestor) {
                    ancestor.classList.add('ancestor');
                    ancestor = ancestor.parentElement.closest('.tree-item');
                }

                // Draw connector lines for path
                treeRoot.querySelectorAll('.tree-item.ancestor').forEach(ancestorLi => {
                    let nextEl = ancestorLi.nextElementSibling;
                    while (nextEl) {
                        if (nextEl.classList.contains('selected') || nextEl.classList.contains('ancestor')) {
                            ancestorLi.classList.add('path-sibling-connector');
                            break;
                        }
                        nextEl = nextEl.nextElementSibling;
                    }
                });
            };

            const onScroll = () => {
                let activeSection = null;
                let smallestOffset = Infinity;
                sectionElements.forEach(sec => {
                    const rect = sec.getBoundingClientRect();
                    const threshold = headerHeight + 20; // account for scroll-margin-top (header + spacing)
                    const offset = Math.abs(rect.top - threshold);
                    if (rect.top - threshold <= 0 && offset < smallestOffset) {
                        smallestOffset = offset;
                        activeSection = sec;
                    }
                });
                if (activeSection) {
                    highlightNav(activeSection.id);
                }
            };

            document.addEventListener('scroll', onScroll, { passive: true });
            // Initial highlight
            onScroll();
        }

        initScrollSpy();

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