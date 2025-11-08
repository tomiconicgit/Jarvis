// src/core/procedural/sky.js
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

/**
 * Creates the default procedural sky and adds it to the scene.
 * @param {object} App - The global application object.
 */
export function initSky(App) {
    
    // 1. Create the Sky object
    const sky = new Sky();
    sky.scale.setScalar(450000); // A standard large scale for the sky dome
    sky.name = "Sky"; // This MUST match the fileManager name

    // 2. Add it to the scene
    App.scene.add(sky);

    // 3. Set default sky parameters
    const uniforms = sky.material.uniforms;
    
    uniforms['turbidity'].value = 10;
    uniforms['rayleigh'].value = 3;
    uniforms['mieCoefficient'].value = 0.005;
    uniforms['mieDirectionalG'].value = 0.7;

    // 4. Set default sun position
    const phi = THREE.MathUtils.degToRad(90 - 2); // 2 degrees above horizon
    const theta = THREE.MathUtils.degToRad(180); // Due north/south
    
    const sun = new THREE.Vector3();
    sun.setFromSphericalCoords(1, phi, theta);
    
    uniforms['sunPosition'].value.copy(sun);

    // 5. Register this mesh as a file in the workspace
    if (App.fileManager) {
        App.fileManager.registerFile({
            id: 'sky-default',           // A unique ID
            name: 'Sky',                 // The display name (and scene object name)
            icon: 'sky',                 // The new icon we will add
            parentId: 'default'          // The "Default" folder
        });
    }

    console.log('Procedural Sky Initialized.');
}
