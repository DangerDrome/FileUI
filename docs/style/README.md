# FileUI Style Guide

This directory contains **all client-side assets** that power the FileUI design-system demo (style-guide).

## High-level layout

```
style/
├── css/         — Atomic & component stylesheets (no duplicates)
├── components/  — Vanilla-JS UI building blocks (IIFE, attach to `UI.*`)
├── sections/    — Content generators that populate the demo page
├── panels/      — Header / nav / settings logic for the live demo shell
└── index.html   — Self-contained style-guide entry point
```

### 1. `css/`  – fully modular styles
* **Foundations**: `variables.css`, `base.css`, `typography.css`, `animations.css`  
  Define design-tokens, resets, keyframes.
* **Components**: one file per part (`button.css`, `card.css`, `panel.css`, …).  
  No cross-file duplication.
* **Utilities / layout**: `grid.css`, `scrollbars.css`, `mobile.css`, `patterns.css`, etc.

> Tip: import any subset in any order; component sheets rely only on the variables file.

### 2. `components/` – reusable JS widgets
Each file is an IIFE that attaches a single factory to the global `UI` namespace (e.g. `UI.button`, `UI.toast`).  No DOM work happens automatically; functions return elements so consumers decide placement.

Shared helpers (`UI.buildClasses`, `UI.icons`, `UI.deferIcons`, config constants) live in `components/core.js`.

### 3. `sections/` – demo generators
Files under `sections/` create `<section>` elements that showcase a component group (buttons, cards, grid …). They import only the public `UI.*` factories—no side effects outside the demo container.

### 4. `panels/` – demo chrome
JavaScript that controls the left nav, header, right settings panel, and footer quick-settings. These are purely for the style-guide shell and are **not** part of the production library.

### 5. `index.html`
A static file referencing everything above *with relative paths* (no build step required). Open directly via `file://` or serve with any static server.

## Developing / extending
1. Add new tokens → `css/variables.css`
2. Build a component
   * CSS in `css/<component>.css`
   * JS factory in `components/<component>.js` returning an element
3. Showcase it
   * Create `sections/<component>s.js` that calls the factory and appends a demo panel.
4. Reference new files in `index.html` (keep alphabetical order).

## Build / production use
The design system is split deliberately—include only what you need:
```html
<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/button.css">
<script src="components/core.js"></script>
<script src="components/button.js"></script>
```
No compilation required; all JS is ES6-compatible and executes under an IIFE to avoid globals.

---
Questions or contributions? open an issue on the main repository. 