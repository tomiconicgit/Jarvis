// materials.js — transform/material + parametric geo; re-entrancy-safe controls
import * as THREE from 'three';

/* Bind a slider+number pair without recursive storms */
function bindPair(root, base, fixed, onChange){
  const s = root.querySelector(`#${base}_slider`);
  const n = root.querySelector(`#${base}_num`);
  if (!s || !n) return;
  let syncing = false;
  const toFixed = v => (fixed!=null ? parseFloat(v).toFixed(fixed) : String(v));

  const fire = ()=> onChange?.();

  s.addEventListener('input', ()=>{
    if (syncing) return; syncing = true;
    n.value = toFixed(s.value); fire(); syncing = false;
  });
  n.addEventListener('input', ()=>{
    if (syncing) return; syncing = true;
    s.value = String(n.value); fire(); syncing = false;
  });
}
function setPair(root, base, value, fixed = 2){
  const s = root.querySelector(`#${base}_slider`);
  const n = root.querySelector(`#${base}_num`);
  if (s) s.value = String(value);
  if (n) n.value = parseFloat(value).toFixed(fixed);
}
const v = (root,id,def=0)=> {
  const el = root.querySelector('#'+id);
  return el ? parseFloat(el.value) : def;
};

export default {
  init(root, bus, editor){
    root.innerHTML = `
      <div class="group">
        <h3>Transform</h3>
        ${row('tx','Pos X',-50,50,0.1,0)}${row('ty','Pos Y',-50,50,0.1,0)}${row('tz','Pos Z',-50,50,0.1,0)}
        ${row('rx','Tilt X°',-180,180,1,0)}${row('ry','Rotate Y°',-180,180,1,0)}${row('rz','Tilt Z°',-180,180,1,0)}
        ${row('sx','Scale X',0.01,10,0.01,1)}${row('sy','Scale Y',0.01,10,0.01,1)}${row('sz','Scale Z',0.01,10,0.01,1)}
        ${row('su','Uniform',0.01,10,0.01,1)}
        <div class="row simple"><label>Thickness (Hollow)</label>${num('tf_th',0,0.5,0.01,0)}</div>
        <div class="row simple"><label>Edge Radius</label>${num('tf_edgeR',0,2,0.01,0)}</div>
        <div class="row simple"><label>Edge Segments</label>${num('tf_edgeSeg',1,8,1,2)}</div>
        <div class="row simple"><label>Gizmo Mode</label>
          <select id="gmode"><option value="translate">Translate</option><option value="rotate">Rotate</option><option value="scale">Scale</option></select>
        </div>
        <div style="display:flex;gap:8px;margin-top:6px;"><button id="frame">Frame</button></div>
      </div>

      <div class="group">
        <h3>Material</h3>
        <div class="row simple"><label>Color</label><input id="mColor" type="color" value="#ffffff"/></div>
        <div class="row simple"><label>Wireframe</label><select id="wire"><option>No</option><option>Yes</option></select></div>
        <div class="row simple"><label>Cast Shadows</label><select id="cast"><option>Yes</option><option>No</option></select></div>
        <div class="row simple"><label>Receive Shadows</label><select id="recv"><option>Yes</option><option>No</option></select></div>
        ${row('metal','Metalness',0,1,0.01,0.1)}
        ${row('rough','Roughness',0,1,0.01,0.4)}
        ${row('emis','Emissive',0,3,0.01,0)}
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
        <h3>Advanced Geometry</h3>
        <div id="base-geo"><small class="note">Select a primitive to edit base geometry.</small></div>
        ${row('adv_hollow','Hollow (thickness)',0,0.5,0.01,0)}
        ${row('adv_shearX','Slant X (shear)',-0.5,0.5,0.005,0)}
        ${row('adv_shearZ','Slant Z (shear)',-0.5,0.5,0.005,0)}
        ${row('deform_twist','Twist (°)',-360,360,1,0)}
        ${row('deform_taper','Taper (Y)',0,3,0.01,1)}
        ${row('deform_noise','Noise',0,1,0.01,0)}
      </div>
    `;

    const geoControls = root.querySelector('#base-geo');

    /* ---------- transform (live) ---------- */
    const pushTransform = ()=> bus.emit('transform-update', {
      position: { x:+val('tx_num'), y:+val('ty_num'), z:+val('tz_num') },
      rotation: { x:+val('rx_num'), y:+val('ry_num'), z:+val('rz_num') },
      scale:    (Math.abs(+val('su_num')-1) > 1e-6)
        ? { uniform:+val('su_num') }
        : { x:+val('sx_num'), y:+val('sy_num'), z:+val('sz_num') }
    });
    ['tx','ty','tz','rx','ry','rz','sx','sy','sz','su']
      .forEach(b=> bindPair(root,b, b.startsWith('r')?0:(b.startsWith('s')?2:1), pushTransform));

    // Make axis scales always work even after uniform was used
    ['sx','sy','sz'].forEach(id=>{
      ['_slider','_num'].forEach(suf=>{
        root.querySelector('#'+id+suf).addEventListener('input', ()=>{
          setPair(root,'su',1,2); // disable uniform
          pushTransform();
        });
      });
    });
    // When uniform changes, mirror it into X/Y/Z so gizmo & UI stay consistent
    ['_slider','_num'].forEach(suf=>{
      root.querySelector('#su'+suf).addEventListener('input', ()=>{
        const u = +val('su_num')||1;
        setPair(root,'sx',u,2); setPair(root,'sy',u,2); setPair(root,'sz',u,2);
        pushTransform();
      });
    });

    root.querySelector('#gmode').addEventListener('change', e=> bus.emit('set-gizmo', e.target.value));
    root.querySelector('#frame').addEventListener('click', ()=> bus.emit('frame-selection'));

    /* ---------- quick geometry controls inside Transform ---------- */
    const pushQuickGeo = ()=>{
      const obj = editor.selected;
      if (!obj || !obj.userData?.geometryParams) return;
      const base = { ...obj.userData.geometryParams };
      const d = { ...(obj.userData.deformParams || {}) };
      d.hollow       = v(root,'tf_th_num', d.hollow || 0);
      d.edgeRadius   = v(root,'tf_edgeR_num', d.edgeRadius || 0);
      d.edgeSegments = Math.max(1, v(root,'tf_edgeSeg_num', d.edgeSegments || 2));
      // Keep advanced controls in sync too:
      setPair(root,'adv_hollow', d.hollow, 2);
      bus.emit('rebuild-geometry', { base, deform: d });
    };
    ['tf_th','tf_edgeR','tf_edgeSeg'].forEach(b=> bindPair(root,b, b==='tf_edgeSeg'?0:2, pushQuickGeo));

    /* ---------- material (live) ---------- */
    let uploadedTex = null;
    const texLoader = new THREE.TextureLoader();
    function proceduralMap(){
      const mode = val('proc');
      if (mode==='checker') return makeChecker(512,512,32);
      if (mode==='noise')   return makeNoise(512,512);
      return null;
    }
    const pushMaterial = ()=>{
      bus.emit('material-update', {
        color: val('mColor'),
        wireframe: val('wire')==='Yes',
        castShadow: val('cast')==='Yes',
        receiveShadow: val('recv')==='Yes',
        metalness: +val('metal_num'),
        roughness: +val('rough_num'),
        emissive: +val('emis_num'),
        emissiveColor: val('emisC'),
        map: uploadedTex || proceduralMap()
      });
    };
    ['mColor','wire','cast','recv','emisC','proc'].forEach(id=>{
      root.querySelector('#'+id)?.addEventListener('input', pushMaterial);
      root.querySelector('#'+id)?.addEventListener('change', pushMaterial);
    });
    ['metal','rough','emis'].forEach(b=> bindPair(root,b,2,pushMaterial));
    root.querySelector('#texUpload').addEventListener('change', e=>{
      const f = e.target.files?.[0]; if(!f) return;
      const url = URL.createObjectURL(f);
      texLoader.load(url, tex=>{
        tex.colorSpace = THREE.SRGBColorSpace; uploadedTex = tex; pushMaterial();
        URL.revokeObjectURL(url);
      });
    });

    /* ---------- base + advanced geometry ---------- */
    function updateGeometryUI(obj){
      if (!obj || !obj.userData.geometryParams) {
        geoControls.innerHTML = '<small class="note">Select a primitive (Box, Sphere, Cylinder, Plane) to see geometry options. Imported meshes are not parametric.</small>';
        return;
      }
      const p = obj.userData.geometryParams;
      let html = '';
      if (p.type==='box'){
        html += row('geo_width','Width',0.1,50,0.1,p.width);
        html += row('geo_height','Height',0.1,50,0.1,p.height);
        html += row('geo_depth','Depth',0.1,50,0.1,p.depth);
      } else if (p.type==='sphere'){
        html += row('geo_radius','Radius',0.1,50,0.1,p.radius);
        html += row('geo_wsegs','Width Segs',3,128,1,p.widthSegments);
        html += row('geo_hsegs','Height Segs',2,128,1,p.heightSegments);
      } else if (p.type==='cylinder'){
        html += row('geo_rtop','Radius Top',0,50,0.1,p.radiusTop);
        html += row('geo_rbot','Radius Bot',0,50,0.1,p.radiusBottom);
        html += row('geo_height','Height',0.1,100,0.1,p.height);
        html += row('geo_rsegs','Radial Segs',3,128,1,p.radialSegments);
      } else if (p.type==='plane'){
        html += row('geo_width','Width',0.1,100,0.1,p.width);
        html += row('geo_height','Height',0.1,100,0.1,p.height);
      }
      geoControls.innerHTML = html;

      const pushGeometryChanges = ()=>{
        const base = { ...obj.userData.geometryParams };
        const valnum = id => parseFloat(root.querySelector('#'+id)?.value ?? base[id]);
        if (base.type==='box'){ base.width=valnum('geo_width_num'); base.height=valnum('geo_height_num'); base.depth=valnum('geo_depth_num'); }
        if (base.type==='sphere'){ base.radius=valnum('geo_radius_num'); base.widthSegments=Math.max(3, valnum('geo_wsegs_num')); base.heightSegments=Math.max(2, valnum('geo_hsegs_num')); }
        if (base.type==='cylinder'){
          base.radiusTop=valnum('geo_rtop_num'); base.radiusBottom=valnum('geo_rbot_num');
          base.height=valnum('geo_height_num'); base.radialSegments=Math.max(3, valnum('geo_rsegs_num'));
        }
        if (base.type==='plane'){ base.width=valnum('geo_width_num'); base.height=valnum('geo_height_num'); }

        const deform = {
          hollow:+val('adv_hollow_num'),
          shearX:+val('adv_shearX_num'),
          shearZ:+val('adv_shearZ_num'),
          twist:+val('deform_twist_num'),
          taper:+val('deform_taper_num'),
          noise:+val('deform_noise_num'),
          // mirror the quick controls (if present)
          edgeRadius: v(root,'tf_edgeR_num', obj.userData.deformParams?.edgeRadius || 0),
          edgeSegments: Math.max(1, v(root,'tf_edgeSeg_num', obj.userData.deformParams?.edgeSegments || 2))
        };
        bus.emit('rebuild-geometry', { base, deform });
      };

      const ids = [];
      if (p.type==='box') ids.push('geo_width','geo_height','geo_depth');
      if (p.type==='sphere') ids.push('geo_radius','geo_wsegs','geo_hsegs');
      if (p.type==='cylinder') ids.push('geo_rtop','geo_rbot','geo_height','geo_rsegs');
      if (p.type==='plane') ids.push('geo_width','geo_height');
      ids.forEach(b=> bindPair(root,b, b.includes('segs')?0:1, pushGeometryChanges));
      ['adv_hollow','adv_shearX','adv_shearZ','deform_twist','deform_taper','deform_noise']
        .forEach(b=> bindPair(root,b, b.includes('twist')?0:(b.includes('taper')||b.includes('hollow')?2:3), pushGeometryChanges));
    }

    function fillFromSelection(obj){
      if (!obj){ geoControls.innerHTML = '<small class="note">Select a primitive to edit base geometry.</small>'; return; }
      setPair(root,'tx',obj.position.x,1); setPair(root,'ty',obj.position.y,1); setPair(root,'tz',obj.position.z,1);
      setPair(root,'rx',obj.rotation.x*180/Math.PI,0); setPair(root,'ry',obj.rotation.y*180/Math.PI,0); setPair(root,'rz',obj.rotation.z*180/Math.PI,0);
      setPair(root,'sx',obj.scale.x,2); setPair(root,'sy',obj.scale.y,2); setPair(root,'sz',obj.scale.z,2); setPair(root,'su',1,2);

      let mat=null; obj.traverse(o=>{ if(!mat && o.isMesh) mat=o.material; });
      if (mat){
        root.querySelector('#mColor').value = '#'+(mat.color?.getHexString?.() || 'ffffff');
        root.querySelector('#wire').value = mat.wireframe ? 'Yes' : 'No';
        root.querySelector('#cast').value = obj.castShadow ? 'Yes' : 'No';
        root.querySelector('#recv').value = obj.receiveShadow ? 'Yes' : 'No';
        setPair(root,'metal', mat.metalness ?? 0.1, 2);
        setPair(root,'rough', mat.roughness ?? 0.4, 2);
        setPair(root,'emis',  mat.emissiveIntensity || 0, 2);
        root.querySelector('#emisC').value = '#'+(mat.emissive?.getHexString?.() || '000000');
      }

      updateGeometryUI(obj);

      const d = obj.userData.deformParams || { hollow:0, shearX:0, shearZ:0, twist:0, taper:1, noise:0, edgeRadius:0, edgeSegments:2 };
      // keep advanced + quick in sync
      setPair(root,'adv_hollow', d.hollow, 2);
      setPair(root,'adv_shearX', d.shearX, 3);
      setPair(root,'adv_shearZ', d.shearZ, 3);
      setPair(root,'deform_twist', d.twist, 0);
      setPair(root,'deform_taper', d.taper, 2);
      setPair(root,'deform_noise', d.noise, 2);
      setPair(root,'tf_th', d.hollow, 2);
      setPair(root,'tf_edgeR', d.edgeRadius || 0, 2);
      setPair(root,'tf_edgeSeg', d.edgeSegments || 2, 0);
    }

    bus.on('selection-changed', obj => fillFromSelection(obj));
    if (editor.selected) fillFromSelection(editor.selected);

    function val(id){ return root.querySelector('#'+id).value; }
  }
};

/* ---------- UI row makers ---------- */
function row(base, label, min, max, step, value){
  return `
    <div class="row">
      <label>${label}</label>
      <input id="${base}_slider" type="range" min="${min}" max="${max}" step="${step}" value="${value}"/>
      <input id="${base}_num" type="number" step="${step}" value="${value}"/>
    </div>
  `;
}
function num(base, min, max, step, value){
  return `<input id="${base}_num" type="number" min="${min}" max="${max}" step="${step}" value="${value}"/>`;
}

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