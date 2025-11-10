// src/core/engine/saveproject.js
// This module provides the functionality to serialize the current
// scene state into a JSON file (a ".tera" project) and trigger
// a browser download for the user.

/**
 * A utility function that creates a file in the user's browser
 * and triggers a "Save As..." download prompt.
 *
 * @param {string} filename - The desired filename for the download (e.g., "MyProject.tera").
 * @param {string} text - The string content to download (in this case, a JSON string).
 */
function triggerDownload(filename, text) {
    // 1. Create a Blob (Binary Large Object) from the text data.
    // We specify the MIME type as 'application/json' so the OS
    // knows what kind of file it is.
    const blob = new Blob([text], { type: 'application/json' });
    
    // 2. Create a temporary, local URL that points to this Blob
    // in the browser's memory.
    const url = URL.createObjectURL(blob);
    
    // 3. Create a hidden <a> (anchor/link) element.
    const a = document.createElement('a');
    a.href = url; // Set the link's target to our blob URL.
    
    // 4. Set the 'download' attribute. This is the magic attribute that
    // tells the browser to download the linked file instead of
    // navigating to it. The value is the suggested filename.
    a.download = filename;
    
    // 5. Add the link to the document, programmatically click it,
    // and then immediately remove it.
    document.body.appendChild(a);
    a.click(); // This triggers the download prompt.
    
    // 6. Clean up.
    document.body.removeChild(a); // Remove the hidden link from the DOM.
    // Revoke the temporary object URL to free up browser memory.
    URL.revokeObjectURL(url);
    
    console.log(`[Engine] Project saved as ${filename}`);
}

/**
 * The main "Save Project" function.
 * It gathers scene data, serializes it to JSON, and triggers a download.
 */
function saveProject() {
    // 'this' is bound to App.engine, so 'this.App' is the main App object.
    if (!this.App || !this.App.scene) {
        console.error('Engine: App object not set or scene is missing.');
        return;
    }
    
    const App = this.App;

    // --- 1. Get Project Name ---
    // Get the currently stored project name as the default for the prompt.
    const currentName = App.engine.projectName || 'Untitled Project';
    
    // Show a native browser prompt to ask the user to name their file.
    const newName = window.prompt("Save project as:", currentName);
    
    if (!newName) {
        // If the user clicked "Cancel" or left the name blank,
        // 'newName' will be null or an empty string. We stop here.
        console.log('[Engine] Save cancelled.');
        return; 
    }
    
    // Update the app's stored project name with the new name.
    App.engine.projectName = newName;
    const filename = `${newName}.tera`; // Add our custom file extension

    // --- 2. Serialize the Scene ---
    // This is the core of the save system.
    // `App.scene.toJSON()` is a built-in Three.js method that
    // traverses the entire scene graph and converts *everything*
    // (objects, geometries, materials, textures, userData)
    // into a large JSON object that follows the Three.js Object Format.
    const sceneData = App.scene.toJSON();

    // --- 3. Create the Final .tera File Structure ---
    // We wrap the Three.js scene data in our own parent object.
    // This allows us to add our own app-specific metadata.
    const teraFileData = {
        metadata: {
            version: '1.0.0', // Your app's version
            projectName: newName,
            createdAt: new Date().toISOString() // Save a timestamp
        },
        scene: sceneData
        // In the future, we could add other top-level keys here, like:
        // 'editorSettings': { ... },
        // 'bookmarks': [ ... ],
        // 'customScriptData': { ... }
    };

    // --- 4. Convert to JSON and Trigger Download ---
    try {
        // Convert the final JavaScript object into a JSON string.
        // `JSON.stringify(..., null, 2)` "pretty-prints" the JSON
        // with 2-space indentation, making the .tera file human-readable.
        const jsonString = JSON.stringify(teraFileData, null, 2);
        
        // Pass the filename and the JSON string to our download helper.
        triggerDownload(filename, jsonString);
        
    } catch (error) {
        // This could fail if the scene is *extremely* large or
        // contains circular references (though toJSON() handles most of this).
        console.error('[Engine] Failed to serialize project:', error);
        App.modal.alert('Failed to save project. See console for details.');
    }
}

/**
 * Initializes the Save Project module by attaching its
 * function to the main App.engine object.
 * @param {object} App - The main App object.
 */
export function initSaveProject(App) {
    if (!App || !App.engine) {
        // This depends on 'initEngine' (newproject.js) having run first.
        throw new Error('initSaveProject requires App.engine to be initialized first.');
    }
    
    // Add 'saveProject' to the existing engine namespace.
    // We .bind(App.engine) to ensure that when `App.engine.saveProject()`
    // is called, the 'this' inside 'saveProject' refers to 'App.engine',
    // which gives us access to 'this.App'.
    App.engine.saveProject = saveProject.bind(App.engine);
    
    console.log('Save Project Initialized.');
}
