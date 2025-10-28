/*
File: src/transform.js
*/
// transform.js — Transform panel UI and logic
import * as THREE from 'three';

const R_MIN = -50, R_MAX = 50, R_STEP = 0.1; // Position
const D_MIN = -360, D_MAX = 360, D_STEP = 1; // Rotation
const S_MIN = 0.01, S_MAX = 10, S_STEP = 0.01; // Scale
const SU_MIN = 0.01, SU_MAX = 20, SU_STEP = 0.01; // Uniform Scale

export default {
  init(root, bus, editor){
    root.innerHTML = `
      <div class="group">
        <h3>Position</h3>
        <div class="row slider"><label>X</label><input type="range" id="posX" min="${R_MIN}" max="${R_MAX}" step="${R_STEP}"><input id="numPosX" type="number" step="${R_STEP}"></div>
        <div class="row slider"><label>Y</label><input type="range" id="posY" min="${R_MIN}" max="${R_MAX}" step="${R_STEP}"><input id="numPosY" type="number" step="${R_STEP}"></div>
        <div class="row slider"><label>Z</label><input type="range" id="posZ" min="${R_MIN}" max="${R_MAX}" step="${R_STEP}"><input id="numPosZ" type="number" step="${R_STEP}"></div>
      </div>
      <div class="group">
        <h3>Rotation</h3>
        <div class="row slider"><label>X</label><input type="range" id="rotX" min="${D_MIN}" max="${D_MAX}" step="${D_STEP}"><input id="numRotX" type="number" step="${D_STEP}"></div>
        <div class="row slider"><label>Y</label><input type="range" id="rotY" min="${D_MIN}" max="${D_MAX}" step="${D_STEP}"><input id="numRotY" type="number" step="${D_STEP}"></div>
        <div class="row slider"><label>Z</label><input type="range" id="rotZ" min="${D_MIN}" max="${D_MAX}" step="${D_STEP}"><input id="numRotZ" type="number" step="${D_STEP}"></div>
      </div>
      <div class="group">
        <h3>Scale</h3>
        <div class="row simple" style="margin-bottom: 16px;"><label>Uniform Scale</label>
          <input type="range" id="scaleU" min="${SU_MIN}" max="${SU_MAX}" step="${SU_STEP}" value="1">
        </div>
        <div class="row slider"><label>X</label><input type="range" id="scaleX" min="${S_MIN}" max="${S_MAX}" step="${S_STEP}"><input id="numScaleX" type="number" step="${S_STEP}"></div>
        <div class="row slider"><label>Y</label><input type="range" id="scaleY" min="${S_MIN}" max="${S_MAX}" step="${S_STEP}"><input id="numScaleY" type="number" step="${S_STEP}"></div>
        <div class="row slider"><label>Z</label><input type="range" id="scaleZ" min="${S_MIN}" max="${S_MAX}" step="${S_STEP}"><input id="numScaleZ" type="number" step="${S_STEP}"></div>
      </div>
    `;

    const els = {
      posX: root.querySelector('#posX'), numPosX: root.querySelector('#numPosX'),
      posY: root.querySelector('#posY'), numPosY: root.querySelector('#numPosY'),
      posZ: root.querySelector('#posZ'), numPosZ: root.querySelector('#numPosZ'),
      rotX: root.querySelector('#rotX'), numRotX: root.querySelector('#numRotX'),
      rotY: root.querySelector('#rotY'), numRotY: root.querySelector('#numRotY'),
      rotZ: root.querySelector('#rotZ'), numRotZ: root.querySelector('#numRotZ'),
      scaleU: root.querySelector('#scaleU'),
      scaleX: root.querySelector('#scaleX'), numScaleX: root.querySelector('#numScaleX'),
      scaleY: root.querySelector('#scaleY'), numScaleY: root.querySelector('#numScaleY'),
      scaleZ: root.querySelector('#scaleZ'), numScaleZ: root.querySelector('#numScaleZ'),
    };

    let isUpdatingUI = false; // prevent feedback loops

    function updateUI(obj){
      if (!obj) return;
      isUpdatingUI = true;
      
      const pos = obj.position;
      els.posX.value = els.numPosX.value = pos.x.toFixed(2);
      els.posY.value = els.numPosY.value = pos.y.toFixed(2);
      els.posZ.value = els.numPosZ.value = pos.z.toFixed(2);

      const rot = obj.rotation;
      els.rotX.value = els.numRotX.value = THREE.MathUtils.radToDeg(rot.x).toFixed(1);
      els.rotY.value = els.numRotY.value = THREE.MathUtils.radToDeg(rot.y).toFixed(1);
      els.rotZ.value = els.numRotZ.value = THREE.MathUtils.radToDeg(rot.z).toFixed(1);
      
      const scale = obj.scale;
      els.scaleX.value = els.numScaleX.value = scale.x.toFixed(2);
      els.scaleY.value = els.numScaleY.value = scale.y.toFixed(2);
      els.scaleZ.value = els.numScaleZ.value = scale.z.toFixed(2);
      
      // Check if scale is uniform
      if (scale.x.toFixed(2) === scale.y.toFixed(2) && scale.x.toFixed(2) === scale.z.toFixed(2)) {
        els.scaleU.value = scale.x.toFixed(2);
      } else {
        // approx uniform value
        els.scaleU.value = ((scale.x + scale.y + scale.z) / 3).toFixed(2);
      }
      
      isUpdatingUI = false;
    }
    
    // Link sliders and number inputs
    function linkInputs(sliderEl, numEl, isFloat = true) {
      sliderEl.addEventListener('input', () => {
        numEl.value = sliderEl.value;
        sendUpdate();
      });
      numEl.addEventListener('input', () => {
        sliderEl.value = numEl.value;
        sendUpdate();
      });
    }

    linkInputs(els.posX, els.numPosX);
    linkInputs(els.posY, els.numPosY);
    linkInputs(els.posZ, els.numPosZ);
    linkInputs(els.rotX, els.numRotX, false);
    linkInputs(els.rotY, els.numRotY, false);
    linkInputs(els.rotZ, els.numRotZ, false);
    linkInputs(els.scaleX, els.numScaleX);
    linkInputs(els.scaleY, els.numScaleY);
    linkInputs(els.scaleZ, els.numScaleZ);
    
    // Uniform scale handler
    els.scaleU.addEventListener('input', ()=>{
      const val = parseFloat(els.scaleU.value);
      els.scaleX.value = els.numScaleX.value = val.toFixed(2);
      els.scaleY.value = els.numScaleY.value = val.toFixed(2);
      els.scaleZ.value = els.numScaleZ.value = val.toFixed(2);
      sendUpdate(true); // isUniform = true
    });

    function sendUpdate(isUniform = false){
      if (isUpdatingUI) return;
      
      const payload = {
        position: {
          x: parseFloat(els.numPosX.value),
          y: parseFloat(els.numPosY.value),
          z: parseFloat(els.numPosZ.value),
        },
        rotation: {
          x: parseFloat(els.numRotX.value),
          y: parseFloat(els.numRotY.value),
          z: parseFloat(els.numRotZ.value),
        },
        scale: isUniform 
          ? { uniform: parseFloat(els.scaleU.value) }
          : {
              x: parseFloat(els.numScaleX.value),
              y: parseFloat(els.numScaleY.value),
              z: parseFloat(els.numScaleZ.value),
            }
      };
      
      // If user tweaked X,Y,Z, and they're not uniform, don't send uniform
      if (!isUniform) {
        const s = payload.scale;
        if (s.x !== s.y || s.x !== s.z) {
          // values are not uniform, update slider to avg
          isUpdatingUI = true;
          els.scaleU.value = ((s.x + s.y + s.z) / 3).toFixed(2);
          isUpdatingUI = false;
        } else {
          // they are uniform, update slider to match
          isUpdatingUI = true;
          els.scaleU.value = s.x.toFixed(2);
          isUpdatingUI = false;
        }
      }

      bus.emit('transform-update', payload);
    }

    // Update UI from external changes (gizmo, selection)
    bus.on('selection-changed', obj => updateUI(obj));
    bus.on('transform-changed', obj => updateUI(obj));
  }
};
