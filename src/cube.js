/*
File: src/cube.js
*/
// Cube with a true pivot group + deformable rounded box
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const DEFAULT_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.8,
  metalness: 0.1
});

export default {
  create() {
    // Top-level object acts as pivot
    const pivot = new THREE.Group();
    pivot.name = 'Cube';

    // Start with a rounded box (radius 0 → sharp)
    const geo = new RoundedBoxGeometry(1, 1, 1, 1, 0.0);
    const mesh = new THREE.Mesh(geo, DEFAULT_MAT);
    mesh.name = 'Mesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);

    // Default modifier state
    pivot.userData.mods = {
      // Pivot
      pivotOffset: { x: 0, y: 0, z: 0 },

      // Resolution / Structure
      resX: 2, resY: 2, resZ: 2,
      bevelRadius: 0.00,
      bevelSegments: 1,
      subdivLevel: 0,
      adaptiveSubdiv: false,

      // Deforms
      tiltX: 0.0, tiltY: 0.0,
      shearX: 0.0, shearY: 0.0, shearZ: 0.0,
      taperTop: 1.0, taperBottom: 1.0,
      twistY: 0.0,
      bendX: 0.0, bendZ: 0.0,
      bulge: 0.0,

      // Noise / Irregularity
      noiseStrength: 0.0,
      noiseScale: 2.0,
      noiseSeed: 1
    };

    // Deform bookkeeping
    mesh.userData._basePositions = mesh.geometry.attributes.position.array.slice();
    mesh.userData._structCache = {
      resX: 2, resY: 2, resZ: 2, bevelRadius: 0.0, bevelSegments: 1, subdivLevel: 0
    };

    return pivot;
  }
};