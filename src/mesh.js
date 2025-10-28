// src/mesh.js — Mesh Library modal (no property sliders; pick & add)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ---------- responsive modal shell ---------- */
function modalShell(){
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position:fixed;inset:0;z-index:350;
    padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right))
             max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
    background:rgba(0,0,0,.55);
    display:grid;place-items:center;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background:var(--panel);border:1px solid var(--panel-border);border-radius:14px;overflow:hidden;
    width:min(100vw - 16px, 1120px);
    height:min(100svh - 16px, 880px);
    display:grid;
    grid-template-columns: 260px 1fr;
    grid-template-rows: 56px 1fr 64px;
    grid-template-areas:
      "title title"
      "left  right"
      "footer footer";
    color:var(--text);
  `;

  card.innerHTML = `
    <div style="grid-area:title;display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--panel-border)">
      <strong style="font-size:16px;letter-spacing:.3px">Mesh Library</strong>
      <span style="opacity:.7;font-size:12px">Pick an asset, then add.</span>
    </div>

    <div style="grid-area:left;display:flex;flex-direction:column;min-width:0;border-right:1px solid var(--panel-border)">
      <div id="cats" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px"></div>
      <div style="font-size:12px;opacity:.7;padding:0 10px 10px">Categories</div>
      <div id="items" style="flex:1;min-height:0;overflow:auto;border-top:1px solid var(--panel-border)"></div>
    </div>

    <div style="grid-area:right;min-width:0;position:relative;">
      <canvas id="preview" style="width:100%;height:100%;display:block"></canvas>
    </div>

    <div style="grid-area:footer;display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:10px;border-top:1px solid var(--panel-border)">
      <button id="libClose">Close</button>
      <button id="libAdd" class="primary">Add to scene</button>
    </div>
  `;

  wrap.appendChild(card);
  document.body.appendChild(wrap);

  // Portrait / narrow: stack panels; full height/width; no rounded corners
  function applyLayout(){
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    const narrow   = window.innerWidth <= 820;
    const cats = card.querySelector('#cats');

    if (portrait || narrow){
      card.style.width = '100vw';
      card.style.height = '100svh';
      card.style.borderRadius = '0';
      card.style.gridTemplateColumns = '1fr';
      card.style.gridTemplateRows = '56px 45svh 1fr 64px';
      card.style.gridTemplateAreas = `"title" "left" "right" "footer"`;
      cats.style.gridTemplateColumns = 'repeat(2,1fr)';
    } else {
      card.style.width = 'min(100vw - 16px, 1120px)';
      card.style.height = 'min(100svh - 16px, 880px)';
      card.style.borderRadius = '14px';
      card.style.gridTemplateColumns = '260px 1fr';
      card.style.gridTemplateRows = '56px 1fr 64px';
      card.style.gridTemplateAreas = `"title title" "left right" "footer footer"`;
      cats.style.gridTemplateColumns = 'repeat(3,1fr)';
    }
  }
  applyLayout();
  window.addEventListener('resize', applyLayout, { passive:true });

  return { wrap, card };
}

/* ---------- catalog (defaults only) ---------- */
function catalog(THREERef){
  return {
    Shapes: [
      { id:'box', name:'Box', params:{ w:2,h:2,d:2, r:0 },
        build(p){ return new THREERef.Mesh(
          p.r>0 ? new RoundedBoxGeometry(p.w,p.h,p.d,3,Math.min(p.r, Math.min(p.w,p.h,p.d)/2-1e-3))
                : new THREERef.BoxGeometry(p.w,p.h,p.d, 6,6,6),
          new THREERef.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.4 })
        );}
      },
      { id:'sphere', name:'Sphere', params:{ r:1.2, ws:48, hs:32 },
        build(p){ return new THREERef.Mesh(
          new THREERef.SphereGeometry(p.r, p.ws, p.hs),
          new THREERef.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.4 })
        );}
      },
      { id:'cylinder', name:'Cylinder', params:{ rt:1, rb:1, h:2, rs:48 },
        build(p){ return new THREERef.Mesh(
          new THREERef.CylinderGeometry(p.rt,p.rb,p.h,p.rs,8,false),
          new THREERef.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.4 })
        );}
      }
    ],
    Nature: [
      { id:'rock', name:'Rock', params:{ r:1.2, noise:0.35 },
        build(p){
          const geo = new THREE.IcosahedronGeometry(p.r, 2);
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
      { id:'table', name:'Table', params:{ w:3,d:1.6,h:1, t:0.12, leg:0.12 },
        build(p){
          const g = new THREERef.Group();
          const mat = new THREERef.MeshStandardMaterial({ color:0xffffff, roughness:.6, metalness:.05 });
          const top = new THREERef.Mesh(new THREERef.BoxGeometry(p.w,p.t,p.d), mat); top.position.y = p.h; g.add(top);
          const legGeo = new THREERef.BoxGeometry(p.leg,p.h,p.leg);
          [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{
            const lg = new THREERef.Mesh(legGeo, mat);
            lg.position.set((p.w/2 - p.leg/2)*sx, p.h/2, (p.d/2 - p.leg/2)*sz);
            g.add(lg);
          });
          g.name = 'Table';
          return g;
        }
      }
    ],
    Technology: [
      { id:'lightbar', name:'Light Bar', params:{ len:3, thick:0.15, emissive:1.5 },
        build(p){
          const geo = new THREERef.BoxGeometry(p.len, p.thick, p.thick);
          const mat = new THREERef.MeshStandardMaterial({ color:0xffffff, emissive: new THREERef.Color(0xffffff), emissiveIntensity: p.emissive, metalness:.1, roughness:.2 });
          const m = new THREERef.Mesh(geo, mat); m.name='Light Bar'; return m;
        }
      }
    ],
    Construction: [
      { id:'stairs', name:'Stairs', params:{ w:2, d:3, h:1.6, steps:8 },
        build(p){
          const group = new THREERef.Group();
          const mat = new THREERef.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.5 });
          for (let i=0;i<p.steps;i++){
            const stepH = (p.h/p.steps), stepD = (p.d/p.steps);
            const m = new THREERef.Mesh(new THREERef.BoxGeometry(p.w, stepH, stepD), mat);
            m.position.set(0, stepH/2 + i*stepH, -p.d/2 + stepD/2 + i*stepD);
            group.add(m);
          }
          group.name = 'Stairs';
          return group;
        }
      }
    ],
    Vehicles: [
      { id:'wheel', name:'Wheel', params:{ r:0.8, tube:0.3, seg:28 },
        build(p){
          const m = new THREERef.Mesh(
            new THREERef.TorusGeometry(p.r, p.tube, 16, p.seg),
            new THREERef.MeshStandardMaterial({ color:0xeeeeee, roughness:.5, metalness:.2 })
          );
          m.rotation.x = Math.PI/2; m.name='Wheel'; return m;
        }
      }
    ]
  };
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
    fit(); render();
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
    const canvas = card.querySelector('#preview');

    const cat = catalog(THREE);
    const catNames = Object.keys(cat);

    // categories
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
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--panel-border);cursor:pointer;min-width:0';
        row.innerHTML = `<div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid var(--panel-border)"></div>
                         <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${def.name}</div>`;
        row.onclick = ()=> selectItem(def);
        itemsEl.appendChild(row);
      });
      if (cat[name][0]) selectItem(cat[name][0]);
    }

    function selectItem(def){
      currentItemDef = def;
      currentParams = { ...def.params }; // defaults only
      const obj = currentItemDef.build(currentParams);
      preview.setObject(obj);
    }

    // init
    loadCategory('Shapes');

    // footer
    card.querySelector('#libClose').onclick = ()=> wrap.remove();
    card.querySelector('#libAdd').onclick = ()=>{
      if (!currentItemDef) return;
      const obj = currentItemDef.build(currentParams);
      obj.position.y += 1;
      obj.traverse(o=>{ if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });

      // expose parametric info (so you can edit later in the side panel)
      if (obj.isMesh) {
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