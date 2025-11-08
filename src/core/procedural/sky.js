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
    sky.scale.setScalar(450000);
    sky.name = "Sky";

    // 2. Add it to the scene
    App.scene.add(sky);

    // 3. Set default sky parameters
    const uniforms = sky.material.uniforms;
    
    // --- NEW: Store settings in an object ---
    const skySettings = {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7,
        sunPosition: { x: 0, y: 0.0349, z: -0.999 } // Based on old calculation
    };

    uniforms['turbidity'].value = skySettings.turbidity;
    uniforms['rayleigh'].value = skySettings.rayleigh;
    uniforms['mieCoefficient'].value = skySettings.mieCoefficient;
    uniforms['mieDirectionalG'].value = skySettings.mieDirectionalG;

    // 4. Set default sun position
    const phi = THREE.MathUtils.degToRad(90 - 2);
    const theta = THREE.MathUtils.degToRad(180);
    const sun = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
    
    // Store calculated sun position back into settings
    skySettings.sunPosition.x = sun.x;
    skySettings.sunPosition.y = sun.y;
    skySettings.sunPosition.z = sun.z;
    
    uniforms['sunPosition'].value.copy(sun);

    // --- 5. CRITICAL: Store settings in userData ---
    // scene.toJSON() will automatically save userData.
    sky.userData.isProceduralSky = true;
    sky.userData.settings = skySettings;
    
    // 6. Register this mesh as a file in the workspace
    if (App.fileManager) {
        App.fileManager.registerFile({
            id: 'sky-default',
            name: 'Sky',
            icon: 'sky',
            parentId: 'default'
        });
    }

    console.log('Procedural Sky Initialized.');
}
