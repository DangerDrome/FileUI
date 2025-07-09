(function() {
    'use strict';

    const createScrollbarsSection = () => {
        const content = document.createElement('div');
        content.className = 'grid-container';

        const p = document.createElement('p');
        p.textContent = 'Custom scrollbar styles are applied globally to maintain a consistent look and feel across the application.';
        content.appendChild(p);

        const demoContainer = document.createElement('div');
        demoContainer.style.height = '200px';
        demoContainer.style.overflow = 'auto';
        demoContainer.style.border = '1px solid var(--border-color)';
        demoContainer.style.padding = 'var(--space-4)';
        demoContainer.style.borderRadius = 'var(--radius-lg)';
        demoContainer.style.backgroundColor = 'var(--bg-layer-3)';

        let demoContent = '<h5>Scrollable Content</h5>';
        for (let i = 1; i <= 20; i++) {
            demoContent += `<p>This is line ${i} of content to demonstrate the custom scrollbar. Scroll down to see it in action.</p>`;
        }
        demoContainer.innerHTML = demoContent;
        
        content.appendChild(demoContainer);

        const panel = UI.panel('Scrollbars', content, {
            icon: 'move-vertical',
            collapsible: true,
            startCollapsed: false
        });

        return panel;
    };

    // Expose the function to the global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.scrollbars = createScrollbarsSection;

})(); 