// src/main.js
import { initViewport } from './core/viewport.js';
import { initCamera } from './core/camera.js';
import { checkForErrors } from '../debugger.js';

export const manifest = {
    modules: [
        'core/viewport.js',
        'core/camera.js'
        // Add more as project grows
    ],
    version: '1.0.0'
};

export function orchestrateModules() {
    checkForErrors('Main');
    initViewport();
    initCamera();
    // Future: Connect more modules via switchboard logic
}
