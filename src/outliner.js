/*
File: src/outliner.js
*/
// UI for the Outliner tab (was scene.js)
export default {
  init(root, bus, State, Registry) {
    root.innerHTML = `
      <div class="group">
        <h3>Scene Entities</h3>
        <div class="list" id="entityList"></div>
        <div class="btnbar" style="margin-top:12px;">
          <button id="dupBtn">Duplicate</button>
          <button id="delBtn">Delete</button>
        </div>
      </div>
      <div class="group">
        <h3>Gizmo</h3>
        <div class="row"><label>Mode</label>
          <select id="gizmoMode"><option value="translate">Move</option><option value="rotate">Rotate</option><option value="scale">Scale</option></select>
        </div>
        <div class="row"><label>&nbsp;</label><button id="frameBtn">Frame Selection</button></div>
      </div>
    `;

    const listEl = root.querySelector('#entityList');

    function refreshList() {
      listEl.innerHTML = '';
      const selectedId = State.getSelected();
      
      for (const ent of State.getEntities()) {
        const row = document.createElement('div');
        row.className = 'item';
        if (ent.id === selectedId) {
          row.classList.add('active');
        }
        row.dataset.id = ent.id;
        
        const label = Registry.Registry.get(ent.type)?.label || ent.type;
        row.innerHTML = `<span>${label} (${ent.id})</span>`;
        
        row.addEventListener('click', () => {
          State.selectEntity(ent.id);
        });
        
        listEl.appendChild(row);
      }
    }
    
    // Listen for state changes to refresh
    bus.on('state-changed', refreshList);
    bus.on('selection-changed', refreshList);

    // Wire up buttons
    root.querySelector('#dupBtn').addEventListener('click', () => State.duplicateEntity(State.getSelected()));
    root.querySelector('#delBtn').addEventListener('click', () => State.deleteEntity(State.getSelected()));
    
    root.querySelector('#gizmoMode').addEventListener('change', e => bus.emit('set-gizmo', e.target.value));
    root.querySelector('#frameBtn').addEventListener('click', () => {
      bus.emit('frame-selection', State.getEntity(State.getSelected()));
    });
    
    refreshList(); // Initial render
  }
};
