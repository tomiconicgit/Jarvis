// src/main.js
// This is the main entry point for the entire application, loaded by 'launcher.js'.
// Its job is to import all necessary modules (core, engine, UI, assets)
// and initialize them in the correct order, attaching their APIs to the
// central 'App' object.

// --- 1. Core System Imports ---

// Import the debugger first (though initDebugger is used from the launcher)
import { checkForErrors, initDebugger } from '../debugger.js';
// Import the core Three.js library
import * as THREE from 'three'; 

// --- Core modules (load these first) ---
// These modules provide the foundational "services" for the app.
import { initEventBus } from './core/events.js'; 
import { initViewport } from './core/viewport.js';
import { initCamera } from './core/camera.js';
import { initFileManagement } from './core/filemanagement.js';
import { initSelectionContext } from './core/selectioncontext.js';
import { initModal } from './core/ui/modal.js';

// --- Engine Modules ---
// These modules provide the main "actions" or "features" of the app.
import { initEngine } from './core/engine/newproject.js'; // MUST be first (creates App.engine)
import { initSaveProject } from './core/engine/saveproject.js';
import { initLoadProject } from './core/engine/loadproject.js';
import { initImportEngine } from './core/engine/importengine.js';
import { initExportEngine } from './core/engine/exportengine.js';

// --- Play Mode Modules ---
// These are all the modules related to the "Test Play" feature.
import { initPlayer } from './core/engine/player.js';
import { initFirstPersonView } from './core/firstpersonview.js';
import { initJoystick } from './core/joystick.js';
import { initTestPlay } from './core/engine/testplay.js';

// --- Scripting Module ---
import { initScriptEngine } from './core/engine/script.js';


/**
 * -------------------------------------------------------------------
 * MODULE MANIFESTS
 * -------------------------------------------------------------------
 * These arrays define *what* to load and in *what order*.
 * This makes it easy to add or remove modules from the app.
 */

// --- Core services that provide an API ---
// These are functions that are imported directly and run in order.
// They typically attach their own API to the 'App' object (e.g., App.events).
const coreServices = [
    initEventBus,         // Creates App.events (must be very first)
    initFileManagement, // Creates App.fileManager
    initSelectionContext, // Creates App.selectionContext (depends on events)
    initModal,            // Creates App.modal
    
    // Engine functions (must be in this order)
    initEngine,           // Creates App.engine
    initSaveProject,      // Adds to App.engine
    initLoadProject,      // Adds to App.engine
    initImportEngine,     // Adds to App.engine
    initExportEngine,     // Adds to App.engine

    // --- NEW PLAY MODE MODULES ---
    initPlayer,           // Creates App.player
    initFirstPersonView,  // Creates App.firstPersonControls (depends on player)
    initJoystick,         // Creates App.joystick (depends on player)
    initTestPlay,         // Adds to App.engine (depends on player, controls, joystick)
    
    // --- NEW SCRIPTING MODULE ---
    initScriptEngine      // Creates App.scriptEngine
];

// --- Pluggable UI modules ---
// These are loaded dynamically from their file paths.
// They are "pluggable" because they just run and attach themselves.
// Their order matters less, but 'menu.js' (which defines CSS vars)
// and 'editorbar.js' (which creates containers) should be early.
const uiModules = [
    './core/ui/workspace.js',
    './core/ui/menu.js',            // Defines global CSS variables
    './core/ui/editorbar.js',     // Creates panel containers
    './core/ui/gizmo.js',         // Creates App.gizmo, App.grid
    './core/ui/gizmotools.js',    // Injects content into editorbar panel
    './core/ui/propertiespanel.js',// Injects content into editorbar panel
    './core/ui/transformpanel.js', // Injects content into editorbar panel
    './core/ui/addpanel.js'       // Creates the "Add" panel
];

// --- Default assets that make up a "New Project" ---
// These are also loaded dynamically. They add the default
// objects (terrain, light, sky) to the scene.
const defaultSceneModules = [
    './core/default/terrain.js',
    './core/default/environment.js',
    './core/default/lighting.js'
];


/**
 * A helper function to dynamically import a module from a path
 * and find its 'init' function (e.g., 'initWorkspace').
 * @param {string} path - The relative path to the .js module.
 * @returns {Promise<function | null>} A promise that resolves with the init function.
 */
async function loadModuleInit(path) {
    try {
        // Log the import attempt (for debugging startup errors)
        checkForErrors(`Main: Importing ${path}`);
        
        // Dynamically import the module
        const module = await import(path);
        
        // Find the exported function that starts with 'init'
        // (e.g., initWorkspace, initMenu, initTerrain)
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
        throw error; // This will be caught by the launcher
    }
}

/**
 * Main application entry point.
 * This is an "Immediately Invoked Function Expression" (IIFE).
 * It's an async function that is defined and then called immediately.
 */
(async () => {
    // Log a checkpoint
    checkForErrors('Main');
    
    // 1. Create the central App object
    // This empty object will be "hydrated" by all the
    // init functions, acting as the central namespace.
    const App = {};

    // 2. Init Debugger FIRST (again)
    // The launcher already did this, but we do it again
    // to ensure the *real* App object gets the .debugger API.
    initDebugger(App);

    // 3. Initialize Core 3D Systems
    // These are the non-negotiable Three.js building blocks.
    const { scene, renderer } = initViewport();
    App.scene = scene;
    App.renderer = renderer;
    const { camera, controls } = initCamera();
    App.camera = camera;
    App.controls = controls;

    // 4. Initialize Core Services (from the 'coreServices' array)
    console.log('[Main] Initializing core services...');
    for (const initFunc of coreServices) {
        initFunc(App); // e.g., initEventBus(App), initFileManagement(App), etc.
    }

    // 5. Load and initialize all UI modules (from 'uiModules' array)
    console.log('[Main] Initializing UI modules...');
    // 'Promise.all' loads all modules in parallel, which is fast.
    // We get an array of their 'init' functions.
    const uiInits = (await Promise.all(uiModules.map(loadModuleInit))).filter(Boolean);
    // Now, run each UI init function
    for (const initFunc of uiInits) {
        initFunc(App); // e.g., initWorkspace(App), initMenu(App), etc.
    }

    // 6. Load and *store* the "default scene" init functions
    console.log('[Main] Loading default scene assets...');
    // We don't run these yet. We store them on the App object
    // so the 'newproject.js' module can call them.
    App.defaultSceneInits = (await Promise.all(defaultSceneModules.map(loadModuleInit))).filter(Boolean);

    // 7. Run the default scene inits for the *first time*
    // This populates the scene with the initial terrain, light, and sky.
    App.defaultSceneInits.forEach(initFunc => initFunc(App));

    // 8. Render the Workspace UI
    // Now that all modules are loaded and the default scene is
    // populated, we can tell the workspace to render its file list.
    if (App.workspace && typeof App.workspace.render === 'function') {
        App.workspace.render();
    } else {
        console.error('[Main] Workspace render function not found.');
    }

    // 9. Start Render Loop
    const clock = new THREE.Clock(); // Create a clock to measure delta time

    // 'setAnimationLoop' is Three.js's built-in render loop.
    // It's better than 'requestAnimationFrame' because it's
    // aware of WebXR sessions.
    App.renderer.setAnimationLoop(() => {
        // Get the time elapsed since the last frame (in seconds)
        const deltaTime = clock.getDelta(); 
        
        if (App.engine && App.engine.isTesting) {
            // --- IN TEST MODE ---
            // Update the player's movement logic
            App.player.update(deltaTime);
            if (App.scriptEngine && App.scriptEngine.update) {
                App.scriptEngine.update(deltaTime);
            }
            // Render the scene using the *player's* camera
            App.renderer.render(App.scene, App.player.camera);

        } else {
            // --- IN EDITOR MODE ---
            // Update the OrbitControls (for damping/inertia)
            App.controls.update();
            // Render the scene using the *editor's* camera
            App.renderer.render(App.scene, App.camera);
        }
    });

    // 10. Add Resize Listener
    // This ensures the 3D viewport resizes correctly
    // when the browser window changes size.
    window.addEventListener('resize', () => {
        const canvas = App.renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight || 1; // Prevent 0 height
        
        // --- Update Editor Camera ---
        App.camera.aspect = width / height;
        App.camera.updateProjectionMatrix();

        // --- Update Player Camera ---
        if (App.player && App.player.camera) {
            App.player.camera.aspect = width / height;
            App.player.camera.updateProjectionMatrix();
        }

        // --- THIS IS THE CRITICAL LINE ---
        // Tell the renderer its *new* internal size.
        // This updates the <canvas> resolution.
        App.renderer.setSize(width, height);
    });

    console.log('[Main] Orchestration complete.');

})(); // <-- Immediately call the async function
