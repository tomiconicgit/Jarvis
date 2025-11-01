// File: ui/gizmo.js
import * as THREE from 'three';
import { currentSelection, camera, orbitControls } from '../core/scene-manager.js';

let gizmoContainer;
let handleX, handleY, handleZ;
let activeHandle = null;
let lastPointerPos = new THREE.Vector2();
let targetObject = null;

const GIZMO_SENSITIVITY = 0.002; // Tunable speed factor

/**
 * Creates the HTML and CSS for the on-screen gizmo.
 */
function createGizmoDOM() {
  // 1. Add Styles
  const style = document.createElement('style');
  style.innerHTML = `
    #position-gizmo {
      position: fixed;
      right: 20px;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
      z-index: 100;
      display: none; /* Hidden by default */
      flex-direction: column;
      align-items: center;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.2s ease-out;
      touch-action: none; /* Critical for touch */
    }
    
    #position-gizmo.visible {
      display: flex;
      opacity: 1;
    }

    .gizmo-handle {
      width: 100px;
      height: 44px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      color: white;
      text-shadow: 0 1px 2px rgba(0,0,0,0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      cursor: grab;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    
    .gizmo-handle.handle-y {
      width: 44px;
      height: 100px;
      background: linear-gradient(145deg, #22c55e, #16a34a); /* Green */
      border-color: #4ade80;
    }
    
    .gizmo-handle.handle-x {
      background: linear-gradient(145deg, #ef4444, #dc2626); /* Red */
      border-color: #f87171;
    }
    
    .gizmo-handle.handle-z {
      background: linear-gradient(145deg, #3b82f6, #2563eb); /* Blue */
      border-color: #60a5fa;
    }
    
    .gizmo-handle:active {
      cursor: grabbing;
      transform: scale(0.95);
      opacity: 0.8;
    }
  `;
  document.head.appendChild(style);

  // 2. Create HTML Elements
  gizmoContainer = document.createElement('div');
  gizmoContainer.id = 'position-gizmo';

  // Y Handle (Vertical)
  handleY = document.createElement('div');
  handleY.className = 'gizmo-handle handle-y';
  handleY.textContent = 'Y';
  handleY.dataset.axis = 'y';

  // X Handle (Horizontal)
  handleX = document.createElement('div');
  handleX.className = 'gizmo-handle handle-x';
  handleX.textContent = 'X';
  handleX.dataset.axis = 'x';
  
  // Z Handle (Horizontal)
  handleZ = document.createElement('div');
  handleZ.className = 'gizmo-handle handle-z';
  handleZ.textContent = 'Z';
  handleZ.dataset.axis = 'z';
  
  // Assemble
  const horizontalGroup = document.createElement('div');
  horizontalGroup.style.display = 'flex';
  horizontalGroup.style.gap = '8px';
  horizontalGroup.appendChild(handleX);
  horizontalGroup.appendChild(handleZ);

  gizmoContainer.appendChild(handleY);
  gizmoContainer.appendChild(horizontalGroup);
  
  document.body.appendChild(gizmoContainer);
}

/**
 * Handles the pointer down event on a gizmo handle.
 */
function onPointerDown(event) {
  if (!currentSelection) return;
  
  const handle = event.target.closest('.gizmo-handle');
  if (!handle) return;

  event.preventDefault();
  event.stopPropagation();
  
  activeHandle = handle.dataset.axis;
  targetObject = currentSelection;
  lastPointerPos.set(event.clientX, event.clientY);
  
  if (orbitControls) {
    orbitControls.enabled = false;
  }
  
  document.addEventListener('pointermove', onPointerMove, { passive: false });
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
}

/**
 * Handles the pointer move event during a drag.
 */
function onPointerMove(event) {
  if (!activeHandle || !targetObject) return;
  
  event.preventDefault();

  const deltaX = event.clientX - lastPointerPos.x;
  const deltaY = event.clientY - lastPointerPos.y;
  
  // Calculate movement speed based on distance to camera
  const distance = targetObject.position.distanceTo(camera.position);
  const moveSpeed = distance * GIZMO_SENSITIVITY;

  // Use the dominant drag direction (horizontal or vertical) for movement
  const dragAmount = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : -deltaY;
  
  switch (activeHandle) {
    case 'x':
      targetObject.position.x += dragAmount * moveSpeed;
      break;
    case 'y':
      targetObject.position.y += dragAmount * moveSpeed;
      break;
    case 'z':
      targetObject.position.z += dragAmount * moveSpeed;
      break;
  }

  lastPointerPos.set(event.clientX, event.clientY);
}

/**
 * Handles the pointer up event, ending the drag.
 */
function onPointerUp() {
  activeHandle = null;
  targetObject = null;
  
  if (orbitControls) {
    orbitControls.enabled = true;
  }

  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
  document.removeEventListener('pointercancel', onPointerUp);
}

/**
 * Initializes the gizmo UI and attaches event listeners.
 */
export function initGizmo() {
  createGizmoDOM();
  gizmoContainer.addEventListener('pointerdown', onPointerDown, { passive: false });
}

/**
 * Shows the gizmo UI, attaching it to a specific object.
 * @param {THREE.Object3D} object - The object to be transformed.
 */
export function showGizmo(object) {
  if (!gizmoContainer) return;
  targetObject = object;
  gizmoContainer.classList.add('visible');
}

/**
 * Hides the gizmo UI.
 */
export function hideGizmo() {
  if (!gizmoContainer) return;
  targetObject = null;
  gizmoContainer.classList.remove('visible');
}
