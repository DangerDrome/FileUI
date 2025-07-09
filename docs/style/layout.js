(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const layoutContainer = document.querySelector('.style-guide-layout');
        const leftToggleTrigger = document.getElementById('left-panel-toggle');
        const rightToggleTrigger = document.getElementById('right-panel-toggle');

        if (!layoutContainer || !leftToggleTrigger) {
            console.error('Layout toggle trigger not found.');
            return;
        }

        leftToggleTrigger.addEventListener('click', () => {
            layoutContainer.classList.toggle('collapsed');
        });

        if (rightToggleTrigger) {
            rightToggleTrigger.addEventListener('click', () => {
                layoutContainer.classList.toggle('right-collapsed');
            });
        }
    });

})(); 