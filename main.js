// ===== TABBED PROPS + MATERIAL/TEXTURE HELPERS (UPDATED FOR PBR UPLOADS) =====

// Simple tab system
function makeTabs(rootEl, tabsSpec) {
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

// Collect unique THREE.Materials under an object; ensure uv2 for AO/displacement
function collectMaterialsFromObject(root) {
  const set = new Set();
  root.traverse(n => {
    if (n.isMesh && n.material) {
      if (Array.isArray(n.material)) n.material.forEach(m => m && set.add(m));
      else set.add(n.material);
      if (n.geometry?.attributes?.uv && !n.geometry.attributes.uv2) {
        // Reuse uv for aoMap/displacementMap convenience
        n.geometry.setAttribute('uv2', n.geometry.attributes.uv);
      }
    }
  });
  return Array.from(set);
}

// --- Simple procedural generators (checker / noise) ---
function makeCheckerTexture(size = 256, cells = 8) {
  const data = new Uint8Array(size * size * 3);
  const cellSize = size / cells;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.floor(x / cellSize), cy = Math.floor(y / cellSize);
      const v = (cx + cy) % 2 === 0 ? 220 : 40;
      const i = (y * size + x) * 3;
      data[i] = data[i+1] = data[i+2] = v;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function makeNoiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 3);
  for (let i = 0; i < data.length; i += 3) {
    const v = (Math.random() * 255) | 0;
    data[i] = data[i+1] = data[i+2] = v;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// --- Per-object texture override state ---
function ensureTexState(object) {
  if (!object.userData._texOverrides) object.userData._texOverrides = {
    // map slots => THREE.Texture; if present, we won't overwrite via procedural
    map: null, normalMap: null, roughnessMap: null, metalnessMap: null,
    aoMap: null, emissiveMap: null, displacementMap: null,
    // settings
    uvScale: 1, uvRotation: 0, displacementScale: 0.0
  };
  return object.userData._texOverrides;
}

// Apply UV tiling & rotation to all currently attached maps on given materials
function applyUVToAllMaps(materials, scale = 1, rotationRad = 0) {
  const apply = (tex) => {
    if (!tex) return;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(scale, scale);
    tex.center.set(0.5, 0.5);
    tex.rotation = rotationRad;
    tex.needsUpdate = true;
  };
  materials.forEach(m => {
    apply(m.map);
    apply(m.normalMap);
    apply(m.roughnessMap);
    apply(m.metalnessMap);
    apply(m.aoMap);
    apply(m.emissiveMap);
    apply(m.bumpMap);
    apply(m.displacementMap);
  });
}

// Set scalar on materials (roughness/metalness/emissiveIntensity etc.)
function setMaterialScalar(materials, key, value) {
  materials.forEach(m => {
    if (key in m) { m[key] = value; m.needsUpdate = true; }
  });
}
function setMaterialColor(materials, hex) {
  materials.forEach(m => { if (m.color) { m.color.set(hex); m.needsUpdate = true; } });
}
function setEmissive(materials, hex, intensity) {
  materials.forEach(m => {
    if (m.emissive) m.emissive.set(hex);
    if ('emissiveIntensity' in m) m.emissiveIntensity = intensity;
    m.needsUpdate = true;
  });
}

// Procedural maps application; respects object-level overrides (won’t overwrite slots with uploaded PBR)
function applyProceduralMaps(materials, { pattern = 'none', scale = 1, useAlbedo = true, useRoughness = false, useMetalness = false, useBump = false, useAO = false }, locks = {}) {
  let tex = null;
  if (pattern === 'checker') tex = makeCheckerTexture(256, 8);
  if (pattern === 'noise')   tex = makeNoiseTexture(256);
  if (tex) tex.repeat.set(scale, scale);

  const setIfFree = (slot, value) => {
    if (locks[slot]) return; // uploaded override present
    materials.forEach(m => { m[slot] = value || null; m.needsUpdate = true; });
  };

  setIfFree('map',         useAlbedo   ? tex : null);
  setIfFree('roughnessMap',useRoughness? tex : null);
  setIfFree('metalnessMap',useMetalness? tex : null);
  setIfFree('bumpMap',     useBump     ? tex : null);
  setIfFree('aoMap',       useAO       ? tex : null);
}

// Map name -> material property slot + colorSpace rule
const MAP_SLOTS = {
  albedo:   { prop: 'map',           color: true  },
  normal:   { prop: 'normalMap',     color: false },
  roughness:{ prop: 'roughnessMap',  color: false },
  metalness:{ prop: 'metalnessMap',  color: false },
  ao:       { prop: 'aoMap',         color: false },
  emissive: { prop: 'emissiveMap',   color: true  },
  height:   { prop: 'displacementMap', color: false } // a.k.a. height
};

// Load a texture from a File and assign to all materials on given slot
function uploadMapFromFile({ object, materials, file, slotName, uvScale = 1, uvRotation = 0 }) {
  return new Promise((resolve, reject) => {
    const slot = MAP_SLOTS[slotName];
    if (!slot) return reject(new Error('Unknown map slot'));

    const url = URL.createObjectURL(file);
    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      try {
        // colorSpace handling across Three.js versions
        const setSRGB = (t) => {
          if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
          else if ('encoding' in t) t.encoding = THREE.sRGBEncoding;
        };
        if (slot.color) setSRGB(tex); // albedo & emissive in sRGB; others remain linear

        // tiling/rotation
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.center.set(0.5, 0.5);
        tex.repeat.set(uvScale, uvScale);
        tex.rotation = uvRotation;

        // optional anisotropy
        if (typeof renderer?.capabilities?.getMaxAnisotropy === 'function') {
          tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        }

        // assign to all materials
        materials.forEach(m => { m[slot.prop] = tex; m.needsUpdate = true; });

        // record override on object (so procedurals don't overwrite)
        const st = ensureTexState(object);
        // dispose previous override if any
        if (st[slot.prop] && st[slot.prop] !== tex) { st[slot.prop].dispose?.(); }
        st[slot.prop] = tex;
        st.uvScale = uvScale;
        st.uvRotation = uvRotation;

        URL.revokeObjectURL(url);
        resolve();
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    }, undefined, (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    });
  });
}

// Clear a single slot override (and remove from materials)
function clearOverrideSlot(object, materials, slotName) {
  const slot = MAP_SLOTS[slotName];
  const st = ensureTexState(object);
  const tex = st[slot.prop];
  if (tex) tex.dispose?.();
  st[slot.prop] = null;
  materials.forEach(m => { m[slot.prop] = null; m.needsUpdate = true; });
}

// Clear all overrides
function clearAllOverrides(object, materials) {
  const st = ensureTexState(object);
  ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','displacementMap'].forEach(k => {
    if (st[k]) st[k].dispose?.();
    st[k] = null;
  });
  materials.forEach(m => {
    m.map = m.normalMap = m.roughnessMap = m.metalnessMap = m.aoMap = m.emissiveMap = m.displacementMap = null;
    m.needsUpdate = true;
  });
}

// ---------------- Transform tab (unchanged) ----------------
function buildTransformTab(object, page) {
  const toRow = (id, label, min, max, step, value) => `
    <div class="space-y-1">
      <label class="text-sm font-medium flex justify-between">
        <span>${label}</span><span id="${id}-val">${value}</span>
      </label>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">
    </div>`;
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
  const setLbl = (id, v) => page.querySelector(`#${id}-val`).textContent = (typeof v === 'number' ? v.toFixed(2) : v);
  const link = (id, fn) => page.querySelector('#'+id).addEventListener('input', e => { fn(parseFloat(e.target.value)); setLbl(id, parseFloat(e.target.value)); if (transformControls) transformControls.update(); });
  link('tx', v => object.position.x = v);
  link('ty', v => object.position.y = v);
  link('tz', v => object.position.z = v);
  link('rx', v => object.rotation.x = THREE.MathUtils.degToRad(v));
  link('ry', v => object.rotation.y = THREE.MathUtils.degToRad(v));
  link('rz', v => object.rotation.z = THREE.MathUtils.degToRad(v));
  link('sx', v => object.scale.x = v);
  link('sy', v => object.scale.y = v);
  link('sz', v => object.scale.z = v);
  page.querySelector('#reset-pos').addEventListener('click', () => { object.position.set(0,0,0); ['tx','ty','tz'].forEach(id=>{page.querySelector('#'+id).value=0; setLbl(id,0);}); });
  page.querySelector('#reset-rot').addEventListener('click', () => { object.rotation.set(0,0,0); ['rx','ry','rz'].forEach(id=>{page.querySelector('#'+id).value=0; setLbl(id,0);}); });
  page.querySelector('#reset-scl').addEventListener('click', () => { object.scale.set(1,1,1); ['sx','sy','sz'].forEach(id=>{page.querySelector('#'+id).value=1; setLbl(id,1);}); });
}

// ---------------- Shape tab (same as you had; shortened here for brevity) ----------------
// Keep your existing buildShapeTab from the previous answer.
// (No PBR-related changes needed there.)

// ---------------- Textures tab (UPDATED: uploads + UV controls + override rules) ----------------
function buildTexturesTab(object, page) {
  const mats = collectMaterialsFromObject(object);
  const rep = mats[0] || {};
  const st = ensureTexState(object);

  const colorHex    = rep?.color ? `#${rep.color.getHexString()}` : '#cccccc';
  const emissiveHex = rep?.emissive ? `#${rep.emissive.getHexString()}` : '#000000';
  const rough = ('roughness' in rep) ? rep.roughness : 0.8;
  const metal = ('metalness' in rep) ? rep.metalness : 0.1;
  const emisI = ('emissiveIntensity' in rep) ? rep.emissiveIntensity : 0.0;

  page.innerHTML = `
    <div class="space-y-4">
      <!-- Color + PBR sliders -->
      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">Base Color
          <input type="color" id="mat-color" class="block mt-1 w-full h-9 bg-gray-800 border-0 rounded" value="${colorHex}">
        </label>
        <label class="text-sm font-medium">Emissive
          <input type="color" id="mat-emissive" class="block mt-1 w-full h-9 bg-gray-800 border-0 rounded" value="${emissiveHex}">
        </label>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-medium flex justify-between"><span>Roughness</span><span id="rough-val">${rough.toFixed(2)}</span></label>
          <input type="range" id="mat-rough" min="0" max="1" step="0.01" value="${rough}">
        </div>
        <div>
          <label class="text-sm font-medium flex justify-between"><span>Metalness</span><span id="metal-val">${metal.toFixed(2)}</span></label>
          <input type="range" id="mat-metal" min="0" max="1" step="0.01" value="${metal}">
        </div>
      </div>
      <div>
        <label class="text-sm font-medium flex justify-between"><span>Emissive Intensity</span><span id="emi-val">${emisI.toFixed(2)}</span></label>
        <input type="range" id="mat-emi" min="0" max="10" step="0.05" value="${emisI}">
      </div>

      <!-- Procedural maps -->
      <div class="mt-2 border-t border-white/10 pt-3">
        <div class="grid grid-cols-2 gap-3">
          <label class="text-sm font-medium">Pattern
            <select id="tex-pattern" class="block mt-1 w-full bg-gray-800 rounded p-2">
              <option value="none">None</option>
              <option value="checker">Checker</option>
              <option value="noise">Noise</option>
            </select>
          </label>
          <label class="text-sm font-medium">Scale
            <input type="range" id="tex-scale" min="0.25" max="8" step="0.25" value="${st.uvScale || 1}">
          </label>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
          <label class="flex items-center gap-2"><input type="checkbox" id="use-albedo" checked> Albedo (Color)</label>
          <label class="flex items-center gap-2"><input type="checkbox" id="use-rough"> Roughness Map</label>
          <label class="flex items-center gap-2"><input type="checkbox" id="use-metal"> Metalness Map</label>
          <label class="flex items-center gap-2"><input type="checkbox" id="use-bump"> Bump (Normal-ish)</label>
          <label class="flex items-center gap-2"><input type="checkbox" id="use-ao"> AO Map</label>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button id="apply-tex" class="px-3 py-2 rounded bg-blue-600 font-semibold">Apply Procedural</button>
          <button id="clear-proc" class="px-3 py-2 rounded bg-gray-700">Clear Procedural (Unlocked)</button>
        </div>
      </div>

      <!-- PBR uploads -->
      <div class="mt-3 border-t border-white/10 pt-3">
        <h4 class="text-sm font-bold mb-2">Upload PBR Maps (overrides procedural on that slot)</h4>
        <div class="grid grid-cols-2 gap-2" id="pbr-grid"></div>
        <div class="mt-2 grid grid-cols-2 gap-3">
          <label class="text-sm font-medium">UV Repeat
            <input type="range" id="uv-scale" min="0.25" max="8" step="0.25" value="${st.uvScale || 1}">
          </label>
          <label class="text-sm font-medium">UV Rotation°
            <input type="range" id="uv-rot" min="0" max="360" step="1" value="${THREE.MathUtils.radToDeg(st.uvRotation || 0)}">
          </label>
        </div>
        <div class="mt-2">
          <label class="text-sm font-medium flex justify-between"><span>Displacement Scale</span><span id="disp-val">${(st.displacementScale || 0).toFixed(2)}</span></label>
          <input type="range" id="disp-scale" min="0" max="1" step="0.01" value="${st.displacementScale || 0}">
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button id="clear-all-pbr" class="px-3 py-2 rounded bg-red-600">Clear All PBR Maps</button>
        </div>
      </div>
    </div>
  `;

  // Color/PBR scalar events
  page.querySelector('#mat-color').addEventListener('input', e => setMaterialColor(mats, e.target.value));
  page.querySelector('#mat-emissive').addEventListener('input', e => setEmissive(mats, e.target.value, parseFloat(page.querySelector('#mat-emi').value)));
  page.querySelector('#mat-rough').addEventListener('input', e => { const v=parseFloat(e.target.value); setMaterialScalar(mats,'roughness',v); page.querySelector('#rough-val').textContent=v.toFixed(2); });
  page.querySelector('#mat-metal').addEventListener('input', e => { const v=parseFloat(e.target.value); setMaterialScalar(mats,'metalness',v); page.querySelector('#metal-val').textContent=v.toFixed(2); });
  page.querySelector('#mat-emi').addEventListener('input',   e => { const v=parseFloat(e.target.value); setEmissive(mats, page.querySelector('#mat-emissive').value, v); page.querySelector('#emi-val').textContent=v.toFixed(2); });

  // Procedural apply respecting overrides
  const procApply = () => {
    const pattern = page.querySelector('#tex-pattern').value;
    const scale   = parseFloat(page.querySelector('#tex-scale').value);
    const locks = {
      map:         !!st.map,
      roughnessMap:!!st.roughnessMap,
      metalnessMap:!!st.metalnessMap,
      bumpMap:     false,              // we don't override bump map via uploads directly
      aoMap:       !!st.aoMap
    };
    applyProceduralMaps(
      mats,
      {
        pattern,
        scale,
        useAlbedo:   page.querySelector('#use-albedo').checked,
        useRoughness:page.querySelector('#use-rough').checked,
        useMetalness:page.querySelector('#use-metal').checked,
        useBump:     page.querySelector('#use-bump').checked,
        useAO:       page.querySelector('#use-ao').checked
      },
      locks
    );
    st.uvScale = scale;
    applyUVToAllMaps(mats, st.uvScale, st.uvRotation || 0);
  };
  page.querySelector('#apply-tex').addEventListener('click', procApply);
  page.querySelector('#clear-proc').addEventListener('click', () => {
    // Clear only procedural slots that are NOT locked by uploads
    if (!st.map)         mats.forEach(m=> m.map=null);
    if (!st.roughnessMap)mats.forEach(m=> m.roughnessMap=null);
    if (!st.metalnessMap)mats.forEach(m=> m.metalnessMap=null);
    if (!st.aoMap)       mats.forEach(m=> m.aoMap=null);
    mats.forEach(m=> m.needsUpdate=true);
  });

  // --- PBR Upload UI ---
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
      const scale = parseFloat(page.querySelector('#uv-scale').value);
      const rot   = THREE.MathUtils.degToRad(parseFloat(page.querySelector('#uv-rot').value));
      try {
        await uploadMapFromFile({ object, materials: mats, file: f, slotName, uvScale: scale, uvRotation: rot });
        applyUVToAllMaps(mats, scale, rot);
      } catch (err) {
        console.error('Texture upload failed:', err);
      } finally {
        inp.value = '';
      }
    });
    clr.addEventListener('click', () => clearOverrideSlot(object, mats, slotName));
  };

  makeUploadRow('Albedo (Base Color)', 'albedo');
  makeUploadRow('Normal',             'normal');
  makeUploadRow('Roughness',          'roughness');
  makeUploadRow('Metalness',          'metalness');
  makeUploadRow('AO (Ambient Occlusion)', 'ao');
  makeUploadRow('Emissive',           'emissive');
  makeUploadRow('Height (Displacement)', 'height');

  // UV tiling & rotation apply to whatever maps are present
  const uvScaleEl = page.querySelector('#uv-scale');
  const uvRotEl   = page.querySelector('#uv-rot');
  const syncUV = () => {
    const scale = parseFloat(uvScaleEl.value);
    const rot   = THREE.MathUtils.degToRad(parseFloat(uvRotEl.value));
    st.uvScale = scale;
    st.uvRotation = rot;
    applyUVToAllMaps(mats, scale, rot);
  };
  uvScaleEl.addEventListener('input', syncUV);
  uvRotEl.addEventListener('input', syncUV);

  // Displacement scale
  const dispEl = page.querySelector('#disp-scale');
  const dispLbl = page.querySelector('#disp-val');
  dispEl.addEventListener('input', () => {
    const v = parseFloat(dispEl.value);
    st.displacementScale = v;
    setMaterialScalar(mats, 'displacementScale', v);
    dispLbl.textContent = v.toFixed(2);
  });
  // Initialize current displacement scale on materials
  setMaterialScalar(mats, 'displacementScale', st.displacementScale || 0);

  // Clear all PBR
  page.querySelector('#clear-all-pbr').addEventListener('click', () => {
    clearAllOverrides(object, mats);
  });
}

// -----------------------------
// Properties Panel (TABBED) — UPDATED to use new Textures tab
// -----------------------------
function updatePropsPanel(object) {
  propsContent.innerHTML = '';
  if (!object) {
    propsContent.innerHTML = '<p class="text-gray-400">No selection.</p>';
    return;
  }
  makeTabs(propsContent, [
    { id: 'transform', label: 'Transform', build: (page) => buildTransformTab(object, page) },
    { id: 'shape',     label: 'Shape',     build: (page) => buildShapeTab(object, page) }, // keep your existing Shape builder
    { id: 'textures',  label: 'Textures',  build: (page) => buildTexturesTab(object, page) }
  ]);
}