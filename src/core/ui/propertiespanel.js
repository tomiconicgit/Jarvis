// src/core/ui/propertiespanel.js

let App;
let panelContainer;

/**
 * Creates and injects the CSS styles for the properties panel.
 */
function injectStyles() {
    const styleId = 'properties-panel-ui-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        #properties-panel-content {
            display: none; /* Hidden by default */
            height: 100%;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
        
        #properties-panel-content.is-active {
            display: block;
        }
        
        .prop-empty-state {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
            font-style: italic;
            text-align: center;
            padding: 20px;
        }

        .prop-list {
            padding: 0;
        }

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

        .prop-label {
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            flex-shrink: 0;
            padding-right: 10px;
        }

        .prop-value-container {
            flex-grow: 1;
            text-align: right;
            /* --- NEW: Make it look clickable --- */
            cursor: pointer;
            color: #fff;
            font-weight: 400;
        }
        
        .prop-value-container:active {
            background: var(--ui-light-grey);
        }
        
        /* Special style for non-clickable UUID */
        .prop-value-container.is-static {
            cursor: copy;
            color: rgba(255,255,255,0.8);
            word-break: break-all;
        }

        /* --- REMOVED: .prop-input and .prop-text-value, combined into container --- */
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}


/**
 * Creates the HTML markup for the properties panel.
 */
function createMarkup() {
    const toolsContent = document.querySelector('.tools-content');
    if (!toolsContent) {
        console.error('PropertiesPanel: .tools-content not found!');
        return;
    }

    panelContainer = document.createElement('div');
    panelContainer.id = 'properties-panel-content';
    panelContainer.className = 'is-active'; 

    // Start with the "empty" state
    clearPanelData();

    toolsContent.appendChild(panelContainer);
    
    // --- ADDED: Event listener is attached ONCE to the parent ---
    // We use event delegation to catch clicks on items
    panelContainer.addEventListener('click', (event) => {
        const target = event.target.closest('.prop-value-container');
        if (!target) return;

        const action = target.dataset.action;
        const selectedObject = App.selectionContext.getSelected();
        if (!action || !selectedObject) return;
        
        // --- NEW: Call the correct handler based on data-action ---
        switch (action) {
            case 'edit-name':
                handleEditName(selectedObject);
                break;
            case 'copy-uuid':
                handleCopyUuid(selectedObject);
                break;
            case 'edit-position':
                handleEditPosition(selectedObject);
                break;
            case 'edit-scale':
                handleEditScale(selectedObject);
                break;
            case 'edit-parent':
                handleEditParent(selectedObject);
                break;
        }
    });
}

/**
 * Fills the panel with data from the selected object
 */
function updatePanelData(object) {
    const name = object.name || '(Unnamed)';
    const uuid = object.uuid;
    const posX = object.position.x.toFixed(2);
    const posY = object.position.y.toFixed(2);
    const posZ = object.position.z.toFixed(2);
    const scaleX = object.scale.x.toFixed(2);
    
    // Find the file entry to get the correct parentId from our file manager
    const file = App.fileManager.findFileById(object.uuid);
    const parentFolder = file 
        ? App.fileManager.getFolders().find(f => f.id === file.parentId) 
        : null;
    const parentName = parentFolder ? parentFolder.name : (object.parent ? object.parent.type : 'Scene');

    const createProp = (label, value, action, isStatic = false) => {
        return `
            <div class="prop-item">
                <span class="prop-label">${label}</span>
                <div class="prop-value-container ${isStatic ? 'is-static' : ''}" data-action="${action}">
                    ${value}
                </div>
            </div>
        `;
    };

    let html = '<div class="prop-list">';
    html += createProp('Object Name', name, 'edit-name');
    html += createProp('Unique ID', uuid, 'copy-uuid', true); // Mark as static/copy
    html += createProp('Object Position', `X: ${posX}, Y: ${posY}, Z: ${posZ}`, 'edit-position');
    html += createProp('Uniform Scale', scaleX, 'edit-scale');
    html += createProp('Parent', parentName, 'edit-parent');
    html += '</div>';

    panelContainer.innerHTML = html;
    // --- REMOVED: No listeners to attach, they are on the parent ---
}

/**
 * Clears the panel and shows an empty state
 */
function clearPanelData() {
    panelContainer.innerHTML = `
        <div class="prop-empty-state">
            No object selected
        </div>
    `;
}

// --- NEW: Handlers for property clicks ---

function handleEditName(object) {
    const newName = window.prompt("Enter new object name:", object.name);
    if (newName !== null && newName.trim() !== "") {
        object.name = newName.trim();
        App.workspace.render(); // Update workspace UI
        updatePanelData(object);  // Refresh properties panel
    }
}

function handleCopyUuid(object) {
    navigator.clipboard.writeText(object.uuid).then(() => {
        App.modal.alert("Unique ID copied to clipboard.");
    }).catch(err => {
        console.warn("Failed to copy UUID:", err);
        App.modal.alert("Failed to copy. See console for details.");
    });
}

function handleEditPosition(object) {
    const modalHtml = `
        <div class="modal-form-group">
            <label for="prop-pos-x">X</label>
            <input type="number" id="prop-pos-x" class="modal-input" value="${object.position.x.toFixed(2)}">
        </div>
        <div class="modal-form-group">
            <label for="prop-pos-y">Y</label>
            <input type="number" id="prop-pos-y" class="modal-input" value="${object.position.y.toFixed(2)}">
        </div>
        <div class="modal-form-group">
            <label for="prop-pos-z">Z</label>
            <input type="number" id="prop-pos-z" class="modal-input" value="${object.position.z.toFixed(2)}">
        </div>
    `;
    
    App.modal.custom({
        title: "Set Object Position",
        html: modalHtml,
        onConfirm: (modalBody) => {
            const x = parseFloat(modalBody.querySelector('#prop-pos-x').value);
            const y = parseFloat(modalBody.querySelector('#prop-pos-y').value);
            const z = parseFloat(modalBody.querySelector('#prop-pos-z').value);
            
            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                object.position.set(x, y, z);
                updatePanelData(object); // Refresh panel
                App.modal.hide();
            } else {
                App.modal.alert("Invalid input. Please enter numbers only.");
            }
        },
        cancelText: "Cancel"
    });
}

function handleEditScale(object) {
    const newScaleStr = window.prompt("Enter new uniform scale:", object.scale.x.toFixed(2));
    if (newScaleStr !== null) {
        const newScale = parseFloat(newScaleStr);
        if (!isNaN(newScale) && newScale > 0) {
            object.scale.set(newScale, newScale, newScale);
            updatePanelData(object); // Refresh panel
        } else {
            App.modal.alert("Invalid input. Please enter a positive number.");
        }
    }
}

function handleEditParent(object) {
    const file = App.fileManager.findFileById(object.uuid);
    const currentParentId = file ? file.parentId : (object.parent ? object.parent.uuid : 'scene');

    const folders = App.fileManager.getFolders();
    const optionsHtml = folders.map(f => {
        // Find the scene object for this folder
        const folderSceneObject = App.scene.getObjectByName(f.name);
        // We can't parent an object to itself or its own children
        if (!folderSceneObject || object.uuid === folderSceneObject.uuid || object.parent === folderSceneObject) {
            return '';
        }
        return `<option value="${f.id}" ${f.id === currentParentId ? 'selected' : ''}>${f.name}</option>`;
    }).join('');

    const modalHtml = `
        <div class="modal-form-group">
            <label for="prop-parent-select">Select new parent</label>
            <select id="prop-parent-select" class="modal-select">
                ${optionsHtml}
            </select>
        </div>
    `;

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

            // 1. Find new parent in the Three.js scene
            const newParentSceneObject = App.scene.getObjectByName(newParentFolder.name);
            if (!newParentSceneObject) {
                App.modal.alert("Scene object for parent not found.");
                return;
            }

            // 2. Reparent in Three.js
            newParentSceneObject.add(object);
            
            // 3. Move file in the file manager
            App.fileManager.moveFile(object.uuid, newParentFolderId);
            
            // 4. Update UI
            App.workspace.render();
            updatePanelData(object);
            App.modal.hide();
        },
        cancelText: "Cancel"
    });
}


function showPanel() {
    if (panelContainer) panelContainer.classList.add('is-active');
}

function hidePanel() {
    if (panelContainer) panelContainer.classList.remove('is-active');
}

/**
 * Initializes the Properties Panel module.
 */
export function initPropertiesPanel(app) {
    App = app;

    injectStyles();
    setTimeout(createMarkup, 100); 

    if (!App.propertiesPanel) App.propertiesPanel = {};
    App.propertiesPanel.show = showPanel;
    App.propertiesPanel.hide = hidePanel;
    
    // Subscribe to the events
    App.events.subscribe('selectionChanged', updatePanelData);
    App.events.subscribe('selectionCleared', clearPanelData);

    console.log('Properties Panel Initialized.');
}
