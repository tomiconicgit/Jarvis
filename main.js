// File: main.js
// Purpose: Boot the scene and expose simple hooks for UI to toggle the gizmo modes.

import {
  initScene,
  addModel,
  setTransformMode,
  setTransformSpace,
  selectObject,
  clearSelection,
  focusSelection,
  getScene,
  getCamera,
  getRenderer
} from './core/scene-manager.js';

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container');
  initScene(container);

  // OPTIONAL: expose helpers for your existing UI buttons/menus
  window.Iconic = {
    addModel,
    setTransformMode,     // 'translate' | 'rotate' | 'scale'
    setTransformSpace,    // 'world' | 'local'
    selectObject,
    clearSelection,
    focusSelection,
    getScene,
    getCamera,
    getRenderer
  };

  // If you want default mode buttons to work by data attributes:
  document.querySelectorAll('[data-tmode]').forEach(btn => {
    btn.addEventListener('click', () => setTransformMode(btn.getAttribute('data-tmode')));
  });
  document.querySelectorAll('[data-tspace]').forEach(btn => {
    btn.addEventListener('click', () => setTransformSpace(btn.getAttribute('data-tspace')));
  });
});