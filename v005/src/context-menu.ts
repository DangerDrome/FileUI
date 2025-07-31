// Context Menu Manager for FileUI v005

export interface ContextMenuItem {
  label: string;
  icon?: string; // Lucide icon name
  action?: () => void | Promise<void>;
  separator?: boolean;
  disabled?: boolean;
}

export type ContextMenuHandler = (e: MouseEvent) => ContextMenuItem[] | null;

export class ContextMenuManager {
  private menuElement: HTMLElement | null = null;
  private currentTarget: EventTarget | null = null;
  private handlers: Map<string, ContextMenuHandler> = new Map();
  private selectedIndex: number = -1;

  constructor() {
    this.init();
  }

  private init(): void {
    // Single event listener for all context menus
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    // Hide menu on click outside
    document.addEventListener('click', this.hideMenu.bind(this));
    
    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideMenu();
      }
    });
  }

  // Register a context menu handler for a specific selector
  public registerHandler(selector: string, handler: ContextMenuHandler): void {
    this.handlers.set(selector, handler);
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    
    // Find the most specific handler that matches
    let items: ContextMenuItem[] | null = null;
    let target = e.target as HTMLElement;
    
    // Walk up the DOM tree to find a matching handler
    while (target && target !== document.body) {
      for (const [selector, handler] of this.handlers) {
        if (target.matches(selector)) {
          items = handler(e);
          if (items) break;
        }
      }
      if (items) break;
      target = target.parentElement as HTMLElement;
    }
    
    // If no specific handler, check for default handler
    if (!items && this.handlers.has('*')) {
      const defaultHandler = this.handlers.get('*')!;
      items = defaultHandler(e);
    }
    
    if (items && items.length > 0) {
      this.currentTarget = e.target;
      this.showMenu(e.clientX, e.clientY, items);
    } else {
      this.hideMenu();
    }
  }

  private showMenu(x: number, y: number, items: ContextMenuItem[]): void {
    this.hideMenu();
    
    // Create menu element
    this.menuElement = document.createElement('div');
    this.menuElement.className = 'context-menu';
    
    // Add menu items
    items.forEach((item, index) => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        this.menuElement!.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        if (item.disabled) {
          menuItem.classList.add('disabled');
        }
        menuItem.dataset.index = index.toString();
        
        // Add icon if specified
        if (item.icon) {
          const icon = document.createElement('i');
          icon.setAttribute('data-lucide', item.icon);
          icon.className = 'lucide';
          menuItem.appendChild(icon);
        }
        
        // Add label
        const label = document.createElement('span');
        label.textContent = item.label;
        menuItem.appendChild(label);
        
        // Add click handler
        if (!item.disabled && item.action) {
          menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideMenu();
            item.action!();
          });
        }
        
        this.menuElement!.appendChild(menuItem);
      }
    });
    
    // Add to document
    document.body.appendChild(this.menuElement);
    
    // Initialize Lucide icons
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }
    
    // Position menu
    this.positionMenu(x, y);
    
    // Add keyboard navigation
    this.menuElement.addEventListener('keydown', this.handleKeyNavigation.bind(this));
    
    // Focus menu for keyboard navigation
    this.menuElement.setAttribute('tabindex', '-1');
    this.menuElement.focus();
  }

  private positionMenu(x: number, y: number): void {
    if (!this.menuElement) return;
    
    // Get menu dimensions
    const menuRect = this.menuElement.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Adjust position to stay within viewport
    let finalX = x;
    let finalY = y;
    
    // Check right edge
    if (x + menuRect.width > windowWidth) {
      finalX = windowWidth - menuRect.width - 10;
    }
    
    // Check bottom edge
    if (y + menuRect.height > windowHeight) {
      finalY = windowHeight - menuRect.height - 10;
    }
    
    // Apply position
    this.menuElement.style.left = `${finalX}px`;
    this.menuElement.style.top = `${finalY}px`;
  }

  private hideMenu(): void {
    if (this.menuElement) {
      this.menuElement.remove();
      this.menuElement = null;
      this.currentTarget = null;
      this.selectedIndex = -1;
    }
  }

  private handleKeyNavigation(e: KeyboardEvent): void {
    if (!this.menuElement) return;
    
    const items = this.menuElement.querySelectorAll('.context-menu-item:not(.disabled)');
    if (items.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % items.length;
        this.updateSelection(items);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = this.selectedIndex <= 0 ? items.length - 1 : this.selectedIndex - 1;
        this.updateSelection(items);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < items.length) {
          (items[this.selectedIndex] as HTMLElement).click();
        }
        break;
    }
  }

  private updateSelection(items: NodeListOf<Element>): void {
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  // Helper method to get the current target
  public getCurrentTarget(): EventTarget | null {
    return this.currentTarget;
  }
}