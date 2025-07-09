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
            'colors',
            'typography',
            'buttons',
            'cards',
            'modals',
            'toasts',
            'trees',
            'menus',
            'forms',
            'icons',
            'tooltips',
            'tags',
            'grid',
            'panels',
            'spinners',
            'progress',
            'scrollbars',
            'patterns',
            'variables'
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
                sectionsContainer.appendChild(sectionElement);
            } else {
                console.error(`Section "${sectionName}" did not register itself correctly.`);
            }
        }

        try {
            // 1. Load all component scripts first
            for (const path of components) {
                await loadScript(path);
            }
            
            // 2. Then load and render all section scripts
            for (const name of sections) {
                await loadSection(name);
            }

        } catch (error) {
            console.error('Failed to load style guide modules:', error);
        }
    });

})(); 