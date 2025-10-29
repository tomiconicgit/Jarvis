import * as THREE from 'three';

// -----------------------------------------------------------------
// ---------- GEOMETRY HELPERS (Private to this module) ------------
// -----------------------------------------------------------------

function roundedRectPath(w, h, r) {
  const hw = w / 2, hh = h / 2, rr = Math.max(0, Math.min(r, hw, hh));
  const p = new THREE.Path();
  p.moveTo(-hw + rr, -hh);
  p.lineTo(hw - rr, -hh);
  p.absarc(hw - rr, -hh + rr, rr, -Math.PI / 2, 0, false);
  p.lineTo(hw, hh - rr);
  p.absarc(hw - rr, hh - rr, rr, 0, Math.PI / 2, false);
  p.lineTo(-hw + rr, hh);
  p.absarc(-hw + rr, hh - rr, rr, Math.PI / 2, Math.PI, false);
  p.lineTo(-hw, -hh + rr);
  p.absarc(-hw + rr, -hh + rr, rr, Math.PI, 1.5 * Math.PI, false);
  p.closePath();
  return p;
}

function clampEdgeRoundnessInPlane(p) {
  const maxByFrame = Math.max(0.01, p.frameThickness / 2 - 0.01);
  const maxByFoot = Math.max(0.01, Math.min(p.totalWidth / 2, p.height) * 0.25);
  return Math.min(p.edgeRoundness || 0, maxByFrame, maxByFoot);
}

function clampEdgeRoundnessThickness(p) {
  const maxByH = Math.max(0.01, p.height / 4);
  const maxByT = Math.max(0.01, p.depth / 1.5);
  return Math.min(p.edgeRoundness || 0, maxByH, maxByT);
}

function doorFrameShape(p) {
  const outerW = p.totalWidth / 2;
  const outerH = p.height;
  const doorW = outerW - 2 * p.frameThickness;
  const doorH = p.height - 2 * p.frameThickness;
  const rr = p.cornerRadius;

  const shape = new THREE.Shape();
  shape.add(roundedRectPath(outerW, outerH, rr));

  const inner = roundedRectPath(doorW, doorH, Math.max(0, rr - p.frameThickness));
  inner.translate(0, 0); // Centered
  shape.holes.push(inner);

  return shape;
}

function unifiedDoorGeometry(p, forceNoBevel = false) {
  const shape = doorFrameShape(p);

  const bevelEnabled = !forceNoBevel && (p.edgeRoundness || 0) > 0;
  const extrudeSettings = {
    depth: p.depth,
    steps: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelEnabled,
    bevelSegments: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelSize: bevelEnabled ? clampEdgeRoundnessInPlane(p) : 0,
    bevelThickness: bevelEnabled ? clampEdgeRoundnessThickness(p) : 0,
    curveSegments: Math.max(8, Math.floor(p.cornerSmoothness || 16))
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.translate(0, 0, -p.depth / 2);
  // Removed rotateX(-Math.PI / 2) to keep orientation with height along y, thickness along z
  geo.computeVertexNormals();
  return geo;
}

// -----------------------------------------------------------------
// ---------- EXPORTED DOUBLE DOOR CLASS ---------------------------
// -----------------------------------------------------------------

export default class DoubleDoor extends THREE.Group {
  
  // --- Static methods for UI ---
  /** Calculates max corner radius for sliders */
  static getMaxCornerRadius(p) {
    const eps = 0.01;
    return Math.max(0, Math.min(p.totalWidth / 4, p.height / 2) - p.frameThickness - eps);
  }
  
  /** Calculates max edge roundness for sliders */
  static getMaxEdgeRoundness(p) {
    return Math.max(0.05, Math.min(p.frameThickness / 2 - 0.01, p.height / 4, p.depth / 2));
  }

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'DoubleDoor';

    const defaultParams = {
      totalWidth: 8,
      height: 10,
      depth: 0.5,
      frameThickness: 0.5,
      cornerRadius: 0.2,
      cornerSmoothness: 16,
      edgeRoundness: 0.1,
      edgeSmoothness: 4,
      glassR: 1,
      glassG: 1,
      glassB: 1,
      glassOpacity: 0.5,
      glassRoughness: 0.2
    };

    this.frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.7,
      metalness: 0.1
    });

    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(1,1,1),
      transparent: true,
      opacity: 0.5,
      transmission: 0.9,
      roughness: 0.2,
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

    // Update glass material
    this.glassMaterial.color.setRGB(p.glassR, p.glassG, p.glassB);
    this.glassMaterial.opacity = p.glassOpacity;
    this.glassMaterial.transmission = 1 - p.glassOpacity * 0.2; // Adjust for better effect
    this.glassMaterial.roughness = p.glassRoughness;

    // Create left door
    const leftDoor = new THREE.Group();
    const leftFrameGeo = unifiedDoorGeometry(p);
    const leftFrame = new THREE.Mesh(leftFrameGeo, this.frameMaterial);
    leftFrame.castShadow = true;
    leftFrame.receiveShadow = true;
    leftDoor.add(leftFrame);

    // Glass for left door
    const glassW = p.totalWidth / 2 - 2 * p.frameThickness;
    const glassH = p.height - 2 * p.frameThickness;
    const glassGeo = new THREE.PlaneGeometry(glassW, glassH);
    const leftGlass = new THREE.Mesh(glassGeo, this.glassMaterial);
    leftGlass.position.set(0, 0, 0);
    leftDoor.add(leftGlass);

    leftDoor.position.x = -p.totalWidth / 4;
    this.add(leftDoor);

    // Create right door (clone)
    const rightDoor = leftDoor.clone();
    rightDoor.position.x = p.totalWidth / 4;
    this.add(rightDoor);
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };

    // Apply constraints
    const crMax = DoubleDoor.getMaxCornerRadius(next);
    if (next.cornerRadius > crMax) next.cornerRadius = crMax;

    const erMax = DoubleDoor.getMaxEdgeRoundness(next);
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