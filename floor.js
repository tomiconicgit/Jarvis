import * as THREE from 'three';

// -------- helpers ----------
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
  // in-plane fillet reach
  const maxByFoot = Math.max(0.01, Math.min(p.width, p.depth) * 0.25);
  return Math.min(p.edgeRoundness || 0, maxByFoot);
}
function clampEdgeRoundnessThickness(p) {
  // vertical fillet (top/bottom)
  const maxByT = Math.max(0.01, p.thickness / 2 - 0.01);
  return Math.min(p.edgeRoundness || 0, maxByT);
}

function floorGeometry(p) {
  const r = Math.max(0, Math.min(p.cornerRadius, Floor.getMaxCornerRadius(p)));
  const shape = new THREE.Shape(roundedRectPath(p.width, p.depth, r).getPoints());
  const bevelEnabled = (p.edgeRoundness || 0) > 0;

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: p.thickness,
    steps: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelEnabled,
    bevelSegments: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelSize: bevelEnabled ? clampEdgeRoundnessInPlane(p) : 0,
    bevelThickness: bevelEnabled ? clampEdgeRoundnessThickness(p) : 0,
    curveSegments: Math.max(8, Math.floor(p.cornerSmoothness || 16))
  });

  // center on Y, make Y up
  geo.translate(0, 0, -p.thickness / 2);
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

// -------- Floor ----------
export default class Floor extends THREE.Group {
  static getMaxCornerRadius(p) {
    const eps = 0.01;
    return Math.max(0, Math.min(p.width, p.depth) / 2 - eps);
  }
  static getMaxEdgeRoundness(p) {
    return Math.max(0.01, Math.min(p.thickness / 2 - 0.01, Math.min(p.width, p.depth) / 4));
  }

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Floor';

    const defaults = {
      width: 20,
      depth: 20,
      thickness: 0.5,
      cornerRadius: 0.0,
      cornerSmoothness: 16,
      edgeRoundness: 0.0,
      edgeSmoothness: 4,
      colorR: 0.5,
      colorG: 0.5,
      colorB: 0.5
    };
    this.userData.params = { ...defaults, ...params };

    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(defaults.colorR, defaults.colorG, defaults.colorB),
      roughness: 0.8,
      metalness: 0
    });

    this.build();
  }

  build() {
    for (const c of this.children) c.geometry && c.geometry.dispose();
    this.clear();

    const p = this.userData.params;
    this.material.color.setRGB(p.colorR, p.colorG, p.colorB);

    const geo = floorGeometry(p);
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };
    // clamps
    const crMax = Floor.getMaxCornerRadius(next);
    if (next.cornerRadius > crMax) next.cornerRadius = crMax;
    const erMax = Floor.getMaxEdgeRoundness(next);
    if (next.edgeRoundness > erMax) next.edgeRoundness = erMax;

    this.userData.params = next;
    this.build();
  }

  dispose() {
    for (const c of this.children) if (c.geometry) c.geometry.dispose();
    this.clear();
  }
}