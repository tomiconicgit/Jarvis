// src/core/engine/player.js
import * as THREE from 'three';

let App;
const PLAYER_HEIGHT = 1.8; // Approx 6ft in meters

// Movement vectors
const moveDirection = new THREE.Vector3();
const cameraForward = new THREE.Vector3();
const cameraRight = new THREE.Vector3();

/**
 * The player update loop, called every frame during test mode.
 * @param {number} deltaTime - Time since last frame.
 */
function updatePlayer(deltaTime) {
    if (!App.player.isActive) return;

    const input = App.player.input;
    const speed = App.player.movementSpeed * deltaTime;
    const playerObject = App.player.object;
    const camera = App.player.camera;

    // Get camera's horizontal direction
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();
    
    // Get camera's right vector
    cameraRight.crossVectors(camera.up, cameraForward).normalize();

    // Calculate movement direction based on input
    moveDirection.set(0, 0, 0);

    if (input.y > 0) {
        moveDirection.addScaledVector(cameraForward, -input.y);
    }
    if (input.y < 0) {
        moveDirection.addScaledVector(cameraForward, -input.y);
    }
    if (input.x < 0) {
        moveDirection.addScaledVector(cameraRight, input.x);
    }
    if (input.x > 0) {
        moveDirection.addScaledVector(cameraRight, input.x);
    }

    // Normalize diagonal movement
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
    }

    // Apply movement
    playerObject.position.addScaledVector(moveDirection, speed);

    // (Future) Apply gravity
    // ...

    // (Future) Check collisions
    // ...
}

/**
 * Initializes the Player module.
 */
export function initPlayer(app) {
    App = app;

    // 1. Create the player object
    const playerObject = new THREE.Group();
    playerObject.name = "Player";
    playerObject.position.set(0, 0, 0); // Start at 0,0 (ground level)
    
    // 2. Create the main App.player namespace
    App.player = {
        object: playerObject,
        camera: null,      // Will be set by firstpersonview.js
        input: { x: 0, y: 0 }, // Will be set by joystick.js
        
        // --- Player Stats ---
        movementSpeed: 4.0, // Meters per second
        jumpHeight: 1.0,
        health: 100,
        
        // --- State ---
        isActive: false,
        
        // --- Methods ---
        update: updatePlayer,
        activate: () => {
            App.player.isActive = true;
            App.player.object.position.set(0, PLAYER_HEIGHT, 0); // Reset position
            App.scene.add(App.player.object);
            console.log('Player activated');
        },
        deactivate: () => {
            App.player.isActive = false;
            App.scene.remove(App.player.object);
            console.log('Player deactivated');
        }
    };

    console.log('Player Engine Initialized.');
}
