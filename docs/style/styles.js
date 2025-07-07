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
            themeGroup.innerHTML = '<span class="control-label">Theme</span>';
            const themeBtn = this.button(this.theme.get() === 'dark' ? 'Light Mode' : 'Dark Mode', { 
                icon: this.theme.get() === 'dark' ? 'sun' : 'moon', 
                size: 'sm',
                class: 'theme-toggle-panel',
                onclick: () => {
                    this.theme.toggle();
                    const isDark = this.theme.get() === 'dark';
                    themeBtn.querySelector('i').setAttribute('data-lucide', isDark ? 'sun' : 'moon');
                    const textSpan = themeBtn.querySelector('span');
                    if (textSpan) textSpan.textContent = isDark ? 'Light Mode' : 'Dark Mode';
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
            fontGroup.innerHTML = '<span class="control-label">Font</span>';
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
            densityGroup.innerHTML = '<span class="control-label">Density</span>';
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
                colorPicker.style.cssText = 'width: 32px; height: 32px; border: 2px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; background: none; padding: 0;';
                
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
        }
    };
    
    // Expose to window
    window.UI = UI;
    
    // Auto-initialize theme from localStorage and components
    document.addEventListener('DOMContentLoaded', () => {
        const savedTheme = localStorage.getItem('fileui-theme');
        if (savedTheme) {
            UI.theme.set(savedTheme);
        }
        
        // Initialize all interactive components
        UI.init();
    });
})();