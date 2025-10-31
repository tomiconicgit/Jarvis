import * as THREE from 'three';

export default class FloodLight extends THREE.Group {
  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'FloodLight';

    const defaults = {
      baseSize: 0.3,
      stalkHeight: 0.2,
      yokeWidth: 0.6,
      lightHousingSize: 0.5,
      lightHousingDepth: 0.4,
      lensRadius: 0.2,
      color: 0x999999,
      lensColor: 0xFFFFE0
    };
    this.userData.params = { ...defaults, ...params };

    this.baseMat = new THREE.MeshStandardMaterial({ color: defaults.color, roughness: 0.6, metalness: 0.4 });
    this.housingMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.7 });
    this.lensMat = new THREE.MeshStandardMaterial({ color: defaults.lensColor, roughness: 0.1, metalness: 0.0, emissive: defaults.lensColor, emissiveIntensity: 2.0 });

    this.build();
  }

  build() {
    this.clear();
    const p = this.userData.params;

    // Base
    const baseGeo = new THREE.CylinderGeometry(p.baseSize * 0.5, p.baseSize, p.baseSize * 0.2, 16);
    const base = new THREE.Mesh(baseGeo, this.baseMat);
    base.name = 'Base';
    base.position.y = p.baseSize * 0.1;
    this.add(base);

    // Stalk
    const stalkGeo = new THREE.CylinderGeometry(p.baseSize * 0.2, p.baseSize * 0.2, p.stalkHeight, 8);
    const stalk = new THREE.Mesh(stalkGeo, this.baseMat);
    stalk.name = 'Stalk';
    stalk.position.y = p.baseSize * 0.2 + p.stalkHeight * 0.5;
    this.add(stalk);

    // Yoke
    const yoke = new THREE.Group();
    yoke.name = 'Yoke';
    yoke.position.y = p.baseSize * 0.2 + p.stalkHeight;
    const yokeArmGeo = new THREE.BoxGeometry(0.05, 0.2, 0.05);
    const yokeLeft = new THREE.Mesh(yokeArmGeo, this.baseMat);
    yokeLeft.position.x = -p.yokeWidth * 0.5;
    yokeLeft.position.y = 0.1;
    yoke.add(yokeLeft);
    const yokeRight = new THREE.Mesh(yokeArmGeo, this.baseMat);
    yokeRight.position.x = p.yokeWidth * 0.5;
    yokeRight.position.y = 0.1;
    yoke.add(yokeRight);
    this.add(yoke);

    // Housing
    const housing = new THREE.Group();
    housing.name = 'Housing';
    housing.position.y = 0.1;
    const housingGeo = new THREE.BoxGeometry(p.lightHousingSize, p.lightHousingSize, p.lightHousingDepth);
    const housingMesh = new THREE.Mesh(housingGeo, this.housingMat);
    housingMesh.name = 'HousingMesh';
    housing.add(housingMesh);

    // Lens
    const lensGeo = new THREE.CircleGeometry(p.lensRadius, 32);
    const lens = new THREE.Mesh(lensGeo, this.lensMat);
    lens.name = 'Lens';
    lens.position.z = p.lightHousingDepth * 0.5 + 0.01;
    housing.add(lens);

    yoke.add(housing);
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
    this.housingMat.dispose();
    this.lensMat.dispose();
    this.clear();
  }
}

