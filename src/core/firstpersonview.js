// src/core/firstpersonview.js
// This module handles the "first-person" camera controls,
// specifically the "look" mechanic (like in an FPS game).
// It listens for touch gestures on the screen to rotate the
// player's view.

import * as THREE from 'three';

// --- Module-level state variables ---
let App;
let viewport; // The <canvas> element

// 'lookTouchId' stores the unique 'identifier' of the *specific* finger
// that is currently being used for looking. This is crucial for
// multi-touch, so we don't get confused by the joystick finger.
let lookTouchId = null;
let lastTouchX = 0; // The last known X position of the look finger
let lastTouchY = 0; // The last known Y position of the look finger

// 'euler' is a reusable THREE.Euler object. We use this to apply
// rotations. Using 'YXZ' order means we apply Yaw (Y-axis) first,
// then Pitch (X-axis), then Roll (Z-axis). This is the standard
// order for first-person-shooter style controls, as it avoids
// a problem called "gimbal lock".
const euler = new THREE.Euler(0, 0, 0, 'YXZ');

// A constant for Math.PI / 2 (90 degrees), used for clamping
// the vertical (up/down) look angle.
const PI_2 = Math.PI / 2;

/**
 * Event listener for when a touch *starts*.
 */
function onTouchStart(event) {
    // If we are already tracking a finger for looking,
    // ignore any new fingers touching the screen.
    if (lookTouchId !== null) return;

    // 'event.changedTouches' is a list of *only* the fingers
    // that just touched the screen in this specific event.
    for (const touch of event.changedTouches) {
        
        // We divide the screen in half. The left side is for the
        // joystick, the right side is for looking.
        if (touch.clientX >= window.innerWidth / 2) {
            
            // This is our look finger! Store its unique ID.
            lookTouchId = touch.identifier;
            
            // Store the starting position of the touch.
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            
            // We only care about the first valid finger,
            // so we break the loop.
            break; 
        }
    }
}

/**
 * Event listener for when a touch *moves*.
 */
function onTouchMove(event) {
    // If we are not currently tracking a look finger, exit.
    if (lookTouchId === null) return;

    // We call preventDefault() *inside* the check. This is critical.
    // It prevents the browser from scrolling the page, but *only*
    // when we are actively dragging our look finger.
    event.preventDefault();

    // Loop through all fingers that moved in this event.
    for (const touch of event.changedTouches) {
        
        // Find the specific finger that we are tracking for 'look'.
        if (touch.identifier === lookTouchId) {
            
            // --- 1. Calculate the Delta (Change) ---
            // How far the finger moved since the last frame.
            // 0.005 is a "look sensitivity" multiplier.
            const deltaX = (touch.clientX - lastTouchX) * 0.005;
            const deltaY = (touch.clientY - lastTouchY) * 0.005;

            // --- 2. Update Last Position ---
            // Store the new position for the *next* frame's calculation.
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;

            // --- 3. Apply Rotations ---
            const playerObject = App.player.object;
            
            // Y-axis rotation (Yaw, or turning left/right) is
            // applied to the entire player *body* (the THREE.Group).
            euler.setFromQuaternion(playerObject.quaternion);
            euler.y -= deltaX; // Subtract deltaX to move "naturally"
            playerObject.quaternion.setFromEuler(euler);

            // X-axis rotation (Pitch, or looking up/down) is
            // applied *only* to the camera, which is *inside* the
            // player body. This is so the player's capsule doesn't
            // tilt up and down.
            euler.setFromQuaternion(App.player.camera.quaternion);
            euler.x -= deltaY;
            
            // --- 4. Clamp Vertical Look ---
            // We clamp the 'euler.x' value between -90 and +90 degrees.
            // This prevents the player from looking "over their back".
            euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
            
            // Apply the clamped rotation back to the camera.
            App.player.camera.quaternion.setFromEuler(euler);

            // We found and processed our finger, so stop looping.
            break; 
        }
    }
}

/**
 * Event listener for when a touch *ends* (finger is lifted).
 */
function onTouchEnd(event) {
    // If we're not tracking a look finger, exit.
    if (lookTouchId === null) return;

    // Loop through all fingers that were just lifted.
    for (const touch of event.changedTouches) {
        
        // Check if the finger that just ended is our look finger.
        if (touch.identifier === lookTouchId) {
            
            // Yes, it is. Stop tracking.
            // Set 'lookTouchId' back to null so that 'onTouchStart'
            // can find a new look finger.
            lookTouchId = null;
            break; // Stop looping
        }
    }
}

/**
 * Activates the first-person controls.
 * Called by 'testplay.js' when entering play mode.
 */
function activateControls() {
    // 1. Disable the editor's OrbitControls.
    // We can't have both systems fighting for camera control.
    App.controls.enabled = false;
    
    // 2. Add our touch event listeners to the canvas.
    // We set 'passive: false' because we *need* to call
    // 'event.preventDefault()' in onTouchMove to stop browser scrolling.
    viewport.addEventListener('touchstart', onTouchStart, { passive: false });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd);
    // 'touchcancel' is a fallback for when the browser
    // interrupts the touch (e.g., a system alert pops up).
    viewport.addEventListener('touchcancel', onTouchEnd);
}

/**
 * Deactivates the first-person controls.
 * Called by 'testplay.js' when stopping play mode.
 */
function deactivateControls() {
    // 1. Re-enable the editor's OrbitControls.
    App.controls.enabled = true;
    
    // 2. Remove all our touch listeners from the canvas.
    viewport.removeEventListener('touchstart', onTouchStart);
    viewport.removeEventListener('touchmove', onTouchMove);
    viewport.removeEventListener('touchend', onTouchEnd);
    viewport.removeEventListener('touchcancel', onTouchEnd);

    // 3. Just in case, reset the lookTouchId.
    lookTouchId = null;
}

/**
 * Initializes the First Person View module.
 * @param {object} app - The main App object.
 */
export function initFirstPersonView(app) {
    if (!app || !app.player) {
        // This module *requires* the player module to be initialized first
        // because it attaches the camera *to* the player object.
        throw new Error('initFirstPersonView requires App.player to be initialized first.');
    }
    
    App = app;
    // Get the <canvas> element from the renderer.
    viewport = App.renderer.domElement;
    
    // 1. Create the First-Person Camera
    // This is a *separate* camera from the main editor camera.
    const camera = new THREE.PerspectiveCamera(
        90, // FOV: A 90-degree FOV is common for FPS games, it feels more immersive.
        viewport.clientWidth / viewport.clientHeight, // Aspect ratio
        0.1,  // Near clipping plane
        1000  // Far clipping plane
    );
    
    // 2. Attach camera to the player object
    // This is the key step: The camera is now a *child* of the player group.
    // When the player *moves* (position), the camera moves with it.
    // When the player *turns* (Y rotation), the camera turns with it.
    // But the camera can *also* rotate up/down (X rotation) independently.
    App.player.object.add(camera);
    
    // 3. Give the player module a direct reference to this new camera.
    App.player.camera = camera;

    // 4. Create the public controls namespace
    // This exposes the 'activate' and 'deactivate' functions
    // to the rest of the app (specifically to testplay.js).
    App.firstPersonControls = {
        activate: activateControls,
        deactivate: deactivateControls,
    };
    
    console.log('First Person View Initialized.');
}
