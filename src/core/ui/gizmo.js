// src/core/ui/gizmo.js
// This module initializes the 3D "gizmo" (TransformControls)
// and the editor grid.

import * as THREE from 'three';
// Import the TransformControls from Three.js examples
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

let App; // Module-level reference to the main App object
let gizmo; // The TransformControls object
let grid; // The GridHelper object

/**
 * Initializes the Gizmo and Grid module.
 * @param {object} app - The main App object.
 */
export function initGizmo(app) {
    App = app;

    // --- 1. Create the TransformControls (Gizmo) ---
    // The gizmo needs the editor camera (to match its orientation)
    // and the renderer's <canvas> (to listen for mouse/touch events).
    gizmo = new TransformControls(App.camera, App.renderer.domElement);
    
    // Set its size. 0.8 makes it 80% of its default size.
    gizmo.setSize(0.8);
    
    // Start with the gizmo disabled and detached.
    gizmo.enabled = false;
    
    // Add the gizmo to the scene. (It's invisible until attached to an object).
    App.scene.add(gizmo);

    // --- 2. Create the Grid Helper ---
    // A 100x100 unit grid with 100 divisions.
    // Major lines are 0x888888, minor lines are 0x444444.
    grid = new THREE.GridHelper(100, 100, 0x888888, 0x444444);
    
    // Start with the grid hidden. Its visibility will be
    // toggled by the 'gizmotools.js' UI panel.
    grid.visible = false;
    App.scene.add(grid);

    // --- 3. Add Gizmo Event Listeners ---
    
    // 'change' event: Fires *continuously* while the gizmo is being dragged.
    gizmo.addEventListener('change', () => {
        if (gizmo.object) {
            // As the gizmo moves, the object's position/rotation/scale
            // is already being updated.
            // We publish an 'objectTransformed' event so other UI
            // panels (like transformpanel.js) can update their
            // input fields in real-time.
            App.events.publish('objectTransformed', gizmo.object);
        }
    });

    // 'dragging-changed' event: Fires when the user starts or stops dragging.
    gizmo.addEventListener('dragging-changed', (event) => {
        // 'event.value' is true when dragging starts, false when it ends.
        
        // This is a *critical* piece of logic:
        // When the user starts dragging the gizmo, we must
        // *disable* the main OrbitControls (the camera).
        // If we don't, both would try to move at the same time,
        // causing the camera to orbit *and* the object to move.
        App.controls.enabled = !event.value;
    });

    // --- 4. Subscribe to App-wide Events ---
    
    // Listen for the 'selectionChanged' event (published by selectioncontext.js).
    App.events.subscribe('selectionChanged', (object) => {
        // Only attach the gizmo if:
        // 1. The selected object is a Mesh (or other movable object).
        // 2. We are *not* in Test Play mode.
        if (object.isMesh && !App.engine.isTesting) {
            gizmo.attach(object); // Attach the gizmo to the object.
            gizmo.enabled = true; // Make it visible and interactive.
        } else {
            // If it's a Group, Light, or we're in test mode,
            // make sure the gizmo is detached.
            gizmo.detach();
            gizmo.enabled = false;
        }
    });
    
    // Listen for the 'selectionCleared' event.
    App.events.subscribe('selectionCleared', () => {
        // If selection is cleared, detach and disable the gizmo.
        gizmo.detach();
        gizmo.enabled = false;
    });

    // --- 5. Create Public API ---
    // Expose the 'gizmo' and 'grid' objects directly on the
    // App namespace, so other modules can access them.
    // (e.g., gizmotools.js uses 'App.gizmo.setMode()' and 'App.grid.visible').
    App.gizmo = gizmo;
    App.grid = grid;
    
    console.log('Gizmo Initialized.');
}
