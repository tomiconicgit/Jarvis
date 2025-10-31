// File: ui/add-panel-manager.js
import { OBJECT_DEFINITIONS } from '../objects/object-manifest.js';
import { scene, allModels, selectObject, assignDefaultName } from '../core/scene-manager.js';
import { hidePanel } from './ui-panels.js';
import { refreshSceneList } from './scene-panel-manager.js';

export function initAddPanel() {
  const grid = document.getElementById('add-object-grid');
  const addPanel = document.getElementById('add-panel');
  if (!grid || !addPanel) return;

  // 1. Dynamically create buttons from the manifest
  grid.innerHTML = '';
  for (const def of OBJECT_DEFINITIONS) {
    const btn = document.createElement('button');
    btn.className = "bg-gray-700 p-3 rounded-lg active:scale-90 transition-transform";
    btn.dataset.objectLabel = def.label;
    btn.innerHTML = `<span class="text-sm font-medium text-center">${def.label}</span>`;
    grid.appendChild(btn);
  }

  // 2. Add a SINGLE event listener to the grid
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-object-label]');
    if (!btn) return;

    const label = btn.dataset.objectLabel;
    const def = OBJECT_DEFINITIONS.find(d => d.label === label);
    if (!def) return;

    // 3. Add the object using the definition
    const params = def.defaultParams || {};
    const obj = new def.ctor(params);
    
    // --- FIX: Use the initialY function from the manifest ---
    if (def.initialY) {
      obj.position.y = def.initialY(params);
    }
    // --- End Fix ---

    assignDefaultName(obj);
    scene.add(obj);
    allModels.push(obj);
    
    refreshSceneList();
    selectObject(obj);
    hidePanel(addPanel);
  });
  
  // 4. Add listener for close button
  document.getElementById('close-add-panel').addEventListener('click', () => {
    hidePanel(addPanel);
  });
}
