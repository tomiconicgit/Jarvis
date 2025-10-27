// cutout.js — interactive boolean cut tool (vertex dots, ghost polygon, depth slider)
import * as THREE from 'three';
import { CSG } from 'three-csg-ts';

const CutOut = {
  start(bus, editor){
    const mesh = editor.selected;
    if (!mesh || !mesh.isMesh) {
      toast('Select a mesh first.');
      return;
    }

    const scene = editor.scene;
    const camera = editor.camera;
    const renderer = editor.renderer;
    const target = mesh;

    // UI overlay
    const ui = buildOverlay();
    const depthInput = ui.querySelector('#coDepth');
    const applyBtn   = ui.querySelector('#coApply');
    const cancelBtn  = ui.querySelector('#coCancel');

    // Build vertex dots (unique world-space vertices)
    const vertsWorld = collectWorldVertices(target);
    const dotGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const dotMat = new THREE.MeshBasicMaterial({ color:0x4da3ff });
    const dots = new THREE.InstancedMesh(dotGeo, dotMat, vertsWorld.length);
    const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3();
    vertsWorld.forEach((v,i)=>{ tmpM.identity().setPosition(v); dots.setMatrixAt(i, tmpM); });
    dots.instanceMatrix.needsUpdate = true;
    scene.add(dots);

    // Ghost polygon (line)
    let ghost;
    const ghostMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.9, transparent: true });
    const selectedIds = [];

    // Picking
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onDown = (e)=>{
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX-rect.left)/rect.width)*2-1;
      pointer.y = -((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(dots, false)[0];
      if (!hit) return;
      const id = hit.instanceId;
      if (selectedIds.includes(id)) return;
      selectedIds.push(id);
      drawGhost();
    };
    renderer.domElement.addEventListener('pointerdown', onDown);

    function drawGhost(){
      const pts = selectedIds.map(i => vertsWorld[i].clone());
      if (ghost) { ghost.geometry.dispose(); scene.remove(ghost); }
      if (pts.length < 2) return;
      const geom = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]]);
      ghost = new THREE.Line(geom, ghostMat);
      scene.add(ghost);
    }

    applyBtn.onclick = ()=>{
      if (selectedIds.length < 3) { toast('Pick 3+ dots to form a shape.'); return; }
      const depth = Math.max(0.01, parseFloat(depthInput.value)||1);

      // Build plane (best-fit normal using Newell’s method)
      const poly = selectedIds.map(i => vertsWorld[i].clone());
      const { origin, normal, u, v } = planeBasisFromPolygon(poly);

      // 2D project points -> Shape
      const pts2 = poly.map(p=>{
        const rel = p.clone().sub(origin);
        return new THREE.Vector2(rel.dot(u), rel.dot(v));
      });
      const shape = new THREE.Shape(pts2);

      // Extrude along -normal
      const extrude = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled:false, steps:1 });
      extrude.translate(0,0,-depth/2);
      // Build world transform for cutter: basis columns [u,v,w=normal]
      const w = normal.clone().normalize();
      const basis = new THREE.Matrix4().makeBasis(u, v, w);
      const cutter = new THREE.Mesh(extrude, new THREE.MeshStandardMaterial({ color:0xff4444 }));
      cutter.applyMatrix4(basis);
      cutter.position.copy(origin);
      cutter.updateMatrixWorld(true);

      // CSG subtract in world space
      const targetWorld = target.clone(true);
      targetWorld.applyMatrix4(target.matrixWorld);
      const a = CSG.fromMesh(targetWorld);
      const b = CSG.fromMesh(cutter);
      const result = CSG.subtract(a, b);
      const outMesh = CSG.toMesh(result, new THREE.Matrix4(), target.material);

      // Bring geometry back to target local space
      outMesh.applyMatrix4(new THREE.Matrix4().copy(target.matrixWorld).invert());
      const newGeo = outMesh.geometry;
      newGeo.computeVertexNormals(); newGeo.computeBoundingBox(); newGeo.computeBoundingSphere();

      target.geometry.dispose();
      target.geometry = newGeo;

      cleanup();
      bus.emit('scene-updated');
    };

    cancelBtn.onclick = cleanup;

    function cleanup(){
      renderer.domElement.removeEventListener('pointerdown', onDown);
      scene.remove(dots); dots.geometry.dispose(); dots.material.dispose();
      if (ghost){ scene.remove(ghost); ghost.geometry.dispose(); ghost = null; }
      ui.remove();
    }
  }
};

export default CutOut;

/* ---------- helpers ---------- */
function buildOverlay(){
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:350;display:flex;gap:8px;align-items:center';
  const card = document.createElement('div');
  card.style.cssText = 'background:#1b1d23;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px;display:flex;gap:8px;align-items:center;color:#fff';
  card.innerHTML = `
    <span style="opacity:.8;font-weight:700;">Cut Out</span>
    <label style="opacity:.8;">Depth</label>
    <input id="coDepth" type="number" min="0.01" step="0.05" value="1" style="width:86px;background:#252525;border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#fff;padding:6px 8px"/>
    <button id="coApply" class="primary" style="padding:8px 12px;border-radius:10px;border:1px solid #4da3ff;background:#4da3ff;color:#000;font-weight:800;">Apply Cutout</button>
    <button id="coCancel" style="padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;">Cancel</button>
  `;
  wrap.appendChild(card);
  document.body.appendChild(wrap);
  return wrap;
}
function toast(msg){
  const div = document.createElement('div');
  div.textContent = msg;
  div.style.cssText = 'position:fixed;left:50%;top:20px;transform:translateX(-50%);background:#20232b;color:#fff;border:1px solid rgba(255,255,255,.15);padding:8px 12px;border-radius:8px;z-index:400';
  document.body.appendChild(div);
  setTimeout(()=> div.remove(), 1800);
}
function collectWorldVertices(mesh){
  const geo = mesh.geometry.clone();
  geo.applyMatrix4(mesh.matrixWorld);
  const pos = geo.attributes.position;
  const set = new Set();
  const arr = [];
  const v = new THREE.Vector3();
  for (let i=0;i<pos.count;i++){
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
    if (!set.has(key)){ set.add(key); arr.push(v.clone()); }
  }
  geo.dispose();
  return arr;
}
function planeBasisFromPolygon(points){
  // Newell's method for polygon normal + use centroid as origin
  const n = new THREE.Vector3(0,0,0);
  let cx=0, cy=0, cz=0;
  for (let i=0;i<points.length;i++){
    const a = points[i], b = points[(i+1)%points.length];
    n.x += (a.y - b.y)*(a.z + b.z);
    n.y += (a.z - b.z)*(a.x + b.x);
    n.z += (a.x - b.x)*(a.y + b.y);
    cx += a.x; cy += a.y; cz += a.z;
  }
  n.normalize();
  const origin = new THREE.Vector3(cx/points.length, cy/points.length, cz/points.length);

  // build orthonormal basis (u,v,w)
  const w = n.clone().normalize();
  const tmp = Math.abs(w.y) < 0.999 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
  const u = new THREE.Vector3().crossVectors(tmp, w).normalize();
  const v = new THREE.Vector3().crossVectors(w, u).normalize();
  return { origin, normal:w, u, v };
}