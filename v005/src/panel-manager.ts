// Panel Manager - Simple fixed layout system
import { FIXED_PANELS, DEFAULT_MARKDOWN_CONTENT } from './default-layout';
import { BSPPanelManager } from './bsp-manager';
import { ServerFileSystem, FileItem, sortFiles, getFileType } from './filemanager';
import Showdown from 'showdown';

interface Panel {
  id: string;
  title: string;
  element: HTMLElement;
  isToolbar: boolean;
}

export class PanelManager {
  private container: HTMLElement;
  private panels: Map<string, Panel> = new Map();
  private markdownConverter: Showdown.Converter;
  private isFooterCollapsed: boolean = false;
  private footerHeight: number = 200;
  private isResizing: boolean = false;
  private isPropertiesCollapsed: boolean = false;
  private propertiesWidth: number = 300;
  private isResizingProperties: boolean = false;
  private bspManager: BSPPanelManager | null = null;
  private directoryHandles: Map<string, any> = new Map();
  private fileHandles: Map<string, any> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.markdownConverter = new Showdown.Converter();
    this.init();
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

    // Initialize Lucide icons
    setTimeout(() => {
      if ((window as any).lucide) {
        (window as any).lucide.createIcons();
      }
    }, 50);
  }

  private createPanelElement(config: { id: string; title: string; isToolbar: boolean }): HTMLElement {
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
    const toolbarWidth = 48;
    const propertiesWidth = this.isPropertiesCollapsed ? 48 : this.propertiesWidth; // Collapsed width matches toolbar
    const footerHeight = this.isFooterCollapsed ? 48 : this.footerHeight; // Match terminal header height

    // Use viewport dimensions for full width
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Position header panel - full viewport width at top (unchanged)
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

    // Position left toolbar - compensate for footer panel
    const leftToolbar = this.panels.get('left-toolbar');
    if (leftToolbar) {
      Object.assign(leftToolbar.element.style, {
        position: 'fixed',
        left: '0px',
        top: `${headerHeight}px`,
        width: `${toolbarWidth}px`,
        height: `${viewportHeight - headerHeight - footerHeight}px`,
        zIndex: '200'
      });
    }

    // Position footer panel - full viewport width at bottom
    const footerPanel = this.panels.get('footer-panel');
    if (footerPanel) {
      Object.assign(footerPanel.element.style, {
        position: 'fixed',
        left: '0px',
        bottom: '0px',
        width: `${viewportWidth}px`,
        height: `${footerHeight}px`,
        zIndex: '300'  // Higher than other panels
      });
      
      // Toggle collapsed class
      footerPanel.element.classList.toggle('footer-collapsed', this.isFooterCollapsed);
      
      // Add resize handle if not collapsed
      if (!this.isFooterCollapsed) {
        this.addResizeHandle(footerPanel.element);
      }
    }

    // Position properties panel - right side, compensate for header and footer
    const propertiesPanel = this.panels.get('properties-panel');
    if (propertiesPanel) {
      Object.assign(propertiesPanel.element.style, {
        position: 'fixed',
        right: '0px',
        top: `${headerHeight}px`,
        width: `${propertiesWidth}px`,
        height: `${viewportHeight - headerHeight - footerHeight}px`,
        zIndex: '200'
      });
      
      // Toggle collapsed class
      propertiesPanel.element.classList.toggle('properties-collapsed', this.isPropertiesCollapsed);
      
      // Add resize handle if not collapsed
      if (!this.isPropertiesCollapsed) {
        this.addPropertiesResizeHandle(propertiesPanel.element);
      }
    }

    // Position main panel - directly adjacent to left toolbar
    const mainPanel = this.panels.get('main-panel');
    if (mainPanel) {
      Object.assign(mainPanel.element.style, {
        position: 'fixed',
        left: `${toolbarWidth}px`,  // Start right after toolbar
        top: `${headerHeight}px`,
        width: `${viewportWidth - toolbarWidth - propertiesWidth}px`,
        height: `${viewportHeight - headerHeight - footerHeight}px`,
        zIndex: '100'
      });
      
      // Update BSP layout when main panel resizes
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

    // Handle resize events
    this.container.addEventListener('mousedown', (e) => {
      const footerResizeHandle = (e.target as HTMLElement).closest('.footer-resize-handle');
      const propertiesResizeHandle = (e.target as HTMLElement).closest('.properties-resize-handle');
      
      if (footerResizeHandle) {
        this.startResize(e);
      } else if (propertiesResizeHandle) {
        this.startPropertiesResize(e);
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isResizing) {
        this.handleResize(e);
      } else if (this.isResizingProperties) {
        this.handlePropertiesResize(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isResizing) {
        this.stopResize();
      } else if (this.isResizingProperties) {
        this.stopPropertiesResize();
      }
    });
  }

  private handleToolbarButtonClick(btn: HTMLButtonElement): void {
    const action = btn.dataset.action;
    console.log('Toolbar button clicked:', action);
    
    // Handle footer collapse toggle
    if (action === 'toggle-terminal') {
      this.toggleFooterCollapse();
    } else if (action === 'toggle-properties') {
      this.togglePropertiesCollapse();
    } else if (action === 'add-panel' && this.bspManager) {
      // Add a new panel to the BSP tree
      this.bspManager.addPanel('right');
    } else if (action === 'explorer' && this.bspManager) {
      // Create a new BSP panel with file explorer
      this.createExplorerBSPPanel();
    }
  }

  private toggleFooterCollapse(): void {
    this.isFooterCollapsed = !this.isFooterCollapsed;
    // Allow transition to happen
    requestAnimationFrame(() => {
      this.layout();
    });
  }

  private addResizeHandle(footerElement: HTMLElement): void {
    // Remove existing resize handle
    const existingHandle = footerElement.querySelector('.footer-resize-handle');
    if (existingHandle) {
      existingHandle.remove();
    }

    // Create new resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'footer-resize-handle';
    resizeHandle.innerHTML = '<div class="resize-handle-bar"></div>';
    
    footerElement.appendChild(resizeHandle);
  }

  private startResize(e: MouseEvent): void {
    this.isResizing = true;
    document.body.style.cursor = 'ns-resize';
    document.body.classList.add('no-transition');
    e.preventDefault();
  }

  private handleResize(e: MouseEvent): void {
    if (!this.isResizing) return;

    const viewportHeight = window.innerHeight;
    const newFooterHeight = viewportHeight - e.clientY;
    
    // Snap zone - if dragged within 70px of bottom, snap to collapsed
    const snapZone = 70;
    const minHeight = 120; // Minimum height to ensure left toolbar buttons visible
    const maxHeight = viewportHeight * 0.6;
    
    // Calculate the actual footer height to use
    let actualFooterHeight: number;
    
    if (newFooterHeight < snapZone) {
      // Snap to collapsed state
      this.isFooterCollapsed = true;
      actualFooterHeight = 48; // Collapsed height
    } else {
      // Normal resizing
      this.isFooterCollapsed = false;
      actualFooterHeight = Math.max(minHeight, Math.min(maxHeight, newFooterHeight));
      this.footerHeight = actualFooterHeight;
    }
    
    // Update panels immediately during drag
    this.updatePanelsDuringResize(actualFooterHeight);
  }

  private stopResize(): void {
    this.isResizing = false;
    document.body.style.cursor = '';
    document.body.classList.remove('no-transition');
  }

  private togglePropertiesCollapse(): void {
    this.isPropertiesCollapsed = !this.isPropertiesCollapsed;
    // Allow transition to happen
    requestAnimationFrame(() => {
      this.layout();
    });
  }

  private addPropertiesResizeHandle(propertiesElement: HTMLElement): void {
    // Remove existing resize handle
    const existingHandle = propertiesElement.querySelector('.properties-resize-handle');
    if (existingHandle) {
      existingHandle.remove();
    }

    // Create new resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'properties-resize-handle';
    resizeHandle.innerHTML = '<div class="resize-handle-bar"></div>';
    
    propertiesElement.appendChild(resizeHandle);
  }

  private startPropertiesResize(e: MouseEvent): void {
    this.isResizingProperties = true;
    document.body.style.cursor = 'ew-resize';
    document.body.classList.add('no-transition');
    e.preventDefault();
  }

  private handlePropertiesResize(e: MouseEvent): void {
    if (!this.isResizingProperties) return;

    const viewportWidth = window.innerWidth;
    const newPropertiesWidth = viewportWidth - e.clientX;
    
    // Snap zone - if dragged within 70px of right edge, snap to collapsed
    const snapZone = 70;
    const minWidth = 200;
    const maxWidth = viewportWidth * 0.4;
    
    if (newPropertiesWidth < snapZone) {
      // Snap to collapsed state
      this.isPropertiesCollapsed = true;
      this.layout();
    } else {
      // Normal resizing
      this.isPropertiesCollapsed = false;
      this.propertiesWidth = Math.max(minWidth, Math.min(maxWidth, newPropertiesWidth));
      this.layout();
    }
  }

  private stopPropertiesResize(): void {
    this.isResizingProperties = false;
    document.body.style.cursor = '';
    document.body.classList.remove('no-transition');
  }

  private updatePanelsDuringResize(footerHeight: number): void {
    const headerHeight = 48;
    const toolbarWidth = 48;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const propertiesWidth = this.isPropertiesCollapsed ? 48 : this.propertiesWidth;

    // Update left toolbar height immediately
    const leftToolbar = this.panels.get('left-toolbar');
    if (leftToolbar) {
      leftToolbar.element.style.height = `${viewportHeight - headerHeight - footerHeight}px`;
    }

    // Update properties panel height immediately
    const propertiesPanel = this.panels.get('properties-panel');
    if (propertiesPanel) {
      propertiesPanel.element.style.height = `${viewportHeight - headerHeight - footerHeight}px`;
    }

    // Update footer height immediately
    const footerPanel = this.panels.get('footer-panel');
    if (footerPanel) {
      footerPanel.element.style.height = `${footerHeight}px`;
      footerPanel.element.classList.toggle('footer-collapsed', this.isFooterCollapsed);
    }


    // Update main panel dimensions immediately (no gap)
    const mainPanel = this.panels.get('main-panel');
    if (mainPanel) {
      mainPanel.element.style.left = `${toolbarWidth}px`;
      mainPanel.element.style.width = `${viewportWidth - toolbarWidth - propertiesWidth}px`;
      mainPanel.element.style.height = `${viewportHeight - headerHeight - footerHeight}px`;
      
      // Update BSP layout
      if (this.bspManager) {
        this.bspManager.layout();
      }
    }
  }

  private setupPanelContent(panel: Panel): void {
    if (panel.id === 'header-panel') {
      this.setupHeaderPanel(panel);
    } else if (panel.id === 'left-toolbar') {
      this.setupLeftToolbar(panel);
    } else if (panel.id === 'footer-panel') {
      this.setupFooterPanel(panel);
    } else if (panel.id === 'properties-panel') {
      this.setupPropertiesPanel(panel);
    } else if (panel.id === 'main-panel') {
      this.setupMainPanel(panel);
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
              <button class="menu-trigger btn btn-ghost btn-sm active" data-action="explorer" title="Explorer">
                <i data-lucide="files" class="lucide"></i>
              </button>
            </div>
            <div class="menu">
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="source-control" title="Source Control">
                <i data-lucide="git-branch" class="lucide"></i>
              </button>
            </div>
          </div>
          <div class="bottom-actions">
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


  private setupFooterPanel(panel: Panel): void {
    panel.element.classList.add('footer-panel');
    const body = panel.element.querySelector('.panel-body');
    if (body) {
      body.innerHTML = `
        <div class="terminal-container">
          <div class="terminal-header">
            <div class="terminal-tabs">
              <button class="terminal-tab active" data-action="toggle-terminal">
                <i data-lucide="terminal" class="lucide"></i>
                <span>Terminal</span>
                <span class="terminal-tab-close" title="Close Terminal">×</span>
              </button>
            </div>
            <div class="terminal-actions">
              <button class="btn btn-ghost btn-sm" title="Collapse Terminal" data-action="toggle-terminal">
                <i data-lucide="chevron-down" class="lucide"></i>
              </button>
              <button class="btn btn-ghost btn-sm" title="New Terminal" data-action="new-terminal">
                <i data-lucide="plus" class="lucide"></i>
              </button>
              <button class="btn btn-ghost btn-sm" title="Clear Terminal" data-action="clear-terminal">
                <i data-lucide="trash-2" class="lucide"></i>
              </button>
              <button class="btn btn-ghost btn-sm" title="Settings" data-action="terminal-settings">
                <i data-lucide="settings" class="lucide"></i>
              </button>
            </div>
          </div>
          <div class="terminal-content">
            <div class="terminal-output" id="terminal-output">
              <div class="terminal-line">Terminal ready...</div>
              <div class="terminal-input-line">
                <span class="terminal-prompt">user@fileui:~$</span>
                <input id="terminal-input" type="text" class="terminal-input" autofocus />
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Setup terminal functionality
      this.setupTerminal();
    }
  }

  private setupTerminal(): void {
    const terminalInput = document.getElementById('terminal-input') as HTMLInputElement;
    const terminalOutput = document.getElementById('terminal-output');
    
    if (!terminalInput || !terminalOutput) return;

    terminalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const command = terminalInput.value.trim();
        if (command) {
          this.executeCommand(command);
          terminalInput.value = '';
        }
      }
    });

    // Focus terminal when clicked
    terminalOutput.addEventListener('click', () => {
      terminalInput.focus();
    });
  }

  private executeCommand(command: string): void {
    const terminalOutput = document.getElementById('terminal-output');
    if (!terminalOutput) return;

    // Add command to output
    const commandLine = document.createElement('div');
    commandLine.className = 'terminal-line';
    commandLine.innerHTML = `<span class="terminal-prompt">user@fileui:~$</span> ${command}`;
    
    // Remove input line temporarily
    const inputLine = terminalOutput.querySelector('.terminal-input-line');
    if (inputLine) inputLine.remove();
    
    terminalOutput.appendChild(commandLine);

    // Process command
    const [cmd, ...args] = command.split(' ');
    let response = '';

    switch (cmd.toLowerCase()) {
      case 'help':
        response = 'Available commands: help, clear, echo, date';
        break;
      case 'clear':
        terminalOutput.innerHTML = '';
        this.addInputLine();
        return;
      case 'echo':
        response = args.join(' ');
        break;
      case 'date':
        response = new Date().toLocaleString();
        break;
      default:
        response = `Command not found: ${cmd}`;
        break;
    }

    // Add response
    if (response) {
      const responseLine = document.createElement('div');
      responseLine.className = 'terminal-line';
      responseLine.textContent = response;
      terminalOutput.appendChild(responseLine);
    }

    // Add new input line
    this.addInputLine();
  }

  private addInputLine(): void {
    const terminalOutput = document.getElementById('terminal-output');
    if (!terminalOutput) return;

    const inputLine = document.createElement('div');
    inputLine.className = 'terminal-input-line';
    inputLine.innerHTML = `
      <span class="terminal-prompt">user@fileui:~$</span>
      <input id="terminal-input" type="text" class="terminal-input" autofocus />
    `;
    
    terminalOutput.appendChild(inputLine);
    
    // Re-setup event listeners for new input
    this.setupTerminal();
  }

  private setupPropertiesPanel(panel: Panel): void {
    panel.element.classList.add('properties-panel');
    const body = panel.element.querySelector('.panel-body');
    if (body) {
      body.innerHTML = `
        <div class="properties-container">
          <div class="properties-header-vertical">
            <div class="properties-tabs-container">
              <button class="properties-tab-vertical active" title="Properties" data-action="toggle-properties">
                <i data-lucide="info" class="lucide"></i>
              </button>
            </div>
            <div class="properties-actions-vertical">
            </div>
          </div>
          <div class="properties-content">
            <div class="properties-content-header">
              <h3 class="properties-title">Properties</h3>
            </div>
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
    }
  }

  private setupMainPanel(panel: Panel): void {
    panel.element.classList.add('main-panel');
    const body = panel.element.querySelector('.panel-body');
    if (body) {
      body.innerHTML = `
        <div class="bsp-container"></div>
      `;
      
      // Initialize BSP panel manager for the main content area
      const bspContainer = body.querySelector('.bsp-container') as HTMLElement;
      if (bspContainer) {
        this.bspManager = new BSPPanelManager(bspContainer);
        // Delay initialization to ensure container has dimensions
        requestAnimationFrame(() => {
          this.bspManager!.init();
        });
      }
    }
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
        const panelTitle = focusedPanel.querySelector('.panel-title span');
        const panelContent = focusedPanel.querySelector('.panel-content');
        
        if (panelTitle) {
          panelTitle.textContent = 'Explorer';
        }
        
        if (panelContent) {
          // Mark this panel as an explorer panel
          focusedPanel.classList.add('explorer-panel');
          
          // Create file explorer tree structure
          panelContent.innerHTML = `
            <div class="file-explorer-content" data-panel-id="${newPanelId}">
              <div class="file-explorer-header">
                <button class="btn btn-ghost btn-sm choose-dir-btn" title="Choose directory">
                  <i data-lucide="folder-open" class="lucide"></i>
                </button>
                <span class="file-explorer-path">${this.currentPath}</span>
              </div>
              <div class="tree" aria-label="File Explorer">
                <div class="loading-indicator">Loading files...</div>
              </div>
            </div>
          `;
          
          // Load files and setup interactions
          this.loadDirectoryContents(this.currentPath, newPanelId);
          this.setupExplorerInteractions(newPanelId);
          
          // Re-initialize Lucide icons
          setTimeout(() => {
            if ((window as any).lucide) {
              (window as any).lucide.createIcons();
            }
          }, 10);
        }
      }
    }, 100);
  }

  private async loadDirectoryContents(path: string, panelId: string): Promise<void> {
    const treeElement = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"] .tree`) as HTMLElement;
    if (!treeElement) return;

    try {
      // Show loading state
      treeElement.innerHTML = '<div class="loading-indicator">Loading files...</div>';

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

      // Re-initialize Lucide icons after loading content
      setTimeout(() => {
        if ((window as any).lucide) {
          (window as any).lucide.createIcons();
        }
      }, 10);

    } catch (error) {
      console.error('Error loading directory contents:', error);
      treeElement.innerHTML = `
        <div class="error-message">
          <i data-lucide="alert-circle" class="lucide"></i>
          <span>Failed to load directory contents</span>
        </div>
      `;
      
      // Re-initialize Lucide icons for error state
      setTimeout(() => {
        if ((window as any).lucide) {
          (window as any).lucide.createIcons();
        }
      }, 10);
    }
  }

  private createTreeItem(file: FileItem, panelId: string, level: number = 0): HTMLElement {
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
      
      // Handle choose directory button
      if (target.closest('.choose-dir-btn')) {
        this.showDirectoryChooser(panelId);
        return;
      }

      // Handle tree item clicks
      const treeItemContent = target.closest('.tree-item-content') as HTMLElement;
      if (treeItemContent) {
        const isFolder = treeItemContent.dataset.isFolder === 'true';
        const path = treeItemContent.dataset.path;
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
          // Handle file selection
          this.selectFile(treeItem, panelId);
        }
      }
    });

    // Handle double clicks for opening files
    explorerContent.addEventListener('dblclick', async (e) => {
      
      const target = e.target as HTMLElement;
      const treeItemContent = target.closest('.tree-item-content') as HTMLElement;
      
      
      if (treeItemContent) {
        
        if (treeItemContent.dataset.isFolder !== 'true') {
          e.preventDefault();
          e.stopPropagation();
          
          const path = treeItemContent.dataset.path;
          const fileName = treeItemContent.dataset.fileName;
          
          if (path && fileName) {
            await this.openFileInBSPPanel(path, fileName);
          } else {
          }
        }
      }
    });
  }

  private async toggleFolder(treeItem: HTMLElement, panelId: string): Promise<void> {
    const treeItemContent = treeItem.querySelector('.tree-item-content') as HTMLElement;
    const toggleBtn = treeItem.querySelector('.tree-item-toggle') as HTMLButtonElement;
    const childrenContainer = treeItem.querySelector('.tree-item-children') as HTMLElement;
    const chevron = toggleBtn?.querySelector('.chevron-icon');
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
        childrenContainer.innerHTML = '<div class="loading-indicator">Loading...</div>';

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
          setTimeout(() => {
            if ((window as any).lucide) {
              (window as any).lucide.createIcons();
            }
          }, 10);

        } catch (error) {
          console.error('Error loading folder contents:', error);
          childrenContainer.innerHTML = '<div class="error-message">Failed to load</div>';
        }
      }
    }

    // Re-initialize Lucide icons
    setTimeout(() => {
      if ((window as any).lucide) {
        (window as any).lucide.createIcons();
      }
    }, 10);
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
    if (!this.bspManager) return;

    let targetPanelId: string | null = null;
    
    // Find an unpinned panel to use (excluding explorer panels)
    const allPanels = document.querySelectorAll('.bsp-panel:not(.explorer-panel)');
    
    // First, try the focused panel if it's unpinned
    const focusedPanel = document.querySelector('.bsp-panel.focused:not(.explorer-panel)');
    if (focusedPanel) {
      const isPinned = focusedPanel.classList.contains('is-pinned');
      if (!isPinned) {
        targetPanelId = focusedPanel.getAttribute('data-panel-id');
      }
    }
    
    // If focused panel is pinned or doesn't exist, find ANY unpinned panel
    if (!targetPanelId) {
      for (const panel of allPanels) {
        const isPinned = panel.classList.contains('is-pinned');
        if (!isPinned) {
          targetPanelId = panel.getAttribute('data-panel-id');
          break;
        }
      }
    }

    // Only create a new panel if all existing panels are pinned
    if (!targetPanelId) {
      targetPanelId = this.bspManager.addPanel('right');
      if (!targetPanelId) return;
    }

    // Update panel content with file
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${targetPanelId}"]`);
    if (!panel) {
      console.error('Panel not found with ID:', targetPanelId);
      return;
    }

    const header = panel.querySelector('.bsp-panel-header .panel-title span') as HTMLElement;
    const content = panel.querySelector('.panel-content') as HTMLElement;
    
    if (header) {
      header.textContent = fileName;
    }

    if (content) {
      // Show loading state
      content.innerHTML = '<div class="file-loading">Loading file...</div>';

      try {
        const fileType = getFileType(fileName);

        // Display file content based on type
        if (fileType === 'file-image') {
          // For images, display them directly without reading content
          content.innerHTML = `<div class="file-preview image-preview">
            <img src="http://localhost:8001/api/file?path=${encodeURIComponent(path)}" alt="${fileName}" />
          </div>`;
        } else {
          // For text files, read and show content
          const fs = new ServerFileSystem('http://localhost:8001/api');
          const fileContent = await fs.readFile(path);
          content.innerHTML = `<div class="file-content">
            <pre class="file-text">${this.escapeHtml(fileContent)}</pre>
          </div>`;
        }

        // Store file info in panel
        panel.setAttribute('data-file-path', path);
        panel.setAttribute('data-file-name', fileName);
        
        // Focus the panel that now contains the file
        this.focusPanel(panel);

      } catch (error) {
        console.error('Error loading file:', error);
        content.innerHTML = `<div class="file-error">
          <p>Failed to load file: ${fileName}</p>
          <p class="error-message">${error}</p>
        </div>`;
      }
    }
  }
  
  private focusPanel(panel: Element): void {
    // Remove focus from all panels
    document.querySelectorAll('.bsp-panel.focused').forEach(p => {
      p.classList.remove('focused');
    });
    
    // Add focus to the target panel
    panel.classList.add('focused');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private setupTreeItemInteractions(container: HTMLElement, panelId: string): void {
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
      if ((window as any).lucide) {
        (window as any).lucide.createIcons();
      }
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
      treeElement.innerHTML = '<div class="loading-indicator">Loading files...</div>';

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
      setTimeout(() => {
        if ((window as any).lucide) {
          (window as any).lucide.createIcons();
        }
      }, 10);

    } catch (error) {
      console.error('Error loading directory from handle:', error);
      treeElement.innerHTML = `
        <div class="error-message">
          <i data-lucide="alert-circle" class="lucide"></i>
          <span>Failed to load directory contents</span>
        </div>
      `;
      
      // Re-initialize Lucide icons for error state
      setTimeout(() => {
        if ((window as any).lucide) {
          (window as any).lucide.createIcons();
        }
      }, 10);
    }
  }

  private createNativeTreeItem(file: FileItem, panelId: string, parentHandle: any, level: number = 0): HTMLElement {
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

      // Handle double clicks for opening files
      treeItemContent.addEventListener('dblclick', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!isDirectory) {
          const fileHandle = this.fileHandles?.get(`${panelId}:${file.name}`);
          if (fileHandle) {
            await this.openNativeFileInBSPPanel(fileHandle, file.name);
          }
        }
      });
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
        childrenContainer.innerHTML = '<div class="loading-indicator">Loading...</div>';

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
          setTimeout(() => {
            if ((window as any).lucide) {
              (window as any).lucide.createIcons();
            }
          }, 10);

        } catch (error) {
          console.error('Error loading folder contents:', error);
          childrenContainer.innerHTML = '<div class="error-message">Failed to load</div>';
        }
      }
    }

    // Re-initialize Lucide icons
    setTimeout(() => {
      if ((window as any).lucide) {
        (window as any).lucide.createIcons();
      }
    }, 10);
  }

  private async openNativeFileInBSPPanel(fileHandle: any, fileName: string): Promise<void> {
    if (!this.bspManager) return;

    let targetPanelId: string | null = null;
    
    // Find an unpinned panel to use (excluding explorer panels)
    const allPanels = document.querySelectorAll('.bsp-panel:not(.explorer-panel)');
    
    // First, try the focused panel if it's unpinned
    const focusedPanel = document.querySelector('.bsp-panel.focused:not(.explorer-panel)');
    if (focusedPanel) {
      const isPinned = focusedPanel.classList.contains('is-pinned');
      if (!isPinned) {
        targetPanelId = focusedPanel.getAttribute('data-panel-id');
      }
    }
    
    // If focused panel is pinned or doesn't exist, find ANY unpinned panel
    if (!targetPanelId) {
      for (const panel of allPanels) {
        const isPinned = panel.classList.contains('is-pinned');
        if (!isPinned) {
          targetPanelId = panel.getAttribute('data-panel-id');
          break;
        }
      }
    }

    // Only create a new panel if all existing panels are pinned
    if (!targetPanelId) {
      targetPanelId = this.bspManager.addPanel('right');
      if (!targetPanelId) return;
    }

    // Update panel content with file
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${targetPanelId}"]`);
    if (!panel) {
      console.error('Panel not found with ID:', targetPanelId);
      return;
    }

    const header = panel.querySelector('.bsp-panel-header .panel-title span') as HTMLElement;
    const content = panel.querySelector('.panel-content') as HTMLElement;
    
    if (header) {
      header.textContent = fileName;
    }

    if (content) {
      // Show loading state
      content.innerHTML = '<div class="file-loading">Loading file...</div>';

      try {
        const fileType = getFileType(fileName);

        // Read file content
        const file = await fileHandle.getFile();

        // Display file content based on type
        if (fileType === 'file-image') {
          // For images, create object URL
          const url = URL.createObjectURL(file);
          content.innerHTML = `<div class="file-preview image-preview">
            <img src="${url}" alt="${fileName}" onload="URL.revokeObjectURL(this.src)" />
          </div>`;
        } else if (file.type.startsWith('text/') || fileType === 'file-code' || file.size < 1024 * 1024) {
          // For text files or small files, read as text
          const text = await file.text();
          content.innerHTML = `<div class="file-content">
            <pre class="file-text">${this.escapeHtml(text)}</pre>
          </div>`;
        } else {
          // For other files, show info
          content.innerHTML = `<div class="file-info">
            <p>File: ${fileName}</p>
            <p>Type: ${file.type || 'Unknown'}</p>
            <p>Size: ${this.formatFileSize(file.size)}</p>
            <p>Last Modified: ${new Date(file.lastModified).toLocaleString()}</p>
          </div>`;
        }

        // Store file info in panel
        panel.setAttribute('data-file-name', fileName);
        panel.setAttribute('data-file-handle', 'native');
        
        // Focus the panel that now contains the file
        this.focusPanel(panel);

      } catch (error) {
        console.error('Error loading file:', error);
        content.innerHTML = `<div class="file-error">
          <p>Failed to load file: ${fileName}</p>
          <p class="error-message">${error}</p>
        </div>`;
      }
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

}