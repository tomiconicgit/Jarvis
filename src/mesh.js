// mesh.js — Mesh Library modal (categories, previews, per-item sliders)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function modalShell(){
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.55);display:grid;place-items:center;z-index:350
  `;
  const card = document.createElement('div');
  card.style.cssText = `
    background:var(--panel);border:1px solid var(--panel-border);border-radius:14px;
    width:clamp(340px, 92vw, 1120px); height:clamp(460px, 90vh, 880px); padding:0; display:grid;
    grid-template-columns: 260px 1fr; grid-template-rows: 56px 1fr 64px; grid-template-areas:
    "title title"
    "left  right"
    "footer footer";
    color:var(--text);
  `;
  card.innerHTML = `
    <div style="grid-area:title;display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--panel-border)">
      <strong style="font-size:16px;letter-spacing:.3px">Mesh Library</strong>
      <span style="opacity:.7;font-size:12px">Pick a category, tweak sliders, then add.</span>
    </div>
    <div style="grid-area:left;display:flex;flex-direction:column;border-right:1px solid var(--panel-border);min-width:0">
      <div id="cats" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px"></div>
      <div style="font-size:12px;opacity:.7;padding:0 10px 10px">Categories</div>
      <div id="items" style="flex:1;overflow:auto;border-top:1px solid var(--panel-border)"></div>
    </div>
    <div style="grid-area:right;display:grid;grid-template-rows: 1fr auto;min-width:0;">
      <div id="previewWrap" style="position:relative;min-height:0">
        <canvas id="preview" style="width:100%;height:100%;display:block"></canvas>
      </div>
      <div id="controls" style="padding:10px;border-top:1px solid var(--panel-border)"></div>
    </div>
    <div style="grid-area:footer;display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:10px;border-top:1px solid var(--panel-border)">
      <button id="libClose">Close</button>
      <button id="libAdd" class="primary">Add to scene</button>
    </div>
  `;
  wrap.appendChild(card);
  document.body.appendChild(wrap);
  return { wrap, card };
}

/* ---------- catalog ---------- */
function catalog(THREERef){
  const items = {
    Shapes: [
      {
        id:'box', name:'Box', params:{ w:2,h:2,d:2, r:0 },
        ui:[
          ['w','Width',0.1,20,0.1],['h','Height',0.1,20,0.1],['d','Depth',0.1,20,0.1],
          ['r','Edge Radius',0,1,0.01]
        ],
        build(p){ return new THREERef.Mesh(
          p.r>0 ? new RoundedBoxGeometry(p.w,p.h,p.d,3,Math.min(p.r, Math.min(p.w,p.h,p.d)/2-1e-3))
                : new THREERef.BoxGeometry(p.w,p.h,p.d, 6,6,6),
          new THREERef.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.4 })
        );}
      },
      {
        id:'sphere', name:'Sphere', params:{ r:1.2, ws:48, hs:32 },
        ui:[ ['r','Radius',0.1,10,0.1], ['ws','W Segs',8,128,1], ['hs','H Segs',8,128,1] ],
        build(p){ return new THREERef.Mesh(
          new THREERef.SphereGeometry(p.r, p.ws, p.hs),
          new THREERef.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.4 })
        );}
      },
      {
        id:'cylinder', name:'Cylinder', params:{ rt:1, rb:1, h:2, rs:48 },
        ui:[ ['rt','R Top',0,10,0.1], ['rb','R Bot',0,10,0.1], ['h','Height',0.1,20,0.1], ['rs','Radial',8,128,1] ],
        build(p){ return new THREERef.Mesh(
          new THREERef.CylinderGeometry(p.rt,p.rb,p.h,p.rs,8,false),
          new THREERef.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.4 })
        );}
      }
    ],
    Nature: [
      {
        id:'rock', name:'Rock', params:{ r:1.2, noise:0.35 },
        ui:[ ['r','Radius',0.3,4,0.1], ['noise','Noise',0,1,0.01] ],
        build(p){
          const geo = new THREERef.IcosahedronGeometry(p.r, 2);
          const pos = geo.attributes.position;
          for (let i=0;i<pos.count;i++){
            const nx=(Math.random()-0.5)*p.noise, ny=(Math.random()-0.5)*p.noise, nz=(Math.random()-0.5)*p.noise;
            pos.setXYZ(i, pos.getX(i)+nx, pos.getY(i)+ny, pos.getZ(i)+nz);
          }
          pos.needsUpdate = true; geo.computeVertexNormals();
          return new THREERef.Mesh(geo, new THREERef.MeshStandardMaterial({ color:0xb8c1c9, roughness:.9, metalness:.0 }));
        }
      }
    ],
    Furniture: [
      {
        id:'table', name:'Table', params:{ w:3,d:1.6,h:1, t:0.12, leg:0.12 },
        ui:[ ['w','Width',0.5,6,0.1], ['d','Depth',0.5,6,0.1], ['h','Height',0.4,2.2,0.05], ['t','Top',0.05,0.3,0.01] ],
        build(p){
          const group = new THREERef.Group();
          const mat = new THREERef.MeshStandardMaterial({ color:0xffffff, roughness:.6, metalness:.05 });
          const top = new THREERef.Mesh(new THREERef.BoxGeometry(p.w,p.t,p.d,3,3,3), mat);
          top.position.y = p.h;
          group.add(top);
          const legGeo = new THREERef.BoxGeometry(p.leg,p.h,p.leg,1,1,1);
          const offs = [[-1, -1],[1, -1],[-1,1],[1,1]];
          offs.forEach(([sx,sz])=>{
            const lg = new THREERef.Mesh(legGeo, mat);
            lg.position.set((p.w/2 - p.leg/2)*sx, p.h/2, (p.d/2 - p.leg/2)*sz);
            group.add(lg);
          });
          group.name = 'Table';
          return group;
        }
      }
    ],
    Technology: [
      {
        id:'lightbar', name:'Light Bar', params:{ len:3, thick:0.15, emissive:1.5 },
        ui:[ ['len','Length',0.5,8,0.1], ['thick','Thickness',0.05,0.5,0.01], ['emissive','Glow',0,4,0.05] ],
        build(p){
          const geo = new THREERef.BoxGeometry(p.len, p.thick, p.thick, 2,2,2);
          const mat = new THREERef.MeshStandardMaterial({ color:0xffffff, emissive: new THREERef.Color(0xffffff), emissiveIntensity: p.emissive, metalness:.1, roughness:.2 });
          const m = new THREERef.Mesh(geo, mat); m.name='Light Bar'; return m;
        }
      }
    ],
    Construction: [
      {
        id:'stairs', name:'Stairs', params:{ w:2, d:3, h:1.6, steps:8 },
        ui:[ ['w','Width',0.5,6,0.1], ['d','Depth',0.5,10,0.1], ['h','Height',0.2,4,0.05], ['steps','Steps',2,20,1] ],
        build(p){
          const geom = new THREERef.BufferGeometry();
          const mat = new THREERef.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.5 });
          const tmp = new THREERef.Geometry? new THREERef.Geometry() : null; // legacy check
          // simple step merger
          const meshes = [];
          for (let i=0;i<p.steps;i++){
            const t = i/(p.steps);
            const stepH = (p.h/p.steps);
            const stepD = (p.d/p.steps);
            const g = new THREERef.BoxGeometry(p.w, stepH, stepD, 1,1,1);
            const m = new THREERef.Mesh(g, mat);
            m.position.set(0, stepH/2 + i*stepH, -p.d/2 + stepD/2 + i*stepD);
            meshes.push(m);
          }
          const group = new THREERef.Group();
          meshes.forEach(m=>group.add(m));
          group.name = 'Stairs';
          return group;
        }
      }
    ],
    Vehicles: [
      {
        id:'wheel', name:'Wheel', params:{ r:0.8, tube:0.3, seg:28 },
        ui:[ ['r','Radius',0.2,3,0.05], ['tube','Thickness',0.05,0.8,0.01], ['seg','Segments',8,64,1] ],
        build(p){
          const m = new THREERef.Mesh(
            new THREERef.TorusGeometry(p.r, p.tube, 16, p.seg),
            new THREERef.MeshStandardMaterial({ color:0xeeeeee, roughness:.5, metalness:.2 })
          );
          m.rotation.x = Math.PI/2;
          m.name='Wheel';
          return m;
        }
      }
    ]
  };
  return items;
}

/* ---------- UI helpers ---------- */
function sliderRow(id,label,min,max,step,value){
  return `
    <div style="display:grid;grid-template-columns:110px 1fr 70px;gap:8px;align-items:center;margin:8px 0">
      <label style="color:var(--muted);font-size:12px">${label}</label>
      <input id="${id}_s" type="range" min="${min}" max="${max}" step="${step}" value="${value}"/>
      <input id="${id}_n" type="number" step="${step}" value="${value}"/>
    </div>
  `;
}
function bindPair(root, id, onChange){
  const s = root.querySelector('#'+id+'_s');
  const n = root.querySelector('#'+id+'_n');
  let lock=false;
  s?.addEventListener('input', ()=>{ if(lock) return; lock=true; n.value=s.value; onChange(); lock=false; });
  n?.addEventListener('input', ()=>{ if(lock) return; lock=true; s.value=n.value; onChange(); lock=false; });
}

/* ---------- preview renderer ---------- */
function createPreview(canvas){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111318);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(3.2,2.2,3.2);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x22252a, 0.8);
  const dir  = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(4,6,3);
  scene.add(hemi, dir);

  const grid = new THREE.GridHelper(12, 12, 0x335, 0x224);
  grid.position.y = 0; scene.add(grid);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12,12), new THREE.MeshStandardMaterial({ color:0x0f1115, roughness:1 }));
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);

  const wrap = new THREE.Group(); wrap.position.y = 0.01; scene.add(wrap);

  function setObject(obj){
    wrap.clear();
    if (!obj) return;
    obj.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
    wrap.add(obj);
    fit();
    render();
  }
  function fit(){
    const box = new THREE.Box3().setFromObject(wrap);
    const r = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
    camera.position.set(r*2.2, r*1.6, r*2.2);
    camera.lookAt(box.getCenter(new THREE.Vector3()));
    camera.updateProjectionMatrix();
  }
  function resize(){
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w,h,false);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    render();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  function render(){ renderer.render(scene, camera); }
  return { setObject, render, resize };
}

/* ---------- main ---------- */
const MeshLibrary = {
  open(bus, editor){
    const { wrap, card } = modalShell();

    const catsEl = card.querySelector('#cats');
    const itemsEl = card.querySelector('#items');
    const controlsEl = card.querySelector('#controls');
    const canvas = card.querySelector('#preview');

    const cat = catalog(THREE);
    const catNames = Object.keys(cat);

    // category grid
    catNames.forEach(name=>{
      const b = document.createElement('button');
      b.textContent = name;
      b.style.cssText = 'padding:10px;border-radius:10px;border:1px solid var(--panel-border);background:rgba(255,255,255,.05);color:var(--text);font-weight:700;cursor:pointer';
      b.onclick = ()=> loadCategory(name);
      catsEl.appendChild(b);
    });

    const preview = createPreview(canvas);
    let currentItemDef = null;
    let currentParams = null;

    function loadCategory(name){
      itemsEl.innerHTML = '';
      cat[name].forEach(def=>{
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--panel-border);cursor:pointer';
        row.innerHTML = `<div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid var(--panel-border)"></div>
                         <div style="font-weight:700">${def.name}</div>`;
        row.onclick = ()=> selectItem(def);
        itemsEl.appendChild(row);
      });
      // auto select first
      if (cat[name][0]) selectItem(cat[name][0]);
    }

    function rebuildPreview(){
      if (!currentItemDef) return;
      const obj = currentItemDef.build(currentParams);
      preview.setObject(obj);
    }

    function selectItem(def){
      currentItemDef = def;
      currentParams = { ...def.params };
      // controls
      controlsEl.innerHTML = `
        <div class="group" style="border:1px solid var(--panel-border);border-radius:12px;background:rgba(255,255,255,.04);padding:10px">
          <h3 style="margin:0 0 8px 0;font-size:12px;letter-spacing:.3px;opacity:.9">${def.name} — Properties</h3>
          ${def.ui.map(([k,label,min,max,step])=> sliderRow(k,label,min,max,step, currentParams[k])).join('')}
        </div>
      `;
      def.ui.forEach(([k])=> bindPair(controlsEl, k, ()=>{
        const s = controlsEl.querySelector('#'+k+'_s');
        currentParams[k] = parseFloat(s.value);
        rebuildPreview();
      }));
      rebuildPreview();
    }

    // initial category
    loadCategory('Shapes');

    // footer buttons
    card.querySelector('#libClose').onclick = ()=> wrap.remove();
    card.querySelector('#libAdd').onclick = ()=>{
      if (!currentItemDef) return;
      const obj = currentItemDef.build(currentParams);
      obj.position.y += 1;
      obj.traverse(o=>{ if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
      // param hooks for later edits where possible
      if (obj.isMesh) {
        // expose basic geometry params when matching primitive types
        if (currentItemDef.id==='box'){
          obj.userData.geometryParams = { type:'box', width:currentParams.w, height:currentParams.h, depth:currentParams.d };
          obj.userData.deformParams = { hollow:0, shearX:0, shearZ:0, twist:0, taper:1, noise:0 };
        } else if (currentItemDef.id==='sphere'){
          obj.userData.geometryParams = { type:'sphere', radius:currentParams.r, widthSegments:currentParams.ws, heightSegments:currentParams.hs };
          obj.userData.deformParams = { hollow:0, shearX:0, shearZ:0, twist:0, taper:1, noise:0 };
        } else if (currentItemDef.id==='cylinder'){
          obj.userData.geometryParams = { type:'cylinder', radiusTop:currentParams.rt, radiusBottom:currentParams.rb, height:currentParams.h, radialSegments:currentParams.rs };
          obj.userData.deformParams = { hollow:0, shearX:0, shearZ:0, twist:0, taper:1, noise:0 };
        }
      }

      editor.world.add(obj);
      editor.setSelected(obj);
      editor.frame(obj);
      bus.emit('scene-updated');
      bus.emit('history-push', `Add ${currentItemDef.name}`);
      wrap.remove();
    };
  }
};

export default MeshLibrary;