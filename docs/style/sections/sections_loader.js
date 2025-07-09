(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function() {
        const sectionsContainer = document.getElementById('sections-container');
        if (!sectionsContainer) {
            console.error('Style guide content container not found!');
            return;
        }

        const components = [
            'components/core.js',
            'components/button.js',
            'components/card.js',
            'components/toast.js',
            'components/modal.js',
            'components/panel.js',
            'components/tree.js',
            'components/menu.js',
            'components/tooltip.js',
            'components/form.js'
        ];

        const sections = [
            {
                name: 'Foundations',
                children: ['variables', 'colors', 'typography']
            },
            {
                name: 'Layout',
                children: ['grid', 'panels', 'scrollbars']
            },
            {
                name: 'Components',
                children: [
                    'buttons', 'cards', 'forms', 'icons', 'menus', 'modals', 'progress', 
                    'spinners', 'tags', 'toasts', 'tooltips', 'trees'
                ]
            },
            {
                name: 'Patterns',
                children: ['patterns']
            }
        ];

        async function loadScript(path) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = `style/${path}`;
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Script load error for ${path}`));
                document.head.appendChild(script);
            });
        }
        
        async function loadSection(sectionName) {
            const path = `sections/${sectionName}.js`;
            await loadScript(path);
            if (UI.sections[sectionName]) {
                const sectionElement = await UI.sections[sectionName]();
                if (sectionElement) {
                    sectionElement.id = `section-${sectionName}`;
                    sectionsContainer.appendChild(sectionElement);
                }
            } else {
                console.error(`Section "${sectionName}" did not register itself correctly.`);
            }
        }

        try {
            // 1. Load all component scripts first
            for (const path of components) {
                await loadScript(path);
            }
            
            // 2. Load navigation tree script
            await loadScript('navigation.js');
            
            // 3. Then load and render all section scripts
            for (const group of sections) {
                const groupHeader = document.createElement('h1');
                groupHeader.className = 'group-header';
                groupHeader.textContent = group.name;
                groupHeader.id = `group-${group.name.toLowerCase().replace(/\s+/g, '-')}`;
                sectionsContainer.appendChild(groupHeader);
                
                for (const name of group.children) {
                    await loadSection(name);
                }
            }

            // 4. Create the navigation tree
            UI.createNavigationTree(sections);

        } catch (error) {
            console.error('Failed to load style guide modules:', error);
        }
    });

})(); 