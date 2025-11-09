// src/core/engine/loadproject.js
import * as THREE from 'three';

// ---
// NOTE: These helpers are duplicated from newproject.js
// This is necessary because they are not exported, and we need
// to clear the scene before loading and rebuild it if loading fails.
// ---

/**
 * Clears all selectable assets from the scene.
 */
function _clearScene(App) {
    if (!App || !App.scene || !App.fileManager || !App.selectionContext) {
        console.error('Engine: App is not ready for _clearScene.');
        return;
    }
    console.log('[Engine] Clearing scene for load...');
    App.selectionContext.clear();
    
    // Get all items to remove
    const itemsToRemove = [];
    App.scene.children.forEach(child => {
        // We only clear objects that are "managed" (i.e., have userData
        // set by our app) or are common mesh types.
        // We AVOID clearing lights, helpers, or cameras added by other systems.
        if (child.isMesh || child.userData.isEnvironment) {
            itemsToRemove.push(child);
        }
    });

    // Dispose and remove them
    itemsToRemove.forEach(object => {
        object.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        App.scene.remove(object);
    });

    // Also clear background and environment
    App.scene.background = null;
    App.scene.environment = null;
    
    App.fileManager.reset();
}

/**
 * Re-initializes the default scene assets.
 */
function _rebuildScene(App) {
    if (!App || !App.defaultSceneInits) {
        console.error('Engine: App is not ready for _rebuildScene.');
        return;
    }
    console.log('[Engine] Rebuilding default scene...');
    App.defaultSceneInits.forEach(initFunc => {
        if (typeof initFunc === 'function') {
            initFunc(App);
        }
    });
}

/**
 * Re-builds the file manager state from the loaded scene objects.
 */
function _rebuildFileManager(App) {
    console.log('[Engine] Rebuilding file manager from loaded scene...');
    App.scene.children.forEach(object => {
        let file = null;
        
        if (object.userData.isEnvironment) {
            // This is our special environment group
            file = {
                id: `env-${object.uuid}`,
                name: object.name || 'Environment',
                icon: 'sky',
                parentId: 'default'
            };
        } else if (object.isMesh) {
            // This is a standard mesh
            file = {
                id: `mesh-${object.uuid}`,
                name: object.name || 'Loaded Mesh',
                icon: 'mesh',
                parentId: 'default'
            };
        }
        // TODO: Add cases for lights, etc. as app grows
        
        if (file) {
            App.fileManager.registerFile(file);
        }
    });
}

/**
 * Prompts the user to select a .tera file and reads it.
 * @param {function} onFileLoaded - Callback(content, filename)
 * @param {object} App - The main App object (for modal alerts)
 */
function openFilePicker(onFileLoaded, App) {
    const input = document.createElement('input');
    input.type = 'file';
    
    // As per your prompt, we look for ".tera.json".
    // However, saveproject.js saves as ".tera". We should match that.
    // I'll stick to .tera to ensure compatibility.
    input.accept = '.tera'; 
    input.style.display = 'none';

    input.addEventListener('change', (event) => {
        document.body.removeChild(input); // Clean up
        const file = event.target.files[0];
        if (!file) {
            return; // User cancelled
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            onFileLoaded(e.target.result, file.name);
        };
        reader.onerror = (e) => {
            console.error('[Engine] File reading error:', e);
            App.modal.alert('Failed to read file. See console for details.');
        };
        reader.readAsText(file);
    });

    document.body.appendChild(input);
    input.click();
}

/**
 * Main Load Project function.
 */
function loadProject() {
    const App = this.App; // 'this' is App.engine

    openFilePicker((fileContent, fileName) => {
        let projectData;
        try {
            // --- 1. Parse and Validate File ---
            projectData = JSON.parse(fileContent);
            
            if (!projectData.metadata || !projectData.scene) {
                throw new Error('Invalid project file: "metadata" or "scene" key missing.');
            }
            if (projectData.scene.object.type !== 'Scene') {
                 throw new Error('Invalid scene data: Not a Three.js Scene.');
            }

        } catch (parseError) {
            console.error('[Engine] Failed to parse project file:', parseError);
            App.modal.alert(`Failed to load project: ${parseError.message}`);
            return;
        }

        try {
            // --- 2. Clear existing scene ---
            _clearScene(App);

            // --- 3. Load new scene data ---
            const loader = new THREE.ObjectLoader();
            const loadedScene = loader.parse(projectData.scene);

            // --- 4. Re-hydrate App.scene ---
            // We must transfer properties and children, not replace App.scene itself.
            App.scene.background = loadedScene.background;
            App.scene.environment = loadedScene.environment;
            
            // Move all children from loaded scene to main scene
            while(loadedScene.children.length > 0) {
                App.scene.add(loadedScene.children[0]);
            }

            // --- 5. Re-build File Manager ---
            _rebuildFileManager(App);

            // --- 6. Update UI ---
            if (App.workspace && App.workspace.render) {
                App.workspace.render();
            }
            
            // --- 7. Update project name ---
            const projectName = projectData.metadata.projectName || fileName.replace('.tera', '');
            App.engine.projectName = projectName;
            
            console.log(`[Engine] Project "${projectName}" loaded successfully.`);
            // App.modal.alert(`Project "${projectName}" loaded.`); // (Optional: can be annoying)

        } catch (loadError) {
            console.error('[Engine] Error applying loaded scene:', loadError);
            App.modal.alert(`Error loading project: ${loadError.message}. Restoring default scene.`);
            
            // --- 8. CRITICAL: Restore default scene on fail ---
            _clearScene(App); // Clear the broken state
            _rebuildScene(App); // Build the default scene
            
            if (App.workspace && App.workspace.render) {
                App.workspace.render(); // Re-render UI
            }
        }

    }, App); // Pass App for modal alerts
}

/**
 * Initializes the Load Project module by attaching its
 * functions to the main App.engine object.
 */
export function initLoadProject(App) {
    if (!App || !App.engine) {
        throw new Error('initLoadProject requires App.engine to be initialized first.');
    }
    
    // Add loadProject to the existing engine, binding 'this'
    App.engine.loadProject = loadProject.bind(App.engine);
    
    console.log('Load Project Initialized.');
}
