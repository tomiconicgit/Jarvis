// src/core/ui/propertiespanel.js
// This module creates the UI *content* for the "Properties" panel.
// It injects its HTML into the '#properties-panel-container'
// which was created by 'editorbar.js'. It listens for selection
// events to display data about the currently selected object.

let App; // Module-level reference to the main App object
let panelContainer; // The '#properties-panel-container' HTML element

/**
 * Creates and injects the CSS styles for the properties panel.
 */
function injectStyles() {
    const styleId = 'properties-panel-ui-styles';
    // Only inject if the styles don't already exist
    if (document.getElementById(styleId)) return;

    const css = `
        #properties-panel-content {
            /* This panel is in a container that has a max-height
               so we make this content div scrollable. */
            overflow-y: auto;
            -webkit-overflow-scrolling: touch; /* Smooth scroll on iOS */
        }
        
        /* The placeholder text when nothing is selected */
        .prop-empty-state {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
            font-style: italic;
            text-align: center;
            padding: 20px;
        }

        /* A list of properties */
        .prop-list {
            padding: 0;
        }

        /* A single row in the property list */
        .prop-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            font-size: 14px;
            border-bottom: 1px solid var(--ui-border);
        }
        
        .prop-list:last-child {
            border-bottom: none;
        }

        /* The label (e.g., "Object Name") */
        .prop-label {
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            flex-shrink: 0; /* Don't let the label shrink */
            padding-right: 10px;
        }

        /* The container for the value */
        .prop-value-container {
            flex-grow: 1; /* Let the value take all remaining space */
            text-align: right;
            cursor: pointer; /* Indicates it's clickable */
            color: #fff;
            font-weight: 400;
        }
        
        .prop-value-container:active {
            background: var(--ui-light-grey); /* Click feedback */
        }
        
        /* A style for non-editable values (like UUID) */
        .prop-value-container.is-static {
            cursor: copy; /* Show a 'copy' cursor */
            color: rgba(255,255,255,0.8);
            word-break: break-all; /* Allow long UUIDs to wrap */
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}


/**
 * Creates the HTML markup for the properties panel shell.
 */
function createMarkup() {
    // 1. Find the panel container that 'editorbar.js' created.
    panelContainer = document.getElementById('properties-panel-container');
    if (!panelContainer) {
        console.error('PropertiesPanel: #properties-panel-container not found!');
        return;
    }
    
    // 2. Create the content wrapper div
    const content = document.createElement('div');
    content.id = 'properties-panel-content';
    
    // 3. Add this content div *inside* the panel container
    panelContainer.appendChild(content);

    // 4. Show the initial empty state
    clearPanelData();
    
    // 5. Add an event listener to the content div (event delegation)
    content.addEventListener('click', (event) => {
        // Find the '.prop-value-container' that was clicked
        const target = event.target.closest('.prop-value-container');
        if (!target) return; // Clicked on a label or in a gap

        // Get the action from the 'data-action' attribute
        const action = target.dataset.action;
        const selectedObject = App.selectionContext.getSelected();
        
        // If no action or no object, do nothing
        if (!action || !selectedObject) return;
        
        // Call the appropriate handler function
        switch (action) {
            case 'edit-name':
                handleEditName(selectedObject);
                break;
            case 'copy-uuid':
                handleCopyUuid(selectedObject);
                break;
            case 'edit-position':
                // Note: This is a duplicate from transformpanel.js,
                // could be consolidated.
                handleEditPosition(selectedObject);
                break;
            case 'edit-scale':
                // Note: This is a duplicate from transformpanel.js
                handleEditScale(selectedObject);
                break;
            case 'edit-parent':
                handleEditParent(selectedObject);
                break;
        }
    });
}

/**
 * Fills the panel with data from the selected object.
 * This is called by the 'selectionChanged' event.
 * @param {THREE.Object3D} object - The object that was just selected.
 */
function updatePanelData(object) {
    const content = panelContainer.querySelector('#properties-panel-content');
    if (!content) return;
    
    // --- 1. Get Data from the Object ---
    const name = object.name || '(Unnamed)';
    const uuid = object.uuid;
    const posX = object.position.x.toFixed(2);
    const posY = object.position.y.toFixed(2);
    const posZ = object.position.z.toFixed(2);
    const scaleX = object.scale.x.toFixed(2);
    
    // Find the object's parent folder in the file manager
    const file = App.fileManager.findFileById(object.uuid);
    const parentFolder = file ? App.fileManager.getFolders().find(f => f.id === file.parentId) : null;
    // Get the parent's name, or fall back to the scene object's type
    const parentName = parentFolder ? parentFolder.name : (object.parent ? object.parent.type : 'Scene');

    // --- 2. Helper function to create a row of HTML ---
    const createProp = (label, value, action, isStatic = false) => {
        return `
            <div class="prop-item">
                <span class="prop-label">${label}</span>
                <div class="prop-value-container ${isStatic ? 'is-static' : ''}" 
                     data-action="${action}">
                    ${value}
                </div>
            </div>
        `;
    };

    // --- 3. Build the HTML ---
    let html = '<div class="prop-list">';
    html += createProp('Object Name', name, 'edit-name');
    html += createProp('Unique ID', uuid, 'copy-uuid', true); // 'true' = isStatic
    html += createProp('Object Position', `X: ${posX}, Y: ${posY}, Z: ${posZ}`, 'edit-position');
    html += createProp('Uniform Scale', scaleX, 'edit-scale');
    html += createProp('Parent', parentName, 'edit-parent');
    html += '</div>';

    // --- 4. Inject the HTML into the content div ---
    content.innerHTML = html;
}

/**
 * Clears the panel and shows an empty state.
 * This is called by the 'selectionCleared' event.
 */
function clearPanelData() {
    const content = panelContainer.querySelector('#properties-panel-content');
    if (!content) {
        // If the content div doesn't exist yet (e.g., on init),
        // try again in a moment.
        setTimeout(clearPanelData, 50);
        return;
    }
    content.innerHTML = `
        <div class="prop-empty-state">
            No object selected
        </div>
    `;
}

// ---
// --- CLICK HANDLER FUNCTIONS ---
// ---

/**
 * Handles the "Edit Name" action.
 */
function handleEditName(object) {
    // Use a native 'prompt' to get a new name
    const newName = window.prompt("Enter new object name:", object.name);
    if (newName !== null && newName.trim() !== "") {
        object.name = newName.trim();
        // Update the file manager UI
        App.workspace.render();
        // Update *this* panel's UI
        updatePanelData(object);
    }
}

/**
 * Handles the "Copy UUID" action.
 */
function handleCopyUuid(object) {
    // Use the browser's Clipboard API
    navigator.clipboard.writeText(object.uuid).then(() => {
        App.modal.alert("Unique ID copied to clipboard.");
    }).catch(err => {
        console.warn("Failed to copy UUID:", err);
        App.modal.alert("Failed to copy. See console for details.");
    });
}

/**
 * Handles the "Edit Position" action.
 * (This is a simplified version, the main one is in transformpanel.js)
 */
function handleEditPosition(object) {
    // For simplicity, just open the "Transform" panel
    App.editorBar.openPanel('transform');
}

/**
 * Handles the "Edit Scale" action.
 * (This is a simplified version)
 */
function handleEditScale(object) {
    const newScaleStr = window.prompt("Enter new uniform scale:", object.scale.x.toFixed(2));
    if (newScaleStr !== null) {
        const newScale = parseFloat(newScaleStr);
        if (!isNaN(newScale) && newScale > 0) {
            object.scale.set(newScale, newScale, newScale);
            // Update this panel
            updatePanelData(object);
            // Publish an event so the Transform panel also updates
            App.events.publish('objectTransformed', object);
        } else {
            App.modal.alert("Invalid input. Please enter a positive number.");
        }
    }
}

/**
 * Handles the "Edit Parent" action.
 */
function handleEditParent(object) {
    // 1. Get the file manager entry for the *current* object
    const file = App.fileManager.findFileById(object.uuid);
    if (!file) {
        App.modal.alert("Error: Cannot reparent this object (not found in file manager).");
        return;
    }
    
    // 2. Get all folders
    const currentParentId = file.parentId;
    const folders = App.fileManager.getFolders();
    
    // 3. Build <option> HTML for all *valid* new parents
    const optionsHtml = folders.map(f => {
        // Find the scene object corresponding to this folder
        const folderSceneObject = App.scene.getObjectByName(f.name);
        
        // --- Invalidation logic ---
        // A) Cannot find the folder's 3D object
        if (!folderSceneObject) return '';
        // B) Cannot parent an object to itself
        if (object.uuid === folderSceneObject.uuid) return '';
        // C) Cannot parent an object to its own child (would create a loop)
        if (object.parent === folderSceneObject) return ''; 
        
        // This is a valid folder to move to
        return `<option value="${f.id}" ${f.id === currentParentId ? 'selected' : ''}>${f.name}</option>`;
    }).join('');

    // 4. Create the modal form
    const modalHtml = `
        <div class="modal-form-group">
            <label for="prop-parent-select">Move "${object.name}" to folder:</label>
            <select id="prop-parent-select" class="modal-select">
                ${optionsHtml}
            </select>
        </div>
    `;
    
    // 5. Show the modal
    App.modal.custom({
        title: "Set Parent",
        html: modalHtml,
        onConfirm: (modalBody) => {
            const newParentFolderId = modalBody.querySelector('#prop-parent-select').value;
            const newParentFolder = folders.find(f => f.id === newParentFolderId);
            if (!newParentFolder) {
                App.modal.alert("Could not find selected parent folder.");
                return;
            }
            
            // Get the 3D object for the new parent
            const newParentSceneObject = App.scene.getObjectByName(newParentFolder.name);
            if (!newParentSceneObject) {
                App.modal.alert("Scene object for parent not found.");
                return;
            }
            
            // --- This is the magic ---
            // 1. Reparent in the 3D scene graph
            newParentSceneObject.add(object); 
            // 2. Reparent in the file manager
            App.fileManager.moveFile(object.uuid, newParentFolderId);
            
            // 3. Update all UI
            App.workspace.render();
            updatePanelData(object);
            App.modal.hide();
        },
        cancelText: "Cancel"
    });
}

/**
 * Initializes the Properties Panel module.
 * @param {object} app - The main App object.
 */
export function initPropertiesPanel(app) {
    App = app;

    injectStyles();
    // Use setTimeout to ensure editorbar.js has created the container
    setTimeout(createMarkup, 100); 

    // --- Subscribe to Events ---
    // When an object is selected, fill the panel with its data
    App.events.subscribe('selectionChanged', updatePanelData);
    // When selection is cleared, empty the panel
    App.events.subscribe('selectionCleared', clearPanelData);

    console.log('Properties Panel Initialized.');
}
