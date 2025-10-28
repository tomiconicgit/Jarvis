/*
File: src/hollowcube.js
*/
// Hollow Cube — 12 edge beams (+ optional face panels). Works with modifiers.js deforms.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const DEFAULT_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.8,
  metalness: 0.1
});

export default {
  create() {
    const pivot = new THREE.Group();
    pivot.name = 'Hollow Cube';

    // Editable params stored on the pivot
    const params = {
      size: 1.0,      // overall size of the cube
      edge: 0.12,     // wall/edge thickness
      panel: 0.12,    // thickness of a "closed" face panel
      open: {         // true=open, false=closed/solid
        px: true, nx: true,  // +X / -X
        py: true, ny: true,  // +Y / -Y
        pz: true, nz: true   // +Z / -Z
      }
    };

    const mesh = new THREE.Mesh(buildGeometry(params), DEFAULT_MAT);
    mesh.name = 'Mesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // mark for transform/modifier system
    mesh.userData.shapeType = 'hollowcube';
    mesh.userData._structCache = { shape: 'hollowcube' };
    mesh.userData._basePositions = mesh.geometry.attributes.position.array.slice();

    pivot.add(mesh);

    // Expose for UI
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

    // Default deform state (shared schema)
    pivot.userData.mods = {
      pivotOffset:{x:0,y:0,z:0},
      resX:2,resY:2,resZ:2,subdivLevel:0,adaptiveSubdiv:false,
      bevelRadius:0,bevelSegments:1,
      tiltX:0,tiltY:0,shearX:0,shearY:0,shearZ:0,taperTop:1,taperBottom:1,
      twistY:0,bendX:0,bendZ:0,bulge:0,
      noiseStrength:0,noiseScale:2,noiseSeed:1
    };

    return pivot;
  }
};

/* ---------------- geometry builder ---------------- */
function buildGeometry(p) {
  const geos = [];
  const s = Math.max(0.01, p.size || 1);
  const t = THREE.MathUtils.clamp(p.edge || 0.12, 0.01, s * 0.49);   // edge thickness
  const panelT = THREE.MathUtils.clamp(p.panel || t, 0.005, t);      // panel ≤ edge
  const hs = s * 0.5;
  const inner = Math.max(0.001, s - 2*t);                            // window opening

  const addBox = (w,h,d, x,y,z) => {
    const g = new THREE.BoxGeometry(w,h,d);
    g.translate(x,y,z);
    geos.push(g);
  };

  // 12 edge beams (rect t×t cross-section)
  const L = s - t;               // beam length so intersections are clean
  const o = hs - t*0.5;          // offset to beam centers

  // Along X (y,z = ±o)
  for (const sy of [-1,1]) for (const sz of [-1,1]) addBox(L, t, t, 0, sy*o, sz*o);
  // Along Y (x,z = ±o)
  for (const sx of [-1,1]) for (const sz of [-1,1]) addBox(t, L, t, sx*o, 0, sz*o);
  // Along Z (x,y = ±o)
  for (const sx of [-1,1]) for (const sy of [-1,1]) addBox(t, t, L, sx*o, sy*o, 0);

  // Optional face panels (fill window when "closed")
  const cx = hs - t; // inner plane location per axis
  const addPanelX = (sign)=> addBox(panelT, inner, inner,  (sign>0? +1 : -1)*(cx - panelT*0.5), 0, 0);
  const addPanelY = (sign)=> addBox(inner, panelT, inner,  0, (sign>0? +1 : -1)*(cx - panelT*0.5), 0);
  const addPanelZ = (sign)=> addBox(inner, inner, panelT,  0, 0, (sign>0? +1 : -1)*(cx - panelT*0.5));

  if (!p.open.px) addPanelX(+1);
  if (!p.open.nx) addPanelX(-1);
  if (!p.open.py) addPanelY(+1);
  if (!p.open.ny) addPanelY(-1);
  if (!p.open.pz) addPanelZ(+1);
  if (!p.open.nz) addPanelZ(-1);

  const merged = BufferGeometryUtils.mergeGeometries(geos, false);
  merged.computeVertexNormals();
  return merged;
}