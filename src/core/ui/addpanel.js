// src/core/ui/addpanel.js
// This module creates the "Add" panel, which is a horizontal
// bar that slides up from the main bottom bar. It contains
// buttons for adding new assets to the scene, like scripts,
// shapes, and (eventually) other items.

let App; // Module-level reference to the main App object
let addPanel; // The main HTML element for this panel

// An object to store SVG icon markup. This keeps the
// createMarkup function cleaner.
const ICONS = {
    script: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>`,
    shape: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76zM15 15l-3-3"/></svg>`,
    animation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`,
    effect: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
};

/**
 * Creates and injects the CSS styles for the add panel.
 */
function injectStyles() {
    const styleId = 'addpanel-ui-styles';
    // Only inject if the styles don't already exist
    if (document.getElementById(styleId)) return;

    // We use CSS variables (e.g., --main-bar-height) defined in 'menu.js'
    // to ensure all UI elements are positioned correctly relative to each other.
    const css = `
        /* This panel slides up from the main bottom bar */
        #add-panel {
            position: fixed;
            /* Positioned directly above the main bar (60px + safe area) */
            bottom: calc(var(--main-bar-height) + var(--ui-safe-bottom)); 
            left: 0;
            width: 100%;
            height: var(--editor-bar-height); /* Same height as the editor bar */
            background: var(--ui-dark-grey);
            border-top: 1px solid var(--ui-border);
            z-index: 10; /* Sits below the main bar (11) */
            
            display: flex;
            align-items: center;
            justify-content: space-around;
            padding: 0 5px;
            box-sizing: border-box;
            
            /* The panel starts 100% *below* its final position (off-screen) */
            transform: translateY(100%);
            transition: transform 0.3s ease-out; /* Smooth slide-in */
        }
        
        #add-panel.is-open {
            /* When open, slide to its natural position */
            transform: translateY(0);
        }

        .add-panel-btn {
            background: none;
            border: none;
            color: #fff;
            opacity: 0.7; /* Slightly faded when not active */
            border-radius: 8px;
            height: 40px;
            flex-grow: 1; /* All buttons share space equally */
            margin: 0 5px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            
            /* Use flexbox to stack the icon and text vertically */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .add-panel-btn svg {
            width: 20px;
            height: 20px;
            margin-bottom: 2px;
        }
        
        .add-panel-btn:active {
            background: var(--ui-light-grey); /* Feedback on click */
        }
        
        .add-panel-btn:hover {
            opacity: 1.0; /* Full opacity on hover */
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the add panel.
 */
function createMarkup() {
    // 1. Create the main panel <div>
    addPanel = document.createElement('div');
    addPanel.id = 'add-panel';
    
    // 2. Set its inner HTML with all the buttons
    addPanel.innerHTML = `
        <button class="add-panel-btn" data-action="add-script">
            ${ICONS.script}
            <span>Script</span>
        </button>
        <button class="add-panel-btn" data-action="add-shape">
            ${ICONS.shape}
            <span>Shape</span>
        </button>
        <button class="add-panel-btn" data-action="add-animation">
            ${ICONS.animation}
            <span>Animation</span>
        </button>
        <button class="add-panel-btn" data-action="add-effect">
            ${ICONS.effect}
            <span>Effect</span>
        </button>
    `;

    // 3. Add the panel to the document
    document.body.appendChild(addPanel);

    // 4. Add an event listener to the *panel itself* (event delegation).
    // This is more efficient than adding 4 separate listeners.
    addPanel.addEventListener('click', (e) => {
        // Find the button that was *actually* clicked
        const target = e.target.closest('.add-panel-btn');
        if (!target) return; // Clicked in the gap, not on a button

        // Get the action from the button's 'data-action' attribute
        const action = target.dataset.action;
        
        // --- UPDATED: Handle the 'add-script' action ---
        if (action === 'add-script') {
            // Check if the script engine has been initialized and has the function
            if (App.scriptEngine && App.scriptEngine.showAddScriptModal) {
                // Call the function from scriptengine.js to show the modal
                App.scriptEngine.showAddScriptModal();
            } else {
                console.error('ScriptEngine not initialized.');
                App.modal.alert('Error: Script engine is not available.');
            }
        } else {
            // Placeholder for the other buttons
            App.modal.alert(`Selected: ${action} (Not yet implemented)`);
        }
        // --- END UPDATED ---
        
        // After any action, close this panel.
        closePanel();
    });
}

/**
 * Opens (shows) the Add Panel.
 */
function openPanel() {
    if (addPanel) addPanel.classList.add('is-open');
    
    // When this panel opens, it must close the other panels
    // to prevent UI overlap.
    App.workspace.close();
    App.editorBar.closeAllPanels();
}

/**
 * Closes (hides) the Add Panel.
 */
function closePanel() {
    if (addPanel) addPanel.classList.remove('is-open');
}

/**
 * Toggles the panel's visibility.
 * This is called by the main "+" button in 'menu.js'.
 */
function togglePanel() {
    if (addPanel.classList.contains('is-open')) {
        closePanel();
    } else {
        openPanel();
    }
}

/**
 * Initializes the Add Panel module.
 * @param {object} app - The main App object.
 */
export function initAddPanel(app) {
    App = app;
    
    // Create the HTML and CSS
    injectStyles();
    createMarkup();

    // Create the public API on the App object
    if (!App.addPanel) App.addPanel = {};
    App.addPanel.open = openPanel;
    App.addPanel.close = closePanel;
    App.addPanel.toggle = togglePanel;

    console.log('Add Panel Initialized.');
}
