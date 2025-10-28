/*
File: src/hollowcube.js
*/
// Hollow cube (frame) with per-face open/closed options.
// Uses single mesh "Mesh" under a pivot group so pivot offset works.
import * as THREE from 'three';

const DEFAULT_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.8,
  metalness: 0.1
});

export default {
  create() {
    const pivot = new THREE.Group();
    pivot.name = 'HollowCube';

    // placeholder geometry; real geometry is built by modifiers.rebuild*
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geo, DEFAULT_MAT);
    mesh.name = 'Mesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.shapeType = 'hollowcube';

    // default modifier state (shared keys + hollow-specific)
    pivot.userData.mods = {
      // pivot
      pivotOffset: { x: 0, y: 0, z: 0 },

      // generic resolution (not critical for hollow, kept for parity)
      resX: 2, resY: 2, resZ: 2, subdivLevel: 0, adaptiveSubdiv: false,

      // deforms (compatible with modifiers.applyDeforms)
      tiltX: 0, tiltY: 0, shearX: 0, shearY: 0, shearZ: 0,
      taperTop: 1, taperBottom: 1, twistY: 0, bendX: 0, bendZ: 0, bulge: 0,

      // noise (edge irregularity)
      noiseStrength: 0, noiseScale: 2, noiseSeed: 1,

      // hollow-specific
      wall: 0.12,          // border width (and edge beam thickness)
      panelDepth: 0.12,    // thickness for closed faces
      faces: { px:false, nx:false, py:false, ny:false, pz:false, nz:false } // true = closed
    };

    pivot.add(mesh);
    return pivot;
  }
};