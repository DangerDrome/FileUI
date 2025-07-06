# FileUI v4 Server Setup

FileUI v4 requires a local server to run properly due to ES6 module requirements and future file system access.

## Quick Start

### Option 1: Python (Recommended - No dependencies)
```bash
cd /home/danger/Documents/GitHub/FileUI/v004
python3 server.py
```
Then open: http://localhost:8000/panels4.html

### Option 2: Use the start script
```bash
cd /home/danger/Documents/GitHub/FileUI/v004
./start.sh
```

### Option 3: Node.js
```bash
cd /home/danger/Documents/GitHub/FileUI/v004
node server.js
```
Then open: http://localhost:8080/panels4.html

## Manual Python Server

If the scripts don't work, you can also use Python's built-in server:

```bash
cd /home/danger/Documents/GitHub/FileUI
python3 -m http.server 8000
```

## Access FileUI v4

Once the server is running, open your browser to:
http://localhost:8000/panels4.html

## Troubleshooting

1. **Port already in use**: Change the PORT variable in the server file
2. **Permission denied**: Run with `sudo` or choose a port above 1024
3. **Python not found**: Install Python 3: `sudo apt install python3`
4. **Node not found**: Install Node.js from https://nodejs.org

## Features

- Serves static files with proper MIME types
- Supports ES6 modules
- No CORS issues
- Ready for future API endpoints