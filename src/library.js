/*
File: src/library.js
*/
// UI for the Library tab
export default {
  init(root, bus, State, Registry) {
    root.innerHTML = `
      <div class="group">
        <h3>Add Component</h3>
        <div class="row"><label>Type</label><select id="addType"></select></div>
        <div class="row"><label>Preset</label>
          <select id="addPreset">
            <option value="__none__">— None —</option>
            <option value="base-tall">Base: Tall</option>
            <option value="neck-slim">Neck: Slim</option>
            <option value="roof-flat">Roof: Flat-top</option>
            <option value="roof-point">Roof: Pointed</option>
            <option value="pipes-quad">Pipes x4</option>
            <option value="pad-long">Pad: Long</option>
          </select>
        </div>
        <div class="row"><label>&nbsp;</label><button id="addBtn" class="primary">Add to Scene</button></div>
        <small class="note">New components are added at the scene origin.</small>
      </div>
    `;

    const addType = root.querySelector('#addType');
    const addPreset = root.querySelector('#addPreset');
    const addBtn = root.querySelector('#addBtn');

    // Populate the types dropdown
    for (const { type, label } of Registry.Registry.values()) {
      const o = document.createElement('option');
      o.value = type;
      o.textContent = label;
      addType.appendChild(o);
    }
    
    addBtn.addEventListener('click', () => {
      State.addEntity(addType.value, addPreset.value);
    });
  }
};
