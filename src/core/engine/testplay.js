// src/core/engine/testplay.js

// Module-level App object
let App;

// UI elements
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
    stopButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="1"></rect></svg>`;
    
    document.body.appendChild(stopButton);
    
    stopButton.addEventListener('click', stopTestMode);
}

/**
 * Starts the test play mode.
 */
function startTestMode() {
    if (!App) return;
    
    const bottomBar = document.getElementById('bottom-bar');
    
    console.log('[Engine] Starting Test Mode...');
    App.engine.isTesting = true;

    // 1. Store editor camera state
    App.editorCameraState = {
        position: App.camera.position.clone(),
        target: App.controls.target.clone(),
    };

    // 2. Hide Editor UI
    if (bottomBar) bottomBar.style.display = 'none';
    App.workspace.close();
    App.tools.close();
    App.gizmo.hideUI(); // <-- HIDE GIZMO UI
    App.gizmo.detach(); // <-- HIDE GIZMO

    // 3. Show Test Mode UI
    stopButton.style.display = 'flex';
    App.joystick.show();

    // 4. Activate Player/First Person View
    App.player.activate();
    App.firstPersonControls.activate();
}

/**
 * Stops the test play mode and returns to editor.
 */
function stopTestMode() {
    if (!App) return;

    const bottomBar = document.getElementById('bottom-bar');

    console.log('[Engine] Stopping Test Mode...');
    App.engine.isTesting = false;

    // 1. Deactivate Player/First Person View
    App.player.deactivate();
    App.firstPersonControls.deactivate();

    // 2. Hide Test Mode UI
    stopButton.style.display = 'none';
    App.joystick.hide();
    
    // 3. Show Editor UI
    if (bottomBar) bottomBar.style.display = 'flex';
    App.gizmo.showUI(); // <-- SHOW GIZMO UI
    
    // 4. Restore editor camera
    if (App.editorCameraState) {
        App.camera.position.copy(App.editorCameraState.position);
        App.controls.target.copy(App.editorCameraState.target);
        App.controls.update();
    }
    
    App.controls.enabled = true;
    
    // 5. Re-select object to show gizmo
    const selected = App.selectionContext.getSelected();
    if (selected) {
        App.events.publish('selectionChanged', selected);
    }
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

    injectStyles();
    createMarkup();

    App.engine.startTestMode = startTestMode;
    App.engine.stopTestMode = stopTestMode;
    
    setTimeout(() => {
        const playBtn = document.getElementById('bottom-bar-play-btn');
        if (playBtn) {
            playBtn.replaceWith(playBtn.cloneNode(true));
            document.getElementById('bottom-bar-play-btn').addEventListener('click', startTestMode);
        } else {
            console.warn('TestPlay: Could not find play button to attach event.');
        }
    }, 1000); 

    console.log('Test Play Engine Initialized.');
}
