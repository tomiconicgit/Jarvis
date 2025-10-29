import * as THREE from 'three';

export default class Floor extends THREE.Group {
  static getMaxCornerRadius(p) {
    return 0; // No corner radius for floor
  }
  static getMaxEdgeRoundness(p) {
    return 0; // No edge roundness for floor
  }

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Floor';

    const defaults = {
      width: 20,
      depth: 20,
      thickness: 0.5,
      colorR: 0.5,
      colorG: 0.5,
      colorB: 0.5
    };
    this.userData.params = { ...defaults, ...params };

    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.5, 0.5, 0.5),
      roughness: 0.8,
      metalness: 0
    });

    this.build();
  }

  build() {
    for (const c of this.children) c.geometry && c.geometry.dispose();
    this.clear();

    const p = this.userData.params;

    // Update material color
    this.material.color.setRGB(p.colorR, p.colorG, p.colorB);

    // Floor mesh (box for thickness)
    const geo = new THREE.BoxGeometry(p.width, p.thickness, p.depth);
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);
  }

  updateParams(next) {
    this.userData.params = { ...this.userData.params, ...next };
    this.build();
  }

  dispose() {
    for (const c of this.children) if (c.geometry) c.geometry.dispose();
    this.clear();
  }
}