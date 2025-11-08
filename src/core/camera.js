// src/core/camera.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.min.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import { scene } from './viewport.js';

export function initCamera() {
    const canvas = document.getElementById('viewport');
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight - 80), 0.1, 200); // FOV 75, near 0.1, far 200
    camera.position.set(0, 5, 10);
    window.camera = camera; // Global for viewport render

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;

    // Touch controls: OrbitControls handles single/two finger by default (rotate with one, pan with two, pinch zoom)
    // Placeholder for rotate around selected object: Set controls.target to selected object's position when implemented

    function update() {
        controls.update();
        requestAnimationFrame(update);
    }
    update();
}