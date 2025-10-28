/*
File: src/cube.js
*/
// cube.js — creates a cube wrapped in a pivot group + deformable mesh
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const DEFAULT_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.8,
  metalness: 0.1
});

export default {
  create() {
    // Top-level object acts as the pivot node
    const pivot = new THREE.Group();
    pivot.name = 'Cube';

    // Start with a rounded box (radius 0 == sharp)
    const geo = new RoundedBoxGeometry(1, 1, 1, 1, 0.0);
    const mesh = new THREE.Mesh(geo, DEFAULT_MAT);
    mesh.name = 'Mesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);

    // Default modifier state lives on the top-level object
    pivot.userData.mods = {
      // --- Pivot ---
      pivotOffset: { x: 0, y: 0, z: 0 },

      // --- Resolution & bevel (structural) ---
      resX: 2, resY: 2, resZ: 2,        // face resolution
      bevelRadius: 0.00,                 // 0..0.45 (box is size 1)
      bevelSegments: 1,                  // 1..6
      subdivLevel: 0,                    // 0..3
      adaptiveSubdiv: false,

      // --- Deformation ---
      tiltX: 0.0, tiltY: 0.0,            // skew by height
      shearX: 0.0, shearY: 0.0, shearZ: 0.0,
      taperTop: 1.0, taperBottom: 1.0,   // scale XZ by Y
      twistY: 0.0,                       // degrees
      bendX: 0.0,                        // degrees
      bendZ: 0.0,                        // degrees
      bulge: 0.0,                        // -1..1

      // --- Noise ---
      noiseStrength: 0.0,
      noiseScale: 2.0,
      noiseSeed: 1
    };

    // Book-keeping for deformation pipeline (stored on the mesh)
    mesh.userData._basePositions = mesh.geometry.attributes.position.array.slice();
    mesh.userData._structCache = {
      resX: 2, resY: 2, resZ: 2, bevelRadius: 0.0, bevelSegments: 1, subdivLevel: 0
    };

    return pivot;
  }
};