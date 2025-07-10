(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const sectionData = [
            { name: 'Foundations', children: ['variables', 'colors', 'typography'] },
            { name: 'Layout', children: ['grid', 'panels', 'scrollbars'] },
            { name: 'Components', children: ['buttons', 'cards', 'forms', 'icons', 'menus', 'modals', 'progress', 'spinners', 'tags', 'toasts', 'tooltips', 'trees']},
            { name: 'Patterns', children: ['patterns'] }
        ];

        try {
            // Create the content now that all scripts are loaded via index.html
            UI.sections.createAll(sectionData);

            // Smooth scroll to hash if present
            if (window.location.hash) {
                const element = document.querySelector(window.location.hash);
                if (element) {
                    setTimeout(() => {
                        element.scrollIntoView({ behavior: 'smooth' });
                    }, 500);
                }
            }
        } catch (error) {
            console.error("Error setting up style guide content:", error);
        }
    });

})(); 