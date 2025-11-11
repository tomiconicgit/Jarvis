// src/core/engine/testplay.js
// This module provides the logic for starting and stopping the
// "Test Play" mode. It handles saving the editor camera's state,
// hiding all editor UI, showing the play-mode UI (like the stop button
// and joystick), and activating the first-person player controls.

// Module-level variable to store a reference to the main App object.
let App;

/**
 * Injects the CSS styles for the "Stop" button into the document's <head>.
 * This ensures the UI is styled correctly when 'startTestMode' is called.
 */
function injectStyles() {
    const styleId = 'testplay-ui-styles';
    // Only inject if the styles don't already exist
    if (document.getElementById(styleId)) return;

    const css = `
        #testplay-stop-btn {
            position: fixed; /* Stays in place on screen */
            top: 10px;
            left: 10px;
            z-index: 101; /* Above loading, below modal (200) */
            background: rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px;
            width: 44px;
            height: 44px;
            display: none; /* Hidden by default */
            align-items: center;
            justify-content: center;
            cursor: pointer;
            /* Add a blur effect for a modern UI feel */
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }
        #testplay-stop-btn svg {
            width: 24px;
            height: 24px;
            stroke: #fff; /* White stop-square icon */
            stroke-width: 2.5;
            stroke-linecap: round;
        }
        #testplay-stop-btn:active {
            /* Darken on click */
            background: rgba(0,0,0,0.7);
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the "Stop" button HTML, adds it to the <body>,
 * and attaches its click listener.
 */
function createMarkup() {
    const stopButton = document.createElement('button');
    stopButton.id = 'testplay-stop-btn';
    // SVG icon for a "stop" square
    stopButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="1"></rect></svg>`;
    
    document.body.appendChild(stopButton);
    
    // Add the one and only event listener for this button
    stopButton.addEventListener('click', stopTestMode);
}

/**
 * Starts the test play mode. Hides editor UI, shows play UI,
 * and activates the player.
 */
function startTestMode() {
    if (!App) return;

    // --- Find all UI elements just-in-time ---
    // We get references here instead of globally, just in case
    // one of them failed to initialize.
    const bottomBar = document.getElementById('bottom-bar');
    const editorBar = document.getElementById('editor-bar');
    const stopButton = document.getElementById('testplay-stop-btn');
    const viewport = document.getElementById('viewport');
    const addPanel = document.getElementById('add-panel'); 
    
    console.log('[Engine] Starting Test Mode...');
    App.engine.isTesting = true; // Set the global "isTesting" flag

    // 1. Store editor camera state
    // We must save the current position and target of the editor's
    // OrbitControls so we can restore them perfectly later.
    App.editorCameraState = {
        position: App.camera.position.clone(),
        target: App.controls.target.clone(),
    };

    // 2. Hide Editor UI (with safety checks in case elements are missing)
    if (bottomBar) bottomBar.style.display = 'none';
    if (editorBar) editorBar.style.display = 'none'; 
    if (addPanel) addPanel.style.display = 'none'; 
    // Close any open panels
    if (App.workspace) App.workspace.close();
    if (App.editorBar) App.editorBar.closeAllPanels(); 
    // Detach the transform gizmo from any selected object
    if (App.gizmo) App.gizmo.detach(); 

    // 3. Show Test Mode UI
    if (stopButton) stopButton.style.display = 'flex'; // Show the stop button
    if (App.joystick) App.joystick.show(); // Show the joystick

    // 4. Activate Player/First Person View
    // This will take control of the camera and input
    if (App.player) App.player.activate();
    if (App.firstPersonControls) App.firstPersonControls.activate();
    if (App.scriptEngine && App.scriptEngine.start) App.scriptEngine.start();
    
    // 5. Resize Viewport to Fullscreen
    // The canvas should take up the *entire* screen,
    // covering the space where the UI bars used to be.
    if (viewport) {
        viewport.style.height = '100vh';
    }
}

/**
 * Stops the test play mode and returns to the editor.
 */
function stopTestMode() {
    if (!App) return;

    // --- Find all UI elements just-in-time ---
    const bottomBar = document.getElementById('bottom-bar');
    const editorBar = document.getElementById('editor-bar');
    const stopButton = document.getElementById('testplay-stop-btn');
    const viewport = document.getElementById('viewport');
    const addPanel = document.getElementById('add-panel'); 

    console.log('[Engine] Stopping Test Mode...');
    App.engine.isTesting = false; // Unset the global "isTesting" flag

    // 1. Deactivate Player/First Person View
    // This gives camera/input control back to the editor
    if (App.player) App.player.deactivate();
    if (App.firstPersonControls) App.firstPersonControls.deactivate();
    if (App.scriptEngine && App.scriptEngine.stop) App.scriptEngine.stop();

    // 2. Hide Test Mode UI
    if (stopButton) stopButton.style.display = 'none'; // Hide the stop button
    if (App.joystick) App.joystick.hide(); // Hide the joystick
    
    // 3. Show Editor UI
    if (bottomBar) bottomBar.style.display = 'flex';
    if (editorBar) editorBar.style.display = 'flex'; 
    if (addPanel) addPanel.style.display = 'flex'; 
    
    // 4. Resize Viewport back to Editor size
    // We must restore the 'calc()' height from index.html
    // to make room for the UI bars at the bottom.
    if (viewport) {
        viewport.style.height = 'calc(100vh - (110px + env(safe-area-inset-bottom)))';
    }
    
    // 5. Restore editor camera
    // This is where we use the state we saved earlier.
    if (App.editorCameraState) {
        App.camera.position.copy(App.editorCameraState.position);
        App.controls.target.copy(App.editorCameraState.target);
        // We must call .update() for the OrbitControls to
        // accept the new position and target.
        App.controls.update();
    }
    
    // Re-enable the OrbitControls. We disabled them in firstpersonview.js
    App.controls.enabled = true;
    
    // 6. Re-select object to show gizmo
    // If an object was selected when we hit "play",
    // we should re-attach the gizmo to it.
    const selected = App.selectionContext.getSelected();
    if (selected) {
        // We publish this event instead of calling gizmo.attach() directly,
        // as it's cleaner to let the gizmo module listen for this.
        App.events.publish('selectionChanged', selected);
    }
}

/**
 * Initializes the Test Play module.
 * @param {object} app - The main App object.
 */
export function initTestPlay(app) {
    if (!app || !app.engine) {
        // This module depends on the core 'engine' being initialized first.
        throw new Error('initTestPlay requires App.engine to be initialized first.');
    }
    
    App = app; // Store the app reference
    App.engine.isTesting = false; // The initial state is "not testing"
    App.editorCameraState = null; // No camera state saved yet

    // Create the UI elements
    injectStyles();
    createMarkup();

    // Add the public functions to the App.engine namespace
    App.engine.startTestMode = startTestMode;
    App.engine.stopTestMode = stopTestMode;

    console.log('Test Play Engine Initialized.');
}
