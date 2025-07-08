/**
 * FileUI Styles - Simple UI Component Library
 * Minimal, efficient UI components extracted from style guide
 * 
 * Configuration:
 * - TOAST_DURATION: 5000ms - Duration before toast auto-dismisses
 * - MODAL_ANIMATION_DURATION: 300ms - Modal fade in/out duration
 * - MENU_ANIMATION_DURATION: 150ms - Menu open/close animation
 * - TOOLTIP_MARGIN: 12px - Spacing between tooltip and target
 * - POPOVER_MARGIN: 8px - Spacing between popover and trigger
 * - MOBILE_BREAKPOINT: 768px - Breakpoint for mobile layout
 * - ACCENT_COLORS: Array of semantic colors for theme cycling
 * - TOAST_ICONS: Icon mappings for toast types
 */

(function() {
    'use strict';
    
    // Configuration constants
    const CONFIG = {
        // Animation durations
        TOAST_DURATION: 5000,
        MODAL_ANIMATION_DURATION: 300,
        MENU_ANIMATION_DURATION: 150,
        
        // Viewport settings
        TOOLTIP_MARGIN: 12,
        POPOVER_MARGIN: 8,
        MOBILE_BREAKPOINT: 768,
        
        // Component defaults
        ACCENT_COLORS: [
            { name: 'primary', color: 'var(--primary)' },
            { name: 'success', color: 'var(--success)' },
            { name: 'warning', color: 'var(--warning)' },
            { name: 'error', color: 'var(--error)' },
            { name: 'info', color: 'var(--info)' },
            { name: 'neutral', color: 'var(--neutral)' }
        ],
        
        // Icon mappings
        TOAST_ICONS: {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        }
    };
    
    // Simple UI component system
    // Provides factory methods for creating UI components with consistent styling
    const UI = {
        // Initialize icons after adding elements
        icons() {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({
                    class: 'lucide'
                });
                
                // Apply saved stroke width if exists
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
        
        // Toggle active class on elements
        toggleActive(selector, target) {
            document.querySelectorAll(selector).forEach(el => {
                el.classList.remove('active');
            });
            if (target) target.classList.add('active');
        },
        
        // Build CSS class string from array
        buildClasses(...classes) {
            return classes.filter(Boolean).join(' ');
        },
        

        // Create a button element
        button(text, options = {}) {
            const btn = document.createElement('button');
            
            btn.className = this.buildClasses(
                'btn',
                options.variant && `btn-${options.variant}`,
                options.size && `btn-${options.size}`,
                options.class
            );
            
            if (options.icon && text) {
                btn.innerHTML = `<i data-lucide="${options.icon}" class="lucide"></i> <span>${text}</span>`;
            } else if (options.icon) {
                btn.innerHTML = `<i data-lucide="${options.icon}" class="lucide"></i>`;
            } else {
                btn.innerHTML = `<span>${text}</span>`;
            }
            
            if (options.onclick) btn.onclick = options.onclick;
            if (options.disabled) btn.disabled = true;
            
            // Auto-initialize icons
            this.deferIcons();
            
            return btn;
        },

        // Create a card element
        card(title, content, options = {}) {
            const card = document.createElement('div');
            card.className = this.buildClasses('card', options.class);
            
            let html = '';
            if (title) {
                // Build card header with icon and actions
                let headerContent = '';
                
                // Left side with icon and title
                headerContent += '<div class="card-header-left">';
                if (options.icon) {
                    headerContent += `<i data-lucide="${options.icon}" class="card-icon lucide"></i>`;
                }
                headerContent += `<h3 class="card-title">${title}</h3>`;
                headerContent += '</div>';
                
                // Right side with actions
                if (options.actions) {
                    headerContent += '<div class="card-header-actions">';
                    options.actions.forEach(action => {
                        const btn = this.button(action.text || '', {
                            icon: action.icon,
                            size: 'sm',
                            variant: action.variant,
                            onclick: action.onclick,
                            class: 'card-action-btn'
                        });
                        headerContent += btn.outerHTML;
                    });
                    headerContent += '</div>';
                }
                
                html += `
                    <div class="card-header">
                        ${headerContent}
                    </div>
                `;
            }
            
            html += `<div class="card-body">${content}</div>`;
            
            // Add footer if there's a description or custom footer content
            if (options.description || options.footer) {
                html += '<div class="card-footer">';
                if (options.description) {
                    html += `<p class="card-description">${options.description}</p>`;
                }
                if (options.footer) {
                    html += options.footer;
                }
                html += '</div>';
            }
            
            card.innerHTML = html;
            
            // Re-bind action button events after DOM insertion
            if (options.actions) {
                setTimeout(() => {
                    options.actions.forEach((action, index) => {
                        if (action.onclick) {
                            const btn = card.querySelectorAll('.card-action-btn')[index];
                            if (btn) btn.onclick = action.onclick;
                        }
                    });
                }, 0);
                this.deferIcons();
            }
            
            return card;
        },

        // Show a toast notification
        toast(message, type = 'info', options = {}) {
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
            
            // Toast content
            const icons = CONFIG.TOAST_ICONS;
            
            let iconHTML = '';
            if (options.preloader) {
                iconHTML = '<div class="loading-spinner toast-icon"></div>';
            } else {
                iconHTML = `<i data-lucide="${icons[type] || 'info'}" class="toast-icon lucide"></i>`;
            }
            
            let toastHTML = `
                ${iconHTML}
                <span class="toast-message">${message}</span>
            `;
            
            if (options.action) {
                toastHTML += `<div class="toast-action"><button class="btn btn-sm">${options.action.text}</button></div>`;
            }
            
            if (options.dismissible) {
                toastHTML += `<i data-lucide="x" class="toast-close lucide"></i>`;
            }
            
            toast.innerHTML = toastHTML;
            
            // Add progress bar
            const progressBar = document.createElement('div');
            progressBar.className = 'toast-progress';
            const duration = options.duration || CONFIG.TOAST_DURATION;
            progressBar.style.setProperty('--toast-duration', duration + 'ms');
            toast.appendChild(progressBar);
            
            // Add to container
            container.appendChild(toast);
            
            // Initialize icons
            this.icons();
            
            // Handle action button
            if (options.action) {
                const actionBtn = toast.querySelector('.toast-action button');
                actionBtn.addEventListener('click', () => {
                    options.action.callback();
                    removeToast();
                });
            }
            
            // Handle close button
            if (options.dismissible) {
                const closeBtn = toast.querySelector('.toast-close');
                closeBtn.addEventListener('click', removeToast);
            }
            
            // Auto remove after duration
            const autoRemoveTimeout = setTimeout(removeToast, duration);
            
            function removeToast() {
                clearTimeout(autoRemoveTimeout);
                toast.classList.add('hiding');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                    // Remove container if no more toasts
                    if (container.children.length === 0) {
                        container.remove();
                    }
                }, CONFIG.MODAL_ANIMATION_DURATION);
            }
            
            return toast;
        },

        // Show a modal dialog
        modal(content, options = {}) {
            // Create backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = this.buildClasses('modal', options.size);
            
            let html = '';
            
            // Modal header
            if (options.title) {
                html += `
                    <div class="modal-header">
                        <h3>${options.title}</h3>
                        <button class="modal-close" aria-label="Close">
                            <i data-lucide="x" class="lucide"></i>
                        </button>
                    </div>
                `;
            }
            
            // Modal body
            html += `<div class="modal-body">${content}</div>`;
            
            // Modal footer with actions
            if (options.actions) {
                html += '<div class="modal-footer">';
                options.actions.forEach(action => {
                    const btn = this.button(action.text, {
                        variant: action.variant,
                        onclick: action.onclick
                    });
                    html += btn.outerHTML;
                });
                html += '</div>';
            }
            
            modal.innerHTML = html;
            backdrop.appendChild(modal);
            document.body.appendChild(backdrop);
            
            // Initialize icons
            this.icons();
            
            // Show animation
            requestAnimationFrame(() => {
                backdrop.classList.add('show');
                modal.classList.add('show');
            });
            
            // Close handlers
            const closeModal = () => {
                backdrop.classList.remove('show');
                modal.classList.remove('show');
                setTimeout(() => backdrop.remove(), CONFIG.MODAL_ANIMATION_DURATION);
                if (options.onclose) options.onclose();
            };
            
            // Close button
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.onclick = closeModal;
            }
            
            // Backdrop click
            backdrop.onclick = (e) => {
                if (e.target === backdrop && options.closeOnBackdrop !== false) {
                    closeModal();
                }
            };
            
            // Escape key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
            
            // Re-bind action handlers after HTML insertion
            if (options.actions) {
                const buttons = modal.querySelectorAll('.modal-footer button');
                options.actions.forEach((action, index) => {
                    if (buttons[index] && action.onclick) {
                        buttons[index].onclick = () => {
                            action.onclick();
                            if (action.closeModal !== false) closeModal();
                        };
                    }
                });
            }
            
            return { modal, backdrop, close: closeModal };
        },

        // Create a badge
        badge(text, variant = 'default') {
            const badge = document.createElement('span');
            badge.className = this.buildClasses('badge', variant && `badge-${variant}`);
            badge.textContent = text;
            return badge;
        },

        // Create a spinner
        spinner(options = {}) {
            const spinner = document.createElement('div');
            spinner.className = this.buildClasses('loading-spinner', options.class);
            if (options.size) {
                spinner.style.width = options.size;
                spinner.style.height = options.size;
            }
            return spinner;
        },



        // Create a menu
        menu(items, options = {}) {
            const menu = document.createElement('div');
            menu.className = 'menu';
            
            items.forEach((item, index) => {
                if (item.divider) {
                    const divider = document.createElement('div');
                    divider.className = 'menu-divider';
                    menu.appendChild(divider);
                } else {
                    const menuItem = document.createElement('button');
                    menuItem.className = 'menu-item';
                    menuItem.innerHTML = item.icon ? 
                        `<i data-lucide="${item.icon}"></i> ${item.text}` : 
                        item.text;
                    
                    if (item.onclick) {
                        menuItem.onclick = (e) => {
                            e.stopPropagation();
                            item.onclick();
                            menu.classList.remove('active');
                            // Remove menu from DOM after animation
                            setTimeout(() => {
                                if (menu.parentNode) menu.remove();
                            }, CONFIG.MENU_ANIMATION_DURATION);
                        };
                    }
                    
                    menu.appendChild(menuItem);
                }
            });
            
            // Auto-initialize icons
            this.deferIcons();
            
            return menu;
        },

        // Create a context menu
        contextMenu(items) {
            const menu = this.menu(items);
            menu.classList.add('context-menu');
            document.body.appendChild(menu);
            
            return {
                show(x, y) {
                    menu.style.left = x + 'px';
                    menu.style.top = y + 'px';
                    menu.classList.add('active');
                    
                    // Ensure menu stays in viewport
                    const rect = menu.getBoundingClientRect();
                    if (rect.right > window.innerWidth) {
                        menu.style.left = (x - rect.width) + 'px';
                    }
                    if (rect.bottom > window.innerHeight) {
                        menu.style.top = (y - rect.height) + 'px';
                    }
                },
                
                hide() {
                    menu.classList.remove('active');
                },
                
                destroy() {
                    menu.remove();
                }
            };
        },

        // Create a panel
        panel(title, content, options = {}) {
            const panel = document.createElement('div');
            panel.className = 'panel';
            if (options.collapsible) panel.classList.add('panel-collapsible');
            
            let html = `
                <div class="panel-header">
                    <div class="panel-title">
                        ${options.icon ? `<i data-lucide="${options.icon}" class="lucide"></i>` : ''}
                        ${title}
                    </div>
                    <div class="panel-actions">
                        ${options.collapsible ? '<button class="btn btn-sm panel-toggle"><i data-lucide="chevron-down" class="lucide"></i></button>' : ''}
                    </div>
                </div>
                <div class="panel-body">${content}</div>
            `;
            
            panel.innerHTML = html;
            
            // Add collapse functionality
            if (options.collapsible) {
                const toggle = panel.querySelector('.panel-toggle');
                const body = panel.querySelector('.panel-body');
                
                toggle.onclick = () => {
                    panel.classList.toggle('panel-collapsed');
                    const icon = toggle.querySelector('i');
                    icon.setAttribute('data-lucide', 
                        panel.classList.contains('panel-collapsed') ? 'chevron-right' : 'chevron-down'
                    );
                    this.icons(); // Re-initialize icons
                };
            }
            
            // Initialize icons
            this.deferIcons();
            
            return panel;
        },

        // Create a tag
        tag(text, options = {}) {
            const tag = document.createElement('span');
            
            tag.className = this.buildClasses(
                'tag',
                options.variant && `tag-${options.variant}`,
                options.size && `tag-${options.size}`
            );
            tag.textContent = text;
            
            // Add close button if closable
            if (options.closable) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'tag-close';
                closeBtn.innerHTML = '<i data-lucide="x" class="lucide"></i>';
                closeBtn.onclick = () => {
                    if (options.onClose) options.onClose();
                    tag.remove();
                };
                tag.appendChild(closeBtn);
            }
            
            // Initialize icons
            this.deferIcons();
            
            return tag;
        },

        // Create a control panel (right side)
        controlPanel() {
            const panel = document.createElement('div');
            panel.className = 'control-panel collapsed';
            panel.id = 'control-panel';
            
            const header = document.createElement('div');
            header.className = 'control-panel-header';
            header.innerHTML = `
                <div class="control-panel-title">
                    <i data-lucide="settings" class="control-panel-icon lucide"></i>
                    <span>Settings</span>
                </div>
            `;
            panel.appendChild(header);
            
            const content = document.createElement('div');
            content.className = 'control-panel-content';
            
            const controls = document.createElement('div');
            controls.className = 'control-panel-controls';
            
            // Theme control group
            const themeGroup = document.createElement('div');
            themeGroup.className = 'control-group';
            themeGroup.innerHTML = '<span class="control-label" data-i18n="theme">Theme</span>';
            const themeBtn = this.button(this.theme.get() === 'dark' ? 'Light Mode' : 'Dark Mode', { 
                icon: this.theme.get() === 'dark' ? 'sun' : 'moon', 
                size: 'sm',
                class: 'theme-toggle-panel',
                onclick: () => {
                    this.theme.toggle();
                    const isDark = this.theme.get() === 'dark';
                    // Rebuild button contents to avoid null reference after Lucide replaces <i> with <svg>
                    themeBtn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" class="lucide"></i> <span>${isDark ? 'Light Mode' : 'Dark Mode'}</span>`;
                    themeBtn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
                    this.icons();
                }
            });
            themeBtn.setAttribute('aria-label', 'Toggle theme');
            themeBtn.setAttribute('title', this.theme.get() === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
            themeGroup.appendChild(themeBtn);
            
            // Add tint button to theme group
            const accentColors = CONFIG.ACCENT_COLORS;
            let currentAccentIndex = 0;
            
            const tintBtn = this.button('Tint', { 
                icon: 'paint-bucket', 
                size: 'sm',
                class: 'tint-toggle',
                onclick: () => {
                    currentAccentIndex = (currentAccentIndex + 1) % accentColors.length;
                    const newTint = accentColors[currentAccentIndex];
                    
                    // Apply tint to body
                    document.body.setAttribute('data-tint', newTint.name);
                    
                    // Update button tooltip
                    tintBtn.setAttribute('title', `Theme tint: ${newTint.name}`);
                    
                    // Save preference
                    localStorage.setItem('fileui-tint', newTint.name);
                }
            });
            tintBtn.setAttribute('title', 'Cycle theme tint');
            themeGroup.appendChild(tintBtn);
            
            // Add accent button to theme group
            let currentAccentColorIndex = 0;
            const accentBtn = this.button('Accent', { 
                icon: 'droplet', 
                size: 'sm',
                class: 'accent-color-toggle',
                onclick: () => {
                    currentAccentColorIndex = (currentAccentColorIndex + 1) % accentColors.length;
                    const newAccent = accentColors[currentAccentColorIndex];
                    
                    // Apply accent color directly
                    document.documentElement.style.setProperty('--accent', newAccent.color);
                    
                    // Update button tooltip
                    accentBtn.setAttribute('title', `Accent: ${newAccent.name}`);
                    
                    // Save preference
                    localStorage.setItem('fileui-accent-color', JSON.stringify(newAccent));
                }
            });
            accentBtn.setAttribute('title', 'Cycle accent color');
            themeGroup.appendChild(accentBtn);
            
            // Restore saved tint
            const savedTint = localStorage.getItem('fileui-tint');
            if (savedTint) {
                document.body.setAttribute('data-tint', savedTint);
                currentAccentIndex = accentColors.findIndex(c => c.name === savedTint);
                if (currentAccentIndex === -1) currentAccentIndex = 0;
                tintBtn.setAttribute('title', `Theme tint: ${savedTint}`);
            }
            
            // Restore saved accent color
            const savedAccentColor = localStorage.getItem('fileui-accent-color');
            if (savedAccentColor) {
                try {
                    const accent = JSON.parse(savedAccentColor);
                    document.documentElement.style.setProperty('--accent', accent.color);
                    currentAccentColorIndex = accentColors.findIndex(c => c.name === accent.name);
                    if (currentAccentColorIndex === -1) currentAccentColorIndex = 0;
                    accentBtn.setAttribute('title', `Accent: ${accent.name}`);
                } catch (e) {
                    console.log('Failed to restore accent color');
                }
            }
            
            // Font control group
            const fontGroup = document.createElement('div');
            fontGroup.className = 'control-group';
            fontGroup.innerHTML = '<span class="control-label" data-i18n="font">Font</span>';
            const fontBtnGroup = document.createElement('div');
            fontBtnGroup.className = 'btn-group';
            
            const systemBtn = this.button('System', { 
                icon: 'type', 
                size: 'sm',
                class: 'font-toggle active',
                onclick: () => {
                    this.toggleActive('.font-toggle', systemBtn);
                    document.body.style.fontFamily = 'var(--font-system)';
                }
            });
            systemBtn.dataset.font = 'system';
            systemBtn.setAttribute('title', 'System Font');
            
            const monoBtn = this.button('Mono', { 
                icon: 'terminal', 
                size: 'sm',
                class: 'font-toggle',
                onclick: () => {
                    this.toggleActive('.font-toggle', monoBtn);
                    document.body.style.fontFamily = 'var(--font-mono)';
                }
            });
            monoBtn.dataset.font = 'mono';
            monoBtn.setAttribute('title', 'Monospace Font');
            
            fontBtnGroup.appendChild(systemBtn);
            fontBtnGroup.appendChild(monoBtn);
            fontGroup.appendChild(fontBtnGroup);
            
            // Density control group
            const densityGroup = document.createElement('div');
            densityGroup.className = 'control-group';
            densityGroup.innerHTML = '<span class="control-label" data-i18n="density">Density</span>';
            const densityBtnGroup = document.createElement('div');
            densityBtnGroup.className = 'btn-group';
            
            const comfortableBtn = this.button('Comfortable', { 
                icon: 'maximize', 
                size: 'sm',
                class: 'density-toggle active',
                onclick: () => {
                    this.toggleActive('.density-toggle', comfortableBtn);
                    document.body.classList.remove('compact');
                }
            });
            comfortableBtn.dataset.density = 'comfortable';
            comfortableBtn.setAttribute('title', 'Comfortable Spacing');
            
            const compactBtn = this.button('Compact', { 
                icon: 'minimize', 
                size: 'sm',
                class: 'density-toggle',
                onclick: () => {
                    this.toggleActive('.density-toggle', compactBtn);
                    document.body.classList.add('compact');
                }
            });
            compactBtn.dataset.density = 'compact';
            compactBtn.setAttribute('title', 'Compact Spacing');
            
            densityBtnGroup.appendChild(comfortableBtn);
            densityBtnGroup.appendChild(compactBtn);
            densityGroup.appendChild(densityBtnGroup);
            
            // Language control group
            const langGroup = document.createElement('div');
            langGroup.className = 'control-group';
            langGroup.innerHTML = '<span class="control-label" data-i18n="language">Language</span>';
            const langToggle = this.button(this.language.get() === 'zh' ? 'EN' : '中文', {
                icon: 'globe',
                size: 'sm',
                onclick: () => {
                    const newLang = this.language.toggle();
                    langToggle.innerHTML = `<i data-lucide="globe" class="lucide"></i> <span>${newLang === 'zh' ? 'EN' : '中文'}</span>`;
                    this.icons();
                }
            });
            langGroup.appendChild(langToggle);

            // Icon size control group
            const iconSizeGroup = document.createElement('div');
            iconSizeGroup.className = 'control-group';
            iconSizeGroup.innerHTML = '<span class="control-label">Icon Size</span>';
            
            const iconSizeSlider = document.createElement('input');
            iconSizeSlider.type = 'range';
            iconSizeSlider.min = '16';
            iconSizeSlider.max = '24';
            iconSizeSlider.value = '20';
            iconSizeSlider.className = 'slider';
            
            const iconSizeValue = document.createElement('span');
            iconSizeValue.className = 'slider-value';
            iconSizeValue.textContent = '20px';
            
            const iconSizeContainer = document.createElement('div');
            iconSizeContainer.className = 'slider-container';
            iconSizeContainer.appendChild(iconSizeSlider);
            iconSizeContainer.appendChild(iconSizeValue);
            iconSizeGroup.appendChild(iconSizeContainer);
            
            iconSizeSlider.oninput = () => {
                const size = iconSizeSlider.value;
                iconSizeValue.textContent = size + 'px';
                document.documentElement.style.setProperty('--icon-size-md', size + 'px');
                localStorage.setItem('fileui-icon-size', size);
            };
            
            // Icon stroke width control group
            const strokeWidthGroup = document.createElement('div');
            strokeWidthGroup.className = 'control-group';
            strokeWidthGroup.innerHTML = '<span class="control-label">Icon Stroke</span>';
            
            const strokeWidthSlider = document.createElement('input');
            strokeWidthSlider.type = 'range';
            strokeWidthSlider.min = '1';
            strokeWidthSlider.max = '3';
            strokeWidthSlider.step = '0.5';
            strokeWidthSlider.value = '2';
            strokeWidthSlider.className = 'slider';
            
            const strokeWidthValue = document.createElement('span');
            strokeWidthValue.className = 'slider-value';
            strokeWidthValue.textContent = '2';
            
            const strokeWidthContainer = document.createElement('div');
            strokeWidthContainer.className = 'slider-container';
            strokeWidthContainer.appendChild(strokeWidthSlider);
            strokeWidthContainer.appendChild(strokeWidthValue);
            strokeWidthGroup.appendChild(strokeWidthContainer);
            
            strokeWidthSlider.oninput = () => {
                const width = strokeWidthSlider.value;
                strokeWidthValue.textContent = width;
                document.querySelectorAll('.lucide').forEach(icon => {
                    icon.style.strokeWidth = width;
                });
                localStorage.setItem('fileui-stroke-width', width);
            };
            
            // Restore saved icon settings
            const savedIconSize = localStorage.getItem('fileui-icon-size');
            if (savedIconSize) {
                iconSizeSlider.value = savedIconSize;
                iconSizeValue.textContent = savedIconSize + 'px';
                document.documentElement.style.setProperty('--icon-size-md', savedIconSize + 'px');
            }
            
            const savedStrokeWidth = localStorage.getItem('fileui-stroke-width');
            if (savedStrokeWidth) {
                strokeWidthSlider.value = savedStrokeWidth;
                strokeWidthValue.textContent = savedStrokeWidth;
                document.querySelectorAll('.lucide').forEach(icon => {
                    icon.style.strokeWidth = savedStrokeWidth;
                });
            }
            
            // Semantic colors control group
            const semanticColorsGroup = document.createElement('div');
            semanticColorsGroup.className = 'control-group';
            semanticColorsGroup.innerHTML = '<span class="control-label">Semantic Colors</span>';
            
            const semanticColors = [
                { name: 'primary', label: 'Primary', default: '#b3d9ff', icon: 'star' },
                { name: 'success', label: 'Success', default: '#b8e6b8', icon: 'check-circle' },
                { name: 'warning', label: 'Warning', default: '#ffe4a3', icon: 'alert-triangle' },
                { name: 'error', label: 'Error', default: '#ffb3ba', icon: 'x-circle' },
                { name: 'info', label: 'Info', default: '#d4c5f9', icon: 'info' }
            ];
            
            semanticColors.forEach(color => {
                const colorCard = document.createElement('div');
                colorCard.className = 'color-card';
                colorCard.style.cssText = 'background: var(--bg-tertiary); border-radius: var(--radius-md); padding: var(--space-3); margin-bottom: var(--space-2);';
                
                const colorContainer = document.createElement('div');
                colorContainer.className = 'color-control';
                colorContainer.style.cssText = 'display: flex; align-items: center; gap: var(--space-2);';
                
                const colorIcon = document.createElement('i');
                colorIcon.setAttribute('data-lucide', color.icon);
                colorIcon.className = 'color-icon lucide color-details';
                colorIcon.style.cssText = 'width: var(--icon-size-md); height: var(--icon-size-md); flex-shrink: 0;';
                
                const colorLabel = document.createElement('span');
                colorLabel.textContent = color.label;
                colorLabel.className = 'color-label color-details';
                colorLabel.style.cssText = 'font-size: var(--text-xs); min-width: 50px; font-weight: var(--font-medium);';
                
                const colorPicker = document.createElement('input');
                colorPicker.type = 'color';
                colorPicker.value = color.default;
                colorPicker.className = 'color-swatch';
                colorPicker.style.cssText = 'width: 32px; height: 32px; border-radius: var(--radius-md); cursor: pointer; background: none; padding: 0;';
                
                const resetBtn = document.createElement('button');
                resetBtn.innerHTML = '<i data-lucide="rotate-ccw" class="lucide"></i>';
                resetBtn.className = 'btn btn-reset color-details';
                resetBtn.style.cssText = 'width: 32px; height: 32px; padding: 0; min-width: auto; background: var(--bg-tertiary); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;';
                resetBtn.title = `Reset ${color.label} to default`;
                
                // Load saved color
                const savedColor = localStorage.getItem(`fileui-color-${color.name}`);
                if (savedColor) {
                    colorPicker.value = savedColor;
                    document.documentElement.style.setProperty(`--${color.name}`, savedColor);
                }
                
                // Color picker change handler
                colorPicker.oninput = () => {
                    const newColor = colorPicker.value;
                    document.documentElement.style.setProperty(`--${color.name}`, newColor);
                    localStorage.setItem(`fileui-color-${color.name}`, newColor);
                };
                
                // Reset button handler
                resetBtn.onclick = () => {
                    colorPicker.value = color.default;
                    document.documentElement.style.setProperty(`--${color.name}`, color.default);
                    localStorage.setItem(`fileui-color-${color.name}`, color.default);
                };
                
                colorContainer.appendChild(colorIcon);
                colorContainer.appendChild(colorLabel);
                colorContainer.appendChild(colorPicker);
                colorContainer.appendChild(resetBtn);
                colorCard.appendChild(colorContainer);
                semanticColorsGroup.appendChild(colorCard);
            });
            
            // Assemble control panel
            controls.appendChild(themeGroup);
            controls.appendChild(fontGroup);
            controls.appendChild(densityGroup);
            controls.appendChild(langGroup);
            controls.appendChild(iconSizeGroup);
            controls.appendChild(strokeWidthGroup);
            controls.appendChild(semanticColorsGroup);
            content.appendChild(controls);
            panel.appendChild(content);
            
            // Add footer
            const footer = document.createElement('div');
            footer.className = 'control-panel-footer';
            panel.appendChild(footer);
            
            // Initialize icons
            this.deferIcons();
            
            return panel;
        },

        // Create a navigation panel
        navPanel(sections, options = {}) {
            const panel = document.createElement('div');
            panel.className = options.startCollapsed ? 'nav-panel collapsed' : 'nav-panel';
            panel.id = 'nav-panel';
            
            let html = '';
            
            // Header
            if (options.title) {
                html += `
                    <div class="nav-panel-header">
                        <div class="nav-panel-title">
                            ${options.icon ? `<i data-lucide="${options.icon}" class="nav-panel-icon lucide"></i>` : ''}
                            <span>${options.title}</span>
                        </div>
                    </div>
                `;
            }
            
            // Content
            html += '<div class="nav-panel-content">';
            
            sections.forEach((section, index) => {
                const sectionId = `nav-section-${index}`;
                const isCollapsed = section.collapsed === true ? ' collapsed' : '';
                
                html += `<div class="nav-section${isCollapsed}" id="${sectionId}">`;
                
                if (section.title) {
                    html += `
                        <div class="nav-section-header" data-section-id="${sectionId}">
                            <i data-lucide="chevron-down" class="nav-section-toggle lucide"></i>
                            <span class="nav-section-title">${section.title}</span>
                        </div>
                    `;
                }
                
                html += '<div class="nav-section-items">';
                
                section.items.forEach(item => {
                    const isActive = item.active ? ' active' : '';
                    const badge = item.badge ? `<span class="nav-item-badge">${item.badge}</span>` : '';
                    
                    html += `
                        <button class="nav-item${isActive}" data-nav-item="${item.id || ''}" title="${item.text}">
                            ${item.icon ? `<i data-lucide="${item.icon}" class="nav-item-icon lucide"></i>` : ''}
                            <span>${item.text}</span>
                            ${badge}
                        </button>
                    `;
                });
                
                html += '</div></div>';
            });
            
            html += '</div>';
            
            html += '</div>';
            
            panel.innerHTML = html;
            
            // Add footer with toggle button
            const footer = document.createElement('div');
            footer.className = 'nav-panel-footer';
            panel.appendChild(footer);
            
            // Add event handlers
            panel.addEventListener('click', (e) => {
                // Handle section headers (collapse/expand)
                const sectionHeader = e.target.closest('.nav-section-header');
                if (sectionHeader) {
                    const sectionId = sectionHeader.dataset.sectionId;
                    const section = document.getElementById(sectionId);
                    if (section) {
                        section.classList.toggle('collapsed');
                        // Re-initialize icons for the chevron rotation
                        this.icons();
                    }
                    return;
                }
                
                // Handle nav items
                const navItem = e.target.closest('.nav-item');
                if (navItem) {
                    // Toggle active state
                    this.toggleActive('.nav-item', navItem);
                    
                    // Find corresponding section and callback
                    const itemId = navItem.dataset.navItem;
                    sections.forEach(section => {
                        const item = section.items.find(i => i.id === itemId);
                        if (item && item.onclick) {
                            item.onclick();
                        }
                    });
                }
            });
            
            // Initialize icons
            this.deferIcons();
            
            return panel;
        },

        // Create navigation toggle button
        navToggle(targetPanelId = 'nav-panel') {
            const toggle = document.createElement('button');
            toggle.className = 'btn nav-panel-toggle';
            toggle.innerHTML = '<i data-lucide="chevron-left" class="lucide"></i> <span>Collapse</span>';
            toggle.setAttribute('aria-label', 'Toggle navigation');
            
            toggle.onclick = () => {
                const panel = document.getElementById(targetPanelId);
                if (panel) {
                    panel.classList.toggle('collapsed');
                    const isCollapsed = panel.classList.contains('collapsed');
                    toggle.querySelector('i').setAttribute('data-lucide', isCollapsed ? 'chevron-right' : 'chevron-left');
                    const span = toggle.querySelector('span');
                    if (span) span.textContent = isCollapsed ? 'Expand' : 'Collapse';
                    this.icons();
                    
                    // On mobile, also toggle open class
                    if (window.innerWidth <= CONFIG.MOBILE_BREAKPOINT) {
                        panel.classList.toggle('open');
                    }
                }
            };
            
            // Initialize icon
            this.deferIcons();
            
            return toggle;
        },

        // Create control panel toggle button
        controlToggle(targetPanelId = 'control-panel') {
            const toggle = document.createElement('button');
            toggle.className = 'btn control-panel-toggle';
            toggle.innerHTML = '<i data-lucide="chevron-right" class="lucide"></i> <span>Collapse</span>';
            toggle.setAttribute('aria-label', 'Toggle settings');
            
            toggle.onclick = () => {
                const panel = document.getElementById(targetPanelId);
                if (panel) {
                    panel.classList.toggle('collapsed');
                    const isCollapsed = panel.classList.contains('collapsed');
                    toggle.querySelector('i').setAttribute('data-lucide', isCollapsed ? 'chevron-left' : 'chevron-right');
                    const span = toggle.querySelector('span');
                    if (span) span.textContent = isCollapsed ? 'Expand' : 'Collapse';
                    this.icons();
                }
            };
            
            // Initialize icon
            this.deferIcons();
            
            return toggle;
        },

        // Close navigation on mobile when clicking backdrop
        initNavigation() {
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= CONFIG.MOBILE_BREAKPOINT) {
                    const panel = document.querySelector('.nav-panel');
                    const toggle = document.querySelector('.nav-panel-toggle');
                    
                    if (panel && panel.classList.contains('open') && 
                        !panel.contains(e.target) && 
                        !toggle.contains(e.target)) {
                        panel.classList.remove('open');
                    }
                }
            });
        },

        // Initialize all interactive components
        init() {
            this.initContextMenus();
            this.initNavigation();
        },



        // Initialize context menus
        initContextMenus() {
            document.addEventListener('contextmenu', (e) => {
                const target = e.target.closest('[data-context-menu]');
                if (target) {
                    e.preventDefault();
                    
                    // Hide existing context menus
                    document.querySelectorAll('.context-menu.active').forEach(menu => {
                        menu.classList.remove('active');
                    });
                    
                    // Show context menu if exists
                    const menuId = target.dataset.contextMenu;
                    const menu = document.getElementById(menuId);
                    if (menu) {
                        menu.style.left = e.pageX + 'px';
                        menu.style.top = e.pageY + 'px';
                        menu.classList.add('active');
                    }
                }
            });
        },

        // Create sticky theme toggle
        themeToggle() {
            const toggle = document.createElement('button');
            toggle.className = 'btn theme-toggle';
            toggle.setAttribute('aria-label', 'Toggle theme');
            
            const updateIcon = () => {
                const icon = this.theme.get() === 'dark' ? 'sun' : 'moon';
                toggle.innerHTML = `<i data-lucide="${icon}"></i>`;
                this.icons();
            };
            
            toggle.onclick = () => {
                this.theme.toggle();
                updateIcon();
            };
            
            updateIcon();
            return toggle;
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
            translations: {
                en: {
                    // Left Nav
                    componentsNav: 'Components',
                    design: 'DESIGN',
                    colors: 'Colors',
                    cssVariables: 'CSS Variables',
                    icons: 'Icons',
                    typography: 'Typography',
                    layout: 'LAYOUT',
                    gridSystem: 'Grid System',
                    gridPatterns: 'Grid Patterns',
                    cards: 'Cards',
                    components: 'COMPONENTS',
                    buttons: 'Buttons',
                    toastNotifications: 'Toast Notifications',
                    modals: 'Modals',
                    menus: 'Menus',
                    panels: 'Panels',
                    tags: 'Tags',
                    forms: 'Forms',
                    badgesSpinnersProgress: 'Badges, Spinners & Progress',
                    advanced: 'ADVANCED',
                    scrollbars: 'Scrollbars',
                    tables: 'Tables',

                    // Main Content
                    mainTitle: 'FileUI Component Library',
                    mainSubtitle: 'All UI components with navigation panel and theme toggle',

                    // Section: Colors
                    semanticColors: 'Semantic Colors',
                    primary: 'Primary',
                    success: 'Success',
                    warning: 'Warning',
                    error: 'Error',
                    info: 'Info',
                    backgroundHierarchy: 'Background Hierarchy',
                    quinaryBG: 'Quinary BG (Darkest)',
                    quaternaryBG: 'Quaternary BG',
                    primaryBG: 'Primary BG',
                    secondaryBG: 'Secondary BG',
                    tertiaryBG: 'Tertiary BG',

                    // Section: CSS Variables
                    cssVarsSubtitle: 'All CSS custom properties defined in :root. Click on any value to copy it.',

                    // Section: Icons
                    commonIcons: 'Common Icons',
                    actionIcons: 'Action Icons',
                    navigationIcons: 'Navigation Icons',
                    statusIcons: 'Status Icons',
                    mediaIcons: 'Media Icons',
                    vfxTypeIcons: 'VFX Type Icons',
                    animationTypeIcons: 'Animation Type Icons',

                    // Section: Typography
                    interFontSpecimen: 'Inter Font Specimen',
                    interSampleSentence: 'Almost before we knew it, we had left the ground.',
                    quickBrownFox: 'The quick brown fox jumps over the lazy dog',
                    light300: 'Light 300',
                    regular400: 'Regular 400',
                    medium500: 'Medium 500',
                    semibold600: 'Semibold 600',
                    bold700: 'Bold 700',
                    extraBold800: 'Extra Bold 800',
                    black900: 'Black 900',
                    sizeSamples: 'Size Samples',
                    sample48: 'Whereas a common understanding of these rights and freedoms is',
                    sample36: 'No one shall be held in slavery or servitude; slavery and the slave trade shall be prohibited in all their forms.',
                    sample32: 'Everyone has the right to an effective remedy by the competent national tribunals for acts violating the fundamental rights granted him by the constitution or by law.',
                    sample21: 'No one shall be subjected to arbitrary arrest, detention or exile. Everyone is entitled in full equality to a fair and public hearing by an independent and impartial tribunal, in the determination of his rights and obligations and of any criminal charge against him.',
                    sample16: 'Everyone has the right to freedom of thought, conscience and religion; this right includes freedom to change his religion or belief, and freedom, either alone or in community with others and in public or private, to manifest his religion or belief in teaching, practice, worship and observance. Everyone has the right to freedom of opinion and expression; this right includes freedom to hold opinions without interference and to seek, receive and impart information and ideas through any media and regardless of frontiers.',
                    typographyScale: 'Typography Scale',
                    heading1: 'Heading 1',
                    heading2: 'Heading 2',
                    heading3: 'Heading 3',
                    heading4: 'Heading 4',
                    heading5: 'Heading 5',
                    heading6: 'Heading 6',
                    paragraphStyles: 'Paragraph Styles',
                    leadParagraph: 'This is a lead paragraph with italic text, underlined text, strikethrough text, highlighted text, inline code, and keyboard input.',
                    standardParagraph: 'This is a standard paragraph with emphasized text, bold italic, superscript, subscript, ABBR, and linked text. It has optimal line height for readability.',
                    smallParagraph: 'This is a small paragraph with variable, sample output, deleted text, inserted text, inline quote, and citation examples.',
                    codeBlocks: 'Code Blocks',
                    jsCodeComment: '// JavaScript code block',
                    inlineCode: 'Inline Code',
                    inlineCodeSample: 'Use const to declare constants, let for variables, and import to load modules. Press Ctrl + C to copy.',
                    blockquotes: 'Blockquotes',
                    steveJobsQuote: 'Design is not just what it looks like and feels like. Design is how it works.',
                    steveJobs: '— Steve Jobs',

                    // Section: Callouts
                    calloutInfoTitle: 'Information',
                    calloutInfoText: 'This is an informational callout with helpful details about the component library.',
                    calloutWarningTitle: 'Warning',
                    calloutWarningText: 'This is a warning callout that highlights important considerations or potential issues.',
                    calloutSuccessTitle: 'Success',
                    calloutSuccessText: 'This is a success callout that confirms completed actions or positive outcomes.',
                    calloutErrorTitle: 'Error',
                    calloutErrorText: 'This is an error callout that highlights critical issues that need attention.',

                    // Section: Lists
                    lists: 'Lists',
                    unorderedList: 'Unordered List',
                    firstItem: 'First item',
                    secondItem: 'Second item with bold text',
                    thirdItem: 'Third item',
                    nestedItem1: 'Nested item 1',
                    nestedItem2: 'Nested item 2',
                    fourthItem: 'Fourth item',
                    orderedList: 'Ordered List',
                    installDeps: 'Install dependencies',
                    configSettings: 'Configure settings',
                    runDevServer: 'Run development server',
                    startBackend: 'Start backend',
                    startFrontend: 'Start frontend',
                    openBrowser: 'Open browser',

                    // Section: Tables
                    tableComponent: 'Component',
                    tableDescription: 'Description',
                    tableStatus: 'Status',
                    tableButtonDesc: 'Interactive button component',
                    tableCardDesc: 'Content container with header and footer',
                    tableModalDesc: 'Overlay dialog for focused interactions',
                    tableStatusStable: 'Stable',
                    tableStatusBeta: 'Beta',

                    // Section: Grid Patterns
                    gridPatternsSubtitle: 'Tileable CSS grid patterns useful for subtle background textures.',
                    dots: 'Dots',
                    lines: 'Lines',
                    cross: 'Cross',
                    diagonal: 'Diagonal',

                    // Section: Grid System
                    grid2Col: '2 Column Grid',
                    grid3Col: '3 Column Grid',
                    gridAutoFit: 'Auto-fit Grid',
                    gridItem1: 'Grid Item 1',
                    gridItem2: 'Grid Item 2',
                    item1: 'Item 1',
                    item2: 'Item 2',
                    item3: 'Item 3',
                    responsive1: 'Responsive 1',
                    responsive2: 'Responsive 2',
                    responsive3: 'Responsive 3',
                    responsive4: 'Responsive 4',

                    // Section: Cards
                    simpleCard: 'Simple Card',
                    simpleCardText: 'This is a simple card with just title and content.',
                    cardWithIcon: 'Card with Icon',
                    cardWithIconText: 'This card has an icon in the header.',
                    cardWithActions: 'Card with Actions',
                    cardWithActionsText: 'This card has action buttons in the header.',
                    fullFeaturedCard: 'Full Featured Card',
                    fullFeaturedCardText: 'This card has an icon, actions, and a footer.',
                    completeExample: 'Complete example with all options',
                    active: 'Active',
                    featured: 'Featured',
                    cardWithDesc: 'Card with Description',
                    cardContentGoesHere: 'Card content goes here...',
                    cardHasDesc: 'This card has a description',
                    cardWithFooter: 'Card with Footer',
                    mainContentArea: 'Main content area',

                    // Section: Buttons
                    semanticButtonColors: 'Semantic Button Colors',
                    activeStates: 'Active States',
                    iconButtons: 'Icon Buttons',
                    dynamicButtons: 'Dynamic Buttons',

                    // Section: Menus
                    navPanelMenu: 'Navigation Panel Menu',
                    dropdownContextMenus: 'Dropdown & Context Menus',

                    // Section: Tags
                    staticTags: 'Static Tags',
                    default: 'Default',
                    tagSizes: 'Tag Sizes',
                    small: 'Small',
                    normal: 'Normal',
                    large: 'Large',
                    dynamicTags: 'Dynamic Tags',

                    // Section: Forms
                    textInputs: 'Text Inputs',
                    textInputLabel: 'Text Input',
                    textInputPlaceholder: 'Enter text...',
                    emailInputLabel: 'Email Input',
                    emailInputPlaceholder: 'name@example.com',
                    passwordInputLabel: 'Password Input',
                    passwordInputPlaceholder: 'Enter password...',
                    numberInputLabel: 'Number Input',
                    searchInputLabel: 'Search Input',
                    searchInputPlaceholder: 'Search...',
                    urlInputLabel: 'URL Input',
                    urlInputPlaceholder: 'https://example.com',
                    selectionInputs: 'Selection Inputs',
                    selectDropdown: 'Select Dropdown',
                    selectPlaceholder: 'Choose an option...',
                    checkboxes: 'Checkboxes',
                    checkboxEnableNotifs: 'Enable notifications',
                    checkboxSubscribe: 'Subscribe to newsletter',
                    checkboxAcceptTerms: 'Accept terms and conditions',
                    radioButtons: 'Radio Buttons',
                    radioBasic: 'Basic Plan',
                    radioPro: 'Pro Plan',
                    radioEnterprise: 'Enterprise Plan',
                    otherInputs: 'Other Inputs',
                    textareaLabel: 'Textarea',
                    textareaPlaceholder: 'Enter your message...',
                    dateInputLabel: 'Date Input',
                    timeInputLabel: 'Time Input',
                    colorPickerLabel: 'Color Picker',
                    rangeSliderLabel: 'Range Slider',
                    inputStates: 'Input States',
                    disabledInputLabel: 'Disabled Input',
                    disabledInputPlaceholder: 'Disabled input',
                    readonlyInputLabel: 'Read-only Input',
                    readonlyInputPlaceholder: 'Read-only content',
                    semanticCheckboxesRadios: 'Semantic Color Checkboxes & Radio Buttons',
                    checkboxColors: 'Checkbox Colors',
                    radioColors: 'Radio Button Colors',
                    disabledStates: 'Disabled States',
                    disabledCheckbox: 'Disabled Checkbox',
                    disabledChecked: 'Disabled Checked',
                    disabledRadio: 'Disabled Radio',
                    disabledSelected: 'Disabled Selected',
                    formActions: 'Form Actions',

                    // Section: Badges, Spinners, Progress
                    badges: 'Badges',
                    loadingSpinners: 'Loading Spinners',
                    progressBars: 'Progress Bars',
                    progressDefault: 'Default (25%)',
                    progressPrimary: 'Primary (50%)',
                    progressSuccess: 'Success (75%)',
                    progressWarning: 'Warning (60%)',
                    progressError: 'Error (30%)',
                    progressInfo: 'Info (90%)',
                    progressVariations: 'Progress Variations',
                    progressStriped: 'Striped (Animated)',
                    progressSmall: 'Small Size',
                    progressLarge: 'Large with Label',

                    // Section: Scrollbars
                    defaultScrollbar: 'Default Scrollbar',
                    scrollbarLorem: 'This is a scrollable area with custom styled scrollbars.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nKeep scrolling to see more content...\n\nThe scrollbar styling adapts to both light and dark themes.\n\nNotice the custom colors and rounded corners.',
                    thinScrollbar: 'Thin Scrollbar',
                    thinScrollbarLorem: 'This area has a thinner scrollbar variant.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit.\n\nSed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
                    horizontalScrollbar: 'Horizontal Scrollbar',
                    horizontalScrollbarLorem: 'This content extends horizontally beyond the container width. Keep scrolling to the right to see more content. The horizontal scrollbar also follows the same styling pattern.',

                    // Control Panel
                    settings: 'Settings',
                    language: 'Language',
                    theme: 'Theme',
                    dark_mode: 'Dark Mode',
                    tint: 'Tint',
                    accent: 'Accent',
                    font: 'Font',
                    system: 'System',
                    mono: 'Mono',
                    density: 'Density',
                    comfortable: 'Comfortable',
                    compact: 'Compact',
                    iconSize: 'Icon Size',
                    iconStroke: 'Icon Stroke',

                    // ... existing english translations block near heading props...
                    heading1Tag: 'Heading 1 <h1>',
                    heading2Tag: 'Heading 2 <h2>',
                    heading3Tag: 'Heading 3 <h3>',
                    heading4Tag: 'Heading 4 <h4>',
                    heading5Tag: 'Heading 5 <h5>',
                    heading6Tag: 'Heading 6 <h6>',
                    tooltips: 'Tooltips',
                },
                zh: {
                    // 左侧导航
                    componentsNav: '组件',
                    design: '设计',
                    colors: '颜色',
                    cssVariables: 'CSS 变量',
                    icons: '图标',
                    typography: '排版',
                    layout: '布局',
                    gridSystem: '网格系统',
                    gridPatterns: '网格图案',
                    cards: '卡片',
                    components: '组件',
                    buttons: '按钮',
                    toastNotifications: '消息通知',
                    modals: '模态框',
                    menus: '菜单',
                    panels: '面板',
                    tags: '标签',
                    forms: '表单',
                    badgesSpinnersProgress: '徽章、加载器和进度条',
                    advanced: '高级',
                    scrollbars: '滚动条',
                    tables: '表格',

                    // 主要内容
                    mainTitle: 'FileUI 组件库',
                    mainSubtitle: '包含导航面板和主题切换的所有UI组件',

                    // 颜色部分
                    semanticColors: '语义颜色',
                    primary: '主要',
                    success: '成功',
                    warning: '警告',
                    error: '错误',
                    info: '信息',
                    backgroundHierarchy: '背景层级',
                    quinaryBG: '五级背景 (最暗)',
                    quaternaryBG: '四级背景',
                    primaryBG: '主背景',
                    secondaryBG: '次背景',
                    tertiaryBG: '三级背景',

                    // CSS 变量部分
                    cssVarsSubtitle: '在 :root 中定义的所有 CSS 自定义属性。点击任何值即可复制。',

                    // 图标部分
                    commonIcons: '通用图标',
                    actionIcons: '操作图标',
                    navigationIcons: '导航图标',
                    statusIcons: '状态图标',
                    mediaIcons: '媒体图标',
                    vfxTypeIcons: '视觉效果类型图标',
                    animationTypeIcons: '动画类型图标',

                    // 排版部分
                    interFontSpecimen: 'Inter 字体样本',
                    interSampleSentence: '我们还没来得及反应，就已经离开了地面。',
                    quickBrownFox: '敏捷的棕色狐狸跳过了懒惰的狗。',
                    light300: '细体 300',
                    regular400: '常规 400',
                    medium500: '中等 500',
                    semibold600: '半粗体 600',
                    bold700: '粗体 700',
                    extraBold800: '特粗体 800',
                    black900: '超粗体 900',
                    sizeSamples: '字号示例',
                    sample48: '鉴于对这些权利和自由的普遍了解至关重要',
                    sample36: '任何人不得使为奴隶或奴役；一切形式的奴隶制度和奴隶买卖，均应予以禁止。',
                    sample32: '任何人于其宪法或法律所赋予之基本权利被侵害时，有权享受国家管辖法庭之有效救济。',
                    sample21: '任何人不得加以任意逮捕、拘禁或放逐。 人人完全平等，有权由一个独立而无偏倚的法庭进行公正和公开的审讯，以确定他的权利和义务并判定对他提出的任何刑事指控。',
                    sample16: '人人有思想、良心和宗教自由的权利；此项权利包括改变他的宗教或信仰的自由，以及单独或集体、公开或秘密地以教义、实践、礼拜和戒律表示他的宗教或信仰的自由。 人人有权享有主张和发表意见的自由；此项权利包括持有主张而不受干涉的自由，和通过任何媒介和不论国界寻求、接受和传递消息和思想的自由。',
                    typographyScale: '排版尺寸',
                    heading1: '标题 1',
                    heading2: '标题 2',
                    heading3: '标题 3',
                    heading4: '标题 4',
                    heading5: '标题 5',
                    heading6: '标题 6',
                    paragraphStyles: '段落样式',
                    leadParagraph: '这是一个引导段落，包含斜体文本、下划线文本、删除线文本、高亮文本、行内代码和键盘输入。',
                    standardParagraph: '这是一个标准段落，包含强调文本、粗斜体、上标、下标、缩写和链接文本。它具有最佳的行高以便阅读。',
                    smallParagraph: '这是一个小段落，包含变量、示例输出、删除文本、插入文本、行内引用和引文示例。',
                    codeBlocks: '代码块',
                    jsCodeComment: '// JavaScript 代码块',
                    inlineCode: '行内代码',
                    inlineCodeSample: '使用 const 声明常量，let 声明变量，并使用 import 加载模块。按 Ctrl + C 复制。',
                    blockquotes: '块引用',
                    steveJobsQuote: '设计不仅仅是它的外观和感觉。设计是它的工作方式。',
                    steveJobs: '— 史蒂夫·乔布斯',

                    // 标注部分
                    calloutInfoTitle: '信息',
                    calloutInfoText: '这是一个信息性标注，提供有关组件库的有用细节。',
                    calloutWarningTitle: '警告',
                    calloutWarningText: '这是一个警告标注，突出显示了重要的注意事项或潜在问题。',
                    calloutSuccessTitle: '成功',
                    calloutSuccessText: '这是一个成功标注，确认已完成的操作或积极的结果。',
                    calloutErrorTitle: '错误',
                    calloutErrorText: '这是一个错误标注，突出显示需要注意的关键问题。',

                    // 列表部分
                    lists: '列表',
                    unorderedList: '无序列表',
                    firstItem: '第一项',
                    secondItem: '带粗体文本的第二项',
                    thirdItem: '第三项',
                    nestedItem1: '嵌套项 1',
                    nestedItem2: '嵌套项 2',
                    fourthItem: '第四项',
                    orderedList: '有序列表',
                    installDeps: '安装依赖',
                    configSettings: '配置设置',
                    runDevServer: '运行开发服务器',
                    startBackend: '启动后端',
                    startFrontend: '启动前端',
                    openBrowser: '打开浏览器',

                    // 表格部分
                    tableComponent: '组件',
                    tableDescription: '描述',
                    tableStatus: '状态',
                    tableButtonDesc: '交互式按钮组件',
                    tableCardDesc: '带页眉和页脚的内容容器',
                    tableModalDesc: '用于集中交互的覆盖对话框',
                    tableStatusStable: '稳定',
                    tableStatusBeta: '测试版',

                    // 网格图案部分
                    gridPatternsSubtitle: '可平铺的 CSS 网格图案，可用于微妙的背景纹理。',
                    dots: '点状',
                    lines: '线条',
                    cross: '十字',
                    diagonal: '斜线',

                    // 网格系统部分
                    grid2Col: '2 列网格',
                    grid3Col: '3 列网格',
                    gridAutoFit: '自适应网格',
                    gridItem1: '网格项 1',
                    gridItem2: '网格项 2',
                    item1: '项 1',
                    item2: '项 2',
                    item3: '项 3',
                    responsive1: '响应式 1',
                    responsive2: '响应式 2',
                    responsive3: '响应式 3',
                    responsive4: '响应式 4',

                    // 卡片部分
                    simpleCard: '简单卡片',
                    simpleCardText: '这只是一个包含标题和内容的简单卡片。',
                    cardWithIcon: '带图标的卡片',
                    cardWithIconText: '此卡片的页眉中有一个图标。',
                    cardWithActions: '带操作的卡片',
                    cardWithActionsText: '此卡片的页眉中有操作按钮。',
                    fullFeaturedCard: '功能齐全的卡片',
                    fullFeaturedCardText: '此卡片有图标、操作和页脚。',
                    completeExample: '包含所有选项的完整示例',
                    active: '激活',
                    featured: '特色',
                    cardWithDesc: '带描述的卡片',
                    cardContentGoesHere: '卡片内容在此处...',
                    cardHasDesc: '此卡片有描述',
                    cardWithFooter: '带页脚的卡片',
                    mainContentArea: '主要内容区域',

                    // 按钮部分
                    semanticButtonColors: '语义按钮颜色',
                    activeStates: '激活状态',
                    iconButtons: '图标按钮',
                    dynamicButtons: '动态按钮',

                    // 菜单部分
                    navPanelMenu: '导航面板菜单',
                    dropdownContextMenus: '下拉和上下文菜单',

                    // 标签部分
                    staticTags: '静态标签',
                    default: '默认',
                    tagSizes: '标签尺寸',
                    small: '小',
                    normal: '正常',
                    large: '大',
                    dynamicTags: '动态标签',

                    // 表单部分
                    textInputs: '文本输入',
                    textInputLabel: '文本输入',
                    textInputPlaceholder: '输入文本...',
                    emailInputLabel: '电子邮件输入',
                    emailInputPlaceholder: 'name@example.com',
                    passwordInputLabel: '密码输入',
                    passwordInputPlaceholder: '输入密码...',
                    numberInputLabel: '数字输入',
                    searchInputLabel: '搜索输入',
                    searchInputPlaceholder: '搜索...',
                    urlInputLabel: '网址输入',
                    urlInputPlaceholder: 'https://example.com',
                    selectionInputs: '选择输入',
                    selectDropdown: '下拉选择',
                    selectPlaceholder: '选择一个选项...',
                    checkboxes: '复选框',
                    checkboxEnableNotifs: '启用通知',
                    checkboxSubscribe: '订阅新闻通讯',
                    checkboxAcceptTerms: '接受条款和条件',
                    radioButtons: '单选按钮',
                    radioBasic: '基础计划',
                    radioPro: '专业计划',
                    radioEnterprise: '企业计划',
                    otherInputs: '其他输入',
                    textareaLabel: '文本区域',
                    textareaPlaceholder: '输入您的消息...',
                    dateInputLabel: '日期输入',
                    timeInputLabel: '时间输入',
                    colorPickerLabel: '颜色选择器',
                    rangeSliderLabel: '范围滑块',
                    inputStates: '输入状态',
                    disabledInputLabel: '禁用输入',
                    disabledInputPlaceholder: '禁用的输入',
                    readonlyInputLabel: '只读输入',
                    readonlyInputPlaceholder: '只读内容',
                    semanticCheckboxesRadios: '语义颜色复选框和单选按钮',
                    checkboxColors: '复选框颜色',
                    radioColors: '单选按钮颜色',
                    disabledStates: '禁用状态',
                    disabledCheckbox: '禁用复选框',
                    disabledChecked: '禁用已选',
                    disabledRadio: '禁用单选按钮',
                    disabledSelected: '禁用已选',
                    formActions: '表单操作',

                    // 徽章、加载器和进度条部分
                    badges: '徽章',
                    loadingSpinners: '加载旋转器',
                    progressBars: '进度条',
                    progressDefault: '默认 (25%)',
                    progressPrimary: '主要 (50%)',
                    progressSuccess: '成功 (75%)',
                    progressWarning: '警告 (60%)',
                    progressError: '错误 (30%)',
                    progressInfo: '信息 (90%)',
                    progressVariations: '进度条变体',
                    progressStriped: '条纹 (动画)',
                    progressSmall: '小尺寸',
                    progressLarge: '带标签大尺寸',

                    // 滚动条部分
                    defaultScrollbar: '默认滚动条',
                    scrollbarLorem: '这是一个可滚动的区域，带有自定义样式的滚动条。\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\n继续滚动以查看更多内容...\n\n滚动条样式会适应明暗主题。\n\n请注意自定义颜色和圆角。',
                    thinScrollbar: '细滚动条',
                    thinScrollbarLorem: '该区域有一个更细的滚动条变体。\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit.\n\nSed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
                    horizontalScrollbar: '水平滚动条',
                    horizontalScrollbarLorem: '此内容水平超出容器宽度。继续向右滚动以查看更多内容。水平滚动条也遵循相同的样式模式。',
                    
                    // 控制面板
                    settings: '设置',
                    language: '语言',
                    theme: '主题',
                    dark_mode: '暗黑模式',
                    tint: '色调',
                    accent: '强调',
                    font: '字体',
                    system: '系统',
                    mono: '等宽',
                    density: '密度',
                    comfortable: '舒适',
                    compact: '紧凑',
                    iconSize: '图标大小',
                    iconStroke: '图标描边',

                    // ... existing chinese translations block...
                    heading1Tag: '标题 1 <h1>',
                    heading2Tag: '标题 2 <h2>',
                    heading3Tag: '标题 3 <h3>',
                    heading4Tag: '标题 4 <h4>',
                    heading5Tag: '标题 5 <h5>',
                    heading6Tag: '标题 6 <h6>',
                    tooltips: '工具提示',
                }
            },
            apply() {
                const lang = this.get();
                const dictTo = this.translations[lang] || {};
                const otherLang = lang === 'zh' ? 'en' : 'zh';
                const dictFrom = this.translations[otherLang] || {};
                // Attributes translation
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (dictTo[key]) el.textContent = dictTo[key];
                });
                // Text node translation fallback
                const map = {};
                Object.keys(dictFrom).forEach(k => {
                    map[dictFrom[k]] = dictTo[k] || dictFrom[k];
                });
                const walk = (node) => {
                    node.childNodes.forEach(child => {
                        if (child.nodeType === 3) { // text
                            const txt = child.nodeValue.trim();
                            if (map[txt]) child.nodeValue = child.nodeValue.replace(txt, map[txt]);
                        } else {
                            walk(child);
                        }
                    });
                };
                walk(document.body);
                // Update toggle button
                const btn = document.querySelector('.language-toggle-btn');
                if (btn) {
                    btn.innerHTML = `<i data-lucide="globe" class="lucide"></i> <span>${lang === 'zh' ? 'EN' : '中文'}</span>`;
                }
                window.UI.icons();
            },
            set(lang) {
                document.documentElement.setAttribute('lang', lang);
                localStorage.setItem('fileui-lang', lang);
                this.apply();
            },
            get() {
                return document.documentElement.getAttribute('lang') || 'en';
            },
            toggle() {
                const newLang = this.get() === 'zh' ? 'en' : 'zh';
                this.set(newLang);
                return newLang;
            }
        }
    };
    
    // Expose to window
    window.UI = UI;
    
    // Auto-initialize theme from localStorage and components
    document.addEventListener('DOMContentLoaded', () => {
        const savedTheme = localStorage.getItem('fileui-theme');
        if (savedTheme) {
            UI.theme.set(savedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            UI.theme.set(prefersDark ? 'dark' : 'light');
        }
        
        // Initialize all interactive components
        UI.init();
    });
})();

// ============================================
// Functions moved from inline HTML script
// ============================================

// Scroll to section and expand the card
function scrollToSection(sectionId) {
    console.log('Scrolling to section:', sectionId);
    // Direct lookup by section id first
    let targetSection = document.querySelector(`.section#${CSS.escape(sectionId)}`);
    let targetCard = targetSection ? targetSection.querySelector('.card') : null;
    if (!targetSection) {
        // fallback previous logic
        const sections = document.querySelectorAll('.section');
        targetSection = null;
        targetCard = null;
        const searchText = sectionId.toLowerCase();
        sections.forEach(section => {
            const card = section.querySelector('.card');
            if (!card) return;
            const title = card.querySelector('.card-title');
            if (!title) return;
            const titleText = title.textContent.toLowerCase();
            if (titleText.includes(searchText) ||
                titleText.replace(/[^a-z0-9]/g, '').includes(searchText.replace(/[^a-z0-9]/g, '')) ||
                (searchText === 'toast' && titleText.includes('notification')) ||
                (searchText === 'badges' && titleText.includes('badges'))) {
                targetSection = section;
                targetCard = card;
            }
        });
    }
    if (targetSection && targetCard) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => targetCard.classList.remove('collapsed'), 100);
        const navPanel = document.getElementById('nav-panel');
        if (navPanel && !navPanel.classList.contains('collapsed')) {
            document.querySelectorAll('.nav-item').forEach(item => {
                if (item.dataset.navItem === sectionId) {
                    const navSection = item.closest('.nav-section');
                    if (navSection && navSection.classList.contains('collapsed')) {
                        navSection.classList.remove('collapsed');
                    }
                }
            });
        }
    } else {
        console.log('Section not found:', sectionId);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Create navigation panel
    const navSections = [
        {
            title: 'Design',
            items: [
                { id: 'colors', text: 'Colors', icon: 'palette', onclick: () => scrollToSection('colors') },
                { id: 'css-vars', text: 'CSS Variables', icon: 'code-2', onclick: () => scrollToSection('css variables') },
                { id: 'icons', text: 'Icons', icon: 'package', onclick: () => scrollToSection('icons') },
                { id: 'typography', text: 'Typography', icon: 'type', onclick: () => scrollToSection('typography') }
            ]
        },
        {
            title: 'Layout',
            items: [
                { id: 'grid', text: 'Grid System', icon: 'grid', onclick: () => scrollToSection('grid') },
                { id: 'grid-patterns', text: 'Grid Patterns', icon: 'grip-horizontal', onclick: () => scrollToSection('grid patterns') },
                { id: 'cards', text: 'Cards', icon: 'square', onclick: () => scrollToSection('cards') }
            ]
        },
        {
            title: 'Components',
            items: [
                { id: 'buttons', text: 'Buttons', icon: 'mouse-pointer', onclick: () => scrollToSection('buttons') },
                { id: 'toasts', text: 'Toast Notifications', icon: 'bell', onclick: () => scrollToSection('toast') },
                { id: 'modals', text: 'Modals', icon: 'layers', onclick: () => scrollToSection('modals') },
                { id: 'menus', text: 'Menus', icon: 'menu', onclick: () => scrollToSection('menus') },
                { id: 'panels', text: 'Panels', icon: 'layout', onclick: () => scrollToSection('panels') },
                { id: 'tags', text: 'Tags', icon: 'tag', onclick: () => scrollToSection('tags') },
                { id: 'forms', text: 'Forms', icon: 'edit', onclick: () => scrollToSection('forms') },
                { id: 'badges', text: 'Badges, Spinners & Progress', icon: 'star', onclick: () => scrollToSection('badges') },
                { id: 'tooltips', text: 'Tooltips', icon: 'help-circle', onclick: () => scrollToSection('tooltips') }
            ]
        },
        {
            title: 'Advanced',
            items: [
                { id: 'scrollbars', text: 'Scrollbars', icon: 'scroll', onclick: () => scrollToSection('scrollbars') }
            ]
        }
    ];
    
    // Create and add navigation panel
    const navPanel = UI.navPanel(navSections, {
        title: 'Components',
        icon: 'layers',
        startCollapsed: true
    });
    document.body.insertBefore(navPanel, document.body.firstChild);
    
    // Create and add control panel
    const controlPanel = UI.controlPanel();
    document.body.appendChild(controlPanel);
    
    // Removed toggle buttons from footers - panels now toggle by clicking headers only
    
    // Add click handlers to panel headers to toggle collapse/expand
    const navHeader = navPanel.querySelector('.nav-panel-header');
    if (navHeader) {
        navHeader.addEventListener('click', () => {
            navPanel.classList.toggle('collapsed');
        });
    }
    
    const controlHeader = controlPanel.querySelector('.control-panel-header');
    if (controlHeader) {
        controlHeader.addEventListener('click', () => {
            controlPanel.classList.toggle('collapsed');
        });
    }
    
    // Make all section cards collapsible and start expanded
    document.querySelectorAll('.section .card').forEach(card => {
        // Start expanded (no collapsed class added)
        
        const header = card.querySelector('.card-header');
        if (header) {
            header.addEventListener('click', () => {
                card.classList.toggle('collapsed');
            });
        }
    });
    
    // Create dynamic components
    const btnContainer = document.getElementById('dynamic-buttons');
    btnContainer.appendChild(UI.button('Save', { variant: 'primary', icon: 'save' }));
    btnContainer.appendChild(UI.button('Delete', { icon: 'trash-2', onclick: () => UI.toast('Deleted!', 'error') }));
    btnContainer.appendChild(UI.button('Settings', { icon: 'settings', size: 'sm' }));
    
    const cardContainer = document.getElementById('card-demo');
    cardContainer.appendChild(UI.card('Simple Card', 'This is a simple card with just title and content.'));
    
    cardContainer.appendChild(UI.card('Card with Icon', 'This card has an icon in the header.', {
        icon: 'star'
    }));
    
    cardContainer.appendChild(UI.card('Card with Actions', 'This card has action buttons in the header.', {
        actions: [
            { icon: 'edit', onclick: () => UI.toast('Edit clicked!', 'info') },
            { icon: 'trash-2', variant: 'error', onclick: () => UI.toast('Delete clicked!', 'error') }
        ]
    }));
    
    cardContainer.appendChild(UI.card('Full Featured Card', 'This card has an icon, actions, and a footer.', {
        icon: 'settings',
        description: 'Complete example with all options',
        actions: [
            { text: 'Save', icon: 'save', variant: 'primary', onclick: () => UI.toast('Saved!', 'success') },
            { icon: 'more-horizontal', onclick: () => UI.toast('More options', 'info') }
        ],
        footer: '<div class="demo-row"><span class="tag tag-success">Active</span><span class="tag tag-info">Featured</span></div>'
    }));
    
    cardContainer.appendChild(UI.card('Card with Description', 'Card content goes here...', {
        description: 'This card has a description'
    }));
    
    cardContainer.appendChild(UI.card('Card with Footer', 'Main content area', {
        footer: '<button class="btn btn-sm">Action</button>'
    }));
    
    const spinnerContainer = document.getElementById('dynamic-spinner');
    spinnerContainer.appendChild(UI.spinner({ size: '32px' }));
    
    // Create dynamic popover with Shoelace
    const popoverBtn = document.getElementById('dynamic-popover');
    if (popoverBtn) {
        // Create Shoelace popup wrapper
        const popup = document.createElement('sl-popup');
        popup.setAttribute('placement', 'bottom');
        popup.setAttribute('trigger', 'click');
        popup.setAttribute('distance', '8');

        // Create popover content
        const popoverContent = document.createElement('div');
        popoverContent.style.cssText = 'background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-4); box-shadow: var(--shadow-md); min-width: 250px;';
        popoverContent.innerHTML = `
            <h5 class="margin-0-0-2-0">Dynamic Popover</h5>
            <p class="margin-0-0-3-0">This popover was created with JavaScript!</p>
            <button class="btn btn-sm" onclick="UI.toast('Popover action!', 'info')">Action</button>
        `;

        // Set up the popup structure
        popoverBtn.setAttribute('slot', 'anchor');
        popup.appendChild(popoverBtn.cloneNode(true));
        popup.appendChild(popoverContent);

        // Replace the original button with the popup
        popoverBtn.parentNode.replaceChild(popup, popoverBtn);
    }
    
    
    // Initialize icons
    UI.icons();
    
    // Add dynamic tooltips
    addMissingTooltips();
    
    // Populate CSS variables
    populateCSSVariables();
    
    // Initialize font specimen
    initFontSpecimen();
    
});

// Helper function removed - using the more comprehensive scrollToSection above

// Modal examples
function showSimpleModal() {
    UI.modal('This is a simple modal with just content.', {
        title: 'Simple Modal'
    });
}

function showConfirmModal() {
    UI.modal('Are you sure you want to delete this file?', {
        title: 'Confirm Delete',
        actions: [
            { text: 'Cancel', variant: 'default' },
            { 
                text: 'Delete', 
                variant: 'error',
                onclick: () => UI.toast('File deleted!', 'success')
            }
        ]
    });
}

function showFormModal() {
    const formHTML = `
        <div class="form-group">
            <label class="form-label">Name</label>
            <input type="text" class="form-input" placeholder="Enter name...">
        </div>
        <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" placeholder="Enter email...">
        </div>
    `;
    
    UI.modal(formHTML, {
        title: 'User Form',
        actions: [
            { text: 'Cancel' },
            { 
                text: 'Save', 
                variant: 'primary',
                onclick: () => UI.toast('Form saved!', 'success')
            }
        ]
    });
}

// Menu functions
function showMenu(button) {
    document.querySelectorAll('.menu').forEach(menu => menu.remove());
    
    const menu = UI.menu([
        { text: 'New File', icon: 'file-plus', onclick: () => UI.toast('New file created', 'success') },
        { text: 'New Folder', icon: 'folder-plus', onclick: () => UI.toast('New folder created', 'success') },
        { divider: true },
        { text: 'Settings', icon: 'settings', onclick: () => UI.toast('Settings opened', 'info') },
        { text: 'Help', icon: 'help-circle', onclick: () => UI.toast('Help opened', 'info') }
    ]);
    
    const rect = button.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.left = rect.left + 'px';
    menu.style.top = rect.bottom + 5 + 'px';
    menu.classList.add('active');
    
    document.body.appendChild(menu);
    
    const closeMenu = (e) => {
        if (!menu.contains(e.target) && e.target !== button) {
            menu.classList.remove('active');
            setTimeout(() => menu.remove(), 150);
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

function showContextMenuDemo() {
    const contextMenu = UI.contextMenu([
        { text: 'Copy', icon: 'copy', onclick: () => UI.toast('Copied!', 'success') },
        { text: 'Cut', icon: 'scissors', onclick: () => UI.toast('Cut!', 'success') },
        { text: 'Paste', icon: 'clipboard', onclick: () => UI.toast('Pasted!', 'success') },
        { divider: true },
        { text: 'Delete', icon: 'trash-2', onclick: () => UI.toast('Deleted!', 'error') }
    ]);
    
    contextMenu.show(window.innerWidth / 2, window.innerHeight / 2);
}

// Navigation menu configuration functions
function showNavMenuConfig() {
    const configCode = `// Navigation Panel Menu Configuration
const navSections = [
    {
title: 'Overview',
items: [
    { id: 'intro', text: 'Introduction', icon: 'info', active: true, onclick: () => scrollToSection('buttons') },
    { id: 'getting-started', text: 'Getting Started', icon: 'play', onclick: () => UI.toast('Getting Started', 'info') }
]
    },
    {
title: 'Components',
items: [
    { id: 'buttons', text: 'Buttons', icon: 'mouse-pointer', onclick: () => scrollToSection('buttons') },
    { id: 'toasts', text: 'Toast Notifications', icon: 'bell', badge: '4', onclick: () => scrollToSection('toast') },
    { id: 'cards', text: 'Cards', icon: 'square', onclick: () => scrollToSection('cards') },
    { id: 'modals', text: 'Modals', icon: 'layers', onclick: () => scrollToSection('modals') },
    { id: 'menus', text: 'Menus', icon: 'menu', onclick: () => scrollToSection('menus') },
    { id: 'forms', text: 'Forms', icon: 'edit', onclick: () => scrollToSection('forms') },
    { id: 'tags', text: 'Tags', icon: 'tag', onclick: () => scrollToSection('tags') }
]
    },
    {
title: 'Layout',
items: [
    { id: 'grid', text: 'Grid System', icon: 'grid', onclick: () => scrollToSection('grid') },
    { id: 'panels', text: 'Panels', icon: 'layout', onclick: () => scrollToSection('panels') },
    { id: 'typography', text: 'Typography', icon: 'type', onclick: () => scrollToSection('typography') }
]
    },
    {
title: 'Utilities',
items: [
    { id: 'badges', text: 'Badges & Spinners', icon: 'star', onclick: () => scrollToSection('badges') },
    { id: 'colors', text: 'Colors', icon: 'palette', onclick: () => scrollToSection('colors') }
]
    }
];

// Create navigation panel
const navPanel = UI.navPanel(navSections, {
    title: 'FileUI Components',
    icon: 'book-open',
    startCollapsed: true
});`;

    UI.modal(`<pre><code>${configCode}</code></pre>`, {
        title: 'Navigation Panel Menu Configuration',
        size: 'lg'
    });
}

function recreateNavPanel() {
    // Remove existing nav panel
    const existingPanel = document.getElementById('nav-panel');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    // Remove existing toggle
    const existingToggle = document.querySelector('.nav-panel-toggle');
    if (existingToggle) {
        existingToggle.remove();
    }
    
    // Create new nav panel with updated config
    const newNavSections = [
        {
            title: 'Demo Sections',
            items: [
                { id: 'new-item', text: 'New Item', icon: 'plus', onclick: () => UI.toast('New item clicked!', 'success') },
                { id: 'buttons', text: 'Buttons', icon: 'mouse-pointer', onclick: () => scrollToSection('buttons') },
                { id: 'menus', text: 'Menus', icon: 'menu', active: true, onclick: () => scrollToSection('menus') }
            ]
        }
    ];
    
    const navPanel = UI.navPanel(newNavSections, {
        title: 'Demo Menu Config',
        icon: 'settings'
    });
    document.body.insertBefore(navPanel, document.body.firstChild);
    
    const navToggle = UI.navToggle();
    document.body.insertBefore(navToggle, document.body.firstChild);
    
    UI.toast('Navigation panel recreated with demo config!', 'info');
}

// Panel functions
function addPanel() {
    const container = document.getElementById('panels-container');
    const panel = UI.panel('Sample Panel', 'This is a regular panel with some content.', {
        icon: 'layout'
    });
    container.appendChild(panel);
}

function addCollapsiblePanel() {
    const container = document.getElementById('panels-container');
    const panel = UI.panel('Collapsible Panel', 'This panel can be collapsed and expanded.', {
        icon: 'chevron-down',
        collapsible: true
    });
    container.appendChild(panel);
}

// Tag functions
let tagCounter = 1;
function addTag() {
    const container = document.getElementById('tags-container');
    const variants = ['primary', 'success', 'warning', 'error', 'info'];
    const variant = variants[Math.floor(Math.random() * variants.length)];
    
    const tag = UI.tag(`Tag ${tagCounter}`, { variant });
    container.appendChild(tag);
    tagCounter++;
}

function addClosableTag() {
    const container = document.getElementById('tags-container');
    const variants = ['primary', 'success', 'warning', 'error', 'info'];
    const variant = variants[Math.floor(Math.random() * variants.length)];
    
    const tag = UI.tag(`Closable ${tagCounter}`, { 
        variant, 
        closable: true,
        onClose: () => UI.toast('Tag removed!', 'info')
    });
    container.appendChild(tag);
    tagCounter++;
}

// Function to populate CSS variables
function populateCSSVariables() {
    const container = document.getElementById('css-vars-container');
    if (!container) return;
    
    // Get all CSS variables from computed styles
    const computedStyles = getComputedStyle(document.documentElement);
    const cssVars = [];
    
    // Get all CSS custom properties from the computed styles
    // This is more reliable than parsing stylesheets
    const allStyles = document.documentElement.computedStyleMap ? 
        Array.from(document.documentElement.computedStyleMap()) : [];
    
    // Fallback method: parse from stylesheets
    if (allStyles.length === 0) {
        // Look through all stylesheets
        for (let i = 0; i < document.styleSheets.length; i++) {
            try {
                const sheet = document.styleSheets[i];
                const rules = sheet.cssRules || sheet.rules;
                
                for (let j = 0; j < rules.length; j++) {
                    const rule = rules[j];
                    if (rule.selectorText === ':root' && rule.style) {
                        // Get all properties from the style
                        for (let k = 0; k < rule.style.length; k++) {
                            const prop = rule.style[k];
                            if (prop.startsWith('--')) {
                                const value = rule.style.getPropertyValue(prop).trim();
                                cssVars.push({
                                    name: prop,
                                    value: value || computedStyles.getPropertyValue(prop).trim()
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                console.log('Error accessing stylesheet:', e);
            }
        }
    } else {
        // Use computedStyleMap if available
        allStyles.forEach(([prop, value]) => {
            if (prop.startsWith('--')) {
                cssVars.push({
                    name: prop,
                    value: value.toString()
                });
            }
        });
    }
    
    // If still no variables found, manually add the known ones
    if (cssVars.length === 0) {
        const knownVars = [
            '--font-system', '--font-mono',
            '--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-quaternary', '--bg-quinary',
            '--text-primary', '--text-secondary', '--text-tertiary',
            '--border-color', '--border-strong',
            '--accent', '--accent-hover', '--accent-active',
            '--primary', '--success', '--warning', '--error', '--info', '--neutral',
            '--grey-50', '--grey-100', '--grey-200', '--grey-300', '--grey-400', 
            '--grey-500', '--grey-600', '--grey-700', '--grey-800', '--grey-900',
            '--space-0', '--space-1', '--space-2', '--space-3', '--space-4', '--space-5',
            '--space-6', '--space-8', '--space-10', '--space-12', '--space-16', '--space-20', '--space-24',
            '--text-xs', '--text-sm', '--text-base', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl', '--text-4xl',
            '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-full',
            '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl',
            '--transition-fast', '--transition-base', '--transition-slow',
            '--z-base', '--z-dropdown', '--z-sticky', '--z-modal', '--z-popover', '--z-tooltip',
            '--nav-width', '--nav-width-mobile', '--card-min-width', '--card-header-min-height',
            '--icon-size-sm', '--icon-size-md', '--icon-size-lg',
            '--spinner-size-sm', '--spinner-size-md', '--spinner-size-lg',
            '--overlay-light', '--overlay-medium', '--overlay-backdrop',
            '--overlay-light-dark', '--overlay-medium-dark',
            '--duration-toast', '--duration-modal',
            '--font-light', '--font-normal', '--font-medium', '--font-semibold', '--font-bold',
            '--h1-letter-spacing', '--h2-letter-spacing', '--h3-letter-spacing',
            '--line-height-tight', '--line-height-normal', '--line-height-relaxed',
            '--border-width', '--sl-tooltip-background-color', '--sl-tooltip-color'
        ];
        
        knownVars.forEach(varName => {
            const value = computedStyles.getPropertyValue(varName).trim();
            if (value) {
                cssVars.push({ name: varName, value });
            }
        });
    }
    
    // Helper — detect if a variable is referenced anywhere via var(--name)
    function isCSSVarUsed(name) {
        const search = `var(${name})`;
        const sheets = Array.from(document.styleSheets);
        for (const sheet of sheets) {
            let rules;
            try {
                rules = sheet.cssRules || sheet.rules;
            } catch (e) {
                // Cross-origin or inaccessible stylesheet – skip it
                continue;
            }
            if (!rules) continue;
            for (const rule of rules) {
                const cssText = rule.cssText || '';
                if (cssText.includes(search)) return true;
            }
        }
        // Fallback: search HTML
        return document.documentElement.innerHTML.includes(search);
    }

    // Keep only variables that are actually referenced in CSS/HTML
    const usedVars = cssVars.filter(v => isCSSVarUsed(v.name));

    console.log('Used CSS variables:', usedVars.length);

    // Group variables by category (unmatched vars are ignored)
    const groups = {
        'Typography': ['--font-', '--text-', 'letter-spacing'],
        'Colors': ['--bg-', '--overlay-', '--text-primary', '--text-secondary', '--text-tertiary', '--border-', '--accent', '--primary', '--success', '--warning', '--error', '--info', '--neutral', '--grey-'],
        'Spacing': ['--space-'],
        'Dimensions': ['--nav-', '--card-', '--icon-size', '--spinner-size', '--width', '--height'],
        'Shadows': ['--shadow-'],
        'Borders': ['--radius-', '--border-width'],
        'Animations': ['--transition-', '--duration-'],
        'Z-Index': ['--z-']
    };
    
    const categorized = {};
    Object.keys(groups).forEach(key => (categorized[key] = []));

    // Categorize variables – show every root variable, skip unmatched
    cssVars.forEach(cssVar => {
        for (const [category, patterns] of Object.entries(groups)) {
            if (patterns.some(pattern => cssVar.name.includes(pattern))) {
                categorized[category].push(cssVar);
                break;
            }
        }
    });
    
    // Render groups
    let html = '';
    for (const [category, vars] of Object.entries(categorized)) {
        if (vars.length === 0) continue;
        
        html += `
            <div class="css-var-group">
                <h5 class="css-var-group-title">
                    <i data-lucide="${getCategoryIcon(category)}" class="icon-sm"></i>
                    ${category}
                </h5>
                <div class="css-var-grid">
        `;
        
        vars.sort((a, b) => a.name.localeCompare(b.name));
        
        vars.forEach(cssVar => {
            const isColor = cssVar.value.match(/^(#|rgb|hsl)/);
            html += `
                <div class="css-var-item" onclick="copyCSSVariable('${cssVar.name}', '${cssVar.value.replace(/'/g, "\\'")}')">
                    <div class="css-var-name">${cssVar.name}</div>
                    <div class="css-var-value">${cssVar.value}</div>
                    ${isColor ? `<div class="css-var-preview" style="background: ${cssVar.value};"></div>` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    UI.icons();
}

// Helper function to get category icon
function getCategoryIcon(category) {
    const icons = {
        'Typography': 'type',
        'Colors': 'palette',
        'Spacing': 'move',
        'Dimensions': 'ruler',
        'Shadows': 'layers',
        'Borders': 'square',
        'Animations': 'zap',
        'Z-Index': 'layers',
        'Other': 'more-horizontal'
    };
    return icons[category] || 'code';
}

// Function to copy CSS variable
window.copyCSSVariable = function(name, value) {
    const text = `var(${name})`;
    navigator.clipboard.writeText(text).then(() => {
        // Find the clicked element and add copied class
        event.target.closest('.css-var-item').classList.add('copied');
        UI.toast(`Copied: ${text}`, 'success');
        
        // Remove copied class after animation
        setTimeout(() => {
            event.target.closest('.css-var-item').classList.remove('copied');
        }, 1000);
    });
}

// Function to add tooltips to elements that don't have them
function addMissingTooltips() {
    // Add tooltips to all buttons without existing tooltips
    document.querySelectorAll('button:not(sl-tooltip button)').forEach(button => {
        if (!button.closest('sl-tooltip') && !button.title) {
            // Create tooltip text based on button content or class
            let tooltipText = '';
            if (button.classList.contains('theme-toggle-panel')) {
                tooltipText = 'Toggle dark/light theme';
            } else if (button.classList.contains('font-toggle')) {
                tooltipText = button.title || 'Change font family';
            } else if (button.classList.contains('density-toggle')) {
                tooltipText = button.title || 'Change layout density';
            } else if (button.classList.contains('nav-panel-toggle')) {
                tooltipText = 'Toggle navigation panel';
            } else if (button.textContent.trim()) {
                tooltipText = `Click to ${button.textContent.trim().toLowerCase()}`;
            } else {
                tooltipText = 'Interactive button';
            }
            
            // Add Shoelace tooltip
            const tooltip = document.createElement('sl-tooltip');
            tooltip.setAttribute('content', tooltipText);
            tooltip.setAttribute('placement', 'top');
            tooltip.setAttribute('distance', '8');
            tooltip.setAttribute('hoist', '');
            
            // Wrap the button with the tooltip
            button.parentNode.insertBefore(tooltip, button);
            tooltip.appendChild(button);
        }
    });
    
    // Add tooltips to nav items that don't have them
    document.querySelectorAll('.nav-item').forEach(item => {
        if (!item.closest('sl-tooltip') && !item.title) {
            const text = item.textContent.trim();
            
            // Add Shoelace tooltip
            const tooltip = document.createElement('sl-tooltip');
            tooltip.setAttribute('content', `Navigate to ${text} section`);
            tooltip.setAttribute('placement', 'right');
            tooltip.setAttribute('hoist', '');
            
            // Wrap the nav item with the tooltip
            item.parentNode.insertBefore(tooltip, item);
            tooltip.appendChild(item);
        }
    });
    
    // Add tooltips to any element with a title attribute (generic fallback)
    document.querySelectorAll('[title]:not(sl-tooltip [title])').forEach(el => {
        if (!el.closest('sl-tooltip')) {
            const titleText = el.getAttribute('title');
            if (!titleText) return;
            const tooltip = document.createElement('sl-tooltip');
            tooltip.setAttribute('content', titleText);
            tooltip.setAttribute('placement', 'top');
            tooltip.setAttribute('distance', '8');
            tooltip.setAttribute('hoist', '');
            el.removeAttribute('title');
            el.parentNode.insertBefore(tooltip, el);
            tooltip.appendChild(el);
        }
    });
}

// Observe DOM mutations to add tooltips to dynamically inserted elements
const tooltipObserver = new MutationObserver(() => addMissingTooltips());
tooltipObserver.observe(document.body, { childList: true, subtree: true });

// Font specimen functionality
function initFontSpecimen() {
    const fontSizeSlider = document.getElementById("font-size-slider");
    const fontSizeDisplay = document.getElementById("font-size-display");
    const fontPreview = document.getElementById("font-preview");
    
    if (fontSizeSlider && fontSizeDisplay && fontPreview) {
        // Initialize display with current value
        const initialSize = fontSizeSlider.value;
        fontSizeDisplay.textContent = initialSize + "px";
        fontPreview.style.fontSize = initialSize + "px";
        
        // Handle slider input events (both input and change for better compatibility)
        const updateFontSize = (e) => {
            const size = e.target.value;
            fontSizeDisplay.textContent = size + "px";
            fontPreview.style.fontSize = size + "px";
        };
        
        fontSizeSlider.addEventListener("input", updateFontSize);
        fontSizeSlider.addEventListener("change", updateFontSize);
        
        // Make preview text editable
        fontPreview.addEventListener("click", () => {
            fontPreview.focus();
        });
        
        // Prevent line breaks
        fontPreview.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
            }
        });
        
        // Prevent text selection when dragging slider
        fontPreview.addEventListener("selectstart", (e) => {
            if (document.activeElement === fontSizeSlider) {
                e.preventDefault();
            }
        });
    }
}
