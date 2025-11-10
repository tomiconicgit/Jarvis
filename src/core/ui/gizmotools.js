// src/core/ui/gizmotools.js

let App;
let panelContainer;

/**
 * Creates and injects the CSS styles for the gizmo tools.
 */
function injectStyles() {
    const styleId = 'gizmotools-ui-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        #gizmo-tools-content {
            display: flex;
            align-items: center;
            justify-content: space-around;
            padding: 10px 5px;
            box-sizing: border-box;
            height: 100%;
        }
        
        .gizmo-tool-toggle {
            background: none;
            border: none;
            color: #fff;
            opacity: 0.7;
            border-radius: 8px;
            height: 40px;
            flex-grow: 1;
            margin: 0 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 8px;
        }
        
        .gizmo-tool-toggle:active {
            background: var(--ui-light-grey);
        }
        
        .gizmo-tool-toggle.is-active {
            opacity: 1.0;
        }
        
        .toggle-label {
            margin-right: 8px;
            pointer-events: none;
        }
        
        .toggle-box {
            width: 18px;
            height: 18px;
            background: var(--ui-grey);
            border: 1px solid var(--ui-border);
            border-radius: 4px;
            pointer-events: none;
            transition: background 0.2s, border-color 0.2s;
        }
        
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
 * Creates the HTML markup for the gizmo tools.
 */
function createMarkup() {
    panelContainer = document.getElementById('tools-panel-container');
    if (!panelContainer) {
        console.error('GizmoTools: #tools-panel-container not found!');
        return;
    }
    
    const content = document.createElement('div');
    content.id = 'gizmo-tools-content';
    
    // --- UPDATED: Removed Highlight button ---
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
    
    panelContainer.appendChild(content);
    
    // Add listeners
    content.addEventListener('click', (e) => {
        const target = e.target.closest('.gizmo-tool-toggle');
        if (!target) return;
        
        const action = target.dataset.action;
        
        if (action === 'gizmo') {
            const mode = target.dataset.mode;
            App.gizmo.setMode(mode);
            content.querySelectorAll('[data-action="gizmo"]').forEach(btn => btn.classList.remove('is-active'));
            target.classList.add('is-active');
        }
        
        if (action === 'grid') {
            target.classList.toggle('is-active');
            App.grid.visible = !App.grid.visible;
        }
        
        // --- GONE: Highlight listener removed ---
    });
}

/**
 * Initializes the Gizmo Tools UI.
 */
export function initGizmoTools(app) {
    App = app;
    injectStyles();
    setTimeout(createMarkup, 100); 

    console.log('Gizmo Tools UI Initialized.');
}
