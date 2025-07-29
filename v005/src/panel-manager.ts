// Panel Manager - Simple fixed layout system
import { FIXED_PANELS, DEFAULT_MARKDOWN_CONTENT } from './default-layout';
import { BSPPanelManager } from './bsp-manager';
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
  private fileExplorerWidth: number = 280;
  private isResizingFileExplorer: boolean = false;
  private showExplorerDetail: boolean = false;
  private explorerDetailHeight: number = 120;
  private bspManager: BSPPanelManager | null = null;

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

    // Position file explorer panel - between left toolbar and main panel
    const fileExplorerPanel = this.panels.get('file-explorer-panel');
    if (fileExplorerPanel) {
      Object.assign(fileExplorerPanel.element.style, {
        position: 'fixed',
        left: `${toolbarWidth}px`,
        top: `${headerHeight}px`,
        width: `${this.fileExplorerWidth}px`,
        height: `${viewportHeight - headerHeight - footerHeight}px`,
        zIndex: '150'
      });
      
      // Add resize handle
      this.addFileExplorerResizeHandle(fileExplorerPanel.element);
    }

    // Position main panel - center area between file explorer and properties with gap
    const gap = 8; // Gap between explorer and main content
    const mainPanel = this.panels.get('main-panel');
    if (mainPanel) {
      Object.assign(mainPanel.element.style, {
        position: 'fixed',
        left: `${toolbarWidth + this.fileExplorerWidth + gap}px`,
        top: `${headerHeight}px`,
        width: `${viewportWidth - toolbarWidth - this.fileExplorerWidth - propertiesWidth - gap}px`,
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
      const fileExplorerResizeHandle = (e.target as HTMLElement).closest('.file-explorer-resize-handle');
      
      if (footerResizeHandle) {
        this.startResize(e);
      } else if (propertiesResizeHandle) {
        this.startPropertiesResize(e);
      } else if (fileExplorerResizeHandle) {
        this.startFileExplorerResize(e);
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isResizing) {
        this.handleResize(e);
      } else if (this.isResizingProperties) {
        this.handlePropertiesResize(e);
      } else if (this.isResizingFileExplorer) {
        this.handleFileExplorerResize(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isResizing) {
        this.stopResize();
      } else if (this.isResizingProperties) {
        this.stopPropertiesResize();
      } else if (this.isResizingFileExplorer) {
        this.stopFileExplorerResize();
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
      this.bspManager.addPanel();
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

    // Update file explorer height immediately
    const fileExplorerPanel = this.panels.get('file-explorer-panel');
    if (fileExplorerPanel) {
      fileExplorerPanel.element.style.height = `${viewportHeight - headerHeight - footerHeight}px`;
    }

    // Update main panel dimensions immediately
    const gap = 8; // Gap between explorer and main content
    const mainPanel = this.panels.get('main-panel');
    if (mainPanel) {
      mainPanel.element.style.left = `${toolbarWidth + this.fileExplorerWidth + gap}px`;
      mainPanel.element.style.width = `${viewportWidth - toolbarWidth - this.fileExplorerWidth - propertiesWidth - gap}px`;
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
    } else if (panel.id === 'file-explorer-panel') {
      this.setupFileExplorerPanel(panel);
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

  private setupFileExplorerPanel(panel: Panel): void {
    panel.element.classList.add('file-explorer-panel');
    const body = panel.element.querySelector('.panel-body');
    if (body) {
      body.innerHTML = `
        <div class="file-explorer-split-container">
          <div class="file-explorer-tree-section">
            <div class="file-explorer-content">
              <div class="tree" aria-label="File Explorer">
                <div class="tree-item" role="treeitem" aria-expanded="true">
                  <div class="tree-item-content" data-is-folder="true">
                    <button class="tree-item-toggle" aria-label="Toggle node">
                      <i data-lucide="chevron-down" class="lucide"></i>
                    </button>
                    <i data-lucide="folder-open" class="lucide tree-item-icon" data-file-type="folder"></i>
                    <span class="tree-item-label">FileUI</span>
                  </div>
                  <div class="tree-item-children" role="group">
                    <div class="tree-item" role="treeitem" aria-expanded="false">
                      <div class="tree-item-content" data-is-folder="true">
                        <button class="tree-item-toggle" aria-label="Toggle node">
                          <i data-lucide="chevron-right" class="lucide"></i>
                        </button>
                        <i data-lucide="folder" class="lucide tree-item-icon" data-file-type="folder"></i>
                        <span class="tree-item-label">src</span>
                      </div>
                    </div>
                    <div class="tree-item" role="treeitem" aria-expanded="false">
                      <div class="tree-item-content" data-is-folder="true">
                        <button class="tree-item-toggle" aria-label="Toggle node">
                          <i data-lucide="chevron-right" class="lucide"></i>
                        </button>
                        <i data-lucide="folder" class="lucide tree-item-icon" data-file-type="folder"></i>
                        <span class="tree-item-label">public</span>
                      </div>
                    </div>
                    <div class="tree-item" role="treeitem">
                      <div class="tree-item-content" data-file-name="package.json">
                        <div class="tree-item-spacer"></div>
                        <i data-lucide="file-text" class="lucide tree-item-icon" data-file-type="json"></i>
                        <span class="tree-item-label">package.json</span>
                      </div>
                    </div>
                    <div class="tree-item" role="treeitem">
                      <div class="tree-item-content" data-file-name="vite.config.ts">
                        <div class="tree-item-spacer"></div>
                        <i data-lucide="file-code" class="lucide tree-item-icon" data-file-type="typescript"></i>
                        <span class="tree-item-label">vite.config.ts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="explorer-detail-resizer" style="display: none;"></div>
          <div class="file-explorer-detail-section" style="display: none;">
            <div class="explorer-detail-header">
              <span class="explorer-detail-title"></span>
              <button class="explorer-detail-close" aria-label="Close detail">
                <i data-lucide="x" class="lucide"></i>
              </button>
            </div>
            <div class="explorer-detail-content">
              <div class="explorer-detail-empty">Select a file to view details</div>
            </div>
          </div>
        </div>
      `;
      
      // Setup tree interactions
      this.setupFileExplorerInteractions();
      
      // Re-initialize Lucide icons for new elements
      setTimeout(() => {
        if ((window as any).lucide) {
          (window as any).lucide.createIcons();
        }
      }, 50);
    }
  }
  
  private setupFileExplorerInteractions(): void {
    // Add click handlers for tree items
    const fileExplorer = document.querySelector('.file-explorer-panel');
    if (!fileExplorer) return;
    
    // Handle tree toggle clicks
    fileExplorer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const toggleBtn = target.closest('.tree-item-toggle') as HTMLElement;
      
      if (toggleBtn) {
        const treeItem = toggleBtn.closest('.tree-item') as HTMLElement;
        if (treeItem) {
          const isExpanded = treeItem.getAttribute('aria-expanded') === 'true';
          treeItem.setAttribute('aria-expanded', (!isExpanded).toString());
          
          // Update chevron icon
          const icon = toggleBtn.querySelector('.lucide');
          if (icon) {
            icon.setAttribute('data-lucide', isExpanded ? 'chevron-right' : 'chevron-down');
            // Re-render lucide icons
            if ((window as any).lucide) {
              (window as any).lucide.createIcons();
            }
          }
        }
      }
      
      // Handle tree item selection
      const treeItemContent = target.closest('.tree-item-content') as HTMLElement;
      if (treeItemContent && !toggleBtn) {
        // Remove previous selection
        fileExplorer.querySelectorAll('.tree-item-content').forEach(item => {
          item.classList.remove('selected');
          item.removeAttribute('tabindex');
        });
        // Add selection to clicked item
        treeItemContent.classList.add('selected');
        treeItemContent.setAttribute('tabindex', '0');
        treeItemContent.focus();
        
        // Show detail panel for files
        const fileName = treeItemContent.getAttribute('data-file-name');
        if (fileName) {
          this.showFileDetail(fileName);
          // Open file in focused BSP panel
          this.openFileInFocusedPanel(fileName);
        }
      }
    });
    
    // Handle detail close button
    const closeBtn = fileExplorer.querySelector('.explorer-detail-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideFileDetail();
      });
    }
  }
  
  private showFileDetail(fileName: string): void {
    const detailSection = document.querySelector('.file-explorer-detail-section') as HTMLElement;
    const treeSection = document.querySelector('.file-explorer-tree-section') as HTMLElement;
    const detailTitle = document.querySelector('.explorer-detail-title') as HTMLElement;
    const detailContent = document.querySelector('.explorer-detail-content') as HTMLElement;
    const resizer = document.querySelector('.explorer-detail-resizer') as HTMLElement;
    
    if (!detailSection || !treeSection || !detailTitle || !detailContent || !resizer) return;
    
    // Update detail content
    detailTitle.textContent = fileName;
    detailContent.innerHTML = `
      <div class="explorer-detail-info">
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${fileName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Type:</span>
          <span class="detail-value">${fileName.split('.').pop()?.toUpperCase() || 'File'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Size:</span>
          <span class="detail-value">12.5 KB</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Modified:</span>
          <span class="detail-value">2 hours ago</span>
        </div>
      </div>
    `;
    
    // Show detail panel - ultra thin
    treeSection.style.height = '70%';
    resizer.style.display = 'block';
    detailSection.style.display = 'flex';
    detailSection.style.height = 'calc(30% - 3px)';
    this.showExplorerDetail = true;
  }
  
  private hideFileDetail(): void {
    const detailSection = document.querySelector('.file-explorer-detail-section') as HTMLElement;
    const treeSection = document.querySelector('.file-explorer-tree-section') as HTMLElement;
    const resizer = document.querySelector('.explorer-detail-resizer') as HTMLElement;
    
    if (!detailSection || !treeSection || !resizer) return;
    
    // Hide detail panel
    treeSection.style.height = '100%';
    resizer.style.display = 'none';
    detailSection.style.display = 'none';
    this.showExplorerDetail = false;
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

  private addFileExplorerResizeHandle(fileExplorerElement: HTMLElement): void {
    // Remove existing resize handle
    const existingHandle = fileExplorerElement.querySelector('.file-explorer-resize-handle');
    if (existingHandle) {
      existingHandle.remove();
    }

    // Create new resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'file-explorer-resize-handle';
    resizeHandle.innerHTML = '<div class="resize-handle-bar"></div>';
    
    fileExplorerElement.appendChild(resizeHandle);
  }

  private startFileExplorerResize(e: MouseEvent): void {
    this.isResizingFileExplorer = true;
    document.body.style.cursor = 'ew-resize';
    document.body.classList.add('no-transition');
    e.preventDefault();
  }

  private handleFileExplorerResize(e: MouseEvent): void {
    if (!this.isResizingFileExplorer) return;

    const toolbarWidth = 48;
    const newFileExplorerWidth = e.clientX - toolbarWidth;
    
    const minWidth = 150;
    const maxWidth = window.innerWidth * 0.4;
    
    this.fileExplorerWidth = Math.max(minWidth, Math.min(maxWidth, newFileExplorerWidth));
    this.layout();
  }

  private stopFileExplorerResize(): void {
    this.isResizingFileExplorer = false;
    document.body.style.cursor = '';
    document.body.classList.remove('no-transition');
  }

  private async openFileInFocusedPanel(fileName: string): Promise<void> {
    if (!this.bspManager) return;
    
    try {
      // For now, simulate reading a file by creating content based on file type
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      let content = '';
      
      if (['js', 'ts', 'tsx', 'jsx', 'py', 'cpp', 'c', 'h', 'java', 'cs'].includes(extension)) {
        content = `// ${fileName}\n// This is a code file preview\n\nfunction example() {\n  console.log('File: ${fileName}');\n  return true;\n}`;
      } else if (['json'].includes(extension)) {
        content = `{\n  "name": "${fileName}",\n  "type": "configuration",\n  "description": "File content preview"\n}`;
      } else if (['md', 'txt'].includes(extension)) {
        content = `# ${fileName}\n\nThis is a preview of the file content.\n\n- File name: ${fileName}\n- Type: ${extension}\n- Status: Preview mode`;
      } else if (['html', 'htm'].includes(extension)) {
        content = `<!DOCTYPE html>\n<html>\n<head>\n  <title>${fileName}</title>\n</head>\n<body>\n  <h1>File: ${fileName}</h1>\n  <p>HTML file preview</p>\n</body>\n</html>`;
      } else if (['css', 'scss', 'sass'].includes(extension)) {
        content = `/* ${fileName} */\n\n.preview {\n  display: block;\n  content: "${fileName}";\n  color: #00cc8b;\n}`;
      } else {
        content = `File: ${fileName}\nType: ${extension}\n\nThis is a preview of the file content.\nIntegration with actual file reading will be implemented next.`;
      }
      
      // Update the focused panel content
      this.bspManager.updateFocusedPanelContent(fileName, content);
      
    } catch (error) {
      console.error('Failed to open file:', error);
      
      // Show error in focused panel
      if (this.bspManager) {
        this.bspManager.updateFocusedPanelContent(
          `Error: ${fileName}`, 
          `Failed to load file: ${fileName}\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }
}