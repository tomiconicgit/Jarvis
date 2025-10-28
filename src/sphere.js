/*
File: src/sphere.js
*/
// Sphere with true pivot group; uses same modifiers/deforms as cube
import * as THREE from 'three';

const DEFAULT_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.8,
  metalness: 0.1
});

export default {
  create() {
    const pivot = new THREE.Group();
    pivot.name = 'Sphere';

    // radius 0.5 so Y ∈ [-0.5, 0.5] like the cube baseline
    const geo = new THREE.SphereGeometry(0.5, 32, 18);
    const mesh = new THREE.Mesh(geo, DEFAULT_MAT);
    mesh.name = 'Mesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // mark shape type for the modifier system
    mesh.userData.shapeType = 'sphere';

    // base arrays for deforms
    mesh.userData._basePositions = geo.attributes.position.array.slice();
    mesh.userData._structCache = { topo: 'uv', seg: 32, resX: 2, resY: 2, resZ: 2, subdivLevel: 0 };

    pivot.add(mesh);

    // default modifier state (shared schema with cube)
    pivot.userData.mods = {
      pivotOffset: { x: 0, y: 0, z: 0 },

      // resolution / structure (mapped to sphere segments)
      resX: 2, resY: 2, resZ: 2,
      subdivLevel: 0,
      adaptiveSubdiv: false,

      // bevel fields are ignored on sphere but kept for schema parity
      bevelRadius: 0.0,
      bevelSegments: 1,

      // deforms
      tiltX: 0.0, tiltY: 0.0,
      shearX: 0.0, shearY: 0.0, shearZ: 0.0,
      taperTop: 1.0, taperBottom: 1.0,
      twistY: 0.0,
      bendX: 0.0, bendZ: 0.0,
      bulge: 0.0,

      // noise
      noiseStrength: 0.0,
      noiseScale: 2.0,
      noiseSeed: 1
    };

    return pivot;
  }
};