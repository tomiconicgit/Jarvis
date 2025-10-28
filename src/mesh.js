// src/mesh.js — Mesh Library (list only; no preview, no categories)
import * as THREE from 'three';

function modalShell(){
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position:fixed;inset:0;z-index:350;background:rgba(0,0,0,.55);
    display:grid;place-items:center;padding:env(safe-area-inset-top) 8px env(safe-area-inset-bottom);
  `;
  const card = document.createElement('div');
  card.style.cssText = `
    background:var(--panel);border:1px solid var(--panel-border);
    color:var(--text);border-radius:12px;overflow:hidden;
    width:100vw;height:100svh;max-width:640px;
    display:grid;grid-template-rows:56px 1fr 64px;
  `;
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--panel-border)">
      <strong style="font-size:16px;letter-spacing:.3px">Mesh Library</strong>
      <span style="opacity:.7;font-size:12px">Pick an asset, then add.</span>
    </div>
    <div id="list" style="overflow:auto;padding:8px;"></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;padding:10px;border-top:1px solid var(--panel-border)">
      <button id="libClose">Close</button>
      <button id="libAdd" class="primary">Add to scene</button>
    </div>
  `;
  wrap.appendChild(card);
  document.body.appendChild(wrap);
  return { wrap, card };
}

// Items that use Editor.makePrimitive(type)
const PRIMS = [
  { label:'Box',            type:'box' },
  { label:'Hollow Box',     type:'hollow-box' },
  { label:'Sphere',         type:'sphere' },
  { label:'Hollow Sphere',  type:'hollow-sphere' },
  { label:'Cylinder',       type:'cylinder' },
  { label:'Hollow Cylinder',type:'hollow-cylinder' },
  { label:'Plane',          type:'plane' },
];

// Custom builders (kept simple; transform sliders still work)
function makeWheel(){
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.3, 16, 28),
    new THREE.MeshStandardMaterial({ color:0xeeeeee, roughness:.5, metalness:.2 })
  );
  m.rotation.x = Math.PI/2; m.name = 'Wheel'; m.castShadow = m.receiveShadow = true;
  return m;
}
function makeLightBar(){
  const geo = new THREE.BoxGeometry(3, 0.15, 0.15);
  const mat = new THREE.MeshStandardMaterial({ color:0xffffff, emissive:new THREE.Color(0xffffff), emissiveIntensity:1.5, roughness:.2, metalness:.1 });
  const m = new THREE.Mesh(geo, mat); m.name='Light Bar'; m.castShadow = m.receiveShadow = true; return m;
}
function makeStairs(){
  const g = new THREE.Group(); g.name = 'Stairs';
  const mat = new THREE.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.5 });
  const W=2, D=3, H=1.6, STEPS=8;
  for (let i=0;i<STEPS;i++){
    const stepH = H/STEPS, stepD = D/STEPS;
    const s = new THREE.Mesh(new THREE.BoxGeometry(W, stepH, stepD), mat);
    s.position.set(0, stepH/2 + i*stepH, -D/2 + stepD/2 + i*stepD);
    s.castShadow = s.receiveShadow = true;
    g.add(s);
  }
  return g;
}
const CUSTOMS = [
  { label:'Wheel',     build: makeWheel },
  { label:'Light Bar', build: makeLightBar },
  { label:'Stairs',    build: makeStairs }
];

const MeshLibrary = {
  open(bus, editor){
    const { wrap, card } = modalShell();
    const list = card.querySelector('#list');

    const items = [...PRIMS, ...CUSTOMS];
    let selected = null;

    items.forEach(def=>{
      const row = document.createElement('div');
      row.className = 'item';
      row.style.cssText = `
        display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--panel-border);
        border-radius:10px;margin:6px 4px;cursor:pointer;background:rgba(255,255,255,.04)
      `;
      row.innerHTML = `<div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid var(--panel-border)"></div>
                       <div style="font-weight:700">${def.label}</div>`;
      row.onclick = ()=>{
        [...list.children].forEach(c=> c.classList.remove('active'));
        row.classList.add('active'); row.style.background='rgba(77,163,255,.12)';
        selected = def;
      };
      list.appendChild(row);
      if (!selected){ row.click(); } // preselect first
    });

    card.querySelector('#libClose').onclick = ()=> wrap.remove();
    card.querySelector('#libAdd').onclick = ()=>{
      if (!selected) return;
      if (selected.type){
        // standard primitive (parametric/hollow handled in Editor.makePrimitive)
        bus.emit('add-primitive', { type: selected.type });
      } else if (selected.build){
        const obj = selected.build();
        editor.world.add(obj);
        editor.setSelected(obj);
        editor.frame(obj);
        bus.emit('scene-updated');
      }
      bus.emit('history-push', `Add ${selected.label}`);
      wrap.remove();
    };
  }
};

export default MeshLibrary;