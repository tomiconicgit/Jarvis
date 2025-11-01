// File: ui/merge-panel-manager.js
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { allModels, scene, findByUUID, assignDefaultName, selectObject, deselectAll } from '../core/scene-manager.js';
import { hidePanel, showTempMessage, togglePanel } from './ui-panels.js';
import { refreshSceneList, deleteModel } from './scene-panel-manager.js';

/**
 * Refreshes the list of objects in the merge panel.
 */
function refreshMergeList() {
  const mergeList = document.getElementById('merge-list');
  if (!mergeList) return;
  
  mergeList.innerHTML = '';
  if (allModels.length < 2) {
    mergeList.innerHTML = '<p class="text-slate-400">Need at least two objects to merge.</p>';
    return;
  }

  allModels.forEach((obj, idx) => {
    // Only show root models
    if (obj.parent !== scene) return; 

    const label = obj.userData?.label || obj.userData?.type || `Object ${idx+1}`;
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between bg-slate-700 rounded-md px-3 py-2';
    row.innerHTML = `
      <label class="flex items-center gap-3">
        <input type="checkbox" class="merge-child" value="${obj.uuid}" aria-label="merge-obj">
        <span>${label}</span>
      </label>
    `;
    mergeList.appendChild(row);
  });
}

/**
 * Applies the merge operation to selected objects.
 */
function applyMerge() {
  const mergeList = document.getElementById('merge-list');
  const childChecks = [...mergeList.querySelectorAll('input.merge-child:checked')];
  const selectedModels = childChecks.map(c => findByUUID(c.value)).filter(o => o);

  if (selectedModels.length < 2) {
    showTempMessage('Select at least 2 objects to merge');
    return;
  }
  
  const geometries = [];
  const materials = [];
  const matMap = new Map(); // Map old material -> new material index

  try {
    for (const model of selectedModels) {
      model.traverse(mesh => {
        if (mesh.isMesh) {
          mesh.updateWorldMatrix(true, true);
          const geo = mesh.geometry.clone();
          geo.applyMatrix4(mesh.matrixWorld);

          // --- FIX: Normalize attributes to prevent merge failure ---
          // Ensure uv2 exists if uv exists, as some geometries (Sphere)
          // have it by default and others (Cube) don't.
          if (geo.attributes.uv && !geo.attributes.uv2) {
            geo.setAttribute('uv2', geo.attributes.uv); // Just copy uv to uv2
          }
          // --- END FIX ---

          let meshMaterials = [];
          if (Array.isArray(mesh.material)) {
            meshMaterials = mesh.material;
          } else {
            meshMaterials = [mesh.material];
          }

          if (geo.groups.length > 0) {
            // Handle existing groups (multi-material)
            for (const group of geo.groups) {
              const oldMat = meshMaterials[group.materialIndex];
              if (!matMap.has(oldMat)) {
                matMap.set(oldMat, materials.length);
                materials.push(oldMat);
              }
              group.materialIndex = matMap.get(oldMat);
            }
          } else {
            // Single material for the geometry
            const oldMat = meshMaterials[0];
            if (!matMap.has(oldMat)) {
              matMap.set(oldMat, materials.length);
              materials.push(oldMat);
            }
            geo.clearGroups();
            geo.addGroup(0, geo.attributes.position.count, matMap.get(oldMat));
          }
          geometries.push(geo);
        }
      });
    }

    if (geometries.length === 0) {
      showTempMessage('No mergeable geometry found');
      return;
    }

    const mergedGeo = mergeGeometries(geometries, true); // true = use groups
    if (!mergedGeo) throw new Error('Merge resulted in empty geometry');

    // --- NEW UV GENERATION ---
    // Generate new UVs based on a top-down (X/Z) projection
    // This makes textures apply "as one" across the merged surface.
    mergedGeo.computeBoundingBox();
    const box = mergedGeo.boundingBox;
    const size = box.getSize(new THREE.Vector3());
    const pos = mergedGeo.attributes.position;
    const uvArray = new Float32Array(pos.count * 2);
    
    // Handle division by zero if the object is perfectly flat
    const sizeX = size.x === 0 ? 1 : size.x;
    const sizeZ = size.z === 0 ? 1 : size.z;

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        
        const u = (x - box.min.x) / sizeX;
        const v = (z - box.min.z) / sizeZ;
        
        uvArray[i * 2] = u;
        uvArray[i * 2 + 1] = v;
    }
    mergedGeo.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
    mergedGeo.setAttribute('uv2', new THREE.BufferAttribute(uvArray, 2)); // Also apply to uv2
    mergedGeo.computeVertexNormals();
    // --- END NEW UV GENERATION ---

    const mergedMesh = new THREE.Mesh(mergedGeo, materials);
    mergedMesh.name = 'MergedMesh';
    mergedMesh.castShadow = true;
    mergedMesh.receiveShadow = true;

    // Wrap in a Group to match the app's `isModel` standard
    const mergedGroup = new THREE.Group();
    mergedGroup.add(mergedMesh);
    mergedGroup.userData.isModel = true;
    mergedGroup.userData.type = 'ImportedGLB'; // Treat as an imported object
    assignDefaultName(mergedGroup);

    scene.add(mergedGroup);
    allModels.push(mergedGroup);

    // Remove old models
    if (currentSelection && selectedModels.includes(currentSelection)) {
      deselectAll();
    }
    selectedModels.forEach(model => deleteModel(model)); // deleteModel handles cleanup

    refreshSceneList();
    selectObject(mergedGroup);
    showTempMessage('Objects merged');
    hidePanel(document.getElementById('merge-panel'));

  } catch (err) {
    console.error('Merge failed:', err);
    showTempMessage('Merge failed');
  }
}

export function initMergePanel() {
  const mergePanel = document.getElementById('merge-panel');
  if (!mergePanel) return;

  // Toggle panel from toolbar
  document.getElementById('merge-btn').addEventListener('click', () => {
    refreshMergeList();
    togglePanel(mergePanel);
  });

  // Attach button listeners
  document.getElementById('close-merge-panel').addEventListener('click', () => hidePanel(mergePanel));
  document.getElementById('merge-cancel').addEventListener('click', () => hidePanel(mergePanel));
  document.getElementById('merge-apply').addEventListener('click', applyMerge);
}
