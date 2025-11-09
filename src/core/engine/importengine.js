// src/core/engine/importengine.js
import * as THREE from 'three';

// ... (getCleanName and openFilePicker functions are unchanged) ...
function getCleanName(filename) {
    let name = filename.split('.').slice(0, -1).join('.');
    name = name.replace(/[_-]/g, ' ');
    return name.charAt(0).toUpperCase() + name.slice(1);
}
function openFilePicker(accept, onFileLoaded) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', (event) => {
        document.body.removeChild(input);
        const file = event.target.files[0];
        if (!file) {
            return;
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
    
    App.fileManager.registerFolder({
        id: folderId,
        name: modelName,
        isOpen: true
    });
    App.workspace.render();

    try {
        switch (type) {
            case 'glb': {
                const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
                loader = new GLTFLoader();
                const url = URL.createObjectURL(file);
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
            case 'fbx': {
                await import('three/examples/jsm/libs/fflate.module.min.js');
                const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
                loader = new FBXLoader();
                const buffer = await file.arrayBuffer();
                model = loader.parse(buffer);
                break;
            }
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

        if (model) {
            model.name = modelName;
            
            // Auto-Scaling and Centering
            model.updateWorldMatrix(true, true);
            const initialBox = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            initialBox.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const TARGET_SIZE = 10.0; 
            if (maxDim > 0 && isFinite(maxDim)) {
                const scaleFactor = TARGET_SIZE / maxDim;
                model.scale.set(scaleFactor, scaleFactor, scaleFactor);
            }
            model.updateWorldMatrix(true, true);
            const scaledBox = new THREE.Box3().setFromObject(model);
            const scaledCenter = new THREE.Vector3();
            scaledBox.getCenter(scaledCenter);
            model.position.set(
                -scaledCenter.x,
                -scaledBox.min.y,
                -scaledCenter.z
            );

            App.scene.add(model);
            
            // 4. Register meshes and SET SHADOWS
            model.traverse((child) => {
                if (child.isMesh) {
                    // --- NEW ---
                    child.castShadow = true;    // <-- This mesh will cast a shadow
                    child.receiveShadow = true; // <-- This mesh can have shadows cast on it
                    // --- END NEW ---
                    
                    App.fileManager.registerFile({
                        id: child.uuid,
                        name: child.name || `${modelName} Mesh`,
                        icon: 'mesh',
                        parentId: folderId
                    });
                }
            });

            // 5. Re-render workspace
            App.workspace.render();
            App.modal.alert(`Successfully imported ${modelName}`);

        } else {
            throw new Error('Loader did not return a model.');
        }

    } catch (error) {
        console.error(`[ImportEngine] Failed to load ${file.name}:`, error);
        App.modal.alert(`Failed to import model: ${error.message}. See console.`);
    }
}

// ... (importModel and initImportEngine functions are unchanged) ...
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
    openFilePicker(accept, (file) => {
        loadFile(file, type);
    });
}
export function initImportEngine(app) {
    if (!app || !app.engine) {
        throw new Error('initImportEngine requires App.engine to be initialized first.');
    }
    App = app;
    App.engine.importModel = importModel;
    console.log('Import Engine Initialized.');
}
