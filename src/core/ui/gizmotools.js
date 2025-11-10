// src/core/ui/gizmotools.js
// This module creates the UI *content* for the "Tools" panel.
// It injects its HTML into the '#tools-panel-container'
// which was created by 'editorbar.js'.

let App; // Module-level reference to the main App object
let panelContainer; // The '#tools-panel-container' HTML element

/**
 * Creates and injects the CSS styles for the gizmo tool buttons.
 */
function injectStyles() {
    const styleId = 'gizmotools-ui-styles';
    // Only inject if the styles don't already exist
    if (document.getElementById(styleId)) return;

    const css = `
        /* This is the div that holds all the buttons */
        #gizmo-tools-content {
            display: flex;
            align-items: center;
            justify-content: space-around;
            padding: 10px 5px; /* Add some padding inside the 50px-tall panel */
            box-sizing: border-box;
            height: 100%;
        }
        
        /* This is a custom button that looks like a toggle */
        .gizmo-tool-toggle {
            background: none;
            border: none;
            color: #fff;
            opacity: 0.7; /* Faded when inactive */
            border-radius: 8px;
            height: 40px; /* Fill most of the 50px panel */
            flex-grow: 1; /* Share space equally */
            margin: 0 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            
            /* Use flex to align the text and the box */
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 8px;
        }
        
        .gizmo-tool-toggle:active {
            background: var(--ui-light-grey); /* Click feedback */
        }
        
        /* Style for the *active* toggle */
        .gizmo-tool-toggle.is-active {
            opacity: 1.0;
        }
        
        /* The "Position", "Rotate", "Scale", "Grid" text */
        .toggle-label {
            margin-right: 8px;
            pointer-events: none; /* Clicks on label pass through to the button */
        }
        
        /* The little square box */
        .toggle-box {
            width: 18px;
            height: 18px;
            background: var(--ui-grey);
            border: 1px solid var(--ui-border);
            border-radius: 4px;
            pointer-events: none; /* Clicks on box pass through to the button */
            transition: background 0.2s, border-color 0.2s;
        }
        
        /* When the button has 'is-active', change the box color */
        .gizmo-tool-toggle.is-active .toggle-box {
            background: var(--ui-blue);
            border-color: var(--ui-blue);
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the gizmo tools and injects it
 * into the panel container.
 */
function createMarkup() {
    // 1. Find the panel container that 'editorbar.js' created.
    panelContainer = document.getElementById('tools-panel-container');
    if (!panelContainer) {
        console.error('GizmoTools: #tools-panel-container not found!');
        return;
    }
    
    // 2. Create the content wrapper div
    const content = document.createElement('div');
    content.id = 'gizmo-tools-content';
    
    // 3. Define the HTML for the buttons
    content.innerHTML = `
        <button class="gizmo-tool-toggle is-active" data-action="gizmo" data-mode="translate">
            <span class="toggle-label">Position</span>
            <div class="toggle-box"></div>
        </button>
        <button class="gizmo-tool-toggle" data-action="gizmo" data-mode="rotate">
            <span class="toggle-label">Rotate</span>
            <div class="toggle-box"></div>
        </button>
        <button class="gizmo-tool-toggle" data-action="gizmo" data-mode="scale">
            <span class="toggle-label">Scale</span>
            <div class="toggle-box"></div>
        </button>
        <button class="gizmo-tool-toggle" data-action="grid">
            <span class="toggle-label">Grid</span>
            <div class="toggle-box"></div>
        </button>
    `;
    
    // 4. Append this content *inside* the panel container
    panelContainer.appendChild(content);
    
    // 5. Add an event listener to the content div (event delegation)
    content.addEventListener('click', (e) => {
        // Find the button that was clicked
        const target = e.target.closest('.gizmo-tool-toggle');
        if (!target) return;
        
        // Get the action type from its 'data-action' attribute
        const action = target.dataset.action;
        
        if (action === 'gizmo') {
            // --- This is a gizmo mode button (Translate, Rotate, Scale) ---
            
            // Get the mode from the 'data-mode' attribute
            const mode = target.dataset.mode;
            
            // Call the public function on the App.gizmo object
            // (which was created in gizmo.js)
            App.gizmo.setMode(mode);
            
            // Update the UI: remove 'is-active' from all gizmo buttons...
            content.querySelectorAll('[data-action="gizmo"]').forEach(btn => btn.classList.remove('is-active'));
            // ...and add it back to the one that was just clicked.
            target.classList.add('is-active');
        }
        
        if (action === 'grid') {
            // --- This is the grid toggle button ---
            
            // Toggle the 'is-active' class on the button itself
            target.classList.toggle('is-active');
            
            // Toggle the visibility of the grid object
            // (App.grid was created in gizmo.js)
            App.grid.visible = !App.grid.visible;
        }
    });
}

/**
 * Initializes the Gizmo Tools UI.
 * @param {object} app - The main App object.
 */
export function initGizmoTools(app) {
    App = app;
    injectStyles();
    
    // We use a small 'setTimeout' here. This ensures that this
    // 'createMarkup' function runs *after* the 'initEditorBar'
    // (which creates the panel container) has finished executing.
    // This is a simple way to manage module load order dependencies.
    setTimeout(createMarkup, 100); 

    console.log('Gizmo Tools UI Initialized.');
}
