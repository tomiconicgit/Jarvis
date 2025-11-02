// File: main.js
import { Debugger } from './debugger.js'; // <-- Keep the debugger
import { loadUIPanels } from './ui/ui-loader.js';
import { initScene, animate } from './core/scene-manager.js';
import { initGlobalUI, initPanelToggles, showTempMessage } from './ui/ui-panels.js';
import { initAddPanel } from './ui/add-panel-manager.js';
import { initFilePanel } from './ui/file-panel-manager.js';
import { initScenePanel } from './ui/scene-panel-manager.js';
import { initParentPanel } from './ui/parent-panel-manager.js';
import { initToolsPanel } from './ui/tools-panel-manager.js';
import { initDecimatePanel } from './ui/decimate-panel-manager.js';
// --- GIZMO-MANAGER IMPORT IS REMOVED ---

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
    
    // --- GIZMO INIT CALL IS REMOVED ---
    
    // 3. Initialize all our UI logic modules
    initGlobalUI(); 
    initPanelToggles(); 
    initToolsPanel(); 
    initAddPanel();
    initFilePanel();
    initScenePanel();
    initParentPanel();
    initDecimatePanel(); 
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

// --- FIXED: Added error handling logic ---
function handleGlobalError(msg) {
  const box = document.getElementById('message-box');
  if (box) {
    document.getElementById('message-text').textContent = msg;
    box.classList.add('show');
    setTimeout(() => box.classList.remove('show'), 3500);
  }
  const ls = document.getElementById('loading-screen');
  if (ls) { ls.style.opacity = '0'; ls.style.display = 'none'; }
}

window.addEventListener('error', (e) => {
  const msg = e?.error?.message || e.message || 'Unknown error';
  handleGlobalError(msg);
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = (e && e.reason && (e.reason.message || String(e.reason))) || 'Unhandled promise rejection';
  handleGlobalError(msg);
});
// --- End Fix ---

// Start the app
main();