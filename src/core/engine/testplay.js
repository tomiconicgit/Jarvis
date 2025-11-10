// src/core/engine/testplay.js

// Module-level App object
let App;

// UI elements
// --- REMOVED from here ---
let stopButton;

/**
 * Injects the CSS for the stop button.
 */
function injectStyles() {
    const styleId = 'testplay-ui-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        #testplay-stop-btn {
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 101; /* Above loading, below modal */
            background: rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px;
            width: 44px;
            height: 44px;
            display: none; /* Hidden by default */
            align-items: center;
            justify-content: center;
            cursor: pointer;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }
        #testplay-stop-btn svg {
            width: 24px;
            height: 24px;
            stroke: #fff;
            stroke-width: 2.5;
            stroke-linecap: round;
        }
        #testplay-stop-btn:active {
            background: rgba(0,0,0,0.7);
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML for the stop button.
 */
function createMarkup() {
    stopButton = document.createElement('button');
    stopButton.id = 'testplay-stop-btn';
    // Simple "Stop" icon (a square)
    stopButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="1"></rect></svg>`;
    
    document.body.appendChild(stopButton);
    
    stopButton.addEventListener('click', stopTestMode);
}

/**
 * Starts the test play mode.
 */
function startTestMode() {
    if (!App) return;

    // --- FIX: Find UI elements just-in-time ---
    const bottomBar = document.getElementById('bottom-bar');
    // --- END FIX ---
    
    console.log('[Engine] Starting Test Mode...');
    App.engine.isTesting = true;

    // 1. Store editor camera state
    App.editorCameraState = {
        position: App.camera.position.clone(),
        target: App.controls.target.clone(),
    };

    // 2. Hide Editor UI
    if (bottomBar) bottomBar.style.display = 'none'; // <-- Added safety check
    App.workspace.close();
    App.tools.close();

    // 3. Show Test Mode UI
    stopButton.style.display = 'flex';
    App.joystick.show();

    // 4. Activate Player/First Person View
    App.player.activate();
    App.firstPersonControls.activate();

    // 5. (Future) Activate scripts
    // App.scriptEngine.runAll();
}

/**
 * Stops the test play mode and returns to editor.
 */
function stopTestMode() {
    if (!App) return;

    // --- FIX: Find UI elements just-in-time ---
    const bottomBar = document.getElementById('bottom-bar');
    // --- END FIX ---

    console.log('[Engine] Stopping Test Mode...');
    App.engine.isTesting = false;

    // 1. (Future) Stop scripts
    // App.scriptEngine.stopAll();

    // 2. Deactivate Player/First Person View
    App.player.deactivate();
    App.firstPersonControls.deactivate();

    // 3. Hide Test Mode UI
    stopButton.style.display = 'none';
    App.joystick.hide();
    
    // 4. Show Editor UI
    if (bottomBar) bottomBar.style.display = 'flex'; // <-- Added safety check
    
    // 5. Restore editor camera
    if (App.editorCameraState) {
        App.camera.position.copy(App.editorCameraState.position);
        App.controls.target.copy(App.editorCameraState.target);
        App.controls.update();
    }
    
    // Ensure OrbitControls are re-enabled
    App.controls.enabled = true;
}

/**
 * Initializes the Test Play module.
 */
export function initTestPlay(app) {
    if (!app || !app.engine) {
        throw new Error('initTestPlay requires App.engine to be initialized first.');
    }
    
    App = app;
    App.engine.isTesting = false;
    App.editorCameraState = null;
    
    // --- REMOVED: Don't find UI elements here ---
    // bottomBar = document.getElementById('bottom-bar');
    // workspaceContainer = document.getElementById('workspace-container');
    // toolsContainer = document.getElementById('tools-container');

    injectStyles();
    createMarkup();

    // Attach to the App.engine
    App.engine.startTestMode = startTestMode;
    App.engine.stopTestMode = stopTestMode;
    
    // Find the play button in the menu and hook it up
    // We must wait for the menu to be created, so we use a small delay.
    setTimeout(() => {
        const playBtn = document.getElementById('bottom-bar-play-btn');
        if (playBtn) {
            // Remove the old 'alert' listener and add the real one
            playBtn.replaceWith(playBtn.cloneNode(true));
            document.getElementById('bottom-bar-play-btn').addEventListener('click', startTestMode);
        } else {
            console.warn('TestPlay: Could not find play button to attach event.');
        }
    }, 1000); // Wait 1s for menu.js to be fully initialized

    console.log('Test Play Engine Initialized.');
}
