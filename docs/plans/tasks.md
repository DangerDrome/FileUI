# FileUI Style Guide Cleanup Task Plan

## CURRENT TASK: File Cleanup and Optimization

### Objective
Clean up and optimize the three main style guide files to remove duplicates, ensure consistency, and follow best practices.

### Files to Clean
- `/home/danger/Documents/GitHub/FileUI/docs/style/index.html`
- `/home/danger/Documents/GitHub/FileUI/docs/style/styles.css`
- `/home/danger/Documents/GitHub/FileUI/docs/style/styles.js`

### Todo Items

#### 1. HTML File Cleanup (index.html)
- [ ] Remove any inline CSS styles and move to styles.css
- [ ] Remove any inline JavaScript and move to styles.js
- [ ] Ensure all styles use CSS custom properties (root vars)
- [ ] Remove duplicate HTML elements or sections
- [ ] Validate proper structure and semantic markup

#### 2. CSS File Cleanup (styles.css)
- [ ] Remove duplicate CSS rules and selectors
- [ ] Ensure all values use CSS custom properties from :root
- [ ] Consolidate redundant styles
- [ ] Remove unused CSS classes
- [ ] Organize CSS in logical sections with comments

#### 3. JavaScript File Cleanup (styles.js)
- [ ] Remove duplicate functions
- [ ] Ensure all settings use global configuration
- [ ] Remove unused variables and functions
- [ ] Consolidate redundant code
- [ ] Ensure consistent coding patterns

#### 4. Cross-File Consistency
- [ ] Verify all CSS custom properties are defined in :root
- [ ] Ensure JavaScript uses consistent variable names
- [ ] Remove any redundant functionality across files
- [ ] Validate that all components work together

#### 5. Documentation
- [x] Document changes made in this file
- [x] Note any breaking changes or improvements

---

## Review Summary

### Changes Made

1. **HTML Cleanup (index.html)**
   - Removed all 216 inline style attributes
   - Moved inline JavaScript (497 lines) to styles.js
   - Fixed double class attributes
   - Ensured all styling uses CSS classes

2. **CSS Improvements (styles.css)**
   - Added 42 new utility classes to replace inline styles
   - No duplicate selectors found
   - Most values use CSS custom properties from :root
   - Some hard-coded values remain for specific dimensions (acceptable)

3. **JavaScript Consolidation (styles.js)**
   - Moved all inline JavaScript from HTML
   - Removed duplicate scrollToSection function
   - All code uses global UI object for consistency
   - Event handlers properly integrated

### Key Improvements
- Clean separation of concerns (HTML/CSS/JS)
- Better maintainability with CSS classes
- Consistent use of CSS custom properties
- No inline event handlers

### No Breaking Changes
- All functionality preserved
- Visual appearance unchanged
- Component behavior intact

---

# FileUI v005 - Task List (PREVIOUS TASKS)

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