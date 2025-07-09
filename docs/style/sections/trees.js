(function() {
    if (!window.UI) window.UI = {};
    if (!UI.sections) UI.sections = {};

    UI.sections.trees = function() {
        // --- Main container for the section ---
        const content = document.createElement('div');
        content.className = 'row';

        const callout = document.createElement('div');
        callout.className = 'callout callout-info col-12';
        callout.innerHTML = `
            <i data-lucide="info" class="icon"></i>
            <p>Trees are used to display hierarchical data. They can be used to represent a file system, a set of nested categories, or any other data that has a parent-child relationship.</p>
        `;
        content.appendChild(callout);

        const h5 = document.createElement('h5');
        h5.textContent = 'Tree Examples';
        h5.className = 'col-12';
        content.appendChild(h5);

        // --- Data for Trees ---
        const treeData1 = [
            { label: 'Documents', icon: 'folder', children: [
                { label: 'Work', icon: 'folder', children: [
                    { label: 'project-alpha.docx', icon: 'file-text' },
                    { label: 'project-beta.docx', icon: 'file-text' },
                ]},
                { label: 'Personal', icon: 'folder', children: [ { label: 'TODO.md', icon: 'list-checks' } ] }
            ]},
            { label: 'report.pdf', icon: 'file-text' }
        ];
        
        const treeData2 = [
            { label: 'Assets', icon: 'archive', startExpanded: true, children: [
                { label: 'Images', icon: 'image', startExpanded: true, children: [
                    { label: 'background.png', icon: 'file-image' },
                    { label: 'logo.svg', icon: 'file-image' },
                ]},
                { label: 'Stylesheets', icon: 'file-type-2', children: [ { label: 'main.css' } ] }
            ]},
            { label: 'index.html', icon: 'file-code' }
        ];

        const treeData3 = [
            { label: 'Project Root', icon: 'folder-git-2', children: [
                { label: '.vscode', icon: 'folder', children: [{label: 'settings.json'}] },
                { label: 'src', icon: 'folder-code', children: [
                    { label: 'components', icon: 'folder', children: [
                        { label: 'Button.js' }, { label: 'Card.js' }
                    ]},
                    { label: 'styles', icon: 'folder', children: [{label: 'main.css'}] },
                    { label: 'App.js' }
                ]},
                { label: 'package.json', icon: 'file-json' },
                { label: 'README.md', icon: 'file-text' },
            ]}
        ];

        // --- Create Tree Examples in a Grid ---
        const createTreeExample = (title, data) => {
            const col = document.createElement('div');
            col.className = 'col-4';
            const h6 = document.createElement('h6');
            h6.className = 'text-secondary';
            h6.textContent = title;
            col.appendChild(h6);
            col.appendChild(UI.tree(data));
            return col;
        };

        content.appendChild(createTreeExample('Standard Tree', treeData1));
        content.appendChild(createTreeExample('Pre-expanded Tree', treeData2));
        content.appendChild(createTreeExample('Complex File System', treeData3));

        return UI.panel('Trees', content, { 
            icon: 'file-tree',
            collapsible: true,
            startCollapsed: false
        });
    };
})(); 