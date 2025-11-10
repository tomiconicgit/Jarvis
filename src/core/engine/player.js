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
    cameraRight.crossVectors(cameraForward, camera.up).normalize();

    // Calculate movement direction based on input
    moveDirection.set(0, 0, 0);

    if (input.y !== 0) {
        moveDirection.addScaledVector(cameraForward, input.y);
    }
    if (input.x !== 0) {
        moveDirection.addScaledVector(cameraRight, input.x);
    }

    // Normalize diagonal movement
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
    }

    // Apply movement
    playerObject.position.addScaledVector(moveDirection, speed);
}

/**
 * Initializes the Player module.
 */
export function initPlayer(app) {
    App = app;

    // 1. Create the player object (as a Group)
    const playerObject = new THREE.Group();
    playerObject.name = "Player";
    playerObject.position.set(0, 0, 0); // Start at 0,0 (ground level)
    
    const capsuleGeo = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8); 
    const capsuleMat = new THREE.MeshStandardMaterial({ 
        color: 0x007aff, 
        transparent: true, 
        opacity: 0.5 
    });
    const playerMesh = new THREE.Mesh(capsuleGeo, capsuleMat);
    playerMesh.position.set(0, (1.2 / 2) + 0.3, 0); 
    playerMesh.name = "PlayerRepresentation";
    playerObject.add(playerMesh);
    
    playerObject.visible = false;
    App.scene.add(playerObject);

    // 2. Create the main App.player namespace
    App.player = {
        object: playerObject,
        camera: null,      
        input: { x: 0, y: 0 },
        
        movementSpeed: 4.0, 
        jumpHeight: 1.0,
        health: 100,
        isActive: false,
        
        update: updatePlayer,
        activate: () => {
            App.player.isActive = true;
            // --- UPDATED: Start at player height, not 0 ---
            App.player.object.position.set(0, PLAYER_HEIGHT, 0); 
            App.player.object.visible = true;
            console.log('Player activated');
        },
        deactivate: () => {
            App.player.isActive = false;
            App.player.object.visible = false; 
            console.log('Player deactivated');
        }
    };
    
    if (App.fileManager) {
        App.fileManager.registerFile({
            id: playerObject.uuid, 
            name: 'Player',
            icon: 'player',
            parentId: 'default'
        });
    }

    console.log('Player Engine Initialized.');
}
