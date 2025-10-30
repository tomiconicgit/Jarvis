import * as THREE from 'three';

export default class TrussFrameArm extends THREE.Group {
  static getMaxCurve(p) {
    // keep curvature reasonable vs length
    return Math.max(0, p.length * 0.6);
  }

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'TrussFrameArm';

    const defaults = {
      length: 12,
      railRadius: 0.15,     // "roundness"
      railSeparation: 1.4,
      railSegments: 48,
      curveAmount: 0,       // 0..getMaxCurve
      braceSpacing: 1.2,
      braceRadius: 0.08,
      hasBolt: true,
      boltRadius: 0.35,
      boltLength: 0.6
    };
    this.userData.params = { ...defaults, ...params };

    this.railMaterial  = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.55, metalness: 0.35 });
    this.braceMaterial = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.6,  metalness: 0.4 });
    this.boltMaterial  = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4,  metalness: 0.8 });

    this.build();
  }

  // Build a simple curved dual-rail truss with diagonal braces.
  build() {
    for (const c of this.children) c.geometry && c.geometry.dispose();
    this.clear();

    const p = this.userData.params;
    const L = Math.max(0.5, p.length);
    const S = Math.max(0.2, p.railSeparation);
    const R = Math.max(0.03, p.railRadius);

    // Curved path in XZ with Y as "up" bend
    const ctrl = new THREE.Vector3(0, p.curveAmount, L/2);
    const start = new THREE.Vector3(0, 0, 0);
    const end   = new THREE.Vector3(0, 0, L);
    const path = new THREE.QuadraticBezierCurve3(start, ctrl, end);

    // Two rails offset in X
    const mkRail = (xOffset) => {
      const railPath = {
        getPoint: (t) => {
          const q = path.getPoint(t).clone();
          q.x += xOffset;
          return q;
        }
      };
      const geo = new THREE.TubeGeometry(railPath, Math.max(8, p.railSegments), R, 12, false);
      return new THREE.Mesh(geo, this.railMaterial);
    };

    const railL = mkRail(-S/2);
    const railR = mkRail(+S/2);
    railL.castShadow = railR.castShadow = true;
    railL.receiveShadow = railR.receiveShadow = true;
    this.add(railL, railR);

    // Braces: simple diagonals between rails at regular Z
    const braceRadius = Math.max(0.02, p.braceRadius);
    const spacing = Math.max(0.5, p.braceSpacing);
    const braceGeo = new THREE.CylinderGeometry(braceRadius, braceRadius, S, 12);
    braceGeo.rotateZ(Math.PI/2); // cylinder length along X

    // We'll place braces along straight Z — good enough visually
    let flip = false;
    for (let z = spacing; z < L - spacing/2; z += spacing) {
      const y = (1 - Math.pow((z - L/2)/(L/2), 2)) * p.curveAmount; // approximate curve apex
      const brace = new THREE.Mesh(braceGeo, this.braceMaterial);
      // diagonal: +/- tilt in XZ
      brace.position.set(0, y, z);
      brace.rotation.y = flip ? Math.PI/6 : -Math.PI/6;
      flip = !flip;
      this.add(brace);
    }

    // Bolt joint at the end (separate mesh)
    if (p.hasBolt) {
      const boltR = Math.max(0.05, p.boltRadius);
      const boltL = Math.max(0.1, p.boltLength);

      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(boltR, boltR, boltL, 20),
        this.boltMaterial
      );
      bolt.rotation.x = Math.PI/2; // point along Z
      // place at the arm tip
      const tip = path.getPoint(1);
      bolt.position.copy(tip);
      bolt.position.y += 0; // sits centered on rails
      bolt.userData.isModel = false; // keep selection at root
      this.add(bolt);
    }
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };
    const maxCurve = TrussFrameArm.getMaxCurve(next);
    if (next.curveAmount > maxCurve) next.curveAmount = maxCurve;
    if (next.curveAmount < -maxCurve) next.curveAmount = -maxCurve;
    this.userData.params = next;
    this.build();
  }

  dispose() {
    for (const c of this.children) if (c.geometry) c.geometry.dispose();
    this.clear();
  }
}
