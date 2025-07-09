(function() {
    'use strict';

    const createProgressSection = () => {
        const section = document.createElement('section');

        const title = 'Progress Bars';
        const blurb = 'Progress bars are used to show the status of a task or operation.';

        const h2 = document.createElement('h2');
        h2.textContent = title;
        section.appendChild(h2);

        const p = document.createElement('p');
        p.className = 'text-lg text-secondary';
        p.textContent = blurb;
        section.appendChild(p);

        const content = document.createElement('div');
        content.className = 'grid-container';
        
        const createProgressBar = (value, text = '', size = '', color = '', striped = false, animated = false) => {
            const progress = document.createElement('div');
            progress.className = `progress ${size}`;
            
            const progressBar = document.createElement('div');
            let barClass = 'progress-bar';
            if (color) barClass += ` ${color}`;
            if (striped) barClass += ' progress-bar-striped';
            if (animated) barClass += ' progress-bar-animated';
            
            progressBar.className = barClass;
            progressBar.style.width = `${value}%`;
            progressBar.setAttribute('role', 'progressbar');
            progressBar.setAttribute('aria-valuenow', value);
            progressBar.setAttribute('aria-valuemin', 0);
            progressBar.setAttribute('aria-valuemax', 100);
            progressBar.textContent = text;
            
            progress.appendChild(progressBar);
            progress.style.marginBottom = 'var(--space-4)';
            return progress;
        };

        // --- Basic Progress ---
        const h5Basic = document.createElement('h5');
        h5Basic.textContent = 'Basic Progress Bars';
        content.appendChild(h5Basic);
        content.appendChild(createProgressBar(0, '0%'));
        content.appendChild(createProgressBar(25, '25%'));
        content.appendChild(createProgressBar(50, '50%'));
        content.appendChild(createProgressBar(75, '75%'));
        content.appendChild(createProgressBar(100, '100%'));

        // --- Colors ---
        const h5Colors = document.createElement('h5');
        h5Colors.textContent = 'Colors';
        content.appendChild(h5Colors);
        content.appendChild(createProgressBar(60, 'Primary', '', 'progress-bar-primary'));
        content.appendChild(createProgressBar(70, 'Success', '', 'progress-bar-success'));
        content.appendChild(createProgressBar(80, 'Error', '', 'progress-bar-error'));
        content.appendChild(createProgressBar(90, 'Warning', '', 'progress-bar-warning'));
        content.appendChild(createProgressBar(100, 'Info', '', 'progress-bar-info'));
        
        // --- Sizes ---
        const h5Sizes = document.createElement('h5');
        h5Sizes.textContent = 'Sizes';
        content.appendChild(h5Sizes);
        content.appendChild(createProgressBar(50, '', 'progress-sm'));
        content.appendChild(createProgressBar(50));
        content.appendChild(createProgressBar(50, '', 'progress-lg'));

        // --- Striped & Animated ---
        const h5Striped = document.createElement('h5');
        h5Striped.textContent = 'Striped & Animated';
        content.appendChild(h5Striped);
        content.appendChild(createProgressBar(75, '', '', 'progress-bar-success', true));
        content.appendChild(createProgressBar(85, '', '', 'progress-bar-info', true, true));

        const panel = UI.panel('', content, {
            icon: 'minus',
            collapsible: false
        });

        section.appendChild(panel);

        return section;
    };

    // Expose the function to the global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.progress = createProgressSection;

})(); 