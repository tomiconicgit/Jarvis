import * as THREE from 'three';

// ---------- Geometry helpers ----------
function roundedRectPath(w, h, r) {
  const hw = w / 2, hh = h / 2, rr = Math.max(0, Math.min(r, hw, hh));
  const p = new THREE.Path();
  p.moveTo(-hw + rr, -hh);
  p.lineTo( hw - rr, -hh);
  p.absarc( hw - rr, -hh + rr, rr, -Math.PI/2, 0, false);
  p.lineTo( hw,  hh - rr);
  p.absarc( hw - rr,  hh - rr, rr, 0, Math.PI/2, false);
  p.lineTo(-hw + rr,  hh);
  p.absarc(-hw + rr,  hh - rr, rr, Math.PI/2, Math.PI, false);
  p.lineTo(-hw, -hh + rr);
  p.absarc(-hw + rr, -hh + rr, rr, Math.PI, 1.5*Math.PI, false);
  p.closePath();
  return p;
}

function clampEdgeRoundnessInPlane(p) {
  const maxByFrame = Math.max(0.01, p.frameThickness / 2 - 0.01);
  const maxByFoot  = Math.max(0.01, Math.min(p.totalWidth / 2, p.height) * 0.25);
  return Math.min(p.edgeRoundness || 0, maxByFrame, maxByFoot);
}
function clampEdgeRoundnessThickness(p) {
  const maxByH = Math.max(0.01, p.height / 4);
  const maxByT = Math.max(0.01, p.depth / 1.5);
  return Math.min(p.edgeRoundness || 0, maxByH, maxByT);
}

// Build a proper Shape for one leaf (outline + hole)
function doorLeafShape(p) {
  const outerW = p.totalWidth / 2;
  const outerH = p.height;
  const doorW  = outerW - 2 * p.frameThickness;
  const doorH  = p.height - 2 * p.frameThickness;
  const rr     = p.cornerRadius;

  const outerPath = roundedRectPath(outerW, outerH, rr);
  const shape     = new THREE.Shape( outerPath.getPoints() ); // proper Shape outline

  const innerPath = roundedRectPath(
    Math.max(0.01, doorW),
    Math.max(0.01, doorH),
    Math.max(0, rr - p.frameThickness)
  );
  shape.holes.push(innerPath); // holes are Paths (correct)
  return shape;
}

function unifiedDoorGeometry(p, forceNoBevel = false) {
  const shape = doorLeafShape(p);
  const bevelEnabled = !forceNoBevel && (p.edgeRoundness || 0) > 0;

  const extrudeSettings = {
    depth: p.depth,                          // thickness
    steps: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelEnabled,
    bevelSegments: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelSize: bevelEnabled ? clampEdgeRoundnessInPlane(p) : 0,
    bevelThickness: bevelEnabled ? clampEdgeRoundnessThickness(p) : 0,
    curveSegments: Math.max(8, Math.floor(p.cornerSmoothness || 16))
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // Center on Z so it straddles z=0; DO NOT rotate (front-facing, Y is up).
  geo.translate(0, 0, -p.depth / 2);
  geo.computeVertexNormals();
  return geo;
}

// ---------- DoubleDoor ----------
export default class DoubleDoor extends THREE.Group {
  static getMaxCornerRadius(p) {
    const eps = 0.01;
    return Math.max(0, Math.min(p.totalWidth / 4, p.height / 2) - p.frameThickness - eps);
  }
  static getMaxEdgeRoundness(p) {
    return Math.max(0.05, Math.min(p.frameThickness / 2 - 0.01, p.height / 4, p.depth / 2));
  }

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'DoubleDoor';

    const defaults = {
      totalWidth: 8,
      height: 10,
      depth: 0.5,
      frameThickness: 0.5,
      cornerRadius: 0.2,
      cornerSmoothness: 16,
      edgeRoundness: 0.1,
      edgeSmoothness: 4,
      glassR: 1, glassG: 1, glassB: 1,
      glassOpacity: 0.5,
      glassRoughness: 0.2
    };
    this.userData.params = { ...defaults, ...params };

    this.frameMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7, metalness: 0.1 });
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(1,1,1),
      transparent: true,
      opacity: 0.5,
      transmission: 0.9,
      roughness: 0.2,
      metalness: 0,
      side: THREE.DoubleSide
    });

    this.build();
  }

  build() {
    for (const c of this.children) c.geometry && c.geometry.dispose();
    this.clear();

    const p = this.userData.params;

    // glass material tweaks
    this.glassMaterial.color.setRGB(p.glassR, p.glassG, p.glassB);
    this.glassMaterial.opacity       = p.glassOpacity;
    this.glassMaterial.transmission  = 1 - p.glassOpacity * 0.2;
    this.glassMaterial.roughness     = p.glassRoughness;

    // Left leaf (frame)
    const left = new THREE.Group();
    left.name = 'LeftLeaf';
    const leftFrame = new THREE.Mesh(unifiedDoorGeometry(p), this.frameMaterial);
    leftFrame.name = 'LeftFrame';
    leftFrame.castShadow = true; leftFrame.receiveShadow = true;
    left.add(leftFrame);

    // Left glass (XY plane, no rotation needed)
    const glassW = Math.max(0.01, p.totalWidth / 2 - 2 * p.frameThickness);
    const glassH = Math.max(0.01, p.height - 2 * p.frameThickness);
    const leftGlass = new THREE.Mesh(new THREE.PlaneGeometry(glassW, glassH), this.glassMaterial);
    leftGlass.name = 'LeftGlass';
    leftGlass.position.set(0, 0, 0); // centered in leaf local space
    leftGlass.castShadow = false; leftGlass.receiveShadow = false;
    left.add(leftGlass);

    left.position.set(-p.totalWidth / 4, 0, 0);
    this.add(left);

    // Right leaf
    const right = left.clone(true);
    right.name = 'RightLeaf';
    right.children[0].name = 'RightFrame';
    right.children[1].name = 'RightGlass';
    right.position.x =  p.totalWidth / 4;
    this.add(right);
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };
    const crMax = DoubleDoor.getMaxCornerRadius(next);
    if (next.cornerRadius > crMax) next.cornerRadius = crMax;
    const erMax = DoubleDoor.getMaxEdgeRoundness(next);
    if (next.edgeRoundness > erMax) next.edgeRoundness = erMax;
    this.userData.params = next;
    this.build();
  }

  dispose() {
    for (const c of this.children) if (c.geometry) c.geometry.dispose();
    this.clear();
  }
}