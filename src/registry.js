/*
File: src/registry.js
*/
// Contains the entire component registry, builders, CSG, and UI generator.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------- Materials ---------- */
export const metalMat = new THREE.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.4, side:THREE.DoubleSide });
export const glassMat = new THREE.MeshStandardMaterial({ color:0x88ccff, transparent:true, opacity:.32, side:THREE.DoubleSide, depthWrite:false });

/* ---------- UV + helpers ---------- */
function ensureBB(g){ if(!g.boundingBox) g.computeBoundingBox(); }
function addPlanarUV(g, axes='xz'){
  const pos=g.attributes.position, n=pos.count, uv=new Float32Array(n*2); ensureBB(g);
  const bb=g.boundingBox, min=bb.min, max=bb.max;
  const sx=max.x-min.x||1, sy=max.y-min.y||1, sz=max.z-min.z||1;
  for(let i=0;i<n;i++){
    const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i); let u,v;
    if(axes==='xz'){u=(x-min.x)/sx; v=(z-min.z)/sz;}
    else if(axes==='xy'){u=(x-min.x)/sx; v=(y-min.y)/sy;}
    else {u=(z-min.z)/sz; v=(y-min.y)/sy;}
    uv[i*2]=u; uv[i*2+1]=v;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv,2)); return g;
}
function addCylUV(g){
  const pos=g.attributes.position, n=pos.count, uv=new Float32Array(n*2); ensureBB(g);
  const bb=g.boundingBox, minY=bb.min.y, spanY=(bb.max.y-bb.min.y)||1;
  for(let i=0;i<n;i++){ let th=Math.atan2(pos.getZ(i),pos.getX(i)); if(th<0) th+=Math.PI*2; uv[i*2]=th/(Math.PI*2); uv[i*2+1]=(pos.getY(i)-minY)/spanY; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv,2)); return g;
}
function roundedRectShape(w,h,r){
  const hw=w/2, hh=h/2, rr=Math.min(r,hw,hh);
  const s=new THREE.Shape(); s.moveTo(-hw+rr,-hh);
  s.lineTo(hw-rr,-hh); s.quadraticCurveTo(hw,-hh, hw,-hh+rr);
  s.lineTo(hw, hh-rr); s.quadraticCurveTo(hw,hh, hw-rr,hh);
  s.lineTo(-hw+rr,hh); s.quadraticCurveTo(-hw,hh, -hw,hh-rr);
  s.lineTo(-hw, -hh+rr); s.quadraticCurveTo(-hw,-hh, -hw+rr,-hh); return s;
}
function superellipsePoint(a,b,n,t){
  const m=2/n, c=Math.cos(t), s=Math.sin(t);
  return new THREE.Vector2(
    a * Math.sign(c) * Math.pow(Math.abs(c), m),
    b * Math.sign(s) * Math.pow(Math.abs(s), m)
  );
}
export function firstMeshIn(object3d) { let m=null; object3d.traverse(o=>{ if(!m && o.isMesh) m=o; }); return m; }
function cylBetween(a,b,r,mat){
  const dir=b.clone().sub(a); const len=dir.length()||1; const geo=new THREE.CylinderGeometry(r,r,len,16);
  const m=new THREE.Mesh(geo, mat||metalMat); const up=new THREE.Vector3(0,1,0);
  m.position.copy(a).addScaledVector(dir,0.5); m.quaternion.setFromUnitVectors(up, dir.normalize()); return m;
}

/* ---------- CSG loader with fallback ---------- */
async function loadCSGModule() {
  const tries = [
    'https://cdn.jsdelivr.net/npm/three-csg-ts@1.1.6/build/three-csg-ts.esm.js',
    'https://unpkg.com/three-csg-ts@1.1.6/build/three-csg-ts.esm.js'
  ];
  for (const url of tries) {
    try { const mod = await import(url); return { lib: 'three-csg-ts', mod }; } catch (_) {}
  }
  try {
    const mod = await import('@gkjohnson/three-bvh-csg');
    return { lib: 'bvh-csg', mod };
  } catch (e) {}
  throw new Error('CSG libraries failed to load');
}
async function subtractCSGInPlace(targetMesh, cutters /* array of Mesh */) {
  const { lib, mod } = await loadCSGModule();
  if (lib === 'three-csg-ts') {
    const { CSG } = mod;
    for (const cutter of cutters) {
      const res = CSG.subtract(targetMesh, cutter);
      const geom = res?.geometry || (res?.isBufferGeometry ? res : null);
      if (!geom) throw new Error('three-csg-ts returned no geometry');
      targetMesh.geometry.dispose();
      targetMesh.geometry = geom;
      targetMesh.geometry.computeVertexNormals();
    }
    return;
  }
  // BVH-CSG path
  const { Brush, Evaluator, SUBTRACTION } = mod;
  for (const cutter of cutters) {
    targetMesh.updateWorldMatrix(true, true);
    cutter.updateWorldMatrix(true, true);
    const a = new Brush(targetMesh.geometry, targetMesh.matrixWorld);
    const b = new Brush(cutter.geometry, cutter.matrixWorld);
    const evaluator = new Evaluator();
    const result = evaluator.evaluate(a, b, SUBTRACTION);
    const newGeom = result.geometry;
    targetMesh.geometry.dispose();
    targetMesh.geometry = newGeom;
    targetMesh.geometry.computeVertexNormals();
    const inv = new THREE.Matrix4().copy(targetMesh.matrixWorld).invert();
    targetMesh.geometry.applyMatrix4(inv);
  }
}

/* ---------- Registry (plugins) ---------- */
export const Registry = new Map();
export function register(type, label, schema, builder, actions=[]) { 
  Registry.set(type, { type, label, schema, builder, actions }); 
}

/**
 * Builds the Inspector UI inside a given root element.
 */
export function buildInspectorUI(rootEl, type, values, onChange, onAction, state){
  rootEl.innerHTML='';
  const schema = Registry.get(type).schema;
  
  for(const [key, def] of Object.entries(schema)){
    const row=document.createElement('div'); row.className='row';
    const lab=document.createElement('label'); lab.textContent=def.label || key; row.appendChild(lab);

    if(def.type==='button'){
      const btn=document.createElement('button'); btn.textContent=def.text||'Do';
      row.appendChild(btn); row.appendChild(document.createElement('span'));
      btn.addEventListener('click', ()=> onAction(key)); rootEl.appendChild(row); continue;
    }

    let input, out=document.createElement('output');
    const val = values[key] ?? def.default;

    if(def.type==='entity'){
      input=document.createElement('select');
      const where = def.whereType || null;
      const makeLabel = (ent) => `${Registry.get(ent.type).label} (${ent.id})`;
      // Add a 'None' option
      const oNone=document.createElement('option');
      oNone.value=''; oNone.textContent='â None â'; input.appendChild(oNone);
      
      // Populate from state
      // 'state' is the stateAPI object { entities: ... }
      // 'state.entities' is the iterator from State.getEntities()
      for (const ent of state.entities){ 
        if(where && !where.includes(ent.type)) continue;
        const o=document.createElement('option');
        o.value=ent.id; o.textContent=makeLabel(ent);
        input.appendChild(o);
      }
      input.value = String(val ?? '');
      input.addEventListener('change', ()=> onChange(key, input.value));
      out=document.createElement('span'); // No output for select
    } else if(def.type==='range'){
      input=document.createElement('input'); input.type='range';
      input.min=def.min; input.max=def.max; input.step=def.step??0.1; input.value=String(val);
      out.textContent=Number(input.value).toFixed(2);
      input.addEventListener('input', ()=>{ 
        out.textContent=Number(input.value).toFixed(2); 
        onChange(key, parseFloat(input.value)); 
      });
    } else if(def.type==='select'){
      input=document.createElement('select');
      for(const opt of def.options){ const o=document.createElement('option'); o.value=String(opt); o.textContent=String(opt); input.appendChild(o); }
      input.value=String(val);
      input.addEventListener('change', ()=> onChange(key, input.value));
      out=document.createElement('span');
    } else if(def.type==='checkbox'){
      input=document.createElement('input'); input.type='checkbox'; input.checked=!!val;
      input.style.width = 'auto'; // Fix checkbox width
      input.addEventListener('change', ()=> onChange(key, input.checked));
      out=document.createElement('span');
    } else {
      input=document.createElement('input'); input.type='text'; input.value=String(val);
      input.addEventListener('change', ()=> onChange(key, /^[\d\.\-]+$/.test(input.value)? parseFloat(input.value): input.value));
      out=document.createElement('span');
    }

    row.appendChild(input); 
    if (out.tagName === 'OUTPUT') row.appendChild(out);
    rootEl.appendChild(row);
  }
}

/* ================================================================================
START COMPONENT DEFINITIONS (Copied from Launch Tower)
================================================================================
*/

/* Tower Base */
register(
  'tower.base','Tower Base',
  {
    height:{type:'range',label:'Height',min:8,max:120,step:0.5,default:40},
    aBottom:{type:'range',label:'Bottom Radius X',min:2,max:10,step:0.1,default:5},
    bBottom:{type:'range',label:'Bottom Radius Z',min:2,max:10,step:0.1,default:5},
    aTop:{type:'range',label:'Top Radius X',min:2,max:10,step:0.1,default:4},
    bTop:{type:'range',label:'Top Radius Z',min:2,max:12,step:0.1,default:8},
    roundN:{type:'range',label:'Superellipse n',min:2.2,max:8,step:0.1,default:6.8},
    thickness:{type:'range',label:'Wall Thickness',min:0.05,max:1.5,step:0.05,default:0.15},
    segU:{type:'range',label:'Radial Segments',min:48,max:192,step:8,default:120},
    segV:{type:'range',label:'Height Segments',min:12,max:160,step:4,default:72},
    flatRear:{type:'checkbox',label:'Flat Rear (-Z)',default:true}
  },
  (p)=>{
    const {height,aBottom,bBottom,aTop,bTop,roundN,thickness,segU,segV,flatRear} = p;
    const dy=height/segV, verts=[], idx=[];
    const outer=[], inner=[];
    for(let iv=0;iv<=segV;iv++){
      const y=iv*dy;
      const a = THREE.MathUtils.lerp(aBottom, aTop, iv/segV);
      const b = THREE.MathUtils.lerp(bBottom, bTop, iv/segV);
      const aIn=Math.max(0.0001, a-thickness);
      const frontB=b, rearB=flatRear?4:b;
      const frontBin=b-thickness, rearBin=flatRear?(4-thickness):(b-thickness);
      for(let iu=0; iu<segU; iu++){
        const t = iu*(Math.PI*2/segU);
        const pOut=superellipsePoint(a, (t>Math.PI? rearB:frontB), roundN, t);
        const pIn =superellipsePoint(aIn,(t>Math.PI? rearBin:frontBin), roundN, t);
        outer.push(new THREE.Vector3(pOut.x,y,pOut.y));
        inner.push(new THREE.Vector3(pIn.x ,y,pIn.y ));
      }
    }
    const push=v=>verts.push(v.x,v.y,v.z);
    const outerBase=0, innerBase=(segV+1)*segU;
    for(let iv=0;iv<=segV;iv++) for(let iu=0;iu<segU;iu++) push(outer[iv*segU+iu]);
    for(let iv=0;iv<=segV;iv++) for(let iu=0;iu<segU;iu++) push(inner[iv*segU+iu]);
    const addQ=(a,b,c,d,flip=false)=>{ if(!flip){idx.push(a,b,d,b,c,d);}else{idx.push(a,d,b,b,d,c);} };
    for(let iv=0;iv<segV;iv++){
      for(let iu=0;iu<segU;iu++){
        const iu1=(iu+1)%segU;
        addQ(outerBase+iv*segU+iu, outerBase+iv*segU+iu1, outerBase+(iv+1)*segU+iu1, outerBase+(iv+1)*segU+iu, false);
        addQ(innerBase+iv*segU+iu, innerBase+iv*segU+iu1, innerBase+(iv+1)*segU+iu1, innerBase+(iv+1)*segU+iu, true);
      }
    }
    for(let iu=0;iu<segU;iu++){
      const iu1=(iu+1)%segU;
      addQ(outerBase+iu, outerBase+iu1, innerBase+iu1, innerBase+iu, true);
      const oA=outerBase+segV*segU+iu, oB=outerBase+segV*segU+iu1, iA=innerBase+segV*segU+iu, iB=innerBase+segV*segU+iu1;
      addQ(oA,oB,iB,iA,false);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts),3));
    g.setIndex(idx); g.computeVertexNormals(); addCylUV(g);
    const m=new THREE.Mesh(g, metalMat); m.name='solid';
    return m;
  }
);

/* Tower Neck (reuses base builder, offset Y) */
register(
  'tower.neck','Tower Neck',
  {
    y:{type:'range',label:'Y Position',min:10,max:200,step:0.5,default:40},
    height:{type:'range',label:'Height',min:6,max:100,step:0.5,default:20},
    aBottom:{type:'range',label:'Bottom Radius X',min:2,max:10,step:0.1,default:4},
    bBottom:{type:'range',label:'Bottom Radius Z',min:2,max:10,step:0.1,default:6},
    aTop:{type:'range',label:'Top Radius X',min:2,max:10,step:0.1,default:3.6},
    bTop:{type:'range',label:'Top Radius Z',min:2,max:10,step:0.1,default:5},
    roundN:{type:'range',label:'Superellipse n',min:2.2,max:8,step:0.1,default:6.4},
    thickness:{type:'range',label:'Wall Thickness',min:0.05,max:1.5,step:0.05,default:0.12},
    segU:{type:'range',label:'Radial Segments',min:48,max:192,step:8,default:96},
    segV:{type:'range',label:'Height Segments',min:8,max:120,step:4,default:40},
    flatRear:{type:'checkbox',label:'Flat Rear (-Z)',default:true}
  },
  (p)=>{
    const base = Registry.get('tower.base').builder({
      height:p.height, aBottom:p.aBottom, bBottom:p.bBottom,
      aTop:p.aTop, bTop:p.bTop, roundN:p.roundN, thickness:p.thickness,
      segU:p.segU, segV:p.segV, flatRear:p.flatRear
    });
    base.position.y = p.y;
    return base;
  }
);

/* Roof */
register(
  'roof','Roof',
  {
    baseRX:{type:'range',label:'Base Radius X',min:2,max:12,step:0.1,default:4.2},
    baseRZ:{type:'range',label:'Base Radius Z',min:2,max:14,step:0.1,default:8.0},
    height:{type:'range',label:'Roof Height',min:0.5,max:12,step:0.1,default:3.0},
    steps:{type:'range',label:'Curvature Steps',min:4,max:48,step:1,default:14},
    roundN:{type:'range',label:'Profile n',min:2.2,max:8,step:0.1,default:5.6},
    topScale:{type:'range',label:'Top Scale (0=point)',min:0,max:1,step:0.05,default:0.15},
    thickness:{type:'range',label:'Shell Thickness',min:0.02,max:0.8,step:0.02,default:0.1},
    lip:{type:'range',label:'Edge Lip',min:0,max:1.5,step:0.05,default:0.3},
    apexX:{type:'range',label:'Apex X',min:-3,max:3,step:0.1,default:0},
    apexZ:{type:'range',label:'Apex Z',min:-3,max:3,step:0.1,default:0},
    y:{type:'range',label:'Y Position',min:20,max:200,step:0.5,default:60}
  },
  (p)=>{
    const segU=144;
    const makeRim = (rx,rz,n,lip)=>{ const pts=[]; for(let i=0;i<segU;i++){ const t=i*(Math.PI*2/segU); const v=superellipsePoint(rx+lip, rz+lip, n, t); pts.push(new THREE.Vector3(v.x, 0, v.y)); } return pts; };
    const outerRim = makeRim(p.baseRX,p.baseRZ,p.roundN,p.lip);
    const innerRim = makeRim(Math.max(0.01,p.baseRX-p.thickness), Math.max(0.01,p.baseRZ-p.thickness), p.roundN, 0);
    const verts=[], idx=[]; const addV=v=>verts.push(v.x,v.y,v.z);
    let prevOuterIdx=outerRim.map(v=>{ addV(new THREE.Vector3(v.x,0,v.z)); return (verts.length/3)-1; });
    let prevInnerIdx=innerRim.map(v=>{ addV(new THREE.Vector3(v.x,0,v.z)); return (verts.length/3)-1; });
    const addQ=(a,b,c,d)=>{ idx.push(a,b,d, b,c,d); };
    const ease=t=>Math.pow(t,2.2);
    for(let s=1; s<=p.steps; s++){
      const t=ease(s/p.steps); const oy=THREE.MathUtils.lerp(0, p.height, t); const scale=THREE.MathUtils.lerp(1, p.topScale, t);
      const ringOuter=[], ringInner=[];
      for(let i=0;i<segU;i++){
        const oIdx=prevOuterIdx[i], iIdx=prevInnerIdx[i];
        const x0=verts[oIdx*3], z0=verts[oIdx*3+2];
        const xi0=verts[iIdx*3], zi0=verts[iIdx*3+2];
        const x=THREE.MathUtils.lerp(x0, p.apexX + (x0 - p.apexX)*scale, t);
        const z=THREE.MathUtils.lerp(z0, p.apexZ + (z0 - p.apexZ)*scale, t);
        const xi=THREE.MathUtils.lerp(xi0, p.apexX + (xi0 - p.apexX)*scale, t);
        const zi=THREE.MathUtils.lerp(zi0, p.apexZ + (zi0 - p.apexZ)*scale, t);
        ringOuter.push(verts.length/3); addV(new THREE.Vector3(x, oy, z));
        ringInner.push(verts.length/3); addV(new THREE.Vector3(xi, oy, zi));
      }
      for(let i=0;i<segU;i++){ const i1=(i+1)%segU; addQ(prevOuterIdx[i], prevOuterIdx[i1], ringOuter[i1], ringOuter[i]);
        idx.push(prevInnerIdx[i], ringInner[i], ringInner[i1],  prevInnerIdx[i], ringInner[i1], prevInnerIdx[i1]); }
      prevOuterIdx=ringOuter; prevInnerIdx=ringInner;
    }
    const cIdx=verts.length/3; let cx=0,cy=0,cz=0; for(const i of prevOuterIdx){ cx+=verts[i*3]; cy+=verts[i*3+1]; cz+=verts[i*3+2]; } cx/=prevOuterIdx.length; cy/=prevOuterIdx.length; cz/=prevOuterIdx.length;
    addV(new THREE.Vector3(cx,cy,cz));
    for(let i=0;i<segU;i++){ const i1=(i+1)%segU; idx.push(prevOuterIdx[i], prevOuterIdx[i1], cIdx); }
    for(let i=0;i<segU;i++){ const i1=(i+1)%segU; idx.push(i, i1, segU+i1,  i, segU+i1, segU+i); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts),3));
    g.setIndex(idx); g.computeVertexNormals(); addCylUV(g);
    const mesh=new THREE.Mesh(g, metalMat); mesh.position.y=p.y; mesh.name='solid';
    return mesh;
  }
);

/* Spire */
register(
  'spire','Spire',
  {
    y:{type:'range',label:'Base Y',min:40,max:240,step:0.5,default:65},
    height:{type:'range',label:'Height',min:2,max:40,step:0.1,default:8},
    rBase:{type:'range',label:'Base Radius',min:0.1,max:4,step:0.05,default:0.6},
    rTop:{type:'range',label:'Top Radius',min:0,max:2,step:0.05,default:0.1},
    seg:{type:'range',label:'Segments',min:8,max:64,step:1,default:24},
    rings:{type:'range',label:'Detail Rings',min:0,max:6,step:1,default:2},
    ringThick:{type:'range',label:'Ring Thickness',min:0.02,max:0.4,step:0.02,default:0.08}
  },
  (p)=>{
    const cone=new THREE.ConeGeometry(p.rBase, p.height, p.seg, 1, true);
    const s = p.rTop/p.rBase; const m=new THREE.Matrix4().makeScale(s,1,s); cone.applyMatrix4(m);
    addPlanarUV(cone,'xz');
    const grp=new THREE.Group();
    const shaft=new THREE.Mesh(cone, metalMat); shaft.position.y=p.y + p.height/2; shaft.name='solid'; grp.add(shaft);
    for(let i=1;i<=p.rings;i++){
      const t=i/(p.rings+1), y=THREE.MathUtils.lerp(p.y, p.y+p.height, t);
      const r=THREE.MathUtils.lerp(p.rBase, p.rTop, t);
      const ring=new THREE.TorusGeometry(r, p.ringThick, 8, 48);
      const rim=new THREE.Mesh(ring, metalMat); rim.position.set(0, y, 0); rim.rotation.x=Math.PI/2; grp.add(rim);
    }
    return grp;
  }
);

/* Top Floor */
register(
  'top.floor','Top Floor',
  {
    y:{type:'range',label:'Y Position',min:30,max:120,step:0.5,default:52},
    width:{type:'range',label:'Width (X)',min:2,max:24,step:0.1,default:8},
    depth:{type:'range',label:'Depth (Z)',min:2,max:30,step:0.1,default:16},
    thick:{type:'range',label:'Thickness',min:0.05,max:1,step:0.05,default:0.2},
    forward:{type:'range',label:'Forward Shift Z',min:-6,max:12,step:0.1,default:6},
    n:{type:'range',label:'Corner n',min:2.2,max:8,step:0.1,default:6.8},
    hole:{type:'range',label:'Hole %',min:0,max:0.8,step:0.02,default:0.5}
  },
  (p)=>{
    const exp=2/p.n, hw=p.width/2, hd=p.depth/2;
    const OUT=160, HOLE=96;
    const shape=new THREE.Shape();
    for(let i=0;i<OUT;i++){ const th=i/OUT*Math.PI*2, ct=Math.cos(th), st=Math.sin(th);
      const x= hw*Math.sign(ct)*Math.pow(Math.abs(ct),exp);
      const z= hd*Math.sign(st)*Math.pow(Math.abs(st),exp);
      if(i===0) shape.moveTo(x,z); else shape.lineTo(x,z);
    }
    shape.closePath();
    if(p.hole>0){
      const hshape=new THREE.Path();
      const ihw=hw*p.hole, ihd=hd*p.hole;
      for(let i=0;i<HOLE;i++){ const th=i/HOLE*Math.PI*2, ct=Math.cos(th), st=Math.sin(th);
        const x= ihw*Math.sign(ct)*Math.pow(Math.abs(ct),exp);
        const z= ihd*Math.sign(st)*Math.pow(Math.abs(st),exp);
        if(i===0) hshape.moveTo(x,z); else hshape.lineTo(x,z);
      }
      hshape.closePath(); shape.holes.push(hshape);
    }
    const eg=new THREE.ExtrudeGeometry(shape,{depth:p.thick, bevelEnabled:false});
    eg.rotateX(-Math.PI/2);
    addPlanarUV(eg,'xz');
    const mesh=new THREE.Mesh(eg, metalMat);
    mesh.position.set(0, p.y, p.forward);
    mesh.name='solid';
    return mesh;
  }
);

/* Piping */
register(
  'piping','Piping',
  {
    count:{type:'range',label:'Count',min:1,max:12,step:1,default:2},
    angleStart:{type:'range',label:'Start AngleÂ°',min:0,max:360,step:1,default:0},
    radius:{type:'range',label:'Pipe Radius',min:0.05,max:0.8,step:0.01,default:0.18},
    riserH:{type:'range',label:'Riser Height',min:4,max:120,step:0.5,default:30},
    elbowR:{type:'range',label:'Elbow Radius',min:0.5,max:8,step:0.1,default:2.5},
    horizL:{type:'range',label:'Horizontal L',min:1,max:40,step:0.5,default:10},
    pathSeg:{type:'range',label:'Path Segments',min:12,max:200,step:2,default:72}
  },
  (p)=>{
    const grp=new THREE.Group();
    const makePath=()=>{
      const pts=[]; const arcSeg=24;
      pts.push(new THREE.Vector3(0,0,0));
      pts.push(new THREE.Vector3(0,p.riserH,0));
      for(let i=1;i<=arcSeg;i++){
        const th=(i/arcSeg)*Math.PI/2;
        const x= p.elbowR*Math.sin(th);
        const z= p.elbowR*(1-Math.cos(th));
        pts.push(new THREE.Vector3(x, p.riserH, z));
      }
      pts.push(new THREE.Vector3(p.elbowR + p.horizL, p.riserH, p.elbowR));
      return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0);
    };
    const path=makePath();
    const tube=new THREE.TubeGeometry(path, p.pathSeg, p.radius, 12, false);
    addCylUV(tube);
    const unit=new THREE.Mesh(tube, metalMat); unit.position.set(0,0,6);
    for(let i=0;i<p.count;i++){
      const a=(p.angleStart + i*(360/p.count))*Math.PI/180;
      const inst=unit.clone(); inst.position.applyAxisAngle(new THREE.Vector3(0,1,0), a);
      inst.rotation.y = a;
      grp.add(inst);
    }
    grp.name='solid';
    return grp;
  }
);

/* Window (Cutout) + dropdown */
register(
  'window.cut','Window Cutout',
  {
    target:{type:'entity', label:'Target', whereType:['tower.base','tower.neck','roof','top.floor','bridge.tunnel']},
    width:{type:'range',label:'Width',min:0.5,max:16,step:0.1,default:6},
    height:{type:'range',label:'Height',min:0.5,max:16,step:0.1,default:3},
    depth:{type:'range',label:'Cut Depth',min:0.1,max:4,step:0.05,default:1.2},
    radius:{type:'range',label:'Corner Radius',min:0,max:1.5,step:0.05,default:0.3},
    APPLY:{type:'button',text:'Apply Cut'}
  },
  (p)=>{
    const grp=new THREE.Group(); grp.name='cutter.window';
    const cutG = new THREE.ExtrudeGeometry(roundedRectShape(p.width, p.height, p.radius), { depth: p.depth, bevelEnabled: false });
    addPlanarUV(cutG,'xy');
    const cutter = new THREE.Mesh(cutG, metalMat);
    cutter.position.set(0, p.height/2, -p.depth/2);
    grp.add(cutter);
    return grp;
  },
  [
    {
      key:'APPLY',
      // *** THIS IS THE FIX ***
      // 'state' is now the full 'State' module from inspector.js
      run: async (ent, State)=>{
        try{
          const targetId = ent.params.target?.trim(); if(!targetId) return alert('Pick a Target.');
          // Use the correct State.getEntity function
          const tgt = State.getEntity(targetId); 
          if(!tgt) return alert('Target not found');
          // *** END FIX ***
          const targetMesh = firstMeshIn(tgt.object); if(!targetMesh) return alert('No mesh on target');
          const cutters = [];
          ent.object.updateWorldMatrix(true,true);
          ent.object.traverse(o=>{ if(o.isMesh){ const w=o.clone(); w.applyMatrix4(ent.object.matrixWorld); cutters.push(w); }});
          await subtractCSGInPlace(targetMesh, cutters);
          alert('Window cut applied.');
        }catch(e){ console.error(e); __logErr('Cut failed: ' + e.message); alert('Cut failed: ' + e.message); }
      }
    }
  ]
);

/* Window mesh (frame + mullions + glass) */
register(
  'window.mesh','Window (Framed)',
  {
    width:{type:'range',label:'Width',min:0.5,max:16,step:0.1,default:6},
    height:{type:'range',label:'Height',min:0.5,max:16,step:0.1,default:3},
    frameT:{type:'range',label:'Frame Thick',min:0.03,max:0.6,step:0.01,default:0.12},
    frameW:{type:'range',label:'Frame Width',min:0.05,max:0.8,step:0.01,default:0.12},
    mullCols:{type:'range',label:'Mullion Cols',min:0,max:6,step:1,default:2},
    mullRows:{type:'range',label:'Mullion Rows',min:0,max:6,step:1,default:1},
    glassT:{type:'range',label:'Glass Thick',min:0.02,max:0.8,step:0.02,default:0.06}
  },
  (p)=>{
    const g=new THREE.Group();
    // Frame (outer rect with inner hole)
    const s=roundedRectShape(p.width, p.height, Math.min(0.3, Math.min(p.width,p.height)*0.1));
    const iw=p.width - p.frameW*2, ih=p.height - p.frameW*2;
    const ish=roundedRectShape(iw, ih, Math.max(0, Math.min(iw,ih)*0.1 - p.frameW*0.5));
    s.holes.push(ish); 
    const frame = new THREE.ExtrudeGeometry(s, { depth:p.frameT, bevelEnabled:false });
    addPlanarUV(frame,'xy');
    const frameMesh=new THREE.Mesh(frame, metalMat); frameMesh.position.z = -p.frameT/2; g.add(frameMesh);

    // Mullions
    const mullT=p.frameW*0.6;
    const x0=-iw/2, y0=-ih/2;
    for(let c=1;c<=p.mullCols;c++){
      const x=x0 + (iw*c/(p.mullCols+1));
      const bar=new THREE.BoxGeometry(mullT, ih, p.frameT);
      const m=new THREE.Mesh(bar, metalMat); m.position.set(x,0,-p.frameT/2); g.add(m);
    }
    for(let r=1;r<=p.mullRows;r++){
      const y=y0 + (ih*r/(p.mullRows+1));
      const bar=new THREE.BoxGeometry(iw, mullT, p.frameT);
      const m=new THREE.Mesh(bar, metalMat); m.position.set(0,y,-p.frameT/2); g.add(m);
    }

    // Glass pane
    const glass=new THREE.PlaneGeometry(iw - mullT*0.1, ih - mullT*0.1);
    const gm=new THREE.Mesh(glass, glassMat); gm.position.z = -(p.frameT + p.glassT)/2; g.add(gm);
    g.name='solid'; return g;
  }
);

/* Double Doors (mesh) */
register(
  'doors.double','Double Doors',
  {
    width:{type:'range',label:'Total Width',min:2,max:16,step:0.1,default:6},
    height:{type:'range',label:'Height',min:1.5,max:12,step:0.1,default:3},
    leafThick:{type:'range',label:'Leaf Thickness',min:0.02,max:0.5,step:0.02,default:0.12},
    gap:{type:'range',label:'Center Gap',min:0,max:0.5,step:0.01,default:0.06},
    radius:{type:'range',label:'Leaf Round',min:0,max:0.6,step:0.02,default:0.12},
    y:{type:'range',label:'Y',min:0,max:200,step:0.5,default:0},
    z:{type:'range',label:'Z Offset',min:-10,max:20,step:0.1,default:0}
  },
  (p)=>{
    const leafW = (p.width - p.gap) / 2;
    const mkLeaf = () => new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRectShape(leafW, p.height, p.radius), {depth:p.leafThick, bevelEnabled:false}), metalMat);
    const L = mkLeaf(), R = mkLeaf();
    L.position.set(-(p.gap/2 + leafW/2), p.height/2 + p.y, p.z - p.leafThick/2);
    R.position.set( +(p.gap/2 + leafW/2), p.height/2 + p.y, p.z - p.leafThick/2);
    const g = new THREE.Group(); g.add(L,R); g.name='solid';
    return g;
  }
);

/* Double Door Cut Tool */
register(
  'cut.double','Cut: Double Doors',
  {
    target:{type:'entity', label:'Target', whereType:['tower.base','tower.neck','roof','top.floor','bridge.tunnel']},
    width:{type:'range',label:'Opening Width',min:2,max:16,step:0.1,default:6},
    height:{type:'range',label:'Opening Height',min:1.5,max:12,step:0.1,default:3},
    gap:{type:'range',label:'Center Gap',min:0,max:0.5,step:0.01,default:0.06},
    depth:{type:'range',label:'Cut Depth',min:0.1,max:4,step:0.05,default:1.2},
    radius:{type:'range',label:'Corner Radius',min:0,max:0.6,step:0.02,default:0.12},
    APPLY:{type:'button',text:'Apply Cut'}
  },
  (p)=>{
    const cutterGroup = new THREE.Group(); cutterGroup.name='cutter.double';
    const leafW = (p.width - p.gap) / 2;
    const mkCut = ()=> new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRectShape(leafW, p.height, p.radius), {depth:p.depth, bevelEnabled:false}), metalMat);
    const left = mkCut(), right = mkCut();
    left.position.set(-(p.gap/2 + leafW/2), p.height/2, -p.depth/2);
    right.position.set( +(p.gap/2 + leafW/2), p.height/2, -p.depth/2);
    cutterGroup.add(left,right);
    return cutterGroup;
  },
  [
    {
      key:'APPLY',
      // *** THIS IS THE FIX ***
      // 'state' is now the full 'State' module from inspector.js
      run: async (ent, State)=>{
        try{
          const targetId = ent.params.target?.trim(); if(!targetId) return alert('Pick a Target.');
          // Use the correct State.getEntity function
          const tgt = State.getEntity(targetId);
          if(!tgt) return alert('Target not found');
          // *** END FIX ***
          const targetMesh = firstMeshIn(tgt.object); if(!targetMesh) return alert('No mesh on target');
          const cutters = [];
          ent.object.updateWorldMatrix(true,true);
          ent.object.traverse(o=>{
            if(o.isMesh){ const w=o.clone(); w.applyMatrix4(ent.object.matrixWorld); cutters.push(w); }
          });
          await subtractCSGInPlace(targetMesh, cutters);
          alert('Double-door cut applied.');
        }catch(e){ console.error(e); __logErr('Cut failed: ' + e.message); alert('Cut failed: '+e.message); }
      }
    }
  ]
);

/* Brace Ring (Hollow) */
register(
  'brace.ring','Brace Ring (Hollow)',
  {
    y:{type:'range',label:'Y',min:-10,max:120,step:0.5,default:5},
    height:{type:'range',label:'Height',min:0.5,max:20,step:0.1,default:10},
    rx:{type:'range',label:'Radius X',min:2,max:20,step:0.1,default:5},
    rz:{type:'range',label:'Radius Z',min:2,max:20,step:0.1,default:8},
    roundN:{type:'range',label:'Corner n',min:2.2,max:8,step:0.1,default:6.8},
    wall:{type:'range',label:'Wall Thick',min:0.05,max:2,step:0.05,default:0.5},
    segU:{type:'range',label:'Radial Segs',min:48,max:192,step:8,default:120},
    segV:{type:'range',label:'Vertical Segs',min:6,max:64,step:2,default:16}
  },
  (p)=>{
    const {height,rx,rz,roundN,wall,segU,segV} = p;
    const dy=height/segV, verts=[], idx=[];
    const outer=[], inner=[];
    for(let iv=0;iv<=segV;iv++){
      const y=iv*dy;
      for(let iu=0; iu<segU; iu++){
        const t = iu*(Math.PI*2/segU);
        const o=superellipsePoint(rx, rz, roundN, t);
        const i=superellipsePoint(Math.max(0.001, rx-wall), Math.max(0.001, rz-wall), roundN, t);
        outer.push(new THREE.Vector3(o.x,y,o.y));
        inner.push(new THREE.Vector3(i.x,y,i.y));
      }
    }
    const push=v=>verts.push(v.x,v.y,v.z);
    const outerBase=0, innerBase=(segV+1)*segU;
    for(let iv=0;iv<=segV;iv++) for(let iu=0;iu<segU;iu++) push(outer[iv*segU+iu]);
    for(let iv=0;iv<=segV;iv++) for(let iu=0;iu<segU;iu++) push(inner[iv*segU+iu]);
    const addQ=(a,b,c,d,flip=false)=>{ if(!flip){idx.push(a,b,d,b,c,d);} else {idx.push(a,d,b,b,d,c);} };
    for(let iv=0;iv<segV;iv++){
      for(let iu=0;iu<segU;iu++){
        const iu1=(iu+1)%segU;
        addQ(outerBase+iv*segU+iu, outerBase+iv*segU+iu1, outerBase+(iv+1)*segU+iu1, outerBase+(iv+1)*segU+iu, false);
        addQ(innerBase+iv*segU+iu, innerBase+iv*segU+iu1, innerBase+(iv+1)*segU+iu1, innerBase+(iv+1)*segU+iu, true);
      }
    }
    for(let iu=0; iu<segU; iu++){
      const iu1=(iu+1)%segU;
      addQ(outerBase+iu, outerBase+iu1, innerBase+iu1, innerBase+iu, true);
      const oA=outerBase+segV*segU+iu, oB=outerBase+segV*segU+iu1, iA=innerBase+segV*segU+iu, iB=innerBase+segV*segU+iu1;
      addQ(oA,oB,iB,iA,false);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts),3));
    g.setIndex(idx); g.computeVertexNormals(); addCylUV(g);
    const m=new THREE.Mesh(g, metalMat); m.position.y=p.y; m.name='solid';
    return m;
  }
);

/* Realistic railing segment (straight) */
register(
  'rail.segment','Railing Segment',
  {
    length:{type:'range',label:'Length',min:1,max:40,step:0.1,default:7},
    height:{type:'range',label:'Height',min:0.5,max:3,step:0.05,default:1.1},
    postSpace:{type:'range',label:'Post Spacing',min:0.4,max:4,step:0.1,default:1.2},
    postR:{type:'range',label:'Post Radius',min:0.02,max:0.2,step:0.01,default:0.06},
    balR:{type:'range',label:'Baluster Radius',min:0.01,max:0.1,step:0.005,default:0.03},
    handR:{type:'range',label:'Handrail Radius',min:0.02,max:0.2,step:0.01,default:0.06},
    midRail:{type:'checkbox',label:'Middle Rail',default:true}
  },
  (p)=>{
    const g=new THREE.Group(); const y0=0;
    // posts
    const posts = Math.max(2, Math.round(p.length / p.postSpace)+1);
    for(let i=0;i<posts;i++){
      const x = -p.length/2 + (i*(p.length/(posts-1)));
      g.add(cylBetween(new THREE.Vector3(x,y0,0), new THREE.Vector3(x,y0+p.height,0), p.postR));
    }
    // balusters between posts
    const spacing = p.postSpace/Math.max(1, Math.floor(p.postSpace/0.25));
    for(let x=-p.length/2; x<=p.length/2+1e-6; x+=spacing){
      g.add(cylBetween(new THREE.Vector3(x,y0,0), new THREE.Vector3(x,y0+p.height*0.85,0), p.balR));
    }
    // handrail
    g.add(cylBetween(new THREE.Vector3(-p.length/2, y0+p.height, 0), new THREE.Vector3(p.length/2, y0+p.height, 0), p.handR));
    if(p.midRail){
      g.add(cylBetween(new THREE.Vector3(-p.length/2, y0+p.height*0.5, 0), new THREE.Vector3(p.length/2, y0+p.height*0.5, 0), p.balR*1.1));
    }
    g.name='solid'; return g;
  }
);

/* Bridge tunnel (hollow rounded rectangular tube) */
register(
  'bridge.tunnel','Bridge Tunnel',
  {
    width:{type:'range',label:'Width',min:2,max:20,step:0.1,default:4},
    height:{type:'range',label:'Height',min:2,max:20,step:0.1,default:3},
    length:{type:'range',label:'Length',min:2,max:60,step:0.5,default:10},
    wall:{type:'range',label:'Wall Thick',min:0.05,max:1,step:0.05,default:0.15},
    radius:{type:'range',label:'Corner Radius',min:0,max:2,step:0.05,default:0.4}
  },
  (p)=>{
    const outer=roundedRectShape(p.width, p.height, p.radius);
    const inner=roundedRectShape(Math.max(0.1,p.width-2*p.wall), Math.max(0.1,p.height-2*p.wall), Math.max(0,p.radius-p.wall*0.6));
    outer.holes.push(inner); 
    const eg=new THREE.ExtrudeGeometry(outer,{depth:p.length, bevelEnabled:false});
    addPlanarUV(eg,'xy'); const m=new THREE.Mesh(eg, metalMat); m.rotation.x = -Math.PI/2; m.position.z = -p.length/2; m.name='solid'; return m;
  }
);

/* Box truss frame beam (with diagonals) */
register(
  'truss.box','Box Truss Beam',
  {
    length:{type:'range',label:'Length',min:2,max:80,step:0.5,default:12},
    width:{type:'range',label:'Width',min:0.4,max:6,step:0.1,default:1.2},
    height:{type:'range',label:'Height',min:0.4,max:6,step:0.1,default:1.2},
    chordR:{type:'range',label:'Chord Radius',min:0.02,max:0.3,step:0.01,default:0.08},
    diagR:{type:'range',label:'Diagonal Radius',min:0.02,max:0.25,step:0.01,default:0.06},
    bay:{type:'range',label:'Bay Length',min:0.4,max:6,step:0.1,default:1.2}
  },
  (p)=>{
    const g=new THREE.Group();
    const L=p.length, W=p.width, H=p.height;
    const A=new THREE.Vector3(-L/2,  H/2,  W/2);
    const B=new THREE.Vector3( L/2,  H/2,  W/2);
    const C=new THREE.Vector3(-L/2, -H/2,  W/2);
    const D=new THREE.Vector3( L/2, -H/2,  W/2);
    const E=new THREE.Vector3(-L/2,  H/2, -W/2);
    const F=new THREE.Vector3( L/2,  H/2, -W/2);
    const G=new THREE.Vector3(-L/2, -H/2, -W/2);
    const Hh=new THREE.Vector3( L/2, -H/2, -W/2);
    // chords
    g.add(cylBetween(A,B,p.chordR), cylBetween(C,D,p.chordR), cylBetween(E,F,p.chordR), cylBetween(G,Hh,p.chordR));
    g.add(cylBetween(A,E,p.chordR), cylBetween(B,F,p.chordR), cylBetween(C,G,p.chordR), cylBetween(D,Hh,p.chordR));
    // diagonals each bay
    const bays = Math.max(1, Math.round(L/p.bay));
    for(let i=0;i<bays;i++){
      const x0 = -L/2 + i*(L/bays), x1 = -L/2 + (i+1)*(L/bays);
      // top
      g.add(cylBetween(new THREE.Vector3(x0, H/2, W/2), new THREE.Vector3(x1, H/2,-W/2), p.diagR));
      g.add(cylBetween(new THREE.Vector3(x0,-H/2, W/2), new THREE.Vector3(x1,-H/2,-W/2), p.diagR));
      g.add(cylBetween(new THREE.Vector3(x0, H/2,-W/2), new THREE.Vector3(x1, H/2, W/2), p.diagR));
      g.add(cylBetween(new THREE.Vector3(x0,-H/2,-W/2), new THREE.Vector3(x1,-H/2, W/2), p.diagR));
      // web X braces
      g.add(cylBetween(new THREE.Vector3(x0, H/2, W/2), new THREE.Vector3(x1,-H/2, W/2), p.diagR));
      g.add(cylBetween(new THREE.Vector3(x0,-H/2, W/2), new THREE.Vector3(x1, H/2, W/2), p.diagR));
      g.add(cylBetween(new THREE.Vector3(x0, H/2,-W/2), new THREE.Vector3(x1,-H/2,-W/2), p.diagR));
      g.add(cylBetween(new THREE.Vector3(x0,-H/2,-W/2), new THREE.Vector3(x1, H/2,-W/2), p.diagR));
    }
    g.name='solid'; return g;
  }
);
/* ================================================================================
END COMPONENT DEFINITIONS
================================================================================
*/

/* ================================================================================
START PRIMITIVE SHAPES
================================================================================
*/

/* Box */
register(
  'shape.box', 'Box',
  {
    width: { type: 'range', label: 'Width', min: 0.1, max: 20, step: 0.1, default: 2 },
    height: { type: 'range', label: 'Height', min: 0.1, max: 20, step: 0.1, default: 2 },
    depth: { type: 'range', label: 'Depth', min: 0.1, max: 20, step: 0.1, default: 2 }
  },
  (p) => {
    const geo = new THREE.BoxGeometry(p.width, p.height, p.depth);
    return new THREE.Mesh(geo, metalMat); // Will be cloned in state.js
  }
);

/* Sphere */
register(
  'shape.sphere', 'Sphere',
  {
    radius: { type: 'range', label: 'Radius', min: 0.1, max: 10, step: 0.1, default: 1 },
    widthSeg: { type: 'range', label: 'Width Segments', min: 3, max: 64, step: 1, default: 32 },
    heightSeg: { type: 'range', label: 'Height Segments', min: 2, max: 32, step: 1, default: 16 }
  },
  (p) => {
    const geo = new THREE.SphereGeometry(p.radius, p.widthSeg, p.heightSeg);
    return new THREE.Mesh(geo, metalMat);
  }
);

/* Cylinder */
register(
  'shape.cylinder', 'Cylinder',
  {
    radiusTop: { type: 'range', label: 'Top Radius', min: 0.0, max: 10, step: 0.1, default: 1 },
    radiusBottom: { type: 'range', label: 'Bottom Radius', min: 0.0, max: 10, step: 0.1, default: 1 },
    height: { type: 'range', label: 'Height', min: 0.1, max: 20, step: 0.1, default: 2 },
    radialSeg: { type: 'range', label: 'Radial Segments', min: 3, max: 64, step: 1, default: 32 }
  },
  (p) => {
    const geo = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, p.radialSeg);
    return new THREE.Mesh(geo, metalMat);
  }
);

/* Torus */
register(
  'shape.torus', 'Torus',
  {
    radius: { type: 'range', label: 'Radius', min: 0.1, max: 10, step: 0.1, default: 1 },
    tube: { type: 'range', label: 'Tube Radius', min: 0.01, max: 5, step: 0.01, default: 0.4 },
    radialSeg: { type: 'range', label: 'Radial Segments', min: 3, max: 64, step: 1, default: 16 },
    tubularSeg: { type: 'range', label: 'Tubular Segments', min: 3, max: 128, step: 1, default: 64 }
  },
  (p) => {
    const geo = new THREE.TorusGeometry(p.radius, p.tube, p.radialSeg, p.tubularSeg);
    return new THREE.Mesh(geo, metalMat);
  }
);

/* Plane */
register(
  'shape.plane', 'Plane',
  {
    width: { type: 'range', label: 'Width', min: 0.1, max: 20, step: 0.1, default: 2 },
    height: { type: 'range', label: 'Height (Z)', min: 0.1, max: 20, step: 0.1, default: 2 }
  },
  (p) => {
    const geo = new THREE.PlaneGeometry(p.width, p.height);
    const mesh = new THREE.Mesh(geo, metalMat);
    mesh.rotation.x = -Math.PI / 2; // Lay it flat
    return mesh;
  }
);
    
/* ================================================================================
END PRIMITIVE SHAPES
================================================================================
*/
