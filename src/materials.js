// materials.js — full transform + material controls; texture upload + procedural choices
import * as THREE from 'three';

export default {
  init(root, bus, editor){
    root.innerHTML = `
      <div class="group">
        <h3>Transform</h3>
        <div class="row"><label>Pos X</label><input id="tx" type="number" step="0.1" value="0"/></div>
        <div class="row"><label>Pos Y</label><input id="ty" type="number" step="0.1" value="0"/></div>
        <div class="row"><label>Pos Z</label><input id="tz" type="number" step="0.1" value="0"/></div>
        <div class="row"><label>Tilt (X)°</label><input id="rx" type="number" step="1" value="0"/></div>
        <div class="row"><label>Rotate (Y)°</label><input id="ry" type="number" step="1" value="0"/></div>
        <div class="row"><label>Tilt (Z)°</label><input id="rz" type="number" step="1" value="0"/></div>
        <div class="row"><label>Scale X</label><input id="sx" type="number" step="0.01" value="1"/></div>
        <div class="row"><label>Scale Y</label><input id="sy" type="number" step="0.01" value="1"/></div>
        <div class="row"><label>Scale Z</label><input id="sz" type="number" step="0.01" value="1"/></div>
        <div class="row"><label>Uniform</label><input id="su" type="range" min="0.01" max="10" step="0.01" value="1"/><output id="suOut">1.00</output></div>
        <div class="row"><label>Gizmo Mode</label>
          <select id="gmode"><option value="translate">Translate</option><option value="rotate">Rotate</option><option value="scale">Scale</option></select>
        </div>
        <div style="display:flex;gap:8px;margin-top:6px;"><button id="applyXform" class="primary">Apply</button><button id="frame">Frame</button></div>
      </div>

      <div class="group">
        <h3>Material</h3>
        <div class="row"><label>Color</label><input id="mColor" type="color" value="#ffffff"/></div>
        <div class="row"><label>Wireframe</label><select id="wire"><option>No</option><option>Yes</option></select></div>
        <div class="row"><label>Cast Shadows</label><select id="cast"><option>Yes</option><option>No</option></select></div>
        <div class="row"><label>Receive Shadows</label><select id="recv"><option>Yes</option><option>No</option></select></div>
        <div class="row"><label>Metalness</label><input id="metal" type="range" min="0" max="1" step="0.01" value="0.1"/><output id="metalOut">0.10</output></div>
        <div class="row"><label>Roughness</label><input id="rough" type="range" min="0" max="1" step="0.01" value="0.4"/><output id="roughOut">0.40</output></div>
        <div class="row"><label>Emissive</label><input id="emis" type="range" min="0" max="3" step="0.01" value="0"/><output id="emisOut">0.00</output></div>
        <div class="row"><label>Emissive Color</label><input id="emisC" type="color" value="#000000"/></div>
      </div>

      <div class="group">
        <h3>Texture</h3>
        <div class="row"><label>Upload (map)</label><input id="texUpload" type="file" accept="image/*"/></div>
        <div class="row"><label>Procedural</label>
          <select id="proc"><option value="none">None</option><option value="checker">Checker</option><option value="noise">Noise</option></select>
        </div>
        <small class="note">Uploading an image overrides procedural.</small>
      </div>

      <div class="group">
        <h3>Geometry</h3>
        <div id="geometry-controls">
          <small class="note">Select a primitive (Box, Sphere, etc.) to see its geometry options.</small>
        </div>
      </div>
    `;

    // --- (NEW) Geometry controls ---
    const geoControls = root.querySelector('#geometry-controls');

    function applyGeometryChanges(){
        const obj = editor.selected;
        if (!obj || !obj.userData.geometryParams) return;

        const params = obj.userData.geometryParams;
        const newParams = { ...params }; // copy
        let newGeo;

        try {
            if (params.type === 'box') {
                newParams.width = +root.querySelector('#geo-width').value;
                newParams.height = +root.querySelector('#geo-height').value;
                newParams.depth = +root.querySelector('#geo-depth').value;
                newGeo = new THREE.BoxGeometry(newParams.width, newParams.height, newParams.depth);
            } else if (params.type === 'sphere') {
                newParams.radius = +root.querySelector('#geo-radius').value;
                newParams.widthSegments = Math.max(3, +root.querySelector('#geo-wsegs').value);
                newParams.heightSegments = Math.max(2, +root.querySelector('#geo-hsegs').value);
                newGeo = new THREE.SphereGeometry(newParams.radius, newParams.widthSegments, newParams.heightSegments);
            } else if (params.type === 'cylinder') {
                newParams.radiusTop = +root.querySelector('#geo-rtop').value;
                newParams.radiusBottom = +root.querySelector('#geo-rbot').value;
                newParams.height = +root.querySelector('#geo-height').value;
                newParams.radialSegments = Math.max(3, +root.querySelector('#geo-rsegs').value);
                newGeo = new THREE.CylinderGeometry(newParams.radiusTop, newParams.radiusBottom, newParams.height, newParams.radialSegments);
            } else if (params.type === 'plane') {
                newParams.width = +root.querySelector('#geo-width').value;
                newParams.height = +root.querySelector('#geo-height').value;
                newGeo = new THREE.PlaneGeometry(newParams.width, newParams.height);
            }

            if (newGeo) {
                obj.geometry.dispose();
                obj.geometry = newGeo;
                obj.userData.geometryParams = newParams;
                bus.emit('attach-selected'); // Re-attach gizmo/box helper
            }
        } catch (err) {
            console.error("Error applying geometry:", err);
        }
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
                <div class="row"><label>Width</label><input id="geo-width" type="number" step="0.1" value="${params.width}"/></div>
                <div class="row"><label>Height</label><input id="geo-height" type="number" step="0.1" value="${params.height}"/></div>
                <div class="row"><label>Depth</label><input id="geo-depth" type="number" step="0.1" value="${params.depth}"/></div>
            `;
        } else if (params.type === 'sphere') {
            html = `
                <div class="row"><label>Radius</label><input id="geo-radius" type="number" step="0.1" value="${params.radius}"/></div>
                <div class="row"><label>Width Segs</label><input id="geo-wsegs" type="number" step="1" min="3" value="${params.widthSegments}"/></div>
                <div class="row"><label>Height Segs</label><input id="geo-hsegs" type="number" step="1" min="2" value="${params.heightSegments}"/></div>
            `;
        } else if (params.type === 'cylinder') {
            html = `
                <div class="row"><label>Radius Top</label><input id="geo-rtop" type="number" step="0.1" value="${params.radiusTop}"/></div>
                <div class="row"><label>Radius Bottom</label><input id="geo-rbot" type="number" step="0.1" value="${params.radiusBottom}"/></div>
                <div class="row"><label>Height</label><input id="geo-height" type="number" step="0.1" value="${params.height}"/></div>
                <div class="row"><label>Radial Segs</label><input id="geo-rsegs" type="number" step="1" min="3" value="${params.radialSegments}"/></div>
            `;
        } else if (params.type === 'plane') {
            html = `
                <div class="row"><label>Width</label><input id="geo-width" type="number" step="0.1" value="${params.width}"/></div>
                <div class="row"><label>Height</label><input id="geo-height" type="number" step="0.1" value="${params.height}"/></div>
            `;
        }

        if (html) {
            html += '<div style="margin-top:6px;"><button id="applyGeo" class="primary">Apply Geometry</button></div>';
        }

        geoControls.innerHTML = html;
        
        if(html) {
          root.querySelector('#applyGeo').addEventListener('click', applyGeometryChanges);
        }
    }
    // --- End Geometry controls ---


    // wire outputs for ranges
    const bindOut = (id, outId) => root.querySelector('#'+id).addEventListener('input', e=> root.querySelector('#'+outId).textContent = (+e.target.value).toFixed( (e.target.step?.split?.('.')?.[1]?.length) || 2 ));
    bindOut('metal','metalOut'); bindOut('rough','roughOut'); bindOut('emis','emisOut'); bindOut('su','suOut');

    /* transform + material apply */
    function readTransform(){
      return {
        position: { x: +val('tx'), y: +val('ty'), z: +val('tz') },
        rotation: { x: +val('rx'), y: +val('ry'), z: +val('rz') },
        scale:    byUniform() ? { uniform:+val('su') } : { x:+val('sx'), y:+val('sy'), z:+val('sz') }
      };
    }
    function val(id){ return root.querySelector('#'+id).value; }
    function byUniform(){ return Math.abs(+val('su')-1) > 1e-6; }

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
        metalness: +val('metal'),
        roughness: +val('rough'),
        emissive: +val('emis'),
        emissiveColor: val('emisC')
      };
      if (uploadedTex) payload.map = uploadedTex;
      else payload.map = proceduralMap();
      bus.emit('material-update', payload);
    }
    ['mColor','wire','cast','recv','metal','rough','emis','emisC'].forEach(id=>{
      root.querySelector('#'+id).addEventListener('input', pushMaterial);
      root.querySelector('#'+id).addEventListener('change', pushMaterial);
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
        updateGeometryUI(null); // (NEW) Clear geometry panel
        return;
      }
      root.querySelector('#tx').value = obj.position.x.toFixed(3);
      root.querySelector('#ty').value = obj.position.y.toFixed(3);
      root.querySelector('#tz').value = obj.position.z.toFixed(3);
      root.querySelector('#rx').value = (obj.rotation.x*180/Math.PI).toFixed(1);
      root.querySelector('#ry').value = (obj.rotation.y*180/Math.PI).toFixed(1);
      root.querySelector('#rz').value = (obj.rotation.z*180/Math.PI).toFixed(1);
      root.querySelector('#sx').value = obj.scale.x.toFixed(3);
      root.querySelector('#sy').value = obj.scale.y.toFixed(3);
      root.querySelector('#sz').value = obj.scale.z.toFixed(3);
      root.querySelector('#su').value = '1'; root.querySelector('#suOut').textContent='1.00';

      // try to read material
      let mat = null;
      obj.traverse(o=>{ if(!mat && o.isMesh) mat = o.material; });
      if (mat){
        if (mat.color) root.querySelector('#mColor').value = '#'+mat.color.getHexString();
        root.querySelector('#wire').value = mat.wireframe ? 'Yes' : 'No';
        root.querySelector('#cast').value = obj.castShadow ? 'Yes' : 'No';
        root.querySelector('#recv').value = obj.receiveShadow ? 'Yes' : 'No';
        if (mat.metalness!=null) { setRange('metal', mat.metalness); }
        if (mat.roughness!=null){ setRange('rough', mat.roughness); }
        setRange('emis', mat.emissiveIntensity||0);
        root.querySelector('#emisC').value = '#'+(mat.emissive?.getHexString?.() || '000000');
      }

      updateGeometryUI(obj); // (NEW) Update geometry panel
    }
    function setRange(id, v){ const el=root.querySelector('#'+id); const out=root.querySelector('#'+id+'Out'); el.value=v; out.textContent=Number(v).toFixed(2); }

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
