/**
 * FileUI Style Guide Interactive Components
 * Modern, clean JavaScript for style guide functionality
 */

(function() {
    'use strict';

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeStyleGuide();
        
        // Start with light mode by default
        if (document.body.classList.contains('dark')) {
            document.body.classList.remove('dark');
        }
        updateThemeColors('light');
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
        const themeToggle = document.getElementById('theme-toggle');
        const icon = themeToggle ? themeToggle.querySelector('i') : null;
        
        if (isDark) {
            body.classList.remove('dark');
            updateThemeColors('light');
            if (icon) {
                icon.setAttribute('data-lucide', 'moon');
                lucide.createIcons();
            }
            if (themeToggle) {
                themeToggle.innerHTML = '<i data-lucide="moon" class="nav-icon"></i> Toggle Dark Mode';
                lucide.createIcons();
            }
        } else {
            body.classList.add('dark');
            updateThemeColors('dark');
            if (icon) {
                icon.setAttribute('data-lucide', 'sun');
                lucide.createIcons();
            }
            if (themeToggle) {
                themeToggle.innerHTML = '<i data-lucide="sun" class="nav-icon"></i> Toggle Light Mode';
                lucide.createIcons();
            }
        }
    };

    function updateThemeColors(theme) {
        const body = document.body;
        
        if (theme === 'dark') {
            body.style.setProperty('--bg-primary', '#1a1a1a');
            body.style.setProperty('--bg-secondary', '#242424');
            body.style.setProperty('--bg-tertiary', '#2e2e2e');
            body.style.setProperty('--text-primary', '#f0f0f0');
            body.style.setProperty('--text-secondary', '#b8b8b8');
            body.style.setProperty('--text-tertiary', '#888888');
            body.style.setProperty('--border-color', '#3a3a3a');
            body.style.setProperty('--border-strong', '#4a4a4a');
            body.style.setProperty('--accent', '#94b896');
            body.style.setProperty('--accent-hover', '#7fa582');
            body.style.setProperty('--blue-500', '#7ab8d4');
            body.style.setProperty('--green-500', '#94b896');
            body.style.setProperty('--red-500', '#d49499');
            body.style.setProperty('--amber-500', '#c9a574');
            body.style.setProperty('--purple-500', '#b794bd');
        } else {
            body.style.setProperty('--bg-primary', '#a8a8a0');
            body.style.setProperty('--bg-secondary', '#b4b4ac');
            body.style.setProperty('--bg-tertiary', '#c0c0b8');
            body.style.setProperty('--text-primary', '#424242');
            body.style.setProperty('--text-secondary', '#616161');
            body.style.setProperty('--text-tertiary', '#757575');
            body.style.setProperty('--border-color', '#eeeeee');
            body.style.setProperty('--border-strong', '#e0e0e0');
            body.style.setProperty('--accent', '#b5d3b6');
            body.style.setProperty('--accent-hover', '#9fc5a1');
            body.style.setProperty('--blue-500', '#8cb5cc');
            body.style.setProperty('--green-500', '#9ec0a0');
            body.style.setProperty('--red-500', '#d5a6aa');
            body.style.setProperty('--amber-500', '#d5ad80');
            body.style.setProperty('--purple-500', '#b896be');
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