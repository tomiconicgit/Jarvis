import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export default class Cube extends THREE.Group {
  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Cube';

    const defaults = {
      width: 1,
      height: 1,
      depth: 1,
      radius: 0.05, // Bevel radius
      segments: 4,  // Bevel segments
      colorR: 0.8, colorG: 0.8, colorB: 0.8
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
    
    // Use RoundedBoxGeometry for "curve edges"
    const maxRadius = Math.min(p.width, p.height, p.depth) / 2;
    const radius = Math.max(0, Math.min(p.radius, maxRadius));
    const segments = Math.floor(p.segments);
    
    const geo = new RoundedBoxGeometry(p.width, p.height, p.depth, segments, radius);
    
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.name = 'CubeMesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };
    
    // Add constraints
    const maxRadius = Math.min(next.width, next.height, next.depth) / 2;
    if (next.radius > maxRadius) next.radius = maxRadius;
    
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
