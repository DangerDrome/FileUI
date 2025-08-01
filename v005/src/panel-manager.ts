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
  private dragDropInitialized: boolean = false;

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
    // Setup global drag and drop
    this.setupGlobalDragAndDrop();
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
    
    // If there's a focused panel and it's not an explorer panel and not pinned
    if (focusedPanel && !focusedPanel.classList.contains('explorer-panel')) {
      const panelId = focusedPanel.getAttribute('data-panel-id');
      if (panelId) {
        const bspNode = this.bspManager.panels.get(panelId)?.node;
        if (bspNode && !bspNode.isPinned) {
          // Use the focused panel only if it's not pinned
          return panelId;
        }
      }
    }
    
    // Find the first non-explorer, non-pinned panel
    const allPanels = document.querySelectorAll('.bsp-panel:not(.explorer-panel)');
    for (const panel of allPanels) {
      const panelId = panel.getAttribute('data-panel-id');
      if (panelId) {
        const bspNode = this.bspManager.panels.get(panelId)?.node;
        if (bspNode && !bspNode.isPinned) {
          // Use the first available non-explorer, non-pinned panel
          this.focusPanel(panel);
          return panelId;
        }
      }
    }

    // Only create a new panel if no non-explorer panels exist
    console.log('Creating new panel for file...');
    const newPanelId = this.bspManager.addPanel('right');
    console.log('New panel ID:', newPanelId);
    
    // Focus the newly created panel
    if (newPanelId) {
      // Wait for panel to be created in DOM
      setTimeout(() => {
        const newPanel = document.querySelector(`.bsp-panel[data-panel-id="${newPanelId}"]`);
        console.log('New panel element found:', !!newPanel);
        if (newPanel) {
          this.focusPanel(newPanel);
          // Ensure panel is ready
          const panelContent = newPanel.querySelector('.panel-content');
          if (!panelContent) {
            console.error('Panel content not found in new panel');
          }
        } else {
          console.error('New panel not found in DOM after creation');
        }
      }, 50); // Increased timeout
    } else {
      console.error('BSP manager failed to create new panel');
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
          content.innerHTML = `
            <div class="video-player">
              <video src="http://localhost:8001/api/file?path=${encodeURIComponent(source)}" autoplay muted loop></video>
              <div class="video-controls">
                <button class="btn btn-icon btn-sm" data-action="play">
                  <i data-lucide="play" width="16" height="16"></i>
                </button>
                <span class="video-time-label">0:00 / 0:00</span>
                <div class="timeline" data-video-timeline>
                  <div class="timeline-track"></div>
                  <div class="timeline-progress"></div>
                  <div class="timeline-handle" style="left: 0%">
                    <i data-lucide="triangle" width="8" height="8"></i>
                    <div class="timeline-playhead-line"></div>
                    <div class="timeline-playhead-label">0</div>
                  </div>
                  <div class="timeline-ruler">
                    <div class="timeline-tick timeline-tick-major" style="left: 0%"></div>
                    <div class="timeline-label" style="left: 0%">0</div>
                    <div class="timeline-tick timeline-tick-major" style="left: 25%"></div>
                    <div class="timeline-label" style="left: 25%">60</div>
                    <div class="timeline-tick timeline-tick-major" style="left: 50%"></div>
                    <div class="timeline-label" style="left: 50%">120</div>
                    <div class="timeline-tick timeline-tick-major" style="left: 75%"></div>
                    <div class="timeline-label" style="left: 75%">180</div>
                    <div class="timeline-tick timeline-tick-major" style="left: 100%"></div>
                    <div class="timeline-label" style="left: 100%">240</div>
                  </div>
                </div>
                <button class="btn btn-icon btn-sm" data-action="volume">
                  <i data-lucide="volume-2" width="16" height="16"></i>
                </button>
                <input type="range" class="form-control" min="0" max="100" value="100" style="width: 80px;">
              </div>
            </div>
          `;
          this.setupVideoPlayer(content);
        } else if (fileType === 'markdown' || fileName.endsWith('.md')) {
          const fs = new ServerFileSystem('http://localhost:8001/api');
          const fileContent = await fs.readFile(source);
          const renderedHtml = this.md.render(fileContent);
          content.innerHTML = `<div class="file-content markdown-content">
            ${renderedHtml}
          </div>`;
        } else if (fileType === 'file-pdf') {
          content.innerHTML = `<div class="file-preview pdf-preview">
            <iframe src="http://localhost:8001/api/file?path=${encodeURIComponent(source)}" 
                    width="100%" 
                    height="100%" 
                    frameborder="0">
            </iframe>
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
          content.innerHTML = `
            <div class="video-player">
              <video src="${url}" autoplay muted loop></video>
              <div class="video-controls">
                <button class="btn btn-icon btn-sm" data-action="play">
                  <i data-lucide="play" width="16" height="16"></i>
                </button>
                <span class="video-time-label">0:00 / 0:00</span>
                <div class="timeline" data-video-timeline>
                  <div class="timeline-track"></div>
                  <div class="timeline-progress"></div>
                  <div class="timeline-handle" style="left: 0%">
                    <i data-lucide="triangle" width="8" height="8"></i>
                    <div class="timeline-playhead-line"></div>
                    <div class="timeline-playhead-label">0</div>
                  </div>
                  <div class="timeline-ruler">
                    <div class="timeline-tick timeline-tick-major" style="left: 0%"></div>
                    <div class="timeline-label" style="left: 0%">0</div>
                    <div class="timeline-tick timeline-tick-major" style="left: 25%"></div>
                    <div class="timeline-label" style="left: 25%">60</div>
                    <div class="timeline-tick timeline-tick-major" style="left: 50%"></div>
                    <div class="timeline-label" style="left: 50%">120</div>
                    <div class="timeline-tick timeline-tick-major" style="left: 75%"></div>
                    <div class="timeline-label" style="left: 75%">180</div>
                    <div class="timeline-tick timeline-tick-major" style="left: 100%"></div>
                    <div class="timeline-label" style="left: 100%">240</div>
                  </div>
                </div>
                <button class="btn btn-icon btn-sm" data-action="volume">
                  <i data-lucide="volume-2" width="16" height="16"></i>
                </button>
                <input type="range" class="form-control" min="0" max="100" value="100" style="width: 80px;">
              </div>
            </div>
          `;
          this.setupVideoPlayer(content);
        } else if (fileType === 'markdown' || fileName.endsWith('.md')) {
          const text = await file.text();
          const renderedHtml = this.md.render(text);
          content.innerHTML = `<div class="file-content markdown-content">
            ${renderedHtml}
          </div>`;
        } else if (fileType === 'file-pdf') {
          const url = URL.createObjectURL(file);
          content.innerHTML = `<div class="file-preview pdf-preview">
            <iframe src="${url}" 
                    width="100%" 
                    height="100%" 
                    frameborder="0"
                    onload="URL.revokeObjectURL('${url}')">
            </iframe>
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
    // Setup global drag and drop after layout is created
    setTimeout(() => {
      this.setupGlobalDragAndDrop();
      this.setupDividerDragAndDrop();
    }, 500); // Increased timeout to ensure resizers are created
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
    const headerHeight = 64; // Further increased header height
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
      // Hide right toolbar for now to fix the gap
      Object.assign(rightToolbar.element.style, {
        display: 'none'
      });
    }

    // Position BSP container - fills remaining space
    const bspContainer = document.getElementById('bsp-container');
    if (bspContainer) {
      // Account for toolbars - only subtract space if they actually exist
      let totalToolbarWidth = toolbarWidth; // Left toolbar
      if (rightToolbar && rightToolbar.element.style.display !== 'none') {
        totalToolbarWidth += toolbarWidth; // Add right toolbar width if it exists and is visible
      }
      
      const bspWidth = viewportWidth - totalToolbarWidth;
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
    window.addEventListener('resize', () => {
      this.layout();
      this.refreshDividerDragAndDrop();
    });
    
    
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
              this.refreshDividerDragAndDrop();
            }
          }
        },
        {
          label: 'Split Vertical',
          icon: 'columns-2',
          action: () => {
            if (this.bspManager && panelId) {
              this.bspManager.splitPanel(panelId, 'vertical');
              this.refreshDividerDragAndDrop();
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
              this.refreshDividerDragAndDrop();
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
        console.log('Setting terminal split ratio for collapsed state');
        // Calculate ratio for collapsed terminal (48px height)
        const viewportHeight = window.innerHeight - 64; // minus header
        const collapsedRatio = (viewportHeight - 48) / viewportHeight;
        newRoot.split = collapsedRatio; // Most space for content, 48px for collapsed terminal
      } else {
        console.log('Root direction not horizontal or root not found:', newRoot);
      }
      
      // Add terminal content to the bottom panel, pin it, and collapse it
      setTimeout(() => {
        console.log('Setting up terminal content...');
        this.setupTerminalContent(terminalPanelId);
        this.pinPanel(terminalPanelId);
        
        // Mark the terminal as collapsed immediately
        const panel = this.bspManager.panels.get(terminalPanelId);
        if (panel) {
          panel.node.isCollapsed = true;
          this.bspManager.updateCollapseVisualState(terminalPanelId, true);
        }
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

    // Split the main content vertically to add properties on right (95% content, 5% for collapsed properties)  
    console.log('Splitting main content vertically for properties...');
    const propertiesPanelId = this.bspManager.splitPanel(mainContentPanelId, 'vertical', 'right');
    console.log('Properties panel creation result:', propertiesPanelId);
    
    if (propertiesPanelId) {
      // Find the vertical split node and set its ratio for collapsed state
      const currentRoot = this.bspManager.getRoot();
      console.log('Root after properties split:', currentRoot);
      if (currentRoot && currentRoot.children.length > 0) {
        // The first child should be the vertical split containing main content and properties
        const verticalSplit = currentRoot.children[0];
        console.log('First child (should be vertical split):', verticalSplit);
        if (verticalSplit && verticalSplit.direction === 'vertical') {
          console.log('Setting properties split ratio for collapsed state');
          // Set ratio so properties panel starts at collapsed width
          const viewportWidth = window.innerWidth - 48 - 48; // minus both toolbars
          const collapsedRatio = (viewportWidth - 48) / viewportWidth; // 48px for collapsed panel
          verticalSplit.split = collapsedRatio;
        } else {
          console.log('First child not a vertical split or not found');
        }
      } else {
        console.log('No children found in current root');
      }
      
      // Add properties content to the right panel, pin it, and mark as collapsed
      setTimeout(() => {
        console.log('Setting up properties content...');
        this.setupPropertiesContent(propertiesPanelId);
        this.pinPanel(propertiesPanelId);
        
        // Mark the panel as collapsed immediately
        const panel = this.bspManager.panels.get(propertiesPanelId);
        if (panel) {
          panel.node.isCollapsed = true;
          this.bspManager.updateCollapseVisualState(propertiesPanelId, true);
        }
      }, 100);
    }

    // Layout the BSP tree
    console.log('Running BSP layout...');
    this.bspManager.layout();
    
    // Setup drag and drop for resizers after initial layout
    setTimeout(() => {
      this.refreshDividerDragAndDrop();
    }, 300);
    
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
    
    // Don't create an explorer panel on startup - let user do it manually
    
    console.log('=== BSP Layout Complete ===');
  }


  private createExplorerBSPPanel(): void {
    if (!this.bspManager) return;
    
    // Add a new panel on the left side
    const newPanelId = this.bspManager.addPanel('left');
    if (!newPanelId) return;
    
    // Set the explorer panel to 15vw on initialization
    // This is the default initialization - saved layouts will override this
    // Future: Check for saved layout preferences before setting default
    const panelInfo = this.bspManager.panels.get(newPanelId);
    if (panelInfo && panelInfo.node.parent && panelInfo.node.parent.direction === 'vertical') {
      // For left panel, we want 15% for explorer, 85% for content
      // Check if this is the first (left) child
      const parent = panelInfo.node.parent;
      const isFirstChild = parent.children[0].id === newPanelId;
      
      // Default layout configuration - can be overridden by saved layouts
      const explorerDefaultRatio = 0.15; // 15% width
      
      if (isFirstChild) {
        parent.split = explorerDefaultRatio; // 15% for explorer panel
      } else {
        parent.split = 1 - explorerDefaultRatio; // 85% if it's the second child
      }
      
      // Mark this as a user-resizable split (for future layout saving)
      parent.userResizable = true;
      parent.defaultSplit = parent.split; // Store default for reset functionality
      
      // Re-layout to apply the new split ratio
      this.bspManager.layout();
    }
    
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

  private async loadNativeFolderContents(folderHandle: any, panelId: string): Promise<void> {
    console.log('=== loadNativeFolderContents called ===');
    console.log('Panel ID:', panelId);
    console.log('Folder handle:', folderHandle);
    
    const treeElement = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"] .tree`) as HTMLElement;
    if (!treeElement) {
      console.error('Tree element not found for panel:', panelId);
      return;
    }

    try {
      // Clear loading indicator
      treeElement.innerHTML = '';

      // Create an array to hold entries
      const entries: Array<{name: string, kind: string, handle: any}> = [];

      // Read directory entries using the FileSystemDirectoryEntry API
      if (folderHandle.createReader) {
        const reader = folderHandle.createReader();
        
        // Read all entries
        await new Promise<void>((resolve) => {
          const readEntries = () => {
            reader.readEntries((results: any[]) => {
              console.log('Read entries count:', results.length);
              if (results.length > 0) {
                results.forEach(entry => {
                  console.log('Entry:', entry.name, 'isDirectory:', entry.isDirectory);
                  entries.push({
                    name: entry.name,
                    kind: entry.isDirectory ? 'directory' : 'file',
                    handle: entry
                  });
                });
                readEntries(); // Continue reading
              } else {
                resolve(); // Done reading
              }
            });
          };
          readEntries();
        });
      }

      // Sort entries (directories first, then by name)
      entries.sort((a, b) => {
        if (a.kind === 'directory' && b.kind !== 'directory') return -1;
        if (a.kind !== 'directory' && b.kind === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });

      // Create tree items for each entry
      console.log('Creating tree items for', entries.length, 'entries');
      entries.forEach((entry, index) => {
        console.log(`Creating item ${index + 1}/${entries.length}:`, entry.name, entry.kind);
        const fileItem: FileItem = {
          name: entry.name,
          path: entry.name,
          type: entry.kind as 'file' | 'directory',
          size: 0,
          modified: new Date().toISOString()
        };
        
        console.log(`About to call createNativeTreeItem for ${fileItem.name}`);
        const treeItem = this.createNativeTreeItem(fileItem, panelId, 0, entry.handle);
        console.log(`createNativeTreeItem returned for ${fileItem.name}:`, treeItem);
        
        // TEST: Add a simple click handler directly here
        const content = treeItem.querySelector('.tree-item-content');
        if (content) {
          content.addEventListener('click', () => {
            console.log(`TEST CLICK: ${fileItem.name} was clicked!`);
          });
        }
        
        treeElement.appendChild(treeItem);
      });

      // If no entries, show empty message
      if (entries.length === 0) {
        treeElement.innerHTML = `
          <div class="empty-folder">
            <i data-lucide="folder-open" style="width: 24px; height: 24px; opacity: 0.5;"></i>
            <span style="opacity: 0.7;">Empty folder</span>
          </div>
        `;
      }

      // Re-initialize Lucide icons
      console.log('About to initialize Lucide icons...');
      this.initializeLucideIcons(10);
      
      // Verify click handlers are still there after Lucide init
      setTimeout(() => {
        console.log('Checking if click handlers survived Lucide init...');
        const nativeItems = treeElement.querySelectorAll('.tree-item-content.native-file');
        console.log(`Found ${nativeItems.length} native items after Lucide init`);
        nativeItems.forEach((item, index) => {
          console.log(`Item ${index + 1}: ${item.querySelector('.tree-item-label')?.textContent}`);
          // Try to manually trigger a click to test
          if (index === 0) {
            console.log('Testing click on first item...');
            item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        });
      }, 100);

    } catch (error) {
      console.error('Error loading native folder contents:', error);
      treeElement.innerHTML = `
        <div class="error-message">
          <i data-lucide="alert-circle" class="lucide"></i>
          <span>Unable to read folder contents</span>
        </div>
      `;
      
      this.initializeLucideIcons(10);
    }
  }

  private createNativeTreeItem(file: FileItem, panelId: string, level: number = 0, handle: any): HTMLElement {
    console.log('=== createNativeTreeItem ENTRY ===');
    console.log('File:', file);
    console.log('PanelId:', panelId);
    console.log('Level:', level);
    console.log('Handle:', handle);
    
    const treeItem = this.createTreeItem(file, panelId, level);
    
    // Mark as native and store the handle
    const treeItemContent = treeItem.querySelector('.tree-item-content');
    if (treeItemContent) {
      console.log(`Found tree item content for ${file.name}`);
      treeItemContent.classList.add('native-file');
      
      // Remove any existing click handlers to avoid conflicts
      const newTreeItemContent = treeItemContent.cloneNode(true) as HTMLElement;
      treeItemContent.parentNode?.replaceChild(newTreeItemContent, treeItemContent);
      
      console.log(`Replaced tree item content for ${file.name}`);
      
      // Store the handle on the new element
      (newTreeItemContent as any)._nativeHandle = handle;
      
      // Handle toggle button clicks separately
      const toggleBtn = newTreeItemContent.querySelector('.tree-item-toggle');
      if (toggleBtn && file.type === 'directory') {
        toggleBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const isExpanded = treeItem.classList.contains('expanded');
          toggleBtn.setAttribute('data-expanded', (!isExpanded).toString());
          
          if (isExpanded) {
            treeItem.classList.remove('expanded');
            // Remove children container
            const childrenContainer = treeItem.querySelector('.tree-item-children');
            if (childrenContainer) {
              childrenContainer.remove();
            }
          } else {
            treeItem.classList.add('expanded');
            // Create children container if it doesn't exist
            let childrenContainer = treeItem.querySelector('.tree-item-children');
            if (!childrenContainer) {
              childrenContainer = document.createElement('div');
              childrenContainer.className = 'tree-item-children';
              treeItem.appendChild(childrenContainer);
            }
            // Load subdirectory contents
            await this.loadNativeSubdirectory(handle, childrenContainer as HTMLElement, panelId, level + 1);
          }
          
          // Re-initialize Lucide icons
          this.initializeLucideIcons(10);
        });
      }
      
      // Add click handler for the content area (not toggle button)
      console.log(`Adding click handler for ${file.name}`);
      const clickHandler = async (e: Event) => {
        console.log('=== Native item clicked ===');
        console.log('Target:', e.target);
        console.log('Current target:', e.currentTarget);
        console.log('File:', file);
        
        // Don't handle if clicking on toggle button
        if ((e.target as HTMLElement).closest('.tree-item-toggle')) {
          console.log('Click was on toggle button, ignoring');
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        if (file.type === 'directory') {
          console.log('Directory clicked, toggling');
          // For directories, clicking the content area also toggles
          const toggleBtn = newTreeItemContent.querySelector('.tree-item-toggle') as HTMLElement;
          if (toggleBtn) {
            toggleBtn.click();
          }
        } else {
          console.log('File clicked, opening:', file.name);
          // Select the file
          this.selectFile(treeItem, panelId);
          
          // Open file
          console.log('Opening native file:', file.name);
          console.log('Handle:', handle);
          console.log('Handle type:', typeof handle);
          console.log('Handle methods:', Object.getOwnPropertyNames(handle));
          
          // FileSystemFileEntry uses .file(successCallback, errorCallback)
          if (handle.file) {
            console.log('Using handle.file() method');
            
            // Create a promise wrapper for the callback-based API
            const getFile = () => new Promise<File>((resolve, reject) => {
              handle.file(
                (fileObj: File) => resolve(fileObj),
                (error: any) => reject(error)
              );
            });
            
            try {
              const fileObj = await getFile();
              console.log('Got file object:', fileObj.name, 'Size:', fileObj.size);
              
              const targetPanelId = this.findOrCreateTargetPanel();
              console.log('Target panel ID:', targetPanelId);
              
              if (targetPanelId) {
                // Wait a bit for panel creation if needed
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const targetPanel = document.querySelector(`.bsp-panel[data-panel-id="${targetPanelId}"]`);
                console.log('Target panel found:', !!targetPanel);
                
                if (targetPanel) {
                  await this.openDroppedFileInPanel(fileObj, targetPanelId);
                  console.log('File opened in panel');
                } else {
                  console.error('Target panel not found after creation');
                }
              } else {
                console.error('No target panel ID returned');
              }
            } catch (error) {
              console.error('Error opening file:', error);
            }
          } else {
            console.error('No file method on handle');
          }
        }
      };
      
      newTreeItemContent.addEventListener('click', clickHandler);
      console.log(`Click handler attached to ${file.name}. Element:`, newTreeItemContent);
      
      // Verify the handler was added
      if (newTreeItemContent.onclick !== null || newTreeItemContent.hasAttribute('onclick')) {
        console.log('WARNING: onclick attribute found, may interfere');
      }
      
      // Store the handle on the new content element
      (newTreeItemContent as any)._nativeHandle = handle;
    }
    
    return treeItem;
  }

  private async loadNativeSubdirectory(dirHandle: any, containerElement: HTMLElement, panelId: string, level: number): Promise<void> {
    if (!dirHandle.createReader) return;

    // Show loading state
    containerElement.innerHTML = '<div class="loading-indicator">Loading...</div>';

    const reader = dirHandle.createReader();
    const entries: Array<{name: string, kind: string, handle: any}> = [];

    // Read all entries
    await new Promise<void>((resolve) => {
      const readEntries = () => {
        reader.readEntries((results: any[]) => {
          if (results.length > 0) {
            results.forEach(entry => {
              entries.push({
                name: entry.name,
                kind: entry.isDirectory ? 'directory' : 'file',
                handle: entry
              });
            });
            readEntries();
          } else {
            resolve();
          }
        });
      };
      readEntries();
    });

    // Clear loading indicator
    containerElement.innerHTML = '';

    // Sort and create items
    entries.sort((a, b) => {
      if (a.kind === 'directory' && b.kind !== 'directory') return -1;
      if (a.kind !== 'directory' && b.kind === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });

    if (entries.length === 0) {
      containerElement.innerHTML = '<div class="empty-folder" style="padding-left: 20px; opacity: 0.6;">Empty folder</div>';
    } else {
      entries.forEach(entry => {
        const fileItem: FileItem = {
          name: entry.name,
          path: entry.name,
          type: entry.kind as 'file' | 'directory',
          size: 0,
          modified: new Date().toISOString()
        };
        
        const treeItem = this.createNativeTreeItem(fileItem, panelId, level, entry.handle);
        containerElement.appendChild(treeItem);
      });
    }

    this.initializeLucideIcons(10);
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
    } else if (fileType === 'file-pdf') {
      iconName = 'file-text';
    }
    
    treeItem.innerHTML = `
      <div class="tree-item-content" draggable="true" data-is-folder="${isDirectory}" data-path="${file.path}" data-file-name="${file.name}" data-file-type="${fileType}" style="padding-left: ${20 + level * 20}px">
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

  private setupGlobalDragAndDrop(): void {
    // Prevent default drag behaviors on document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, (e) => {
        e.preventDefault();
      }, false);
    });

    // Setup drops on ALL panels, not just explorer
    const setupPanelDropZone = (panel: Element) => {
      const panelContent = panel.querySelector('.panel-content');
      if (!panelContent) return;

      // Check if already set up
      if ((panelContent as any)._dropZoneSetup) return;
      (panelContent as any)._dropZoneSetup = true;

      // Add dragenter to handle initial entry
      panelContent.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drag enter panel:', panel.getAttribute('data-panel-id'));
        panelContent.classList.add('drag-over');
      });

      panelContent.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
        // Ensure class stays on during dragover
        if (!panelContent.classList.contains('drag-over')) {
          panelContent.classList.add('drag-over');
        }
      });

      panelContent.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only remove if we're actually leaving the panel
        const rect = panelContent.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
          console.log('Drag leave panel:', panel.getAttribute('data-panel-id'));
          panelContent.classList.remove('drag-over');
        }
      });

      panelContent.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drop on panel:', panel.getAttribute('data-panel-id'), 'Files:', e.dataTransfer?.files.length);
        panelContent.classList.remove('drag-over');
        
        const panelElement = panelContent.closest('.bsp-panel');
        const targetPanelId = panelElement?.getAttribute('data-panel-id');
        
        if (!targetPanelId || !e.dataTransfer) return;
        
        // Check if we have items (which may include folders)
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          // Use DataTransferItemList for better folder detection
          for (let i = 0; i < e.dataTransfer.items.length; i++) {
            const item = e.dataTransfer.items[i];
            
            if (item.kind === 'file') {
              const entry = item.webkitGetAsEntry?.();
              
              if (entry) {
                // We have a FileSystemEntry
                if (entry.isDirectory) {
                  // Handle directory
                  console.log('Directory dropped:', entry.name);
                  await this.openDroppedFolderInPanel(entry.name, targetPanelId, entry);
                } else {
                  // Handle file
                  const file = item.getAsFile();
                  if (file) {
                    await this.openDroppedFileInPanel(file, targetPanelId);
                  }
                }
              } else {
                // Fallback to regular file handling
                const file = item.getAsFile();
                if (file) {
                  await this.openDroppedFileInPanel(file, targetPanelId);
                }
              }
            }
          }
        } else if (e.dataTransfer.files.length) {
          // Fallback to FileList API
          const files = Array.from(e.dataTransfer.files);
          for (const file of files) {
            await this.openDroppedFileInPanel(file, targetPanelId);
          }
        }
      });
    };

    // Setup drop zone for the main BSP container
    const setupMainContainerDropZone = () => {
      const bspContainer = document.getElementById('bsp-container');
      if (!bspContainer) return;

      // Check if already set up
      if ((bspContainer as any)._dropZoneSetup) return;
      (bspContainer as any)._dropZoneSetup = true;

      bspContainer.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only show indicator if no panels exist
        if (!bspContainer.querySelector('.bsp-panel')) {
          console.log('Drag enter empty BSP container');
          bspContainer.classList.add('drag-over');
        }
      });

      bspContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
        // Only show indicator if no panels exist
        if (!bspContainer.querySelector('.bsp-panel')) {
          if (!bspContainer.classList.contains('drag-over')) {
            bspContainer.classList.add('drag-over');
          }
        }
      });

      bspContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = bspContainer.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
          console.log('Drag leave BSP container');
          bspContainer.classList.remove('drag-over');
        }
      });

      bspContainer.addEventListener('drop', async (e) => {
        // Only handle if no panels exist
        if (!bspContainer.querySelector('.bsp-panel')) {
          e.preventDefault();
          e.stopPropagation();
          console.log('Drop on empty BSP container, creating panel');
          bspContainer.classList.remove('drag-over');
          
          if (!e.dataTransfer || !this.bspManager) return;
          
          const newPanelId = this.bspManager.addPanel('right');
          
          // Wait for panel to be created
          setTimeout(async () => {
            // Check if we have items (which may include folders)
            if (e.dataTransfer!.items && e.dataTransfer!.items.length > 0) {
              // Use DataTransferItemList for better folder detection
              for (let i = 0; i < e.dataTransfer!.items.length; i++) {
                const item = e.dataTransfer!.items[i];
                
                if (item.kind === 'file') {
                  const entry = item.webkitGetAsEntry?.();
                  
                  if (entry) {
                    // We have a FileSystemEntry
                    if (entry.isDirectory) {
                      // Handle directory
                      console.log('Directory dropped on BSP container:', entry.name);
                      await this.openDroppedFolderInPanel(entry.name, newPanelId, entry);
                    } else {
                      // Handle file
                      const file = item.getAsFile();
                      if (file) {
                        await this.openDroppedFileInPanel(file, newPanelId);
                      }
                    }
                  } else {
                    // Fallback to regular file handling
                    const file = item.getAsFile();
                    if (file) {
                      await this.openDroppedFileInPanel(file, newPanelId);
                    }
                  }
                }
              }
            } else if (e.dataTransfer!.files.length) {
              // Fallback to FileList API
              const files = Array.from(e.dataTransfer!.files);
              for (const file of files) {
                await this.openDroppedFileInPanel(file, newPanelId);
              }
            }
          }, 50);
        }
      });
    };

    // Setup drop zones on all existing panels and main container
    setTimeout(() => {
      setupMainContainerDropZone();
      
      document.querySelectorAll('.bsp-panel').forEach(panel => {
        console.log('Setting up drop zone for panel:', panel.getAttribute('data-panel-id'));
        setupPanelDropZone(panel);
      });
    }, 100);
    
    // Watch for new panels
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element && node.classList.contains('bsp-panel')) {
            console.log('Setting up drop zone for new panel:', node.getAttribute('data-panel-id'));
            setupPanelDropZone(node);
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

    // Setup internal drag and drop for tree items
    explorerContent.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement;
      const treeItemContent = target.closest('.tree-item-content') as HTMLElement;
      
      if (treeItemContent && e.dataTransfer) {
        draggedElement = treeItemContent;
        treeItemContent.classList.add('dragging');
        
        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', treeItemContent.dataset.path || '');
        
        // Create custom drag image
        const dragGhost = document.createElement('div');
        dragGhost.className = 'drag-ghost';
        const fileName = treeItemContent.querySelector('.tree-item-label')?.textContent || '';
        const iconName = treeItemContent.dataset.isFolder === 'true' ? 'folder' : 'file';
        dragGhost.innerHTML = `<i data-lucide="${iconName}"></i><span>${fileName}</span>`;
        document.body.appendChild(dragGhost);
        
        // Set custom drag image
        e.dataTransfer.setDragImage(dragGhost, 0, 0);
        
        // Remove ghost after drag starts
        setTimeout(() => dragGhost.remove(), 0);
      }
    });

    explorerContent.addEventListener('dragend', (e) => {
      const target = e.target as HTMLElement;
      const treeItemContent = target.closest('.tree-item-content') as HTMLElement;
      
      if (treeItemContent) {
        treeItemContent.classList.remove('dragging');
      }
      
      // Clean up any drag-over classes
      explorerContent.querySelectorAll('.drag-over, .drag-over-before, .drag-over-after').forEach(el => {
        el.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
      });
      
      draggedElement = null;
    });

    // Handle drag over for internal items
    explorerContent.addEventListener('dragover', (e) => {
      e.preventDefault();
      
      if (!draggedElement) return;
      
      const target = e.target as HTMLElement;
      const treeItemContent = target.closest('.tree-item-content') as HTMLElement;
      
      if (treeItemContent && treeItemContent !== draggedElement) {
        // Remove previous drag-over classes
        explorerContent.querySelectorAll('.drag-over, .drag-over-before, .drag-over-after').forEach(el => {
          el.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
        });
        
        // Add appropriate class based on position
        const rect = treeItemContent.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;
        
        if (treeItemContent.dataset.isFolder === 'true' && y > height * 0.25 && y < height * 0.75) {
          // Dragging into a folder
          treeItemContent.classList.add('drag-over');
        } else if (y < height / 2) {
          // Dragging before item
          treeItemContent.classList.add('drag-over-before');
        } else {
          // Dragging after item
          treeItemContent.classList.add('drag-over-after');
        }
      }
    });

    // Handle drop for internal items
    explorerContent.addEventListener('drop', async (e) => {
      e.preventDefault();
      
      const target = e.target as HTMLElement;
      const dropTarget = target.closest('.tree-item-content') as HTMLElement;
      
      if (dropTarget && draggedElement && dropTarget !== draggedElement) {
        const sourcePath = draggedElement.dataset.path;
        const targetPath = dropTarget.dataset.path;
        
        if (sourcePath && targetPath) {
          await this.handleInternalFileDrop(sourcePath, targetPath, dropTarget, panelId);
        }
      }
      
      // Clean up
      explorerContent.querySelectorAll('.drag-over, .drag-over-before, .drag-over-after').forEach(el => {
        el.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
      });
    });

  }

  private async openDroppedFolderInPanel(folderName: string, panelId: string, folderHandle?: any): Promise<void> {
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;

    // Mark this as an explorer panel
    panel.setAttribute('data-panel-type', 'explorer');
    panel.classList.add('explorer-panel');

    // Ensure panel has a proper header structure
    let panelHeader = panel.querySelector('.panel-header');
    if (!panelHeader) {
      // Create header if it doesn't exist
      const headerHTML = `
        <div class="panel-header">
          <div class="panel-title">
            <i data-lucide="folder" class="lucide" style="width: 16px; height: 16px; margin-right: 6px; color: var(--file-folder);"></i>
            <span>${folderName}</span>
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
      
      const panelBody = panel.querySelector('.panel-body');
      if (panelBody) {
        panelBody.insertAdjacentHTML('beforebegin', headerHTML);
      }
    } else {
      // Update existing panel header with folder icon
      const panelTitle = panelHeader.querySelector('.panel-title');
      if (panelTitle) {
        panelTitle.innerHTML = `
          <i data-lucide="folder" class="lucide" style="width: 16px; height: 16px; margin-right: 6px; color: var(--file-folder);"></i>
          <span>${folderName}</span>
        `;
      }
    }

    // Update panel content with explorer view
    const panelContent = panel.querySelector('.panel-content');
    if (!panelContent) return;

    // If we have a folder handle (from webkitGetAsEntry), we can create a native explorer
    if (folderHandle && folderHandle.isDirectory) {
      panelContent.innerHTML = `
        <div class="file-explorer-content native-explorer" data-panel-id="${panelId}">
          <div class="tree" aria-label="File Explorer">
            <div class="loading-indicator">Loading folder contents...</div>
          </div>
        </div>
      `;
      
      // Load native folder contents
      this.loadNativeFolderContents(folderHandle, panelId);
      // Native folders have their own click handlers, don't add server-based ones
    } else {
      // Fallback to server-based explorer
      panelContent.innerHTML = `
        <div class="file-explorer-content" data-panel-id="${panelId}">
          <div class="tree" aria-label="File Explorer">
            <div class="loading-indicator">Loading files...</div>
          </div>
        </div>
      `;
      
      // Load files from current server path
      this.loadDirectoryContents(this.currentPath, panelId);
      
      // Setup explorer interactions only for server-based explorers
      this.setupExplorerInteractions(panelId);
    }
    
    // Re-initialize Lucide icons
    this.initializeLucideIcons(10);
  }

  private async openDroppedFileInPanel(file: File, panelId: string): Promise<void> {
    console.log('=== openDroppedFileInPanel called ===');
    console.log('File:', file.name, 'Size:', file.size, 'Type:', file.type);
    console.log('Panel ID:', panelId);
    
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    console.log('Panel found:', !!panel);
    
    if (!panel) {
      console.error('Panel not found for ID:', panelId);
      return;
    }

    // Check if this is a directory (folder)
    // Browsers don't directly support folder drops from File API, but we can check webkitRelativePath
    const isDirectory = file.webkitRelativePath !== '' || 
                       (file.type === '' && file.size === 0 && file.name.indexOf('.') === -1);

    // Update panel header with icon
    const panelTitle = panel.querySelector('.panel-title');
    if (panelTitle) {
      const fileType = getFileType(file.name);
      const iconName = this.getFileIcon(fileType);
      const iconColor = this.getFileIconColor(fileType);
      panelTitle.innerHTML = `
        <i data-lucide="${iconName}" class="lucide" style="width: 16px; height: 16px; margin-right: 6px; color: ${iconColor};"></i>
        <span>${file.name}</span>
      `;
      // Re-initialize Lucide icons for the new icon
      this.initializeLucideIcons(10);
    }

    // Update panel content based on file type
    const panelContent = panel.querySelector('.panel-content');
    if (!panelContent) return;

    if (isDirectory) {
      // Handle folder drop - create an explorer view
      console.log('Folder dropped:', file.name);
      panelContent.innerHTML = `
        <div class="file-info" style="padding: 20px;">
          <i data-lucide="folder" style="width: 48px; height: 48px; color: var(--file-folder);"></i>
          <h3>Folder: ${file.name}</h3>
          <p style="color: var(--color-text-secondary); margin-top: 10px;">
            Folder dropped. To browse folders, use the native file picker or connect to a server.
          </p>
          <p style="color: var(--color-text-secondary); margin-top: 20px; font-size: 0.875rem;">
            Note: Web browsers have limited access to local folders for security reasons.
          </p>
        </div>
      `;
      
      // Re-initialize Lucide icons
      if (window.lucide) {
        window.lucide.createIcons();
      }
      return;
    }

    const fileType = getFileType(file.name);
    
    if (file.type.startsWith('text/') || fileType === 'file-code' || fileType === 'markdown' || file.name.endsWith('.txt')) {
      // Read text files
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        if (fileType === 'markdown' || file.name.endsWith('.md')) {
          panelContent.innerHTML = `<div class="markdown-content">${this.md.render(content)}</div>`;
        } else {
          panelContent.innerHTML = `<pre class="file-content">${this.escapeHtml(content)}</pre>`;
        }
      };
      reader.readAsText(file);
    } else if (fileType === 'file-image' || file.type.startsWith('image/')) {
      // Handle image files
      const url = URL.createObjectURL(file);
      panelContent.innerHTML = `
        <div class="image-viewer" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: auto;">
          <img src="${url}" alt="${file.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
        </div>
      `;
    } else if (fileType === 'file-video' || file.type.startsWith('video/')) {
      // Handle video files
      const url = URL.createObjectURL(file);
      panelContent.innerHTML = `
        <div class="video-player">
          <video autoplay muted loop>
            <source src="${url}" type="${file.type}">
            Your browser does not support the video tag.
          </video>
          <div class="video-controls">
            <button class="btn btn-icon btn-sm" data-action="play">
              <i data-lucide="play" width="16" height="16"></i>
            </button>
            <span class="video-time-label">0:00 / 0:00</span>
            <div class="timeline" data-video-timeline>
              <div class="timeline-track"></div>
              <div class="timeline-progress"></div>
              <div class="timeline-handle" style="left: 0%">
                <div class="timeline-playhead-line"></div>
                <div class="timeline-playhead-label">0:00</div>
              </div>
              <div class="timeline-ruler"></div>
            </div>
            <button class="btn btn-icon btn-sm" data-action="volume">
              <i data-lucide="volume-2" width="16" height="16"></i>
            </button>
            <input type="range" class="form-control" min="0" max="100" value="100" style="width: 80px;">
          </div>
        </div>
      `;
      this.setupVideoPlayer(panelContent);
    } else if (fileType === 'file-pdf' || file.type === 'application/pdf') {
      // Handle PDF files
      const url = URL.createObjectURL(file);
      panelContent.innerHTML = `
        <div class="pdf-viewer" style="width: 100%; height: 100%;">
          <iframe src="${url}" style="width: 100%; height: 100%; border: none;"></iframe>
        </div>
      `;
    } else {
      // Unsupported file type
      panelContent.innerHTML = `
        <div class="file-info" style="padding: 20px;">
          <p>File: ${file.name}</p>
          <p>Type: ${file.type || 'Unknown'}</p>
          <p>Size: ${this.formatFileSize(file.size)}</p>
          <p style="color: var(--color-text-secondary);">Preview not available for this file type</p>
        </div>
      `;
    }
  }


  private async handleExternalFileDrop(files: File[], panelId: string): Promise<void> {
    // This method is no longer needed since we handle drops per panel
    console.log('Legacy method called - should not happen');
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return text.replace(/[&<>"'\/]/g, (m) => map[m]);
  }

  private async handleInternalFileDrop(sourcePath: string, targetPath: string, dropTarget: HTMLElement, panelId: string): Promise<void> {
    const isTargetFolder = dropTarget.dataset.isFolder === 'true';
    const position = this.getDropPosition(dropTarget);
    
    console.log(`Moving ${sourcePath} to ${targetPath} (position: ${position})`);
    
    // In a real implementation, you would:
    // 1. Call server API to move/copy the file
    // 2. Update the file explorer
    // 3. Show progress indicators
    
    if (isTargetFolder && position === 'inside') {
      console.log(`Would move file into folder: ${targetPath}`);
    } else {
      console.log(`Would reorder file ${position} ${targetPath}`);
    }
    
    // Refresh the directory view after operation
    await this.loadDirectoryContents(this.currentPath, panelId);
    
    // Show a notification
    this.showNotification('File operation completed', 'success');
  }

  private getDropPosition(element: HTMLElement): 'before' | 'after' | 'inside' {
    if (element.classList.contains('drag-over')) return 'inside';
    if (element.classList.contains('drag-over-before')) return 'before';
    if (element.classList.contains('drag-over-after')) return 'after';
    return 'after';
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: var(--bg-secondary);
      color: var(--color-text-primary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: var(--shadow-lg);
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
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
      
      // Add or update breadcrumb for file panels
      this.addOrUpdateFileBreadcrumb(panel as HTMLElement, path);
      
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
      case 'file-pdf': return 'file-text';
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
      case 'file-pdf': return 'var(--file-document)';
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

  private createNativeTreeItemOLD(file: FileItem, panelId: string, _parentHandle: any, level: number = 0): HTMLElement {
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
    } else if (fileType === 'file-pdf') {
      iconName = 'file-text';
    }
    
    treeItem.innerHTML = `
      <div class="tree-item-content native-file" draggable="true" data-is-folder="${isDirectory}" data-file-name="${file.name}" data-file-type="${fileType}" data-panel-id="${panelId}" style="padding-left: ${20 + level * 20}px">
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
      
      // Add or update breadcrumb for file panels - for native files, just show the filename
      this.addOrUpdateFileBreadcrumb(panel as HTMLElement, fileName);
      
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

  private setupVideoPlayer(container: HTMLElement): void {
    const video = container.querySelector('video') as HTMLVideoElement;
    const playBtn = container.querySelector('[data-action="play"]') as HTMLButtonElement;
    const volumeBtn = container.querySelector('[data-action="volume"]') as HTMLButtonElement;
    const volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
    const timeLabel = container.querySelector('.video-time-label') as HTMLElement;
    const timeline = container.querySelector('.timeline') as HTMLElement;
    const timelineHandle = timeline?.querySelector('.timeline-handle') as HTMLElement;
    const timelineLabel = timeline?.querySelector('.timeline-playhead-label') as HTMLElement;
    
    if (!video) return;
    
    // Format time helper
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Set initial state - video starts playing and muted
    video.muted = true;
    volumeSlider && (volumeSlider.value = '0');
    
    // Update play button based on initial state
    if (!video.paused) {
      playBtn && (playBtn.innerHTML = '<i data-lucide="pause" width="16" height="16"></i>');
    }
    
    // Play/pause functionality
    playBtn?.addEventListener('click', () => {
      if (video.paused) {
        video.play();
        playBtn.innerHTML = '<i data-lucide="pause" width="16" height="16"></i>';
      } else {
        video.pause();
        playBtn.innerHTML = '<i data-lucide="play" width="16" height="16"></i>';
      }
      this.initializeLucideIcons();
    });
    
    // Volume control
    volumeSlider?.addEventListener('input', () => {
      video.volume = parseInt(volumeSlider.value) / 100;
      updateVolumeIcon();
    });
    
    const updateVolumeIcon = () => {
      if (!volumeBtn) return;
      const volume = video.volume;
      let icon = 'volume-2';
      if (video.muted || volume === 0) icon = 'volume-x';
      else if (volume < 0.5) icon = 'volume-1';
      volumeBtn.innerHTML = `<i data-lucide="${icon}" width="16" height="16"></i>`;
      this.initializeLucideIcons();
    };
    
    // Set initial volume icon to muted
    updateVolumeIcon();
    
    // Timeline scrubbing
    let isDragging = false;
    
    const updateTimeline = (percentage: number) => {
      if (!timelineHandle || !video.duration) return;
      timelineHandle.style.left = `${percentage}%`;
      video.currentTime = (percentage / 100) * video.duration;
      if (timelineLabel) {
        timelineLabel.textContent = formatTime(video.currentTime);
      }
      
      // Update timeline line opacity based on playhead position
      const track = timeline?.querySelector('.timeline-track');
      if (track) {
        const trackElement = track as HTMLElement;
        trackElement.style.setProperty('--playhead-position', `${percentage}%`);
      }
    };
    
    timeline?.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = timeline.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      updateTimeline(percentage);
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !timeline) return;
      const rect = timeline.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      updateTimeline(percentage);
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    // Update time labels
    video.addEventListener('loadedmetadata', () => {
      if (timeLabel) {
        timeLabel.textContent = `0:00 / ${formatTime(video.duration)}`;
      }
    });
    
    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;
      
      // Update time label
      if (timeLabel) {
        timeLabel.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
      }
      
      // Update timeline position if not dragging
      if (!isDragging && timelineHandle) {
        const percentage = (video.currentTime / video.duration) * 100;
        timelineHandle.style.left = `${percentage}%`;
        if (timelineLabel) {
          timelineLabel.textContent = formatTime(video.currentTime);
        }
        
        // Update timeline line opacity based on playhead position
        const track = timeline?.querySelector('.timeline-track');
        if (track) {
          const trackElement = track as HTMLElement;
          trackElement.style.setProperty('--playhead-position', `${percentage}%`);
        }
      }
    });
    
    // Initialize icons
    this.initializeLucideIcons();
  }

  private setupDividerDragAndDrop(): void {
    // Remove existing listeners first to avoid duplicates
    document.querySelectorAll('.bsp-resizer').forEach(resizer => {
      const clone = resizer.cloneNode(true);
      resizer.parentNode?.replaceChild(clone, resizer);
    });
    
    // Setup drag and drop for BSP resizers/dividers 
    const resizers = document.querySelectorAll('.bsp-resizer');
    console.log('Setting up drag and drop for', resizers.length, 'resizers');
    
    resizers.forEach(resizer => {
      // Add drag over events to resizers
      resizer.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drag enter resizer');
        resizer.classList.add('drag-over-divider');
      });
      
      resizer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      
      resizer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = (resizer as HTMLElement).getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
          console.log('Drag leave resizer');
          resizer.classList.remove('drag-over-divider');
        }
      });
      
      resizer.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drop on resizer');
        resizer.classList.remove('drag-over-divider');
        
        if (!e.dataTransfer) return;
        
        // Check if we have items (which may include folders)
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          const item = e.dataTransfer.items[0];
          
          if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry?.();
            
            if (entry) {
              // We have a FileSystemEntry
              await this.handleDividerDropWithEntry(resizer as HTMLElement, entry);
            } else {
              // Fallback to regular file handling
              const file = item.getAsFile();
              if (file) {
                await this.handleDividerDropWithFile(resizer as HTMLElement, file);
              }
            }
          }
        } else if (e.dataTransfer.files.length) {
          // Fallback to FileList API
          const file = e.dataTransfer.files[0];
          await this.handleDividerDropWithFile(resizer as HTMLElement, file);
        }
      });
    });
  }
  
  public refreshDividerDragAndDrop(): void {
    // Public method to refresh drag and drop after layout changes
    setTimeout(() => {
      this.setupDividerDragAndDrop();
    }, 100);
  }

  private async handleDividerDropWithEntry(resizer: HTMLElement, entry: any): Promise<void> {
    if (entry.isDirectory) {
      console.log('Directory dropped on divider:', entry.name);
      await this.handleDividerDropForFolder(resizer, entry.name, entry);
    } else {
      // Get file and handle normally
      entry.file((file: File) => {
        this.handleDividerDropWithFile(resizer, file);
      });
    }
  }

  private async handleDividerDropWithFile(resizer: HTMLElement, file: File): Promise<void> {
    await this.handleDividerDrop(resizer, file, false);
  }

  private async handleDividerDropForFolder(resizer: HTMLElement, folderName: string, folderHandle: any): Promise<void> {
    await this.handleDividerDrop(resizer, { name: folderName, handle: folderHandle } as any, true);
  }

  private async handleDividerDrop(resizer: HTMLElement, fileOrFolder: File | { name: string }, isFolder: boolean): Promise<void> {
    console.log('=== DIVIDER DROP DEBUG ===');
    console.log('Resizer element:', resizer);
    console.log('Resizer classes:', resizer.className);
    console.log('Resizer dataset:', resizer.dataset);
    
    // Get the node ID from the resizer
    const nodeId = resizer.dataset.nodeId;
    if (!nodeId || !this.bspManager) {
      console.log('❌ No nodeId or bspManager');
      return;
    }
    
    // Get the direction from the resizer
    const direction = resizer.dataset.direction;
    const isHorizontal = direction === 'horizontal';
    
    console.log('🎯 Attempting split - Node ID:', nodeId, 'Direction:', direction);
    
    // Find the largest panel to split instead of trying to match resizer position
    const allPanels = document.querySelectorAll('.bsp-panel');
    let largestPanel: HTMLElement | null = null;
    let largestArea = 0;
    
    console.log('📊 Available panels:', allPanels.length);
    
    for (const panel of allPanels) {
      const rect = panel.getBoundingClientRect();
      const area = rect.width * rect.height;
      const panelId = panel.getAttribute('data-panel-id');
      
      console.log(`Panel ${panelId}: ${rect.width}x${rect.height} = ${area}px²`);
      
      if (area > largestArea) {
        largestArea = area;
        largestPanel = panel as HTMLElement;
      }
    }
    
    if (largestPanel) {
      const targetPanelId = largestPanel.getAttribute('data-panel-id');
      console.log('🎯 Splitting largest panel:', targetPanelId);
      
      if (targetPanelId) {
        // Split the target panel
        const newPanelId = this.bspManager.splitPanel(targetPanelId, direction as 'horizontal' | 'vertical', 'right');
        
        console.log('✅ Split result - New panel ID:', newPanelId);
        
        if (newPanelId) {
          // Wait for layout to complete, then load the file
          setTimeout(async () => {
            console.log('📁 Loading into new panel:', newPanelId);
            if (isFolder) {
              const folderData = fileOrFolder as { name: string; handle?: any };
              await this.openDroppedFolderInPanel(folderData.name, newPanelId, folderData.handle);
            } else {
              await this.openDroppedFileInPanel(fileOrFolder as File, newPanelId);
            }
            // Re-setup drag and drop for new resizers
            this.refreshDividerDragAndDrop();
          }, 200);
        } else {
          console.log('❌ Split panel returned null');
        }
      }
    } else {
      console.log('❌ No panels found to split');
    }
    
    console.log('=== END DIVIDER DROP DEBUG ===');
  }

  private addOrUpdateFileBreadcrumb(panel: HTMLElement, path: string): void {
    // First check if breadcrumb exists, if not add it
    let breadcrumbContainer = panel.querySelector('.panel-breadcrumb');
    if (!breadcrumbContainer) {
      // Insert breadcrumb after panel header
      const panelHeader = panel.querySelector('.panel-header');
      if (panelHeader) {
        const breadcrumbHTML = `
          <div class="panel-breadcrumb">
            <nav class="breadcrumb-nav"></nav>
          </div>
        `;
        panelHeader.insertAdjacentHTML('afterend', breadcrumbHTML);
        breadcrumbContainer = panel.querySelector('.panel-breadcrumb');
      }
    }
    
    const breadcrumbNav = breadcrumbContainer?.querySelector('.breadcrumb-nav');
    if (!breadcrumbNav) return;
    
    // Split path into segments, keeping the full hierarchy
    const segments = path.split('/').filter(s => s);
    
    // Create breadcrumb HTML with full hierarchy
    let breadcrumbHTML = '';
    let currentPath = '';
    
    // Always start with a forward slash
    breadcrumbHTML += '<span class="breadcrumb-separator">/</span>';
    
    // If path is absolute, set currentPath to root
    if (path.startsWith('/')) {
      currentPath = '/';
    }
    
    segments.forEach((segment, index) => {
      currentPath += (currentPath === '/' ? '' : '/') + segment;
      const isLast = index === segments.length - 1;
      
      if (isLast) {
        breadcrumbHTML += `<span class="breadcrumb-item breadcrumb-current">${segment}</span>`;
      } else {
        breadcrumbHTML += `
          <span class="breadcrumb-item breadcrumb-link" data-path="${currentPath}">${segment}</span>
          <span class="breadcrumb-separator">/</span>
        `;
      }
    });
    
    breadcrumbNav.innerHTML = breadcrumbHTML;
    
    // Add click handlers for breadcrumb navigation
    breadcrumbNav.querySelectorAll('.breadcrumb-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const targetPath = (e.target as HTMLElement).dataset.path;
        if (targetPath) {
          // TODO: Navigate to the clicked path in the file explorer
          console.log('Navigate to:', targetPath);
        }
      });
    });
    
    // Re-initialize Lucide icons for separators
    this.initializeLucideIcons(10);
  }

  private addHeaderToPanel(panel: HTMLElement, title: string): void {
    const panelBody = panel.querySelector('.panel-body');
    if (!panelBody) return;

    // Determine icon from title
    const fileType = getFileType(title);
    const iconName = this.getFileIcon(fileType);
    const iconColor = this.getFileIconColor(fileType);

    // Create header HTML with breadcrumb sub-header
    const headerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <i data-lucide="${iconName}" class="lucide" style="width: 16px; height: 16px; margin-right: 6px; color: ${iconColor};"></i>
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

    // Mark this as a terminal panel
    panel.setAttribute('data-panel-type', 'terminal');

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

    // Mark this as a properties panel
    panel.setAttribute('data-panel-type', 'properties');

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