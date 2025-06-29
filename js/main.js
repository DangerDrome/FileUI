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
        this.mainPanel = document.querySelector('.main-panel');

        // Initial pane elements - these will be reassigned as panes are created/destroyed
        this.tabsContainer = document.querySelector('.main-panel .tabs');
        this.editorContent = document.querySelector('.main-panel .editor-content p');
        this.breadcrumbBar = document.querySelector('.main-panel .breadcrumb-bar');

        // Terminal elements
        this.bottomPanel = document.getElementById('bottom-panel');
        this.terminal = document.getElementById('terminal');
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

        // Split panel elements
        this.mainSplitContainer = document.getElementById('main-split-container');
        this.splitPanelBtns = document.querySelectorAll('.split-panel-btn');

        // Split panel state
        this.splitPaneCounter = 1; // Counter for unique pane IDs
        this.activePanes = new Map(); // Map of pane ID to pane info

        // Drag and drop state
        this.draggedTab = null;
        this.dragSourceContainer = null;
        this.currentDropContainer = null;
        this.dropTarget = null;
        this.dropZone = null; // 'tab-bar', 'center', 'top', 'bottom', 'left', 'right'
        this.dropTargetPane = null; // The pane being hovered for edge drops

        this.commandHistory = [];
        this.historyIndex = -1;
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
        this.#initSplitPanels();

        // This should be called last to render all icons added during initialization
        this.#createIcons();
    }

    /**
     * Renders Lucide icons with a custom stroke width.
     */
    #createIcons() {
        requestAnimationFrame(() => {
            lucide.createIcons();
        });
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
                    this.commandHistory.push(command);
                    this.historyIndex = this.commandHistory.length;
                    this.#logToTerminal(command, true);
                    this.#processTerminalCommand(command);
                    this.terminalInput.value = '';
                    this.#updateInputPrompt();
                }
                this.terminalInput.focus();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.#handleTabCompletion();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.#handleHistoryNavigation(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.#handleHistoryNavigation(1);
            }
        });
        this.terminalInput.addEventListener('input', () => this.#updateCustomCursor());
        this.terminalInput.addEventListener('click', () => this.#updateCustomCursor());
        this.terminalInput.addEventListener('keyup', () => this.#updateCustomCursor());
    }

    #handleTabCompletion() {
        const input = this.terminalInput.value;
        const parts = input.split(/\s+/);
        const last = parts[parts.length - 1];
        const currentPath = this.#getCurrentPathElement();
        if (!currentPath) return;
        const nestedList = currentPath.querySelector('.nested-list');
        if (!nestedList) return;
        const names = Array.from(nestedList.querySelectorAll('.file-tree-item span:last-of-type'))
            .map(span => span.textContent.trim());
        const matches = names.filter(name => name.startsWith(last));
        if (matches.length === 1) {
            // Single match: autocomplete
            parts[parts.length - 1] = matches[0];
            this.terminalInput.value = parts.join(' ');
            this.#updateCustomCursor();
            this.terminalInput.focus();
        } else if (matches.length > 1) {
            // Multiple matches: show in terminal
            this.#logToTerminal(matches.join('    '), false, true);
            this.terminalInput.focus();
        }
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
                this.#createInputLine();
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
        // Special handling for ll and tree JSON arrays
        let isLLGrid = false;
        let isTree = false;
        let llData = null;
        let treeData = null;
        if (!isUserInput && message && message.startsWith('[') && message.endsWith(']')) {
            try {
                const arr = JSON.parse(message);
                if (Array.isArray(arr) && arr.length && arr[0].date) {
                    llData = arr;
                    isLLGrid = true;
                } else if (Array.isArray(arr) && arr.length && arr[0].linePrefix !== undefined) {
                    treeData = arr;
                    isTree = true;
                }
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
                const fileClass = entry.iconName === 'folder' ? '' : this.#getFileTypeClass(entry.name);
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
        } else if (isTree) {
            // Render tree with icons and color
            const treeDiv = document.createElement('div');
            treeData.forEach(entry => {
                const line = document.createElement('div');
                line.style.whiteSpace = 'pre';
                // Color code and icon logic
                const fileClass = entry.iconName === 'folder' ? '' : this.#getFileTypeClass(entry.name);
                // Icon
                const icon = document.createElement('i');
                icon.setAttribute('data-lucide', entry.iconName);
                icon.style.marginRight = '8px';
                icon.style.verticalAlign = 'middle';
                icon.style.width = '16px';
                icon.style.height = '16px';
                // Name
                const nameSpan = document.createElement('span');
                if (fileClass) nameSpan.className = fileClass;
                nameSpan.appendChild(icon);
                nameSpan.appendChild(document.createTextNode(entry.name));
                // Line
                line.textContent = entry.linePrefix;
                line.appendChild(nameSpan);
                treeDiv.appendChild(line);
            });
            p.appendChild(treeDiv);
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
                        const fileClass = (iconName === 'folder' || fileType === 'folder') ? '' : this.#getFileTypeClass(fileName);
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
        const containingPane = tabElement?.closest('.split-pane');
        if (containingPane) {
            this.#setActiveTabForPane(tabElement, containingPane);
        } else if (!tabElement) {
            // This is a fallback for the very rare case where the last tab in the
            // original, non-split pane is closed. We don't have a pane context,
            // so we manually clear the original breadcrumb bar and editor.
            this.#updateBreadcrumbs(null);
            if (this.editorContent) this.editorContent.textContent = 'No file open.';
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

        requestAnimationFrame(() => {
            lucide.createIcons();
        });
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
     * Gets the CSS class for a file based on its name.
     * @param {string} fileName The name of the file.
     * @returns {string} The CSS class name.
     * @private
     */
    #getFileTypeClass(fileName) {
        if (/\.css$/i.test(fileName)) return 'file-type-css';
        if (/\.(js|jsx|ts|tsx)$/i.test(fileName)) return 'file-type-js';
        if (/\.(html|htm)$/i.test(fileName)) return 'file-type-html';
        if (/\.(md|markdown)$/i.test(fileName)) return 'file-type-md';
        if (/\.json$/i.test(fileName)) return 'file-type-json';
        if (/\.(png|jpe?g|gif|svg|webp)$/i.test(fileName)) return 'file-type-image';
        if (/\.(mp4|mov|avi|webm|mkv)$/i.test(fileName)) return 'file-type-video';
        return 'file-type-default';
    }

    /**
     * Opens a file in a new tab, or focuses the tab if already open.
     * It also creates the close button for the new tab.
     * @param {string} fileName The name of the file to open.
     * @param {string[]} [filePath] The array of path segments for the file.
     * @private
     */
    #openFileInTab(fileName, filePath) {
        // Find the active pane to open the file in
        let targetPane = null;
        let targetTabs = null;

        // If we have split panes, find the one with the most recent activity
        if (this.mainSplitContainer) {
            const panes = this.mainSplitContainer.querySelectorAll('.split-pane');
            for (const pane of panes) {
                const paneId = pane.dataset.paneId;
                const paneInfo = this.activePanes.get(paneId);
                if (paneInfo && paneInfo.activeTab) {
                    targetPane = pane;
                    targetTabs = paneInfo.tabs;
                    break;
                }
            }
            
            // Fallback to first pane with tabs
            if (!targetPane) {
                for (const pane of panes) {
                    const tabs = pane.querySelector('.tabs');
                    if (tabs) {
                        targetPane = pane;
                        targetTabs = tabs;
                        break;
                    }
                }
            }
        }

        // Fallback to original tabs container
        if (!targetTabs) {
            targetTabs = this.tabsContainer;
        }

        if (!targetTabs) return;

        // Check if tab already exists in any pane
        const allTabs = document.querySelectorAll('.split-pane .tab-item, .tabs > .tab-item');
        const existingTab = Array.from(allTabs).find(tab => tab.dataset.filename === fileName);

        if (existingTab) {
            this.#logEvent(`Focused tab: ${fileName}`);
            // Find which pane contains this tab
            const containingPane = existingTab.closest('.split-pane');
            if (containingPane) {
                this.#setActiveTabForPane(existingTab, containingPane);
            } else {
                this.#setActiveTab(existingTab);
            }
        } else {
            // Tab doesn't exist, create it in the target tabs container
            const newTab = document.createElement('div');
            const fileClass = this.#getFileTypeClass(fileName);
            newTab.className = `tab-item ${fileClass}`;
            newTab.draggable = true;
            newTab.dataset.filename = fileName;
            if (filePath) {
                newTab.dataset.path = JSON.stringify(filePath);
            }
            newTab.innerHTML = `
                <i data-lucide="${this.#getFileIcon(fileName)}" class="tab-icon"></i>
                <span>${fileName}</span>
                <button class="tab-close-btn" aria-label="Close tab"><i data-lucide="x"></i></button>
            `;
            
            // Insert before the split button if it exists
            const splitBtn = targetTabs.querySelector('.split-panel-btn');
            if (splitBtn) {
                targetTabs.insertBefore(newTab, splitBtn);
            } else {
                targetTabs.appendChild(newTab);
            }
            
            this.#logEvent(`Opened tab: ${fileName}`);
            
            // Set as active in the appropriate pane
            if (targetPane) {
                this.#setActiveTabForPane(newTab, targetPane);
            } else {
                this.#setActiveTab(newTab);
            }
            
            // Render icons for the new tab
            requestAnimationFrame(() => {
                lucide.createIcons();
            });
        }
    }

    /**
     * Opens a file in a specific tab container.
     * @param {string} fileName The name of the file to open.
     * @param {string[]} filePath The array of path segments for the file.
     * @param {HTMLElement} targetTabs The specific tabs container to open the file in.
     * @private
     */
    #openFileInTabContainer(fileName, filePath, targetTabs) {
        if (!targetTabs) return;

        // Check if tab already exists in this container
        const existingTab = Array.from(targetTabs.querySelectorAll('.tab-item'))
            .find(tab => tab.dataset.filename === fileName);

        if (existingTab) {
            this.#logEvent(`Focused tab: ${fileName}`);
            // Find which pane contains this tab
            const containingPane = targetTabs.closest('.split-pane');
            if (containingPane) {
                this.#setActiveTabForPane(existingTab, containingPane);
            } else {
                this.#setActiveTab(existingTab);
            }
        } else {
            // Check if tab exists in another container and move it
            const allTabs = document.querySelectorAll('.tabs .tab-item');
            const existingTabElsewhere = Array.from(allTabs).find(tab => tab.dataset.filename === fileName);
            
            if (existingTabElsewhere) {
                // Move the existing tab to this container
                const sourceContainer = existingTabElsewhere.parentElement;
                const splitBtn = targetTabs.querySelector('.split-panel-btn');
                if (splitBtn) {
                    targetTabs.insertBefore(existingTabElsewhere, splitBtn);
                } else {
                    targetTabs.appendChild(existingTabElsewhere);
                }
                
                // Check if source pane is now empty
                const sourcePane = sourceContainer.closest('.split-pane');
                if (sourcePane) {
                    const remainingTabs = sourceContainer.querySelectorAll('.tab-item');
                    if (remainingTabs.length === 0) {
                        this.#removeSplitPane(sourcePane);
                    }
                }
                
                this.#logEvent(`Moved existing tab: ${fileName} to new pane`);
            } else {
                // Tab doesn't exist anywhere, create it
                const newTab = document.createElement('div');
                const fileClass = this.#getFileTypeClass(fileName);
                newTab.className = `tab-item ${fileClass}`;
                newTab.draggable = true;
                newTab.dataset.filename = fileName;
                if (filePath) {
                    newTab.dataset.path = JSON.stringify(filePath);
                }
                newTab.innerHTML = `
                    <i data-lucide="${this.#getFileIcon(fileName)}" class="tab-icon"></i>
                    <span>${fileName}</span>
                    <button class="tab-close-btn" aria-label="Close tab"><i data-lucide="x"></i></button>
                `;
                
                // Insert before the first split button if it exists
                const splitBtn = targetTabs.querySelector('.split-panel-btn');
                if (splitBtn) {
                    targetTabs.insertBefore(newTab, splitBtn);
                } else {
                    targetTabs.appendChild(newTab);
                }
                
                this.#logEvent(`Opened tab: ${fileName} via drag and drop`);
            }
            
            // Set as active in the appropriate pane
            const targetPane = targetTabs.closest('.split-pane');
            const finalTab = targetTabs.querySelector(`.tab-item[data-filename="${fileName}"]`);
            if (targetPane && finalTab) {
                // Add docking animation
                finalTab.classList.add('tab-docking');
                setTimeout(() => {
                    finalTab.classList.remove('tab-docking');
                }, 300);
                
                this.#setActiveTabForPane(finalTab, targetPane);
            } else if (finalTab) {
                this.#setActiveTab(finalTab);
            }
            
            // Render icons for the new tab
            requestAnimationFrame(() => {
                lucide.createIcons();
            });
        }
    }

    /**
     * Closes a given tab and activates an adjacent one if necessary.
     * @param {HTMLElement} tabToClose The tab element to be closed.
     * @private
     */
    #closeTab(tabToClose) {
        if (!tabToClose) return;

        const containingPane = tabToClose.closest('.split-pane');
        if (containingPane) {
            this.#closeTabInPane(tabToClose, containingPane);
            return;
        }

        // Fallback for non-pane contexts (should be rare)
        let tabToActivate = null;
        if (tabToClose.classList.contains('active')) {
            tabToActivate = tabToClose.previousElementSibling || tabToClose.nextElementSibling;
            this.#logEvent(`Closed tab: ${tabToClose.dataset.filename}`);
        }

        tabToClose.remove();

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
                this.draggedTab = target;
                this.dragSourceContainer = container;
                // Add a class to all tab containers to enable cross-pane dropping
                document.querySelectorAll('.tabs').forEach(tabs => {
                    tabs.classList.add('drag-active');
                });
                // Defer adding the class to allow the browser to create the drag image first.
                setTimeout(() => target.classList.add('dragging'), 0);
            }
        });

        container.addEventListener('dragend', e => {
            if (this.draggedTab) {
                // Clean up all containers
                document.querySelectorAll('.tabs').forEach(tabs => {
                    tabs.classList.remove('drag-active');
                    tabs.classList.remove('drag-over');
                    const indicator = tabs.querySelector('.drop-indicator');
                    if (indicator) indicator.style.display = 'none';
                });

                // Clean up drop zone indicators
                this.#hideDropZoneIndicators();

                // Use the current drop container if we have one
                const finalDropContainer = this.currentDropContainer || this.dragSourceContainer;
                
                if (finalDropContainer && finalDropContainer !== this.dragSourceContainer) {
                    // Moving to a different container
                    const splitBtns = finalDropContainer.querySelectorAll('.split-panel-btn');
                    const firstSplitBtn = splitBtns[0];
                    
                    // Check if dropTarget is a split button
                    const isDropTargetSplitBtn = this.dropTarget && this.dropTarget.classList.contains('split-panel-btn');
                    
                    if (this.dropTarget && this.dropTarget.parentElement === finalDropContainer && !isDropTargetSplitBtn) {
                        finalDropContainer.insertBefore(this.draggedTab, this.dropTarget);
                    } else if (firstSplitBtn) {
                        finalDropContainer.insertBefore(this.draggedTab, firstSplitBtn);
                    } else {
                        finalDropContainer.appendChild(this.draggedTab);
                    }

                    // Add docking animation
                    this.draggedTab.classList.add('tab-docking');
                    setTimeout(() => {
                        if (this.draggedTab) {
                            this.draggedTab.classList.remove('tab-docking');
                        }
                    }, 300);

                    // Activate the tab in its new pane
                    const newPane = finalDropContainer.closest('.split-pane');
                    if (newPane) {
                        this.#setActiveTabForPane(this.draggedTab, newPane);
                    }

                    const tabName = this.draggedTab.dataset.filename || this.draggedTab.dataset.view;
                    this.#logEvent(`Moved tab "${tabName}" to different pane`);
                    
                    // Check if source pane is now empty
                    const sourcePane = this.dragSourceContainer.closest('.split-pane');
                    if (sourcePane) {
                        const remainingTabs = this.dragSourceContainer.querySelectorAll('.tab-item');
                        if (remainingTabs.length === 0) {
                            this.#removeSplitPane(sourcePane);
                        }
                    }
                } else if (this.dropTarget && this.dropTarget.parentElement === this.dragSourceContainer) {
                    // Same container, just reorder
                    this.dragSourceContainer.insertBefore(this.draggedTab, this.dropTarget);
                    const tabName = this.draggedTab.dataset.filename || this.draggedTab.dataset.view;
                    this.#logEvent(`Reordered tab: ${tabName}`);
                }

                // Ensure icons are rendered after DOM changes
                requestAnimationFrame(() => {
                    lucide.createIcons();
                });

                // Clean up
                this.draggedTab.classList.remove('dragging');
                this.draggedTab = null;
                this.dragSourceContainer = null;
                this.currentDropContainer = null;
                this.dropZone = null;
                this.dropTargetPane = null;
            }
            this.dropTarget = null;
        });

        container.addEventListener('dragover', e => {
            e.preventDefault(); // Allow dropping
            
            // Track which container we're dragging over
            if (this.currentDropContainer !== container) {
                // Clear dropTarget when moving to a different container
                this.dropTarget = null;
                // Remove drag-over class from previous container
                if (this.currentDropContainer) {
                    this.currentDropContainer.classList.remove('drag-over');
                }
            }
            this.currentDropContainer = container;
            container.classList.add('drag-over');
            
            const afterElement = this.#getDragAfterElement(container, e.clientX);
            this.dropTarget = afterElement;
            
            const indicator = container.querySelector('.drop-indicator');
            if (!indicator) return;

            const splitBtns = container.querySelectorAll('.split-panel-btn');
            const lastTab = Array.from(container.querySelectorAll('.tab-item:not(.dragging)')).pop();
            const isAfterElementSplitBtn = afterElement && afterElement.classList.contains('split-panel-btn');
            
            let indicatorLeft = 0;
            if (afterElement && !isAfterElementSplitBtn) {
                indicatorLeft = afterElement.offsetLeft;
            } else if (lastTab) {
                indicatorLeft = lastTab.offsetLeft + lastTab.offsetWidth;
            } else {
                // If there are no other tabs, position at the start
                indicatorLeft = 0;
            }

            indicator.style.left = `${indicatorLeft}px`;
            indicator.style.display = 'block';
        });

        container.addEventListener('dragleave', e => {
            // Hide indicator if mouse leaves the container
            if (!container.contains(e.relatedTarget)) {
                const indicator = container.querySelector('.drop-indicator');
                if (indicator) indicator.style.display = 'none';
                
                // Clear current drop container if we're leaving it
                if (this.currentDropContainer === container) {
                    this.currentDropContainer = null;
                    container.classList.remove('drag-over');
                }
            }
        });

        // Enable drop on empty areas of the tab bar
        container.addEventListener('drop', e => {
            e.preventDefault();
            
            // Check if this is a file drop from the file tree
            const fileName = e.dataTransfer.getData('text/plain');
            const filePathData = e.dataTransfer.getData('application/x-filepath');
            
            if (fileName && filePathData && !this.draggedTab) {
                // This is a file drop from the explorer
                try {
                    const filePath = JSON.parse(filePathData);
                    
                    // Find the pane that contains this tab container
                    const pane = container.closest('.split-pane');
                    if (pane) {
                        // Store the current active panes to restore after opening
                        const currentActivePanes = new Map(this.activePanes);
                        
                        // Temporarily set this as the active pane
                        const paneId = pane.dataset.paneId;
                        const paneInfo = this.activePanes.get(paneId);
                        if (paneInfo) {
                            paneInfo.activeTab = true; // Mark as having activity
                        }
                    }
                    
                    // Open the file in this specific container
                    this.#openFileInTabContainer(fileName, filePath, container);
                    
                    // Clean up visual feedback
                    container.classList.remove('drag-over');
                } catch (err) {
                    console.error('Failed to parse file path data:', err);
                }
            }
        });
    }

    #initTabs() {
        this.tabsContainer.querySelectorAll('.tab-item').forEach(tab => {
            const fileName = tab.dataset.filename;
            if (fileName) {
                const fileClass = this.#getFileTypeClass(fileName);
                if (fileClass) {
                    tab.classList.add(fileClass);
                }
            }
        });

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

        // Apply color coding to files
        fileTree.querySelectorAll('.file-tree-item').forEach(item => {
            const parentLi = item.parentElement;
            if (parentLi && !parentLi.classList.contains('folder')) {
                const fileName = item.textContent.trim();
                if (fileName) {
                    const fileClass = this.#getFileTypeClass(fileName);
                    if (fileClass) {
                        const icon = item.querySelector('i');
                        if (icon) {
                            icon.classList.add(fileClass);
                        }
                    }
                }
            }
        });

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

        // Make file items draggable
        fileTree.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.file-tree-item');
            if (!item) return;

            const parentLi = item.parentElement;
            if (parentLi?.classList.contains('folder')) {
                // Don't allow dragging folders
                e.preventDefault();
                return;
            }

            // Store file info in dataTransfer
            const fileName = item.textContent.trim();
            const filePath = this.#getPathForFileElement(item);
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', fileName);
            e.dataTransfer.setData('application/x-filepath', JSON.stringify(filePath));
            
            // Visual feedback
            item.style.opacity = '0.5';
        });

        fileTree.addEventListener('dragend', (e) => {
            const item = e.target.closest('.file-tree-item');
            if (item) {
                item.style.opacity = '';
            }
        });

        // Set draggable attribute on all file items (not folders)
        fileTree.querySelectorAll('.file-tree-item').forEach(item => {
            const parentLi = item.parentElement;
            if (!parentLi?.classList.contains('folder')) {
                item.setAttribute('draggable', 'true');
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

        let tree = [];
        const buildTree = (element, prefix = '', isLast = true) => {
            const nestedList = element.querySelector('.nested-list');
            if (!nestedList) return;
            
            const items = nestedList.querySelectorAll('li');
            items.forEach((item, index) => {
                const isLastItem = index === items.length - 1;
                const itemElement = item.querySelector('.file-tree-item');
                const name = itemElement?.querySelector('span:last-of-type')?.textContent.trim();
                const isFolder = item.classList.contains('folder');
                const iconElement = itemElement?.querySelector('.file-icon');
                const iconName = iconElement?.getAttribute('data-lucide') || (isFolder ? 'folder' : 'file');
                const linePrefix = prefix + (isLastItem ? '└── ' : '├── ');
                tree.push({linePrefix, iconName, name});
                if (isFolder) {
                    const newPrefix = prefix + (isLastItem ? '    ' : '│   ');
                    buildTree(item, newPrefix, false);
                }
            });
        };
        buildTree(currentPath);
        if (tree.length === 0) return 'Directory is empty.';
        return JSON.stringify(tree);
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

    // Helper to create and initialize the terminal input line
    #createInputLine() {
        const inputLine = document.createElement('div');
        inputLine.className = 'terminal-input-line';
        inputLine.innerHTML = `
            <span class="terminal-prompt"></span>
            <input type="text" id="terminal-input" class="terminal-input" autofocus>
        `;
        this.terminalOutput.appendChild(inputLine);
        // Update prompt and cursor
        this.#updateInputPrompt();
        this.terminalInput = inputLine.querySelector('.terminal-input');
        // Re-initialize input events and custom cursor
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
        this.terminalInput.addEventListener('input', () => this.#updateCustomCursor());
        this.terminalInput.addEventListener('click', () => this.#updateCustomCursor());
        this.terminalInput.addEventListener('keyup', () => this.#updateCustomCursor());
        this.#createCustomCursor();
        this.#updateCustomCursor();
    }

    #handleHistoryNavigation(direction) {
        if (!this.commandHistory.length) return;
        this.historyIndex += direction;
        if (this.historyIndex < 0) this.historyIndex = 0;
        if (this.historyIndex >= this.commandHistory.length) {
            this.historyIndex = this.commandHistory.length;
            this.terminalInput.value = '';
        } else {
            this.terminalInput.value = this.commandHistory[this.historyIndex];
        }
        this.#updateCustomCursor();
        this.terminalInput.focus();
    }

    #initSplitPanels() {
        // Find all split buttons in the initial layout (main and bottom)
        const allSplitBtns = document.querySelectorAll('.split-panel-btn');

        allSplitBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sourcePane = btn.closest('.split-pane');
                if (!sourcePane) return;

                const isHorizontal = btn.classList.contains('split-horizontal');
                const direction = isHorizontal ? 'horizontal' : 'vertical';
                
                this.#splitPanel('main', direction, sourcePane);
            });
        });

        // Initialize the first pane
        const firstPane = this.mainSplitContainer.querySelector('.split-pane');
        if (firstPane) {
            // Get the tabs for the first pane
            const firstTabs = firstPane.querySelector('.tabs');
            
            this.activePanes.set('main-pane-1', {
                element: firstPane,
                tabs: firstTabs,
                activeTab: firstTabs ? firstTabs.querySelector('.tab-item.active') : null
            });
            
            // Initialize drag events for the first pane
            this.#initPaneDragEvents(firstPane);
        }
    }

    /**
     * Splits a panel into two panes
     * @param {string} panelType - 'main' or 'bottom'
     * @param {string} direction - 'vertical' or 'horizontal'
     * @param {HTMLElement} sourcePaneElement - The specific pane to split (optional)
     * @private
     */
    #splitPanel(panelType, direction, sourcePaneElement = null) {
        if (panelType !== 'main') return; // Only handle main panel for now

        // If no source pane is specified, find the active pane
        if (!sourcePaneElement) {
            // Find the pane with an active tab
            const allPanes = document.querySelectorAll('.split-pane');
            for (const pane of allPanes) {
                const activeTab = pane.querySelector('.tabs .tab-item.active');
                if (activeTab) {
                    sourcePaneElement = pane;
                    break;
                }
            }
            
            // Fallback to first pane
            if (!sourcePaneElement) {
                sourcePaneElement = document.querySelector('.split-pane');
            }
        }

        if (!sourcePaneElement) return;

        // Get the content of the source pane (tabs, breadcrumbs, editor)
        const sourceTabs = sourcePaneElement.querySelector('.tabs');
        const sourceBreadcrumbs = sourcePaneElement.querySelector('.breadcrumb-bar');
        const sourceContent = sourcePaneElement.querySelector('.editor-content');

        // Create a new split container within the source pane
        const splitContainer = document.createElement('div');
        splitContainer.className = `split-container ${direction}`;
        
        // Create first pane (will contain the original content)
        const firstPane = document.createElement('div');
        firstPane.className = 'split-pane has-tabs';
        firstPane.dataset.paneId = sourcePaneElement.dataset.paneId; // Keep the same ID
        
        // Move original content to first pane
        if (sourceTabs) firstPane.appendChild(sourceTabs);
        if (sourceBreadcrumbs) firstPane.appendChild(sourceBreadcrumbs);
        if (sourceContent) firstPane.appendChild(sourceContent);

        // Create resizer
        const resizer = document.createElement('div');
        resizer.className = `split-resizer ${direction} animate-in`;
        resizer.id = `split-resizer-${++this.splitPaneCounter}`;

        // Create second pane (new empty pane)
        const newPaneId = `main-pane-${++this.splitPaneCounter}`;
        const secondPane = this.#createSplitPane(newPaneId);

        // Add animation class based on direction
        if (direction === 'vertical') {
            secondPane.classList.add('animate-in-right');
        } else {
            secondPane.classList.add('animate-in-bottom');
        }

        // Clear the source pane and add the split container
        sourcePaneElement.innerHTML = '';
        sourcePaneElement.classList.remove('has-tabs');
        
        // Add the split container to the source pane
        sourcePaneElement.appendChild(splitContainer);
        
        // Add panes and resizer to the split container
        splitContainer.appendChild(firstPane);
        splitContainer.appendChild(resizer);
        splitContainer.appendChild(secondPane);

        // Update the active panes map for the first pane
        const originalPaneInfo = this.activePanes.get(sourcePaneElement.dataset.paneId);
        if (originalPaneInfo) {
            originalPaneInfo.element = firstPane;
        }

        // Initialize resizer
        this.#initSplitResizer(resizer, direction);

        // Initialize drag events for both panes
        this.#initPaneDragEvents(firstPane);
        this.#initPaneDragEvents(secondPane);

        // Remove animation classes after animation completes
        setTimeout(() => {
            secondPane.classList.remove('animate-in-right', 'animate-in-bottom');
            resizer.classList.remove('animate-in');
        }, 300);

        this.#logEvent(`Split panel ${direction}ly within pane ${sourcePaneElement.dataset.paneId}`);
    }

    /**
     * Creates a new split pane with tabs and empty content
     * @param {string} paneId - Unique ID for the pane
     * @returns {HTMLElement} The created pane element
     * @private
     */
    #createSplitPane(paneId) {
        const pane = document.createElement('div');
        pane.className = 'split-pane has-tabs';
        pane.dataset.paneId = paneId;

        // Create tabs container for this pane
        const tabs = document.createElement('div');
        tabs.className = 'tabs';
        tabs.innerHTML = `
            <div class="tab-item active file-type-default" data-filename="untitled" draggable="true">
                <i data-lucide="file" class="tab-icon"></i>
                <span>untitled</span>
                <button class="tab-close-btn" aria-label="Close tab"><i data-lucide="x"></i></button>
            </div>
            <button class="split-panel-btn" aria-label="Split panel vertically">
                <i data-lucide="columns-2"></i>
            </button>
            <button class="split-panel-btn split-horizontal" aria-label="Split panel horizontally">
                <i data-lucide="rows-2"></i>
            </button>
        `;

        // Create breadcrumb bar for this pane
        const breadcrumbBar = document.createElement('div');
        breadcrumbBar.className = 'breadcrumb-bar hidden';
        breadcrumbBar.innerHTML = `
            <div class="breadcrumbs"></div>
            <div class="breadcrumb-actions">
                <button class="header-action-btn" aria-label="More Actions">
                    <i data-lucide="more-vertical"></i>
                </button>
            </div>
        `;

        // Create editor content
        const editorContent = document.createElement('div');
        editorContent.className = 'editor-content';
        editorContent.innerHTML = '<p>Empty file. Open a file from the explorer.</p>';

        pane.appendChild(tabs);
        pane.appendChild(breadcrumbBar);
        pane.appendChild(editorContent);

        // Initialize tab functionality for this pane
        this.#initTabGroup(
            tabs,
            (tab) => this.#setActiveTabForPane(tab, pane),
            (tab) => this.#closeTabInPane(tab, pane)
        );

        // Initialize split buttons for this pane
        const splitBtns = tabs.querySelectorAll('.split-panel-btn');
        splitBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const isHorizontal = btn.classList.contains('split-horizontal');
                const direction = isHorizontal ? 'horizontal' : 'vertical';
                // Find the pane that contains this button
                const containingPane = btn.closest('.split-pane');
                this.#splitPanel('main', direction, containingPane);
            });
        });

        // Store pane info
        this.activePanes.set(paneId, {
            element: pane,
            tabs: tabs,
            activeTab: tabs.querySelector('.tab-item.active')
        });

        // Ensure icons are rendered after DOM update
        requestAnimationFrame(() => {
            lucide.createIcons();
        });

        // Initialize drag events for this pane
        this.#initPaneDragEvents(pane);

        return pane;
    }

    /**
     * Initializes a split resizer for drag functionality
     * @param {HTMLElement} resizer - The resizer element
     * @param {string} direction - 'vertical' or 'horizontal'
     * @private
     */
    #initSplitResizer(resizer, direction) {
        const handleMouseDown = (e) => {
            e.preventDefault();
            const isVertical = direction === 'vertical';
            document.body.classList.add('is-resizing', isVertical ? 'is-resizing-h' : 'is-resizing-v');

            const startPos = isVertical ? e.clientX : e.clientY;
            const prevPane = resizer.previousElementSibling;
            const nextPane = resizer.nextElementSibling;
            const prevSize = isVertical ? prevPane.offsetWidth : prevPane.offsetHeight;
            const nextSize = isVertical ? nextPane.offsetWidth : nextPane.offsetHeight;
            const totalSize = prevSize + nextSize;

            const handleMouseMove = (event) => {
                const currentPos = isVertical ? event.clientX : event.clientY;
                const delta = currentPos - startPos;
                const newPrevSize = prevSize + delta;
                const newNextSize = totalSize - newPrevSize;

                const minSize = isVertical ? 200 : 150; // Different minimum sizes for vertical and horizontal

                if (newPrevSize >= minSize && newNextSize >= minSize) {
                    prevPane.style.flexBasis = `${newPrevSize}px`;
                    nextPane.style.flexBasis = `${newNextSize}px`;
                }
            };

            const handleMouseUp = () => {
                document.body.classList.remove('is-resizing', 'is-resizing-h', 'is-resizing-v');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                this.#logEvent(`Resized split panes`);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        resizer.addEventListener('mousedown', handleMouseDown);
    }

    /**
     * Sets the active tab for a specific pane
     * @param {HTMLElement} tabElement - The tab to activate
     * @param {HTMLElement} paneElement - The pane containing the tab
     * @private
     */
    #setActiveTabForPane(tabElement, paneElement) {
        if (!paneElement) return;

        const paneId = paneElement.dataset.paneId;
        const paneInfo = this.activePanes.get(paneId);
        if (!paneInfo) return;

        // Handle case where last tab is closed (tabElement is null)
        if (!tabElement) {
            paneInfo.tabs.querySelector('.tab-item.active')?.classList.remove('active');
            paneInfo.activeTab = null;
            const editorContent = paneElement.querySelector('.editor-content p');
            if (editorContent) editorContent.textContent = 'No file open. Select a file from the explorer.';
            this.#updateBreadcrumbsForPane(null, paneElement);
            return;
        }

        // Check if we're activating a real file and there's an untitled tab
        const fileName = tabElement.dataset.filename;
        if (fileName && fileName !== 'untitled') {
            const untitledTab = paneInfo.tabs.querySelector('.tab-item[data-filename="untitled"]');
            if (untitledTab) {
                // Remove the untitled tab
                untitledTab.remove();
            }
        }

        // Deactivate current active tab in this pane
        paneInfo.tabs.querySelector('.tab-item.active')?.classList.remove('active');

        // Activate the new tab
        tabElement.classList.add('active');
        paneInfo.activeTab = tabElement;

        // Update editor content for this pane
        const editorContent = paneElement.querySelector('.editor-content p');
        const breadcrumbBar = paneElement.querySelector('.breadcrumb-bar');

        if (fileName) {
            let filePath = tabElement.dataset.path ? JSON.parse(tabElement.dataset.path) : null;
            
            if (!filePath && fileName !== 'untitled') {
                const fileTreeElement = this.#findFileElementInTree(fileName);
                if (fileTreeElement) {
                    filePath = this.#getPathForFileElement(fileTreeElement);
                    tabElement.dataset.path = JSON.stringify(filePath);
                } else {
                    filePath = [fileName];
                }
            }
            
            this.#updateBreadcrumbsForPane(filePath, paneElement);

            if (fileName === 'untitled') {
                editorContent.textContent = 'Empty file. Open a file from the explorer.';
            } else {
                editorContent.textContent = `Content for ${fileName} would be displayed here.`;
            }
        }
    }

    /**
     * Closes a tab in a specific pane
     * @param {HTMLElement} tabToClose - The tab to close
     * @param {HTMLElement} paneElement - The pane containing the tab
     * @private
     */
    #closeTabInPane(tabToClose, paneElement) {
        if (!tabToClose || !paneElement) return;

        const paneId = paneElement.dataset.paneId;
        const paneInfo = this.activePanes.get(paneId);
        if (!paneInfo) return;

        const remainingTabs = paneInfo.tabs.querySelectorAll('.tab-item');
        
        // If this is the last tab in a split pane, check if we should remove the pane
        if (remainingTabs.length === 1) {
            // Check if this pane is part of a split (has a sibling pane)
            const parentContainer = paneElement.parentElement;
            if (parentContainer && parentContainer.classList.contains('split-container')) {
                const siblingPanes = parentContainer.querySelectorAll('.split-pane');
                if (siblingPanes.length > 1) {
                    this.#removeSplitPane(paneElement);
                    return;
                }
            }
        }

        // Otherwise, proceed with normal tab closing
        const wasActive = tabToClose.classList.contains('active');
        let tabToActivate = null;
        if (wasActive) {
            // If the closed tab was active, find a new one to activate
            tabToActivate = tabToClose.previousElementSibling || tabToClose.nextElementSibling;
        }
        
        this.#logEvent(`Closed tab: ${tabToClose.dataset.filename}`);
        tabToClose.remove();

        if (wasActive) {
            this.#setActiveTabForPane(tabToActivate, paneElement);
        }
    }

    /**
     * Removes a split pane and its associated resizer
     * @param {HTMLElement} paneElement - The pane to remove
     * @private
     */
    #removeSplitPane(paneElement) {
        const paneId = paneElement.dataset.paneId;
        const parentContainer = paneElement.parentElement;
        
        // If parent is not a split container, just return
        if (!parentContainer || !parentContainer.classList.contains('split-container')) {
            return;
        }
        
        const resizer = paneElement.previousElementSibling?.classList.contains('split-resizer') 
            ? paneElement.previousElementSibling 
            : paneElement.nextElementSibling;
        
        const otherPane = resizer?.previousElementSibling === paneElement 
            ? resizer.nextElementSibling 
            : resizer?.previousElementSibling;
        
        if (resizer && otherPane) {
            // Get the content from the remaining pane
            const remainingContent = Array.from(otherPane.children);
            
            // Get the grandparent (the pane containing the split container)
            const grandParent = parentContainer.parentElement;
            
            if (grandParent) {
                if (grandParent.classList.contains('split-pane')) {
                    // Move content from the remaining pane to the grandparent
                    grandParent.innerHTML = '';
                    remainingContent.forEach(child => grandParent.appendChild(child));
                    
                    // Update the pane ID and class
                    grandParent.dataset.paneId = otherPane.dataset.paneId;
                    if (otherPane.classList.contains('has-tabs')) {
                        grandParent.classList.add('has-tabs');
                    }
                    
                    // Update the active panes map
                    const otherPaneInfo = this.activePanes.get(otherPane.dataset.paneId);
                    if (otherPaneInfo) {
                        otherPaneInfo.element = grandParent;
                    }
                } else if (grandParent.id === 'main-split-container') {
                    // Special case: we're at the top level
                    // Just move the other pane's content directly
                    const otherPaneContent = Array.from(otherPane.children);
                    
                    // Remove split container and resizer
                    parentContainer.remove();
                    
                    // If the other pane has a split container, move it directly
                    // Otherwise, move its content
                    if (otherPaneContent.length === 1 && otherPaneContent[0].classList.contains('split-container')) {
                        grandParent.appendChild(otherPaneContent[0]);
                    } else {
                        // Create a new single pane
                        const newPane = document.createElement('div');
                        newPane.className = 'split-pane';
                        newPane.dataset.paneId = otherPane.dataset.paneId;
                        if (otherPane.classList.contains('has-tabs')) {
                            newPane.classList.add('has-tabs');
                        }
                        
                        otherPaneContent.forEach(child => newPane.appendChild(child));
                        grandParent.appendChild(newPane);
                        
                        // Update the active panes map
                        const otherPaneInfo = this.activePanes.get(otherPane.dataset.paneId);
                        if (otherPaneInfo) {
                            otherPaneInfo.element = newPane;
                        }
                    }
                }
            }
        }
        
        // Clean up the removed pane info
        this.activePanes.delete(paneId);
        
        this.#logEvent(`Removed split pane: ${paneId}`);
    }

    /**
     * Updates breadcrumbs for a specific pane
     * @param {string[]|null} path - The file path
     * @param {HTMLElement} paneElement - The pane element
     * @private
     */
    #updateBreadcrumbsForPane(path, paneElement) {
        const breadcrumbBar = paneElement.querySelector('.breadcrumb-bar');
        if (!breadcrumbBar) return;

        const container = breadcrumbBar.querySelector('.breadcrumbs');
        if (!container) return;

        if (!path || path.length === 0) {
            breadcrumbBar.classList.add('hidden');
            return;
        }
        
        breadcrumbBar.classList.remove('hidden');
        container.innerHTML = '';

        path.forEach((segment, index) => {
            const isLast = index === path.length - 1;

            if (isLast) {
                // The file itself, wrapped for color coding
                const fileIcon = this.#getFileIcon(segment);
                const fileClass = this.#getFileTypeClass(segment);
                container.innerHTML += `<span class="breadcrumb-file-item ${fileClass}">
                    <i data-lucide="${fileIcon}" class="breadcrumb-icon"></i>
                    <span class="breadcrumb-item active">${segment}</span>
                </span>`;
            } else {
                // A parent folder
                container.innerHTML += `<i data-lucide="folder" class="breadcrumb-icon"></i>`;
                container.innerHTML += `<span class="breadcrumb-item">${segment}</span>`;
                container.innerHTML += `<i data-lucide="chevron-right" class="breadcrumb-separator"></i>`;
            }
        });

        requestAnimationFrame(() => {
            lucide.createIcons();
        });
    }

    /**
     * Updates breadcrumbs visibility for the original panel when splitting
     * @param {HTMLElement} paneElement - The pane element
     * @private
     */
    #updateBreadcrumbsForSplitPane(paneElement) {
        // Move the main breadcrumb bar to the first pane if needed
        if (this.breadcrumbBar.parentElement === this.mainPanel) {
            const firstPaneContent = paneElement.querySelector('.editor-content');
            if (firstPaneContent) {
                paneElement.insertBefore(this.breadcrumbBar, firstPaneContent);
            }
        }
    }

    /**
     * Determines which drop zone the mouse is over within a pane
     * @param {HTMLElement} paneElement - The pane element
     * @param {MouseEvent} event - The drag event
     * @returns {string} The drop zone: 'top', 'bottom', 'left', 'right', 'center', or 'tab-bar'
     * @private
     */
    #getDropZone(paneElement, event) {
        const rect = paneElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const width = rect.width;
        const height = rect.height;
        
        // Check if over tab bar
        const tabBar = paneElement.querySelector('.tabs');
        if (tabBar) {
            const tabBarRect = tabBar.getBoundingClientRect();
            if (event.clientY >= tabBarRect.top && event.clientY <= tabBarRect.bottom &&
                event.clientX >= tabBarRect.left && event.clientX <= tabBarRect.right) {
                return 'tab-bar';
            }
        }
        
        // Define edge zones (20% of width/height from edges)
        const edgeThreshold = 0.2;
        const leftEdge = width * edgeThreshold;
        const rightEdge = width * (1 - edgeThreshold);
        const topEdge = height * edgeThreshold;
        const bottomEdge = height * (1 - edgeThreshold);
        
        if (x < leftEdge) return 'left';
        if (x > rightEdge) return 'right';
        if (y < topEdge) return 'top';
        if (y > bottomEdge) return 'bottom';
        
        return 'center';
    }

    /**
     * Shows visual feedback for the drop zone
     * @param {HTMLElement} paneElement - The pane element
     * @param {string} zone - The drop zone
     * @private
     */
    #showDropZoneIndicator(paneElement, zone) {
        if (zone === 'tab-bar' || zone === 'center') {
            this.#hideDropZoneIndicators();
            return;
        }

        // Check if the correct indicator is already visible
        const existingIndicator = paneElement.querySelector(`.drop-zone-indicator[data-zone="${zone}"]`);
        if (existingIndicator) {
            return; // Already showing, do nothing to prevent flicker
        }

        // If we are here, we need to show a new indicator, so hide any old ones first.
        this.#hideDropZoneIndicators();

        // Create new drop zone indicator
        const indicator = document.createElement('div');
        indicator.className = 'drop-zone-indicator';
        indicator.dataset.zone = zone;
        
        const rect = paneElement.getBoundingClientRect();
        
        switch (zone) {
            case 'top':
                indicator.style.left = '0';
                indicator.style.top = '0';
                indicator.style.width = '100%';
                indicator.style.height = '50%';
                break;
            case 'bottom':
                indicator.style.left = '0';
                indicator.style.bottom = '0';
                indicator.style.width = '100%';
                indicator.style.height = '50%';
                break;
            case 'left':
                indicator.style.left = '0';
                indicator.style.top = '0';
                indicator.style.width = '50%';
                indicator.style.height = '100%';
                break;
            case 'right':
                indicator.style.right = '0';
                indicator.style.top = '0';
                indicator.style.width = '50%';
                indicator.style.height = '100%';
                break;
        }
        
        paneElement.appendChild(indicator);
    }

    /**
     * Hides all drop zone indicators
     * @private
     */
    #hideDropZoneIndicators() {
        document.querySelectorAll('.drop-zone-indicator').forEach(indicator => {
            indicator.remove();
        });
    }

    /**
     * Initializes drag event listeners for a pane to support edge drops
     * @param {HTMLElement} paneElement - The pane element
     * @private
     */
    #initPaneDragEvents(paneElement) {
        paneElement.addEventListener('dragover', (e) => {
            // Only handle if we're dragging a tab
            if (!this.draggedTab) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const zone = this.#getDropZone(paneElement, e);
            this.dropZone = zone;
            this.dropTargetPane = paneElement;
            
            if (zone === 'tab-bar') {
                // Let the tab bar handle this
                return;
            }
            
            this.#showDropZoneIndicator(paneElement, zone);
        });
        
        paneElement.addEventListener('dragleave', (e) => {
            // Only clear if leaving the pane entirely
            if (!paneElement.contains(e.relatedTarget)) {
                this.#hideDropZoneIndicators();
                if (this.dropTargetPane === paneElement) {
                    this.dropTargetPane = null;
                    this.dropZone = null;
                }
            }
        });
        
        paneElement.addEventListener('drop', (e) => {
            if (!this.draggedTab || !this.dropZone || this.dropTargetPane !== paneElement) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            if (this.dropZone === 'center' || this.dropZone === 'tab-bar') {
                // Let normal tab drop handling occur
                return;
            }
            
            // Handle edge drops to create splits
            const direction = (this.dropZone === 'top' || this.dropZone === 'bottom') ? 'horizontal' : 'vertical';
            const position = (this.dropZone === 'bottom' || this.dropZone === 'right') ? 'after' : 'before';
            
            // Split the pane
            this.#splitPaneWithTab(paneElement, direction, position, this.draggedTab);
            
            // Clean up
            this.#hideDropZoneIndicators();
            
            // Manually trigger cleanup since we're preventing the normal flow
            this.draggedTab.classList.remove('dragging');
            document.querySelectorAll('.tabs').forEach(tabs => {
                tabs.classList.remove('drag-active');
                tabs.classList.remove('drag-over');
            });
            
            // Ensure icons are rendered
            requestAnimationFrame(() => {
                lucide.createIcons();
            });
        });
    }

    /**
     * Splits a pane and moves a tab to the new pane
     * @param {HTMLElement} targetPane - The pane to split
     * @param {string} direction - 'vertical' or 'horizontal'
     * @param {string} position - 'before' or 'after'
     * @param {HTMLElement} tabElement - The tab to move
     * @private
     */
    #splitPaneWithTab(targetPane, direction, position, tabElement) {
        // First, split the pane
        this.#splitPanel('main', direction, targetPane);
        
        // Find the newly created pane
        const parentContainer = targetPane.querySelector('.split-container');
        if (!parentContainer) return;
        
        const panes = parentContainer.querySelectorAll('.split-pane');
        const newPane = position === 'after' ? panes[1] : panes[0];
        const originalPane = position === 'after' ? panes[0] : panes[1];
        
        if (!newPane || !originalPane) return;
        
        // Move the tab to the new pane
        const newTabs = newPane.querySelector('.tabs');
        const fileName = tabElement.dataset.filename;
        const filePath = tabElement.dataset.path ? JSON.parse(tabElement.dataset.path) : null;
        
        // Remove the untitled tab from the new pane
        const untitledTab = newTabs.querySelector('.tab-item[data-filename="untitled"]');
        if (untitledTab) {
            untitledTab.remove();
        }
        
        // Move the actual tab element
        const splitBtn = newTabs.querySelector('.split-panel-btn');
        if (splitBtn) {
            newTabs.insertBefore(tabElement, splitBtn);
        } else {
            newTabs.appendChild(tabElement);
        }
        
        // Add docking animation
        tabElement.classList.add('tab-docking');
        setTimeout(() => {
            tabElement.classList.remove('tab-docking');
        }, 300);
        
        // Check if source pane is now empty
        const sourcePane = this.dragSourceContainer.closest('.split-pane');
        if (sourcePane) {
            const remainingTabs = this.dragSourceContainer.querySelectorAll('.tab-item');
            if (remainingTabs.length === 0) {
                this.#removeSplitPane(sourcePane);
            }
        }
        
        // Activate the tab in its new pane
        this.#setActiveTabForPane(tabElement, newPane);
        
        const tabName = tabElement.dataset.filename || tabElement.dataset.view;
        this.#logEvent(`Split panel ${direction}ly and moved tab "${tabName}"`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});