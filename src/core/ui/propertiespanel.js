// src/core/ui/propertiespanel.js

let App;
let panelContainer; // This is now the main slide-up panel

/**
 * Creates and injects the CSS styles for the properties panel.
 */
function injectStyles() {
    const styleId = 'properties-panel-ui-styles';
    if (document.getElementById(styleId)) return;

    // --- UPDATED: Styles are now for the panel itself ---
    const css = `
        /* The #properties-panel-container is created by editorbar.js */
        
        #properties-panel-content {
            height: 100%;
            overflow-y: auto;
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
    // --- UPDATED: Find the container created by editorbar.js ---
    panelContainer = document.getElementById('properties-panel-container');
    if (!panelContainer) {
        console.error('PropertiesPanel: #properties-panel-container not found!');
        return;
    }
    
    // Create the inner content wrapper
    const content = document.createElement('div');
    content.id = 'properties-panel-content';
    panelContainer.appendChild(content);

    // Start with the "empty" state
    clearPanelData();
    
    // Use the *content* div for clicks
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
    
    // ... (rest of data-gathering logic is unchanged) ...
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
        // If content div doesn't exist yet, create it
        createMarkup();
        return;
    }
    content.innerHTML = `
        <div class="prop-empty-state">
            No object selected
        </div>
    `;
}

// --- (All handler functions: handleEditName, handleCopyUuid, etc. are UNCHANGED) ---
function handleEditName(object) { /* ... */ }
function handleCopyUuid(object) { /* ... */ }
function handleEditPosition(object) { /* ... */ }
function handleEditScale(object) { /* ... */ }
function handleEditParent(object) { /* ... */ }
// ... (omitted for brevity, they are identical to before)

// --- GONE: showPanel and hidePanel are now controlled by editorbar.js ---

/**
 * Initializes the Properties Panel module.
 */
export function initPropertiesPanel(app) {
    App = app;

    injectStyles();
    // Wait for editorbar to create the container
    setTimeout(createMarkup, 100); 

    // --- GONE: No public API needed for show/hide ---
    
    // Subscribe to the events
    App.events.subscribe('selectionChanged', updatePanelData);
    App.events.subscribe('selectionCleared', clearPanelData);

    console.log('Properties Panel Initialized.');
}
