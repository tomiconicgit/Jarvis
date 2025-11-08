// src/core/default/environment.js
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// This path is relative to your index.html
const hdriURL = 'src/core/default/environment.hdr';

/**
 * Creates the default HDRI environment and adds it to the scene.
 * @param {object} App - The global application object.
 */
export function initEnvironment(App) {
    
    // 1. Create a "dummy" group to represent this asset
    // This is what users will select and delete from the workspace.
    const environmentGroup = new THREE.Group();
    environmentGroup.name = "Environment"; // This MUST match the fileManager name
    
    // 2. Add it to the scene
    App.scene.add(environmentGroup);

    // 3. Load the HDRI texture
    new RGBELoader().load(hdriURL, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;

        // 3a. Set the "Sky" (what the camera sees)
        App.scene.background = texture;

        // 3b. Set the "Lighting" (what objects reflect)
        App.scene.environment = texture;
        
        console.log('HDRI Environment Initialized.');

    }, 
    // onProgress callback (optional)
    undefined, 
    // onError callback
    (err) => {
        console.error(`Failed to load HDRI from ${hdriURL}:`, err);
        App.modal.alert('Failed to load default environment. See console for details.');
    });

    // 4. Register this asset with the File Manager
    if (App.fileManager) {
        App.fileManager.registerFile({
            id: 'env-default',           // A unique ID
            name: 'Environment',         // The display name
            icon: 'sky',                 // Use the 'sky' icon
            parentId: 'default'          // The "Default" folder
        });
    }

    // --- CRITICAL: Store data for saving ---
    // We store the URL in the dummy object's userData
    // so the saveProject function can find it.
    environmentGroup.userData.isEnvironment = true;
    environmentGroup.userData.hdriURL = hdriURL;
}
