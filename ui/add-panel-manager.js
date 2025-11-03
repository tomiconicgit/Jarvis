File: ui/add-panel-manager.js
--------------------------------------------------------------------------------
// File: ui/add-panel-manager.js
import { OBJECT_DEFINITIONS } from '../objects/object-manifest.js';
import { scene, allModels, selectObject, assignDefaultName } from '../core/scene-manager.js';
import { hidePanel } from './ui-panels.js';
import { refreshSceneList } from './scene-panel-manager.js';

// --- *** OVERHAUL CHANGE *** ---
// Removed category logic, as we only have primitives
export function initAddPanel() {
  const container = document.getElementById('add-object-container');
  const addPanel = document.getElementById('add-panel');
  if (!container || !addPanel) return;

  // 1. Build the UI
  container.innerHTML = '';

  // Add category header
  const header = document.createElement('h4');
  header.className = 'text-sm font-bold text-slate-400 mt-4 first:mt-0 mb-2';
  header.textContent = 'Primitives';
  container.appendChild(header);

  // Add grid for this category
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-3 gap-3';
  
  for (const def of OBJECT_DEFINITIONS) {
    const btn = document.createElement('button');
    btn.className = "bg-slate-700 p-3 rounded-lg active:scale-90 transition-transform flex flex-col items-center justify-center aspect-square";
    btn.dataset.objectLabel = def.label;
    btn.innerHTML = `<span class="text-sm font-medium text-center">${def.label}</span>`;
    grid.appendChild(btn);
  }
  container.appendChild(grid);
  // --- *** END OVERHAUL CHANGE *** ---


  // 3. Add a SINGLE event listener to the container
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-object-label]');
    if (!btn) return;

    const label = btn.dataset.objectLabel;
    const def = OBJECT_DEFINITIONS.find(d => d.label === label);
    if (!def) return;

    // 4. Add the object using the definition
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
  
  // 5. Add listener for close button
  document.getElementById('close-add-panel').addEventListener('click', () => {
    hidePanel(addPanel);
  });
}
