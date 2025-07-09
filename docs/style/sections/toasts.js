(function() {
    if (!window.UI) window.UI = {};
    if (!UI.sections) UI.sections = {};

    UI.sections.toasts = function() {
        const section = document.createElement('section');

        const title = 'Toast Notifications';
        const blurb = 'Toasts are used to display brief, temporary notifications. They can be used to provide feedback on an operation, or to display a system message. Toasts appear at the bottom of the screen and are automatically dismissed after a short period.';

        const h2 = document.createElement('h2');
        h2.textContent = title;
        section.appendChild(h2);

        const p = document.createElement('p');
        p.className = 'text-lg text-secondary';
        p.textContent = blurb;
        section.appendChild(p);

        const content = document.createElement('div');
        content.innerHTML = `
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

        const panel = UI.panel('', content, { 
            icon: 'bell',
            collapsible: false
        });
        
        section.appendChild(panel);
        
        return section;
    };
})(); 