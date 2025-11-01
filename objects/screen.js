import * as THREE from 'three';
// --- FIX: Import mergeVertices ---
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export default class Screen extends THREE.Group {
  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Screen';

    const defaults = {
      width: 2,
      height: 1.2,
      depth: 0.1,
      bevel: 0.05,
      screenColor: 0x111111,
      housingColor: 0x444444
    };
    this.userData.params = { ...defaults, ...params };

    this.housingMat = new THREE.MeshStandardMaterial({ color: defaults.housingColor, roughness: 0.7, metalness: 0.2 });
    this.screenMat = new THREE.MeshStandardMaterial({ color: defaults.screenColor, roughness: 0.2, metalness: 0.0, emissive: defaults.screenColor, emissiveIntensity: 0.5 });

    this.build();
  }

  build() {
    this.clear();
    const p = this.userData.params;
    
    // Housing
    const shape = new THREE.Shape();
    const w = p.width / 2, h = p.height / 2, r = p.bevel;
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
    shape.lineTo(w, h - r);
    shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
    shape.lineTo(-w + r, h);
    shape.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-w, -h + r);
    shape.absarc(-w + r, -h + r, r, Math.PI, 1.5 * Math.PI, false);
    
    const extrudeSettings = {
      depth: p.depth,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1
    };
    let geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // --- FIX: Merge vertices to prevent splitting with displacement maps ---
    geo = mergeVertices(geo);
    // --- END FIX ---
    
    geo.translate(0, 0, -p.depth * 0.5);
    
    const housing = new THREE.Mesh(geo, this.housingMat);
    housing.name = 'Housing';
    this.add(housing);

    // Screen
    const screenGeo = new THREE.PlaneGeometry(p.width - p.bevel * 2, p.height - p.bevel * 2);
    const screen = new THREE.Mesh(screenGeo, this.screenMat);
    screen.name = 'ScreenDisplay';
    screen.position.z = p.depth * 0.5 + 0.01;
    this.add(screen);
  }

  updateParams(next) {
    this.userData.params = { ...this.userData.params, ...next };
    this.housingMat.color.set(this.userData.params.housingColor);
    this.screenMat.color.set(this.userData.params.screenColor);
    this.screenMat.emissive.set(this.userData.params.screenColor);
    this.build();
  }

  dispose() {
    this.traverse(n => {
      if (n.geometry) n.geometry.dispose();
    });
    this.housingMat.dispose();
    this.screenMat.dispose();
    this.clear();
  }
}
