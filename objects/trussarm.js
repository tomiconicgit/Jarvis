import * as THREE from 'three';
// --- FIX: Import mergeVertices ---
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

function cylinderBetween(a, b, r, radialSegments, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len <= 1e-6) return new THREE.Mesh(); // guard
  // --- FIX: Merge vertices to prevent displacement map splitting ---
  const geo = mergeVertices(new THREE.CylinderGeometry(r, r, len, Math.max(6, radialSegments)));
  // Cylinder default axis = +Y. Point it along dir.
  const mesh = new THREE.Mesh(geo, material);
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  mesh.position.copy(mid);

  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.setRotationFromQuaternion(quat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export default class TrussArm extends THREE.Group {
  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'TrussArm';

    const defaults = {
      length: 10,          // overall length along +X
      armWidth: 2,         // distance between left/right rails
      armHeight: 2,        // distance between top/bottom rails
      tubeRadius: 0.12,    // pipe radius
      roundSegments: 12,   // radial segments for tubes/bolts
      segments: 8,         // lattice segments along length
      curve: 0,            // bend amount in +Y (0 = straight). Think of it as "rise" at midspan
      hasEndJoint: true,   // show a spherical joint at the far end
      jointRadius: 0.4,    // radius of the joint sphere
      color: 0xb0b0b0
    };
    this.userData.params = { ...defaults, ...params };

    this.metalMaterial = new THREE.MeshStandardMaterial({
      color: defaults.color, roughness: 0.5, metalness: 0.6
    });
    this.jointMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888, roughness: 0.4, metalness: 0.8
    });

    this.build();
  }

  /** Centerline curve along X with optional midspan rise in Y. */
  _makeCenterCurve(length, riseY) {
    const p0 = new THREE.Vector3(0, 0, 0);
    const p1 = new THREE.Vector3(length * 0.5, riseY, 0);
    const p2 = new THREE.Vector3(length, 0, 0);
    return new THREE.QuadraticBezierCurve3(p0, p1, p2);
  }

  /** For a "corner rail" we offset the centerline curve by (ox, oy). */
  _railPoint(curve, t, ox, oy) {
    const p = curve.getPoint(t);
    p.x += 0;      // centerline already along X
    p.y += oy;     // vertical offset
    p.z += ox;     // use Z for left/right spacing so X stays the longitudinal axis
    return p;
  }

  build() {
    // dispose old
    this.traverse((n) => {
      if (n.isMesh) {
        n.geometry?.dispose?.();
        if (Array.isArray(n.material)) n.material.forEach(m => m?.dispose?.());
        else n.material?.dispose?.();
      }
    });
    this.clear();

    const p = this.userData.params;
    const {
      length, armWidth, armHeight, tubeRadius,
      roundSegments, segments, curve,
      hasEndJoint, jointRadius
    } = p;

    const railRise = curve; // "rise" at midspan in Y for the centerline

    const center = this._makeCenterCurve(length, railRise);

    // 4 longerons (corner rails) laid out on a rectangle in local YZ:
    // offsets in Z: Â±armWidth/2, offsets in Y: Â±armHeight/2
    const rails = [
      { ox:  armWidth * 0.5, oy:  armHeight * 0.5 }, // front-right (Z+ / Y+)
      { ox:  armWidth * 0.5, oy: -armHeight * 0.5 }, // front-right (Z+ / Y-)
      { ox: -armWidth * 0.5, oy:  armHeight * 0.5 }, // back-left  (Z- / Y+)
      { ox: -armWidth * 0.5, oy: -armHeight * 0.5 }  // back-left  (Z- / Y-)
    ];

    // Build rails using a piecewise polyline of cylinders (fast + cheap)
    const railPts = [];
    const railNodes = {}; // rail index -> array of node positions along the length
    const steps = Math.max(segments * 4, 16);
    for (let r = 0; r < rails.length; r++) {
      const nodes = [];
      let prev = null;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = this._railPoint(center, t, rails[r].ox, rails[r].oy);
        nodes.push(pt.clone());
        if (prev) {
          const segMesh = cylinderBetween(prev, pt, tubeRadius, roundSegments, this.metalMaterial);
          this.add(segMesh);
        }
        prev = pt;
      }
      railNodes[r] = nodes;
      railPts.push(nodes);
    }

    // Cross frames + diagonals per segment
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;

      // Corners at t0 and t1
      const TL0 = this._railPoint(center, t0, -armWidth * 0.5,  armHeight * 0.5);
      const BL0 = this._railPoint(center, t0, -armWidth * 0.5, -armHeight * 0.5);
      const TR0 = this._railPoint(center, t0,  armWidth * 0.5,  armHeight * 0.5);
      const BR0 = this._railPoint(center, t0,  armWidth * 0.5, -armHeight * 0.5);

      const TL1 = this._railPoint(center, t1, -armWidth * 0.5,  armHeight * 0.5);
      const BL1 = this._railPoint(center, t1, -armWidth * 0.5, -armHeight * 0.5);
      const TR1 = this._railPoint(center, t1,  armWidth * 0.5,  armHeight * 0.5);
      const BR1 = this._railPoint(center, t1,  armWidth * 0.5, -armHeight * 0.5);

      // perimeter cross-frame at t0 (square)
      const cross1 = cylinderBetween(TL0, TR0, tubeRadius, roundSegments, this.metalMaterial);
      cross1.name = 'Cross' + i + '_1';
      this.add(cross1);
      const cross2 = cylinderBetween(TR0, BR0, tubeRadius, roundSegments, this.metalMaterial);
      cross2.name = 'Cross' + i + '_2';
      this.add(cross2);
      const cross3 = cylinderBetween(BR0, BL0, tubeRadius, roundSegments, this.metalMaterial);
      cross3.name = 'Cross' + i + '_3';
      this.add(cross3);
      const cross4 = cylinderBetween(BL0, TL0, tubeRadius, roundSegments, this.metalMaterial);
      cross4.name = 'Cross's' + i + '_4';
      this.add(cross4);

      // diagonals (alternate pattern)
      if (i % 2 === 0) {
        const diag1 = cylinderBetween(TL0, BR1, tubeRadius * 0.9, roundSegments, this.metalMaterial);
        diag1.name = 'Diag' + i + '_1';
        this.add(diag1);
        const diag2 = cylinderBetween(TR0, BL1, tubeRadius * 0.9, roundSegments, this.metalMaterial);
        diag2.name = 'Diag' + i + '_2';
        this.add(diag2);
      } else {
        const diag1 = cylinderBetween(BL0, TR1, tubeRadius * 0.9, roundSegments, this.metalMaterial);
        diag1.name = 'Diag' + i + '_1';
        this.add(diag1);
        const diag2 = cylinderBetween(BR0, TL1, tubeRadius * 0.9, roundSegments, this.metalMaterial);
        diag2.name = 'Diag' + i + '_2';
        this.add(diag2);
      }
    }

    // End frame at t = 1
    const TLE = this._railPoint(center, 1, -armWidth * 0.5,  armHeight * 0.5);
    const BLE = this._railPoint(center, 1, -armWidth * 0.5, -armHeight * 0.5);
    const TRE = this._railPoint(center, 1,  armWidth * 0.5,  armHeight * 0.5);
    const BRE = this._railPoint(center, 1,  armWidth * 0.5, -armHeight * 0.5);

    const endCross1 = cylinderBetween(TLE, TRE, tubeRadius, roundSegments, this.metalMaterial);
    endCross1.name = 'EndCross1';
    this.add(endCross1);
    const endCross2 = cylinderBetween(TRE, BRE, tubeRadius, roundSegments, this.metalMaterial);
    endCross2.name = 'EndCross2';
    this.add(endCross2);
    const endCross3 = cylinderBetween(BRE, BLE, tubeRadius, roundSegments, this.metalMaterial);
    endCross3.name = 'EndCross3';
    this.add(endCross3);
    const endCross4 = cylinderBetween(BLE, TLE, tubeRadius, roundSegments, this.metalMaterial);
    endCross4.name = 'EndCross4';
    this.add(endCross4);

    // End joint at the far end center (optional)
    if (hasEndJoint && jointRadius > 0) {
      const endCenter = center.getPoint(1); // (length, ~0, 0) with curvature
      const joint = new THREE.Mesh(
        // --- FIX: Merge vertices to prevent displacement map splitting ---
        mergeVertices(new THREE.SphereGeometry(jointRadius, Math.max(8, roundSegments), Math.max(6, Math.floor(roundSegments * 0.7)))),
        this.jointMaterial
      );
      joint.name = 'EndJoint';
      joint.position.copy(endCenter);
      joint.castShadow = true;
      joint.receiveShadow = true;
      this.add(joint);
    }
  }

  updateParams(next) {
    this.userData.params = { ...this.userData.params, ...next };
    this.build();
  }

  dispose() {
    this.traverse((n) => {
      if (n.isMesh) {
        n.geometry?.dispose?.();
        if (Array.isArray(n.material)) n.material.forEach(m => m?.dispose?.());
        else n.material?.dispose?.();
      }
    });
    this.clear();
  }
}
