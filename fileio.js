import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader }   from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Helper to serialize texture overrides */
function getSerializableTexOverrides(o) {
  let serializableTexOverrides = null;
  if (o.userData._texOverrides) {
    const s = o.userData._texOverrides;
    serializableTexOverrides = {
      uvScale: s.uvScale,
      uvRotation: s.uvRotation,
      displacementScale: s.displacementScale,
      activePreset: s.activePreset,
      activeAlbedo: s.activeAlbedo,
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
      } else {
        console.warn('Could not find sub-mesh to apply override:', n.name);
      }
    }
  }
}

/** Export GLB of either models-only or whole scene (binary or GLTF) */
export function exportGLB({ scene, modelsOnly = true, binary = true, fileName = 'Model.glb', allModels = [] }, onDone, onError) {
  const exporter = new GLTFExporter();

  let root = scene;
  let tempRoot = null;

  if (modelsOnly) {
    // Build a clean root with top-level ancestors of user models
    const modelSet = new Set(allModels);
    const roots = new Set();
    for (const m of allModels) {
      let a = m;
      while (a.parent && a.parent !== scene && a.parent.userData?.isModel) a = a.parent;
      roots.add(a);
    }
    tempRoot = new THREE.Group();
    tempRoot.name = 'ExportRoot';
    roots.forEach(r => tempRoot.add(r.clone(true)));
    root = tempRoot;
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

    const wrap = new THREE.Group();
    wrap.name = file.name.replace(/\.(glb|gltf)$/i, '') || 'ImportedGLB';
    wrap.userData.isModel = true;
    wrap.userData.type = 'ImportedGLB';
    wrap.add(obj);

    scene.add(wrap);
    allModels.push(wrap);
    onAfterAdd && onAfterAdd(wrap);
    URL.revokeObjectURL(url);
  }, undefined, (e) => {
    URL.revokeObjectURL(url);
    throw e;
  });
}

