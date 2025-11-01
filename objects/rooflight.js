import * as THREE from 'three';
// --- FIX: Import mergeVertices ---
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export default class RoofLight extends THREE.Group {
  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'RoofLight';

    const defaults = {
      radius: 0.2,
      height: 0.15,
      lensHeight: 0.1,
      color: 0x888888,
      lensColor: 0xFFE0A0
    };
    this.userData.params = { ...defaults, ...params };

    this.baseMat = new THREE.MeshStandardMaterial({ color: defaults.color, roughness: 0.5, metalness: 0.5 });
    this.lensMat = new THREE.MeshStandardMaterial({ color: defaults.lensColor, roughness: 0.1, metalness: 0.0, emissive: defaults.lensColor, emissiveIntensity: 2.0, transparent: true, opacity: 0.8 });

    this.build();
  }

  build() {
    this.clear();
    const p = this.userData.params;

    // Base
    const baseHeight = p.height - p.lensHeight;
    // --- FIX: Merge vertices ---
    const baseGeo = mergeVertices(new THREE.CylinderGeometry(p.radius, p.radius, baseHeight, 32));
    const base = new THREE.Mesh(baseGeo, this.baseMat);
    base.name = 'Base';
    base.position.y = baseHeight * 0.5;
    this.add(base);

    // Lens
    // --- FIX: Merge vertices ---
    const lensGeo = mergeVertices(new THREE.CylinderGeometry(p.radius * 0.8, p.radius * 0.8, p.lensHeight, 32));
    const lens = new THREE.Mesh(lensGeo, this.lensMat);
    lens.name = 'Lens';
    lens.position.y = baseHeight + p.lensHeight * 0.5;
    this.add(lens);
  }

  updateParams(next) {
    this.userData.params = { ...this.userData.params, ...next };
    this.baseMat.color.set(this.userData.params.color);
    this.lensMat.color.set(this.userData.params.lensColor);
    this.lensMat.emissive.set(this.userData.params.lensColor);
    this.build();
  }

  dispose() {
    this.traverse(n => {
      if (n.geometry) n.geometry.dispose();
    });
    this.baseMat.dispose();
    this.lensMat.dispose();
    this.clear();
  }
}
