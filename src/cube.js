/*
File: src/cube.js
*/
// cube.js — creates a simple cube mesh
import * as THREE from 'three';

const DEFAULT_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.8,
  metalness: 0.1
});

export default {
  create() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geo, DEFAULT_MAT);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
};
