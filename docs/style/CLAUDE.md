# FileUI Style Guide Configuration

## Claude Development Rules for Style Guide

When working on the style guide, follow these 7 rules:

1. **First think through the problem** - Read the existing styles and components, and write a plan to ../plans/tasks.md
2. **Create actionable todo items** - The plan should have a list of todo items that you can check off as you complete them
3. **Verify the plan** - Before beginning work, check in with the user to verify the plan
4. **Work systematically** - Begin working on the todo items, marking them as complete as you go
5. **Communicate clearly** - Every step of the way, give a high level explanation of what changes you made
6. **Keep it simple** - Make every style change as simple as possible. Avoid massive CSS refactors. Every change should be minimal and focused. Maintain existing design patterns.
7. **Document your work** - Add a review section to the ../plans/tasks.md file with a summary of the changes made and any design decisions

## Current Design System (Pastel Theme)

### Design Principles
- **No borders/strokes** - All visual differentiation through background colors
- **Pastel color palette** - Soft, friendly colors throughout
- **Dark mode by default** - Starts in dark mode with muted pastels
- **Modern typography** - System font stack for performance
- **Clean aesthetics** - Minimal, sleek design with no gradients

### Color System

#### Light Mode Pastels
- Primary accent: `#b2dfdb` (pastel mint)
- Secondary colors:
  - Pink: `#ffc0cb`
  - Peach: `#ffd4a3`
  - Yellow: `#ffee90`
  - Sky: `#b3e5fc`
  - Lavender: `#e1bee7`
  - Coral: `#ffcdd2`
  - Sage: `#c8e6c9`

#### Dark Mode Pastels (Muted)
- Primary accent: `#a8d8ea` (pastel blue)
- Background hierarchy:
  - Primary: `#1a1a1a`
  - Secondary: `#242424`
  - Tertiary: `#2e2e2e`
- Muted pastels for dark mode visibility

### Component Styles

#### Buttons
- **All buttons have dark text** for legibility
- Background colors for differentiation:
  - Default: `bg-tertiary` (light mode) / `#3a3a3a` (dark mode)
  - Hover: Changes to accent color
  - Primary: Accent background
  - Disabled: Reduced opacity with darker background
- No borders, subtle hover animations

#### Cards & Panels
- Background color hierarchy for depth
- No borders or strokes
- Hover effects through background color changes
- Navigation panel: `bg-secondary`
- Controls panel: `bg-secondary`
- Panel headers: `bg-tertiary`

#### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`
- Monospace: `'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono'`
- Dark gray text on buttons for contrast

### Layout
- Fixed navigation panel (400px left)
- Fixed controls panel (320px right)
- Responsive with collapsible panels on mobile
- Clean spacing system using CSS custom properties

### Interactive Features
- Dark mode toggle (starts dark)
- Font family switcher
- Layout density controls
- Smooth animations and transitions

## Implementation Notes
- Uses Lucide icons throughout
- CSS custom properties for theming
- JavaScript for interactive controls
- Mobile-responsive design
- No jQuery or heavy frameworks