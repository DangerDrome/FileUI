(function() {
    'use strict';

    const createPatternsSection = () => {
        const content = document.createElement('div');
        content.className = 'grid-container';

        const p = document.createElement('p');
        p.textContent = 'Use these tileable CSS patterns to add subtle background textures to elements. The patterns are applied to a pseudo-element to not interfere with content.';
        content.appendChild(p);

        const patterns = [
            { name: 'Dots', class: 'pattern-dots' },
            { name: 'Lines', class: 'pattern-lines' },
            { name: 'Grid', class: 'pattern-grid' },
            { name: 'Checkerboard', class: 'pattern-checkerboard' }
        ];

        const row = document.createElement('div');
        row.className = 'row';

        patterns.forEach(pattern => {
            const col = document.createElement('div');
            col.className = 'col-6';

            const h5 = document.createElement('h5');
            h5.textContent = pattern.name;
            col.appendChild(h5);

            const demoContainer = document.createElement('div');
            demoContainer.className = `pattern-container ${pattern.class}`;
            col.appendChild(demoContainer);

            row.appendChild(col);
        });
        
        content.appendChild(row);

        const panel = UI.panel('Background Patterns', content, {
            icon: 'grid',
            collapsible: true,
            startCollapsed: false
        });

        return panel;
    };

    // Expose the function to the global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.patterns = createPatternsSection;

})(); 