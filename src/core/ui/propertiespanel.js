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

        .prop-list {
            padding: 0; 
        }

        .prop-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0; /* Remove padding from item itself */
            font-size: 14px;
            
            /* --- FIX 1: Add border-bottom to every item --- */
            border-bottom: 1px solid var(--ui-border);
        }
        
        /* Remove border from the very last item in the panel */
        .prop-list .prop-item:last-child {
            border-bottom: none;
        }

        .prop-label {
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            flex: 1; 
            text-align: left;
            padding: 12px; /* Add padding here */
            
            /* --- FIX 2: Add vertical border --- */
            border-right: 1px solid var(--ui-border);
        }

        .prop-value {
            color: #fff;
            font-weight: 600;
            min-width: 50px;
            text-align: right;
            opacity: 0.5;
            font-style: italic;
            flex: 1; 
            padding: 12px; /* Add padding here */
        }
        
        /* --- FIX 3: Remove divider style, it's no longer used --- */
        /* .prop-divider style GONE */
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

    // --- FIX 4: Removed all .prop-divider divs and put items in one list ---
    panelContainer.innerHTML = `
        <div class="prop-list">
            <div class="prop-item">
                <span class="prop-label">Object Name</span>
                <span class="prop-value">...</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Unique ID</span>
                <span class="prop-value">...</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Vertices</span>
                <span class="prop-value">...</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Polygons</span>
                <span class="prop-value">...</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Object Position</span>
                <span class="prop-value">...</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Uniform Scale</span>
                <span class="prop-value">...</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Parent</span>
                <span class="prop-value">...</span>
            </div>
        </div>
    `;

    toolsContent.appendChild(panelContainer);
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
    
    // Future:
    // App.propertiesPanel.update = (selectedObject) => { ... }

    console.log('Properties Panel Initialized.');
}
