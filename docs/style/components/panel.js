'use strict';

// Ensure the UI namespace exists
window.UI = window.UI || {};

(function(UI) {

    /**
     * Creates a panel component.
     * @param {string} title - The title of the panel.
     * @param {string|HTMLElement} content - The content of the panel.
     * @param {object} [options={}] - The options for the panel.
     * @param {string} [options.icon] - The icon to display in the panel header.
     * @param {boolean} [options.collapsible=false] - Whether the panel is collapsible.
     * @param {boolean} [options.startCollapsed=false] - Whether the panel should be collapsed initially.
     * @returns {HTMLElement} The panel element.
     */
    UI.panel = function(title, content, options = {}) {
        const panel = document.createElement('div');
        panel.className = 'panel';
        if (options.collapsible) {
            panel.classList.add('panel-collapsible');
        }
        if (options.collapsible && options.startCollapsed) {
            panel.classList.add('panel-collapsed');
        }

        // Header
        const header = document.createElement('div');
        header.className = 'panel-header';

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'panel-title';

        if (options.icon) {
            const icon = document.createElement('i');
            icon.setAttribute('data-lucide', options.icon);
            icon.className = 'lucide';
            titleDiv.appendChild(icon);
        }

        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;
        titleDiv.appendChild(titleSpan);

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'panel-actions';

        let toggleButton;
        if (options.collapsible) {
            toggleButton = UI.button({ icon: 'chevron-down' });
            toggleButton.classList.add('panel-toggle');
            actionsDiv.appendChild(toggleButton);
        }

        header.appendChild(titleDiv);
        header.appendChild(actionsDiv);

        // Body
        const body = document.createElement('div');
        body.className = 'panel-body';

        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }

        panel.appendChild(header);
        panel.appendChild(body);

        // Add collapse functionality
        if (options.collapsible && toggleButton) {
            toggleButton.onclick = () => {
                panel.classList.toggle('panel-collapsed');
            };
        }

        // Initialize icons
        UI.deferIcons();

        return panel;
    };

}(window.UI)); 