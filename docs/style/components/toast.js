(function() {
    if (!window.UI) window.UI = {};

    /**
     * Shows a toast notification.
     * @param {string} message - The message to display.
     * @param {string} [type='info'] - The type of toast (info, success, warning, error).
     * @param {object} [options={}] - Options for the toast.
     * @param {number} [options.duration] - How long the toast appears in ms.
     * @param {boolean} [options.dismissible] - If the toast can be closed by the user.
     * @param {object} [options.action] - An action button to show on the toast.
     * @param {string} options.action.text - The text for the action button.
     * @param {function} options.action.callback - The function to call when the action is clicked.
     * @param {boolean} [options.preloader] - Show a loading spinner instead of an icon.
     * @returns {HTMLElement} The toast element.
     */
    UI.toast = function(message, type = 'info', options = {}) {
        message = UI.language.translate(message);
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = CONFIG.TOAST_ICONS;
        let iconHTML = '';
        if (options.preloader) {
            const spinnerClass = type ? `loading-spinner-${type}` : 'loading-spinner';
            iconHTML = `<div class="${spinnerClass} toast-icon"></div>`;
        } else {
            iconHTML = `<i data-lucide="${icons[type] || 'info'}" class="toast-icon lucide"></i>`;
        }

        let toastHTML = `${iconHTML}<span class="toast-message">${message}</span>`;
        if (options.action) {
            toastHTML += `<div class="toast-action"><button class="btn btn-sm">${options.action.text}</button></div>`;
        }
        if (options.dismissible) {
            toastHTML += `<i data-lucide="x" class="toast-close lucide"></i>`;
        }
        toast.innerHTML = toastHTML;

        const progressBar = document.createElement('div');
        progressBar.className = 'toast-progress';
        const duration = options.duration || CONFIG.TOAST_DURATION;
        progressBar.style.setProperty('--toast-duration', duration + 'ms');
        toast.appendChild(progressBar);

        container.appendChild(toast);
        this.icons();

        // Add the slide-in animation class
        toast.classList.add('anim-slideInRight');

        const removeToast = () => {
            clearTimeout(autoRemoveTimeout);
            
            // Remove the slide-in class and add the slide-out class
            toast.classList.remove('anim-slideInRight');
            toast.classList.add('anim-slideOutRight');
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                if (container.children.length === 0) {
                    container.remove();
                }
            }, CONFIG.MODAL_ANIMATION_DURATION);
        };
        
        if (options.action) {
            toast.querySelector('.toast-action button').addEventListener('click', () => {
                options.action.callback();
                removeToast();
            });
        }
        if (options.dismissible) {
            toast.querySelector('.toast-close').addEventListener('click', removeToast);
        }

        const autoRemoveTimeout = setTimeout(removeToast, duration);

        return toast;
    };
})(); 