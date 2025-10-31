// File: ui/scene-panel-manager.js
import * as THREE from 'three';
import { allModels, currentSelection, selectObject, deselectAll, assignDefaultName, scene } from '../core/scene-manager.js';
import { hidePanel } from './ui-panels.js';
import { OBJECT_DEFINITIONS } from '../objects/object-manifest.js';

/**
 * Creates a visual row for a sub-mesh in the scene panel.
 * @param {THREE.Mesh} mesh - The mesh object.
 * @param {HTMLElement} container - The parent element to append to.
 * @param {number} indentLevel - The indentation level.
 */
function createMeshEntry(mesh, container, indentLevel) {
  const row = document.createElement('div');
  row.className = `flex items-center justify-between bg-gray-700 hover:bg-gray-600 rounded-md px-3 py-2 pl-${indentLevel * 4}`;

  const nameBtn = document.createElement('button');
  nameBtn.className = 'text-left flex-1 pr-3 active:scale-[0.99] transition-transform flex items-center gap-2';
  nameBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a2 2 0 00-2 2v1H6a2 2 0 00-2 2v1H3a1 1 0 000 2h1v1a2 2 0 002 2h1v1a2 2 0 002 2h2a2 2 0 002-2v-1h1a2 2 0 002-2v-1h1a1 1 0 100-2h-1V7a2 2 0 00-2-2h-1V4a2 2 0 00-2-2h-2z" /></svg>
    <span class="object-label">${mesh.name || 'Unnamed Mesh'}</span>
  `;
  nameBtn.addEventListener('click', (e) => { 
    e.stopPropagation();
    selectObject(mesh); // Select the sub-mesh
    hidePanel(document.getElementById('scene-panel')); 
  });

  // --- ADDED RENAMING ---
  nameBtn.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    const span = nameBtn.querySelector('.object-label');
    if (!span) return;
    
    const currentName = span.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'bg-gray-900 text-white rounded p-0.5 text-sm';
    input.style.width = '80%';
    
    nameBtn.replaceChild(input, span);
    input.focus();
    input.select();
    
    const saveName = () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            mesh.name = newName; // Save to mesh.name
            span.textContent = newName;
        } else {
            span.textContent = currentName;
        }
        nameBtn.replaceChild(span, input);
    };
    
    input.addEventListener('blur', saveName);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        else if (e.key === 'Escape') {
            e.preventDefault();
            span.textContent = currentName;
            nameBtn.replaceChild(span, input);
        }
    });
  });
  // --- END RENAMING ---

  const actions = document.createElement('div');
  // ... (rest of the function is unchanged) ...
  actions.className = 'flex items-center gap-2';

  // Visibility (Hide/Show) Button
  const visBtn = document.createElement('button');
  visBtn.className = 'p-2 rounded-md bg-gray-800 hover:bg-gray-900 active:scale-95 transition-transform';
  visBtn.title = 'Toggle Visibility';
  visBtn.innerHTML = mesh.visible 
    ? `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" /></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zM10 12a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /><path d="M10 17c-4.478 0-8.268-2.943-9.542-7 .94-3.034 3.568-5.39 6.812-6.182L3.707 2.293A1 1 0 002.293 3.707l14 14a1 1 0 001.414-1.414l-1.781-1.781A9.958 9.958 0 0110 17z" /></svg>`;
  visBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    mesh.visible = !mesh.visible;
    refreshSceneList(); // Re-render to update icon
  });
  
  // Delete Button (for sub-mesh)
  const delBtn = document.createElement('button');
  delBtn.className = 'p-2 rounded-md bg-red-600 hover:bg-red-700 active:scale-95 transition-transform';
  delBtn.title = 'Delete Mesh';
  delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-1 1v1H4a1 1 0 000 2h1v9a2 2 0 002 2h6a2 2 0 002-2V6h1a1 1 0 100-2h-4V3a1 1 0 00-1-1H9zM7 6h6v9H7V6zm2 2v5a1 1 0 102 0V8a1 1 0 10-2 0zm-2 0v5a1 1 0 102 0V8a1 1 0 10-2 0z" clip-rule="evenodd" /></svg>`;
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
    mesh.geometry?.dispose();
    mesh.material?.dispose();
    if (currentSelection === mesh) {
      deselectAll();
    }
    refreshSceneList();
  });

  actions.appendChild(visBtn);
  actions.appendChild(delBtn);
  row.appendChild(nameBtn);
  row.appendChild(actions);
  container.appendChild(row);
}

/**
 * Creates a visual row for a root model in the scene panel.
 * @param {THREE.Group} model - The root model object (with userData.isModel).
 * @param {HTMLElement} container - The parent element to append to.
 * @param {number} indentLevel - The indentation level.
 */
function createModelEntry(model, container, indentLevel) {
  const row = document.createElement('div');
  row.className = `flex items-center justify-between bg-gray-800 hover:bg-gray-700 rounded-md px-3 py-2 pl-${indentLevel * 4}`;

  const nameBtn = document.createElement('button');
  nameBtn.className = 'text-left flex-1 pr-3 active:scale-[0.99] transition-transform flex items-center gap-2 font-semibold';
  
  const childrenContainer = document.createElement('div');
  childrenContainer.className = 'pt-2 space-y-2';
  childrenContainer.style.display = 'none';

  const childEntries = model.children.filter(c => c.isMesh || c.userData?.isModel);
  const hasChildren = childEntries.length > 0;
  
  const arrow = hasChildren
    ? `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>`
    : `<div class="w-4 h-4 flex-shrink-0"></div>`; // Placeholder for alignment

  nameBtn.innerHTML = `${arrow}<span class="object-label">${model.userData?.label || model.name || 'Object'}</span>`;
  
  nameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectObject(model); // Select the root model
    hidePanel(document.getElementById('scene-panel')); 
  });
  
  // --- ADDED RENAMING ---
  nameBtn.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    const span = nameBtn.querySelector('.object-label');
    if (!span) return;
    
    const currentName = span.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'bg-gray-900 text-white rounded p-0.5 font-semibold text-sm';
    input.style.width = '80%';
    
    nameBtn.replaceChild(input, span);
    input.focus();
    input.select();
    
    const saveName = () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            model.userData.label = newName; // Save to userData.label
            span.textContent = newName;
        } else {
            span.textContent = currentName;
        }
        nameBtn.replaceChild(span, input);
    };
    
    input.addEventListener('blur', saveName);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        else if (e.key === 'Escape') {
            e.preventDefault();
            span.textContent = currentName;
            nameBtn.replaceChild(span, input);
        }
    });
  });
  // --- END RENAMING ---

  if (hasChildren) {
    nameBtn.firstElementChild.addEventListener('click', (e) => {
      e.stopPropagation(); // Don't select when clicking arrow
      const isHidden = childrenContainer.style.display === 'none';
      childrenContainer.style.display = isHidden ? '' : 'none';
      nameBtn.firstElementChild.classList.toggle('rotate-90', isHidden);
    });
  }

  const actions = document.createElement('div');
  // ... (rest of the function is unchanged) ...
  actions.className = 'flex items-center gap-2';

  // Duplicate Button
  const dupBtn = document.createElement('button');
  dupBtn.className = 'p-2 rounded-md bg-gray-600 hover:bg-gray-500 active:scale-95 transition-transform';
  dupBtn.title = 'Duplicate Model';
  dupBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="10" height="10" rx="2" ry="2" stroke-width="2"></rect><rect x="5" y="5" width="10" height="10" rx="2" ry="2" stroke-width="2"></rect></svg>`;
  dupBtn.addEventListener('click', (e) => { e.stopPropagation(); duplicateModel(model); });

  // Delete Button
  const delBtn = document.createElement('button');
  delBtn.className = 'p-2 rounded-md bg-red-600 hover:bg-red-700 active:scale-9sh-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18" stroke-width="2" stroke-linecap="round"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-width="2"></path><path d="M10 11v6M14 11v6" stroke-width="2" stroke-linecap="round"></path></svg>`;
  delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteModel(model); });

  actions.appendChild(dupBtn);
  actions.appendChild(delBtn);
  row.appendChild(nameBtn);
  row.appendChild(actions);
  container.appendChild(row);
  container.appendChild(childrenContainer); // Add hidden container

  // Recursively populate children
  childEntries.forEach(child => {
    if (child.userData?.isModel) {
      createModelEntry(child, childrenContainer, indentLevel + 1);
    } else if (child.isMesh) {
      createMeshEntry(child, childrenContainer, indentLevel + 1);
    }
  });
}

/**
 * Duplicates a root model.
 * @param {THREE.Group} src - The root model to duplicate.
 */
function duplicateModel(src) {
  // ... (function is unchanged) ...
  let copy;
  const type = src.userData?.type || 'Object';
  const params = { ...(src.userData?.params || {}) };

  const def = OBJECT_DEFINITIONS.find(d => d.type === type);
  
  if (def && type !== 'ImportedGLB') {
    copy = new def.ctor(params);
  } else {
    // Fallback for imported GLBs or non-manifest objects
    copy = src.clone(true);
    copy.userData = JSON.parse(JSON.stringify(src.userData)); // Deep copy userData
  }

  copy.position.copy(src.position).add(new THREE.Vector3(1, 0, 1));
  copy.rotation.copy(src.rotation);
  copy.scale.copy(src.scale);
  copy.userData.isModel = true;
  copy.userData.type = type;
  if (!copy.userData.params) copy.userData.params = params;
  
  // Ensure deep-cloned meshes also get new UUIDs
  copy.traverse(n => {
    n.uuid = THREE.MathUtils.generateUUID();
    if (n.isMesh && !n.name) n.name = n.uuid.substring(0, 8);
  });

  assignDefaultName(copy);
  scene.add(copy);
  allModels.push(copy); // Add to flat list for raycasting
  refreshSceneList();
  selectObject(copy);
}

/**
 * Deletes a root model and all its children.
 * @param {THREE.Group} obj - The root model to delete.
 */
export function deleteModel(obj) { // Ensure this is exported
  const idx = allModels.indexOf(obj);
  if (idx !== -1) allModels.splice(idx, 1);

  if (currentSelection === obj) deselectAll();

  // Recursively dispose of all geometries and materials
  obj.traverse((n) => {
    if (n.isMesh) {
      n.geometry?.dispose();
      const m = n.material;
      if (Array.isArray(m)) m.forEach((mm) => mm?.dispose && mm.dispose());
      else if (m?.dispose) m.dispose();
    }
    if (typeof n.dispose === 'function' && !n.isMesh) {
      // For custom group classes
      n.dispose();
    }
  });

  if (obj.parent) {
    obj.parent.remove(obj);
  }
  refreshSceneList();
}

/**
 * Main function to refresh the entire scene list UI.
 */
export function refreshSceneList() {
  // ... (function is unchanged) ...
  const sceneList = document.getElementById('scene-list');
  if (!sceneList) return;

  sceneList.innerHTML = '';
  const rootModels = scene.children.filter(c => c.userData?.isModel);

  if (rootModels.length === 0) {
    sceneList.innerHTML = '<p class="text-gray-400">No objects in scene.</p>';
    return;
  }

  rootModels.forEach(model => {
    createModelEntry(model, sceneList, 0);
  });
}

export function initScenePanel() {
  // ... (function is unchanged) ...
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
