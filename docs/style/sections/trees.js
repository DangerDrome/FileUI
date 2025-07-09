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

        // --- Standard Tree ---
        const tree1Container = document.createElement('div');
        const title1 = document.createElement('h6');
        title1.textContent = 'Standard Tree';
        title1.className = 'text-secondary';
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