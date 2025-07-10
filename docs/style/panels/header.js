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
            navButton.dataset.sectionTarget = `section-${sectionName}`; // For scroll spy mapping
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

        // --- Scroll Spy: highlight header nav buttons based on scroll position ---
        const initNavScrollSpy = () => {
            const sectionElements = Array.from(document.querySelectorAll('section[id^="section-"]'));
            if (!sectionElements.length) {
                return setTimeout(initNavScrollSpy, 100);
            }

            const headerHeightValue = getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '60px';
            const headerHeight = parseInt(headerHeightValue, 10) || 60;
            const threshold = headerHeight + 20; // consistent with left panel logic

            let currentSectionId = null;

            const onScroll = () => {
                let activeSection = null;
                let smallestOffset = Infinity;
                sectionElements.forEach(sec => {
                    const rect = sec.getBoundingClientRect();
                    const offset = Math.abs(rect.top - threshold);
                    if (rect.top - threshold <= 0 && offset < smallestOffset) {
                        smallestOffset = offset;
                        activeSection = sec;
                    }
                });

                if (!activeSection) return;
                const sectionId = activeSection.id;
                if (sectionId === currentSectionId) return;
                currentSectionId = sectionId;

                const buttons = navContainer.querySelectorAll('.btn');
                buttons.forEach(btn => {
                    if (btn.dataset.sectionTarget === sectionId) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            };

            document.addEventListener('scroll', onScroll, { passive: true });
            onScroll(); // initial highlight
        };

        initNavScrollSpy();
    });

})(); 