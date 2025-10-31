// File: objects/window_frame.js
import * as THREE from 'three';

// -----------------------------------------------------------------
// ---------- GEOMETRY HELPERS (Copied from towerbase.js) ----------
// -----------------------------------------------------------------

function roundedRectPath(w, d, r) {
  const hw = w / 2, hd = d / 2, rr = Math.max(0, Math.min(r, hw, hd));
  const p = new THREE.Path();
  p.moveTo(-hw + rr, -hd);
  p.lineTo(hw - rr, -hd);
  p.absarc(hw - rr, -hd + rr, rr, -Math.PI / 2, 0, false);
  p.lineTo(hw, hd - rr);
  p.absarc(hw - rr, hd - rr, rr, 0, Math.PI / 2, false);
  p.lineTo(-hw + rr, hd);
  p.absarc(-hw + rr, hd - rr, rr, Math.PI / 2, Math.PI, false);
  p.lineTo(-hw, -hd + rr);
  p.absarc(-hw + rr, -hd + rr, rr, Math.PI, 1.5 * Math.PI, false);
  p.closePath();
  return p;
}

function clampEdgeRoundnessInPlane(p) {
  const maxByWall = Math.max(0.01, p.wallThickness / 2 - 0.01);
  const maxByFoot = Math.max(0.01, Math.min(p.width, p.depth) * 0.25);
  return Math.min(p.edgeRoundness || 0, maxByWall, maxByFoot);
}

function clampEdgeRoundnessThickness(p) {
  const maxByH = Math.max(0.01, p.height / 4);
  const maxByT = Math.max(0.01, p.wallThickness / 1.5);
  return Math.min(p.edgeRoundness || 0, maxByH, maxByT);
}

// Internal helper based on TowerBase logic
function unifiedShellGeometry(p, forceNoBevel = false) {
  const eps = 0.01;
  // Use the static method for consistency
  const maxCorner = WindowFrame.getMaxCornerRadius(p);
  const cornerRadius = Math.min(Math.max(0, p.cornerRadius || 0), maxCorner);

  const innerW = Math.max(eps, p.width - 2 * p.wallThickness);
  const innerD = Math.max(eps, p.depth - 2 * p.wallThickness);
  const innerR = Math.max(0, cornerRadius - p.wallThickness);

  // This object is *always* solid (no door)
  const shape = new THREE.Shape();
  shape.add(roundedRectPath(p.width, p.depth, cornerRadius));
  const inner = roundedRectPath(innerW, innerD, innerR);
  shape.holes.push(inner);

  const bevelEnabled = !forceNoBevel && (p.edgeRoundness || 0) > 0;
  const extrudeSettings = {
    depth: p.height,
    steps: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelEnabled,
    bevelSegments: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelSize: bevelEnabled ? clampEdgeRoundnessInPlane(p) : 0,
    bevelThickness: bevelEnabled ? clampEdgeRoundnessThickness(p) : 0,
    curveSegments: Math.max(8, Math.floor(p.cornerSmoothness || 16))
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.translate(0, 0, -p.height / 2);
  geo.rotateX(-Math.PI / 2); // make Y up
  geo.computeVertexNormals();
  return geo;
}


// -----------------------------------------------------------------
// ---------- EXPORTED WINDOW FRAME CLASS --------------------------
// -----------------------------------------------------------------

export default class WindowFrame extends THREE.Group {
  
  // --- Static methods for UI (from TowerBase) ---
  static getMaxCornerRadius(p) {
    const eps = 0.01;
    return Math.max(0, Math.min(p.width, p.depth) / 2 - p.wallThickness - eps);
  }
  static getMaxEdgeRoundness(p) {
    return Math.max(0.05, Math.min(p.wallThickness / 2 - 0.01, p.height / 4));
  }
  // No door width needed for this object

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'WindowFrame'; // New type

    const defaultParams = {
      width: 12,
      depth: 12,
      height: 1, // Windows are usually thinner
      wallThickness: 1,
      cornerRadius: 1.2,
      cornerSmoothness: 16,
      edgeRoundness: 0.3,
      edgeSmoothness: 4,
      // Glass params
      glassR: 0.8, glassG: 0.8, glassB: 1,
      glassOpacity: 0.3,
      glassRoughness: 0.1
    };

    this.frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.7,
      metalness: 0.1
    });
    
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.8,0.8,1),
      transparent: true,
      opacity: 0.3,
      transmission: 0.9,
      roughness: 0.1,
      metalness: 0,
      side: THREE.DoubleSide
    });

    this.userData.params = { ...defaultParams, ...params };

    this.build();
  }

  build() {
    for (const c of this.children) {
      c.geometry && c.geometry.dispose();
    }
    this.clear();
    const p = this.userData.params;

    // 1. Build Frame (using TowerBase logic)
    let shellGeo = unifiedShellGeometry(p, false);
    const frameMesh = new THREE.Mesh(shellGeo, this.frameMaterial);
    frameMesh.name = 'Frame';
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    this.add(frameMesh);

    // 2. Build Glass
    const glassW = Math.max(0.01, p.width - 2 * p.wallThickness);
    const glassD = Math.max(0.01, p.depth - 2 * p.wallThickness);
    
    const glassGeo = new THREE.PlaneGeometry(glassW, glassD);
    const glass = new THREE.Mesh(glassGeo, this.glassMaterial);
    glass.name = 'Glass';
    // The TowerBase extrusion is centered at Y=0 and rotated.
    // The glass plane should also be at Y=0, rotated to match the XZ hole.
    glass.rotation.x = -Math.PI / 2;
    glass.position.y = 0; // Centered in the frame height
    this.add(glass);
    
    // 3. Update materials
    this.glassMaterial.color.setRGB(p.glassR, p.glassG, p.glassB);
    this.glassMaterial.opacity      = p.glassOpacity;
    this.glassMaterial.transmission = 1 - p.glassOpacity * 0.2;
    this.glassMaterial.roughness    = p.glassRoughness;
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };

    // Apply constraints
    const crMax = WindowFrame.getMaxCornerRadius(next);
    if (next.cornerRadius > crMax) next.cornerRadius = crMax;
    
    const erMax = WindowFrame.getMaxEdgeRoundness(next);
    if (next.edgeRoundness > erMax) next.edgeRoundness = erMax;

    this.userData.params = next;
    this.build();
  }
  
  dispose() {
    for (const c of this.children) {
      if (c.geometry) {
        c.geometry.dispose();
      }
    }
    this.clear();
  }
}
