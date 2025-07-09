if (!window.UI) {
    window.UI = {};
}

(function(UI) {

    /**
     * Creates menu items, including sub-menus, from an array of item data.
     * This is an internal helper function.
     * @param {Array<object>} items - The items for the menu.
     * @param {function} closeMenuCallback - The function to call when an item is clicked.
     * @returns {DocumentFragment} - A fragment containing the menu items.
     */
    const createMenuItems = (items, closeMenuCallback) => {
        const fragment = document.createDocumentFragment();
        items.forEach(itemData => {
            if (itemData.type === 'divider') {
                const divider = document.createElement('div');
                divider.className = 'menu-divider';
                divider.setAttribute('role', 'separator');
                fragment.appendChild(divider);
                return;
            }

            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            menuItem.setAttribute('role', 'menuitem');
            menuItem.tabIndex = -1;

            if (itemData.icon) {
                const icon = document.createElement('i');
                icon.setAttribute('data-lucide', itemData.icon);
                menuItem.appendChild(icon);
            }

            const text = document.createElement('span');
            text.textContent = itemData.text;
            menuItem.appendChild(text);

            if (itemData.children && itemData.children.length > 0) {
                menuItem.classList.add('has-submenu');

                const subMenuIcon = document.createElement('i');
                subMenuIcon.setAttribute('data-lucide', 'chevron-right');
                menuItem.appendChild(subMenuIcon);

                const subMenuPanel = document.createElement('div');
                subMenuPanel.className = 'menu-panel';
                const subMenuItems = createMenuItems(itemData.children, closeMenuCallback);
                subMenuPanel.appendChild(subMenuItems);
                menuItem.appendChild(subMenuPanel);
            } else {
                if (itemData.shortcut) {
                    const shortcut = document.createElement('span');
                    shortcut.className = 'menu-shortcut tag';
                    shortcut.textContent = itemData.shortcut;
                    menuItem.appendChild(shortcut);
                }
                if (itemData.onClick) {
                    menuItem.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent closing parent menus
                        itemData.onClick();
                        if (closeMenuCallback) {
                            closeMenuCallback();
                        }
                    });
                }
            }
            fragment.appendChild(menuItem);
        });
        return fragment;
    };

    /**
     * Creates a menu component.
     * @param {object} config - The configuration for the menu.
     * @param {object} config.trigger - The configuration for the trigger button.
     * @param {string} config.trigger.text - The text for the trigger button.
     * @param {string} [config.trigger.icon] - The Lucide icon for the trigger button.
     * @param {Array<object>} config.items - The items for the menu.
     * @param {string} [config.placement] - The placement of the menu ('top', 'right', 'bottom', 'left').
     * @returns {HTMLElement} - The menu component.
     */
    UI.menu = (config) => {
        const { trigger, items, placement } = config;

        const menuContainer = document.createElement('div');
        menuContainer.className = 'menu';

        const triggerConfig = {
            iconPosition: 'right',
            variant: 'secondary',
            ...trigger,
            attributes: {
                'aria-haspopup': 'true',
                'aria-expanded': 'false',
                ...(trigger.attributes || {})
            }
        };
        const triggerButton = UI.button(triggerConfig);
        triggerButton.classList.add('menu-trigger');

        const menuPanel = document.createElement('div');
        menuPanel.className = 'menu-panel';
        menuPanel.setAttribute('role', 'menu');

        const closeMenu = () => {
            menuContainer.classList.remove('open', 'menu--top', 'menu--right', 'menu--left');
            triggerButton.setAttribute('aria-expanded', 'false');
            document.removeEventListener('click', handleOutsideClick, true);

            const parentPanel = menuContainer.closest('.panel');
            if (parentPanel) {
                parentPanel.classList.remove('panel--active');
            }
        };
        
        const menuItems = createMenuItems(items, closeMenu);
        menuPanel.appendChild(menuItems);

        menuContainer.appendChild(triggerButton);
        menuContainer.appendChild(menuPanel);

        UI.deferIcons();

        const toggleMenu = (e) => {
            e.stopPropagation();
            const isOpen = menuContainer.classList.contains('open');

            document.querySelectorAll('.menu.open').forEach(openMenu => {
                if (openMenu !== menuContainer) {
                    openMenu.classList.remove('open', 'menu--top', 'menu--right', 'menu--left');
                    openMenu.querySelector('.menu-trigger').setAttribute('aria-expanded', 'false');
                    
                    const otherPanel = openMenu.closest('.panel');
                    if (otherPanel) {
                        otherPanel.classList.remove('panel--active');
                    }
                }
            });

            if (isOpen) {
                closeMenu();
            } else {
                const parentPanel = menuContainer.closest('.panel');
                if (parentPanel) {
                    parentPanel.classList.add('panel--active');
                }

                let finalPlacement = placement;
                
                if (!finalPlacement) {
                    const triggerRect = triggerButton.getBoundingClientRect();
                    
                    menuPanel.style.visibility = 'hidden';
                    menuPanel.style.display = 'block';
                    const panelHeight = menuPanel.offsetHeight;
                    menuPanel.style.visibility = '';
                    menuPanel.style.display = '';

                    const spaceBelow = window.innerHeight - triggerRect.bottom;
                    if (spaceBelow < panelHeight && triggerRect.top > panelHeight) {
                        finalPlacement = 'top';
                    }
                }
                
                if (finalPlacement) {
                    menuContainer.classList.add(`menu--${finalPlacement}`);
                }

                menuContainer.classList.add('open');
                triggerButton.setAttribute('aria-expanded', 'true');
                document.addEventListener('click', handleOutsideClick, true);
            }
        };

        const handleOutsideClick = (e) => {
            if (!menuContainer.contains(e.target)) {
                closeMenu();
            }
        };

        triggerButton.addEventListener('click', toggleMenu);

        return menuContainer;
    };
    
    /**
     * Attaches a context menu to a target element.
     * @param {HTMLElement} target - The element to attach the context menu to.
     * @param {Array<object>} items - The items for the menu.
     */
    UI.contextMenu = (target, items) => {
        const showMenu = (e) => {
            e.preventDefault();
            
            // Remove any existing context menu
            hideMenu();

            let container = document.getElementById('context-menu-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'context-menu-container';
                document.body.appendChild(container);
            }
            
            const menuPanel = document.createElement('div');
            menuPanel.className = 'menu-panel';
            menuPanel.style.display = 'block'; // Make it visible to calculate size
            menuPanel.style.position = 'static';

            const menuItems = createMenuItems(items, hideMenu);
            menuPanel.appendChild(menuItems);
            
            container.appendChild(menuPanel);
            UI.icons();

            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            const { offsetWidth, offsetHeight } = menuPanel;
            
            let top = clientY;
            let left = clientX;

            if (clientY + offsetHeight > innerHeight) { top = innerHeight - offsetHeight - 5; }
            if (clientX + offsetWidth > innerWidth) { left = innerWidth - offsetWidth - 5; }
            
            container.style.top = `${top}px`;
            container.style.left = `${left}px`;

            document.addEventListener('click', hideMenu, { once: true, capture: true });
        };

        const hideMenu = (e) => {
            let container = document.getElementById('context-menu-container');
            if (container) {
                if (e && container.contains(e.target)) {
                    document.addEventListener('click', hideMenu, { once: true, capture: true });
                    return;
                }
                container.innerHTML = '';
                document.removeEventListener('click', hideMenu, { once: true, capture: true });
            }
        };

        target.addEventListener('contextmenu', showMenu);

        return {
            destroy: () => {
                target.removeEventListener('contextmenu', showMenu);
            }
        };
    };
    
}(window.UI)); 