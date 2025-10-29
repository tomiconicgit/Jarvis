import * as THREE from 'three';

// -----------------------------------------------------------------
// ---------- GEOMETRY HELPERS (Private to this module) ------------
// -----------------------------------------------------------------

/**
 * Creates a 2D path for a rounded rectangle.
 */
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

/**
 * Clamps edge roundness based on wall thickness and footprint.
 */
function clampEdgeRoundnessInPlane(p) {
  const maxByWall = Math.max(0.01, p.wallThickness / 2 - 0.01);
  const maxByFoot = Math.max(0.01, Math.min(p.width, p.depth) * 0.25);
  return Math.min(p.edgeRoundness || 0, maxByWall, maxByFoot);
}

/**
 * Clamps edge roundness based on height.
 */
function clampEdgeRoundnessThickness(p) {
  const maxByH = Math.max(0.01, p.height / 4);
  const maxByT = Math.max(0.01, p.wallThickness / 1.5);
  return Math.min(p.edgeRoundness || 0, maxByH, maxByT);
}

/**
 * Calculates the maximum safe width for a door.
 */
function maxDoorWidth(p) {
  const eps = 0.05;
  const flat = Math.max(0, p.width - 2 * p.cornerRadius);
  return Math.max(eps, flat - eps);
}

/**
 * The main geometry generation function.
 * Creates an extruded shape with an optional door gap.
 */
function unifiedShellGeometry(p, forceNoBevel = false) {
  const eps = 0.01;
  const maxCorner = Math.max(0, Math.min(p.width, p.depth) / 2 - p.wallThickness - eps);
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
    const doorW = Math.min(p.doorWidth, maxDoorWidth(p));
    const doorLeftX = -doorW / 2;
    const doorRightX = doorW / 2;

    // Outer path
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

    // Connect to inner path
    shape.lineTo(doorRightX, ihd);

    // Inner path (reversed)
    shape.lineTo(ihw - ir, ihd);
    shape.absarc(ihw - ir, ihd - ir, ir, Math.PI / 2, 0, true);
    shape.lineTo(ihw, -ihd + ir);
    shape.absarc(ihw - ir, -ihd + ir, ir, 0, -Math.PI / 2, true);
    shape.lineTo(-ihw + ir, -ihd);
    shape.absarc(-ihw + ir, -ihd + ir, ir, 3 * Math.PI / 2, Math.PI, true);
    shape.lineTo(-ihw, ihd - ir);
    shape.absarc(-ihw + ir, ihd - ir, ir, Math.PI, Math.PI / 2, true);
    shape.lineTo(doorLeftX, ihd);

    // Close shape
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

/**
 * A procedural tower base mesh.
 * This is a THREE.Group that contains a single THREE.Mesh.
 */
export default class TowerBase extends THREE.Group {
  /**
   * @param {object} params - Configuration object for the tower.
   * @param {number} [params.width=12] - Outer width.
   * @param {number} [params.depth=12] - Outer depth.
   * @param {number} [params.height=6] - Total height.
   * @param {number} [params.wallThickness=1] - Wall thickness.
   * @param {number} [params.cornerRadius=1.2] - Footprint corner radius.
   * @param {number} [params.cornerSmoothness=16] - Segments for footprint corners.
   * @param {number} [params.edgeRoundness=0.3] - Bevel size for top/bottom edges.
   * @param {number} [params.edgeSmoothness=4] - Segments for bevel.
   * @param {number} [params.doorWidth=4] - Width of the door gap. Set to 0 for a solid wall.
   * @param {THREE.Material} [params.material] - An optional material to use.
   */
  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'TowerBase';

    // Define default parameters
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

    // Create a default material if one isn't provided
    this.material = params.material || new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.7,
      metalness: 0.1
    });

    // Store parameters, merging defaults with provided ones
    this.userData.params = { ...defaultParams, ...params };
    
    // Don't store the material in the geometry params
    delete this.userData.params.material; 

    // Build the mesh
    this.build();
  }

  /**
   * Rebuilds the mesh geometry.
   * @private
   */
  build() {
    // Dispose of old geometry first
    for (const c of this.children) {
      c.geometry && c.geometry.dispose();
    }
    this.clear();

    const p = this.userData.params;

    // Create the geometry
    let shellGeo = unifiedShellGeometry(p, false);
    const resultMesh = new THREE.Mesh(shellGeo, this.material);

    resultMesh.castShadow = true;
    resultMesh.receiveShadow = true;
    this.add(resultMesh);
  }

  /**
   * Update the parameters and rebuild the mesh.
   * @param {object} next - New parameters to apply.
   */
  updateParams(next) {
    next = { ...this.userData.params, ...next };

    // Apply constraints
    const crMax = Math.max(0, Math.min(next.width, next.depth) / 2 - next.wallThickness - 0.01);
    if (next.cornerRadius > crMax) next.cornerRadius = crMax;

    const dwMax = maxDoorWidth(next);
    if (next.doorWidth > dwMax) next.doorWidth = dwMax;

    this.userData.params = next;
    this.build();
  }
  
  /**
   * Disposes of the geometry to free up GPU memory.
   */
  dispose() {
    for (const c of this.children) {
      if (c.geometry) {
        c.geometry.dispose();
      }
    }
    this.clear();
    // Note: We don't dispose the material, as it might be shared.
  }
}
