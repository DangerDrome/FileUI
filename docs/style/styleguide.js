/**
 * FileUI Style Guide Interactive Components
 * Modern, clean JavaScript for style guide functionality
 */

(function() {
    'use strict';
    
    // Constants
    const MOBILE_BREAKPOINT = 1200;
    const MOBILE_TOGGLE_STYLES = {
        position: 'fixed',
        top: '20px',
        zIndex: '1001'
    };
    const DEFAULT_TOAST_DURATION = 5000;
    const TOAST_HIDE_ANIMATION_DURATION = 300;
    const INITIALIZATION_DELAY = 100;
    const TOOLTIP_OFFSET = 8;
    
    // Layout spacing configurations
    const LAYOUT_SPACING = {
        compact: { 
            space4: '0.75rem', 
            space6: '1rem', 
            space8: '1.5rem', 
            space10: '2rem' 
        },
        comfortable: { 
            space4: '1.25rem', 
            space6: '2rem', 
            space8: '2.5rem', 
            space10: '3rem' 
        },
        normal: { 
            space4: '1rem', 
            space6: '1.5rem', 
            space8: '2rem', 
            space10: '2.5rem' 
        }
    };
    
    // Color tint configurations
    const TINT_STRENGTHS = {
        bgPrimaryTint: { dark: 0.08, light: 0.15 },
        bgSecondaryTint: { dark: 0.12, light: 0.20 },
        bgTertiaryTint: { dark: 0.15, light: 0.25 },
        borderTint: { dark: 0.5, light: 0.6 },
        borderStrongOffset: 0.1,
        textTint: { dark: 0.05, light: 0.1 },
        mixRatio: 0.3
    };
    
    // Toast icons
    const TOAST_ICONS = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    
    // Helper function to initialize Lucide icons
    function initializeLucideIcons(element = document) {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ el: element });
        }
    }

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
        initializeLucideIcons();

        // Initialize navigation
        initializeNavigation();
        
        // Initialize responsive behavior
        initializeResponsive();
        
        // Initialize style controls
        initializeStyleControls();
        
        // Initialize popovers
        initializePopovers();
        
        // Initialize tooltips with fixed positioning
        initializeTooltips();
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
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            createMobileToggles();
        }
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth <= MOBILE_BREAKPOINT) {
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
        initializeLucideIcons();
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
        
        // Color tint controls
        const colorTintButtons = document.querySelectorAll('.color-tint-btn');
        colorTintButtons.forEach(button => {
            button.addEventListener('click', function() {
                const tint = this.getAttribute('data-tint');
                applyColorTint(tint);
                
                // Update button states
                colorTintButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            });
        });
        
        // Set default active tint
        const defaultTint = document.querySelector('.color-tint-btn[data-tint="default"]');
        if (defaultTint) {
            defaultTint.classList.add('active');
        }
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
    
    // Apply color tint to theme
    function applyColorTint(tint) {
        const body = document.body;
        const isDark = body.classList.contains('dark');
        
        // Define color tints for blue, red, and amber only
        const tints = {
            default: {
                light: { accent: '#b5d3b6', hover: '#9fc5a1' },
                dark: { accent: '#94b896', hover: '#7fa582' }
            },
            blue: {
                light: { accent: '#b3d9ff', hover: '#99ccff' },
                dark: { accent: '#7ab8d4', hover: '#6aa3bf' }
            },
            red: {
                light: { accent: '#ffb3b3', hover: '#ff9999' },
                dark: { accent: '#d49499', hover: '#bf7f84' }
            },
            amber: {
                light: { accent: '#ffe4b5', hover: '#ffd699' },
                dark: { accent: '#c9a574', hover: '#b89460' }
            }
        };
        
        const tintColors = tints[tint] || tints.default;
        const colors = isDark ? tintColors.dark : tintColors.light;
        
        // Apply the tint colors
        body.style.setProperty('--accent', colors.accent);
        body.style.setProperty('--accent-hover', colors.hover);
        
        // Also update some related colors for consistency
        if (tint !== 'default') {
            // Apply stronger tinting to backgrounds and UI elements
            const tintRgb = hexToRgb(colors.accent);
            if (tintRgb) {
                // Stronger background tints
                const bgPrimaryTint = isDark ? 0.08 : 0.15;
                const bgSecondaryTint = isDark ? 0.12 : 0.20;
                const bgTertiaryTint = isDark ? 0.15 : 0.25;
                
                // Calculate strongly tinted backgrounds
                if (isDark) {
                    // Mix the tint color more prominently with dark backgrounds
                    body.style.setProperty('--bg-primary', 
                        `rgb(${Math.min(255, 26 + tintRgb.r * 0.2)}, ${Math.min(255, 26 + tintRgb.g * 0.2)}, ${Math.min(255, 26 + tintRgb.b * 0.2)})`);
                    body.style.setProperty('--bg-secondary', 
                        `rgb(${Math.min(255, 36 + tintRgb.r * 0.3)}, ${Math.min(255, 36 + tintRgb.g * 0.3)}, ${Math.min(255, 36 + tintRgb.b * 0.3)})`);
                    body.style.setProperty('--bg-tertiary', 
                        `rgb(${Math.min(255, 46 + tintRgb.r * 0.4)}, ${Math.min(255, 46 + tintRgb.g * 0.4)}, ${Math.min(255, 46 + tintRgb.b * 0.4)})`);
                } else {
                    // Mix the tint color more prominently with light backgrounds
                    const mixRatio = 0.3;
                    body.style.setProperty('--bg-primary', 
                        `rgb(${Math.round(168 * (1 - mixRatio) + tintRgb.r * mixRatio)}, ${Math.round(168 * (1 - mixRatio) + tintRgb.g * mixRatio)}, ${Math.round(160 * (1 - mixRatio) + tintRgb.b * mixRatio)})`);
                    body.style.setProperty('--bg-secondary', 
                        `rgb(${Math.round(180 * (1 - mixRatio * 0.8) + tintRgb.r * mixRatio * 0.8)}, ${Math.round(180 * (1 - mixRatio * 0.8) + tintRgb.g * mixRatio * 0.8)}, ${Math.round(172 * (1 - mixRatio * 0.8) + tintRgb.b * mixRatio * 0.8)})`);
                    body.style.setProperty('--bg-tertiary', 
                        `rgb(${Math.round(192 * (1 - mixRatio * 0.6) + tintRgb.r * mixRatio * 0.6)}, ${Math.round(192 * (1 - mixRatio * 0.6) + tintRgb.g * mixRatio * 0.6)}, ${Math.round(184 * (1 - mixRatio * 0.6) + tintRgb.b * mixRatio * 0.6)})`);
                }
                
                // Also tint borders and shadows with stronger effect
                const borderTint = isDark ? 0.5 : 0.6;
                body.style.setProperty('--border-color', 
                    `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, ${borderTint})`);
                body.style.setProperty('--border-strong', 
                    `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, ${borderTint + 0.1})`);
                
                // Update text colors to complement the tint
                if (isDark) {
                    body.style.setProperty('--text-primary', 
                        `rgb(${Math.min(255, 240 + tintRgb.r * 0.05)}, ${Math.min(255, 240 + tintRgb.g * 0.05)}, ${Math.min(255, 240 + tintRgb.b * 0.05)})`);
                    body.style.setProperty('--text-secondary', 
                        `rgb(${Math.min(255, 184 + tintRgb.r * 0.1)}, ${Math.min(255, 184 + tintRgb.g * 0.1)}, ${Math.min(255, 184 + tintRgb.b * 0.1)})`);
                } else {
                    body.style.setProperty('--text-primary', 
                        `rgb(${Math.max(0, 66 - tintRgb.r * 0.1)}, ${Math.max(0, 66 - tintRgb.g * 0.1)}, ${Math.max(0, 66 - tintRgb.b * 0.1)})`);
                    body.style.setProperty('--text-secondary', 
                        `rgb(${Math.max(0, 97 - tintRgb.r * 0.05)}, ${Math.max(0, 97 - tintRgb.g * 0.05)}, ${Math.max(0, 97 - tintRgb.b * 0.05)})`);
                }
                
                // Apply tint to specific UI elements
                body.style.setProperty('--nav-item-hover', colors.accent + '20');
                body.style.setProperty('--card-hover', colors.accent + '15');
                
                // Update shadow colors to match tint
                body.style.setProperty('--shadow-color', `${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}`);
            }
        } else {
            // Reset to default backgrounds
            updateThemeColors(isDark ? 'dark' : 'light');
            // Reset custom properties
            body.style.removeProperty('--nav-item-hover');
            body.style.removeProperty('--card-hover');
            body.style.removeProperty('--shadow-color');
        }
    }
    
    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
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
            if (window.innerWidth <= MOBILE_BREAKPOINT) {
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
                showToast('Copied to clipboard: ' + text, 'success');
            });
        }
    });

    // Enhanced toast notification system
    window.showToast = function(message, type = 'info', options = {}) {
        // Create or get toast container
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Add icon based on type
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        
        // Build toast content
        let toastHTML = `
            <i data-lucide="${icons[type] || 'info'}" class="toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;
        
        // Add action button if provided
        if (options.action) {
            toastHTML += `<div class="toast-action"><button>${options.action.text}</button></div>`;
        }
        
        // Add close button if dismissible
        if (options.dismissible) {
            toastHTML += `<i data-lucide="x" class="toast-close"></i>`;
        }
        
        toast.innerHTML = toastHTML;
        
        // Add progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'toast-progress';
        const duration = options.duration || DEFAULT_TOAST_DURATION;
        progressBar.style.setProperty('--toast-duration', duration + 'ms');
        toast.appendChild(progressBar);
        
        // Add to container
        container.appendChild(toast);
        
        // Initialize icons
        initializeLucideIcons(toast);
        
        // Handle action button
        if (options.action) {
            const actionBtn = toast.querySelector('.toast-action button');
            actionBtn.addEventListener('click', () => {
                options.action.callback();
                removeToast(toast);
            });
        }
        
        // Handle close button
        if (options.dismissible) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => {
                removeToast(toast);
            });
        }
        
        // Auto remove after duration
        const autoRemoveTimeout = setTimeout(() => {
            removeToast(toast);
        }, duration);
        
        // Store timeout so it can be cleared
        toast.autoRemoveTimeout = autoRemoveTimeout;
        
        function removeToast(toastElement) {
            clearTimeout(toastElement.autoRemoveTimeout);
            toastElement.classList.add('hiding');
            setTimeout(() => {
                if (toastElement.parentNode) {
                    toastElement.parentNode.removeChild(toastElement);
                }
                // Remove container if no more toasts
                if (container.children.length === 0) {
                    container.remove();
                }
            }, TOAST_HIDE_ANIMATION_DURATION);
        }
    };

    // Initialize with default state
    setTimeout(() => {
        // Set default font button state
        const defaultFontButton = document.querySelector('[data-font="system"]');
        if (defaultFontButton) {
            defaultFontButton.classList.add('btn-primary');
        }
    }, INITIALIZATION_DELAY);

    function initializePopovers() {
        // Re-initialize Lucide icons for newly added elements
        initializeLucideIcons();
        
        // Handle popover triggers
        const popoverTriggers = document.querySelectorAll('.popover-trigger');
        
        popoverTriggers.forEach(trigger => {
            trigger.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // Find the popover within the same wrapper
                const wrapper = this.closest('.popover-wrapper');
                const popover = wrapper.querySelector('.popover');
                
                // Close all other popovers
                document.querySelectorAll('.popover.active').forEach(p => {
                    if (p !== popover) {
                        p.classList.remove('active');
                    }
                });
                
                // Toggle this popover
                popover.classList.toggle('active');
            });
        });
        
        // Close popovers when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.popover-wrapper')) {
                document.querySelectorAll('.popover.active').forEach(popover => {
                    popover.classList.remove('active');
                });
            }
        });
        
        // Close button in popovers
        document.querySelectorAll('.popover .btn[data-lucide="x"]').forEach(closeBtn => {
            closeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const popover = this.closest('.popover');
                popover.classList.remove('active');
            });
        });
        
        // Handle popover item clicks
        document.querySelectorAll('.popover-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Close the popover
                const popover = this.closest('.popover');
                popover.classList.remove('active');
                
                // Log the action (in a real app, this would perform the action)
                console.log('Popover action:', this.textContent.trim());
            });
        });
    }

    function initializeTooltips() {
        const tooltipWrappers = document.querySelectorAll('.tooltip-wrapper');
        
        tooltipWrappers.forEach(wrapper => {
            const tooltip = wrapper.querySelector('.tooltip');
            if (!tooltip) return;
            
            wrapper.addEventListener('mouseenter', function(e) {
                // First make tooltip visible to get accurate measurements
                tooltip.style.display = 'block';
                tooltip.style.opacity = '0';
                tooltip.style.visibility = 'visible';
                
                // Reset any previous transforms
                tooltip.style.transform = '';
                
                // Get the wrapper's position
                const rect = wrapper.getBoundingClientRect();
                
                // Force layout to get accurate tooltip dimensions
                const tooltipRect = tooltip.getBoundingClientRect();
                
                // Calculate position based on tooltip direction
                let left, top, transform = '';
                
                if (tooltip.classList.contains('tooltip-top')) {
                    left = rect.left + rect.width / 2;
                    top = rect.top - tooltipRect.height - TOOLTIP_OFFSET;
                    transform = 'translateX(-50%)';
                } else if (tooltip.classList.contains('tooltip-bottom')) {
                    left = rect.left + rect.width / 2;
                    top = rect.bottom + TOOLTIP_OFFSET;
                    transform = 'translateX(-50%)';
                } else if (tooltip.classList.contains('tooltip-left')) {
                    left = rect.left - tooltipRect.width - TOOLTIP_OFFSET;
                    top = rect.top + rect.height / 2;
                    transform = 'translateY(-50%)';
                } else if (tooltip.classList.contains('tooltip-right')) {
                    left = rect.right + TOOLTIP_OFFSET;
                    top = rect.top + rect.height / 2;
                    transform = 'translateY(-50%)';
                }
                
                // Apply initial position
                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
                tooltip.style.transform = transform;
                
                // Force layout recalculation
                tooltip.offsetHeight;
                
                // Check if tooltip goes out of viewport and adjust
                const finalRect = tooltip.getBoundingClientRect();
                
                // Adjust horizontal position if needed
                if (finalRect.left < 0) {
                    tooltip.style.left = TOOLTIP_OFFSET + 'px';
                    tooltip.style.transform = 'none';
                } else if (finalRect.right > window.innerWidth) {
                    tooltip.style.left = (window.innerWidth - finalRect.width - TOOLTIP_OFFSET) + 'px';
                    tooltip.style.transform = 'none';
                }
                
                // Adjust vertical position if needed
                if (finalRect.top < 0) {
                    tooltip.style.top = TOOLTIP_OFFSET + 'px';
                } else if (finalRect.bottom > window.innerHeight) {
                    tooltip.style.top = (window.innerHeight - finalRect.height - TOOLTIP_OFFSET) + 'px';
                }
                
                // Now make it visible with opacity
                tooltip.style.visibility = '';
                tooltip.style.opacity = '';
            });
            
            wrapper.addEventListener('mouseleave', function(e) {
                const tooltip = wrapper.querySelector('.tooltip');
                if (tooltip) {
                    tooltip.style.display = '';
                    tooltip.style.visibility = '';
                    tooltip.style.opacity = '';
                }
            });
        });
    }

    // Modal functions
    window.showModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal && modal.classList.contains('modal-backdrop')) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Initialize icons in the modal
            initializeLucideIcons(modal);
            
            // Handle escape key
            const escapeHandler = function(e) {
                if (e.key === 'Escape') {
                    closeModal(modalId);
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        }
    };

    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal && modal.classList.contains('modal-backdrop')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

})();