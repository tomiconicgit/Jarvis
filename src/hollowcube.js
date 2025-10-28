/*
File: src/hollowcube.js
*/
// Hollow Cube â clean frame: 12 edge beams + 8 corner blocks (+ optional face panels)
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const DEFAULT_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.8,
  metalness: 0.1,
  flatShading: true
});

export default {
  create() {
    const pivot = new THREE.Group();
    pivot.name = 'Hollow Cube';

    // Editable params (used by Transform tab)
    const params = {
      size: 1.0,     // overall outer size
      edge: 0.12,    // edge/strut thickness (also corner block size)
      panel: 0.10,   // thickness of closing panels when a side is set to "closed"
      open: {        // true = side open (hole); false = add solid panel
        px: true, nx: true,
        py: true, ny: true,
        pz: true, nz: true
      }
    };

    const mesh = new THREE.Mesh(buildGeometry(params), DEFAULT_MAT);
    mesh.name = 'Mesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.shapeType = 'hollowcube';
    mesh.userData._structCache = { shape: 'hollowcube' };
    mesh.userData._basePositions = mesh.geometry.attributes.position.array.slice();

    pivot.add(mesh);

    // Expose params + rebuild hook
    pivot.userData.shapeKind = 'hollowcube';
    pivot.userData.hollow = params;
    pivot.userData.rebuild = () => {
      const m = pivot.getObjectByName('Mesh');
      if (!m) return;
      const g = buildGeometry(params);
      m.geometry.dispose?.();
      m.geometry = g;
      m.geometry.computeVertexNormals();
      m.userData._basePositions = g.attributes.position.array.slice();
      m.userData._structCache = { shape: 'hollowcube' };
    };

    // Default modifier state (same keys as other shapes)
    pivot.userData.mods = {
      pivotOffset:{x:0,y:0,z:0},
      resX:2,resY:2,resZ:2,subdivLevel:0,adaptiveSubdiv:false,
      bevelRadius:0,bevelSegments:1,
      // deforms
      tiltX:0,tiltY:0,shearX:0,shearY:0,shearZ:0,
      taperTop:1,taperBottom:1,twistY:0,bendX:0,bendZ:0,bulge:0,
      // noise
      noiseStrength:0,noiseScale:2,noiseSeed:1
    };

    return pivot;
  }
};

/* ---------------- geometry builder ---------------- */
function buildGeometry(p) {
  const geos = [];
  const s = Math.max(0.01, p.size || 1);
  const t = THREE.MathUtils.clamp(p.edge || 0.12, 0.005, s * 0.49); // edge thickness
  const hs = s * 0.5;
  
  // *** FIXED LINE ***
  const inner = Math.max(0.001, s - t);                         // opening span
  
  const panelT = THREE.MathUtils.clamp(p.panel || t, 0.005, t);     // panel â¤ edge

  // Helpers
  const addBox = (w,h,d, x,y,z) => { const g = new THREE.BoxGeometry(w,h,d); g.translate(x,y,z); geos.push(g); };

  // 8 corner blocks (fills the corner gaps perfectly)
  const c = hs - t * 0.5; // corner block centers
  for (const sx of [-1,1]) for (const sy of [-1,1]) for (const sz of [-1,1]) {
    addBox(t, t, t, sx*c, sy*c, sz*c);
  }

  // 12 edge beams â lengths exclude the corner blocks
  
  // *** FIXED LINE ***
  const L = Math.max(0.001, s - t);
  
  // along X (y,z = Â±c)
  for (const sy of [-1,1]) for (const sz of [-1,1]) addBox(L, t, t, 0, sy*c, sz*c);
  // along Y (x,z = Â±c)
  for (const sx of [-1,1]) for (const sz of [-1,1]) addBox(t, L, t, sx*c, 0, sz*c);
  // along Z (x,y = Â±c)
  for (const sx of [-1,1]) for (const sy of [-1,1]) addBox(t, t, L, sx*c, sy*c, 0);

  // Optional face panels (close sides)
  const px = (sign)=> addBox(panelT, inner, inner, (sign>0? +1 : -1)*(hs - panelT*0.5), 0, 0);
  const py = (sign)=> addBox(inner, panelT, inner, 0, (sign>0? +1 : -1)*(hs - panelT*0.5), 0);
  const pz = (sign)=> addBox(inner, inner, panelT, 0, 0, (sign>0? +1 : -1)*(hs - panelT*0.5));

  if (!p.open.px) px(+1);
  if (!p.open.nx) px(-1);
  if (!p.open.py) py(+1);
  if (!p.open.ny) py(-1);
  if (!p.open.pz) pz(+1);
  if (!p.open.nz) pz(-1);

  const merged = BufferGeometryUtils.mergeGeometries(geos, false);
  merged.computeVertexNormals();
  return merged;
}
