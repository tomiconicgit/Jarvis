// src/core/camera.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function initCamera() {
    const canvas = document.getElementById('viewport');
    if (!canvas) {
        throw new Error('Viewport canvas element not found');
    }

    const camera = new THREE.PerspectiveCamera(
        60,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
    );

    // Start offset, looking at origin
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, canvas);

    // Common "feels right" settings
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 0.8;

    controls.minDistance = 2;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI - 0.1;

    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;

    // Touch setup (guarded so it won't crash if constants differ)
    try {
        if (THREE.TOUCH) {
            controls.touches = {
                ONE: THREE.TOUCH.ROTATE,      // 1 finger rotate
                TWO: THREE.TOUCH.DOLLY_PAN    // 2 finger zoom + pan
            };
        }
    } catch (e) {
        console.warn('Touch config skipped:', e);
    }

    controls.update();

    return { camera, controls };
}