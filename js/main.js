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

        // Terminal elements
        this.bottomPanel = document.getElementById('bottom-panel');
        this.terminal = document.getElementById('terminal');
        this.mainPanel = document.querySelector('.main-panel');
        this.terminalOutput = document.getElementById('terminal-output');
        this.terminalInput = document.getElementById('terminal-input');
        this.bottomTabsContainer = document.getElementById('bottom-tabs');
        this.logsPanel = document.getElementById('logs');
        this.clearLogsBtn = document.getElementById('clear-logs-btn');

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
    }

    /**
     * Main initialization method. Called after the DOM is fully loaded.
     */
    init() {
        console.log("MediaUI Initialized!");
        this.#logEvent("Application Initialized");
        this.#createIcons();
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
     * Initializes the header action buttons for toggling panels.
     * @private
     */
    #initHeaderActions() {
        if (this.toggleLeftPanelBtn) {
            this.toggleLeftPanelBtn.addEventListener('click', () => {
                this.leftPanel?.classList.toggle('hidden');
                this.resizer?.classList.toggle('hidden');
                this.toggleLeftPanelBtn.classList.toggle('active');
                this.#logEvent(`Toggled left panel`);
            });
        }
        if (this.toggleRightPanelBtn) {
            this.toggleRightPanelBtn.addEventListener('click', () => {
                this.rightPanel?.classList.toggle('hidden');
                this.rightResizer?.classList.toggle('hidden');
                this.toggleRightPanelBtn.classList.toggle('active');
                this.#logEvent(`Toggled right panel`);
            });
        }
        if (this.toggleTerminalBtn) {
            this.toggleTerminalBtn.addEventListener('click', () => {
                this.bottomPanel?.classList.toggle('hidden');
                this.terminalResizer?.classList.toggle('hidden');
                this.toggleTerminalBtn.classList.toggle('active');
                this.#logEvent(`Toggled bottom panel`);
            });
        }
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

        this.terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const command = this.terminalInput.value.trim();
                if (command) {
                    this.#logToTerminal(command, true);
                    this.#processTerminalCommand(command);
                    this.terminalInput.value = '';
                }
            }
        });
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
        this.#logEvent(`Executed command: ${command}`);

        switch (cmd.toLowerCase()) {
            case 'help':
                response = 'Available commands:\n  help    - Show this help message\n  clear   - Clear the terminal screen\n  date    - Display the current date and time\n  echo    - Display a line of text\n  modal   - Open the test modal';
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
            default:
                response = `Command not found: ${cmd}. Type 'help' for a list of commands.`;
                break;
        }
        this.#logToTerminal(response);
    }

    /**
     * Logs a message to the terminal output.
     * @param {string} message The message to log.
     * @param {boolean} [isUserInput=false] True if the message is from user input.
     * @private
     */
    #logToTerminal(message, isUserInput = false) {
        const p = document.createElement('p');
        if (isUserInput) {
            p.classList.add('user-input');
            const prompt = document.createElement('span');
            prompt.className = 'terminal-prompt';
            prompt.textContent = '>';
            p.appendChild(prompt);
            p.append(document.createTextNode(message));
        } else {
            p.textContent = message;
        }
        this.terminalOutput.appendChild(p);
        // Auto-scroll to the bottom
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
    }

    #initTerminalResizer() {
        if (!this.terminalResizer || !this.bottomPanel || !this.mainPanel) return;

        const handleMouseMove = (e) => {
            const containerRect = this.mainPanel.getBoundingClientRect();
            // Calculate new height from the bottom of the container
            const newHeight = containerRect.bottom - e.clientY;

            // Define constraints
            const minHeight = 50; // pixels
            const maxHeight = containerRect.height * 0.8; // 80% of main panel

            if (newHeight >= minHeight && newHeight <= maxHeight) {
                this.bottomPanel.style.flexBasis = `${newHeight}px`;
            }
        };

        const handleMouseUp = () => {
            document.body.classList.remove('is-resizing', 'is-resizing-v');
            document.removeEventListener('mousemove', handleMouseMove);
            this.#logEvent(`Resized bottom panel to ${this.bottomPanel.style.flexBasis}`);
        };

        this.terminalResizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.body.classList.add('is-resizing', 'is-resizing-v');
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp, { once: true });
        });

        // Set initial size
        this.bottomPanel.style.flexBasis = '200px';
    }

    #initRightPanelResizer() {
        if (!this.rightResizer || !this.rightPanel) return;

        const handleMouseMove = (e) => {
            const containerRect = this.rightResizer.parentElement.getBoundingClientRect();
            // Calculate new width from the right edge of the container
            const newWidth = containerRect.right - e.clientX;

            const minWidth = 150;
            const maxWidth = containerRect.width * 0.5;

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                this.rightPanel.style.flexBasis = `${newWidth}px`;
            }
        };

        const handleMouseUp = () => {
            document.body.classList.remove('is-resizing', 'is-resizing-h');
            document.removeEventListener('mousemove', handleMouseMove);
            this.#logEvent(`Resized right panel to ${this.rightPanel.style.flexBasis}`);
        };

        this.rightResizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.body.classList.add('is-resizing', 'is-resizing-h');
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp, { once: true });
        });
    }

    /**
     * Sets a given tab element as the active one.
     * @param {HTMLElement} tabElement The tab element to activate.
     * @private
     */
    #setActiveTab(tabElement) {
        if (!tabElement || !this.tabsContainer || !this.editorContent) return;

        // Deactivate current active tab
        this.tabsContainer.querySelector('.tab-item.active')?.classList.remove('active');

        // Activate the new one
        tabElement.classList.add('active');

        // Update editor content based on the active tab
        const fileName = tabElement ? tabElement.dataset.filename : null;
        if (fileName) {
            this.editorContent.textContent = `Content for ${fileName} would be displayed here.`;
        } else {
            this.editorContent.textContent = 'No file open.';
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
     * @private
     */
    #openFileInTab(fileName) {
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
            const iconName = this.#getFileIcon(fileName);
            newTab.innerHTML = `
                <i data-lucide="${iconName}" class="tab-icon"></i>
                <span>${fileName}</span>
                <button class="tab-close-btn" aria-label="Close tab"><i data-lucide="x"></i></button>
            `;
            this.tabsContainer.appendChild(newTab);
            this.#createIcons(); // Re-render icons to catch the new one
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

        container.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('.tab-close-btn');
            if (closeBtn && onClose) {
                onClose(closeBtn.closest('.tab-item'));
                return;
            }

            const clickedTab = e.target.closest('.tab-item');
            if (clickedTab && !clickedTab.classList.contains('active')) {
                container.querySelector('.tab-item.active')?.classList.remove('active');
                clickedTab.classList.add('active');
                onActivate(clickedTab);
            }
        });

        container.addEventListener('dragstart', e => {
            const target = e.target.closest('.tab-item');
            if (target) {
                target.classList.add('dragging');
            }
        });

        container.addEventListener('dragend', e => {
            const target = e.target.closest('.tab-item');
            if (target) {
                target.classList.remove('dragging');
                const tabName = target.dataset.filename || target.dataset.view;
                this.#logEvent(`Reordered tab: ${tabName}`);
            }
        });

        container.addEventListener('dragover', e => {
            e.preventDefault(); // Allow dropping
            const draggingTab = container.querySelector('.dragging');
            if (!draggingTab) return;
            const afterElement = this.#getDragAfterElement(container, e.clientX);
            if (afterElement == null) {
                container.appendChild(draggingTab);
            } else {
                container.insertBefore(draggingTab, afterElement);
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

    #initFileTree() {
        const fileTree = this.leftPanel?.querySelector('.file-tree');
        if (!fileTree) return;

        fileTree.addEventListener('click', (e) => {
            const item = e.target.closest('.file-tree-item');
            if (!item) return;

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
                    this.#openFileInTab(fileName);
                }
            }
        });
    }

    #initPanelResizer() {
        if (!this.resizer || !this.leftPanel) return;

        const handleMouseMove = (e) => {
            const containerRect = this.resizer.parentElement.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;
            const minWidth = 150;
            const maxWidth = containerRect.width * 0.5;

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                this.leftPanel.style.flexBasis = `${newWidth}px`;
            }
        };

        const handleMouseUp = () => {
            document.body.classList.remove('is-resizing', 'is-resizing-h');
            document.removeEventListener('mousemove', handleMouseMove);
            this.#logEvent(`Resized left panel to ${this.leftPanel.style.flexBasis}`);
        };

        this.resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.body.classList.add('is-resizing', 'is-resizing-h');
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp, { once: true });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});