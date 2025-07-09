(function() {
    'use strict';

    const createScrollbarsSection = () => {
        const content = document.createElement('div');
        content.className = 'grid-container';

        const callout = document.createElement('div');
        callout.className = 'callout callout-info';
        callout.innerHTML = `
            <i data-lucide="info" class="icon"></i>
            <p>Custom scrollbar styles are applied globally to maintain a consistent look and feel across the application.</p>
        `;
        content.appendChild(callout);

        const h5 = document.createElement('h5');
        h5.textContent = 'Custom Scrollbar Example';
        content.appendChild(h5);

        const demoContainer = document.createElement('div');
        demoContainer.className = 'scrollbar-demo-container';

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