// src/core/selectioncontext.js
import * as THREE from 'three';

// Module-level state
let App;
let selectedObject = null;
let outlineMesh = null;

/**
 * Creates the visual outline mesh and adds it to the scene.
 */
function createOutlineHelper() {
    // A simple, non-post-processing outline using EdgesGeometry
    const outlineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x007aff, // The "nice blue"
        linewidth: 3     // Note: "linewidth" has limitations on some GPUs
    });
    
    // Create an empty mesh first. We'll swap its geometry.
    outlineMesh = new THREE.LineSegments(new THREE.BufferGeometry(), outlineMaterial);
    outlineMesh.visible = false; // Hide it initially
    App.scene.add(outlineMesh);
}

/**
 * Focuses the camera on a given 3D object.
 * @param {THREE.Object3D} object - The object to focus on.
 */
function focusOnObject(object) {
    if (!object || !App.camera || !App.controls) return;

    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = sphere.radius;

    // Calculate distance to fit the object's bounding sphere
    const fov = App.camera.fov * (Math.PI / 180);
    const distance = radius / Math.sin(fov / 2);

    // Get the current camera direction (relative to its target)
    const direction = new THREE.Vector3()
        .subVectors(App.camera.position, App.controls.target)
        .normalize();

    // Set new controls target (what to orbit around)
    App.controls.target.copy(center);

    // Set new camera position (move along the direction vector)
    App.camera.position.copy(center).addScaledVector(direction, distance * 1.5); // * 1.5 for padding

    // Must call update for changes to take effect
    App.controls.update();
}

/**
 * Selects an object, showing its outline and focusing the camera.
 * @param {THREE.Object3D} object - The object to select.
 */
function select(object) {
    if (!object || !object.isMesh || object === selectedObject) {
        if (!object) clear(); // Clear selection if null is passed
        return;
    }

    selectedObject = object;

    // --- 1. Update Visual Outline ---
    
    // Dispose of old geometry to prevent memory leaks
    if (outlineMesh.geometry) {
        outlineMesh.geometry.dispose();
    }

    // Create new edges geometry from the object's geometry
    outlineMesh.geometry = new THREE.EdgesGeometry(object.geometry, 1); // 1 = threshold angle
    
    // Match the position, rotation, and scale of the parent object
    outlineMesh.position.copy(object.position);
    outlineMesh.rotation.copy(object.rotation);
    outlineMesh.scale.copy(object.scale);
    
    outlineMesh.visible = true;

    // --- 2. Focus Camera ---
    focusOnObject(object);
    
    console.log(`Selection Context: Selected '${object.name}'`);
}

/**
 * Clears the current selection, hiding the outline.
 */
function clear() {
    if (!selectedObject) return;
    
    selectedObject = null;
    outlineMesh.visible = false;
    
    // Dispose of geometry
    if (outlineMesh.geometry) {
        outlineMesh.geometry.dispose();
    }
    outlineMesh.geometry = new THREE.BufferGeometry(); // Set to empty
    
    console.log('Selection Context: Cleared');
}

/**
 * Returns the currently selected object.
 * @returns {THREE.Object3D | null}
 */
function getSelected() {
    return selectedObject;
}

/**
 * Initializes the Selection Context module.
 * @param {object} app - The main App object.
 */
export function initSelectionContext(app) {
    if (!app || !app.scene || !app.camera || !app.controls) {
        throw new Error('SelectionContext init failed: App object is incomplete.');
    }
    
    App = app; // Store the App object for internal use
    
    createOutlineHelper();

    // Attach the public API to the App object
    app.selectionContext = {
        select: select,
        clear: clear,
        getSelected: getSelected
    };
    
    console.log('Selection Context Initialized.');
}
