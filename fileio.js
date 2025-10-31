import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader }   from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Walk scene and collect user models with transforms + parenting */
export function serializeModels(scene) {
  const nodes = [];
  scene.traverse((o) => {
    if (o.userData?.isModel && o.userData?.type) {
      const t = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      o.updateMatrixWorld(true);
      o.matrix.decompose(t, q, s);

      // Create a serializable copy of texture overrides
      let serializableTexOverrides = null;
      if (o.userData._texOverrides) {
        const s = o.userData._texOverrides;
        serializableTexOverrides = {
          // We can't save the texture objects, but we can save the settings.
          uvScale: s.uvScale,
          uvRotation: s.uvRotation,
          displacementScale: s.displacementScale,
          activePreset: s.activePreset, // Added
          activeAlbedo: s.activeAlbedo, // Added
          // We could also save which slots *had* textures, as a hint
          hasMap: !!s.map,
          hasNormalMap: !!s.normalMap,
          hasRoughnessMap: !!s.roughnessMap,
          hasMetalnessMap: !!s.metalnessMap,
          hasAoMap: !!s.aoMap,
          hasEmissiveMap: !!s.emissiveMap,
          hasDisplacementMap: !!s.displacementMap
        };
      }

      nodes.push({
        id: o.uuid,
        type: o.userData.type,
        label: o.userData.label || null,
        params: o.userData.params || {},
        texOverrides: serializableTexOverrides, // Updated
        transform: {
          position: [o.position.x, o.position.y, o.position.z],
          quaternion: [o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w],
          scale: [o.scale.x, o.scale.y, o.scale.z]
        },
        parentId: (o.parent && o.parent !== scene && o.parent.userData?.isModel) ? o.parent.uuid : null
      });
    }
  });
  return { version: 1, nodes };
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
export function loadFromJSON(json, builders, scene, allModels, onAfterAdd, ensureTexState) { // Added ensureTexState
  if (!json?.nodes) throw new Error('Invalid save file');
  const byId = {};
  // First pass: create objects
  for (const n of json.nodes) {
    const ctor = builders[n.type];
    if (!ctor) continue; // skip unknown
    const obj = new ctor(n.params || {});
    obj.userData.isModel = true;
    obj.userData.type = n.type;
    if (n.label) obj.userData.label = n.label;

    // Restore texture override settings
    if (n.texOverrides && ensureTexState) {
      const state = ensureTexState(obj); // Get the default object
      // Merge saved properties (uvScale, uvRotation, etc.)
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
  }
  // Second pass: parenting
  for (const n of json.nodes) {
    const o = byId[n.id];
    if (!o) continue;
    const parent = n.parentId ? byId[n.parentId] : scene;
    parent.add(o);
    allModels.push(o);
    onAfterAdd && onAfterAdd(o);
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
