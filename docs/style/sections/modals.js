(function() {
    if (!window.UI) window.UI = {};
    if (!UI.sections) UI.sections = {};

    UI.sections.modals = function() {
        const content = document.createElement('div');
        content.className = 'demo-row';

        const showSimpleModal = () => {
            UI.modal('<p>This is a simple modal with just some text content.</p>', {
                title: 'Simple Modal'
            });
        };

        const showConfirmModal = () => {
            UI.modal('<p>Are you sure you want to delete this item? This action cannot be undone.</p>', {
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

            UI.modal(formContent, {
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

        content.append(btn1, btn2, btn3);

        const panel = UI.panel('Modals', content, {
            icon: 'layout-template',
            collapsible: true,
            startCollapsed: false
        });

        return panel;
    };
})(); 