// src/main.js

import { checkForErrors, initDebugger } from '../debugger.js';
import * as THREE from 'three'; 

// --- Core modules (load these first) ---
import { initEventBus } from './core/events.js'; 
import { initViewport } from './core/viewport.js';
import { initCamera } from './core/camera.js';
import { initFileManagement } from './core/filemanagement.js';
import { initSelectionContext } from './core/selectioncontext.js';
import { initModal } from './core/ui/modal.js';
import { initEngine } from './core/engine/newproject.js';
import { initSaveProject } from './core/engine/saveproject.js';
import { initLoadProject } from './core/engine/loadproject.js';
import { initImportEngine } from './core/engine/importengine.js';
import { initExportEngine } from './core/engine/exportengine.js';

// --- NEW PLAY MODE IMPORTS ---
import { initPlayer } from './core/engine/player.js';
import { initFirstPersonView } from './core/firstpersonview.js';
import { initJoystick } from './core/joystick.js';
import { initTestPlay } from './core/engine/testplay.js';


/**
 * -------------------------------------------------------------------
 * MODULE MANIFESTS
 * -------------------------------------------------------------------
 */

// Core services that provide an API
const coreServices = [
    initEventBus, 
    initFileManagement,
    initSelectionContext,
    initModal,
    initEngine,
    initSaveProject,
    initLoadProject,
    initImportEngine,
    initExportEngine,

    // --- NEW PLAY MODE MODULES ---
    initPlayer, 
    initFirstPersonView,
    initJoystick,
    initTestPlay 
];

// Pluggable UI modules
// --- UPDATED: Removed tools.js, added new modules ---
const uiModules = [
    './core/ui/workspace.js',
    './core/ui/menu.js',
    './core/ui/editorbar.js',
    './core/ui/gizmo.js',
    './core/ui/gizmotools.js',
    './core/ui/propertiespanel.js',
    './core/ui/transformpanel.js'
];

// Default assets that make up a "New Project"
const defaultSceneModules = [
    './core/default/terrain.js',
    './core/default/environment.js',
    './core/default/lighting.js'
];


/**
 * Dynamically loads a module and returns its 'init' function.
 */
async function loadModuleInit(path) {
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

    // 2. Init Debugger FIRST
    initDebugger(App);

    // 3. Initialize Core Systems
    const { scene, renderer } = initViewport();
    App.scene = scene;
    App.renderer = renderer;
    const { camera, controls } = initCamera();
    App.camera = camera;
    App.controls = controls;

    // 4. Initialize Core Services
    console.log('[Main] Initializing core services...');
    for (const initFunc of coreServices) {
        initFunc(App);
    }

    // 5. Load and initialize all UI modules
    console.log('[Main] Initializing UI modules...');
    const uiInits = (await Promise.all(uiModules.map(loadModuleInit))).filter(Boolean);
    for (const initFunc of uiInits) {
        initFunc(App);
    }

    // 6. Load and store the "default scene" init functions
    console.log('[Main] Loading default scene assets...');
    App.defaultSceneInits = (await Promise.all(defaultSceneModules.map(loadModuleInit))).filter(Boolean);

    // 7. Run the default scene inits for the first time
    App.defaultSceneInits.forEach(initFunc => initFunc(App));

    // 8. After all modules are loaded, tell the workspace to render
    if (App.workspace && typeof App.workspace.render === 'function') {
        App.workspace.render();
    } else {
        console.error('[Main] Workspace render function not found.');
    }

    // 9. Start Render Loop
    const clock = new THREE.Clock(); 

    App.renderer.setAnimationLoop(() => {
        const deltaTime = clock.getDelta(); 
        
        if (App.engine && App.engine.isTesting) {
            // --- IN TEST MODE ---
            App.player.update(deltaTime); 
            App.renderer.render(App.scene, App.player.camera); 
            
        } else {
            // --- IN EDITOR MODE ---
            App.controls.update();
            App.renderer.render(App.scene, App.camera);
        }
    });

    // 10. Add Resize Listener
    window.addEventListener('resize', () => {
        const canvas = App.renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight || 1; 
        
        App.camera.aspect = width / height;
        App.camera.updateProjectionMatrix();

        if (App.player && App.player.camera) {
            App.player.camera.aspect = width / height;
            App.player.camera.updateProjectionMatrix();
        }

        App.renderer.setSize(width, height);
    });

    console.log('[Main] Orchestration complete.');

})();
