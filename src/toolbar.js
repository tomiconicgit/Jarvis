/*
File: src/toolbar.js
*/
// toolbar.js — File, Edit, View, and Add menus
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import * as THREE from 'three';

export default {
  init(root, bus, editor){
    root.innerHTML = `
      <div class="menu" data-m="file">File</div>
      <div class="menu" data-m="edit">Edit</div>
      <div class="menu" data-m="view">View</div>
      <div class="menu" data-m="add">Add</div>
    `;

    root.addEventListener('click', e=>{
      const m = e.target?.dataset?.m; if (!m) return;
      if (m==='file') showFileMenu(e.target);
      if (m==='edit') showEditMenu(e.target);
      if (m==='view') showViewMenu(e.target);
      if (m==='add') showAddMenu(e.target);
    });

    function showFileMenu(anchor){
      popup(anchor, [
        ['New',   newProject],
        ['Save',  saveProject],
        ['Load',  loadProject],
        ['Export…', exportDialog]
      ]);
    }

    function showEditMenu(anchor){
      popup(anchor, [
        ['Undo',      ()=> bus.emit('history-undo')],
        ['Redo',      ()=> bus.emit('history-redo')],
        ['Duplicate', ()=> bus.emit('duplicate-selection')],
        ['Delete',    ()=> bus.emit('delete-selection')]
      ]);
    }

    function showViewMenu(anchor){
      popup(anchor, [
        ['Toggle Grid',             ()=> bus.emit('toggle-grid')],
        ['Toggle Object Wireframe', ()=> bus.emit('toggle-object-wireframe')]
      ]);
    }
    
    function showAddMenu(anchor){
      popup(anchor, [
        ['Cube',        ()=> bus.emit('add-object', { type: 'cube' })],
        ['Sphere',      ()=> bus.emit('add-object', { type: 'sphere' })],
        ['Hollow Cube', ()=> bus.emit('add-object', { type: 'hollowcube' })]
      ]);
    }

    function newProject(){
      confirmModal('Start a new project? Unsaved changes will be lost.', 'Start New', ()=>{
        editor.setSelected?.(null);
        [...editor.world.children].forEach(c=> editor.world.remove(c));
        bus.emit('scene-updated');
        bus.emit('history-push', 'New Project');
      });
    }

    function saveProject(){
      const worldJSON = editor.world.toJSON();
      const payload = { type:'IconicProject', version:1, world:worldJSON };
      downloadBlob(new Blob([JSON.stringify(payload)], {type:'application/json'}), 'iconic_project.iconic.json');
    }

    function loadProject(){
      const input = filePick('.iconic.json,application/json');
      input.onchange = async () => {
        const f = input.files?.[0]; if (!f) return;
        const text = await f.text();
        const data = JSON.parse(text);
        if (!data || !data.world) return;
        confirmModal('Replace current scene with loaded project?', 'Load Project', ()=>{
          editor.setSelected?.(null);
          [...editor.world.children].forEach(c=> editor.world.remove(c));
          const loader = new THREE.ObjectLoader();
          const obj = loader.parse(data.world);
          (obj.children||[]).forEach(child=> editor.world.add(child));
          bus.emit('scene-updated');
          bus.emit('history-push', 'Load Project');
        });
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
  }
};

/* ---------- tiny UI helpers ---------- */
function popup(anchor, items){
  const r = anchor.getBoundingClientRect();
  const top  = r.bottom + 6;
  const left = r.left;
  const m = document.createElement('div');
  m.style.cssText = `
    position:fixed;top:${Math.round(top)}px;left:${Math.round(left)}px;z-index:200;
    background:var(--panel);
    border:1px solid var(--panel-border);
    border-radius:var(--radius-sm);
    min-width:220px;overflow:hidden;
    box-shadow:0 4px 12px rgba(0,0,0,.3);
    color:var(--text);
    font-size: 14px;
  `;
  items.forEach(([label,fn],i)=>{
    const it = document.createElement('div');
    it.textContent = label;
    it.style.cssText = `
      padding:9px 14px;
      cursor:pointer;
      border-bottom:1px solid var(--panel-border)
    `;
    it.addEventListener('click', e=>{ e.stopPropagation(); fn(e); m.remove(); });
    it.addEventListener('mouseenter', ()=> it.style.background = 'rgba(77,163,255,.12)');
    it.addEventListener('mouseleave', ()=> it.style.background = 'transparent');
    if (i===items.length-1) it.style.borderBottom='0';
    m.appendChild(it);
  });
  document.body.appendChild(m);
  const closer = ev => { if (!m.contains(ev.target)) m.remove(); };
  setTimeout(()=> document.addEventListener('click', closer, { once:true, capture:true }), 0);
}

function modal(html){
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:300';
  const card = document.createElement('div');
  card.style.cssText = `
    background:var(--panel);border:1px solid var(--panel-border);
    border-radius:var(--radius-sm);
    padding:16px;
    max-width:400px;
    width:clamp(320px, 92vw, 400px);
    height:auto;color:var(--text);
  `;
  card.innerHTML = html;
  wrap.appendChild(card);
  document.body.appendChild(wrap);
  return wrap;
}

function confirmModal(message, confirmLabel, onConfirm){
  const ui = modal(`
    <h3 style="margin:0 0 10px 0; font-weight:600;">Confirm</h3>
    <p style="margin:0 0 16px 0;color:var(--muted);font-size:14px;">${message}</p>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button id="cCancel">Cancel</button>
      <button id="cGo" class="primary">${confirmLabel}</button>
    </div>
  `);
  ui.querySelector('#cCancel').onclick = ()=> ui.remove();
  ui.querySelector('#cGo').onclick = ()=> { onConfirm?.(); ui.remove(); };
}

function filePick(accept){ const i = document.createElement('input'); i.type='file'; i.accept = accept; return i; }

function downloadBlob(blob, name){
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href:url, download:name });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function exportGLB(root, opts, baseName='iconic_scene'){
  const exporter = new GLTFExporter();
  exporter.parse(root, (result)=>{
    const ext = opts.binary ? 'glb' : 'gltf';
    const data = opts.binary ? result : JSON.stringify(result);
    const mime = opts.binary ? 'model/gltf-binary' : 'model/gltf+json';
    const blob = new Blob([data], { type:mime });
    downloadBlob(blob, `${baseName}.${ext}`);
  }, undefined, {
    binary: !!opts.binary,
    onlyVisible: !!opts.onlyVisible,
    embedImages: !!opts.embedImages,
    trs: !!opts.trs,
    maxTextureSize: opts.maxTextureSize || 4096
  });
}