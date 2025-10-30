// pipe.js
import * as THREE from 'three';

/**
 * Pipe (straight + optional elbow "shoulder") with optional flanges and bolt rings.
 * Y is up in scene. The straight section runs along +X from center.
 *
 * userData.type = 'Pipe'
 * userData.params = see defaults in constructor
 *
 * NOTE: This renders a visually realistic pipe without CSG.
 * The pipe is modeled as outer surfaces (not true thickness subtraction)
 * for performance and simplicity inside the editor. If you later need true
 * hollow geometry, we can switch to CSG or custom BufferGeometry merging.
 */
export default class Pipe extends THREE.Group {
  // --- Helper max clamps for UI sliders (optional to use in your UI) ---
  static getMaxWall(p) {
    return Math.max(0.005, p.outerRadius * 0.95);
  }
  static getMaxFlangeR(p) {
    return Math.max(p.outerRadius + 0.05, p.outerRadius * 3.0);
  }
  static getMaxBoltCount() {
    return 36;
  }

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Pipe';

    const defaults = {
      // Main straight
      length: 8,                  // along +X, centered at origin
      outerRadius: 0.5,
      wallThickness: 0.06,
      radialSegments: 24,

      // Shoulder / elbow
      hasElbow: true,
      shoulderDeg: 90,            // elbow angle, 0..135 typically
      elbowRadius: 1.75,          // centerline bend radius
      elbowSegments: 32,          // tubular segments along the bend
      elbowPlaneDeg: 0,           // rotate the bend plane around +X (0 = bend in XY plane)

      // Flanges & bolts
      hasFlangeStart: true,
      hasFlangeEnd: true,
      flangeRadius: 0.8,          // visual flange radius (disc)
      flangeThickness: 0.12,
      hasBolts: true,
      boltCount: 8,
      boltRadius: 0.05,
      boltHeight: 0.12,
      boltRingInset: 0.16,        // how far in from flange outer edge

      // Materials
      pipeColor: 0x9aa3a8,
      flangeColor: 0x8a8f94,
      boltColor: 0x44474a,
      roughness: 0.45,
      metalness: 0.6,
    };

    this.userData.params = { ...defaults, ...params };

    // Materials
    this.pipeMat = new THREE.MeshStandardMaterial({
      color: this.userData.params.pipeColor,
      roughness: this.userData.params.roughness,
      metalness: this.userData.params.metalness
    });
    this.flangeMat = new THREE.MeshStandardMaterial({
      color: this.userData.params.flangeColor,
      roughness: this.userData.params.roughness + 0.1,
      metalness: this.userData.params.metalness * 0.8
    });
    this.boltMat = new THREE.MeshStandardMaterial({
      color: this.userData.params.boltColor,
      roughness: 0.5,
      metalness: 0.9
    });

    this.build();
  }

  // Dispose meshes/geometries before rebuilding
  _clearChildren() {
    this.traverse((n) => {
      if (n.isMesh) {
        n.geometry && n.geometry.dispose();
        if (Array.isArray(n.material)) n.material.forEach(m => m && m.dispose && m.dispose());
        else n.material && n.material.dispose && n.material.dispose();
      }
    });
    this.clear();
  }

  build() {
    this._clearChildren();

    const p = this.userData.params;

    // Clamp basics
    const wall = Math.min(Math.max(0.002, p.wallThickness), Pipe.getMaxWall(p));
    const outerR = Math.max(0.05, p.outerRadius);
    const innerR = Math.max(0.001, outerR - wall);
    const length = Math.max(0.05, p.length);

    // ---------- STRAIGHT SECTION (centered, along +X) ----------
    // Cylinder is Y-aligned by default. Rotate to X and center at origin.
    const straightGeo = new THREE.CylinderGeometry(outerR, outerR, length, p.radialSegments, 1, true);
    const straightMesh = new THREE.Mesh(straightGeo, this.pipeMat);
    straightMesh.castShadow = true;
    straightMesh.receiveShadow = true;

    // rotate to X axis
    const qMain = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(1, 0, 0)
    );
    straightMesh.applyQuaternion(qMain);
    this.add(straightMesh);

    // Optional visual inner wall for the straight section (rendering the inside)
    // Use BackSide so we see inner surface at open ends
    if (innerR > 0.001) {
      const innerGeo = new THREE.CylinderGeometry(innerR, innerR, length, Math.max(12, p.radialSegments), 1, true);
      const innerMat = this.pipeMat.clone();
      innerMat.side = THREE.BackSide;
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.applyQuaternion(qMain);
      innerMesh.castShadow = false;
      innerMesh.receiveShadow = false;
      this.add(innerMesh);
    }

    // ---------- ELBOW / SHOULDER ----------
    // We create a TubeGeometry along a 2D arc that starts at (0,0,0)
    // with a tangent along +X, then rotate the elbow plane about +X,
    // and translate so it starts at the end of the straight section (+X side).
    if (p.hasElbow && p.shoulderDeg > 0) {
      const angleRad = THREE.MathUtils.degToRad(Math.min(135, Math.max(1, p.shoulderDeg)));
      const bendR = Math.max(outerR * 1.1, p.elbowRadius);

      // Custom arc curve: center at (0, bendR, 0), from theta=-PI/2 to -PI/2 + angle
      // so start point is (0,0,0) and start tangent points to +X.
      class ElbowCurve extends THREE.Curve {
        getPoint(t) {
          const theta = -Math.PI / 2 + t * angleRad;
          const x = bendR * Math.cos(theta);
          const y = bendR * Math.sin(theta);
          return new THREE.Vector3(x, y, 0);
        }
      }
      const curve = new ElbowCurve();

      const elbowGeo = new THREE.TubeGeometry(
        curve,
        Math.max(8, p.elbowSegments),
        outerR,
        Math.max(8, p.radialSegments),
        false
      );
      const elbowMesh = new THREE.Mesh(elbowGeo, this.pipeMat);
      elbowMesh.castShadow = true;
      elbowMesh.receiveShadow = true;

      // Rotate the bend plane about +X
      elbowMesh.rotateX(THREE.MathUtils.degToRad(p.elbowPlaneDeg || 0));
      // Move elbow so its start (0,0,0) aligns to straight's +X end (length/2, 0, 0).
      elbowMesh.position.x = length / 2;

      this.add(elbowMesh);

      // --- End flange at elbow tip (if enabled) ---
      if (p.hasFlangeEnd) {
        // Compute end position & direction in elbow local space (before we applied rotation/translation).
        // End point on the curve (t=1):
        const endTheta = -Math.PI / 2 + angleRad;
        const endLocal = new THREE.Vector3(
          bendR * Math.cos(endTheta),
          bendR * Math.sin(endTheta),
          0
        );
        // Tangent (derivative): [-R sin, R cos, 0] at end
        const tangLocal = new THREE.Vector3(
          -bendR * Math.sin(endTheta),
          bendR * Math.cos(endTheta),
          0
        ).normalize();

        // Apply same rotation/translation we applied to elbowMesh
        const rot = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          THREE.MathUtils.degToRad(p.elbowPlaneDeg || 0)
        );
        endLocal.applyQuaternion(rot);
        tangLocal.applyQuaternion(rot);
        endLocal.add(new THREE.Vector3(length / 2, 0, 0));

        const flangeEnd = this._makeFlange(endLocal, tangLocal, p, outerR);
        this.add(flangeEnd);
      }
    } else {
      // No elbow: just put an end flange at +X if requested
      if (p.hasFlangeEnd) {
        const pos = new THREE.Vector3(length / 2, 0, 0);
        const dir = new THREE.Vector3(1, 0, 0);
        const flangeEnd = this._makeFlange(pos, dir, p, outerR);
        this.add(flangeEnd);
      }
    }

    // --- Start flange at -X end (if enabled) ---
    if (p.hasFlangeStart) {
      const pos = new THREE.Vector3(-length / 2, 0, 0);
      const dir = new THREE.Vector3(-1, 0, 0);
      const flangeStart = this._makeFlange(pos, dir, p, outerR);
      this.add(flangeStart);
    }
  }

  /**
   * Build a flange (disc) plus optional bolt ring, oriented by normal dir.
   * @param {THREE.Vector3} center - world/local center where flange sits
   * @param {THREE.Vector3} normal - outward normal direction (unit vector)
   * @param {*} p - params
   * @param {number} outerR - pipe outer radius (used for positioning)
   */
  _makeFlange(center, normal, p, outerR) {
    const grp = new THREE.Group();
    grp.position.copy(center);

    // Oriented cylinder along "normal" (cylinders are Y-up by default)
    const flangeGeo = new THREE.CylinderGeometry(
      p.flangeRadius, p.flangeRadius,
      p.flangeThickness,
      Math.max(24, p.radialSegments)
    );
    const flange = new THREE.Mesh(flangeGeo, this.flangeMat);
    flange.castShadow = true;
    flange.receiveShadow = true;

    // Orient flange's Y axis to the "normal"
    const yAxis = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(yAxis, normal.clone().normalize());
    flange.quaternion.copy(q);

    // Slightly offset so disc sits flush at pipe end (centered on center)
    // Move half thickness outward along normal so face touches pipe end
    flange.position.copy(normal).multiplyScalar(p.flangeThickness * 0.5);

    grp.add(flange);

    if (p.hasBolts && p.boltCount > 1) {
      const boltRing = this._makeBoltRing(p, outerR);
      // Bolt ring lies in the flange plane: build local frame (u,v) around "normal"
      const n = normal.clone().normalize();
      // robust orthonormal basis
      const tmp = Math.abs(n.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const u = tmp.clone().cross(n).normalize();     // first in-plane axis
      const v = n.clone().cross(u).normalize();       // second in-plane axis

      // Distribute bolts around ring
      const ringR = Math.max(outerR + 0.05, p.flangeRadius - p.boltRingInset);
      const boltH = p.boltHeight;
      for (let i = 0; i < p.boltCount; i++) {
        const t = (i / p.boltCount) * Math.PI * 2;
        const posInPlane = u.clone().multiplyScalar(Math.cos(t) * ringR)
          .add(v.clone().multiplyScalar(Math.sin(t) * ringR));

        const bolt = boltRing.clone(true);
        // position bolt so it sits just above the flange surface
        const surfOffset = n.clone().multiplyScalar(p.flangeThickness * 0.5 + boltH * 0.5);
        bolt.position.copy(posInPlane).add(surfOffset);

        // orient bolt axis along normal
        const qb = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        bolt.quaternion.copy(qb);

        grp.add(bolt);
      }
    }

    return grp;
  }

  _makeBoltRing(p, outerR) {
    const boltGeo = new THREE.CylinderGeometry(
      p.boltRadius, p.boltRadius,
      p.boltHeight,
      12
    );
    const bolt = new THREE.Mesh(boltGeo, this.boltMat);
    bolt.castShadow = true;
    bolt.receiveShadow = true;
    return bolt;
  }

  updateParams(next) {
    // merge & clamp
    const prev = this.userData.params;
    const merged = { ...prev, ...next };

    // basic clamps
    merged.outerRadius = Math.max(0.02, merged.outerRadius);
    merged.wallThickness = Math.min(Math.max(0.002, merged.wallThickness), Pipe.getMaxWall(merged));
    merged.length = Math.max(0.05, merged.length);
    merged.shoulderDeg = Math.min(180, Math.max(0, merged.shoulderDeg));
    merged.elbowRadius = Math.max(merged.outerRadius * 1.05, merged.elbowRadius);
    merged.elbowSegments = Math.max(6, Math.floor(merged.elbowSegments || 24));
    merged.radialSegments = Math.max(8, Math.floor(merged.radialSegments || 16));
    merged.boltCount = Math.min(Pipe.getMaxBoltCount(), Math.max(2, Math.floor(merged.boltCount || 8)));
    merged.flangeRadius = Math.max(merged.outerRadius * 1.1, merged.flangeRadius);
    merged.flangeThickness = Math.max(0.02, merged.flangeThickness);
    merged.boltRadius = Math.max(0.01, merged.boltRadius);
    merged.boltHeight = Math.max(0.04, merged.boltHeight);
    merged.boltRingInset = Math.max(0.02, merged.boltRingInset);

    this.userData.params = merged;

    // Update material colors/props if changed
    this.pipeMat.color.set(merged.pipeColor);
    this.pipeMat.roughness = merged.roughness;
    this.pipeMat.metalness = merged.metalness;
    this.flangeMat.color.set(merged.flangeColor);
    this.boltMat.color.set(merged.boltColor);

    this.build();
  }

  dispose() {
    this._clearChildren();
  }
}