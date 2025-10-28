/*
File: src/modifiers.js
*/
// modifiers.js — rounded box (struct) + non-affine deforms + noise

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SubdivisionModifier } from 'three/addons/modifiers/SubdivisionModifier.js';

const TMP_V = new THREE.Vector3();
const TMP_V2 = new THREE.Vector3();

export function rebuildRoundedBox(mesh, mods) {
  // Structural parameters
  const rx = Math.max(1, Math.floor(mods.resX || 1));
  const ry = Math.max(1, Math.floor(mods.resY || 1));
  const rz = Math.max(1, Math.floor(mods.resZ || 1));
  const seg = THREE.MathUtils.clamp(Math.floor(mods.bevelSegments || 1), 1, 6);
  const rad = THREE.MathUtils.clamp(mods.bevelRadius || 0, 0, 0.49);

  // Build base geometry (unit box)
  let geo = new RoundedBoxGeometry(1, 1, 1, Math.max(1, seg), rad);
  // Increase per-face resolution by subdividing the flat faces,
  // approximate via simple BoxGeometry merge & averaging? Better: re-create
  // RoundedBox doesn't expose per-axis face resolution; emulate by applying
  // linear subdivisions with SubdivisionModifier at low levels when needed.
  // We still respect rx/ry/rz by adding a BoxGeometry to remap vertices density.
  // Practical approach: if any res>2, apply SubdivisionModifier n times.
  const extra = Math.max(0,
    (rx>2?1:0) + (ry>2?1:0) + (rz>2?1:0)
  );
  const totalSubdiv = THREE.MathUtils.clamp((mods.subdivLevel||0) + extra, 0, 3);

  if (totalSubdiv > 0) {
    const mod = new SubdivisionModifier(totalSubdiv);
    geo = mod.modify(geo);
  }

  // Install new geometry
  mesh.geometry.dispose?.();
  mesh.geometry = geo;
  mesh.geometry.computeVertexNormals();
  mesh.userData._basePositions = geo.attributes.position.array.slice();
  mesh.userData._structCache = {
    resX: mods.resX, resY: mods.resY, resZ: mods.resZ,
    bevelRadius: mods.bevelRadius,
    bevelSegments: mods.bevelSegments,
    subdivLevel: mods.subdivLevel
  };
}

export function ensureStructure(mesh, mods) {
  const c = mesh.userData._structCache || {};
  if (
    c.resX !== mods.resX ||
    c.resY !== mods.resY ||
    c.resZ !== mods.resZ ||
    c.bevelRadius !== mods.bevelRadius ||
    c.bevelSegments !== mods.bevelSegments ||
    c.subdivLevel !== mods.subdivLevel
  ) {
    rebuildRoundedBox(mesh, mods);
  }
}

export function applyDeforms(mesh, mods) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const count = pos.count;
  const src = mesh.userData._basePositions;
  if (!src || src.length !== pos.array.length) {
    // Safety: if base is missing (e.g., loaded scene), capture it.
    mesh.userData._basePositions = pos.array.slice();
  }

  // Precompute degrees->radians
  const twistRad = THREE.MathUtils.degToRad(mods.twistY || 0);
  const bendXRad = THREE.MathUtils.degToRad(mods.bendX || 0);
  const bendZRad = THREE.MathUtils.degToRad(mods.bendZ || 0);

  // For noise we want normals of the *pre-noise* surface
  geo.computeVertexNormals();
  const normals = geo.attributes.normal;

  // Work buffer
  const dst = pos.array;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    let x0 = src[i3 + 0];
    let y0 = src[i3 + 1];
    let z0 = src[i3 + 2];

    // Normalized coordinates (unit cube ~ [-0.5..0.5])
    const tY = y0 + 0.5; // 0..1 across height
    const nx = (x0 + 0.5); // 0..1
    const nz = (z0 + 0.5); // 0..1

    // --- Taper top/bottom (scale XZ by Y)
    const taper = (mods.taperBottom ?? 1) * (1 - tY) + (mods.taperTop ?? 1) * tY;
    let x = x0 * taper;
    let y = y0;
    let z = z0 * taper;

    // --- Tilt (skew by height)
    x += (mods.tiltX || 0) * y0;
    z += (mods.tiltY || 0) * y0;

    // --- Shear (linear)
    x += (mods.shearX || 0) * z0;
    y += (mods.shearY || 0) * x0;
    z += (mods.shearZ || 0) * x0;

    // --- Twist around Y (angle varies with height)
    if (twistRad !== 0) {
      const a = twistRad * (tY - 0.5); // center the twist
      const cs = Math.cos(a), sn = Math.sin(a);
      const tx = x * cs - z * sn;
      const tz = x * sn + z * cs;
      x = tx; z = tz;
    }

    // --- Bend along X (rotate around Z as a function of X)
    if (bendXRad !== 0) {
      const a = bendXRad * (x0); // -0.5..0.5 => negative to positive
      const cs = Math.cos(a), sn = Math.sin(a);
      const ty = y * cs - z * sn;
      const tz = y * sn + z * cs;
      y = ty; z = tz;
    }

    // --- Bend along Z (rotate around X as a function of Z)
    if (bendZRad !== 0) {
      const a = bendZRad * (z0);
      const cs = Math.cos(a), sn = Math.sin(a);
      const ty = y * cs - x * sn;
      const tx = y * sn + x * cs;
      y = ty; x = tx;
    }

    // --- Bulge / Pinch (radial in XZ)
    const r = Math.hypot(x, z);
    if (mods.bulge) {
      // smooth falloff within ~0.6 radius
      const k = smoothstep(0.0, 0.6, r);
      const factor = 1 + (mods.bulge || 0) * (1 - k);
      x *= factor; z *= factor;
    }

    dst[i3 + 0] = x;
    dst[i3 + 1] = y;
    dst[i3 + 2] = z;
  }

  // Recompute normals before noise displacement
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  // --- Noise displacement along normals
  const nStrength = mods.noiseStrength || 0;
  if (nStrength !== 0) {
    const scale = Math.max(0.001, mods.noiseScale || 2.0);
    const seed = (mods.noiseSeed || 1) >>> 0;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const px = dst[i3 + 0], py = dst[i3 + 1], pz = dst[i3 + 2];
      const nx = normals.array[i3 + 0], ny = normals.array[i3 + 1], nz = normals.array[i3 + 2];

      const n = valueNoise3(px * scale, py * scale, pz * scale, seed);
      const amp = nStrength * (n * 2 - 1); // center around 0

      dst[i3 + 0] = px + nx * amp;
      dst[i3 + 1] = py + ny * amp;
      dst[i3 + 2] = pz + nz * amp;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  geo.boundingBox = null;
  geo.boundingSphere = null;
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
}

function smoothstep(a, b, x) {
  const t = THREE.MathUtils.clamp((x - a) / Math.max(1e-6, b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

// Coherent value noise with trilinear interpolation + seeded hashing
function hash32(x, y, z, seed) {
  let h = seed ^ (x * 374761393) ^ (y * 668265263) ^ (z * 2147483647);
  h = (h ^ (h >>> 13)) * 1274126177;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967295;
}
function valueNoise3(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);

  function h(xx, yy, zz) { return hash32(xx, yy, zz, seed); }

  const c000 = h(xi+0, yi+0, zi+0);
  const c100 = h(xi+1, yi+0, zi+0);
  const c010 = h(xi+0, yi+1, zi+0);
  const c110 = h(xi+1, yi+1, zi+0);
  const c001 = h(xi+0, yi+0, zi+1);
  const c101 = h(xi+1, yi+0, zi+1);
  const c011 = h(xi+0, yi+1, zi+1);
  const c111 = h(xi+1, yi+1, zi+1);

  const x00 = THREE.MathUtils.lerp(c000, c100, u);
  const x10 = THREE.MathUtils.lerp(c010, c110, u);
  const x01 = THREE.MathUtils.lerp(c001, c101, u);
  const x11 = THREE.MathUtils.lerp(c011, c111, u);

  const y0 = THREE.MathUtils.lerp(x00, x10, v);
  const y1 = THREE.MathUtils.lerp(x01, x11, v);

  return THREE.MathUtils.lerp(y0, y1, w);
}