// src/core/default/lighting.js
import * as THREE from 'three';

/**
 * Creates the default shadow-casting light and adds it to the scene.
 * It also registers itself with the file manager.
 * @param {object} App - The global application object.
 */
export function initLighting(App) {
    
    // 1. Create the main light
    const light = new THREE.DirectionalLight(0xffffff, 3.0); // White, Intensity 3
    light.position.set(20, 30, 10); // Angled from above
    light.target.position.set(0, 0, 0); // Pointing at the world origin
    
    // 2. Enable shadow casting
    light.castShadow = true;

    // 3. Configure Shadow Map
    light.shadow.mapSize.width = 2048;  // High resolution
    light.shadow.mapSize.height = 2048;

    // 4. Configure Shadow Camera (defines the "box" that renders shadows)
    // This needs to be large enough to cover your terrain
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 100;
    light.shadow.camera.left = -50;
    light.shadow.camera.right = 50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;

    // 5. Create a "dummy" group to represent this in the file manager
    // We add the light and its target to this group
    const lightGroup = new THREE.Group();
    lightGroup.name = "Sun Light";
    lightGroup.add(light);
    lightGroup.add(light.target);
    
    // 6. Add the group to the scene
    App.scene.add(lightGroup);

    // 7. Register it with the File Manager
    if (App.fileManager) {
        App.fileManager.registerFile({
            id: 'light-default',        // A unique ID
            name: 'Sun Light',          // The display name
            icon: 'light',              // The icon name
            parentId: 'default'         // The folder ID to put it in
        });
    }

    console.log('Default Lighting Initialized.');
}
