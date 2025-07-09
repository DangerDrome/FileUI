(function() {
    if (!window.UI) window.UI = {};
    if (!UI.sections) UI.sections = {};

    UI.sections.toasts = function() {
        const content = document.createElement('div');
        content.innerHTML = `
            <div class="callout callout-info">
                <i data-lucide="info" class="icon"></i>
                <p>Toasts are used to display brief, temporary notifications. They can be used to provide feedback on an operation, or to display a system message. Toasts appear at the bottom of the screen and are automatically dismissed after a short period.</p>
            </div>
            <h5>Toast Examples</h5>
            <div class="demo-row">
                <sl-tooltip content="Show success notification" placement="top"></sl-tooltip>
                <sl-tooltip content="Show error notification" placement="top"></sl-tooltip>
                <sl-tooltip content="Show warning notification" placement="top"></sl-tooltip>
                <sl-tooltip content="Show info notification" placement="top"></sl-tooltip>
            </div>
            <div class="demo-row">
                <sl-tooltip content="Toast with loading spinner" placement="top"></sl-tooltip>
                <sl-tooltip content="Toast with close button" placement="top"></sl-tooltip>
                <sl-tooltip content="Toast with action button" placement="top"></sl-tooltip>
            </div>
        `;

        const tooltips = content.querySelectorAll('sl-tooltip');
        
        tooltips[0].appendChild(UI.button('Success Toast', { variant: 'success', onclick: () => UI.toast('Success message!', 'success') }));
        tooltips[1].appendChild(UI.button('Error Toast', { variant: 'error', onclick: () => UI.toast('Error occurred!', 'error') }));
        tooltips[2].appendChild(UI.button('Warning Toast', { variant: 'warning', onclick: () => UI.toast('Warning message', 'warning') }));
        tooltips[3].appendChild(UI.button('Info Toast', { variant: 'info', onclick: () => UI.toast('Info message', 'info') }));
        
        tooltips[4].appendChild(UI.button('Preloader Toast', { variant: 'primary', onclick: () => UI.toast('Loading data...', 'info', { preloader: true, duration: 3000 }) }));
        tooltips[5].appendChild(UI.button('Dismissible Toast', { variant: 'info', onclick: () => UI.toast('Click X to dismiss', 'info', { dismissible: true }) }));
        tooltips[6].appendChild(UI.button('Action Toast', { variant: 'warning', onclick: () => UI.toast('Action required', 'warning', { action: { text: 'Undo', callback: () => UI.toast('Undone!', 'success') }}) }));

        const panel = UI.panel('Toast Notifications', content, { 
            icon: 'bell',
            collapsible: true,
            startCollapsed: false
        });
        
        return panel;
    };
})(); 