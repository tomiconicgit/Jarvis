// src/core/default/terrain.js

import * as THREE from 'three';

/**
 * Creates the default terrain and adds it to the scene.
 * It also registers itself with the file manager.
 * @param {object} App - The global application object (contains .scene, .fileManager)
 */
export function initTerrain(App) {
    
    // 1. Create the terrain mesh
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        side: THREE.DoubleSide
    });
    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.rotation.x = -Math.PI / 2; // Lay it flat
    terrainMesh.name = "Default Terrain"; // Give it a name
    
    // 2. Add it to the scene
    App.scene.add(terrainMesh);

    // 3. Register it with the File Manager
    // This tells the workspace UI to add an item.
    if (App.fileManager) {
        App.fileManager.registerFile({
            id: 'terrain-default',      // A unique ID
            name: 'Default Terrain',    // The display name
            icon: 'mesh',               // The icon name
            parentId: 'default'         // The folder ID to put it in
        });
    }

    console.log('Default Terrain Initialized.');
}
