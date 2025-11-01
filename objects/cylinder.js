--- a/objects/cylinder.js
+++ b/objects/cylinder.js
@@ -1,5 +1,6 @@
 // File: objects/cylinder.js
 import * as THREE from 'three';
+import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
 
 export default class Cylinder extends THREE.Group {
   constructor(params = {}) {
@@ -37,7 +38,7 @@
   build() {
     this.clear();
     const p = this.userData.params;
-    const geo = new THREE.CylinderGeometry(
+    let geo = new THREE.CylinderGeometry(
       p.radiusTop,
       p.radiusBottom,
       p.height,
@@ -48,15 +49,20 @@
       THREE.MathUtils.degToRad(p.thetaLength)
     );
     
+    // --- FIX: Merge vertices to prevent splitting with displacement maps ---
+    // This averages normals at seams/edges, making the geometry "water-tight"
+    // but will remove sharp-shaded edges.
+    geo = mergeVertices(geo);
+    geo.computeVertexNormals(); // Recompute normals after merging
+    // --- END FIX ---
+    
     // --- NEW DEFORMER LOGIC ---
     if (p.bendAngle !== 0 || p.flareAmount !== 0) {
       this.applyDeformations(geo, p);
     }
     // --- END NEW LOGIC ---
 
-    const mesh = new THREE.Mesh(geo, this.material);
-    mesh.name = 'CylinderMesh';
-    mesh.castShadow = true;
+    const mesh = new THREE.Mesh(geo, this.material);
+    mesh.name = 'CylinderMesh';
+    mesh.castShadow = true;
     mesh.receiveShadow = true;
     this.add(mesh);
   }

