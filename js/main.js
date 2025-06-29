/* 
 * MediaUI - Main JavaScript File
 */

class App {
    constructor() {
        // Query for all necessary DOM elements once for efficiency
        this.resizer = document.getElementById('drag-handle');
        this.terminalResizer = document.getElementById('terminal-drag-handle');
        this.leftPanel = document.querySelector('.left-panel');
        this.rightPanel = document.querySelector('.right-panel');
        this.rightResizer = document.getElementById('right-drag-handle');
        this.tabsContainer = document.querySelector('.tabs');
        this.editorContent = document.querySelector('.editor-content p');
        this.breadcrumbBar = document.querySelector('.breadcrumb-bar');

        // Terminal elements
        this.bottomPanel = document.getElementById('bottom-panel');
        this.terminal = document.getElementById('terminal');
        this.mainPanel = document.querySelector('.main-panel');
        this.terminalOutput = document.getElementById('terminal-output');
        this.terminalInput = document.getElementById('terminal-input');
        this.bottomTabsContainer = document.getElementById('bottom-tabs');
        this.logsPanel = document.getElementById('logs');
        this.clearLogsBtn = document.getElementById('clear-logs-btn');

        // Terminal state
        this.currentWorkingDirectory = ['MediaUI'];

        // Modal elements
        this.modalOverlay = document.getElementById('modal-overlay');
        this.openModalBtn = document.getElementById('open-modal-btn');
        this.closeModalBtn = document.getElementById('modal-close-btn');
        this.modalCancelBtn = document.getElementById('modal-cancel-btn');

        // Header action buttons
        this.toggleLeftPanelBtn = document.getElementById('toggle-left-panel-btn');
        this.toggleRightPanelBtn = document.getElementById('toggle-right-panel-btn');
        this.toggleTerminalBtn = document.getElementById('toggle-terminal-btn');

        // Activity Panel
        this.activityPanel = document.querySelector('.activity-panel');

        // Explorer Actions
        this.newFileBtn = document.getElementById('new-file-btn');
        this.newFolderBtn = document.getElementById('new-folder-btn');
        this.refreshExplorerBtn = document.getElementById('refresh-explorer-btn');
        this.collapseExplorerBtn = document.getElementById('collapse-explorer-btn');
    }

    /**
     * Main initialization method. Called after the DOM is fully loaded.
     */
    init() {
        console.log("MediaUI Initialized!");
        this.#logEvent("Application Initialized");
        this.#initPanelResizer();
        this.#initFileTree();
        this.#initTabs();
        this.#initTerminal();
        this.#initLogsPanel();
        this.#initBottomTabs();
        this.#initTerminalResizer();
        this.#initModal();
        this.#initRightPanelResizer();
        this.#initActivityPanel();
        this.#initHeaderActions();
        this.#initExplorerActions();
        this.#initActiveTab();

        // This should be called last to render all icons added during initialization
        this.#createIcons();
    }

    /**
     * Renders Lucide icons with a custom stroke width.
     */
    #createIcons() {
        lucide.createIcons();
    }

    /**
     * Logs a message to the logs panel with a timestamp.
     * @param {string} message The event message to log.
     * @private
     */
    #logEvent(message) {
        if (!this.logsPanel) return;
        const p = document.createElement('p');
        const time = new Date().toLocaleTimeString();
        p.innerHTML = `<span style="color: var(--color-text-secondary)">[${time}]</span> ${message}`;
        this.logsPanel.appendChild(p);
        // Auto-scroll to the bottom
        this.logsPanel.scrollTop = this.logsPanel.scrollHeight;
    }

    #openModal() {
        if (this.modalOverlay) {
            this.modalOverlay.classList.add('show');
            this.#logEvent("Opened modal");
        }
    }

    #closeModal() {
        if (this.modalOverlay) {
            this.modalOverlay.classList.remove('show');
            this.#logEvent("Closed modal");
        }
    }

    /**
     * Initializes the modal open/close functionality.
     * @private
     */
    #initModal() {
        if (!this.modalOverlay || !this.openModalBtn || !this.closeModalBtn || !this.modalCancelBtn) {
            console.warn("Modal elements not found. Skipping modal initialization.");
            return;
        }

        this.openModalBtn.addEventListener('click', () => this.#openModal());
        this.closeModalBtn.addEventListener('click', () => this.#closeModal());
        this.modalCancelBtn.addEventListener('click', () => this.#closeModal());
        
        // Close modal if user clicks on the overlay background
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) this.#closeModal();
        });

        // Close modal with Escape key for accessibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalOverlay.classList.contains('show')) {
                this.#closeModal();
            }
        });
    }

    /**
     * Initializes the activity panel button functionality.
     * @private
     */
    #initActivityPanel() {
        if (!this.activityPanel || !this.leftPanel) return;

        const views = this.leftPanel.querySelectorAll('.left-panel-view');

        this.activityPanel.addEventListener('click', (e) => {
            const clickedBtn = e.target.closest('.activity-btn');
            if (!clickedBtn || clickedBtn.classList.contains('active')) return;

            // Deactivate current active button
            this.activityPanel.querySelector('.activity-btn.active')?.classList.remove('active');
            // Activate the new one
            clickedBtn.classList.add('active');

            const targetViewName = clickedBtn.dataset.view;

            // Hide all views, then show the target view
            views.forEach(view => view.classList.add('hidden'));
            this.#logEvent(`Switched to ${targetViewName} view`);
            this.leftPanel.querySelector(`.left-panel-view[data-view="${targetViewName}"]`)?.classList.remove('hidden');
        });
    }

    /**
     * Initializes the action buttons in the Explorer panel header.
     * @private
     */
    #initExplorerActions() {
        if (this.newFileBtn) {
            this.newFileBtn.addEventListener('click', () => {
                this.#logEvent("Clicked 'New File' (placeholder action)");
                // Future implementation: prompt for filename and create it
            });
        }

        if (this.newFolderBtn) {
            this.newFolderBtn.addEventListener('click', () => {
                this.#logEvent("Clicked 'New Folder' (placeholder action)");
                // Future implementation: prompt for folder name and create it
            });
        }

        if (this.collapseExplorerBtn) {
            this.collapseExplorerBtn.addEventListener('click', () => {
                const openFolders = this.leftPanel.querySelectorAll('.file-tree .folder.open');
                openFolders.forEach(folder => {
                    folder.classList.remove('open');
                });
                this.#logEvent("Collapsed all folders in explorer");
            });
        }

        if (this.refreshExplorerBtn) {
            this.refreshExplorerBtn.addEventListener('click', () => {
                this.#logEvent("Refreshed explorer (placeholder action)");
            });
        }
    }

    /**
     * Initializes the header action buttons for toggling panels.
     * @private
     */
    #initHeaderActions() {
        const setupToggleButton = (button, panel, resizer) => {
            if (!button || !panel || !resizer) return;
            button.addEventListener('click', () => {
                const isNowActive = button.classList.toggle('active');
                panel.classList.toggle('collapsed', !isNowActive);
                resizer.classList.toggle('collapsed', !isNowActive);
                this.#logEvent(`Toggled ${panel.id || 'panel'}`);
            });
        };
        
        setupToggleButton(this.toggleLeftPanelBtn, this.leftPanel, this.resizer);
        setupToggleButton(this.toggleRightPanelBtn, this.rightPanel, this.rightResizer);
        setupToggleButton(this.toggleTerminalBtn, this.bottomPanel, this.terminalResizer);
    }

    /**
     * Updates the visible terminal input prompt to reflect the current directory.
     * @private
     */
    #updateInputPrompt() {
        const promptSpan = this.terminal?.querySelector('.terminal-input-line .terminal-prompt');
        if (promptSpan) {
            const cwd = this.currentWorkingDirectory;
            promptSpan.innerHTML = `<span class="terminal-prompt-path">/${cwd.join('/')}</span> <span class="terminal-prompt-arrow">&gt;</span>`;
        }
        this.#updateCustomCursor();
    }

    /**
     * Initializes the interactive terminal component.
     * @private
     */
    #initTerminal() {
        if (!this.bottomPanel || !this.terminalOutput || !this.terminalInput) {
            console.warn("Terminal elements not found. Skipping terminal initialization.");
            return;
        }

        // Focus the input when the terminal area is clicked
        this.terminal.addEventListener('click', () => this.terminalInput.focus());

        // Create custom thick cursor
        this.#createCustomCursor();

        // Set initial prompt
        this.#updateInputPrompt();
        this.#updateCustomCursor();

        this.terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const command = this.terminalInput.value.trim();
                if (command) {
                    this.#logToTerminal(command, true);
                    this.#processTerminalCommand(command);
                    this.terminalInput.value = '';
                    this.#updateInputPrompt();
                }
                this.terminalInput.focus();
            }
        });

        // Update cursor position on input
        this.terminalInput.addEventListener('input', () => this.#updateCustomCursor());
        this.terminalInput.addEventListener('click', () => this.#updateCustomCursor());
        this.terminalInput.addEventListener('keyup', () => this.#updateCustomCursor());
    }

    /**
     * Creates a custom thick blinking cursor for the terminal input.
     * @private
     */
    #createCustomCursor() {
        if (!this.terminalInput) return;

        // Hide the default cursor
        this.terminalInput.style.caretColor = 'transparent';

        // Create custom cursor element
        this.customCursor = document.createElement('div');
        this.customCursor.style.cssText = `
            position: absolute;
            width: var(--terminal-cursor-width);
            height: var(--terminal-cursor-height);
            background-color: var(--terminal-cursor-color);
            animation: blink var(--terminal-cursor-blink-duration) infinite;
            pointer-events: none;
            z-index: 10;
        `;

        // Add the cursor to the terminal input container
        const inputContainer = this.terminalInput.parentElement;
        if (inputContainer) {
            inputContainer.style.position = 'relative';
            inputContainer.appendChild(this.customCursor);
        }

        // Initial cursor position
        this.#updateCustomCursor();
    }

    /**
     * Updates the position of the custom cursor to match the text cursor.
     * @private
     */
    #updateCustomCursor() {
        if (!this.customCursor || !this.terminalInput) return;

        // Get cursor position
        const cursorPosition = this.terminalInput.selectionStart;
        
        // Create a temporary span to measure text width
        const tempSpan = document.createElement('span');
        tempSpan.style.cssText = `
            position: absolute;
            visibility: hidden;
            white-space: pre;
            font-family: inherit;
            font-size: inherit;
            font-weight: inherit;
        `;
        tempSpan.textContent = this.terminalInput.value.substring(0, cursorPosition);
        
        const inputContainer = this.terminalInput.parentElement;
        if (inputContainer) {
            inputContainer.appendChild(tempSpan);
            const cursorLeft = tempSpan.offsetWidth;
            inputContainer.removeChild(tempSpan);
            
            // Get the input's position relative to its container
            const inputRect = this.terminalInput.getBoundingClientRect();
            const containerRect = inputContainer.getBoundingClientRect();
            const inputLeft = inputRect.left - containerRect.left;
            
            // Position the custom cursor relative to the input's left edge
            this.customCursor.style.left = `${inputLeft + cursorLeft}px`;
        }
    }

    /**
     * Initializes the logs panel, including the clear button.
     * @private
     */
    #initLogsPanel() {
        if (!this.clearLogsBtn || !this.logsPanel) return;

        this.clearLogsBtn.addEventListener('click', () => {
            // Select all log entries (p tags) and remove them
            const logEntries = this.logsPanel.querySelectorAll('p');
            logEntries.forEach(entry => entry.remove());
            this.#logEvent("Logs cleared");
        });
    }

    /**
     * Processes a command entered into the terminal.
     * @param {string} command The command to process.
     * @private
     */
    #processTerminalCommand(command) {
        const [cmd, ...args] = command.split(' ');
        let response = '';
        let inlineList = false;
        this.#logEvent(`Executed command: ${command}`);

        switch (cmd.toLowerCase()) {
            case 'help':
                response = 'Available commands:\n  help    - Show this help message\n  clear   - Clear the terminal screen\n  date    - Display the current date and time\n  echo    - Display a line of text\n  modal   - Open the test modal\n  ls      - List files and directories (horizontal)\n  ll      - List files and directories (long/vertical)\n  cd      - Change directory\n  pwd     - Print working directory\n  tree    - Show directory tree structure';
                break;
            case 'clear':
                this.terminalOutput.innerHTML = '';
                return; // No response needed
            case 'date':
                response = new Date().toLocaleString();
                break;
            case 'echo':
                response = args.join(' ');
                break;
            case 'modal':
                this.#openModal();
                return; // No response needed
                break;
            case 'ls':
                response = this.#listDirectory(false);
                inlineList = true;
                break;
            case 'll':
                response = this.#listDirectory(true);
                break;
            case 'cd':
                response = this.#changeDirectory(args);
                this.#updateInputPrompt();
                break;
            case 'pwd':
                response = this.#printWorkingDirectory();
                break;
            case 'tree':
                response = this.#showDirectoryTree();
                break;
            default:
                response = `Command not found: ${cmd}. Type 'help' for a list of commands.`;
                break;
        }
        this.#logToTerminal(response, false, inlineList);
    }

    /**
     * Logs a message to the terminal output.
     * @param {string} message The message to log.
     * @param {boolean} [isUserInput=false] True if the message is from user input.
     * @param {boolean} [inlineList=false] True if the message is a list of items to be rendered inline.
     * @private
     */
    #logToTerminal(message, isUserInput = false, inlineList = false) {
        const p = document.createElement('p');
        if (inlineList) {
            p.classList.add('terminal-inline-list');
        }
        // Special handling for ll JSON array
        let isLLGrid = false;
        let llData = null;
        if (!isUserInput && message && message.startsWith('[') && message.endsWith(']')) {
            try {
                llData = JSON.parse(message);
                isLLGrid = Array.isArray(llData);
            } catch {}
        }
        if (isLLGrid) {
            // Render as grid
            const grid = document.createElement('div');
            grid.className = 'terminal-ll-grid';
            llData.forEach(entry => {
                // Type column
                const typeSpan = document.createElement('span');
                typeSpan.className = 'terminal-ll-type';
                typeSpan.textContent = entry.type;
                grid.appendChild(typeSpan);
                // Date column
                const dateSpan = document.createElement('span');
                dateSpan.className = 'terminal-ll-date';
                dateSpan.textContent = entry.date;
                grid.appendChild(dateSpan);
                // Name column (icon + color)
                let fileClass = 'file-type-default';
                if (entry.iconName === 'folder') fileClass = '';
                else if (/\.css$/i.test(entry.name)) fileClass = 'file-type-css';
                else if (/\.(js|jsx|ts|tsx)$/i.test(entry.name)) fileClass = 'file-type-js';
                else if (/\.(html|htm)$/i.test(entry.name)) fileClass = 'file-type-html';
                else if (/\.(md|markdown)$/i.test(entry.name)) fileClass = 'file-type-md';
                else if (/\.json$/i.test(entry.name)) fileClass = 'file-type-json';
                else if (/\.(png|jpe?g|gif|svg|webp)$/i.test(entry.name)) fileClass = 'file-type-image';
                else if (/\.(mp4|mov|avi|webm|mkv)$/i.test(entry.name)) fileClass = 'file-type-video';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'terminal-ll-name' + (fileClass ? ' ' + fileClass : '');
                const icon = document.createElement('i');
                icon.setAttribute('data-lucide', entry.iconName);
                icon.style.marginRight = '8px';
                icon.style.verticalAlign = 'middle';
                icon.style.width = '16px';
                icon.style.height = '16px';
                nameSpan.appendChild(icon);
                nameSpan.appendChild(document.createTextNode(entry.name));
                grid.appendChild(nameSpan);
            });
            p.appendChild(grid);
        } else if (isUserInput) {
            p.classList.add('user-input');
            const prompt = document.createElement('span');
            prompt.className = 'terminal-prompt';
            // Show full path in prompt with accent color and bold arrow
            const cwd = this.currentWorkingDirectory;
            prompt.innerHTML = `<span class="terminal-prompt-path">/${cwd.join('/')}</span> <span class="terminal-prompt-arrow">&gt;</span>`;
            p.appendChild(prompt);
            p.append(document.createTextNode(' ' + message));
        } else {
            // If message contains HTML, render as HTML
            if (message.includes('<span')) {
                p.innerHTML = message;
            } else {
                // Check if the message contains Lucide icon names and replace them with actual icons
                const lines = message.split('\n');
                lines.forEach((line, index) => {
                    if (index > 0 && !inlineList) {
                        p.appendChild(document.createElement('br'));
                    }
                    // Check if line starts with a Lucide icon name
                    const iconMatch = line.match(/^(folder|file-type|file-code|file-text|file-json|braces|image|video)\s+([^\(]+)(?:\s*\((file|folder)\))?/);
                    if (iconMatch) {
                        const iconName = iconMatch[1];
                        const fileName = iconMatch[2].trim();
                        const fileType = iconMatch[3];
                        // Determine file type class
                        let fileClass = 'file-type-default';
                        if (iconName === 'folder') fileClass = '';
                        else if (/\.css$/i.test(fileName)) fileClass = 'file-type-css';
                        else if (/\.(js|jsx|ts|tsx)$/i.test(fileName)) fileClass = 'file-type-js';
                        else if (/\.(html|htm)$/i.test(fileName)) fileClass = 'file-type-html';
                        else if (/\.(md|markdown)$/i.test(fileName)) fileClass = 'file-type-md';
                        else if (/\.json$/i.test(fileName)) fileClass = 'file-type-json';
                        else if (/\.(png|jpe?g|gif|svg|webp)$/i.test(fileName)) fileClass = 'file-type-image';
                        else if (/\.(mp4|mov|avi|webm|mkv)$/i.test(fileName)) fileClass = 'file-type-video';
                        // Create icon element
                        const icon = document.createElement('i');
                        icon.setAttribute('data-lucide', iconName);
                        icon.style.marginRight = '8px';
                        icon.style.verticalAlign = 'middle';
                        icon.style.width = '16px';
                        icon.style.height = '16px';
                        // Create text node for filename
                        const textNode = document.createTextNode(fileName);
                        const wrapper = document.createElement('span');
                        if (fileClass) wrapper.className = fileClass;
                        wrapper.appendChild(icon);
                        wrapper.appendChild(textNode);
                        p.appendChild(wrapper);
                        if (fileType) {
                            const typeSpan = document.createElement('span');
                            typeSpan.className = 'terminal-dim';
                            typeSpan.textContent = ` (${fileType})`;
                            p.appendChild(typeSpan);
                        }
                    } else {
                        p.appendChild(document.createTextNode(line));
                    }
                });
            }
        }
        this.terminalOutput.appendChild(p);
        // Always move the input line to the end
        const inputLine = this.terminalOutput.querySelector('.terminal-input-line');
        if (inputLine) {
            this.terminalOutput.appendChild(inputLine);
        }
        // Render the icons after adding to DOM
        if (!isUserInput) {
            lucide.createIcons();
        }
        // Auto-scroll to the bottom
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
    }

    #initTerminalResizer() {
        if (!this.terminalResizer || !this.bottomPanel || !this.mainPanel || !this.toggleTerminalBtn) return;

        const handleMouseDown = (e) => {
            e.preventDefault();
            document.body.classList.add('is-resizing', 'is-resizing-v');
            
            const startY = e.clientY;
            const startHeight = this.bottomPanel.offsetHeight;

            const handleMouseMove = (event) => {
                const newHeight = startHeight - (event.clientY - startY);
                const containerRect = this.mainPanel.getBoundingClientRect();
                const minHeight = 50; // pixels
                const maxHeight = containerRect.height * 0.8; // 80% of main panel
                const snapThreshold = 40; // px

                if (this.toggleTerminalBtn.classList.contains('active') && newHeight < snapThreshold) {
                    this.toggleTerminalBtn.click();
                    handleMouseUp();
                    return;
                }

                // If dragging out from a collapsed state, ensure it's active
                if (this.bottomPanel.classList.contains('collapsed') && newHeight > minHeight) {
                    this.toggleTerminalBtn.click();
                }

                this.bottomPanel.style.flexBasis = `${newHeight}px`;
            };

            const handleMouseUp = () => {
                document.body.classList.remove('is-resizing', 'is-resizing-v');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                if (!this.bottomPanel.classList.contains('collapsed')) {
                    this.#logEvent(`Resized bottom panel to ${this.bottomPanel.style.flexBasis}`);
                }
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        this.terminalResizer.addEventListener('mousedown', handleMouseDown);
        // Set initial size
        this.bottomPanel.style.flexBasis = '200px';
    }

    #initRightPanelResizer() {
        if (!this.rightResizer || !this.rightPanel || !this.toggleRightPanelBtn) return;

        const handleMouseDown = (e) => {
            e.preventDefault();
            document.body.classList.add('is-resizing', 'is-resizing-h');

            const startX = e.clientX;
            const startWidth = this.rightPanel.offsetWidth;

            const handleMouseMove = (event) => {
                const newWidth = startWidth - (event.clientX - startX);
                const containerRect = this.rightResizer.parentElement.getBoundingClientRect();
                const minWidth = 150;
                const maxWidth = containerRect.width * 0.5;
                const snapThreshold = 75; // px

                if (this.toggleRightPanelBtn.classList.contains('active') && newWidth < snapThreshold) {
                    this.toggleRightPanelBtn.click();
                    handleMouseUp();
                    return;
                }

                // If dragging out from a collapsed state, ensure it's active
                if (this.rightPanel.classList.contains('collapsed') && newWidth > minWidth) {
                    this.toggleRightPanelBtn.click();
                }

                this.rightPanel.style.flexBasis = `${newWidth}px`;
            };

            const handleMouseUp = () => {
                document.body.classList.remove('is-resizing', 'is-resizing-h');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                if (!this.rightPanel.classList.contains('collapsed')) {
                    this.#logEvent(`Resized right panel to ${this.rightPanel.style.flexBasis}`);
                }
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };
        
        this.rightResizer.addEventListener('mousedown', handleMouseDown);
    }

    /**
     * Sets a given tab element as the active one.
     * @param {HTMLElement} tabElement The tab element to activate.
     * @private
     */
    #setActiveTab(tabElement) {
        if (!tabElement || !this.tabsContainer || !this.editorContent) {
            this.#updateBreadcrumbs(null);
            if (this.editorContent) this.editorContent.textContent = 'No file open.';
            return;
        }

        // Deactivate current active tab
        this.tabsContainer.querySelector('.tab-item.active')?.classList.remove('active');

        // Activate the new one
        tabElement.classList.add('active');

        // Update editor content and breadcrumbs
        const fileName = tabElement.dataset.filename;
        let filePath = tabElement.dataset.path ? JSON.parse(tabElement.dataset.path) : null;
        
        if (!filePath && fileName) {
            const fileTreeElement = this.#findFileElementInTree(fileName);
            if (fileTreeElement) {
                filePath = this.#getPathForFileElement(fileTreeElement);
                tabElement.dataset.path = JSON.stringify(filePath);
            } else {
                filePath = [fileName]; // Fallback for files not in the tree
            }
        }
        
        this.#updateBreadcrumbs(filePath);

        if (fileName) {
            this.editorContent.textContent = `Content for ${fileName} would be displayed here.`;
        } else {
            this.editorContent.textContent = 'No file open.';
        }
    }

    /**
     * Finds the file-tree-item element corresponding to a given filename.
     * @param {string} fileName The name of the file to find.
     * @returns {HTMLElement|null} The element if found, otherwise null.
     * @private
     */
    #findFileElementInTree(fileName) {
        const fileTreeItems = this.leftPanel.querySelectorAll('.file-tree-item');
        return Array.from(fileTreeItems).find(item => {
            return item.textContent.trim() === fileName;
        });
    }

    /**
     * Gets the full path for a file tree item element by traversing up the DOM.
     * @param {HTMLElement} itemElement The file-tree-item element that was clicked.
     * @returns {string[]} An array of strings representing the path.
     * @private
     */
    #getPathForFileElement(itemElement) {
        const path = [];
        path.unshift(itemElement.textContent.trim());

        let currentLi = itemElement.closest('li');
        let parentFolderLi = currentLi.parentElement.closest('li.folder');

        while (parentFolderLi) {
            const parentName = parentFolderLi.querySelector('.file-tree-item').textContent.trim();
            path.unshift(parentName);
            parentFolderLi = parentFolderLi.parentElement.closest('li.folder');
        }
        return path;
    }

    /**
     * Updates the breadcrumb bar based on a given file path.
     * @param {string[]|null} path The array of path segments, or null to clear.
     * @private
     */
    #updateBreadcrumbs(path) {
        if (!this.breadcrumbBar) return;
        const container = this.breadcrumbBar.querySelector('.breadcrumbs');
        if (!container) return;

        if (!path || path.length === 0) {
            this.breadcrumbBar.classList.add('hidden');
            return;
        }
        
        this.breadcrumbBar.classList.remove('hidden');
        container.innerHTML = ''; // Clear existing breadcrumbs

        path.forEach((segment, index) => {
            const isLast = index === path.length - 1;

            if (isLast) {
                // The file itself
                const fileIcon = this.#getFileIcon(segment);
                container.innerHTML += `<i data-lucide="${fileIcon}" class="breadcrumb-icon"></i>`;
                container.innerHTML += `<span class="breadcrumb-item active">${segment}</span>`;
            } else {
                // A parent folder
                container.innerHTML += `<i data-lucide="folder" class="breadcrumb-icon"></i>`;
                container.innerHTML += `<span class="breadcrumb-item">${segment}</span>`;
                container.innerHTML += `<i data-lucide="chevron-right" class="breadcrumb-separator"></i>`;
            }
        });

        this.#createIcons(); // Re-render icons
    }

    /**
     * Initializes the active tab and its breadcrumbs on startup.
     * @private
     */
    #initActiveTab() {
        const activeTab = this.tabsContainer.querySelector('.tab-item.active');
        if (activeTab) {
            this.#setActiveTab(activeTab);
        } else {
            this.#updateBreadcrumbs(null);
        }
    }

    /**
     * Gets the appropriate Lucide icon name for a given file name.
     * @param {string} fileName The name of the file.
     * @returns {string} The name of the Lucide icon.
     * @private
     */
    #getFileIcon(fileName) {
        const extension = fileName.split('.').pop();
        switch (extension) {
            case 'html':
                return 'file-code';
            case 'css':
                return 'file-type';
            case 'js':
                return 'braces';
            case 'md':
                return 'file-text';
            case 'json':
                return 'file-json';
            default:
                return 'file';
        }
    }

    /**
     * Opens a file in a new tab, or focuses the tab if already open.
     * It also creates the close button for the new tab.
     * @param {string} fileName The name of the file to open.
     * @param {string[]} [filePath] The array of path segments for the file.
     * @private
     */
    #openFileInTab(fileName, filePath) {
        if (!this.tabsContainer) return;

        // Check if tab already exists
        const existingTabs = this.tabsContainer.querySelectorAll('.tab-item');
        const tabToActivate = Array.from(existingTabs).find(tab => tab.dataset.filename === fileName);

        if (tabToActivate) {
            this.#logEvent(`Focused tab: ${fileName}`);
            // Tab exists, just activate it
            this.#setActiveTab(tabToActivate);
        } else {
            // Tab doesn't exist, create it
            const newTab = document.createElement('div');
            newTab.className = 'tab-item';
            newTab.draggable = true;
            newTab.dataset.filename = fileName;
            if (filePath) {
                newTab.dataset.path = JSON.stringify(filePath);
            }
            const iconName = this.#getFileIcon(fileName);
            newTab.innerHTML = `
                <i data-lucide="${iconName}" class="tab-icon"></i>
                <span>${fileName}</span>
                <button class="tab-close-btn" aria-label="Close tab"><i data-lucide="x"></i></button>
            `;
            this.tabsContainer.appendChild(newTab);
            this.#logEvent(`Opened tab: ${fileName}`);
            this.#setActiveTab(newTab);
        }
    }

    /**
     * Closes a given tab and activates an adjacent one if necessary.
     * @param {HTMLElement} tabToClose The tab element to be closed.
     * @private
     */
    #closeTab(tabToClose) {
        if (!tabToClose) return;

        let tabToActivate = null;
        if (tabToClose.classList.contains('active')) {
            // If the closed tab was active, find a new one to activate
            tabToActivate = tabToClose.previousElementSibling || tabToClose.nextElementSibling;
            this.#logEvent(`Closed tab: ${tabToClose.dataset.filename}`);
        }

        // Remove the tab from the DOM
        tabToClose.remove();

        // If we determined a new tab should be active, activate it.
        // This also handles the case where the last tab is closed (tabToActivate will be null)
        if (tabToClose.classList.contains('active')) {
            this.#setActiveTab(tabToActivate);
        }
    }

    /**
     * Determines which element the currently dragged tab should be placed before.
     * @param {number} x The horizontal coordinate of the mouse.
     * @returns {HTMLElement|null} The element to insert before, or null to append.
     * @private
     */
    #getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.tab-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * Initializes a generic tab group with click, close, and drag-and-drop functionality.
     * @param {HTMLElement} container The container element for the tab group.
     * @param {Function} onActivate A callback function to run when a tab is activated.
     * @param {Function} [onClose] An optional callback function to run when a tab's close button is clicked.
     * @private
     */
    #initTabGroup(container, onActivate, onClose) {
        if (!container) return;

        const dropIndicator = document.createElement('div');
        dropIndicator.className = 'drop-indicator';
        container.appendChild(dropIndicator);
    
        let dropTarget = null; // To store where the tab should be dropped

        container.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('.tab-close-btn');
            if (closeBtn && onClose) {
                onClose(closeBtn.closest('.tab-item'));
                return;
            }

            const clickedTab = e.target.closest('.tab-item');
            if (clickedTab && !clickedTab.classList.contains('active')) {
                onActivate(clickedTab);
            }
        });

        container.addEventListener('dragstart', e => {
            const target = e.target.closest('.tab-item');
            if (target) {
                // Defer adding the class to allow the browser to create the drag image first.
                setTimeout(() => target.classList.add('dragging'), 0);
            }
        });

        container.addEventListener('dragend', e => {
            const draggingTab = container.querySelector('.dragging');
            if (draggingTab) {
                // Perform the actual move. If dropTarget is null, it appends to the end.
                container.insertBefore(draggingTab, dropTarget);

                // Clean up
                draggingTab.classList.remove('dragging');
                const tabName = draggingTab.dataset.filename || draggingTab.dataset.view;
                this.#logEvent(`Reordered tab: ${tabName}`);
            }
            dropIndicator.style.display = 'none';
            dropTarget = null;
        });

        container.addEventListener('dragover', e => {
            e.preventDefault(); // Allow dropping
            
            dropTarget = this.#getDragAfterElement(container, e.clientX);
            const lastElement = container.querySelector('.tab-item:not(.dragging):last-of-type');
            
            let indicatorLeft = 0;
            if (dropTarget) {
                indicatorLeft = dropTarget.offsetLeft;
            } else if (lastElement) {
                indicatorLeft = lastElement.offsetLeft + lastElement.offsetWidth;
            } else {
                // If there are no other tabs, position at the start
                indicatorLeft = 0;
            }

            dropIndicator.style.left = `${indicatorLeft}px`;
            dropIndicator.style.display = 'block';
        });

        container.addEventListener('dragleave', e => {
            // Hide indicator if mouse leaves the container
            if (!container.contains(e.relatedTarget)) {
                dropIndicator.style.display = 'none';
            }
        });
    }

    #initTabs() {
        this.#initTabGroup(
            this.tabsContainer,
            (tab) => this.#setActiveTab(tab),
            (tab) => this.#closeTab(tab)
        );
    }

    /**
     * Initializes the tab switching for the bottom panel (Terminal/Logs).
     * @private
     */
    #initBottomTabs() {
        const onActivate = (tab) => {
            // Remove active class from all tabs
            this.bottomTabsContainer.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            // Add active class to the clicked tab
            tab.classList.add('active');
            
            const targetViewName = tab.dataset.view;
            this.bottomPanel.querySelectorAll('.bottom-panel-view').forEach(v => v.classList.add('hidden'));
            this.bottomPanel.querySelector(`#${targetViewName}`)?.classList.remove('hidden');
        };

        const onClose = (tabToClose) => {
            if (!tabToClose) return;
            const wasActive = tabToClose.classList.contains('active');
            let tabToActivate = wasActive ? (tabToClose.previousElementSibling || tabToClose.nextElementSibling) : null;
            
            this.#logEvent(`Closed tab: ${tabToClose.dataset.view}`);
            tabToClose.remove();

            if (wasActive && tabToActivate) {
                tabToActivate.classList.add('active');
                onActivate(tabToActivate);
            } else if (!this.bottomTabsContainer.querySelector('.tab-item')) {
                // All tabs are closed, hide the panel
                this.toggleTerminalBtn.click();
            }
        };

        this.#initTabGroup(this.bottomTabsContainer, onActivate, onClose);
    }

    #initPanelResizer() {
        if (!this.resizer || !this.leftPanel || !this.toggleLeftPanelBtn) return;

        const handleMouseDown = (e) => {
            e.preventDefault();
            document.body.classList.add('is-resizing', 'is-resizing-h');

            const startX = e.clientX;
            const startWidth = this.leftPanel.offsetWidth;

            const handleMouseMove = (event) => {
                const newWidth = startWidth + (event.clientX - startX);
                const containerRect = this.resizer.parentElement.getBoundingClientRect();
                const minWidth = 150;
                const maxWidth = containerRect.width * 0.5;
                const snapThreshold = 75; // px

                if (this.toggleLeftPanelBtn.classList.contains('active') && newWidth < snapThreshold) {
                    this.toggleLeftPanelBtn.click();
                    handleMouseUp();
                    return;
                }
                
                // If dragging out from a collapsed state, ensure it's active
                if (this.leftPanel.classList.contains('collapsed') && newWidth > minWidth) {
                    this.toggleLeftPanelBtn.click();
                }
                
                this.leftPanel.style.flexBasis = `${newWidth}px`;
            };

            const handleMouseUp = () => {
                document.body.classList.remove('is-resizing', 'is-resizing-h');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                if (!this.leftPanel.classList.contains('collapsed')) {
                    this.#logEvent(`Resized left panel to ${this.leftPanel.style.flexBasis}`);
                }
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        this.resizer.addEventListener('mousedown', handleMouseDown);
    }

    #initFileTree() {
        const fileTree = this.leftPanel?.querySelector('.file-tree');
        if (!fileTree) return;

        fileTree.addEventListener('click', (e) => {
            const item = e.target.closest('.file-tree-item');
            if (!item) return;

            // Handle selection
            const currentlySelected = fileTree.querySelector('.file-tree-item.selected');
            if (currentlySelected) {
                currentlySelected.classList.remove('selected');
            }
            item.classList.add('selected');

            const parentLi = item.parentElement;
            if (parentLi?.classList.contains('folder')) {
                // It's a folder, toggle it
                parentLi.classList.toggle('open');
                const folderName = item.querySelector('span')?.textContent.trim();
                if (folderName) {
                    const action = parentLi.classList.contains('open') ? 'Expanded' : 'Collapsed';
                    this.#logEvent(`${action} folder: ${folderName}`);
                }
            } else {
                // It's a file, open it in a tab
                const fileName = item.textContent.trim();
                if (fileName) {
                    const filePath = this.#getPathForFileElement(item);
                    this.#openFileInTab(fileName, filePath);
                }
            }
        });
    }

    /**
     * Lists the contents of the current working directory.
     * @returns {string} Formatted directory listing.
     * @private
     */
    #listDirectory(longFormat = false) {
        const currentPath = this.#getCurrentPathElement();
        if (!currentPath) {
            return 'Error: Current directory not found in file tree.';
        }

        const folders = [];
        const files = [];
        const nestedList = currentPath.querySelector('.nested-list');
        const now = new Date();
        const dummyDate = now.toISOString().slice(0, 16).replace('T', ' ');
        
        if (nestedList) {
            nestedList.querySelectorAll('li').forEach(li => {
                const itemElement = li.querySelector('.file-tree-item');
                if (itemElement) {
                    // Use the last span for the filename (skipping placeholder)
                    const name = itemElement.querySelector('span:last-of-type')?.textContent.trim();
                    const isFolder = li.classList.contains('folder');
                    const iconElement = itemElement.querySelector('.file-icon');
                    const iconName = iconElement?.getAttribute('data-lucide') || (isFolder ? 'folder' : 'file');
                    const type = isFolder ? 'folder' : 'file';
                    const date = dummyDate;
                    if (isFolder) {
                        folders.push({iconName, name, type, date});
                    } else {
                        files.push({iconName, name, type, date});
                    }
                }
            });
        }

        if (folders.length === 0 && files.length === 0) {
            return 'Directory is empty.';
        }

        const all = [...folders, ...files];
        if (longFormat) {
            // Return as JSON string for special handling in logToTerminal
            return JSON.stringify(all);
        } else {
            // Horizontal, but still one per line for icon rendering
            return all.map(e => `${e.iconName} ${e.name}`).join('\n');
        }
    }

    /**
     * Changes the current working directory.
     * @param {string[]} args Command arguments (target directory).
     * @returns {string} Status message.
     * @private
     */
    #changeDirectory(args) {
        const target = args[0];
        
        if (!target || target === '.') {
            return ''; // Stay in current directory
        }
        
        if (target === '..') {
            // Go up one level
            if (this.currentWorkingDirectory.length > 1) {
                this.currentWorkingDirectory.pop();
                return `<span class="terminal-dim">Changed to directory: ${this.currentWorkingDirectory.join('/')}</span>`;
            } else {
                return `<span class="terminal-dim">Already at root directory.</span>`;
            }
        }
        
        if (target === '/') {
            // Go to root
            this.currentWorkingDirectory = ['MediaUI'];
            return `<span class="terminal-dim">Changed to root directory: MediaUI</span>`;
        }
        
        // Navigate to specific directory
        const currentPath = this.#getCurrentPathElement();
        if (!currentPath) {
            return 'Error: Current directory not found.';
        }
        
        const nestedList = currentPath.querySelector('.nested-list');
        if (!nestedList) {
            return `Directory '${target}' not found.`;
        }
        
        const targetFolder = Array.from(nestedList.querySelectorAll('li.folder')).find(li => {
            const name = li.querySelector('.file-tree-item span')?.textContent.trim();
            return name === target;
        });
        
        if (targetFolder) {
            this.currentWorkingDirectory.push(target);
            return `<span class="terminal-dim">Changed to directory: ${this.currentWorkingDirectory.join('/')}</span>`;
        } else {
            return `Directory '${target}' not found.`;
        }
    }

    /**
     * Prints the current working directory path.
     * @returns {string} Current working directory path.
     * @private
     */
    #printWorkingDirectory() {
        return this.currentWorkingDirectory.join('/');
    }

    /**
     * Shows the directory tree structure from current directory.
     * @returns {string} Formatted tree structure.
     * @private
     */
    #showDirectoryTree() {
        const currentPath = this.#getCurrentPathElement();
        if (!currentPath) {
            return 'Error: Current directory not found in file tree.';
        }

        let tree = '';
        const buildTree = (element, prefix = '', isLast = true) => {
            const nestedList = element.querySelector('.nested-list');
            if (!nestedList) return;
            
            const items = nestedList.querySelectorAll('li');
            items.forEach((item, index) => {
                const isLastItem = index === items.length - 1;
                const itemElement = item.querySelector('.file-tree-item');
                const name = itemElement?.querySelector('span')?.textContent.trim();
                const isFolder = item.classList.contains('folder');
                
                // Get the actual icon from the file tree
                const iconElement = itemElement?.querySelector('.file-icon');
                const iconName = iconElement?.getAttribute('data-lucide') || (isFolder ? 'folder' : 'file');
                
                tree += `${prefix}${isLastItem ? '└── ' : '├── '}${iconName} ${name}\n`;
                
                if (isFolder) {
                    const newPrefix = prefix + (isLastItem ? '    ' : '│   ');
                    buildTree(item, newPrefix, false);
                }
            });
        };
        
        buildTree(currentPath);
        return tree || 'Directory is empty.';
    }

    /**
     * Gets the DOM element corresponding to the current working directory path.
     * @returns {HTMLElement|null} The current directory element or null if not found.
     * @private
     */
    #getCurrentPathElement() {
        if (!this.leftPanel) return null;
        
        let currentElement = this.leftPanel.querySelector('.file-tree > li');
        
        // Navigate through the path
        for (let i = 1; i < this.currentWorkingDirectory.length; i++) {
            const targetName = this.currentWorkingDirectory[i];
            const nestedList = currentElement.querySelector('.nested-list');
            
            if (!nestedList) return null;
            
            const targetFolder = Array.from(nestedList.querySelectorAll('li.folder')).find(li => {
                const name = li.querySelector('.file-tree-item span')?.textContent.trim();
                return name === targetName;
            });
            
            if (!targetFolder) return null;
            currentElement = targetFolder;
        }
        
        return currentElement;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});