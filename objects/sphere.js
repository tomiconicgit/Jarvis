import * as THREE from 'three';

export default class Sphere extends THREE.Group {
  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Sphere';

    const defaults = {
      radius: 1,
      segments: 32,
      phiStart: 0,
      phiLength: 360,
      thetaStart: 0,
      thetaLength: 180,
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
    const geo = new THREE.SphereGeometry(
      p.radius,
      Math.floor(p.segments),
      Math.floor(p.segments),
      THREE.MathUtils.degToRad(p.phiStart),
      THREE.MathUtils.degToRad(p.phiLength),
      THREE.MathUtils.degToRad(p.thetaStart),
      THREE.MathUtils.degToRad(p.thetaLength)
    );
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.name = 'SphereMesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };
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
