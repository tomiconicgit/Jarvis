// src/main.js
import { initViewport } from './core/viewport.js';
import { initCamera } from './core/camera.js';
import { checkForErrors } from '../debugger.js';

export const manifest = {
    modules: [
        'core/viewport.js',
        'core/camera.js'
    ],
    version: '1.0.0'
};

export function orchestrateModules() {
    checkForErrors('Main');
    
    // 1. Initialize modules and get their core components
    const { scene, renderer } = initViewport();
    const { camera, controls } = initCamera();

    // 2. Set up the main animation loop using the modern Three.js method
    renderer.setAnimationLoop(() => {
        // Update controls (for damping/inertia)
        controls.update();
        
        // Render the scene with the camera
        renderer.render(scene, camera);
    });

    // 3. Set up a single, central resize handler
    window.addEventListener('resize', () => {
        // Get the new dimensions from the canvas's CSS
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        // Update the renderer's size
        renderer.setSize(width, height);

        // Update the camera's aspect ratio
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });
}
