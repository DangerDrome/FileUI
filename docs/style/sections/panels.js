(function() {
    'use strict';

    const createPanelsSection = () => {
        const section = document.createElement('section');

        const title = 'Panels';
        const blurb = 'Panels are versatile containers for organizing content. They can be simple, have icons, and be made collapsible.';
        
        const h2 = document.createElement('h2');
        h2.textContent = title;
        section.appendChild(h2);

        const p = document.createElement('p');
        p.className = 'text-lg text-secondary';
        p.textContent = blurb;
        section.appendChild(p);

        const content = document.createElement('div');
        content.className = 'grid-container';

        // --- Basic Panel ---
        const h5Basic = document.createElement('h5');
        h5Basic.textContent = 'Basic Panel';
        content.appendChild(h5Basic);

        const basicPanelContent = document.createElement('p');
        basicPanelContent.textContent = 'This is a standard panel with a title and content. It serves as the most basic container.';
        const basicPanel = UI.panel('Standard Panel', basicPanelContent);
        content.appendChild(basicPanel);

        // --- Panel with Icon ---
        const h5Icon = document.createElement('h5');
        h5Icon.textContent = 'Panel with Icon';
        content.appendChild(h5Icon);
        
        const iconPanelContent = document.createElement('p');
        iconPanelContent.textContent = 'You can add a Lucide icon to the panel header for better visual identification.';
        const iconPanel = UI.panel('Icon Panel', iconPanelContent, { icon: 'box' });
        content.appendChild(iconPanel);

        // --- Collapsible Panels ---
        const h5Collapsible = document.createElement('h5');
        h5Collapsible.textContent = 'Collapsible Panels';
        content.appendChild(h5Collapsible);
        
        const collapsiblePanelContent1 = document.createElement('p');
        collapsiblePanelContent1.textContent = 'This panel is collapsible and starts in an expanded state.';
        const collapsiblePanel1 = UI.panel('Expanded Collapsible Panel', collapsiblePanelContent1, {
            icon: 'chevrons-down-up',
            collapsible: true,
            startCollapsed: false
        });
        content.appendChild(collapsiblePanel1);
        
        const collapsiblePanelContent2 = document.createElement('p');
        collapsiblePanelContent2.textContent = 'This panel is also collapsible, but it starts in a collapsed state.';
        const collapsiblePanel2 = UI.panel('Collapsed Collapsible Panel', collapsiblePanelContent2, {
            icon: 'chevrons-up-down',
            collapsible: true,
            startCollapsed: true
        });
        content.appendChild(collapsiblePanel2);


        const panel = UI.panel('', content, {
            icon: 'layout-template',
            collapsible: false
        });

        section.appendChild(panel);

        return section;
    };

    // Expose the function to the global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.panels = createPanelsSection;

})(); 