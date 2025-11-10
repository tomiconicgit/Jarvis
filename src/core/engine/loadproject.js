// src/core/engine/loadproject.js
// This module provides the functionality to load a previously saved
// ".tera" project file, parse it, and reconstruct the scene.

import * as THREE from 'three';

// ---
// NOTE: These helper functions (_clearScene, _rebuildScene) are
// duplicated from newproject.js. This is a deliberate choice to
// keep 'load' and 'new' independent.
// These are used to clear the scene before loading and to
// restore the default scene if the loading process fails.
// ---

/**
 * (Private) Clears all managed assets from the scene.
 * This function is careful to only remove items that the app manages
 * (like meshes and our special environment group) and leaves core
 * components (like the main camera, gizmos) intact.
 * @param {object} App - The main App object.
 */
function _clearScene(App) {
    if (!App || !App.scene || !App.fileManager || !App.selectionContext) {
        console.error('Engine: App is not ready for _clearScene.');
        return;
    }
    console.log('[Engine] Clearing scene for load...');
    
    // 1. Clear any active selection
    App.selectionContext.clear();
    
    // 2. Find all objects to remove
    const itemsToRemove = [];
    App.scene.children.forEach(child => {
        // We only remove objects that are meshes OR
        // have our 'isEnvironment' custom data flag.
        if (child.isMesh || child.userData.isEnvironment) {
            itemsToRemove.push(child);
        }
        // This avoids removing the main camera, grid, gizmos, player object, etc.
    });

    // 3. Dispose of geometries/materials and remove from scene
    itemsToRemove.forEach(object => {
        // Traverse the object and all its children
        object.traverse(obj => {
            // Dispose of GPU memory
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                // Handle both single and multi-materials
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        // Remove the object from the scene graph
        App.scene.remove(object);
    });

    // 4. Also clear the scene's background and environment lighting
    App.scene.background = null;
    App.scene.environment = null;
    
    // 5. Reset the file manager UI
    App.fileManager.reset();
}

/**
 * (Private) Re-initializes the default scene assets.
 * This is our "fallback" function if loading a project fails.
 * @param {object} App - The main App object.
 */
function _rebuildScene(App) {
    if (!App || !App.defaultSceneInits) {
        console.error('Engine: App is not ready for _rebuildScene.');
        return;
    }
    console.log('[Engine] Rebuilding default scene...');
    // 'App.defaultSceneInits' is an array of functions (like
    // initTerrain, initLighting) that was populated by main.js.
    App.defaultSceneInits.forEach(initFunc => {
        if (typeof initFunc === 'function') {
            initFunc(App);
        }
    });
}

/**
 * (Private) Re-builds the file manager state from the loaded scene objects.
 * After loading, the scene graph is correct, but the File Manager UI is empty.
 * This function scans the newly loaded scene and re-populates the File Manager.
 * @param {object} App - The main App object.
 */
function _rebuildFileManager(App) {
    console.log('[Engine] Rebuilding file manager from loaded scene...');
    
    // Iterate over all top-level objects in the newly loaded scene
    App.scene.children.forEach(object => {
        let file = null; // A placeholder for the file data
        
        // Case 1: It's our special environment group
        if (object.userData.isEnvironment) {
            file = {
                id: `env-${object.uuid}`, // Use its UUID to create a new ID
                name: object.name || 'Environment',
                icon: 'sky',
                parentId: 'default'
            };
        } 
        // Case 2: It's a standard mesh (like the terrain)
        else if (object.isMesh) {
            file = {
                id: `mesh-${object.uuid}`,
                name: object.name || 'Loaded Mesh',
                icon: 'mesh',
                parentId: 'default'
            };
        }
        // TODO: Add cases for imported models (which are Groups), lights, etc.
        // as the app's save/load capabilities grow.
        
        // If we identified a manageable object, register it.
        if (file) {
            App.fileManager.registerFile(file);
        }
    });
}

/**
 * (Private) Prompts the user to select a .tera file and reads its text content.
 * @param {function} onFileLoaded - Callback function: onFileLoaded(content, filename)
 * @param {object} App - The main App object (used for App.modal.alert).
 */
function openFilePicker(onFileLoaded, App) {
    // 1. Create a hidden <input type="file"> element
    const input = document.createElement('input');
    input.type = 'file';
    
    // We only want the user to be able to select ".tera" files.
    input.accept = '.tera'; 
    input.style.display = 'none';

    // 2. Listen for the 'change' event (user selected a file)
    input.addEventListener('change', (event) => {
        document.body.removeChild(input); // Clean up the element
        const file = event.target.files[0];
        if (!file) {
            return; // User cancelled
        }

        // 3. Use FileReader to read the file's content as plain text
        const reader = new FileReader();
        reader.onload = (e) => {
            // Success! Call the callback with the text content and filename.
            onFileLoaded(e.target.result, file.name);
        };
        reader.onerror = (e) => {
            // Handle file reading errors
            console.error('[Engine] File reading error:', e);
            App.modal.alert('Failed to read file. See console for details.');
        };
        reader.readAsText(file); // Start the reading process
    });

    // 4. Add the element to the DOM and click it to open the file dialog
    document.body.appendChild(input);
    input.click();
}

/**
 * Main Load Project function.
 * This is the public function attached to App.engine.
 */
function loadProject() {
    // 'this' is bound to App.engine, so 'this.App' is the main App object.
    const App = this.App; 

    // 1. Open the file picker and provide a callback for when
    // the file is successfully read.
    openFilePicker((fileContent, fileName) => {
        let projectData;
        
        // --- 2. Parse and Validate File ---
        try {
            // Convert the raw text content into a JavaScript object
            projectData = JSON.parse(fileContent);
            
            // Perform basic validation to ensure it's a valid project file
            if (!projectData.metadata || !projectData.scene) {
                throw new Error('Invalid project file: "metadata" or "scene" key missing.');
            }
            if (projectData.scene.object.type !== 'Scene') {
                 throw new Error('Invalid scene data: Not a Three.js Scene.');
            }

        } catch (parseError) {
            // This catches errors from JSON.parse() or our validation checks
            console.error('[Engine] Failed to parse project file:', parseError);
            App.modal.alert(`Failed to load project: ${parseError.message}`);
            return; // Stop the loading process
        }

        // --- 3. Load the Scene (Main Logic) ---
        try {
            // --- 3a. Clear existing scene ---
            _clearScene(App);

            // --- 3b. Load new scene data ---
            // THREE.ObjectLoader can parse a JSON object
            // (generated by scene.toJSON()) and reconstruct
            // the entire scene graph, including objects, materials,
            // geometries, and userData.
            const loader = new THREE.ObjectLoader();
            const loadedScene = loader.parse(projectData.scene);

            // --- 3c. Re-hydrate the main App.scene ---
            // We can't just replace App.scene (App.scene = loadedScene)
            // because too many other modules (camera, renderer) hold a
            // direct reference to the original App.scene.
            // Instead, we copy the properties and children *into* App.scene.
            
            // Copy background and environment properties
            App.scene.background = loadedScene.background;
            App.scene.environment = loadedScene.environment;
            
            // Move all children from the loaded scene to the main scene
            while(loadedScene.children.length > 0) {
                App.scene.add(loadedScene.children[0]);
            }

            // --- 3d. Re-build File Manager ---
            _rebuildFileManager(App);

            // --- 3e. Update UI ---
            if (App.workspace && App.workspace.render) {
                // Tell the workspace to re-draw itself from the
                // file manager's new state.
                App.workspace.render();
            }
            
            // --- 3f. Update project name ---
            // Get the name from the file's metadata, or
            // use the filename as a fallback.
            const projectName = projectData.metadata.projectName || fileName.replace('.tera', '');
            App.engine.projectName = projectName;
            
            console.log(`[Engine] Project "${projectName}" loaded successfully.`);
            // (Optional: App.modal.alert(`Project "${projectName}" loaded.`);)

        } catch (loadError) {
            // --- 4. CRITICAL: Handle Load Failure ---
            // If ObjectLoader.parse() fails or something else goes wrong...
            console.error('[Engine] Error applying loaded scene:', loadError);
            App.modal.alert(`Error loading project: ${loadError.message}. Restoring default scene.`);
            
            // ...we must restore the app to a stable state.
            _clearScene(App); // Clear the broken/partially-loaded state
            _rebuildScene(App); // Rebuild the default "New Project" scene
            
            if (App.workspace && App.workspace.render) {
                App.workspace.render(); // Re-render the UI
            }
        }

    }, App); // Pass App to openFilePicker for it to use App.modal
}

/**
 * Initializes the Load Project module by attaching its
 * function to the main App.engine object.
 * @param {object} App - The main App object.
 */
export function initLoadProject(App) {
    if (!App || !App.engine) {
        throw new Error('initLoadProject requires App.engine to be initialized first.');
    }
    
    // Add loadProject to the existing engine.
    // We .bind(App.engine) to ensure that 'this' inside loadProject
    // refers to App.engine, allowing access to 'this.App'.
    App.engine.loadProject = loadProject.bind(App.engine);
    
    console.log('Load Project Initialized.');
}
