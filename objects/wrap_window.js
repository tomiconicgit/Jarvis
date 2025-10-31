// File: objects/wrap_window.js
import * as THREE from 'three';
import WindowAsset from './window.js'; // Uses the "normal" window

// -----------------------------------------------------------------
// ----------------- WRAP AROUND WINDOW CLASS ----------------------
// -----------------------------------------------------------------

export default class WrapAroundWindow extends THREE.Group {

    // --- Static methods for UI constraints (from window.js) ---
    static getMaxCornerRadius(p) {
        const eps = 0.01;
        // Max corner radius is based on its *own* frame thickness
        return Math.max(0, Math.min(p.totalWidth / 2, p.height / 2) - p.frameThickness - eps);
    }
    static getMaxEdgeRoundness(p) {
        return Math.max(0.05, Math.min(p.frameThickness / 2 - 0.01, p.height / 4, p.depth / 2));
    }

    constructor(params = {}) {
        super();
        this.userData.isModel = true;
        this.userData.type = 'WrapAroundWindow';

        const defaults = {
            // --- Sizing params (must match tower) ---
            width: 10,              // Tower's outer width
            depth: 10,              // Tower's outer depth
            height: 3,              // Tower's gap height (band2Height)
            towerWallThickness: 1,  
            towerCornerRadius: 1.0,

            // --- Window appearance params ---
            frameThickness: 0.2,
            cornerRadius: 0.05,
            cornerSmoothness: 8,
            edgeRoundness: 0.02,
            edgeSmoothness: 2,
            glassR: 0.8, glassG: 0.8, glassB: 1,
            glassOpacity: 0.3,
            glassRoughness: 0.1
        };

        this.userData.params = { ...defaults, ...params };

        // This object is a container; the child windows will have materials.
        this.build();
    }


    build() {
        // Dispose old geometry
        this.traverse(n => {
            if (n.isMesh) n.geometry?.dispose();
            if (n.material) n.material.dispose();
        });
        this.clear();

        const p = this.userData.params;

        // 1. Calculate the dimensions of the *inner hole* of the tower
        const innerW = p.width - 2 * p.towerWallThickness;
        const innerD = p.depth - 2 * p.towerWallThickness;
        
        // 2. Calculate the inner corner radius
        const innerR = Math.max(0, p.towerCornerRadius - p.towerWallThickness);

        // 3. Calculate the length of the flat wall sections (the size of the opening)
        const flatWidth = Math.max(0.01, innerW - 2 * innerR);
        const flatDepth = Math.max(0.01, innerD - 2 * innerR);

        // 4. Create common params for all 4 window panels
        const windowParams = {
            height: p.height,
            depth: 0.1, // Window panel depth (thickness)
            frameThickness: p.frameThickness,
            cornerRadius: p.cornerRadius,
            cornerSmoothness: p.cornerSmoothness,
            edgeRoundness: p.edgeRoundness,
            edgeSmoothness: p.edgeSmoothness,
            hasBolts: false,
            hasBars: false,
            glassR: p.glassR,
            glassG: p.glassG,
            glassB: p.glassB,
            glassOpacity: p.glassOpacity,
            glassRoughness: p.glassRoughness
        };

        // 5. Create and position the 4 window panels
        
        // Front Window
        const windowFront = new WindowAsset({ ...windowParams, totalWidth: flatWidth });
        windowFront.name = 'WindowFront';
        windowFront.position.set(0, 0, (innerD / 2) - innerR);
        this.add(windowFront);

        // Back Window
        const windowBack = new WindowAsset({ ...windowParams, totalWidth: flatWidth });
        windowBack.name = 'WindowBack';
        windowBack.position.set(0, 0, -((innerD / 2) - innerR));
        windowBack.rotation.y = Math.PI;
        this.add(windowBack);

        // Left Window
        const windowLeft = new WindowAsset({ ...windowParams, totalWidth: flatDepth });
        windowLeft.name = 'WindowLeft';
        windowLeft.position.set(-((innerW / 2) - innerR), 0, 0);
        windowLeft.rotation.y = -Math.PI / 2;
        this.add(windowLeft);
        
        // Right Window
        const windowRight = new WindowAsset({ ...windowParams, totalWidth: flatDepth });
        windowRight.name = 'WindowRight';
        windowRight.position.set(((innerW / 2) - innerR), 0, 0);
        windowRight.rotation.y = Math.PI / 2;
        this.add(windowRight);
    }

    updateParams(next) {
        next = { ...this.userData.params, ...next };

        // Apply constraints
        const crMax = WrapAroundWindow.getMaxCornerRadius(next);
        if (next.cornerRadius > crMax) next.cornerRadius = crMax;
        
        const erMax = WrapAroundWindow.getMaxEdgeRoundness(next);
        if (next.edgeRoundness > erMax) next.edgeRoundness = erMax;

        this.userData.params = next;
        this.build();
    }

    dispose() {
        this.traverse(n => {
            if (n.geometry) n.geometry.dispose();
            if (n.material) n.material.dispose();
            if (typeof n.dispose === 'function') n.dispose();
        });
        this.clear();
    }
}
