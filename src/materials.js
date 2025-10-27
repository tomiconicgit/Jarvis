// materials.js — full transform + material controls; texture upload + procedural choices
import * as THREE from 'three';

// --- (NEW) Helper function to link a slider and a number input ---
function bindSliderAndNumber(root, sliderId, numberId, fixed = 2) {
  const slider = root.querySelector('#' + sliderId);
  const number = root.querySelector('#' + numberId);
  if (!slider || !number) return;

  // Update number when slider changes
  slider.addEventListener('input', () => {
    number.value = parseFloat(slider.value).toFixed(fixed);
  });

  // Update slider when number changes
  number.addEventListener('input', () => {
    slider.value = parseFloat(number.value);
  });
}

// --- (NEW) Helper to set value for both slider and number input ---
function setSliderAndNumber(root, baseId, value, fixed = 2) {
  const slider = root.querySelector(`#${baseId}_slider`);
  const number = root.querySelector(`#${baseId}_num`);
  if (slider) slider.value = value;
  if (number) number.value = parseFloat(value).toFixed(fixed);
}

export default {
  init(root, bus, editor){
    // --- (NEW) Rebuilt HTML with 3-column layout ---
    root.innerHTML = `
      <div class="group">
        <h3>Transform</h3>
        <div class="row">
          <label>Pos X</label>
          <input id="tx_slider" type="range" min="-50" max="50" step="0.1" value="0"/>
          <input id="tx_num" type="number" step="0.1" value="0"/>
        </div>
        <div class="row">
          <label>Pos Y</label>
          <input id="ty_slider" type="range" min="-50" max="50" step="0.1" value="0"/>
          <input id="ty_num" type="number" step="0.1" value="0"/>
        </div>
        <div class="row">
          <label>Pos Z</label>
          <input id="tz_slider" type="range" min="-50" max="50" step="0.1" value="0"/>
          <input id="tz_num" type="number" step="0.1" value="0"/>
        </div>
        <div class="row">
          <label>Tilt (X)°</label>
          <input id="rx_slider" type="range" min="-180" max="180" step="1" value="0"/>
          <input id="rx_num" type="number" step="1" value="0"/>
        </div>
        <div class="row">
          <label>Rotate (Y)°</label>
          <input id="ry_slider" type="range" min="-180" max="180" step="1" value="0"/>
          <input id="ry_num" type="number" step="1" value="0"/>
        </div>
        <div class="row">
          <label>Tilt (Z)°</label>
          <input id="rz_slider" type="range" min="-180" max="180" step="1" value="0"/>
          <input id="rz_num" type="number" step="1" value="0"/>
        </div>
        <div class="row">
          <label>Scale X</label>
          <input id="sx_slider" type="range" min="0.01" max="10" step="0.01" value="1"/>
          <input id="sx_num" type="number" step="0.01" value="1"/>
        </div>
        <div class="row">
          <label>Scale Y</label>
          <input id="sy_slider" type="range" min="0.01" max="10" step="0.01" value="1"/>
          <input id="sy_num" type="number" step="0.01" value="1"/>
        </div>
        <div class="row">
          <label>Scale Z</label>
          <input id="sz_slider" type="range" min="0.01" max="10" step="0.01" value="1"/>
          <input id="sz_num" type="number" step="0.01" value="1"/>
        </div>
        <div class="row">
          <label>Uniform</label>
          <input id="su_slider" type="range" min="0.01" max="10" step="0.01" value="1"/>
          <input id="su_num" type="number" step="0.01" value="1"/>
        </div>
        <div class="row simple">
          <label>Gizmo Mode</label>
          <select id="gmode"><option value="translate">Translate</option><option value="rotate">Rotate</option><option value="scale">Scale</option></select>
        </div>
        <div style="display:flex;gap:8px;margin-top:6px;"><button id="applyXform" class="primary">Apply</button><button id="frame">Frame</button></div>
      </div>

      <div class="group">
        <h3>Material</h3>
        <div class="row simple"><label>Color</label><input id="mColor" type="color" value="#ffffff"/></div>
        <div class="row simple"><label>Wireframe</label><select id="wire"><option>No</option><option>Yes</option></select></div>
        <div class="row simple"><label>Cast Shadows</label><select id="cast"><option>Yes</option><option>No</option></select></div>
        <div class="row simple"><label>Receive Shadows</label><select id="recv"><option>Yes</option><option>No</option></select></div>
        <div class="row">
          <label>Metalness</label>
          <input id="metal_slider" type="range" min="0" max="1" step="0.01" value="0.1"/>
          <input id="metal_num" type="number" step="0.01" value="0.1"/>
        </div>
        <div class="row">
          <label>Roughness</label>
          <input id="rough_slider" type="range" min="0" max="1" step="0.01" value="0.4"/>
          <input id="rough_num" type="number" step="0.01" value="0.4"/>
        </div>
        <div class="row">
          <label>Emissive</label>
          <input id="emis_slider" type="range" min="0" max="3" step="0.01" value="0"/>
          <input id="emis_num" type="number" step="0.01" value="0"/>
        </div>
        <div class="row simple"><label>Emissive Color</label><input id="emisC" type="color" value="#000000"/></div>
      </div>

      <div class="group">
        <h3>Texture</h3>
        <div class="row simple"><label>Upload (map)</label><input id="texUpload" type="file" accept="image/*"/></div>
        <div class="row simple"><label>Procedural</label>
          <select id="proc"><option value="none">None</option><option value="checker">Checker</option><option value="noise">Noise</option></select>
        </div>
        <small class="note">Uploading an image overrides procedural.</small>
      </div>

      <div class="group">
        <h3>Deformers</h3>
        <div class="row">
          <label>Twist (Y-axis)</label>
          <input id="deform_twist_slider" type="range" min="-360" max="360" step="1" value="0"/>
          <input id="deform_twist_num" type="number" step="1" value="0"/>
        </div>
        <div class="row">
          <label>Taper (Y-axis)</label>
          <input id="deform_taper_slider" type="range" min="0" max="3" step="0.01" value="1"/>
          <input id="deform_taper_num" type="number" step="0.01" value="1"/>
        </div>
        <div class="row">
          <label>Noise</label>
          <input id="deform_noise_slider" type="range" min="0" max="1" step="0.01" value="0"/>
          <input id="deform_noise_num" type="number" step="0.01" value="0"/>
        </div>
      </div>

      <div class="group">
        <h3>Base Geometry</h3>
        <div id="geometry-controls">
          <small class="note">Select a primitive (Box, Sphere, etc.) to see its geometry options.</small>
        </div>
      </div>
    `;

    // --- Geometry controls ---
    const geoControls = root.querySelector('#geometry-controls');

    function pushGeometryChanges(){
        const obj = editor.selected;
        if (!obj || !obj.userData.geometryParams) return;

        const params = obj.userData.geometryParams;
        const newParams = { ...params }; // copy
        
        // 1. Read Base Geometry Params
        try {
            if (params.type === 'box') {
                newParams.width = +val('geo_width_num');
                newParams.height = +val('geo_height_num');
                newParams.depth = +val('geo_depth_num');
            } else if (params.type === 'sphere') {
                newParams.radius = +val('geo_radius_num');
                newParams.widthSegments = Math.max(3, +val('geo_wsegs_num'));
                newParams.heightSegments = Math.max(2, +val('geo_hsegs_num'));
            } else if (params.type === 'cylinder') {
                newParams.radiusTop = +val('geo_rtop_num');
                newParams.radiusBottom = +val('geo_rbot_num');
                newParams.height = +val('geo_height_num');
                newParams.radialSegments = Math.max(3, +val('geo_rsegs_num'));
            } else if (params.type === 'plane') {
                newParams.width = +val('geo_width_num');
                newParams.height = +val('geo_height_num');
            }
        } catch (err) {
            console.error("Error reading base geometry params:", err);
            return;
        }

        // 2. Read Deformer Params
        const deformParams = {
            twist: +val('deform_twist_num'),
            taper: +val('deform_taper_num'),
            noise: +val('deform_noise_num')
        };
        
        // 3. Emit event for editor to rebuild
        bus.emit('rebuild-geometry', { base: newParams, deform: deformParams });
    }

    function updateGeometryUI(obj) {
        if (!obj || !obj.userData.geometryParams) {
            geoControls.innerHTML = '<small class="note">Select a primitive (Box, Sphere, etc.) to see its geometry options. Imported models cannot be modified this way.</small>';
            return;
        }

        const params = obj.userData.geometryParams;
        let html = '';

        if (params.type === 'box') {
            html = `
                <div class="row">
                  <label>Width</label>
                  <input id="geo_width_slider" type="range" min="0.1" max="20" step="0.1" value="${params.width}"/>
                  <input id="geo_width_num" type="number" step="0.1" value="${params.width}"/>
                </div>
                <div class="row">
                  <label>Height</label>
                  <input id="geo_height_slider" type="range" min="0.1" max="20" step="0.1" value="${params.height}"/>
                  <input id="geo_height_num" type="number" step="0.1" value="${params.height}"/>
                </div>
                <div class="row">
                  <label>Depth</label>
                  <input id="geo_depth_slider" type="range" min="0.1" max="20" step="0.1" value="${params.depth}"/>
                  <input id="geo_depth_num" type="number" step="0.1" value="${params.depth}"/>
                </div>
            `;
        } else if (params.type === 'sphere') {
            html = `
                <div class="row">
                  <label>Radius</label>
                  <input id="geo_radius_slider" type="range" min="0.1" max="20" step="0.1" value="${params.radius}"/>
                  <input id="geo_radius_num" type="number" step="0.1" value="${params.radius}"/>
                </div>
                <div class="row">
                  <label>Width Segs</label>
                  <input id="geo_wsegs_slider" type="range" min="3" max="64" step="1" value="${params.widthSegments}"/>
                  <input id="geo_wsegs_num" type="number" step="1" value="${params.widthSegments}"/>
                </div>
                <div class="row">
                  <label>Height Segs</label>
                  <input id="geo_hsegs_slider" type="range" min="2" max="64" step="1" value="${params.heightSegments}"/>
                  <input id="geo_hsegs_num" type="number" step="1" value="${params.heightSegments}"/>
                </div>
            `;
        } else if (params.type === 'cylinder') {
            html = `
                <div class="row">
                  <label>Radius Top</label>
                  <input id="geo_rtop_slider" type="range" min="0" max="20" step="0.1" value="${params.radiusTop}"/>
                  <input id="geo_rtop_num" type="number" step="0.1" value="${params.radiusTop}"/>
                </div>
                <div class="row">
                  <label>Radius Bot</label>
                  <input id="geo_rbot_slider" type="range" min="0" max="20" step="0.1" value="${params.radiusBottom}"/>
                  <input id="geo_rbot_num" type="number" step="0.1" value="${params.radiusBottom}"/>
                </div>
                <div class="row">
                  <label>Height</label>
                  <input id="geo_height_slider" type="range" min="0.1" max="20" step="0.1" value="${params.height}"/>
                  <input id="geo_height_num" type="number" step="0.1" value="${params.height}"/>
                </div>
                <div class="row">
                  <label>Radial Segs</label>
                  <input id="geo_rsegs_slider" type="range" min="3" max="64" step="1" value="${params.radialSegments}"/>
                  <input id="geo_rsegs_num" type="number" step="1" value="${params.radialSegments}"/>
                </div>
            `;
        } else if (params.type === 'plane') {
            html = `
                <div class="row">
                  <label>Width</label>
                  <input id="geo_width_slider" type="range" min="0.1" max="20" step="0.1" value="${params.width}"/>
                  <input id="geo_width_num" type="number" step="0.1" value="${params.width}"/>
                </div>
                <div class="row">
                  <label>Height</label>
                  <input id="geo_height_slider" type="range" min="0.1" max="20" step="0.1" value="${params.height}"/>
                  <input id="geo_height_num" type="number" step="0.1" value="${params.height}"/>
                </div>
            `;
        }

        if (html) {
            html += '<div style="margin-top:6px;"><button id="applyGeometry" class="primary">Apply Geometry</button></div>';
        }

        geoControls.innerHTML = html;
        
        if(html) {
          root.querySelector('#applyGeometry').addEventListener('click', pushGeometryChanges);
          // Bind new sliders
          if (params.type === 'box') {
            bindSliderAndNumber(root, 'geo_width_slider', 'geo_width_num', 1);
            bindSliderAndNumber(root, 'geo_height_slider', 'geo_height_num', 1);
            bindSliderAndNumber(root, 'geo_depth_slider', 'geo_depth_num', 1);
          } else if (params.type === 'sphere') {
            bindSliderAndNumber(root, 'geo_radius_slider', 'geo_radius_num', 1);
            bindSliderAndNumber(root, 'geo_wsegs_slider', 'geo_wsegs_num', 0);
            bindSliderAndNumber(root, 'geo_hsegs_slider', 'geo_hsegs_num', 0);
          } else if (params.type === 'cylinder') {
            bindSliderAndNumber(root, 'geo_rtop_slider', 'geo_rtop_num', 1);
            bindSliderAndNumber(root, 'geo_rbot_slider', 'geo_rbot_num', 1);
            bindSliderAndNumber(root, 'geo_height_slider', 'geo_height_num', 1);
            bindSliderAndNumber(root, 'geo_rsegs_slider', 'geo_rsegs_num', 0);
          } else if (params.type === 'plane') {
            bindSliderAndNumber(root, 'geo_width_slider', 'geo_width_num', 1);
            bindSliderAndNumber(root, 'geo_height_slider', 'geo_height_num', 1);
          }
        }
    }
    // --- End Geometry controls ---

    // --- (NEW) Bind all sliders to their number inputs ---
    // Transform
    bindSliderAndNumber(root, 'tx_slider', 'tx_num', 1);
    bindSliderAndNumber(root, 'ty_slider', 'ty_num', 1);
    bindSliderAndNumber(root, 'tz_slider', 'tz_num', 1);
    bindSliderAndNumber(root, 'rx_slider', 'rx_num', 0);
    bindSliderAndNumber(root, 'ry_slider', 'ry_num', 0);
    bindSliderAndNumber(root, 'rz_slider', 'rz_num', 0);
    bindSliderAndNumber(root, 'sx_slider', 'sx_num', 2);
    bindSliderAndNumber(root, 'sy_slider', 'sy_num', 2);
    bindSliderAndNumber(root, 'sz_slider', 'sz_num', 2);
    bindSliderAndNumber(root, 'su_slider', 'su_num', 2);
    // Material
    bindSliderAndNumber(root, 'metal_slider', 'metal_num', 2);
    bindSliderAndNumber(root, 'rough_slider', 'rough_num', 2);
    bindSliderAndNumber(root, 'emis_slider', 'emis_num', 2);
    // Deformers
    bindSliderAndNumber(root, 'deform_twist_slider', 'deform_twist_num', 0);
    bindSliderAndNumber(root, 'deform_taper_slider', 'deform_taper_num', 2);
    bindSliderAndNumber(root, 'deform_noise_slider', 'deform_noise_num', 2);


    /* transform + material apply */
    function readTransform(){
      return {
        position: { x: +val('tx_num'), y: +val('ty_num'), z: +val('tz_num') },
        rotation: { x: +val('rx_num'), y: +val('ry_num'), z: +val('rz_num') },
        scale:    byUniform() ? { uniform:+val('su_num') } : { x:+val('sx_num'), y:+val('sy_num'), z:+val('sz_num') }
      };
    }
    function val(id){ return root.querySelector('#'+id).value; }
    function byUniform(){ return Math.abs(+val('su_num')-1) > 1e-6; }

    root.querySelector('#applyXform').addEventListener('click', ()=> bus.emit('transform-update', readTransform()));
    root.querySelector('#frame').addEventListener('click', ()=> bus.emit('frame-selection'));
    root.querySelector('#gmode').addEventListener('change', e=> bus.emit('set-gizmo', e.target.value));

    // material bindings
    function pushMaterial(){
      const payload = {
        color: val('mColor'),
        wireframe: val('wire')==='Yes',
        castShadow: val('cast')==='Yes',
        receiveShadow: val('recv')==='Yes',
        metalness: +val('metal_num'),
        roughness: +val('rough_num'),
        emissive: +val('emis_num'),
        emissiveColor: val('emisC')
      };
      if (uploadedTex) payload.map = uploadedTex;
      else payload.map = proceduralMap();
      bus.emit('material-update', payload);
    }
    // Add listeners to all number inputs and sliders
    ['mColor','wire','cast','recv','emisC'].forEach(id => {
        root.querySelector('#'+id).addEventListener('input', pushMaterial);
    });
    ['metal', 'rough', 'emis'].forEach(id => {
        root.querySelector(`#${id}_slider`).addEventListener('input', pushMaterial);
        root.querySelector(`#${id}_num`).addEventListener('input', pushMaterial);
    });

    // textures
    let uploadedTex = null;
    const loader = new THREE.TextureLoader();
    root.querySelector('#texUpload').addEventListener('change', e=>{
      const f = e.target.files?.[0]; if(!f) return;
      const url = URL.createObjectURL(f);
      loader.load(url, tex=>{
        tex.colorSpace = THREE.SRGBColorSpace; uploadedTex = tex; pushMaterial();
        URL.revokeObjectURL(url);
      });
    });
    root.querySelector('#proc').addEventListener('change', ()=>{ uploadedTex = null; pushMaterial(); });

    function proceduralMap(){
      const mode = val('proc');
      if (mode==='checker') return makeChecker(512, 512, 32);
      if (mode==='noise')   return makeNoise(512, 512);
      return null;
    }

    // update UI when selection changes
    function fillFromSelection(obj){
      if (!obj) {
        updateGeometryUI(null); // Clear geometry panel
        return;
      }
      
      // Transform
      setSliderAndNumber(root, 'tx', obj.position.x, 1);
      setSliderAndNumber(root, 'ty', obj.position.y, 1);
      setSliderAndNumber(root, 'tz', obj.position.z, 1);
      setSliderAndNumber(root, 'rx', obj.rotation.x * 180 / Math.PI, 0);
      setSliderAndNumber(root, 'ry', obj.rotation.y * 180 / Math.PI, 0);
      setSliderAndNumber(root, 'rz', obj.rotation.z * 180 / Math.PI, 0);
      setSliderAndNumber(root, 'sx', obj.scale.x, 2);
      setSliderAndNumber(root, 'sy', obj.scale.y, 2);
      setSliderAndNumber(root, 'sz', obj.scale.z, 2);
      setSliderAndNumber(root, 'su', 1, 2); // Reset uniform slider

      // Material
      let mat = null;
      obj.traverse(o=>{ if(!mat && o.isMesh) mat = o.material; });
      if (mat){
        if (mat.color) root.querySelector('#mColor').value = '#'+mat.color.getHexString();
        root.querySelector('#wire').value = mat.wireframe ? 'Yes' : 'No';
        root.querySelector('#cast').value = obj.castShadow ? 'Yes' : 'No';
        root.querySelector('#recv').value = obj.receiveShadow ? 'Yes' : 'No';
        setSliderAndNumber(root, 'metal', mat.metalness || 0.1, 2);
        setSliderAndNumber(root, 'rough', mat.roughness || 0.4, 2);
        setSliderAndNumber(root, 'emis', mat.emissiveIntensity || 0, 2);
        root.querySelector('#emisC').value = '#'+(mat.emissive?.getHexString?.() || '000000');
      }

      // Update geometry and deformer panels
      updateGeometryUI(obj);
      const dParams = obj.userData.deformParams || { twist: 0, taper: 1, noise: 0 };
      setSliderAndNumber(root, 'deform_twist', dParams.twist, 0);
      setSliderAndNumber(root, 'deform_taper', dParams.taper, 2);
      setSliderAndNumber(root, 'deform_noise', dParams.noise, 2);
    }

    bus.on('selection-changed', obj => fillFromSelection(obj));
    // initial fill if something selected later
    if (editor.selected) fillFromSelection(editor.selected);
  }
};

/* ---------- procedural textures ---------- */
function makeChecker(w,h,size=16){
  const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d');
  for(let y=0;y<h;y+=size){
    for(let x=0;x<w;x+=size){
      const on = ((x/size + y/size) % 2)===0;
      g.fillStyle = on ? '#dfe7f3' : '#364152';
      g.fillRect(x,y,size,size);
    }
  }
  const tex=new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS=tex.wrapT=THREE.RepeatWrapping; return tex;
}
function makeNoise(w,h){
  const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d');
  const img=g.createImageData(w,h); for(let i=0;i<img.data.length;i+=4){ const v=180+Math.random()*50|0; img.data[i]=v; img.data[i+1]=v; img.data[i+2]=v; img.data[i+3]=255; }
  g.putImageData(img,0,0);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
