// src/main.js

import { checkForErrors } from '../debugger.js';

// --- Core modules (load these first) ---
import { initViewport } from './core/viewport.js';
import { initCamera } from './core/camera.js';

/**
 * -------------------------------------------------------------------
 * YOUR MODULE MANIFEST (UI / Tools / etc.)
 * -------------------------------------------------------------------
 * This is the list of "secondary" modules to load.
 * Add new module paths here, and they will be loaded automatically.
 */
const pluggableModules = [
    './core/ui/workspace.js',
    './core/ui/menu.js'
    // './core/tools/gizmo.js',
];

/**
 * Dynamically loads and initializes a single module.
 */
async function loadModule(path) {
    try {
        checkForErrors(`Main: Importing ${path}`);
        const module = await import(path);
        
        // Finds the exported function that starts with 'init'
        const initFunction = Object.values(module).find(
            (val) => typeof val === 'function' && val.name.startsWith('init')
        );

        if (initFunction) {
            console.log(`[Main] Initializing: ${initFunction.name}`);
            initFunction();
        } else {
            console.warn(`[Main] No 'init' function found in ${path}`);
        }
    } catch (error) {
        console.error(`[Main] Failed to load module ${path}:`, error);
        throw error; // Re-throw for global error handler in launcher.js
    }
}

/**
 * Main application entry point.
 * This runs automatically when imported by launcher.js
 */
(async () => {
    checkForErrors('Main');
    
    // 1. Initialize Core Systems
    // These are critical, so we do them explicitly.
    const { scene, renderer } = initViewport();
    const { camera, controls } = initCamera();

    // 2. Load all other modules in parallel
    // These are UI, tools, etc. Their order doesn't matter.
    await Promise.all(pluggableModules.map(loadModule));

    // 3. Start Render Loop
    renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
    });

    // 4. Add Resize Listener
    window.addEventListener('resize', () => {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight || 1;

        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });

    console.log('[Main] Orchestration complete.');

})(); // Self-executing function
