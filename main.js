File: main.js
--------------------------------------------------------------------------------
// File: main.js
import { Debugger } from './debugger.js';
import { loadUIPanels } from './ui/ui-loader.js';
// --- Import scene logic AND callbacks ---
import { 
  initScene, 
  animate,
  setOnSelect,
  setOnDeselect,
  setShowMessage
} from './core/scene-manager.js';
// --- Import UI functions ---
import { 
  initGlobalUI, 
  initPanelToggles, 
  showTempMessage,
  showPanel,
  hidePanel
} from './ui/ui-panels.js';
import { updatePropsPanel } from './ui/props-panel.js'; // <-- NEW IMPORT
import { initFilePanel } from './ui/file-panel-manager.js';
import { initScenePanel } from './ui/scene-panel-manager.js';
import { initParentPanel } from './ui/parent-panel-manager.js';
import { initToolsPanel } from './ui/tools-panel-manager.js';
import { initDecimatePanel } from './ui/decimate-panel-manager.js';

async function main() {
  try {
    Debugger.report('main() started', 'Application main function running.', 'main.js');

    await loadUIPanels();
    Debugger.report('UI Panels Loaded', 'All HTML templates injected.', 'main.js');

    initScene();
    Debugger.report('Scene Initialized', 'Three.js scene, camera, and renderer are ready.', 'main.js');
    
    // 3. Initialize all our UI logic modules
    initGlobalUI(); 
    initPanelToggles(); 
    initToolsPanel(); 
    initFilePanel();
    initScenePanel();
    initParentPanel();
    initDecimatePanel(); 
    Debugger.report('UI Modules Initialized', 'All panel managers are attached.', 'main.js');

    // --- *** NEW: WIRE UP SCENE AND UI *** ---
    // This connects the scene events to the UI functions
    setOnSelect((obj) => {
      updatePropsPanel(obj);
      const props = document.getElementById('props-panel');
      if (props) showPanel(props);
      
      // Hide all other panels
      [
        'scene-panel',
        'tools-panel',
        'parent-panel',
        'decimate-panel',
        'file-panel',
        'export-panel'
      ].forEach(id => { 
          const el = document.getElementById(id); 
          el && hidePanel && hidePanel(el); 
      });
    });
    
    setOnDeselect(() => {
        const props = document.getElementById('props-panel');
        props && hidePanel && hidePanel(props);
    });
    
    setShowMessage((msg) => {
        showTempMessage(msg);
    });
    // --- *** END NEW SECTION *** ---

    // 4. Start the render loop
    animate();
    
    // 5. Hide loading screen
    const ls = document.getElementById('loading-screen');
    if (ls) { ls.style.opacity = '0'; setTimeout(() => (ls.style.display = 'none'), 500); }
    Debugger.report('App Initialized Successfully', 'Render loop started.', 'main.js');

  } catch (err) {
    console.error('Failed to initialize app:', err);
    const ls = document.getElementById('loading-screen');
    if (ls) {
      ls.innerHTML = `<div>Error: ${err.message}<br>Check console.</div>`;
    }
  }
}

// --- Error handling (unchanged) ---
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
// --- End Error handling ---

main();
