// src/core/engine/newproject.js
// This module provides the core "Engine" namespace (App.engine)
// and the main function for creating a "New Project".

/**
 * (Private) Clears all selectable/managed assets from the scene.
 * This is called when the user starts a new project.
 * @param {object} App - The main App object.
 */
function clearScene(App) {
    // 1. Safety check
    if (!App || !App.scene || !App.fileManager || !App.selectionContext) {
        console.error('Engine: App is not ready for clearScene.');
        return;
    }
    console.log('[Engine] Clearing scene...');
    
    // 2. Clear any active selection
    App.selectionContext.clear();
    
    // 3. Get all folders and items from the file manager
    // This is a robust way to find *all* managed items.
    const folders = App.fileManager.getFolders();
    let itemsToRemove = [];
    folders.forEach(folder => {
        // Collect all file items from all folders
        itemsToRemove = itemsToRemove.concat(folder.items);
    });

    // 4. Find, dispose, and remove each item's corresponding scene object
    itemsToRemove.forEach(item => {
        // Find the 3D object in the scene using the name from the file manager
        // (This relies on folder/mesh names matching the file manager entry names)
        const object = App.scene.getObjectByName(item.name); 
        
        if (object) {
            // Traverse the object and all its children to dispose of GPU memory
            object.traverse(obj => {
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
            console.log(`[Engine] Removed: ${item.name}`);
        }
    });
    
    // 5. Reset the file manager state (clears all folders/files)
    App.fileManager.reset();
}

/**
 * (Private) Re-initializes the default scene assets (terrain, light, sky).
 * @param {object} App - The main App object.
 */
function rebuildScene(App) {
    // 1. Safety check
    if (!App || !App.defaultSceneInits) {
        console.error('Engine: App is not ready for rebuildScene.');
        return;
    }
    console.log('[Engine] Rebuilding default scene...');
    
    // 2. 'App.defaultSceneInits' is an array of functions
    // (e.g., initTerrain, initLighting, initEnvironment)
    // that was loaded and stored by main.js during startup.
    // We just call each function, and it re-adds its asset.
    App.defaultSceneInits.forEach(initFunc => {
        if (typeof initFunc === 'function') {
            initFunc(App);
        }
    });
}

/**
 * The main "New Project" function.
 * This is the public function attached to App.engine.
 */
function newProject() {
    // 'this' is bound to an object { App: App }, so 'this.App' is the main App object.
    if (!this.App) {
        console.error('Engine: App object not set.');
        return;
    }
    
    // --- UPDATED: Use a native 'prompt' to get a project name ---
    const projectName = window.prompt("Enter new project name:", "Untitled Project");

    // If the user clicks "Cancel", `projectName` will be null.
    if (projectName === null) {
        console.log('[Engine] New project cancelled.');
        return; // Stop the "New Project" process
    }
    
    // User clicked "OK". Store the new name (or the default if they left it blank).
    // This name is stored on the engine itself.
    this.App.engine.projectName = projectName || 'Untitled Project';
    
    // 1. Wipe the scene of all managed assets
    clearScene(this.App);
    
    // 2. Rebuild the default assets (terrain, light, sky)
    rebuildScene(this.App);
    
    // 3. Re-render the workspace UI
    // This will show the file manager with the new default assets.
    if (this.App.workspace && this.App.workspace.render) {
        this.App.workspace.render();
    }
}

/**
 * Initializes the main Engine namespace (App.engine) and attaches it to the App.
 * This is the *first* engine module to be initialized.
 * @param {object} App - The main App object.
 */
export function initEngine(App) {
    if (!App) throw new Error('initEngine requires an App object.');
    
    // Create the 'engine' namespace on the main App object.
    App.engine = {
        App: App, // Store a reference to App for internal use by engine functions
        projectName: 'Untitled Project', // Set the default project name
        
        // Add the 'newProject' function to the engine.
        // We .bind({ App: App }) to ensure that when `App.engine.newProject()`
        // is called, the 'this' inside newProject refers to '{ App: App }'.
        newProject: newProject.bind({ App: App })
    };
    
    console.log('Engine Initialized.');
}
