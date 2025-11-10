// src/core/firstpersonview.js
import * as THREE from 'three';

let App;
let viewport;

// Touch look state
let lookTouchId = null; // <-- CHANGED: We now store the unique ID of the look touch
let lastTouchX = 0;
let lastTouchY = 0;
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const PI_2 = Math.PI / 2;

function onTouchStart(event) {
    // If we are already tracking a look touch, ignore new touches
    if (lookTouchId !== null) return; // <-- CHANGED

    // --- CHANGED: Loop through all *new* touches ---
    for (const touch of event.changedTouches) {
        // Only listen to touches on the right side of the screen
        if (touch.clientX >= window.innerWidth / 2) {
            lookTouchId = touch.identifier; // <-- Store this touch's ID
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            break; // Stop looping once we've found our touch
        }
    }
}

function onTouchMove(event) {
    // If we're not tracking a look touch, exit
    if (lookTouchId === null) return; // <-- CHANGED

    event.preventDefault();

    // --- CHANGED: Loop through all *moved* touches ---
    for (const touch of event.changedTouches) {
        // Find the touch that matches our stored lookTouchId
        if (touch.identifier === lookTouchId) {
            const deltaX = (touch.clientX - lastTouchX) * 0.005; // Look sensitivity
            const deltaY = (touch.clientY - lastTouchY) * 0.005;

            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;

            const playerObject = App.player.object;
            
            // Y-axis rotation (left/right) is applied to the player's BODY
            euler.setFromQuaternion(playerObject.quaternion);
            euler.y -= deltaX;
            playerObject.quaternion.setFromEuler(euler);

            // X-axis rotation (up/down) is applied to the CAMERA
            euler.setFromQuaternion(App.player.camera.quaternion);
            euler.x -= deltaY;
            euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x)); // Clamp vertical look
            App.player.camera.quaternion.setFromEuler(euler);

            break; // Stop looping once we've processed our touch
        }
    }
}

function onTouchEnd(event) {
    // If we're not tracking a look touch, exit
    if (lookTouchId === null) return; // <-- CHANGED

    // --- CHANGED: Loop through all *ended* touches ---
    for (const touch of event.changedTouches) {
        // Check if the touch that just ended is our look touch
        if (touch.identifier === lookTouchId) {
            lookTouchId = null; // <-- Stop tracking
            break; // Stop looping
        }
    }
}

/**
 * Activates the first-person controls.
 */
function activateControls() {
    // Disable editor controls
    App.controls.enabled = false;
    
    // Add touch listeners
    viewport.addEventListener('touchstart', onTouchStart, { passive: false });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd);
    viewport.addEventListener('touchcancel', onTouchEnd); // <-- Added cancel just in case
}

/**
 * Deactivates the first-person controls.
 */
function deactivateControls() {
    // Re-enable editor controls
    App.controls.enabled = true;
    
    // Remove touch listeners
    viewport.removeEventListener('touchstart', onTouchStart);
    viewport.removeEventListener('touchmove', onTouchMove);
    viewport.removeEventListener('touchend', onTouchEnd);
    viewport.removeEventListener('touchcancel', onTouchEnd);

    // Ensure we stop tracking if mode is exited
    lookTouchId = null; // <-- CHANGED
}

/**
 * Initializes the First Person View.
 */
export function initFirstPersonView(app) {
    if (!app || !app.player) {
        throw new Error('initFirstPersonView requires App.player to be initialized first.');
    }
    
    App = app;
    viewport = App.renderer.domElement;
    
    // 1. Create the 90-FOV camera
    const camera = new THREE.PerspectiveCamera(
        90, // FOV
        viewport.clientWidth / viewport.clientHeight,
        0.1,
        1000
    );
    
    // 2. Attach camera to the player object
    App.player.object.add(camera);
    App.player.camera = camera; // Give player a reference to its camera

    // 3. Create controls namespace
    App.firstPersonControls = {
        activate: activateControls,
        deactivate: deactivateControls,
    };
    
    console.log('First Person View Initialized.');
}
