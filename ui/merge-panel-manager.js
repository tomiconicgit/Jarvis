// File: ui/merge-panel-manager.js
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { allModels, scene, findByUUID, assignDefaultName, selectObject, deselectAll } from '../core/scene-manager.js';
import { hidePanel, showTempMessage, togglePanel } from './ui-panels.js';
import { refreshSceneList, deleteModel } from './scene-panel-manager.js';

// ... (refreshMergeList function is unchanged) ...
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
    // --- PASS 1: Collect geometries and materials ---
    for (const model of selectedModels) {
      model.traverse(mesh => {
        if (mesh.isMesh && mesh.geometry?.attributes?.position) {
          mesh.updateWorldMatrix(true, true);
          const geo = mesh.geometry.clone();
          geo.applyMatrix4(mesh.matrixWorld);

          let meshMaterials = [];
          if (Array.isArray(mesh.material)) {
            meshMaterials = mesh.material;
          } else {
            meshMaterials = [mesh.material];
          }

          if (geo.groups.length > 0) {
            for (const group of geo.groups) {
              const oldMat = meshMaterials[group.materialIndex];
              if (!matMap.has(oldMat)) {
                matMap.set(oldMat, materials.length);
                materials.push(oldMat);
              }
              group.materialIndex = matMap.get(oldMat);
            }
          } else {
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

    // --- PASS 2: Normalize attributes (THIS IS THE FIX) ---
    // Check what attributes are present across all geometries
    const hasUV = geometries.some(g => g.attributes.uv);
    const hasNormal = geometries.some(g => g.attributes.normal);

    for (const geo of geometries) {
      const posCount = geo.attributes.position.count;

      // Force UVs if any geometry has them
      if (hasUV && !geo.attributes.uv) {
        geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(posCount * 2), 2));
      }

      // Force Normals if any geometry has them
      if (hasNormal && !geo.attributes.normal) {
        geo.computeVertexNormals(); // Generate normals if missing
      }

      // Force UV2 if UV is present (for consistency)
      if (geo.attributes.uv && !geo.attributes.uv2) {
        geo.setAttribute('uv2', geo.attributes.uv.clone());
      }
    }
    // --- END FIX ---

    const mergedGeo = mergeGeometries(geometries, true); // true = use groups
    if (!mergedGeo) throw new Error('Merge resulted in empty geometry');

    // --- NEW UV GENERATION ---
    mergedGeo.computeBoundingBox();
    const box = mergedGeo.boundingBox;
    const size = box.getSize(new THREE.Vector3());
    const pos = mergedGeo.attributes.position;
    const uvArray = new Float32Array(pos.count * 2);
    
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
    mergedGeo.setAttribute('uv2', new THREE.BufferAttribute(uvArray, 2)); 
    mergedGeo.computeVertexNormals();
    // --- END NEW UV GENERATION ---

    const mergedMesh = new THREE.Mesh(mergedGeo, materials);
    mergedMesh.name = 'MergedMesh';
    mergedMesh.castShadow = true;
    mergedMesh.receiveShadow = true;

    const mergedGroup = new THREE.Group();
    mergedGroup.add(mergedMesh);
    mergedGroup.userData.isModel = true;
    mergedGroup.userData.type = 'ImportedGLB';
    assignDefaultName(mergedGroup);

    scene.add(mergedGroup);
    allModels.push(mergedGroup);

    if (currentSelection && selectedModels.includes(currentSelection)) {
      deselectAll();
    }
    selectedModels.forEach(model => deleteModel(model));

    refreshSceneList();
    selectObject(mergedGroup);
    showTempMessage('Objects merged');
    hidePanel(document.getElementById('merge-panel'));

  } catch (err) {
    console.error('Merge failed:', err);
    showTempMessage('Merge failed: Check console'); // Changed message
  }
}

// ... (initMergePanel function is unchanged) ...
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
