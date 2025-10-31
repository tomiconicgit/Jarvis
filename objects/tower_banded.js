// File: objects/tower_banded.js
import * as THREE from 'three';

// -----------------------------------------------------------------
// ---------- GEOMETRY HELPERS (Copied from tower_sculpted.js) -----
// -----------------------------------------------------------------

/**
 * Creates a THREE.Path for a 2D rounded rectangle.
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
 * Creates the complete XZ shape for the tower walls, including door gaps.
 */
function createWallShape(p, constraints) {
    const eps = 0.01;
    const { crMax, doorW_Front_Max, doorW_Side_Max } = constraints;
    const rr = Math.min(Math.max(0, p.cornerRadius || 0), crMax);
    
    const w = p.width, d = p.depth;
    const hw = w / 2, hd = d / 2;
    
    const iw = Math.max(eps, w - 2 * p.wallThickness);
    const id = Math.max(eps, d - 2 * p.wallThickness);
    const ihw = iw / 2, ihd = id / 2;
    const ir = Math.max(0, rr - p.wallThickness);

    const doorW_Front = Math.min(p.doorWidthFront, doorW_Front_Max);
    const doorW_Side  = Math.min(p.doorWidthSide, doorW_Side_Max);

    const hasFrontDoor = doorW_Front > 0;
    const hasSideDoors = doorW_Side > 0;

    const doorF_L = -doorW_Front / 2;
    const doorF_R =  doorW_Front / 2;
    const doorS_L = -doorW_Side / 2;
    const doorS_R =  doorW_Side / 2;
    
    const shape = new THREE.Shape();

    // --- 1. Outer Path (Clockwise) ---
    shape.moveTo(doorF_L, hd);
    shape.lineTo(-hw + rr, hd);
    shape.absarc(-hw + rr, hd - rr, rr, Math.PI / 2, Math.PI, false);
    if (hasSideDoors) {
        shape.lineTo(-hw, doorS_R);
        shape.lineTo(-ihw, doorS_R);
        shape.lineTo(-ihw, doorS_L);
        shape.lineTo(-hw, doorS_L);
    }
    shape.lineTo(-hw, -hd + rr);
    shape.absarc(-hw + rr, -hd + rr, rr, Math.PI, 1.5 * Math.PI, false);
    shape.lineTo(hw - rr, -hd);
    shape.absarc(hw - rr, -hd + rr, rr, 1.5 * Math.PI, 2 * Math.PI, false);
    if (hasSideDoors) {
        shape.lineTo(hw, doorS_L);
        shape.lineTo(ihw, doorS_L);
        shape.lineTo(ihw, doorS_R);
        shape.lineTo(hw, doorS_R);
    }
    shape.lineTo(hw, hd - rr);
    shape.absarc(hw - rr, hd - rr, rr, 0, Math.PI / 2, false);
    shape.lineTo(doorF_R, hd);

    // --- 2. Inner Path (Counter-Clockwise) ---
    if (!hasFrontDoor) {
        shape.closePath();
        shape.holes.push(roundedRectPath(iw, id, ir));
        return shape;
    }
    
    shape.lineTo(doorF_R, ihd);
    shape.lineTo(ihw - ir, ihd);
    shape.absarc(ihw - ir, ihd - ir, ir, Math.PI / 2, 0, true);
    shape.lineTo(ihw, -ihd + ir);
    shape.absarc(ihw - ir, -ihd + ir, ir, 0, -Math.PI / 2, true);
    shape.lineTo(-ihw + ir, -ihd);
    shape.absarc(-ihw + ir, -ihd + ir, ir, -Math.PI / 2, -Math.PI, true);
    shape.lineTo(-ihw, ihd - ir);
    shape.absarc(-ihw + ir, ihd - ir, ir, Math.PI, Math.PI / 2, true);
    shape.lineTo(doorF_L, ihd);
    shape.lineTo(doorF_L, hd);
    
    return shape;
}

// -----------------------------------------------------------------
// ----------------- TOWER BANDED CLASS ----------------------------
// -----------------------------------------------------------------

export default class TowerBanded extends THREE.Group {

    // --- Static methods for UI constraints (from tower_sculpted) ---
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
    static getMaxSideDoorWidth(p) {
        const eps = 0.05;
        const flat = Math.max(0, p.depth - 2 * p.cornerRadius);
        return (p.depth - 2 * p.cornerRadius) < eps ? 0 : Math.max(eps, flat - eps);
    }

    constructor(params = {}) {
        super();
        this.userData.isModel = true;
        this.userData.type = 'TowerBanded';

        const defaults = {
            width: 12,
            depth: 12,
            wallThickness: 1,
            cornerRadius: 1.2,
            cornerSmoothness: 16,
            edgeRoundness: 0.3,
            edgeSmoothness: 4,
            band1Height: 1.0, // Solid bottom
            band2Height: 3.0, // Gap
            band3Height: 1.0  // Solid top
        };

        this.userData.params = { ...defaults, ...params };

        // Shared material for all parts
        this.material = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.7,
            metalness: 0.1
        });

        this.build();
    }

    /**
     * Internal helper to build one wall segment.
     */
    createWallSegment(p_in, height, doorWidthFront, doorWidthSide) {
        const p = { ...p_in, height, doorWidthFront, doorWidthSide };

        // Calculate constraints for this segment
        const constraints = {
            crMax: TowerBanded.getMaxCornerRadius(p),
            doorW_Front_Max: TowerBanded.getMaxDoorWidth(p),
            doorW_Side_Max: TowerBanded.getMaxSideDoorWidth(p)
        };
        
        // Use constraints to validate door widths
        p.doorWidthFront = Math.min(p.doorWidthFront, constraints.doorW_Front_Max);
        p.doorWidthSide = Math.min(p.doorWidthSide, constraints.doorW_Side_Max);

        const wallShape = createWallShape(p, constraints);

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
        wall.castShadow = true;
        wall.receiveShadow = true;
        return wall;
    }

    build() {
        // Dispose old geometry
        this.traverse(n => {
            if (n.isMesh) n.geometry?.dispose();
        });
        this.clear();

        const p = this.userData.params;
        const h1 = p.band1Height;
        const h2 = p.band2Height;
        const h3 = p.band3Height;
        const totalH = h1 + h2 + h3;

        const y1 = -totalH / 2 + h1 / 2;
        const y2 = -totalH / 2 + h1 + h2 / 2;
        const y3 = -totalH / 2 + h1 + h2 + h3 / 2;

        // Band 1: Solid
        const band1 = this.createWallSegment(p, h1, 0, 0);
        band1.name = 'Band1_Solid';
        band1.position.y = y1;

        // Band 2: Gap (Max door width on all sides)
        const gapParams = { ...p, height: h2 };
        const band2 = this.createWallSegment(
            gapParams, 
            h2, 
            TowerBanded.getMaxDoorWidth(gapParams), 
            TowerBanded.getMaxSideDoorWidth(gapParams)
        );
        band2.name = 'Band2_Gap';
        band2.position.y = y2;
        
        // Band 3: Solid
        const band3 = this.createWallSegment(p, h3, 0, 0);
        band3.name = 'Band3_Solid';
        band3.position.y = y3;

        this.add(band1);
        this.add(band2);
        this.add(band3);
    }

    updateParams(next) {
        // Merge new params, ensuring constraints are respected
        next = { ...this.userData.params, ...next };

        const crMax = TowerBanded.getMaxCornerRadius(next);
        if (next.cornerRadius > crMax) next.cornerRadius = crMax;
        
        next.band1Height = Math.max(0.1, next.band1Height);
        next.band2Height = Math.max(0.1, next.band2Height);
        next.band3Height = Math.max(0.1, next.band3Height);

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
