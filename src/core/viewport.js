// src/core/viewport.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.min.js';

let scene, renderer;

export function initViewport() {
    const canvas = document.getElementById('viewport');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Blue sky

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight - 80); // Adjust for toolbar/status
    renderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Terrain: 2000x2000 grey plane
    const geometry = new THREE.PlaneGeometry(2000, 2000);
    const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // Grid: 2000x2000 with 1x1 cells
    const grid = new THREE.GridHelper(2000, 2000, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    // Render loop
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, window.camera); // Use global camera
    }
    animate();

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight - 80);
    });
}

export { scene }; // For other modules to add to scene