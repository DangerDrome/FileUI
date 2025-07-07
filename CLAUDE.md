# FileUI Project Memory

## Claude Development Rules

When working on this project, follow these 7 rules:

1. **First think through the problem** - Read the codebase for relevant files and write a plan to docs/plans/tasks.md
2. **Create actionable todo items** - The plan should have a list of todo items that you can check off as you complete them
3. **Verify the plan** - Before beginning work, check in with the user to verify the plan
4. **Work systematically** - Begin working on the todo items, marking them as complete as you go
5. **Communicate clearly** - Every step of the way, give a high level explanation of what changes you made
6. **Keep it simple** - Make every task and code change as simple as possible. Avoid massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. **Document your work** - Add a review section to the docs/plans/tasks.md file with a summary of the changes made and any other relevant information

## Contribution Guidelines
- Never commit using claude as the contributor 
- commit and push to repo using my credentials
- commit = commit & push (always push after committing) 
- NEVER ADD CLAUDE AS THE FUCKING CO AUTHOR OR AUTHOR OF COMMITS!

## Project Overview
FileUI is a web-based file manager for VFX and media content creation, featuring an advanced panel system for managing various file types (.blend, .ma, .mb, .hip, .nk, .aep, .prproj, .exr, .dpx, etc.). Designed to work everywhere (locally, Cloudflare, browser-only).

## Version History & Key Learnings
- **v001/main**: Has the best color scheme - bright teal accent (#00cc8b), colorful file types
- **v003**: Has the BEST panel system - BSP tree, preview mode, drag-to-collapse, pinning, undo/redo
- **v004**: SKIP THIS - over-engineered without adding value

## v005 Development Strategy
**Formula**: v003 panels + main colors + VFX file management = v005

### Core Architecture
- Base on v003 (panels3.html/js/css) - DO NOT use v004
- Only 5 files needed: index.html, panels.js, style.css, filemanager.js, server.py
- No build process, no dependencies, no frameworks

### Technical Decisions
- **Backend**: Python for file operations and metadata extraction
- **Multi-platform**: Add browser-only mode (File System Access API) and Cloudflare support later
- **File Preview**: Different panels for different file types (image viewer, video player, 3D preview, metadata display)

### Key Features to Preserve
From v003:
- BSP panel system with unlimited splits
- Preview mode (see where panels land before dropping)
- Panel states (pin, collapse, toolbar)
- Drag-to-collapse functionality
- Alignment guides
- Full undo/redo with history
- Layout save/load

### Color Palette
```css
--accent: #00cc8b;       /* Bright teal from main */
--bg-main: #1e1e1e;      /* Dark background */
--bg-panel: #252526;     /* Panel background */

/* VFX/Media File Type Colors */
--file-3d: #f7b2ad;      /* Pink - Blender, Maya, Houdini */
--file-comp: #7ec4cf;    /* Light blue - Nuke, After Effects */
--file-image: #ffe066;   /* Yellow - EXR, DPX, PNG */
--file-video: #c3aed6;   /* Purple - MOV, MP4, ProRes */
--file-project: #b5ead7; /* Mint - Project files */
```

### Development Phases
1. **Phase 1**: Basic file browser and metadata display (copy v003, add colors, simple server)
2. **Phase 2**: File type specific viewers (image preview, video player, metadata panels)
3. **Phase 3**: Multi-platform support
4. **Phase 4**: Advanced file operations (copy, move, rename, batch operations)
5. **Phase 5**: Integration features (render farm status, asset tracking)

### Common Commands
```bash
# Start development server
python server.py

# The server runs on port 3000
# API endpoints: /api/file (GET/PUT), /api/files (GET)
```

### Important Reminders
- ALWAYS use v003 as the base, not v004
- Keep it simple - no unnecessary dependencies
- The panel system from v003 is already perfect - don't break it
- This is a FILE MANAGER for VFX/media, NOT a code editor
- Focus on file preview, metadata, and management features

### VFX File Types to Support
- **3D**: .blend, .ma, .mb, .hip, .c4d, .max, .fbx, .obj, .usd
- **Compositing**: .nk, .aep, .comp
- **Images**: .exr, .dpx, .tiff, .png, .jpg, .psd
- **Video**: .mov, .mp4, .mxf, .r3d, .ari
- **Projects**: .prproj, .drp, .fcp