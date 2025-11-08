// src/core/camera.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.min.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js';
// REMOVED: import { scene } from './viewport.js'; (no longer needed)

export function initCamera() {
    const canvas = document.getElementById('viewport');
    
    // Set aspect ratio from canvas's current styled size
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
    camera.position.set(0, 5, 10);
    
    // REMOVED: window.camera = camera; (No more global)

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;

    // REMOVED: self-contained update() loop

    // Return the created objects for the orchestrator (main.js) to use
    return { camera, controls };
}
