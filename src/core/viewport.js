// src/core/viewport.js
import * as THREE from 'three';

export function initViewport() {
    const canvas = document.getElementById('viewport');
    if (!canvas) {
        throw new Error('Viewport canvas element not found');
    }

    const scene = new THREE.Scene();
    scene.background = null;

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    
    // --- UPDATED ---
    renderer.shadowMap.enabled = true; // <-- ENABLE SHADOWS
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // <-- MAKE SHADOWS SMOOTH
    // --- END UPDATE ---

    return { scene, renderer };
}
