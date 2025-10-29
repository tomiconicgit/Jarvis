// Import Three.js and OrbitControls from the CDN (via the import map)
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Import your local TowerBase asset
import TowerBase from './towerbase.js';

// --- Global Variables ---
let scene, camera, renderer, controls;
let towerWithDoor, towerWithoutDoor;

/**
 * Initializes the entire 3D scene.
 */
function init() {
  const container = document.getElementById('canvas-container');
  const loadingText = document.getElementById('loading');

  // --- Scene ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2a2a);
  scene.fog = new THREE.Fog(0x2a2a2a, 50, 200);

  // --- Renderer ---
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true; // Enable shadows
  container.appendChild(renderer.domElement);

  // --- Camera ---
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(15, 20, 25);

  // --- Lights ---
  scene.add(new THREE.AmbientLight(0x808080));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(10, 20, 5);
  dirLight.castShadow = true; // Enable shadows for this light
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(dirLight);

  // --- Ground ---
  scene.add(new THREE.GridHelper(100, 100, 0x888888, 0x444444));
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true; // Ground should receive shadows
  scene.add(ground);

  // --- Controls ---
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;

  // 
  // --- === ADD YOUR ASSETS === ---
  //

  // 1. Create a tower WITH a door
  towerWithDoor = new TowerBase({
    width: 12,
    depth: 12,
    height: 6,
    wallThickness: 1,
    cornerRadius: 1.2,
    edgeRoundness: 0.3,
    doorWidth: 4 // Set door width
  });
  // Position it (origin is at the center, so move it up by height/2)
  towerWithDoor.position.y = 3; // 6 / 2
  towerWithDoor.position.x = 8;
  scene.add(towerWithDoor);

  // 2. Create a tower WITHOUT a door
  towerWithoutDoor = new TowerBase({
    width: 8,
    depth: 10,
    height: 4,
    wallThickness: 1.5,
    cornerRadius: 0.5,
    edgeRoundness: 0.1,
    doorWidth: 0, // Set door width to 0
    material: new THREE.MeshStandardMaterial({ color: 0x0099ff }) // Give it a different material
  });
  towerWithoutDoor.position.y = 2; // 4 / 2
  towerWithoutDoor.position.x = -8;
  scene.add(towerWithoutDoor);

  // --- Event Listeners ---
  window.addEventListener('resize', onWindowResize);

  // Hide loading text and start render loop
  loadingText.style.display = 'none';
  animate();
}

/**
 * Handles window resize events.
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * The main render loop.
 */
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls
  controls.update();

  // Render the scene
  renderer.render(scene, camera);
}

// --- Start the application ---
window.addEventListener('DOMContentLoaded', init);

