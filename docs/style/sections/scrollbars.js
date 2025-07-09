(function() {
    'use strict';

    const createScrollbarsSection = () => {
        const section = document.createElement('section');

        const title = 'Scrollbars';
        const blurb = 'Custom scrollbar styles are applied globally to maintain a consistent look and feel across the application.';

        const h2 = document.createElement('h2');
        h2.textContent = title;
        section.appendChild(h2);

        const p = document.createElement('p');
        p.className = 'text-lg text-secondary';
        p.textContent = blurb;
        section.appendChild(p);

        const content = document.createElement('div');
        content.className = 'row';

        const createScrollbarExample = (title, containerClass, innerHTML) => {
            const col = document.createElement('div');
            col.className = 'col-6';

            const h5 = document.createElement('h5');
            h5.textContent = title;
            col.appendChild(h5);

            const demoContainer = document.createElement('div');
            demoContainer.className = `scrollbar-demo-container ${containerClass}`;
            demoContainer.innerHTML = innerHTML;
            col.appendChild(demoContainer);

            return col;
        };

        // --- Vertical Scroll Example ---
        let verticalContent = '<h6>Scrollable Content</h6>';
        for (let i = 1; i <= 20; i++) {
            verticalContent += `<p>This is line ${i} of content to demonstrate the custom scrollbar.</p>`;
        }
        content.appendChild(createScrollbarExample('Vertical Scroll', '', verticalContent));
        
        // --- Horizontal Scroll Example ---
        const horizontalContent = `<div class="wide-content"><p>This is some very wide content that will cause the container to scroll horizontally.</p></div>`;
        content.appendChild(createScrollbarExample('Horizontal Scroll', 'scrollbar-demo-horizontal', horizontalContent));

        // --- Both Axes Scroll Example ---
        let bothContent = '<h6>2D Scrollable Content</h6>';
        bothContent += '<div class="wide-content">';
        for (let i = 1; i <= 20; i++) {
            bothContent += `<p>Line ${i}: This is some very wide content to demonstrate both vertical and horizontal scrollbars.</p>`;
        }
        bothContent += '</div>';
        content.appendChild(createScrollbarExample('Both Axes Scroll', 'scrollbar-demo-both', bothContent));

        // --- Styled Scroll Example ---
        let styledContent = '<h6>Styled Content</h6>';
        for (let i = 1; i <= 10; i++) {
            styledContent += `<p>This content is on a different background color to show scrollbar contrast.</p>`;
        }
        content.appendChild(createScrollbarExample('Styled Scroll Container', 'scrollbar-demo-styled', styledContent));

        const panel = UI.panel('', content, {
            icon: 'move-vertical',
            collapsible: false
        });

        section.appendChild(panel);

        return section;
    };

    // Expose the function to the global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.scrollbars = createScrollbarsSection;

})(); 