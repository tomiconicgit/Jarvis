// src/core/viewport.js
import * as THREE from 'three';

export function initViewport() {
    const canvas = document.getElementById('viewport');
    if (!canvas) {
        throw new Error('Viewport canvas element not found');
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // simple sky

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Ground plane
    const geometry = new THREE.PlaneGeometry(2000, 2000);
    const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // Subtle grid
    const grid = new THREE.GridHelper(2000, 2000, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    return { scene, renderer };
}