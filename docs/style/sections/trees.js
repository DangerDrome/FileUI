(function() {
    if (!window.UI) window.UI = {};
    if (!UI.sections) UI.sections = {};

    UI.sections.trees = function() {
        // --- Data for Tree 1 ---
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

        // --- Main container for the section ---
        const content = document.createElement('div');

        const callout = document.createElement('div');
        callout.className = 'callout callout-info';
        callout.innerHTML = `
            <i data-lucide="info" class="icon"></i>
            <p>Trees are used to display hierarchical data. They can be used to represent a file system, a set of nested categories, or any other data that has a parent-child relationship.</p>
        `;
        content.appendChild(callout);

        // --- Standard Tree ---
        const tree1Container = document.createElement('div');
        const title1 = document.createElement('h5');
        title1.textContent = 'Tree Examples';
        tree1Container.appendChild(title1);
        tree1Container.appendChild(UI.tree(treeData1));

        content.appendChild(tree1Container);

        return UI.panel('Trees', content, { 
            icon: 'file-tree',
            collapsible: true,
            startCollapsed: false
        });
    };
})(); 