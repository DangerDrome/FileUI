(function() {
    'use strict';

    function createIconsSection() {
        const content = document.createElement('div');

        const callout = document.createElement('div');
        callout.className = 'callout callout-info';
        callout.innerHTML = `
            <i data-lucide="info" class="icon"></i>
            <p>This project uses the Lucide icon set. The icons are displayed using the data-lucide attribute and are rendered by a script. Below is a categorized list of available icons.</p>
        `;
        content.appendChild(callout);

        const iconData = {
            'Common Icons': ['home', 'user', 'settings', 'search', 'bell', 'mail', 'calendar', 'file', 'folder', 'download', 'upload', 'trash-2'],
            'Action Icons': ['edit', 'save', 'copy', 'share-2', 'plus', 'minus', 'x', 'check', 'refresh-cw', 'more-horizontal', 'filter', 'sort-asc'],
            'Navigation Icons': ['chevron-left', 'chevron-right', 'chevron-up', 'chevron-down', 'arrow-left', 'arrow-right', 'menu', 'grid'],
            'Status Icons': ['check-circle', 'x-circle', 'alert-triangle', 'info', 'help-circle', 'star', 'heart', 'lock'],
            'Media Icons': ['play', 'pause', 'stop-circle', 'skip-back', 'skip-forward', 'volume-2', 'volume-x', 'image', 'video', 'music', 'mic', 'camera'],
            'VFX Type Icons': [
                { name: '3D Models', icon: 'box' }, { name: 'Compositing', icon: 'layers' },
                { name: 'Textures', icon: 'texture' }, { name: 'Sequences', icon: 'clapperboard' },
                { name: 'Projects', icon: 'folder-kanban' }, { name: 'Renders', icon: 'monitor' },
                { name: 'Simulations', icon: 'sparkles' }, { name: 'Materials', icon: 'palette' },
                { name: 'Animation', icon: 'film' }, { name: 'Assets', icon: 'archive' },
                { name: 'Editing', icon: 'pencil-ruler' }, { name: 'Pipeline', icon: 'workflow' }
            ],
            'Animation Type Icons': [
                { name: 'Transform', icon: 'move' }, { name: 'Rotation', icon: 'rotate-cw' },
                { name: 'Scale', icon: 'maximize' }, { name: 'Keyframes', icon: 'key' },
                { name: 'Curves', icon: 'spline' }, { name: 'Rigging', icon: 'anchor' },
                { name: 'Bones', icon: 'bone' }, { name: 'Cycles', icon: 'repeat' },
                { name: 'Easing', icon: 'git-commit-vertical' }, { name: 'Procedural', icon: 'function-square' },
                { name: 'Physics', icon: 'atom' }, { name: 'Timeline', icon: 'gantt-chart' }
            ]
        };

        const colorIconData = {
            'Colored Icons': [
                { name: 'Primary', icon: 'zap', color: 'icon-primary' },
                { name: 'Success', icon: 'check-circle', color: 'icon-success' },
                { name: 'Warning', icon: 'alert-triangle', color: 'icon-warning' },
                { name: 'Error', icon: 'x-circle', color: 'icon-error' },
                { name: 'Info', icon: 'info', color: 'icon-info' },
                { name: 'Accent', icon: 'star', color: 'icon-accent' }
            ]
        };

        // Merge icon data
        Object.assign(iconData, colorIconData);

        for (const category in iconData) {
            const h5 = document.createElement('h5');
            h5.textContent = category;
            content.appendChild(h5);

            const grid = document.createElement('div');
            grid.className = 'icon-grid';

            iconData[category].forEach(data => {
                const iconName = typeof data === 'string' ? data : data.icon;
                const displayName = typeof data === 'string' ? data : data.name;

                const item = document.createElement('div');
                item.className = 'icon-item';
                
                const icon = document.createElement('i');
                icon.setAttribute('data-lucide', iconName);
                if (data.color) {
                    icon.classList.add(data.color);
                }
                
                const name = document.createElement('span');
                name.className = 'icon-item-name';
                name.textContent = displayName;

                item.appendChild(icon);
                item.appendChild(name);
                grid.appendChild(item);
            });
            content.appendChild(grid);
        }

        UI.icons();

        return UI.panel('Icons', content, {
            icon: 'award',
            collapsible: true,
            startCollapsed: false
        });
    }

    // Expose to global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.icons = createIconsSection;

})(); 