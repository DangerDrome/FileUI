// Default layout configuration for FileUI v005
// Simple fixed layout - no BSP tree

export const FIXED_PANELS = [
  {
    id: "header-panel",
    title: "Header",
    isToolbar: true
  },
  {
    id: "left-toolbar", 
    title: "Left Toolbar",
    isToolbar: true
  },
  {
    id: "footer-panel",
    title: "Terminal", 
    isToolbar: true
  },
  {
    id: "properties-panel",
    title: "Properties", 
    isToolbar: true
  },
  {
    id: "main-panel",
    title: "Main",
    isToolbar: false
  }
];

export const DEFAULT_MARKDOWN_CONTENT: Record<string, string> = {};