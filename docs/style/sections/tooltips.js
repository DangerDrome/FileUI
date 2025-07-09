(function() {
    'use strict';

    const createTooltipsSection = () => {
        const content = document.createElement('div');

        const p = document.createElement('p');
        p.textContent = 'Tooltips display informative text when users hover over, focus on, or tap an element.';
        content.appendChild(p);

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
        
        const panel = UI.panel('Tooltips', content, {
            icon: 'message-square',
            collapsible: true,
            startCollapsed: false
        });

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

        return panel;
    };

    // Expose the function to the global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.tooltips = createTooltipsSection;

})(); 