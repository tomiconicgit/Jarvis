// File: ui/props-panel.js
import * as THREE from 'three';
import { OBJECT_DEFINITIONS } from '../objects/object-manifest.js';
import * as SceneManager from '../core/scene-manager.js';

// --- Texture Globals ---
const textureLoader = new THREE.TextureLoader();
// const presetTextureCache = new Map(); // <-- REMOVED
// PRESET_TEXTURES REMOVED
let currentTextureTarget = null; // Holds the object3D (root or mesh) being textured

// --- Tab System ---
function makeTabs(rootEl, tabsSpec) {
  const header = document.createElement('div');
  header.className = 'flex gap-2 mb-3 sticky top-0 bg-[rgba(30,41,59,0.92)] pt-1 pb-2 z-10'; // Updated color
  const contentWrap = document.createElement('div');
  contentWrap.className = 'mt-1';
  const pages = new Map();
  let currentId = tabsSpec[0].id;

  tabsSpec.forEach(tab => {
    const btn = document.createElement('button');
    btn.textContent = tab.label;
    btn.className = 'px-3 py-1.5 rounded-md text-sm bg-slate-700 data-[active=true]:bg-sky-600 font-semibold'; // Updated colors
    btn.dataset.id = tab.id;
    header.appendChild(btn);
    const page = document.createElement('div');
    page.style.display = 'none';
    pages.set(tab.id, { page, builder: tab.build, built: false });
    contentWrap.appendChild(page);

    btn.addEventListener('click', () => {
      if (currentId === tab.id) return;
      header.querySelectorAll('button').forEach(b => b.dataset.active = 'false');
      btn.dataset.active = 'true';
      pages.get(currentId).page.style.display = 'none';
      currentId = tab.id;
      const p = pages.get(currentId);
      if (!p.built) { p.builder(p.page); p.built = true; }
      p.page.style.display = '';
    });
  });

  rootEl.appendChild(header);
  rootEl.appendChild(contentWrap);
  header.querySelector('button').dataset.active = 'true';
  const first = pages.get(currentId);
  first.builder(first.page); first.built = true; first.page.style.display = '';
}

// --- Texture Helper Functions ---
/** Collects materials from the given root object (which can be a Group or a Mesh) */
function collectMaterialsFromObject(root) {
  const set = new Set();
  if (!root) return [];
  root.traverse(n => {
    if (n.isMesh && n.material) {
      if (Array.isArray(n.material)) n.material.forEach(m => m && set.add(m));
      else set.add(n.material);
      // Ensure UV2 for AO maps etc.
      if (n.geometry?.attributes?.uv && !n.geometry.attributes.uv2) {
        n.geometry.setAttribute('uv2', n.geometry.attributes.uv);
      }
    }
  });
  return Array.from(set);
}

/** Ensures the _texOverrides object exists on object.userData */
export function ensureTexState(object) {
  if (!object) return {}; // Safety check
  if (!object.userData._texOverrides) object.userData._texOverrides = {
    map: null, normalMap: null, roughnessMap: null, metalnessMap: null,
    aoMap: null, emissiveMap: null, displacementMap: null,
    uvScaleX: 1, uvScaleY: 1, uvRotation: 0, displacementScale: 0.0
    // activePreset: 'none', // <-- REMOVED
    // activeAlbedo: 'none' // <-- REMOVED
  };
  // --- FIX for legacy 'uvScale' ---
  if (object.userData._texOverrides.uvScale) {
    if (!object.userData._texOverrides.uvScaleX) {
        object.userData._texOverrides.uvScaleX = object.userData._texOverrides.uvScale;
    }
    if (!object.userData._texOverrides.uvScaleY) {
        object.userData._texOverrides.uvScaleY = object.userData._texOverrides.uvScale;
    }
  }
  return object.userData._texOverrides;
}

function applyUVToAllMaps(materials, scaleX = 1, scaleY = 1, rotationRad = 0) {
  const apply = (tex) => {
    if (!tex) return;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(scaleX, scaleY);
    tex.center.set(0.5, 0.5);
    tex.rotation = rotationRad;
    tex.needsUpdate = true;
  };
  materials.forEach(m => {
    apply(m.map); apply(m.normalMap); apply(m.roughnessMap);
    apply(m.metalnessMap); apply(m.aoMap); apply(m.emissiveMap);
    apply(m.bumpMap); apply(m.displacementMap);
  });
}

function setMaterialScalar(materials, key, value) {
  materials.forEach(m => {
    if (key in m) { m[key] = value; m.needsUpdate = true; }
  });
}

const MAP_SLOTS = {
  albedo:   { prop: 'map',             color: true  },
  normal:   { prop: 'normalMap',       color: false },
  roughness:{ prop: 'roughnessMap',    color: false },
  metalness:{ prop: 'metalnessMap',    color: false },
  ao:       { prop: 'aoMap',           color: false },
  emissive: { prop: 'emissiveMap',     color: true  },
  height:   { prop: 'displacementMap', color: false }
};

function applyTextureFromURL({ object, materials, url, slotName, uvScaleX, uvScaleY, uvRotation }) {
  return new Promise((resolve, reject) => {
    const slot = MAP_SLOTS[slotName];
    if (!slot) return reject(new Error('Unknown map slot'));
    const st = ensureTexState(object); // State is on the target object

    const applyTex = (tex) => {
      try {
        const setSRGB = (t) => {
          if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
          else if ('encoding' in t) t.encoding = THREE.sRGBEncoding;
        };
        if (slot.color) setSRGB(tex);

        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.center.set(0.5, 0.5);
        tex.repeat.set(uvScaleX, uvScaleY);
        tex.rotation = uvRotation;
        tex.needsUpdate = true;
        if (typeof SceneManager.renderer?.capabilities?.getMaxAnisotropy === 'function') {
          tex.anisotropy = Math.min(8, SceneManager.renderer.capabilities.getMaxAnisotropy());
        }
        materials.forEach(m => { m[slot.prop] = tex; m.needsUpdate = true; });

        const oldTex = st[slot.prop];
        if (oldTex && oldTex !== tex) { // Removed preset cache check
          oldTex.dispose?.();
        }
        st[slot.prop] = tex;
        st.uvScaleX = uvScaleX;
        st.uvScaleY = uvScaleY;
        st.uvRotation = uvRotation;
        resolve(tex);
      } catch (e) { reject(e); }
    };

    textureLoader.load(url, (tex) => {
      applyTex(tex);
    }, undefined, (err) => {
      console.error('Failed to load texture:', url, err);
      reject(err);
    });
  });
}

function uploadMapFromFile({ object, materials, file, slotName, uvScaleX = 1, uvScaleY = 1, uvRotation = 0 }) {
  const url = URL.createObjectURL(file);
  return applyTextureFromURL({ object, materials, url, slotName, uvScaleX, uvScaleY, uvRotation })
    .finally(() => { URL.revokeObjectURL(url); });
}

function clearOverrideSlot(object, materials, slotName) {
  const slot = MAP_SLOTS[slotName];
  const st = ensureTexState(object);
  const tex = st[slot.prop];
  if (tex) { // Removed preset cache check
    tex.dispose?.();
  }
  st[slot.prop] = null;
  materials.forEach(m => { m[slot.prop] = null; m.needsUpdate = true; });
}

function clearAllOverrides(object, materials) {
  const st = ensureTexState(object);
  for (const slotName of Object.keys(MAP_SLOTS)) {
    const slot = MAP_SLOTS[slotName];
    const tex = st[slot.prop];
    if (tex) { // Removed preset cache check
      tex.dispose?.();
    }
    st[slot.prop] = null;
    materials.forEach(m => { m[slot.prop] = null; m.needsUpdate = true; });
  }
  // Reset scalars to defaults
  setMaterialScalar(materials, 'roughness', 0.8);
  setMaterialScalar(materials, 'metalness', 0.1);
}

// --- applyPreset function REMOVED ---
// --- applyAlbedoOverride function REMOVED ---

// --- Tab Builder Functions ---

function buildTransformTab(object, page) {
  const numberInputClasses = "w-20 text-right bg-slate-800 rounded px-2 py-0.5 text-sm"; // Updated color
  const toRow = (id, label, min, max, step, value) => `
    <div class="space-y-1">
      <label class="text-sm font-medium flex justify-between items-center">
        <span>${label}</span>
        <input type="number" id="${id}-val" class="${numberInputClasses}" min="${min}" max="${max}" step="${step}" value="${value}">
      </label>
      <input type="range" id="${id}-slider" min="${min}" max="${max}" step="${step}" value="${value}">
    </div>`;

  page.innerHTML = `
    <div class="grid grid-cols-3 gap-3">
      ${toRow('tx','Pos X', -100,100,0.1, object.position.x.toFixed(2))}
      ${toRow('ty','Pos Y', -100,100,0.1, object.position.y.toFixed(2))}
      ${toRow('tz','Pos Z', -100,100,0.1, object.position.z.toFixed(2))}
    </div>
    <div class="grid grid-cols-3 gap-3 mt-3">
      ${toRow('rx','Rot X °', -180,180,1, THREE.MathUtils.radToDeg(object.rotation.x).toFixed(0))}
      ${toRow('ry','Rot Y °', -180,180,1, THREE.MathUtils.radToDeg(object.rotation.y).toFixed(0))}
      ${toRow('rz','Rot Z °', -180,180,1, THREE.MathUtils.radToDeg(object.rotation.z).toFixed(0))}
    </div>
    <div class="grid grid-cols-3 gap-3 mt-3">
      ${toRow('sx','Scale X', 0.01,20,0.01, object.scale.x.toFixed(2))}
      ${toRow('sy','Scale Y', 0.01,20,0.01, object.scale.y.toFixed(2))}
      ${toRow('sz','Scale Z', 0.01,20,0.01, object.scale.z.toFixed(2))}
    </div>
    <div class="mt-3 flex gap-2">
      <button id="reset-pos" class="px-3 py-2 rounded bg-slate-700">Reset Pos</button>
      <button id="reset-rot" class="px-3 py-2 rounded bg-slate-700">Reset Rot</button>
      <button id="reset-scl" class="px-3 py-2 rounded bg-slate-700">Reset Scale</button>
    </div>
  `;

  const link = (id, fn, formatFn) => {
    const slider = page.querySelector(`#${id}-slider`);
    const number = page.querySelector(`#${id}-val`);
    if (!slider || !number) return;
    const format = formatFn || (v => v.toFixed(2));
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      number.value = format(val);
      fn(val);
      if (SceneManager.transformControls) { SceneManager.transformControls.update(); } // RE-ENABLED
    });
    const updateFromNumber = () => {
      let val = parseFloat(number.value);
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      if (isNaN(val)) val = min;
      val = Math.max(min, Math.min(max, val)); // Clamp
      number.value = format(val);
      slider.value = val;
      fn(val);
      if (SceneManager.transformControls) { SceneManager.transformControls.update(); } // RE-ENABLED
    };
    number.addEventListener('change', updateFromNumber);
    number.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); updateFromNumber(); number.blur(); }
    });
  };
  
  const formatDeg = v => v.toFixed(0);
  link('tx', v => object.position.x = v);
  link('ty', v => object.position.y = v);
  link('tz', v => object.position.z = v);
  link('rx', v => object.rotation.x = THREE.MathUtils.degToRad(v), formatDeg);
  link('ry', v => object.rotation.y = THREE.MathUtils.degToRad(v), formatDeg);
  link('rz', v => object.rotation.z = THREE.MathUtils.degToRad(v), formatDeg);
  link('sx', v => object.scale.x = v);
  link('sy', v => object.scale.y = v);
  link('sz', v => object.scale.z = v);

  const reset = (ids, val, fn) => {
    fn(val);
    ids.forEach(id => {
      page.querySelector(`#${id}-slider`).value = val;
      page.querySelector(`#${id}-val`).value = (id.startsWith('r') ? val.toFixed(0) : (id.startsWith('s') ? val.toFixed(2) : val.toFixed(2)));
    });
    if (SceneManager.transformControls) { SceneManager.transformControls.update(); } // RE-ENABLED
  };
  
  page.querySelector('#reset-pos').addEventListener('click', () => reset(['tx','ty','tz'], 0, v => object.position.set(v,v,v)));
  page.querySelector('#reset-rot').addEventListener('click', () => reset(['rx','ry','rz'], 0, v => object.rotation.set(v,v,v)));
  page.querySelector('#reset-scl').addEventListener('click', () => reset(['sx','sy','sz'], 1, v => object.scale.set(v,v,v)));
}

function buildShapeTab(object, page) {
  // Find the root model
  let rootModel = object;
  while (rootModel.parent && !rootModel.userData.isModel) {
    rootModel = rootModel.parent;
  }

  const type = rootModel.userData.type;
  const def = OBJECT_DEFINITIONS.find(d => d.type === type);

  // Only show shape params if the *root model* is selected
  if (object === rootModel && def && def.buildShapeTab) {
    def.buildShapeTab(rootModel, page);
  } else {
    page.innerHTML = '<p class="text-slate-500">Select the root object to edit shape parameters.</p>'; // Updated color
  }
}

/**
 * Main function to build the Textures tab UI.
 * @param {THREE.Object3D} object - The currently selected object (could be root or sub-mesh)
 * @param {HTMLElement} page - The HTML element to build the UI into
 */
function buildTexturesTab(object, page) {
  // 1. Find the root model of the selection
  let rootModel = object;
  if (rootModel.isMesh) {
    rootModel.traverseAncestors((a) => {
      if (a.userData.isModel) rootModel = a;
    });
  }
  
  // 2. Find all targetable meshes within the root model
  const meshTargets = new Map();
  rootModel.traverse(n => {
    if (n.isMesh) {
      meshTargets.set(n.uuid, n);
    }
  });

  // 3. Build the static UI
  page.innerHTML = `
    <div>
      <label class="text-sm font-medium">Texture Target
        <select id="mesh-target-select" class="block mt-1 w-full bg-slate-800 rounded p-2 text-sm"></select>
      </label>
    </div>
    <div id="texture-ui-content" class="space-y-4 mt-4">
      </div>
  `;

  const select = page.querySelector('#mesh-target-select');
  const contentEl = page.querySelector('#texture-ui-content');

  // 4. Populate the dropdown
  const allMeshesOpt = document.createElement('option');
  allMeshesOpt.value = rootModel.uuid;
  allMeshesOpt.textContent = 'All Meshes (Main Object)';
  select.appendChild(allMeshesOpt);

  meshTargets.forEach((mesh, uuid) => {
    const opt = document.createElement('option');
    opt.value = uuid;
    opt.textContent = `  • ${mesh.name || 'Unnamed Mesh'}`;
    select.appendChild(opt);
  });

  // 5. Set the dropdown to the currently selected object
  if (meshTargets.has(object.uuid)) {
    select.value = object.uuid;
  } else {
    select.value = rootModel.uuid;
  }
  
  // 6. Listener to change target
  select.addEventListener('change', (e) => {
    const targetId = e.target.value;
    const newTarget = meshTargets.get(targetId) || rootModel;
    currentTextureTarget = newTarget;
    refreshTextureUI(newTarget, contentEl, rootModel);
  });

  // 7. Initial UI render
  currentTextureTarget = meshTargets.get(object.uuid) || rootModel;
  refreshTextureUI(currentTextureTarget, contentEl, rootModel);
}

/**
 * Re-draws the dynamic part of the texture UI based on the target
 * @param {THREE.Object3D} target - The object to apply textures to (root or sub-mesh)
 * @param {HTMLElement} contentEl - The element to inject HTML into
 * @param {THREE.Object3D} rootModel - The root model (for preset selection context)
 */
function refreshTextureUI(target, contentEl, rootModel) {
  const mats = collectMaterialsFromObject(target);
  if (mats.length === 0) {
    contentEl.innerHTML = '<p class="text-slate-500">No materials found on this target.</p>'; // Updated color
    return;
  }
  
  const rep = mats[0] || {};
  const st = ensureTexState(target); // Get state from the specific target
  
  const numberInputClasses = "w-20 text-right bg-slate-800 rounded px-2 py-0.5 text-sm"; // Updated color
  
  const rough = ('roughness' in rep) ? rep.roughness : 0.8;
  const metal = ('metalness' in rep) ? rep.metalness : 0.1;
  const uvScaleX = st.uvScaleX || 1;
  const uvScaleY = st.uvScaleY || 1;
  const uvRotation = st.uvRotation || 0;

  contentEl.innerHTML = `
    <div class="border-t border-white/10 pt-3">
      <h4 class="text-sm font-bold mb-2">Material Properties</h4>
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <label class="text-sm font-medium flex justify-between items-center">
            <span>Roughness</span>
            <input type="number" id="mat-rough-val" class="${numberInputClasses}" min="0" max="1" step="0.01" value="${rough.toFixed(2)}">
          </label>
          <input type="range" id="mat-rough-slider" min="0" max="1" step="0.01" value="${rough}">
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium flex justify-between items-center">
            <span>Metalness</span>
            <input type="number" id="mat-metal-val" class="${numberInputClasses}" min="0" max="1" step="0.01" value="${metal.toFixed(2)}">
          </label>
          <input type="range" id="mat-metal-slider" min="0" max="1" step="0.01" value="${metal}">
        </div>
      </div>
    </div>
    <div class="mt-2 border-t border-white/10 pt-3">
      <h4 class="text-sm font-bold mb-2">Tiling & Rotation</h4>
      
      <div class="space-y-1">
        <label class="text-sm font-medium flex justify-between items-center">
          <span>UV Uniform Scale</span>
          <input type="number" id="uv-scale-uniform-val" class="${numberInputClasses}" min="0.1" max="50" step="0.1" value="${uvScaleX.toFixed(1)}">
        </label>
        <input type="range" id="uv-scale-uniform-slider" min="0.1" max="50" step="0.1" value="${uvScaleX}">
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        <div class="space-y-1">
          <label class="text-sm font-medium flex justify-between items-center">
            <span>UV Repeat X</span>
            <input type="number" id="uv-scale-x-val" class="${numberInputClasses}" min="0.1" max="50" step="0.1" value="${uvScaleX.toFixed(1)}">
          </label>
          <input type="range" id="uv-scale-x-slider" min="0.1" max="50" step="0.1" value="${uvScaleX}">
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium flex justify-between items-center">
            <span>UV Repeat Y</span>
            <input type="number" id="uv-scale-y-val" class="${numberInputClasses}" min="0.1" max="50" step="0.1" value="${uvScaleY.toFixed(1)}">
          </label>
          <input type="range" id="uv-scale-y-slider" min="0.1" max="50" step="0.1" value="${uvScaleY}">
        </div>
      </div>
      <div class="mt-2 space-y-1">
        <label class="text-sm font-medium flex justify-between items-center">
          <span>UV Rotation °</span>
          <input type="number" id="uv-rot-val" class="${numberInputClasses}" min="0" max="360" step="1" value="${Math.round(THREE.MathUtils.radToDeg(uvRotation || 0))}">
        </label>
        <input type="range" id="uv-rot-slider" min="0" max="360" step="1" value="${THREE.MathUtils.radToDeg(uvRotation || 0)}">
      </div>
    </div>
    <div class="mt-3 border-t border-white/10 pt-3">
      <h4 class="text-sm font-bold mb-2">Manual PBR Upload</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" id="pbr-grid"></div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button id="clear-all-pbr" class="px-3 py-2 rounded bg-red-600 text-sm">Clear All Textures</button>
      </div>
    </div>
  `;

  // --- Populate Presets ---
  // REMOVED

  // --- Populate Albedo Override ---
  // REMOVED

  // --- Link Sliders ---
  const linkSimple = (idBase, formatFn, updateFn) => {
    const slider = contentEl.querySelector(`#${idBase}-slider`);
    const number = contentEl.querySelector(`#${idBase}-val`);
    if (!slider || !number) return;
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      number.value = formatFn(val);
      updateFn(val);
    });
    const updateFromNumber = () => {
      let val = parseFloat(number.value);
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      if (isNaN(val)) val = min;
      val = Math.max(min, Math.min(max, val)); // Clamp
      number.value = formatFn(val);
      slider.value = val;
      updateFn(val);
    };
    number.addEventListener('change', updateFromNumber);
    number.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); updateFromNumber(); number.blur(); }
    });
  };

  const formatF2 = v => v.toFixed(2);
  const formatF1 = v => v.toFixed(1);
  const formatF0 = v => v.toFixed(0);

  linkSimple('mat-rough', formatF2, v => setMaterialScalar(mats, 'roughness', v));
  linkSimple('mat-metal', formatF2, v => setMaterialScalar(mats, 'metalness', v));
  
  const syncUV = () => {
    const scaleX = parseFloat(contentEl.querySelector('#uv-scale-x-slider').value);
    const scaleY = parseFloat(contentEl.querySelector('#uv-scale-y-slider').value);
    const rotDeg = parseFloat(contentEl.querySelector('#uv-rot-slider').value);
    const rotRad = THREE.MathUtils.degToRad(rotDeg);
    st.uvScaleX = scaleX;
    st.uvScaleY = scaleY;
    st.uvRotation = rotRad;
    applyUVToAllMaps(mats, scaleX, scaleY, rotRad);
  };
  
  linkSimple('uv-scale-x', formatF1, syncUV);
  linkSimple('uv-scale-y', formatF1, syncUV);
  linkSimple('uv-rot', formatF0, syncUV);
  
  // linkSimple('disp-scale', ...); // <-- REMOVED

  // --- Link new Uniform UV Slider ---
  const uniformSlider = contentEl.querySelector('#uv-scale-uniform-slider');
  const uniformVal = contentEl.querySelector('#uv-scale-uniform-val');
  const xSlider = contentEl.querySelector('#uv-scale-x-slider');
  const xVal = contentEl.querySelector('#uv-scale-x-val');
  const ySlider = contentEl.querySelector('#uv-scale-y-slider');
  const yVal = contentEl.querySelector('#uv-scale-y-val');

  const updateFromUniform = (val) => {
    const valFmt = val.toFixed(1);
    // Update self
    uniformVal.value = valFmt;
    uniformSlider.value = val;
    // Update X and Y
    xSlider.value = val;
    xVal.value = valFmt;
    ySlider.value = val;
    yVal.value = valFmt;
  };

  uniformSlider.addEventListener('input', () => {
    const val = parseFloat(uniformSlider.value);
    updateFromUniform(val);
  });

  uniformSlider.addEventListener('change', () => {
    // After changing, trigger the main sync function
    syncUV();
  });
  
  const updateFromUniformNumber = () => {
      let val = parseFloat(uniformVal.value);
      const min = parseFloat(uniformSlider.min);
      const max = parseFloat(uniformSlider.max);
      if (isNaN(val)) val = min;
      val = Math.max(min, Math.min(max, val)); // Clamp
      updateFromUniform(val);
      syncUV();
  };
  
  uniformVal.addEventListener('change', updateFromUniformNumber);
  uniformVal.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); uniformVal.blur(); }
  });
  // --- End Uniform Link ---


  // --- PBR Upload Rows ---
  const pbrGrid = contentEl.querySelector('#pbr-grid');
  const makeUploadRow = (label, slotName) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 bg-slate-700 rounded px-2 py-2'; // Updated color
    row.innerHTML = `
      <span class="text-sm flex-1">${label}</span>
      <input type="file" id="file-${slotName}" class="hidden" accept="image/*">
      <button class="px-2 py-1 bg-slate-800 rounded text-sm" id="btn-${slotName}">Upload</button>
      <button class="px-2 py-1 bg-slate-800 rounded text-sm" id="clr-${slotName}">Clear</button>
    `;
    pbrGrid.appendChild(row);

    const btn = row.querySelector(`#btn-${slotName}`);
    const inp = row.querySelector(`#file-${slotName}`);
    const clr = row.querySelector(`#clr-${slotName}`);

    btn.addEventListener('click', () => inp.click());
    inp.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const scaleX = parseFloat(contentEl.querySelector('#uv-scale-x-slider').value);
      const scaleY = parseFloat(contentEl.querySelector('#uv-scale-y-slider').value);
      const rot = THREE.MathUtils.degToRad(parseFloat(contentEl.querySelector('#uv-rot-slider').value));
      try {
        await uploadMapFromFile({ object: target, materials: mats, file: f, slotName, uvScaleX: scaleX, uvScaleY: scaleY, uvRotation: rot });
      } catch (err) { console.error('Texture upload failed:', err); } 
      finally { inp.value = ''; }
    });
    clr.addEventListener('click', () => {
      clearOverrideSlot(target, mats, slotName);
    });
  };
  makeUploadRow('Albedo (Base Color)', 'albedo');
  makeUploadRow('Normal', 'normal');
  makeUploadRow('Roughness', 'roughness');
  makeUploadRow('Metalness', 'metalness');
  makeUploadRow('AO (Ambient Occlusion)', 'ao');
  makeUploadRow('Emissive', 'emissive');
  makeUploadRow('Height (Displacement)', 'height');

  // --- Clear All ---
  contentEl.querySelector('#clear-all-pbr').addEventListener('click', () => {
    clearAllOverrides(target, mats);
    // Reset scalar sliders to default
    contentEl.querySelector('#mat-rough-slider').value = 0.8;
    contentEl.querySelector('#mat-rough-val').value = (0.8).toFixed(2);
    contentEl.querySelector('#mat-metal-slider').value = 0.1;
    contentEl.querySelector('#mat-metal-val').value = (0.1).toFixed(2);
  });
}

// --- Main Panel Update Function ---
export function updatePropsPanel(object) {
  const propsContent = document.getElementById('props-content');
  if (!propsContent) return;
  propsContent.innerHTML = '';
  
  if (!object) {
    propsContent.innerHTML = '<p class="text-slate-500">No selection.</p>'; // Updated color
    return;
  }
  
  // Set the initial texture target
  currentTextureTarget = object;

  makeTabs(propsContent, [
    { id: 'transform', label: 'Transform', build: (page) => buildTransformTab(object, page) },
    { id: 'shape',     label: 'Shape',     build: (page) => buildShapeTab(object, page) },
    { id: 'textures',  label: 'Textures',  build: (page) => buildTexturesTab(object, page) }
  ]);
}
