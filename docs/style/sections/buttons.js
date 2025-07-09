(function() {
    if (!window.UI) window.UI = {};
    if (!UI.sections) UI.sections = {};

    UI.sections.buttons = function() {
        const content = document.createElement('div');
        content.innerHTML = `
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
        
        const panel = UI.panel('Buttons', content, { 
            icon: 'mouse-pointer',
            collapsible: true 
        });
        
        return panel;
    };
})(); 