'use strict';

if (!window.UI) {
    window.UI = {};
}

(function(UI) {

    /**
     * Creates a form group with a label and an input control.
     * @param {object} config - The configuration for the form group.
     * @param {string} config.id - The unique ID for the input, used for the 'for' attribute.
     * @param {string} config.label - The text for the label.
     * @param {string} [config.type='text'] - The type of the input control (e.g., 'text', 'email', 'textarea').
     * @param {string} [config.placeholder=''] - The placeholder text for the input.
     * @param {string} [config.value=''] - The initial value of the input.
     * @returns {HTMLElement} The form group element.
     */
    UI.formGroup = function(config) {
        const { id, label, type = 'text', placeholder = '', value = '' } = config;

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label;
        formGroup.appendChild(labelEl);

        let controlEl;
        if (type === 'textarea') {
            controlEl = document.createElement('textarea');
            controlEl.textContent = value;
        } else {
            controlEl = document.createElement('input');
            controlEl.type = type;
            controlEl.value = value;
        }
        
        controlEl.id = id;
        controlEl.className = 'form-control';
        controlEl.placeholder = placeholder;

        formGroup.appendChild(controlEl);

        return formGroup;
    };

    /**
     * Creates a custom select/dropdown component that is fully stylable.
     * @param {object} config - The configuration for the select group.
     * @param {string} config.id - The unique ID for the select.
     * @param {string} config.label - The text for the label.
     * @param {Array<object>} config.options - Array of options. {value: string, text: string}
     * @returns {HTMLElement} The form group element.
     */
    UI.customSelectGroup = function(config) {
        const { id, label, options = [] } = config;

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label;
        formGroup.appendChild(labelEl);

        const selectContainer = document.createElement('div');
        selectContainer.className = 'custom-select';

        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = id;
        hiddenInput.name = id;
        
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'form-control custom-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const triggerValue = document.createElement('span');
        trigger.appendChild(triggerValue);

        const panel = document.createElement('div');
        panel.className = 'custom-select-panel';
        panel.setAttribute('role', 'listbox');

        options.forEach((opt, index) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'custom-select-option';
            optionEl.dataset.value = opt.value;
            optionEl.textContent = opt.text;
            optionEl.setAttribute('role', 'option');
            optionEl.setAttribute('aria-selected', 'false');
            optionEl.tabIndex = -1;

            if (index === 0) {
                triggerValue.textContent = opt.text;
                hiddenInput.value = opt.value;
                optionEl.classList.add('selected');
                optionEl.setAttribute('aria-selected', 'true');
            }

            optionEl.addEventListener('click', () => {
                triggerValue.textContent = optionEl.textContent;
                hiddenInput.value = optionEl.dataset.value;

                panel.querySelectorAll('.custom-select-option').forEach(o => {
                    o.classList.remove('selected');
                    o.setAttribute('aria-selected', 'false');
                });
                optionEl.classList.add('selected');
                optionEl.setAttribute('aria-selected', 'true');

                closePanel();
            });

            panel.appendChild(optionEl);
        });

        selectContainer.appendChild(hiddenInput);
        selectContainer.appendChild(trigger);
        selectContainer.appendChild(panel);

        const openPanel = () => {
            selectContainer.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
            document.addEventListener('click', handleOutsideClick, true);
        };

        const closePanel = () => {
            selectContainer.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
            document.removeEventListener('click', handleOutsideClick, true);
        };

        const handleOutsideClick = (e) => {
            if (!selectContainer.contains(e.target)) {
                closePanel();
            }
        };
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectContainer.classList.contains('open')) {
                closePanel();
            } else {
                openPanel();
            }
        });

        formGroup.appendChild(selectContainer);

        return formGroup;
    };

    /**
     * Creates a single checkbox control.
     * @param {object} config - The configuration for the checkbox.
     * @param {string} config.id - The unique ID for the input.
     * @param {string} config.label - The text for the label.
     * @param {string} [config.name] - The name for the input.
     * @param {boolean} [config.checked=false] - If the checkbox is checked by default.
     * @param {string} [config.variant] - Semantic color variant.
     * @returns {HTMLElement} The checkbox label element containing the input and custom checkmark.
     */
    UI.checkbox = function(config) {
        const { id, label, name, checked = false, variant } = config;

        const labelEl = document.createElement('label');
        labelEl.className = `checkbox ${variant ? `checkbox-${variant}` : ''}`;
        labelEl.setAttribute('for', id);

        const inputEl = document.createElement('input');
        inputEl.type = 'checkbox';
        inputEl.id = id;
        if (name) inputEl.name = name;
        inputEl.checked = checked;

        const checkmark = document.createElement('span');
        checkmark.className = 'checkmark';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = label;

        labelEl.appendChild(inputEl);
        labelEl.appendChild(checkmark);
        labelEl.appendChild(textSpan);

        return labelEl;
    };

    /**
     * Creates a single radio button control.
     * @param {object} config - The configuration for the radio button.
     * @param {string} config.id - The unique ID for the input.
     * @param {string} config.label - The text for the label.
     * @param {string} config.name - The name for the input (required for grouping).
     * @param {boolean} [config.checked=false] - If the radio is checked by default.
     * @param {string} [config.variant] - Semantic color variant.
     * @returns {HTMLElement} The radio label element containing the input and custom radiomark.
     */
    UI.radio = function(config) {
        const { id, label, name, checked = false, variant } = config;
        
        const labelEl = document.createElement('label');
        labelEl.className = `radio ${variant ? `radio-${variant}` : ''}`;
        labelEl.setAttribute('for', id);

        const inputEl = document.createElement('input');
        inputEl.type = 'radio';
        inputEl.id = id;
        inputEl.name = name; // Important for radio group behavior
        inputEl.checked = checked;

        const radiomark = document.createElement('span');
        radiomark.className = 'radiomark';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = label;

        labelEl.appendChild(inputEl);
        labelEl.appendChild(radiomark);
        labelEl.appendChild(textSpan);

        return labelEl;
    };

    /**
     * Creates a range slider form group.
     * @param {object} config - The configuration for the range slider.
     * @param {string} config.id - The unique ID for the input.
     * @param {string} config.label - The text for the label.
     * @param {number} [config.min=0] - The minimum value.
     * @param {number} [config.max=100] - The maximum value.
     * @param {number} [config.step=1] - The step increment.
     * @param {number} [config.value=50] - The initial value.
     * @returns {HTMLElement} The form group element.
     */
    UI.rangeGroup = function(config) {
        const { id, label, min = 0, max = 100, step = 1, value = 50 } = config;

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const labelWrapper = document.createElement('div');
        labelWrapper.style.display = 'flex';
        labelWrapper.style.justifyContent = 'space-between';
        labelWrapper.style.alignItems = 'center';
        labelWrapper.style.marginBottom = 'var(--space-2)';

        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label;
        labelEl.style.marginBottom = '0'; // Override default margin

        const valueSpan = document.createElement('span');
        valueSpan.className = 'text-secondary font-mono';
        valueSpan.textContent = value;
        
        labelWrapper.appendChild(labelEl);
        labelWrapper.appendChild(valueSpan);

        const inputEl = document.createElement('input');
        inputEl.type = 'range';
        inputEl.id = id;
        inputEl.className = 'form-control';
        inputEl.min = min;
        inputEl.max = max;
        inputEl.step = step;
        inputEl.value = value;
        
        inputEl.addEventListener('input', (e) => {
            valueSpan.textContent = e.target.value;
        });
        
        formGroup.appendChild(labelWrapper);
        formGroup.appendChild(inputEl);

        return formGroup;
    };

    /**
     * Creates a themed date picker form group.
     * @param {object} config - The configuration for the date picker.
     * @param {string} config.id - The unique ID for the input.
     * @param {string} config.label - The text for the label.
     * @param {string} [config.value] - The initial date value.
     * @returns {HTMLElement} The form group element.
     */
    UI.dateGroup = function(config) {
        const { id, label, value } = config;

        const formGroup = UI.formGroup({ id, label, type: 'text', value: value || '', placeholder: 'Select a date' });
        const inputEl = formGroup.querySelector('input');
        
        // Wrap input to add icon
        const inputWrapper = document.createElement('div');
        inputWrapper.style.position = 'relative';
        
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'calendar');
        icon.style.position = 'absolute';
        icon.style.right = 'var(--space-3)';
        icon.style.top = '50%';
        icon.style.transform = 'translateY(-50%)';
        icon.style.pointerEvents = 'none';
        icon.style.color = 'var(--text-tertiary)';
        
        inputWrapper.appendChild(inputEl.cloneNode(true));
        inputWrapper.appendChild(icon);
        formGroup.replaceChild(inputWrapper, inputEl);
        
        const realInput = formGroup.querySelector('input');
        
        // Defer initialization
        setTimeout(() => {
            new Datepicker(realInput, {
                autohide: true,
                format: 'yyyy-mm-dd',
                buttonClass: 'btn'
            });
            UI.deferIcons();
        }, 0);

        return formGroup;
    };
    
    /**
     * Creates a themed color picker form group.
     * @param {object} config - The configuration for the color picker.
     * @param {string} config.id - The unique ID for the input.
     * @param {string} config.label - The text for the label.
     * @param {string} [config.value='#b5d3b6'] - The initial color value.
     * @returns {HTMLElement} The form group element.
     */
    UI.colorGroup = function(config) {
        const { id, label, value = '#b5d3b6' } = config;

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label;
        formGroup.appendChild(labelEl);
        
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = 'var(--space-2)';

        const colorSwatch = document.createElement('button');
        colorSwatch.type = 'button';
        colorSwatch.className = 'form-control';
        colorSwatch.style.width = '48px';
        colorSwatch.style.height = '38px';
        colorSwatch.style.flexShrink = '0';
        colorSwatch.style.padding = 'var(--space-1)';
        colorSwatch.style.backgroundColor = value;

        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.id = id;
        inputEl.className = 'form-control';
        inputEl.value = value;
        
        wrapper.appendChild(colorSwatch);
        wrapper.appendChild(inputEl);
        formGroup.appendChild(wrapper);

        // Defer initialization
        setTimeout(() => {
            const picker = new Picker({
                parent: colorSwatch,
                popup: 'right', // 'right'(default), 'left', 'top', 'bottom'
                color: value,
                editor: false,
                alpha: false
            });

            picker.onChange = function(color) {
                const hex = color.hex.slice(0, 7);
                colorSwatch.style.backgroundColor = hex;
                inputEl.value = hex;
            };

            inputEl.addEventListener('change', () => {
                picker.setColor(inputEl.value, true);
            });
        }, 0);

        return formGroup;
    };

}(window.UI)); 