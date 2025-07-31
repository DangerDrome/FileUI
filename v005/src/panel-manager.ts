// Panel Manager - Simple fixed layout system
import { BSPPanelManager } from './bsp-manager';
import { ServerFileSystem, FileItem, sortFiles, getFileType } from './filemanager';
import MarkdownIt from 'markdown-it';
import { ContextMenuManager, ContextMenuItem } from './context-menu';

// Fixed panel configuration - header, left toolbar, and right toolbar remain fixed
const FIXED_PANELS = [
  {
    id: "header-panel",
    title: "Header",
    isToolbar: true
  },
  {
    id: "left-toolbar", 
    title: "Left Toolbar",
    isToolbar: true
  },
  {
    id: "right-toolbar",
    title: "Right Toolbar", 
    isToolbar: true
  }
];

interface Panel {
  id: string;
  title: string;
  element: HTMLElement;
  isToolbar: boolean;
}

export class PanelManager {
  private container: HTMLElement;
  private panels: Map<string, Panel> = new Map();
  private bspManager: BSPPanelManager | null = null;
  private directoryHandles: Map<string, any> = new Map();
  private fileHandles: Map<string, any> = new Map();
  private md: MarkdownIt;
  private contextMenu: ContextMenuManager;

  constructor(container: HTMLElement) {
    this.container = container;
    // Initialize markdown-it with same settings as StyleUI
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      breaks: true
    });
    // Initialize context menu manager
    this.contextMenu = new ContextMenuManager();
    this.init();
  }

  private initializeLucideIcons(delay: number = 0): void {
    if (delay > 0) {
      setTimeout(() => {
        if ((window as any).lucide) {
          (window as any).lucide.createIcons();
        }
      }, delay);
    } else {
      if ((window as any).lucide) {
        (window as any).lucide.createIcons();
      }
    }
  }

  private showErrorMessage(container: HTMLElement, message: string): void {
    container.innerHTML = `<div class="error-message">${message}</div>`;
  }

  private showLoadingState(container: HTMLElement, message: string = 'Loading...'): void {
    container.innerHTML = `<div class="loading-indicator">${message}</div>`;
  }

  private findOrCreateTargetPanel(): string | null {
    if (!this.bspManager) return null;

    // Always prioritize the focused panel first
    const focusedPanel = document.querySelector('.bsp-panel.focused');
    
    // If there's a focused panel and it's not an explorer panel
    if (focusedPanel && !focusedPanel.classList.contains('explorer-panel')) {
      // Always use the focused panel, even if it's pinned
      // This ensures files open in the current panel when explicitly selected
      return focusedPanel.getAttribute('data-panel-id');
    }
    
    // If no focused panel or focused panel is an explorer, find the first non-explorer panel
    const allPanels = document.querySelectorAll('.bsp-panel:not(.explorer-panel)');
    for (const panel of allPanels) {
      // Use the first available non-explorer panel
      this.focusPanel(panel);
      return panel.getAttribute('data-panel-id');
    }

    // Only create a new panel if no non-explorer panels exist
    const newPanelId = this.bspManager.addPanel('right');
    
    // Focus the newly created panel
    if (newPanelId) {
      setTimeout(() => {
        const newPanel = document.querySelector(`.bsp-panel[data-panel-id="${newPanelId}"]`);
        if (newPanel) {
          this.focusPanel(newPanel);
        }
      }, 10);
    }
    
    return newPanelId;
  }

  private async loadFileContent(content: HTMLElement, source: string | any, fileName: string, sourceType: 'server' | 'native'): Promise<void> {
    content.innerHTML = '<div class="file-loading">Loading file...</div>';

    try {
      const fileType = getFileType(fileName);

      if (sourceType === 'server') {
        // Server-based file loading
        if (fileType === 'file-image') {
          content.innerHTML = `<div class="file-preview image-preview">
            <img src="http://localhost:8001/api/file?path=${encodeURIComponent(source)}" alt="${fileName}" />
          </div>`;
        } else if (fileType === 'file-video') {
          content.innerHTML = `<div class="file-preview video-preview">
            <video controls src="http://localhost:8001/api/file?path=${encodeURIComponent(source)}" />
          </div>`;
        } else if (fileType === 'markdown' || fileName.endsWith('.md')) {
          const fs = new ServerFileSystem('http://localhost:8001/api');
          const fileContent = await fs.readFile(source);
          const renderedHtml = this.md.render(fileContent);
          content.innerHTML = `<div class="file-content markdown-content">
            ${renderedHtml}
          </div>`;
        } else {
          const fs = new ServerFileSystem('http://localhost:8001/api');
          const fileContent = await fs.readFile(source);
          content.innerHTML = `<div class="file-content">
            <pre class="file-text">${this.escapeHtml(fileContent)}</pre>
          </div>`;
        }
      } else {
        // Native file handle loading
        const file = await source.getFile();
        
        if (fileType === 'file-image') {
          const url = URL.createObjectURL(file);
          content.innerHTML = `<div class="file-preview image-preview">
            <img src="${url}" alt="${fileName}" onload="URL.revokeObjectURL(this.src)" />
          </div>`;
        } else if (fileType === 'file-video') {
          const url = URL.createObjectURL(file);
          content.innerHTML = `<div class="file-preview video-preview">
            <video controls src="${url}" onloadedmetadata="URL.revokeObjectURL(this.src)" />
          </div>`;
        } else if (fileType === 'markdown' || fileName.endsWith('.md')) {
          const text = await file.text();
          const renderedHtml = this.md.render(text);
          content.innerHTML = `<div class="file-content markdown-content">
            ${renderedHtml}
          </div>`;
        } else if (file.type.startsWith('text/') || fileType === 'file-code' || file.size < 1024 * 1024) {
          const text = await file.text();
          content.innerHTML = `<div class="file-content">
            <pre class="file-text">${this.escapeHtml(text)}</pre>
          </div>`;
        } else {
          content.innerHTML = `<div class="file-info">
            <p>File: ${fileName}</p>
            <p>Type: ${file.type || 'Unknown'}</p>
            <p>Size: ${this.formatFileSize(file.size)}</p>
            <p>Last Modified: ${new Date(file.lastModified).toLocaleString()}</p>
          </div>`;
        }
      }
    } catch (error) {
      console.error('Error loading file:', error);
      content.innerHTML = `<div class="file-error">
        <p>Failed to load file: ${fileName}</p>
        <p class="error-message">${error}</p>
      </div>`;
    }
  }

  private init(): void {
    this.createPanels();
    this.layout();
    this.setupEventListeners();
  }

  private createPanels(): void {
    // Clear container
    this.container.innerHTML = '';

    // Create each fixed panel
    FIXED_PANELS.forEach(panelConfig => {
      const element = this.createPanelElement(panelConfig);
      const panel: Panel = {
        id: panelConfig.id,
        title: panelConfig.title,
        element,
        isToolbar: panelConfig.isToolbar
      };

      this.panels.set(panelConfig.id, panel);
      this.container.appendChild(element);

      // Setup panel content
      this.setupPanelContent(panel);
    });

    // Create BSP container for the main content area
    const bspContainer = document.createElement('div');
    bspContainer.id = 'bsp-container';
    bspContainer.className = 'bsp-container';
    this.container.appendChild(bspContainer);

    // Initialize BSP panel manager
    this.bspManager = new BSPPanelManager(bspContainer);

    // Initialize Lucide icons
    this.initializeLucideIcons(50);
    
    // Initialize BSP manager after DOM is ready with longer delay
    setTimeout(() => {
      this.initializeBSPLayout();
    }, 500);
  }

  private createPanelElement(config: typeof FIXED_PANELS[0]): HTMLElement {
    const element = document.createElement('div');
    element.className = 'panel fileui-panel';
    element.dataset.panelId = config.id;

    if (config.isToolbar) {
      element.setAttribute('data-toolbar', 'true');
      element.className = 'panel fileui-panel toolbar-panel';
    }

    // Create panel header (hidden for toolbar panels)
    const header = document.createElement('div');
    header.className = 'panel-header';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'panel-title';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = config.title;
    titleDiv.appendChild(titleSpan);
    
    header.appendChild(titleDiv);

    // Create panel body
    const body = document.createElement('div');
    body.className = 'panel-body';
    
    const content = document.createElement('div');
    content.className = 'panel-content';
    body.appendChild(content);

    element.appendChild(header);
    element.appendChild(body);

    return element;
  }

  private layout(): void {
    const headerHeight = 48;
    const toolbarWidth = 48; // Both left and right toolbars

    // Use viewport dimensions for full width
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Position header panel - full viewport width at top
    const headerPanel = this.panels.get('header-panel');
    if (headerPanel) {
      Object.assign(headerPanel.element.style, {
        position: 'fixed',
        left: '0px',
        top: '0px',
        width: `${viewportWidth}px`,
        height: `${headerHeight}px`,
        zIndex: '200'
      });
    }

    // Position left toolbar - full height minus header
    const leftToolbar = this.panels.get('left-toolbar');
    if (leftToolbar) {
      Object.assign(leftToolbar.element.style, {
        position: 'fixed',
        left: '0px',
        top: `${headerHeight}px`,
        width: `${toolbarWidth}px`,
        height: `${viewportHeight - headerHeight}px`,
        zIndex: '200'
      });
    }

    // Position right toolbar - full height minus header
    const rightToolbar = this.panels.get('right-toolbar');
    if (rightToolbar) {
      Object.assign(rightToolbar.element.style, {
        position: 'fixed',
        right: '0px',
        top: `${headerHeight}px`,
        width: `${toolbarWidth}px`,
        height: `${viewportHeight - headerHeight}px`,
        zIndex: '200'
      });
    }

    // Position BSP container - fills remaining space
    const bspContainer = document.getElementById('bsp-container');
    if (bspContainer) {
      // Account for both left and right toolbars
      // No gap compensation needed since right toolbar fills the space
      const bspWidth = viewportWidth - (toolbarWidth * 2); // Account for both left and right toolbars
      const bspHeight = viewportHeight - headerHeight;
      
      console.log('BSP Container sizing:', {
        viewportWidth,
        viewportHeight,
        toolbarWidth,
        headerHeight,
        bspWidth,
        bspHeight,
        left: toolbarWidth,
        top: headerHeight,
        'available width after toolbars': bspWidth
      });
      
      Object.assign(bspContainer.style, {
        position: 'fixed',
        left: `${toolbarWidth}px`,
        top: `${headerHeight}px`,
        width: `${bspWidth}px`,
        height: `${bspHeight}px`,
        zIndex: '100',
        boxSizing: 'border-box'  // Ensure box-sizing is explicit
      });
      
      // Update BSP layout
      if (this.bspManager) {
        this.bspManager.layout();
      }
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.layout());
    
    
    // Handle toolbar button clicks
    this.container.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('button[data-action]') as HTMLButtonElement;
      if (button) {
        // Only handle if it's not inside a BSP panel
        const bspPanel = button.closest('.bsp-panel');
        if (!bspPanel) {
          this.handleToolbarButtonClick(button);
        }
      }
    });

    // Register context menu handlers
    this.registerContextMenuHandlers();
  }

  private registerContextMenuHandlers(): void {
    // File context menu
    this.contextMenu.registerHandler('.tree-item-content[data-is-folder="false"]', (e) => {
      const target = e.target as HTMLElement;
      const itemElement = target.closest('.tree-item-content') as HTMLElement;
      if (!itemElement) return null;

      const fileName = itemElement.dataset.fileName || 'Unknown';
      const path = itemElement.dataset.path;
      const isNative = itemElement.classList.contains('native-file');

      const items: ContextMenuItem[] = [
        {
          label: 'Open',
          icon: 'file-text',
          action: () => {
            if (isNative && itemElement.dataset.panelId) {
              const handle = this.fileHandles.get(`${itemElement.dataset.panelId}-${fileName}`);
              if (handle) {
                this.openNativeFileInBSPPanel(handle, fileName);
              }
            } else if (path) {
              this.openFileInBSPPanel(path, fileName);
            }
          }
        },
        {
          label: 'Open in New Panel',
          icon: 'panel-left',
          action: () => {
            if (this.bspManager) {
              const newPanelId = this.bspManager.addPanel('right');
              if (newPanelId) {
                setTimeout(() => {
                  if (isNative && itemElement.dataset.panelId) {
                    const handle = this.fileHandles.get(`${itemElement.dataset.panelId}-${fileName}`);
                    if (handle) {
                      this.openNativeFileInBSPPanel(handle, fileName);
                    }
                  } else if (path) {
                    this.openFileInBSPPanel(path, fileName);
                  }
                }, 100);
              }
            }
          }
        },
        { separator: true },
        {
          label: 'Copy Path',
          icon: 'copy',
          action: () => {
            if (path) {
              navigator.clipboard.writeText(path);
            }
          }
        },
        { separator: true },
        {
          label: 'Rename',
          icon: 'edit',
          disabled: true
        },
        {
          label: 'Delete',
          icon: 'trash',
          disabled: true
        }
      ];

      return items;
    });

    // Folder context menu
    this.contextMenu.registerHandler('.tree-item-content[data-is-folder="true"]', (e) => {
      const target = e.target as HTMLElement;
      const itemElement = target.closest('.tree-item-content') as HTMLElement;
      if (!itemElement) return null;

      const folderName = itemElement.dataset.fileName || 'Unknown';
      const path = itemElement.dataset.path;
      const isExpanded = itemElement.querySelector('.tree-item-toggle')?.getAttribute('data-expanded') === 'true';

      const items: ContextMenuItem[] = [
        {
          label: isExpanded ? 'Collapse' : 'Expand',
          icon: isExpanded ? 'chevron-up' : 'chevron-down',
          action: () => {
            const toggleBtn = itemElement.querySelector('.tree-item-toggle') as HTMLElement;
            if (toggleBtn) {
              toggleBtn.click();
            }
          }
        },
        {
          label: 'Open in New Panel',
          icon: 'panel-left',
          action: () => {
            if (this.bspManager) {
              const newPanelId = this.bspManager.addPanel('right');
              if (newPanelId) {
                setTimeout(() => {
                  const newPanel = document.querySelector(`.bsp-panel[data-panel-id="${newPanelId}"]`);
                  if (newPanel) {
                    // Create file explorer in the new panel
                    const content = newPanel.querySelector('.panel-content');
                    if (content) {
                      content.innerHTML = '<div class="file-explorer"></div>';
                      // TODO: Load folder content
                    }
                  }
                }, 100);
              }
            }
          }
        },
        { separator: true },
        {
          label: 'New File',
          icon: 'file-plus',
          disabled: true
        },
        {
          label: 'New Folder',
          icon: 'folder-plus',
          disabled: true
        },
        { separator: true },
        {
          label: 'Copy Path',
          icon: 'copy',
          action: () => {
            if (path) {
              navigator.clipboard.writeText(path);
            }
          }
        }
      ];

      return items;
    });

    // Panel context menu
    this.contextMenu.registerHandler('.bsp-panel', (e) => {
      const target = e.target as HTMLElement;
      const panel = target.closest('.bsp-panel') as HTMLElement;
      if (!panel) return null;

      const isPinned = panel.classList.contains('is-pinned');
      const panelId = panel.dataset.panelId;

      const items: ContextMenuItem[] = [
        {
          label: 'Split Horizontal',
          icon: 'rows-2',
          action: () => {
            if (this.bspManager && panelId) {
              this.bspManager.splitPanel(panelId, 'horizontal');
            }
          }
        },
        {
          label: 'Split Vertical',
          icon: 'columns-2',
          action: () => {
            if (this.bspManager && panelId) {
              this.bspManager.splitPanel(panelId, 'vertical');
            }
          }
        },
        { separator: true },
        {
          label: isPinned ? 'Unpin Panel' : 'Pin Panel',
          icon: isPinned ? 'pin-off' : 'pin',
          action: () => {
            const pinBtn = panel.querySelector('[data-action="pin"]') as HTMLElement;
            if (pinBtn) {
              pinBtn.click();
            }
          }
        },
        {
          label: 'Close Panel',
          icon: 'x',
          action: () => {
            if (this.bspManager && panelId) {
              this.bspManager.removePanel(panelId);
            }
          }
        }
      ];

      return items;
    });

    // Empty panel content context menu
    this.contextMenu.registerHandler('.panel-content', (e) => {
      const target = e.target as HTMLElement;
      // Only show if clicking on empty panel content
      if (target.closest('.tree-item-content') || target.closest('.file-preview')) {
        return null;
      }

      const items: ContextMenuItem[] = [
        {
          label: 'Open File',
          icon: 'file',
          action: async () => {
            if ('showOpenFilePicker' in window) {
              try {
                const [handle] = await (window as any).showOpenFilePicker();
                this.openNativeFileInBSPPanel(handle, handle.name);
              } catch (err) {
                console.log('User cancelled file selection');
              }
            }
          }
        },
        {
          label: 'Open Folder',
          icon: 'folder',
          action: () => {
            const panel = target.closest('.bsp-panel');
            if (panel) {
              const panelId = panel.getAttribute('data-panel-id');
              if (panelId) {
                this.showDirectoryChooser(panelId);
              }
            }
          }
        }
      ];

      return items;
    });

    // Default context menu (empty areas)
    this.contextMenu.registerHandler('*', (e) => {
      const target = e.target as HTMLElement;
      // Don't show default menu if clicking on specific elements
      if (target.closest('.tree-item-content') || 
          target.closest('.bsp-panel') ||
          target.closest('.panel-content')) {
        return null;
      }

      const items: ContextMenuItem[] = [
        {
          label: 'New Panel',
          icon: 'panel-left',
          action: () => {
            if (this.bspManager) {
              this.bspManager.addPanel('right');
            }
          }
        },
        {
          label: 'Refresh',
          icon: 'refresh-cw',
          action: () => {
            window.location.reload();
          }
        }
      ];

      return items;
    });
  }

  private handleToolbarButtonClick(btn: HTMLButtonElement): void {
    const action = btn.dataset.action;
    console.log('Toolbar button clicked:', action);
    
    if (action === 'add-panel' && this.bspManager) {
      // Add a new panel to the BSP tree
      this.bspManager.addPanel('right');
    } else if (action === 'explorer' && this.bspManager) {
      // Create a new BSP panel with file explorer
      this.createExplorerBSPPanel();
    } else if (action === 'properties' && this.bspManager) {
      // Create or focus properties panel - only allow one
      this.createOrFocusPropertiesPanel();
    } else if (action === 'terminal' && this.bspManager) {
      // Create a new terminal panel
      this.createTerminalBSPPanel();
    }
  }


  private setupPanelContent(panel: Panel): void {
    if (panel.id === 'header-panel') {
      this.setupHeaderPanel(panel);
    } else if (panel.id === 'left-toolbar') {
      this.setupLeftToolbar(panel);
    } else if (panel.id === 'right-toolbar') {
      this.setupRightToolbar(panel);
    }
  }

  private setupHeaderPanel(panel: Panel): void {
    panel.element.classList.add('header-panel');
    const body = panel.element.querySelector('.panel-body');
    if (body) {
      body.innerHTML = `
        <div class="header-content">
          <div class="menu-bar">
            <div class="menu">
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="file">File</button>
            </div>
            <div class="menu">
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="edit">Edit</button>
            </div>
            <div class="menu">
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="view">View</button>
            </div>
            <div class="menu">
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="terminal">Terminal</button>
            </div>
            <div class="menu">
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="help">Help</button>
            </div>
          </div>
          <div class="header-toolbar">
            <button class="btn btn-ghost btn-sm" data-action="add-panel" title="Add Panel">
              <i data-lucide="plus" class="lucide"></i>
            </button>
            <button class="btn btn-ghost btn-sm" data-action="reset-layout" title="Reset Layout">
              <i data-lucide="refresh-cw" class="lucide"></i>
            </button>
            <div class="toolbar-separator"></div>
            <button class="btn btn-ghost btn-sm" data-action="save-layout" title="Save Layout">
              <i data-lucide="save" class="lucide"></i>
            </button>
            <button class="btn btn-ghost btn-sm" data-action="load-layout" title="Load Layout">
              <i data-lucide="folder-open" class="lucide"></i>
            </button>
          </div>
        </div>
      `;
    }
  }

  private setupLeftToolbar(panel: Panel): void {
    panel.element.classList.add('action-bar-panel');
    const body = panel.element.querySelector('.panel-body');
    if (body) {
      body.innerHTML = `
        <div class="menu-bar-vertical">
          <div class="main-actions">
            <div class="menu">
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="explorer" title="Explorer">
                <i data-lucide="folder" class="lucide"></i>
              </button>
            </div>
            <div class="menu">
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="properties" title="Properties">
                <i data-lucide="sliders-horizontal" class="lucide"></i>
              </button>
            </div>
            <div class="menu">
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="terminal" title="Terminal">
                <i data-lucide="terminal" class="lucide"></i>
              </button>
            </div>
          </div>
          <div class="bottom-actions">
            <div class="menu">
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="source-control" title="Source Control">
                <i data-lucide="git-fork" class="lucide"></i>
              </button>
            </div>
            <div class="menu">
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="reload" title="Reload">
                <i data-lucide="refresh-cw" class="lucide"></i>
              </button>
            </div>
            <div class="menu">
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="settings" title="Settings">
                <i data-lucide="settings" class="lucide"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  private setupRightToolbar(panel: Panel): void {
    panel.element.classList.add('action-bar-panel', 'right-toolbar');
    const body = panel.element.querySelector('.panel-body');
    if (body) {
      body.innerHTML = `
        <div class="menu-bar-vertical">
          <div class="main-actions">
            <!-- Empty for now -->
          </div>
          <div class="bottom-actions">
            <!-- Empty for now -->
          </div>
        </div>
      `;
    }
  }

  private createOrFocusPropertiesPanel(): void {
    if (!this.bspManager) return;
    
    // Check if a properties panel already exists
    const existingPropertiesPanel = document.querySelector('.bsp-panel[data-panel-type="properties"]') as HTMLElement;
    if (existingPropertiesPanel) {
      // Focus existing properties panel
      const panelId = existingPropertiesPanel.getAttribute('data-panel-id');
      if (panelId && this.bspManager) {
        this.bspManager.focusPanel(panelId);
      }
      return;
    }
    
    // Create new properties panel
    const newPanelId = this.bspManager.addPanel('right');
    if (!newPanelId) return;
    
    // Wait for the panel to be created and then update its content
    setTimeout(() => {
      const focusedPanel = document.querySelector(`.bsp-panel[data-panel-id="${newPanelId}"]`) as HTMLElement;
      if (focusedPanel) {
        // Mark this as a properties panel
        focusedPanel.setAttribute('data-panel-type', 'properties');
        this.setupPropertiesContent(newPanelId);
        this.pinPanel(newPanelId);
      }
    }, 100);
  }

  private createTerminalBSPPanel(): void {
    if (!this.bspManager) return;
    
    // Add a new terminal panel at the bottom
    const newPanelId = this.bspManager.addPanel('bottom');
    if (!newPanelId) return;
    
    // Wait for the panel to be created and then update its content
    setTimeout(() => {
      const focusedPanel = document.querySelector(`.bsp-panel[data-panel-id="${newPanelId}"]`) as HTMLElement;
      if (focusedPanel) {
        // Mark this as a terminal panel
        focusedPanel.setAttribute('data-panel-type', 'terminal');
        this.setupTerminalContent(newPanelId);
      }
    }, 100);
  }

  private initializeBSPLayout(): void {
    console.log('=== Initializing BSP Layout ===');
    
    // Also show status in the main content area for debugging
    const bspContainer = document.getElementById('bsp-container');
    if (bspContainer) {
      const debugDiv = document.createElement('div');
      debugDiv.style.cssText = 'position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; z-index: 1000; font-family: monospace; font-size: 12px;';
      debugDiv.innerHTML = 'Initializing BSP Layout...';
      bspContainer.appendChild(debugDiv);
      
      setTimeout(() => {
        debugDiv.remove();
      }, 3000);
    }
    if (!this.bspManager) {
      console.error('BSP Manager not available');
      return;
    }

    // Initialize the BSP manager
    console.log('Initializing BSP manager...');
    this.bspManager.init();
    
    // Get the initial main panel
    const rootNode = this.bspManager.getRoot();
    console.log('Root node after init:', rootNode);
    if (!rootNode) {
      console.error('No root node found after BSP init');
      return;
    }

    // Split horizontally to add terminal at bottom (80% main, 20% terminal)
    console.log('Splitting root panel horizontally for terminal...');
    const terminalPanelId = this.bspManager.splitPanel(rootNode.id, 'horizontal', 'bottom');
    console.log('Terminal panel creation result:', terminalPanelId);
    
    // Get the new root after first split
    const rootAfterTerminal = this.bspManager.getRoot();
    console.log('Root after terminal split:', rootAfterTerminal);
    
    if (terminalPanelId) {
      // Set the split ratio - root should now be the parent containing main and terminal
      const newRoot = this.bspManager.getRoot();
      if (newRoot && newRoot.direction === 'horizontal') {
        console.log('Setting terminal split ratio to 0.8');
        newRoot.split = 0.8; // 80% for main content, 20% for terminal
      } else {
        console.log('Root direction not horizontal or root not found:', newRoot);
      }
      
      // Add terminal content to the bottom panel and pin it
      setTimeout(() => {
        console.log('Setting up terminal content...');
        this.setupTerminalContent(terminalPanelId);
        this.pinPanel(terminalPanelId);
      }, 100);
    }

    // Now find the main content panel ID (should be the first child of the root)
    let mainContentPanelId = rootNode.id;
    const currentRoot = this.bspManager.getRoot();
    if (currentRoot && currentRoot.children.length > 0) {
      // The main content should be the first child (top/left in the split)
      mainContentPanelId = currentRoot.children[0].id;
      console.log('Main content panel ID after terminal split:', mainContentPanelId);
    }

    // Split the main content vertically to add properties on right (75% content, 25% properties)  
    console.log('Splitting main content vertically for properties...');
    const propertiesPanelId = this.bspManager.splitPanel(mainContentPanelId, 'vertical', 'right');
    console.log('Properties panel creation result:', propertiesPanelId);
    
    if (propertiesPanelId) {
      // Find the vertical split node and set its ratio
      const currentRoot = this.bspManager.getRoot();
      console.log('Root after properties split:', currentRoot);
      if (currentRoot && currentRoot.children.length > 0) {
        // The first child should be the vertical split containing main content and properties
        const verticalSplit = currentRoot.children[0];
        console.log('First child (should be vertical split):', verticalSplit);
        if (verticalSplit && verticalSplit.direction === 'vertical') {
          console.log('Setting properties split ratio to 0.75');
          verticalSplit.split = 0.75; // 75% for content, 25% for properties
        } else {
          console.log('First child not a vertical split or not found');
        }
      } else {
        console.log('No children found in current root');
      }
      
      // Add properties content to the right panel and pin it
      setTimeout(() => {
        console.log('Setting up properties content...');
        this.setupPropertiesContent(propertiesPanelId);
        this.pinPanel(propertiesPanelId);
      }, 100);
    }

    // Layout the BSP tree
    console.log('Running BSP layout...');
    this.bspManager.layout();
    
    // Debug: Check how many BSP panels exist
    setTimeout(() => {
      const bspPanels = document.querySelectorAll('.bsp-panel');
      console.log(`Total BSP panels found: ${bspPanels.length}`);
      bspPanels.forEach((panel, index) => {
        const panelId = panel.getAttribute('data-panel-id');
        const panelType = panel.getAttribute('data-panel-type');
        const title = panel.querySelector('.panel-title span')?.textContent;
        console.log(`Panel ${index + 1}: ID=${panelId}, Type=${panelType}, Title=${title}`);
      });
    }, 200);
    
    console.log('=== BSP Layout Complete ===');
  }


  private createExplorerBSPPanel(): void {
    if (!this.bspManager) return;
    
    // Add a new panel on the left side
    const newPanelId = this.bspManager.addPanel('left');
    if (!newPanelId) return;
    
    // Wait for the panel to be created and then update its content
    setTimeout(() => {
      // Get the newly created panel by ID
      const focusedPanel = document.querySelector(`.bsp-panel[data-panel-id="${newPanelId}"]`) as HTMLElement;
      if (focusedPanel) {
        // Mark this as an explorer panel
        focusedPanel.setAttribute('data-panel-type', 'explorer');
        const panelTitle = focusedPanel.querySelector('.panel-title span');
        const panelContent = focusedPanel.querySelector('.panel-content');
        
        if (panelTitle && panelTitle.parentElement) {
          panelTitle.parentElement.innerHTML = `
            <i data-lucide="folder" class="lucide" style="width: 16px; height: 16px; margin-right: 6px;"></i>
            <span>Explorer</span>
          `;
        }
        
        if (panelContent) {
          // Mark this panel as an explorer panel
          focusedPanel.classList.add('explorer-panel');
          
          // Create file explorer tree structure without header
          panelContent.innerHTML = `
            <div class="file-explorer-content" data-panel-id="${newPanelId}">
              <div class="tree" aria-label="File Explorer">
                <div class="loading-indicator">Loading files...</div>
              </div>
            </div>
          `;
          
          // Load files and setup interactions
          this.loadDirectoryContents(this.currentPath, newPanelId);
          this.setupExplorerInteractions(newPanelId);
          
          // Re-initialize Lucide icons
          this.initializeLucideIcons(10);
        }
      }
    }, 100);
  }

  private async loadDirectoryContents(path: string, panelId: string): Promise<void> {
    const treeElement = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"] .tree`) as HTMLElement;
    if (!treeElement) return;

    try {
      // Show loading state
      this.showLoadingState(treeElement, 'Loading files...');

      // Fetch files from server
      const fs = new ServerFileSystem('http://localhost:8001/api');
      const files = await fs.listFiles(path);

      // Clear loading indicator
      treeElement.innerHTML = '';

      // Sort files (folders first, then by name)
      const sortedFiles = sortFiles(files);

      // Create tree items
      sortedFiles.forEach(file => {
        const treeItem = this.createTreeItem(file, panelId);
        treeElement.appendChild(treeItem);
      });

      // Update path display
      const pathElement = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"] .file-explorer-path`);
      if (pathElement) {
        pathElement.textContent = path;
      }

      // Store current path
      this.currentPath = path;
      
      // Keep Explorer title with icon
      const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`) as HTMLElement;
      if (panel) {
        const panelTitle = panel.querySelector('.panel-title span');
        if (panelTitle && panelTitle.parentElement) {
          panelTitle.parentElement.innerHTML = `
            <i data-lucide="folder" class="lucide" style="width: 16px; height: 16px; margin-right: 6px;"></i>
            <span>Explorer</span>
          `;
        }
      }

      // Re-initialize Lucide icons after loading content
      this.initializeLucideIcons(10);

    } catch (error) {
      console.error('Error loading directory contents:', error);
      treeElement.innerHTML = `
        <div class="error-message">
          <i data-lucide="alert-circle" class="lucide"></i>
          <span>Failed to load directory contents</span>
        </div>
      `;
      
      // Re-initialize Lucide icons for error state
      this.initializeLucideIcons(10);
    }
  }

  private createTreeItem(file: FileItem, _panelId: string, level: number = 0): HTMLElement {
    const treeItem = document.createElement('div');
    treeItem.className = 'tree-item';
    treeItem.setAttribute('role', 'treeitem');
    treeItem.setAttribute('data-level', level.toString());
    
    const isDirectory = file.type === 'directory';
    const fileType = isDirectory ? 'folder' : getFileType(file.name);
    
    // Get appropriate icon
    let iconName = 'file';
    if (isDirectory) {
      iconName = 'folder';
    } else if (fileType === 'file-3d') {
      iconName = 'box';
    } else if (fileType === 'file-comp') {
      iconName = 'layers';
    } else if (fileType === 'file-image') {
      iconName = 'image';
    } else if (fileType === 'file-video') {
      iconName = 'film';
    } else if (fileType === 'file-project') {
      iconName = 'briefcase';
    }
    
    treeItem.innerHTML = `
      <div class="tree-item-content" data-is-folder="${isDirectory}" data-path="${file.path}" data-file-name="${file.name}" data-file-type="${fileType}" style="padding-left: ${20 + level * 20}px">
        ${isDirectory ? `
          <button class="tree-item-toggle" aria-label="Toggle node" data-expanded="false">
            <i data-lucide="chevron-right" class="lucide chevron-icon"></i>
          </button>
        ` : '<div class="tree-item-spacer"></div>'}
        <i data-lucide="${iconName}" class="lucide tree-item-icon" data-file-type="${fileType}"></i>
        <span class="tree-item-label">${file.name}</span>
      </div>
      ${isDirectory ? '<div class="tree-item-children" style="display: none;"></div>' : ''}
    `;
    
    return treeItem;
  }

  private setupExplorerInteractions(panelId: string): void {
    const explorerContent = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"] .file-explorer-content`);
    if (!explorerContent) return;

    // Handle tree item clicks
    explorerContent.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      

      // Handle tree item clicks
      const treeItemContent = target.closest('.tree-item-content') as HTMLElement;
      if (treeItemContent) {
        const isFolder = treeItemContent.dataset.isFolder === 'true';
        const treeItem = treeItemContent.closest('.tree-item') as HTMLElement;

        // Handle toggle button clicks
        if (target.closest('.tree-item-toggle')) {
          e.stopPropagation();
          if (treeItem) {
            this.toggleFolder(treeItem, panelId);
          }
          return;
        }

        if (!isFolder && treeItem) {
          // Handle file selection and opening
          this.selectFile(treeItem, panelId);
          
          // Open file in new panel on single click
          const path = treeItemContent.dataset.path;
          const fileName = treeItemContent.querySelector('.tree-item-label')?.textContent || '';
          if (path && fileName) {
            this.openFileInBSPPanel(path, fileName);
          }
        }
      }
    });

  }

  private async toggleFolder(treeItem: HTMLElement, panelId: string): Promise<void> {
    const treeItemContent = treeItem.querySelector('.tree-item-content') as HTMLElement;
    const toggleBtn = treeItem.querySelector('.tree-item-toggle') as HTMLButtonElement;
    const childrenContainer = treeItem.querySelector('.tree-item-children') as HTMLElement;
    const path = treeItemContent?.dataset.path;

    if (!childrenContainer || !path || !toggleBtn) return;

    const isExpanded = toggleBtn.getAttribute('data-expanded') === 'true';

    if (isExpanded) {
      // Collapse folder
      toggleBtn.setAttribute('data-expanded', 'false');
      childrenContainer.style.display = 'none';
    } else {
      // Expand folder
      toggleBtn.setAttribute('data-expanded', 'true');
      childrenContainer.style.display = 'block';

      // Load children if not already loaded
      if (childrenContainer.children.length === 0) {
        this.showLoadingState(childrenContainer, 'Loading...');

        try {
          const fs = new ServerFileSystem('http://localhost:8001/api');
          const files = await fs.listFiles(path);
          const sortedFiles = sortFiles(files);

          childrenContainer.innerHTML = '';
          const currentLevel = parseInt(treeItem.getAttribute('data-level') || '0');
          sortedFiles.forEach(file => {
            const childItem = this.createTreeItem(file, panelId, currentLevel + 1);
            childrenContainer.appendChild(childItem);
          });

          // Setup interactions for the newly loaded items
          this.setupTreeItemInteractions(childrenContainer, panelId);
          
          // Re-initialize Lucide icons for newly loaded items
          this.initializeLucideIcons(10);

        } catch (error) {
          console.error('Error loading folder contents:', error);
          this.showErrorMessage(childrenContainer, 'Failed to load');
        }
      }
    }

    // Re-initialize Lucide icons
    this.initializeLucideIcons(10);
  }

  private selectFile(treeItem: HTMLElement, panelId: string): void {
    // Remove previous selection in this panel
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (panel) {
      panel.querySelectorAll('.tree-item.selected').forEach(item => {
        item.classList.remove('selected');
      });
    }

    // Add selection to current item
    treeItem.classList.add('selected');

    // Update properties panel if visible
    const path = treeItem.dataset.path;
    const fileName = treeItem.querySelector('.tree-item-label')?.textContent || '';
    
    // Update properties panel
    this.updatePropertiesPanel({
      name: fileName,
      path: path || '',
      type: getFileType(fileName)
    });
  }

  private updatePropertiesPanel(fileInfo: { name: string; path: string; type: string }): void {
    // Find property items by iterating through them
    const propertyItems = document.querySelectorAll('.property-item');
    
    propertyItems.forEach(item => {
      const label = item.querySelector('.property-label');
      const value = item.querySelector('.property-value');
      
      if (label && value) {
        const labelText = label.textContent?.trim();
        
        if (labelText === 'Name:') {
          value.textContent = fileInfo.name;
        } else if (labelText === 'Type:') {
          value.textContent = fileInfo.type;
        }
      }
    });
  }

  private async openFileInBSPPanel(path: string, fileName: string): Promise<void> {
    const targetPanelId = this.findOrCreateTargetPanel();
    if (!targetPanelId) return;

    // Update panel content with file
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${targetPanelId}"]`);
    if (!panel) {
      console.error('Panel not found with ID:', targetPanelId);
      return;
    }

    // Check if panel has no header (initial empty panel) and add one
    if (!panel.querySelector('.panel-header')) {
      this.addHeaderToPanel(panel as HTMLElement, fileName);
    }

    const panelTitle = panel.querySelector('.panel-title');
    const content = panel.querySelector('.panel-content') as HTMLElement;
    
    if (panelTitle) {
      const fileType = getFileType(fileName);
      const iconName = this.getFileIcon(fileType);
      const iconColor = this.getFileIconColor(fileType);
      panelTitle.innerHTML = `
        <i data-lucide="${iconName}" class="lucide" style="width: 16px; height: 16px; margin-right: 6px; color: ${iconColor};"></i>
        <span>${fileName}</span>
      `;
    }

    if (content) {
      await this.loadFileContent(content, path, fileName, 'server');
      
      // Store file info in panel
      panel.setAttribute('data-file-path', path);
      panel.setAttribute('data-file-name', fileName);
      
      // Focus the panel that now contains the file
      this.focusPanel(panel);
      
      // Re-initialize Lucide icons for the new file icon
      this.initializeLucideIcons(10);
    }
  }
  
  private getFileIcon(fileType: string): string {
    switch (fileType) {
      case 'file-3d': return 'box';
      case 'file-comp': return 'layers';
      case 'file-image': return 'image';
      case 'file-video': return 'film';
      case 'file-project': return 'folder-open';
      case 'javascript':
      case 'typescript': return 'file-code';
      case 'json': return 'file-json';
      case 'markdown': return 'file-text';
      default: return 'file';
    }
  }
  
  private getFileIconColor(fileType: string): string {
    switch (fileType) {
      case 'file-3d': return 'var(--file-3d)';
      case 'file-comp': return 'var(--file-comp)';
      case 'file-image': return 'var(--file-image)';
      case 'file-video': return 'var(--file-video)';
      case 'file-project': return 'var(--file-project)';
      default: return 'var(--color-white-rgba-70)';
    }
  }
  
  private focusPanel(panel: Element): void {
    // Use BSP manager's focus method to ensure proper focus tracking
    if (this.bspManager && panel instanceof HTMLElement) {
      this.bspManager.setFocusedPanel(panel);
    } else {
      // Fallback to manual focus management
      document.querySelectorAll('.bsp-panel.focused').forEach(p => {
        p.classList.remove('focused');
      });
      panel.classList.add('focused');
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private setupTreeItemInteractions(_container: HTMLElement, _panelId: string): void {
    // Event delegation is already handled in setupExplorerInteractions
    // This method is now only used to ensure proper initialization
    // No need for individual event listeners as they conflict with delegation
  }

  private async showDirectoryChooser(panelId: string): Promise<void> {
    // Check if File System Access API is available
    if (!('showDirectoryPicker' in window)) {
      // Fallback to manual input modal
      this.showManualDirectoryChooser(panelId);
      return;
    }

    try {
      // Use native file system picker
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read'
      });

      // Store the directory handle for later use
      if (!this.directoryHandles) {
        this.directoryHandles = new Map();
      }
      this.directoryHandles.set(panelId, dirHandle);

      // Load the directory contents using the File System Access API
      await this.loadDirectoryFromHandle(dirHandle, panelId);

    } catch (error) {
      // User cancelled or error occurred
      console.log('Directory picker cancelled or error:', error);
    }
  }

  private showManualDirectoryChooser(panelId: string): void {
    // Fallback modal for browsers without File System Access API
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Choose Directory</h3>
          <button class="btn btn-ghost btn-sm close-modal">
            <i data-lucide="x" class="lucide"></i>
          </button>
        </div>
        <div class="modal-body">
          <p class="text-sm mb-4">Your browser doesn't support native folder selection. Please use the server-based file browser or enter a path manually.</p>
          <div class="directory-input-group">
            <input type="text" class="directory-input" placeholder="Enter directory path" value="${this.currentPath}">
            <button class="btn btn-primary btn-sm">Open</button>
          </div>
          <div class="common-directories">
            <h4>Common Directories</h4>
            <button class="btn btn-ghost btn-sm directory-shortcut" data-path="/">Root (/)</button>
            <button class="btn btn-ghost btn-sm directory-shortcut" data-path="/home">Home</button>
            <button class="btn btn-ghost btn-sm directory-shortcut" data-path="/tmp">Temp</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Initialize Lucide icons in modal
    setTimeout(() => {
      this.initializeLucideIcons();
    }, 10);

    // Handle modal interactions
    const closeModal = () => {
      modal.remove();
    };

    const openDirectory = (path: string) => {
      this.loadDirectoryContents(path, panelId);
      closeModal();
    };

    // Close button
    modal.querySelector('.close-modal')?.addEventListener('click', closeModal);

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Directory shortcuts
    modal.querySelectorAll('.directory-shortcut').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-path');
        if (path) openDirectory(path);
      });
    });

    // Open button
    const openBtn = modal.querySelector('.btn-primary');
    const input = modal.querySelector('.directory-input') as HTMLInputElement;
    
    openBtn?.addEventListener('click', () => {
      if (input.value) {
        openDirectory(input.value);
      }
    });

    // Enter key support
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value) {
        openDirectory(input.value);
      }
    });

    // Focus input
    input?.focus();
  }

  // Add a property to store current path
  private currentPath: string = '.';

  private async loadDirectoryFromHandle(dirHandle: any, panelId: string): Promise<void> {
    const treeElement = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"] .tree`) as HTMLElement;
    if (!treeElement) return;

    try {
      // Show loading state
      this.showLoadingState(treeElement, 'Loading files...');

      // Get files from directory handle
      const files: FileItem[] = [];
      
      for await (const entry of dirHandle.values()) {
        const item: FileItem = {
          name: entry.name,
          path: entry.name, // For File System API, we use name as path
          type: entry.kind === 'directory' ? 'directory' : 'file',
          size: 0 // Size not available without reading file
        };
        
        // Store handle for later use
        if (!this.fileHandles) {
          this.fileHandles = new Map();
        }
        this.fileHandles.set(`${panelId}:${entry.name}`, entry);
        
        files.push(item);
      }

      // Clear loading indicator
      treeElement.innerHTML = '';

      // Sort files (folders first, then by name)
      const sortedFiles = sortFiles(files);

      // Create tree items
      sortedFiles.forEach(file => {
        const treeItem = this.createNativeTreeItem(file, panelId, dirHandle);
        treeElement.appendChild(treeItem);
      });

      // Update path display with directory name
      const pathElement = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"] .file-explorer-path`);
      if (pathElement) {
        pathElement.textContent = dirHandle.name || 'Local Folder';
      }

      // Re-initialize Lucide icons after loading content
      this.initializeLucideIcons(10);

    } catch (error) {
      console.error('Error loading directory from handle:', error);
      treeElement.innerHTML = `
        <div class="error-message">
          <i data-lucide="alert-circle" class="lucide"></i>
          <span>Failed to load directory contents</span>
        </div>
      `;
      
      // Re-initialize Lucide icons for error state
      this.initializeLucideIcons(10);
    }
  }

  private createNativeTreeItem(file: FileItem, panelId: string, _parentHandle: any, level: number = 0): HTMLElement {
    const treeItem = document.createElement('div');
    treeItem.className = 'tree-item';
    treeItem.setAttribute('role', 'treeitem');
    treeItem.setAttribute('data-level', level.toString());
    
    const isDirectory = file.type === 'directory';
    const fileType = isDirectory ? 'folder' : getFileType(file.name);
    
    // Get appropriate icon
    let iconName = 'file';
    if (isDirectory) {
      iconName = 'folder';
    } else if (fileType === 'file-3d') {
      iconName = 'box';
    } else if (fileType === 'file-comp') {
      iconName = 'layers';
    } else if (fileType === 'file-image') {
      iconName = 'image';
    } else if (fileType === 'file-video') {
      iconName = 'film';
    } else if (fileType === 'file-project') {
      iconName = 'briefcase';
    }
    
    treeItem.innerHTML = `
      <div class="tree-item-content native-file" data-is-folder="${isDirectory}" data-file-name="${file.name}" data-file-type="${fileType}" data-panel-id="${panelId}" style="padding-left: ${20 + level * 20}px">
        ${isDirectory ? `
          <button class="tree-item-toggle" aria-label="Toggle node" data-expanded="false">
            <i data-lucide="chevron-right" class="lucide chevron-icon"></i>
          </button>
        ` : '<div class="tree-item-spacer"></div>'}
        <i data-lucide="${iconName}" class="lucide tree-item-icon" data-file-type="${fileType}"></i>
        <span class="tree-item-label">${file.name}</span>
      </div>
      ${isDirectory ? '<div class="tree-item-children" style="display: none;"></div>' : ''}
    `;

    // Add event handlers for native file system
    const treeItemContent = treeItem.querySelector('.tree-item-content') as HTMLElement;
    if (treeItemContent) {
      // Handle clicks
      treeItemContent.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        // Handle toggle button clicks
        if ((e.target as HTMLElement).closest('.tree-item-toggle')) {
          if (isDirectory) {
            await this.toggleNativeFolder(treeItem, file.name, panelId);
          }
          return;
        }

        if (!isDirectory) {
          // Handle file selection
          this.selectFile(treeItem, panelId);
        }
      });

      // Handle single clicks for opening files
      if (!isDirectory) {
        treeItemContent.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const fileHandle = this.fileHandles?.get(`${panelId}:${file.name}`);
          if (fileHandle) {
            await this.openNativeFileInBSPPanel(fileHandle, file.name);
          }
        });
      }
    }
    
    return treeItem;
  }

  private async toggleNativeFolder(treeItem: HTMLElement, folderName: string, panelId: string): Promise<void> {
    const toggleBtn = treeItem.querySelector('.tree-item-toggle') as HTMLButtonElement;
    const childrenContainer = treeItem.querySelector('.tree-item-children') as HTMLElement;

    if (!childrenContainer || !toggleBtn) return;

    const isExpanded = toggleBtn.getAttribute('data-expanded') === 'true';

    if (isExpanded) {
      // Collapse folder
      toggleBtn.setAttribute('data-expanded', 'false');
      childrenContainer.style.display = 'none';
    } else {
      // Expand folder
      toggleBtn.setAttribute('data-expanded', 'true');
      childrenContainer.style.display = 'block';

      // Load children if not already loaded
      if (childrenContainer.children.length === 0) {
        this.showLoadingState(childrenContainer, 'Loading...');

        try {
          const folderHandle = this.fileHandles?.get(`${panelId}:${folderName}`);
          if (!folderHandle) {
            throw new Error('Folder handle not found');
          }

          const files: FileItem[] = [];
          
          for await (const entry of folderHandle.values()) {
            const item: FileItem = {
              name: entry.name,
              path: `${folderName}/${entry.name}`,
              type: entry.kind === 'directory' ? 'directory' : 'file',
              size: 0
            };
            
            // Store handle for later use
            this.fileHandles?.set(`${panelId}:${folderName}/${entry.name}`, entry);
            
            files.push(item);
          }

          childrenContainer.innerHTML = '';
          const currentLevel = parseInt(treeItem.getAttribute('data-level') || '0');
          const sortedFiles = sortFiles(files);
          
          sortedFiles.forEach(file => {
            const childItem = this.createNativeTreeItem(file, panelId, folderHandle, currentLevel + 1);
            childrenContainer.appendChild(childItem);
          });
          
          // Re-initialize Lucide icons for newly loaded items
          this.initializeLucideIcons(10);

        } catch (error) {
          console.error('Error loading folder contents:', error);
          this.showErrorMessage(childrenContainer, 'Failed to load');
        }
      }
    }

    // Re-initialize Lucide icons
    this.initializeLucideIcons(10);
  }

  private async openNativeFileInBSPPanel(fileHandle: any, fileName: string): Promise<void> {
    const targetPanelId = this.findOrCreateTargetPanel();
    if (!targetPanelId) return;

    // Update panel content with file
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${targetPanelId}"]`);
    if (!panel) {
      console.error('Panel not found with ID:', targetPanelId);
      return;
    }

    // Check if panel has no header (initial empty panel) and add one
    if (!panel.querySelector('.panel-header')) {
      this.addHeaderToPanel(panel as HTMLElement, fileName);
    }

    const panelTitle = panel.querySelector('.panel-title');
    const content = panel.querySelector('.panel-content') as HTMLElement;
    
    if (panelTitle) {
      const fileType = getFileType(fileName);
      const iconName = this.getFileIcon(fileType);
      const iconColor = this.getFileIconColor(fileType);
      panelTitle.innerHTML = `
        <i data-lucide="${iconName}" class="lucide" style="width: 16px; height: 16px; margin-right: 6px; color: ${iconColor};"></i>
        <span>${fileName}</span>
      `;
    }

    if (content) {
      await this.loadFileContent(content, fileHandle, fileName, 'native');
      
      // Store file info in panel
      panel.setAttribute('data-file-name', fileName);
      panel.setAttribute('data-file-handle', 'native');
      
      // Focus the panel that now contains the file
      this.focusPanel(panel);
      
      // Re-initialize Lucide icons for the new file icon
      this.initializeLucideIcons(10);
    }
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private addHeaderToPanel(panel: HTMLElement, title: string): void {
    const panelBody = panel.querySelector('.panel-body');
    if (!panelBody) return;

    // Create header HTML
    const headerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <span>${title}</span>
        </div>
        <div class="panel-actions">
          <button class="panel-action-btn" data-action="pin" title="Pin Panel">
            <i data-lucide="pin" class="lucide icon-pin"></i>
            <i data-lucide="pin-off" class="lucide icon-pin-off" style="display: none;"></i>
          </button>
          <button class="panel-action-btn" data-action="split-v" title="Split Vertical">
            <i data-lucide="columns-2" class="lucide"></i>
          </button>
          <button class="panel-action-btn" data-action="split-h" title="Split Horizontal">
            <i data-lucide="rows-2" class="lucide"></i>
          </button>
          <button class="panel-action-btn" data-action="close" title="Close Panel">
            <i data-lucide="x" class="lucide"></i>
          </button>
        </div>
      </div>
    `;

    // Insert header before panel body
    panel.insertAdjacentHTML('afterbegin', headerHTML);

    // Re-initialize lucide icons for the new header
    this.initializeLucideIcons(10);
  }

  private setupTerminalContent(panelId: string): void {
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;

    // Update panel title with icon
    const panelTitle = panel.querySelector('.panel-title span');
    if (panelTitle && panelTitle.parentElement) {
      panelTitle.parentElement.innerHTML = `
        <i data-lucide="terminal" class="lucide" style="width: 16px; height: 16px; margin-right: 6px;"></i>
        <span>Terminal</span>
      `;
    }

    // Update panel content
    const content = panel.querySelector('.panel-content') as HTMLElement;
    if (content) {
      content.innerHTML = `
        <div class="terminal-container">
          <div class="terminal-output" id="terminal-output-${panelId}">
            <div class="terminal-line">Terminal ready...</div>
            <div class="terminal-input-line">
              <span class="terminal-prompt">user@fileui:~$</span>
              <input id="terminal-input-${panelId}" type="text" class="terminal-input" autofocus />
            </div>
          </div>
        </div>
      `;

      // Setup terminal functionality for this panel
      const terminalInput = document.getElementById(`terminal-input-${panelId}`) as HTMLInputElement;
      const terminalOutput = document.getElementById(`terminal-output-${panelId}`);
      
      if (terminalInput && terminalOutput) {
        terminalInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const command = terminalInput.value.trim();
            if (command) {
              this.executeTerminalCommand(command, panelId);
              terminalInput.value = '';
            }
          }
        });

        // Focus terminal when clicked
        terminalOutput.addEventListener('click', () => {
          terminalInput.focus();
        });
      }

      // Mark this panel as a terminal
      panel.setAttribute('data-panel-type', 'terminal');
    }

    // Re-initialize Lucide icons
    this.initializeLucideIcons(10);
  }

  private setupPropertiesContent(panelId: string): void {
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;

    // Update panel title with icon
    const panelTitle = panel.querySelector('.panel-title span');
    if (panelTitle && panelTitle.parentElement) {
      panelTitle.parentElement.innerHTML = `
        <i data-lucide="sliders-horizontal" class="lucide" style="width: 16px; height: 16px; margin-right: 6px;"></i>
        <span>Properties</span>
      `;
    }

    // Update panel content
    const content = panel.querySelector('.panel-content') as HTMLElement;
    if (content) {
      content.innerHTML = `
        <div class="properties-container">
          <div class="properties-content">
            <div class="property-section">
              <h4 class="property-section-title">Metadata</h4>
              <div class="property-item">
                <span class="property-label">Format:</span>
                <span class="property-value">-</span>
              </div>
              <div class="property-item">
                <span class="property-label">Resolution:</span>
                <span class="property-value">-</span>
              </div>
              <div class="property-item">
                <span class="property-label">Color Space:</span>
                <span class="property-value">-</span>
              </div>
              <div class="property-item">
                <span class="property-label">Codec:</span>
                <span class="property-value">-</span>
              </div>
            </div>
            <div class="property-section">
              <h4 class="property-section-title">File Info</h4>
              <div class="property-item">
                <span class="property-label">Name:</span>
                <span class="property-value">No file selected</span>
              </div>
              <div class="property-item">
                <span class="property-label">Type:</span>
                <span class="property-value">-</span>
              </div>
              <div class="property-item">
                <span class="property-label">Size:</span>
                <span class="property-value">-</span>
              </div>
              <div class="property-item">
                <span class="property-label">Modified:</span>
                <span class="property-value">-</span>
              </div>
            </div>
          </div>
        </div>
      `;

      // Mark this panel as properties
      panel.setAttribute('data-panel-type', 'properties');
    }

    // Re-initialize Lucide icons
    this.initializeLucideIcons(10);
  }

  private pinPanel(panelId: string): void {
    if (this.bspManager) {
      // Get the panel to check if it's already pinned
      const panelElement = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
      if (panelElement && !panelElement.classList.contains('is-pinned')) {
        this.bspManager.togglePinPanel(panelId);
        console.log(`Pinned panel: ${panelId}`);
      }
    }
  }

  private executeTerminalCommand(command: string, panelId: string): void {
    const terminalOutput = document.getElementById(`terminal-output-${panelId}`);
    if (!terminalOutput) return;

    // Remove the input line temporarily
    const inputLine = terminalOutput.querySelector('.terminal-input-line');
    if (inputLine) {
      inputLine.remove();
    }

    // Add command to history
    const commandLine = document.createElement('div');
    commandLine.className = 'terminal-line terminal-command';
    commandLine.innerHTML = `<span class="terminal-prompt">user@fileui:~$</span> ${command}`;
    terminalOutput.appendChild(commandLine);

    // Simulate command execution
    let response = '';
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand === 'help') {
      response = `Available commands:
  help    - Show this help message
  clear   - Clear terminal output
  ls      - List files
  pwd     - Print working directory
  echo    - Echo text
  date    - Show current date and time`;
    } else if (lowerCommand === 'clear') {
      terminalOutput.innerHTML = '';
      response = '';
    } else if (lowerCommand === 'ls') {
      response = 'project.blend  scenes/  renders/  textures/  README.md';
    } else if (lowerCommand === 'pwd') {
      response = '/home/user/projects/fileui';
    } else if (lowerCommand.startsWith('echo ')) {
      response = command.substring(5);
    } else if (lowerCommand === 'date') {
      response = new Date().toLocaleString();
    } else {
      response = `Command not found: ${command}`;
    }

    // Add response
    if (response) {
      const responseLine = document.createElement('div');
      responseLine.className = 'terminal-line terminal-response';
      responseLine.textContent = response;
      terminalOutput.appendChild(responseLine);
    }

    // Add new input line
    const newInputLine = document.createElement('div');
    newInputLine.className = 'terminal-input-line';
    newInputLine.innerHTML = `
      <span class="terminal-prompt">user@fileui:~$</span>
      <input id="terminal-input-${panelId}" type="text" class="terminal-input" autofocus />
    `;
    
    terminalOutput.appendChild(newInputLine);
    
    // Re-setup event listeners for new input
    const newInput = document.getElementById(`terminal-input-${panelId}`) as HTMLInputElement;
    if (newInput) {
      newInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = newInput.value.trim();
          if (cmd) {
            this.executeTerminalCommand(cmd, panelId);
            newInput.value = '';
          }
        }
      });
      newInput.focus();
    }

    // Scroll to bottom
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

}