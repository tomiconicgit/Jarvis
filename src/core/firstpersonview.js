// src/core/firstpersonview.js
import * as THREE from 'three';

let App;
let viewport;

// Touch look state
let isLooking = false;
let lastTouchX = 0;
let lastTouchY = 0;
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const PI_2 = Math.PI / 2;

function onTouchStart(event) {
    // Only listen to touches on the right side of the screen
    if (event.touches[0].clientX < window.innerWidth / 2) {
        return;
    }
    
    isLooking = true;
    lastTouchX = event.touches[0].clientX;
    lastTouchY = event.touches[0].clientY;
}

function onTouchMove(event) {
    if (!isLooking) return;

    // Prevent default scroll/zoom
    event.preventDefault();

    const touch = event.touches[0];
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
}

function onTouchEnd() {
    isLooking = false;
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
    viewport.addEventListener('touchcancel', onTouchEnd);
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
