// File: objects/cylinder.js
import * as THREE from 'three';
// --- FIX: Import mergeVertices ---
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export default class Cylinder extends THREE.Group {
  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Cylinder';

    const defaults = {
      radiusTop: 0.5,
      radiusBottom: 0.5,
      height: 1,
      radialSegments: 16,
      openEnded: false,
      thetaStart: 0,
      thetaLength: 360,
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
      metalness: 0.1,
      side: THREE.DoubleSide // Good for openEnded
    });

    this.build();
  }

  build() {
    this.clear();
    const p = this.userData.params;
    let geo = new THREE.CylinderGeometry(
      p.radiusTop,
      p.radiusBottom,
      p.height,
      Math.floor(p.radialSegments),
      Math.max(1, Math.floor(p.radialSegments / 2)), // Add height segments for smooth deforms
      p.openEnded,
      THREE.MathUtils.degToRad(p.thetaStart),
      THREE.MathUtils.degToRad(p.thetaLength)
    );
    
    // --- FIX: Merge vertices to prevent splitting with displacement maps ---
    // This averages normals at seams/edges, making the geometry "water-tight"
    // but will remove sharp-shaded edges.
    geo = mergeVertices(geo);
    geo.computeVertexNormals(); // Recompute normals after merging
    // --- END FIX ---
    
    // --- NEW DEFORMER LOGIC ---
    if (p.bendAngle !== 0 || p.flareAmount !== 0) {
      this.applyDeformations(geo, p);
    }
    // --- END NEW LOGIC ---

    const mesh = new THREE.Mesh(geo, this.material);
    mesh.name = 'CylinderMesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);
  }
  
  /**
   * Applies vertex deformations for bend and flare.
   */
  applyDeformations(geometry, p) {
    const pos = geometry.attributes.position;
    const halfHeight = p.height / 2;
    const bendRad = THREE.MathUtils.degToRad(p.bendAngle);

    // Calculate start heights in world space
    const flareStartWorldY = -halfHeight + p.flareStartY * p.height;
    const flareEndWorldY = halfHeight;
    const flareRange = flareEndWorldY - flareStartWorldY;
    
    const bendStartWorldY = -halfHeight + p.bendStartY * p.height;
    const bendEndWorldY = halfHeight;
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
        
        // We bend "away" from the start point.
        // The vertex's Y position relative to the start point is what gets bent.
        tempVec.y -= bendStartWorldY; 
        
        // Apply rotation
        tempQuat.setFromAxisAngle(bendAxis, theta);
        tempVec.applyQuaternion(tempQuat);
        
        // Add the start point's Y back
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
