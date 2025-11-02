// File: main.js
// Wires UI to scene-manager. Exposes helpers used by index.html overlay.

import {
  initScene as initCore,
  addModel as addModelCore,
  removeModel,
  selectObject as selectObjectCore,
  clearSelection as clearSelectionCore,
  focusSelection as focusSelectionCore,
  setTransformMode,
  setTransformSpace,
  getScene, getCamera, getRenderer
} from './core/scene-manager.js';

export function initScene(container) {
  initCore(container);
}

export function addModel(o) {
  addModelCore(o);
  selectObject(o);
}

export function selectObject(o) {
  selectObjectCore(o);
}

export function clearSelection() {
  clearSelectionCore();
}

export function focusSelection() {
  focusSelectionCore();
}

// Re-exports for index
export { setTransformMode, setTransformSpace, getScene, getCamera, getRenderer };