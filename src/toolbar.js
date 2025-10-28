// toolbar.js — top bar menus (File, Edit, Add, View)
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

let activeMenu = null;

function closeActiveMenu() {
  if (activeMenu) {
    activeMenu.element.remove();
    document.removeEventListener('click', activeMenu.closer, true);
    activeMenu = null;
  }
}

export default {
  init(root, bus, editor){
    root.innerHTML = `
      <div class="menu" data-m="file">File</div>
      <div class="menu" data-m="edit">Edit</div>
      <div class="menu" data-m="add">Add</div>
      <div class="menu" data-m="view">View</div>
    `;

    root.addEventListener('click', e=>{
      const m = e.target?.dataset?.m; if (!m) return;
      if (m==='add') showAddMenu(e.target);
      if (m==='view') showViewMenu(e.target);
      if (m==='edit') showEditMenu(e.target);
      if (m==='file') showFileMenu(e.target);
    });

    function showAddMenu(anchor){
      popup(anchor, [
        ['Mesh…', openMeshLibrary],
        ['Light ▸', (ev)=>showLightSubmenu(anchor)],
        ['Particle', ()=> addParticle()]
      ]);
    }
    function showLightSubmenu(anchor){
      popup(anchor, [
        ['Directional Light', ()=> bus.emit('add-light', { type:'directional' })],
        ['Point Light', ()=> bus.emit('add-light', { type:'point' })],
        ['Spot Light', ()=> bus.emit('add-light', { type:'spot' })],
        ['Hemisphere Light', ()=> bus.emit('add-light', { type:'hemisphere' })]
      ], { anchorOverride: anchor, offsetY: 28 });
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
        ['Duplicate', ()=>bus.emit('duplicate-selection')],
        ['Undo (⌘/Ctrl+Z)', ()=>bus.emit('history-undo')],
        ['Redo (⇧+⌘/Ctrl+Z)', ()=>bus.emit('history-redo')],
        ['Delete (Del)', ()=>bus.emit('delete-selection')]
      ]);
    }
    function showFileMenu(anchor){
      popup(anchor, [
        ['New', newProject],
        ['Save', saveProject],
        ['Load', loadProject],
        ['Export…', exportDialog],
        ['Import GLB', importGLB]
      ]);
    }

    async function openMeshLibrary(){
      const { default: MeshLibrary } = await import('./mesh.js');
      MeshLibrary.open(bus, editor);
    }

    function addParticle(){
      bus.emit('add-particle', { type: 'basic' });
    }

    /* ---------- File actions ---------- */
    function newProject(){
      const ui = modal(`
        <h3 style="margin:0 0 10px 0">New Project</h3>
        <p style="margin:0 0 12px 0;color:var(--muted)">Start a new project? Unsaved changes will be lost.</p>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button id="newCancel">Cancel</button>
          <button id="newGo" class="primary">Start New</button>
        </div>
      `);
      ui.querySelector('#newCancel').onclick = () => ui.remove();
      ui.querySelector('#newGo').onclick = ()=>{
        editor.setSelected(null);
        [...editor.world.children].forEach(c=> editor.world.remove(c));
        bus.emit('scene-updated');
        bus.emit('history-push', 'New Project');
        ui.remove();
      };
    }

    function saveProject(){
      const worldJSON = editor.world.toJSON();
      const payload = { type:'IconicProject', version:1, world:worldJSON };
      const blob = new Blob([JSON.stringify(payload)], {type:'application/json'});
      downloadBlob(blob, 'iconic_project.iconic.json');
    }

    function loadProject(){
      const input = filePick('.iconic.json,application/json');
      input.onchange = async () => {
        const f = input.files?.[0]; if (!f) return;
        const text = await f.text();
        const data = JSON.parse(text);
        if (!data || !data.world) return;

        const ui = modal(`
          <h3 style="margin:0 0 10px 0">Load Project</h3>
          <p style="margin:0 0 12px 0;color:var(--muted)">Replace current scene?</p>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button id="loadCancel">Cancel</button>
            <button id="loadGo" class="primary">Load Project</button>
          </div>
        `);
        ui.querySelector('#loadCancel').onclick = () => ui.remove();
        ui.querySelector('#loadGo').onclick = () => {
          editor.setSelected(null);
          [...editor.world.children].forEach(c=> editor.world.remove(c));
          const loader = new THREE.ObjectLoader();
          const obj = loader.parse(data.world);
          (obj.children||[]).forEach(child=> editor.world.add(child));
          bus.emit('scene-updated');
          bus.emit('history-push', 'Load Project');
          ui.remove();
        };
      };
      input.click();
    }

    function exportDialog(){
      const ui = modal(`
        <h3 style="margin:0 0 10px 0">Export</h3>
        <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center">
          <label>Filename</label><input id="exName" type="text" value="iconic_scene"/>
          <label>Binary (.glb)</label><input id="exBin" type="checkbox" checked/>
          <label>Only visible</label><input id="exVis" type="checkbox" checked/>
          <label>Embed images</label><input id="exEmbed" type="checkbox" checked/>
          <label>TRS</label><input id="exTrs" type="checkbox"/>
          <label>Max texture size</label><input id="exTex" type="number" min="256" max="8192" step="256" value="4096"/>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button id="exCancel">Cancel</button>
          <button id="exGo" class="primary">Export</button>
        </div>
      `);
      ui.querySelector('#exCancel').onclick = () => ui.remove();
      ui.querySelector('#exGo').onclick = ()=>{
        const name = ui.querySelector('#exName').value.trim() || 'iconic_scene';
        exportGLB(editor.world, {
          binary: ui.querySelector('#exBin').checked,
          onlyVisible: ui.querySelector('#exVis').checked,
          embedImages: ui.querySelector('#exEmbed').checked,
          trs: ui.querySelector('#exTrs').checked,
          maxTextureSize: +ui.querySelector('#exTex').value || 4096
        }, name);
        ui.remove();
      };
    }

    function importGLB(){
      const input = filePick('.glb,.gltf,model/gltf-binary,model/gltf+json');
      input.onchange = async ()=>{
        const f = input.files?.[0]; if(!f) return;
        const url = URL.createObjectURL(f);
        const loader = new GLTFLoader();
        loader.load(url, gltf=>{
          const root = gltf.scene || gltf.scenes?.[0];
          if (!root) { URL.revokeObjectURL(url); return; }
          root.traverse(o=>{ if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
          editor.world.add(root);
          bus.emit('scene-updated');
          bus.emit('history-push', 'Import GLB');
          URL.revokeObjectURL(url);
        }, undefined, err=>{ console.error(err); URL.revokeObjectURL(url); });
      };
      input.click();
    }
  }
};

/* ---- anchored popup ---- */
function popup(anchor, items, opts={}){
  closeActiveMenu();
  const r = anchor.getBoundingClientRect();
  const top = (opts.anchorOverride? opts.anchorOverride.getBoundingClientRect().bottom : r.bottom) + (opts.offsetY||6);
  const left = (opts.anchorOverride? opts.anchorOverride.getBoundingClientRect().left : r.left);
  const m = document.createElement('div');
  m.style.cssText = `
    position:fixed;top:${Math.round(top)}px;left:${Math.round(left)}px;
    z-index:200;background:#15171d;border:1px solid rgba(255,255,255,.12);
    border-radius:10px;min-width:220px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.4);
    color: var(--text);
  `;
  items.forEach(([label,fn])=>{
    const it = document.createElement('div');
    it.textContent = label;
    it.style.cssText = 'padding:10px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.08)';
    it.addEventListener('click', e=>{
      e.stopPropagation(); fn(e); closeActiveMenu();
    });
    it.addEventListener('mouseenter', ()=> it.style.background = 'rgba(77,163,255,.12)');
    it.addEventListener('mouseleave', ()=> it.style.background = 'transparent');
    m.appendChild(it);
  });
  if (m.lastChild) m.lastChild.style.borderBottom='0';
  document.body.appendChild(m);
  const closer = (ev) => { if (!m.contains(ev.target)) closeActiveMenu(); };
  activeMenu = { element: m, closer };
  setTimeout(()=> document.addEventListener('click', closer, true), 0);
}

/* ---- Export helper ---- */
function exportGLB(root, opts, baseName='iconic_scene'){
  const exporter = new GLTFExporter();
  exporter.parse(root, (result)=>{
    const ext = opts.binary ? 'glb' : 'gltf';
    const data = opts.binary ? result : JSON.stringify(result);
    const mime = opts.binary ? 'model/gltf-binary' : 'model/gltf+json';
    const blob = new Blob([data], { type:mime });
    downloadBlob(blob, `${baseName}.${ext}`);
  }, (err) => {
      console.error('An error happened during GLTF export:', err);
  }, {
    binary: !!opts.binary,
    onlyVisible: !!opts.onlyVisible,
    embedImages: !!opts.embedImages,
    trs: !!opts.trs,
    maxTextureSize: opts.maxTextureSize || 4096
  });
}

/* ---- tiny helpers ---- */
function modal(html){
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:300';
  const card = document.createElement('div');
  // near full-screen responsive
  card.style.cssText = `
    background:var(--panel);border:1px solid var(--panel-border);border-radius:12px;
    padding:14px;max-width:1100px;width:clamp(320px, 92vw, 1100px);
    height:clamp(420px, 88vh, 900px); color:var(--text); display:block;
  `;
  card.innerHTML = html;
  wrap.appendChild(card);
  document.body.appendChild(wrap);
  return wrap;
}
function filePick(accept){ const i = document.createElement('input'); i.type='file'; i.accept = accept; return i; }
function downloadBlob(blob, name){
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href:url, download:name });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}