// scene.js — "Scene" tab: outliner, background, lighting, gizmo mode
export default {
  init(root, bus, editor){
    root.innerHTML = `
      <div class="group">
        <h3>Outliner</h3>
        <div class="list" id="outliner"></div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button id="btn-attach">Attach Gizmo</button>
          <button id="btn-delete">Delete</button>
        </div>
      </div>
      <div class="group">
        <h3>View</h3>
        <div class="row simple"><label>Background</label><input id="bg" type="color" value="#0b0c0f"/></div>
        <div class="row simple"><label>Lighting</label>
          <select id="lighting"><option>Day</option><option>Night</option><option>Studio</option></select>
        </div>
        <div class="row simple"><label>Gizmo</label>
          <select id="gizmo"><option value="translate">Translate</option><option value="rotate">Rotate</option><option value="scale">Scale</option></select>
        </div>
      </div>
    `;

    const list = root.querySelector('#outliner');

    function refresh(){
      list.innerHTML = '';
      editor.listObjects().forEach(obj=>{
        const row = document.createElement('div');
        row.className = 'item' + (obj===editor.selected?' active':'');
        row.textContent = obj.name || obj.type;
        row.addEventListener('click', ()=> bus.emit('selection-from-outliner', obj));
        list.appendChild(row);
      });
    }
    refresh();

    /* wiring */
    root.querySelector('#bg').addEventListener('change', e=> bus.emit('set-background', e.target.value));
    root.querySelector('#lighting').addEventListener('change', e=> bus.emit('set-lighting', e.target.value));
    root.querySelector('#gizmo').addEventListener('change', e=> bus.emit('set-gizmo', e.target.value));
    root.querySelector('#btn-attach').addEventListener('click', ()=> bus.emit('attach-selected'));
    root.querySelector('#btn-delete').addEventListener('click', ()=> bus.emit('delete-selection'));

    // events
    bus.on('scene-updated', refresh);
    bus.on('selection-changed', ()=>{ refresh(); });
    bus.on('selection-from-outliner', (obj)=> editor.setSelected(obj));
  }
};