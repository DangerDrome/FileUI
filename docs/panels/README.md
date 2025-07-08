# BSP Panels System

A production-ready Binary Space Partitioning (BSP) panel system that combines v003's powerful functionality with the polished design from the FileUI style guide.

## Features

### Core Functionality
- **BSP Tree Algorithm**: Efficient binary space partitioning for unlimited panel splits
- **Drag & Drop**: Intuitive panel rearrangement with preview mode
- **Resize Panels**: Drag borders between panels to adjust sizes
- **Panel States**: Pin, collapse, and toolbar modes for each panel
- **Undo/Redo**: Full history management with keyboard shortcuts (Ctrl+Z/Y)
- **Save/Load Layouts**: Export and import panel configurations as JSON

### UI Features
- **Theme Support**: Light and dark themes with smooth transitions
- **Responsive Design**: Adapts to different screen sizes
- **Context Menus**: Right-click panels for quick actions
- **Inline Editing**: Double-click panel titles to rename
- **Alignment Guides**: Visual helpers when dragging panels
- **Smooth Animations**: Polished transitions for all interactions

## Usage

### Getting Started
1. Open `index.html` in a web browser
2. The demo modal will explain basic features on first visit
3. Start with 3 default panels that you can split, move, and customize

### Panel Operations
- **Split Panel**: Right-click → Split Horizontal/Vertical
- **Move Panel**: Drag the panel header to a new location
- **Resize Panel**: Drag the borders between panels
- **Pin Panel**: Click pin icon or right-click → Pin Panel
- **Collapse Panel**: Click collapse icon or right-click → Collapse
- **Close Panel**: Right-click → Close Panel

### Keyboard Shortcuts
- `Ctrl+Z`: Undo last action
- `Ctrl+Y` or `Ctrl+Shift+Z`: Redo action

### Layout Management
- **Save Layout**: Click save icon in header to export current layout
- **Load Layout**: Click load icon and select a JSON file
- **Reset Layout**: Click reset icon to restore default 3-panel layout

## Implementation Details

### File Structure
```
/docs/panels/
├── index.html    # Main demo page with UI structure
├── panels.js     # Core BSP panel system logic
└── panels.css    # Panel-specific styles
```

### Key Classes
- `BSPNode`: Binary tree node representing panels and splits
- `PanelManager`: Main controller for the panel system
- `HistoryManager`: Handles undo/redo functionality
- `EventEmitter`: Simple pub/sub for component communication

### Configuration
Edit the `CONFIG` object in `panels.js` to customize:
- `RESIZER_THICKNESS`: Width of resize handles (default: 5px)
- `PANEL_MIN_HEIGHT`: Minimum panel height (default: 40px)
- `PANEL_MIN_WIDTH`: Minimum panel width (default: 150px)
- `COLLAPSED_SIZE`: Size of collapsed panels (default: 30px)
- `HISTORY_LIMIT`: Maximum undo/redo states (default: 50)

## Integration

To integrate into your project:

1. Include required dependencies:
```html
<!-- Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- Style Guide -->
<link rel="stylesheet" href="../style/styles.css">
<link rel="stylesheet" href="panels.css">

<!-- Icons -->
<script src="https://unpkg.com/lucide@latest"></script>

<!-- Scripts -->
<script src="../style/styles.js"></script>
<script src="panels.js" defer></script>
```

2. Create container structure:
```html
<div class="panels-container" id="panels-container"></div>
```

3. Initialize panel manager:
```javascript
const container = document.getElementById('panels-container');
const panelManager = new PanelManager(container);
panelManager.init();
```

## Browser Support
- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Requires ES6+ support

## Future Enhancements
- Panel communication system for data exchange
- Preset layout templates
- Keyboard navigation between panels
- Panel search and filtering
- Custom panel content types
- Touch gesture support for mobile devices