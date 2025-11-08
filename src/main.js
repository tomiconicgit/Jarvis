// src/main.js

import { checkForErrors } from '../debugger.js';

// --- Core modules (load these first) ---
import { initViewport } from './core/viewport.js';
import { initCamera } from './core/camera.js';
import { initFileManagement } from './core/filemanagement.js';
import { initSelectionContext } from './core/selectioncontext.js';
import { initModal } from './core/ui/modal.js';
import { initEngine } from './core/engine/newproject.js';
import { initSaveProject } from './core/engine/saveproject.js'; // <-- 1. NEW IMPORT

/**
 * -------------------------------------------------------------------
 * MODULE MANIFESTS
 * -------------------------------------------------------------------
 */

// Core services that provide an API
const coreServices = [
    initFileManagement,
    initSelectionContext,
    initModal,
    initEngine,
    initSaveProject // <-- 2. ADD TO LIST (must be after initEngine)
];

// Pluggable UI modules
const uiModules = [
    './core/ui/workspace.js',
    './core/ui/menu.js',
    './core/ui/tools.js'
];

// Default assets that make up a "New Project"
const defaultSceneModules = [
    './core/procedural/terrain.js',
    './core/procedural/lighting.js',
    './core/procedural/sky.js'
];


/**
 * Dynamically loads a module and returns its 'init' function.
 */
async function loadModuleInit(path) {
    // ... (this function is unchanged)
    try {
        checkForErrors(`Main: Importing ${path}`);
        const module = await import(path);
        const initFunction = Object.values(module).find(
            (val) => typeof val === 'function' && val.name.startsWith('init')
        );
        if (initFunction) {
            return initFunction;
        } else {
            console.warn(`[Main] No 'init' function found in ${path}`);
            return null;
        }
    } catch (error) {
        console.error(`[Main] Failed to load module ${path}:`, error);
        throw error;
    }
}

/**
 * Main application entry point.
 */
(async () => {
    checkForErrors('Main');
    
    // 1. Create the central App object
    const App = {};

    // 2. Initialize Core Systems
    const { scene, renderer } = initViewport();
    App.scene = scene;
    App.renderer = renderer;
    const { camera, controls } = initCamera();
    App.camera = camera;
    App.controls = controls;

    // 3. Initialize Core Services
    console.log('[Main] Initializing core services...');
    coreServices.forEach(initFunc => initFunc(App));

    // 4. Load and initialize all UI modules
    console.log('[Main] Initializing UI modules...');
    const uiInits = (await Promise.all(uiModules.map(loadModuleInit))).filter(Boolean);
    uiInits.forEach(initFunc => initFunc(App));

    // 5. Load and store the "default scene" init functions
    console.log('[Main] Loading default scene assets...');
    App.defaultSceneInits = (await Promise.all(defaultSceneModules.map(loadModuleInit))).filter(Boolean);

    // 6. Run the default scene inits for the first time
    App.defaultSceneInits.forEach(initFunc => initFunc(App));

    // 7. After all modules are loaded, tell the workspace to render
    if (App.workspace && typeof App.workspace.render === 'function') {
        App.workspace.render();
    } else {
        console.error('[Main] Workspace render function not found.');
    }

    // 8. Start Render Loop
    App.renderer.setAnimationLoop(() => {
        App.controls.update();
        App.renderer.render(App.scene, App.camera);
    });

    // 9. Add Resize Listener
    window.addEventListener('resize', () => {
        const canvas = App.renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight || 1;
        App.renderer.setSize(width, height);
        App.camera.aspect = width / height;
        App.camera.updateProjectionMatrix();
    });

    console.log('[Main] Orchestration complete.');

})();
