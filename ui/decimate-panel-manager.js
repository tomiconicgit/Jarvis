// File: ui/decimate-panel-manager.js
import * as THREE from 'three';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import { currentSelection, scene, allModels, assignDefaultName, selectObject } from '../core/scene-manager.js';
import { hidePanel, showTempMessage } from './ui-panels.js';
import { refreshSceneList } from './scene-panel-manager.js';

let modifier;
let originalObject = null;
let originalTriangleCount = 0;

/**
 * Counts the triangles in an object.
 */
function countTriangles(object) {
  let count = 0;
  object.traverse(child => {
    if (child.isMesh && child.geometry) {
      const geo = child.geometry;
      if (geo.index) {
        count += geo.index.count / 3;
      } else if (geo.attributes.position) {
        count += geo.attributes.position.count / 3;
      }
    }
  });
  return Math.floor(count);
}

/**
 * Updates the stats in the decimate panel based on the current selection.
 */
export function updateDecimateStats() {
  const statsEl = document.getElementById('decimate-stats');
  const applyBtn = document.getElementById('decimate-apply');
  if (!statsEl || !applyBtn) return;
  
  originalObject = currentSelection; // Store the currently selected object
  
  if (!originalObject || !originalObject.userData.isModel) {
    statsEl.innerHTML = '<p class="text-red-400">Please select a model to optimize.</p>';
    applyBtn.disabled = true;
    return;
  }
  
  // Cannot decimate procedural objects
  if (originalObject.userData.type !== 'ImportedGLB') {
      statsEl.innerHTML = `<p class="text-yellow-400">Cannot optimize procedural objects.<br>To optimize, export this model as GLB, re-import it, and then optimize the imported version.</p>`;
      applyBtn.disabled = true;
      return;
  }

  originalTriangleCount = countTriangles(originalObject);
  statsEl.innerHTML = `
    <p>Target: <strong>${originalObject.userData.label || 'Imported GLB'}</strong></p>
    <p>Current Polys: <strong>${originalTriangleCount.toLocaleString()}</strong></p>
    <p id="decimate-preview-count"></p>
  `;
  applyBtn.disabled = false;
  updatePreviewCount();
}

/**
 * Updates the "Target Polys" preview text.
 */
function updatePreviewCount() {
    const previewEl = document.getElementById('decimate-preview-count');
    if (!previewEl || originalTriangleCount === 0) return;
    const percent = parseInt(document.getElementById('decimate-percent-slider').value, 10);
    const targetCount = Math.floor(originalTriangleCount * (percent / 100));
    previewEl.innerHTML = `Target Polys: <strong>~${targetCount.toLocaleString()}</strong> (${percent}%)`;
}

/**
 * The main function to apply the decimation.
 * Clones the original, simplifies the clone, and adds it to the scene.
 */
async function applyDecimation() {
  if (!originalObject) {
    showTempMessage('No object selected');
    return;
  }
  
  if (originalObject.userData.type !== 'ImportedGLB') {
      showTempMessage('Cannot optimize procedural objects');
      return;
  }

  if (!modifier) modifier = new SimplifyModifier();

  const percent = parseInt(document.getElementById('decimate-percent-slider').value, 10);
  const targetCountRatio = percent / 100;
  
  showTempMessage(`Optimizing...`);
  hidePanel(document.getElementById('decimate-panel'));

  // Clone the object to apply the modifier
  const newObject = originalObject.clone(true);
  newObject.userData = JSON.parse(JSON.stringify(originalObject.userData)); // Deep copy userData

  const meshes = [];
  newObject.traverse(child => {
    if (child.isMesh) meshes.push(child);
  });
  
  if (meshes.length === 0) {
      showTempMessage('Object has no geometry');
      return;
  }

  // Run in a timeout to let the UI update
  setTimeout(() => {
    try {
      meshes.forEach(mesh => {
        let geo = mesh.geometry;
        const currentCount = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
        const newCount = Math.floor(currentCount * targetCountRatio);

        if (newCount < currentCount && newCount > 0) {
          const simplifiedGeo = modifier.modify(geo, newCount);
          mesh.geometry.dispose(); // Dispose old
          mesh.geometry = simplifiedGeo; // Assign new
        }
      });

      assignDefaultName(newObject);
      newObject.userData.label = `${originalObject.userData.label || 'Model'} (${percent}%)`;
      
      scene.add(newObject);
      allModels.push(newObject);
      
      // Hide the original object
      originalObject.visible = false;

      refreshSceneList();
      selectObject(newObject);
      showTempMessage('Optimization complete!');

    } catch (err) {
      console.error('Decimation failed:', err);
      showTempMessage('Optimization failed. See console.');
      originalObject.visible = true; // Re-show original on failure
    }
  }, 50);
}

export function initDecimatePanel() {
  const panel = document.getElementById('decimate-panel');
  if (!panel) return;

  const slider = panel.querySelector('#decimate-percent-slider');
  const number = panel.querySelector('#decimate-percent-value');

  slider.addEventListener('input', () => { number.value = slider.value; updatePreviewCount(); });
  number.addEventListener('change', () => { slider.value = number.value; updatePreviewCount(); });
  number.addEventListener('keydown', (e) => { if (e.key === 'Enter') number.blur(); });

  panel.querySelector('#close-decimate-panel').addEventListener('click', () => hidePanel(panel));
  panel.querySelector('#decimate-cancel').addEventListener('click', () => hidePanel(panel));
  panel.querySelector('#decimate-apply').addEventListener('click', applyDecimation);
}
