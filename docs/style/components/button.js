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

    /**
     * Creates a stateful icon toggle button.
     * @param {object} [options={}] - The options for the button.
     * @param {string} options.iconOn - The Lucide icon for the 'on' state.
     * @param {string} options.iconOff - The Lucide icon for the 'off' state.
     * @param {string} [options.tooltip] - Tooltip to display.
     * @param {function} [options.initialState] - Function that returns the initial state (true/false).
     * @param {function} [options.onchange] - Callback function when the state changes.
     * @returns {HTMLButtonElement} The button element.
     */
    UI.iconToggle = function(config = {}) {
        const {
            iconOn,
            iconOff,
            tooltip,
            initialState,
            onchange
        } = config;
        
        let isChecked = initialState ? initialState() : false;

        const btn = UI.button({
            icon: isChecked ? iconOff : iconOn,
            onclick: (e) => {
                isChecked = !isChecked;
                const button = e.currentTarget;
                const newIconName = isChecked ? iconOff : iconOn;
                
                button.innerHTML = `<i data-lucide="${newIconName}"></i>`;
                
                lucide.createIcons({
                    nodes: [button]
                });

                if (onchange) onchange(isChecked);
            }
        });

        if (tooltip) {
            UI.tooltip(btn, tooltip);
        }
        
        // Initial state action
        if (onchange) {
            onchange(isChecked);
        }

        return btn;
    };

    /**
     * Creates a button that cycles through multiple states.
     * @param {object} [config={}] - The options for the button.
     * @param {Array<object>} config.states - Array of state objects { value: string, icon: string }.
     * @param {function} [config.initialState] - Function that returns the initial value.
     * @param {function} [config.onchange] - Callback with the new value.
     * @param {string} [config.tooltip] - Base tooltip text.
     * @returns {HTMLButtonElement} The button element.
     */
    UI.cycleButton = function(config = {}) {
        const {
            states,
            initialState,
            onchange,
            tooltip
        } = config;
        
        let currentIndex = 0;
        if (initialState) {
            const initialValue = initialState();
            const foundIndex = states.findIndex(s => s.value === initialValue);
            if (foundIndex !== -1) {
                currentIndex = foundIndex;
            }
        }

        const btn = UI.button({
            icon: states[currentIndex].icon,
            onclick: (e) => {
                currentIndex = (currentIndex + 1) % states.length;
                const newState = states[currentIndex];
                const button = e.currentTarget;
                
                button.innerHTML = `<i data-lucide="${newState.icon}"></i>`;
                lucide.createIcons({ nodes: [button] });
                
                if (tooltip) {
                    UI.tooltip(button, `${tooltip}: ${newState.value}`);
                }
                
                if (onchange) {
                    onchange(newState.value);
                }
            }
        });

        if (tooltip) {
            UI.tooltip(btn, `${tooltip}: ${states[currentIndex].value}`);
        }

        if (onchange) {
            onchange(states[currentIndex].value);
        }

        return btn;
    };

    /**
     * Creates a button that cycles through multiple color states.
     * @param {object} [config={}] - The options for the button.
     * @param {Array<object>} config.states - Array of state objects { value: string, colorVar: string }.
     * @param {function} [config.initialState] - Function that returns the initial value.
     * @param {function} [config.onchange] - Callback with the new state object.
     * @param {string} [config.tooltip] - Base tooltip text.
     * @returns {HTMLButtonElement} The button element.
     */
    UI.cycleSwatch = function(config = {}) {
        const {
            states,
            initialState,
            onchange,
            tooltip
        } = config;

        let currentIndex = 0;
        if (initialState) {
            const initialValue = initialState();
            const foundIndex = states.findIndex(s => s.value === initialValue);
            if (foundIndex !== -1) {
                currentIndex = foundIndex;
            }
        }

        const btn = document.createElement('button');
        btn.className = 'btn btn-swatch';

        const updateState = (index, isInitial = false) => {
            currentIndex = index;
            const state = states[currentIndex];
            btn.style.backgroundColor = `var(${state.colorVar})`;

            if (tooltip) {
                UI.tooltip(btn, `${tooltip}: ${state.value}`);
            }
            if (onchange && !isInitial) {
                onchange(state);
            }
        };
        
        btn.addEventListener('click', () => {
            const nextIndex = (currentIndex + 1) % states.length;
            updateState(nextIndex);
        });

        updateState(currentIndex, true);
        
        if (onchange) {
            // Set initial state without triggering animation/logic
            onchange(states[currentIndex]);
        }

        return btn;
    };

    /**
     * Creates a color swatch button.
     * @param {object} [options={}] - The options for the swatch.
     * @param {string} options.color - The CSS variable for the color (e.g., 'var(--primary)').
     * @param {string} [options.tooltip] - Tooltip to display.
     * @param {function} [options.onclick] - Callback function when clicked.
     * @returns {HTMLButtonElement} The button element.
     */
    UI.swatch = function(config = {}) {
        const {
            color,
            tooltip,
            onclick
        } = config;

        const btn = document.createElement('button');
        btn.className = 'btn btn-swatch';
        btn.style.backgroundColor = color;

        if (onclick) {
            btn.addEventListener('click', onclick);
        }

        if (tooltip) {
            UI.tooltip(btn, tooltip);
        }

        return btn;
    };
})(); 