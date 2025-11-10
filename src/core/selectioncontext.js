// src/core/selectioncontext.js
import * as THREE from 'three';

// Module-level state
let App;
let selectedObject = null;
let outlineMesh = null;
let isHighlightEnabled = true;

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
 * Toggles the highlight visibility
 */
function toggleHighlight(forceState) {
    if (forceState !== undefined) {
        isHighlightEnabled = forceState;
    } else {
        isHighlightEnabled = !isHighlightEnabled;
    }

    if (isHighlightEnabled && selectedObject) {
        // --- UPDATED: Check for Player ---
        let objectToHighlight = getHighlightableObject(selectedObject);
        if (objectToHighlight) {
            outlineMesh.visible = true;
        }
    } else {
        outlineMesh.visible = false;
    }
    
    return isHighlightEnabled;
}

/**
 * --- NEW: Helper to find the mesh to highlight ---
 * (e.g., gets the capsule mesh from the Player group)
 */
function getHighlightableObject(object) {
    if (!object) return null;
    if (object.name === "Player" && object.isGroup) {
        return object.getObjectByName("PlayerRepresentation");
    }
    if (object.isMesh) {
        return object;
    }
    return null;
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

    // --- 1. Update Visual Outline ---
    let objectToHighlight = getHighlightableObject(selectedObject);
    
    if (objectToHighlight) {
        if (outlineMesh.geometry) {
            outlineMesh.geometry.dispose();
        }
        // Apply geometry from the child mesh
        outlineMesh.geometry = new THREE.EdgesGeometry(objectToHighlight.geometry, 1);
        
        // Apply transforms from the parent group
        outlineMesh.position.copy(selectedObject.position);
        outlineMesh.rotation.copy(selectedObject.rotation);
        outlineMesh.scale.copy(selectedObject.scale);
        
        if (isHighlightEnabled) {
            outlineMesh.visible = true;
        }
    } else {
        outlineMesh.visible = false;
    }

    // --- 2. Focus Camera ---
    if (objectToHighlight) {
        focusOnObject(objectToHighlight);
    } else {
        focusOnObject(object);
    }
    
    console.log(`Selection Context: Selected '${object.name}'`);
    
    App.events.publish('selectionChanged', selectedObject);
}

/**
 * Clears the current selection, hiding the outline.
 */
function clear() {
    if (!selectedObject) return;
    
    selectedObject = null;
    outlineMesh.visible = false; 
    
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

    app.selectionContext = {
        select: select,
        clear: clear,
        getSelected: getSelected,
        toggleHighlight: toggleHighlight
    };
    
    console.log('Selection Context Initialized.');
}
