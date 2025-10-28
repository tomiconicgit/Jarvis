/*
File: src/transform.js
*/
// transform.js — Transform + Advanced modifiers panel
import * as THREE from 'three';
import { ensureStructure, rebuildRoundedBox, applyDeforms } from './modifiers.js';

const R_MIN = -50, R_MAX = 50, R_STEP = 0.1;   // Position
const D_MIN = -360, D_MAX = 360, D_STEP = 1;   // Rotation
const S_MIN = 0.01, S_MAX = 10, S_STEP = 0.01; // Scale
const SU_MIN = 0.01, SU_MAX = 20, SU_STEP = 0.01; // Uniform Scale

export default {
  init(root, bus, editor){
    // Panel scaffold
    root.innerHTML = `
      <div class="group">
        <h3>Position</h3>
        ${rowSlider('posX','X',R_MIN,R_MAX,R_STEP)}
        ${rowSlider('posY','Y',R_MIN,R_MAX,R_STEP)}
        ${rowSlider('posZ','Z',R_MIN,R_MAX,R_STEP)}
      </div>
      <div class="group">
        <h3>Rotation</h3>
        ${rowSlider('rotX','X',D_MIN,D_MAX,D_STEP,false)}
        ${rowSlider('rotY','Y',D_MIN,D_MAX,D_STEP,false)}
        ${rowSlider('rotZ','Z',D_MIN,D_MAX,D_STEP,false)}
      </div>
      <div class="group">
        <h3>Scale</h3>
        <div class="row simple" style="margin-bottom: 12px;">
          <label>Uniform Scale</label>
          <input type="range" id="scaleU" min="${SU_MIN}" max="${SU_MAX}" step="${SU_STEP}" value="1">
        </div>
        ${rowSlider('scaleX','X',S_MIN,S_MAX,S_STEP)}
        ${rowSlider('scaleY','Y',S_MIN,S_MAX,S_STEP)}
        ${rowSlider('scaleZ','Z',S_MIN,S_MAX,S_STEP)}
      </div>

      <div class="group">
        <h3>Pivot Offset</h3>
        ${rowNumber('pivotX','X',-5,5,0.01,0)}
        ${rowNumber('pivotY','Y',-5,5,0.01,0)}
        ${rowNumber('pivotZ','Z',-5,5,0.01,0)}
      </div>

      <div class="group">
        <h3>Advanced Shape Deformation</h3>
        ${rowNumber('tiltX','Tilt X',-2,2,0.001,0)}
        ${rowNumber('tiltY','Tilt Y',-2,2,0.001,0)}
        ${rowNumber('shearX','Shear X',-2,2,0.001,0)}
        ${rowNumber('shearY','Shear Y',-2,2,0.001,0)}
        ${rowNumber('shearZ','Shear Z',-2,2,0.001,0)}
        ${rowNumber('taperTop','Taper Top',0.1,3,0.001,1)}
        ${rowNumber('taperBottom','Taper Bottom',0.1,3,0.001,1)}
        ${rowNumber('twistY','Twist (°)',-720,720,0.1,0)}
        ${rowNumber('bendX','Bend X (°)',-720,720,0.1,0)}
        ${rowNumber('bendZ','Bend Z (°)',-720,720,0.1,0)}
        ${rowNumber('bulge','Bulge/Pinch',-1,1,0.001,0)}
      </div>

      <div class="group">
        <h3>Edge & Corner Refinement</h3>
        ${rowNumber('bevelRadius','Edge Bevel Radius',0,0.45,0.001,0)}
        ${rowInt('bevelSegments','Bevel Segments',1,6,1,1)}
        <!-- Corner Roundness maps to bevel radius for now -->
        ${rowNumber('cornerRound','Corner Roundness',0,0.45,0.001,0)}
        ${rowNumberDisabled('chamfer','Chamfer Amount (coming)',0,0.2,0.001,0)}
        ${rowNumber('edgeNoise','Edge Noise Strength',0,0.25,0.001,0)}
        ${rowNumber('edgeNoiseScale','Edge Noise Scale',0.1,10,0.01,2)}
        ${rowInt('edgeNoiseSeed','Edge Noise Seed',1,9999,1,1)}
      </div>

      <div class="group">
        <h3>Subdivision & Resolution</h3>
        ${rowInt('resX','Face Resolution X',1,8,1,2)}
        ${rowInt('resY','Face Resolution Y',1,8,1,2)}
        ${rowInt('resZ','Face Resolution Z',1,8,1,2)}
        ${rowInt('subdiv','Subdivision Level',0,3,1,0)}
        <div class="row simple"><label>Adaptive Subdivision</label>
          <input id="adaptive" type="checkbox">
        </div>
      </div>

      <div class="group">
        <h3>Procedural Modifiers</h3>
        ${rowNumberDisabled('boolDepth','Boolean Cut Depth',0,2,0.01,0)}
        ${rowSelectDisabled('boolAxis','Boolean Axis',['X','Y','Z'],'Y')}
        ${rowSelectDisabled('boolShape','Boolean Shape',['Box','Sphere','Cylinder'],'Box')}
        ${rowNumberDisabled('inset','Inset Faces',0,1,0.001,0)}
        ${rowNumberDisabled('extrude','Extrude Faces',0,2,0.01,0)}
        <div class="row simple"><label>Mirror X/Y/Z</label>
          <div style="display:flex;gap:6px;">
            <input type="checkbox" disabled>
            <input type="checkbox" disabled>
            <input type="checkbox" disabled>
          </div>
        </div>
      </div>
    `;

    // Element refs
    const els = grabAll(root, [
      'posX','numPosX','posY','numPosY','posZ','numPosZ',
      'rotX','numRotX','rotY','numRotY','rotZ','numRotZ',
      'scaleU','scaleX','numScaleX','scaleY','numScaleY','scaleZ','numScaleZ',
      'pivotX','pivotY','pivotZ',
      'tiltX','tiltY','shearX','shearY','shearZ','taperTop','taperBottom','twistY','bendX','bendZ','bulge',
      'bevelRadius','bevelSegments','cornerRound','edgeNoise','edgeNoiseScale','edgeNoiseSeed',
      'resX','resY','resZ','subdiv','adaptive'
    ]);

    let isUpdatingUI = false;
    let rafToken = 0;

    // --- Core Transform bindings ---
    linkPair(els.posX, els.numPosX, sendTransform);
    linkPair(els.posY, els.numPosY, sendTransform);
    linkPair(els.posZ, els.numPosZ, sendTransform);
    linkPair(els.rotX, els.numRotX, sendTransform);
    linkPair(els.rotY, els.numRotY, sendTransform);
    linkPair(els.rotZ, els.numRotZ, sendTransform);
    linkPair(els.scaleX, els.numScaleX, sendTransform);
    linkPair(els.scaleY, els.numScaleY, sendTransform);
    linkPair(els.scaleZ, els.numScaleZ, sendTransform);

    els.scaleU.addEventListener('input', ()=>{
      const v = parseFloat(els.scaleU.value);
      setNumVal(els.scaleX, els.numScaleX, v);
      setNumVal(els.scaleY, els.numScaleY, v);
      setNumVal(els.scaleZ, els.numScaleZ, v);
      sendTransform(true);
    });

    function sendTransform(isUniform=false){
      if (isUpdatingUI) return;
      const payload = {
        position: {
          x: num(els.numPosX), y: num(els.numPosY), z: num(els.numPosZ)
        },
        rotation: {
          x: num(els.numRotX), y: num(els.numRotY), z: num(els.numRotZ)
        },
        scale: isUniform ? { uniform: parseFloat(els.scaleU.value) } : {
          x: num(els.numScaleX), y: num(els.numScaleY), z: num(els.numScaleZ)
        }
      };
      // Keep scaleU synced
      if (!isUniform) {
        const sx = num(els.numScaleX), sy = num(els.numScaleY), sz = num(els.numScaleZ);
        setSilent(() => els.scaleU.value = ((sx+sy+sz)/3).toFixed(2));
      }
      bus.emit('transform-update', payload);
    }

    // --- Pivot offset ---
    [els.pivotX, els.pivotY, els.pivotZ].forEach(input=>{
      input.addEventListener('input', ()=>{
        const sel = editor.selected;
        if (!sel) return;
        // Store on mods
        const mods = ensureMods(sel);
        mods.pivotOffset.x = num(els.pivotX);
        mods.pivotOffset.y = num(els.pivotY);
        mods.pivotOffset.z = num(els.pivotZ);
        // Apply by moving the inner mesh opposite the offset
        const mesh = sel.getObjectByName('Mesh');
        if (mesh) {
          mesh.position.set(-mods.pivotOffset.x, -mods.pivotOffset.y, -mods.pivotOffset.z);
          mesh.updateMatrixWorld();
        }
        bus.emit('history-push-debounced','Pivot');
      });
    });

    // --- Deformation/Structure controls ---
    const deformIds = [
      'tiltX','tiltY','shearX','shearY','shearZ','taperTop','taperBottom','twistY','bendX','bendZ','bulge',
      'bevelRadius','bevelSegments','cornerRound',
      'edgeNoise','edgeNoiseScale','edgeNoiseSeed',
      'resX','resY','resZ','subdiv'
    ];
    deformIds.forEach(id=>{
      const el = els[id];
      el.addEventListener('input', scheduleApply);
    });
    els.adaptive.addEventListener('change', scheduleApply);

    function scheduleApply(){
      cancelAnimationFrame(rafToken);
      rafToken = requestAnimationFrame(()=> applyModifiers(editor.selected));
    }

    function applyModifiers(selected){
      if (!selected) return;
      const mesh = selected.getObjectByName('Mesh');
      if (!mesh || !mesh.isMesh) return;

      const mods = ensureMods(selected);

      // Pull values from UI
      mods.tiltX = num(els.tiltX); mods.tiltY = num(els.tiltY);
      mods.shearX = num(els.shearX); mods.shearY = num(els.shearY); mods.shearZ = num(els.shearZ);
      mods.taperTop = num(els.taperTop); mods.taperBottom = num(els.taperBottom);
      mods.twistY = num(els.twistY); mods.bendX = num(els.bendX); mods.bendZ = num(els.bendZ);
      mods.bulge = num(els.bulge);

      // Edge & corner
      // Corner Roundness currently mapped to bevelRadius (kept separate for UI)
      mods.bevelRadius = num(els.bevelRadius) || num(els.cornerRound);
      mods.bevelSegments = clampInt(num(els.bevelSegments),1,6);

      // Noise
      mods.noiseStrength = num(els.edgeNoise);
      mods.noiseScale = num(els.edgeNoiseScale);
      mods.noiseSeed = clampInt(num(els.edgeNoiseSeed),1,9999);

      // Resolution/Subdivision
      mods.resX = clampInt(num(els.resX),1,8);
      mods.resY = clampInt(num(els.resY),1,8);
      mods.resZ = clampInt(num(els.resZ),1,8);
      mods.subdivLevel = clampInt(num(els.subdiv),0,3);
      mods.adaptiveSubdiv = !!els.adaptive.checked;

      // Rebuild geometry if structural params changed
      ensureStructure(mesh, mods);

      // Apply live deformations
      applyDeforms(mesh, mods);

      bus.emit('history-push-debounced','Deform');
    }

    // --- Populate UI from selected object ---
    function updateUI(obj){
      if (!obj) return;
      const mesh = obj.getObjectByName('Mesh');
      const mods = ensureMods(obj);
      isUpdatingUI = true;

      // Position
      setNumVal(els.posX, els.numPosX, obj.position.x);
      setNumVal(els.posY, els.numPosY, obj.position.y);
      setNumVal(els.posZ, els.numPosZ, obj.position.z);

      // Rotation (degrees)
      setNumVal(els.rotX, els.numRotX, THREE.MathUtils.radToDeg(obj.rotation.x), 1);
      setNumVal(els.rotY, els.numRotY, THREE.MathUtils.radToDeg(obj.rotation.y), 1);
      setNumVal(els.rotZ, els.numRotZ, THREE.MathUtils.radToDeg(obj.rotation.z), 1);

      // Scale
      setNumVal(els.scaleX, els.numScaleX, obj.scale.x);
      setNumVal(els.scaleY, els.numScaleY, obj.scale.y);
      setNumVal(els.scaleZ, els.numScaleZ, obj.scale.z);
      els.scaleU.value = ((obj.scale.x + obj.scale.y + obj.scale.z)/3).toFixed(2);

      // Pivot
      setOnly(els.pivotX, mods.pivotOffset.x);
      setOnly(els.pivotY, mods.pivotOffset.y);
      setOnly(els.pivotZ, mods.pivotOffset.z);

      // Deform
      [
        'tiltX','tiltY','shearX','shearY','shearZ',
        'taperTop','taperBottom','twistY','bendX','bendZ','bulge'
      ].forEach(id=> setOnly(els[id], mods[id]));

      // Edge/corner
      setOnly(els.bevelRadius, mods.bevelRadius);
      setOnly(els.bevelSegments, mods.bevelSegments);
      setOnly(els.cornerRound, mods.bevelRadius);
      setOnly(els.edgeNoise, mods.noiseStrength);
      setOnly(els.edgeNoiseScale, mods.noiseScale);
      setOnly(els.edgeNoiseSeed, mods.noiseSeed);

      // Resolution
      setOnly(els.resX, mods.resX);
      setOnly(els.resY, mods.resY);
      setOnly(els.resZ, mods.resZ);
      setOnly(els.subdiv, mods.subdivLevel);
      els.adaptive.checked = !!mods.adaptiveSubdiv;

      isUpdatingUI = false;

      // Ensure base geometry bookkeeping exists (loaded scenes)
      if (mesh && !mesh.userData._basePositions) {
        rebuildRoundedBox(mesh, mods);
      }
      // Apply current modifiers (idempotent)
      applyModifiers(obj);
    }

    // Sync when selection or gizmo changes
    bus.on('selection-changed', updateUI);
    bus.on('transform-changed', updateUI);
  }
};

/* ---------------- UI helpers ---------------- */
function rowSlider(id, label, min, max, step, float=true){
  return `
  <div class="row slider">
    <label>${label}</label>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}">
    <input id="num${cap(id)}" type="number" step="${step}">
  </div>`;
}
function rowNumber(id, label, min, max, step, val){
  return `
  <div class="row slider">
    <label>${label}</label>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">
    <input id="num${cap(id)}" type="number" step="${step}" value="${val}">
  </div>`;
}
function rowNumberDisabled(id, label, min, max, step, val){
  return `
  <div class="row slider" aria-disabled="true" style="opacity:.5;pointer-events:none;">
    <label>${label}</label>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" disabled>
    <input id="num${cap(id)}" type="number" step="${step}" value="${val}" disabled>
  </div>`;
}
function rowInt(id, label, min, max, step, val){
  return `
  <div class="row slider">
    <label>${label}</label>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">
    <input id="num${cap(id)}" type="number" step="${step}" value="${val}">
  </div>`;
}
function rowSelectDisabled(id, label, options, def){
  const ops = options.map(o=>`<option ${o===def?'selected':''}>${o}</option>`).join('');
  return `
  <div class="row simple" aria-disabled="true" style="opacity:.5;pointer-events:none;">
    <label>${label}</label>
    <select id="${id}" disabled>${ops}</select>
  </div>`;
}
function cap(s){ return s[0].toUpperCase()+s.slice(1); }

function grabAll(root, ids){
  const out = {};
  ids.forEach(id=>{
    out[id] = root.querySelector('#'+id) || root.querySelector('#num'+cap(id));
    const numEl = root.querySelector('#num'+cap(id));
    if (numEl) out['num'+cap(id)] = numEl;
  });
  return out;
}
function linkPair(rangeEl, numEl, on){
  if (!rangeEl || !numEl) return;
  rangeEl.addEventListener('input', ()=>{ numEl.value = rangeEl.value; on?.(); });
  numEl.addEventListener('input', ()=>{ rangeEl.value = numEl.value; on?.(); });
}
function setNumVal(rangeEl, numEl, v, dp=2){
  const s = (Number(v)||0).toFixed(dp);
  setSilent(()=>{
    rangeEl.value = s;
    numEl.value = s;
  });
}
function setOnly(el, v){ if (el) el.value = String(v); }
function setSilent(fn){ const prev = elBlock; elBlock = true; try{ fn(); } finally { elBlock = prev; } }
let elBlock = false;
function num(el){ return parseFloat(el.value || '0') || 0; }
function clampInt(n, a, b){ n = Math.round(n||0); return Math.max(a, Math.min(b, n)); }
function ensureMods(obj){
  obj.userData.mods ??= {
    pivotOffset:{x:0,y:0,z:0},
    resX:2,resY:2,resZ:2,bevelRadius:0,bevelSegments:1,subdivLevel:0,adaptiveSubdiv:false,
    tiltX:0,tiltY:0,shearX:0,shearY:0,shearZ:0,taperTop:1,taperBottom:1,twistY:0,bendX:0,bendZ:0,bulge:0,
    noiseStrength:0,noiseScale:2,noiseSeed:1
  };
  return obj.userData.mods;
}