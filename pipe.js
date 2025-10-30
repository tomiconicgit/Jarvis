import * as THREE from 'three';

/**
 * Pipe (straight + optional elbow "shoulder") with optional flanges and bolt rings.
 * Y is up in scene. The straight section runs along +X from center.
 */
export default class Pipe extends THREE.Group {
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
      length: 8,
      outerRadius: 0.5,
      wallThickness: 0.06,
      radialSegments: 24,

      hasElbow: true,
      shoulderDeg: 90,
      elbowRadius: 1.75,
      elbowSegments: 32,
      elbowPlaneDeg: 0,

      hasFlangeStart: true,
      hasFlangeEnd: true,
      flangeRadius: 0.8,
      flangeThickness: 0.12,
      hasBolts: true,
      boltCount: 8,
      boltRadius: 0.05,
      boltHeight: 0.12,
      boltRingInset: 0.16,

      pipeColor: 0x9aa3a8,
      flangeColor: 0x8a8f94,
      boltColor: 0x44474a,
      roughness: 0.45,
      metalness: 0.6,
    };

    this.userData.params = { ...defaults, ...params };

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

    const wall = Math.min(Math.max(0.002, p.wallThickness), Pipe.getMaxWall(p));
    const outerR = Math.max(0.05, p.outerRadius);
    const innerR = Math.max(0.001, outerR - wall);
    const length = Math.max(0.05, p.length);

    // STRAIGHT (along +X)
    const straightGeo = new THREE.CylinderGeometry(outerR, outerR, length, p.radialSegments, 1, true);
    const straightMesh = new THREE.Mesh(straightGeo, this.pipeMat);
    const qMain = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)
    );
    straightMesh.applyQuaternion(qMain);
    straightMesh.castShadow = true;
    straightMesh.receiveShadow = true;
    this.add(straightMesh);

    if (innerR > 0.001) {
      const innerGeo = new THREE.CylinderGeometry(innerR, innerR, length, Math.max(12, p.radialSegments), 1, true);
      const innerMat = this.pipeMat.clone(); innerMat.side = THREE.BackSide;
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.applyQuaternion(qMain);
      this.add(innerMesh);
    }

    // ELBOW
    if (p.hasElbow && p.shoulderDeg > 0) {
      const angleRad = THREE.MathUtils.degToRad(Math.min(135, Math.max(1, p.shoulderDeg)));
      const bendR = Math.max(outerR * 1.1, p.elbowRadius);

      // Circle arc centered at (0,0) in local XY; start at theta=-PI/2 so tangent is +X
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
        curve, Math.max(8, p.elbowSegments), outerR, Math.max(8, p.radialSegments), false
      );
      const elbowMesh = new THREE.Mesh(elbowGeo, this.pipeMat);
      elbowMesh.castShadow = true; elbowMesh.receiveShadow = true;

      // --- FIX: rotate in plane, then translate so the elbow's START sits exactly at the straight pipe end ---
      const phi = THREE.MathUtils.degToRad(p.elbowPlaneDeg || 0);
      elbowMesh.rotateX(phi);

      // Local start of arc is (0, -bendR, 0); after rotateX(phi) it is (0, -R cosφ, -R sinφ).
      // To place that at world (length/2, 0, 0), we offset by (length/2, +R cosφ, +R sinφ).
      const baseOffset = new THREE.Vector3(length / 2, bendR * Math.cos(phi), bendR * Math.sin(phi));
      elbowMesh.position.copy(baseOffset);
      this.add(elbowMesh);

      // End flange aligned with elbow tangent at end
      if (p.hasFlangeEnd) {
        const endTheta = -Math.PI / 2 + angleRad; // end of arc
        // end point and tangent in elbow local (pre-rotation)
        const endLocal = new THREE.Vector3(
          bendR * Math.cos(endTheta),
          bendR * Math.sin(endTheta),
          0
        );
        const tangLocal = new THREE.Vector3(
          -bendR * Math.sin(endTheta),
           bendR * Math.cos(endTheta),
           0
        ).normalize();

        // rotate into the chosen plane
        const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), phi);
        endLocal.applyQuaternion(rot);
        tangLocal.applyQuaternion(rot);

        // --- FIX: add the same baseOffset so the end flange is measured in world space correctly ---
        endLocal.add(baseOffset);

        const flangeEnd = this._makeFlange(endLocal, tangLocal, p, outerR);
        this.add(flangeEnd);
      }
    } else {
      // Straight-only end flange
      if (p.hasFlangeEnd) {
        const pos = new THREE.Vector3(length / 2, 0, 0);
        const dir = new THREE.Vector3(1, 0, 0);
        const flangeEnd = this._makeFlange(pos, dir, p, outerR);
        this.add(flangeEnd);
      }
    }

    // Start flange
    if (p.hasFlangeStart) {
      const pos = new THREE.Vector3(-length / 2, 0, 0);
      const dir = new THREE.Vector3(-1, 0, 0);
      const flangeStart = this._makeFlange(pos, dir, p, outerR);
      this.add(flangeStart);
    }
  }

  _makeFlange(center, normal, p, outerR) {
    const grp = new THREE.Group();
    grp.position.copy(center);

    const flangeGeo = new THREE.CylinderGeometry(
      p.flangeRadius, p.flangeRadius, p.flangeThickness, Math.max(24, p.radialSegments)
    );
    const flange = new THREE.Mesh(flangeGeo, this.flangeMat);
    const yAxis = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(yAxis, normal.clone().normalize());
    flange.quaternion.copy(q);
    flange.position.copy(normal).multiplyScalar(p.flangeThickness * 0.5);
    flange.castShadow = true; flange.receiveShadow = true;
    grp.add(flange);

    if (p.hasBolts && p.boltCount > 1) {
      const n = normal.clone().normalize();
      const tmp = Math.abs(n.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const u = tmp.clone().cross(n).normalize();
      const v = n.clone().cross(u).normalize();

      const ringR = Math.max(outerR + 0.05, p.flangeRadius - p.boltRingInset);
      for (let i = 0; i < p.boltCount; i++) {
        const t = (i / p.boltCount) * Math.PI * 2;
        const posInPlane = u.clone().multiplyScalar(Math.cos(t) * ringR)
          .add(v.clone().multiplyScalar(Math.sin(t) * ringR));

        const boltGeo = new THREE.CylinderGeometry(p.boltRadius, p.boltRadius, p.boltHeight, 12);
        const bolt = new THREE.Mesh(boltGeo, this.boltMat);
        bolt.castShadow = true; bolt.receiveShadow = true;

        const qb = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        bolt.quaternion.copy(qb);
        const surfOffset = n.clone().multiplyScalar(p.flangeThickness * 0.5 + p.boltHeight * 0.5);
        bolt.position.copy(posInPlane).add(surfOffset);

        grp.add(bolt);
      }
    }
    return grp;
  }

  updateParams(next) {
    const prev = this.userData.params;
    const merged = { ...prev, ...next };

    merged.outerRadius     = Math.max(0.02, merged.outerRadius);
    merged.wallThickness   = Math.min(Math.max(0.002, merged.wallThickness), Pipe.getMaxWall(merged));
    merged.length          = Math.max(0.05, merged.length);
    merged.shoulderDeg     = Math.min(180, Math.max(0, merged.shoulderDeg));
    merged.elbowRadius     = Math.max(merged.outerRadius * 1.05, merged.elbowRadius);
    merged.elbowSegments   = Math.max(6, Math.floor(merged.elbowSegments || 24));
    merged.radialSegments  = Math.max(8, Math.floor(merged.radialSegments || 16));
    merged.boltCount       = Math.min(Pipe.getMaxBoltCount(), Math.max(2, Math.floor(merged.boltCount || 8)));
    merged.flangeRadius    = Math.max(merged.outerRadius * 1.1, merged.flangeRadius);
    merged.flangeThickness = Math.max(0.02, merged.flangeThickness);
    merged.boltRadius      = Math.max(0.01, merged.boltRadius);
    merged.boltHeight      = Math.max(0.04, merged.boltHeight);
    merged.boltRingInset   = Math.max(0.02, merged.boltRingInset);

    this.userData.params = merged;

    this.pipeMat.color.set(merged.pipeColor);
    this.pipeMat.roughness = merged.roughness;
    this.pipeMat.metalness = merged.metalness;
    this.flangeMat.color.set(merged.flangeColor);
    this.boltMat.color.set(merged.boltColor);

    this.build();
  }

  dispose() { this._clearChildren(); }
}