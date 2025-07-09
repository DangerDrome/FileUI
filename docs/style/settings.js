(function() {
    'use strict';

    // Helper to create a control and its element in one go
    function createControl(controlData) {
        let controlElement;
        const container = document.createElement('div');
        container.className = 'setting-control-container';

        const label = document.createElement('span');
        label.className = 'setting-label';
        label.textContent = controlData.label;
        container.appendChild(label);

        switch (controlData.type) {
            case 'toggle':
                const toggle = document.createElement('input');
                toggle.type = 'checkbox';
                toggle.className = 'toggle-switch';
                toggle.checked = document.body.classList.contains('dark');
                if (toggle.checked) document.body.classList.add('dark');
                toggle.addEventListener('change', () => document.body.classList.toggle('dark', toggle.checked));
                controlElement = toggle;
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
                    { type: 'toggle', label: 'Dark Mode' },
                    { type: 'color', label: 'Accent Color', property: '--accent' },
                    { type: 'color', label: 'Tint Color', property: '--bg-layer-0' }
                ]
            },
            {
                id: 'settings-typography',
                title: 'Typography',
                icon: 'type',
                controls: [
                    { type: 'select', label: 'Font Family', options: [
                        { value: 'Inter, sans-serif', text: 'Inter (Default)' },
                        { value: 'Roboto, sans-serif', text: 'Roboto' },
                        { value: 'system-ui', text: 'System UI' }
                    ]}
                ]
            },
            {
                id: 'settings-density',
                title: 'Density',
                icon: 'move-vertical',
                controls: [
                    { type: 'select', label: 'Spacing', options: [
                        { value: 'compact', text: 'Compact' },
                        { value: 'default', text: 'Default' },
                        { value: 'comfortable', text: 'Comfortable' }
                    ]}
                ]
            },
            {
                id: 'settings-icons',
                title: 'Icons',
                icon: 'award',
                controls: [
                    { type: 'slider', label: 'Icon Size', min: 16, max: 32, step: 1, value: 20 },
                    { type: 'slider', label: 'Stroke Width', min: 1, max: 3, step: 0.25, value: 1.5 }
                ]
            },
            {
                id: 'settings-colors',
                title: 'Semantic Colors',
                icon: 'swatch-book',
                controls: [
                    { type: 'color', label: 'Primary', property: '--primary' },
                    { type: 'color', label: 'Success', property: '--success' },
                    { type: 'color', label: 'Warning', property: '--warning' },
                    { type: 'color', label: 'Error', property: '--error' },
                    { type: 'color', label: 'Info', property: '--info' },
                ]
            },
            {
                id: 'settings-language',
                title: 'Language',
                icon: 'globe',
                controls: [
                    { type: 'select', label: 'Language', options: [
                        { value: 'en', text: 'English' },
                        { value: 'zh-CN', text: 'Simplified Chinese' }
                    ]}
                ]
            }
        ];

        // --- Build Collapsed Icon Bar ---
        settingsSections.forEach(section => {
            const button = UI.button({
                icon: section.icon, variant: 'ghost',
            });
            UI.tooltip(button, section.title, 'left');
            collapsedContainer.appendChild(button);
        });

        // --- Transform Data for Tree View ---
        const treeData = settingsSections.map(section => ({
            label: section.title,
            icon: section.icon,
            expanded: true, 
            children: section.controls.map(controlData => ({
                label: '', // Label is inside the element
                element: createControl(controlData)
            }))
        }));
        
        // --- Create and Append Tree ---
        const settingsTree = UI.tree(treeData);
        container.appendChild(settingsTree);

        // Finalize
        UI.icons();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createSettingsControls);
    } else {
        createSettingsControls();
    }

})(); 