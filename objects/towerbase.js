// File: objects/towerbase.js
import * as THREE from 'three';

// -----------------------------------------------------------------
// ---------- GEOMETRY HELPERS (Private) ---------------------------
// -----------------------------------------------------------------

/**
 * Creates a THREE.Path for a 2D rounded rectangle.
 * @param {number} w Width
 * @param {number} d Depth
 * @param {number} r Corner Radius
 * @returns {THREE.Path}
 */
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

/**
 * Creates the complete XZ shape for the tower walls, including one door gap.
 */
function createWallShape(p) {
    const eps = 0.01;
    const crMax = TowerBase.getMaxCornerRadius(p);
    const rr = Math.min(Math.max(0, p.cornerRadius || 0), crMax);
    
    const w = p.width, d = p.depth;
    const hw = w / 2, hd = d / 2;
    
    const iw = Math.max(eps, w - 2 * p.wallThickness);
    const id = Math.max(eps, d - 2 * p.wallThickness);
    const ihw = iw / 2, ihd = id / 2;
    const ir = Math.max(0, rr - p.wallThickness);

    // Clamp door width
    const doorW = Math.min(p.doorWidth, TowerBase.getMaxDoorWidth(p));
    const hasFrontDoor = doorW > 0;

    const doorF_L = -doorW / 2; // Front door Left X
    const doorF_R =  doorW / 2; // Front door Right X
    
    const shape = new THREE.Shape();

    // --- 1. Outer Path (Clockwise) ---
    shape.moveTo(doorF_L, hd); // Start at left edge of front door

    // Top-Left Corner
    shape.lineTo(-hw + rr, hd);
    shape.absarc(-hw + rr, hd - rr, rr, Math.PI / 2, Math.PI, false);

    // Left Side
    shape.lineTo(-hw, -hd + rr);

    // Bottom-Left Corner
    shape.absarc(-hw + rr, -hd + rr, rr, Math.PI, 1.5 * Math.PI, false);

    // Bottom Side
    shape.lineTo(hw - rr, -hd);

    // Bottom-Right Corner
    shape.absarc(hw - rr, -hd + rr, rr, 1.5 * Math.PI, 2 * Math.PI, false);

    // Right Side
    shape.lineTo(hw, hd - rr);

    // Top-Right Corner
    shape.absarc(hw - rr, hd - rr, rr, 0, Math.PI / 2, false);
    
    // Front Side (ends at right edge of front door)
    shape.lineTo(doorF_R, hd);

    // --- 2. Inner Path (Counter-Clockwise) ---
    if (!hasFrontDoor) {
        // If no front door, just close the outer loop and add a simple inner hole
        shape.closePath();
        shape.holes.push(roundedRectPath(iw, id, ir));
        return shape;
    }
    
    // Bridge from outer to inner wall at front-right door edge
    shape.lineTo(doorF_R, ihd);

    // Top-Right Inner Corner
    shape.lineTo(ihw - ir, ihd);
    shape.absarc(ihw - ir, ihd - ir, ir, Math.PI / 2, 0, true);

    // Right Inner Wall
    shape.lineTo(ihw, -ihd + ir);

    // Bottom-Right Inner Corner
    shape.absarc(ihw - ir, -ihd + ir, ir, 0, -Math.PI / 2, true);

    // Bottom Inner Wall
    shape.lineTo(-ihw + ir, -ihd);

    // Bottom-Left Inner Corner
    shape.absarc(-ihw + ir, -ihd + ir, ir, -Math.PI / 2, -Math.PI, true);

    // Left Inner Wall
    shape.lineTo(-ihw, ihd - ir);

    // Top-Left Inner Corner
    shape.absarc(-ihw + ir, ihd - ir, ir, Math.PI, Math.PI / 2, true);

    // Top Inner Wall (to front-left door edge)
    shape.lineTo(doorF_L, ihd);
    
    // Bridge from inner to outer wall at front-left door edge
    shape.lineTo(doorF_L, hd);
    
    return shape;
}

// -----------------------------------------------------------------
// -------------------- ORIGINAL TOWER BASE CLASS ------------------
// -----------------------------------------------------------------

export default class TowerBase extends THREE.Group {

    // --- Static methods for UI constraints ---
    static getMaxCornerRadius(p) {
        const eps = 0.01;
        return Math.max(0, Math.min(p.width, p.depth) / 2 - p.wallThickness - eps);
    }
    static getMaxEdgeRoundness(p) {
        return Math.max(0.05, Math.min(p.wallThickness / 2 - 0.01, p.height / 4));
    }
    static getMaxDoorWidth(p) {
        const eps = 0.05;
        const flat = Math.max(0, p.width - 2 * p.cornerRadius);
        return (p.width - 2 * p.cornerRadius) < eps ? 0 : Math.max(eps, flat - eps);
    }

    constructor(params = {}) {
        super();
        this.userData.isModel = true;
        this.userData.type = 'TowerBase';

        const defaults = {
            width: 12,
            depth: 12,
            height: 8,
            wallThickness: 1,
            cornerRadius: 1.2,
            cornerSmoothness: 16,
            edgeRoundness: 0.3,
            edgeSmoothness: 4,
            doorWidth: 4,
        };

        this.userData.params = { ...defaults, ...params };

        this.material = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.8,
            metalness: 0.1
        });

        this.build();
    }

    build() {
        // Dispose old geometry
        this.traverse(n => {
            if (n.isMesh) n.geometry?.dispose();
        });
        this.clear();

        const p = this.userData.params;

        // --- 1. Main Wall ---
        const wallShape = createWallShape(p);
        const bevelEnabled = (p.edgeRoundness || 0) > 0;
        const extrudeSettings = {
            depth: p.height,
            steps: 1,
            bevelEnabled,
            bevelSegments: Math.max(1, Math.floor(p.edgeSmoothness || 1)),
            bevelSize: bevelEnabled ? Math.min(p.edgeRoundness, p.wallThickness / 2 - 0.01, p.height / 4) : 0,
            bevelThickness: bevelEnabled ? Math.min(p.edgeRoundness, p.wallThickness / 2 - 0.01, p.height / 4) : 0,
            curveSegments: Math.max(8, Math.floor(p.cornerSmoothness || 16))
        };
        const wallGeo = new THREE.ExtrudeGeometry(wallShape, extrudeSettings);
        wallGeo.translate(0, 0, -p.height / 2); // Center on Z
        wallGeo.rotateX(-Math.PI / 2); // Orient Y up
        wallGeo.computeVertexNormals();
        
        const wall = new THREE.Mesh(wallGeo, this.material);
        wall.name = 'MainWallShell';
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.add(wall);
    }

    updateParams(next) {
        // Merge new params, ensuring constraints are respected
        next = { ...this.userData.params, ...next };

        const crMax = TowerBase.getMaxCornerRadius(next);
        if (next.cornerRadius > crMax) next.cornerRadius = crMax;

        if (next.doorWidth > 0) {
            const dwMax = TowerBase.getMaxDoorWidth(next);
            if (next.doorWidth > dwMax) next.doorWidth = dwMax;
        }

        this.userData.params = next;
        this.build();
    }

    dispose() {
        this.traverse(n => {
            if (n.geometry) n.geometry.dispose();
        });
        this.material?.dispose();
        this.clear();
    }
}
