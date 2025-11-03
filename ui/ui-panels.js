File: ui/ui-panels.js
--------------------------------------------------------------------------------
// File: ui/ui-panels.js
import { deselectAll } from '../core/scene-manager.js';

let activePanel = null;

export function showPanel(p) {
  if (!p) return;
  p.style.visibility = 'visible';
  p.style.opacity = '1';
  p.style.transform = 'translateY(0) translateX(0)'; // Handle both bottom sheet and left drawer
  activePanel = p;
}

export function hidePanel(p) {
  if (!p) return;
  p.style.opacity = '0';
  if (p.classList.contains('left-drawer')) {
    p.style.transform = 'translateX(-120%)';
  } else {
    p.style.transform = 'translateY(100%)';
  }
  setTimeout(() => (p.style.visibility = 'hidden'), 240);
  if (activePanel === p) {
    activePanel = null;
  }
}

export function togglePanel(p) {
  if (!p) return;
  if (p === activePanel) {
    hidePanel(p);
  } else {
    if (activePanel) {
      hidePanel(activePanel);
    }
    showPanel(p);
  }
}

export function showTempMessage(text) {
  const box = document.getElementById('message-box');
  document.getElementById('message-text').textContent = text;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 1500);
}

// Initialize listeners for main toolbar buttons
export function initPanelToggles() {
  document.getElementById('file-btn').addEventListener('click', () => {
    togglePanel(document.getElementById('file-panel'));
  });
  
  // --- *** OVERHAUL CHANGE *** ---
  // The "Add" button now directly triggers the GLB import picker
  document.getElementById('add-btn').addEventListener('click', () => {
    if (activePanel) hidePanel(activePanel); // Close any open panel
    document.getElementById('picker-import-glb').click();
  });
  // --- *** END OVERHAUL CHANGE *** ---
  
  document.getElementById('scene-btn').addEventListener('click', () => {
    togglePanel(document.getElementById('scene-panel'));
  });
  document.getElementById('tools-btn').addEventListener('click', () => {
    togglePanel(document.getElementById('tools-panel'));
  });
}

// Initialize global UI listeners (like closing props panel)
export function initGlobalUI() {
  document.getElementById('close-props-panel').addEventListener('click', () => {
    deselectAll();
  });
}
