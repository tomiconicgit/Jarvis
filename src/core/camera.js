// src/core/camera.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function initCamera() {
    const canvas = document.getElementById('viewport');
    if (!canvas) {
        throw new Error('Viewport canvas element not found');
    }

    // Classic orbit-style perspective camera
    const camera = new THREE.PerspectiveCamera(
        60,                                // FOV
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
    );

    // Start slightly back and above, looking at origin
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 0, 0);

    // Attach OrbitControls to the canvas element
    const controls = new OrbitControls(camera, canvas);

    // Core feel
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    // Mouse / touch speeds
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 0.8;

    // Limits so it feels sane
    controls.minDistance = 2;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI - 0.1; // avoid flipping under

    // Enable all basic interactions
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;

    // Touch behavior (this is the “traditional” three.js orbit feel)
    controls.touches = {
        ONE: THREE.TOUCH.ROTATE,      // 1 finger: rotate
        TWO: THREE.TOUCH.DOLLY_PAN    // 2 fingers: pinch zoom + pan
    };

    controls.update();

    return { camera, controls };
}