# FileUI v005 - Task List

## Phase 1: Core Foundation (HIGH PRIORITY)
Get basic VFX file browsing working with v003's panel system.

- [ ] **Create v005 directory structure**
  - Create `/home/danger/Documents/GitHub/FileUI/v005/` folder
  
- [ ] **Copy v003 files**
  - `cp v003/panels3.html v005/index.html`
  - `cp v003/panels3.js v005/panels.js`
  - `cp v003/panels3.css v005/style.css`
  
- [ ] **Update CSS with VFX file type colors**
  - 3D files = Pink (#f7b2ad)
  - Comp files = Blue (#7ec4cf)
  - Image files = Yellow (#ffe066)
  - Video files = Purple (#c3aed6)
  
- [ ] **Create server.py with file listing and metadata extraction**
  - `/api/files` endpoint for directory listing
  - `/api/file` endpoint for file preview
  - Basic metadata extraction (size, modified date, type)
  
- [ ] **Create filemanager.js for browsing VFX files**
  - File type detection (.blend, .ma, .nk, .exr, etc.)
  - Directory navigation
  - File selection handling
  
- [ ] **Replace markdown panels with VFX panels**
  - File browser panel (left sidebar)
  - Viewer panel (main area)
  - Metadata panel (right sidebar)
  
- [ ] **Test basic file browsing and metadata display**
  - Verify file listing works
  - Check metadata extraction
  - Ensure panels display correctly

## Phase 2: Viewers & Preview (MEDIUM PRIORITY)
Add actual preview capabilities for VFX files.

- [ ] **Add image viewer for EXR/DPX files**
  - Canvas-based viewer
  - Basic zoom/pan controls
  - Handle high bit depth images
  
- [ ] **Add video player with frame stepping**
  - HTML5 video element
  - Frame-by-frame controls
  - Timecode display
  
- [ ] **Add thumbnail generation**
  - Generate previews for file browser
  - Cache thumbnails
  - Fallback icons for unsupported types

## Phase 3: Multi-Platform Support (MEDIUM PRIORITY)
Make it work everywhere.

- [ ] **Add browser-only mode with File System Access API**
  - File picker integration
  - Local file preview without server
  - Toggle between server/browser mode
  
- [ ] **Create Cloudflare Worker for R2 storage**
  - Browse files in R2 buckets
  - Generate signed URLs for preview
  - Metadata caching in KV

## Phase 4: Advanced Operations (LOW PRIORITY)
Power user features.

- [ ] **Add batch rename for image sequences**
  - Detect sequences (name.####.ext)
  - Rename with padding preservation
  - Preview before applying
  
- [ ] **Add image sequence detection and grouping**
  - Group sequences as single items
  - Show frame range
  - Expand/collapse sequences

## Phase 5: Polish (LOW PRIORITY)
Nice-to-have features.

- [ ] **Add keyboard shortcuts for navigation**
  - Arrow keys for file navigation
  - Enter to open
  - Shortcuts for view modes
  
- [ ] **Add drag & drop file import**
  - Drop files to upload
  - Drop folders for batch import
  - Progress indicators

## Success Metrics
- **Phase 1 Complete**: Can browse VFX files and see metadata in panels
- **Phase 2 Complete**: Can preview images and play videos
- **Phase 3 Complete**: Works on Cloudflare and in browser-only mode
- **Phase 4 Complete**: Can handle image sequences professionally
- **Phase 5 Complete**: Feels like a polished VFX tool

## Notes
- ALWAYS use v003 as the base (NOT v004)
- Preserve all v003 panel features (drag, drop, pin, collapse, undo/redo)
- Use main version's color scheme (#00cc8b teal accent)
- Focus on VFX workflows, not code editing