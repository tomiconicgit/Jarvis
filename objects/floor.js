import * as THREE from 'three';

// ---------- Helpers ----------
function roundedRectPath(w, d, r, ox = 0, oz = 0) {
  const hw = w / 2, hd = d / 2, rr = Math.max(0, Math.min(r, hw, hd));
  const p = new THREE.Path();
  p.moveTo(-hw + rr + ox, -hd + oz);
  p.lineTo( hw - rr + ox, -hd + oz);
  p.absarc( hw - rr + ox, -hd + rr + oz, rr, -Math.PI/2, 0, false);
  p.lineTo( hw + ox,  hd - rr + oz);
  p.absarc( hw - rr + ox,  hd - rr + oz, rr, 0, Math.PI/2, false);
  p.lineTo(-hw + rr + ox,  hd + oz);
  p.absarc(-hw + rr + ox,  hd - rr + oz, rr, Math.PI/2, Math.PI, false);
  p.lineTo(-hw + ox, -hd + rr + oz);
  p.absarc(-hw + rr + ox, -hd + rr + oz, rr, Math.PI, 1.5*Math.PI, false);
  p.closePath();
  return p;
}

function clampBevelInPlane(p) {
  const byT = Math.max(0.01, p.thickness / 2 - 0.01);
  const byFoot = Math.max(0.01, Math.min(p.width, p.depth) * 0.25);
  return Math.min(p.edgeRoundness || 0, byT, byFoot);
}
function clampBevelThickness(p) {
  return Math.max(0.01, Math.min(p.edgeRoundness || 0, p.thickness / 2));
}

// ---------- Floor (roof-capable) ----------
export default class Floor extends THREE.Group {
  static getMaxCornerRadius(p) {
    const eps = 0.01;
    return Math.max(0, Math.min(p.width, p.depth) / 2 - eps);
  }
  static getMaxEdgeRoundness(p) {
    return Math.max(0.01, Math.min(p.thickness / 2 - 0.01, Math.min(p.width, p.depth) / 6));
  }
  static getSkylightBounds(p) {
    const m = 0.05; // margin
    const hw = p.width / 2, hd = p.depth / 2;
    const maxW = Math.max(0.1, p.width - 2*m);
    const maxH = Math.max(0.1, p.depth - 2*m);
    const halfW = Math.max(0.05, p.skylightW / 2);
    const halfH = Math.max(0.05, p.skylightH / 2);
    return {
      maxW, maxH,
      minX: -hw + m + halfW,
      maxX:  hw - m - halfW,
      minZ: -hd + m + halfH,
      maxZ:  hd - m - halfH
    };
  }

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Floor';

    const defaults = {
      width: 20,
      depth: 20,
      thickness: 0.6,
      colorR: 0.65, colorG: 0.65, colorB: 0.65,

      // Edge/Corner shaping
      cornerRadius: 0.0,
      edgeRoundness: 0.0,
      edgeSmoothness: 4,

      // Roof-like bulge
      bulgeHeight: 0.0,    // 0..(~2)
      bulgeExponent: 2.0,  // 1..6

      // Skylight (hole)
      hasSkylight: false,
      skylightW: 6,
      skylightH: 6,
      skylightX: 0,
      skylightZ: 0,
      skylightRadius: 0.2,

      // Skylight glass
      hasSkylightGlass: false,
      glassOffset: 0.002, // tiny lift above surface
      glassOpacity: 0.35,
      glassRoughness: 0.15
    };

    this.userData.params = { ...defaults, ...params };

    this.slabMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(defaults.colorR, defaults.colorG, defaults.colorB),
      roughness: 0.85, metalness: 0.0
    });
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(1,1,1),
      transparent: true,
      opacity: defaults.glassOpacity,
      transmission: 0.9,
      roughness: defaults.glassRoughness,
      metalness: 0,
      side: THREE.DoubleSide
    });

    this.build();
  }

  build() {
    // dispose previous
    for (const c of this.children) c.geometry && c.geometry.dispose();
    this.clear();

    const p = this.userData.params;

    // Materials update
    this.slabMaterial.color.setRGB(p.colorR, p.colorG, p.colorB);
    this.glassMaterial.opacity = p.glassOpacity;
    this.glassMaterial.roughness = p.glassRoughness;

    // Build 2D shape (x,z plane), then extrude thickness and rotate to lay flat (y up)
    const outer = roundedRectPath(
      p.width,
      p.depth,
      Math.min(p.cornerRadius, Floor.getMaxCornerRadius(p)),
      0, 0
    );
    const shape = new THREE.Shape( outer.getPoints() );

    if (p.hasSkylight) {
      // Clamp skylight within bounds
      const bounds = Floor.getSkylightBounds(p);
      const sw = Math.min(p.skylightW, bounds.maxW);
      const sh = Math.min(p.skylightH, bounds.maxH);
      const sx = Math.min(Math.max(p.skylightX, bounds.minX), bounds.maxX);
      const sz = Math.min(Math.max(p.skylightZ, bounds.minZ), bounds.maxZ);
      const sr = Math.max(0, Math.min(p.skylightRadius, sw/2, sh/2));

      const hole = roundedRectPath(sw, sh, sr, sx, sz);
      shape.holes.push(hole);
    }

    const bevelEnabled = (p.edgeRoundness || 0) > 0;
    const extrude = new THREE.ExtrudeGeometry(shape, {
      depth: p.thickness,
      steps: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
      bevelEnabled,
      bevelSegments: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
      bevelSize: bevelEnabled ? clampBevelInPlane(p) : 0,
      bevelThickness: bevelEnabled ? clampBevelThickness(p) : 0,
      curveSegments: 24
    });

    // Center and rotate so Y is up
    extrude.translate(0, 0, -p.thickness/2);
    extrude.rotateX(-Math.PI/2); // thickness now in Y
    extrude.computeVertexNormals();

    // Optional bulge (roof camber) — push only top face up
    if ((p.bulgeHeight || 0) !== 0) {
      const pos = extrude.attributes.position;
      const hw = p.width / 2, hd = p.depth / 2;
      const tHalf = p.thickness / 2;
      const topY = tHalf;
      const tol = Math.max(0.0005, p.thickness * 0.05);
      const exp = Math.max(0.5, Math.min(6, p.bulgeExponent || 2));

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        if (y >= topY - tol) {
          const rx = x / hw;
          const rz = z / hd;
          const r = Math.sqrt(rx*rx + rz*rz);
          const k = Math.max(0, 1 - Math.pow(r, exp));
          pos.setY(i, y + (p.bulgeHeight * k));
        }
      }
      pos.needsUpdate = true;
      extrude.computeVertexNormals();
    }

    const slab = new THREE.Mesh(extrude, this.slabMaterial);
    slab.name = 'Slab';
    slab.castShadow = true;
    slab.receiveShadow = true;
    this.add(slab);

    // Skylight glass plane (optional)
    if (p.hasSkylight && p.hasSkylightGlass) {
      const bounds = Floor.getSkylightBounds(p);
      const sw = Math.min(p.skylightW, bounds.maxW) - 0.05; // tiny inset
      const sh = Math.min(p.skylightH, bounds.maxH) - 0.05;
      const sx = Math.min(Math.max(p.skylightX, bounds.minX), bounds.maxX);
      const sz = Math.min(Math.max(p.skylightZ, bounds.minZ), bounds.maxZ);

      const glass = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), this.glassMaterial);
      glass.name = 'Glass';
      glass.position.set(sx, p.thickness/2 + (p.glassOffset || 0.002), sz);
      glass.rotation.x = -Math.PI/2;
      this.add(glass);
    }
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };

    // clamp corners & edge bevels
    const crMax = Floor.getMaxCornerRadius(next);
    if (next.cornerRadius > crMax) next.cornerRadius = crMax;

    const erMax = Floor.getMaxEdgeRoundness(next);
    if (next.edgeRoundness > erMax) next.edgeRoundness = erMax;

    // skylight bounds
    const b = Floor.getSkylightBounds(next);
    next.skylightW = Math.min(next.skylightW, b.maxW);
    next.skylightH = Math.min(next.skylightH, b.maxH);
    next.skylightX = Math.min(Math.max(next.skylightX, b.minX), b.maxX);
    next.skylightZ = Math.min(Math.max(next.skylightZ, b.minZ), b.maxZ);

    this.userData.params = next;
    this.build();
  }

  dispose() {
    for (const c of this.children) if (c.geometry) c.geometry.dispose();
    this.clear();
  }
}
