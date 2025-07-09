(function() {
    if (!window.UI) window.UI = {};
    if (!UI.components) UI.components = {};

    /**
     * Creates a collapsible tree component.
     * @param {Array<Object>} items - An array of item objects.
     * @param {string} items[].label - The text to display for the item.
     * @param {string} [items[].icon] - The Lucide icon name for the item.
     * @param {Array<Object>} [items[].children] - An array of child items.
     * @returns {HTMLElement} The tree component container.
     */
    UI.tree = function(items) {
        const container = document.createElement('ul');
        container.className = 'tree';

        function createTree(parent, items) {
            items.forEach(itemData => {
                const li = document.createElement('li');
                li.className = 'tree-item';
                if (itemData.children && itemData.children.length > 0) {
                    if (!itemData.expanded) {
                        li.classList.add('expanded');
                    }
                }

                const isLink = itemData.href && typeof itemData.href === 'string';
                const content = isLink ? document.createElement('a') : document.createElement('div');
                content.className = 'tree-item-content btn btn-ghost';
                if (isLink) {
                    content.href = itemData.href;
                }
                
                const toggle = document.createElement('span');
                toggle.className = 'tree-item-toggle';
                if (itemData.children && itemData.children.length > 0) {
                    const icon = document.createElement('i');
                    icon.setAttribute('data-lucide', 'chevron-down');
                    toggle.appendChild(icon);
                }
                
                content.appendChild(toggle);
                
                if (itemData.icon) {
                    const icon = document.createElement('i');
                    icon.setAttribute('data-lucide', itemData.icon);
                    content.appendChild(icon);
                }
                
                const label = document.createElement('span');
                label.className = 'tree-item-label';
                label.textContent = itemData.label;
                content.appendChild(label);

                li.appendChild(content);

                if (itemData.children && itemData.children.length > 0) {
                    const childrenContainer = document.createElement('ul');
                    childrenContainer.className = 'tree-children';
                    createTree(childrenContainer, itemData.children);
                    li.appendChild(childrenContainer);
                }

                parent.appendChild(li);
            });
        }

        createTree(container, items);

        container.addEventListener('click', function(e) {
            const content = e.target.closest('.tree-item-content');
            if (content) {
                const item = content.parentElement;

                // --- Selection & Snake Logic ---
                // 1. Clear previous state from this tree instance
                container.querySelectorAll('.selected, .ancestor, .path-sibling-connector').forEach(el => {
                    el.classList.remove('selected', 'ancestor', 'path-sibling-connector');
                });

                // 2. Mark the new selected item
                content.classList.add('selected');
                item.classList.add('selected'); // Also mark the LI for ::before styling

                // 3. Mark all parents as ancestors for the snake
                let parent = item.parentElement.closest('.tree-item');
                while (parent) {
                    parent.classList.add('ancestor');
                    parent = parent.parentElement.closest('.tree-item');
                }

                // 4. Identify vertical connectors that should be colored
                container.querySelectorAll('.tree-item.ancestor').forEach(ancestorLi => {
                    let nextEl = ancestorLi.nextElementSibling;
                    while(nextEl) {
                        if (nextEl.classList.contains('selected') || nextEl.classList.contains('ancestor')) {
                            ancestorLi.classList.add('path-sibling-connector');
                            break;
                        }
                        nextEl = nextEl.nextElementSibling;
                    }
                });
                
                // --- Collapse/Expand Logic ---
                if (item.classList.contains('tree-item') && item.querySelector('.tree-children')) {
                    item.classList.toggle('collapsed');
                }

                // --- Click Logic ---
                if (itemData.onclick && typeof itemData.onclick === 'function' && !isLink) {
                    itemData.onclick();
                }
            }
        });
        
        // After creating the tree, render any Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        return container;
    };
})(); 