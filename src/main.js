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

    const { scene, renderer } = initViewport();
    const { camera, controls } = initCamera();

    renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
    });

    window.addEventListener('resize', () => {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight || 1;

        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });
}