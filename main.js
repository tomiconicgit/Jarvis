// File: main.js
import { loadUIPanels } from './ui/ui-loader.js';
import { initScene, animate } from './core/scene-manager.js';
import { initGlobalUI, initPanelToggles, showTempMessage } from './ui/ui-panels.js'; // Import showTempMessage
import { initAddPanel } from './ui/add-panel-manager.js';
import { initFilePanel } from './ui/file-panel-manager.js';
import { initScenePanel } from './ui/scene-panel-manager.js';
import { initParentPanel } from './ui/parent-panel-manager.js';
import { initMergePanel } from './ui/merge-panel-manager.js'; // IMPORTED

async function main() {
  try {
    // 1. Fetch and inject all HTML templates
    await loadUIPanels();

    // 2. All HTML is loaded, now we can find buttons
    // and initialize the 3D scene.
    initScene();
    
    // 3. Initialize all our UI logic modules
    initGlobalUI(); // For message box, close-props-panel
    initPanelToggles(); // For File, Add, Scene, Parent buttons
    initAddPanel();
    initFilePanel();
    initScenePanel();
    initParentPanel();
    initMergePanel(); // INITIALIZED

    // 4. Start the render loop
    animate();
    
    // 5. Hide loading screen
    const ls = document.getElementById('loading-screen');
    if (ls) { ls.style.opacity = '0'; setTimeout(() => (ls.style.display = 'none'), 500); }

  } catch (err) {
    console.error('Failed to initialize app:', err);
    const ls = document.getElementById('loading-screen');
    if (ls) {
      ls.innerHTML = `<div>Error: ${err.message}<br>Check console.</div>`;
    }
  }
}

// ... error handling ...

// Start the app
main();
