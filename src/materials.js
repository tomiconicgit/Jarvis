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
    if (isNaN(val)) val = 0;
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
          <h3>PBR Maps (from Device)</h3>
          <div class="row"><label>Albedo (Color)</label><input type="file" id="tex_albedo" accept="image/png, image/jpeg"></div>
          <div class="row"><label>Normal</label><input type="file" id="tex_normal" accept="image/png, image/jpeg"></div>
          <div class="row"><label>Roughness</label><input type="file" id="tex_rough" accept="image/png, image/jpeg"></div>
          <div class="row"><label>Metalness</label><input type="file" id="tex_metal" accept="image/png, image/jpeg"></div>
          <div class="row"><label>Ambient Occl.</label><input type="file" id="tex_ao" accept="image/png, image/jpeg"></div>
          <div class="btnbar" style="margin-top:12px;">
            <button id="texClearBtn">Clear All</button>
            <button id="texLoadBtn" class="primary">Load Textures</button>
          </div>
          <small class="note">Applies to the first standard material on the object. Clears old textures.</small>
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

    const inputs = {
      albedo: root.querySelector('#tex_albedo'),
      normal: root.querySelector('#tex_normal'),
      rough: root.querySelector('#tex_rough'),
      metal: root.querySelector('#tex_metal'),
      ao: root.querySelector('#tex_ao'),
      
      ru_r: root.querySelector('#tex_repeatU_range'), ru_n: root.querySelector('#tex_repeatU_num'),
      rv_r: root.querySelector('#tex_repeatV_range'), rv_n: root.querySelector('#tex_repeatV_num'),
      
      loadBtn: root.querySelector('#texLoadBtn'),
      clearBtn: root.querySelector('#texClearBtn'),
    };
    
    let currentMaterial = null;

    async function applyTextures() {
      if (!currentMaterial) return;
      
      this.textContent = 'Loading...';
      this.disabled = true;

      const getUrl = (fileInput) => {
        const file = fileInput.files[0];
        return file ? URL.createObjectURL(file) : null;
      };

      const [map, normalMap, roughnessMap, metalnessMap, aoMap] = await Promise.all([
        loadTexture(getUrl(inputs.albedo), true), // sRGB
        loadTexture(getUrl(inputs.normal)),
        loadTexture(getUrl(inputs.rough)),
        loadTexture(getUrl(inputs.metal)),
        loadTexture(getUrl(inputs.ao)),
      ]);
      
      // Assign new textures (only if a new one was loaded)
      // This allows adding one texture at a time
      if (map) { currentMaterial.map?.dispose(); currentMaterial.map = map; }
      if (normalMap) { currentMaterial.normalMap?.dispose(); currentMaterial.normalMap = normalMap; }
      if (roughnessMap) { currentMaterial.roughnessMap?.dispose(); currentMaterial.roughnessMap = roughnessMap; }
      if (metalnessMap) { currentMaterial.metalnessMap?.dispose(); currentMaterial.metalnessMap = metalnessMap; }
      if (aoMap) { currentMaterial.aoMap?.dispose(); currentMaterial.aoMap = aoMap; }
      
      // Update UVs for all textures
      updateUVs();

      currentMaterial.needsUpdate = true;
      
      // Clear the file inputs
      inputs.albedo.value = '';
      inputs.normal.value = '';
      inputs.rough.value = '';
      inputs.metal.value = '';
      inputs.ao.value = '';
      
      this.textContent = 'Load Textures';
      this.disabled = false;
      
      bus.emit('history-push', 'Apply Textures');
    }
    
    function clearTextures() {
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
        
        bus.emit('history-push', 'Clear Textures');
    }

    function updateUVs() {
      if (!currentMaterial) return;

      const u = parseFloat(inputs.ru_n.value);
      const v = parseFloat(inputs.rv_n.value);

      const maps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'];
      maps.forEach(m => {
        if (currentMaterial[m]) {
          currentMaterial[m].repeat.set(u, v);
        }
      });
    }

    // Link sliders to UV update function
    linkSlider(inputs.ru_r, inputs.ru_n, 2, () => updateUVs());
    linkSlider(inputs.rv_r, inputs.rv_n, 2, () => updateUVs());
    
    // Link buttons
    inputs.loadBtn.addEventListener('click', applyTextures);
    inputs.clearBtn.addEventListener('click', clearTextures);

    // Update UI on selection change
    bus.on('selection-changed', (ent) => {
      if (!ent) {
        ui.style.display = 'none';
        placeholder.style.display = 'block';
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

      // Update sliders to match material's current state
      const u = mat.map?.repeat.x || 1.0;
      const v = mat.map?.repeat.y || 1.0;
      inputs.ru_r.value = u; inputs.ru_n.value = u.toFixed(2);
      inputs.rv_r.value = v; inputs.rv_n.value = v.toFixed(2);
      
      // Clear texture URL inputs
      inputs.albedo.value = '';
      inputs.normal.value = '';
      inputs.rough.value = '';
      inputs.metal.value = '';
      inputs.ao.value = '';
    });
  }
};
