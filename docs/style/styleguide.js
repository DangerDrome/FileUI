/**
 * FileUI Style Guide Interactive Components
 * Modern, clean JavaScript for style guide functionality
 */

(function() {
    'use strict';

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeStyleGuide();
    });

    function initializeStyleGuide() {
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Initialize navigation
        initializeNavigation();
        
        // Initialize responsive behavior
        initializeResponsive();
        
        // Initialize style controls
        initializeStyleControls();
    }

    function initializeNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                // Remove active class from all items
                navItems.forEach(navItem => {
                    navItem.classList.remove('active');
                });
                
                // Add active class to clicked item
                this.classList.add('active');
            });
        });
    }

    function initializeResponsive() {
        const navPanel = document.getElementById('navPanel');
        const controlsPanel = document.getElementById('controlsPanel');
        
        // Create mobile menu toggle if needed
        if (window.innerWidth <= 1200) {
            createMobileToggles();
        }
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth <= 1200) {
                createMobileToggles();
            } else {
                removeMobileToggles();
            }
        });
    }

    function createMobileToggles() {
        // Check if toggles already exist
        if (document.querySelector('.mobile-nav-toggle')) return;
        
        const container = document.querySelector('.container');
        if (!container) return;
        
        // Create navigation toggle
        const navToggle = document.createElement('button');
        navToggle.className = 'mobile-nav-toggle btn btn-sm';
        navToggle.innerHTML = '<i data-lucide="menu"></i> Navigation';
        navToggle.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1001;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
        `;
        
        // Create controls toggle
        const controlsToggle = document.createElement('button');
        controlsToggle.className = 'mobile-controls-toggle btn btn-sm';
        controlsToggle.innerHTML = '<i data-lucide="settings"></i> Controls';
        controlsToggle.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1001;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
        `;
        
        document.body.appendChild(navToggle);
        document.body.appendChild(controlsToggle);
        
        // Add event listeners
        navToggle.addEventListener('click', function() {
            const navPanel = document.getElementById('navPanel');
            navPanel.classList.toggle('open');
        });
        
        controlsToggle.addEventListener('click', function() {
            const controlsPanel = document.getElementById('controlsPanel');
            controlsPanel.classList.toggle('open');
        });
        
        // Reinitialize icons for new buttons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function removeMobileToggles() {
        const navToggle = document.querySelector('.mobile-nav-toggle');
        const controlsToggle = document.querySelector('.mobile-controls-toggle');
        
        if (navToggle) navToggle.remove();
        if (controlsToggle) controlsToggle.remove();
        
        // Close panels
        const navPanel = document.getElementById('navPanel');
        const controlsPanel = document.getElementById('controlsPanel');
        
        if (navPanel) navPanel.classList.remove('open');
        if (controlsPanel) controlsPanel.classList.remove('open');
    }

    function initializeStyleControls() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', function(e) {
                e.preventDefault();
                toggleTheme();
            });
        }
        
        // Font family controls
        const fontButtons = document.querySelectorAll('[data-font]');
        fontButtons.forEach(button => {
            button.addEventListener('click', function() {
                const fontType = this.getAttribute('data-font');
                setFontFamily(fontType);
                
                // Update button states
                fontButtons.forEach(btn => btn.classList.remove('btn-primary'));
                this.classList.add('btn-primary');
            });
        });
        
        // Layout controls
        const layoutButtons = document.querySelectorAll('[onclick*="toggleLayout"]');
        layoutButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const onclick = this.getAttribute('onclick');
                const layout = onclick.match(/'([^']+)'/)[1];
                toggleLayout(layout);
                
                // Update button states
                layoutButtons.forEach(btn => btn.classList.remove('btn-primary'));
                this.classList.add('btn-primary');
            });
        });
    }

    // Theme functions
    window.toggleTheme = function() {
        const body = document.body;
        const isDark = body.classList.contains('dark');
        
        if (isDark) {
            body.classList.remove('dark');
            updateThemeColors('light');
        } else {
            body.classList.add('dark');
            updateThemeColors('dark');
        }
    };

    function updateThemeColors(theme) {
        const body = document.body;
        
        if (theme === 'dark') {
            body.style.setProperty('--bg-primary', '#0a0a0a');
            body.style.setProperty('--bg-secondary', '#171717');
            body.style.setProperty('--bg-tertiary', '#262626');
            body.style.setProperty('--text-primary', '#fafafa');
            body.style.setProperty('--text-secondary', '#a3a3a3');
            body.style.setProperty('--text-tertiary', '#737373');
            body.style.setProperty('--border-color', '#262626');
            body.style.setProperty('--border-strong', '#404040');
            body.style.setProperty('--accent', '#4ade80');
            body.style.setProperty('--accent-hover', '#22c55e');
        } else {
            body.style.setProperty('--bg-primary', '#ffffff');
            body.style.setProperty('--bg-secondary', '#f8fafc');
            body.style.setProperty('--bg-tertiary', '#f1f5f9');
            body.style.setProperty('--text-primary', '#0f172a');
            body.style.setProperty('--text-secondary', '#475569');
            body.style.setProperty('--text-tertiary', '#64748b');
            body.style.setProperty('--border-color', '#e2e8f0');
            body.style.setProperty('--border-strong', '#cbd5e1');
            body.style.setProperty('--accent', '#22c55e');
            body.style.setProperty('--accent-hover', '#16a34a');
        }
    }

    // Font family function
    function setFontFamily(fontType) {
        const root = document.documentElement;
        
        switch(fontType) {
            case 'system':
                root.style.setProperty('--font-system', 
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif');
                break;
            case 'mono':
                root.style.setProperty('--font-system', 
                    '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace');
                break;
            default:
                root.style.setProperty('--font-system', 
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif');
        }
    }

    // Layout function
    window.toggleLayout = function(layout) {
        const container = document.querySelector('.container');
        if (!container) return;
        
        // Remove existing layout classes
        container.classList.remove('layout-compact', 'layout-comfortable');
        
        switch(layout) {
            case 'compact':
                container.classList.add('layout-compact');
                updateLayoutSpacing('compact');
                break;
            case 'comfortable':
                container.classList.add('layout-comfortable');
                updateLayoutSpacing('comfortable');
                break;
            default:
                updateLayoutSpacing('normal');
        }
    };

    function updateLayoutSpacing(layout) {
        const root = document.documentElement;
        
        switch(layout) {
            case 'compact':
                root.style.setProperty('--space-4', '0.75rem');
                root.style.setProperty('--space-6', '1rem');
                root.style.setProperty('--space-8', '1.5rem');
                root.style.setProperty('--space-10', '2rem');
                break;
            case 'comfortable':
                root.style.setProperty('--space-4', '1.25rem');
                root.style.setProperty('--space-6', '2rem');
                root.style.setProperty('--space-8', '2.5rem');
                root.style.setProperty('--space-10', '3rem');
                break;
            default:
                root.style.setProperty('--space-4', '1rem');
                root.style.setProperty('--space-6', '1.5rem');
                root.style.setProperty('--space-8', '2rem');
                root.style.setProperty('--space-10', '2.5rem');
        }
    }

    // Smooth scrolling for navigation links
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Close mobile panels after navigation
            if (window.innerWidth <= 1200) {
                const navPanel = document.getElementById('navPanel');
                const controlsPanel = document.getElementById('controlsPanel');
                if (navPanel) navPanel.classList.remove('open');
                if (controlsPanel) controlsPanel.classList.remove('open');
            }
        }
    });

    // Copy color values to clipboard
    document.addEventListener('click', function(e) {
        const colorValue = e.target.closest('.color-value');
        if (!colorValue) return;
        
        const text = colorValue.textContent;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function() {
                showToast('Copied to clipboard: ' + text);
            });
        }
    });

    // Simple toast notification
    function showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--accent);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 300ms ease;
        `;
        
        document.body.appendChild(toast);
        
        // Fade in
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);
        
        // Fade out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 2000);
    }

    // Initialize with default state
    setTimeout(() => {
        // Set default font button state
        const defaultFontButton = document.querySelector('[data-font="system"]');
        if (defaultFontButton) {
            defaultFontButton.classList.add('btn-primary');
        }
    }, 100);

})();