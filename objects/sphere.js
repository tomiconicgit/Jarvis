// File: objects/sphere.js
import * as THREE from 'three';
// --- FIX: Import mergeVertices ---
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export default class Sphere extends THREE.Group {
  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Sphere';

    const defaults = {
      radius: 1,
      segments: 32,
      phiStart: 0,
      phiLength: 360,
      thetaStart: 0,
      thetaLength: 180,
      colorR: 0.8, colorG: 0.8, colorB: 0.8,
      // --- NEW DEFORMER PARAMS ---
      bendAngle: 0,       // Bend in degrees
      bendStartY: 0.0,    // Bend start height (0.0 = bottom, 1.0 = top)
      flareAmount: 0.0,   // Flare radius offset
      flareStartY: 0.0    // Flare start height (0.0 = bottom, 1.0 = top)
    };

    this.userData.params = { ...defaults, ...params };

    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(defaults.colorR, defaults.colorG, defaults.colorB),
      roughness: 0.7,
      metalness: 0.1
    });

    this.build();
  }

  build() {
    this.clear();
    const p = this.userData.params;
    let geo = new THREE.SphereGeometry(
      p.radius,
      Math.floor(p.segments),
      Math.floor(p.segments),
      THREE.MathUtils.degToRad(p.phiStart),
      THREE.MathUtils.degToRad(p.phiLength),
      THREE.MathUtils.degToRad(p.thetaStart),
      THREE.MathUtils.degToRad(p.thetaLength)
    );
    
    // --- FIX: Merge vertices to prevent splitting with displacement maps ---
    // This averages normals at seams/poles, making the geometry "water-tight"
    geo = mergeVertices(geo);
    geo.computeVertexNormals(); // Recompute normals after merging
    // --- END FIX ---
    
    // --- NEW DEFORMER LOGIC ---
    if (p.bendAngle !== 0 || p.flareAmount !== 0) {
      this.applyDeformations(geo, p);
    }
    // --- END NEW LOGIC ---

    const mesh = new THREE.Mesh(geo, this.material);
    mesh.name = 'SphereMesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);
  }

  /**
   * Applies vertex deformations for bend and flare.
   */
  applyDeformations(geometry, p) {
    const pos = geometry.attributes.position;
    const radius = p.radius;
    const bendRad = THREE.MathUtils.degToRad(p.bendAngle);

    // Calculate start heights in world space (from -radius to +radius)
    const flareStartWorldY = -radius + p.flareStartY * (radius * 2);
    const flareEndWorldY = radius;
    const flareRange = flareEndWorldY - flareStartWorldY;
    
    const bendStartWorldY = -radius + p.bendStartY * (radius * 2);
    const bendEndWorldY = radius;
    const bendRange = bendEndWorldY - bendStartWorldY;

    const tempVec = new THREE.Vector3();
    const bendAxis = new THREE.Vector3(1, 0, 0); // Bend around X-axis
    const tempQuat = new THREE.Quaternion();

    for (let i = 0; i < pos.count; i++) {
      tempVec.fromBufferAttribute(pos, i);
      
      const originalY = tempVec.y;
      const originalRadius = Math.sqrt(tempVec.x * tempVec.x + tempVec.z * tempVec.z);

      // 1. Apply Flare
      if (p.flareAmount !== 0 && originalY >= flareStartWorldY && flareRange > 0.001) {
        const flareT = Math.max(0, (originalY - flareStartWorldY)) / flareRange; // 0.0 to 1.0
        const flare = p.flareAmount * flareT;
        const newRadius = originalRadius + flare;
        if (originalRadius > 0.001) {
            tempVec.x *= newRadius / originalRadius;
            tempVec.z *= newRadius / originalRadius;
        }
      }
      
      // 2. Apply Bend
      if (bendRad !== 0 && originalY >= bendStartWorldY && bendRange > 0.001) {
        const bendT = Math.max(0, (originalY - bendStartWorldY)) / bendRange; // 0.0 to 1.0
        const theta = bendRad * bendT;
        
        tempVec.y -= bendStartWorldY; 
        tempQuat.setFromAxisAngle(bendAxis, theta);
        tempVec.applyQuaternion(tempQuat);
        tempVec.y += bendStartWorldY;
      }

      pos.setXYZ(i, tempVec.x, tempVec.y, tempVec.z);
    }
    
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };
    this.userData.params = next;
    this.material.color.setRGB(next.colorR, next.colorG, next.colorB);
    this.build();
  }

  dispose() {
    this.traverse(n => {
      if (n.geometry) n.geometry.dispose();
      if (n.material) n.material.dispose();
    });
    this.clear();
  }
}
