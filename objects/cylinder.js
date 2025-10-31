import * as THREE from 'three';

export default class Cylinder extends THREE.Group {
  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Cylinder';

    const defaults = {
      radiusTop: 0.5,
      radiusBottom: 0.5,
      height: 1,
      radialSegments: 16,
      openEnded: false,
      thetaStart: 0,
      thetaLength: 360,
      colorR: 0.8, colorG: 0.8, colorB: 0.8
    };

    this.userData.params = { ...defaults, ...params };

    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(defaults.colorR, defaults.colorG, defaults.colorB),
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide // Good for openEnded
    });

    this.build();
  }

  build() {
    this.clear();
    const p = this.userData.params;
    const geo = new THREE.CylinderGeometry(
      p.radiusTop,
      p.radiusBottom,
      p.height,
      Math.floor(p.radialSegments),
      1,
      p.openEnded,
      THREE.MathUtils.degToRad(p.thetaStart),
      THREE.MathUtils.degToRad(p.thetaLength)
    );
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.name = 'CylinderMesh';
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
