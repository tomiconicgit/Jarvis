import * as THREE from 'three';

export default class Gear extends THREE.Group {
  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Gear';

    const defaults = {
      radius: 1,
      height: 0.3,
      teeth: 12,
      toothHeight: 0.2,
      toothThickness: 0.3,
      color: 0x777777
    };
    this.userData.params = { ...defaults, ...params };

    this.mat = new THREE.MeshStandardMaterial({ color: defaults.color, roughness: 0.5, metalness: 0.8 });

    this.build();
  }

  build() {
    this.clear();
    const p = this.userData.params;

    const shape = new THREE.Shape();
    const innerRadius = p.radius - p.toothHeight;
    const toothAngle = (Math.PI * 2) / p.teeth;
    const toothWidthAngle = (toothAngle * p.toothThickness);
    
    shape.moveTo(innerRadius, 0);

    for (let i = 0; i < p.teeth; i++) {
      const angle = i * toothAngle;
      
      // Start of tooth (inner radius)
      shape.lineTo(innerRadius * Math.cos(angle), innerRadius * Math.sin(angle));
      
      // Rise to outer radius
      const startToothAngle = angle + toothAngle * 0.05;
      shape.lineTo(p.radius * Math.cos(startToothAngle), p.radius * Math.sin(startToothAngle));
      
      // Top of tooth
      const endToothAngle = angle + toothWidthAngle - toothAngle * 0.05;
      shape.lineTo(p.radius * Math.cos(endToothAngle), p.radius * Math.sin(endToothAngle));
      
      // Fall to inner radius
      const endInnerAngle = angle + toothWidthAngle;
      shape.lineTo(innerRadius * Math.cos(endInnerAngle), innerRadius * Math.sin(endInnerAngle));

      // Valley
      const nextAngle = (i + 1) * toothAngle;
      shape.lineTo(innerRadius * Math.cos(nextAngle), innerRadius * Math.sin(nextAngle));
    }

    const extrudeSettings = {
      depth: p.height,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.translate(0, 0, -p.height * 0.5);
    geo.rotateX(Math.PI * 0.5); // Lay flat
    
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.name = 'GearMesh';
    this.add(mesh);
  }

  updateParams(next) {
    this.userData.params = { ...this.userData.params, ...next };
    this.mat.color.set(this.userData.params.color);
    this.build();
  }

  dispose() {
    this.traverse(n => {
      if (n.geometry) n.geometry.dispose();
    });
    this.mat.dispose();
    this.clear();
  }
}

