import * as THREE from 'three';
// --- FIX: Import mergeVertices ---
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** Launch-site Pipe (straight + optional elbow) with flanges/bolts */
export default class Pipe extends THREE.Group {
  static getMaxWall(p)       { return Math.max(0.005, p.outerRadius * 0.95); }
  static getMaxFlangeR(p)    { return Math.max(p.outerRadius + 0.05, p.outerRadius * 3.0); }
  static getMaxBoltCount()   { return 36; }

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
      shoulderDeg: 90,        // elbow angle
      elbowRadius: 1.75,      // bend radius (to centerline)
      elbowSegments: 32,
      elbowPlaneDeg: 0,       // rotate elbow plane around +X

      hasFlangeStart: true,
      hasFlangeEnd:   true,
      flangeRadius:   0.8,
      flangeThickness: 0.12,

      hasBolts: true,
      boltCount: 8,
      boltRadius: 0.05,
      boltHeight: 0.12,
      boltRingInset: 0.16,

      pipeColor:   0x9aa3a8,
      flangeColor: 0x8a8f94,
      boltColor:   0x44474a,
      roughness:   0.45,
      metalness:   0.6,
    };

    this.userData.params = { ...defaults, ...params };

    this.pipeMat   = new THREE.MeshStandardMaterial({ color: defaults.pipeColor, roughness: defaults.roughness, metalness: defaults.metalness });
    this.flangeMat = new THREE.MeshStandardMaterial({ color: defaults.flangeColor, roughness: defaults.roughness + 0.1, metalness: defaults.metalness * 0.8 });
    this.boltMat   = new THREE.MeshStandardMaterial({ color: defaults.boltColor, roughness: 0.5, metalness: 0.9 });

    this.build();
  }

  _clearChildren() {
    this.traverse(n => {
      if (n.isMesh) {
        n.geometry && n.geometry.dispose();
        if (Array.isArray(n.material)) n.material.forEach(m => m && m.dispose && m.dispose());
        else n.material && n.material.dispose && n.dispose();
      }
    });
    this.clear();
  }

  build() {
    this._clearChildren();
    const p = this.userData.params;

    const wall   = Math.min(Math.max(0.002, p.wallThickness), Pipe.getMaxWall(p));
    const outerR = Math.max(0.05, p.outerRadius);
    const innerR = Math.max(0.001, outerR - wall);
    const length = Math.max(0.05, p.length);

    // --- STRAIGHT: centered at origin, runs along +X ---
    const qMain = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)
    );

    // --- FIX: Create geo, merge, compute normals, then create mesh ---
    const straightOuterGeo = mergeVertices(new THREE.CylinderGeometry(outerR, outerR, length, Math.max(12, p.radialSegments), 1, true));
    straightOuterGeo.computeVertexNormals(); // <-- CORRECTED
    const straightOuter = new THREE.Mesh(straightOuterGeo, this.pipeMat);
    // --- END FIX ---
    straightOuter.name = 'StraightOuter';
    straightOuter.applyQuaternion(qMain);
    straightOuter.castShadow = straightOuter.receiveShadow = true;
    this.add(straightOuter);

    // inner skin for thickness
    if (innerR > 0.001) {
      const straightInnerMat = this.pipeMat.clone(); straightInnerMat.side = THREE.BackSide;
      // --- FIX: Create geo, merge, compute normals, then create mesh ---
      const straightInnerGeo = mergeVertices(new THREE.CylinderGeometry(innerR, innerR, length, Math.max(12, p.radialSegments), 1, true));
      straightInnerGeo.computeVertexNormals(); // <-- CORRECTED
      const straightInner = new THREE.Mesh(straightInnerGeo, straightInnerMat);
      // --- END FIX ---
      straightInner.name = 'StraightInner';
      straightInner.applyQuaternion(qMain);
      this.add(straightInner);
    }

    // convenience targets
    const endPos  = new THREE.Vector3(length / 2, 0, 0);        // straight end center
    const endDir  = new THREE.Vector3(1, 0, 0);                 // straight end tangent

    // --- ELBOW (optional) ---
    if (p.hasElbow && p.shoulderDeg > 0.5) {
      const angleRad = THREE.MathUtils.degToRad(Math.min(180, Math.max(1, p.shoulderDeg)));
      const bendR    = Math.max(outerR * 1.1, p.elbowRadius);
      const phi      = THREE.MathUtils.degToRad(p.elbowPlaneDeg || 0);

      // Arc in local XY; start at theta = -PI/2 so tangent is +X at t=0
      class ElbowCurve extends THREE.Curve {
        getPoint(t) {
          const th = -Math.PI / 2 + t * angleRad;
          return new THREE.Vector3(bendR * Math.cos(th), bendR * Math.sin(th), 0);
        }
        getTangent(t) {
          const th = -Math.PI / 2 + t * angleRad;
          return new THREE.Vector3(-bendR * Math.sin(th), bendR * Math.cos(th), 0).normalize();
        }
      }
      const curve = new ElbowCurve();

      // Outer elbow
      // --- FIX: Create geo, merge, compute normals, then create mesh ---
      const elbowOuterGeo = mergeVertices(new THREE.TubeGeometry(curve, Math.max(8, p.elbowSegments), outerR, Math.max(8, p.radialSegments), false));
      elbowOuterGeo.computeVertexNormals(); // <-- CORRECTED
      const elbowOuter = new THREE.Mesh(elbowOuterGeo, this.pipeMat);
      // --- END FIX ---
      elbowOuter.name = 'ElbowOuter';
      // Rotate elbow plane about +X
      elbowOuter.rotateX(phi);
      this.add(elbowOuter);

      // Inner elbow (BackSide) so thickness shows on elbow too
      if (innerR > 0.001) {
        const innerMat = this.pipeMat.clone(); innerMat.side = THREE.BackSide;
        // --- FIX: Create geo, merge, compute normals, then create mesh ---
        const elbowInnerGeo = mergeVertices(new THREE.TubeGeometry(curve, Math.max(8, p.elbowSegments), innerR, Math.max(8, p.radialSegments), false));
        elbowInnerGeo.computeVertexNormals(); // <-- CORRECTED
        const elbowInner = new THREE.Mesh(elbowInnerGeo, innerMat);
        // --- END FIX ---
        elbowInner.name = 'ElbowInner';
        elbowInner.rotateX(phi);
        this.add(elbowInner);
      }

      // End flange (aligned with elbow end tangent)
      if (p.hasFlangeEnd) {
        // compute world end position/tangent using the same rotation & placement we just applied
        const elbowObj = elbowOuter; // or group if inner
        const endLocal = curve.getPoint(1).clone().applyAxisAngle(new THREE.Vector3(1,0,0), phi);
        const tanLocal = curve.getTangent(1).clone().applyAxisAngle(new THREE.Vector3(1,0,0), phi);

        const endWorld = endLocal.clone();
        const tanWorld = tanLocal.clone();
        elbowObj.updateWorldMatrix(true, true);
        elbowObj.localToWorld(endWorld);
        tanWorld.applyQuaternion(elbowObj.getWorldQuaternion(new THREE.Quaternion())).normalize();

        const flangeEnd = this._makeFlange(endWorld, tanWorld, p, outerR);
        flangeEnd.name = 'FlangeEnd';
        this.add(flangeEnd);
      }
    } else if (p.hasFlangeEnd) {
      // Straight-only end flange
      const flangeEnd = this._makeFlange(endPos, endDir, p, outerR);
      flangeEnd.name = 'FlangeEnd';
      this.add(flangeEnd);
    }

    // Start flange
    if (p.hasFlangeStart) {
      const flangeStart = this._makeFlange(new THREE.Vector3(-length / 2, 0, 0), new THREE.Vector3(-1, 0, 0), p, outerR);
      flangeStart.name = 'FlangeStart';
      this.add(flangeStart);
    }
  }

  /** Snap elbow (group or mesh) so its start exactly meets straight end */
  _snapElbowGroupToStraight(elbowObj, curve, phi, targetEnd) {
    // world start (t=0) BEFORE translation
    const startLocal = curve.getPoint(0).clone().applyAxisAngle(new THREE.Vector3(1,0,0), phi);
    const startWorld = startLocal.clone();
    elbowObj.updateWorldMatrix(true, true);
    elbowObj.localToWorld(startWorld);

    // delta to desired end of straight
    const delta = new THREE.Vector3().subVectors(targetEnd, startWorld);
    elbowObj.position.add(delta);
    elbowObj.updateMatrixWorld(true);
  }

  _makeFlange(center, normal, p, outerR) {
    const grp = new THREE.Group();
    grp.position.copy(center);

    // --- FIX: Create geo, merge, compute normals, then create mesh ---
    const cylGeo = mergeVertices(new THREE.CylinderGeometry(p.flangeRadius, p.flangeRadius, p.flangeThickness, Math.max(24, p.radialSegments)));
    cylGeo.computeVertexNormals(); // <-- CORRECTED
    const cyl = new THREE.Mesh(cylGeo, this.flangeMat);
    // --- END FIX ---
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().normalize());
    cyl.quaternion.copy(q);
    cyl.position.copy(normal).setLength(p.flangeThickness * 0.5);
    cyl.castShadow = cyl.receiveShadow = true;
    grp.add(cyl);

    if (p.hasBolts && p.boltCount > 1) {
      const n = normal.clone().normalize();
      const tmp = Math.abs(n.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const u = tmp.clone().cross(n).normalize();
      const v = n.clone().cross(u).normalize();

      const ringR = Math.max(outerR + 0.05, p.flangeRadius - p.boltRingInset);
      for (let i = 0; i < p.boltCount; i++) {
        const t = (i / p.boltCount) * Math.PI * 2;
        const pos = u.clone().multiplyScalar(Math.cos(t) * ringR).add(v.clone().multiplyScalar(Math.sin(t) * ringR));
        // --- FIX: Create geo, merge, compute normals, then create mesh ---
        const boltGeo = mergeVertices(new THREE.CylinderGeometry(p.boltRadius, p.boltRadius, p.boltHeight, 12));
        boltGeo.computeVertexNormals(); // <-- CORRECTED
        const bolt = new THREE.Mesh(boltGeo, this.boltMat);
        // --- END FIX ---
        const qb = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        bolt.quaternion.copy(qb);
        bolt.position.copy(pos).add(n.clone().setLength(p.flangeThickness * 0.5 + p.boltHeight * 0.5));
        grp.add(bolt);
      }
    }
    return grp;
  }

  updateParams(next) {
    const merged = { ...this.userData.params, ...next };

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
