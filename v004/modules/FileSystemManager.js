/**
 * FileSystemManager Module
 * Provides a virtual file system for demo purposes
 */

export class FileSystemManager {
    constructor() {
        // Virtual file system structure
        this.virtualFS = {
            'src': {
                type: 'folder',
                children: {
                    'index.js': {
                        type: 'file',
                        content: `// Main application entry point
import { App } from './App.js';

const app = new App();
app.initialize();`,
                        language: 'javascript'
                    },
                    'App.js': {
                        type: 'file',
                        content: `export class App {
    constructor() {
        this.name = 'FileUI Demo';
    }
    
    initialize() {
        console.log('App initialized');
    }
}`,
                        language: 'javascript'
                    },
                    'components': {
                        type: 'folder',
                        children: {
                            'Button.js': {
                                type: 'file',
                                content: `export const Button = ({ text, onClick }) => {
    return \`<button onclick="\${onClick}">\${text}</button>\`;
};`,
                                language: 'javascript'
                            },
                            'Panel.js': {
                                type: 'file',
                                content: `export class Panel {
    constructor(id) {
        this.id = id;
    }
}`,
                                language: 'javascript'
                            }
                        }
                    },
                    'styles': {
                        type: 'folder',
                        children: {
                            'main.css': {
                                type: 'file',
                                content: `/* Main styles */
body {
    margin: 0;
    font-family: Arial, sans-serif;
}

.container {
    padding: 20px;
}`,
                                language: 'css'
                            },
                            'theme.css': {
                                type: 'file',
                                content: `:root {
    --primary-color: #007acc;
    --background-color: #1e1e1e;
}`,
                                language: 'css'
                            }
                        }
                    }
                }
            },
            'docs': {
                type: 'folder',
                children: {
                    'README.md': {
                        type: 'file',
                        content: `# FileUI Demo

This is a demonstration of the FileUI panel system.

## Features
- Binary Space Partitioning
- Drag and drop panels
- Virtual file system
- Code editing`,
                        language: 'markdown'
                    },
                    'TODO.md': {
                        type: 'file',
                        content: `# TODO List

- [ ] Implement Monaco Editor
- [ ] Add terminal emulation
- [ ] File watching
- [ ] Git integration`,
                        language: 'markdown'
                    }
                }
            },
            'package.json': {
                type: 'file',
                content: `{
    "name": "fileui-demo",
    "version": "1.0.0",
    "description": "FileUI Panel System Demo",
    "main": "src/index.js",
    "scripts": {
        "start": "node src/index.js",
        "dev": "nodemon src/index.js"
    }
}`,
                language: 'json'
            },
            '.gitignore': {
                type: 'file',
                content: `node_modules/
dist/
.env
*.log`,
                language: 'plaintext'
            }
        };

        // Track open files
        this.openFiles = new Map();
        
        // Event callbacks
        this.onFileOpen = () => {};
        this.onFileChange = () => {};
    }

    /**
     * Get the file tree structure for rendering
     */
    getFileTree() {
        const buildTree = (node, path = '') => {
            const items = [];
            
            for (const [name, data] of Object.entries(node)) {
                const fullPath = path ? `${path}/${name}` : name;
                
                if (data.type === 'folder') {
                    items.push({
                        name,
                        path: fullPath,
                        type: 'folder',
                        children: buildTree(data.children, fullPath)
                    });
                } else {
                    items.push({
                        name,
                        path: fullPath,
                        type: 'file',
                        language: data.language
                    });
                }
            }
            
            // Sort folders first, then files
            return items.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'folder' ? -1 : 1;
            });
        };
        
        return buildTree(this.virtualFS);
    }

    /**
     * Get file content by path
     */
    getFileContent(path) {
        const parts = path.split('/');
        let current = this.virtualFS;
        
        for (const part of parts) {
            if (current[part]) {
                current = current[part];
                if (current.type === 'file') {
                    return current;
                } else if (current.children) {
                    current = current.children;
                }
            } else {
                return null;
            }
        }
        
        return null;
    }

    /**
     * Open a file
     */
    openFile(path) {
        const file = this.getFileContent(path);
        if (file) {
            this.openFiles.set(path, {
                path,
                content: file.content,
                language: file.language,
                modified: false
            });
            this.onFileOpen(path, file);
            return file;
        }
        return null;
    }

    /**
     * Save file changes
     */
    saveFile(path, content) {
        const openFile = this.openFiles.get(path);
        if (openFile) {
            openFile.content = content;
            openFile.modified = false;
            
            // Update virtual FS
            const file = this.getFileContent(path);
            if (file) {
                file.content = content;
            }
            
            this.onFileChange(path, content);
            return true;
        }
        return false;
    }

    /**
     * Get open files
     */
    getOpenFiles() {
        return Array.from(this.openFiles.entries()).map(([path, data]) => ({
            path,
            ...data
        }));
    }

    /**
     * Close a file
     */
    closeFile(path) {
        return this.openFiles.delete(path);
    }

    /**
     * Create a new file
     */
    createFile(path, content = '') {
        const parts = path.split('/');
        const fileName = parts.pop();
        let current = this.virtualFS;
        
        // Navigate to parent folder
        for (const part of parts) {
            if (current[part] && current[part].type === 'folder') {
                current = current[part].children;
            } else {
                return false; // Parent folder doesn't exist
            }
        }
        
        // Create the file
        current[fileName] = {
            type: 'file',
            content,
            language: this.detectLanguage(fileName)
        };
        
        return true;
    }

    /**
     * Detect language from filename
     */
    detectLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'css': 'css',
            'scss': 'scss',
            'html': 'html',
            'json': 'json',
            'md': 'markdown',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'h': 'c',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml'
        };
        return languageMap[ext] || 'plaintext';
    }
}