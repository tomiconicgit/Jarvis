// src/core/procedural/lighting.js
import * as THREE from 'three';

/**
 * Creates the default lighting setup and adds it to the scene.
 * @param {object} App - The global application object.
 */
export function initLighting(App) {
    
    // 1. Create a group to hold all lights
    // This makes it a single "asset" that can be selected/deleted
    const lightGroup = new THREE.Group();
    lightGroup.name = "Lighting"; // This MUST match the fileManager name

    // 2. Add a soft, white ambient light to fill in shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    lightGroup.add(ambientLight);

    // 3. Add a directional "sun" light to create highlights and shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7.5); // Angled from above
    
    // You can add a helper for debugging light direction:
    // const helper = new THREE.DirectionalLightHelper(directionalLight, 5);
    // App.scene.add(helper);
    
    lightGroup.add(directionalLight);
    lightGroup.add(directionalLight.target); // Also add the target to the group

    // 4. Add the entire group to the scene
    App.scene.add(lightGroup);

    // 5. Register this group as a file in the workspace
    if (App.fileManager) {
        App.fileManager.registerFile({
            id: 'lighting-default',      // A unique ID
            name: 'Lighting',            // The display name (and scene object name)
            icon: 'light',               // The new icon we will add
            parentId: 'default'          // The "Default" folder
        });
    }

    console.log('Default Lighting Initialized.');
}
