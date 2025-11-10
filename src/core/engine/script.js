--------------------------------------------------------------------------------
File: src/core/engine/script.js
--------------------------------------------------------------------------------
// src/core/engine/script.js
import * as THREE from 'three';

let App;

/**
 * Creates the script and attaches it to the selected object.
 * This is called by the modal's "OK" button.
 */
function createScript(parentObjectId, scriptName, scriptContent) {
    if (!parentObjectId || !scriptName) {
        App.modal.alert("Error: Script must have a name and a parent object.");
        return;
    }
    
    // 1. Find the parent scene object by its UUID
    const parentObject = App.scene.getObjectByProperty('uuid', parentObjectId);
    if (!parentObject) {
        App.modal.alert(`Error: Could not find parent object with ID ${parentObjectId} in the scene.`);
        return;
    }

    // 2. Find the parent's file manager entry to get its folder
    const parentFileEntry = App.fileManager.findFileById(parentObjectId);
    if (!parentFileEntry) {
        App.modal.alert(`Error: Could not find parent object with ID ${parentObjectId} in the file manager.`);
        return;
    }
    const parentFolderId = parentFileEntry.parentId;

    // 3. Generate a unique ID for the new script
    const scriptId = THREE.MathUtils.generateUUID();

    // 4. Store the script data in the parent object's userData
    if (!parentObject.userData.scripts) {
        parentObject.userData.scripts = [];
    }
    parentObject.userData.scripts.push({
        id: scriptId,
        name: scriptName,
        content: scriptContent
    });

    // 5. Register the script as a "file" in the workspace
    // It will appear in the same folder as its parent object.
    App.fileManager.registerFile({
        id: scriptId,
        name: scriptName,
        icon: 'script',       // This will use the new icon
        parentId: parentFolderId 
    });

    // 6. Update the UI
    App.workspace.render();
    App.modal.hide();
    
    console.log(`[ScriptEngine] Created script "${scriptName}" and attached to "${parentObject.name}"`);
}


/**
 * Shows the modal dialog to create a new script.
 */
function showAddScriptModal() {
    
    // 1. Get all folders and items from the file manager
    const folders = App.fileManager.getFolders();
    
    // 2. Build the <select> options from the file manager data
    // This ensures we only show objects the user can see in the workspace
    const objectOptions = folders.map(folder => {
        // We can't attach scripts to the default, empty, "Default" folder
        if (folder.id === 'default' && folder.items.length === 0) return '';
        
        const items = folder.items.map(item => {
            // We can't attach a script to another script
            if (item.icon === 'script') return '';
            return `<option value="${item.id}">${item.name}</option>`;
        }).join('');
        
        return `<optgroup label="${folder.name}">${items}</optgroup>`;
    }).join('');
    
    if (!objectOptions) {
        App.modal.alert("There are no objects in the workspace to add a script to.");
        return;
    }

    // 3. Build the modal HTML
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
            <label for="script-content">Script Content</label>
            <textarea id="script-content" class="modal-input" rows="6" style="height: 120px; font-family: monospace;"></textarea>
        </div>
    `;
    
    // 4. Show the modal
    App.modal.custom({
        title: "Add New Script",
        html: modalHtml,
        confirmText: "OK",
        onConfirm: (modalBody) => {
            // 5. Get values and call createScript
            const parentId = modalBody.querySelector('#script-parent-object').value;
            const scriptName = modalBody.querySelector('#script-name').value || 'UntitledScript';
            const scriptContent = modalBody.querySelector('#script-content').value;
            
            createScript(parentId, scriptName, scriptContent);
        }
    });
}

/**
 * Initializes the Scripting Engine.
 */
export function initScriptEngine(app) {
    if (!app) throw new Error('initScriptEngine requires an App object.');
    
    App = app;
    
    App.scriptEngine = {
        showAddScriptModal: showAddScriptModal,
        createScript: createScript
    };
    
    console.log('Script Engine Initialized.');
}
