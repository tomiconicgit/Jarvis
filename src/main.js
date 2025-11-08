// src/main.js
import { checkForErrors } from '../debugger.js';

/**
 * -------------------------------------------------------------------
 * YOUR NEW MODULE MANIFEST
 * -------------------------------------------------------------------
 * This is now the ONLY file you need to update when you add a new
 * module. Just add the path to the file here.
 */
const appModules = [
    // --- Core Modules ---
    './core/viewport.js',
    './core/camera.js',

    // --- UI Modules ---
    './core/ui/workspace.js',
    './core/ui/menu.js'

    // --- Future Modules ---
    // './core/tools/gizmo.js',
    // './core/scene/importer.js'
];

/**
 * This function dynamically imports a module, finds its 'init' function,
 * and runs it. This is what stops us from needing to write
 * `import { init... }` and `init...()` for every new file.
 */
async function loadModule(path) {
    try {
        checkForErrors(`Main: Importing ${path}`);
        const module = await import(path);

        // Find the exported 'init' function (e.g., initWorkspace, initMenu)
        const initFunction = Object.values(module).find(
            (val) => typeof val === 'function' && val.name.startsWith('init')
        );

        if (initFunction) {
            console.log(`[Main] Initializing: ${initFunction.name}`);
            initFunction(); // Run it!
        } else {
            console.warn(`[Main] No 'init' function found in ${path}`);
        }
    } catch (error) {
        console.error(`[Main] Failed to load module ${path}:`, error);
        // We re-throw the error so the global 'unhandledrejection'
        // handler in debugger.js can catch it and display it on
        // the loading screen.
        throw error;
    }
}

/**
 * Orchestrate the application start-up.
 * We wrap this in an async IIFE (Immediately Invoked Function Expression)
 * so we can use 'await'.
 */
(async () => {
    console.log('[Main] Orchestration started...');

    // Load all core/UI modules in parallel
    await Promise.all(appModules.map(loadModule));

    // --- Post-Init Setup ---
    // (We no longer get 'scene', 'renderer' etc. back here.
    // If you need them, you'd need to create a simple global state
    // or event bus, but for now, this is much cleaner.)

    // --- Final Step: Start Render Loop ---
    // This is the only part that's slightly trickier.
    // The modules that create 'scene', 'renderer', 'camera'
    // will need to be modified to store those references.
    
    // --- SIMPLE SOLUTION for now: ---
    // We can assume `initViewport` and `initCamera` created
    // what they needed and now we just find them.
    // This is a bit of a hack, but works for this structure.
    
    // Let's modify this slightly. We'll load viewport/camera first
    // manually, then the rest.
    
    // -----------------------------------------------------------------
    // A BETTER, CLEANER `main.js` (re-writing from above)
    // -----------------------------------------------------------------
})();


// -----------------------------------------------------------------
// A BETTER, CLEANER `main.js` (Corrected Approach)
// -----------------------------------------------------------------

import { checkForErrors } from '../debugger.js';

// --- Core modules (load these first) ---
import { initViewport } from './core/viewport.js';
import { initCamera } from './core/camera.js';

/**
 * -------------------------------------------------------------------
 * YOUR NEW MODULE MANIFEST (UI / Tools / etc.)
 * -------------------------------------------------------------------
 * This is the list of "secondary" modules to load.
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
        throw error; // Re-throw for global error handler
    }
}

/**
 * Main application entry point.
 * This runs automatically when imported by loading.js
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
