// File: core/gizmo-manager.js
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

let transformControls;
let orbitControlsRef; // To disable orbit controls during drag

/**
 * Initializes the TransformControls gizmo.
 */
export function initGizmo(camera, rendererDomElement, scene, orbitControls) {
  transformControls = new TransformControls(camera, rendererDomElement);
  transformControls.setMode('translate');
  transformControls.visible = false; // Start hidden
  orbitControlsRef = orbitControls; // Store reference

  // Listener to disable orbit controls while dragging
  transformControls.addEventListener('dragging-changed', (e) => {
    if (orbitControlsRef) {
      orbitControlsRef.enabled = !e.value;
    }
  });
  
  scene.add(transformControls);
}

/**
 * Attaches the gizmo to a selected object.
 * @param {THREE.Object3D} object The object to attach to.
 */
export function attachGizmo(object) {
  if (transformControls) {
    transformControls.attach(object);
    transformControls.visible = true;
  }
}

/**
 * Detaches the gizmo from any object.
 */
export function detachGizmo() {
  if (transformControls) {
    transformControls.detach();
    transformControls.visible = false;
  }
}

/**
 * Returns the gizmo object itself (for raycasting or event listeners).
 * @returns {TransformControls}
 */
export function getGizmo() {
  return transformControls;
}
