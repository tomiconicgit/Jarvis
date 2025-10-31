// File: objects/towerbase_sculpted.js
import *
as THREE from 'three';
import TowerBase from './towerbase.js'; // Import the original wall object

/**
 * A sculpted tower base that combines the original TowerBase (for walls/door)
 * with a plinth (bottom), cornice (top), and buttresses (columns).
 */
export default class TowerBaseSculpted extends THREE.Group {

    // --- Static methods for UI (passed through to inner TowerBase) ---
    static getMaxCornerRadius(p) { return TowerBase.getMaxCornerRadius(p); }
    static getMaxEdgeRoundness(p) { return TowerBase.getMaxEdgeRoundness(p); }
    static getMaxDoorWidth(p) { return TowerBase.getMaxDoorWidth(p); }

    constructor(params = {}) {
        super();
        this.userData.isModel = true;
        this.userData.type = 'TowerBaseSculpted';

        const towerBaseDefaults = {
            width: 12,
            depth: 12,
            height: 8, // This is the main wall height
            wallThickness: 1,
            cornerRadius: 1.2,
            cornerSmoothness: 16,
            edgeRoundness: 0.3,
            edgeSmoothness: 4,
            doorWidth: 4
        };

        const sculptedDefaults = {
            // Plinth (Bottom)
            plinthHeight: 0.8,
            plinthOutset: 0.5, // How much it sticks out from the main wall

            // Cornice (Top Overhang)
            corniceHeight: 0.6,
            corniceOutset: 0.4,

            // Buttresses (Vertical Columns)
            buttressCountX: 2, // Number of columns on front/back
            buttressCountZ: 2, // Number of columns on left/right
            buttressWidth: 0.6, // Width (X for front/back, Z for left/right)
            buttressDepth: 0.4, // How far it sticks out from the wall
        };

        this.userData.params = { ...towerBaseDefaults, ...sculptedDefaults, ...params };

        // Shared material for all parts
        this.material = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a, // Darker color like the mockup
            roughness: 0.8,
            metalness: 0.1
        });

        this.build();
    }

    build() {
        this.clear();
        const p = this.userData.params;

        // --- 1. Main Wall (Using original TowerBase) ---
        // We pass the relevant parameters to the original TowerBase constructor
        const wall = new TowerBase({
            width: p.width,
            depth: p.depth,
            height: p.height,
            wallThickness: p.wallThickness,
            cornerRadius: p.cornerRadius,
            cornerSmoothness: p.cornerSmoothness,
            edgeRoundness: p.edgeRoundness,
            edgeSmoothness: p.edgeSmoothness,
            doorWidth: p.doorWidth,
            material: this.material // Share the material
        });
        wall.name = 'MainWallShell';
        this.add(wall);

        // --- 2. Plinth (Bottom Floor Base) ---
        const plinthW = p.width + p.plinthOutset * 2;
        const plinthD = p.depth + p.plinthOutset * 2;
        const plinthGeo = new THREE.BoxGeometry(plinthW, p.plinthHeight, plinthD);
        const plinth = new THREE.Mesh(plinthGeo, this.material);
        plinth.name = 'Plinth';
        // Position it at the bottom, aligned with the TowerBase center
        plinth.position.y = -p.height / 2 + p.plinthHeight / 2;
        plinth.castShadow = true;
        plinth.receiveShadow = true;
        this.add(plinth);

        // --- 3. Cornice (Top Overhang) ---
        const corniceW = p.width + p.corniceOutset * 2;
        const corniceD = p.depth + p.corniceOutset * 2;
        const corniceGeo = new THREE.BoxGeometry(corniceW, p.corniceHeight, corniceD);
        const cornice = new THREE.Mesh(corniceGeo, this.material);
        cornice.name = 'Cornice';
        // Position it at the top
        cornice.position.y = p.height / 2 - p.corniceHeight / 2;
        cornice.castShadow = true;
        cornice.receiveShadow = true;
        this.add(cornice);

        // --- 4. Buttresses (Vertical Columns) ---
        const halfW = p.width / 2;
        const halfD = p.depth / 2;

        // Geometry for columns on Front/Back (X-axis sides)
        const buttressGeoX = new THREE.BoxGeometry(p.buttressWidth, p.height, p.buttressDepth);
        const xSpacing = p.width / (p.buttressCountX + 1);
        const zPosFront = halfD + p.buttressDepth / 2;
        const zPosBack = -halfD - p.buttressDepth / 2;

        for (let i = 1; i <= p.buttressCountX; i++) {
            const xPos = -halfW + i * xSpacing;

            // Back columns
            const b_back = new THREE.Mesh(buttressGeoX, this.material);
            b_back.name = `Buttress_Back_${i}`;
            b_back.position.set(xPos, 0, zPosBack);
            b_back.castShadow = true;
            this.add(b_back);

            // Front columns (check for door gap)
            if (p.doorWidth === 0 || xPos < -p.doorWidth / 2 - p.buttressWidth / 2 || xPos > p.doorWidth / 2 + p.buttressWidth / 2) {
                const b_front = new THREE.Mesh(buttressGeoX, this.material);
                b_front.name = `Buttress_Front_${i}`;
                b_front.position.set(xPos, 0, zPosFront);
                b_front.castShadow = true;
                this.add(b_front);
            }
        }

        // Geometry for columns on Left/Right (Z-axis sides)
        const buttressGeoZ = new THREE.BoxGeometry(p.buttressDepth, p.height, p.buttressWidth);
        const zSpacing = p.depth / (p.buttressCountZ + 1);
        const xPosLeft = -halfW - p.buttressDepth / 2;
        const xPosRight = halfW + p.buttressDepth / 2;

        for (let i = 1; i <= p.buttressCountZ; i++) {
            const zPos = -halfD + i * zSpacing;

            // Left columns
            const b_left = new THREE.Mesh(buttressGeoZ, this.material);
            b_left.name = `Buttress_Left_${i}`;
            b_left.position.set(xPosLeft, 0, zPos);
            b_left.castShadow = true;
            this.add(b_left);

            // Right columns
            const b_right = new THREE.Mesh(buttressGeoZ, this.material);
            b_right.name = `Buttress_Right_${i}`;
            b_right.position.set(xPosRight, 0, zPos);
            b_right.castShadow = true;
            this.add(b_right);
        }
    }

    updateParams(next) {
        // Merge new params, ensuring constraints from TowerBase are respected
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
        this.material.dispose();
        this.clear();
    }
}
