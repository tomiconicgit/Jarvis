/*
File: src/toolbar.js
*/
// toolbar.js — File, Edit, and View menus
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import * as THREE from 'three';

export default {
  init(root, bus, State){
    root.innerHTML = `
      <div class="menu" data-m="file">File</div>
      <div class="menu" data-m="edit">Edit</div>
      <div class="menu" data-m="view">View</div>
    `;

    root.addEventListener('click', e=>{
      const m = e.target?.dataset?.m; if (!m) return;
      if (m==='file') showFileMenu(e.target);
      if (m==='edit') showEditMenu(e.target);
      if (m==='view') showViewMenu(e.target);
    });

    function showFileMenu(anchor){
      popup(anchor, [
        ['New Project', newProject],
        ['Save (to Local)', ()=> bus.emit('project-save')],
        ['Load (from Local)', ()=> bus.emit('project-load')],
        ['Export GLB…', ()=> bus.emit('project-export')]
      ]);
    }

    function showEditMenu(anchor){
      popup(anchor, [
        ['Undo',      ()=> bus.emit('history-undo')],
        ['Redo',      ()=> bus.emit('history-redo')],
        ['Duplicate', ()=> State.duplicateEntity(State.getSelected())],
        ['Delete',    ()=> State.deleteEntity(State.getSelected())]
      ]);
    }

    function showViewMenu(anchor){
      popup(anchor, [
        ['Frame Selection', ()=> bus.emit('frame-selection', State.getEntity(State.getSelected()))],
        ['Toggle Grid', ()=> bus.emit('project-toggle-grid')],
        ['Toggle Object Wireframe', ()=> bus.emit('toggle-object-wireframe', State.getEntity(State.getSelected()))]
      ]);
    }
    
    function newProject(){
      confirmModal('Start a new project? Unsaved changes will be lost.', 'Start New', ()=>{
        State.deleteAllEntities();
        bus.emit('history-push', 'New Project');
      });
    }
  }
};

/* ---------- tiny UI helpers (from Iconic & Launch Tower) ---------- */
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
      <button id="cCancel" style="width:auto;flex:0 1 auto;">Cancel</button>
      <button id="cGo" class="primary" style="width:auto;flex:0 1 auto;">${confirmLabel}</button>
    </div>
  `);
  ui.querySelector('#cCancel').onclick = ()=> ui.remove();
  ui.querySelector('#cGo').onclick = ()=> { onConfirm?.(); ui.remove(); };
}
