// File: objects/window.js
import * as THREE from 'three';
// --- FIX: Import mergeVertices ---
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- Geometry helpers ----------
function roundedRectPath(w, h, r) {
  const hw = w / 2, hh = h / 2, rr = Math.max(0, Math.min(r, hw, hh));
  const p = new THREE.Path();
  p.moveTo(-hw + rr, -hh);
  p.lineTo( hw - rr, -hh);
  p.absarc( hw - rr, -hh + rr, rr, -Math.PI/2, 0, false);
  p.lineTo( hw,  hh - rr);
  p.absarc( hw - rr,  hh - rr, rr, 0, Math.PI/2, false);
  p.lineTo(-hw + rr,  hh);
  p.absarc(-hw + rr,  hh - rr, rr, Math.PI/2, Math.PI, false);
  p.lineTo(-hw, -hh + rr);
  p.absarc(-hw + rr, -hh + rr, rr, Math.PI, 1.5*Math.PI, false);
  p.closePath();
  return p;
}

function clampEdgeRoundnessInPlane(p) {
  const maxByFrame = Math.max(0.01, p.frameThickness / 2 - 0.01);
  const maxByFoot  = Math.max(0.01, Math.min(p.totalWidth, p.height) * 0.25);
  return Math.min(p.edgeRoundness || 0, maxByFrame, maxByFoot);
}
function clampEdgeRoundnessThickness(p) {
  const maxByH = Math.max(0.01, p.height / 4);
  const maxByT = Math.max(0.01, p.depth / 1.5);
  return Math.min(p.edgeRoundness || 0, maxByH, maxByT);
}

// Build a proper Shape for the window (outline + hole)
function windowShape(p) {
  const outerW = p.totalWidth;
  const outerH = p.height;
  const glassW  = outerW - 2 * p.frameThickness;
  const glassH  = p.height - 2 * p.frameThickness;
  
  const outerR = p.cornerRadius;
  // --- MODIFIED: Inner radius is now a separate parameter ---
  const innerR = Math.max(0, Math.min(p.innerCornerRadius, glassW / 2, glassH / 2));

  const outerPath = roundedRectPath(outerW, outerH, outerR);
  const shape = new THREE.Shape( outerPath.getPoints() );

  const innerPath = roundedRectPath(
    Math.max(0.01, glassW),
    Math.max(0.01, glassH),
    innerR // Use the new independent inner radius
  );
  shape.holes.push(innerPath);
  return shape;
}

function unifiedWindowGeometry(p, forceNoBevel = false) {
  const shape = windowShape(p);
  const bevelEnabled = !forceNoBevel && (p.edgeRoundness || 0) > 0;
  
  // --- MODIFIED: Added steps for bending ---
  const steps = (p.bendAngle !== 0) ? Math.max(2, Math.floor(p.cornerSmoothness / 2)) : 1;

  const extrudeSettings = {
   depth: p.depth,
    steps: steps, // Added steps
    bevelEnabled,
    bevelSegments: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
    bevelSize: bevelEnabled ? clampEdgeRoundnessInPlane(p) : 0,
    bevelThickness: bevelEnabled ? clampEdgeRoundnessThickness(p) : 0,
    curveSegments: Math.max(8, Math.floor(p.cornerSmoothness || 16))
  };

  let geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  
  // --- FIX: Merge vertices to prevent splitting with displacement maps ---
  geo = mergeVertices(geo);
  // --- END FIX ---
  
  geo.translate(0, 0, -p.depth / 2);
  geo.computeVertexNormals();
  return geo;
}

// ---------- Window (renamed to avoid global clash) ----------
export default class WindowFrame extends THREE.Group {
  static getMaxCornerRadius(p) {
    const eps = 0.01;
    return Math.max(0, Math.min(p.totalWidth / 2, p.height / 2) - p.frameThickness - eps);
  }
  static getMaxInnerCornerRadius(p) {
    const eps = 0.01;
    const glassW = Math.max(eps, p.totalWidth - 2 * p.frameThickness);
    const glassH = Math.max(eps, p.height - 2 * p.frameThickness);
    return Math.max(0, Math.min(glassW / 2, glassH / 2) - eps);
  }
  static getMaxEdgeRoundness(p) {
    return Math.max(0.05, Math.min(p.frameThickness / 2 - 0.01, p.height / 4, p.depth / 2));
  }

  constructor(params = {}) {
    super();
    this.userData.isModel = true;
    this.userData.type = 'Window';

    const defaults = {
      totalWidth: 6,
      height: 8,
      depth: 0.3,
      frameThickness: 0.4,
      cornerRadius: 0.1,
      cornerSmoothness: 16,
      edgeRoundness: 0.05,
      edgeSmoothness: 4,
      // --- NEW PARAMS ---
      innerCornerRadius: 0.1,
      vertPanes: 1,
      horizPanes: 1,
      mullionThickness: 0.1,
      bendAngle: 0,
      bendStartY: 0.5,
      // --- END NEW ---
      glassR: 0.8, glassG: 0.8, glassB: 1,
      glassOpacity: 0.3,
      glassRoughness: 0.1
    };
    this.userData.params = { ...defaults, ...params };

    this.frameMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7, metalness: 0.1 });
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.8,0.8,1),
      transparent: true,
      opacity: 0.3,
      transmission: 0.9,
      roughness: 0.1,
      metalness: 0,
      side: THREE.DoubleSide
    });
    this.barMaterial  = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.6, metalness: 0.7 });

    this.build();
  }

  build() {
    for (const c of this.children) c.geometry && c.geometry.dispose();
    this.clear();

    const p = this.userData.params;

    // glass material tweaks
    this.glassMaterial.color.setRGB(p.glassR, p.glassG, p.glassB);
    this.glassMaterial.opacity      = p.glassOpacity;
    this.glassMaterial.transmission = 1 - p.glassOpacity * 0.2;
    this.glassMaterial.roughness    = p.glassRoughness;
    
    // Frame
    const frameGeo = unifiedWindowGeometry(p);
    const frame = new THREE.Mesh(frameGeo, this.frameMaterial);
    frame.name = 'Frame';
    frame.castShadow = true; frame.receiveShadow = true;
    this.add(frame);

    // Glass
    const glassW = Math.max(0.01, p.totalWidth - 2 * p.frameThickness);
    const glassH = Math.max(0.01, p.height - 2 * p.frameThickness);
    
    // --- MODIFIED: Add segments for bending ---
    const hSegs = (p.bendAngle !== 0) ? Math.max(2, Math.floor(p.cornerSmoothness / 2)) : 1;
    const glassGeo = new THREE.PlaneGeometry(glassW, glassH, 1, hSegs);
    const glass  = new THREE.Mesh(glassGeo, this.glassMaterial);
    glass.name = 'Glass';
    glass.position.set(0, 0, 0);
    this.add(glass);

    // --- NEW: Mullions (Panes) ---
    const vPanes = Math.max(1, Math.floor(p.vertPanes));
    const hPanes = Math.max(1, Math.floor(p.horizPanes));
    const mThick = p.mullionThickness;
    const mDepth = p.depth * 0.8; // Make mullions slightly thinner than frame

    // Vertical Mullions
    if (vPanes > 1) {
      const vSpacing = glassW / vPanes;
      for (let i = 1; i < vPanes; i++) {
        const x = -glassW / 2 + i * vSpacing;
        // --- FIX: Merge vertices ---
        const mGeo = mergeVertices(new THREE.BoxGeometry(mThick, glassH, mDepth, 1, hSegs, 1));
        const mullion = new THREE.Mesh(mGeo, this.barMaterial);
        mullion.name = `Mullion_V_${i}`;
        mullion.position.set(x, 0, 0);
        this.add(mullion);
      }
    }
    
    // Horizontal Mullions
    if (hPanes > 1) {
      const hSpacing = glassH / hPanes;
      for (let i = 1; i < hPanes; i++) {
        const y = -glassH / 2 + i * hSpacing;
        // --- FIX: Merge vertices ---
        const mGeo = mergeVertices(new THREE.BoxGeometry(glassW, mThick, mDepth, 1, hSegs, 1));
        const mullion = new THREE.Mesh(mGeo, this.barMaterial);
        mullion.name = `Mullion_H_${i}`;
        mullion.position.set(0, y, 0);
        this.add(mullion);
      }
    }

    // --- NEW: Apply Bend ---
    if (p.bendAngle !== 0) {
      this.children.forEach(child => {
        if (child.geometry) {
          this.applyDeformations(child.geometry, p);
        }
      });
    }
  }

  /**
   * Applies vertex deformations for bend.
   */
  applyDeformations(geometry, p) {
    const pos = geometry.attributes.position;
    const halfHeight = p.height / 2;
    const bendRad = THREE.MathUtils.degToRad(p.bendAngle);

    const bendStartWorldY = -halfHeight + p.bendStartY * p.height;
    const bendEndWorldY = halfHeight;
    const bendRange = bendEndWorldY - bendStartWorldY;

    const tempVec = new THREE.Vector3();
    const bendAxis = new THREE.Vector3(1, 0, 0); // Bend around X-axis
    const tempQuat = new THREE.Quaternion();

    for (let i = 0; i < pos.count; i++) {
      tempVec.fromBufferAttribute(pos, i);
      
      const originalY = tempVec.y;

      if (bendRad !== 0 && originalY >= bendStartWorldY && bendRange > 0.001) {
        const bendT = Math.max(0, (originalY - bendStartWorldY)) / bendRange; // 0.0 to 1.0
        const theta = bendRad * bendT;
        
        tempVec.y -= bendStartWorldY; 
        tempQuat.setFromAxisAngle(bendAxis, theta);
        tempVec.applyQuaternion(tempQuat);
        tempVec.y += bendStartWorldY;
      }

      pos.setXYZ(i, tempVec.x, tempVec.y, tempVec.z);
    }
    
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  updateParams(next) {
    next = { ...this.userData.params, ...next };
    
    const crMax = WindowFrame.getMaxCornerRadius(next);
    if (next.cornerRadius > crMax) next.cornerRadius = crMax;
    
    const icrMax = WindowFrame.getMaxInnerCornerRadius(next);
    if (next.innerCornerRadius > icrMax) next.innerCornerRadius = icrMax;
    
    const erMax = WindowFrame.getMaxEdgeRoundness(next);
    if (next.edgeRoundness > erMax) next.edgeRoundness = erMax;
    
    this.userData.params = next;
    this.build();
  }

  dispose() {
    for (const c of this.children) if (c.geometry) c.geometry.dispose();
    this.clear();
  }
}
