// src/core/ui/gizmo.js
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

let App;
let gizmo;
let grid;
let gizmoToolsPopup;

const ICONS = {
    translate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L12 22M2 12L22 12M19 15L22 12 19 9M5 15L2 12 5 9M15 19L12 22 9 19M15 5L12 2 9 5"/></svg>`,
    rotate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.2 16.2c-1.5 2.4-4.2 4-7.2 4-4.4 0-8-3.6-8-8s3.6-8 8-8c2.1 0 4 0.8 5.5 2.2"/><path d="M18 7H13V2"/></svg>`,
    scale: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3H21V9"/><path d="M9 21H3V15"/><path d="M21 3L14 10"/><path d="M3 21L10 14"/></svg>`,
    grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 10H21"/><path d="M3 14H21"/><path d="M10 3V21"/><path d="M14 3V21"/></svg>`,
    highlight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/></svg>`
};

/**
 * Injects the CSS for the new gizmo tools UI.
 */
function injectStyles() {
    const styleId = 'gizmo-ui-styles';
    if (document.getElementById(styleId)) return;
    const css = `
        #gizmo-tools-btn {
            position: fixed;
            bottom: calc(var(--bottom-bar-height) + 10px);
            left: 10px;
            z-index: 10;
            background: var(--ui-dark-grey);
            border: 1px solid var(--ui-border);
            border-radius: 8px;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }
        #gizmo-tools-btn.is-active {
            border-color: var(--ui-blue);
            color: var(--ui-blue);
        }
        #gizmo-tools-btn svg {
            width: 24px;
            height: 24px;
            stroke: #fff;
            stroke-width: 2;
        }
        #gizmo-tools-btn.is-active svg {
            stroke: var(--ui-blue);
        }

        #gizmo-tools-popup {
            position: fixed;
            bottom: calc(var(--bottom-bar-height) + 60px);
            left: 10px;
            z-index: 9;
            background: var(--ui-grey);
            border-radius: 8px;
            box-shadow: var(--ui-shadow);
            display: flex;
            padding: 5px;
            
            /* Hidden by default */
            opacity: 0;
            transform: translateY(10px);
            pointer-events: none;
            transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #gizmo-tools-popup.is-open {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }
        
        .gizmo-tool-toggle {
            background: none;
            border: none;
            color: #fff;
            opacity: 0.7;
            border-radius: 5px;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }
        .gizmo-tool-toggle svg {
            width: 22px;
            height: 22px;
            pointer-events: none;
        }
        .gizmo-tool-toggle:active {
            background: var(--ui-light-grey);
        }
        .gizmo-tool-toggle.is-active {
            color: var(--ui-blue);
            opacity: 1.0;
            background: var(--ui-dark-grey);
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
    const mainBtn = document.createElement('button');
    mainBtn.id = 'gizmo-tools-btn';
    mainBtn.innerHTML = ICONS.translate; // Default icon
    mainBtn.classList.add('is-active'); // On by default
    
    gizmoToolsPopup = document.createElement('div');
    gizmoToolsPopup.id = 'gizmo-tools-popup';
    gizmoToolsPopup.innerHTML = `
        <button class="gizmo-tool-toggle is-active" data-action="gizmo" data-mode="translate">${ICONS.translate}</button>
        <button class="gizmo-tool-toggle" data-action="gizmo" data-mode="rotate">${ICONS.rotate}</button>
        <button class="gizmo-tool-toggle" data-action="gizmo" data-mode="scale">${ICONS.scale}</button>
        <button class="gizmo-tool-toggle" data-action="grid">${ICONS.grid}</button>
        <button class="gizmo-tool-toggle is-active" data-action="highlight">${ICONS.highlight}</button>
    `;

    document.body.appendChild(mainBtn);
    document.body.appendChild(gizmoToolsPopup);

    // --- Add Listeners ---
    mainBtn.addEventListener('click', () => {
        gizmoToolsPopup.classList.toggle('is-open');
    });

    gizmoToolsPopup.addEventListener('click', (e) => {
        const target = e.target.closest('.gizmo-tool-toggle');
        if (!target) return;
        
        const action = target.dataset.action;
        
        if (action === 'gizmo') {
            const mode = target.dataset.mode;
            gizmo.setMode(mode);
            
            // Update button icon
            mainBtn.innerHTML = ICONS[mode];
            
            // Update active state for gizmo buttons
            gizmoToolsPopup.querySelectorAll('[data-action="gizmo"]').forEach(btn => btn.classList.remove('is-active'));
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

    // Close popup if clicking outside
    document.addEventListener('pointerdown', (event) => {
        if (!mainBtn.contains(event.target) && !gizmoToolsPopup.contains(event.target)) {
            gizmoToolsPopup.classList.remove('is-open');
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
        // This fires constantly during a drag
        if (gizmo.object) {
            App.events.publish('objectTransformed', gizmo.object);
        }
    });

    // Disable OrbitControls while using gizmo
    gizmo.addEventListener('dragging-changed', (event) => {
        App.controls.enabled = !event.value;
    });

    // 4. Subscribe to App events
    App.events.subscribe('selectionChanged', (object) => {
        if (object.isMesh) {
            gizmo.attach(object);
            gizmo.enabled = true;
            document.getElementById('gizmo-tools-btn').classList.add('is-active');
        } else {
            gizmo.detach();
            gizmo.enabled = false;
            document.getElementById('gizmo-tools-btn').classList.remove('is-active');
        }
    });
    
    App.events.subscribe('selectionCleared', () => {
        gizmo.detach();
        gizmo.enabled = false;
        document.getElementById('gizmo-tools-btn').classList.remove('is-active');
    });

    // 5. Create the UI
    injectStyles();
    createMarkup();

    App.gizmo = gizmo;
    console.log('Gizmo Initialized.');
}
