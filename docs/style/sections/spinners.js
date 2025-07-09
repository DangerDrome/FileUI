(function() {
    'use strict';

    const createSpinnersSection = () => {
        const content = document.createElement('div');
        content.className = 'grid-container';

        const p = document.createElement('p');
        p.textContent = 'Spinners are used to indicate a loading state.';
        content.appendChild(p);

        // --- Spinner Sizes ---
        const h5Sizes = document.createElement('h5');
        h5Sizes.textContent = 'Sizes';
        content.appendChild(h5Sizes);

        const sizesDemo = document.createElement('div');
        sizesDemo.className = 'demo-row';
        sizesDemo.innerHTML = `
            <div class="spinner spinner-lg"></div>
            <div class="spinner"></div>
            <div class="spinner spinner-sm"></div>
        `;
        content.appendChild(sizesDemo);

        // --- Spinner Colors ---
        const h5Colors = document.createElement('h5');
        h5Colors.textContent = 'Colors';
        h5Colors.style.marginTop = 'var(--space-8)';
        content.appendChild(h5Colors);

        const colorsDemo = document.createElement('div');
        colorsDemo.className = 'demo-row';
        colorsDemo.innerHTML = `
            <div class="spinner spinner-primary"></div>
            <div class="spinner spinner-secondary"></div>
            <div class="spinner spinner-success"></div>
            <div class="spinner spinner-error"></div>
            <div class="spinner spinner-warning"></div>
            <div class="spinner spinner-info"></div>
        `;
        content.appendChild(colorsDemo);
        
        // --- Spinners in Buttons ---
        const h5Buttons = document.createElement('h5');
        h5Buttons.textContent = 'In Buttons';
        h5Buttons.style.marginTop = 'var(--space-8)';
        content.appendChild(h5Buttons);

        const buttonsDemo = document.createElement('div');
        buttonsDemo.className = 'demo-row';
        
        const loadingButton = UI.button({
            text: 'Loading...',
            variant: 'primary',
            disabled: true
        });
        const spinner = document.createElement('span');
        spinner.className = 'spinner spinner-sm';
        spinner.setAttribute('role', 'status');
        spinner.setAttribute('aria-hidden', 'true');
        loadingButton.prepend(spinner);
        buttonsDemo.appendChild(loadingButton);

        const anotherLoadingButton = UI.button({
            text: 'Loading',
            disabled: true
        });
        const spinner2 = document.createElement('span');
        spinner2.className = 'spinner spinner-sm';
        spinner2.setAttribute('role', 'status');
        spinner2.setAttribute('aria-hidden', 'true');
        anotherLoadingButton.prepend(spinner2);
        buttonsDemo.appendChild(anotherLoadingButton);
        
        content.appendChild(buttonsDemo);

        const panel = UI.panel('Spinners', content, {
            icon: 'loader',
            collapsible: true,
            startCollapsed: false
        });

        return panel;
    };

    // Expose the function to the global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.spinners = createSpinnersSection;

})(); 