// src/core/ui/editorbar.js

let App;
let editorBar;
let panels = {};
let currentOpenPanel = null;

/**
 * Creates and injects the CSS styles for the editor bar and panels.
 */
function injectStyles() {
    const styleId = 'editorbar-ui-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        /* --- The new 2nd bar --- */
        #editor-bar {
            position: fixed;
            bottom: calc(var(--main-bar-height) + var(--ui-safe-bottom));
            left: 0;
            width: 100%;
            height: var(--editor-bar-height);
            background: var(--ui-dark-grey);
            border-top: 1px solid var(--ui-border);
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: space-around;
            padding: 0 5px;
            box-sizing: border-box;
        }
        
        .editor-bar-btn {
            background: var(--ui-grey);
            border: 1px solid var(--ui-border);
            color: #fff;
            opacity: 0.7;
            border-radius: 8px;
            height: 40px;
            flex-grow: 1;
            margin: 0 5px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }
        
        .editor-bar-btn:active {
            background: var(--ui-light-grey);
        }
        
        .editor-bar-btn.is-active {
            color: var(--ui-blue);
            opacity: 1.0;
            border-color: var(--ui-blue);
        }

        /* --- Container for all slide-up panels --- */
        .editor-panel {
            position: fixed;
            bottom: var(--total-bar-height);
            left: 0;
            width: 100%;
            height: 40vh;
            background: var(--ui-dark-grey);
            z-index: 5;
            
            transform: translateY(100%);
            transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            will-change: transform;
            overflow: hidden; /* Ensures content slides */
        }
        
        .editor-panel.is-open {
            transform: translateY(0);
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the editor bar and panel containers.
 */
function createMarkup() {
    // 1. Create the bar
    editorBar = document.createElement('div');
    editorBar.id = 'editor-bar';
    editorBar.innerHTML = `
        <button class="editor-bar-btn" data-panel="tools">Tools</button>
        <button class="editor-bar-btn" data-panel="transform">Transform</button>
        <button class="editor-bar-btn" data-panel="properties">Properties</button>
        <button class="editor-bar-btn" data-panel="textures" disabled>Textures</button>
    `;
    document.body.appendChild(editorBar);

    // 2. Create the panel containers
    const panelNames = ['tools', 'transform', 'properties'];
    panelNames.forEach(name => {
        const panel = document.createElement('div');
        panel.id = `${name}-panel-container`;
        panel.className = 'editor-panel';
        document.body.appendChild(panel);
        
        // Store references
        panels[name] = {
            btn: editorBar.querySelector(`[data-panel="${name}"]`),
            panel: panel
        };
    });
    
    // 3. Add listener to the bar
    editorBar.addEventListener('click', (e) => {
        const target = e.target.closest('.editor-bar-btn');
        if (!target || target.disabled) return;
        
        const panelName = target.dataset.panel;
        togglePanel(panelName);
    });
}

function togglePanel(panelName) {
    const wasOpen = panels[panelName].panel.classList.contains('is-open');
    
    // Close all panels
    closeAllPanels();
    
    // If it wasn't already open, open it
    if (!wasOpen) {
        panels[panelName].panel.classList.add('is-open');
        panels[panelName].btn.classList.add('is-active');
        currentOpenPanel = panelName;
        
        // Also close the workspace
        App.workspace.close();
    }
}

function openPanel(panelName) {
    if (!panels[panelName]) return;
    closeAllPanels();
    panels[panelName].panel.classList.add('is-open');
    panels[panelName].btn.classList.add('is-active');
    currentOpenPanel = panelName;
}

function closeAllPanels() {
    for (const name in panels) {
        panels[name].panel.classList.remove('is-open');
        panels[name].btn.classList.remove('is-active');
    }
    currentOpenPanel = null;
}

/**
 * Initializes the Editor Bar module.
 */
export function initEditorBar(app) {
    App = app;
    
    injectStyles();
    createMarkup();

    // Attach public API
    if (!App.editorBar) App.editorBar = {};
    App.editorBar.openPanel = openPanel;
    App.editorBar.closeAllPanels = closeAllPanels;
    App.editorBar.togglePanel = togglePanel;
    App.editorBar.hide = () => { if (editorBar) editorBar.style.display = 'none'; };
    App.editorBar.show = () => { if (editorBar) editorBar.style.display = 'flex'; };
    
    // --- Add wrapper for workspace ---
    const originalWorkspaceOpen = App.workspace.open;
    App.workspace.open = () => {
        originalWorkspaceOpen();
        closeAllPanels(); // Close editor panels when workspace opens
    };

    console.log('Editor Bar UI Initialized.');
}
