import * as THREE from 'three';

// -------- helpers ----------
function roundedRectPath(w, d, r) {
  const hw = w / 2, hd = d / 2, rr = Math.max(0, Math.min(r, hw, hd));
  const p = new THREE.Path();
  p.moveTo(-hw + rr, -hd);
  p.lineTo(hw - rr, -hd);
  p.absarc(hw - rr, -hd + rr, rr, -Math.PI / 2, 0, false);
  p.lineTo(hw, hd - rr);
  p.absarc(hw - rr, hd - rr, rr, 0, Math.PI / 2, false);
  p.lineTo(-hw + rr, hd);
  p.absarc(-hw + rr, hd - rr, rr, Math.PI / 2, Math.PI, false);
  p.lineTo(-hw, -hd + rr);
  p.absarc(-hw + rr, -hd + rr, rr, Math.PI, 1.5 * Math.PI, false);
  p.closePath();
  return p;
}

function clampEdgeRoundnessInPlane(p, effW, effD) {
  const maxByFoot = Math.max(0.01, Math.min(effW, effD) * 0.25);
  return Math.min(p.edgeRoundness || 0, maxByFoot);
}
function clampEdgeRoundnessThickness(p) {
  const maxByT = Math.max(0.01, p.thickness / 2 - 0.01);
  return Math.min(p.edgeRoundness || 0, maxByT);
}

function makeRoofGeometry(p) {
  const effW = p.width + 2 * p.overhang;
  const effD = p.depth + 2 * p.overhang;

  const crMax = Roof.getMaxCornerRadius({ ...p, width: effW, depth: effD });
  const r = Math.max(0, Math.min(p.cornerRadius, crMax));

  const shape = new THREE.Shape(roundedRectPath(effW, effD, r).getPoints());

  // Skylight hole
  if (p.hasSkylight) {
    const sW = Math.max(0.1, Math.min(p.skylightWidth, effW - 0.6));
    const sD = Math.max(0.1, Math.min(p.skylightDepth, effD - 0.6));
    const sR = Math.max(0, Math.min(p.skylightCornerRadius, Math.min(sW, sD) / 2 - 0.01));
    const hole = roundedRectPath(sW, sD, sR);
    shape.holes.push(hole);
  }

  const bevelEnabled = (p.edgeRoundness || 0) > 0;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: p.thickness,
    steps: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelEnabled,
    bevelSegments: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelSize: bevelEnabled ? clampEdgeRoundnessInPlane(p, effW, effD) : 0,
    bevelThickness: bevelEnabled ? clampEdgeRoundnessThickness(p) : 0,
    curveSegments: Math.max(8, Math.floor(p.cornerSmoothness || 16))
  });

  // orient to Y up
  geo.translate(0, 0, -p.thickness / 2);
  geo.rotateX(-Math.PI / 2);

  // Apply arch/dome curvature on the top side
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const topY = bb.max.y; // top surface ~ maxY
  const pos = geo.attributes.position;
  const hw = effW / 2, hd = effD / 2;
  const archX = p.archX;
  const archZ = p.archZ;
  const H = Math.max(0, p.archHeight);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // weight so deformation fades below top (keeps underside mostly flat)
    const t = Math.max(0, (y - (topY - p.thickness)) / p.thickness); // 0 bottom .. 1 top
    let raise = 0;

    if (H > 0) {
      const nx = THREE.MathUtils.clamp((x / hw), -1, 1);
      const nz = THREE.MathUtils.clamp((z / hd), -1, 1);
      if (archX && archZ) {
        // dome (paraboloid)
        raise = H * (1 - nx * nx) * (1 - nz * nz);
      } else if (archX) {
        // barrel along X
        raise = H * (1 - nx * nx);
      } else if (archZ) {
        // barrel along Z
        raise = H * (1 - nz * nz);
      }
    }

    if (raise !== 0) pos.setY(i, y + raise * t);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  return geo;
}

// -------- Roof ----------
export default class Roof extends THREE.Group {
  static getMaxCornerRadius(p) {
    const eps = 0.01;
    const effW = p.width + 2 * p.overhang;
    const effD = p.depth + 2 * p.overhang;
    return Math.max(0, Math.min(effW, effD) / 2 - eps);
  }
  static getMaxEdgeRoundness(p) {
    return Math.max(0.01, Math.min(p.thickness / 2 - 0.01, (Math.min(p.width + 2 * p.overhang, p.depth + 2 * p.overhang)) / 4));
  }
  static getMaxSkylight(p) {
    const effW = p.width + 2 * p.overhang;
    const effD = p.depth + 2 * p.overhang;
    // keep margin from outer edge for strength
    return {
      w: Math.max(0.2, effW - 0.6),
      d: Math.max(0.2, effD - 0.6)
    };
  }

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Roof';

    const defaults = {
      // footprint
      width: 12,
      depth: 12,
      overhang: 0.5,
      thickness: 0.5,

      // shape/finish
      cornerRadius: 0.3,
      cornerSmoothness: 16,
      edgeRoundness: 0.1,
      edgeSmoothness: 4,

      // curvature
      archHeight: 0.6,
      archX: true,
      archZ: true,

      // skylight
      hasSkylight: true,
      skylightWidth: 4,
      skylightDepth: 3,
      skylightCornerRadius: 0.2,
      glassOpacity: 0.25,
      glassRoughness: 0.1,

      // rails
      hasRails: true,
      railHeight: 1.0,
      railSpacing: 2.5,

      // extras
      hasVent: true,
      hasAntenna: false,

      // colours
      colorR: 0.7,
      colorG: 0.7,
      colorB: 0.72
    };

    this.userData.params = { ...defaults, ...params };

    // materials
    this.roofMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(defaults.colorR, defaults.colorG, defaults.colorB),
      roughness: 0.6,
      metalness: 0.15
    });
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(1, 1, 1),
      transparent: true,
      opacity: defaults.glassOpacity,
      transmission: 0.95,
      roughness: defaults.glassRoughness,
      metalness: 0,
      side: THREE.DoubleSide
    });
    this.railMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 0.7, roughness: 0.3 });

    this.build();
  }

  build() {
    // cleanup old
    this.traverse((n) => {
      if (n.isMesh) {
        n.geometry && n.geometry.dispose();
      }
    });
    this.clear();

    const p = this.userData.params;

    // base slab
    const slabGeo = makeRoofGeometry(p);
    const slab = new THREE.Mesh(slabGeo, this.roofMat);
    slab.name = 'Slab';
    slab.castShadow = true; slab.receiveShadow = true;
    this.add(slab);

    const effW = p.width + 2 * p.overhang;
    const effD = p.depth + 2 * p.overhang;

    // glass for skylight
    if (p.hasSkylight) {
      const sW = Math.max(0.1, Math.min(p.skylightWidth, Roof.getMaxSkylight(p).w));
      const sD = Math.max(0.1, Math.min(p.skylightDepth, Roof.getMaxSkylight(p).d));
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(sW - 0.05, sD - 0.05), this.glassMat);
      glass.name = 'Glass';
      // sit near the top; push slightly up to avoid z-fight
      const topY = new THREE.Box3().setFromObject(slab).max.y;
      glass.position.set(0, topY + 0.01, 0);
      this.add(glass);
    }

    // rails
    if (p.hasRails) {
      const railY = new THREE.Box3().setFromObject(slab).max.y + p.railHeight;
      const postH = p.railHeight;
      const post = new THREE.BoxGeometry(0.08, postH, 0.08);

      // perimeter posts at spacing
      const halfW = effW / 2, halfD = effD / 2;
      const spacing = Math.max(0.5, p.railSpacing);
      const mkPost = (x, z) => {
        const m = new THREE.Mesh(post, this.railMat);
        m.position.set(x, railY - postH / 2, z);
        m.castShadow = true; m.receiveShadow = false;
        this.add(m);
      };

      // edges: +X, -X, +Z, -Z
      const placeLine = (len, fixed, along, axis) => {
        const count = Math.max(2, Math.round(len / spacing) + 1);
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          const a = -along + t * (2 * along);
          const x = axis === 'z' ? fixed : a;
          const z = axis === 'z' ? a : fixed;
          mkPost(x, z);
        }
      };
      placeLine(effW,  halfD, halfW, 'z'); // +Z edge
      placeLine(effW, -halfD, halfW, 'z'); // -Z edge
      placeLine(effD,  halfW, halfD, 'x'); // +X edge
      placeLine(effD, -halfW, halfD, 'x'); // -X edge

      // top rails (4 sides) as thin boxes
      const railThick = 0.06;
      const mkRail = (len, cx, cz, rotY) => {
        const g = new THREE.BoxGeometry(len, railThick, railThick);
        const m = new THREE.Mesh(g, this.railMat);
        m.position.set(cx, railY, cz);
        m.rotation.y = rotY || 0;
        this.add(m);
      };
      mkRail(effW - 0.12, 0,  halfD, 0);
      mkRail(effW - 0.12, 0, -halfD, 0);
      mkRail(effD - 0.12,  halfW, 0, Math.PI / 2);
      mkRail(effD - 0.12, -halfW, 0, Math.PI / 2);
    }

    // vent (small box)
    if (p.hasVent) {
      const slabBox = new THREE.Box3().setFromObject(slab);
      const topY = slabBox.max.y;
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.6, metalness: 0.2 }));
      vent.name = 'Vent';
      vent.position.set(- (effW / 4), topY + 0.3, 0);
      vent.castShadow = true;
      this.add(vent);
    }

    // antenna (mast)
    if (p.hasAntenna) {
      const slabBox = new THREE.Box3().setFromObject(slab);
      const topY = slabBox.max.y;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 16),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.4, metalness: 0.6 }));
      mast.name = 'Antenna';
      mast.position.set(effW / 4, topY + 1.5, 0);
      mast.castShadow = true;
      this.add(mast);
    }
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };

    // clamps
    const crMax = Roof.getMaxCornerRadius(next);
    if (next.cornerRadius > crMax) next.cornerRadius = crMax;

    const erMax = Roof.getMaxEdgeRoundness(next);
    if (next.edgeRoundness > erMax) next.edgeRoundness = erMax;

    const sMax = Roof.getMaxSkylight(next);
    if (next.skylightWidth > sMax.w)  next.skylightWidth = sMax.w;
    if (next.skylightDepth > sMax.d)  next.skylightDepth = sMax.d;
    const srMax = Math.min(next.skylightWidth, next.skylightDepth) / 2 - 0.01;
    if (next.skylightCornerRadius > srMax) next.skylightCornerRadius = Math.max(0, srMax);

    // mats
    this.roofMat.color.setRGB(next.colorR, next.colorG, next.colorB);
    this.glassMat.opacity   = next.glassOpacity;
    this.glassMat.roughness = next.glassRoughness;
    this.glassMat.transmission = 1 - next.glassOpacity * 0.15;

    this.userData.params = next;
    this.build();
  }

  dispose() {
    this.traverse((n) => {
      if (n.isMesh) {
        n.geometry && n.geometry.dispose();
        const m = n.material;
        if (Array.isArray(m)) m.forEach((mm) => mm && mm.dispose && mm.dispose());
        else if (m && m.dispose) m.dispose();
      }
    });
    this.clear();
  }
}