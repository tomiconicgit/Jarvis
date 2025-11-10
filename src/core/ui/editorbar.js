// src/core/ui/editorbar.js
// This module creates the *second* UI bar from the bottom.
// This bar contains the main editor tabs:
// "Tools", "Transform", "Properties", and "Textures".
// It is also responsible for managing the slide-up panels
// associated with each of these buttons.

let App; // Module-level reference to the main App object
let editorBar; // The HTML element for the bar itself
let panels = {}; // An object to store references to the buttons and their panels
let currentOpenPanel = null; // A string ('tools', 'transform', etc.)

/**
 * Creates and injects the CSS styles for the editor bar and its panels.
 */
function injectStyles() {
    const styleId = 'editorbar-ui-styles';
    // Only inject if the styles don't already exist
    if (document.getElementById(styleId)) return;

    // We use CSS variables (e.g., --main-bar-height) defined in 'menu.js'
    // to ensure all UI elements are positioned correctly relative to each other.
    const css = `
        /* --- The new 2nd bar --- */
        #editor-bar {
            position: fixed;
            /* Positioned directly above the main bar (60px + safe area) */
            bottom: calc(var(--main-bar-height) + var(--ui-safe-bottom));
            left: 0;
            width: 100%;
            height: var(--editor-bar-height); /* 50px */
            background: var(--ui-dark-grey);
            border-top: 1px solid var(--ui-border);
            z-index: 10; /* Sits below the main bar (11) and workspace (12) */
            display: flex;
            align-items: center;
            justify-content: space-around; 
            padding: 0 5px;
            box-sizing: border-box;
        }
        
        .editor-bar-btn {
            background: none;
            border: none;
            color: #fff;
            opacity: 0.7; /* Faded when not active */
            border-radius: 8px;
            height: 40px;
            flex-grow: 1; /* Buttons share space */
            margin: 0 2px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }
        
        .editor-bar-btn:active {
            background: var(--ui-light-grey); /* Click feedback */
        }
        
        .editor-bar-btn.is-active {
            color: var(--ui-blue); /* Blue when its panel is open */
            opacity: 1.0;
        }
        
        .editor-bar-btn[disabled] {
            opacity: 0.3; /* Style for disabled buttons */
            cursor: not-allowed;
        }

        /* --- Container for all slide-up panels (Tools, Transform, etc.) --- */
        .editor-panel {
            position: fixed;
            /* Positioned above *both* bars (110px total + safe area) */
            bottom: var(--total-bar-height);
            left: 0;
            width: 100%;
            background: var(--ui-dark-grey);
            border-top: 1px solid var(--ui-border);
            z-index: 5; /* Sits below all the bars and panels */
            
            /* Starts 100% *below* its final position (off-screen) */
            transform: translateY(100%);
            transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            will-change: transform; /* Hint for the browser to optimize animation */
            overflow: hidden; /* Clips the content as it slides */
        }
        
        .editor-panel.is-open {
            /* Slides up to its final position */
            transform: translateY(0);
        }

        /* Define the heights for the different panels */
        /* The "Tools" panel (Gizmo, Grid) is short */
        #tools-panel-container {
            height: var(--editor-bar-height); /* 50px */
        }
        /* The "Transform" panel (steppers) is medium */
        #transform-panel-container {
            height: 25vh; /* 25% of the viewport height */
        }
        /* The "Properties" panel is auto-sized up to a max */
        #properties-panel-container {
            height: auto;
            max-height: 40vh; /* 40% of the viewport height */
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the editor bar and the *containers*
 * that will hold the panel content.
 */
function createMarkup() {
    // 1. Create the bar itself
    editorBar = document.createElement('div');
    editorBar.id = 'editor-bar';
    editorBar.innerHTML = `
        <button class="editor-bar-btn" data-panel="tools">Tools</button>
        <button class="editor-bar-btn" data-panel="transform">Transform</button>
        <button class="editor-bar-btn" data-panel="properties">Properties</button>
        <button class="editor-bar-btn" data-panel="textures" disabled>Textures</button>
    `;
    document.body.appendChild(editorBar);

    // 2. Create the (initially empty) panel containers
    // The *content* for these panels will be injected by other modules
    // (gizmotools.js, transformpanel.js, propertiespanel.js).
    const panelNames = ['tools', 'transform', 'properties'];
    panelNames.forEach(name => {
        const panel = document.createElement('div');
        panel.id = `${name}-panel-container`;
        panel.className = 'editor-panel';
        document.body.appendChild(panel);
        
        // Store references to the button and its corresponding panel
        panels[name] = {
            btn: editorBar.querySelector(`[data-panel="${name}"]`),
            panel: panel
        };
    });
    
    // 3. Add a single event listener to the bar (event delegation)
    editorBar.addEventListener('click', (e) => {
        const target = e.target.closest('.editor-bar-btn');
        if (!target || target.disabled) return;
        
        const panelName = target.dataset.panel;
        togglePanel(panelName); // Toggle the corresponding panel
    });
}

/**
 * Toggles a panel's visibility.
 * @param {string} panelName - The name of the panel to toggle ('tools', 'transform', etc.)
 */
function togglePanel(panelName) {
    // Was this panel *already* open?
    const wasOpen = panels[panelName].panel.classList.contains('is-open');
    
    // First, close all panels
    closeAllPanels();
    
    // If it wasn't already open, open it.
    if (!wasOpen) {
        panels[panelName].panel.classList.add('is-open');
        panels[panelName].btn.classList.add('is-active'); // Highlight the button
        currentOpenPanel = panelName;
        
        // --- UI Coordination ---
        // Ensure other slide-out panels are closed.
        App.workspace.close();
        if (App.addPanel) App.addPanel.close();
    }
    // If it *was* open, the 'closeAllPanels()' call already handled it.
}

/**
 * Forcibly opens a specific panel.
 * @param {string} panelName - The name of the panel to open.
 */
function openPanel(panelName) {
    if (!panels[panelName]) return; // Safety check
    
    closeAllPanels(); // Close everything else
    
    // Open the new one
    panels[panelName].panel.classList.add('is-open');
    panels[panelName].btn.classList.add('is-active');
    currentOpenPanel = panelName;
    
    // --- UI Coordination ---
    if (App.addPanel) App.addPanel.close();
}

/**
 * Closes all panels managed by this module.
 */
function closeAllPanels() {
    for (const name in panels) {
        panels[name].panel.classList.remove('is-open');
        panels[name].btn.classList.remove('is-active'); // Remove button highlight
    }
    currentOpenPanel = null;
}

/**
 * Initializes the Editor Bar module.
 * @param {object} app - The main App object.
 */
export function initEditorBar(app) {
    App = app;
    
    // Create the HTML and CSS
    injectStyles();
    createMarkup();

    // Create the public API on the App object
    if (!App.editorBar) App.editorBar = {};
    App.editorBar.openPanel = openPanel;
    App.editorBar.closeAllPanels = closeAllPanels;
    App.editorBar.togglePanel = togglePanel;
    // Add hide/show functions for Test Play mode
    App.editorBar.hide = () => { if (editorBar) editorBar.style.display = 'none'; };
    App.editorBar.show = () => { if (editorBar) editorBar.style.display = 'flex'; };
    
    // --- Monkey-Patching for UI Coordination ---
    // We "wrap" the App.workspace.open function.
    const originalWorkspaceOpen = App.workspace.open;
    App.workspace.open = () => {
        // Call the original function first
        originalWorkspaceOpen();
        
        // *Then* call our function to close our panels.
        // This ensures only one "panel system" is open at a time.
        closeAllPanels(); 
        if (App.addPanel) App.addPanel.close();
    };

    console.log('Editor Bar UI Initialized.');
}
