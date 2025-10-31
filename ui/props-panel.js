// File: ui/props-panel.js
import * as THREE from 'three';
import { OBJECT_DEFINITIONS } from '../objects/object-manifest.js';
// --- FIX: Changed import to avoid circular dependency ---
import * as SceneManager from '../core/scene-manager.js';

// --- Texture Globals ---
const textureLoader = new THREE.TextureLoader();
// ... (rest of texture globals are all correct)
const presetTextureCache = new Map();
const PRESET_TEXTURES = {
  'none': { name: 'None', preview: '', albedo: null, normal: null, roughness: null, metalness: null, ao: null, displacement: null, roughnessScalar: 0.8, metalnessScalar: 0.1 },
  'rustymetal': { name: 'Rusty Metal', preview: 'textures/rustymetal/rustymetal.png', albedo: 'textures/rustymetal/rustymetal_albedo.png', normal: 'textures/rustymetal/rustymetal_normal.png', roughness: 'textures/rustymetal/rustymetal_roughness.png', metalness: null, ao: 'textures/rustymetal/rustymetal_ao.png', displacement: 'textures/rustymetal/rustymetal_displacement.png', roughnessScalar: 1.0, metalnessScalar: 1.0 },
  'road': { name: 'Road', preview: 'textures/road/road.png', albedo: 'textures/road/road_albedo.png', normal: 'textures/road/road_normal.png', roughness: 'textures/road/road_roughness.png', metalness: null, ao: null, displacement: 'textures/road/road_displacement.png', roughnessScalar: 1.0, metalnessScalar: 0.1 }
};

// --- Tab System ---
function makeTabs(rootEl, tabsSpec) {
  // ... (this function is correct)
  const header = document.createElement('div');
  header.className = 'flex gap-2 mb-3 sticky top-0 bg-[rgba(30,30,30,0.9)] pt-1 pb-2 z-10';
  const contentWrap = document.createElement('div');
  contentWrap.className = 'mt-1';
  const pages = new Map();
  let currentId = tabsSpec[0].id;

  tabsSpec.forEach(tab => {
    const btn = document.createElement('button');
    btn.textContent = tab.label;
    btn.className = 'px-3 py-1.5 rounded-md text-sm bg-gray-700 data-[active=true]:bg-blue-600 font-semibold';
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
function collectMaterialsFromObject(root) {
  // ... (this function is correct)
  const set = new Set();
  root.traverse(n => {
    if (n.isMesh && n.material) {
      if (Array.isArray(n.material)) n.material.forEach(m => m && set.add(m));
      else set.add(n.material);
      if (n.geometry?.attributes?.uv && !n.geometry.attributes.uv2) {
        n.geometry.setAttribute('uv2', n.geometry.attributes.uv);
      }
    }
  });
  return Array.from(set);
}

export function ensureTexState(object) {
  // ... (this function is correct)
  if (!object.userData._texOverrides) object.userData._texOverrides = {
    map: null, normalMap: null, roughnessMap: null, metalnessMap: null,
    aoMap: null, emissiveMap: null, displacementMap: null,
    uvScale: 1, uvRotation: 0, displacementScale: 0.0,
    activePreset: 'none', activeAlbedo: 'none'
  };
  return object.userData._texOverrides;
}

function applyUVToAllMaps(materials, scale = 1, rotationRad = 0) {
  // ... (this function is correct)
  const apply = (tex) => {
    if (!tex) return;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(scale, scale);
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
  // ... (this function is correct)
  materials.forEach(m => {
    if (key in m) { m[key] = value; m.needsUpdate = true; }
  });
}

const MAP_SLOTS = {
  // ... (this map is correct)
  albedo:   { prop: 'map',             color: true  },
  normal:   { prop: 'normalMap',       color: false },
  roughness:{ prop: 'roughnessMap',    color: false },
  metalness:{ prop: 'metalnessMap',    color: false },
  ao:       { prop: 'aoMap',           color: false },
  emissive: { prop: 'emissiveMap',     color: true  },
  height:   { prop: 'displacementMap', color: false }
};

function applyTextureFromURL({ object, materials, url, slotName, uvScale, uvRotation, isPreset = false }) {
  return new Promise((resolve, reject) => {
    // ... (rest of function is correct)
    const slot = MAP_SLOTS[slotName];
    if (!slot) return reject(new Error('Unknown map slot'));
    const st = ensureTexState(object);

    const applyTex = (tex) => {
      try {
        const setSRGB = (t) => {
          if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
          else if ('encoding' in t) t.encoding = THREE.sRGBEncoding;
        };
        if (slot.color) setSRGB(tex);

        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.center.set(0.5, 0.5);
        tex.repeat.set(uvScale, uvScale);
        tex.rotation = uvRotation;
        tex.needsUpdate = true;
        // --- FIX: Use SceneManager.renderer ---
        if (typeof SceneManager.renderer?.capabilities?.getMaxAnisotropy === 'function') {
          tex.anisotropy = Math.min(8, SceneManager.renderer.capabilities.getMaxAnisotropy());
        }
        materials.forEach(m => { m[slot.prop] = tex; m.needsUpdate = true; });

        const oldTex = st[slot.prop];
        if (oldTex && oldTex !== tex && !Array.from(presetTextureCache.values()).includes(oldTex)) {
          oldTex.dispose?.();
        }
        st[slot.prop] = tex;
        st.uvScale = uvScale;
        st.uvRotation = uvRotation;
        resolve(tex);
      } catch (e) { reject(e); }
    };

    const cacheKey = isPreset ? url : null;
    let cachedTex = cacheKey ? presetTextureCache.get(cacheKey) : null;

    if (cachedTex) {
      applyTex(cachedTex);
    } else {
      textureLoader.load(url, (tex) => {
        if (cacheKey) presetTextureCache.set(cacheKey, tex);
        applyTex(tex);
      }, undefined, (err) => {
        console.error('Failed to load texture:', url, err);
        reject(err);
      });
    }
  });
}

function uploadMapFromFile({ object, materials, file, slotName, uvScale = 1, uvRotation = 0 }) {
  // ... (this function is correct)
  const url = URL.createObjectURL(file);
  return applyTextureFromURL({ object, materials, url, slotName, uvScale, uvRotation, isPreset: false })
    .finally(() => { URL.revokeObjectURL(url); });
}

function clearOverrideSlot(object, materials, slotName) {
  // ... (this function is correct)
  const slot = MAP_SLOTS[slotName];
  const st = ensureTexState(object);
  const tex = st[slot.prop];
  if (tex && !Array.from(presetTextureCache.values()).includes(tex)) {
    tex.dispose?.();
  }
  st[slot.prop] = null;
  materials.forEach(m => { m[slot.prop] = null; m.needsUpdate = true; });
}

function clearAllOverrides(object, materials) {
  // ... (this function is correct)
  const st = ensureTexState(object);
  for (const slotName of Object.keys(MAP_SLOTS)) {
    const slot = MAP_SLOTS[slotName];
    const tex = st[slot.prop];
    if (tex && !Array.from(presetTextureCache.values()).includes(tex)) {
      tex.dispose?.();
    }
    st[slot.prop] = null;
    materials.forEach(m => { m[slot.prop] = null; m.needsUpdate = true; });
  }
  const preset = PRESET_TEXTURES['none'];
  setMaterialScalar(materials, 'roughness', preset.roughnessScalar);
  setMaterialScalar(materials, 'metalness', preset.metalnessScalar);
}

async function applyPreset(object, materials, presetKey, page) {
  // ... (this function is correct)
  const preset = PRESET_TEXTURES[presetKey];
  if (!preset) return;

  const st = ensureTexState(object);
  st.activePreset = presetKey;
  st.activeAlbedo = presetKey;
  clearAllOverrides(object, materials);
  const uvScale = st.uvScale;
  const uvRotation = st.uvRotation;
  const texturePromises = [];

  for (const slotName of Object.keys(MAP_SLOTS)) {
    const url = preset[slotName];
    if (url) {
      texturePromises.push(
        applyTextureFromURL({ object, materials, url, slotName, uvScale, uvRotation, isPreset: true })
      );
    }
  }
  await Promise.all(texturePromises);
  setMaterialScalar(materials, 'roughness', preset.roughnessScalar);
  setMaterialScalar(materials, 'metalness', preset.metalnessScalar);
  
  const roughSlider = page.querySelector('#mat-rough-slider');
  const roughNumber = page.querySelector('#mat-rough-val');
  const metalSlider = page.querySelector('#mat-metal-slider');
  const metalNumber = page.querySelector('#mat-metal-val');
  const albedoSelect = page.querySelector('#albedo-override-select');
  
  if (roughSlider) roughSlider.value = preset.roughnessScalar;
  if (roughNumber) roughNumber.value = preset.roughnessScalar.toFixed(2);
  if (metalSlider) metalSlider.value = preset.metalnessScalar;
  if (metalNumber) metalNumber.value = preset.metalnessScalar.toFixed(2);
  if (albedoSelect) albedoSelect.value = presetKey;
}

async function applyAlbedoOverride(object, materials, albedoKey) {
  // ... (this function is correct)
  const preset = PRESET_TEXTURES[albedoKey];
  if (!preset) return;
  const st = ensureTexState(object);
  st.activeAlbedo = albedoKey;
  const uvScale = st.uvScale;
  const uvRotation = st.uvRotation;
  const slotName = 'albedo';
  
  if (preset.albedo) {
    await applyTextureFromURL({ object, materials, url: preset.albedo, slotName, uvScale, uvRotation, isPreset: true });
  } else {
    clearOverrideSlot(object, materials, slotName);
  }
}

// --- Tab Builder Functions ---

function buildTransformTab(object, page) {
  const numberInputClasses = "w-20 text-right bg-gray-800 rounded px-2 py-0.5 text-sm";
  const toRow = (id, label, min, max, step, value) => `
    <div class="space-y-1">
      <label class="text-sm font-medium flex justify-between items-center">
        <span>${label}</span>
        <input type="number" id="${id}-val" class="${numberInputClasses}" min="${min}" max="${max}" step="${step}" value="${value}">
      </label>
      <input type="range" id="${id}-slider" min="${min}" max="${max}" step="${step}" value="${value}">
    </div>`;

  // --- FIX: Replaced Â° with ° ---
  page.innerHTML = `
    <div class="grid grid-cols-3 gap-3">
      ${toRow('tx','Pos X', -100,100,0.1, object.position.x.toFixed(2))}
      ${toRow('ty','Pos Y', -100,100,0.1, object.position.y.toFixed(2))}
      ${toRow('tz','Pos Z', -100,100,0.1, object.position.z.toFixed(2))}
    </div>
    <div class="grid grid-cols-3 gap-3 mt-3">
      ${toRow('rx','Rot X°', -180,180,1, THREE.MathUtils.radToDeg(object.rotation.x).toFixed(0))}
      ${toRow('ry','Rot Y°', -180,180,1, THREE.MathUtils.radToDeg(object.rotation.y).toFixed(0))}
      ${toRow('rz','Rot Z°', -180,180,1, THREE.MathUtils.radToDeg(object.rotation.z).toFixed(0))}
    </div>
    <div class="grid grid-cols-3 gap-3 mt-3">
      ${toRow('sx','Scale X', 0.01,20,0.01, object.scale.x.toFixed(2))}
      ${toRow('sy','Scale Y', 0.01,20,0.01, object.scale.y.toFixed(2))}
      ${toRow('sz','Scale Z', 0.01,20,0.01, object.scale.z.toFixed(2))}
    </div>
    <div class="mt-3 flex gap-2">
      <button id="reset-pos" class="px-3 py-2 rounded bg-gray-700">Reset Pos</button>
      <button id="reset-rot" class="px-3 py-2 rounded bg-gray-700">Reset Rot</button>
      <button id="reset-scl" class="px-3 py-2 rounded bg-gray-700">Reset Scale</button>
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
      // --- FIX: Use SceneManager.transformControls ---
      if (SceneManager.transformControls) SceneManager.transformControls.update();
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
      // --- FIX: Use SceneManager.transformControls ---
      if (SceneManager.transformControls) SceneManager.transformControls.update();
    };
    number.addEventListener('change', updateFromNumber);
    number.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); updateFromNumber(); number.blur(); }
    });
  };
  // ... (rest of link calls are correct)
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
    // --- FIX: Use SceneManager.transformControls ---
    if (SceneManager.transformControls) SceneManager.transformControls.update();
  };
  // ... (rest of reset calls are correct)
  page.querySelector('#reset-pos').addEventListener('click', () => reset(['tx','ty','tz'], 0, v => object.position.set(v,v,v)));
  page.querySelector('#reset-rot').addEventListener('click', () => reset(['rx','ry','rz'], 0, v => object.rotation.set(v,v,v)));
  page.querySelector('#reset-scl').addEventListener('click', () => reset(['sx','sy','sz'], 1, v => object.scale.set(v,v,v)));
}

function buildShapeTab(object, page) {
  // ... (this function is correct)
  const type = object.userData.type;
  const def = OBJECT_DEFINITIONS.find(d => d.type === type);

  if (def && def.buildShapeTab) {
    def.buildShapeTab(object, page);
  } else {
    page.innerHTML = '<p class="text-gray-400">No shape parameters for this object.</p>';
  }
}

function buildTexturesTab(object, page) {
  // ... (this function is correct, but I'll fix the typo)
  const mats = collectMaterialsFromObject(object);
  const rep = mats[0] || {};
  const st = ensureTexState(object);
  const numberInputClasses = "w-20 text-right bg-gray-800 rounded px-2 py-0.5 text-sm";
  const presetKey = st.activePreset || 'none';
  const preset = PRESET_TEXTURES[presetKey] || PRESET_TEXTURES['none'];
  const rough = ('roughness' in rep) ? rep.roughness : preset.roughnessScalar;
  const metal = ('metalness' in rep) ? rep.metalness : preset.metalnessScalar;

  // --- FIX: Replaced Â° with ° ---
  page.innerHTML = `
    <div class="space-y-4">
      <div>
        <h4 class="text-sm font-bold mb-2">Preset Materials</h4>
        <div id="preset-scroller" class="flex overflow-x-auto gap-2 p-2 bg-gray-900 rounded-lg"></div>
      </div>
      <div>
        <label class="text-sm font-medium">Albedo (Color) Override
          <select id="albedo-override-select" class="block mt-1 w-full bg-gray-800 rounded p-2 text-sm"></select>
        </label>
      </div>
      <div class="mt-2 border-t border-white/10 pt-3">
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
        <h4 class="text-sm font-bold mb-2">Tiling & Displacement</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-sm font-medium flex justify-between items-center">
              <span>UV Repeat</span>
              <input type="number" id="uv-scale-val" class="${numberInputClasses}" min="0.1" max="50" step="0.1" value="${st.uvScale.toFixed(1)}">
            </label>
            <input type="range" id="uv-scale-slider" min="0.1" max="50" step="0.1" value="${st.uvScale}">
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium flex justify-between items-center">
              <span>UV Rotation °</span>
              <input type="number" id="uv-rot-val" class="${numberInputClasses}" min="0" max="360" step="1" value="${Math.round(THREE.MathUtils.radToDeg(st.uvRotation || 0))}">
            </label>
            <input type="range" id="uv-rot-slider" min="0" max="360" step="1" value="${THREE.MathUtils.radToDeg(st.uvRotation || 0)}">
          </div>
        </div>
        <div class="mt-2 space-y-1">
          <label class="text-sm font-medium flex justify-between items-center">
            <span>Displacement Scale</span>
            <input type="number" id="disp-scale-val" class="${numberInputClasses}" min="0" max="1" step="0.01" value="${(st.displacementScale || 0).toFixed(2)}">
          </label>
          <input type="range" id="disp-scale-slider" min="0" max="1" step="0.01" value="${st.displacementScale || 0}">
        </div>
      </div>
      <div class="mt-3 border-t border-white/10 pt-3">
        <h4 class="text-sm font-bold mb-2">Manual PBR Upload (Overrides Presets)</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" id="pbr-grid"></div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button id="clear-all-pbr" class="px-3 py-2 rounded bg-red-600 text-sm">Clear All Textures</button>
        </div>
      </div>
    </div>
  `;
  // ... (rest of the function is correct)
  // --- Populate Presets ---
  const presetScroller = page.querySelector('#preset-scroller');
  for (const [key, preset] of Object.entries(PRESET_TEXTURES)) {
    const btn = document.createElement('button');
    btn.className = `flex-shrink-0 w-24 h-24 p-1.5 rounded-lg bg-gray-700 flex flex-col items-center justify-center gap-1 border-2 ${st.activePreset === key ? 'border-blue-500' : 'border-transparent'}`;
    btn.dataset.presetKey = key;
    btn.innerHTML = preset.preview ? `
      <img src="${preset.preview}" class="w-16 h-16 object-cover rounded-md pointer-events-none">
      <span class="text-xs font-medium pointer-events-none">${preset.name}</span>` : `
      <div class="w-16 h-16 rounded-md bg-gray-800 flex items-center justify-center text-gray-500">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
      </div>
      <span class="text-xs font-medium pointer-events-none">${preset.name}</span>`;
    btn.addEventListener('click', () => {
      presetScroller.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500'));
      btn.classList.add('border-blue-500');
      applyPreset(object, mats, key, page);
    });
    presetScroller.appendChild(btn);
  }

  // --- Populate Albedo Override ---
  const albedoSelect = page.querySelector('#albedo-override-select');
  for (const [key, preset] of Object.entries(PRESET_TEXTURES)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = preset.name + (preset.albedo ? ' Albedo' : ' (None)');
    if (key === st.activeAlbedo) opt.selected = true;
    albedoSelect.appendChild(opt);
  }
  albedoSelect.addEventListener('change', (e) => {
    applyAlbedoOverride(object, mats, e.target.value);
  });

  // --- Link Sliders ---
  const linkSimple = (idBase, formatFn, updateFn) => {
    const slider = page.querySelector(`#${idBase}-slider`);
    const number = page.querySelector(`#${idBase}-val`);
    if (!slider || !number) return;
    let isManualEdit = false;
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      number.value = formatFn(val);
      isManualEdit = true;
      updateFn(val);
    });
    slider.addEventListener('change', () => {
        if (isManualEdit) {
            st.activePreset = 'none'; st.activeAlbedo = 'none';
            presetScroller.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500'));
            isManualEdit = false;
        }
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
      st.activePreset = 'none'; st.activeAlbedo = 'none';
      presetScroller.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500'));
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
    const scale = parseFloat(page.querySelector('#uv-scale-slider').value);
    const rotDeg = parseFloat(page.querySelector('#uv-rot-slider').value);
    const rotRad = THREE.MathUtils.degToRad(rotDeg);
    st.uvScale = scale;
    st.uvRotation = rotRad;
    applyUVToAllMaps(mats, scale, rotRad);
  };
  linkSimple('uv-scale', formatF1, syncUV);
  linkSimple('uv-rot', formatF0, syncUV);
  linkSimple('disp-scale', formatF2, v => {
    st.displacementScale = v;
    setMaterialScalar(mats, 'displacementScale', v);
  });

  // --- PBR Upload Rows ---
  const pbrGrid = page.querySelector('#pbr-grid');
  const makeUploadRow = (label, slotName) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 bg-gray-700 rounded px-2 py-2';
    row.innerHTML = `
      <span class="text-sm flex-1">${label}</span>
      <input type="file" id="file-${slotName}" class="hidden" accept="image/*">
      <button class="px-2 py-1 bg-gray-800 rounded text-sm" id="btn-${slotName}">Upload</button>
      <button class="px-2 py-1 bg-gray-800 rounded text-sm" id="clr-${slotName}">Clear</button>
    `;
    pbrGrid.appendChild(row);

    const btn = row.querySelector(`#btn-${slotName}`);
    const inp = row.querySelector(`#file-${slotName}`);
    const clr = row.querySelector(`#clr-${slotName}`);

    btn.addEventListener('click', () => inp.click());
    inp.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      st.activePreset = 'none'; st.activeAlbedo = 'none';
      presetScroller.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500'));
      albedoSelect.value = 'none';
      const scale = parseFloat(page.querySelector('#uv-scale-slider').value);
      const rot = THREE.MathUtils.degToRad(parseFloat(page.querySelector('#uv-rot-slider').value));
      try {
        await uploadMapFromFile({ object, materials: mats, file: f, slotName, uvScale: scale, uvRotation: rot });
      } catch (err) { console.error('Texture upload failed:', err); } 
      finally { inp.value = ''; }
    });
    clr.addEventListener('click', () => {
      clearOverrideSlot(object, mats, slotName);
      st.activePreset = 'none'; st.activeAlbedo = 'none';
      presetScroller.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500'));
      albedoSelect.value = 'none';
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
  page.querySelector('#clear-all-pbr').addEventListener('click', () => {
    clearAllOverrides(object, mats);
    st.activePreset = 'none'; st.activeAlbedo = 'none';
    presetScroller.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500'));
    presetScroller.querySelector('button[data-preset-key="none"]').classList.add('border-blue-500');
    albedoSelect.value = 'none';
    const { roughnessScalar, metalnessScalar } = PRESET_TEXTURES['none'];
    page.querySelector('#mat-rough-slider').value = roughnessScalar;
    page.querySelector('#mat-rough-val').value = roughnessScalar.toFixed(2);
    page.querySelector('#mat-metal-slider').value = metalnessScalar;
    page.querySelector('#mat-metal-val').value = metalnessScalar.toFixed(2);
  });
}


// --- Main Panel Update Function ---
export function updatePropsPanel(object) {
  // ... (this function is correct)
  const propsContent = document.getElementById('props-content');
  if (!propsContent) return;
  propsContent.innerHTML = '';
  
  if (!object) {
    propsContent.innerHTML = '<p class="text-gray-400">No selection.</p>';
    return;
  }

  makeTabs(propsContent, [
    { id: 'transform', label: 'Transform', build: (page) => buildTransformTab(object, page) },
    { id: 'shape',     label: 'Shape',     build: (page) => buildShapeTab(object, page) },
    { id: 'textures',  label: 'Textures',  build: (page) => buildTexturesTab(object, page) }
  ]);
}
