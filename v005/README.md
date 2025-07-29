# FileUI v005

A modern VFX file manager with an advanced panel system, built with TypeScript and Vite.

## Features

- **BSP Panel System**: Based on v003's proven panel management
- **TypeScript**: Full type safety and better development experience
- **Vite**: Fast HMR and modern build tooling
- **VFX File Support**: Specialized handling for 3D, compositing, and media files
- **Bright Teal Accent**: Uses the #00cc8b color scheme from main version

## Quick Start

1. Install dependencies:
```bash
cd v005
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. (Optional) Start the Python API server:
```bash
python server.py
```

The app will open at http://localhost:3000

## Architecture

- `src/main.ts` - Entry point
- `src/panel-manager.ts` - Core panel system
- `src/bsp-tree.ts` - Binary Space Partitioning tree
- `src/history.ts` - Undo/redo functionality
- `src/filemanager.ts` - File operations
- `src/types.ts` - TypeScript type definitions
- `server.py` - Python API server for file operations

## Panel Features

- Drag headers to rearrange panels
- Pin/unpin panels
- Collapse/expand panels
- Unlimited panel splits
- Undo/redo support (Ctrl+Z/Y)
- Markdown content editing (double-click panel body)

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run typecheck` - Run TypeScript type checking

## API Endpoints (Python Server)

- `GET /api/files` - List files in directory
- `GET /api/file` - Read file contents
- `PUT /api/file` - Write file contents
- `GET /api/metadata` - Get file metadata