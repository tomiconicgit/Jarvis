// src/core/engine/importengine.js
import * as THREE from 'three';

// Module-level App object
let App;

/**
 * Helper to get a clean model name from a filename.
 * e.g., "my_cool_building.glb" -> "My Cool Building"
 * @param {string} filename
 * @returns {string}
 */
function getCleanName(filename) {
    // Remove extension
    let name = filename.split('.').slice(0, -1).join('.');
    // Replace underscores/hyphens with spaces
    name = name.replace(/[_-]/g, ' ');
    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Prompts the user to select a file.
 * @param {string} accept - The file types to accept (e.g., ".glb,.gltf")
 * @param {function} onFileLoaded - Callback(file)
 */
function openFilePicker(accept, onFileLoaded) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    input.addEventListener('change', (event) => {
        document.body.removeChild(input); // Clean up
        const file = event.target.files[0];
        if (!file) {
            return; // User cancelled
        }
        onFileLoaded(file);
    });

    document.body.appendChild(input);
    input.click();
}

/**
 * Dynamically loads and processes a 3D model file.
 * @param {File} file - The file object from the picker.
 * @param {string} type - 'glb', 'fbx', or 'obj'
 */
async function loadFile(file, type) {
    if (!file) return;

    const modelName = getCleanName(file.name);
    const folderId = `folder-${Date.now()}`;
    let loader;
    let model;
    
    // 1. Create the folder in the workspace UI
    App.fileManager.registerFolder({
        id: folderId,
        name: modelName,
        isOpen: true // Open it by default
    });
    // Immediately render to show the folder
    App.workspace.render();

    try {
        switch (type) {
            // --- GLB / GLTF ---
            case 'glb': {
                const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
                loader = new GLTFLoader();
                const url = URL.createObjectURL(file);
                
                // Use a promise to handle async load
                model = await new Promise((resolve, reject) => {
                    loader.load(url, (gltf) => {
                        URL.revokeObjectURL(url);
                        resolve(gltf.scene);
                    }, undefined, (err) => {
                        URL.revokeObjectURL(url);
                        reject(err);
                    });
                });
                break;
            }

            // --- FBX ---
            case 'fbx': {
                // FBXLoader needs fflate, which is in the importmap
                await import('three/examples/jsm/libs/fflate.module.min.js');
                const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
                loader = new FBXLoader();
                const buffer = await file.arrayBuffer();
                model = loader.parse(buffer);
                break;
            }

            // --- OBJ ---
            case 'obj': {
                const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
                loader = new OBJLoader();
                const text = await file.text();
                model = loader.parse(text);
                break;
            }
                
            default:
                throw new Error(`Unsupported import type: ${type}`);
        }

        // --- 3. Process and add the model to the scene ---
        if (model) {
            model.name = modelName; // Name the root group
            App.scene.add(model);
            
            // 4. Register all meshes with the file manager
            model.traverse((child) => {
                if (child.isMesh) {
                    App.fileManager.registerFile({
                        id: child.uuid,
                        name: child.name || `${modelName} Mesh`,
                        icon: 'mesh',
                        parentId: folderId // Add to our new folder
                    });
                }
            });

            // 5. Re-render workspace to show new items
            App.workspace.render();
            App.modal.alert(`Successfully imported ${modelName}`);

        } else {
            throw new Error('Loader did not return a model.');
        }

    } catch (error) {
        console.error(`[ImportEngine] Failed to load ${file.name}:`, error);
        App.modal.alert(`Failed to import model: ${error.message}. See console.`);
        // TODO: Clean up the empty folder we created
    }
}

/**
 * The public-facing import function.
 * @param {string} type - 'glb', 'fbx', or 'obj'
 */
function importModel(type) {
    let accept;
    switch (type) {
        case 'glb':
            accept = '.glb,.gltf';
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

    // Open file picker, which triggers loadFile on success
    openFilePicker(accept, (file) => {
        loadFile(file, type);
    });
}


/**
 * Initializes the Import Engine module.
 */
export function initImportEngine(app) {
    if (!app || !app.engine) {
        throw new Error('initImportEngine requires App.engine to be initialized first.');
    }
    
    App = app; // Store the app reference
    
    // Add importModel to the existing engine
    App.engine.importModel = importModel;
    
    console.log('Import Engine Initialized.');
}
