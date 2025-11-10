// src/core/default/lighting.js
// This module creates the default light source for a new scene.
// In this case, it's a "Sun" light (DirectionalLight) that
// will cast shadows from objects.

import * as THREE from 'three';

/**
 * Creates the default shadow-casting directional light and adds it to the scene.
 * It also registers itself with the file manager using a "dummy" group.
 * @param {object} App - The global application object (App.scene, App.fileManager).
 */
export function initLighting(App) {
    
    // --- 1. Create the Main Light ---
    
    // We use a DirectionalLight to simulate a distant light source like the sun.
    // All its rays are parallel.
    const light = new THREE.DirectionalLight(
        0xffffff, // Color: 0xffffff (white)
        3.0       // Intensity: A brightness of 3.0. Default is 1.0.
    );
    
    // Set the light's position. This determines the *angle* of the light rays.
    // It's positioned high up (Y=30) and angled (X=20, Z=10).
    light.position.set(20, 30, 10);
    
    // Set where the light is pointing. By default, it's (0,0,0).
    light.target.position.set(0, 0, 0); // Pointing at the world origin.
    
    // --- 2. Enable Shadow Casting ---
    
    // This tells Three.js that this light source should cast shadows.
    // This is computationally expensive, so it's 'false' by default.
    light.castShadow = true;

    // --- 3. Configure Shadow Map (Quality) ---
    
    // This is the resolution of the "shadow texture" the light renders.
    // Higher values mean sharper, more detailed shadows, but are much
    // more demanding on the GPU. 2048x2048 is a good high-quality setting.
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    // --- 4. Configure Shadow Camera (Area) ---
    
    // A DirectionalLight uses an OrthographicCamera internally to render
    // the scene from its point of view. This "shadow camera" defines the
    // *area* of the world that will cast shadows.
    // This box needs to be large enough to contain your scene.
    
    light.shadow.camera.near = 0.5;   // Near clipping plane
    light.shadow.camera.far = 100;    // Far clipping plane (how far shadows are rendered)
    
    // These define the 2D boundaries (left, right, top, bottom) of the shadow box.
    // A box of -50 to 50 will cover a 100x100 area.
    light.shadow.camera.left = -50;
    light.shadow.camera.right = 50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;

    // --- 5. Create a "Dummy" Group for the File Manager ---
    
    // Like the environment, we create an empty Group to "represent" the light.
    // This allows the user to select and (eventually) move the light *and*
    // its target together as a single unit in the workspace.
    const lightGroup = new THREE.Group();
    lightGroup.name = "Sun Light"; // This name *must* match the fileManager entry.
    
    // Add the light and its target object to the group.
    // This ensures that if the *group* is moved, the light and its
    // target move relative to it.
    lightGroup.add(light);
    lightGroup.add(light.target);
    
    // --- 6. Add the Group to the Scene ---
    
    // We add the *group* to the scene, not the light directly.
    App.scene.add(lightGroup);

    // --- 7. Register with File Manager ---
    
    // This makes "Sun Light" appear in the workspace UI.
    if (App.fileManager) {
        App.fileManager.registerFile({
            id: 'light-default', // A unique ID
            name: 'Sun Light',   // Display name (must match the Group's name)
            icon: 'light',       // The icon to use
            parentId: 'default'  // The folder to put it in
        });
    }

    console.log('Default Lighting Initialized.');
}
