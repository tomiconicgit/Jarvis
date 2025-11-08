// src/core/viewport.js
import * as THREE from 'three';

export function initViewport() {
    const canvas = document.getElementById('viewport');
    if (!canvas) {
        throw new Error('Viewport canvas element not found');
    }

    const scene = new THREE.Scene();
    // No background set: renderer will show default (black/transparent depending on context)
    scene.background = null;

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = false; // no lights/objects yet

    return { scene, renderer };
}