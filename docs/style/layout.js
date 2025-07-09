(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const layoutContainer = document.querySelector('.style-guide-layout');
        const toggleTrigger = document.getElementById('left-panel-toggle');

        if (!layoutContainer || !toggleTrigger) {
            console.error('Layout toggle trigger not found.');
            return;
        }

        toggleTrigger.addEventListener('click', () => {
            layoutContainer.classList.toggle('collapsed');
        });
    });

})(); 