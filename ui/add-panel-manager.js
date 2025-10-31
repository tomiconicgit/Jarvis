// File: ui/add-panel-manager.js
import { OBJECT_DEFINITIONS } from '../objects/object-manifest.js';
import { scene, allModels, selectObject, assignDefaultName } from '../core/scene-manager.js';
// import { hidePanel } from './ui-panels.js'; // A new file for show/hide

export function initAddPanel() {
  const grid = document.getElementById('add-object-grid');
  if (!grid) return;

  // 1. Dynamically create buttons from the manifest
  grid.innerHTML = ''; // Clear any fallback content
  for (const def of OBJECT_DEFINITIONS) {
    const btn = document.createElement('button');
    btn.className = "bg-gray-700 p-3 rounded-lg active:scale-90 transition-transform";
    btn.dataset.objectType = def.type; // Store type
    btn.dataset.objectLabel = def.label; // Store unique label
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

    // 3. Add the object using the definition from the manifest
    const obj = new def.ctor(def.defaultParams);
    
    // Set initial position (optional, good practice)
    if (def.defaultParams.height) {
      obj.position.y = def.defaultParams.height / 2;
    }

    assignDefaultName(obj);
    scene.add(obj);
    allModels.push(obj);
    
    // refreshSceneList(); // This should be called from scene-manager
    selectObject(obj);
    // hidePanel(addPanel);
  });
  
  // ... add listener for closeAddPanel ...
}
