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
  const maxByFoot  = Math.max(0.01, Math.min(p.totalWidth, p.height) * 0.25);
  return Math.min(p.edgeRoundness || 0, maxByFrame, maxByFoot);
}
function clampEdgeRoundnessThickness(p) {
  const maxByH = Math.max(0.01, p.height / 4);
  const maxByT = Math.max(0.01, p.depth / 1.5);
  return Math.min(p.edgeRoundness || 0, maxByH, maxByT);
}

// Build a proper Shape for the window (outline + hole)
function windowShape(p) {
  const outerW = p.totalWidth;
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

function unifiedWindowGeometry(p, forceNoBevel = false) {
  const shape = windowShape(p);
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

// ---------- Window ----------
export default class Window extends THREE.Group {
  static getMaxCornerRadius(p) {
    const eps = 0.01;
    return Math.max(0, Math.min(p.totalWidth / 2, p.height / 2) - p.frameThickness - eps);
  }
  static getMaxEdgeRoundness(p) {
    return Math.max(0.05, Math.min(p.frameThickness / 2 - 0.01, p.height / 4, p.depth / 2));
  }

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Window';

    const defaults = {
      totalWidth: 6,
      height: 8,
      depth: 0.3,
      frameThickness: 0.4,
      cornerRadius: 0.1,
      cornerSmoothness: 16,
      edgeRoundness: 0.05,
      edgeSmoothness: 4,
      curveRadius: 0,
      hasBolts: false,
      hasBars: false,
      glassR: 0.8, glassG: 0.8, glassB: 1,
      glassOpacity: 0.3,
      glassRoughness: 0.1
    };
    this.userData.params = { ...defaults, ...params };

    this.frameMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7, metalness: 0.1 });
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.8,0.8,1),
      transparent: true,
      opacity: 0.3,
      transmission: 0.9,
      roughness: 0.1,
      metalness: 0,
      side: THREE.DoubleSide
    });
    this.boltMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.8 });
    this.barMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.6, metalness: 0.7 });

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

    // Frame
    let frameGeo = unifiedWindowGeometry(p);
    const frame = new THREE.Mesh(frameGeo, this.frameMaterial);
    frame.castShadow = true; frame.receiveShadow = true;
    this.add(frame);

    // Glass
    const glassW = Math.max(0.01, p.totalWidth - 2 * p.frameThickness);
    const glassH = Math.max(0.01, p.height - 2 * p.frameThickness);
    const glassGeo = new THREE.PlaneGeometry(glassW, glassH);
    const glass = new THREE.Mesh(glassGeo, this.glassMaterial);
    glass.position.set(0, 0, 0); // centered
    this.add(glass);

    // Bolts if toggled
    if (p.hasBolts) {
      const boltGeo = new THREE.CylinderGeometry(0.2, 0.2, p.depth + 0.2, 16);
      boltGeo.rotateX(Math.PI / 2);
      const positions = [
        new THREE.Vector3(-p.totalWidth/2 + 0.3, -p.height/2 + 0.3, 0),
        new THREE.Vector3(-p.totalWidth/2 + 0.3, p.height/2 - 0.3, 0),
        new THREE.Vector3(p.totalWidth/2 - 0.3, -p.height/2 + 0.3, 0),
        new THREE.Vector3(p.totalWidth/2 - 0.3, p.height/2 - 0.3, 0)
      ];
      positions.forEach(pos => {
        const bolt = new THREE.Mesh(boltGeo, this.boltMaterial);
        bolt.position.copy(pos);
        this.add(bolt);
      });
    }

    // Bars if toggled
    if (p.hasBars) {
      const barGeo = new THREE.CylinderGeometry(0.15, 0.15, glassH, 16);
      const numBars = 3; // example 3 horizontal bars
      for (let i = 1; i <= numBars; i++) {
        const bar = new THREE.Mesh(barGeo, this.barMaterial);
        bar.position.set(0, -glassH/2 + (i * glassH / (numBars + 1)), 0.1); // slightly in front
        this.add(bar);
      });
    }
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };
    const crMax = Window.getMaxCornerRadius(next);
    if (next.cornerRadius > crMax) next.cornerRadius = crMax;
    const erMax = Window.getMaxEdgeRoundness(next);
    if (next.edgeRoundness > erMax) next.edgeRoundness = erMax;
    this.userData.params = next;
    this.build();
  }

  dispose() {
    for (const c of this.children) if (c.geometry) c.geometry.dispose();
    this.clear();
  }
}