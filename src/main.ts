// Main entry point for FileUI v005
import './style.css';
import { PanelManager } from './panel-manager';

// Initialize the application when DOM is ready
function initApp() {
  const container = document.getElementById('panel-container');
  if (!container) {
    console.error('Panel container not found');
    return;
  }

  // Create and initialize the panel manager
  const panelManager = new PanelManager(container);
  
  // Make panel manager available globally for debugging
  (window as any).panelManager = panelManager;
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}