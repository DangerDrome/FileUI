(function() {
    if (!window.UI) window.UI = {};
    if (!UI.sections) UI.sections = {};

    UI.sections.modals = function() {
        const content = document.createElement('div');

        const callout = document.createElement('div');
        callout.className = 'callout callout-info';
        callout.innerHTML = `
            <i data-lucide="info" class="icon"></i>
            <p>Modals are used to display content in a layer above the app. They can be used for alerts, confirmations, or to display forms. The background is dimmed to draw attention to the modal.</p>
        `;
        content.appendChild(callout);

        const h5 = document.createElement('h5');
        h5.textContent = 'Modal Examples';
        content.appendChild(h5);

        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'demo-row';
        content.appendChild(buttonWrapper);

        const showSimpleModal = () => {
            UI.modal({
                content: '<p>This is a simple modal with just some text content.</p>',
                title: 'Simple Modal'
            });
        };

        const showConfirmModal = () => {
            UI.modal({
                content: '<p>Are you sure you want to delete this item? This action cannot be undone.</p>',
                title: 'Confirm Deletion',
                icon: 'alert-triangle',
                actions: [
                    { text: 'Cancel', variant: 'secondary' },
                    { text: 'Delete', variant: 'error', onclick: () => UI.toast('Item deleted!', 'error') }
                ]
            });
        };

        const showFormModal = () => {
            const formContent = document.createElement('div');
            
            formContent.appendChild(UI.formGroup({
                id: 'username-modal',
                label: 'Username',
                placeholder: 'Enter your username'
            }));

            formContent.appendChild(UI.formGroup({
                id: 'password-modal',
                type: 'password',
                label: 'Password',
                placeholder: 'Enter a secure password'
            }));

            UI.modal({
                content: formContent,
                title: 'User Login',
                icon: 'user',
                actions: [
                    { text: 'Login', variant: 'primary', onclick: () => UI.toast('Logged in successfully!', 'success') }
                ]
            });
        };

        const btn1 = UI.button('Simple Modal', { onclick: showSimpleModal });
        const btn2 = UI.button('Confirm Modal', { onclick: showConfirmModal });
        const btn3 = UI.button('Form Modal', { onclick: showFormModal });

        buttonWrapper.append(btn1, btn2, btn3);

        const panel = UI.panel('Modals', content, {
            icon: 'layout-template',
            collapsible: true,
            startCollapsed: false
        });

        return panel;
    };
})(); 