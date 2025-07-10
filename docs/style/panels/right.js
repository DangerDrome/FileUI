(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        // Helper to create a control and its element in one go
        function createControl(controlData) {
            let controlElement;
            const container = document.createElement('div');
            container.className = 'setting-control-container';

            const labelsOnRight = ['Theme', 'Accent', 'Tint', 'Font', 'Spacing', 'Size', 'Stroke', 'Primary', 'Success', 'Warning', 'Error', 'Info', 'Language'];
            if (labelsOnRight.includes(controlData.label)) {
                container.classList.add('label-on-right');
            }

            const showLabel =
                (controlData.type !== 'icon-toggle' &&
                controlData.type !== 'swatch-picker' &&
                controlData.type !== 'cycle-button' &&
                controlData.type !== 'cycle-swatch') || labelsOnRight.includes(controlData.label);

            if (showLabel) {
                const label = document.createElement('span');
                label.className = 'setting-label';
                label.textContent = controlData.label;
                container.appendChild(label);
            }

            switch (controlData.type) {
                case 'toggle':
                    const toggle = document.createElement('input');
                    toggle.type = 'checkbox';
                    toggle.className = 'toggle-switch';
                    if (controlData.initialState) {
                        toggle.checked = controlData.initialState();
                    }
                    if (controlData.action) {
                        if (toggle.checked) {
                             controlData.action(toggle.checked);
                        }
                        toggle.addEventListener('change', () => controlData.action(toggle.checked));
                    }
                    controlElement = toggle;
                    break;
                case 'icon-toggle':
                    controlElement = UI.iconToggle({
                        iconOn: controlData.iconOn,
                        iconOff: controlData.iconOff,
                        initialState: controlData.initialState,
                        onchange: controlData.action,
                        tooltip: controlData.label
                    });
                    break;
                case 'cycle-swatch':
                    controlElement = UI.cycleSwatch({
                        states: controlData.states,
                        initialState: controlData.initialState,
                        onchange: controlData.action,
                        tooltip: controlData.label
                    });
                    break;
                case 'swatch-picker':
                    const swatchBtn = document.createElement('button');
                    swatchBtn.className = 'btn btn-swatch';
                    const initialSwatchColor = getComputedStyle(document.documentElement).getPropertyValue(controlData.property).trim();
                    
                    new Picker({
                        parent: swatchBtn,
                        popup: 'right',
                        color: initialSwatchColor,
                        alpha: false,
                        editor: false,
                        onChange: color => {
                            document.documentElement.style.setProperty(controlData.property, color.hex);
                            swatchBtn.style.backgroundColor = color.hex;
                        }
                    });
                    swatchBtn.style.backgroundColor = initialSwatchColor;
                    UI.tooltip(swatchBtn, controlData.label);
                    controlElement = swatchBtn;
                    break;
                case 'cycle-button':
                    controlElement = UI.cycleButton({
                        states: controlData.states,
                        initialState: controlData.initialState,
                        onchange: controlData.action,
                        tooltip: controlData.label
                    });
                    break;
                case 'color':
                    const pickerContainer = document.createElement('div');
                    const initialColor = getComputedStyle(document.documentElement).getPropertyValue(controlData.property).trim();
                    new Picker({
                        parent: pickerContainer, popup: 'right', color: initialColor, alpha: false, editor: false,
                        onChange: color => {
                            document.documentElement.style.setProperty(controlData.property, color.hex);
                            pickerContainer.style.backgroundColor = color.hex;
                        }
                    });
                    pickerContainer.style.backgroundColor = initialColor;
                    pickerContainer.className = 'color-picker-trigger';
                    controlElement = pickerContainer;
                    break;
                case 'select':
                    controlElement = document.createElement('select');
                    controlElement.className = 'form-control';
                    controlData.options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.text;
                        controlElement.appendChild(option);
                    });
                    break;
                case 'slider':
                    controlElement = document.createElement('input');
                    controlElement.type = 'range';
                    controlElement.className = 'form-control';
                    controlElement.min = controlData.min;
                    controlElement.max = controlData.max;
                    controlElement.step = controlData.step;
                    controlElement.value = controlData.value;
                    break;
            }
            if (controlElement) {
                container.appendChild(controlElement);
            }
            return container;
        }

        function createSettingsControls() {
            const container = document.getElementById('settings-container');
            const collapsedContainer = document.getElementById('collapsed-settings-container');
            if (!container || !collapsedContainer) return;
            container.innerHTML = ''; // Clear previous content
            collapsedContainer.innerHTML = ''; // Clear previous content

            const settingsSections = [
                {
                    id: 'settings-appearance',
                    title: 'Appearance',
                    icon: 'palette',
                    controls: [
                        { 
                            type: 'icon-toggle',
                            label: 'Theme',
                            action: (checked) => document.body.classList.toggle('dark', checked),
                            initialState: () => document.body.classList.contains('dark'),
                            iconOn: 'moon',
                            iconOff: 'sun'
                        },
                        {
                            type: 'cycle-swatch',
                            label: 'Accent',
                            action: (state) => {
                                const root = document.documentElement;
                                root.style.setProperty('--accent', `var(${state.colorVar})`);
                                root.style.setProperty('--accent-hover', `var(${state.colorVar}-hover)`);
                                root.style.setProperty('--accent-text', `var(${state.colorVar}-dark)`);
                            },
                            initialState: () => localStorage.getItem('accent-color-name') || 'default-accent',
                            states: [
                                { value: 'Default', colorVar: '--default-accent' },
                                { value: 'Primary', colorVar: '--primary' },
                                { value: 'Success', colorVar: '--success' },
                                { value: 'Warning', colorVar: '--warning' },
                                { value: 'Error', colorVar: '--error' },
                                { value: 'Info', colorVar: '--info' }
                            ]
                        },
                        {
                            type: 'cycle-button',
                            label: 'Tint',
                            action: (value) => {
                                document.body.dataset.tint = value;
                            },
                            initialState: () => document.body.dataset.tint || 'none',
                            states: [
                                { value: 'none', icon: 'droplet' },
                                { value: 'primary', icon: 'zap' },
                                { value: 'success', icon: 'check-circle' },
                                { value: 'warning', icon: 'alert-triangle' },
                                { value: 'error', icon: 'x-circle' },
                                { value: 'info', icon: 'info' }
                            ]
                        }
                    ]
                },
                {
                    id: 'settings-typography',
                    title: 'Typography',
                    icon: 'type',
                    controls: [
                        {
                            type: 'icon-toggle',
                            label: 'Font',
                            action: (checked) => document.body.classList.toggle('font-mono', checked),
                            initialState: () => document.body.classList.contains('font-mono'),
                            iconOn: 'code',
                            iconOff: 'text'
                        }
                    ]
                },
                {
                    id: 'settings-density',
                    title: 'Density',
                    icon: 'move-vertical',
                    controls: [
                        {
                            type: 'icon-toggle',
                            label: 'Spacing',
                            action: (checked) => document.body.classList.toggle('spacing-compact', checked),
                            initialState: () => document.body.classList.contains('spacing-compact'),
                            iconOn: 'minimize-2',
                            iconOff: 'maximize-2'
                        }
                    ]
                },
                {
                    id: 'settings-icons',
                    title: 'Icons',
                    icon: 'award',
                    controls: [
                        {
                            type: 'icon-toggle',
                            label: 'Size',
                            action: (checked) => document.body.classList.toggle('icons-large', checked),
                            initialState: () => document.body.classList.contains('icons-large'),
                            iconOn: 'zoom-in',
                            iconOff: 'zoom-out'
                        },
                        {
                            type: 'icon-toggle',
                            label: 'Stroke',
                            action: (checked) => document.body.classList.toggle('icons-thick-stroke', checked),
                            initialState: () => document.body.classList.contains('icons-thick-stroke'),
                            iconOn: 'bold',
                            iconOff: 'minus'
                        }
                    ]
                },
                {
                    id: 'settings-colors',
                    title: 'Semantic Colors',
                    icon: 'swatch-book',
                    controls: [
                        { type: 'swatch-picker', label: 'Primary', property: '--primary' },
                        { type: 'swatch-picker', label: 'Success', property: '--success' },
                        { type: 'swatch-picker', label: 'Warning', property: '--warning' },
                        { type: 'swatch-picker', label: 'Error', property: '--error' },
                        { type: 'swatch-picker', label: 'Info', property: '--info' },
                    ]
                },
                {
                    id: 'settings-language',
                    title: 'Language',
                    icon: 'globe',
                    controls: [
                        {
                            type: 'icon-toggle',
                            label: 'Language',
                            action: (checked) => document.documentElement.lang = checked ? 'zh-CN' : 'en',
                            initialState: () => document.documentElement.lang === 'zh-CN',
                            iconOn: 'languages',
                            iconOff: 'text'
                        }
                    ]
                }
            ];

            // --- Build Collapsed Icon Bar ---
            settingsSections.forEach(section => {
                section.controls.forEach(controlData => {
                    const control = createControl(controlData);
                    const interactiveElement = control.querySelector('button, input, select');
                    if (interactiveElement) {
                        collapsedContainer.appendChild(interactiveElement);
                    }
                });
            });

            // --- Transform Data for Tree View ---
            const treeData = settingsSections.map(section => ({
                label: section.title,
                icon: section.icon,
                expanded: true, 
                children: section.controls.map(controlData => {
                    let icon;
                    if ((section.id === 'settings-colors' || section.id === 'settings-appearance') && controlData.type !== 'swatch-picker') {
                        switch (controlData.label) {
                            case 'Primary': icon = 'zap'; break;
                            case 'Success': icon = 'check-circle'; break;
                            case 'Warning': icon = 'alert-triangle'; break;
                            case 'Error': icon = 'x-circle'; break;
                            case 'Info': icon = 'info'; break;
                        }
                    }
                    if (!icon) {
                        switch (controlData.type) {
                            case 'toggle': icon = 'toggle-right'; break;
                            case 'icon-toggle': icon = null; break;
                            case 'swatch-picker': icon = null; break;
                            case 'cycle-button': icon = null; break;
                            case 'cycle-swatch': icon = null; break;
                            case 'color': icon = 'pipette'; break;
                            case 'select': icon = 'chevron-down'; break;
                            case 'slider': icon = 'sliders-horizontal'; break;
                            default: icon = 'circle'; 
                        }
                    }
                    return {
                        label: '', // Label is inside the element
                        icon: icon,
                        element: createControl(controlData)
                    };
                })
            }));
            
            // --- Create and Append Tree ---
            const settingsTree = UI.tree(treeData);
            container.appendChild(settingsTree);

            // Finalize
            UI.icons();
        }
        
        createSettingsControls();
        
        // --- Add toggle logic from old layout.js ---
        const layoutContainer = document.querySelector('.style-guide-layout');
        const rightToggleTrigger = document.getElementById('right-panel-toggle');

        if (layoutContainer && rightToggleTrigger) {
            rightToggleTrigger.addEventListener('click', () => {
                layoutContainer.classList.toggle('right-collapsed');
            });
        }
    });
})(); 