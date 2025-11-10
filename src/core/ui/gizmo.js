// src/core/ui/gizmo.js
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

let App;
let gizmo;
let grid;
// --- GONE: All UI variables ---

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

    // 5. Create public API
    App.gizmo = gizmo;
    App.grid = grid; // Expose the grid object
    
    // --- GONE: All UI functions (injectStyles, createMarkup, showUI, hideUI) ---

    console.log('Gizmo Initialized.');
}
