// src/core/engine/newproject.js

/**
 * Clears all selectable assets from the scene.
 */
function clearScene(App) {
    if (!App || !App.scene || !App.fileManager || !App.selectionContext) {
        console.error('Engine: App is not ready for clearScene.');
        return;
    }
    
    console.log('[Engine] Clearing scene...');
    
    // 1. Clear any active selection
    App.selectionContext.clear();
    
    // 2. Get a list of all items from the file manager
    const folders = App.fileManager.getFolders();
    let itemsToRemove = [];
    folders.forEach(folder => {
        itemsToRemove = itemsToRemove.concat(folder.items);
    });

    // 3. Find and remove each item from the scene
    itemsToRemove.forEach(item => {
        const object = App.scene.getObjectByName(item.name);
        if (object) {
            // Recursively dispose of geometry/material
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
            console.log(`[Engine] Removed: ${item.name}`);
        }
    });
    
    // 4. Reset the file manager's internal state
    App.fileManager.reset();
}

/**
 * Re-initializes the default scene assets.
 */
function rebuildScene(App) {
    if (!App || !App.defaultSceneInits) {
        console.error('Engine: App is not ready for rebuildScene.');
        return;
    }
    
    console.log('[Engine] Rebuilding default scene...');
    
    // Run all the stored init functions (initTerrain, initLighting, etc.)
    App.defaultSceneInits.forEach(initFunc => {
        if (typeof initFunc === 'function') {
            initFunc(App);
        }
    });
}

/**
 * The main "New Project" function.
 */
function newProject() {
    // For now, we use a simple browser confirm.
    // We can replace this with App.modal.confirm() later.
    const isConfirmed = window.confirm(
        "Create a new project?\n\nAll unsaved changes will be lost."
    );
    
    if (isConfirmed) {
        // We need the App object.
        // We assume initEngine has stored it.
        if (!this.App) {
            console.error('Engine: App object not set.');
            return;
        }
        
        // 1. Wipe the scene
        clearScene(this.App);
        
        // 2. Rebuild the default assets
        rebuildScene(this.App);
        
        // 3. Re-render the workspace UI
        if (this.App.workspace && this.App.workspace.render) {
            this.App.workspace.render();
        }
    }
}

/**
 * Initializes the engine and attaches it to the App.
 */
export function initEngine(App) {
    if (!App) throw new Error('initEngine requires an App object.');
    
    // Bind the App object to the newProject function
    App.engine = {
        App: App, // Store App for internal use
        newProject: newProject
    };
    
    console.log('Engine Initialized.');
}
