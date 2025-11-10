// src/core/selectioncontext.js
import * as THREE from 'three';

// Module-level state
let App;
let selectedObject = null;
let outlineMesh = null;
let isHighlightEnabled = true; // <-- NEW

/**
 * Creates the visual outline mesh and adds it to the scene.
 */
function createOutlineHelper() {
    const outlineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x007aff,
        linewidth: 3
    });
    outlineMesh = new THREE.LineSegments(new THREE.BufferGeometry(), outlineMaterial);
    outlineMesh.visible = false;
    App.scene.add(outlineMesh);
}

/**
 * Focuses the camera on a given 3D object.
 */
function focusOnObject(object) {
    if (!object || !App.camera || !App.controls) return;
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = sphere.radius;
    const fov = App.camera.fov * (Math.PI / 180);
    let distance;
    if (radius > 0 && isFinite(radius)) {
         distance = radius / Math.sin(fov / 2);
    } else {
        distance = 10;
    }
    const direction = new THREE.Vector3()
        .subVectors(App.camera.position, App.controls.target)
        .normalize();
    App.controls.target.copy(center);
    App.camera.position.copy(center).addScaledVector(direction, distance * 1.5);
    App.controls.update();
}

/**
 * --- NEW: Toggles the highlight visibility ---
 * @param {boolean} [forceState] - Force on (true) or off (false)
 */
function toggleHighlight(forceState) {
    if (forceState !== undefined) {
        isHighlightEnabled = forceState;
    } else {
        isHighlightEnabled = !isHighlightEnabled;
    }

    // Update visibility based on state
    if (isHighlightEnabled && selectedObject) {
        if (selectedObject.isMesh) {
            outlineMesh.visible = true;
        }
    } else {
        outlineMesh.visible = false;
    }
    
    return isHighlightEnabled;
}


/**
 * Selects an object, showing its outline and focusing the camera.
 */
function select(object) {
    if (!object || object === selectedObject) {
        if (!object) clear();
        return;
    }

    selectedObject = object;

    // --- 1. Update Visual Outline (IF IT'S A MESH) ---
    if (object.isMesh) {
        if (outlineMesh.geometry) {
            outlineMesh.geometry.dispose();
        }
        outlineMesh.geometry = new THREE.EdgesGeometry(object.geometry, 1);
        outlineMesh.position.copy(object.position);
        outlineMesh.rotation.copy(object.rotation);
        outlineMesh.scale.copy(object.scale);
        
        // --- UPDATED: Use toggle function ---
        if (isHighlightEnabled) {
            outlineMesh.visible = true;
        }
    } else {
        outlineMesh.visible = false;
    }

    // --- 2. Focus Camera (Works for all objects) ---
    focusOnObject(object);
    
    console.log(`Selection Context: Selected '${object.name}'`);
    
    App.events.publish('selectionChanged', selectedObject);
}

/**
 * Clears the current selection, hiding the outline.
 */
function clear() {
    if (!selectedObject) return;
    
    selectedObject = null;
    outlineMesh.visible = false; // --- Always hide on clear
    
    if (outlineMesh.geometry) {
        outlineMesh.geometry.dispose();
    }
    outlineMesh.geometry = new THREE.BufferGeometry();
    
    console.log('Selection Context: Cleared');
    
    App.events.publish('selectionCleared');
}

/**
 * Returns the currently selected object.
 */
function getSelected() {
    return selectedObject;
}

/**
 * Initializes the Selection Context module.
 */
export function initSelectionContext(app) {
    if (!app || !app.scene || !app.camera || !app.controls || !app.events) {
        throw new Error('SelectionContext init failed: App object is incomplete.');
    }
    
    App = app;
    
    createOutlineHelper();

    // Attach the public API to the App object
    app.selectionContext = {
        select: select,
        clear: clear,
        getSelected: getSelected,
        toggleHighlight: toggleHighlight // <-- NEW
    };
    
    console.log('Selection Context Initialized.');
}
