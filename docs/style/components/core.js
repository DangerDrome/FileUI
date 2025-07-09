(function() {
    'use strict';

    // Configuration constants
    const CONFIG = {
        TOAST_DURATION: 5000,
        MODAL_ANIMATION_DURATION: 200,
        MENU_ANIMATION_DURATION: 150,
        TOOLTIP_MARGIN: 12,
        POPOVER_MARGIN: 8,
        MOBILE_BREAKPOINT: 768,
        ACCENT_COLORS: [
            { name: 'primary', color: 'var(--primary)' },
            { name: 'success', color: 'var(--success)' },
            { name: 'warning', color: 'var(--warning)' },
            { name: 'error', color: 'var(--error)' },
            { name: 'info', color: 'var(--info)' },
            { name: 'neutral', color: 'var(--neutral)' }
        ],
        TOAST_ICONS: {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        }
    };

    const UI = {
        // Initialize icons after adding elements
        icons() {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ class: 'lucide' });
                const savedStrokeWidth = localStorage.getItem('fileui-stroke-width');
                if (savedStrokeWidth) {
                    document.querySelectorAll('.lucide').forEach(icon => {
                        icon.style.strokeWidth = savedStrokeWidth;
                    });
                }
            }
        },

        // Defer icon initialization
        deferIcons() {
            setTimeout(() => this.icons(), 0);
        },

        // Build CSS class string from array
        buildClasses(...classes) {
            return classes.filter(Boolean).join(' ');
        },

        // Theme management
        theme: {
            set(theme) {
                document.body.classList.toggle('dark', theme === 'dark');
                localStorage.setItem('fileui-theme', theme);
            },
            get() {
                return document.body.classList.contains('dark') ? 'dark' : 'light';
            },
            toggle() {
                const newTheme = this.get() === 'dark' ? 'light' : 'dark';
                this.set(newTheme);
                return newTheme;
            }
        },

        language: {
            translations: {}, // Will be populated by a separate language file loader if needed
            set(lang) {
                document.documentElement.setAttribute('lang', lang);
                localStorage.setItem('fileui-lang', lang);
            },
            get() {
                return document.documentElement.getAttribute('lang') || 'en';
            },
            translate(text) {
                // In a real app, this would look up the text in the translations object.
                // For this style guide, we'll keep it simple.
                return text;
            }
        },
        
        // A slimmed-down init for the modular page
        initModular() {
            // Placeholder for any modular-specific initializations
        },
    };

    // Expose to window
    window.UI = UI;
    window.CONFIG = CONFIG;

    // Auto-initialize theme from localStorage
    document.addEventListener('DOMContentLoaded', () => {
        const savedTheme = localStorage.getItem('fileui-theme');
        if (savedTheme) {
            UI.theme.set(savedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            UI.theme.set(prefersDark ? 'dark' : 'light');
        }
    });

})(); 