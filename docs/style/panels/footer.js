(function() {
    'use strict';

    // This function is a simplified version from right.js, intended only for the footer.
    // It creates the interactive part of a control (button, switch, etc.)
    function createFooterControl(controlData) {
        if (!window.UI) return null;
        
        switch (controlData.type) {
            case 'icon-toggle':
                return UI.iconToggle({
                    iconOn: controlData.iconOn,
                    iconOff: controlData.iconOff,
                    initialState: controlData.initialState,
                    onchange: controlData.action,
                    tooltip: controlData.label
                });
            case 'cycle-swatch':
                return UI.cycleSwatch({
                    states: controlData.states,
                    initialState: controlData.initialState,
                    onchange: controlData.action,
                    tooltip: controlData.label
                });
            case 'swatch-picker':
                const swatchBtn = document.createElement('button');
                swatchBtn.className = 'btn btn-swatch';
                const initialSwatchColor = getComputedStyle(document.documentElement).getPropertyValue(controlData.property).trim();
                new Picker({
                    parent: swatchBtn, popup: 'top', color: initialSwatchColor, alpha: false, editor: false,
                    onChange: color => {
                        document.documentElement.style.setProperty(controlData.property, color.hex);
                        swatchBtn.style.backgroundColor = color.hex;
                    }
                });
                swatchBtn.style.backgroundColor = initialSwatchColor;
                UI.tooltip(swatchBtn, controlData.label, 'top');
                return swatchBtn;
            case 'cycle-button':
                 return UI.cycleButton({
                    states: controlData.states,
                    initialState: controlData.initialState,
                    onchange: controlData.action,
                    tooltip: controlData.label
                });
            default:
                return null;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const copyrightEl = document.getElementById('footer-copyright');
        const settingsContainer = document.getElementById('footer-settings-container');
        const leftContainer = document.getElementById('footer-left-container');

        if (!copyrightEl || !settingsContainer || !leftContainer) {
            console.error("Footer containers not found");
            return;
        }
        
        // 1. Create Left-side controls
        const settingsButton = UI.button({
            icon: 'settings',
            variant: 'ghost',
            tooltip: 'Toggle Settings Panel'
        });
        settingsButton.addEventListener('click', () => {
            document.querySelector('.style-guide-layout').classList.toggle('right-collapsed');
        });
        leftContainer.appendChild(settingsButton);

        // 2. Set Copyright
        const year = new Date().getFullYear();
        copyrightEl.textContent = `© ${year} FileUI.`;

        // 3. Create Settings Controls
        const settingsSections = [
            {
                controls: [
                    { type: 'icon-toggle', label: 'Theme', action: (checked) => document.body.classList.toggle('dark', checked), initialState: () => document.body.classList.contains('dark'), iconOn: 'moon', iconOff: 'sun' },
                    { type: 'cycle-swatch', label: 'Accent', action: (state) => { const root = document.documentElement; root.style.setProperty('--accent', `var(${state.colorVar})`); root.style.setProperty('--accent-hover', `var(${state.colorVar}-hover)`); root.style.setProperty('--accent-text', `var(${state.colorVar}-dark)`); }, initialState: () => localStorage.getItem('accent-color-name') || 'default-accent', states: [ { value: 'Default', colorVar: '--default-accent' }, { value: 'Primary', colorVar: '--primary' }, { value: 'Success', colorVar: '--success' }, { value: 'Warning', colorVar: '--warning' }, { value: 'Error', colorVar: '--error' }, { value: 'Info', colorVar: '--info' } ] },
                    { type: 'cycle-button', label: 'Tint', action: (value) => { document.body.dataset.tint = value; }, initialState: () => document.body.dataset.tint || 'none', states: [ { value: 'none', icon: 'droplet' }, { value: 'primary', icon: 'zap' }, { value: 'success', icon: 'check-circle' }, { value: 'warning', icon: 'alert-triangle' }, { value: 'error', icon: 'x-circle' }, { value: 'info', icon: 'info' } ] }
                ]
            },
            { controls: [ { type: 'icon-toggle', label: 'Font', action: (checked) => document.body.classList.toggle('font-mono', checked), initialState: () => document.body.classList.contains('font-mono'), iconOn: 'code', iconOff: 'text' } ] },
            { controls: [ { type: 'icon-toggle', label: 'Spacing', action: (checked) => document.body.classList.toggle('spacing-compact', checked), initialState: () => document.body.classList.contains('spacing-compact'), iconOn: 'minimize-2', iconOff: 'maximize-2' } ] },
            { controls: [ { type: 'icon-toggle', label: 'Size', action: (checked) => document.body.classList.toggle('icons-large', checked), initialState: () => document.body.classList.contains('icons-large'), iconOn: 'zoom-in', iconOff: 'zoom-out' }, { type: 'icon-toggle', label: 'Stroke', action: (checked) => document.body.classList.toggle('icons-thick-stroke', checked), initialState: () => document.body.classList.contains('icons-thick-stroke'), iconOn: 'bold', iconOff: 'minus' } ] },
            { controls: [ { type: 'swatch-picker', label: 'Primary', property: '--primary' }, { type: 'swatch-picker', label: 'Success', property: '--success' }, { type: 'swatch-picker', label: 'Warning', property: '--warning' }, { type: 'swatch-picker', label: 'Error', property: '--error' }, { type: 'swatch-picker', label: 'Info', property: '--info' }, ] },
            { controls: [ { type: 'icon-toggle', label: 'Language', action: (checked) => document.documentElement.lang = checked ? 'zh-CN' : 'en', initialState: () => document.documentElement.lang === 'zh-CN', iconOn: 'languages', iconOff: 'text' } ] }
        ];
        
        settingsContainer.innerHTML = '';
        settingsSections.forEach(section => {
            section.controls.forEach(controlData => {
                const controlElement = createFooterControl(controlData);
                if (controlElement) {
                    settingsContainer.appendChild(controlElement);
                }
            });
        });

        // Finalize
        UI.icons();
    });

})(); 