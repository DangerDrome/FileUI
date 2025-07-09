(function() {
    'use strict';

    const createMenusSection = () => {
        const content = document.createElement('div');

        const p = document.createElement('p');
        p.textContent = 'Menus provide a list of choices to the user. They can be triggered by buttons or other elements.';
        content.appendChild(p);

        const demoRow = document.createElement('div');
        demoRow.className = 'demo-row';
        content.appendChild(demoRow);

        const menuConfig1 = {
            trigger: {
                text: 'File',
                icon: 'chevron-down'
            },
            items: [
                { text: 'New File', icon: 'file-plus', shortcut: 'Ctrl+N', onClick: () => UI.toast.show('New File clicked') },
                { text: 'New Window', icon: 'app-window', shortcut: 'Ctrl+Shift+N', onClick: () => UI.toast.show('New Window clicked') },
                { type: 'divider' },
                { text: 'Open File...', icon: 'file', shortcut: 'Ctrl+O', onClick: () => UI.toast.show('Open File clicked') },
                { text: 'Open Folder...', icon: 'folder', shortcut: 'Ctrl+K Ctrl+O', onClick: () => UI.toast.show('Open Folder clicked') },
                { type: 'divider' },
                { text: 'Save', icon: 'save', shortcut: 'Ctrl+S', onClick: () => UI.toast.show('Save clicked') },
                { text: 'Save As...', icon: 'save', shortcut: 'Ctrl+Shift+S', onClick: () => UI.toast.show('Save As clicked') },
            ]
        };

        const menuConfig2 = {
            trigger: {
                text: 'Options',
                icon: 'settings-2'
            },
            items: [
                { text: 'Settings', icon: 'settings', onClick: () => UI.toast.show('Settings clicked') },
                { text: 'Extensions', icon: 'puzzle', onClick: () => UI.toast.show('Extensions clicked') },
                { type: 'divider' },
                { text: 'Command Palette...', icon: 'terminal', shortcut: 'Ctrl+Shift+P', onClick: () => UI.toast.show('Command Palette clicked') },
            ]
        };

        const menuConfig3 = {
            trigger: {
                text: 'Share',
                icon: 'share-2'
            },
            items: [
                { text: 'Copy Link', icon: 'link' },
                { text: 'Email', icon: 'mail' },
                { text: 'Send to Device', icon: 'smartphone' },
                { type: 'divider' },
                { 
                    text: 'More Options', 
                    icon: 'more-horizontal',
                    children: [
                        { text: 'Embed', icon: 'code' },
                        { text: 'Save to Cloud', icon: 'cloud-upload' },
                        { 
                            text: 'Export As...', 
                            icon: 'file-output',
                            children: [
                                { text: 'PDF' },
                                { text: 'PNG' },
                                { text: 'SVG' }
                            ]
                        }
                    ]
                }
            ]
        };

        demoRow.appendChild(UI.menu(menuConfig1));
        demoRow.appendChild(UI.menu(menuConfig2));
        demoRow.appendChild(UI.menu(menuConfig3));

        // --- Menu Bar Example ---
        const h5 = document.createElement('h5');
        h5.textContent = 'Menu Bar';
        h5.style.marginTop = 'var(--space-8)';
        content.appendChild(h5);

        const menuBar = document.createElement('div');
        menuBar.className = 'menu-bar';

        const menuBarData = [
            {
                trigger: { text: 'File', variant: 'ghost' },
                items: [
                    { text: 'New File', icon: 'file-plus', shortcut: 'Ctrl+N' },
                    { text: 'Open File...', icon: 'file', shortcut: 'Ctrl+O' },
                    { type: 'divider' },
                    { text: 'Save', icon: 'save', shortcut: 'Ctrl+S' },
                    { text: 'Save As...', icon: 'save', shortcut: 'Ctrl+Shift+S' },
                    { type: 'divider' },
                    { text: 'Exit' },
                ]
            },
            {
                trigger: { text: 'Edit', variant: 'ghost' },
                items: [
                    { text: 'Undo', shortcut: 'Ctrl+Z' },
                    { text: 'Redo', shortcut: 'Ctrl+Y' },
                    { type: 'divider' },
                    { text: 'Cut', shortcut: 'Ctrl+X' },
                    { text: 'Copy', shortcut: 'Ctrl+C' },
                    { text: 'Paste', shortcut: 'Ctrl+V' },
                ]
            },
            {
                trigger: { text: 'Selection', variant: 'ghost' },
                items: [
                    { text: 'Select All', shortcut: 'Ctrl+A' },
                    { text: 'Expand Selection' },
                    { text: 'Shrink Selection' },
                ]
            },
            {
                trigger: { text: 'View', variant: 'ghost' },
                items: [
                    { text: 'Command Palette...' },
                    { text: 'Appearance' },
                    { text: 'Editor Layout' },
                ]
            },
            {
                trigger: { text: 'Terminal', variant: 'ghost' },
                items: [
                    { text: 'New Terminal' },
                    { text: 'Split Terminal' },
                ]
            },
            {
                trigger: { text: 'Help', variant: 'ghost' },
                items: [
                    { text: 'Welcome' },
                    { text: 'About' },
                ]
            },
        ];

        menuBarData.forEach(menuConfig => {
            // Add click handlers to show toast for demo purposes
            menuConfig.items.forEach(item => {
                if (!item.type) {
                    item.onClick = () => UI.toast.show(`${item.text} clicked`);
                }
            });
            menuBar.appendChild(UI.menu(menuConfig));
        });

        content.appendChild(menuBar);

        // --- Icon Menu Bars ---
        const h5Icon = document.createElement('h5');
        h5Icon.textContent = 'Icon Menu Bars';
        h5Icon.style.marginTop = 'var(--space-8)';
        content.appendChild(h5Icon);

        const iconMenuContainer = document.createElement('div');
        iconMenuContainer.className = 'demo-row';
        iconMenuContainer.style.alignItems = 'flex-start';
        iconMenuContainer.style.gap = 'var(--space-8)';

        const createIconMenuBar = (containerClass, itemConfig) => {
            const bar = document.createElement('div');
            bar.className = containerClass;
            
            const iconMenuData = [
                { trigger: { icon: 'file', variant: 'ghost' }, items: [{ text: 'New' }, { text: 'Open' }] },
                { trigger: { icon: 'edit', variant: 'ghost' }, items: [{ text: 'Cut' }, { text: 'Copy' }] },
                { trigger: { icon: 'save', variant: 'ghost' }, items: [{ text: 'Save' }, { text: 'Save As...' }] },
                { trigger: { icon: 'settings', variant: 'ghost' }, items: [{ text: 'Preferences' }] }
            ];

            iconMenuData.forEach(menuData => {
                const config = { ...menuData, ...itemConfig };
                config.items.forEach(item => { item.onClick = () => UI.toast.show(`${item.text} clicked`); });
                bar.appendChild(UI.menu(config));
            });
            return bar;
        };
        
        // Horizontal
        const horizontalContainer = document.createElement('div');
        const h6Horizontal = document.createElement('h6');
        h6Horizontal.textContent = 'Horizontal';
        h6Horizontal.className = 'text-secondary';
        horizontalContainer.appendChild(h6Horizontal);
        horizontalContainer.appendChild(createIconMenuBar('menu-bar', {}));
        
        // Vertical
        const verticalContainer = document.createElement('div');
        const h6Vertical = document.createElement('h6');
        h6Vertical.textContent = 'Vertical';
        h6Vertical.className = 'text-secondary';
        verticalContainer.appendChild(h6Vertical);
        verticalContainer.appendChild(createIconMenuBar('menu-bar-vertical', { placement: 'right' }));

        iconMenuContainer.appendChild(horizontalContainer);
        iconMenuContainer.appendChild(verticalContainer);
        content.appendChild(iconMenuContainer);

        // --- Context Menu Example ---
        const h5Context = document.createElement('h5');
        h5Context.textContent = 'Context Menu';
        h5Context.style.marginTop = 'var(--space-8)';
        content.appendChild(h5Context);

        const contextTarget = document.createElement('div');
        contextTarget.className = 'card';
        contextTarget.textContent = 'Right-click me for a context menu.';
        contextTarget.style.height = '100px';
        contextTarget.style.display = 'flex';
        contextTarget.style.alignItems = 'center';
        contextTarget.style.justifyContent = 'center';
        contextTarget.style.border = '2px dashed var(--border-color)';
        
        UI.contextMenu(contextTarget, [
            { text: 'Copy', icon: 'copy', onClick: () => UI.toast.show('Copied!') },
            { text: 'Paste', icon: 'clipboard-paste', onClick: () => UI.toast.show('Pasted!') },
            { type: 'divider' },
            { 
                text: 'Organize', 
                icon: 'folder-git-2', 
                children: [
                    { text: 'Move to...', icon: 'move-right' },
                    { text: 'Archive', icon: 'archive' },
                    { type: 'divider' },
                    { text: 'Delete', icon: 'trash-2' }
                ]
            },
            { text: 'Change Theme', icon: 'paintbrush', onClick: () => UI.toast.show('Theme changed!') }
        ]);

        content.appendChild(contextTarget);

        const panel = UI.panel('Menus', content, {
            icon: 'list',
            collapsible: true,
            startCollapsed: false
        });

        return panel;
    };

    // Expose the function to the global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.menus = createMenusSection;

})(); 