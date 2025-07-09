(function() {
    'use strict';

    const createPatternsSection = () => {
        const section = document.createElement('section');

        const title = 'Background Patterns';
        const blurb = 'Use these tileable CSS patterns to add subtle background textures to elements. The patterns are applied to a pseudo-element to not interfere with content.';
        
        const h2 = document.createElement('h2');
        h2.textContent = title;
        section.appendChild(h2);

        const p = document.createElement('p');
        p.className = 'text-lg text-secondary';
        p.textContent = blurb;
        section.appendChild(p);

        const content = document.createElement('div');
        content.className = 'grid-container';

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

        const panel = UI.panel('', content, {
            icon: 'grid',
            collapsible: false
        });

        section.appendChild(panel);

        return section;
    };

    // Expose the function to the global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.patterns = createPatternsSection;

})(); 