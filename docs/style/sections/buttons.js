(function() {
    if (!window.UI) window.UI = {};
    if (!UI.sections) UI.sections = {};

    UI.sections.buttons = function() {
        const section = document.createElement('section');

        const title = 'Buttons';
        const blurb = 'Buttons are used for actions, such as submitting a form, opening a dialog, or canceling an operation. They come in various styles, sizes, and semantic colors to fit different contexts.';

        const h2 = document.createElement('h2');
        h2.textContent = title;
        section.appendChild(h2);

        const p = document.createElement('p');
        p.className = 'text-lg text-secondary';
        p.textContent = blurb;
        section.appendChild(p);

        const content = document.createElement('div');
        content.innerHTML = `
            <h5>Default Buttons</h5>
            <div class="demo-row">
                <sl-tooltip content="Standard button for general actions" placement="top"></sl-tooltip>
                <sl-tooltip content="Primary action button with emphasis" placement="top"></sl-tooltip>
                <sl-tooltip content="Compact button for limited space" placement="top"></sl-tooltip>
                <sl-tooltip content="Large button for prominent actions" placement="top"></sl-tooltip>
                <sl-tooltip content="Button in disabled state" placement="top"></sl-tooltip>
            </div>
            
            <h5>Semantic Button Colors</h5>
            <div class="demo-row">
                <sl-tooltip content="Success action (save, confirm)" placement="top"></sl-tooltip>
                <sl-tooltip content="Warning action (caution required)" placement="top"></sl-tooltip>
                <sl-tooltip content="Destructive action (delete, remove)" placement="top"></sl-tooltip>
                <sl-tooltip content="Informational action (details, help)" placement="top"></sl-tooltip>
            </div>
            
            <h5>Icon Buttons</h5>
            <div class="demo-row">
                <sl-tooltip content="Edit item" placement="top"></sl-tooltip>
                <sl-tooltip content="Save changes" placement="top"></sl-tooltip>
                <sl-tooltip content="Delete item" placement="top"></sl-tooltip>
            </div>

            <h5>Icon Text Buttons</h5>
            <div class="demo-row" id="icon-text-demo">
                <!-- Icon text buttons will be inserted here -->
            </div>

            <h5>Icon Toggle Buttons</h5>
            <div class="demo-row" id="icon-toggle-demo">
                <!-- Toggles will be inserted here -->
            </div>

            <h5>Swatch Buttons</h5>
            <div class="demo-row" id="swatch-demo">
                <!-- Swatches will be inserted here -->
            </div>
        `;

        const tooltips = content.querySelectorAll('sl-tooltip');
        
        tooltips[0].appendChild(UI.button('Default'));
        tooltips[1].appendChild(UI.button('Primary', { variant: 'primary' }));
        tooltips[2].appendChild(UI.button('Small', { size: 'sm' }));
        tooltips[3].appendChild(UI.button('Large', { size: 'lg' }));
        tooltips[4].appendChild(UI.button('Disabled', { disabled: true }));

        tooltips[5].appendChild(UI.button('Success', { variant: 'success' }));
        tooltips[6].appendChild(UI.button('Warning', { variant: 'warning' }));
        tooltips[7].appendChild(UI.button('Error', { variant: 'error' }));
        tooltips[8].appendChild(UI.button('Info', { variant: 'info' }));

        tooltips[9].appendChild(UI.button('', { icon: 'edit' }));
        tooltips[10].appendChild(UI.button('', { icon: 'save', variant: 'primary' }));
        tooltips[11].appendChild(UI.button('', { icon: 'trash-2', variant: 'error' }));

        const iconTextContainer = content.querySelector('#icon-text-demo');
        const semanticIconText = {
            'primary': 'zap',
            'success': 'check-circle',
            'warning': 'alert-triangle',
            'error': 'x-circle',
            'info': 'info'
        };
        for (const [variant, icon] of Object.entries(semanticIconText)) {
            iconTextContainer.appendChild(UI.button({
                text: variant.charAt(0).toUpperCase() + variant.slice(1),
                icon: icon,
                variant: variant
            }));
        }

        const toggleContainer = content.querySelector('#icon-toggle-demo');

        // Dark Mode Toggle
        toggleContainer.appendChild(UI.iconToggle({
            iconOn: 'moon',
            iconOff: 'sun',
            tooltip: 'Toggle Dark Mode',
            initialState: () => document.body.classList.contains('dark'),
            onchange: (checked) => document.body.classList.toggle('dark', checked)
        }));

        // Font Toggle
        toggleContainer.appendChild(UI.iconToggle({
            iconOn: 'type',
            iconOff: 'pilcrow',
            tooltip: 'Toggle Monospace Font',
            initialState: () => document.body.classList.contains('font-mono'),
            onchange: (checked) => document.body.classList.toggle('font-mono', checked)
        }));

        // Language Toggle
        toggleContainer.appendChild(UI.iconToggle({
            iconOn: 'languages',
            iconOff: 'text',
            tooltip: 'Toggle Language',
            initialState: () => document.documentElement.lang === 'zh-CN',
            onchange: (checked) => document.documentElement.lang = checked ? 'zh-CN' : 'en'
        }));
        
        // Spacing Toggle
        toggleContainer.appendChild(UI.iconToggle({
            iconOn: 'minimize-2',
            iconOff: 'maximize-2',
            tooltip: 'Toggle Compact Spacing',
            initialState: () => document.body.classList.contains('spacing-compact'),
            onchange: (checked) => document.body.classList.toggle('spacing-compact', checked)
        }));

        const swatchContainer = content.querySelector('#swatch-demo');
        const semanticColors = ['primary', 'success', 'warning', 'error', 'info', 'accent'];
        semanticColors.forEach(color => {
            swatchContainer.appendChild(UI.swatch({
                color: `var(--${color})`,
                tooltip: color.charAt(0).toUpperCase() + color.slice(1)
            }));
        });
        
        const panel = UI.panel('', content, { 
            icon: 'mouse-pointer',
            collapsible: false 
        });
        
        section.appendChild(panel);
        
        return section;
    };
})(); 