(function() {
    'use strict';

    const createTagsSection = () => {
        const content = document.createElement('div');

        const callout = document.createElement('div');
        callout.className = 'callout callout-info';
        callout.innerHTML = `
            <i data-lucide="info" class="icon"></i>
            <p>Tags are used to label, categorize, or organize items using keywords that describe them.</p>
        `;
        content.appendChild(callout);

        // --- Color Variants ---
        const h5Colors = document.createElement('h5');
        h5Colors.textContent = 'Color Variants';
        content.appendChild(h5Colors);

        const colorDemo = document.createElement('div');
        colorDemo.className = 'demo-row';
        
        const colors = ['primary', 'success', 'warning', 'error', 'info', 'neutral', 'accent'];
        colors.forEach(color => {
            const tag = document.createElement('span');
            tag.className = `tag tag-${color}`;
            tag.textContent = color.charAt(0).toUpperCase() + color.slice(1);
            colorDemo.appendChild(tag);
        });
        content.appendChild(colorDemo);

        // --- Size Variants ---
        const h5Sizes = document.createElement('h5');
        h5Sizes.textContent = 'Size Variants';
        content.appendChild(h5Sizes);

        const sizeDemo = document.createElement('div');
        sizeDemo.className = 'demo-row';
        
        const defaultTag = document.createElement('span');
        defaultTag.className = 'tag';
        defaultTag.textContent = 'Default';
        sizeDemo.appendChild(defaultTag);

        const largeTag = document.createElement('span');
        largeTag.className = 'tag tag-lg';
        largeTag.textContent = 'Large';
        sizeDemo.appendChild(largeTag);
        
        content.appendChild(sizeDemo);

        // --- Icon with Text ---
        const h5IconText = document.createElement('h5');
        h5IconText.textContent = 'Icon with Text';
        content.appendChild(h5IconText);

        const iconTextDemo = document.createElement('div');
        iconTextDemo.className = 'demo-row';
        
        const iconMap = {
            primary: 'award',
            success: 'check-circle',
            warning: 'alert-triangle',
            error: 'x-circle',
            info: 'info',
            neutral: 'tag',
            accent: 'star'
        };

        colors.forEach(color => {
            const tag = document.createElement('span');
            tag.className = `tag tag-${color}`;
            tag.innerHTML = `<i data-lucide="${iconMap[color]}" class="lucide"></i><span>${color.charAt(0).toUpperCase() + color.slice(1)}</span>`;
            iconTextDemo.appendChild(tag);
        });

        content.appendChild(iconTextDemo);

        // --- Icon Only ---
        const h5IconOnly = document.createElement('h5');
        h5IconOnly.textContent = 'Icon Only';
        content.appendChild(h5IconOnly);

        const iconOnlyDemo = document.createElement('div');
        iconOnlyDemo.className = 'demo-row';

        colors.forEach(color => {
            const tag = document.createElement('span');
            tag.className = `tag tag-${color} tag-icon-only`;
            tag.innerHTML = `<i data-lucide="${iconMap[color]}" class="lucide"></i>`;
            iconOnlyDemo.appendChild(tag);
        });

        content.appendChild(iconOnlyDemo);
        
        const panel = UI.panel('Tags', content, {
            icon: 'tag',
            collapsible: true,
            startCollapsed: false
        });

        UI.icons();

        return panel;
    };

    // Expose the function to the global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.tags = createTagsSection;

})(); 