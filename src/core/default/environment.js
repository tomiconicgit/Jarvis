// src/core/default/environment.js
// This module is responsible for loading and setting up the
// default 3D environment (the "sky") for a new project.

import * as THREE from 'three';
// Import the RGBELoader, which is specifically designed to
// load .hdr (High Dynamic Range) image files.
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// Define the path to the environment map.
// This path is relative to the `index.html` file in the root directory.
const hdriURL = 'src/core/default/environment.hdr';

/**
 * Creates the default HDRI environment, adds it to the scene,
 * and registers it with the file manager.
 * @param {object} App - The global application object (App.scene, App.modal, etc.).
 */
export function initEnvironment(App) {
    
    // --- 1. Create a "Dummy" Representative Object ---
    // We create an empty THREE.Group. This group won't render anything
    // itself, but it serves as an "anchor" in the scene.
    // This is the object that the user will see in the workspace,
    // be able to select, and eventually delete to remove the environment.
    const environmentGroup = new THREE.Group();
    // The .name property is critical. It *must* match the name we give
    // to the fileManager so that selection works correctly.
    environmentGroup.name = "Environment"; 
    
    // --- 2. Add the Dummy Object to the Scene ---
    // We add this empty group to the main scene.
    App.scene.add(environmentGroup);

    // --- 3. Load the HDRI Texture ---
    // We instantiate a new RGBELoader and call its .load() method.
    new RGBELoader().load(
        hdriURL, // The path to the file
        
        // --- 3a. onSuccess Callback ---
        // This function is called *asynchronously* when the .hdr file
        // has finished downloading and processing.
        (texture) => {
            // 'texture' is now a usable THREE.Texture object.

            // This mapping tells Three.js how to project the 2D image
            // onto the inner surface of a 3D sphere.
            // Equirectangular is the standard format for 360° HDRIs.
            texture.mapping = THREE.EquirectangularReflectionMapping;

            // --- 3b. Set the "Sky" (Background) ---
            // This sets what the camera sees "behind" all the 3D objects.
            // This is the visible skybox.
            App.scene.background = texture;

            // --- 3c. Set the "Lighting" (Environment) ---
            // This is the *most important* part for realism.
            // App.scene.environment tells all PBR materials (MeshStandardMaterial)
            // in the scene to use this texture for calculating reflections
            // and ambient light. This is what makes metallic objects
            // look reflective and shiny.
            App.scene.environment = texture;
            
            console.log('HDRI Environment Initialized.');
        }, 
        
        // --- onProgress Callback (Optional) ---
        // This function would be called during the download.
        // We're not using it here, so we pass 'undefined'.
        undefined, 
        
        // --- 3d. onError Callback ---
        // This function is called if the file (hdriURL) cannot be found
        // or if the file is corrupt.
        (err) => {
            console.error(`Failed to load HDRI from ${hdriURL}:`, err);
            // Alert the user that a default asset failed to load.
            App.modal.alert('Failed to load default environment. See console for details.');
        }
    );

    // --- 4. Register with File Manager ---
    // This happens *immediately* (not in the callback), so the
    // "Environment" item appears in the workspace right away.
    if (App.fileManager) {
        App.fileManager.registerFile({
            id: 'env-default',   // A unique ID for this file entry
            name: 'Environment', // The display name (must match the Group's name)
            icon: 'sky',         // The icon to show in the workspace UI
            parentId: 'default'  // The ID of the folder to put this in
        });
    }

    // --- 5. Store Data for Saving Projects ---
    // When the user saves the project, we need a way to know that
    // this 'environmentGroup' object isn't a normal model, but
    // the special environment loader.
    // We store this metadata in the object's 'userData' property.
    environmentGroup.userData.isEnvironment = true;
    
    // We also store the URL of the HDRI it loaded. The saveProject
    // module will look for this 'hdriURL' property to serialize it.
    environmentGroup.userData.hdriURL = hdriURL;
}
