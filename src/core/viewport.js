// src/core/viewport.js
// This module is responsible for initializing the fundamental
// Three.js components: the Renderer and the Scene.
// It finds the <canvas> element in the HTML and configures
// the WebGL renderer to draw to it.

import * as THREE from 'three';

/**
 * Initializes the main Three.js Scene and WebGLRenderer.
 * @returns {object} An object containing the initialized 'scene' and 'renderer'.
 * @throws {Error} If the '#viewport' canvas element cannot be found in the DOM.
 */
export function initViewport() {
    // 1. Get the <canvas> element from index.html.
    // This is the HTML element that Three.js will draw the 3D scene onto.
    const canvas = document.getElementById('viewport');
    if (!canvas) {
        // If the canvas is missing, the app cannot render. This is a fatal error.
        throw new Error('Viewport canvas element not found');
    }

    // 2. Create the Scene.
    // The Scene is the top-level "world" object.
    // All 3D objects, lights, and cameras are added to the scene.
    const scene = new THREE.Scene();
    
    // We set the background to 'null' here. The 'environment.js' module
    // will be responsible for setting the actual background (the sky) later.
    scene.background = null;

    // 3. Create the WebGL Renderer.
    // The Renderer is the "engine" that takes the scene and camera
    // and draws the resulting 2D image to the <canvas>.
    const renderer = new THREE.WebGLRenderer({
        canvas,       // Tell the renderer *which* canvas to draw to.
        antialias: true // Enable anti-aliasing (smooths jagged edges).
    });

    // 4. Configure Renderer Settings.
    
    // Set the pixel ratio. This is crucial for sharp rendering on
    // high-DPI displays (like modern phones and "Retina" screens).
    // We cap it at 2 to prevent performance issues on extremely high-DPI devices.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    
    // Set the renderer's initial size to match the canvas's
    // "on-screen" size (as defined by the CSS).
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    
    // --- UPDATED: Enable Shadow Mapping ---
    
    // This globally enables shadows in the renderer.
    // Individual lights ('castShadow=true') and meshes ('receiveShadow=true')
    // must also be configured, but this is the master switch.
    renderer.shadowMap.enabled = true;
    
    // 'PCFSoftShadowMap' is a shadow algorithm that produces
    // softer, more realistic-looking shadow edges (less "blocky").
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // --- END UPDATE ---

    // 5. Return the core components.
    // These will be attached to the main 'App' object in main.js.
    return { scene, renderer };
}
