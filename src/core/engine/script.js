// src/core/engine/script.js
// This module provides the "Script Engine," which is responsible for
// creating, attaching, and (eventually) running custom scripts
// on objects in the scene.

import * as THREE from 'three';

// Module-level variable to store a reference to the main App object.
let App;

/**
 * Creates a script and attaches its data to the selected scene object.
 * This is the function called by the modal's "OK" button.
 *
 * @param {string} parentObjectId - The UUID of the scene object to attach this script to.
 * @param {string} scriptName - The user-given name for the script.
 * @param {string} scriptContent - The raw text (code) of the script.
 */
function createScript(parentObjectId, scriptName, scriptContent) {
    if (!parentObjectId || !scriptName) {
        // Basic validation
        App.modal.alert("Error: Script must have a name and a parent object.");
        return;
    }
    
    // 1. Find the parent scene object (e.g., a Mesh or Group) using its UUID.
    // We search the entire scene graph for an object with this ID.
    const parentObject = App.scene.getObjectByProperty('uuid', parentObjectId);
    if (!parentObject) {
        App.modal.alert(`Error: Could not find parent object with ID ${parentObjectId} in the scene.`);
        return;
    }

    // 2. Find the parent's file manager entry.
    // We need this to determine *which folder* the parent object is in,
    // so we can place the new script file in the same folder.
    const parentFileEntry = App.fileManager.findFileById(parentObjectId);
    if (!parentFileEntry) {
        App.modal.alert(`Error: Could not find parent object with ID ${parentObjectId} in the file manager.`);
        return;
    }
    const parentFolderId = parentFileEntry.parentId;

    // 3. Generate a new, unique ID for this script asset.
    const scriptId = THREE.MathUtils.generateUUID();

    // 4. Store the script data directly in the parent object's 'userData'.
    // 'userData' is a special property on all Three.js objects
    // designed for storing custom application data.
    if (!parentObject.userData.scripts) {
        parentObject.userData.scripts = []; // Initialize the array if it doesn't exist
    }
    
    // Add the new script's data to the array.
    parentObject.userData.scripts.push({
        id: scriptId,
        name: scriptName,
        content: scriptContent // The actual code
    });

    // 5. Register the script as a "file" in the workspace UI.
    // This makes the script appear as an item in the file manager.
    App.fileManager.registerFile({
        id: scriptId,          // The script's unique ID
        name: scriptName,      // Its display name
        icon: 'script',        // This tells the UI to use the 'script' icon
        parentId: parentFolderId // Place it in the same folder as its parent object
    });

    // 6. Update the UI.
    App.workspace.render(); // Re-render the workspace to show the new script file.
    App.modal.hide();       // Close the "Add New Script" modal.
    
    console.log(`[ScriptEngine] Created script "${scriptName}" and attached to "${parentObject.name}"`);
}


/**
 * Shows the modal dialog to create a new script.
 * This is the public function called by the "Add Panel" UI.
 */
function showAddScriptModal() {
    
    // 1. Get all folders and items from the file manager.
    // We will use this to build a <select> dropdown of all
    // valid objects that a script can be attached to.
    const folders = App.fileManager.getFolders();
    
    // 2. Build the <select> <option> and <optgroup> HTML.
    const objectOptions = folders.map(folder => {
        // We can't attach scripts to the "Default" folder itself,
        // especially if it's empty.
        if (folder.id === 'default' && folder.items.length === 0) return '';
        
        // Map all *items* inside this folder to <option> tags.
        const items = folder.items.map(item => {
            // We can't attach a script to another script.
            if (item.icon === 'script') return '';
            
            // The 'value' is the item's ID (which is the scene object's UUID).
            // The text is the item's display name.
            return `<option value="${item.id}">${item.name}</option>`;
        }).join('');
        
        // Wrap the items in an <optgroup> labeled with the folder's name.
        return `<optgroup label="${folder.name}">${items}</optgroup>`;
    }).join('');
    
    // If there are no valid objects at all, alert the user and stop.
    if (!objectOptions) {
        App.modal.alert("There are no objects in the workspace to add a script to.");
        return;
    }

    // 3. Build the modal's form HTML.
    const modalHtml = `
        <div class="modal-form-group">
            <label for="script-parent-object">Add Script To:</label>
            <select id="script-parent-object" class="modal-select">
                ${objectOptions}
            </select>
        </div>
        
        <div class="modal-form-group">
            <label for="script-name">Script Name</label>
            <input type="text" id="script-name" class="modal-input" placeholder="MyScript">
        </div>
        
        <div class="modal-form-group">
            <label for="script-content">Script Content (placeholder)</label>
            <textarea id="script-content" class="modal-input" rows="6" style="height: 120px; font-family: monospace;" placeholder="e.g., // 'this' refers to the object...&#10;this.rotation.y += 0.01;"></textarea>
        </div>
    `;
    
    // 4. Show the custom modal.
    App.modal.custom({
        title: "Add New Script",
        html: modalHtml,
        confirmText: "OK",
        onConfirm: (modalBody) => {
            // 5. This callback runs when the user clicks "OK".
            // We get the values from the form fields...
            const parentId = modalBody.querySelector('#script-parent-object').value;
            const scriptName = modalBody.querySelector('#script-name').value || 'UntitledScript';
            const scriptContent = modalBody.querySelector('#script-content').value;
            
            // ...and pass them to our 'createScript' function.
            createScript(parentId, scriptName, scriptContent);
        }
    });
}

/**
 * Initializes the Scripting Engine and attaches it to the App.
 * @param {object} app - The main App object.
 */
export function initScriptEngine(app) {
    if (!app) throw new Error('initScriptEngine requires an App object.');
    
    App = app; // Store the App reference.
    
    // Create the 'App.scriptEngine' namespace.
    App.scriptEngine = {
        showAddScriptModal: showAddScriptModal,
        createScript: createScript
        // In the future, this would also include:
        // - runScripts(deltaTime)
        // - compileScript(scriptContent)
        // - etc.
    };
    
    console.log('Script Engine Initialized.');
}
