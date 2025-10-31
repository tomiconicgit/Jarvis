// File: ui/scene-panel-manager.js
import { allModels, currentSelection, selectObject, deselectAll, assignDefaultName, scene } from '../core/scene-manager.js';
import { hidePanel } from './ui-panels.js';
import { OBJECT_DEFINITIONS } from '../objects/object-manifest.js';

function duplicateModel(src) {
  let copy;
  const type = src.userData?.type || 'Object';
  const params = { ...(src.userData?.params || {}) };

  // Find the constructor from the manifest
  const def = OBJECT_DEFINITIONS.find(d => d.type === type);
  
  if (def) {
    copy = new def.ctor(params);
  } else {
    // Fallback for imported GLBs or non-manifest objects
    copy = src.clone(true);
    copy.userData = { ...src.userData };
  }

  copy.position.copy(src.position).add(new THREE.Vector3(1, 0, 1));
  copy.rotation.copy(src.rotation);
  copy.scale.copy(src.scale);
  copy.userData.isModel = true;
  copy.userData.type = type;
  if (!copy.userData.params) copy.userData.params = params;

  assignDefaultName(copy);
  scene.add(copy);
  allModels.push(copy);
  refreshSceneList();
  selectObject(copy);
}

function deleteModel(obj) {
  const idx = allModels.indexOf(obj);
  if (idx !== -1) allModels.splice(idx, 1);

  if (currentSelection === obj) deselectAll();

  if (typeof obj.dispose === 'function') obj.dispose();
  obj.traverse((n) => {
    if (n.isMesh) {
      if (n.geometry?.dispose) n.geometry.dispose();
      const m = n.material;
      if (Array.isArray(m)) m.forEach((mm) => mm?.dispose && mm.dispose());
      else if (m?.dispose) m.dispose();
    }
  });

  scene.remove(obj);
  refreshSceneList();
}

export function refreshSceneList() {
  const sceneList = document.getElementById('scene-list');
  if (!sceneList) return;

  sceneList.innerHTML = '';
  if (!allModels.length) {
    sceneList.innerHTML = '<p class="text-gray-400">No objects in scene.</p>';
    return;
  }

  allModels.forEach((obj, idx) => {
    const name = obj.userData?.label || obj.userData?.type || `Object ${idx + 1}`;
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between bg-gray-700 hover:bg-gray-600 rounded-md px-3 py-2';

    const nameBtn = document.createElement('button');
    nameBtn.className = 'text-left flex-1 pr-3 active:scale-[0.99] transition-transform';
    nameBtn.textContent = name;
    nameBtn.addEventListener('click', () => { 
      selectObject(obj); 
      hidePanel(document.getElementById('scene-panel')); 
    });

    const actions = document.createElement('div');
    actions.className = 'flex items-center gap-2';
    
    // Duplicate Button
    const dupBtn = document.createElement('button');
    dupBtn.className = 'p-2 rounded-md bg-gray-800 hover:bg-gray-900 active:scale-95 transition-transform';
    dupBtn.title = 'Duplicate';
    dupBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="10" height="10" rx="2" ry="2" stroke-width="2"></rect><rect x="5" y="5" width="10" height="10" rx="2" ry="2" stroke-width="2"></rect></svg>`;
    dupBtn.addEventListener('click', (e) => { e.stopPropagation(); duplicateModel(obj); });

    // Delete Button
    const delBtn = document.createElement('button');
    delBtn.className = 'p-2 rounded-md bg-red-600 hover:bg-red-700 active:scale-95 transition-transform';
    delBtn.title = 'Delete';
    delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18" stroke-width="2" stroke-linecap="round"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-width="2"></path><path d="M10 11v6M14 11v6" stroke-width="2" stroke-linecap="round"></path></svg>`;
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteModel(obj); });

    actions.appendChild(dupBtn);
    actions.appendChild(delBtn);
    row.appendChild(nameBtn);
    row.appendChild(actions);
    sceneList.appendChild(row);
  });
}

export function initScenePanel() {
  const scenePanel = document.getElementById('scene-panel');
  if (!scenePanel) return;
  
  // Refresh list when panel is shown
  document.getElementById('scene-btn').addEventListener('click', () => {
    refreshSceneList();
  });
  
  // Close button
  document.getElementById('close-scene-panel').addEventListener('click', () => {
    hidePanel(scenePanel);
  });
}
