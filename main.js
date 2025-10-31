// File: main.js (NEW)
import { loadUIPanels } from './ui/ui-loader.js';
import { initScene, animate } from './core/scene-manager.js';
import { initAddPanel } from './ui/add-panel-manager.js';
// import { initFilePanel } from './ui/file-panel-manager.js';
// import { initScenePanel } from './ui/scene-panel-manager.js';
// import { initParentPanel } from './ui/parent-panel-manager.js';

async function main() {
  // 1. Fetch and inject all HTML templates
  await loadUIPanels();

  // 2. All HTML is loaded, now we can find buttons
  // and initialize the 3D scene.
  initScene();
  
  // 3. Initialize all our UI logic modules
  initAddPanel();
  // initFilePanel();
  // initScenePanel();
  // initParentPanel();
  // (You'll create these by splitting up your old initUI())

  // 4. Start the render loop
  animate();
  
  // Hide loading screen
  const ls = document.getElementById('loading-screen');
  if (ls) { ls.style.opacity = '0'; ls.style.display = 'none'; }
}

// Handle global errors
window.addEventListener('error', (e) => { /* ... */ });
window.addEventListener('unhandledrejection', (e) => { /* ... */ });

// Start the app
main();
