// materials.js — transform + material + advanced geometry (freeze-safe)
import * as THREE from 'three';

/* ---------- helpers (no event ping-pong) ---------- */
function bindSliderAndNumber(root, sliderId, numberId, fixed = 2) {
  const slider = root.querySelector('#' + sliderId);
  const number = root.querySelector('#' + numberId);
  if (!slider || !number) return;

  // initial sync
  number.value = Number(slider.value).toFixed(fixed);

  slider.addEventListener('input', () => {
    number.value = Number(slider.value).toFixed(fixed);
  });

  number.addEventListener('input', () => {
    const v = Number(number.value);
    if (!Number.isFinite(v)) return;
    const min = slider.min !== '' ? Number(slider.min) : -Infinity;
    const max = slider.max !== '' ? Number(slider.max) :  Infinity;
    slider.value = String(Math.min(max, Math.max(min, v)));
  });
}

function setSliderAndNumber(root, baseId, value, fixed = 2) {
  const s = root.querySelector(`#${baseId}_slider`);
  const n = root.querySelector(`#${baseId}_num`);
  if (s) s.value = value;
  if (n) n.value = Number(value).toFixed(fixed);
}

/* raf throttles */
let _tfTick = false, _matTick = false, _geoTick = false;

export default {
  init(root, bus, editor){
    root.innerHTML = `
      <div class="group">
        <h3>Transform</h3>
        <div class="row"><label>Pos X</label><input id="tx_slider" type="range" min="-50" max="50" step="0.1" value="0"/><input id="tx_num" type="number" step="0.1" value="0"/></div>
        <div class="row"><label>Pos Y</label><input id="ty_slider" type="range" min="-50" max="50" step="0.1" value="0"/><input id="ty_num" type="number" step="0.1" value="0"/></div>
        <div class="row"><label>Pos Z</label><input id="tz_slider" type="range" min="-50" max="50" step="0.1" value="0"/><input id="tz_num" type="number" step="0.1" value="0"/></div>
        <div class="row"><label>Tilt X (deg)</label><input id="rx_slider" type="range" min="-180" max="180" step="1" value="0"/><input id="rx_num" type="number" step="1" value="0"/></div>
        <div class="row"><label>Rotate Y (deg)</label><input id="ry_slider" type="range" min="-180" max="180" step="1" value="0"/><input id="ry_num" type="number" step="1" value="0"/></div>
        <div class="row"><label>Tilt Z (deg)</label><input id="rz_slider" type="range" min="-180" max="180" step="1" value="0"/><input id="rz_num" type="number" step="1" value="0"/></div>
        <div class="row"><label>Scale X</label><input id="sx_slider" type="range" min="0.01" max="10" step="0.01" value="1"/><input id="sx_num" type="number" step="0.01" value="1"/></div>
        <div class="row"><label>Scale Y</label><input id="sy_slider" type="range" min="0.01" max="10" step="0.01" value="1"/><input id="sy_num" type="number" step="0.01" value="1"/></div>
        <div class="row"><label>Scale Z</label><input id="sz_slider" type="range" min="0.01" max="10" step="0.01" value="1"/><input id="sz_num" type="number" step="0.01" value="1"/></div>
        <div class="row"><label>Uniform</label><input id="su_slider" type="range" min="0.01" max="10" step="0.01" value="1"/><input id="su_num" type="number" step="0.01" value="1"/></div>
        <div class="row simple"><label>Gizmo Mode</label><select id="gmode"><option value="translate">Translate</option><option value="rotate">Rotate</option><option value="scale">Scale</option></select></div>
        <div style="display:flex;gap:8px;margin-top:6px;"><button id="frame">Frame</button></div>
      </div>

      <div class="group">
        <h3>Material</h3>
        <div class="row simple"><label>Color</label><input id="mColor" type="color" value="#ffffff"/></div>
        <div class="row simple"><label>Wireframe</label><select id="wire"><option>No</option><option>Yes</option></select></div>
        <div class="row simple"><label>Cast Shadows</label><select id="cast"><option>Yes</option><option>No</option></select></div>
        <div class="row simple"><label>Receive Shadows</label><select id="recv"><option>Yes</option><option>No</option></select></div>
        <div class="row"><label>Metalness</label><input id="metal_slider" type="range" min="0" max="1" step="0.01" value="0.1"/><input id="metal_num" type="number" step="0.01" value="0.1"/></div>
        <div class="row"><label>Roughness</label><input id="rough_slider" type="range" min="0" max="1" step="0.01" value="0.4"/><input id="rough_num" type="number" step="0.01" value="0.4"/></div>
        <div class="row"><label>Emissive</label><input id="emis_slider" type="range" min="0" max="3" step="0.01" value="0"/><input id="emis_num" type="number" step="0.01" value="0"/></div>
        <div class="row simple"><label>Emissive Color</label><input id="emisC" type="color" value="#000000"/></div>
      </div>

      <div class="group">
        <h3>Texture</h3>
        <div class="row simple"><label>Upload (map)</label><input id="texUpload" type="file" accept="image/*"/></div>
        <div class="row simple"><label>Procedural</label><select id="proc"><option value="none">None</option><option value="checker">Checker</option><option value="noise">Noise</option></select></div>
        <small class="note">Uploading an image overrides procedural.</small>
      </div>

      <div class="group">
        <h3>Advanced Geometry</h3>
        <div id="geometry-controls"><small class="note">Select a primitive to edit base geometry.</small></div>
        <div class="row"><label>Hollow (thickness)</label><input id="adv_hollow_slider" type="range" min="0" max="0.5" step="0.01" value="0"/><input id="adv_hollow_num" type="number" step="0.01" value="0"/></div>
        <div class="row"><label>Slant X (shear)</label><input id="adv_shearX_slider" type="range" min="-0.5" max="0.5" step="0.005" value="0"/><input id="adv_shearX_num" type="number" step="0.005" value="0"/></div>
        <div class="row"><label>Slant Z (shear)</label><input id="adv_shearZ_slider" type="range" min="-0.5" max="0.5" step="0.005" value="0"/><input id="adv_shearZ_num" type="number" step="0.005" value="0"/></div>
        <div class="row"><label>Twist (deg)</label><input id="deform_twist_slider" type="range" min="-360" max="360" step="1" value="0"/><input id="deform_twist_num" type="number" step="1" value="0"/></div>
        <div class="row"><label>Taper (Y)</label><input id="deform_taper_slider" type="range" min="0" max="3" step="0.01" value="1"/><input id="deform_taper_num" type="number" step="0.01" value="1"/></div>
        <div class="row"><label>Noise</label><input id="deform_noise_slider" type="range" min="0" max="1" step="0.01" value="0"/><input id="deform_noise_num" type="number" step="0.01" value="0"/></div>
      </div>

      <div class="group">
        <h3>Base Geometry</h3>
        <div id="base-geo"></div>
      </div>
    `;

    const geoControls = root.querySelector('#base-geo');

    /* ---------- base geometry UI ---------- */
    function updateGeometryUI(obj) {
      if (!obj || !obj.userData.geometryParams) {
        geoControls.innerHTML = '<small class="note">Select a primitive (Box, Sphere, Cylinder, Plane) to see geometry options. Imported meshes are not parametric.</small>';
        return;
      }
      const p = obj.userData.geometryParams;
      let html = '';

      if (p.type === 'box') {
        html = `
          <div class="row"><label>Width</label><input id="geo_width_slider" type="range" min="0.1" max="50" step="0.1" value="${p.width}"/><input id="geo_width_num" type="number" step="0.1" value="${p.width}"/></div>
          <div class="row"><label>Height</label><input id="geo_height_slider" type="range" min="0.1" max="50" step="0.1" value="${p.height}"/><input id="geo_height_num" type="number" step="0.1" value="${p.height}"/></div>
          <div class="row"><label>Depth</label><input id="geo_depth_slider" type="range" min="0.1" max="50" step="0.1" value="${p.depth}"/><input id="geo_depth_num" type="number" step="0.1" value="${p.depth}"/></div>
        `;
      } else if (p.type === 'sphere') {
        html = `
          <div class="row"><label>Radius</label><input id="geo_radius_slider" type="range" min="0.1" max="50" step="0.1" value="${p.radius}"/><input id="geo_radius_num" type="number" step="0.1" value="${p.radius}"/></div>
          <div class="row"><label>Width Segs</label><input id="geo_wsegs_slider" type="range" min="3" max="128" step="1" value="${p.widthSegments}"/><input id="geo_wsegs_num" type="number" step="1" value="${p.widthSegments}"/></div>
          <div class="row"><label>Height Segs</label><input id="geo_hsegs_slider" type="range" min="2" max="128" step="1" value="${p.heightSegments}"/><input id="geo_hsegs_num" type="number" step="1" value="${p.heightSegments}"/></div>
        `;
      } else if (p.type === 'cylinder') {
        html = `
          <div class="row"><label>Radius Top</label><input id="geo_rtop_slider" type="range" min="0" max="50" step="0.1" value="${p.radiusTop}"/><input id="geo_rtop_num" type="number" step="0.1" value="${p.radiusTop}"/></div>
          <div class="row"><label>Radius Bot</label><input id="geo_rbot_slider" type="range" min="0" max="50" step="0.1" value="${p.radiusBottom}"/><input id="geo_rbot_num" type="number" step="0.1" value="${p.radiusBottom}"/></div>
          <div class="row"><label>Height</label><input id="geo_height_slider" type="range" min="0.1" max="100" step="0.1" value="${p.height}"/><input id="geo_height_num" type="number" step="0.1" value="${p.height}"/></div>
          <div class="row"><label>Radial Segs</label><input id="geo_rsegs_slider" type="range" min="3" max="128" step="1" value="${p.radialSegments}"/><input id="geo_rsegs_num" type="number" step="1" value="${p.radialSegments}"/></div>
        `;
      } else if (p.type === 'plane') {
        html = `
          <div class="row"><label>Width</label><input id="geo_width_slider" type="range" min="0.1" max="100" step="0.1" value="${p.width}"/><input id="geo_width_num" type="number" step="0.1" value="${p.width}"/></div>
          <div class="row"><label>Height</label><input id="geo_height_slider" type="range" min="0.1" max="100" step="0.1" value="${p.height}"/><input id="geo_height_num" type="number" step="0.1" value="${p.height}"/></div>
        `;
      }

      geoControls.innerHTML = html;

      const ids = [];
      if (p.type==='box'){ ids.push('geo_width','geo_height','geo_depth'); }
      if (p.type==='sphere'){ ids.push('geo_radius','geo_wsegs','geo_hsegs'); }
      if (p.type==='cylinder'){ ids.push('geo_rtop','geo_rbot','geo_height','geo_rsegs'); }
      if (p.type==='plane'){ ids.push('geo_width','geo_height'); }
      ids.forEach(base=>{
        bindSliderAndNumber(root, `${base}_slider`, `${base}_num`, base.includes('segs')?0:1);
        root.querySelector(`#${base}_slider`)?.addEventListener('input', pushGeometryChanges);
        root.querySelector(`#${base}_num`)?.addEventListener('input', pushGeometryChanges);
      });
    }

    function pushGeometryChanges(){
      if (_geoTick) return;
      _geoTick = true;
      requestAnimationFrame(() => {
        _geoTick = false;

        const obj = editor.selected; if (!obj || !obj.userData.geometryParams) return;
        const p = { ...obj.userData.geometryParams };
        const v = id => parseFloat(root.querySelector('#'+id)?.value ?? p[id]);

        if (p.type==='box'){ p.width=v('geo_width_num'); p.height=v('geo_height_num'); p.depth=v('geo_depth_num'); }
        if (p.type==='sphere'){ p.radius=v('geo_radius_num'); p.widthSegments=Math.max(3, v('geo_wsegs_num')); p.heightSegments=Math.max(2, v('geo_hsegs_num')); }
        if (p.type==='cylinder'){
          p.radiusTop=v('geo_rtop_num'); p.radiusBottom=v('geo_rbot_num');
          p.height=v('geo_height_num'); p.radialSegments=Math.max(3, v('geo_rsegs_num'));
        }
        if (p.type==='plane'){ p.width=v('geo_width_num'); p.height=v('geo_height_num'); }

        const deform = {
          hollow: +root.querySelector('#adv_hollow_num').value,
          shearX: +root.querySelector('#adv_shearX_num').value,
          shearZ: +root.querySelector('#adv_shearZ_num').value,
          twist:  +root.querySelector('#deform_twist_num').value,
          taper:  +root.querySelector('#deform_taper_num').value,
          noise:  +root.querySelector('#deform_noise_num').value
        };

        bus.emit('rebuild-geometry', { base: p, deform });
      });
    }

    /* ---------- binds ---------- */

    // transform — live, throttled
    [
      'tx','ty','tz','rx','ry','rz','sx','sy','sz','su'
    ].forEach(base=>{
      bindSliderAndNumber(root, `${base}_slider`, `${base}_num`, base.startsWith('s')?2:(base.startsWith('r')?0:1));
      root.querySelector(`#${base}_slider`)?.addEventListener('input', pushTransform);
      root.querySelector(`#${base}_num`)?.addEventListener('input', pushTransform);
    });

    function readTransform(){
      return {
        position: { x:+val('tx_num'), y:+val('ty_num'), z:+val('tz_num') },
        rotation: { x:+val('rx_num'), y:+val('ry_num'), z:+val('rz_num') },
        scale: Math.abs(+val('su_num')-1) > 1e-6
          ? { uniform:+val('su_num') }
          : { x:+val('sx_num'), y:+val('sy_num'), z:+val('sz_num') }
      };
    }
    function val(id){ return root.querySelector('#'+id).value; }
    function pushTransform(){
      if (_tfTick) return;
      _tfTick = true;
      requestAnimationFrame(() => {
        _tfTick = false;
        bus.emit('transform-update', readTransform());
      });
    }

    root.querySelector('#frame').addEventListener('click', ()=> bus.emit('frame-selection'));
    root.querySelector('#gmode').addEventListener('change', e=> bus.emit('set-gizmo', e.target.value));

    // material — live, throttled
    function pushMaterial(){
      if (_matTick) return;
      _matTick = true;
      requestAnimationFrame(() => {
        _matTick = false;
        const payload = {
          color: val('mColor'),
          wireframe: val('wire')==='Yes',
          castShadow: val('cast')==='Yes',
          receiveShadow: val('recv')==='Yes',
          metalness: +val('metal_num'),
          roughness: +val('rough_num'),
          emissive: +val('emis_num'),
          emissiveColor: val('emisC'),
          map: uploadedTex || proceduralMap()
        };
        bus.emit('material-update', payload);
      });
    }
    ['mColor','wire','cast','recv','emisC'].forEach(id=>{
      root.querySelector('#'+id)?.addEventListener('input', pushMaterial);
    });
    ['metal','rough','emis'].forEach(id=>{
      bindSliderAndNumber(root, `${id}_slider`, `${id}_num`, 2);
      root.querySelector(`#${id}_slider`)?.addEventListener('input', pushMaterial);
      root.querySelector(`#${id}_num`)?.addEventListener('input', pushMaterial);
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
      if (mode==='checker') return makeChecker(512,512,32);
      if (mode==='noise')   return makeNoise(512,512);
      return null;
    }

    // advanced geometry binds
    ['adv_hollow','adv_shearX','adv_shearZ','deform_twist','deform_taper','deform_noise'].forEach(base=>{
      bindSliderAndNumber(root, `${base}_slider`, `${base}_num`, base.includes('twist')?0: (base.includes('taper')||base.includes('hollow')?2:3));
      root.querySelector(`#${base}_slider`)?.addEventListener('input', pushGeometryChanges);
      root.querySelector(`#${base}_num`)?.addEventListener('input', pushGeometryChanges);
    });

    /* update UI on selection */
    function fillFromSelection(obj){
      if (!obj) {
        updateGeometryUI(null);
        return;
      }
      // transform snapshot
      setSliderAndNumber(root, 'tx', obj.position.x, 1);
      setSliderAndNumber(root, 'ty', obj.position.y, 1);
      setSliderAndNumber(root, 'tz', obj.position.z, 1);
      setSliderAndNumber(root, 'rx', obj.rotation.x * 180 / Math.PI, 0);
      setSliderAndNumber(root, 'ry', obj.rotation.y * 180 / Math.PI, 0);
      setSliderAndNumber(root, 'rz', obj.rotation.z * 180 / Math.PI, 0);
      setSliderAndNumber(root, 'sx', obj.scale.x, 2);
      setSliderAndNumber(root, 'sy', obj.scale.y, 2);
      setSliderAndNumber(root, 'sz', obj.scale.z, 2);
      setSliderAndNumber(root, 'su', 1, 2);

      // material
      let mat = null;
      obj.traverse(o=>{ if(!mat && o.isMesh) mat = o.material; });
      if (mat){
        if (mat.color) root.querySelector('#mColor').value = '#'+mat.color.getHexString();
        root.querySelector('#wire').value = mat.wireframe ? 'Yes' : 'No';
        root.querySelector('#cast').value = obj.castShadow ? 'Yes' : 'No';
        root.querySelector('#recv').value = obj.receiveShadow ? 'Yes' : 'No';
        setSliderAndNumber(root, 'metal', mat.metalness ?? 0.1, 2);
        setSliderAndNumber(root, 'rough', mat.roughness ?? 0.4, 2);
        setSliderAndNumber(root, 'emis', mat.emissiveIntensity || 0, 2);
        root.querySelector('#emisC').value = '#'+(mat.emissive?.getHexString?.() || '000000');
      }

      // base + advanced geometry
      updateGeometryUI(obj);
      const d = obj.userData.deformParams || { hollow:0, shearX:0, shearZ:0, twist:0, taper:1, noise:0 };
      setSliderAndNumber(root, 'adv_hollow', d.hollow, 2);
      setSliderAndNumber(root, 'adv_shearX', d.shearX, 3);
      setSliderAndNumber(root, 'adv_shearZ', d.shearZ, 3);
      setSliderAndNumber(root, 'deform_twist', d.twist, 0);
      setSliderAndNumber(root, 'deform_taper', d.taper, 2);
      setSliderAndNumber(root, 'deform_noise', d.noise, 2);
    }

    bindSliderAndNumber(root, 'tx_slider','tx_num',1); // harmless duplicate bind protection

    bus.on('selection-changed', obj => fillFromSelection(obj));
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
  const img=g.createImageData(w,h);
  for(let i=0;i<img.data.length;i+=4){ const v=180+Math.random()*50|0; img.data[i]=v; img.data[i+1]=v; img.data[i+2]=v; img.data[i+3]=255; }
  g.putImageData(img,0,0);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}