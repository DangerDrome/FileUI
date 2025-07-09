(function() {
    if (!window.UI) window.UI = {};

    /**
     * Creates a button element.
     * @param {string} text - The text content of the button.
     * @param {object} [options={}] - The options for the button.
     * @param {string} [options.icon] - The Lucide icon name.
     * @param {string} [options.variant] - The color variant (e.g., 'primary', 'success').
     * @param {string} [options.size] - The size variant (e.g., 'sm', 'lg').
     * @param {boolean} [options.mono] - Whether to use a monospace font.
     * @param {string} [options.class] - Additional CSS classes.
     * @param {function} [options.onclick] - The click event handler.
     * @param {boolean} [options.disabled] - Whether the button is disabled.
     * @returns {HTMLButtonElement} The button element.
     */
    UI.button = function(config = {}) {
        // Support legacy call signature: UI.button(text, options)
        if (typeof config === 'string') {
            config = { text: config, ...arguments[1] };
        }

        const {
            text,
            icon,
            variant,
            size,
            mono,
            class: customClass,
            onclick,
            disabled,
            iconPosition = 'left'
        } = config;

        const btn = document.createElement('button');
        const isIconOnly = icon && !text;

        btn.className = UI.buildClasses(
            'btn',
            variant && `btn-${variant}`,
            size && `btn-${size}`,
            mono && 'font-mono',
            isIconOnly && 'icon-only',
            customClass
        );

        const textSpan = text ? document.createElement('span') : null;
        if (textSpan) {
            textSpan.textContent = text;
        }

        if (icon) {
            const iconEl = document.createElement('i');
            iconEl.setAttribute('data-lucide', icon);
            iconEl.className = 'lucide';

            if (iconPosition === 'right' && textSpan) {
                btn.appendChild(textSpan);
                btn.appendChild(iconEl);
            } else {
                btn.appendChild(iconEl);
                if (textSpan) {
                    btn.appendChild(textSpan);
                }
            }
        } else if (textSpan) {
            btn.appendChild(textSpan);
        }


        if (onclick) btn.onclick = onclick;
        if (disabled) btn.disabled = true;

        if (config.attributes) {
            for (const [key, value] of Object.entries(config.attributes)) {
                btn.setAttribute(key, value);
            }
        }

        UI.deferIcons();

        return btn;
    };
})(); 