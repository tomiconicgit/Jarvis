// src/core/default/terrain.js
// This module creates the default ground plane (the "terrain")
// for a new project.

import * as THREE from 'three';

/**
 * Creates the default terrain plane, adds it to the scene,
 * and registers it with the file manager.
 * @param {object} App - The global application object (contains .scene, .fileManager).
 */
export function initTerrain(App) {
    
    // --- 1. Create the Terrain Mesh ---
    
    // 'geometry' defines the shape. We use a PlaneGeometry,
    // which is a simple flat rectangle.
    // 100 units wide, 100 units long.
    const geometry = new THREE.PlaneGeometry(100, 100);
    
    // 'material' defines the appearance. We use MeshStandardMaterial,
    // which is a PBR (Physically Based Rendering) material that
    // reacts realistically to lights (like our DirectionalLight)
    // and environment maps.
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x808080, // A neutral grey color
        side: THREE.DoubleSide // Renders both the top and bottom of the plane
    });
    
    // 'mesh' is the final object, combining the geometry and material.
    const terrainMesh = new THREE.Mesh(geometry, material);
    
    // By default, a plane is created standing up (like a wall).
    // We rotate it -90 degrees (in radians) on the X-axis to lay it flat.
    terrainMesh.rotation.x = -Math.PI / 2; 
    
    // Set the name. This is crucial for matching with the
    // file manager entry and for selection.
    terrainMesh.name = "Default Terrain";
    
    // --- NEW: Enable Shadow Receiving ---
    // This tells Three.js that this object's surface
    // is allowed to have shadows cast *onto* it.
    // This must be 'true' for the "Sun Light" to work on this ground.
    terrainMesh.receiveShadow = true; 
    // Note: We don't set 'castShadow = true' because a flat plane
    // doesn't really cast a shadow on itself or anything below it.
    
    // --- 2. Add it to the Scene ---
    App.scene.add(terrainMesh);

    // --- 3. Register it with the File Manager ---
    // This makes "Default Terrain" appear in the workspace UI.
    if (App.fileManager) {
        App.fileManager.registerFile({
            id: 'terrain-default', // A unique ID
            name: 'Default Terrain', // Display name (must match mesh.name)
            icon: 'mesh', // The icon to use
            parentId: 'default' // The folder to put it in
        });
    }

    console.log('Default Terrain Initialized.');
}
