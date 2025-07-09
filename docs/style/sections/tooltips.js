(function() {
    'use strict';

    const createTooltipsSection = () => {
        const section = document.createElement('section');
        
        const title = 'Tooltips';
        const blurb = 'Tooltips display informative text when users hover over, focus on, or tap an element.';

        const h2 = document.createElement('h2');
        h2.textContent = title;
        section.appendChild(h2);

        const p = document.createElement('p');
        p.className = 'text-lg text-secondary';
        p.textContent = blurb;
        section.appendChild(p);

        const content = document.createElement('div');

        const h5 = document.createElement('h5');
        h5.textContent = 'Tooltip Examples';
        content.appendChild(h5);

        const demoRow = document.createElement('div');
        demoRow.className = 'demo-row';
        demoRow.style.justifyContent = 'center';
        demoRow.style.gap = 'var(--space-4)';
        demoRow.style.marginTop = 'var(--space-8)';
        content.appendChild(demoRow);

        const positions = ['top', 'bottom', 'left', 'right'];
        positions.forEach(position => {
            const button = UI.button({ text: `Tooltip on ${position}` });
            UI.tooltip(button, `This is a '${position}' tooltip.`, position);
            demoRow.appendChild(button);
        });
        
        const panel = UI.panel('', content, {
            icon: 'message-square',
            collapsible: false
        });

        section.appendChild(panel);

        // Defer tooltip initialization until the DOM is fully loaded and ready
        document.addEventListener('DOMContentLoaded', () => {
            const buttons = content.querySelectorAll('.demo-row .btn');
            buttons.forEach((button, index) => {
                const position = positions[index];
                if (button) { // Ensure button exists
                    UI.tooltip(button, `This is a '${position}' tooltip.`, position);
                }
            });
        });

        return section;
    };

    // Expose the function to the global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.tooltips = createTooltipsSection;

})(); 