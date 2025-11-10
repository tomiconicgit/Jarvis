// src/core/ui/propertiespanel.js

let App;
let panelContainer;

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
        
        /* Style for empty state */
        .prop-empty-state {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
            font-style: italic;
            text-align: center;
            padding-top: 20px;
        }

        .prop-group {
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
            
            font-size: 13px;
            color: rgba(255,255,255,0.8); 
            font-style: normal; 
            padding: 10px 10px 16px 28px;
        }

        /* Toggling logic */
        .prop-group.is-closed .prop-content {
            max-height: 0;
            min-height: 0;
            padding-top: 0;
            padding-bottom: 0;
        }
        .prop-group.is-closed .prop-arrow {
            transform: rotate(-90deg);
        }
        
        /* Styles for parameter inputs */
        .prop-input {
            width: 90%;
            background: var(--ui-dark-grey);
            color: #fff;
            border: 1px solid var(--ui-border);
            border-radius: 4px;
            padding: 6px 8px;
            font-size: 13px;
        }
        
        .prop-text-value {
            font-weight: 400;
            word-break: break-all; /* For long UUIDs */
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
    
    let vertices = 'N/A';
    let polygons = 'N/A';
    if (object.geometry) {
        vertices = object.geometry.attributes.position.count.toLocaleString();
        polygons = (object.geometry.index ? object.geometry.index.count / 3 : object.geometry.attributes.position.count / 3).toLocaleString();
    }
    
    const posX = object.position.x.toFixed(2);
    const posY = object.position.y.toFixed(2);
    const posZ = object.position.z.toFixed(2);
    
    const scaleX = object.scale.x.toFixed(2);
    
    const parent = object.parent ? object.parent.name || object.parent.type : 'Scene';

    // --- 2. Build HTML ---
    const createProp = (title, content, startOpen = false) => {
        return `
            <div class="prop-group ${startOpen ? '' : 'is-closed'}">
                <div class="prop-header">
                    ${ARROW_ICON}
                    <span class="prop-name">${title}</span>
                </div>
                <div class="prop-content">
                    ${content}
                </div>
            </div>
        `;
    };

    let html = '';
    
    html += createProp('Object Name', `
        <input type="text" class="prop-input" value="${name}">
    `, true); // Start open

    html += createProp('Unique ID', `
        <div class="prop-text-value">${uuid}</div>
    `);

    html += createProp('Vertices', `
        <div class="prop-text-value">${vertices}</div>
    `);
    
    html += createProp('Polygons', `
        <div class="prop-text-value">${polygons}</div>
    `);
    
    html += createProp('Object Position', `
        <div>X: <span class="prop-text-value">${posX}</span></div>
        <div>Y: <span class="prop-text-value">${posY}</span></div>
        <div>Z: <span class="prop-text-value">${posZ}</span></div>
    `);
    
    html += createProp('Uniform Scale', `
        <div class="prop-text-value">${scaleX}</div>
    `);
    
    html += createProp('Parent', `
        <div class="prop-text-value">${parent}</div>
    `);

    panelContainer.innerHTML = html;

    // --- 3. Re-attach Listeners ---
    panelContainer.querySelectorAll('.prop-header').forEach(header => {
        header.addEventListener('click', () => {
            const group = header.closest('.prop-group');
            if (group) {
                group.classList.toggle('is-closed');
            }
        });
    });
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
    setTimeout(createMarkup, 100); 

    if (!App.propertiesPanel) App.propertiesPanel = {};
    App.propertiesPanel.show = showPanel;
    App.propertiesPanel.hide = hidePanel;
    
    // Subscribe to the events
    App.events.subscribe('selectionChanged', updatePanelData);
    App.events.subscribe('selectionCleared', clearPanelData);

    console.log('Properties Panel Initialized.');
}
