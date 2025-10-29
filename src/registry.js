/*
File: src/registry.js
*/
// Contains the remaining component registry, builders, and UI generator.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// NOTE: CSG library import ('@gkjohnson/three-bvh-csg') is no longer needed
// as the cutout tools that used it have been removed.
// import { Brush, Evaluator, SUBTRACTION } from '@gkjohnson/three-bvh-csg';

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
// firstMeshIn is no longer needed as cutout tools are removed.
// export function firstMeshIn(object3d) { /* ... */ }
function cylBetween(a,b,r,mat){
  const dir=b.clone().sub(a); const len=dir.length()||1; const geo=new THREE.CylinderGeometry(r,r,len,16);
  const m=new THREE.Mesh(geo, mat||metalMat); const up=new THREE.Vector3(0,1,0);
  m.position.copy(a).addScaledVector(dir,0.5); m.quaternion.setFromUnitVectors(up, dir.normalize()); return m;
}

/* ---------- CSG Functions ---------- */
// CSG functions (loadCSGModule, subtractCSGInPlace) are removed as cutout tools are gone.

/* ---------- Registry (plugins) ---------- */
export const Registry = new Map();
export function register(type, label, schema, builder, actions=[]) { // Actions are no longer used but kept for structure
  Registry.set(type, { type, label, schema, builder, actions });
}

/**
 * Builds the Inspector UI inside a given root element.
 */
export function buildInspectorUI(rootEl, type, values, onChange, onAction, state){ // onAction and state for 'entity' type are no longer needed here
  rootEl.innerHTML='';
  const schema = Registry.get(type).schema;

  for(const [key, def] of Object.entries(schema)){
    const row=document.createElement('div'); row.className='row';
    const lab=document.createElement('label'); lab.textContent=def.label || key; row.appendChild(lab);

    // Button type removed as actions are gone
    // if(def.type==='button'){ /* ... */ }

    let input, out=document.createElement('output');
    const val = values[key] ?? def.default;

    // Entity type removed as actions/targets are gone
    // if(def.type==='entity'){ /* ... */ }
    if(def.type==='range'){
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
    } else { // Default to text
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
REMAINING COMPONENT DEFINITIONS
================================================================================
*/

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
    const unit=new THREE.Mesh(tube, metalMat); unit.position.set(0,0,6); // Example offset, adjust if needed
    for(let i=0;i<p.count;i++){
      const a=(p.angleStart + i*(360/p.count))*Math.PI/180;
      const inst=unit.clone(); inst.position.applyAxisAngle(new THREE.Vector3(0,1,0), a);
      inst.rotation.y = a;
      grp.add(inst);
    }
    grp.name='pipingGroup'; // Changed name slightly
    return grp;
  }
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
    // Check if inner dimensions are valid before creating shape
    if (iw > 0 && ih > 0) {
        const ish=roundedRectShape(iw, ih, Math.max(0, Math.min(iw,ih)*0.1 - p.frameW*0.5));
        s.holes.push(ish);
    } else {
        console.warn("Window frame width/height too small for frame width.");
    }
    const frameGeo = new THREE.ExtrudeGeometry(s, { depth:p.frameT, bevelEnabled:false });
    addPlanarUV(frameGeo,'xy');
    const frameMesh=new THREE.Mesh(frameGeo, metalMat);
    frameMesh.position.z = -p.frameT/2;
    g.add(frameMesh);

    // Mullions only if inner dimensions are valid
    if (iw > 0 && ih > 0) {
        const mullT=p.frameW*0.6;
        const x0=-iw/2, y0=-ih/2;
        for(let c=1;c<=p.mullCols;c++){
          const x=x0 + (iw*c/(p.mullCols+1));
          const barGeo=new THREE.BoxGeometry(mullT, ih, p.frameT);
          const m=new THREE.Mesh(barGeo, metalMat); m.position.set(x,0,0); g.add(m); // Adjusted Z pos
        }
        for(let r=1;r<=p.mullRows;r++){
          const y=y0 + (ih*r/(p.mullRows+1));
          const barGeo=new THREE.BoxGeometry(iw, mullT, p.frameT);
          const m=new THREE.Mesh(barGeo, metalMat); m.position.set(0,y,0); g.add(m); // Adjusted Z pos
        }

        // Glass pane only if inner dimensions are valid
        const glassGeo=new THREE.PlaneGeometry(iw - mullT*0.1, ih - mullT*0.1);
        const gm=new THREE.Mesh(glassGeo, glassMat); gm.position.z = (p.glassT - p.frameT)/2; // Center glass within frame depth
        g.add(gm);
    }
    g.name='windowGroup';
    // Center the whole window group vertically
    g.position.y = p.height / 2;
    return g;
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
    y:{type:'range',label:'Y Offset',min:-10,max:200,step:0.5,default:0}, // Changed label
    z:{type:'range',label:'Z Offset',min:-10,max:20,step:0.1,default:0}
  },
  (p)=>{
    const leafW = (p.width - p.gap) / 2;
    if (leafW <= 0) {
        console.warn("Door leaf width is zero or negative due to gap size.");
        return new THREE.Group(); // Return empty group if invalid
    }
    const mkLeaf = () => new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRectShape(leafW, p.height, p.radius), {depth:p.leafThick, bevelEnabled:false}), metalMat);
    const L = mkLeaf();
    const R = mkLeaf();
    // Position doors relative to their bottom center, then apply offsets
    L.position.set(-(p.gap/2 + leafW/2), p.height/2 + p.y, p.z - p.leafThick/2);
    R.position.set( +(p.gap/2 + leafW/2), p.height/2 + p.y, p.z - p.leafThick/2);
    const g = new THREE.Group(); g.add(L,R); g.name='doorGroup';
    return g;
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
    g.name='trussGroup'; // Changed name
    return g;
  }
);
/* ================================================================================
END REMAINING COMPONENT DEFINITIONS
================================================================================
*/
