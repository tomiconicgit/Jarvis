// src/core/selectioncontext.js
// This module manages the concept of a "selected object" within the editor.
// It keeps track of what is currently selected, handles drawing a visual
// highlight (outline) around it, and provides functions to select,
// clear, and get the current selection.

import * as THREE from 'three';

// --- Module-level state ---
let App; // Reference to the main App object
let selectedObject = null; // The currently selected THREE.Object3D, or null
let outlineMesh = null; // A THREE.LineSegments mesh used to draw the highlight
let isHighlightEnabled = true; // Whether the outline is visible

/**
 * Creates the reusable outline mesh and adds it to the scene.
 * This mesh is hidden by default and its geometry is swapped out
 * whenever a new object is selected.
 */
function createOutlineHelper() {
    // A simple blue line material
    const outlineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x007aff, // Our UI's "active" blue color
        linewidth: 3 // Note: This is often 1 regardless of value, due to WebGL limitations
    });
    
    // Create the LineSegments object. It starts with an empty geometry.
    outlineMesh = new THREE.LineSegments(new THREE.BufferGeometry(), outlineMaterial);
    outlineMesh.visible = false; // Start hidden
    App.scene.add(outlineMesh);
}

/**
 * A helper function to automatically pan and zoom the editor camera
 * to focus on a specific 3D object.
 * @param {THREE.Object3D} object - The object to focus on.
 */
function focusOnObject(object) {
    if (!object || !App.camera || !App.controls) return;

    // 1. Calculate the object's bounding box
    const box = new THREE.Box3().setFromObject(object);
    
    // 2. Get the center of the box
    const center = box.getCenter(new THREE.Vector3());
    
    // 3. Get the bounding sphere (which has a radius)
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = sphere.radius;
    
    // 4. Calculate the ideal distance to view the object
    const fov = App.camera.fov * (Math.PI / 180); // Get FOV in radians
    let distance;
    
    if (radius > 0 && isFinite(radius)) {
        // Use trigonometry: distance = (radius / sin(fov/2))
        // This makes the object's sphere fit just inside the camera's view
         distance = radius / Math.sin(fov / 2);
    } else {
        // Fallback for objects with no size (like an empty Group)
        distance = 10;
    }

    // 5. Keep the camera's current viewing angle (direction)
    const direction = new THREE.Vector3()
        .subVectors(App.camera.position, App.controls.target)
        .normalize();

    // 6. Set the new camera target and position
    // Move the *controls target* to the object's center
    App.controls.target.copy(center);
    
    // Move the *camera* to the object's center, then back it up
    // along the view direction by the calculated distance.
    App.camera.position.copy(center).addScaledVector(direction, distance * 1.5); // * 1.5 to add padding
    
    // 7. Tell the OrbitControls to update
    App.controls.update();
}

/**
 * Toggles the visibility of the selection highlight.
 * @param {boolean} [forceState] - Optionally force the highlight on (true) or off (false).
 * @returns {boolean} The new state of the highlight (true = visible).
 */
function toggleHighlight(forceState) {
    // If a state is forced, use it. Otherwise, toggle the current state.
    if (forceState !== undefined) {
        isHighlightEnabled = forceState;
    } else {
        isHighlightEnabled = !isHighlightEnabled;
    }

    // Apply the new visibility state
    if (isHighlightEnabled && selectedObject) {
        // Find the actual mesh to highlight (e.g., the Player's capsule)
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
 * This function handles special cases. For example, if the user
 * selects the "Player" (which is a Group), we don't want to highlight
 * the group (which has no geometry), but rather its visual representation.
 *
 * @param {THREE.Object3D} object - The object that was selected.
 * @returns {THREE.Mesh | null} The specific mesh that should be outlined.
 */
function getHighlightableObject(object) {
    if (!object) return null;
    
    // Special case: If we selected the "Player" group...
    if (object.name === "Player" && object.isGroup) {
        // ...find its child mesh named "PlayerRepresentation".
        return object.getObjectByName("PlayerRepresentation");
    }
    
    // Standard case: The selected object is a mesh.
    if (object.isMesh) {
        return object;
    }
    
    // Default: It's a Group or something else we can't outline.
    return null;
}


/**
 * Selects a new object, updating the highlight and focusing the camera.
 * This is the main "setter" function for the selection.
 * @param {THREE.Object3D} object - The object to select.
 */
function select(object) {
    // If no object is provided, clear the selection.
    if (!object) {
        clear();
        return;
    }
    
    // Don't re-select the same object.
    if (object === selectedObject) {
        return;
    }

    selectedObject = object;

    // --- 1. Update Visual Outline ---
    
    // Find the *actual* mesh we should be outlining
    let objectToHighlight = getHighlightableObject(selectedObject);
    
    if (objectToHighlight) {
        // Dispose of the old geometry to prevent memory leaks
        if (outlineMesh.geometry) {
            outlineMesh.geometry.dispose();
        }
        
        // Create a *new* wireframe geometry from the highlighted object's geometry
        outlineMesh.geometry = new THREE.EdgesGeometry(objectToHighlight.geometry, 1);
        
        // --- CRITICAL ---
        // The 'objectToHighlight' might be a *child* (like the player capsule),
        // but the 'selectedObject' is the *parent* (the Player group).
        // We must apply the parent's transforms (position, rotation, scale)
        // to the outline mesh so it lines up correctly in the world.
        outlineMesh.position.copy(selectedObject.position);
        outlineMesh.rotation.copy(selectedObject.rotation);
        outlineMesh.scale.copy(selectedObject.scale);
        
        // Show it (if highlights are enabled)
        if (isHighlightEnabled) {
            outlineMesh.visible = true;
        }
    } else {
        // The selected object (e.g., an imported model Group) has no
        // single mesh to highlight, so hide the outline.
        outlineMesh.visible = false;
    }

    // --- 2. Focus Camera ---
    // Focus on the highlighted mesh if we found one,
    // otherwise, focus on the selected object (e.g., the Group's center).
    if (objectToHighlight) {
        focusOnObject(objectToHighlight);
    } else {
        focusOnObject(object);
    }
    
    console.log(`Selection Context: Selected '${object.name}'`);
    
    // --- 3. Publish Event ---
    // This is the most important part. We broadcast an event to the
    // entire application, passing along the object that was just selected.
    // The Gizmo, Properties Panel, etc., are all *listening* for this.
    App.events.publish('selectionChanged', selectedObject);
}

/**
 * Clears the current selection, hiding the outline.
 */
function clear() {
    if (!selectedObject) return; // Nothing to clear
    
    selectedObject = null;
    outlineMesh.visible = false; // Hide the outline
    
    // Dispose of the geometry to free memory
    if (outlineMesh.geometry) {
        outlineMesh.geometry.dispose();
    }
    // Set it back to an empty geometry.
    outlineMesh.geometry = new THREE.BufferGeometry();
    
    console.log('Selection Context: Cleared');
    
    // --- Publish Event ---
    // Broadcast an event telling all other modules that the
    // selection has been cleared.
    App.events.publish('selectionCleared');
}

/**
 * Returns the currently selected object.
 * @returns {THREE.Object3D | null} The selected object, or null.
 */
function getSelected() {
    return selectedObject;
}

/**
 * Initializes the Selection Context module.
 * @param {object} app - The main App object.
 */
export function initSelectionContext(app) {
    // This module depends on many other core systems.
    if (!app || !app.scene || !app.camera || !app.controls || !app.events) {
        throw new Error('SelectionContext init failed: App object is incomplete.');
    }
    
    App = app;
    
    // Create the reusable outline mesh
    createOutlineHelper();

    // Attach the public API to the App object
    app.selectionContext = {
        select: select,
        clear: clear,
        getSelected: getSelected,
        toggleHighlight: toggleHighlight
    };
    
    console.log('Selection Context Initialized.');
}
