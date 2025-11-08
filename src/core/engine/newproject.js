// src/core/engine/newproject.js

/**
 * Clears all selectable assets from the scene.
 */
function clearScene(App) {
    // ... (this function is unchanged)
    if (!App || !App.scene || !App.fileManager || !App.selectionContext) {
        console.error('Engine: App is not ready for clearScene.');
        return;
    }
    console.log('[Engine] Clearing scene...');
    App.selectionContext.clear();
    const folders = App.fileManager.getFolders();
    let itemsToRemove = [];
    folders.forEach(folder => {
        itemsToRemove = itemsToRemove.concat(folder.items);
    });
    itemsToRemove.forEach(item => {
        const object = App.scene.getObjectByName(item.name);
        if (object) {
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
    App.fileManager.reset();
}

/**
 * Re-initializes the default scene assets.
 */
function rebuildScene(App) {
    // ... (this function is unchanged)
    if (!App || !App.defaultSceneInits) {
        console.error('Engine: App is not ready for rebuildScene.');
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
 * The main "New Project" function.
 */
function newProject() {
    // We need the App object.
    if (!this.App) {
        console.error('Engine: App object not set.');
        return;
    }
    
    // --- UPDATED: Use prompt to get a name ---
    const projectName = window.prompt("Enter new project name:", "Untitled Project");

    // If the user cancelled, `projectName` will be null
    if (projectName === null) {
        console.log('[Engine] New project cancelled.');
        return; 
    }
    
    // User clicked OK. Store the name.
    this.App.engine.projectName = projectName || 'Untitled Project';
    
    // 1. Wipe the scene
    clearScene(this.App);
    
    // 2. Rebuild the default assets
    rebuildScene(this.App);
    
    // 3. Re-render the workspace UI
    if (this.App.workspace && this.App.workspace.render) {
        this.App.workspace.render();
    }
}

/**
 * Initializes the engine and attaches it to the App.
 */
export function initEngine(App) {
    if (!App) throw new Error('initEngine requires an App object.');
    
    // Create the engine namespace
    App.engine = {
        App: App, // Store App for internal use
        projectName: 'Untitled Project', // <-- Set default name
        newProject: newProject.bind({ App: App }) // Bind App
    };
    
    console.log('Engine Initialized.');
}
