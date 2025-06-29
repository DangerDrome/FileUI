# MediaUI

A sleek, modern, and mobile-friendly generic user interface inspired by VSCode. Built with pure Vanilla JavaScript, CSS, and HTML, MediaUI serves as a versatile template for creating a wide range of applications, a robust starter kit for new projects, or a comprehensive style guide.

<!-- It's highly recommended to add a screenshot or GIF of your project in action! -->
![Screenshot of MediaUI](./path/to/screenshot.png)

## ✨ Features

-   **VSCode-Inspired Design:** A familiar and intuitive layout that users love.
-   **Pure Vanilla Stack:** No frameworks, no dependencies. Just lightweight and fast HTML, CSS, and JavaScript.
-   **Mobile-First & Responsive:** Looks and works great on all devices, from desktops to smartphones.
-   **Component-Based:** A rich set of pre-built components to kickstart your development.
-   **Easily Customizable:** Use CSS variables to easily theme and style the UI to match your brand.
-   **Lightweight:** Minimal footprint for fast loading times.

## 🚀 Getting Started

To get started with MediaUI, simply clone the repository and open the `index.html` file in your browser.

```bash
# Clone the repository
git clone https://github.com/your-username/MediaUI.git

# Navigate to the project directory
cd MediaUI

# Open index.html in your default browser
# On macOS:
open index.html
# On Windows:
start index.html
# On Linux:
xdg-open index.html
```

## 🛠️ Usage

MediaUI is designed to be straightforward. The main structure is typically composed of a header, a main content area with panels, and a footer.

Here is a basic example of an HTML structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My App with MediaUI</title>
    <!-- Link to MediaUI's CSS -->
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header class="main-header"><!-- Header content --></header>

    <main class="main-content">
        <div class="panel left-panel"><!-- File tree or other navigation --></div>
        <div class="panel main-panel">
            <div class="tabs"><!-- Tab items --></div>
            <div class="editor-content"><!-- Main content --></div>
            <div class="terminal"><!-- Terminal component --></div>
        </div>
    </main>

    <footer class="main-footer"><!-- Footer content like status bar --></footer>

    <!-- Link to MediaUI's JavaScript -->
    <script src="js/main.js"></script>
</body>
</html>
```
*Note: The class names and structure above are illustrative. Please refer to the source code for the actual implementation.*

## 🧩 Components

MediaUI comes with a variety of ready-to-use components built with Vanilla JS:

-   **Resizable Panels:** Draggable splitter for flexible side-by-side layouts.
-   **Split Panels:** Create vertical or horizontal splits within the editor area for multi-pane layouts.
-   **Tabbed Interface:** A standard tabbing system for managing different views.
-   **Interactive Terminal:** A simulated terminal that processes basic commands.
-   **Modal Dialogs:** An accessible modal component for focused user interaction.
-   **Headers & Footers:** Customizable top and bottom bars.
-   **File Tree:** A collapsible tree view for navigating files and folders.
-   **UI Controls:** A set of pre-styled buttons and inputs.

## 🎨 Customization & Theming

Customizing the look and feel is simple thanks to CSS Custom Properties (Variables). You can find and override the default theme variables in the main CSS file (e.g., `css/style.css`).

## 📦 Icons

This project uses Lucide Icons, a beautiful and consistent open-source icon set.

## 🤝 Contributing

Contributions are welcome! Please feel free to fork the repository, make changes, and open a pull request.

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
