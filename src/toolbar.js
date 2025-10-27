// toolbar.js — top bar menus (File, Edit, Add, View)
export default {
  init(root, bus, editor){
    root.innerHTML = `
      <div class="menu" data-m="file">File</div>
      <div class="menu" data-m="edit">Edit</div>
      <div class="menu" data-m="add">Add</div>
      <div class="menu" data-m="view">View</div>
      <div style="margin-left:auto;opacity:.8">CAMERA ▾</div>
      <div style="opacity:.8">SOLID ▾</div>
    `;

    // simple click menus (lean v1)
    root.addEventListener('click', e=>{
      const m = e.target?.dataset?.m;
      if (!m) return;
      if (m==='add') showAddMenu(e.target);
      if (m==='view') showViewMenu(e.target);
      if (m==='edit') showEditMenu(e.target);
      if (m==='file') showFileMenu(e.target);
    });

    function showAddMenu(anchor){
      popup(anchor, [
        ['Box', ()=>bus.emit('add-primitive', {type:'box'})],
        ['Sphere', ()=>bus.emit('add-primitive', {type:'sphere'})],
        ['Cylinder', ()=>bus.emit('add-primitive', {type:'cylinder'})],
        ['Plane', ()=>bus.emit('add-primitive', {type:'plane'})]
      ]);
    }
    function showViewMenu(anchor){
      popup(anchor, [
        ['Frame Selection (F)', ()=>bus.emit('frame-selection')],
        ['Toggle Grid (G)', ()=>bus.emit('toggle-grid')],
        ['Gizmo: Translate', ()=>bus.emit('set-gizmo','translate')],
        ['Gizmo: Rotate', ()=>bus.emit('set-gizmo','rotate')],
        ['Gizmo: Scale', ()=>bus.emit('set-gizmo','scale')]
      ]);
    }
    function showEditMenu(anchor){
      popup(anchor, [
        ['Attach Gizmo', ()=>bus.emit('attach-selected')],
        ['Detach Gizmo', ()=>bus.emit('detach-gizmo')],
        ['Delete (Del)', ()=>bus.emit('delete-selection')]
      ]);
    }
    function showFileMenu(anchor){
      popup(anchor, [
        ['New Scene', ()=>location.reload()],
        ['Export GLB', ()=>exportGLB(editor.world)]
      ]);
    }
  }
};

/* ---- mini popup ---- */
function popup(anchor, items){
  closeAll();
  const m = document.createElement('div');
  m.style.cssText = 'position:absolute;top:44px;left:12px;z-index:50;background:#15171d;border:1px solid rgba(255,255,255,.12);border-radius:10px;min-width:180px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.4)';
  items.forEach(([label,fn])=>{
    const it = document.createElement('div');
    it.textContent = label;
    it.style.cssText = 'padding:10px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.08)';
    it.addEventListener('click', ()=>{ fn(); closeAll(); });
    m.appendChild(it);
  });
  if (m.lastChild) m.lastChild.style.borderBottom='0';
  document.body.appendChild(m);
  function closeAll(){ m.remove(); document.removeEventListener('pointerdown', closer); }
  function closer(ev){ if (!m.contains(ev.target)) closeAll(); }
  setTimeout(()=> document.addEventListener('pointerdown', closer), 0);
}

/* ---- GLB export (simple) ---- */
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
function exportGLB(root){
  const exporter = new GLTFExporter();
  exporter.parse(root, (ab)=>{
    const blob = new Blob([ab], {type:'model/gltf-binary'});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href:url, download:'iconic_scene.glb' });
    a.click(); URL.revokeObjectURL(url);
  }, { binary:true, onlyVisible:true });
}