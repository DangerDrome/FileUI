// Panel Manager - Simple fixed layout system
import { BSPPanelManager } from './bsp-manager';
import { ServerFileSystem, FileItem, sortFiles, getFileType, formatFileSize } from './filemanager';
import { R2FileSystem } from './r2-filesystem';
import { GoogleDriveFileSystem } from './google-drive-filesystem';
import { escapeHtml } from './utils/strings';
import { getFileIcon, getFileIconColor } from './utils/ui';
import { formatTime } from './utils/time';
import MarkdownIt from 'markdown-it';
import { ContextMenuManager, ContextMenuItem } from './context-menu';
import { ImageSequencePlayer } from './sequence-player';
import { detectSequences, SequenceInfo, isSequenceableImage, parseSequenceFrame } from './sequence-utils';

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
  private r2FileSystems: Map<string, R2FileSystem> = new Map();
  private googleDriveCredentials: Map<string, any> = new Map();
  private googleDriveFileSystems: Map<string, GoogleDriveFileSystem> = new Map();
  private r2ExpandedFolders: Map<string, Set<string>> = new Map(); // panelId -> Set of expanded folder paths
  private r2SelectedItems: Map<string, Set<string>> = new Map(); // panelId -> Set of selected item paths
  private r2LastSelectedItem: Map<string, string> = new Map(); // panelId -> last selected item path
  private md: MarkdownIt;
  private contextMenu: ContextMenuManager;
  private dragDropInitialized: boolean = false;
  private currentlyOpenFile: string | null = null;
  private dragCleanupTimer: number | null = null;
  private currentPath: string = '.';
  // Store native file handles for sequences - key is "folderPath/sequenceName"
  private nativeSequenceHandles: Map<string, Map<string, FileSystemFileHandle>> = new Map();

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
    
    // Set up global drag cleanup
    this.setupGlobalDragCleanup();
    
    // Load recent layouts from localStorage
    const savedLayouts = localStorage.getItem('fileui-recent-layouts');
    if (savedLayouts) {
      try {
        this.recentLayouts = JSON.parse(savedLayouts);
      } catch (error) {
      }
    }
    
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

  private handleR2ItemSelection(panelId: string, itemPath: string, event: MouseEvent): void {
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;
    
    const treeContainer = panel.querySelector('.tree');
    if (!treeContainer) return;
    
    // Initialize selection set if needed
    if (!this.r2SelectedItems.has(panelId)) {
      this.r2SelectedItems.set(panelId, new Set());
    }
    
    const selectedItems = this.r2SelectedItems.get(panelId)!;
    const lastSelected = this.r2LastSelectedItem.get(panelId);
    
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd click - toggle selection
      if (selectedItems.has(itemPath)) {
        selectedItems.delete(itemPath);
      } else {
        selectedItems.add(itemPath);
      }
    } else if (event.shiftKey && lastSelected) {
      // Shift click - select range
      const allItems = Array.from(treeContainer.querySelectorAll('.tree-item'));
      const startIndex = allItems.findIndex(el => el.getAttribute('data-path') === lastSelected);
      const endIndex = allItems.findIndex(el => el.getAttribute('data-path') === itemPath);
      
      if (startIndex !== -1 && endIndex !== -1) {
        const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        
        // Clear existing selection
        selectedItems.clear();
        
        // Select all items in range
        for (let i = from; i <= to; i++) {
          const path = allItems[i].getAttribute('data-path');
          if (path) {
            selectedItems.add(path);
          }
        }
      }
    } else {
      // Regular click - single selection
      selectedItems.clear();
      selectedItems.add(itemPath);
    }
    
    // Update last selected
    this.r2LastSelectedItem.set(panelId, itemPath);
    
    // Update visual selection
    treeContainer.querySelectorAll('.tree-item').forEach(item => {
      const path = item.getAttribute('data-path');
      const content = item.querySelector('.tree-item-content');
      if (content) {
        if (path && selectedItems.has(path)) {
          content.classList.add('selected');
          content.classList.add('focused');
        } else {
          content.classList.remove('selected');
          content.classList.remove('focused');
        }
      }
    });
  }

  private setupGlobalDragCleanup(): void {
    // Clean up on any drag end
    document.addEventListener('dragend', () => {
      this.cleanupAllDragHighlights();
    });
    
    // Also clean up if drag leaves the window
    document.addEventListener('dragleave', (e) => {
      if (e.clientY <= 0 || e.clientX <= 0 || 
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        this.cleanupAllDragHighlights();
      }
    });
    
    // Clean up on mouse up (in case drag end doesn't fire)
    document.addEventListener('mouseup', () => {
      if (this.dragCleanupTimer) {
        clearTimeout(this.dragCleanupTimer);
      }
      this.dragCleanupTimer = window.setTimeout(() => {
        this.cleanupAllDragHighlights();
      }, 100);
    });
    
    // Clean up on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cleanupAllDragHighlights();
      }
    });
  }
  
  private cleanupAllDragHighlights(): void {
    // Remove all drag-related classes from all elements
    const dragClasses = ['drag-over', 'drag-over-before', 'drag-over-after', 'drag-over-divider', 'dragging'];
    dragClasses.forEach(className => {
      document.querySelectorAll(`.${className}`).forEach(el => {
        el.classList.remove(className);
      });
    });
    
    // Extra cleanup for panel-content and nested elements
    document.querySelectorAll('.panel-content').forEach(el => {
      el.classList.remove('drag-over');
    });
    document.querySelectorAll('.r2-browser').forEach(el => {
      el.classList.remove('drag-over');
    });
    document.querySelectorAll('.file-explorer-content').forEach(el => {
      el.classList.remove('drag-over');
    });
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
    
    // If there's a focused panel and it's not an explorer panel, not an R2 panel, not a Google Drive panel, and not pinned
    if (focusedPanel && !focusedPanel.classList.contains('explorer-panel')) {
      const panelType = focusedPanel.getAttribute('data-panel-type');
      if (panelType !== 'r2-browser' && panelType !== 'r2-config' && 
          panelType !== 'google-drive-config' && panelType !== 'google-drive-browser') {
        const panelId = focusedPanel.getAttribute('data-panel-id');
        if (panelId) {
          const isPinnedEl = (focusedPanel as HTMLElement).classList.contains('is-pinned');
          if (!isPinnedEl) {
            // Use the focused panel only if it's not pinned
            return panelId;
          }
        }
      }
    }
    
    // Find the first non-explorer, non-R2, non-Google Drive, non-pinned panel
    const allPanels = document.querySelectorAll('.bsp-panel:not(.explorer-panel)');
    for (const panel of allPanels) {
      const panelType = panel.getAttribute('data-panel-type');
      if (panelType === 'r2-browser' || panelType === 'r2-config' ||
          panelType === 'google-drive-config' || panelType === 'google-drive-browser') {
        continue; // Skip R2 and Google Drive panels
      }
      
      const panelId = panel.getAttribute('data-panel-id');
      if (panelId) {
        const isPinnedEl = (panel as HTMLElement).classList.contains('is-pinned');
        if (!isPinnedEl) {
          // Use the first available non-explorer, non-R2, non-pinned panel
          this.focusPanel(panel);
          return panelId;
        }
      }
    }

    // Only create a new panel if no non-explorer panels exist
    console.log('Creating new panel via BSP manager');
    const newPanelId = this.bspManager.addPanel('right');
    
    // Focus the newly created panel
    if (newPanelId) {
      console.log('New panel created with ID:', newPanelId);
      // Wait for panel to be created in DOM
      setTimeout(() => {
        const newPanel = document.querySelector(`.bsp-panel[data-panel-id="${newPanelId}"]`);
        if (newPanel) {
          console.log('Panel found in DOM');
          this.focusPanel(newPanel);
          // Ensure panel is ready
          const panelContent = newPanel.querySelector('.panel-content');
          if (!panelContent) {
          }
        } else {
        }
      }, 50); // Increased timeout
    } else {
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
          // Check if this image is part of a sequence
          if (isSequenceableImage(fileName)) {
            const parsed = parseSequenceFrame(fileName);
            if (parsed && parsed.padding >= 3) {
              // Check server for full sequence
              try {
                const response = await fetch(`http://localhost:8000/api/sequence?path=${encodeURIComponent(source)}`);
                const sequenceData = await response.json();
                
                if (sequenceData.is_sequence && sequenceData.files.length > 1) {
                  
                  // Create sequence player
                  const containerId = `sequence-container-${Date.now()}`;
                  content.innerHTML = `<div id="${containerId}" style="width: 100%; height: 100%;"></div>`;
                  const sequencePlayer = new ImageSequencePlayer(content.querySelector(`#${containerId}`)!);
                  
                  // Create sequence info from server data
                  const sequenceInfo: SequenceInfo = {
                    baseName: sequenceData.base_name,
                    padding: sequenceData.padding,
                    startFrame: sequenceData.start_frame,
                    endFrame: sequenceData.end_frame,
                    frameCount: sequenceData.frame_count,
                    extension: sequenceData.extension,
                    delimiter: sequenceData.delimiter,
                    pattern: `${sequenceData.base_name}${sequenceData.delimiter}${'#'.repeat(sequenceData.padding)}.${sequenceData.extension}`,
                    files: sequenceData.files.map((f: any) => f.name)
                  };
                  
                  // Build URLs for all frames
                  const frameUrls = sequenceData.files.map((f: any) => 
                    `http://localhost:8000/api/file?path=${encodeURIComponent(f.path)}`
                  );
                  
                  // Load the sequence and auto-play
                  await sequencePlayer.loadSequence(sequenceInfo, '', frameUrls);
                  sequencePlayer.play();
                  
                  // Initialize Lucide icons
                  this.initializeLucideIcons();
                  return;
                }
              } catch (error) {
              }
            }
          }
          
          // Not a sequence, load as regular image
          const imageUrl = `http://localhost:8000/api/file?path=${encodeURIComponent(source)}`;
          content.innerHTML = `<div class="file-preview image-preview">
            <img src="${imageUrl}" alt="${fileName}" />
          </div>`;
        } else if (fileType === 'file-video') {
          const videoUrl = `http://localhost:8000/api/file?path=${encodeURIComponent(source)}`;
          const ext = fileName.split('.').pop()?.toLowerCase() || '';
          
          content.innerHTML = `
            <div class="video-player" style="display: flex; flex-direction: column; height: 100%;">
              <video autoplay muted preload="metadata"
                     style="flex: 1; width: 100%; background: #000;">
                <source src="${videoUrl}" type="video/${ext === 'mov' ? 'quicktime' : ext}">
                Your browser does not support this video format.
              </video>
              <div class="video-controls" style="display: flex; align-items: center; padding: 8px; background: var(--bg-secondary); border-top: 1px solid var(--border-color);">
                <button class="btn btn-sm" data-action="play">
                  <i data-lucide="play" width="16" height="16"></i>
                </button>
                <div class="timeline">
                  <div class="timeline-ticks"></div>
                  <div class="timeline-track">
                    <div class="timeline-progress"></div>
                    <div class="timeline-handle" style="left: 0%;">
                      <div class="timeline-playhead-label">0:00</div>
                      <div class="timeline-playhead-line"></div>
                    </div>
                  </div>
                </div>
                <span class="video-time-label" style="font-size: 12px; color: var(--color-text-secondary); min-width: 90px; margin: 0 8px;">0:00 / 0:00</span>
                <div class="volume-control" style="position: relative; display: inline-flex; align-items: center;">
                  <button class="btn btn-sm" data-action="volume">
                    <i data-lucide="volume-2" width="16" height="16"></i>
                  </button>
                  <div class="volume-slider-popup" style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px; background: #161614; border-radius: 6px; padding: 8px 12px; display: none; box-shadow: 0 -4px 12px rgba(0,0,0,0.8); z-index: 1000;">
                    <input type="range" min="0" max="100" value="0" style="width: 100px;">
                  </div>
                </div>
                <button class="btn btn-sm" data-action="fullscreen">
                  <i data-lucide="maximize" width="16" height="16"></i>
                </button>
              </div>
            </div>
          `;
          
          // Setup video player controls
          this.setupVideoPlayer(content);
          // Initialize Lucide icons for the video controls
          this.initializeLucideIcons();
          
          // Add enhanced error handling
          const video = content.querySelector('video');
          if (video) {
            video.addEventListener('error', (e) => {
              const errorMsg = ext === 'mov' 
                ? `<div class="video-error" style="padding: 20px; text-align: center;">
                     <h3>Unable to play .MOV file</h3>
                     <p>Chrome cannot play this .MOV file due to codec incompatibility.</p>
                     <p>The file likely uses ProRes, HEVC, or another codec not supported by Chrome.</p>
                     <p><strong>Solutions:</strong></p>
                     <ul style="list-style: none; padding: 0;">
                       <li>• Convert to MP4 (H.264/AAC) using FFmpeg or similar tools</li>
                       <li>• Try opening in Safari (better .MOV support)</li>
                       <li>• Use a desktop video player like VLC</li>
                     </ul>
                   </div>`
                : `<div class="video-error">Failed to load video: ${fileName}</div>`;
              content.innerHTML = errorMsg;
            });
            
            // Handle video metadata load
            video.addEventListener('loadedmetadata', () => {
              // Metadata loaded successfully
            });
          }
        } else if (fileType === 'markdown' || fileName.endsWith('.md')) {
          const fs = new ServerFileSystem('http://localhost:8000/api');
          const fileContent = await fs.readFile(source);
          const renderedHtml = this.md.render(fileContent);
          content.innerHTML = `<div class="file-content markdown-content">
            ${renderedHtml}
          </div>`;
        } else if (fileType === 'file-pdf') {
          content.innerHTML = `<div class="file-preview pdf-preview">
            <iframe src="http://localhost:8000/api/file?path=${encodeURIComponent(source)}" 
                    width="100%" 
                    height="100%" 
                    frameborder="0">
            </iframe>
          </div>`;
        } else {
          const fs = new ServerFileSystem('http://localhost:8000/api');
          const fileContent = await fs.readFile(source);
          content.innerHTML = `<div class="file-content">
            <pre class="file-text">${escapeHtml(fileContent)}</pre>
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
          const ext = fileName.split('.').pop()?.toLowerCase() || '';
          
          content.innerHTML = `
            <div class="video-player" style="display: flex; flex-direction: column; height: 100%;">
              <video autoplay muted preload="metadata"
                     style="flex: 1; width: 100%; background: #000;">
                <source src="${url}" type="${file.type || `video/${ext === 'mov' ? 'quicktime' : ext}`}">
                Your browser does not support this video format.
              </video>
              <div class="video-controls" style="display: flex; align-items: center; padding: 8px; background: var(--bg-secondary); border-top: 1px solid var(--border-color);">
                <button class="btn btn-sm" data-action="play">
                  <i data-lucide="play" width="16" height="16"></i>
                </button>
                <div class="timeline">
                  <div class="timeline-ticks"></div>
                  <div class="timeline-track">
                    <div class="timeline-progress"></div>
                    <div class="timeline-handle" style="left: 0%;">
                      <div class="timeline-playhead-label">0:00</div>
                      <div class="timeline-playhead-line"></div>
                    </div>
                  </div>
                </div>
                <span class="video-time-label" style="font-size: 12px; color: var(--color-text-secondary); min-width: 90px; margin: 0 8px;">0:00 / 0:00</span>
                <div class="volume-control" style="position: relative; display: inline-flex; align-items: center;">
                  <button class="btn btn-sm" data-action="volume">
                    <i data-lucide="volume-2" width="16" height="16"></i>
                  </button>
                  <div class="volume-slider-popup" style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px; background: #161614; border-radius: 6px; padding: 8px 12px; display: none; box-shadow: 0 -4px 12px rgba(0,0,0,0.8); z-index: 1000;">
                    <input type="range" min="0" max="100" value="0" style="width: 100px;">
                  </div>
                </div>
                <button class="btn btn-sm" data-action="fullscreen">
                  <i data-lucide="maximize" width="16" height="16"></i>
                </button>
              </div>
            </div>
          `;
          
          // Setup video player controls
          this.setupVideoPlayer(content);
          // Initialize Lucide icons for the video controls
          this.initializeLucideIcons();
          
          // Add enhanced error handling
          const video = content.querySelector('video');
          if (video) {
            video.addEventListener('error', (e) => {
              URL.revokeObjectURL(url); // Clean up on error
              const errorMsg = ext === 'mov' 
                ? `<div class="video-error" style="padding: 20px; text-align: center;">
                     <h3>Unable to play .MOV file</h3>
                     <p>Chrome cannot play this .MOV file due to codec incompatibility.</p>
                     <p>The file likely uses ProRes, HEVC, or another codec not supported by Chrome.</p>
                     <p><strong>Solutions:</strong></p>
                     <ul style="list-style: none; padding: 0;">
                       <li>• Convert to MP4 (H.264/AAC) using FFmpeg or similar tools</li>
                       <li>• Try opening in Safari (better .MOV support)</li>
                       <li>• Use a desktop video player like VLC</li>
                     </ul>
                   </div>`
                : `<div class="video-error">Failed to load video: ${fileName}</div>`;
              content.innerHTML = errorMsg;
            });
            
            // Handle video metadata when loaded
            video.addEventListener('loadedmetadata', () => {
              // Metadata is now available
            });
            
            // Clean up blob URL when video is removed
            video.addEventListener('loadeddata', () => {
              // Video has loaded, can safely revoke after a delay
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
          }
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
            <pre class="file-text">${escapeHtml(text)}</pre>
          </div>`;
        } else {
          content.innerHTML = `<div class="file-info">
            <p>File: ${fileName}</p>
            <p>Type: ${file.type || 'Unknown'}</p>
            <p>Size: ${formatFileSize(file.size)}</p>
            <p>Last Modified: ${new Date(file.lastModified).toLocaleString()}</p>
          </div>`;
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      content.innerHTML = `<div class="file-error" style="text-align: center; padding: 40px; color: var(--error);">
        <i data-lucide="alert-circle" class="lucide" style="width: 48px; height: 48px; margin: 0 auto 16px;"></i>
        <h3 style="margin: 0 0 8px;">Failed to load file</h3>
        <p style="margin: 0 0 4px; color: var(--text-primary);">${escapeHtml(fileName)}</p>
        <p style="margin: 0; font-size: 0.9em; opacity: 0.8;">${escapeHtml(errorMessage)}</p>
      </div>`;
      // Re-initialize Lucide icons for the error icon
      this.initializeLucideIcons(10);
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
      
      // BSP container styles
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
      // Skip layout during fullscreen to prevent fullscreen exit
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        return;
      }
      this.layout();
      this.refreshDividerDragAndDrop();
    });

    // Monitor for panel removals to clean up R2 connections
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.classList.contains('bsp-panel')) {
            const panelId = node.getAttribute('data-panel-id');
            const panelType = node.getAttribute('data-panel-type');
            
            // Clean up R2 connection if this was an R2 browser panel
            if (panelId && panelType === 'r2-browser') {
              console.log('R2 browser panel closed, disconnecting:', panelId);
              this.r2FileSystems.delete(panelId);
            }
          }
        });
      });
    });

    // Observe the BSP container for panel removals
    const bspContainer = document.getElementById('main-panel');
    if (bspContainer) {
      observer.observe(bspContainer, { childList: true, subtree: true });
    }
    
    
    // Handle toolbar button clicks and menu triggers
    this.container.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('button[data-action]') as HTMLButtonElement;
      
      if (button) {
        // Check if this is a menu trigger button
        if (button.classList.contains('menu-trigger')) {
          const action = button.dataset.action;
          this.handleMenuTrigger(action!, button);
        } else {
          // Only handle if it's not inside a BSP panel
          const bspPanel = button.closest('.bsp-panel');
          if (!bspPanel) {
            this.handleToolbarButtonClick(button);
          }
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
              this.bspManager.closePanel(panelId);
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
      if (target.closest('.tree-item-content') || 
          target.closest('.file-preview') || 
          target.closest('.file-info') ||
          target.closest('.image-viewer') ||
          target.closest('.video-player') ||
          target.closest('.markdown-content') ||
          target.closest('.file-content')) {
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
              } else {
              }
            } else {
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

  private recentLayouts: Array<{name: string, data: string, timestamp: number}> = [];
  private maxRecentLayouts = 5;

  private handleMenuTrigger(action: string, trigger: HTMLElement): void {
    // Close any open menus first
    document.querySelectorAll('.menu-dropdown').forEach(menu => menu.remove());
    
    const rect = trigger.getBoundingClientRect();
    const dropdown = document.createElement('div');
    dropdown.className = 'menu-dropdown';
    dropdown.style.position = 'fixed';
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom}px`;
    dropdown.style.zIndex = '9999';
    
    switch (action) {
      case 'file':
        dropdown.innerHTML = this.createFileMenu();
        break;
      case 'edit':
        dropdown.innerHTML = '<div class="menu-item disabled">Edit menu coming soon</div>';
        break;
      case 'view':
        dropdown.innerHTML = '<div class="menu-item disabled">View menu coming soon</div>';
        break;
      case 'terminal-menu':
        dropdown.innerHTML = '<div class="menu-item disabled">Terminal menu coming soon</div>';
        break;
      case 'help':
        dropdown.innerHTML = '<div class="menu-item disabled">Help menu coming soon</div>';
        break;
    }
    
    document.body.appendChild(dropdown);
    
    // Initialize lucide icons
    this.initializeLucideIcons(0);
    
    // Set up menu item clicks
    dropdown.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.menu-item') as HTMLElement;
      if (item && !item.classList.contains('disabled')) {
        const action = item.dataset.action;
        if (action) {
          this.handleMenuAction(action, item);
        }
        dropdown.remove();
      }
    });
    
    // Close menu when clicking outside
    setTimeout(() => {
      const closeMenu = (e: MouseEvent) => {
        if (!dropdown.contains(e.target as Node) && e.target !== trigger) {
          dropdown.remove();
          document.removeEventListener('click', closeMenu);
        }
      };
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  private createFileMenu(): string {
    const recentLayoutsHtml = this.recentLayouts.length > 0 
      ? this.recentLayouts.map((layout, index) => `
          <div class="menu-item" data-action="load-recent-${index}">
            <i data-lucide="clock" class="lucide menu-icon"></i>
            <span>${layout.name}</span>
            <span class="menu-shortcut">${new Date(layout.timestamp).toLocaleDateString()}</span>
          </div>
        `).join('')
      : '<div class="menu-item disabled">No recent layouts</div>';

    return `
      <div class="menu-item" data-action="save-layout">
        <i data-lucide="save" class="lucide menu-icon"></i>
        <span>Save Layout</span>
        <span class="menu-shortcut">Ctrl+S</span>
      </div>
      <div class="menu-item" data-action="save-layout-as">
        <i data-lucide="save" class="lucide menu-icon"></i>
        <span>Save Layout As...</span>
      </div>
      <div class="menu-separator"></div>
      <div class="menu-item" data-action="load-layout">
        <i data-lucide="folder-open" class="lucide menu-icon"></i>
        <span>Load Layout</span>
        <span class="menu-shortcut">Ctrl+O</span>
      </div>
      <div class="menu-item menu-submenu">
        <i data-lucide="history" class="lucide menu-icon"></i>
        <span>Recent Layouts</span>
        <i data-lucide="chevron-right" class="lucide menu-chevron"></i>
        <div class="submenu">
          ${recentLayoutsHtml}
        </div>
      </div>
      <div class="menu-separator"></div>
      <div class="menu-item" data-action="reset-layout">
        <i data-lucide="refresh-cw" class="lucide menu-icon"></i>
        <span>Reset Layout</span>
      </div>
    `;
  }

  private handleMenuAction(action: string, item: HTMLElement): void {
    if (action === 'save-layout') {
      this.saveLayout();
    } else if (action === 'save-layout-as') {
      this.saveLayoutAs();
    } else if (action === 'load-layout') {
      this.loadLayout();
    } else if (action === 'reset-layout') {
      this.bspManager.resetToSinglePanel();
    } else if (action.startsWith('load-recent-')) {
      const index = parseInt(action.split('-')[2]);
      this.loadRecentLayout(index);
    }
  }

  private saveLayout(): void {
    const layoutData = this.bspManager.serializeLayout();
    const layoutName = `Layout ${new Date().toLocaleString()}`;
    
    // Add to recent layouts
    this.recentLayouts.unshift({
      name: layoutName,
      data: JSON.stringify(layoutData),
      timestamp: Date.now()
    });
    
    // Keep only max recent layouts
    if (this.recentLayouts.length > this.maxRecentLayouts) {
      this.recentLayouts = this.recentLayouts.slice(0, this.maxRecentLayouts);
    }
    
    // Save to localStorage
    localStorage.setItem('fileui-recent-layouts', JSON.stringify(this.recentLayouts));
    
  }

  private saveLayoutAs(): void {
    const name = prompt('Enter layout name:');
    if (name) {
      const layoutData = this.bspManager.serializeLayout();
      
      // Add to recent layouts
      this.recentLayouts.unshift({
        name: name,
        data: JSON.stringify(layoutData),
        timestamp: Date.now()
      });
      
      // Keep only max recent layouts
      if (this.recentLayouts.length > this.maxRecentLayouts) {
        this.recentLayouts = this.recentLayouts.slice(0, this.maxRecentLayouts);
      }
      
      // Save to localStorage
      localStorage.setItem('fileui-recent-layouts', JSON.stringify(this.recentLayouts));
      
    }
  }

  private loadLayout(): void {
    // For now, just load the most recent layout
    if (this.recentLayouts.length > 0) {
      this.loadRecentLayout(0);
    } else {
      alert('No saved layouts found');
    }
  }

  private loadRecentLayout(index: number): void {
    if (index >= 0 && index < this.recentLayouts.length) {
      const layout = this.recentLayouts[index];
      try {
        const layoutData = JSON.parse(layout.data);
        this.bspManager.loadLayout(layoutData);
      } catch (error) {
        alert('Failed to load layout');
      }
    }
  }

  private handleToolbarButtonClick(btn: HTMLButtonElement): void {
    const action = btn.dataset.action;
    
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
    } else if (action === 'r2' && this.bspManager) {
      // Create R2 configuration panel
      this.createR2ConfigPanel();
    } else if (action === 'google-drive' && this.bspManager) {
      // Create Google Drive configuration panel
      this.createGoogleDriveConfigPanel();
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
              <button class="menu-trigger btn btn-ghost btn-sm" data-action="terminal-menu">Terminal</button>
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
              <button class="btn btn-ghost btn-sm" data-action="explorer" title="Explorer">
                <i data-lucide="folder" class="lucide"></i>
              </button>
            </div>
            <div class="menu">
              <button class="btn btn-ghost btn-sm" data-action="properties" title="Properties">
                <i data-lucide="sliders-horizontal" class="lucide"></i>
              </button>
            </div>
            <div class="menu">
              <button class="btn btn-ghost btn-sm" data-action="terminal" title="Terminal">
                <i data-lucide="terminal" class="lucide"></i>
              </button>
            </div>
            <div class="menu">
              <button class="btn btn-ghost btn-sm" data-action="r2" title="Bucket">
                <i data-lucide="cloudy" class="lucide"></i>
              </button>
            </div>
            <div class="menu">
              <button class="btn btn-ghost btn-sm" data-action="google-drive" title="Google Drive">
                <img src="/drive_icon.svg" class="toolbar-drive-icon" alt="Google Drive" />
              </button>
            </div>
          </div>
          <div class="bottom-actions">
            <div class="menu">
              <button class="btn btn-ghost btn-sm" data-action="source-control" title="Source Control">
                <i data-lucide="git-fork" class="lucide"></i>
              </button>
            </div>
            <div class="menu">
              <button class="btn btn-ghost btn-sm" data-action="reload" title="Reload">
                <i data-lucide="refresh-cw" class="lucide"></i>
              </button>
            </div>
            <div class="menu">
              <button class="btn btn-ghost btn-sm" data-action="settings" title="Settings">
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
        const panelEl = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
        if (panelEl) this.focusPanel(panelEl);
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

  private createR2ConfigPanel(): void {
    if (!this.bspManager) return;
    
    // Add a new panel on the left side for R2 configuration (like explorer)
    const newPanelId = this.bspManager.addPanel('left');
    if (!newPanelId) return;
    
    // Set the R2 panel to 15vw on initialization (same as explorer)
    const explorerDefaultRatio = 0.15; // 15% width
    this.bspManager.setParentSplitForPanelRatio(newPanelId, explorerDefaultRatio);
    this.bspManager.layout();
    
    // Wait for the panel to be created and then update its content
    setTimeout(() => {
      const focusedPanel = document.querySelector(`.bsp-panel[data-panel-id="${newPanelId}"]`) as HTMLElement;
      if (focusedPanel) {
        // Mark this as an R2 panel
        focusedPanel.setAttribute('data-panel-type', 'r2-config');
        this.setupR2ConfigContent(newPanelId);
      }
    }, 100);
  }

  private createGoogleDriveConfigPanel(): void {
    if (!this.bspManager) return;
    
    // Add a new panel on the left side for Google Drive configuration (like explorer)
    const newPanelId = this.bspManager.addPanel('left');
    if (!newPanelId) return;
    
    // Set the Google Drive panel to 15vw on initialization (same as explorer)
    const explorerDefaultRatio = 0.15; // 15% width
    this.bspManager.setParentSplitForPanelRatio(newPanelId, explorerDefaultRatio);
    this.bspManager.layout();
    
    // Wait for the panel to be created and then update its content
    setTimeout(() => {
      const focusedPanel = document.querySelector(`.bsp-panel[data-panel-id="${newPanelId}"]`) as HTMLElement;
      if (focusedPanel) {
        // Mark this as a Google Drive panel
        focusedPanel.setAttribute('data-panel-type', 'google-drive-config');
        this.setupGoogleDriveConfigContent(newPanelId);
      }
    }, 100);
  }

  private setupGoogleDriveConfigContent(panelId: string): void {
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;

    // Mark this as a Google Drive config panel
    panel.setAttribute('data-panel-type', 'google-drive-config');

    // Update panel title with icon
    const panelTitle = panel.querySelector('.panel-title span');
    if (panelTitle && panelTitle.parentElement) {
      panelTitle.parentElement.innerHTML = `
        <img src="/drive_icon.svg" class="panel-header-drive-icon" alt="Google Drive" style="margin-right: 6px;" />
        <span>Google Drive</span>
      `;
    }

    // Update panel content with configuration form (similar to R2)
    const content = panel.querySelector('.panel-content') as HTMLElement;
    if (content) {
      content.innerHTML = `
        <div class="google-drive-config-container">
          <div class="google-drive-config-form">
            <!-- Large Icon Header -->
            <div class="config-icon-header">
              <img src="/drive_icon.svg" class="config-icon drive-icon" alt="Google Drive" />
            </div>
            
            <!-- Service Account Section -->
            <div class="form-section">
              <div class="section-header">
                <h3>Service Account Access</h3>
                <span class="section-subtitle">Connect with service account for full access</span>
              </div>
              
              <div class="setup-steps">
                <div class="step-item">
                  <span class="step-number">1</span>
                  <span class="step-text">Go to <a href="https://console.cloud.google.com" target="_blank" class="link">Google Cloud Console</a></span>
                </div>
                <div class="step-item">
                  <span class="step-number">2</span>
                  <span class="step-text">Create project & enable Google Drive API</span>
                </div>
                <div class="step-item">
                  <span class="step-number">3</span>
                  <span class="step-text">Create service account & download JSON key</span>
                </div>
                <div class="step-item">
                  <span class="step-number">4</span>
                  <span class="step-text">Share folders with service account email</span>
                </div>
              </div>
              
              <div class="form-fields">
                <div class="form-group">
                  <label for="gd-service-key-${panelId}">
                    <span class="label-text">Service Account Key</span>
                    <span class="label-hint">JSON format</span>
                  </label>
                  <textarea 
                    id="gd-service-key-${panelId}" 
                    class="gd-input" 
                    placeholder="Paste your Google Cloud service account JSON key here"
                    rows="2"
                  ></textarea>
                  <div class="help-text">
                    <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" class="link">
                      Create service account
                    </a> in Google Cloud Console
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="gd-folder-id-${panelId}">
                    <span class="label-text">Folder ID</span>
                    <span class="label-hint">Optional</span>
                  </label>
                  <input 
                    type="text" 
                    id="gd-folder-id-${panelId}" 
                    class="gd-input" 
                    placeholder="Leave empty to browse My Drive"
                  />
                </div>
                
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" id="gd-remember-${panelId}" checked />
                    <span>Remember credentials</span>
                  </label>
                </div>
              </div>
              
              <div class="form-actions">
                <button class="btn btn-primary connect-btn" id="gd-connect-${panelId}">
                  <i data-lucide="link" class="lucide" style="width: 16px; height: 16px;"></i>
                  <span>Connect</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Add styles similar to R2
      const style = document.createElement('style');
      style.textContent = `
        .google-drive-config-container {
          padding: 20px;
          height: 100%;
          overflow-y: auto;
        }
        
        .google-drive-config-form {
          max-width: 400px;
          margin: 0 auto;
        }
        
        /* gd-input styles moved to external CSS */
        
        .help-text {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 4px;
        }
        
        .help-text .link {
          color: var(--accent);
          text-decoration: none;
        }
        
        .help-text .link:hover {
          text-decoration: underline;
        }
        
        .form-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        
        .divider {
          height: 1px;
          background: var(--border-color);
          margin: 24px 0;
        }
        
        .quick-access-section h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 500;
        }
        
        .quick-access-section .form-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }
      `;
      
      if (!document.querySelector('#google-drive-styles')) {
        style.id = 'google-drive-styles';
        document.head.appendChild(style);
      }

      // Re-initialize Lucide icons
      this.initializeLucideIcons(10);

      // Add event listeners
      const connectBtn = document.getElementById(`gd-connect-${panelId}`);
      if (connectBtn) {
        connectBtn.addEventListener('click', () => {
          this.handleGoogleDriveConnect(panelId);
        });
      }



      // Load saved credentials if any
      this.loadGoogleDriveCredentials(panelId);
    }
  }

  private initializeBSPLayout(): void {
    
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
      return;
    }

    // Initialize the BSP manager
    this.bspManager.init();
    
    // Add global click handler for panel focus and properties update
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Skip if clicking on a modal
      if (target.closest('.modal-overlay')) {
        return;
      }
      
      const panel = target.closest('.bsp-panel');
      if (panel) {
        // Focus the panel when clicked
        this.focusPanel(panel);
      }
    });

    // Watch for focus changes made by BSP manager
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target as HTMLElement;
          if (target.classList.contains('bsp-panel') && target.classList.contains('focused')) {
            // Panel was focused by BSP manager, update properties
            this.updatePropertiesPanel(target);
          }
        }
      });
    });

    // Start observing all panels for class changes
    observer.observe(document.getElementById('bsp-container')!, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true
    });
    
    // Get the initial main panel
    const rootNode = this.bspManager.getRoot();
    if (!rootNode) {
      return;
    }

    // Split horizontally to add terminal at bottom (80% main, 20% terminal)
    const terminalPanelId = this.bspManager.splitPanel(rootNode.id, 'horizontal', 'bottom');
    
    // Get the new root after first split
    const rootAfterTerminal = this.bspManager.getRoot();
    
    if (terminalPanelId) {
      // Set the split ratio - root should now be the parent containing main and terminal
      const newRoot = this.bspManager.getRoot();
      if (newRoot && newRoot.direction === 'horizontal') {
        // Calculate ratio for collapsed terminal (48px height)
        const viewportHeight = window.innerHeight - 64; // minus header
        const collapsedRatio = (viewportHeight - 48) / viewportHeight;
        newRoot.split = collapsedRatio; // Most space for content, 48px for collapsed terminal
      } else {
      }
      
      // Add terminal content to the bottom panel, pin it, and collapse it
      setTimeout(() => {
        this.setupTerminalContent(terminalPanelId);
        this.pinPanel(terminalPanelId);
        
        // Mark the terminal as collapsed immediately
        const terminalEl = document.querySelector(`.bsp-panel[data-panel-id="${terminalPanelId}"]`) as HTMLElement | null;
        if (terminalEl) {
          terminalEl.classList.add('is-collapsed');
          const collapseBtn = terminalEl.querySelector('[data-action="collapse"]');
          const collapseIcon = collapseBtn?.querySelector('.icon-collapse') as HTMLElement;
          const expandIcon = collapseBtn?.querySelector('.icon-expand') as HTMLElement;
          if (collapseIcon) collapseIcon.style.display = 'none';
          if (expandIcon) expandIcon.style.display = 'block';
        }
      }, 100);
    }

    // Now find the main content panel ID (should be the first child of the root)
    let mainContentPanelId = rootNode.id;
    const currentRoot = this.bspManager.getRoot();
    if (currentRoot && currentRoot.children.length > 0) {
      // The main content should be the first child (top/left in the split)
      mainContentPanelId = currentRoot.children[0].id;
    }

    // Split the main content vertically to add properties on right (95% content, 5% for collapsed properties)  
    const propertiesPanelId = this.bspManager.splitPanel(mainContentPanelId, 'vertical', 'right');
    
    if (propertiesPanelId) {
      // Find the vertical split node and set its ratio for collapsed state
      const currentRoot = this.bspManager.getRoot();
      if (currentRoot && currentRoot.children.length > 0) {
        // The first child should be the vertical split containing main content and properties
        const verticalSplit = currentRoot.children[0];
        if (verticalSplit && verticalSplit.direction === 'vertical') {
          // Set ratio so properties panel starts at collapsed width
          const viewportWidth = window.innerWidth - 48 - 48; // minus both toolbars
          const collapsedRatio = (viewportWidth - 48) / viewportWidth; // 48px for collapsed panel
          verticalSplit.split = collapsedRatio;
        } else {
        }
      } else {
      }
      
      // Add properties content to the right panel, pin it, and mark as collapsed
      setTimeout(() => {
        this.setupPropertiesContent(propertiesPanelId);
        this.pinPanel(propertiesPanelId);
        
        // Mark the panel as collapsed immediately
        const propsEl = document.querySelector(`.bsp-panel[data-panel-id="${propertiesPanelId}"]`) as HTMLElement | null;
        if (propsEl) {
          propsEl.classList.add('is-collapsed');
          const collapseBtn = propsEl.querySelector('[data-action="collapse"]');
          const collapseIcon = collapseBtn?.querySelector('.icon-collapse') as HTMLElement;
          const expandIcon = collapseBtn?.querySelector('.icon-expand') as HTMLElement;
          if (collapseIcon) collapseIcon.style.display = 'none';
          if (expandIcon) expandIcon.style.display = 'block';
        }
      }, 100);
    }

    // Layout the BSP tree
    this.bspManager.layout();
    
    // Setup drag and drop for resizers after initial layout
    setTimeout(() => {
      this.refreshDividerDragAndDrop();
    }, 300);
    
    // Debug: Check how many BSP panels exist
    setTimeout(() => {
      const bspPanels = document.querySelectorAll('.bsp-panel');
      bspPanels.forEach((panel, index) => {
        const panelId = panel.getAttribute('data-panel-id');
        const panelType = panel.getAttribute('data-panel-type');
        const title = panel.querySelector('.panel-title span')?.textContent;
      });
    }, 200);
    
    // Don't create an explorer panel on startup - let user do it manually
    
  }


  private createExplorerBSPPanel(): void {
    if (!this.bspManager) return;
    
    // Add a new panel on the left side
    const newPanelId = this.bspManager.addPanel('left');
    if (!newPanelId) return;
    
    // Set the explorer panel to 15vw on initialization
    // This is the default initialization - saved layouts will override this
    // Future: Check for saved layout preferences before setting default
          // Default layout configuration - can be overridden by saved layouts
      const explorerDefaultRatio = 0.15; // 15% width
      this.bspManager.setParentSplitForPanelRatio(newPanelId, explorerDefaultRatio);
      this.bspManager.layout();
    
    // Wait for the panel to be created and then update its content
    setTimeout(() => {
      // Get the newly created panel by ID
      const focusedPanel = document.querySelector(`.bsp-panel[data-panel-id="${newPanelId}"]`) as HTMLElement;
      if (focusedPanel) {
        // Mark this as an explorer panel
        focusedPanel.setAttribute('data-panel-type', 'explorer');
        const panelTitle = focusedPanel.querySelector('.panel-title span');
        const panelContent = focusedPanel.querySelector('.panel-content') as HTMLElement;
        
        if (panelTitle && panelTitle.parentElement) {
          panelTitle.parentElement.innerHTML = `
            <i data-lucide="folder" class="lucide" style="width: 16px; height: 16px; margin-right: 6px;"></i>
            <span>Explorer</span>
          `;
        }
        
        if (panelContent) {
          // DON'T mark this panel as an explorer panel yet - only when content is loaded
          // focusedPanel.classList.add('explorer-panel');
          
          // Create file explorer with pro tips instead of loading files
          // Remove all styling and wrap in panel-content div like the main panel
          panelContent.style.display = 'flex';
          panelContent.style.flexDirection = 'column';
          panelContent.style.alignItems = 'center';
          panelContent.style.justifyContent = 'center';
          panelContent.style.height = '100%';
          panelContent.style.opacity = '0.3';
          panelContent.style.gap = '24px';
          
          panelContent.innerHTML = `
            <i data-lucide="folder" class="lucide lucide-library" style="width: 96px; height: 96px;"></i>
            <div style="text-align: center; max-width: 400px;">
              <div style="font-size: 18px; font-weight: 500; margin-bottom: 20px; color: var(--color-text-primary);">Explorer Pro Tips</div>
              <div style="font-size: 16px; line-height: 1.8; color: var(--color-text-secondary);">
                • Right-click to open folders<br>
                • Drag folders here to browse<br>
                • Use arrow keys to navigate<br>
                • Click files to open them
              </div>
            </div>
          `;
          
          // Setup interactions but don't load files
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
      const fs = new ServerFileSystem('http://localhost:8000/api');
      const files = await fs.listFiles(path);

      // Clear loading indicator
      treeElement.innerHTML = '';

      // Sort files (folders first, then by name)
      const sortedFiles = sortFiles(files);

      // Detect sequences in the files
      const imageFiles = sortedFiles.filter(f => f.type === 'file' && isSequenceableImage(f.name));
      const imageFilenames = imageFiles.map(f => f.name);
      
      const sequences = detectSequences(imageFilenames);
      
      // Create a set of files that are part of sequences
      const sequenceFiles = new Set<string>();
      sequences.forEach(seq => {
        seq.files.forEach(f => sequenceFiles.add(f));
      });

      // Create tree items
      const addedSequences = new Set<string>();
      
      sortedFiles.forEach(file => {
        // Skip files that are part of a sequence (we'll add the sequence as a group)
        if (file.type === 'file' && sequenceFiles.has(file.name)) {
          // Check if we've already added this sequence
          let foundSequence = null;
          for (const [seqName, seqInfo] of sequences.entries()) {
            if (seqInfo.files.includes(file.name)) {
              foundSequence = [seqName, seqInfo];
              break;
            }
          }
          
          if (foundSequence && !addedSequences.has(foundSequence[0] as string)) {
            // Add the sequence as a single item
            const [seqName, seqInfo] = foundSequence as [string, SequenceInfo];
            addedSequences.add(seqName);
            
            // Create a special tree item for the sequence
            const sequenceItem = this.createSequenceTreeItem(seqInfo, seqName, this.currentPath, panelId);
            treeElement.appendChild(sequenceItem);
          }
        } else {
          // Regular file or directory
          const treeItem = this.createTreeItem(file, panelId);
          treeElement.appendChild(treeItem);
        }
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
    
    const treeElement = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"] .tree`) as HTMLElement;
    if (!treeElement) {
      return;
    }

    try {
      // Clear loading indicator
      treeElement.innerHTML = '';

      // Create an array to hold entries
      const entries: Array<{name: string, kind: string, handle: any}> = [];

      // Check if this is a FileSystemDirectoryHandle (from showDirectoryPicker)
      if (folderHandle.values && typeof folderHandle.values === 'function') {
        // Modern File System Access API
        for await (const entry of folderHandle.values()) {
          entries.push({
            name: entry.name,
            kind: entry.kind, // 'file' or 'directory'
            handle: entry
          });
        }
      } 
      // Check if this is a FileSystemDirectoryEntry (from drag/drop)
      else if (folderHandle.createReader) {
        const reader = folderHandle.createReader();
        
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
                readEntries(); // Continue reading
              } else {
                resolve(); // Done reading
              }
            });
          };
          readEntries();
        });
      } else {
        throw new Error('Unknown folder handle type');
      }

      // Sort entries (directories first, then by name)
      entries.sort((a, b) => {
        if (a.kind === 'directory' && b.kind !== 'directory') return -1;
        if (a.kind !== 'directory' && b.kind === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });

      // Detect sequences in native files
      const fileEntries = entries.filter(e => e.kind === 'file');
      const imageFilenames = fileEntries.filter(e => isSequenceableImage(e.name)).map(e => e.name);
      
      const sequences = detectSequences(imageFilenames);
      
      // Create a map of file handles for sequence playback
      const fileHandleMap = new Map<string, FileSystemFileHandle>();
      
      // Store the original folder handle and its type for later use
      const isModernAPI = folderHandle.values && typeof folderHandle.values === 'function';
      
      fileEntries.forEach(entry => {
        // The handle is stored on entry.handle
        const handle = entry.handle;
        if (handle) {
          // For modern File System Access API
          if (entry.kind === 'file') {
            fileHandleMap.set(entry.name, handle as FileSystemFileHandle);
          }
        }
      });
      
      // Create a set of files that are part of sequences
      const sequenceFiles = new Set<string>();
      sequences.forEach(seq => {
        seq.files.forEach(f => sequenceFiles.add(f));
      });
      
      // Track which sequences we've already added
      const addedSequences = new Set<string>();

      // Create tree items for each entry
      entries.forEach((entry, index) => {
        // Check if this file is part of a sequence
        if (entry.kind === 'file' && sequenceFiles.has(entry.name)) {
          // Find which sequence this file belongs to
          let foundSequence = null;
          for (const [seqName, seqInfo] of sequences.entries()) {
            if (seqInfo.files.includes(entry.name)) {
              foundSequence = [seqName, seqInfo];
              break;
            }
          }
          
          // Only add the sequence once (for the first file in the sequence)
          if (foundSequence && !addedSequences.has(foundSequence[0] as string)) {
            const [seqName, seqInfo] = foundSequence as [string, SequenceInfo];
            addedSequences.add(seqName);
            
            // Create a special tree item for the sequence with native flag and file handles
            // Store the file handles for this sequence globally  
            const rootFolderName = folderHandle.name || 'root';
            const sequenceKey = `${rootFolderName}/${seqName}`;
            this.nativeSequenceHandles.set(sequenceKey, fileHandleMap);
            
            // Create a special tree item for the sequence with native flag and folder name
            const sequenceItem = this.createSequenceTreeItem(seqInfo, seqName, rootFolderName, panelId, 0, true, rootFolderName);
            treeElement.appendChild(sequenceItem);
          }
        } else if (entry.kind === 'directory' || !sequenceFiles.has(entry.name)) {
          // Regular file or directory (not part of a sequence)
          const rootFolderName = folderHandle.name || 'root';
          const fileItem: FileItem = {
            name: entry.name,
            path: `${rootFolderName}/${entry.name}`,
            type: entry.kind as 'file' | 'directory',
            size: 0,
            modified: new Date().toISOString()
          };
          
          const treeItem = this.createNativeTreeItem(fileItem, panelId, 0, entry.handle);
          treeElement.appendChild(treeItem);
        }
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
      this.initializeLucideIcons(10);

    } catch (error) {
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
    
    const treeItem = this.createTreeItem(file, panelId, level);
    
    // Mark as native and store the handle
    const treeItemContent = treeItem.querySelector('.tree-item-content');
    if (treeItemContent) {
      treeItemContent.classList.add('native-file');
      
      // Remove any existing click handlers to avoid conflicts
      const newTreeItemContent = treeItemContent.cloneNode(true) as HTMLElement;
      treeItemContent.parentNode?.replaceChild(newTreeItemContent, treeItemContent);
      
      
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
            // Hide children container
            const childrenContainer = treeItem.querySelector('.tree-item-children') as HTMLElement;
            if (childrenContainer) {
              childrenContainer.style.display = 'none';
            }
          } else {
            treeItem.classList.add('expanded');
            // Show/create children container
            let childrenContainer = treeItem.querySelector('.tree-item-children') as HTMLElement;
            if (!childrenContainer) {
              childrenContainer = document.createElement('div');
              childrenContainer.className = 'tree-item-children';
              treeItem.appendChild(childrenContainer);
            }
            
            // Make sure it's visible
            childrenContainer.style.display = 'block';
            
            // Only load if not already loaded
            if (childrenContainer.children.length === 0) {
              // Load subdirectory contents - use the handle stored on this element
              const folderHandle = (newTreeItemContent as any)._nativeHandle;
              if (folderHandle) {
                // Get the parent path from the current tree item
                const parentPath = newTreeItemContent.getAttribute('data-path') || file.path;
                await this.loadNativeSubdirectory(folderHandle, childrenContainer as HTMLElement, panelId, level + 1, parentPath);
              } else {
                childrenContainer.innerHTML = '<div class="error-message">Unable to load folder</div>';
              }
            }
          }
          
          // Re-initialize Lucide icons
          this.initializeLucideIcons(10);
        });
      }
      
      // Add click handler for the content area (not toggle button)
      const clickHandler = async (e: Event) => {
        
        // Don't handle if clicking on toggle button
        if ((e.target as HTMLElement).closest('.tree-item-toggle')) {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        if (file.type === 'directory') {
          // For directories, clicking the content area also toggles
          const toggleBtn = newTreeItemContent.querySelector('.tree-item-toggle') as HTMLElement;
          if (toggleBtn) {
            toggleBtn.click();
          }
        } else {
          // Select the file
          this.selectFile(treeItem, panelId);
          
          // Open file
          // Retrieve the handle from the clicked element
          const clickedHandle = (newTreeItemContent as any)._nativeHandle;
          if (clickedHandle) {
          }
          
          // Check for different file handle types
          if (clickedHandle && clickedHandle.file) {
            
            // Create a promise wrapper for the callback-based API
            const getFile = () => new Promise<File>((resolve, reject) => {
              clickedHandle.file(
                (fileObj: File) => resolve(fileObj),
                (error: any) => reject(error)
              );
            });
            
            try {
              const fileObj = await getFile();
              
              const targetPanelId = this.findOrCreateTargetPanel();
              
              if (targetPanelId) {
                // Wait a bit for panel creation if needed
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const targetPanel = document.querySelector(`.bsp-panel[data-panel-id="${targetPanelId}"]`);
                
                if (targetPanel) {
                  await this.openDroppedFileInPanel(fileObj, targetPanelId);
                } else {
                }
              } else {
              }
            } catch (error) {
            }
          } else if (clickedHandle && clickedHandle.getFile) {
            // Modern File System Access API
            try {
              const fileObj = await clickedHandle.getFile();
              
              const targetPanelId = this.findOrCreateTargetPanel();
              
              if (targetPanelId) {
                // Wait a bit for panel creation if needed
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const targetPanel = document.querySelector(`.bsp-panel[data-panel-id="${targetPanelId}"]`);
                
                if (targetPanel) {
                  await this.openDroppedFileInPanel(fileObj, targetPanelId);
                } else {
                }
              } else {
              }
            } catch (error) {
            }
          } else {
          }
        }
      };
      
      newTreeItemContent.addEventListener('click', clickHandler);
      
      // Verify the handler was added
      if (newTreeItemContent.onclick !== null || newTreeItemContent.hasAttribute('onclick')) {
      }
      
      // Store the handle on the new content element
      (newTreeItemContent as any)._nativeHandle = handle;
    }
    
    return treeItem;
  }

  private async loadNativeSubdirectory(dirHandle: any, containerElement: HTMLElement, panelId: string, level: number, parentPath: string = ''): Promise<void> {
    
    // Show loading state
    containerElement.innerHTML = '<div class="loading-indicator">Loading...</div>';

    // Get the folder name from the handle
    const folderName = dirHandle.name || '';
    // Use parentPath as the current path - it already contains the full path of this directory
    // parentPath is passed from the folder's data-path attribute which has the complete path
    const currentPath = parentPath || folderName;
    
    const entries: Array<{name: string, kind: string, handle: any}> = [];

    // Check if this is a FileSystemDirectoryHandle (from showDirectoryPicker or native folder)
    if (dirHandle.values && typeof dirHandle.values === 'function') {
      // Modern File System Access API
      for await (const entry of dirHandle.values()) {
        entries.push({
          name: entry.name,
          kind: entry.kind, // 'file' or 'directory'
          handle: entry
        });
      }
    }
    // Check if this is a FileSystemDirectoryEntry (from drag/drop)
    else if (dirHandle.createReader) {
      const reader = dirHandle.createReader();
      
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
    } else {
      containerElement.innerHTML = '<div class="error-message">Unable to read folder</div>';
      return;
    }

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
      // Detect sequences in the native subfolder
      const fileEntries = entries.filter(e => e.kind === 'file');
      const imageFilenames = fileEntries.filter(e => isSequenceableImage(e.name)).map(e => e.name);
      
      const sequences = detectSequences(imageFilenames);
      
      // Create a map of file handles for sequences
      const fileHandleMap = new Map<string, FileSystemFileHandle>();
      fileEntries.forEach(entry => {
        // entry.handle IS the FileSystemFileHandle, not an object containing it
        if (entry.handle && entry.kind === 'file') {
          fileHandleMap.set(entry.name, entry.handle as FileSystemFileHandle);
        }
      });
      
      // Create a set of files that are part of sequences
      const sequenceFiles = new Set<string>();
      sequences.forEach(seq => {
        seq.files.forEach(f => sequenceFiles.add(f));
      });
      
      // Track which sequences we've already added
      const addedSequences = new Set<string>();
      
      entries.forEach(entry => {
        // Check if this file is part of a sequence
        if (entry.kind === 'file' && sequenceFiles.has(entry.name)) {
          // Find which sequence this file belongs to
          let foundSequence = null;
          for (const [seqName, seqInfo] of sequences.entries()) {
            if (seqInfo.files.includes(entry.name)) {
              foundSequence = [seqName, seqInfo];
              break;
            }
          }
          
          // Only add the sequence once (for the first file in the sequence)
          if (foundSequence && !addedSequences.has(foundSequence[0] as string)) {
            const [seqName, seqInfo] = foundSequence as [string, SequenceInfo];
            addedSequences.add(seqName);
            
            // Store the file handles for this sequence globally using full path
            const sequenceKey = `${currentPath}/${seqName}`;
            this.nativeSequenceHandles.set(sequenceKey, fileHandleMap);
            
            // Create a special tree item for the sequence with native flag and full path
            const sequenceItem = this.createSequenceTreeItem(seqInfo, seqName, currentPath, panelId, level, true, currentPath);
            containerElement.appendChild(sequenceItem);
          }
        } else if (entry.kind === 'directory' || !sequenceFiles.has(entry.name)) {
          // Regular file or directory (not part of a sequence)
          const fileItem: FileItem = {
            name: entry.name,
            path: `${currentPath}/${entry.name}`,
            type: entry.kind as 'file' | 'directory',
            size: 0,
            modified: new Date().toISOString()
          };
          
          const treeItem = this.createNativeTreeItem(fileItem, panelId, level, entry.handle);
          containerElement.appendChild(treeItem);
        }
      });
    }

    this.initializeLucideIcons(10);
  }

  private createSequenceTreeItem(sequence: SequenceInfo, displayName: string, basePath: string, panelId: string, level: number = 0, isNative: boolean = false, nativeFolderName?: string): HTMLElement {
    const treeItem = document.createElement('div');
    treeItem.className = 'tree-item tree-item-sequence';
    treeItem.setAttribute('role', 'treeitem');
    treeItem.setAttribute('data-level', level.toString());
    
    // Create full path for the sequence
    const sequencePath = basePath ? `${basePath}/${sequence.baseName}` : sequence.baseName;
    
    // Use film icon for sequences
    const iconName = 'videotape';
    
    // Format frame count
    const frameCount = `${sequence.frameCount} frames`;
    
    treeItem.innerHTML = `
      <div class="tree-item-content" draggable="true" data-is-sequence="true" data-path="${sequencePath}" data-sequence-info='${JSON.stringify(sequence)}' data-file-type="sequence" data-native-folder="${nativeFolderName || ''}" style="padding-left: 0px">
        <div class="tree-item-spacer"></div>
        <i data-lucide="${iconName}" class="lucide tree-item-icon" data-file-type="sequence" style="color: var(--file-video);"></i>
        <span class="tree-item-label">${displayName}</span>
        <span class="tree-item-badge" style="margin-left: 8px; font-size: 11px; opacity: 0.9;">${frameCount}</span>
        <span class="tree-item-tag" style="margin-left: 6px; font-size: 11px; opacity: 0.9;">${sequence.extension.toUpperCase()}</span>
      </div>
    `;
    
    // Add click handler to open sequence
    const content = treeItem.querySelector('.tree-item-content') as HTMLElement;
    if (content) {
      content.addEventListener('click', async () => {
        
        // Load the sequence files
        try {
          // Build URLs for all frames
          const frameUrls: string[] = [];
          
          if (isNative) {
            // For native files, retrieve stored file handles
            const nativePath = content.getAttribute('data-native-folder') || '';
            const sequenceKey = `${nativePath}/${displayName}`;
            const fileHandles = this.nativeSequenceHandles.get(sequenceKey);
            
            if (fileHandles && fileHandles.size > 0) {
              for (let i = sequence.startFrame; i <= sequence.endFrame; i++) {
              const frameNumber = i.toString().padStart(sequence.padding, '0');
              const filename = `${sequence.baseName}${sequence.delimiter}${frameNumber}.${sequence.extension}`;
              
              const handle = fileHandles.get(filename);
              if (handle) {
                // Check if it's a FileSystemFileHandle (modern API)
                if (handle.getFile) {
                  const file = await handle.getFile();
                  const url = URL.createObjectURL(file);
                  frameUrls.push(url);
                }
                // Or if it's a FileSystemFileEntry (drag/drop API)
                else if (handle.file) {
                  await new Promise<void>((resolve) => {
                    handle.file((file: File) => {
                      const url = URL.createObjectURL(file);
                      frameUrls.push(url);
                      resolve();
                    });
                  });
                }
              }
            }
            } else {
              // No file handles found for native sequence
            }
          } else {
            // For server files, use API URLs
            for (let i = sequence.startFrame; i <= sequence.endFrame; i++) {
              const frameNumber = i.toString().padStart(sequence.padding, '0');
              const filename = `${sequence.baseName}${sequence.delimiter}${frameNumber}.${sequence.extension}`;
              const fullPath = basePath ? `${basePath}/${filename}` : filename;
              const url = `http://localhost:8000/api/file?path=${encodeURIComponent(fullPath)}`;
              frameUrls.push(url);
            }
          }
          
          // Find an existing unpinned panel or create a new one
          const targetPanelId = this.findOrCreateTargetPanel() || panelId;
          
          // Wait for panel to be created
          setTimeout(() => {
            const panel = document.querySelector(`.bsp-panel[data-panel-id="${targetPanelId}"]`);
            if (!panel) return;
            
            const panelContent = panel.querySelector('.panel-content');
            if (!panelContent) return;
            
            // Update panel header
            const panelTitle = panel.querySelector('.panel-title');
            if (panelTitle) {
              panelTitle.innerHTML = `
                <i data-lucide="videotape" class="lucide" style="width: 16px; height: 16px; margin-right: 6px; color: var(--file-video);"></i>
                <span>${displayName}</span>
              `;
            }
            
            // Create sequence player
            panelContent.innerHTML = `<div id="sequence-container-${targetPanelId}" style="width: 100%; height: 100%;"></div>`;
            const sequencePlayer = new ImageSequencePlayer(panelContent.querySelector(`#sequence-container-${targetPanelId}`)!);
            
            // Load the sequence with server URLs and auto-play
            sequencePlayer.loadSequence(sequence, '', frameUrls).then(() => {
              // Auto-play the sequence
              sequencePlayer.play();
            });
            
            // Initialize Lucide icons
            this.initializeLucideIcons();
          }, 100);
        } catch (error) {
        }
      });
    }
    
    return treeItem;
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
    // Try to find file-explorer-content first, if not found, use panel-content for empty state
    let explorerContent = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"] .file-explorer-content`) as HTMLElement;
    if (!explorerContent) {
      explorerContent = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"] .panel-content`) as HTMLElement;
    }
    if (!explorerContent) return;

    // Make the explorer focusable
    explorerContent.setAttribute('tabindex', '0');
    
    // Super simple keyboard navigation
    explorerContent.addEventListener('keydown', (e) => {
      if (!['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
      
      e.preventDefault();
      
      // Get all visible items
      const items = Array.from(explorerContent.querySelectorAll('.tree-item-content')).filter(item => {
        return (item as HTMLElement).offsetParent !== null;
      }) as HTMLElement[];
      
      if (items.length === 0) return;
      
      // Find currently focused item
      let currentIndex = items.findIndex(item => item.classList.contains('focused'));
      
      // Clear all focus
      items.forEach(item => item.classList.remove('focused'));
      
      switch (e.key) {
        case 'ArrowDown':
          currentIndex = currentIndex < items.length - 1 ? currentIndex + 1 : currentIndex;
          break;
        case 'ArrowUp':
          currentIndex = currentIndex > 0 ? currentIndex - 1 : (currentIndex === -1 ? 0 : currentIndex);
          break;
        case 'Enter':
          if (currentIndex >= 0) {
            items[currentIndex].click();
          }
          return;
      }
      
      // Focus the item
      if (currentIndex >= 0 && currentIndex < items.length) {
        items[currentIndex].classList.add('focused');
        items[currentIndex].scrollIntoView({ block: 'nearest' });
        
        // Auto-open files
        const isFolder = items[currentIndex].dataset.isFolder === 'true';
        if (!isFolder) {
          items[currentIndex].click();
        }
      }
    });

    // Handle tree item clicks
    explorerContent.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Check if we clicked on the icon inside the button
      if (target.tagName === 'svg' || target.tagName === 'path') {
        const button = target.closest('.tree-item-toggle');
        if (button) {
          e.stopPropagation();
          const treeItem = button.closest('.tree-item') as HTMLElement;
          if (treeItem) {
            this.toggleFolder(treeItem, panelId);
          }
          return;
        }
      }

      // Handle tree item clicks
      const treeItemContent = target.closest('.tree-item-content') as HTMLElement;
      if (treeItemContent) {
        // Remove all previous focus
        explorerContent.querySelectorAll('.tree-item-content.focused').forEach(item => {
          item.classList.remove('focused');
        });
        
        // Add focus to clicked item
        treeItemContent.classList.add('focused');
        
        // Focus the explorer for keyboard events
        explorerContent.focus();
        
        const isFolder = treeItemContent.dataset.isFolder === 'true';
        const treeItem = treeItemContent.closest('.tree-item') as HTMLElement;
        
        // Update properties panel for selected item
        const itemPath = treeItemContent.dataset.path || '';
        const itemName = treeItemContent.dataset.fileName || '';
        if (itemPath && itemName) {
          this.updatePropertiesForExplorerItem(itemPath, itemName, isFolder, panelId);
        }

        // Handle toggle button clicks
        const toggleButton = target.closest('.tree-item-toggle') as HTMLElement;
        if (toggleButton) {
          e.stopPropagation();
          const treeItem = toggleButton.closest('.tree-item') as HTMLElement;
          if (treeItem) {
            this.toggleFolder(treeItem, panelId);
          }
          return;
        }

        if (!isFolder && treeItem) {
          // Skip file opening for sequences - they have their own click handler
          if (treeItem.classList.contains('tree-item-sequence')) {
            // Just handle selection
            this.selectFile(treeItem, panelId);
            return;
          }
          
          // Handle file selection and opening
          this.selectFile(treeItem, panelId);
          
          // Open file in new panel on single click
          const path = treeItemContent.dataset.path;
          const fileName = treeItemContent.querySelector('.tree-item-label')?.textContent || '';
          if (path && fileName) {
            this.openFileInBSPPanel(path, fileName);
          } else {
          }
        }
      }
    });
    
    // Setup drag and drop for tree items
    this.setupExplorerDragAndDrop(explorerContent as HTMLElement, panelId);
  }

  private async toggleFolder(treeItem: HTMLElement, panelId: string): Promise<void> {
    const treeItemContent = treeItem.querySelector('.tree-item-content') as HTMLElement;
    const toggleBtn = treeItem.querySelector('.tree-item-toggle') as HTMLButtonElement;
    const childrenContainer = treeItem.querySelector('.tree-item-children') as HTMLElement;
    const path = treeItemContent?.dataset.path;

    if (!childrenContainer || !path || !toggleBtn) {
      return;
    }

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
          const fs = new ServerFileSystem('http://localhost:8000/api');
          const files = await fs.listFiles(path);
          const sortedFiles = sortFiles(files);

          childrenContainer.innerHTML = '';
          const currentLevel = parseInt(treeItem.getAttribute('data-level') || '0');
          
          // Detect sequences in the subfolder
          const imageFilenames = sortedFiles
            .filter(f => f.type === 'file' && isSequenceableImage(f.name))
            .map(f => f.name);
          
          
          const sequences = detectSequences(imageFilenames);
          
          // Create a set of files that are part of sequences
          const sequenceFiles = new Set<string>();
          sequences.forEach(seq => {
            seq.files.forEach(f => sequenceFiles.add(f));
          });
          
          // Track which sequences we've already added
          const addedSequences = new Set<string>();
          
          sortedFiles.forEach(file => {
            // Check if this file is part of a sequence
            if (file.type === 'file' && sequenceFiles.has(file.name)) {
              // Find which sequence this file belongs to
              let foundSequence = null;
              for (const [seqName, seqInfo] of sequences.entries()) {
                if (seqInfo.files.includes(file.name)) {
                  foundSequence = [seqName, seqInfo];
                  break;
                }
              }
              
              // Only add the sequence once (for the first file in the sequence)
              if (foundSequence && !addedSequences.has(foundSequence[0] as string)) {
                const [seqName, seqInfo] = foundSequence as [string, SequenceInfo];
                addedSequences.add(seqName);
                
                // Create a special tree item for the sequence
                const sequenceItem = this.createSequenceTreeItem(seqInfo, seqName, path, panelId, currentLevel + 1);
                childrenContainer.appendChild(sequenceItem);
              }
            } else if (file.type === 'directory' || !sequenceFiles.has(file.name)) {
              // Regular file or directory (not part of a sequence)
              const childItem = this.createTreeItem(file, panelId, currentLevel + 1);
              childrenContainer.appendChild(childItem);
            }
          });

          // Event delegation is already set up on the explorer content, 
          // so new items will automatically work
          
          // Re-initialize Lucide icons for newly loaded items
          this.initializeLucideIcons(10);

        } catch (error) {
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

    // Note: Properties panel update is handled by the click handler that calls this method
    // The click handler calls updatePropertiesForExplorerItem which is the correct method for explorer items
  }


  private setupGlobalDragAndDrop(): void {
    if (this.dragDropInitialized) return;
    this.dragDropInitialized = true;
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
        
        // Don't show drag feedback on explorer panels
        const panelElement = panelContent.closest('.bsp-panel');
        if (panelElement?.classList.contains('explorer-panel')) {
          return;
        }
        
        panelContent.classList.add('drag-over');
      });

      panelContent.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const panelElement = panelContent.closest('.bsp-panel');
        
        // Check for self-drop on explorer panels
        if (panelElement?.classList.contains('explorer-panel') && e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        } else if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
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
          panelContent.classList.remove('drag-over');
        }
      });

      panelContent.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drop event fired on panel');
        panelContent.classList.remove('drag-over');
        
        // Clean up any other drag highlights that might be stuck
        this.cleanupAllDragHighlights();
        
        const panelElement = panelContent.closest('.bsp-panel');
        const targetPanelId = panelElement?.getAttribute('data-panel-id');
        console.log('Panel type:', panelElement?.getAttribute('data-panel-type'), 'Panel ID:', targetPanelId);
        
        if (!targetPanelId || !e.dataTransfer) {
          console.log('No panel ID or dataTransfer');
          return;
        }
        
        // Check if this is an internal drag (from explorer)
        const plainPath = e.dataTransfer.getData('text/plain');
        
        // Check if dragging from explorer to the same explorer panel
        if (plainPath && !e.dataTransfer.files.length && panelElement?.classList.contains('explorer-panel')) {
          // Get the source of the drag (which explorer it came from)
          const dragSource = e.dataTransfer.getData('application/x-panel-id');
          if (dragSource === targetPanelId) {
            // Cannot drop file from explorer into the same explorer panel
            return;
          }
          // Allow dropping into a different explorer panel (will replace it)
        }
        
        // Check for internal drag from explorer or R2
        if ((plainPath !== null && plainPath !== undefined) && !e.dataTransfer.files.length) {
          try {
            // Try to parse as JSON first (R2 drag)
            const data = JSON.parse(plainPath);
            if (data.type === 'r2-file' || data.type === 'r2-file-multi') {
              // This is an R2 internal drag, let it fall through to be handled later
            } else {
              // Unknown JSON format, skip
              return;
            }
          } catch {
            // Not JSON, treat as file path from explorer
            if (!plainPath || plainPath.trim() === '') {
              return;
            }
            
            // Get the filename from the path
            const pathParts = plainPath.split('/');
            const fileName = pathParts[pathParts.length - 1];
            
            // JUST LIKE CLICKING - use openFileInBSPPanel
            await this.openFileInBSPPanel(plainPath, fileName);
            return;
          }
        }
        
        // Handle external file drops
        
        // Special handling for R2 panels - upload files instead of opening them
        if (panelElement?.getAttribute('data-panel-type') === 'r2-browser') {
          console.log('R2 panel detected, handling file upload');
          const files: File[] = [];
          
          if (e.dataTransfer.items) {
            console.log('Using dataTransfer.items, length:', e.dataTransfer.items.length);
            for (let i = 0; i < e.dataTransfer.items.length; i++) {
              const item = e.dataTransfer.items[i];
              if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file) files.push(file);
              }
            }
          } else if (e.dataTransfer.files) {
            console.log('Using dataTransfer.files, length:', e.dataTransfer.files.length);
            files.push(...Array.from(e.dataTransfer.files));
          }
          
          console.log('Files to upload:', files.length);
          if (files.length > 0) {
            // Upload to root for now (since we removed breadcrumbs)
            console.log('Calling uploadR2Files');
            await this.uploadR2Files(targetPanelId, '', files);
          }
          
          // Force cleanup for R2 panels
          panelContent.classList.remove('drag-over');
          const r2Browser = panelContent.querySelector('.r2-browser');
          if (r2Browser) {
            r2Browser.classList.remove('drag-over');
          }
          return;
        }
        
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
          
          // Check if multiple files might be a sequence
          if (files.length > 1) {
            await this.handleMultipleFileDrop(files, targetPanelId);
          } else {
            await this.openDroppedFileInPanel(files[0], targetPanelId);
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
          bspContainer.classList.remove('drag-over');
        }
      });

      bspContainer.addEventListener('drop', async (e) => {
        // Only handle if no panels exist
        if (!bspContainer.querySelector('.bsp-panel')) {
          e.preventDefault();
          e.stopPropagation();
          bspContainer.classList.remove('drag-over');
          
          // Clean up any other highlights
          this.cleanupAllDragHighlights();
          
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
        setupPanelDropZone(panel);
      });
    }, 100);
    
    // Watch for new panels
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element && node.classList.contains('bsp-panel')) {
            setupPanelDropZone(node);
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

  }
  
  private setupExplorerDragAndDrop(explorerContent: HTMLElement, panelId: string): void {
    // Setup internal drag and drop for tree items
    let draggedElement: HTMLElement | null = null;
    let draggedFilePath: string | null = null;
    let draggedFileName: string | null = null;
    let draggedIsNative: boolean = false;
    let draggedNativeHandle: any = null;
    
    explorerContent.addEventListener('dragstart', (e: DragEvent) => {
      const target = e.target as HTMLElement;
      const treeItemContent = target.closest('.tree-item-content') as HTMLElement;
      
      if (treeItemContent && e.dataTransfer) {
        draggedElement = treeItemContent;
        draggedFilePath = treeItemContent.dataset.path || '';
        draggedFileName = treeItemContent.querySelector('.tree-item-label')?.textContent || '';
        
        // Check if this is a native file
        draggedIsNative = treeItemContent.classList.contains('native-file');
        if (draggedIsNative) {
          draggedNativeHandle = (treeItemContent as any)._nativeHandle;
        }
        
        treeItemContent.classList.add('dragging');
        
        // Set drag data
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', draggedFilePath);
        // Add the source panel ID to detect self-drops
        e.dataTransfer.setData('application/x-panel-id', panelId);
        // Use a simpler mime type that browsers won't interfere with
        e.dataTransfer.setData('text/x-fileui-internal', JSON.stringify({
          path: draggedFilePath,
          fileName: draggedFileName,
          isNative: draggedIsNative,
          isFolder: treeItemContent.dataset.isFolder === 'true'
        }));
        
        // Create custom drag image
        const dragGhost = document.createElement('div');
        dragGhost.className = 'drag-ghost';
        const iconName = treeItemContent.dataset.isFolder === 'true' ? 'folder' : 'file';
        dragGhost.innerHTML = `<i data-lucide="${iconName}"></i><span>${draggedFileName}</span>`;
        document.body.appendChild(dragGhost);
        
        // Set custom drag image
        e.dataTransfer.setDragImage(dragGhost, 0, 0);
        
        // Remove ghost after drag starts
        setTimeout(() => dragGhost.remove(), 0);
      }
    });

    explorerContent.addEventListener('dragend', (e: DragEvent) => {
      const target = e.target as HTMLElement;
      const treeItemContent = target.closest('.tree-item-content') as HTMLElement;
      
      if (treeItemContent) {
        treeItemContent.classList.remove('dragging');
      }
      
      // Clean up any drag-over classes
      explorerContent.querySelectorAll('.drag-over, .drag-over-before, .drag-over-after').forEach((el: Element) => {
        el.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
      });
      
      draggedElement = null;
      draggedFilePath = null;
      draggedFileName = null;
      draggedIsNative = false;
      draggedNativeHandle = null;
    });

    // Handle drag over for internal items
    explorerContent.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      
      if (!draggedElement) return;
      
      const target = e.target as HTMLElement;
      const treeItemContent = target.closest('.tree-item-content') as HTMLElement;
      
      if (treeItemContent && treeItemContent !== draggedElement) {
        // Remove previous drag-over classes
        explorerContent.querySelectorAll('.drag-over, .drag-over-before, .drag-over-after').forEach((el: Element) => {
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

    // Handle drop for internal items (reorganizing within explorer)
    explorerContent.addEventListener('drop', async (e) => {
      e.preventDefault();
      
      // Only handle internal reorganization, not external drops
      if (!draggedElement) {
        return;
      }
      
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
      
      // Also do global cleanup in case anything is stuck
      this.cleanupAllDragHighlights();
    });
  }

  private async openDroppedFolderInPanel(folderName: string, panelId: string, folderHandle?: any): Promise<void> {
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) {
      return;
    }

    // Mark this as an explorer panel
    panel.setAttribute('data-panel-type', 'explorer');
    panel.classList.add('explorer-panel');

    // Update panel content first to remove centering styles
    const panelContent = panel.querySelector('.panel-content') as HTMLElement;
    if (panelContent) {
      // Remove center alignment styles from empty panels
      panelContent.style.display = '';
      panelContent.style.flexDirection = '';
      panelContent.style.alignItems = '';
      panelContent.style.justifyContent = '';
      panelContent.style.opacity = '';
      panelContent.style.gap = '';
    }

    // Check if panel has a header, create one if it doesn't
    let panelHeader = panel.querySelector('.panel-header');
    if (!panelHeader) {
      // Panel doesn't have a header (was created with noHeader: true)
      // We need to create the header structure
      const panelBody = panel.querySelector('.panel-body');
      if (panelBody) {
        const headerHTML = `
          <div class="panel-header">
            <div class="panel-title">
              <i data-lucide="folder-open" class="lucide" style="width: 16px; height: 16px; margin-right: 6px; color: var(--file-folder);"></i>
              <span>${folderName || 'Folder'}</span>
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
        panelBody.insertAdjacentHTML('beforebegin', headerHTML);
        
        // Reduce panel-body height to accommodate header
        (panelBody as HTMLElement).style.height = 'calc(100% - 36px)';
      }
    } else {
      // Update existing panel header with folder name
      const panelTitle = panelHeader.querySelector('.panel-title');
      if (panelTitle) {
        panelTitle.innerHTML = `
          <i data-lucide="folder-open" class="lucide" style="width: 16px; height: 16px; margin-right: 6px; color: var(--file-folder);"></i>
          <span>${folderName || 'Folder'}</span>
        `;
      }
    }
    
    // Re-initialize Lucide icons for the folder icon
    this.initializeLucideIcons(10);

    // panelContent already declared above
    if (!panelContent) return;

    // If we have a folder handle (from webkitGetAsEntry or showDirectoryPicker), we can create a native explorer
    const isNativeFolder = folderHandle && (
      folderHandle.isDirectory || // FileSystemDirectoryEntry from drag/drop
      folderHandle.kind === 'directory' // FileSystemDirectoryHandle from picker
    );
    
    if (isNativeFolder) {
      panelContent.innerHTML = `
        <div class="file-explorer-content native-explorer" data-panel-id="${panelId}">
          <div class="tree" aria-label="File Explorer">
            <div class="loading-indicator">Loading folder contents...</div>
          </div>
        </div>
      `;
      
      // Load native folder contents
      this.loadNativeFolderContents(folderHandle, panelId).then(() => {
        // Set up explorer interactions after content is loaded
        this.setupExplorerInteractions(panelId);
      });
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
    
    // Update currently open file (for native files, just use the name)
    this.currentlyOpenFile = file.name;
    this.updateOpenFileHighlight();
    
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    
    if (!panel) {
      return;
    }

    // Store file info in panel attributes
    panel.setAttribute('data-file-name', file.name);
    panel.setAttribute('data-file-source', 'local');
    panel.setAttribute('data-file-size', file.size.toString());
    panel.setAttribute('data-file-type', getFileType(file.name));

    // Check if this is a directory (folder)
    // Browsers don't directly support folder drops from File API, but we can check webkitRelativePath
    const isDirectory = file.webkitRelativePath !== '' || 
                       (file.type === '' && file.size === 0 && file.name.indexOf('.') === -1);

    // Get file info for header
    const headerFileType = getFileType(file.name);
    const iconName = getFileIcon(headerFileType);
const iconColor = getFileIconColor(headerFileType);

    // Ensure panel has a header
    let panelHeader = panel.querySelector('.panel-header');
    if (!panelHeader) {
      // Create header if it doesn't exist
      const headerHTML = `
        <div class="panel-header">
          <div class="panel-title">
            <i data-lucide="${iconName}" class="lucide" style="width: 16px; height: 16px; margin-right: 6px; color: ${iconColor};"></i>
            <span>${file.name}</span>
          </div>
          <div class="panel-actions">
            <button class="panel-action-btn" data-action="pin" title="Pin Panel">
              <i data-lucide="pin" class="lucide"></i>
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
      
      // Insert header at the beginning of the panel
      panel.insertAdjacentHTML('afterbegin', headerHTML);
      panelHeader = panel.querySelector('.panel-header');
    }

    // Update panel header with icon
    const panelTitle = panel.querySelector('.panel-title');
    if (panelTitle) {
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
          panelContent.innerHTML = `<pre class="file-content">${escapeHtml(content)}</pre>`;
        }
      };
      reader.readAsText(file);
    } else if (fileType === 'file-image' || file.type.startsWith('image/')) {
      // Check if this might be part of a sequence
      if (isSequenceableImage(file.name)) {
        const parsed = parseSequenceFrame(file.name);
        if (parsed && parsed.padding >= 3) {
          // This looks like it might be part of a sequence
          
          // For dropped files, we can't check the server (file isn't on server yet)
          // Only check if we have a server path (from file browser click)
          const isServerFile = (file as any).serverPath;
          
          if (isServerFile) {
            // Check server for the full sequence
            try {
              const filePath = (file as any).serverPath;
              
              const response = await fetch(`http://localhost:8000/api/sequence?path=${encodeURIComponent(filePath)}`);
              const sequenceData = await response.json();
              
              if (sequenceData.is_sequence && sequenceData.files.length > 1) {
              
              // Create sequence player
              panelContent.innerHTML = `<div id="sequence-container-${panelId}" style="width: 100%; height: 100%;"></div>`;
              const sequencePlayer = new ImageSequencePlayer(panelContent.querySelector(`#sequence-container-${panelId}`)!);
              
              // Create sequence info from server data
              const sequenceInfo: SequenceInfo = {
                baseName: sequenceData.base_name,
                padding: sequenceData.padding,
                startFrame: sequenceData.start_frame,
                endFrame: sequenceData.end_frame,
                frameCount: sequenceData.frame_count,
                extension: sequenceData.extension,
                delimiter: sequenceData.delimiter,
                pattern: `${sequenceData.base_name}${sequenceData.delimiter}${'#'.repeat(sequenceData.padding)}.${sequenceData.extension}`,
                files: sequenceData.files.map((f: any) => f.name)
              };
              
              // Build URLs for all frames
              const frameUrls = sequenceData.files.map((f: any) => 
                `http://localhost:8000/api/file?path=${encodeURIComponent(f.path)}`
              );
              
              // Load the sequence and auto-play
              await sequencePlayer.loadSequence(sequenceInfo, '', frameUrls);
              sequencePlayer.play();
              
              // Initialize Lucide icons
              this.initializeLucideIcons();
              return;
            }
          } catch (error) {
          }
          }  // Close the isServerFile check
          
          // Fall back to single frame if no sequence detected
          panelContent.innerHTML = `<div id="sequence-container-${panelId}" style="width: 100%; height: 100%;"></div>`;
          const sequencePlayer = new ImageSequencePlayer(panelContent.querySelector(`#sequence-container-${panelId}`)!);
          
          const singleFrameSequence: SequenceInfo = {
            baseName: parsed.baseName,
            padding: parsed.padding,
            startFrame: parsed.frameNumber,
            endFrame: parsed.frameNumber,
            frameCount: 1,
            extension: parsed.extension,
            delimiter: parsed.delimiter,
            pattern: `${parsed.baseName}${parsed.delimiter}${'#'.repeat(parsed.padding)}.${parsed.extension}`,
            files: [file.name]
          };
          
          const url = URL.createObjectURL(file);
          sequencePlayer.loadSequence(singleFrameSequence, '', [url]).then(() => {
            // Auto-play single frame sequences too
            sequencePlayer.play();
          });
          
          this.initializeLucideIcons();
        } else {
          // Regular single image
          const url = URL.createObjectURL(file);
          panelContent.innerHTML = `
            <div class="image-viewer" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: auto;">
              <img src="${url}" alt="${file.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
            </div>
          `;
        }
      } else {
        // Regular single image
        const url = URL.createObjectURL(file);
        panelContent.innerHTML = `
          <div class="image-viewer" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: auto;">
            <img src="${url}" alt="${file.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
          </div>
        `;
      }
    } else if (fileType === 'file-video' || file.type.startsWith('video/')) {
      // Handle video files
      const url = URL.createObjectURL(file);
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      
      panelContent.innerHTML = `
        <div class="video-player" style="display: flex; flex-direction: column; height: 100%;">
          <video autoplay muted preload="metadata"
                 style="flex: 1; width: 100%; background: #000;">
            <source src="${url}" type="${file.type || `video/${ext === 'mov' ? 'quicktime' : ext}`}">
            Your browser does not support the video tag.
          </video>
          <div class="video-controls" style="display: flex; align-items: center; padding: 8px; background: var(--bg-secondary); border-top: 1px solid var(--border-color);">
            <button class="btn btn-sm" data-action="play">
              <i data-lucide="play" width="16" height="16"></i>
            </button>
            <div class="timeline">
              <div class="timeline-ticks"></div>
              <div class="timeline-track">
                <div class="timeline-progress"></div>
                <div class="timeline-handle" style="left: 0%;">
                  <div class="timeline-playhead-label">0:00</div>
                  <div class="timeline-playhead-line"></div>
                </div>
              </div>
            </div>
            <span class="video-time-label" style="font-size: 12px; color: var(--color-text-secondary); min-width: 90px; margin: 0 8px;">0:00 / 0:00</span>
            <div class="volume-control" style="position: relative; display: inline-flex; align-items: center;">
              <button class="btn btn-sm" data-action="volume">
                <i data-lucide="volume-2" width="16" height="16"></i>
              </button>
              <div class="volume-slider-popup" style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px; background: var(--bg-primary); border-radius: 6px; padding: 12px 8px; display: none; box-shadow: 0 -4px 12px rgba(0,0,0,0.5); z-index: 1000; width: 40px;">
                <input type="range" min="0" max="100" value="100" style="width: 120px; writing-mode: vertical-lr; direction: rtl; height: 100px;">
              </div>
            </div>
            <button class="btn btn-sm" data-action="fullscreen">
              <i data-lucide="maximize" width="16" height="16"></i>
            </button>
          </div>
        </div>
      `;
      
      // Setup video player controls
      this.setupVideoPlayer(panelContent);
      // Initialize Lucide icons for the video controls
      this.initializeLucideIcons();
      
      // Add error handling for .mov files
      const video = panelContent.querySelector('video');
      if (video) {
        let hasError = false;
        
        video.addEventListener('error', (e) => {
          hasError = true;
          const errorMsg = ext === 'mov' 
            ? `<div class="video-error" style="padding: 20px; text-align: center;">
                 <h3>Unable to play .MOV file</h3>
                 <p>Chrome cannot play this .MOV file due to codec incompatibility.</p>
                 <p><strong>Solutions:</strong></p>
                 <ul style="list-style: none; padding: 0;">
                   <li>• Convert to MP4 (H.264/AAC)</li>
                   <li>• Try Safari or VLC</li>
                 </ul>
               </div>`
            : `<div class="video-error">Failed to load video: ${file.name}</div>`;
          panelContent.innerHTML = errorMsg;
          // Only revoke URL on actual error
          URL.revokeObjectURL(url);
        });
        
        // Don't revoke the URL too early - wait for the video to fully load
        video.addEventListener('loadedmetadata', () => {
          // Don't revoke here - the video still needs the blob URL to play
        });
        
        // Clean up blob URL when panel is removed or video is replaced
        const observer = new MutationObserver(() => {
          if (!document.contains(video) && !hasError) {
            URL.revokeObjectURL(url);
            observer.disconnect();
          }
        });
        observer.observe(panelContent, { childList: true });
      }
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
          <p>Size: ${formatFileSize(file.size)}</p>
          <p style="color: var(--color-text-secondary);">Preview not available for this file type</p>
        </div>
      `;
    }
    
    // Focus the panel to trigger properties update
    this.focusPanel(panel);
  }


  private async importImageSequence(): Promise<void> {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,.jpg,.jpeg,.png,.tga,.tif,.tiff,.exr,.dpx';
    
    input.addEventListener('change', async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      
      if (files.length === 0) return;
      
      
      // Find an existing unpinned panel or create a new one
      const targetPanelId = this.findOrCreateTargetPanel();
      if (!targetPanelId) {
        return;
      }
      
      // Wait for panel to be created
      setTimeout(async () => {
        // Handle the imported files as a potential sequence
        await this.handleMultipleFileDrop(files, targetPanelId);
      }, 100);
    });
    
    // Trigger the file picker
    input.click();
  }

  private async handleMultipleFileDrop(files: File[], panelId: string): Promise<void> {
    // Check if these files form a sequence
    const imageFiles = files.filter(f => isSequenceableImage(f.name));
    
    if (imageFiles.length >= 2) {
      // Try to detect sequences
      const filenames = imageFiles.map(f => f.name);
      const sequences = detectSequences(filenames);
      
      if (sequences.size > 0) {
        // We found at least one sequence
        const firstSequence = sequences.entries().next();
        if (!firstSequence.value) {
          return;
        }
        const [sequenceName, sequenceInfo] = firstSequence.value;
        
        // Open the sequence in the panel
        const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
        if (!panel) return;
        
        const panelContent = panel.querySelector('.panel-content');
        if (!panelContent) return;
        
        // Create sequence player
        panelContent.innerHTML = `<div id="sequence-container-${panelId}" style="width: 100%; height: 100%;"></div>`;
        const sequencePlayer = new ImageSequencePlayer(panelContent.querySelector(`#sequence-container-${panelId}`)!);
        
        // Create blob URLs for all frames in the sequence
        const frameUrls: string[] = [];
        for (const filename of sequenceInfo.files) {
          const file = imageFiles.find(f => f.name === filename);
          if (file) {
            frameUrls.push(URL.createObjectURL(file));
          }
        }
        
        // Load the sequence with blob URLs and auto-play
        await sequencePlayer.loadSequence(sequenceInfo, '', frameUrls);
        sequencePlayer.play();
        
        // Initialize Lucide icons
        this.initializeLucideIcons();
        
        return; // Don't process files individually
      }
    }
    
    // Not a sequence, process files individually
    for (const file of files) {
      await this.openDroppedFileInPanel(file, panelId);
    }
  }



  private async handleInternalFileDrop(sourcePath: string, targetPath: string, dropTarget: HTMLElement, panelId: string): Promise<void> {
    const isTargetFolder = dropTarget.dataset.isFolder === 'true';
    const position = this.getDropPosition(dropTarget);
    
    
    // In a real implementation, you would:
    // 1. Call server API to move/copy the file
    // 2. Update the file explorer
    // 3. Show progress indicators
    
    if (isTargetFolder && position === 'inside') {
    } else {
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

  private updateOpenFileHighlight(): void {
    // Remove all existing selected states
    document.querySelectorAll('.tree-item-content.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // Add selected state to the currently open file
    if (this.currentlyOpenFile) {
      const allTreeItems = document.querySelectorAll('.tree-item-content');
      allTreeItems.forEach(item => {
        const itemPath = item.getAttribute('data-path');
        if (itemPath === this.currentlyOpenFile) {
          item.classList.add('selected');
        }
      });
    }
  }

  private async openFileInBSPPanel(path: string, fileName: string): Promise<void> {
    const targetPanelId = this.findOrCreateTargetPanel();
    if (!targetPanelId) return;

    // Update currently open file and refresh highlights
    this.currentlyOpenFile = path;
    this.updateOpenFileHighlight();

    // Update panel content with file
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${targetPanelId}"]`);
    if (!panel) {
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
      const iconName = getFileIcon(fileType);
      const iconColor = getFileIconColor(fileType);
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
      panel.setAttribute('data-file-source', 'local');
      
      // Add or update breadcrumb for file panels
      this.addOrUpdateFileBreadcrumb(panel as HTMLElement, path);
      
      // Focus the panel that now contains the file
      this.focusPanel(panel);
      
      // Re-initialize Lucide icons for the new file icon
      this.initializeLucideIcons(10);
      
      // Update properties panel
      this.updatePropertiesPanel(panel);
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
    
    // Update properties panel when focus changes
    this.updatePropertiesPanel(panel);
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


  private async loadDirectoryFromHandle(dirHandle: any, panelId: string): Promise<void> {
    
    // Use the existing method to create an explorer panel with the folder
    await this.openDroppedFolderInPanel(dirHandle.name, panelId, dirHandle);
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
          
          // Detect sequences in the native subfolder
          const imageFilenames = sortedFiles
            .filter(f => f.type === 'file' && isSequenceableImage(f.name))
            .map(f => f.name);
          
          
          const sequences = detectSequences(imageFilenames);
          
          // Create a map of file handles for sequences
          const fileHandleMap = new Map<string, FileSystemFileHandle>();
          for await (const entry of folderHandle.values()) {
            if (entry.kind === 'file') {
              fileHandleMap.set(entry.name, entry as FileSystemFileHandle);
            }
          }
          
          // Create a set of files that are part of sequences
          const sequenceFiles = new Set<string>();
          sequences.forEach(seq => {
            seq.files.forEach(f => sequenceFiles.add(f));
          });
          
          // Track which sequences we've already added
          const addedSequences = new Set<string>();
          
          sortedFiles.forEach(file => {
            // Check if this file is part of a sequence
            if (file.type === 'file' && sequenceFiles.has(file.name)) {
              // Find which sequence this file belongs to
              let foundSequence = null;
              for (const [seqName, seqInfo] of sequences.entries()) {
                if (seqInfo.files.includes(file.name)) {
                  foundSequence = [seqName, seqInfo];
                  break;
                }
              }
              
              // Only add the sequence once (for the first file in the sequence)
              if (foundSequence && !addedSequences.has(foundSequence[0] as string)) {
                const [seqName, seqInfo] = foundSequence as [string, SequenceInfo];
                addedSequences.add(seqName);
                
                // Store the file handles for this sequence globally
                const sequenceKey = `${folderName}/${seqName}`;
                this.nativeSequenceHandles.set(sequenceKey, fileHandleMap);
                
                // Create a special tree item for the sequence with native flag and folder name
                const sequenceItem = this.createSequenceTreeItem(seqInfo, seqName, `${folderName}`, panelId, currentLevel + 1, true, folderName);
                childrenContainer.appendChild(sequenceItem);
              }
            } else if (file.type === 'directory' || !sequenceFiles.has(file.name)) {
              // Regular file or directory (not part of a sequence)
              const childItem = this.createNativeTreeItem(file, panelId, folderHandle, currentLevel + 1);
              childrenContainer.appendChild(childItem);
            }
          });
          
          // Re-initialize Lucide icons for newly loaded items
          this.initializeLucideIcons(10);

        } catch (error) {
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
      const iconName = getFileIcon(fileType);
const iconColor = getFileIconColor(fileType);
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
      panel.setAttribute('data-file-source', 'local');
      
      // Add or update breadcrumb for file panels - for native files, just show the filename
      this.addOrUpdateFileBreadcrumb(panel as HTMLElement, fileName);
      
      // Focus the panel that now contains the file
      this.focusPanel(panel);
      
      // Re-initialize Lucide icons for the new file icon
      this.initializeLucideIcons(10);
      
      // Update properties panel
      this.updatePropertiesPanel(panel);
    }
  }



  private setupVideoPlayer(container: HTMLElement): void {
    // Find the actual video player container
    const videoPlayer = container.querySelector('.video-player') as HTMLElement || container;
    
    const video = container.querySelector('video') as HTMLVideoElement;
    const playBtn = container.querySelector('[data-action="play"]') as HTMLButtonElement;
    const volumeBtn = container.querySelector('[data-action="volume"]') as HTMLButtonElement;
    const volumeControl = container.querySelector('.volume-control') as HTMLElement;
    const volumePopup = container.querySelector('.volume-slider-popup') as HTMLElement;
    const volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
    const timeLabel = container.querySelector('.video-time-label') as HTMLElement;
    const timeline = container.querySelector('.timeline') as HTMLElement;
    const timelineHandle = timeline?.querySelector('.timeline-handle') as HTMLElement;
    const timelineLabel = timeline?.querySelector('.timeline-playhead-label') as HTMLElement;
    const videoControls = container.querySelector('.video-controls') as HTMLElement;
    
    // Debug: log what we found
    
    if (!video) return;
    
    // Ensure videos loop by default
    video.loop = true;

    // Using shared formatTime from utils/time
    
    // Set initial state - video starts playing and muted
    video.muted = true;
    volumeSlider && (volumeSlider.value = '0');
    
    // Add focus handling for dimming controls
    if (videoControls) {
      // Set initial unfocused state
      videoControls.style.opacity = '0.6';
      videoControls.style.transition = 'opacity 0.3s ease';
      
      // Focus on hover or interaction
      container.addEventListener('mouseenter', () => {
        videoControls.style.opacity = '1';
      });
      
      container.addEventListener('mouseleave', () => {
        videoControls.style.opacity = '0.6';
      });
      
      // Also brighten on video interaction
      video.addEventListener('click', () => {
        videoControls.style.opacity = '1';
        setTimeout(() => {
          if (!container.matches(':hover')) {
            videoControls.style.opacity = '0.6';
          }
        }, 3000);
      });
    }
    
    // Update play button icon based on video state
    const updatePlayButton = () => {
      if (playBtn) {
        if (video.paused) {
          playBtn.innerHTML = '<i data-lucide="play" width="16" height="16"></i>';
        } else {
          playBtn.innerHTML = '<i data-lucide="pause" width="16" height="16"></i>';
        }
        this.initializeLucideIcons();
      }
    };
    
    // Set initial play button state
    updatePlayButton();
    
    // Listen for play/pause events from video itself (e.g., clicking on video)
    video.addEventListener('play', updatePlayButton);
    video.addEventListener('pause', updatePlayButton);
    
    // Play/pause functionality
    playBtn?.addEventListener('click', () => {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    });
    
    // Volume popover control
    if (volumeControl && volumePopup) {
      let hoverTimeout: number | null = null;
      
      const showPopup = () => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        volumePopup.style.display = 'block';
      };
      
      const hidePopup = () => {
        hoverTimeout = window.setTimeout(() => {
          volumePopup.style.display = 'none';
        }, 300);
      };
      
      volumeControl.addEventListener('mouseenter', showPopup);
      volumeControl.addEventListener('mouseleave', hidePopup);
      volumePopup.addEventListener('mouseenter', showPopup);
      volumePopup.addEventListener('mouseleave', hidePopup);
    }
    
    // Volume control
    volumeSlider?.addEventListener('input', () => {
      video.volume = parseInt(volumeSlider.value) / 100;
      video.muted = video.volume === 0;
      updateVolumeIcon();
    });
    
    // Volume button toggle
    volumeBtn?.addEventListener('click', () => {
      video.muted = !video.muted;
      if (volumeSlider) {
        volumeSlider.value = video.muted ? '0' : '100';
        video.volume = video.muted ? 0 : 1;
      }
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
    
    // Fullscreen functionality
    const fullscreenBtn = container.querySelector('[data-action="fullscreen"]') as HTMLButtonElement;
    
    if (fullscreenBtn && video) {
      fullscreenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
          // Enter fullscreen - try container first, then video
          if (videoPlayer.requestFullscreen) {
            videoPlayer.requestFullscreen();
          } else if ((videoPlayer as any).webkitRequestFullscreen) {
            (videoPlayer as any).webkitRequestFullscreen();
          } else if (video.requestFullscreen) {
            video.requestFullscreen();
          } else if ((video as any).webkitRequestFullscreen) {
            (video as any).webkitRequestFullscreen();
          }
        } else {
          // Exit fullscreen
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
          }
        }
      });
      
      // Update button icon on fullscreen change
      ['fullscreenchange', 'webkitfullscreenchange'].forEach(event => {
        document.addEventListener(event, () => {
          const isFS = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
          fullscreenBtn.innerHTML = isFS 
            ? '<i data-lucide="minimize" width="16" height="16"></i>'
            : '<i data-lucide="maximize" width="16" height="16"></i>';
          this.initializeLucideIcons();
        });
      });
    }
    
    // Timeline scrubbing
    let isDragging = false;
    
    const updateTimeline = (percentage: number) => {
      if (!timelineHandle || !video.duration) return;
      timelineHandle.style.left = `${percentage}%`;
      video.currentTime = (percentage / 100) * video.duration;
      if (timelineLabel) {
        timelineLabel.textContent = formatTime(video.currentTime);
      }
      
      // Update timeline progress bar
      const progress = timeline?.querySelector('.timeline-progress') as HTMLElement;
      if (progress) {
        progress.style.width = `${percentage}%`;
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
    
    // Keyboard controls for arrow key scrubbing
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if video player is focused or visible
      if (!container.contains(document.activeElement) && document.activeElement !== video) {
        // Check if video player panel is visible
        const videoPanel = container.closest('.bsp-panel') as HTMLElement;
        if (!videoPanel || videoPanel.style.display === 'none') return;
      }
      
      const skipAmount = e.shiftKey ? 10 : 5; // Hold shift for larger skips
      
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - skipAmount);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + skipAmount);
          break;
        case ' ':
          // Spacebar to play/pause
          e.preventDefault();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;
      }
    };
    
    // Add keyboard listener to the container and video
    container.addEventListener('keydown', handleKeyPress);
    video.addEventListener('keydown', handleKeyPress);
    // Also listen on document level when video has focus
    document.addEventListener('keydown', (e) => {
      if (document.activeElement === video || container.contains(document.activeElement)) {
        handleKeyPress(e);
      }
    });
    
    // Make video focusable
    video.tabIndex = 0;
    
    // Update time labels and generate ticks
    video.addEventListener('loadedmetadata', () => {
      
      if (timeLabel) {
        timeLabel.textContent = `0:00 / ${formatTime(video.duration)}`;
      }
      
      // Generate timeline ticks based on video duration
      // The ticks container is inside .timeline which is inside .video-controls
      const ticksContainer = container.querySelector('.timeline-ticks') as HTMLElement;
      
      // If not found, let's check what IS in the container
      if (!ticksContainer) {
      }
      
      if (ticksContainer && video.duration) {
        // Clear existing ticks
        ticksContainer.innerHTML = '';
        
        // Simple approach - just add ticks at regular intervals
        const numTicks = Math.min(30, Math.floor(video.duration * 2)); // 2 ticks per second, max 30
        
        for (let i = 0; i <= numTicks; i++) {
          const percentage = (i / numTicks) * 100;
          const tick = document.createElement('div');
          tick.className = 'timeline-tick';
          
          // Make every 5th tick a major tick
          if (i % 5 === 0) {
            tick.classList.add('major');
          }
          
          tick.style.left = `${percentage}%`;
          tick.style.position = 'absolute'; // Ensure position is set
          ticksContainer.appendChild(tick);
        }
        
        // Debug: Check if ticks were actually added
        if (ticksContainer.children.length > 0) {
        } else {
        }
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
        
        // Update timeline progress bar
        const progress = timeline?.querySelector('.timeline-progress') as HTMLElement;
        if (progress) {
          progress.style.width = `${percentage}%`;
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
    
    resizers.forEach(resizer => {
      // Add drag over events to resizers
      resizer.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
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
          resizer.classList.remove('drag-over-divider');
        }
      });
      
      resizer.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        resizer.classList.remove('drag-over-divider');
        
        // Clean up any other highlights
        this.cleanupAllDragHighlights();
        
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
    
    // Get the node ID from the resizer
    const nodeId = resizer.dataset.nodeId;
    if (!nodeId || !this.bspManager) {
      return;
    }
    
    // Get the direction from the resizer
    const direction = resizer.dataset.direction;
    const isHorizontal = direction === 'horizontal';
    
    
    // Find the largest panel to split instead of trying to match resizer position
    const allPanels = document.querySelectorAll('.bsp-panel');
    let largestPanel: HTMLElement | null = null;
    let largestArea = 0;
    
    
    for (const panel of allPanels) {
      const rect = panel.getBoundingClientRect();
      const area = rect.width * rect.height;
      const panelId = panel.getAttribute('data-panel-id');
      
      
      if (area > largestArea) {
        largestArea = area;
        largestPanel = panel as HTMLElement;
      }
    }
    
    if (largestPanel) {
      const targetPanelId = largestPanel.getAttribute('data-panel-id');
      
      if (targetPanelId) {
        // Split the target panel
        const newPanelId = this.bspManager.splitPanel(targetPanelId, direction as 'horizontal' | 'vertical', 'right');
        
        
        if (newPanelId) {
          // Wait for layout to complete, then load the file
          setTimeout(async () => {
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
        }
      }
    } else {
    }
    
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
    const iconName = getFileIcon(fileType);
    const iconColor = getFileIconColor(fileType);

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

  private setupR2ConfigContent(panelId: string): void {
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;

    // Mark this as an R2 config panel
    panel.setAttribute('data-panel-type', 'r2-config');

    // Update panel title with icon
    const panelTitle = panel.querySelector('.panel-title span');
    if (panelTitle && panelTitle.parentElement) {
      panelTitle.parentElement.innerHTML = `
        <i data-lucide="cloudy" class="lucide" style="width: 16px; height: 16px; margin-right: 6px;"></i>
        <span>Bucket</span>
      `;
    }

    // Update panel content with configuration form
    const content = panel.querySelector('.panel-content') as HTMLElement;
    if (content) {
      // Pre-fill with test credentials
      const defaultEndpoint = 'https://13c756aa86b04a8c3067cf111a3f29b1.r2.cloudflarestorage.com';
      const testAccessKey = 'd22eaf144d75b2fd19c02772424588af';
      const testSecretKey = '9c1a08a1cc4337937036f2dd815227a5e03b51c87f09dafa82ac8834c65e81cb';
      const testBucket = 'danger-website-media';
      
      content.innerHTML = `
        <div class="r2-config-container">
          <div class="r2-config-form">
            <!-- Large Icon Header -->
            <div class="config-icon-header">
              <i data-lucide="cloudy" class="lucide config-icon"></i>
            </div>
            
            <!-- Connection Setup Section -->
            <div class="form-section connection-section">
              <div class="section-header">
                <h3>S3-Compatible Storage</h3>
                <span class="section-subtitle">Connect to S3, R2, or any S3-compatible bucket</span>
                <div class="service-examples" style="margin: 8px 0 16px 0; font-size: 12px; opacity: 0.7; line-height: 1.5;">
                  Examples:<br>
                  • R2: https://[account-id].r2.cloudflarestorage.com<br>
                  • S3: https://s3.[region].amazonaws.com<br>
                  • GCS: https://storage.googleapis.com<br>
                  • MinIO: http://localhost:9000
                </div>
                ${window.location.hostname === 'fileui.io' || window.location.hostname.includes('pages.dev') ? `
                <div class="cloudflare-notice" style="margin: 8px 0 16px 0; padding: 12px; background: var(--warning-bg, rgba(255,193,7,0.1)); border: 1px solid var(--warning, #ffc107); border-radius: 6px; font-size: 12px;">
                  <strong>Cloudflare Pages Notice:</strong><br>
                  R2 access on fileui.io requires special setup. For full functionality, run FileUI locally or see the <a href="https://github.com/yourusername/fileui/blob/main/docs/cloudflare-r2-setup.md" target="_blank" style="color: var(--warning);">setup guide</a>.
                </div>
                ` : ''}
              </div>
              
              <div class="form-fields">
                <div class="form-group">
                  <label for="r2-access-key-${panelId}">
                    <span class="label-text">Access Key ID</span>
                    <span class="label-hint">Required</span>
                  </label>
                  <input type="text" id="r2-access-key-${panelId}" class="r2-input" placeholder="Enter Access Key ID" value="${testAccessKey}" />
                </div>
                
                <div class="form-group">
                  <label for="r2-secret-key-${panelId}">
                    <span class="label-text">Secret Access Key</span>
                    <span class="label-hint">Required</span>
                  </label>
                  <input type="password" id="r2-secret-key-${panelId}" class="r2-input" placeholder="Enter Secret Access Key" value="${testSecretKey}" />
                </div>
                
                <div class="form-group">
                  <label for="r2-endpoint-${panelId}">
                    <span class="label-text">Endpoint URL</span>
                    <span class="label-hint">Auto-filled</span>
                  </label>
                  <input type="text" id="r2-endpoint-${panelId}" class="r2-input" value="${defaultEndpoint}" placeholder="R2 Endpoint URL" />
                </div>
                
                <div class="form-group">
                  <label for="r2-bucket-${panelId}">
                    <span class="label-text">Bucket Name</span>
                    <span class="label-hint">Optional</span>
                  </label>
                  <input type="text" id="r2-bucket-${panelId}" class="r2-input" placeholder="bucket-name" value="${testBucket}" />
                </div>
                
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" id="r2-remember-${panelId}" checked />
                    <span>Remember credentials</span>
                  </label>
                </div>
              </div>
              
              <div class="form-actions">
                <button class="btn btn-primary connect-btn" id="r2-connect-${panelId}">
                  <i data-lucide="link" class="lucide" style="width: 16px; height: 16px;"></i>
                  <span>Connect</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Setup connect button handler
      const connectBtn = document.getElementById(`r2-connect-${panelId}`);
      if (connectBtn) {
        connectBtn.addEventListener('click', () => {
          this.handleR2Connect(panelId);
        });
      }

      // Load saved credentials if remember was checked
      this.loadR2Credentials(panelId);
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
    
    // Update with current panel's properties
    this.updatePropertiesForCurrentPanel();
  }

  private updatePropertiesForCurrentPanel(): void {
    // Get the currently focused panel
    const focusedPanel = document.querySelector('.bsp-panel.focused');
    if (focusedPanel) {
      this.updatePropertiesPanel(focusedPanel);
    }
  }

  private async updatePropertiesForExplorerItem(itemPath: string, itemName: string, isFolder: boolean, panelId: string): Promise<void> {
    // Find the properties panel
    const propertiesPanel = document.querySelector('.bsp-panel[data-panel-type="properties"]');
    if (!propertiesPanel) return;

    const propertiesContent = propertiesPanel.querySelector('.properties-content');
    if (!propertiesContent) return;

    try {
      let metadata: any = {};

      if (isFolder) {
        // For folders, just show basic info
        metadata = {
          name: itemName,
          path: itemPath,
          type: 'folder',
          source: 'Local'
        };
      } else {
        // For files, fetch metadata from the server
        const response = await fetch(`/api/metadata?path=${encodeURIComponent(itemPath)}`);
        if (response.ok) {
          metadata = await response.json();
          metadata.source = 'Local';
        } else {
          // If metadata fetch fails, use basic info
          const fileType = getFileType(itemName);
          const extension = itemName.includes('.') ? itemName.split('.').pop() || '' : '';
          metadata = {
            name: itemName,
            path: itemPath,
            type: fileType,
            extension: extension,
            source: 'Local'
          };
        }
      }

      // Update properties display
      this.displayFileProperties(propertiesContent, metadata);

    } catch (error) {
      console.error('Error fetching item metadata:', error);
    }
  }

  private async updatePropertiesForR2Item(itemPath: string, itemName: string, isFolder: boolean, panelId: string): Promise<void> {
    // Find the properties panel
    const propertiesPanel = document.querySelector('.bsp-panel[data-panel-type="properties"]');
    if (!propertiesPanel) return;

    const propertiesContent = propertiesPanel.querySelector('.properties-content');
    if (!propertiesContent) return;

    const fileType = isFolder ? 'folder' : getFileType(itemName);
    const extension = !isFolder ? itemName.split('.').pop() || '' : '';
    
    const metadata = {
      name: itemName,
      path: itemPath,
      type: fileType,
      extension: extension,
      source: 'R2 Bucket'
    };

    // Update properties display
    this.displayFileProperties(propertiesContent, metadata);
  }

  private async updatePropertiesPanel(focusedPanel: Element): Promise<void> {
    // Find the properties panel
    const propertiesPanel = document.querySelector('.bsp-panel[data-panel-type="properties"]');
    if (!propertiesPanel) return;

    // Get file information from the focused panel
    const filePath = focusedPanel.getAttribute('data-file-path');
    const fileName = focusedPanel.getAttribute('data-file-name');
    const fileSource = focusedPanel.getAttribute('data-file-source'); // 'local' or 'r2'
    const panelType = focusedPanel.getAttribute('data-panel-type');

    // Skip if focused panel is not a file panel
    // Check if it's a system panel type OR if it has no file info at all
    const isSystemPanel = ['explorer', 'properties', 'terminal', 'r2-browser', 'r2-config'].includes(panelType || '');
    const hasFileInfo = filePath || fileName;
    
    if (isSystemPanel || !hasFileInfo) {
      // Clear properties panel for non-file panels
      const propertiesContent = propertiesPanel.querySelector('.properties-content');
      if (propertiesContent) {
        propertiesContent.innerHTML = `
          <div class="property-section">
            <h4 class="property-section-title">File Info</h4>
            <div class="property-item">
              <span class="property-label">No file selected</span>
            </div>
          </div>
        `;
      }
      return;
    }

    // Update the properties content
    const propertiesContent = propertiesPanel.querySelector('.properties-content');
    if (!propertiesContent) return;

    // Show loading state
    const fileInfoSection = propertiesContent.querySelector('.property-section:last-child');
    if (fileInfoSection) {
      fileInfoSection.innerHTML = `
        <h4 class="property-section-title">File Info</h4>
        <div class="property-item">
          <span class="property-label">Loading...</span>
        </div>
      `;
    }

    try {
      let metadata: any = {};

      if (fileSource === 'r2') {
        // For R2 files, we already have some basic info
        const fileType = getFileType(fileName || '');
        const extension = fileName?.split('.').pop() || '';
        
        metadata = {
          name: fileName || 'Unknown',
          path: filePath,
          type: fileType,
          extension: extension,
          source: 'R2 Bucket'
        };

        // For images/videos from R2, we might want to fetch additional metadata
        if (['image', 'video'].includes(fileType)) {
          // We could potentially fetch EXIF data or video metadata here
          // For now, we'll just show basic info
        }
      } else {
        // For local files, fetch metadata from the server
        // Use filePath if available, otherwise try to construct from fileName
        const pathToUse = filePath || fileName;
        if (pathToUse) {
          const response = await fetch(`/api/metadata?path=${encodeURIComponent(pathToUse)}`);
          if (response.ok) {
            metadata = await response.json();
            metadata.source = 'Local';
          } else {
            // If metadata fetch fails, use basic info
            const nameToUse = fileName || pathToUse.split('/').pop() || 'Unknown';
            metadata = {
              name: nameToUse,
              path: pathToUse,
              type: getFileType(nameToUse),
              extension: nameToUse.includes('.') ? nameToUse.split('.').pop() || '' : '',
              source: 'Local'
            };
          }
        }
      }

      // Update properties display
      this.displayFileProperties(propertiesContent, metadata, focusedPanel);

    } catch (error) {
      console.error('Error fetching file metadata:', error);
      
      // Show error state
      if (fileInfoSection) {
        fileInfoSection.innerHTML = `
          <h4 class="property-section-title">File Info</h4>
          <div class="property-item">
            <span class="property-label">Error loading metadata</span>
          </div>
        `;
      }
    }
  }

  private displayFileProperties(container: Element, metadata: any, focusedPanel?: Element): void {
    // Use the type from metadata if available, otherwise derive from filename
    const fileType = metadata.type || (metadata.name ? getFileType(metadata.name) : 'unknown');
    
    let propertiesHTML = `
      <div class="property-section">
        <h4 class="property-section-title">File Info</h4>
        <div class="property-item">
          <span class="property-label">Name:</span>
          <span class="property-value" title="${escapeHtml(metadata.name || '')}">${escapeHtml(metadata.name || 'Unknown')}</span>
        </div>
        <div class="property-item">
          <span class="property-label">Type:</span>
          <span class="property-value">${fileType.charAt(0).toUpperCase() + fileType.slice(1).replace('file-', '')}</span>
        </div>
        <div class="property-item">
          <span class="property-label">Extension:</span>
          <span class="property-value">${metadata.extension || '-'}</span>
        </div>
        <div class="property-item">
          <span class="property-label">Source:</span>
          <span class="property-value">${metadata.source || 'Unknown'}</span>
        </div>
    `;

    if (metadata.size !== undefined) {
      propertiesHTML += `
        <div class="property-item">
          <span class="property-label">Size:</span>
          <span class="property-value">${formatFileSize(metadata.size)}</span>
        </div>
      `;
    }

    if (metadata.modified) {
      propertiesHTML += `
        <div class="property-item">
          <span class="property-label">Modified:</span>
          <span class="property-value" title="${metadata.modified}">${new Date(metadata.modified).toLocaleDateString()}</span>
        </div>
      `;
    }

    if (metadata.created) {
      propertiesHTML += `
        <div class="property-item">
          <span class="property-label">Created:</span>
          <span class="property-value" title="${metadata.created}">${new Date(metadata.created).toLocaleDateString()}</span>
        </div>
      `;
    }

    propertiesHTML += `</div>`;

    // Add media-specific metadata section
    if (['image', 'video'].includes(fileType)) {
      propertiesHTML += `
        <div class="property-section">
          <h4 class="property-section-title">Media Info</h4>
      `;

      // For images
      if (fileType === 'image') {
        // If we're showing an image, we can get dimensions from the img element
        const imagePanel = document.querySelector(`.bsp-panel[data-file-path="${metadata.path || metadata.name}"] img`);
        if (imagePanel && imagePanel instanceof HTMLImageElement) {
          if (imagePanel.naturalWidth && imagePanel.naturalHeight) {
            propertiesHTML += `
              <div class="property-item">
                <span class="property-label">Dimensions:</span>
                <span class="property-value">${imagePanel.naturalWidth} × ${imagePanel.naturalHeight}</span>
              </div>
            `;
          } else {
            // Image not loaded yet, wait for it
            imagePanel.addEventListener('load', () => {
              if (focusedPanel) {
                this.updatePropertiesPanel(focusedPanel);
              }
            }, { once: true });
          }
        }
      }

      // For videos
      if (fileType === 'video') {
        const videoPanel = document.querySelector(`.bsp-panel[data-file-path="${metadata.path || metadata.name}"] video`);
        if (videoPanel && videoPanel instanceof HTMLVideoElement) {
          if (videoPanel.readyState >= 1) { // HAVE_METADATA
            propertiesHTML += `
              <div class="property-item">
                <span class="property-label">Duration:</span>
                <span class="property-value">${formatTime(videoPanel.duration || 0)}</span>
              </div>
            `;
            
            if (videoPanel.videoWidth && videoPanel.videoHeight) {
              propertiesHTML += `
                <div class="property-item">
                  <span class="property-label">Resolution:</span>
                  <span class="property-value">${videoPanel.videoWidth} × ${videoPanel.videoHeight}</span>
                </div>
              `;
            }
          } else {
            // Video metadata not loaded yet, wait for it
            videoPanel.addEventListener('loadedmetadata', () => {
              if (focusedPanel) {
                this.updatePropertiesPanel(focusedPanel);
              }
            }, { once: true });
          }
        }
      }

      propertiesHTML += `</div>`;
    }

    container.innerHTML = propertiesHTML;
  }

  private pinPanel(panelId: string): void {
    if (this.bspManager) {
      // Get the panel to check if it's already pinned
      const panelElement = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
      if (panelElement && !panelElement.classList.contains('is-pinned')) {
        this.bspManager.togglePinPanel(panelId);
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

  private handleR2Connect(panelId: string): void {
    // Get form values
    const accessKey = (document.getElementById(`r2-access-key-${panelId}`) as HTMLInputElement)?.value;
    const secretKey = (document.getElementById(`r2-secret-key-${panelId}`) as HTMLInputElement)?.value;
    const endpoint = (document.getElementById(`r2-endpoint-${panelId}`) as HTMLInputElement)?.value;
    const bucket = (document.getElementById(`r2-bucket-${panelId}`) as HTMLInputElement)?.value;
    const remember = (document.getElementById(`r2-remember-${panelId}`) as HTMLInputElement)?.checked;

    // Validate required fields
    if (!accessKey || !secretKey || !endpoint) {
      // Status update removed - redundant UI
      return;
    }

    // Update status to connecting
    // Status update removed - redundant UI

    // Store credentials if remember is checked
    if (remember) {
      this.saveR2Credentials(panelId, { accessKey, secretKey, endpoint, bucket });
    }

    // Initialize R2FileSystem and test connection
    const r2fs = new R2FileSystem({ accessKey, secretKey, endpoint, bucket });
    
    // Test connection
    r2fs.testConnection().then(success => {
      if (success) {
        // Store the filesystem instance
        console.log('Storing R2FileSystem for panel:', panelId);
        this.r2FileSystems.set(panelId, r2fs);
        console.log('Current R2FileSystems:', Array.from(this.r2FileSystems.keys()));
        
        // Transform panel to file browser
        this.transformR2PanelToBrowser(panelId, { accessKey, secretKey, endpoint, bucket });
      } else {
        // Connection failed - show error in panel
        const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
        if (panel) {
          const content = panel.querySelector('.bsp-panel-content');
          if (content) {
            // Find or create error div
            let errorDiv = content.querySelector('.connection-error');
            if (!errorDiv) {
              errorDiv = document.createElement('div');
              errorDiv.className = 'connection-error';
              errorDiv.style.cssText = 'color: var(--error); margin: 16px; padding: 16px; background: rgba(255,0,0,0.1); border-radius: 8px; border: 1px solid var(--error);';
              const form = content.querySelector('.connection-form');
              if (form) {
                form.insertAdjacentElement('afterend', errorDiv as Element);
              }
            }
            errorDiv.innerHTML = `
              <strong>Connection Failed</strong><br>
              R2 access on Cloudflare Pages requires special configuration.<br><br>
              <strong>Options:</strong><br>
              1. Run FileUI locally with "npm run dev"<br>
              2. Configure R2 bucket binding in Cloudflare Pages settings<br>
              3. Use a different S3-compatible service
            `;
          }
        }
      }
    }).catch(error => {
      console.error('R2 connection error:', error);
      // Show error in panel
      const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
      if (panel) {
        const content = panel.querySelector('.bsp-panel-content');
        if (content) {
          let errorDiv = content.querySelector('.connection-error');
          if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'connection-error';
            errorDiv.style.cssText = 'color: var(--error); margin: 16px; padding: 16px; background: rgba(255,0,0,0.1); border-radius: 8px; border: 1px solid var(--error);';
            const form = content.querySelector('.connection-form');
            if (form) {
              form.insertAdjacentElement('afterend', errorDiv as Element);
            }
          }
          errorDiv.textContent = `Connection error: ${(error as Error).message}`;
        }
      }
    });
  }

  // Status update method removed - redundant UI

  private saveR2Credentials(panelId: string, credentials: any): void {
    // Simple encryption - in production, use a proper encryption library
    const encrypted = btoa(JSON.stringify(credentials));
    localStorage.setItem(`fileui-r2-creds-${panelId}`, encrypted);
  }

  private loadR2Credentials(panelId: string): void {
    const encrypted = localStorage.getItem(`fileui-r2-creds-${panelId}`);
    if (!encrypted) return;

    try {
      const credentials = JSON.parse(atob(encrypted));
      
      // Fill form fields
      const accessKeyInput = document.getElementById(`r2-access-key-${panelId}`) as HTMLInputElement;
      const secretKeyInput = document.getElementById(`r2-secret-key-${panelId}`) as HTMLInputElement;
      const endpointInput = document.getElementById(`r2-endpoint-${panelId}`) as HTMLInputElement;
      const bucketInput = document.getElementById(`r2-bucket-${panelId}`) as HTMLInputElement;
      const rememberInput = document.getElementById(`r2-remember-${panelId}`) as HTMLInputElement;

      if (accessKeyInput) accessKeyInput.value = credentials.accessKey || '';
      if (secretKeyInput) secretKeyInput.value = credentials.secretKey || '';
      if (endpointInput) endpointInput.value = credentials.endpoint || '';
      if (bucketInput) bucketInput.value = credentials.bucket || '';
      if (rememberInput) rememberInput.checked = true;
    } catch (error) {
      console.error('Failed to load R2 credentials:', error);
    }
  }

  private transformR2PanelToBrowser(panelId: string, credentials: any): void {
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;

    // Update panel type
    panel.setAttribute('data-panel-type', 'r2-browser');

    // Update panel title
    const panelTitle = panel.querySelector('.panel-title span');
    if (panelTitle && panelTitle.parentElement) {
      const bucketName = credentials.bucket || 'All Buckets';
      panelTitle.parentElement.innerHTML = `
        <i data-lucide="cloud" class="lucide" style="width: 16px; height: 16px; margin-right: 6px;"></i>
        <span>R2: ${bucketName}</span>
      `;
    }

    // Update panel content to file browser
    const content = panel.querySelector('.panel-content') as HTMLElement;
    if (content) {
      // Match file explorer structure more closely
      content.innerHTML = `
        <div class="file-explorer-content r2-browser" data-panel-id="${panelId}">
          <div class="tree" aria-label="R2 Browser">
            <div class="loading-indicator">Loading R2 contents...</div>
          </div>
        </div>
      `;

      // Load R2 contents
      this.loadR2Contents(panelId, '');
    }

    // Re-initialize Lucide icons
    this.initializeLucideIcons(10);
  }

  private disconnectR2(panelId: string): void {
    // Clean up filesystem instance
    this.r2FileSystems.delete(panelId);
    
    // Clean up expanded folders state
    this.r2ExpandedFolders.delete(panelId);
    
    // Clean up selection state
    this.r2SelectedItems.delete(panelId);
    this.r2LastSelectedItem.delete(panelId);
    
    // Transform back to config panel
    this.setupR2ConfigContent(panelId);
  }

  private handleGoogleDriveConnect(panelId: string): void {
    // Get form values
    const serviceKeyInput = document.getElementById(`gd-service-key-${panelId}`) as HTMLTextAreaElement;
    const folderIdInput = document.getElementById(`gd-folder-id-${panelId}`) as HTMLInputElement;
    const rememberInput = document.getElementById(`gd-remember-${panelId}`) as HTMLInputElement;

    const serviceKey = serviceKeyInput?.value.trim();
    const folderId = folderIdInput?.value.trim();
    const remember = rememberInput?.checked;

    // Validate required fields
    if (!serviceKey) {
      // Status update removed - redundant UI
      return;
    }

    // Try to parse JSON
    try {
      const parsed = JSON.parse(serviceKey);
      if (!parsed.client_email || !parsed.private_key) {
        throw new Error('Invalid service account key format');
      }
    } catch (error) {
      // Status update removed - redundant UI
      return;
    }

    // Update status to connecting
    // Status update removed - redundant UI

    // Store credentials if remember is checked
    if (remember) {
      this.saveGoogleDriveCredentials(panelId, { serviceKey, folderId });
    }

    // For now, simulate connection (real implementation would verify with Google)
    setTimeout(() => {
      // Status update removed - redundant UI
      
      // Store credentials temporarily for this session
      this.googleDriveCredentials.set(panelId, { serviceKey, folderId });
      
      // Transform panel to file browser
      this.transformGoogleDrivePanelToBrowser(panelId, folderId || 'root');
    }, 1000);
  }



  private transformGoogleDrivePanelToBrowser(panelId: string, folderId: string): void {
    console.log('transformGoogleDrivePanelToBrowser called with:', { panelId, folderId });
    
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) {
      console.error('Panel not found with id:', panelId);
      return;
    }

    console.log('Found panel:', panel);

    // Update panel type
    panel.setAttribute('data-panel-type', 'google-drive-browser');

    // Update panel title
    const panelTitle = panel.querySelector('.panel-title span');
    console.log('Panel title element:', panelTitle);
    
    if (panelTitle && panelTitle.parentElement) {
      panelTitle.parentElement.innerHTML = `
        <img src="/drive_icon.svg" class="panel-header-drive-icon" alt="Google Drive" style="margin-right: 6px;" />
        <span>Google Drive</span>
      `;
    }

    // Update panel content to file browser
    const content = panel.querySelector('.panel-content') as HTMLElement;
    console.log('Panel content element:', content);
    
    if (content) {
      console.log('Setting panel content HTML...');
      content.innerHTML = `
        <div class="file-explorer-content google-drive-browser" data-panel-id="${panelId}">
          <div class="google-drive-browser-header">
            <div class="google-drive-browser-path">
              <button class="breadcrumb-item" data-path="root" title="My Drive">
                <i data-lucide="hard-drive" class="lucide" style="width: 14px; height: 14px;"></i>
                <span>My Drive</span>
              </button>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-current">Shared Folder</span>
            </div>
          </div>
          <div class="file-list-container">
            <div class="file-list loading-state">
              <div class="loading-indicator">
                <i data-lucide="loader-2" class="lucide spinning"></i>
                <span>Loading folder contents...</span>
              </div>
            </div>
          </div>
        </div>
      `;

      // Initialize Lucide icons
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }

      // Store the folder ID for later use
      panel.setAttribute('data-google-drive-folder', folderId);

      // Get the stored credentials
      const credentials = this.googleDriveCredentials.get(panelId);
      if (credentials) {
        // Create GoogleDriveFileSystem instance
        const gdfs = new GoogleDriveFileSystem(credentials);
        
        // Store the file system instance
        this.googleDriveFileSystems.set(panelId, gdfs);
        
        // Load the folder contents
        this.loadGoogleDriveContents(panelId, folderId);
      }
    } else {
      console.error('Panel content not found!');
    }
  }

  private async loadGoogleDriveContents(panelId: string, folderId: string): Promise<void> {
    const gdfs = this.googleDriveFileSystems.get(panelId);
    if (!gdfs) return;

    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;

    const fileList = panel.querySelector('.file-list');
    if (!fileList) return;

    try {
      // Load files from Google Drive
      const files = await gdfs.listFiles(folderId);
      
      if (files.length === 0) {
        fileList.innerHTML = `
          <div class="empty-state">
            <i data-lucide="folder-open" class="lucide" style="width: 48px; height: 48px; opacity: 0.3;"></i>
            <p>This folder is empty</p>
          </div>
        `;
      } else {
        // Display files similar to R2 browser
        const sortedFiles = sortFiles(files);
        fileList.innerHTML = '';
        fileList.classList.remove('loading-state');
        
        const tree = document.createElement('div');
        tree.className = 'tree';
        
        sortedFiles.forEach((file: FileItem) => {
          const item = this.createFileItemElement(file, 'google-drive', panelId);
          tree.appendChild(item);
        });
        
        fileList.appendChild(tree);
      }
      
      // Initialize Lucide icons
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    } catch (error) {
      console.error('Error loading Google Drive contents:', error);
      fileList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-circle" class="lucide" style="width: 48px; height: 48px; opacity: 0.3; color: var(--error);"></i>
          <p>Error loading folder contents</p>
          <p style="font-size: var(--text-xs); opacity: 0.6;">${error}</p>
        </div>
      `;
      
      // Initialize Lucide icons
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  }

  private saveGoogleDriveCredentials(panelId: string, credentials: any): void {
    // Simple base64 encoding for storage (in production, use proper encryption)
    const encoded = btoa(JSON.stringify(credentials));
    localStorage.setItem(`fileui-gd-creds-${panelId}`, encoded);
  }

  private loadGoogleDriveCredentials(panelId: string): void {
    const encoded = localStorage.getItem(`fileui-gd-creds-${panelId}`);
    if (!encoded) return;

    try {
      const credentials = JSON.parse(atob(encoded));
      
      // Fill form fields
      const serviceKeyInput = document.getElementById(`gd-service-key-${panelId}`) as HTMLTextAreaElement;
      const folderIdInput = document.getElementById(`gd-folder-id-${panelId}`) as HTMLInputElement;
      const rememberInput = document.getElementById(`gd-remember-${panelId}`) as HTMLInputElement;

      if (serviceKeyInput && credentials.serviceKey) {
        serviceKeyInput.value = credentials.serviceKey;
      }
      if (folderIdInput && credentials.folderId) {
        folderIdInput.value = credentials.folderId;
      }
      if (rememberInput) {
        rememberInput.checked = true;
      }
    } catch (error) {
      console.error('Failed to load Google Drive credentials:', error);
    }
  }

  // Google Drive status update method removed - redundant UI


  private disconnectGoogleDrive(panelId: string): void {
    // Clear auth token
    localStorage.removeItem('fileui-google-drive-token');
    
    // Transform back to config panel
    this.setupGoogleDriveConfigContent(panelId);
  }

  private async loadGoogleDriveContents(panelId: string, path: string): Promise<void> {
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;

    const treeContainer = panel.querySelector('.tree');
    if (!treeContainer) return;

    // Simulate loading Google Drive files
    // In real implementation, this would call Google Drive API
    const mockFiles = [
      { name: 'Documents', type: 'folder', id: 'doc-123' },
      { name: 'Pictures', type: 'folder', id: 'pic-456' },
      { name: 'Videos', type: 'folder', id: 'vid-789' },
      { name: 'project-render.exr', type: 'file', id: 'file-001', mimeType: 'image/x-exr' },
      { name: 'scene-backup.blend', type: 'file', id: 'file-002', mimeType: 'application/x-blender' },
      { name: 'comp-v3.nk', type: 'file', id: 'file-003', mimeType: 'application/x-nuke' }
    ];

    // Clear loading indicator
    treeContainer.innerHTML = '';

    // Create file items
    mockFiles.forEach(file => {
      const isFolder = file.type === 'folder';
      const fileType = isFolder ? 'folder' : getFileType(file.name);
      const iconName = getFileIcon(fileType);
      const iconColor = getFileIconColor(fileType);

      const item = document.createElement('div');
      item.className = 'tree-item';
      item.innerHTML = `
        <div class="tree-item-content google-drive-item" data-id="${file.id}" data-name="${file.name}" data-is-folder="${isFolder}">
          ${isFolder ? `
            <button class="tree-item-toggle" aria-label="Toggle folder">
              <i data-lucide="chevron-right" class="lucide chevron-icon"></i>
            </button>
          ` : '<div class="tree-item-spacer"></div>'}
          <i data-lucide="${iconName}" class="lucide tree-item-icon" style="color: ${iconColor};"></i>
          <span class="tree-item-label">${file.name}</span>
        </div>
        ${isFolder ? '<div class="tree-item-children" style="display: none;"></div>' : ''}
      `;

      treeContainer.appendChild(item);
    });

    // Re-initialize Lucide icons
    this.initializeLucideIcons(10);

    // Add click handlers
    this.setupGoogleDriveBrowserInteractions(panelId);
  }

  private setupGoogleDriveBrowserInteractions(panelId: string): void {
    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;

    // Handle item clicks
    panel.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const item = target.closest('.google-drive-item') as HTMLElement;
      
      if (item) {
        const isFolder = item.dataset.isFolder === 'true';
        const fileName = item.dataset.name || '';
        const fileId = item.dataset.id || '';

        if (isFolder) {
          // Toggle folder expansion
          const treeItem = item.closest('.tree-item');
          const toggle = treeItem?.querySelector('.tree-item-toggle');
          if (toggle) {
            toggle.classList.toggle('expanded');
            const children = treeItem?.querySelector('.tree-item-children') as HTMLElement;
            if (children) {
              children.style.display = children.style.display === 'none' ? 'block' : 'none';
            }
          }
        } else {
          // Open file in new panel
          console.log(`Opening Google Drive file: ${fileName} (${fileId})`);
          // In real implementation, this would download/stream the file
        }
      }
    });
  }


  private async openR2FileInPanel(sourcePanelId: string, filePath: string): Promise<void> {
    console.log('Opening R2 file in panel:', filePath);
    const r2fs = this.r2FileSystems.get(sourcePanelId);
    if (!r2fs) {
      console.error('R2 filesystem not found for panel:', sourcePanelId);
      return;
    }
    
    // Use the standard logic: find an existing unpinned panel or create a new one
    const targetPanelId = this.findOrCreateTargetPanel();
    if (!targetPanelId) {
      console.error('Could not find or create target panel');
      return;
    }
    
    console.log('Target panel ID:', targetPanelId);
    
    // Wait for the panel to be ready
    setTimeout(async () => {
      const newPanel = document.querySelector(`.bsp-panel[data-panel-id="${targetPanelId}"]`);
      if (!newPanel) {
        console.error('Could not find panel with ID:', targetPanelId);
        return;
      }
      
      console.log('Found panel, loading file:', filePath);
      
      // Get the file name first
      const fileName = filePath.split('/').pop() || 'Unknown';
      
      // Check if panel has no header (initial empty panel) and add one
      if (!newPanel.querySelector('.panel-header')) {
        this.addHeaderToPanel(newPanel as HTMLElement, fileName);
      }
      
      // Mark as R2 file preview panel
      newPanel.setAttribute('data-panel-type', 'r2-file-preview');
      newPanel.setAttribute('data-file-path', filePath);
      newPanel.setAttribute('data-file-name', fileName);
      newPanel.setAttribute('data-file-source', 'r2');
      
      // Update panel title
      const fileType = getFileType(fileName);
      const panelTitle = newPanel.querySelector('.panel-title span');
      if (panelTitle && panelTitle.parentElement) {
        const icon = getFileIcon(fileType);
        const iconColor = getFileIconColor(fileType);
        panelTitle.parentElement.innerHTML = `
          <i data-lucide="${icon}" class="lucide" style="width: 16px; height: 16px; margin-right: 6px; color: ${iconColor};"></i>
          <span>${escapeHtml(fileName)}</span>
        `;
      }
      
      // Load file content
      const content = newPanel.querySelector('.panel-content') as HTMLElement;
      if (content) {
        content.innerHTML = `
          <div class="loading-indicator">
            <i data-lucide="loader" class="lucide spinning"></i>
            <span>Loading file...</span>
          </div>
        `;
        this.initializeLucideIcons(10);
        
        try {
          // Check file type
          const ext = fileName.split('.').pop()?.toLowerCase() || '';
          const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
          const videoExtensions = ['mov', 'mp4', 'mxf', 'r3d', 'ari', 'webm', 'avi', 'mkv', 'm4v', 'flv', 'wmv', 'mpg', 'mpeg', 'm2v', 'f4v', 'ogg', 'ogv'];
          
          if (imageExtensions.includes(ext)) {
            // For images, we need to fetch with credentials and create a blob URL
            const credentials = r2fs.getCredentials();
            
            try {
              console.log('Loading R2 image:', filePath);
              console.log('Using endpoint:', `/api/r2/read?path=${encodeURIComponent(filePath)}`);
              const headers = new Headers();
              headers.append('X-R2-Credentials', btoa(JSON.stringify(credentials)));
              
              const response = await fetch(`/api/r2/read?path=${encodeURIComponent(filePath)}`, {
                headers: headers
              });
              
              console.log('Image response:', response.status, response.statusText);
              if (!response.ok) {
                const errorText = await response.text();
                console.error('Image load error:', errorText);
                throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
              }
              
              const blob = await response.blob();
              console.log('Image blob:', blob.type, blob.size);
              
              // Verify the blob is valid by checking first few bytes
              const arrayBuffer = await blob.slice(0, 4).arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);
              console.log('First 4 bytes:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
              
              // For PNG, should start with 89 50 4E 47
              // For JPEG, should start with FF D8 FF
              
              const imageUrl = URL.createObjectURL(blob);
              console.log('Created blob URL:', imageUrl);
              
              // Create image element
              const img = new Image();
              
              // Set up event handlers before setting src
              img.onload = () => {
                console.log('Image loaded successfully:', img.naturalWidth, 'x', img.naturalHeight);
              };
              
              img.onerror = async (e) => {
                console.error('Image failed to load from blob URL, trying direct data URL');
                
                // Try creating a data URL manually
                try {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64data = reader.result as string;
                    console.log('Base64 data URL preview:', base64data.substring(0, 50) + '...');
                    
                    // Create a new image with the data URL
                    const testImg = document.createElement('img');
                    testImg.src = base64data;
                    testImg.style.maxWidth = '100%';
                    testImg.style.maxHeight = '100%';
                    testImg.style.objectFit = 'contain';
                    
                    content.innerHTML = '';
                    const container = document.createElement('div');
                    container.className = 'image-preview-container';
                    container.appendChild(testImg);
                    content.appendChild(container);
                  };
                  reader.readAsDataURL(blob);
                } catch (err) {
                  console.error('Failed to create data URL:', err);
                  content.innerHTML = `
                    <div class="empty-state">
                      <i data-lucide="image-off" class="lucide" style="width: 48px; height: 48px; opacity: 0.3;"></i>
                      <p>Failed to load image</p>
                      <p class="text-muted">${escapeHtml((err as Error).message)}</p>
                    </div>
                  `;
                  this.initializeLucideIcons(10);
                }
              };
              
              // Now set the src
              img.src = imageUrl;
              img.alt = fileName;
              img.style.maxWidth = '100%';
              img.style.maxHeight = '100%';
              img.style.objectFit = 'contain';
              img.style.display = 'block';
              
              // Create container
              const container = document.createElement('div');
              container.className = 'image-preview-container';
              container.appendChild(img);
              
              // Clear content and append
              content.innerHTML = '';
              content.appendChild(container);
              
              // Update properties panel now that content is loaded
              this.updatePropertiesPanel(newPanel);
              
              // Clean up blob URL when panel is closed
              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  if (mutation.removedNodes.length > 0) {
                    URL.revokeObjectURL(imageUrl);
                    observer.disconnect();
                  }
                });
              });
              observer.observe(newPanel.parentElement!, { childList: true });
              
            } catch (error) {
              console.error('Image loading error:', error);
              content.innerHTML = `
                <div class="empty-state">
                  <i data-lucide="image-off" class="lucide" style="width: 48px; height: 48px; opacity: 0.3;"></i>
                  <p>Failed to load image</p>
                  <p class="text-muted">${escapeHtml((error as Error).message)}</p>
                </div>
              `;
              this.initializeLucideIcons(10);
            }
          } else if (videoExtensions.includes(ext)) {
            // For videos, fetch binary and create blob URL
            const credentials = r2fs.getCredentials();
            
            try {
              console.log('Loading R2 video:', filePath);
              const headers = new Headers();
              headers.append('X-R2-Credentials', btoa(JSON.stringify(credentials)));
              
              const response = await fetch(`/api/r2/read?path=${encodeURIComponent(filePath)}`, {
                headers: headers
              });
              
              if (!response.ok) {
                throw new Error(`Failed to load video: ${response.status} ${response.statusText}`);
              }
              
              const blob = await response.blob();
              const videoUrl = URL.createObjectURL(blob);
              
              content.innerHTML = `
                <div class="video-player" style="display: flex; flex-direction: column; height: 100%;">
                  <video autoplay muted preload="metadata"
                         style="flex: 1; width: 100%; background: #000;">
                    <source src="${videoUrl}" type="video/${ext === 'mov' ? 'quicktime' : ext}">
                    Your browser does not support this video format.
                  </video>
                  <div class="video-controls" style="display: flex; align-items: center; padding: 8px; background: var(--bg-secondary); border-top: 1px solid var(--border-color);">
                    <button class="btn btn-sm" data-action="play">
                      <i data-lucide="play" width="16" height="16"></i>
                    </button>
                    <div class="timeline">
                      <div class="timeline-ticks"></div>
                      <div class="timeline-track">
                        <div class="timeline-progress"></div>
                        <div class="timeline-handle" style="left: 0%;">
                          <div class="timeline-playhead-label">0:00</div>
                          <div class="timeline-playhead-line"></div>
                        </div>
                      </div>
                    </div>
                    <span class="video-time-label" style="font-size: 12px; color: var(--color-text-secondary); min-width: 90px; margin: 0 8px;">0:00 / 0:00</span>
                    <div class="volume-control" style="position: relative; display: inline-flex; align-items: center;">
                      <button class="btn btn-sm" data-action="volume">
                        <i data-lucide="volume-2" width="16" height="16"></i>
                      </button>
                      <div class="volume-slider-popup" style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px; background: #161614; border-radius: 6px; padding: 8px 12px; display: none; box-shadow: 0 -4px 12px rgba(0,0,0,0.8); z-index: 1000;">
                        <input type="range" min="0" max="100" value="0" style="width: 100px;">
                      </div>
                    </div>
                    <button class="btn btn-sm" data-action="fullscreen">
                      <i data-lucide="maximize" width="16" height="16"></i>
                    </button>
                  </div>
                </div>
              `;
              
              // Setup video player controls
              this.setupVideoPlayer(content);
              this.initializeLucideIcons();
              
              // Update properties panel
              this.updatePropertiesPanel(newPanel);
              
              // Clean up blob URL when panel is closed
              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  if (mutation.removedNodes.length > 0) {
                    URL.revokeObjectURL(videoUrl);
                    observer.disconnect();
                  }
                });
              });
              observer.observe(newPanel.parentElement!, { childList: true });
              
              // Add error handling for video
              const video = content.querySelector('video');
              if (video) {
                video.addEventListener('error', () => {
                  URL.revokeObjectURL(videoUrl);
                  content.innerHTML = `
                    <div class="empty-state">
                      <i data-lucide="video-off" class="lucide" style="width: 48px; height: 48px; opacity: 0.3;"></i>
                      <p>Failed to play video</p>
                      <p class="text-muted">This video format may not be supported by your browser</p>
                    </div>
                  `;
                  this.initializeLucideIcons(10);
                });
              }
            } catch (error) {
              console.error('Video loading error:', error);
              content.innerHTML = `
                <div class="empty-state">
                  <i data-lucide="video-off" class="lucide" style="width: 48px; height: 48px; opacity: 0.3;"></i>
                  <p>Failed to load video</p>
                  <p class="text-muted">${escapeHtml((error as Error).message)}</p>
                </div>
              `;
              this.initializeLucideIcons(10);
            }
          } else {
            // For text files, load the content
            const fileContent = await r2fs.readFile(filePath);
            
            // Check if it's markdown
            if (ext === 'md' || ext === 'markdown') {
              // Render markdown
              content.innerHTML = `<div class="markdown-content">${this.md.render(fileContent)}</div>`;
            } else {
              // For other text files, use syntax highlighting
              const language = this.getLanguageFromExtension(ext);
              
              content.innerHTML = `
                <div class="file-content-wrapper">
                  <pre class="file-content"><code class="language-${language}">${escapeHtml(fileContent)}</code></pre>
                </div>
              `;
              
              // If Prism is available, highlight the code
              if ((window as any).Prism) {
                (window as any).Prism.highlightAll();
              }
            }
            
            // Update properties panel
            this.updatePropertiesPanel(newPanel);
          }
        } catch (error) {
          content.innerHTML = `
            <div class="empty-state">
              <i data-lucide="file-x" class="lucide" style="width: 48px; height: 48px; color: var(--error);"></i>
              <p>Error loading file</p>
              <p class="text-muted">${escapeHtml((error as Error).message)}</p>
            </div>
          `;
          this.initializeLucideIcons(10);
        }
      }
    }, 100);
  }

  private getLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'r': 'r',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'fish': 'bash',
      'ps1': 'powershell',
      'html': 'html',
      'htm': 'html',
      'xml': 'xml',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'ini': 'ini',
      'cfg': 'ini',
      'conf': 'ini',
      'md': 'markdown',
      'markdown': 'markdown',
      'tex': 'latex',
      'dockerfile': 'dockerfile',
      'makefile': 'makefile',
      'mk': 'makefile',
    };
    
    return languageMap[ext.toLowerCase()] || 'plaintext';
  }

  private async loadR2Contents(panelId: string, path: string): Promise<void> {
    const r2fs = this.r2FileSystems.get(panelId);
    if (!r2fs) return;

    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;

    const treeContainer = panel.querySelector('.tree');
    if (!treeContainer) return;
    
    // Save expanded folder states before reloading
    const expandedFolders = this.saveR2ExpandedState(panelId, treeContainer as HTMLElement);

    // Show loading indicator
    treeContainer.innerHTML = `
      <div class="loading-indicator">
        <i data-lucide="loader" class="lucide spinning"></i>
        <span>Loading...</span>
      </div>
    `;
    this.initializeLucideIcons(10);

    try {
      console.log('Loading R2 contents for path:', path);
      const files = await r2fs.listFiles(path);
      console.log('Raw files from R2:', files);
      
      // Filter out .keep files
      const filteredFiles = files.filter(file => !file.name.endsWith('.keep'));
      const sortedFiles = sortFiles(filteredFiles);
      console.log('Sorted files:', sortedFiles);

      // Display files
      if (sortedFiles.length === 0) {
        treeContainer.innerHTML = `
          <div class="empty-state">
            <i data-lucide="folder-open" class="lucide" style="width: 48px; height: 48px; opacity: 0.3;"></i>
            <p>This folder is empty</p>
          </div>
        `;
      } else {
        treeContainer.innerHTML = sortedFiles.map(file => this.createR2TreeItem(file, panelId)).join('');

        // Attach event handlers to all tree items
        this.attachR2TreeItemHandlers(treeContainer as HTMLElement, panelId, path);
        
        // Restore expanded folder states
        this.restoreR2ExpandedState(panelId, treeContainer as HTMLElement, expandedFolders);
      }

      // Add click handler to deselect when clicking empty space
      treeContainer.addEventListener('click', (e) => {
        // Only handle if clicking on empty space, not on items
        if ((e.target as HTMLElement).closest('.tree-item')) return;
        
        // Clear selection
        const selectedItems = this.r2SelectedItems.get(panelId);
        if (selectedItems) {
          selectedItems.clear();
          
          // Update visual selection
          treeContainer.querySelectorAll('.tree-item-content.selected').forEach(el => {
            el.classList.remove('selected');
            el.classList.remove('focused');
          });
        }
      });

      // Add context menu to browser background
      treeContainer.addEventListener('contextmenu', (e) => {
        // Only show if clicking on empty space, not on items
        if ((e.target as HTMLElement).closest('.tree-item')) return;
        
        e.preventDefault();
        e.stopPropagation();
        this.showR2ContextMenu(e as MouseEvent, panelId, path, 'background', '', path);
      });

      // Add drag and drop support for moving files to root
      treeContainer.addEventListener('dragover', (e) => {
        // Only handle if dragging over empty space, not items
        if ((e.target as HTMLElement).closest('.tree-item')) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Check if it's an R2 file being dragged
        if (e.dataTransfer && e.dataTransfer.types.includes('text/plain')) {
          e.dataTransfer.dropEffect = 'move';
          treeContainer.classList.add('drag-over-root');
        }
      });

      treeContainer.addEventListener('dragleave', (e) => {
        // Only handle if leaving the tree container itself
        if (e.target !== treeContainer) return;
        
        e.preventDefault();
        e.stopPropagation();
        treeContainer.classList.remove('drag-over-root');
      });

      treeContainer.addEventListener('drop', async (e) => {
        // Don't prevent default or stop propagation for external file drops
        treeContainer.classList.remove('drag-over-root');
        
        if (!e.dataTransfer) return;
        
        // Check if this is an external file drop
        if (e.dataTransfer.files.length > 0) {
          // This is an external file drop, let the panel handler deal with it
          // Don't stop propagation, let it bubble up
          return;
        }
        
        // For internal R2 drags, we handle them here
        e.preventDefault();
        e.stopPropagation();
        
        // Only handle internal R2 file moves to root when dropping on empty space
        if ((e.target as HTMLElement).closest('.tree-item')) return;
        
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          
          // Handle single file drops
          if (data.type === 'r2-file' && data.panelId === panelId) {
            // Move to root (empty path)
            await this.moveR2File(panelId, data.path, '', data.name, path);
          }
          // Handle multi-file drops
          else if (data.type === 'r2-file-multi' && data.panelId === panelId) {
            for (const fileItem of data.items) {
              await this.moveR2File(panelId, fileItem.path, '', fileItem.name, path);
            }
          }
        } catch (error) {
          // Not an R2 file drag, ignore
        }
      });

      this.initializeLucideIcons(10);
    } catch (error) {
      console.error('Error loading R2 contents:', error);
      treeContainer.innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-circle" class="lucide" style="width: 48px; height: 48px; color: var(--error);"></i>
          <p>Error loading contents</p>
          <p class="text-muted">${(error as Error).message}</p>
        </div>
      `;
      this.initializeLucideIcons(10);
    }
  }

  private createR2TreeItem(file: FileItem, panelId: string, level: number = 0): string {
    // Check if it's a directory - R2 returns isDirectory, not type
    const isDirectory = file.isDirectory || file.type === 'directory';
    
    // Get the file type using the same system as the rest of the app
    const fileType = isDirectory ? 'folder' : getFileType(file.name);
    const icon = getFileIcon(fileType);
    const iconColor = getFileIconColor(fileType);
    const displayName = escapeHtml(file.name);
    const sizeStr = !isDirectory && file.size !== undefined ? formatFileSize(file.size) : '';

    return `
      <div class="tree-item" data-path="${escapeHtml(file.path)}" data-type="${isDirectory ? 'directory' : 'file'}" data-panel-id="${panelId}" data-level="${level}">
        <div class="tree-item-content" data-file-type="${fileType}" draggable="${!isDirectory ? 'true' : 'false'}" style="padding-left: ${20 + level * 20}px">
          ${isDirectory ? `
            <button class="tree-item-toggle" aria-label="Toggle folder" data-expanded="false">
              <i data-lucide="chevron-right" class="lucide chevron-icon"></i>
            </button>
          ` : '<div class="tree-item-spacer"></div>'}
          <i data-lucide="${icon}" class="lucide tree-item-icon" style="color: ${iconColor}"></i>
          <span class="tree-item-label">${displayName}</span>
          ${sizeStr ? `<span class="file-size">${sizeStr}</span>` : ''}
        </div>
        ${isDirectory ? '<div class="tree-item-children" style="display: none;"></div>' : ''}
      </div>
    `;
  }

  private showR2ContextMenu(
    event: MouseEvent,
    panelId: string,
    itemPath: string,
    itemType: string,
    itemName: string,
    currentPath: string
  ): void {
    const items: ContextMenuItem[] = [];

    if (itemType === 'background') {
      // Context menu for empty space
      items.push(
        {
          label: 'New Folder',
          icon: 'folder-plus',
          action: () => this.createR2Folder(panelId, currentPath)
        },
        {
          label: 'Upload Files',
          icon: 'upload',
          action: () => this.triggerR2FileUpload(panelId, currentPath)
        },
        {
          label: 'Upload Folder',
          icon: 'folder-up',
          action: () => this.triggerR2FolderUpload(panelId, currentPath)
        },
        { separator: true },
        {
          label: 'Refresh',
          icon: 'refresh-cw',
          action: () => this.loadR2Contents(panelId, currentPath)
        }
      );
    } else if (itemType === 'directory') {
      // Context menu for folders
      items.push(
        {
          label: 'Open',
          icon: 'folder-open',
          action: () => this.loadR2Contents(panelId, itemPath)
        },
        { separator: true },
        {
          label: 'Delete Folder',
          icon: 'trash-2',
          action: () => this.deleteR2Item(panelId, itemPath, itemName, true)
        },
        {
          label: 'Rename',
          icon: 'edit-3',
          action: () => this.renameR2Item(panelId, itemPath, itemName, currentPath)
        }
      );
    } else {
      // Context menu for files
      items.push(
        {
          label: 'Download',
          icon: 'download',
          action: () => this.downloadR2File(panelId, itemPath, itemName)
        },
        { separator: true },
        {
          label: 'Delete',
          icon: 'trash-2',
          action: () => this.deleteR2Item(panelId, itemPath, itemName, false)
        },
        {
          label: 'Rename',
          icon: 'edit-3',
          action: () => this.renameR2Item(panelId, itemPath, itemName, currentPath)
        }
      );
    }

    // Create and show context menu directly
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.style.zIndex = '9999';
    
    items.forEach((item, index) => {
      if (item.separator) {
        const separator = document.createElement('hr');
        separator.className = 'menu-separator';
        menu.appendChild(separator);
      } else if (item.label) {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        if (item.disabled) menuItem.classList.add('disabled');
        
        if (item.icon) {
          menuItem.innerHTML = `<i data-lucide="${item.icon}" class="lucide menu-icon"></i><span>${item.label}</span>`;
        } else {
          menuItem.innerHTML = `<span>${item.label}</span>`;
        }
        
        if (!item.disabled && item.action) {
          menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            item.action!();
            menu.remove();
          });
        }
        
        menu.appendChild(menuItem);
      }
    });
    
    // Remove any existing menu
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
    
    // Add to body
    document.body.appendChild(menu);
    
    // Initialize lucide icons
    this.initializeLucideIcons(10);
    
    // Click outside to close
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  private async createR2Folder(panelId: string, currentPath: string): Promise<void> {
    const r2fs = this.r2FileSystems.get(panelId);
    if (!r2fs) return;

    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;

    const treeContainer = panel.querySelector('.tree');
    if (!treeContainer) return;

    // Create a temporary folder item with inline editing
    const tempId = `new-folder-${Date.now()}`;
    const tempFolderHtml = `
      <div class="tree-item" data-temp-id="${tempId}">
        <div class="tree-item-content" data-file-type="folder">
          <i data-lucide="folder" class="lucide tree-item-icon" style="color: var(--file-project);"></i>
          <input type="text" class="tree-item-rename-input" placeholder="New folder" value="">
        </div>
      </div>
    `;

    // Insert at the beginning of the tree
    const firstChild = treeContainer.firstElementChild;
    if (firstChild && firstChild.classList.contains('empty-state')) {
      // Replace empty state
      treeContainer.innerHTML = tempFolderHtml;
    } else {
      // Insert before first item
      treeContainer.insertAdjacentHTML('afterbegin', tempFolderHtml);
    }

    // Re-initialize icons
    this.initializeLucideIcons(10);

    // Get the input and focus it
    const input = treeContainer.querySelector(`[data-temp-id="${tempId}"] .tree-item-rename-input`) as HTMLInputElement;
    if (!input) return;

    input.focus();
    
    // Handle folder creation
    const createFolder = async () => {
      const folderName = input.value.trim();
      const tempItem = treeContainer.querySelector(`[data-temp-id="${tempId}"]`);
      
      if (!folderName) {
        // Remove temp item if no name entered
        tempItem?.remove();
        return;
      }

      // Validate folder name
      if (folderName.includes('/') || folderName.includes('\\')) {
        alert('Invalid folder name: cannot contain / or \\');
        tempItem?.remove();
        return;
      }

      try {
        // Show loading state
        if (tempItem) {
          tempItem.classList.add('creating');
          input.disabled = true;
        }

        // In S3/R2, folders are created by adding a trailing slash
        const folderPath = currentPath ? `${currentPath}/${folderName}/` : `${folderName}/`;
        
        // Create an empty file to represent the folder
        await r2fs.writeFile(folderPath + '.keep', '');
        
        // Reload the contents
        await this.loadR2Contents(panelId, currentPath);
      } catch (error) {
        console.error('Error creating folder:', error);
        alert('Failed to create folder: ' + (error as Error).message);
        tempItem?.remove();
      }
    };

    // Handle escape/enter keys
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createFolder();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        const tempItem = treeContainer.querySelector(`[data-temp-id="${tempId}"]`);
        tempItem?.remove();
      }
    });

    // Handle blur
    input.addEventListener('blur', () => {
      // Small delay to allow clicks on other elements
      setTimeout(() => {
        if (document.activeElement !== input) {
          createFolder();
        }
      }, 200);
    });
  }


  private async deleteR2Item(panelId: string, itemPath: string, itemName: string, isFolder: boolean): Promise<void> {

    const r2fs = this.r2FileSystems.get(panelId);
    if (!r2fs) return;

    try {
      if (isFolder) {
        // For folders, we need to delete all contents
        // This is a simplified version - in production, you'd want to recursively delete
        alert('Folder deletion not fully implemented yet. Would need to recursively delete all contents.');
      } else {
        // Delete single file
        await fetch(`/api/r2/delete?path=${encodeURIComponent(itemPath)}`, {
          method: 'DELETE',
          headers: {
            'X-R2-Credentials': btoa(JSON.stringify(r2fs.getCredentials()))
          }
        });
      }
      
      // Reload the parent directory
      const parentPath = itemPath.substring(0, itemPath.lastIndexOf('/'));
      await this.loadR2Contents(panelId, parentPath);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete: ' + (error as Error).message);
    }
  }

  private async renameR2Item(panelId: string, itemPath: string, oldName: string, currentPath: string): Promise<void> {
    const r2fs = this.r2FileSystems.get(panelId);
    if (!r2fs) return;

    // Find the tree item in the DOM
    const treeItem = document.querySelector(`.tree-item[data-path="${CSS.escape(itemPath)}"]`);
    if (!treeItem) return;

    const label = treeItem.querySelector('.tree-item-label');
    if (!label) return;

    // Store original text
    const originalText = label.textContent || '';
    
    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tree-item-rename-input';
    input.value = originalText;
    
    // Replace label with input
    label.replaceWith(input);
    
    // Focus and select all text
    input.focus();
    input.select();
    
    // Handle rename completion
    const completeRename = async () => {
      const newName = input.value.trim();
      
      // Restore label
      const newLabel = document.createElement('span');
      newLabel.className = 'tree-item-label';
      newLabel.textContent = originalText;
      input.replaceWith(newLabel);
      
      // Check if name changed
      if (!newName || newName === oldName) {
        return;
      }
      
      // Validate filename
      if (newName.includes('/') || newName.includes('\\')) {
        alert('Invalid filename: cannot contain / or \\');
        return;
      }
      
      try {
        // Show loading state
        treeItem.classList.add('renaming');
        
        // Calculate new path
        const pathParts = itemPath.split('/');
        pathParts[pathParts.length - 1] = newName;
        const newPath = pathParts.join('/');
        
        // In R2/S3, rename = copy + delete
        // First, read the file
        const readResponse = await fetch(`/api/r2/read?path=${encodeURIComponent(itemPath)}`, {
          headers: {
            'X-R2-Credentials': btoa(JSON.stringify(r2fs.getCredentials()))
          }
        });
        
        if (!readResponse.ok) {
          throw new Error('Failed to read file for rename');
        }
        
        const fileContent = await readResponse.blob();
        
        // Then write to new location
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Content = (reader.result as string).split(',')[1];
          
          // Convert base64 back to blob for upload
          const binaryData = atob(base64Content);
          const bytes = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
          }
          const uploadBlob = new Blob([bytes], { type: fileContent.type || 'application/octet-stream' });
          
          const writeResponse = await fetch(`/api/r2/write?path=${encodeURIComponent(newPath)}`, {
            method: 'POST',
            headers: {
              'X-R2-Credentials': btoa(JSON.stringify(r2fs.getCredentials())),
              'Content-Type': fileContent.type || 'application/octet-stream'
            },
            body: uploadBlob
          });
          
          if (!writeResponse.ok) {
            throw new Error('Failed to write file to new location');
          }
          
          // Delete old file
          const deleteResponse = await fetch(`/api/r2/delete?path=${encodeURIComponent(itemPath)}`, {
            method: 'DELETE',
            headers: {
              'X-R2-Credentials': btoa(JSON.stringify(r2fs.getCredentials()))
            }
          });
          
          if (!deleteResponse.ok) {
            // Try to clean up the new file if delete failed
            await fetch(`/api/r2/delete?path=${encodeURIComponent(newPath)}`, {
              method: 'DELETE',
              headers: {
                'X-R2-Credentials': btoa(JSON.stringify(r2fs.getCredentials()))
              }
            });
            throw new Error('Failed to delete old file');
          }
          
          // Success - reload the directory
          await this.loadR2Contents(panelId, currentPath);
        };
        
        reader.readAsDataURL(fileContent);
        
      } catch (error) {
        console.error('Rename error:', error);
        alert('Failed to rename: ' + (error as Error).message);
        treeItem.classList.remove('renaming');
      }
    };
    
    // Handle escape/enter keys
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        completeRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Restore original label
        const newLabel = document.createElement('span');
        newLabel.className = 'tree-item-label';
        newLabel.textContent = originalText;
        input.replaceWith(newLabel);
      }
    });
    
    // Handle blur
    input.addEventListener('blur', () => {
      completeRename();
    });
  }

  private async moveR2File(panelId: string, sourcePath: string, targetFolder: string, fileName: string, currentPath: string, targetElement?: HTMLElement): Promise<void> {
    const r2fs = this.r2FileSystems.get(panelId);
    if (!r2fs) return;

    try {
      // Calculate new path - ensure we handle trailing slashes properly
      let newPath: string;
      if (targetFolder) {
        // Remove any trailing slash from target folder
        const cleanTargetFolder = targetFolder.endsWith('/') ? targetFolder.slice(0, -1) : targetFolder;
        newPath = `${cleanTargetFolder}/${fileName}`;
      } else {
        newPath = fileName;
      }

      // Check if source and target are the same
      if (sourcePath === newPath) {
        return;
      }

      // Show loading indicator on the target folder
      const overlayTarget = targetElement || document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'r2-operation-overlay';
      loadingDiv.innerHTML = `
        <div class="operation-message">
          <i data-lucide="loader-circle" class="lucide spinning"></i>
        </div>
      `;
      
      // Add position relative to the target if it's a folder
      if (targetElement) {
        targetElement.style.position = 'relative';
      }
      
      overlayTarget?.appendChild(loadingDiv);
      this.initializeLucideIcons(10);

      // Read the file content
      const response = await fetch(`/api/r2/read?path=${encodeURIComponent(sourcePath)}`, {
        headers: {
          'X-R2-Credentials': btoa(JSON.stringify(r2fs.getCredentials()))
        }
      });

      if (!response.ok) {
        throw new Error('Failed to read file for move');
      }

      const fileContent = await response.blob();

      // Write to new location
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = (reader.result as string).split(',')[1];
        
        // Convert base64 back to blob for upload
        const binaryData = atob(base64Content);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        const uploadBlob = new Blob([bytes], { type: fileContent.type || 'application/octet-stream' });
        
        const writeResponse = await fetch(`/api/r2/write?path=${encodeURIComponent(newPath)}`, {
          method: 'PUT',
          headers: {
            'X-R2-Credentials': btoa(JSON.stringify(r2fs.getCredentials())),
            'Content-Type': fileContent.type || 'application/octet-stream'
          },
          body: uploadBlob
        });
        
        if (!writeResponse.ok) {
          throw new Error('Failed to write file to new location');
        }
        
        // Delete old file
        const deleteResponse = await fetch(`/api/r2/delete?path=${encodeURIComponent(sourcePath)}`, {
          method: 'DELETE',
          headers: {
            'X-R2-Credentials': btoa(JSON.stringify(r2fs.getCredentials()))
          }
        });
        
        if (!deleteResponse.ok) {
          // Try to clean up the new file if delete failed
          await fetch(`/api/r2/delete?path=${encodeURIComponent(newPath)}`, {
            method: 'DELETE',
            headers: {
              'X-R2-Credentials': btoa(JSON.stringify(r2fs.getCredentials()))
            }
          });
          throw new Error('Failed to delete old file');
        }
        
        // Remove loading overlay
        loadingDiv.remove();
        if (targetElement) {
          targetElement.style.position = '';
        }
        
        // Success - reload the current directory
        await this.loadR2Contents(panelId, currentPath);
      };
      
      reader.readAsDataURL(fileContent);
      
    } catch (error) {
      console.error('Move error:', error);
      // Remove loading overlay if it exists
      overlayTarget?.querySelector('.r2-operation-overlay')?.remove();
      if (targetElement) {
        targetElement.style.position = '';
      }
      alert('Failed to move file: ' + (error as Error).message);
    }
  }

  private saveR2ExpandedState(panelId: string, container: HTMLElement): Set<string> {
    const expanded = new Set<string>();
    
    // Find all expanded folders
    container.querySelectorAll('.tree-item-toggle[data-expanded="true"]').forEach((toggle) => {
      const treeItem = toggle.closest('.tree-item');
      const path = treeItem?.getAttribute('data-path');
      if (path) {
        expanded.add(path);
      }
    });
    
    // Store in our map
    this.r2ExpandedFolders.set(panelId, expanded);
    return expanded;
  }
  
  private async restoreR2ExpandedState(panelId: string, container: HTMLElement, expandedPaths: Set<string>): Promise<void> {
    // For each previously expanded folder, expand it again
    for (const path of expandedPaths) {
      const treeItem = container.querySelector(`.tree-item[data-path="${CSS.escape(path)}"]`);
      if (treeItem) {
        // Trigger the toggle without animation
        await this.toggleR2Folder(treeItem as HTMLElement, panelId, true);
      }
    }
  }

  private async toggleR2Folder(treeItem: HTMLElement, panelId: string, skipAnimation: boolean = false): Promise<void> {
    const toggleBtn = treeItem.querySelector('.tree-item-toggle') as HTMLButtonElement;
    const childrenContainer = treeItem.querySelector('.tree-item-children') as HTMLElement;
    const path = treeItem.getAttribute('data-path');
    
    if (!childrenContainer || !path || !toggleBtn) {
      return;
    }

    const isExpanded = toggleBtn.getAttribute('data-expanded') === 'true';
    
    if (isExpanded) {
      // Collapse
      childrenContainer.style.display = 'none';
      toggleBtn.setAttribute('data-expanded', 'false');
      
      // Remove from expanded folders set
      const expandedSet = this.r2ExpandedFolders.get(panelId) || new Set<string>();
      expandedSet.delete(path);
      this.r2ExpandedFolders.set(panelId, expandedSet);
    } else {
      // Expand
      toggleBtn.setAttribute('data-expanded', 'true');
      
      // Show loading if not already loaded
      if (!childrenContainer.hasChildNodes()) {
        childrenContainer.style.display = 'block';
        childrenContainer.innerHTML = `
          <div class="loading-indicator" style="padding-left: 40px;">
            <i data-lucide="loader" class="lucide spinning"></i>
            <span>Loading...</span>
          </div>
        `;
        this.initializeLucideIcons(10);
        
        try {
          // Load subfolder contents
          const r2fs = this.r2FileSystems.get(panelId);
          if (!r2fs) return;
          
          const files = await r2fs.listFiles(path);
          // Filter out .keep files
          const filteredFiles = files.filter(file => !file.name.endsWith('.keep'));
          const sortedFiles = sortFiles(filteredFiles);
          const currentLevel = parseInt(treeItem.getAttribute('data-level') || '0');
          
          // Clear loading indicator
          childrenContainer.innerHTML = '';
          
          // Add child items
          if (sortedFiles.length === 0) {
            childrenContainer.innerHTML = `
              <div class="empty-folder-message" style="padding-left: ${40 + currentLevel * 20}px; opacity: 0.5; font-style: italic;">
                Empty folder
              </div>
            `;
          } else {
            sortedFiles.forEach(file => {
              const childHtml = this.createR2TreeItem(file, panelId, currentLevel + 1);
              childrenContainer.insertAdjacentHTML('beforeend', childHtml);
            });
            
            // Re-attach event handlers to new child items
            this.attachR2TreeItemHandlers(childrenContainer, panelId, path);
          }
          
          this.initializeLucideIcons(10);
        } catch (error) {
          console.error('Error loading folder contents:', error);
          childrenContainer.innerHTML = `
            <div class="error-message" style="padding-left: 40px; color: var(--error);">
              Failed to load folder contents
            </div>
          `;
        }
      } else {
        // Just show/hide if already loaded
        childrenContainer.style.display = 'block';
      }
      
      // Add to expanded folders set
      const expandedSet = this.r2ExpandedFolders.get(panelId) || new Set<string>();
      expandedSet.add(path);
      this.r2ExpandedFolders.set(panelId, expandedSet);
    }
  }

  private attachR2TreeItemHandlers(container: HTMLElement, panelId: string, currentPath: string): void {
    container.querySelectorAll('.tree-item').forEach(item => {
      // Handle toggle button clicks
      const toggleBtn = item.querySelector('.tree-item-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.toggleR2Folder(item as HTMLElement, panelId);
        });
      }

      // Handle item clicks (not on toggle button)
      const itemContent = item.querySelector('.tree-item-content');
      if (itemContent) {
        itemContent.addEventListener('click', (e) => {
          // Don't handle if clicking on toggle button
          if ((e.target as HTMLElement).closest('.tree-item-toggle')) {
            return;
          }
          
          e.stopPropagation();
          
          const itemPath = item.getAttribute('data-path');
          const itemType = item.getAttribute('data-type');
          
          if (!itemPath) return;
          
          // Handle selection
          this.handleR2ItemSelection(panelId, itemPath, e as MouseEvent);
          
          const itemName = item.querySelector('.tree-item-label')?.textContent || '';
          
          // Update properties panel for selected R2 item
          if (itemName) {
            this.updatePropertiesForR2Item(itemPath, itemName, itemType === 'directory', panelId);
          }
          
          // Only open/toggle on regular click (not ctrl/shift)
          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            if (itemType === 'directory') {
              // For directories, clicking the content area also toggles
              if (toggleBtn) {
                (toggleBtn as HTMLElement).click();
              }
            } else if (itemType === 'file') {
              // Skip .keep files
              if (itemPath.endsWith('.keep')) {
                return;
              }
              // Open file in new panel
              this.openR2FileInPanel(panelId, itemPath);
            }
          }
        });
      }

      // Add context menu
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const itemPath = item.getAttribute('data-path') || '';
        const itemType = item.getAttribute('data-type') || 'file';
        const itemName = item.querySelector('.tree-item-label')?.textContent || 'Unknown';
        
        this.showR2ContextMenu(e as MouseEvent, panelId, itemPath, itemType, itemName, currentPath);
      });

      // Add drag and drop for files
      const itemType = item.getAttribute('data-type');
      const itemPath = item.getAttribute('data-path') || '';
      const itemName = item.querySelector('.tree-item-label')?.textContent || '';

      if (itemType === 'file' && itemContent) {
        itemContent.addEventListener('dragstart', (e) => {
          e.stopPropagation();
          if (e.dataTransfer) {
            const selectedItems = this.r2SelectedItems.get(panelId) || new Set();
            
            // If dragging an unselected item, select only it
            if (!selectedItems.has(itemPath)) {
              this.handleR2ItemSelection(panelId, itemPath, { ctrlKey: false, metaKey: false, shiftKey: false } as MouseEvent);
            }
            
            // Get all selected items for multi-drag
            const draggedItems: Array<{path: string, name: string}> = [];
            selectedItems.forEach(path => {
              const itemEl = container.querySelector(`.tree-item[data-path="${path}"]`);
              if (itemEl) {
                const name = itemEl.querySelector('.tree-item-label')?.textContent || '';
                draggedItems.push({ path, name });
              }
            });
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
              type: 'r2-file-multi',
              items: draggedItems,
              panelId: panelId
            }));
            
            // Add dragging class to all selected items
            selectedItems.forEach(path => {
              const itemEl = container.querySelector(`.tree-item[data-path="${path}"] .tree-item-content`);
              if (itemEl) {
                itemEl.classList.add('dragging');
              }
            });
          }
        });

        itemContent.addEventListener('dragend', () => {
          // Remove dragging class from all items
          container.querySelectorAll('.tree-item-content.dragging').forEach(el => {
            el.classList.remove('dragging');
          });
        });
      }

      // Make folders drop targets
      if (itemType === 'directory') {
        item.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Check if it's an R2 file being dragged
          if (e.dataTransfer && e.dataTransfer.types.includes('text/plain')) {
            e.dataTransfer.dropEffect = 'move';
            item.classList.add('drag-over');
          }
        });

        item.addEventListener('dragleave', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Only remove if leaving the folder entirely
          const rect = item.getBoundingClientRect();
          if (e.clientX < rect.left || e.clientX > rect.right || 
              e.clientY < rect.top || e.clientY > rect.bottom) {
            item.classList.remove('drag-over');
          }
        });

        item.addEventListener('drop', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          item.classList.remove('drag-over');
          
          // Clean up any other highlights
          this.cleanupAllDragHighlights();

          if (!e.dataTransfer) return;

          try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            
            // Handle single file drops (backward compatibility)
            if (data.type === 'r2-file' && data.panelId === panelId) {
              await this.moveR2File(panelId, data.path, itemPath, data.name, currentPath, item as HTMLElement);
            }
            // Handle multi-file drops
            else if (data.type === 'r2-file-multi' && data.panelId === panelId) {
              for (const fileItem of data.items) {
                await this.moveR2File(panelId, fileItem.path, itemPath, fileItem.name, currentPath, item as HTMLElement);
              }
            }
          } catch (error) {
            console.error('Drop error:', error);
          }
        });
      }
    });
  }

  private async downloadR2File(panelId: string, path: string, filename: string): Promise<void> {
    const r2fs = this.r2FileSystems.get(panelId);
    if (!r2fs) return;

    try {
      // Fetch the file content with credentials
      const response = await fetch(`/api/r2/read?path=${encodeURIComponent(path)}`, {
        headers: {
          'X-R2-Credentials': btoa(JSON.stringify(r2fs.getCredentials()))
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file: ' + (error as Error).message);
    }
  }

  private triggerR2FileUpload(panelId: string, currentPath: string): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        await this.uploadR2Files(panelId, currentPath, Array.from(files));
      }
    };
    input.click();
  }

  private triggerR2FolderUpload(panelId: string, currentPath: string): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        await this.uploadR2Files(panelId, currentPath, Array.from(files));
      }
    };
    input.click();
  }

  private async uploadR2Files(panelId: string, currentPath: string, files: File[]): Promise<void> {
    console.log('uploadR2Files called with panelId:', panelId);
    console.log('Available R2FileSystems:', Array.from(this.r2FileSystems.keys()));
    
    const r2fs = this.r2FileSystems.get(panelId);
    if (!r2fs) {
      console.error('No R2FileSystem found for panel:', panelId);
      console.error('Available panels:', Array.from(this.r2FileSystems.keys()));
      return;
    }

    const panel = document.querySelector(`.bsp-panel[data-panel-id="${panelId}"]`);
    if (!panel) return;

    const treeContainer = panel.querySelector('.tree');
    if (!treeContainer) return;

    // Show upload overlay (same style as move operation)
    const overlay = document.createElement('div');
    overlay.className = 'r2-operation-overlay';
    overlay.innerHTML = `
      <div class="operation-message">
        <i data-lucide="loader-circle" class="lucide rotating"></i>
      </div>
    `;
    treeContainer.style.position = 'relative';
    treeContainer.appendChild(overlay);
    this.initializeLucideIcons(10);

    try {
      let completed = 0;
      for (const file of files) {
        const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
        
        // Read file content as base64 for binary safety
        try {
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          
          // Convert to base64
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.slice(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          const base64Content = btoa(binary);
          
          // Upload via R2 filesystem with metadata
          await r2fs.writeFile(filePath, base64Content, { 
            encoding: 'base64',
            contentType: file.type || 'application/octet-stream'
          });
        } catch (error) {
          console.error(`Failed to upload file ${file.name}:`, error);
        }
        
        completed++;
      }

      // Remove overlay and reload
      overlay.remove();
      await this.loadR2Contents(panelId, currentPath);
    } catch (error) {
      console.error('Upload error:', error);
      overlay.remove();
      
      // Show error briefly
      const errorDiv = document.createElement('div');
      errorDiv.className = 'r2-upload-error';
      errorDiv.innerHTML = `
        <i data-lucide="alert-circle" class="lucide"></i>
        <span>Upload failed: ${(error as Error).message}</span>
      `;
      treeContainer.insertBefore(errorDiv, treeContainer.firstChild);
      this.initializeLucideIcons(10);
      
      setTimeout(() => errorDiv.remove(), 3000);
    }
  }


}