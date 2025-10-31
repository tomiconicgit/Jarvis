// File: objects/towerbase_sculpted.js
import * as THREE from 'three';

// -----------------------------------------------------------------
// ---------- GEOMETRY HELPERS (Copied from TowerBase) -------------
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
 * Creates the complete XZ shape for the tower walls, including three door gaps.
 * This is an advanced version of the shape logic from the original TowerBase.
 */
function createWallShape(p) {
    const eps = 0.01;
    const crMax = TowerBaseSculpted.getMaxCornerRadius(p);
    const rr = Math.min(Math.max(0, p.cornerRadius || 0), crMax);
    
    const w = p.width, d = p.depth;
    const hw = w / 2, hd = d / 2;
    
    const iw = Math.max(eps, w - 2 * p.wallThickness);
    const id = Math.max(eps, d - 2 * p.wallThickness);
    const ihw = iw / 2, ihd = id / 2;
    const ir = Math.max(0, rr - p.wallThickness);

    // Clamp door widths
    const doorW_Front = Math.min(p.doorWidthFront, TowerBaseSculpted.getMaxDoorWidth(p));
    const doorW_Side  = Math.min(p.doorWidthSide, TowerBaseSculpted.getMaxSideDoorWidth(p));

    const hasFrontDoor = doorW_Front > 0;
    const hasSideDoors = doorW_Side > 0;

    const doorF_L = -doorW_Front / 2; // Front door Left X
    const doorF_R =  doorW_Front / 2; // Front door Right X
    
    const doorS_L = -doorW_Side / 2;  // Side door Left Z
    const doorS_R =  doorW_Side / 2;  // Side door Right Z
    
    const shape = new THREE.Shape();

    // --- 1. Outer Path (Clockwise) ---
    shape.moveTo(doorF_L, hd); // Start at left edge of front door

    // Top-Left Corner
    shape.lineTo(-hw + rr, hd);
    shape.absarc(-hw + rr, hd - rr, rr, Math.PI / 2, Math.PI, false);

    // Left Side (with door)
    if (hasSideDoors) {
        shape.lineTo(-hw, doorS_R);
        shape.lineTo(-ihw, doorS_R); // Cut in
        shape.lineTo(-ihw, doorS_L); // Across
        shape.lineTo(-hw, doorS_L);  // Cut out
    }
    shape.lineTo(-hw, -hd + rr);

    // Bottom-Left Corner
    shape.absarc(-hw + rr, -hd + rr, rr, Math.PI, 1.5 * Math.PI, false);

    // Bottom Side
    shape.lineTo(hw - rr, -hd);

    // Bottom-Right Corner
    shape.absarc(hw - rr, -hd + rr, rr, 1.5 * Math.PI, 2 * Math.PI, false);

    // Right Side (with door)
    if (hasSideDoors) {
        shape.lineTo(hw, doorS_L);
        shape.lineTo(ihw, doorS_L); // Cut in
        shape.lineTo(ihw, doorS_R); // Across
        shape.lineTo(hw, doorS_R);  // Cut out
    }
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


/**
 * Creates a beveled/rounded box geometry using ExtrudeGeometry.
 * @param {number} w Width
 * @param {number} h Height
 * @param {number} d Depth
 * @param {number} roundness BevelSize
 * @param {number} smoothness BevelSegments
 * @returns {THREE.ExtrudeGeometry}
 */
function createRoundedBox(w, h, d, roundness, smoothness) {
    const shape = roundedRectPath(w, d, roundness);
    const extrudeSettings = {
        depth: h,
        steps: 1,
        bevelEnabled: true,
        bevelSegments: Math.max(1, Math.floor(smoothness || 1)),
        bevelSize: Math.max(0.01, roundness || 0),
        bevelThickness: Math.max(0.01, roundness || 0),
        curveSegments: 12 // Low curve segments for corners, bevel is main thing
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.translate(0, 0, -h / 2); // Center on Z
    geo.rotateX(Math.PI / 2); // Orient so Y is up
    geo.computeVertexNormals();
    return geo;
}

/**
 * Applies a curved base deformation to a column geometry.
 * @param {THREE.BufferGeometry} geo The geometry to deform
 * @param {object} p The parameters object
 */
function applyColumnCurve(geo, p) {
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const height = p.height + p.plinthHeight + p.corniceHeight;
    const halfHeight = height / 2;
    const curveHeight = p.sideColumnCurveHeight;
    const curveAmount = p.sideColumnCurveAmount;

    if (curveHeight <= 0.01 || curveAmount <= 0.01) {
        return; // No curve to apply
    }

    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i); // Local Y, centered at 0
        const y_local = y + halfHeight; // Y from 0 (bottom) to height (top)

        if (y_local < curveHeight) {
            // Vertex is in the "curve zone"
            const t = 1.0 - (y_local / curveHeight); // 1.0 at bottom, 0.0 at curveHeight
            const offset = curveAmount * Math.sin(t * (Math.PI / 2)); // Ease-out curve

            // Push vertex outwards along its XZ normal
            const nx = norm.getX(i);
            const nz = norm.getZ(i);
            
            pos.setX(i, pos.getX(i) + nx * offset);
            pos.setZ(i, pos.getZ(i) + nz * offset);
        }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals(); // Recalculate normals after deformation
}


// -----------------------------------------------------------------
// ----------------- SCULPTED TOWER BASE CLASS ---------------------
// -----------------------------------------------------------------

export default class TowerBaseSculpted extends THREE.Group {

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
    static getMaxSideDoorWidth(p) {
        const eps = 0.05;
        const flat = Math.max(0, p.depth - 2 * p.cornerRadius);
        return (p.depth - 2 * p.cornerRadius) < eps ? 0 : Math.max(eps, flat - eps);
    }

    constructor(params = {}) {
        super();
        this.userData.isModel = true;
        this.userData.type = 'TowerBaseSculpted';

        const defaults = {
            // Wall
            width: 12,
            depth: 12,
            height: 8,
            wallThickness: 1,
            cornerRadius: 1.2,
            cornerSmoothness: 16,
            edgeRoundness: 0.3,
            edgeSmoothness: 4,
            doorWidthFront: 4,
            doorWidthSide: 3, // New side doors

            // Plinth (Bottom)
            plinthHeight: 0.8,
            plinthOutset: 0.5,
            plinthRoundness: 0.1,
            plinthEdgeSmoothness: 2,

            // Cornice (Top Overhang)
            corniceHeight: 0.6,
            corniceOutset: 0.4,
            corniceRoundness: 0.1,
            corniceEdgeSmoothness: 2,

            // Buttresses (Vertical Columns)
            buttressCountFront: 2,
            buttressWidth: 0.6,
            buttressDepth: 0.4,
            buttressRoundness: 0.1,
            buttressEdgeSmoothness: 2,
            sideColumnPos: 0.5, // 0.0 to 1.0
            sideColumnCurveHeight: 2.0,
            sideColumnCurveAmount: 0.5,
        };

        this.userData.params = { ...defaults, ...params };

        // Shared material for all parts
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

        // --- 1. Main Wall (Rebuilt from scratch) ---
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

        // --- 2. Plinth (Bottom Floor Base) ---
        const plinthW = p.width + p.plinthOutset * 2;
        const plinthD = p.depth + p.plinthOutset * 2;
        const plinthGeo = createRoundedBox(plinthW, p.plinthHeight, plinthD, p.plinthRoundness, p.plinthEdgeSmoothness);
        const plinth = new THREE.Mesh(plinthGeo, this.material);
        plinth.name = 'Plinth';
        plinth.position.y = -p.height / 2 - p.plinthHeight / 2;
        plinth.castShadow = true;
        plinth.receiveShadow = true;
        this.add(plinth);

        // --- 3. Cornice (Top Overhang) ---
        const corniceW = p.width + p.corniceOutset * 2;
        const corniceD = p.depth + p.corniceOutset * 2;
        const corniceGeo = createRoundedBox(corniceW, p.corniceHeight, corniceD, p.corniceRoundness, p.corniceEdgeSmoothness);
        const cornice = new THREE.Mesh(corniceGeo, this.material);
        cornice.name = 'Cornice';
        cornice.position.y = p.height / 2 + p.corniceHeight / 2;
        cornice.castShadow = true;
        cornice.receiveShadow = true;
        this.add(cornice);

        // --- 4. Buttresses (Vertical Columns) ---
        const buttressTotalHeight = p.height + p.plinthHeight + p.corniceHeight;
        const buttressCenterY = 0;
        const halfW = p.width / 2;
        const halfD = p.depth / 2;

        // --- Front Columns (Count: buttressCountFront) ---
        const xSpacing = p.width / (p.buttressCountFront + 1);
        const zPosFront = halfD + p.buttressDepth / 2 - p.wallThickness / 2;
        const frontColGeo = createRoundedBox(p.buttressWidth, buttressTotalHeight, p.buttressDepth, p.buttressRoundness, p.buttressEdgeSmoothness);

        for (let i = 1; i <= p.buttressCountFront; i++) {
            const xPos = -halfW + i * xSpacing;
            const doorBuffer = p.buttressWidth / 2 + 0.2;
            if (p.doorWidthFront === 0 || xPos < -p.doorWidthFront / 2 - doorBuffer || xPos > p.doorWidthFront / 2 + doorBuffer) {
                const b_front = new THREE.Mesh(frontColGeo, this.material);
                b_front.name = `Buttress_Front_${i}`;
                b_front.position.set(xPos, buttressCenterY, zPosFront);
                b_front.castShadow = true;
                this.add(b_front);
            }
        }

        // --- Side Columns (1 Left, 1 Right) ---
        const zPos = -halfD + p.sideColumnPos * p.depth;
        const xPosLeft = -halfW - p.buttressDepth / 2 + p.wallThickness / 2;
        const xPosRight = halfW + p.buttressDepth / 2 - p.wallThickness / 2;

        // Left Column
        const leftColGeo = createRoundedBox(p.buttressDepth, buttressTotalHeight, p.buttressWidth, p.buttressRoundness, p.buttressEdgeSmoothness);
        applyColumnCurve(leftColGeo, p); // Apply sculpting
        const b_left = new THREE.Mesh(leftColGeo, this.material);
        b_left.name = `Buttress_Left`;
        b_left.position.set(xPosLeft, buttressCenterY, zPos);
        b_left.castShadow = true;
        this.add(b_left);

        // Right Column
        const rightColGeo = createRoundedBox(p.buttressDepth, buttressTotalHeight, p.buttressWidth, p.buttressRoundness, p.buttressEdgeSmoothness);
        applyColumnCurve(rightColGeo, p); // Apply sculpting
        const b_right = new THREE.Mesh(rightColGeo, this.material);
        b_right.name = `Buttress_Right`;
        b_right.position.set(xPosRight, buttressCenterY, zPos);
        b_right.castShadow = true;
        this.add(b_right);
    }

    updateParams(next) {
        // Merge new params, ensuring constraints are respected
        next = { ...this.userData.params, ...next };

        const crMax = TowerBaseSculpted.getMaxCornerRadius(next);
        if (next.cornerRadius > crMax) next.cornerRadius = crMax;

        if (next.doorWidthFront > 0) {
            const dwMax = TowerBaseSculpted.getMaxDoorWidth(next);
            if (next.doorWidthFront > dwMax) next.doorWidthFront = dwMax;
        }
        if (next.doorWidthSide > 0) {
            const dwMax = TowerBaseSculpted.getMaxSideDoorWidth(next);
            if (next.doorWidthSide > dwMax) next.doorWidthSide = dwMax;
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
