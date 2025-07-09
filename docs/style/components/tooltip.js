(function(UI) {
    'use strict';

    let tooltipElement;

    function showTooltip(target, text, position) {
        if (!tooltipElement) {
            tooltipElement = document.createElement('div');
            // Initial class is just 'tooltip'
            tooltipElement.className = 'tooltip';
            document.body.appendChild(tooltipElement);
        }

        tooltipElement.textContent = text;
        // The positionTooltip function will now handle adding the correct classes
        positionTooltip(target, position);
        tooltipElement.classList.add('is-visible');
    }

    function hideTooltip() {
        if (tooltipElement) {
            tooltipElement.classList.remove('is-visible');
        }
    }

    function positionTooltip(target, position) {
        // Reset classes before positioning
        tooltipElement.className = 'tooltip';
        tooltipElement.classList.add(`tooltip--${position}`);

        const targetRect = target.getBoundingClientRect();
        // Recalculate tooltipRect *after* setting the text and class
        const tooltipRect = tooltipElement.getBoundingClientRect();
        
        let top, left;

        switch (position) {
            case 'top':
                top = targetRect.top - tooltipRect.height - 8;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = targetRect.bottom + 8;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.left - tooltipRect.width - 8;
                break;
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.right + 8;
                break;
            default: // Default to 'top'
                top = targetRect.top - tooltipRect.height - 8;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
        }

        tooltipElement.style.top = `${top + window.scrollY}px`;
        tooltipElement.style.left = `${left + window.scrollX}px`;
    }

    /**
     * Attaches a tooltip to a target element.
     * @param {HTMLElement} target - The element to attach the tooltip to.
     * @param {string} text - The text to display in the tooltip.
     * @param {string} [position='top'] - The position of the tooltip ('top', 'bottom', 'left', 'right').
     */
    UI.tooltip = (target, text, position = 'top') => {
        const show = () => showTooltip(target, text, position);
        const hide = () => hideTooltip();

        target.addEventListener('mouseenter', show);
        target.addEventListener('mouseleave', hide);
        target.addEventListener('focus', show);
        target.addEventListener('blur', hide);

        return {
            destroy() {
                target.removeEventListener('mouseenter', show);
                target.removeEventListener('mouseleave', hide);
                target.removeEventListener('focus', show);
                target.removeEventListener('blur', hide);
            }
        };
    };

}(window.UI || (window.UI = {}))); 