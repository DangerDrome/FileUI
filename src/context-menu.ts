// Context menu manager

export interface ContextMenuItem {
  label?: string;
  icon?: string;
  shortcut?: string;
  action?: (() => void | Promise<void>);
  disabled?: boolean;
  separator?: boolean;
}

export type ContextMenuHandler = (e: MouseEvent) => ContextMenuItem[] | null;

export class ContextMenuManager {
  private menuElement: HTMLElement | null;
  // Support selector-based handlers and a default '*' handler
  private handlers: Map<string, ContextMenuHandler>;
  private activeIndex: number;

  /**
   * Create a context menu manager that shows a contextual menu at mouse position.
   */
  constructor() {
    this.menuElement = null;
    this.handlers = new Map();
    this.activeIndex = -1;
    this.init();
  }

  /**
   * Register a handler. Overloads:
   * - registerHandler(selector, handler)
   * - registerHandler(handler) → registers as default ('*')
   */
  public registerHandler(selector: string, handler: ContextMenuHandler): void;
  public registerHandler(handler: ContextMenuHandler): void;
  public registerHandler(selectorOrHandler: string | ContextMenuHandler, maybeHandler?: ContextMenuHandler): void {
    if (typeof selectorOrHandler === 'string' && maybeHandler) {
      this.handlers.set(selectorOrHandler, maybeHandler);
      return;
    }
    if (typeof selectorOrHandler === 'function') {
      this.handlers.set('*', selectorOrHandler);
    }
  }

  /** Initialize global listeners for contextmenu and keyboard navigation. */
  private init(): void {
    document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    document.addEventListener('keydown', (e) => this.handleKeyNavigation(e));
    document.addEventListener('click', () => this.hideMenu());
    window.addEventListener('resize', () => this.hideMenu());
  }

  /** Process right-click event, gather items, and render the menu. */
  private handleContextMenu(e: MouseEvent): void {
    // Find most specific matching selector up the DOM tree
    const target = e.target as HTMLElement | null;
    let node: HTMLElement | null = target;
    let items: ContextMenuItem[] | null = null;

    // Try concrete selectors first
    while (node && node !== document.body) {
      for (const [selector, handler] of this.handlers) {
        if (selector === '*') continue;
        if (node.matches(selector)) {
          items = handler(e);
          if (items && items.length > 0) break;
        }
      }
      if (items && items.length > 0) break;
      node = node.parentElement as HTMLElement | null;
    }

    // Fallback to default handler
    if ((!items || items.length === 0) && this.handlers.has('*')) {
      const defaultHandler = this.handlers.get('*')!;
      items = defaultHandler(e);
    }

    if (!items || items.length === 0) return;

    e.preventDefault();
    e.stopPropagation();

    if (!this.menuElement) {
      this.menuElement = document.createElement('div');
      this.menuElement.className = 'menu-dropdown';
      document.body.appendChild(this.menuElement);
    }

    this.showMenu(e.clientX, e.clientY, items);
  }

  /** Render the menu at a given position. */
  private showMenu(x: number, y: number, items: ContextMenuItem[]): void {
    if (!this.menuElement) return;

    this.menuElement.innerHTML = '';

    items.forEach((item, index) => {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'menu-separator';
        this.menuElement!.appendChild(sep);
        return;
      }
      if (!item.label) return;

      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
      if (item.disabled) menuItem.classList.add('disabled');
      menuItem.dataset.index = index.toString();

      const content = document.createElement('div');
      content.className = 'menu-item-content';

      if (item.icon) {
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', item.icon);
        icon.className = 'menu-icon';
        content.appendChild(icon);
      }

      const label = document.createElement('span');
      label.className = 'menu-label';
      label.textContent = item.label ?? '';
      content.appendChild(label);

      if (item.shortcut) {
        const shortcut = document.createElement('span');
        shortcut.className = 'menu-shortcut';
        shortcut.textContent = item.shortcut;
        content.appendChild(shortcut);
      }

      menuItem.appendChild(content);
      this.menuElement!.appendChild(menuItem);

      if (item.action && !item.disabled) {
        menuItem.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          this.hideMenu();
          try {
            await item.action?.();
          } catch {
          }
        });
      }
    });

    this.positionMenu(x, y);
    this.menuElement.style.display = 'block';
    (window as any).lucide && (window as any).lucide.createIcons({ icons: (window as any).lucide.icons });

    this.activeIndex = -1;
  }

  /** Ensure the menu stays within viewport bounds. */
  private positionMenu(x: number, y: number): void {
    if (!this.menuElement) return;
    const rect = this.menuElement.getBoundingClientRect();
    let left = x;
    let top = y;

    if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 8;
    if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 8;

    this.menuElement.style.left = `${left}px`;
    this.menuElement.style.top = `${top}px`;
  }

  /** Hide the menu and clear active state. */
  private hideMenu(): void {
    if (!this.menuElement) return;
    this.menuElement.style.display = 'none';
    this.activeIndex = -1;
  }

  /** Keyboard navigation for the active menu. */
  private handleKeyNavigation(e: KeyboardEvent): void {
    if (!this.menuElement || this.menuElement.style.display !== 'block') return;
    const items = this.menuElement.querySelectorAll('.menu-item:not(.disabled)');
    if (items.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.activeIndex = (this.activeIndex + 1) % items.length;
        this.updateSelection(items);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.activeIndex = (this.activeIndex - 1 + items.length) % items.length;
        this.updateSelection(items);
        break;
      case 'Enter':
        e.preventDefault();
        if (this.activeIndex >= 0 && this.activeIndex < items.length) {
          (items[this.activeIndex] as HTMLElement).click();
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.hideMenu();
        break;
    }
  }

  /** Update visual selection state for items. */
  private updateSelection(items: NodeListOf<Element>): void {
    items.forEach(i => i.classList.remove('selected'));
    if (this.activeIndex >= 0 && this.activeIndex < items.length) {
      items[this.activeIndex].classList.add('selected');
      (items[this.activeIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }
}