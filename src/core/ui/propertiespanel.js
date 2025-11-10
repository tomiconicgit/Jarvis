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
            padding: 0; /* Remove vertical padding from the list itself */
        }

        .prop-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            font-size: 14px;
            /* No border-bottom here, it will be handled by .prop-list borders */
            position: relative; /* Needed for the vertical divider */
        }

        /* Add a vertical divider */
        .prop-item::after {
            content: '';
            position: absolute;
            left: 50%; /* Position in the middle */
            top: 0;
            bottom: 0;
            width: 1px; /* Divider thickness */
            background: var(--ui-border); /* Use UI border color */
            transform: translateX(-50%); /* Center the divider */
        }

        .prop-label {
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            flex: 1; /* Allow label to take up space */
            padding-right: 8px; /* Space between label and divider */
            text-align: left;
        }

        .prop-value {
            color: #fff;
            font-weight: 600;
            /* Using '...' as a placeholder for now */
            min-width: 50px;
            text-align: right;
            opacity: 0.5;
            font-style: italic;
            flex: 1; /* Allow value to take up space */
            padding-left: 8px; /* Space between divider and value */
        }
        
        .prop-divider {
            height: 12px; /* Increased height for better visual separation */
            background: rgba(0,0,0,0.3); /* Slightly darker background */
            border-top: 1px solid var(--ui-border);
            border-bottom: 1px solid var(--ui-border);
        }
        
        /* Apply border-bottom to the entire .prop-list */
        .prop-list {
            border-bottom: 1px solid var(--ui-border);
        }
        /* Remove border-bottom from the last prop-list to avoid double border with panel bottom */
        .prop-list:last-child {
            border-bottom: none;
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
    const toolsContent = document.querySelector('.tools-content');
    if (!toolsContent) {
        console.error('PropertiesPanel: .tools-content not found!');
        return;
    }

    panelContainer = document.createElement('div');
    panelContainer.id = 'properties-panel-content';
    // The "Properties" tab is active by default in tools.js
    panelContainer.className = 'is-active'; 

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
                <span class="prop-label">Polygons</span> <span class="prop-value">...</span>
            </div>
        </div>

        <div class="prop-divider"></div>

        <div class="prop-list">
            <div class="prop-item">
                <span class="prop-label">Object Position</span>
                <span class="prop-value">...</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Uniform Scale</span>
                <span class="prop-value">...</span>
            </div>
        </div>

        <div class="prop-divider"></div>

        <div class="prop-list">
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
    setTimeout(createMarkup, 100); 

    if (!App.propertiesPanel) App.propertiesPanel = {};
    App.propertiesPanel.show = showPanel;
    App.propertiesPanel.hide = hidePanel;
    
    console.log('Properties Panel Initialized.');
}
