// File: fileio.js
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader }   from 'three/examples/jsm/loaders/GLTFLoader.js';
// --- NEW IMPORT ---
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { scene } from './core/scene-manager.js'; // <-- CORRECTED PATH

/** Helper to serialize texture overrides */
function getSerializableTexOverrides(o) {
  let serializableTexOverrides = null;
  if (o.userData._texOverrides) {
    const s = o.userData._texOverrides;
    serializableTexOverrides = {
      uvScaleX: s.uvScaleX || s.uvScale || 1, // Handle legacy uvScale
      uvScaleY: s.uvScaleY || s.uvScale || 1, // Handle legacy uvScale
      uvRotation: s.uvRotation,
      displacementScale: s.displacementScale,
      // activePreset: s.activePreset, // <-- REMOVED
      // activeAlbedo: s.activeAlbedo, // <-- REMOVED
      hasMap: !!s.map,
      hasNormalMap: !!s.normalMap,
      hasRoughnessMap: !!s.roughnessMap,
      hasMetalnessMap: !!s.metalnessMap,
      hasAoMap: !!s.aoMap,
      hasEmissiveMap: !!s.emissiveMap,
      hasDisplacementMap: !!s.displacementMap
    };
  }
  return serializableTexOverrides;
}

/** Walk scene and collect user models with transforms + parenting */
export function serializeModels(scene) {
  const nodes = [];
  scene.traverse((o) => {
    // --- NEW: Skip invisible objects ---
    if (!o.visible) return;
    // --- END NEW ---
    // We only serialize root models...
    if (o.userData?.isModel) {
      nodes.push({
        id: o.uuid,
        type: o.userData.type || 'ImportedGLB', // Default to ImportedGLB if type is missing
        name: o.name || null,
        label: o.userData.label || null,
        params: o.userData.params || {},
        texOverrides: getSerializableTexOverrides(o), // Main overrides
        transform: {
          position: [o.position.x, o.position.y, o.position.z],
          quaternion: [o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w],
          scale: [o.scale.x, o.scale.y, o.scale.z]
        },
        parentId: (o.parent && o.parent !== scene) ? o.parent.uuid : null
      });
    } 
    // ...and any sub-mesh that has its *own* overrides
    else if (o.isMesh && o.parent && o.parent.userData?.isModel && o.userData._texOverrides) {
      nodes.push({
        id: o.uuid,
        type: 'MeshOverride',
        name: o.name || null, // Name is critical to find it again
        label: null,
        params: {},
        texOverrides: getSerializableTexOverrides(o), // The sub-mesh's overrides
        transform: null, // Transform is handled by parent
        parentId: o.parent.uuid // Link to parent model
      });
    }
  });
  return { version: 2, nodes }; // Bumped version
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

/** Rebuild from JSON {version, nodes[]} with constructors map */
export function loadFromJSON(json, builders, scene, allModels, onAfterAdd, ensureTexState) {
  if (!json?.nodes) throw new Error('Invalid save file');
  const byId = {};
  const meshOverrides = [];
  
  // First pass: create all root model objects
  for (const n of json.nodes) {
    if (n.type in builders) {
      const ctor = builders[n.type];
      const obj = new ctor(n.params || {});
      obj.userData.isModel = true;
      obj.userData.type = n.type;
      if (n.label) obj.userData.label = n.label;
      if (n.name) obj.name = n.name;
      obj.uuid = n.id; // Restore UUID

      // Restore texture override settings for the main object
      if (n.texOverrides && ensureTexState) {
        const state = ensureTexState(obj);
        Object.assign(state, n.texOverrides);
        // --- FIX for legacy 'uvScale' ---
        if (state.uvScale && !state.uvScaleX) state.uvScaleX = state.uvScale;
        if (state.uvScale && !state.uvScaleY) state.uvScaleY = state.uvScale;
      }

      // Apply TRS
      if (n.transform) {
        const p = n.transform.position || [0,0,0];
        const q = n.transform.quaternion || [0,0,0,1];
        const s = n.transform.scale || [1,1,1];
        obj.position.set(p[0], p[1], p[2]);
        obj.quaternion.set(q[0], q[1], q[2], q[3]);
        obj.scale.set(s[0], s[1], s[2]);
      }
      byId[n.id] = obj;
    } else if (n.type === 'MeshOverride') {
      meshOverrides.push(n);
    }
  }
  
  // Second pass: parenting for root models
  for (const n of json.nodes) {
    const o = byId[n.id];
    if (!o || n.type === 'MeshOverride') continue; // Only parent root models
    
    const parent = n.parentId ? byId[n.parentId] : scene;
    parent.add(o);
    allModels.push(o);
    onAfterAdd && onAfterAdd(o);
  }
  
  // Third pass: apply texture overrides to sub-meshes
  for (const n of meshOverrides) {
    const parent = n.parentId ? byId[n.parentId] : null;
    if (parent && n.name) {
      const child = parent.getObjectByName(n.name);
      if (child && n.texOverrides && ensureTexState) {
        const state = ensureTexState(child); // Apply to the sub-mesh
        Object.assign(state, n.texOverrides);
        // --- FIX for legacy 'uvScale' ---
        if (state.uvScale && !state.uvScaleX) state.uvScaleX = state.uvScale;
        if (state.uvScale && !state.uvScaleY) state.uvScaleY = state.uvScale;
      } else {
        console.warn('Could not find sub-mesh to apply override:', n.name);
      }
    }
  }
}

// --- NEW MERGE-ON-EXPORT FUNCTION ---
function mergeAllModels(rootModels) {
  const geometries = [];
  const materials = [];
  const matMap = new Map();

  for (const model of rootModels) {
    model.traverse(mesh => {
      if (mesh.isMesh && mesh.geometry?.attributes?.position) {
        mesh.updateWorldMatrix(true, true);
        const geo = mesh.geometry.clone();
        geo.applyMatrix4(mesh.matrixWorld);

        let meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

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

  if (geometries.length === 0) return null;

  // Normalize attributes
  const hasUV = geometries.some(g => g.attributes.uv);
  const hasNormal = geometries.some(g => g.attributes.normal);
  for (const geo of geometries) {
    const posCount = geo.attributes.position.count;
    if (hasUV && !geo.attributes.uv) {
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(posCount * 2), 2));
    }
    if (hasNormal && !geo.attributes.normal) {
      geo.computeVertexNormals();
    }
    if (geo.attributes.uv && !geo.attributes.uv2) {
      geo.setAttribute('uv2', geo.attributes.uv.clone());
    }
  }

  const mergedGeo = mergeGeometries(geometries, true);
  if (!mergedGeo) return null;

  // --- MODIFIED: Removed top-down UV generation to preserve original UVs ---
  mergedGeo.computeVertexNormals();
  // --- END MODIFIED ---

  return new THREE.Mesh(mergedGeo, materials);
}
// --- END NEW FUNCTION ---

/** Export GLB of either models-only or whole scene (binary or GLTF) */
export function exportGLB({ scene, modelsOnly = true, binary = true, fileName = 'Model.glb', allModels = [], mergeAll = false }, onDone, onError) {
  const exporter = new GLTFExporter();

  let root = scene;
  let tempRoot = null;

  if (modelsOnly) {
    // Build a clean root with top-level ancestors of user models
    const roots = new Set();
    for (const m of allModels) {
      let a = m;
      while (a.parent && a.parent !== scene && a.parent.userData?.isModel) a = a.parent;
      // --- NEW: Only include visible roots ---
      if (a.visible) roots.add(a);
      // --- END NEW ---
    }
    
    // --- MODIFIED: Handle mergeAll option ---
    if (mergeAll) {
      const rootModels = Array.from(roots).map(r => r.clone(true));
      // --- NEW: Bake UV transforms in cloned models for merged export ---
      rootModels.forEach(clonedModel => {
        bakeUVTransforms(clonedModel);
      });
      // --- END NEW ---
      const mergedMesh = mergeAllModels(rootModels);
      if (mergedMesh) {
        tempRoot = new THREE.Group();
        tempRoot.name = 'ExportRoot_Merged';
        tempRoot.add(mergedMesh);
        root = tempRoot;
      } else {
        onError(new Error("Merging produced no geometry."));
        return;
      }
    } else {
      tempRoot = new THREE.Group();
      tempRoot.name = 'ExportRoot_Standard';
      roots.forEach(r => {
        const cloned = r.clone(true);
        // --- NEW: Bake UV transforms in the cloned model ---
        bakeUVTransforms(cloned);
        // --- END NEW ---
        tempRoot.add(cloned);
      });
      root = tempRoot;
    }
    // --- END MODIFICATION ---
  }

  exporter.parse(
    root,
    (res) => {
      try {
        if (binary) {
          const blob = new Blob([res], { type: 'model/gltf-binary' });
          downloadBlob(blob, fileName.endsWith('.glb') ? fileName : `${fileName}.glb`);
        } else {
          const json = JSON.stringify(res);
          const blob = new Blob([json], { type: 'application/json' });
          downloadBlob(blob, fileName.endsWith('.gltf') ? fileName : `${fileName}.gltf`);
        }
        onDone && onDone();
      } catch (e) {
        onError && onError(e);
      }
    },
    (err) => onError && onError(err),
    { binary }
  );
}

/** Import a .glb and add as a single grouped object */
export function importGLBFile(file, scene, allModels, onAfterAdd) {
  const loader = new GLTFLoader();
  const url = URL.createObjectURL(file);
  loader.parseAsync
    ? loader.parseAsync // some CDNs
    : null;
  loader.load(url, (g) => {
    const obj = g.scene || g.scenes?.[0];
    if (!obj) throw new Error('No scene in GLB');
    
    // Ensure all meshes get names for the new features
    obj.traverse(n => {
      if (n.isMesh && !n.name) {
        n.name = n.uuid.substring(0, 8); // Simple unique name
      }
    });

    obj.name = file.name.replace(/\.(glb|gltf)$/i, '') || 'ImportedGLB';
    obj.userData.isModel = true;
    obj.userData.type = 'ImportedGLB';

    scene.add(obj);
    allModels.push(obj);
    onAfterAdd && onAfterAdd(obj);
    URL.revokeObjectURL(url);
  }, undefined, (e) => {
    URL.revokeObjectURL(url);
    throw e;
  });
}

// --- NEW: Function to bake UV transforms into geometry for export ---
function bakeUVTransforms(root) {
  root.traverse((n) => {
    if (n.isMesh) {
      let overrides = n.userData._texOverrides;
      if (!overrides) {
        // Check ancestors for overrides (if set on group)
        let par = n.parent;
        while (par && par !== scene) {
          if (par.userData._texOverrides) {
            overrides = par.userData._texOverrides;
            break;
          }
          par = par.parent;
        }
      }
      if (overrides) {
        const scaleX = overrides.uvScaleX || 1;
        const scaleY = overrides.uvScaleY || 1;
        const rotation = overrides.uvRotation || 0;
        if (scaleX !== 1 || scaleY !== 1 || rotation !== 0) {
          // Clone geometry to modify
          n.geometry = n.geometry.clone();
          ['uv', 'uv2'].forEach(attrName => {
            const uvAttr = n.geometry.attributes[attrName];
            if (uvAttr) {
              const centerX = 0.5, centerY = 0.5;
              const cos = Math.cos(rotation);
              const sin = Math.sin(rotation);
              for (let i = 0; i < uvAttr.count; i++) {
                let u = uvAttr.getX(i) - centerX;
                let v = uvAttr.getY(i) - centerY;
                const u2 = u * cos - v * sin;
                const v2 = u * sin + v * cos;
                uvAttr.setXY(i, u2 * scaleX + centerX, v2 * scaleY + centerY);
              }
              uvAttr.needsUpdate = true;
            }
          });
        }
        // Clone material(s) and reset texture transforms
        if (Array.isArray(n.material)) {
          n.material = n.material.map(m => m.clone());
        } else {
          n.material = n.material.clone();
        }
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        const resetTex = (tex) => {
          if (tex) {
            tex.repeat.set(1, 1);
            tex.rotation = 0;
            tex.center.set(0, 0);
            tex.offset.set(0, 0);
            tex.needsUpdate = true;
          }
        };
        mats.forEach(m => {
          resetTex(m.map);
          resetTex(m.normalMap);
          resetTex(m.roughnessMap);
          resetTex(m.metalnessMap);
          resetTex(m.aoMap);
          resetTex(m.emissiveMap);
          resetTex(m.displacementMap);
          // displacementScale is preserved on cloned material
        });
      }
    }
  });
}
// --- END NEW ---
