/*
File: src/inspector.js
*/
// UI for the Inspector tab (was transform.js)
import * as THREE from 'three';

// Helper to create a slider row
function createSliderRow(id, label, min, max, step, val, dp = 2) {
  return `
    <div class="row slider">
      <label for="${id}_range">${label}</label>
      <input type="range" id="${id}_range" min="${min}" max="${max}" step="${step}" value="${val}">
      <input type="number" id="${id}_num" min="${min}" max="${max}" step="${step}" value="${val}">
    </div>
  `;
}

// Helper to bi-directionally link a slider and a number input
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

export default {
  init(root, bus, State, Registry) {
    
    // This root will hold the dynamically generated UI
    const paramsRoot = document.createElement('div');
    paramsRoot.id = 'params-root';
    
    // This root will hold the static transform UI
    const transformRoot = document.createElement('div');
    transformRoot.innerHTML = `
      <div class="group">
        <h3>Transform</h3>
        ${createSliderRow('insp_px', 'Pos X', -50, 50, 0.1, 0, 2)}
        ${createSliderRow('insp_py', 'Pos Y', -50, 50, 0.1, 0, 2)}
        ${createSliderRow('insp_pz', 'Pos Z', -50, 50, 0.1, 0, 2)}
        ${createSliderRow('insp_rx', 'Rot X', -360, 360, 1, 0, 1)}
        ${createSliderRow('insp_ry', 'Rot Y', -360, 360, 1, 0, 1)}
        ${createSliderRow('insp_rz', 'Rot Z', -360, 360, 1, 0, 1)}
        ${createSliderRow('insp_sx', 'Scale X', 0.01, 10, 0.01, 1, 2)}
        ${createSliderRow('insp_sy', 'Scale Y', 0.01, 10, 0.01, 1, 2)}
        ${createSliderRow('insp_sz', 'Scale Z', 0.01, 10, 0.01, 1, 2)}
      </div>
    `;
    
    root.appendChild(transformRoot);
    root.appendChild(paramsRoot);

    const inputs = {
      px_r: root.querySelector('#insp_px_range'), px_n: root.querySelector('#insp_px_num'),
      py_r: root.querySelector('#insp_py_range'), py_n: root.querySelector('#insp_py_num'),
      pz_r: root.querySelector('#insp_pz_range'), pz_n: root.querySelector('#insp_pz_num'),
      rx_r: root.querySelector('#insp_rx_range'), rx_n: root.querySelector('#insp_rx_num'),
      ry_r: root.querySelector('#insp_ry_range'), ry_n: root.querySelector('#insp_ry_num'),
      rz_r: root.querySelector('#insp_rz_range'), rz_n: root.querySelector('#insp_rz_num'),
      sx_r: root.querySelector('#insp_sx_range'), sx_n: root.querySelector('#insp_sx_num'),
      sy_r: root.querySelector('#insp_sy_range'), sy_n: root.querySelector('#insp_sy_num'),
      sz_r: root.querySelector('#insp_sz_range'), sz_n: root.querySelector('#insp_sz_num'),
    };

    function updateTransformUI(obj) {
      if (!obj) return;
      inputs.px_r.value = obj.position.x; inputs.px_n.value = obj.position.x.toFixed(2);
      inputs.py_r.value = obj.position.y; inputs.py_n.value = obj.position.y.toFixed(2);
      inputs.pz_r.value = obj.position.z; inputs.pz_n.value = obj.position.z.toFixed(2);
      
      const rx = THREE.MathUtils.radToDeg(obj.rotation.x);
      const ry = THREE.MathUtils.radToDeg(obj.rotation.y);
      const rz = THREE.MathUtils.radToDeg(obj.rotation.z);
      inputs.rx_r.value = rx; inputs.rx_n.value = rx.toFixed(1);
      inputs.ry_r.value = ry; inputs.ry_n.value = ry.toFixed(1);
      inputs.rz_r.value = rz; inputs.rz_n.value = rz.toFixed(1);
      
      inputs.sx_r.value = obj.scale.x; inputs.sx_n.value = obj.scale.x.toFixed(2);
      inputs.sy_r.value = obj.scale.y; inputs.sy_n.value = obj.scale.y.toFixed(2);
      inputs.sz_r.value = obj.scale.z; inputs.sz_n.value = obj.scale.z.toFixed(2);
    }
    
    function onTransformChange() {
      const ent = State.getEntity(State.getSelected());
      if (!ent) return;
      ent.object.position.set(parseFloat(inputs.px_n.value), parseFloat(inputs.py_n.value), parseFloat(inputs.pz_n.value));
      ent.object.rotation.set(
        THREE.MathUtils.degToRad(parseFloat(inputs.rx_n.value)),
        THREE.MathUtils.degToRad(parseFloat(inputs.ry_n.value)),
        THREE.MathUtils.degToRad(parseFloat(inputs.rz_n.value))
      );
      ent.object.scale.set(parseFloat(inputs.sx_n.value), parseFloat(inputs.sy_n.value), parseFloat(inputs.sz_n.value));
      
      // bus.emit('gizmo-attach', ent.object); // Removed: Unnecessary
      bus.emit('history-push-debounced', 'Transform');
    }
    
    // Link all the inputs
    linkSlider(inputs.px_r, inputs.px_n, 2, onTransformChange);
    linkSlider(inputs.py_r, inputs.py_n, 2, onTransformChange);
    linkSlider(inputs.pz_r, inputs.pz_n, 2, onTransformChange);
    linkSlider(inputs.rx_r, inputs.rx_n, 1, onTransformChange);
    linkSlider(inputs.ry_r, inputs.ry_n, 1, onTransformChange);
    linkSlider(inputs.rz_r, inputs.rz_n, 1, onTransformChange);
    linkSlider(inputs.sx_r, inputs.sx_n, 2, onTransformChange);
    linkSlider(inputs.sy_r, inputs.sy_n, 2, onTransformChange);
    linkSlider(inputs.sz_r, inputs.sz_n, 2, onTransformChange);

    // Listen for gizmo changes to update this UI
    bus.on('transform-changed-by-gizmo', (payload) => {
      if (payload.id === State.getSelected()) {
        updateTransformUI(payload.object);
      }
    });

    // Listen for selection changes
    bus.on('selection-changed', (ent) => {
      if (!ent) {
        paramsRoot.innerHTML = '<div class="group"><h3>Parameters</h3><div>No object selected.</div></div>';
        transformRoot.style.display = 'none';
        return;
      }
      
      // Update transform UI
      transformRoot.style.display = 'block';
      updateTransformUI(ent.object);
      
      // Update params UI
      const reg = Registry.Registry.get(ent.type);
      if (!reg) {
        paramsRoot.innerHTML = '<div class="group"><h3>Parameters</h3><div>No parameters for this object.</div></div>';
        return;
      }
      
      const group = document.createElement('div');
      group.className = 'group';
      group.innerHTML = '<h3>Parameters</h3>';
      
      Registry.buildInspectorUI(
        group, // Pass the group element
        ent.type,
        ent.params,
        (key, value) => { // onChange
          ent.params[key] = value;
          State.rebuildEntity(ent.id);
          bus.emit('history-push-debounced', 'Inspect');
        },
        async (actionKey) => { // onAction
          const act = (reg.actions || []).find(a => a.key === actionKey);
          if (act) {
            await act.run(ent, { entities: State.getEntities() }); // Pass the state API
            bus.emit('history-push', 'Action: ' + actionKey);
          }
        },
        { entities: State.getEntities() } // Pass current state for 'entity' type dropdowns
      );
      paramsRoot.innerHTML = ''; // Clear previous
      paramsRoot.appendChild(group);
    });
    
    // Initial state
    paramsRoot.innerHTML = '<div class="group"><h3>Parameters</h3><div>No object selected.</div></div>';
    transformRoot.style.display = 'none';
  }
};
