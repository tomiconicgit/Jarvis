import * as THREE from 'three';

// -----------------------------------------------------------------
// ---------- GEOMETRY HELPERS (Private to this module) ------------
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

// Note: This is now a private helper.
// The public-facing version is `TowerBase.getMaxDoorWidth(p)`
function _maxDoorWidth(p) {
  const eps = 0.05;
  const flat = Math.max(0, p.width - 2 * p.cornerRadius);
  return Math.max(eps, flat - eps);
}

function unifiedShellGeometry(p, forceNoBevel = false) {
  const eps = 0.01;
  // Use the static method for consistency
  const maxCorner = TowerBase.getMaxCornerRadius(p);
  const cornerRadius = Math.min(Math.max(0, p.cornerRadius || 0), maxCorner);

  const innerW = Math.max(eps, p.width - 2 * p.wallThickness);
  const innerD = Math.max(eps, p.depth - 2 * p.wallThickness);
  const innerR = Math.max(0, cornerRadius - p.wallThickness);

  const hasDoor = p.doorWidth > 0;
  const shape = new THREE.Shape();

  if (!hasDoor) {
    shape.add(roundedRectPath(p.width, p.depth, cornerRadius));
    const inner = roundedRectPath(innerW, innerD, innerR);
    shape.holes.push(inner);
  } else {
    const hw = p.width / 2;
    const hd = p.depth / 2;
    const rr = cornerRadius;
    const ihw = innerW / 2;
    const ihd = innerD / 2;
    const ir = innerR;
    const doorW = Math.min(p.doorWidth, _maxDoorWidth(p)); // Use private helper
    const doorLeftX = -doorW / 2;
    const doorRightX = doorW / 2;

    shape.moveTo(doorLeftX, hd);
    shape.lineTo(-hw + rr, hd);
    shape.absarc(-hw + rr, hd - rr, rr, Math.PI / 2, Math.PI, false);
    shape.lineTo(-hw, -hd + rr);
    shape.absarc(-hw + rr, -hd + rr, rr, Math.PI, 3 * Math.PI / 2, false);
    shape.lineTo(hw - rr, -hd);
    shape.absarc(hw - rr, -hd + rr, rr, -Math.PI / 2, 0, false);
    shape.lineTo(hw, hd - rr);
    shape.absarc(hw - rr, hd - rr, rr, 0, Math.PI / 2, false);
    shape.lineTo(doorRightX, hd);
    shape.lineTo(doorRightX, ihd);
    shape.lineTo(ihw - ir, ihd);
    shape.absarc(ihw - ir, ihd - ir, ir, Math.PI / 2, 0, true);
    shape.lineTo(ihw, -ihd + ir);
    shape.absarc(ihw - ir, -ihd + ir, ir, 0, -Math.PI / 2, true);
    shape.lineTo(-ihw + ir, -ihd);
    shape.absarc(-ihw + ir, -ihd + ir, ir, 3 * Math.PI / 2, Math.PI, true);
    shape.lineTo(-ihw, ihd - ir);
    shape.absarc(-ihw + ir, ihd - ir, ir, Math.PI, Math.PI / 2, true);
    shape.lineTo(doorLeftX, ihd);
    shape.lineTo(doorLeftX, hd);
  }

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
// ---------- EXPORTED TOWER BASE CLASS ----------------------------
// -----------------------------------------------------------------

export default class TowerBase extends THREE.Group {
  
  // --- Static methods for UI ---
  /** Calculates max corner radius for sliders */
  static getMaxCornerRadius(p) {
    const eps = 0.01;
    return Math.max(0, Math.min(p.width, p.depth) / 2 - p.wallThickness - eps);
  }
  
  /** Calculates max edge roundness for sliders */
  static getMaxEdgeRoundness(p) {
    return Math.max(0.05, Math.min(p.wallThickness / 2 - 0.01, p.height / 4));
  }
  
  /** Calculates max door width for sliders */
  static getMaxDoorWidth(p) {
    const eps = 0.05;
    const flat = Math.max(0, p.width - 2 * p.cornerRadius);
    // Return 0 if the corner radius is too large, otherwise the max flat width
    return (p.width - 2 * p.cornerRadius) < eps ? 0 : Math.max(eps, flat - eps);
  }

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'TowerBase';

    const defaultParams = {
      width: 12,
      depth: 12,
      height: 6,
      wallThickness: 1,
      cornerRadius: 1.2,
      cornerSmoothness: 16,
      edgeRoundness: 0.3,
      edgeSmoothness: 4,
      doorWidth: 4
    };

    this.material = params.material || new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.7,
      metalness: 0.1
    });

    this.userData.params = { ...defaultParams, ...params };
    delete this.userData.params.material; 

    this.build();
  }

  build() {
    for (const c of this.children) {
      c.geometry && c.geometry.dispose();
    }
    this.clear();
    const p = this.userData.params;
    let shellGeo = unifiedShellGeometry(p, false);
    const resultMesh = new THREE.Mesh(shellGeo, this.material);
    resultMesh.name = 'Shell';
    resultMesh.castShadow = true;
    resultMesh.receiveShadow = true;
    this.add(resultMesh);
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };

    // Apply constraints
    const crMax = TowerBase.getMaxCornerRadius(next);
    if (next.cornerRadius > crMax) next.cornerRadius = crMax;

    // Only check door width if it's supposed to have one
    if (next.doorWidth > 0) {
      const dwMax = TowerBase.getMaxDoorWidth(next);
      if (next.doorWidth > dwMax) next.doorWidth = dwMax;
    }

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
