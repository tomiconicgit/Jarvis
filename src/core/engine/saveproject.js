// src/core/engine/saveproject.js

/**
 * Triggers a browser download for the given content.
 * @param {string} filename - The desired filename (e.g., "MyProject.tera").
 * @param {string} text - The string content to download.
 */
function triggerDownload(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`[Engine] Project saved as ${filename}`);
}

/**
 * Gathers scene data, serializes it, and triggers a download.
 */
function saveProject() {
    if (!this.App || !this.App.scene) {
        console.error('Engine: App object not set or scene is missing.');
        return;
    }
    
    const App = this.App;

    // 1. Get Project Name
    const currentName = App.engine.projectName || 'Untitled Project';
    const newName = window.prompt("Save project as:", currentName);
    
    if (!newName) {
        console.log('[Engine] Save cancelled.');
        return; // User cancelled
    }
    
    App.engine.projectName = newName; // Update the stored name
    const filename = `${newName}.tera`;

    // 2. Serialize the entire Three.js scene
    // This captures objects, hierarchy, materials, geometry, etc.
    const sceneData = App.scene.toJSON();

    // 3. Create the final .tera file structure
    const teraFileData = {
        metadata: {
            version: '1.0.0', // Your app version
            projectName: newName,
            createdAt: new Date().toISOString()
        },
        scene: sceneData
        // We can add other top-level keys here later,
        // like 'bookmarks', 'editorSettings', etc.
    };

    // 4. Convert to JSON string and trigger download
    try {
        const jsonString = JSON.stringify(teraFileData, null, 2); // Pretty-print
        triggerDownload(filename, jsonString);
    } catch (error) {
        console.error('[Engine] Failed to serialize project:', error);
        App.modal.alert('Failed to save project. See console for details.');
    }
}

/**
 * Initializes the Save Project module by attaching its
 * functions to the main App.engine object.
 */
export function initSaveProject(App) {
    if (!App || !App.engine) {
        throw new Error('initSaveProject requires App.engine to be initialized first.');
    }
    
    // Add saveProject to the existing engine, binding 'this'
    App.engine.saveProject = saveProject.bind(App.engine);
    
    console.log('Save Project Initialized.');
}
