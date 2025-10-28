/*
File: src/transform.js
*/
// Transform panel — core transforms, pivot, deforms, and shape-specific controls.
import * as THREE from 'three';
import { ensureStructure, rebuildRoundedBox, applyDeforms } from './modifiers.js';

const R_MIN = -100, R_MAX = 100, R_STEP = 0.1;  // Position (expanded to 100)
const D_MIN = -360, D_MAX = 360, D_STEP = 1;    // Rotation
const S_MIN = 0.01, S_MAX = 10,  S_STEP = 0.01; // Scale
const SU_MIN = 0.01, SU_MAX = 20, SU_STEP = 0.01; // Uniform Scale

export default {
  init(root, bus, editor){
    root.innerHTML = `
      ${group('Position', [
        row('posX','X', R_MIN,R_MAX,R_STEP,'range'),
        row('posY','Y', R_MIN,R_MAX,R_STEP,'range'),
        row('posZ','Z', R_MIN,R_MAX,R_STEP,'range'),
      ])}
      ${group('Rotation', [
        row('rotX','X (°)', D_MIN,D_MAX,D_STEP,'range'),
        row('rotY','Y (°)', D_MIN,D_MAX,D_STEP,'range'),
        row('rotZ','Z (°)', D_MIN,D_MAX,D_STEP,'range'),
      ])}
      ${group('Scale', [
        row('scaleU','Uniform', SU_MIN,SU_MAX,SU_STEP,'range'),
        row('scaleX','X', S_MIN,S_MAX,S_STEP,'range'),
        row('scaleY','Y', S_MIN,S_MAX,S_STEP,'range'),
        row('scaleZ','Z', S_MIN,S_MAX,S_STEP,'range'),
      ])}
      ${group('Pivot Offset', [
        row('pivotX','X', -5,5,0.01,'range'),
        row('pivotY','Y', -5,5,0.01,'range'),
        row('pivotZ','Z', -5,5,0.01,'range'),
      ])}
      ${group('Advanced Shape Deformation', [
        row('tiltX','Tilt X', -2,2,0.001,'range'),
        row('tiltY','Tilt Y', -2,2,0.001,'range'),
        row('shearX','Shear X', -2,2,0.001,'range'),
        row('shearY','Shear Y', -2,2,0.001,'range'),
        row('shearZ','Shear Z', -2,2,0.001,'range'),
        row('taperTop','Taper Top', 0.1,3,0.001,'range',1),
        row('taperBottom','Taper Bottom', 0.1,3,0.001,'range',1),
        row('twistY','Twist (°)', -720,720,0.1,'range'),
        row('bendX','Bend X (°)', -720,720,0.1,'range'),
        row('bendZ','Bend Z (°)', -720,720,0.1,'range'),
        row('bulge','Bulge / Pinch', -1,1,0.001,'range'),
      ])}
      ${group('Edge & Corner Refinement', [
        row('bevelRadius','Edge Bevel Radius', 0,0.45,0.001,'range'),
        row('bevelSegments','Bevel Segments', 1,6,1,'range',1),
        row('cornerRound','Corner Roundness', 0,0.45,0.001,'range'),
        row('edgeNoise','Edge Noise Strength', 0,0.25,0.001,'range'),
        row('edgeNoiseScale','Edge Noise Scale', 0.1,10,0.01,'range',2),
        row('edgeNoiseSeed','Edge Noise Seed', 1,9999,1,'range',1),
      ])}
      ${group('Subdivision & Resolution', [
        row('resX','Face Resolution X', 1,8,1,'range',1),
        row('resY','Face Resolution Y', 1,8,1,'range',1),
        row('resZ','Face Resolution Z', 1,8,1,'range',1),
        row('subdiv','Subdivision Level', 0,3,1,'range',1),
        check('adaptive','Adaptive Subdivision')
      ])}
      <div id="shapeExtra"></div>
    `;

    const ui = collectUI(root);

    // Position/Rotation/Scale bindings
    link(ui.posX, v => emitTransform({ position:{ x:v } }));
    link(ui.posY, v => emitTransform({ position:{ y:v } }));
    link(ui.posZ, v => emitTransform({ position:{ z:v } }));
    link(ui.rotX, v => emitTransform({ rotation:{ x:v } }));
    link(ui.rotY, v => emitTransform({ rotation:{ y:v } }));
    link(ui.rotZ, v => emitTransform({ rotation:{ z:v } }));
    link(ui.scaleX, v => emitTransform({ scale:{ x:v } }));
    link(ui.scaleY, v => emitTransform({ scale:{ y:v } }));
    link(ui.scaleZ, v => emitTransform({ scale:{ z:v } }));

    // Uniform Scale — fixed to update XYZ and send uniform payload
    ui.scaleU.addEventListener('input', ()=>{
      const val = get(ui.scaleU);
      reflect(ui.scaleX, val);
      reflect(ui.scaleY, val);
      reflect(ui.scaleZ, val);
      emitTransform({ scale:{ uniform: val } });
    });

    function emitTransform(partial){
      const sel = editor.selected; if (!sel) return;
      const p = {
        position: { x: get(ui.posX), y: get(ui.posY), z: get(ui.posZ) },
        rotation: { x: get(ui.rotX), y: get(ui.rotY), z: get(ui.rotZ) },
        scale:    { x: get(ui.scaleX), y: get(ui.scaleY), z: get(ui.scaleZ) }
      };
      if (partial.position) Object.assign(p.position, partial.position);
      if (partial.rotation) Object.assign(p.rotation, partial.rotation);
      if (partial.scale)    Object.assign(p.scale,    partial.scale);
      bus.emit('transform-update', p);
    }

    // Pivot offsets (requires inner mesh named "Mesh"; falls back gracefully)
    ;[ui.pivotX, ui.pivotY, ui.pivotZ].forEach(inp=>{
      link(inp, ()=>{
        const sel = editor.selected; if (!sel) return;
        const mods = ensureMods(sel);
        mods.pivotOffset.x = get(ui.pivotX);
        mods.pivotOffset.y = get(ui.pivotY);
        mods.pivotOffset.z = get(ui.pivotZ);
        const inner = sel.getObjectByName?.('Mesh') || null;
        if (inner) inner.position.set(-mods.pivotOffset.x, -mods.pivotOffset.y, -mods.pivotOffset.z);
        bus.emit('history-push-debounced','Pivot');
      });
    });

    // Deform bindings (shared across shapes)
    const deformKeys = [
      'tiltX','tiltY','shearX','shearY','shearZ','taperTop','taperBottom',
      'twistY','bendX','bendZ','bulge',
      'bevelRadius','bevelSegments','cornerRound',
      'edgeNoise','edgeNoiseScale','edgeNoiseSeed',
      'resX','resY','resZ','subdiv'
    ];
    deformKeys.forEach(k => link(ui[k], scheduleApply));
    ui.adaptive?.addEventListener('change', scheduleApply);

    let raf = 0;
    function scheduleApply(){ cancelAnimationFrame(raf); raf = requestAnimationFrame(()=> applyMods(editor.selected)); }
    function applyMods(selected){
      if (!selected) return;
      const mesh = selected.getObjectByName?.('Mesh') || (selected.isMesh ? selected : null);
      if (!mesh || !mesh.isMesh) return;

      const mods = ensureMods(selected);
      // Read all from UI
      mods.tiltX=get(ui.tiltX); mods.tiltY=get(ui.tiltY);
      mods.shearX=get(ui.shearX); mods.shearY=get(ui.shearY); mods.shearZ=get(ui.shearZ);
      mods.taperTop=get(ui.taperTop); mods.taperBottom=get(ui.taperBottom);
      mods.twistY=get(ui.twistY); mods.bendX=get(ui.bendX); mods.bendZ=get(ui.bendZ);
      mods.bulge=get(ui.bulge);
      mods.bevelRadius=get(ui.bevelRadius)||get(ui.cornerRound);
      mods.bevelSegments=clampInt(get(ui.bevelSegments),1,6);
      mods.noiseStrength=get(ui.edgeNoise); mods.noiseScale=get(ui.edgeNoiseScale);
      mods.noiseSeed=clampInt(get(ui.edgeNoiseSeed),1,9999);
      mods.resX=clampInt(get(ui.resX),1,8); mods.resY=clampInt(get(ui.resY),1,8); mods.resZ=clampInt(get(ui.resZ),1,8);
      mods.subdivLevel=clampInt(get(ui.subdiv),0,3); mods.adaptiveSubdiv=!!ui.adaptive?.checked;

      ensureStructure(mesh, mods);   // no-op for hollowcube
      applyDeforms(mesh, mods);
      bus.emit('history-push-debounced','Deform');
    }

    // Hollow cube face controls
    function renderShapeExtras(obj){
      const wrap = root.querySelector('#shapeExtra');
      wrap.innerHTML = '';
      if (!obj) return;

      const kind = obj.userData.shapeKind;
      if (kind !== 'hollowcube') return;

      const h = obj.userData.hollow || { edge:0.12, panel:0.12, open:{px:true,nx:true,py:true,ny:true,pz:true,nz:true} };
      wrap.innerHTML = group('Hollow Cube', [
        row('hcEdge','Wall / Edge Thickness', 0.02, 0.45, 0.005, 'range', 3),
        row('hcPanel','Panel Thickness (closed faces)', 0.01, 0.45, 0.005, 'range', 3),
        check('hcPX','Open +X'), check('hcNX','Open −X'),
        check('hcPY','Open +Y'), check('hcNY','Open −Y'),
        check('hcPZ','Open +Z'), check('hcNZ','Open −Z')
      ].flat());

      const e = {
        edge: wrap.querySelector('#hcEdge'),
        panel: wrap.querySelector('#hcPanel'),
        px: wrap.querySelector('#hcPX'), nx: wrap.querySelector('#hcNX'),
        py: wrap.querySelector('#hcPY'), ny: wrap.querySelector('#hcNY'),
        pz: wrap.querySelector('#hcPZ'), nz: wrap.querySelector('#hcNZ')
      };

      reflect(e.edge, h.edge, 3);
      reflect(e.panel, h.panel, 3);
      e.px.checked = !!h.open.px; e.nx.checked = !!h.open.nx;
      e.py.checked = !!h.open.py; e.ny.checked = !!h.open.ny;
      e.pz.checked = !!h.open.pz; e.nz.checked = !!h.open.nz;

      const rebuild = ()=>{
        const sel = editor.selected; if (!sel) return;
        const hh = sel.userData.hollow;
        hh.edge = get(e.edge);
        hh.panel = get(e.panel);
        hh.open.px = !!e.px.checked; hh.open.nx = !!e.nx.checked;
        hh.open.py = !!e.py.checked; hh.open.ny = !!e.ny.checked;
        hh.open.pz = !!e.pz.checked; hh.open.nz = !!e.nz.checked;
        sel.userData.rebuild?.();

        const mesh = sel.getObjectByName?.('Mesh') || (sel.isMesh ? sel : null);
        const mods = ensureMods(sel);
        if (mesh) applyDeforms(mesh, mods);
        bus.emit('history-push-debounced','HollowCube');
      };

      e.edge.addEventListener('input', rebuild);
      e.panel.addEventListener('input', rebuild);
      [e.px,e.nx,e.py,e.ny,e.pz,e.nz].forEach(cb=> cb.addEventListener('change', rebuild));
    }

    // Sync UI from selection/gizmo
    function updateUI(obj){
      if (!obj) return;

      reflect(ui.posX, obj.position.x);
      reflect(ui.posY, obj.position.y);
      reflect(ui.posZ, obj.position.z);

      reflect(ui.rotX, THREE.MathUtils.radToDeg(obj.rotation.x), 1);
      reflect(ui.rotY, THREE.MathUtils.radToDeg(obj.rotation.y), 1);
      reflect(ui.rotZ, THREE.MathUtils.radToDeg(obj.rotation.z), 1);

      reflect(ui.scaleX, obj.scale.x);
      reflect(ui.scaleY, obj.scale.y);
      reflect(ui.scaleZ, obj.scale.z);
      reflect(ui.scaleU, (obj.scale.x + obj.scale.y + obj.scale.z)/3);

      const mods = ensureMods(obj);
      reflect(ui.pivotX, mods.pivotOffset.x);
      reflect(ui.pivotY, mods.pivotOffset.y);
      reflect(ui.pivotZ, mods.pivotOffset.z);

      [
        'tiltX','tiltY','shearX','shearY','shearZ','taperTop','taperBottom',
        'twistY','bendX','bendZ','bulge',
        'bevelRadius','bevelSegments','edgeNoise','edgeNoiseScale','edgeNoiseSeed',
        'resX','resY','resZ','subdiv'
      ].forEach(k => reflect(ui[k], mods[k]));

      reflect(ui.cornerRound, mods.bevelRadius);
      if (ui.adaptive) ui.adaptive.checked = !!mods.adaptiveSubdiv;

      // Ensure base + apply current mods
      const mesh = obj.getObjectByName?.('Mesh') || (obj.isMesh ? obj : null);
      if (mesh && !mesh.userData._basePositions) rebuildRoundedBox(mesh, mods);
      applyMods(obj);

      renderShapeExtras(obj);
    }

    bus.on('selection-changed', updateUI);
    bus.on('transform-changed', updateUI);
  }
};

/* ---------------- UI helpers ---------------- */
function group(title, rows){
  return `<div class="group"><h3>${title}</h3>${rows.join('\n')}</div>`;
}
function row(id, label, min, max, step, type='range', dp=2){
  return `
    <div class="row simple">
      <label>${label}</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="${type}" id="${id}" min="${min}" max="${max}" step="${step}">
        <output id="${id}Out" style="min-width:64px;text-align:right;font-variant-numeric:tabular-nums">${(0).toFixed(dp)}</output>
      </div>
    </div>
  `;
}
function check(id,label){
  return `<div class="row simple"><label>${label}</label><input id="${id}" type="checkbox"></div>`;
}
function collectUI(root){
  const q=id=>root.querySelector('#'+id);
  const ids=[
    'posX','posY','posZ','rotX','rotY','rotZ','scaleU','scaleX','scaleY','scaleZ',
    'pivotX','pivotY','pivotZ',
    'tiltX','tiltY','shearX','shearY','shearZ','taperTop','taperBottom',
    'twistY','bendX','bendZ','bulge',
    'bevelRadius','bevelSegments','cornerRound','edgeNoise','edgeNoiseScale','edgeNoiseSeed',
    'resX','resY','resZ','subdiv','adaptive'
  ];
  const out=Object.create(null); ids.forEach(id=> out[id]=q(id)); return out;
}
function link(input, on){
  if(!input) return;
  const out=input.parentElement?.querySelector('output');
  const update=()=>{ out&&(out.textContent=fmt(get(input))); on?.(get(input)); };
  input.addEventListener('input', update);
}
function reflect(input, v, dp=2){
  if(!input) return;
  input.value = String(v);
  const out=input.parentElement?.querySelector('output');
  if(out) out.textContent = fmt(v, dp);
}
function fmt(v, dp=2){ const n=Number(v)||0; return n.toFixed(dp); }
function get(el){ return el?.type === 'checkbox' ? !!el.checked : parseFloat(el.value||'0')||0; }
function clampInt(n,a,b){ n=Math.round(n||0); return Math.max(a, Math.min(b,n)); }
function ensureMods(obj){
  obj.userData.mods ??= {
    pivotOffset:{x:0,y:0,z:0},
    resX:2,resY:2,resZ:2,bevelRadius:0,bevelSegments:1,subdivLevel:0,adaptiveSubdiv:false,
    tiltX:0,tiltY:0,shearX:0,shearY:0,shearZ:0,taperTop:1,taperBottom:1,
    twistY:0,bendX:0,bendZ:0,bulge:0,
    noiseStrength:0,noiseScale:2,noiseSeed:1
  };
  return obj.userData.mods;
}