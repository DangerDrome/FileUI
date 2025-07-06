# FileUI v004

## Important: Use the Server!

FileUI v004 uses ES6 modules which require a web server. You cannot open the HTML files directly from the file system.

## Quick Start

1. **Start the server** (if not already running):
   ```bash
   cd /home/danger/Documents/GitHub/FileUI/v004
   python3 server.py
   ```

2. **Open in browser**:
   - Original v004: http://localhost:8000/panels4.html
   - Integrated version (recommended): http://localhost:8000/panels4-integrated.html
   - Test page: http://localhost:8000/test-integrated.html

## DO NOT open files directly!
❌ Wrong: `file:///home/danger/Documents/GitHub/FileUI/v004/panels4.html`
✅ Right: `http://localhost:8000/panels4.html`

## Available Versions

### panels4.html
- Original v004 implementation
- VS Code-like interface with modules

### panels4-integrated.html (Recommended)
- Combines v003's superior BSP system with v004's UI
- Full drag & drop support
- Panel pinning and collapsing
- Undo/redo functionality
- Better overall experience

## Server Options

- Python (recommended): `python3 server.py`
- Node.js: `node server.js`
- Quick start script: `./start.sh`

The server runs on port 8000 by default.