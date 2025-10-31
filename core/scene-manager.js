// File: core/scene-manager.js
import * as THREE from 'three';
// ... other THREE imports
import { OBJECT_DEFINITIONS, BUILDERS } from '../objects/object-manifest.js';
import { updatePropsPanel } from '../ui/props-panel.js'; // We'll create this

export let scene, camera, renderer, orbitControls, transformControls;
export let allModels = [];
export let currentSelection = null;

// Your old init() function, but only the 3D parts
export function initScene() {
  // ... scene, renderer, camera, lights, controls setup ...
  // ... ground, grid setup ...
  // ... raycaster, touch events (onTouchStart, onTouchEnd) ...
}

export function animate() {
  // ... your animate loop ...
}

// Your old handleSingleTap, handleDoubleTap
export function handleSingleTap(t) {
  // ... raycast logic ...
  // on hit:
  selectObject(obj);
  // on miss:
  deselectAll();
}

export function selectObject(o) {
  if (!o) return;
  // ... your selectObject logic ...
  currentSelection = o;
  transformControls.attach(o);
  updatePropsPanel(o); // Tell the UI to update
  // ... showPanel(propsPanel) ...
}

export function deselectAll() {
  // ... your deselectAll logic ...
  currentSelection = null;
  transformControls.detach();
  // ... hidePanel(propsPanel) ...
}

export function assignDefaultName(obj) {
  // ... your name counting logic ...
}
