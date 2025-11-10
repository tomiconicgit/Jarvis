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
            /* --- UPDATED: height: 100% removed --- */
            overflow-y: auto; /* Panel will scroll if content exceeds max-height */
            -webkit-overflow-scrolling: touch;
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
            cursor: pointer;
            color: #fff;
            font-weight: 400;
        }
        
        .prop-value-container:active {
            background: var(--ui-light-grey);
        }
        
        .prop-value-container.is-static {
            cursor: copy;
            color: rgba(255,255,255,0.8);
            word-break: break-all;
        }
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
    panelContainer = document.getElementById('properties-panel-container');
    if (!panelContainer) {
        console.error('PropertiesPanel: #properties-panel-container not found!');
        return;
    }
    
    const content = document.createElement('div');
    content.id = 'properties-panel-content';
    panelContainer.appendChild(content);

    clearPanelData();
    
    content.addEventListener('click', (event) => {
        const target = event.target.closest('.prop-value-container');
        if (!target) return;

        const action = target.dataset.action;
        const selectedObject = App.selectionContext.getSelected();
        if (!action || !selectedObject) return;
        
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
    const content = panelContainer.querySelector('#properties-panel-content');
    if (!content) return;
    
    const name = object.name || '(Unnamed)';
    const uuid = object.uuid;
    const posX = object.position.x.toFixed(2);
    const posY = object.position.y.toFixed(2);
    const posZ = object.position.z.toFixed(2);
    const scaleX = object.scale.x.toFixed(2);
    const file = App.fileManager.findFileById(object.uuid);
    const parentFolder = file ? App.fileManager.getFolders().find(f => f.id === file.parentId) : null;
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
    html += createProp('Unique ID', uuid, 'copy-uuid', true);
    html += createProp('Object Position', `X: ${posX}, Y: ${posY}, Z: ${posZ}`, 'edit-position');
    html += createProp('Uniform Scale', scaleX, 'edit-scale');
    html += createProp('Parent', parentName, 'edit-parent');
    html += '</div>';

    content.innerHTML = html;
}

/**
 * Clears the panel and shows an empty state
 */
function clearPanelData() {
    const content = panelContainer.querySelector('#properties-panel-content');
    if (!content) {
        // If content div doesn't exist yet, try again
        setTimeout(clearPanelData, 50);
        return;
    }
    content.innerHTML = `
        <div class="prop-empty-state">
            No object selected
        </div>
    `;
}

// --- (All handler functions: handleEditName, handleCopyUuid, etc. are UNCHANGED) ---
function handleEditName(object) {
    const newName = window.prompt("Enter new object name:", object.name);
    if (newName !== null && newName.trim() !== "") {
        object.name = newName.trim();
        App.workspace.render();
        updatePanelData(object);
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
    const modalHtml = `... (modal html unchanged) ...`;
    App.modal.custom({
        title: "Set Object Position",
        html: modalHtml,
        onConfirm: (modalBody) => {
            const x = parseFloat(modalBody.querySelector('#prop-pos-x').value);
            const y = parseFloat(modalBody.querySelector('#prop-pos-y').value);
            const z = parseFloat(modalBody.querySelector('#prop-pos-z').value);
            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                object.position.set(x, y, z);
                updatePanelData(object);
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
            updatePanelData(object);
        } else {
            App.modal.alert("Invalid input. Please enter a positive number.");
        }
    }
}
function handleEditParent(object) {
    // ... (function logic is unchanged) ...
    const file = App.fileManager.findFileById(object.uuid);
    const currentParentId = file ? file.parentId : (object.parent ? object.parent.uuid : 'scene');
    const folders = App.fileManager.getFolders();
    const optionsHtml = folders.map(f => {
        const folderSceneObject = App.scene.getObjectByName(f.name);
        if (!folderSceneObject || object.uuid === folderSceneObject.uuid || object.parent === folderSceneObject) {
            return '';
        }
        return `<option value="${f.id}" ${f.id === currentParentId ? 'selected' : ''}>${f.name}</option>`;
    }).join('');
    const modalHtml = `... (modal html unchanged) ...`;
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
            const newParentSceneObject = App.scene.getObjectByName(newParentFolder.name);
            if (!newParentSceneObject) {
                App.modal.alert("Scene object for parent not found.");
                return;
            }
            newParentSceneObject.add(object);
            App.fileManager.moveFile(object.uuid, newParentFolderId);
            App.workspace.render();
            updatePanelData(object);
            App.modal.hide();
        },
        cancelText: "Cancel"
    });
}

/**
 * Initializes the Properties Panel module.
 */
export function initPropertiesPanel(app) {
    App = app;

    injectStyles();
    setTimeout(createMarkup, 100); 

    App.events.subscribe('selectionChanged', updatePanelData);
    App.events.subscribe('selectionCleared', clearPanelData);

    console.log('Properties Panel Initialized.');
}
