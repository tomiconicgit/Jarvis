import * as THREE from 'three';
// --- FIX: Import mergeVertices ---
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export default class FuelTank extends THREE.Group {
  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'FuelTank';

    const defaults = {
      radius: 4,
      height: 10,
      domeHeight: 1.5,
      segments: 32,
      color: 0xCCCCCC
    };
    this.userData.params = { ...defaults, ...params };

    this.tankMat = new THREE.MeshStandardMaterial({ color: defaults.color, roughness: 0.4, metalness: 0.6 });

    this.build();
  }

  build() {
    this.clear();
    const p = this.userData.params;

    // Main Cylinder
    const cylHeight = p.height - p.domeHeight;
    // --- FIX: Merge vertices ---
    const cylGeo = mergeVertices(new THREE.CylinderGeometry(p.radius, p.radius, cylHeight, p.segments));
    const cylinder = new THREE.Mesh(cylGeo, this.tankMat);
    cylinder.name = 'TankCylinder';
    cylinder.position.y = cylHeight * 0.5;
    this.add(cylinder);

    // Dome Top
    // --- FIX: Merge vertices ---
    const domeGeo = mergeVertices(new THREE.SphereGeometry(p.radius, p.segments, p.segments, 0, Math.PI * 2, 0, Math.PI * 0.5));
    domeGeo.scale(1, p.domeHeight / p.radius, 1);
    const dome = new THREE.Mesh(domeGeo, this.tankMat);
    dome.name = 'TankDome';
    dome.position.y = cylHeight;
    this.add(dome);
  }

  updateParams(next) {
    this.userData.params = { ...this.userData.params, ...next };
    this.tankMat.color.set(this.userData.params.color);
    this.build();
  }

  dispose() {
    this.traverse(n => {
      if (n.geometry) n.geometry.dispose();
    });
    this.tankMat.dispose();
    this.clear();
  }
}
