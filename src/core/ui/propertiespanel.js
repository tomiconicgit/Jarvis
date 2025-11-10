// src/core/ui/propertiespanel.js

let App;
let panelContainer;

// --- ADDED: Arrow icon, same as workspace ---
const ARROW_ICON = `<svg class="prop-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>`;

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
            padding: 8px; /* Add padding to match workspace */
        }
        
        #properties-panel-content.is-active {
            display: block;
        }

        /* --- NEW: Styles based on workspace.js --- */
        
        .prop-group {
            /* This is the main container for a property and its content */
            border-bottom: 1px solid var(--ui-border);
        }
        .prop-group:last-child {
            border-bottom: none;
        }

        .prop-header {
            display: flex;
            align-items: center;
            padding: 12px 8px;
            cursor: pointer;
        }
        .prop-header:active {
             background: var(--ui-light-grey);
        }
        
        .prop-header .prop-arrow {
            width: 16px;
            height: 16px;
            stroke: #fff;
            opacity: 0.7;
            margin-right: 6px;
            transition: transform 0.2s ease;
            padding: 4px;
            margin-left: -4px;
        }

        .prop-name {
            font-size: 14px;
            font-weight: 600;
            color: #fff;
            pointer-events: none;
        }
        
        .prop-content {
            overflow: hidden;
            max-height: 500px;
            transition: max-height 0.3s ease-out;
            padding-left: 12px;
            
            /* --- This is the empty space for parameters --- */
            min-height: 50px; /* Placeholder height */
            font-size: 13px;
            color: rgba(255,255,255,0.4);
            font-style: italic;
            padding: 10px 10px 16px 28px;
        }

        /* --- Toggling logic --- */
        .prop-group.is-closed .prop-content {
            max-height: 0;
            min-height: 0; /* Collapse min-height */
            padding-top: 0;
            padding-bottom: 0;
        }
        .prop-group.is-closed .prop-arrow {
            transform: rotate(-90deg);
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
    panelContainer.className = 'is-active'; 

    panelContainer.innerHTML = `
        <div class="prop-group is-closed">
            <div class="prop-header">
                ${ARROW_ICON}
                <span class="prop-name">Object Name</span>
            </div>
            <div class="prop-content">
                (Parameters for Object Name)
            </div>
        </div>

        <div class="prop-group is-closed">
            <div class="prop-header">
                ${ARROW_ICON}
                <span class="prop-name">Unique ID</span>
            </div>
            <div class="prop-content">
                (Parameters for Unique ID)
            </div>
        </div>
        
        <div class="prop-group is-closed">
            <div class="prop-header">
                ${ARROW_ICON}
                <span class="prop-name">Vertices</span>
            </div>
            <div class="prop-content">
                (Parameters for Vertices)
            </div>
        </div>

        <div class="prop-group is-closed">
            <div class="prop-header">
                ${ARROW_ICON}
                <span class="prop-name">Polygons</span>
            </div>
            <div class="prop-content">
                (Parameters for Polygons)
            </div>
        </div>

        <div class="prop-group is-closed">
            <div class="prop-header">
                ${ARROW_ICON}
                <span class="prop-name">Object Position</span>
            </div>
            <div class="prop-content">
                (Parameters for Object Position)
            </div>
        </div>
        
        <div class="prop-group is-closed">
            <div class="prop-header">
                ${ARROW_ICON}
                <span class="prop-name">Uniform Scale</span>
            </div>
            <div class="prop-content">
                (Parameters for Uniform Scale)
            </div>
        </div>
        
        <div class="prop-group is-closed">
            <div class="prop-header">
                ${ARROW_ICON}
                <span class="prop-name">Parent</span>
            </div>
            <div class="prop-content">
                (Parameters for Parent)
            </div>
        </div>
    `;

    toolsContent.appendChild(panelContainer);

    // --- ADDED: Toggle logic ---
    panelContainer.querySelectorAll('.prop-header').forEach(header => {
        header.addEventListener('click', () => {
            const group = header.closest('.prop-group');
            if (group) {
                group.classList.toggle('is-closed');
            }
        });
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
