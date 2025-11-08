// src/main.js

import { checkForErrors } from '../debugger.js';

// --- Core modules (load these first) ---
import { initViewport } from './core/viewport.js';
import { initCamera } from './core/camera.js';
import { initFileManagement } from './core/filemanagement.js';
import { initSelectionContext } from './core/selectioncontext.js';

/**
 * -------------------------------------------------------------------
 * PLUGGABLE MODULE MANIFEST (UI / Tools / Content)
 * -------------------------------------------------------------------
 * Add new module paths here. They will be loaded automatically.
 */
const pluggableModules = [
    './core/ui/workspace.js',
    './core/ui/menu.js',
    './core/ui/tools.js', // <-- 1. ADD THIS LINE
    './core/procedural/terrain.js',
    './core/procedural/lighting.js',
    './core/procedural/sky.js'
];

/**
 * Dynamically loads and initializes a single module, passing the App object.
 */
async function loadModule(path, App) {
    try {
        checkForErrors(`Main: Importing ${path}`);
        const module = await import(path);
        
        const initFunction = Object.values(module).find(
            (val) => typeof val === 'function' && val.name.startsWith('init')
        );

        if (initFunction) {
            console.log(`[Main] Initializing: ${initFunction.name}`);
            initFunction(App);
        } else { 
            console.warn(`[Main] No 'init' function found in ${path}`);
        }
    } catch (error) {
        console.error(`[Main] Failed to load module ${path}:`, error);
        throw error; // Re-throw for global error handler
    }
}

/**
 * Main application entry point.
 */
(async () => {
    checkForErrors('Main');
    
    // 5. Create the central App object
    const App = {};

    // 6. Initialize Core Systems and attach to App
    const { scene, renderer } = initViewport();
    App.scene = scene;
    App.renderer = renderer;

    const { camera, controls } = initCamera();
    App.camera = camera;
    App.controls = controls;

    // 7. Initialize Core Services and attach to App
    // These must be init'd BEFORE modules that use them.
    initFileManagement(App);
    initSelectionContext(App);

    // 8. Load all pluggable modules in parallel
    // They all get the same App object.
    await Promise.all(pluggableModules.map(path => loadModule(path, App)));

    // 9. After all modules are loaded, tell the workspace to render.
    // This builds the workspace UI *after* all files are registered.
    
    // --- THE FIX: Call the workspace's render function ---
    if (App.workspace && typeof App.workspace.render === 'function') {
        App.workspace.render();
    } else {
        console.error('[Main] Workspace render function not found.');
    }
    // --- GONE: App.fileManager.render();

    // 10. Start Render Loop
    App.renderer.setAnimationLoop(() => {
        App.controls.update();
        App.renderer.render(App.scene, App.camera);
    });

    // 11. Add Resize Listener
    window.addEventListener('resize', () => {
        const canvas = App.renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight || 1;

        App.renderer.setSize(width, height);
        App.camera.aspect = width / height;
        App.camera.updateProjectionMatrix();
    });

    console.log('[Main] Orchestration complete.');

})(); // Self-executing function
