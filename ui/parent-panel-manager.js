// File: ui/parent-panel-manager.js
import * as THREE from 'three';
import { allModels, scene, findByUUID } from '../core/scene-manager.js';
import { hidePanel, showTempMessage } from './ui-panels.js';
import { refreshSceneList } from './scene-panel-manager.js';

function refreshParentList() {
  const parentList = document.getElementById('parent-list');
  if (!parentList) return;
  
  parentList.innerHTML = '';
  if (!allModels.length) {
    parentList.innerHTML = '<p class="text-gray-400">No objects in scene.</p>';
    return;
  }

  allModels.forEach((obj, idx) => {
    const label = obj.userData?.label || obj.userData?.type || `Object ${idx+1}`;
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between bg-gray-700 rounded-md px-3 py-2';
    const left = document.createElement('div');
    left.className = 'flex items-center gap-3';
    left.innerHTML = `
      <input type="radio" name="parent-main" value="${obj.uuid}" aria-label="main">
      <input type="checkbox" class="parent-child" value="${obj.uuid}" aria-label="child">
      <span>${label}</span>
    `;
    const hint = document.createElement('div');
    hint.className = 'text-xs text-gray-300';
    const parentName = obj.parent && obj.parent !== scene ? (obj.parent.userData?.label || obj.parent.userData?.type) : null;
    hint.textContent = parentName ? `child of ${parentName}` : '';
    row.appendChild(left);
    row.appendChild(hint);
    parentList.appendChild(row);
  });
}

function setParentPreserveWorld(child, newParent) {
  child.updateMatrixWorld(true);
  newParent.updateMatrixWorld(true);
  const childWorld = child.matrixWorld.clone();
  const parentInv = new THREE.Matrix4().copy(newParent.matrixWorld).invert();
  child.matrix.copy(parentInv.multiply(childWorld));
  child.matrix.decompose(child.position, child.quaternion, child.scale);
  newParent.add(child);
}

function applyParenting() {
  const parentList = document.getElementById('parent-list');
  const mainRadio = parentList.querySelector('input[name="parent-main"]:checked');
  if (!mainRadio) { showTempMessage('Pick a Main object'); return; }

  const main = findByUUID(mainRadio.value);
  if (!main) { showTempMessage('Invalid Main'); return; }

  const childChecks = [...parentList.querySelectorAll('input.parent-child:checked')];
  const children = childChecks.map(c => findByUUID(c.value)).filter(o => o && o !== main);
  if (!children.length) { showTempMessage('Pick at least one Child'); return; }

  const isAncestor = (a, b) => { let p = b.parent; while (p) { if (p === a) return true; p = p.parent; } return false; };

  children.forEach(child => {
    if (isAncestor(child, main)) return; // avoid cycles
    setParentPreserveWorld(child, main);
  });

  refreshSceneList();
  refreshParentList();
  showTempMessage('Parenting applied');
  hidePanel(document.getElementById('parent-panel'));
}

export function initParentPanel() {
  const parentPanel = document.getElementById('parent-panel');
  if (!parentPanel) return;

  // --- THIS BLOCK WAS REMOVED AS IT CAUSED THE CRASH ---
  // The 'parent-btn' no longer exists.
  // This logic is now in 'tools-panel-manager.js'

  // Attach button listeners
  document.getElementById('close-parent-panel').addEventListener('click', () => hidePanel(parentPanel));
  document.getElementById('parent-cancel').addEventListener('click', () => hidePanel(parentPanel));
  document.getElementById('parent-apply').addEventListener('click', applyParenting);
}

// Export refreshParentList so the tools panel can call it
export { refreshParentList };
