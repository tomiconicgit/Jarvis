// src/core/viewport.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.min.js';

export function initViewport() {
    const canvas = document.getElementById('viewport');
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Blue sky

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight); 
    renderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Terrain
    const geometry = new THREE.PlaneGeometry(2000, 2000);
    const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // Grid
    const grid = new THREE.GridHelper(2000, 2000, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    return { scene, renderer };
}
