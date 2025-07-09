(function() {
    if (!window.UI) window.UI = {};

    /**
     * Creates a card element.
     * @param {string} title - The title of the card.
     * @param {string} content - The HTML content for the card body.
     * @param {object} [options={}] - Options for the card.
     * @param {string} [options.icon] - Lucide icon name for the header.
     * @param {Array<object>} [options.actions] - Action buttons for the header.
     * @param {string} [options.description] - Text for the card footer.
     * @param {string} [options.footer] - HTML content for the card footer.
     * @param {string} [options.class] - Additional CSS classes for the card.
     * @returns {HTMLElement} The card element.
     */
    UI.card = function(config) {
        const { title, content, ...options } = config;
        const card = document.createElement('div');
        card.className = UI.buildClasses('card', options.class);

        if (title) {
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';

            const headerLeft = document.createElement('div');
            headerLeft.className = 'card-header-left';

            if (options.icon) {
                const icon = document.createElement('i');
                icon.setAttribute('data-lucide', options.icon);
                icon.className = 'card-icon lucide';
                headerLeft.appendChild(icon);
            }

            const cardTitle = document.createElement('h3');
            cardTitle.className = 'card-title';
            cardTitle.textContent = title;
            headerLeft.appendChild(cardTitle);

            cardHeader.appendChild(headerLeft);

            if (options.actions) {
                const headerActions = document.createElement('div');
                headerActions.className = 'card-header-actions';
                options.actions.forEach(action => {
                    const btn = UI.button(action.text || '', {
                        icon: action.icon,
                        size: 'sm',
                        variant: action.variant,
                        onclick: action.onclick,
                        class: 'card-action-btn'
                    });
                    headerActions.appendChild(btn);
                });
                cardHeader.appendChild(headerActions);
            }
            card.appendChild(cardHeader);
        }

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        // If content is a string, set it as innerHTML. If it's an element, append it.
        if (typeof content === 'string') {
            cardBody.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            cardBody.appendChild(content);
        }
        
        card.appendChild(cardBody);

        if (options.description || options.footer) {
            const cardFooter = document.createElement('div');
            cardFooter.className = 'card-footer';
            if (options.description) {
                const p = document.createElement('p');
                p.className = 'card-description';
                p.textContent = options.description;
                cardFooter.appendChild(p);
            }
            if (options.footer) {
                const footerContent = document.createElement('div');
                if (typeof options.footer === 'string') {
                    footerContent.innerHTML = options.footer;
                } else if (options.footer instanceof HTMLElement) {
                    footerContent.appendChild(options.footer);
                }
                cardFooter.appendChild(footerContent);
            }
            card.appendChild(cardFooter);
        }

        UI.deferIcons();
        return card;
    };
})(); 