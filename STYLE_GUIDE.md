# FileUI Style Guide

## Overview
This style guide is based on the excellent v003 implementation and should be used for all FileUI versions. All icons should use **Lucide Icons**.

## Color Palette

### Dark Theme (Primary)
```css
/* Core Background Colors */
--bg-primary: #0a0a0a;        /* Main background - deep black */
--bg-secondary: #141414;      /* Secondary surfaces */
--bg-tertiary: #1a1a1a;       /* Tertiary surfaces */
--panel-bg: #0f0f0f;          /* Panel backgrounds */
--panel-bg-unpinned: #353535; /* Unpinned panels - lighter */

/* Text Colors */
--text-color: #ecf0f1;        /* Primary text - bright white */
--text-secondary: #a0a0a0;    /* Secondary text */
--text-muted: #666;           /* Muted text */
--color-text-muted: #8a8a8a;  /* Alternative muted */
--color-text-extra-muted: #6a6a6a; /* Extra muted */

/* Border & Dividers */
--border-color: #2a2a2a;      /* Standard borders */
--border-hover: #3a3a3a;      /* Hover state borders */
--border-subtle: #333;        /* Subtle borders */

/* Interactive Elements */
--accent-color: #0a84ff;      /* Primary accent - bright blue */
--accent-hover: #357abd;      /* Accent hover */
--accent-color-rgb: 10, 132, 255; /* For transparency */
--accent-color-translucent: rgba(10, 132, 255, 0.2);

/* Button States */
--button-bg: rgba(255, 255, 255, 0.05);
--button-hover-bg: rgba(255, 255, 255, 0.1);
--button-disabled-bg: #3a3a3c;
--button-disabled-text: #7a7a7e;

/* Status Colors */
--danger-color: #ff4a4a;
--danger-hover: #cc3a3a;
--success-color: #4aff4a;

/* Shadows & Effects */
--panel-shadow: 0 4px 16px rgba(0,0,0,0.2);
--shadow-color: rgba(0, 0, 0, 0.5);
```

## Typography

### Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
--font-mono: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
```

### Font Sizes
```css
--body-font-size: 14px;
--font-size-xs: 11px;
--font-size-sm: 12px;
--font-size-md: 13px;
--font-size-lg: 16px;
--font-size-xl: 18px;
```

### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

## Spacing System

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 24px;
```

## Component Styles

### Panels

#### Base Panel
```css
.panel {
    position: absolute;
    display: flex;
    flex-direction: column;
    background-color: var(--panel-bg-unpinned);
    border-radius: 8px;
    box-shadow: var(--panel-shadow);
    border: 1px solid var(--panel-bg);
    overflow: hidden;
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### Panel Header
```css
.panel-header {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    background-color: transparent;
    cursor: grab;
    height: 30px;
    gap: 8px;
}
```

#### Pinned State
```css
.panel.is-pinned {
    background-color: var(--color-background-pinned);
}
```

### Buttons

#### Primary Button
```css
.btn {
    padding: 6px 10px;
    background: var(--button-bg);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s ease;
}

.btn:hover:not(:disabled) {
    background: var(--button-hover-bg);
    transform: translateY(-1px);
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--button-disabled-bg);
    color: var(--button-disabled-text);
}
```

#### Icon Button
```css
.icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    padding: 3px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s, color 0.2s;
}

.icon-btn:hover {
    background-color: var(--color-background-hover);
    color: var(--color-text);
}
```

### Menus

#### Menu Item
```css
.menu-item {
    padding: 4px 12px;
    color: var(--color-text);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    border-radius: 4px;
    transition: background-color 0.15s ease;
}

.menu-item:hover {
    background-color: var(--button-hover-bg);
}

.menu-item:active {
    background-color: var(--color-accent);
    color: var(--color-background);
}
```

#### Dropdown Menu
```css
.dropdown-menu {
    background: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    min-width: 180px;
    padding: 4px 0;
}
```

### Resizers
```css
.resizer {
    background-color: transparent;
    transition: background-color 150ms ease;
}

.resizer:hover {
    background-color: var(--resizer-hover);
}
```

### Scrollbars
```css
::-webkit-scrollbar {
    width: 10px;
}

::-webkit-scrollbar-track {
    background-color: transparent;
}

::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    border: 2px solid transparent;
    border-radius: 5px;
    background-color: transparent;
    transition: background-color 0.2s ease-in-out;
}

/* Show on hover */
.panel:hover ::-webkit-scrollbar-thumb {
    background-color: var(--color-border);
}

::-webkit-scrollbar-thumb:hover {
    background-color: var(--color-text-muted);
}
```

## Animations

### Standard Transitions
```css
/* Fast transitions for hover states */
transition: all 0.15s ease;

/* Medium transitions for state changes */
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);

/* Smooth transitions for layout changes */
transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

### Panel Animations
```css
@keyframes panelGrowIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

@keyframes panelSlideIn {
    from { transform: translateX(-30px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes panelFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

## Icons (Lucide Icons)

### Common Icons
- **Files**: `files`, `file`, `file-plus`, `folder`, `folder-plus`
- **Actions**: `plus`, `x`, `trash-2`, `save`, `download`, `upload`
- **UI Controls**: `chevron-down`, `chevron-right`, `menu`, `more-vertical`
- **Panels**: `columns`, `rows`, `maximize-2`, `minimize-2`, `move`
- **Pin States**: `pin`, `pin-off`
- **Sidebar**: `sidebar-close`, `sidebar-open`
- **Terminal**: `terminal`, `terminal-square`
- **Settings**: `settings`, `settings-2`

### Icon Sizing
```css
/* Small icons (buttons) */
.icon-sm { width: 14px; height: 14px; }

/* Medium icons (default) */
.icon-md { width: 16px; height: 16px; }

/* Large icons */
.icon-lg { width: 20px; height: 20px; }
```

## Layout Principles

1. **Dark-First Design**: Deep blacks (#0a0a0a) with subtle gradients
2. **Subtle Borders**: Use #2a2a2a for divisions, lighter on hover
3. **Depth via Shadows**: Use `box-shadow` instead of heavy borders
4. **Smooth Transitions**: 150-300ms for all interactive elements
5. **Hover Feedback**: Slight background lightening + transform for buttons

## Best Practices

1. **Always use CSS variables** for colors and spacing
2. **Use Lucide icons** exclusively for consistency
3. **Maintain contrast ratios** of at least 4.5:1 for text
4. **Add hover states** to all interactive elements
5. **Use `cubic-bezier(0.4, 0, 0.2, 1)` for smooth animations
6. **Keep border-radius consistent**: 4px for small, 6px for medium, 8px for large
7. **Layer backgrounds**: Primary → Secondary → Tertiary for depth
8. **Pin functionality**: Pinned panels should have darker backgrounds

## Accessibility

- Focus indicators: 2px solid outline with 2px offset
- Keyboard navigation: All interactive elements must be keyboard accessible
- ARIA labels: Required for icon-only buttons
- Color contrast: Maintain WCAG AA standards minimum

## Example Implementation

```html
<!-- Button with Lucide icon -->
<button class="btn">
    <i data-lucide="save"></i>
    <span>Save</span>
</button>

<!-- Icon-only button -->
<button class="icon-btn" aria-label="Settings">
    <i data-lucide="settings"></i>
</button>

<!-- Panel structure -->
<div class="panel">
    <header class="panel-header">
        <h3 class="panel-title">Panel Title</h3>
        <div class="panel-actions">
            <button class="icon-btn" data-action="pin">
                <i data-lucide="pin"></i>
            </button>
            <button class="icon-btn" data-action="close">
                <i data-lucide="x"></i>
            </button>
        </div>
    </header>
    <div class="panel-content">
        <!-- Content here -->
    </div>
</div>
```