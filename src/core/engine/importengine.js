// src/core/engine/importengine.js
// This module handles the logic for importing 3D models
// (like .glb, .fbx, .obj) into the application.

import * as THREE from 'three';

// Module-level variable to store a reference to the main App object.
// This is set once during initialization.
let App;

/**
 * A helper function to clean up a filename for use as a display name.
 * It removes the file extension and replaces underscores/hyphens with spaces.
 * Example: "my_cool-model.glb" -> "My cool model"
 * @param {string} filename - The original filename.
 * @returns {string} The cleaned-up display name.
 */
function getCleanName(filename) {
    // Get all parts of the name except the last one (the extension)
    let name = filename.split('.').slice(0, -1).join('.');
    // Replace underscores and hyphens with a space
    name = name.replace(/[_-]/g, ' ');
    // Capitalize the first letter and append the rest of the string
    return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * A utility function to programmatically create and click a hidden
 * file input element, which opens the user's native file picker.
 *
 * @param {string} accept - The 'accept' attribute for the input,
 * defining which file types are allowed (e.g., ".glb,.gltf").
 * @param {function} onFileLoaded - The callback function to execute
 * once the user has selected a file. The 'File' object is passed to it.
 */
function openFilePicker(accept, onFileLoaded) {
    // 1. Create an <input> element
    const input = document.createElement('input');
    input.type = 'file'; // Set it to be a file picker
    input.accept = accept; // Apply the file type filter
    input.style.display = 'none'; // Hide it from the user

    // 2. Add a 'change' event listener. This fires when the user selects a file.
    input.addEventListener('change', (event) => {
        // 4. Clean up: remove the hidden input element
        document.body.removeChild(input);
        
        // 5. Get the selected file (or files)
        const file = event.target.files[0];
        if (!file) {
            return; // User cancelled the file picker
        }
        
        // 6. Call the provided callback with the file
        onFileLoaded(file);
    });

    // 3. Add the input to the document and click it
    document.body.appendChild(input);
    input.click(); // This is what opens the file picker dialog
}

/**
 * Dynamically loads and processes a 3D model file.
 * This function is the core of the import engine.
 *
 * @param {File} file - The file object from the file picker.
 * @param {string} type - The model type ('glb', 'fbx', or 'obj').
 */
async function loadFile(file, type) {
    if (!file) return;

    // 1. Prepare for loading
    const modelName = getCleanName(file.name);
    // Create a unique ID for the new folder this model will live in
    const folderId = `folder-${Date.now()}`;
    let loader; // Will hold the specific Three.js loader
    let model;  // Will hold the resulting THREE.Group or THREE.Object3D
    
    // 2. Register a new folder in the File Manager *immediately*
    // This makes the folder appear in the workspace UI right away,
    // giving the user instant feedback that loading has started.
    App.fileManager.registerFolder({
        id: folderId,
        name: modelName,
        isOpen: true // Automatically open the folder to show its contents
    });
    // Re-render the workspace UI to show the new (empty) folder
    App.workspace.render();

    try {
        // 3. Load the file based on its type
        switch (type) {
            case 'glb': {
                // Dynamically import the GLTFLoader only when needed
                const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
                loader = new GLTFLoader();
                // Create a temporary object URL for the file
                const url = URL.createObjectURL(file);
                // Use a Promise to handle the loader's async, callback-based API
                model = await new Promise((resolve, reject) => {
                    loader.load(
                        url, // The URL to load
                        (gltf) => { // onSuccess
                            URL.revokeObjectURL(url); // Clean up the object URL
                            resolve(gltf.scene); // The model is in the 'scene' property
                        },
                        undefined, // onProgress (not used)
                        (err) => { // onError
                            URL.revokeObjectURL(url); // Clean up
                            reject(err);
                        }
                    );
                });
                break;
            }
            case 'fbx': {
                // FBX loader has a dependency (fflate) for decompression
                await import('three/examples/jsm/libs/fflate.module.min.js');
                const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
                loader = new FBXLoader();
                // FBXLoader works with an ArrayBuffer (raw binary data)
                const buffer = await file.arrayBuffer();
                model = loader.parse(buffer); // 'parse' is synchronous
                break;
            }
            case 'obj': {
                // OBJ loader is simple and works with plain text
                const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
                loader = new OBJLoader();
                const text = await file.text();
                model = loader.parse(text); // 'parse' is synchronous
                break;
            }
            default:
                throw new Error(`Unsupported import type: ${type}`);
        }

        // --- 4. Process the Loaded Model ---
        if (model) {
            // Set the top-level object's name to our cleaned-up name
            model.name = modelName;
            
            // --- 4a. Auto-Scaling and Centering ---
            // This is a crucial step to ensure models don't import
            // at a gigantic scale or far from the world origin.
            
            // First, get the model's initial bounding box
            model.updateWorldMatrix(true, true);
            const initialBox = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            initialBox.getSize(size);
            
            // Find the model's largest dimension
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // Define a reasonable target size for imported models
            const TARGET_SIZE = 10.0; 
            
            // Check for valid dimensions (not 0 or Infinity)
            if (maxDim > 0 && isFinite(maxDim)) {
                // Calculate the scale factor needed to reach the target size
                const scaleFactor = TARGET_SIZE / maxDim;
                model.scale.set(scaleFactor, scaleFactor, scaleFactor);
            }
            
            // --- 4b. Auto-Centering and Grounding ---
            
            // Recalculate the box *after* scaling
            model.updateWorldMatrix(true, true);
            const scaledBox = new THREE.Box3().setFromObject(model);
            const scaledCenter = new THREE.Vector3();
            scaledBox.getCenter(scaledCenter);
            
            // Set the model's position to:
            // - Center it on the X/Z axes (-scaledCenter.x, -scaledCenter.z)
            // - Place its bottom edge *on* the ground plane (Y=0) by
            //   offsetting it by its scaled minimum Y value.
            model.position.set(
                -scaledCenter.x,
                -scaledBox.min.y, // This "grounds" the model
                -scaledCenter.z
            );

            // --- 4c. Add to Scene ---
            App.scene.add(model);
            
            // --- 4d. Register Meshes and SET SHADOWS ---
            // Traverse the model and find all child meshes
            model.traverse((child) => {
                if (child.isMesh) {
                    // --- NEW: Enable shadow casting/receiving ---
                    child.castShadow = true;    // This mesh will cast a shadow
                    child.receiveShadow = true; // This mesh can have shadows cast on it
                    
                    // Register this individual mesh with the file manager
                    App.fileManager.registerFile({
                        id: child.uuid, // Use the mesh's UUID as its unique ID
                        name: child.name || `${modelName} Mesh`, // Use its name or a default
                        icon: 'mesh',
                        parentId: folderId // Put it inside the folder we created
                    });
                }
            });

            // --- 4e. Final UI Updates ---
            App.workspace.render(); // Re-render workspace to show the new meshes
            App.modal.alert(`Successfully imported ${modelName}`);

        } else {
            throw new Error('Loader did not return a model.');
        }

    } catch (error) {
        // --- 5. Handle Import Error ---
        console.error(`[ImportEngine] Failed to load ${file.name}:`, error);
        App.modal.alert(`Failed to import model: ${error.message}. See console.`);
        // TODO: Clean up the empty folder we created in the fileManager
    }
}

/**
 * The public-facing import function that is attached to App.engine.
 * This is called by the UI (e.g., the menu).
 * @param {string} type - 'glb', 'fbx', or 'obj'
 */
function importModel(type) {
    let accept; // The file extension filter for the file picker
    switch (type) {
        case 'glb':
            accept = '.glb,.gltf'; // Allow both .glb and .gltf
            break;
        case 'fbx':
            accept = '.fbx';
            break;
        case 'obj':
            accept = '.obj';
            break;
        default:
            console.error(`[ImportEngine] Unknown import type: ${type}`);
            return;
    }
    
    // Open the file picker with the correct filter
    // and pass 'loadFile' as the callback function.
    openFilePicker(accept, (file) => {
        loadFile(file, type);
    });
}

/**
 * Initializes the Import Engine module.
 * @param {object} app - The main App object.
 */
export function initImportEngine(app) {
    if (!app || !app.engine) {
        // This module depends on the core 'engine' module being initialized first.
        throw new Error('initImportEngine requires App.engine to be initialized first.');
    }
    
    App = app; // Store the app reference for internal use.
    
    // Attach the public 'importModel' function to the App.engine namespace.
    App.engine.importModel = importModel;
    
    console.log('Import Engine Initialized.');
}
