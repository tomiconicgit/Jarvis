/*
File: src/inspector.js
*/
// UI for the Inspector tab (was transform.js)
import * as THREE from 'three';

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
        <div class="row">
          <label>Position</label>
          <div class="btnbar">
            <input type="number" step="0.1" id="insp-px" />
            <input type="number" step="0.1" id="insp-py" />
            <input type="number" step="0.1" id="insp-pz" />
          </div>
        </div>
        <div class="row">
          <label>Rotation</label>
          <div class="btnbar">
            <input type="number" step="1" id="insp-rx" />
            <input type="number" step="1" id="insp-ry" />
            <input type="number" step="1" id="insp-rz" />
          </div>
        </div>
        <div class="row">
          <label>Scale</label>
          <div class="btnbar">
            <input type="number" step="0.01" id="insp-sx" />
            <input type="number" step="0.01" id="insp-sy" />
            <input type="number" step="0.01" id="insp-sz" />
          </div>
        </div>
      </div>
    `;
    
    root.appendChild(transformRoot);
    root.appendChild(paramsRoot);

    const inputs = {
      px: root.querySelector('#insp-px'), py: root.querySelector('#insp-py'), pz: root.querySelector('#insp-pz'),
      rx: root.querySelector('#insp-rx'), ry: root.querySelector('#insp-ry'), rz: root.querySelector('#insp-rz'),
      sx: root.querySelector('#insp-sx'), sy: root.querySelector('#insp-sy'), sz: root.querySelector('#insp-sz'),
    };

    function updateTransformUI(obj) {
      if (!obj) return;
      inputs.px.value = obj.position.x.toFixed(2);
      inputs.py.value = obj.position.y.toFixed(2);
      inputs.pz.value = obj.position.z.toFixed(2);
      inputs.rx.value = THREE.MathUtils.radToDeg(obj.rotation.x).toFixed(1);
      inputs.ry.value = THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(1);
      inputs.rz.value = THREE.MathUtils.radToDeg(obj.rotation.z).toFixed(1);
      inputs.sx.value = obj.scale.x.toFixed(2);
      inputs.sy.value = obj.scale.y.toFixed(2);
      inputs.sz.value = obj.scale.z.toFixed(2);
    }
    
    function onTransformChange() {
      const ent = State.getEntity(State.getSelected());
      if (!ent) return;
      ent.object.position.set(parseFloat(inputs.px.value), parseFloat(inputs.py.value), parseFloat(inputs.pz.value));
      ent.object.rotation.set(
        THREE.MathUtils.degToRad(parseFloat(inputs.rx.value)),
        THREE.MathUtils.degToRad(parseFloat(inputs.ry.value)),
        THREE.MathUtils.degToRad(parseFloat(inputs.rz.value))
      );
      ent.object.scale.set(parseFloat(inputs.sx.value), parseFloat(inputs.sy.value), parseFloat(inputs.sz.value));
      bus.emit('gizmo-attach', ent.object); // Re-attach to update gizmo
      bus.emit('history-push-debounced', 'Transform');
    }
    
    Object.values(inputs).forEach(inp => inp.addEventListener('change', onTransformChange));

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
