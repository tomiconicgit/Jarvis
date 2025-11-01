// File: main.js

import { Debugger } from './debugger.js';
import { loadUIPanels } from './ui/ui-loader.js';
// Import 'scene' and 'orbitControls' directly from scene-manager
import { initScene, animate, scene, camera, renderer, orbitControls } from './core/scene-manager.js';
import { initGlobalUI, initPanelToggles, showTempMessage } from './ui/ui-panels.js';
import { initAddPanel } from './ui/add-panel-manager.js';
import { initFilePanel } from './ui/file-panel-manager.js';
import { initScenePanel } from './ui/scene-panel-manager.js';
import { initParentPanel } from './ui/parent-panel-manager.js';
import { initToolsPanel } from './ui/tools-panel-manager.js';
import { initDecimatePanel } from './ui/decimate-panel-manager.js';
// --- ADD THIS IMPORT ---
import { initGizmo } from './core/gizmo-manager.js'; 

async function main() {
  try {
    Debugger.report('main() started', 'Application main function running.', 'main.js');

    // 1. Fetch and inject all HTML templates
    await loadUIPanels();
    Debugger.report('UI Panels Loaded', 'All HTML templates injected.', 'main.js');

    // 2. All HTML is loaded, now we can find buttons
    // and initialize the 3D scene.
    initScene();
    Debugger.report('Scene Initialized', 'Three.js scene, camera, and renderer are ready.', 'main.js');
    
    // --- ADD THIS CALL ---
    // Pass the necessary components to the gizmo manager
    initGizmo(camera, renderer.domElement, scene, orbitControls);
    Debugger.report('Gizmo Initialized', 'TransformControls attached to gizmo-manager.', 'main.js');
    
    // 3. Initialize all our UI logic modules
    initGlobalUI(); // For message box, close-props-panel
    initPanelToggles(); // For File, Add, Scene, Parent buttons
    initToolsPanel(); // --- NEW
    initAddPanel();
    initFilePanel();
    initScenePanel();
    initParentPanel();
    initDecimatePanel(); // --- NEW
    Debugger.report('UI Modules Initialized', 'All panel managers are attached.', 'main.js');


    // 4. Start the render loop
    animate();
    
    // 5. Hide loading screen
    const ls = document.getElementById('loading-screen');
    if (ls) { ls.style.opacity = '0'; setTimeout(() => (ls.style.display = 'none'), 500); }
    Debugger.report('App Initialized Successfully', 'Render loop started.', 'main.js');

  } catch (err) {
    console.error('Failed to initialize app:', err); // Debugger.js will catch this
    const ls = document.getElementById('loading-screen');
    if (ls) {
      ls.innerHTML = `<div>Error: ${err.message}<br>Check console.</div>`;
    }
  }
}

// ... (rest of main.js) ...

// Start the app
main();
