// src/main.js
import { initViewport } from './core/viewport.js';
import { initCamera } from './core/camera.js';
import { checkForErrors } from '../debugger.js';
import { initWorkspace } from './core/ui/workspace.js';
import { initMenu } from './core/ui/menu.js'; // <-- 1. IMPORT

export const manifest = {
    modules: [
        'core/viewport.js',
        'core/camera.js',
        'core/ui/workspace.js',
        'core/ui/menu.js' // <-- 2. ADD TO MANIFEST
    ],
    version: '1.0.0'
};

export function orchestrateModules() {
    checkForErrors('Main');

    // --- Initialize Core Modules ---
    const { scene, renderer } = initViewport();
    const { camera, controls } = initCamera();

    // --- Initialize UI Modules ---
    initWorkspace();
    initMenu(); // <-- 3. CALL IT

    // --- Start Render Loop ---
    renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
    });

    // --- Add Resize Listener ---
    window.addEventListener('resize', () => {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight || 1;

        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });
}
