/*
File: src/modifiers.js
*/
// Structure rebuild (RoundedBox) + non-affine deforms + noise irregularity

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SubdivisionModifier } from 'three/addons/modifiers/SubdivisionModifier.js';

export function rebuildRoundedBox(mesh, mods) {
  const seg = THREE.MathUtils.clamp(Math.floor(mods.bevelSegments || 1), 1, 6);
  const rad = THREE.MathUtils.clamp(mods.bevelRadius || 0, 0, 0.49);
  let geo = new RoundedBoxGeometry(1, 1, 1, Math.max(1, seg), rad);

  // Emulate per-axis face resolution with a light Catmull–Clark pass
  const extra = (mods.resX>2) + (mods.resY>2) + (mods.resZ>2);
  const totalSubdiv = THREE.MathUtils.clamp((mods.subdivLevel||0) + extra, 0, 3);
  if (totalSubdiv > 0) {
    const mod = new SubdivisionModifier(totalSubdiv);
    geo = mod.modify(geo);
  }

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
  const src = mesh.userData._basePositions || pos.array.slice();
  const dst = pos.array;

  const twistRad = THREE.MathUtils.degToRad(mods.twistY || 0);
  const bendXRad = THREE.MathUtils.degToRad(mods.bendX || 0);
  const bendZRad = THREE.MathUtils.degToRad(mods.bendZ || 0);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    let x0 = src[i3 + 0];
    let y0 = src[i3 + 1];
    let z0 = src[i3 + 2];

    const tY = y0 + 0.5;

    // Taper
    const taper = (mods.taperBottom ?? 1) * (1 - tY) + (mods.taperTop ?? 1) * tY;
    let x = x0 * taper;
    let y = y0;
    let z = z0 * taper;

    // Tilt (skew by Y)
    x += (mods.tiltX || 0) * y0;
    z += (mods.tiltY || 0) * y0;

    // Shear
    x += (mods.shearX || 0) * z0;
    y += (mods.shearY || 0) * x0;
    z += (mods.shearZ || 0) * x0;

    // Twist around Y
    if (twistRad) {
      const a = twistRad * (tY - 0.5);
      const cs = Math.cos(a), sn = Math.sin(a);
      const tx = x * cs - z * sn;
      const tz = x * sn + z * cs;
      x = tx; z = tz;
    }

    // Bend X (rotate around Z as f(x0))
    if (bendXRad) {
      const a = bendXRad * (x0);
      const cs = Math.cos(a), sn = Math.sin(a);
      const ty = y * cs - z * sn;
      const tz = y * sn + z * cs;
      y = ty; z = tz;
    }

    // Bend Z (rotate around X as f(z0))
    if (bendZRad) {
      const a = bendZRad * (z0);
      const cs = Math.cos(a), sn = Math.sin(a);
      const ty = y * cs - x * sn;
      const tx = y * sn + x * cs;
      y = ty; x = tx;
    }

    // Bulge / Pinch (radial in XZ)
    if (mods.bulge) {
      const r = Math.hypot(x, z);
      const k = smoothstep(0.0, 0.6, r);
      const factor = 1 + (mods.bulge || 0) * (1 - k);
      x *= factor; z *= factor;
    }

    dst[i3 + 0] = x;
    dst[i3 + 1] = y;
    dst[i3 + 2] = z;
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();

  // Edge Noise / Irregularity (normal-directed)
  const nStrength = mods.noiseStrength || 0;
  if (nStrength) {
    const normals = geo.attributes.normal;
    const scale = Math.max(0.001, mods.noiseScale || 2.0);
    const seed = (mods.noiseSeed || 1) >>> 0;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const px = dst[i3 + 0], py = dst[i3 + 1], pz = dst[i3 + 2];
      const nx = normals.array[i3 + 0], ny = normals.array[i3 + 1], nz = normals.array[i3 + 2];
      const n = valueNoise3(px * scale, py * scale, pz * scale, seed);
      const amp = nStrength * (n * 2 - 1);
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