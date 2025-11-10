// src/core/engine/player.js
// This module initializes and manages the "Player" object.
// This object represents the user in first-person "Test Play" mode.
// It includes the player's physical representation (a capsule),
// its state (position, health), and the logic for movement.

import * as THREE from 'three';

// Module-level variable to store a reference to the main App object.
let App;

// Define the player's physical height in meters.
const PLAYER_HEIGHT = 1.8; // Approx 6ft

// --- Movement State Vectors ---
// These are module-level THREE.Vector3 objects reused every frame
// to avoid creating new objects in the render loop (which is bad for performance).

// 'moveDirection' will store the final normalized direction of movement (X, Z).
const moveDirection = new THREE.Vector3();
// 'cameraForward' will store the camera's forward-facing direction (horizontal plane).
const cameraForward = new THREE.Vector3();
// 'cameraRight' will store the camera's right-facing direction (horizontal plane).
const cameraRight = new THREE.Vector3();

/**
 * The player update loop, called every frame *during test mode*.
 * This function is responsible for moving the player based on user input.
 * @param {number} deltaTime - The time (in seconds) since the last frame.
 * This ensures movement is smooth and framerate-independent.
 */
function updatePlayer(deltaTime) {
    // 1. Check if the player is active. If not, do nothing.
    if (!App.player.isActive) return;

    // 2. Get references to player components for easier reading.
    const input = App.player.input; // The input vector from the joystick
    const speed = App.player.movementSpeed * deltaTime; // Calculate distance to move this frame
    const playerObject = App.player.object; // The player's THREE.Group
    const camera = App.player.camera; // The first-person camera

    // 3. Get camera's horizontal forward direction
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0; // Ignore vertical (up/down) look direction
    cameraForward.normalize(); // Make it a unit vector (length of 1)
    
    // 4. Get camera's right vector
    // 'camera.up' is (0, 1, 0). The cross product gives a vector
    // perpendicular to both 'up' and 'forward', which is 'right'.
    cameraRight.crossVectors(cameraForward, camera.up).normalize();

    // 5. Calculate movement direction based on input
    // 'input.x' and 'input.y' come from the joystick module
    // and are values between -1 and 1.
    moveDirection.set(0, 0, 0); // Reset move direction each frame

    if (input.y !== 0) { // Forward/Backward
        // input.y is (forward: -1, backward: 1) from the joystick,
        // but we add it to the *cameraForward* vector.
        // (Note: The joystick module inverts this, so 'up' is positive Y)
        moveDirection.addScaledVector(cameraForward, input.y);
    }
    if (input.x !== 0) { // Left/Right
        moveDirection.addScaledVector(cameraRight, input.x);
    }

    // 6. Normalize diagonal movement
    // If the user is moving diagonally (e.g., forward + right), the
    // moveDirection vector will have a length > 1. Normalizing it
    // prevents the player from moving faster on diagonals.
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
    }

    // 7. Apply movement
    // Add the scaled (direction * speed) vector to the player's position.
    playerObject.position.addScaledVector(moveDirection, speed);
    
    // 8. (Future Step) Apply gravity and check for collisions
    // E.g., playerObject.position.y -= GRAVITY * deltaTime;
    // E.g., checkCollisions();
}

/**
 * Initializes the Player module and creates the App.player namespace.
 * @param {object} app - The main App object.
 */
export function initPlayer(app) {
    App = app;

    // --- 1. Create the Player's 3D Object ---
    // The player "object" is a THREE.Group. This acts as a container
    // that holds the visual mesh (the capsule) and the first-person camera.
    // Moving this one Group moves everything inside it.
    const playerObject = new THREE.Group();
    playerObject.name = "Player";
    playerObject.position.set(0, 0, 0); // Start at world origin (will be updated on activate)
    
    // Create a visual representation (a capsule)
    // This is helpful for debugging and for seeing the player in 3rd person.
    const capsuleGeo = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8); // (radius, length, ...)
    const capsuleMat = new THREE.MeshStandardMaterial({ 
        color: 0x007aff, // Blue
        transparent: true, 
        opacity: 0.5 
    });
    const playerMesh = new THREE.Mesh(capsuleGeo, capsuleMat);
    // The capsule's geometry is 1.2m tall. We lift it by half its
    // height (0.6) + its radius (0.3) to make it stand "on" the group's
    // 0,0,0 origin point. (Total height = 1.2 + 0.3 + 0.3 = 1.8m)
    playerMesh.position.set(0, (1.2 / 2) + 0.3, 0); 
    playerMesh.name = "PlayerRepresentation";
    playerObject.add(playerMesh); // Add the mesh to the group
    
    // The player is hidden by default (only visible in test mode)
    playerObject.visible = false;
    App.scene.add(playerObject); // Add the group to the scene

    // --- 2. Create the main App.player namespace ---
    // This object will hold all player-related state and functions.
    App.player = {
        object: playerObject, // The THREE.Group
        camera: null,         // This will be set by initFirstPersonView.js
        
        // Input state, updated by the joystick module
        input: { x: 0, y: 0 }, 
        
        // Player stats
        movementSpeed: 4.0, // Meters per second
        jumpHeight: 1.0,    // (Not yet used)
        health: 100,
        
        // State
        isActive: false, // Is the player currently in test mode?
        
        // Public Functions
        
        // The main update loop, called by main.js
        update: updatePlayer,
        
        // Called by testplay.js to enter first-person mode
        activate: () => {
            App.player.isActive = true;
            // Set the player's starting position to be "standing"
            // at the origin, with their "feet" at Y=0.
            App.player.object.position.set(0, 0, 0); 
            // Note: The camera itself is positioned *inside* the
            // player object at PLAYER_HEIGHT, so the view is correct.
            
            App.player.object.visible = true; // Show the capsule mesh
            console.log('Player activated');
        },
        
        // Called by testplay.js to exit first-person mode
        deactivate: () => {
            App.player.isActive = false;
            App.player.object.visible = false; // Hide the capsule mesh
            console.log('Player deactivated');
        }
    };
    
    // --- 3. Register with File Manager ---
    // This allows the "Player" to be seen in the workspace list.
    if (App.fileManager) {
        App.fileManager.registerFile({
            id: playerObject.uuid, // Use the Group's UUID as its ID
            name: 'Player',
            icon: 'player', // Use the 'player' icon
            parentId: 'default'
        });
    }

    console.log('Player Engine Initialized.');
}
