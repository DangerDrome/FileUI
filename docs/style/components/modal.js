(function() {
    if (!window.UI) window.UI = {};

    /**
     * Shows a modal dialog.
     * @param {string|HTMLElement} content - The HTML string or element for the modal body.
     * @param {object} [options={}] - Options for the modal.
     * @param {string} [options.title] - The title for the modal header.
     * @param {string} [options.icon] - Lucide icon name for the header.
     * @param {string} [options.size] - The size variant (e.g., 'sm', 'lg').
     * @param {Array<object>} [options.actions] - Action buttons for the footer.
     * @param {boolean} [options.closeOnBackdrop=true] - If the modal should close when clicking the backdrop.
     * @param {function} [options.onclose] - Callback function when the modal is closed.
     * @returns {{modal: HTMLElement, backdrop: HTMLElement, close: function}} The modal elements and close function.
     */
    UI.modal = function(config = {}) {
        const {
            content,
            title = '',
            icon,
            size,
            actions = [],
            closeOnBackdrop = true,
            onclose
        } = config;

        const modal = document.createElement('div');
        modal.className = this.buildClasses('modal', size && `modal-${size}`);

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';

        let cardFooter = null;
        if (actions.length > 0) {
            cardFooter = document.createElement('div');
            // The card component will add its own footer class.
            actions.forEach(action => {
                const btn = this.button(action.text, {
                    variant: action.variant,
                    size: action.size,
                    onclick: () => {
                        if (action.onclick) action.onclick();
                        if (action.closeModal !== false) closeModal();
                    }
                });
                cardFooter.appendChild(btn);
            });
        }

        const card = UI.card({
            title,
            content,
            icon,
            footer: cardFooter,
            actions: title ? [{
                icon: 'x',
                onclick: () => closeModal(),
                ariaLabel: 'Close'
            }] : null
        });
        
        modal.appendChild(card);
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        this.icons();

        requestAnimationFrame(() => {
            backdrop.classList.add('show');
            modal.classList.add('show');
        });

        const closeModal = () => {
            backdrop.classList.remove('show');
            modal.classList.remove('show');
            
            // Allow animation to complete before removing from DOM
            setTimeout(() => {
                backdrop.remove();
                document.removeEventListener('keydown', escapeHandler);
            }, CONFIG.MODAL_ANIMATION_DURATION); // Match this with --transition-base

            if (onclose) onclose();
        };

        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };

        backdrop.onclick = (e) => {
            if (e.target === backdrop && closeOnBackdrop) {
                closeModal();
            }
        };
        
        document.addEventListener('keydown', escapeHandler);

        return { modal, backdrop, close: closeModal };
    };
})(); 