// File: objects/towerbase.js
import * as THREE from 'three';
// --- FIX: Import mergeVertices ---
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// -----------------------------------------------------------------
// ---------- GEOMETRY HELPERS (Private to this module) ------------
// -----------------------------------------------------------------

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

function clampEdgeRoundnessInPlane(p) {
  const maxByWall = Math.max(0.01, p.wallThickness / 2 - 0.01);
  const maxByFoot = Math.max(0.01, Math.min(p.width, p.depth) * 0.25);
  return Math.min(p.edgeRoundness || 0, maxByWall, maxByFoot);
}

function clampEdgeRoundnessThickness(p) {
  const maxByH = Math.max(0.01, p.height / 4);
  const maxByT = Math.max(0.01, p.wallThickness / 1.5);
  return Math.min(p.edgeRoundness || 0, maxByH, maxByT);
}

// Note: This is now a private helper.
// The public-facing version is `TowerBase.getMaxDoorWidth(p)`
function _maxDoorWidth(sideLength, cornerRadius) {
  const eps = 0.05;
  const flat = Math.max(0, sideLength - 2 * cornerRadius);
  return Math.max(eps, flat - eps);
}

function unifiedShellGeometry(p, forceNoBevel = false) {
  const shapes = [];
  const eps = 0.01;
  // Use the static method for consistency
  const maxCorner = TowerBase.getMaxCornerRadius(p);
  const r = Math.min(Math.max(0, p.cornerRadius || 0), maxCorner);
  const ir = Math.max(0, r - p.wallThickness);

  const hw = p.width / 2;
  const hd = p.depth / 2;

  const flatX = p.width - 2 * r;
  const flatZ = p.depth - 2 * r;

  const doorWidths = {
    front: Math.min(_maxDoorWidth(p.width, r), p.doorWidthFront || 0),
    back: Math.min(_maxDoorWidth(p.width, r), p.doorWidthBack || 0),
    left: Math.min(_maxDoorWidth(p.depth, r), p.doorWidthLeft || 0),
    right: Math.min(_maxDoorWidth(p.depth, r), p.doorWidthRight || 0),
  };

  // Add corner sectors if r > 0
  if (r > 0.001) {
    // Helper to get point at angle
    const pointAt = (cx, cz, rr, angle) => new THREE.Vector2(
      cx + rr * Math.cos(angle),
      cz + rr * Math.sin(angle)
    );

    // Bottom-left corner (-x -z)
    const bl_cx = -hw + r;
    const bl_cz = -hd + r;
    const bl_outer_start_angle = Math.PI;
    const bl_outer_end_angle = 1.5 * Math.PI;
    const bl_inner_start_angle = bl_outer_end_angle;
    const bl_inner_end_angle = bl_outer_start_angle;
    const bl_shape = new THREE.Shape();
    const bl_outer_start_pt = pointAt(bl_cx, bl_cz, r, bl_outer_start_angle);
    bl_shape.moveTo(bl_outer_start_pt.x, bl_outer_start_pt.y);
    bl_shape.absarc(bl_cx, bl_cz, r, bl_outer_start_angle, bl_outer_end_angle, false);
    const bl_outer_end_pt = pointAt(bl_cx, bl_cz, r, bl_outer_end_angle);
    const bl_inner_end_pt = pointAt(bl_cx, bl_cz, ir, bl_outer_end_angle);
    bl_shape.lineTo(bl_inner_end_pt.x, bl_inner_end_pt.y);
    bl_shape.absarc(bl_cx, bl_cz, ir, bl_inner_start_angle, bl_inner_end_angle, true);
    const bl_inner_start_pt = pointAt(bl_cx, bl_cz, ir, bl_outer_start_angle);
    bl_shape.lineTo(bl_outer_start_pt.x, bl_outer_start_pt.y);
    shapes.push(bl_shape);

    // Bottom-right (+x -z)
    const br_cx = hw - r;
    const br_cz = -hd + r;
    const br_outer_start_angle = 1.5 * Math.PI;
    const br_outer_end_angle = 0;
    const br_inner_start_angle = br_outer_end_angle;
    const br_inner_end_angle = br_outer_start_angle;
    const br_shape = new THREE.Shape();
    const br_outer_start_pt = pointAt(br_cx, br_cz, r, br_outer_start_angle);
    br_shape.moveTo(br_outer_start_pt.x, br_outer_start_pt.y);
    br_shape.absarc(br_cx, br_cz, r, br_outer_start_angle, br_outer_end_angle, false);
    const br_outer_end_pt = pointAt(br_cx, br_cz, r, br_outer_end_angle);
    const br_inner_end_pt = pointAt(br_cx, br_cz, ir, br_outer_end_angle);
    br_shape.lineTo(br_inner_end_pt.x, br_inner_end_pt.y);
    br_shape.absarc(br_cx, br_cz, ir, br_outer_end_angle, br_outer_start_angle + 2 * Math.PI, true); // Adjust end to avoid long arc
    br_shape.lineTo(br_outer_start_pt.x, br_outer_start_pt.y);
    shapes.push(br_shape);

    // Top-right (+x +z)
    const tr_cx = hw - r;
    const tr_cz = hd - r;
    const tr_outer_start_angle = 0;
    const tr_outer_end_angle = 0.5 * Math.PI;
    const tr_inner_start_angle = tr_outer_end_angle;
    const tr_inner_end_angle = tr_outer_start_angle;
    const tr_shape = new THREE.Shape();
    const tr_outer_start_pt = pointAt(tr_cx, tr_cz, r, tr_outer_start_angle);
    tr_shape.moveTo(tr_outer_start_pt.x, tr_outer_start_pt.y);
    tr_shape.absarc(tr_cx, tr_cz, r, tr_outer_start_angle, tr_outer_end_angle, false);
    const tr_outer_end_pt = pointAt(tr_cx, tr_cz, r, tr_outer_end_angle);
    const tr_inner_end_pt = pointAt(tr_cx, tr_cz, ir, tr_outer_end_angle);
    tr_shape.lineTo(tr_inner_end_pt.x, tr_inner_end_pt.y);
    tr_shape.absarc(tr_cx, tr_cz, ir, tr_inner_start_angle, tr_inner_end_angle, true);
    tr_shape.lineTo(tr_outer_start_pt.x, tr_outer_start_pt.y);
    shapes.push(tr_shape);

    // Top-left (-x +z)
    const tl_cx = -hw + r;
    const tl_cz = hd - r;
    const tl_outer_start_angle = 0.5 * Math.PI;
    const tl_outer_end_angle = Math.PI;
    const tl_inner_start_angle = tl_outer_end_angle;
    const tl_inner_end_angle = tl_outer_start_angle;
    const tl_shape = new THREE.Shape();
    const tl_outer_start_pt = pointAt(tl_cx, tl_cz, r, tl_outer_start_angle);
    tl_shape.moveTo(tl_outer_start_pt.x, tl_outer_start_pt.y);
    tl_shape.absarc(tl_cx, tl_cz, r, tl_outer_start_angle, tl_outer_end_angle, false);
    const tl_outer_end_pt = pointAt(tl_cx, tl_cz, r, tl_outer_end_angle);
    const tl_inner_end_pt = pointAt(tl_cx, tl_cz, ir, tl_outer_end_angle);
    tl_shape.lineTo(tl_inner_end_pt.x, tl_inner_end_pt.y);
    tl_shape.absarc(tl_cx, tl_cz, ir, tl_inner_start_angle, tl_inner_end_angle, true);
    tl_shape.lineTo(tl_outer_start_pt.x, tl_outer_start_pt.y);
    shapes.push(tl_shape);
  }

  // Helper to add rectangular shape
  const addRectShape = (x1, z1, x2, z2) => {
    const shape = new THREE.Shape();
    shape.moveTo(x1, z1);
    shape.lineTo(x2, z1);
    shape.lineTo(x2, z2);
    shape.lineTo(x1, z2);
    shape.closePath();
    shapes.push(shape);
  };

  // Bottom side (-z)
  const bottom_outer_z = -hd;
  const bottom_inner_z = -hd + p.wallThickness;
  const bottom_left_x = -hw + r;
  const bottom_right_x = hw - r;
  if (doorWidths.back > 0) {
    const door_left_x = -doorWidths.back / 2;
    const door_right_x = doorWidths.back / 2;
    // Left segment
    if (bottom_left_x < door_left_x) {
      addRectShape(bottom_left_x, bottom_outer_z, door_left_x, bottom_inner_z);
    }
    // Right segment
    if (door_right_x < bottom_right_x) {
      addRectShape(door_right_x, bottom_outer_z, bottom_right_x, bottom_inner_z);
    }
  } else {
    addRectShape(bottom_left_x, bottom_outer_z, bottom_right_x, bottom_inner_z);
  }

  // Top side (+z)
  const top_outer_z = hd;
  const top_inner_z = hd - p.wallThickness;
  const top_left_x = -hw + r;
  const top_right_x = hw - r;
  if (doorWidths.front > 0) {
    const door_left_x = -doorWidths.front / 2;
    const door_right_x = doorWidths.front / 2;
    // Left segment
    if (top_left_x < door_left_x) {
      addRectShape(top_left_x, top_inner_z, door_left_x, top_outer_z);
    }
    // Right segment
    if (door_right_x < top_right_x) {
      addRectShape(door_right_x, top_inner_z, top_right_x, top_outer_z);
    }
  } else {
    addRectShape(top_left_x, top_inner_z, top_right_x, top_outer_z);
  }

  // Left side (-x)
  const left_outer_x = -hw;
  const left_inner_x = -hw + p.wallThickness;
  const left_bottom_z = -hd + r;
  const left_top_z = hd - r;
  if (doorWidths.left > 0) {
    const door_bottom_z = -doorWidths.left / 2;
    const door_top_z = doorWidths.left / 2;
    // Bottom segment
    if (left_bottom_z < door_bottom_z) {
      addRectShape(left_outer_x, left_bottom_z, left_inner_x, door_bottom_z);
    }
    // Top segment
    if (door_top_z < left_top_z) {
      addRectShape(left_outer_x, door_top_z, left_inner_x, left_top_z);
    }
  } else {
    addRectShape(left_outer_x, left_bottom_z, left_inner_x, left_top_z);
  }

  // Right side (+x)
  const right_outer_x = hw;
  const right_inner_x = hw - p.wallThickness;
  const right_bottom_z = -hd + r;
  const right_top_z = hd - r;
  if (doorWidths.right > 0) {
    const door_bottom_z = -doorWidths.right / 2;
    const door_top_z = doorWidths.right / 2;
    // Bottom segment
    if (right_bottom_z < door_bottom_z) {
      addRectShape(right_inner_x, right_bottom_z, right_outer_x, door_bottom_z);
    }
    // Top segment
    if (door_top_z < right_top_z) {
      addRectShape(right_inner_x, door_top_z, right_outer_x, right_top_z);
    }
  } else {
    addRectShape(right_inner_x, right_bottom_z, right_outer_x, right_top_z);
  }

  const bevelEnabled = !forceNoBevel && (p.edgeRoundness || 0) > 0;
  const extrudeSettings = {
    depth: p.height,
    steps: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelEnabled,
    bevelSegments: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelSize: bevelEnabled ? clampEdgeRoundnessInPlane(p) : 0,
    bevelThickness: bevelEnabled ? clampEdgeRoundnessThickness(p) : 0,
    curveSegments: Math.max(8, Math.floor(p.cornerSmoothness || 16))
  };

  let geo = new THREE.ExtrudeGeometry(shapes, extrudeSettings);
  
  // --- FIX: Merge vertices to prevent splitting with displacement maps ---
  geo = mergeVertices(geo);
  // --- END FIX ---
  
  geo.translate(0, 0, -p.height / 2);
  geo.rotateX(-Math.PI / 2); // make Y up
  geo.computeVertexNormals();
  return geo;
}

// -----------------------------------------------------------------
// ---------- EXPORTED TOWER BASE CLASS ----------------------------
// -----------------------------------------------------------------

export default class TowerBase extends THREE.Group {
  
  // --- Static methods for UI ---
  /** Calculates max corner radius for sliders */
  static getMaxCornerRadius(p) {
    const eps = 0.01;
    return Math.max(0, Math.min(p.width, p.depth) / 2 - p.wallThickness - eps);
  }
  
  /** Calculates max edge roundness for sliders */
  static getMaxEdgeRoundness(p) {
    return Math.max(0.05, Math.min(p.wallThickness / 2 - 0.01, p.height / 4));
  }
  
  /** Calculates max door width for sliders */
  static getMaxDoorWidth(p) {
    const eps = 0.05;
    const flat = Math.max(0, p.width - 2 * p.cornerRadius);
    // Return 0 if the corner radius is too large, otherwise the max flat width
    return (p.width - 2 * p.cornerRadius) < eps ? 0 : Math.max(eps, flat - eps);
  }

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'TowerBase';

    const defaultParams = {
      width: 12,
      depth: 12,
      height: 6,
      wallThickness: 1,
      cornerRadius: 1.2,
      cornerSmoothness: 16,
      edgeRoundness: 0.3,
      edgeSmoothness: 4,
      doorWidthFront: 4,
      doorWidthBack: 0,
      doorWidthLeft: 0,
      doorWidthRight: 0
    };

    // Legacy fix
    if (params.doorWidth && !params.doorWidthFront) {
      params.doorWidthFront = params.doorWidth;
    }

    this.material = params.material || new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.7,
      metalness: 0.1
    });

    this.userData.params = { ...defaultParams, ...params };
    delete this.userData.params.material; 

    this.build();
  }

  build() {
    for (const c of this.children) {
      c.geometry && c.geometry.dispose();
    }
    this.clear();
    const p = this.userData.params;
    let shellGeo = unifiedShellGeometry(p, false);
    const resultMesh = new THREE.Mesh(shellGeo, this.material);
    resultMesh.name = 'Shell';
    resultMesh.castShadow = true;
    resultMesh.receiveShadow = true;
    this.add(resultMesh);
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };

    // Apply constraints
    const crMax = TowerBase.getMaxCornerRadius(next);
    if (next.cornerRadius > crMax) next.cornerRadius = crMax;

    // Clamp door widths
    const maxDoorX = TowerBase.getMaxDoorWidth({width: next.width, cornerRadius: next.cornerRadius});
    next.doorWidthFront = Math.min(next.doorWidthFront, maxDoorX);
    next.doorWidthBack = Math.min(next.doorWidthBack, maxDoorX);

    const maxDoorZ = TowerBase.getMaxDoorWidth({width: next.depth, cornerRadius: next.cornerRadius});
    next.doorWidthLeft = Math.min(next.doorWidthLeft, maxDoorZ);
    next.doorWidthRight = Math.min(next.doorWidthRight, maxDoorZ);

    this.userData.params = next;
    this.build();
  }
  
  dispose() {
    for (const c of this.children) {
      if (c.geometry) {
        c.geometry.dispose();
      }
    }
    this.clear();
  }
}