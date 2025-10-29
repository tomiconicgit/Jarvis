/*
File: src/materials.js
*/
// UI for the Materials tab
import * as THREE from 'three';

// --- Helpers (copied from inspector.js) ---

function createSliderRow(id, label, min, max, step, val, dp = 2) {
  return `
    <div class="row slider">
      <label for="${id}_range">${label}</label>
      <input type="range" id="${id}_range" min="${min}" max="${max}" step="${step}" value="${val}">
      <input type="number" id="${id}_num" min="${min}" max="${max}" step="${step}" value="${val}">
    </div>
  `;
}

function linkSlider(range, num, dp, callback) {
  range.addEventListener('input', () => {
    const val = parseFloat(range.value);
    num.value = val.toFixed(dp);
    callback(val);
  });
  num.addEventListener('change', () => { // Use 'change' to avoid firing while typing
    let val = parseFloat(num.value);
    if (isNaN(val)) val = parseFloat(range.min); // Use min if NaN
    const min = parseFloat(num.min);
    const max = parseFloat(num.max);
    if (val < min) val = min;
    if (val > max) val = max;
    num.value = val.toFixed(dp);
    range.value = val;
    callback(val);
  });
}

// --- Texture Loading ---
const textureLoader = new THREE.TextureLoader();

function loadTexture(url, srgb = false) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve(null);
    textureLoader.load(
      url,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        if (srgb) {
          texture.colorSpace = THREE.SRGBColorSpace;
        }
        if (url.startsWith('blob:')) { // Revoke blob URLs after load
          URL.revokeObjectURL(url);
        }
        resolve(texture);
      },
      undefined,
      (err) => {
        console.error('Texture load failed:', url, err);
        __logErr(`Failed to load texture: ${url}`);
        if (url.startsWith('blob:')) { // Also revoke on error
          URL.revokeObjectURL(url);
        }
        resolve(null); // Resolve with null so one bad texture doesn't stop others
      }
    );
  });
}

/**
 * Finds the first MeshStandardMaterial on an object.
 * This avoids overwriting special materials like glass.
 */
function findFirstStandardMaterial(object) {
  let targetMat = null;
  object.traverse((o) => {
    if (targetMat) return;
    if (o.isMesh && o.material) {
      if (Array.isArray(o.material)) {
        targetMat = o.material.find(m => m.isMeshStandardMaterial);
      } else if (o.material.isMeshStandardMaterial) {
        targetMat = o.material;
      }
    }
  });
  return targetMat;
}

export default {
  init(root, bus, State) {
    root.innerHTML = `
      <div id="materials-ui" style="display: none;">

        <div class="group">
          <h3>Procedural PBR</h3>
          <div class="row">
            <label for="mat_albedo">Albedo</label>
            <input type="color" id="mat_albedo" value="#ffffff">
          </div>
          ${createSliderRow('mat_metal', 'Metalness', 0.0, 1.0, 0.01, 0.1, 2)}
          ${createSliderRow('mat_rough', 'Roughness', 0.0, 1.0, 0.01, 0.4, 2)}
          ${createSliderRow('mat_ao', 'AO Intensity', 0.0, 1.0, 0.01, 1.0, 2)}
          <hr style="margin: 15px 0; border-color: var(--panel-border);">
          <div class="row">
            <label for="mat_emissive">Emissive</label>
            <input type="color" id="mat_emissive" value="#000000">
          </div>
          ${createSliderRow('mat_emissiveInt', 'Emissive Intensity', 0.0, 5.0, 0.05, 0.0, 2)}
          <small class="note">These values apply directly, overriding textures if both are set.</small>
        </div>
        <div class="group">
          <h3>PBR Maps (from Device)</h3>
          <div class="row"><label>Albedo (Color)</label><input type="file" id="tex_albedo" accept="image/png, image/jpeg"></div>
          <div class="row"><label>Normal</label><input type="file" id="tex_normal" accept="image/png, image/jpeg"></div>
          <div class="row"><label>Roughness</label><input type="file" id="tex_rough" accept="image/png, image/jpeg"></div>
          <div class="row"><label>Metalness</label><input type="file" id="tex_metal" accept="image/png, image/jpeg"></div>
          <div class="row"><label>Ambient Occl.</label><input type="file" id="tex_ao" accept="image/png, image/jpeg"></div>
          <div class="btnbar" style="margin-top:12px;">
            <button id="texClearBtn">Clear Maps</button>
            <button id="texLoadBtn" class="primary">Load Textures</button>
          </div>
          <small class="note">Applies to the first standard material. Clears old maps before loading.</small>
        </div>
        <div class="group">
          <h3>UV Tiling</h3>
          ${createSliderRow('tex_repeatU', 'Repeat U', 0.1, 20, 0.1, 1, 2)}
          ${createSliderRow('tex_repeatV', 'Repeat V', 0.1, 20, 0.1, 1, 2)}
        </div>
      </div>
      <div id="materials-placeholder" class="group">
        <h3>Materials</h3>
        <div>No object selected.</div>
      </div>
    `;

    const ui = root.querySelector('#materials-ui');
    const placeholder = root.querySelector('#materials-placeholder');

    // Texture Inputs
    const texInputs = {
      albedo: root.querySelector('#tex_albedo'),
      normal: root.querySelector('#tex_normal'),
      rough: root.querySelector('#tex_rough'),
      metal: root.querySelector('#tex_metal'),
      ao: root.querySelector('#tex_ao'),
      loadBtn: root.querySelector('#texLoadBtn'),
      clearBtn: root.querySelector('#texClearBtn'),
      ru_r: root.querySelector('#tex_repeatU_range'), ru_n: root.querySelector('#tex_repeatU_num'),
      rv_r: root.querySelector('#tex_repeatV_range'), rv_n: root.querySelector('#tex_repeatV_num'),
    };

    // --- NEW: Procedural Inputs ---
    const procInputs = {
      albedo: root.querySelector('#mat_albedo'),
      metal_r: root.querySelector('#mat_metal_range'), metal_n: root.querySelector('#mat_metal_num'),
      rough_r: root.querySelector('#mat_rough_range'), rough_n: root.querySelector('#mat_rough_num'),
      ao_r: root.querySelector('#mat_ao_range'), ao_n: root.querySelector('#mat_ao_num'),
      emissive: root.querySelector('#mat_emissive'),
      emissiveInt_r: root.querySelector('#mat_emissiveInt_range'), emissiveInt_n: root.querySelector('#mat_emissiveInt_num'),
    };
    // --- END NEW ---

    let currentMaterial = null;

    // --- Texture Functions ---
    async function applyTextures() {
       if (!currentMaterial) return;

       this.textContent = 'Loading...';
       this.disabled = true;

       const getUrl = (fileInput) => {
         const file = fileInput.files[0];
         return file ? URL.createObjectURL(file) : null;
       };

       // Clear existing maps first
       clearTextureMaps(false); // Don't push history yet

       const [map, normalMap, roughnessMap, metalnessMap, aoMap] = await Promise.all([
         loadTexture(getUrl(texInputs.albedo), true), // sRGB
         loadTexture(getUrl(texInputs.normal)),
         loadTexture(getUrl(texInputs.rough)),
         loadTexture(getUrl(texInputs.metal)),
         loadTexture(getUrl(texInputs.ao)),
       ]);

       // Assign new textures
       currentMaterial.map = map;
       currentMaterial.normalMap = normalMap;
       currentMaterial.roughnessMap = roughnessMap;
       currentMaterial.metalnessMap = metalnessMap;
       currentMaterial.aoMap = aoMap;

       // Update UVs for new textures
       updateUVs();

       currentMaterial.needsUpdate = true;

       // Clear the file inputs
       texInputs.albedo.value = '';
       texInputs.normal.value = '';
       texInputs.rough.value = '';
       texInputs.metal.value = '';
       texInputs.ao.value = '';

       this.textContent = 'Load Textures';
       this.disabled = false;

       bus.emit('history-push', 'Apply Textures');
     }

    function clearTextureMaps(pushHistory = true) {
        if (!currentMaterial) return;

        currentMaterial.map?.dispose();
        currentMaterial.normalMap?.dispose();
        currentMaterial.roughnessMap?.dispose();
        currentMaterial.metalnessMap?.dispose();
        currentMaterial.aoMap?.dispose();

        currentMaterial.map = null;
        currentMaterial.normalMap = null;
        currentMaterial.roughnessMap = null;
        currentMaterial.metalnessMap = null;
        currentMaterial.aoMap = null;
        currentMaterial.needsUpdate = true;

        if (pushHistory) {
            bus.emit('history-push', 'Clear Textures');
        }
    }

    function updateUVs() {
      if (!currentMaterial) return;

      const u = parseFloat(texInputs.ru_n.value);
      const v = parseFloat(texInputs.rv_n.value);

      const maps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'];
      maps.forEach(m => {
        if (currentMaterial[m]) {
          currentMaterial[m].repeat.set(u, v);
        }
      });
    }

    // Link Texture buttons/sliders
    texInputs.loadBtn.addEventListener('click', applyTextures);
    texInputs.clearBtn.addEventListener('click', () => clearTextureMaps(true));
    linkSlider(texInputs.ru_r, texInputs.ru_n, 2, () => {
        updateUVs();
        bus.emit('history-push-debounced', 'UV Tiling');
    });
    linkSlider(texInputs.rv_r, texInputs.rv_n, 2, () => {
        updateUVs();
        bus.emit('history-push-debounced', 'UV Tiling');
    });

    // --- NEW: Procedural PBR Functions ---
    function updateProceduralPBR() {
        if (!currentMaterial) return;
        currentMaterial.color.set(procInputs.albedo.value);
        currentMaterial.metalness = parseFloat(procInputs.metal_n.value);
        currentMaterial.roughness = parseFloat(procInputs.rough_n.value);
        currentMaterial.aoMapIntensity = parseFloat(procInputs.ao_n.value); // Use intensity, no map needed
        currentMaterial.emissive.set(procInputs.emissive.value);
        currentMaterial.emissiveIntensity = parseFloat(procInputs.emissiveInt_n.value);
        currentMaterial.needsUpdate = true;
        bus.emit('history-push-debounced', 'Material Edit');
    }

    // Link Procedural inputs
    procInputs.albedo.addEventListener('input', updateProceduralPBR);
    linkSlider(procInputs.metal_r, procInputs.metal_n, 2, updateProceduralPBR);
    linkSlider(procInputs.rough_r, procInputs.rough_n, 2, updateProceduralPBR);
    linkSlider(procInputs.ao_r, procInputs.ao_n, 2, updateProceduralPBR);
    procInputs.emissive.addEventListener('input', updateProceduralPBR);
    linkSlider(procInputs.emissiveInt_r, procInputs.emissiveInt_n, 2, updateProceduralPBR);
    // --- END NEW ---


    // --- Update UI on Selection ---
    bus.on('selection-changed', (ent) => {
      if (!ent) {
        ui.style.display = 'none';
        placeholder.style.display = 'block';
        placeholder.innerHTML = '<div class="group"><h3>Materials</h3><div>No object selected.</div></div>';
        currentMaterial = null;
        return;
      }

      const mat = findFirstStandardMaterial(ent.object);

      if (!mat) {
        ui.style.display = 'none';
        placeholder.innerHTML = '<div class="group"><h3>Materials</h3><div>Selected object has no standard material to edit.</div></div>';
        placeholder.style.display = 'block';
        currentMaterial = null;
        return;
      }

      currentMaterial = mat;
      ui.style.display = 'block';
      placeholder.style.display = 'none';

      // Update UV sliders
      const u = mat.map?.repeat.x || 1.0;
      const v = mat.map?.repeat.y || 1.0;
      texInputs.ru_r.value = u; texInputs.ru_n.value = u.toFixed(2);
      texInputs.rv_r.value = v; texInputs.rv_n.value = v.toFixed(2);

      // Clear texture file inputs
      texInputs.albedo.value = '';
      texInputs.normal.value = '';
      texInputs.rough.value = '';
      texInputs.metal.value = '';
      texInputs.ao.value = '';

      // --- NEW: Update Procedural Inputs ---
      procInputs.albedo.value = `#${mat.color.getHexString()}`;
      procInputs.metal_r.value = mat.metalness; procInputs.metal_n.value = mat.metalness.toFixed(2);
      procInputs.rough_r.value = mat.roughness; procInputs.rough_n.value = mat.roughness.toFixed(2);
      procInputs.ao_r.value = mat.aoMapIntensity; procInputs.ao_n.value = mat.aoMapIntensity.toFixed(2);
      procInputs.emissive.value = `#${mat.emissive.getHexString()}`;
      procInputs.emissiveInt_r.value = mat.emissiveIntensity; procInputs.emissiveInt_n.value = mat.emissiveIntensity.toFixed(2);
      // --- END NEW ---
    });
  }
};
