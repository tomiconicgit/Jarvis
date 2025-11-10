// src/core/ui/gizmo.js
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

let App;
let gizmo;
let grid;
let gizmoToolsPanel;
let gizmoTabBtn;

/**
 * Injects the CSS for the new gizmo tools UI.
 */
function injectStyles() {
    const styleId = 'gizmo-ui-styles';
    if (document.getElementById(styleId)) return;
    const css = `
        #gizmo-tools-panel {
            position: fixed;
            bottom: var(--bottom-bar-height); /* Sits right on top of the main bar */
            left: 0;
            width: 100%;
            height: var(--bottom-bar-height); /* Same height as main bar */
            background: var(--ui-dark-grey);
            border-top: 1px solid var(--ui-border);
            z-index: 10;
            
            display: flex;
            align-items: center; /* Center items vertically */
            padding: 0 10px;
            box-sizing: border-box;
            justify-content: space-around;
            
            transform: translateY(100%);
            transition: transform 0.3s ease-out;
        }
        
        #gizmo-tools-panel.is-open {
            transform: translateY(0);
        }

        #gizmo-tab-btn {
            position: absolute;
            top: -24px;
            left: 10px;
            height: 24px;
            width: 60px;
            background: var(--ui-dark-grey);
            border: 1px solid var(--ui-border);
            border-bottom: none;
            border-radius: 8px 8px 0 0;
            z-index: -1;
            cursor: pointer;
            
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #gizmo-tab-btn svg {
            width: 18px;
            height: 18px;
            stroke: #fff;
            stroke-width: 2;
        }
        #gizmo-tab-btn:active {
            background: var(--ui-light-grey);
        }

        /* --- NEW: [Text] [Box] Toggle Styles --- */
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
            
            /* Flex layout */
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
            pointer-events: none; /* Clicks go to parent */
        }
        
        .toggle-box {
            width: 18px;
            height: 18px;
            background: var(--ui-grey);
            border: 1px solid var(--ui-border);
            border-radius: 4px;
            pointer-events: none; /* Clicks go to parent */
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
    gizmoToolsPanel = document.createElement('div');
    gizmoToolsPanel.id = 'gizmo-tools-panel';
    
    // --- UPDATED: New HTML structure for toggles ---
    gizmoToolsPanel.innerHTML = `
        <div id="gizmo-tab-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2L12 22M2 12L22 12M19 15L22 12 19 9M5 15L2 12 5 9M15 19L12 22 9 19M15 5L12 2 9 5"/></svg>
        </div>
        
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
        <button class="gizmo-tool-toggle is-active" data-action="highlight">
            <span class="toggle-label">Highlight</span>
            <div class="toggle-box"></div>
        </button>
    `;

    document.body.appendChild(gizmoToolsPanel);
    
    gizmoTabBtn = document.getElementById('gizmo-tab-btn');

    // --- Add Listeners ---
    gizmoTabBtn.addEventListener('click', () => {
        gizmoToolsPanel.classList.toggle('is-open');
    });

    gizmoToolsPanel.addEventListener('click', (e) => {
        const target = e.target.closest('.gizmo-tool-toggle');
        if (!target) return;
        
        const action = target.dataset.action;
        
        if (action === 'gizmo') {
            const mode = target.dataset.mode;
            gizmo.setMode(mode);
            gizmoToolsPanel.querySelectorAll('[data-action="gizmo"]').forEach(btn => btn.classList.remove('is-active'));
            target.classList.add('is-active');
        }
        
        if (action === 'grid') {
            target.classList.toggle('is-active');
            grid.visible = !grid.visible;
        }
        
        if (action === 'highlight') {
            target.classList.toggle('is-active');
            App.selectionContext.toggleHighlight(target.classList.contains('is-active'));
        }
    });

    document.addEventListener('pointerdown', (event) => {
        const bottomBar = document.getElementById('bottom-bar');
        if (!gizmoTabBtn.contains(event.target) && !gizmoToolsPanel.contains(event.target) && !bottomBar.contains(event.target)) {
            gizmoToolsPanel.classList.remove('is-open');
        }
    });
}

/**
 * Initializes the Gizmo module.
 */
export function initGizmo(app) {
    App = app;

    // 1. Create the TransformControls
    gizmo = new TransformControls(App.camera, App.renderer.domElement);
    gizmo.setSize(0.8);
    gizmo.enabled = false;
    App.scene.add(gizmo);

    // 2. Create the Grid
    grid = new THREE.GridHelper(100, 100, 0x888888, 0x444444);
    grid.visible = false;
    App.scene.add(grid);

    // 3. Add Gizmo Event Listeners
    gizmo.addEventListener('change', () => {
        if (gizmo.object) {
            App.events.publish('objectTransformed', gizmo.object);
        }
    });

    gizmo.addEventListener('dragging-changed', (event) => {
        App.controls.enabled = !event.value;
    });

    // 4. Subscribe to App events
    App.events.subscribe('selectionChanged', (object) => {
        if (object.isMesh && !App.engine.isTesting) {
            gizmo.attach(object);
            gizmo.enabled = true;
        } else {
            gizmo.detach();
            gizmo.enabled = false;
        }
    });
    
    App.events.subscribe('selectionCleared', () => {
        gizmo.detach();
        gizmo.enabled = false;
    });

    // 5. Create the UI
    injectStyles();
    createMarkup();

    // 6. Attach public API
    App.gizmo = gizmo;
    App.gizmo.showUI = () => {
        if (gizmoToolsPanel) gizmoToolsPanel.style.display = 'flex';
    };
    App.gizmo.hideUI = () => {
        if (gizmoToolsPanel) {
            gizmoToolsPanel.style.display = 'none';
            gizmoToolsPanel.classList.remove('is-open');
        }
    };

    console.log('Gizmo Initialized.');
}
