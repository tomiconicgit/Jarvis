// src/core/camera.js
// This module is responsible for setting up the primary 3D camera
// and the user controls (OrbitControls) for the editor view.

// Import the main Three.js library and the specific OrbitControls.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Initializes and configures the editor's PerspectiveCamera and OrbitControls.
 * @returns {object} An object containing the configured 'camera' and 'controls'.
 * @throws {Error} If the '#viewport' canvas element cannot be found.
 */
export function initCamera() {
    // Get the <canvas> element from the DOM. This is what the camera's
    // aspect ratio will be based on and what the controls will listen to.
    const canvas = document.getElementById('viewport');
    if (!canvas) {
        // If the canvas is missing, we can't proceed.
        throw new Error('Viewport canvas element not found');
    }

    // --- 1. Create the Camera ---
    
    // We use a PerspectiveCamera, which mimics how the human eye sees.
    const camera = new THREE.PerspectiveCamera(
        // 'fov' (Field of View): 60 degrees. A good, standard FOV that
        // isn't too wide (fisheye) or too narrow (zoomed in).
        60, 
        // 'aspect': The aspect ratio (width / height) of the canvas.
        // This is crucial to prevent the scene from looking stretched.
        canvas.clientWidth / canvas.clientHeight, 
        // 'near': The near clipping plane. Anything closer than 0.1 units
        // to the camera will not be rendered.
        0.1, 
        // 'far': The far clipping plane. Anything farther than 1000 units
        // from the camera will not be rendered.
        1000 
    );

    // Set the camera's initial position in the 3D world.
    // (10 units on X, 8 on Y, 10 on Z) - a nice 3/4 elevated view.
    camera.position.set(10, 8, 10);
    
    // Tell the camera to look at the world's origin (0, 0, 0).
    // This is where the 'controls.target' will also be set.
    camera.lookAt(0, 0, 0);

    // --- 2. Create the Controls ---
    
    // Initialize OrbitControls, which allows the user to "orbit" the
    // camera around a central point (the 'target').
    // It needs the camera to move and the <canvas> (domElement)
    // to listen for mouse/touch events.
    const controls = new OrbitControls(camera, canvas);

    // --- 3. Configure Control Settings ---
    
    // Set the point the camera will orbit around.
    controls.target.set(0, 0, 0);
    
    // 'enableDamping': This is very important. It adds a "weight" or
    // inertia to the camera's movement, making it feel smoother.
    // If true, you MUST call 'controls.update()' in your render loop.
    controls.enableDamping = true;
    
    // 'dampingFactor': How much "friction" is applied.
    // Lower numbers mean it slides for longer. 0.08 is a good default.
    controls.dampingFactor = 0.08;

    // Adjust the sensitivity of different user inputs.
    controls.rotateSpeed = 0.9; // How fast to orbit.
    controls.zoomSpeed = 1.0;   // How fast to zoom (mouse wheel).
    controls.panSpeed = 0.8;    // How fast to pan (right-click/two-finger drag).

    // Set constraints on the camera's movement.
    controls.minDistance = 2;   // How close the camera can get to the target.
    controls.maxDistance = 200; // How far the camera can zoom out.
    
    // 'maxPolarAngle': Prevents the camera from going "under" the scene.
    // Math.PI is 180 degrees (straight down). This stops it just
    // shy of that, so you can't flip the camera upside down.
    controls.maxPolarAngle = Math.PI - 0.1;

    // Explicitly enable all control types.
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;

    // --- 4. Configure Touch Controls (for mobile) ---
    // This try...catch block is a safety guard. The THREE.TOUCH constants
    // might change in future versions, so we wrap it to prevent a crash.
    try {
        // Check if the THREE.TOUCH constant exists.
        if (THREE.TOUCH) {
            // Re-map the default touch gestures for a better mobile experience.
            controls.touches = {
                // One finger: Orbit/Rotate the camera.
                ONE: THREE.TOUCH.ROTATE,
                // Two fingers: Zoom (pinch) and Pan (drag) at the same time.
                // This feels very natural on mobile.
                TWO: THREE.TOUCH.DOLLY_PAN 
            };
        }
    } catch (e) {
        console.warn('Touch control configuration skipped (THREE.TOUCH not found):', e);
    }

    // Call 'update()' once at the start to apply the initial
    // camera 'lookAt' and control 'target' settings.
    controls.update();

    // Return the two created objects so they can be added to the App object.
    return { camera, controls };
}
