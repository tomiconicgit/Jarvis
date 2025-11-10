// src/core/ui/propertiespanel.js

let App;
let panelContainer;

// --- REMOVED: Arrow icon is no longer needed ---

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
        
        /* Style for empty state */
        .prop-empty-state {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
            font-style: italic;
            text-align: center;
            padding: 20px; /* Added full padding */
        }

        /* --- NEW: Simplified list styles --- */
        .prop-list {
            padding: 0;
        }

        .prop-item {
            display: flex;
            justify-content: space-between;
            align-items: center; /* Center items vertically */
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
        }
        
        /* --- Styles for parameter inputs/text --- */
        .prop-input {
            width: 90%;
            max-width: 150px; /* Stop it from getting too wide */
            background: var(--ui-dark-grey);
            color: #fff;
            border: 1px solid var(--ui-border);
            border-radius: 4px;
            padding: 6px 8px;
            font-size: 13px;
            text-align: right;
        }
        
        .prop-text-value {
            font-weight: 400;
            color: rgba(255,255,255,0.8);
            word-break: break-all; /* For long UUIDs */
        }

        /* --- REMOVED: All accordion styles (.prop-group, .prop-header, etc.) --- */
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
}

/**
 * Fills the panel with data from the selected object
 */
function updatePanelData(object) {
    // --- 1. Get Data (with safety checks) ---
    const name = object.name || '(Unnamed)';
    const uuid = object.uuid;
    
    // --- REMOVED: Vertices and Polygons ---
    
    const posX = object.position.x.toFixed(2);
    const posY = object.position.y.toFixed(2);
    const posZ = object.position.z.toFixed(2);
    
    const scaleX = object.scale.x.toFixed(2);
    
    const parent = object.parent ? object.parent.name || object.parent.type : 'Scene';

    // --- 2. Build HTML ---
    // This function creates a single property row
    const createProp = (label, valueContent) => {
        return `
            <div class="prop-item">
                <span class="prop-label">${label}</span>
                <div class="prop-value-container">
                    ${valueContent}
                </div>
            </div>
        `;
    };

    let html = '<div class="prop-list">';
    
    html += createProp('Object Name', `
        <input type="text" class="prop-input" value="${name}">
    `);

    html += createProp('Unique ID', `
        <span class="prop-text-value">${uuid}</span>
    `);
    
    // --- REMOVED: Vertices and Polygons ---

    html += createProp('Object Position', `
        <span class="prop-text-value">X: ${posX}, Y: ${posY}, Z: ${posZ}</span>
    `);
    
    html += createProp('Uniform Scale', `
        <span class="prop-text-value">${scaleX}</span>
    `);
    
    html += createProp('Parent', `
        <span class="prop-text-value">${parent}</span>
    `);

    html += '</div>'; // Close .prop-list

    panelContainer.innerHTML = html;

    // --- 3. Re-attach Listeners (if any) ---
    // (Future) Add listeners for the inputs, e.g.:
    // panelContainer.querySelector('.prop-input').addEventListener('change', (e) => {
    //     object.name = e.target.value;
    //     App.workspace.render(); // Update workspace UI
    // });
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
    // We delay createMarkup to ensure .tools-content exists
    setTimeout(createMarkup, 100); 

    // Attach the public API to the App object
    if (!App.propertiesPanel) App.propertiesPanel = {};
    App.propertiesPanel.show = showPanel;
    App.propertiesPanel.hide = hidePanel;
    
    // Subscribe to the events
    App.events.subscribe('selectionChanged', updatePanelData);
    App.events.subscribe('selectionCleared', clearPanelData);

    console.log('Properties Panel Initialized.');
}
