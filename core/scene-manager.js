// File: core/scene-manager.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'; // RE-ADDED
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { updatePropsPanel } from '../ui/props-panel.js';
import { showPanel, hidePanel, showTempMessage } from '../ui/ui-panels.js';
import { BUILDERS } from '../objects/object-manifest.js';
import { ensureTexState } from '../ui/props-panel.js';
// --- GIZMO IMPORTS REMOVED ---
// import { showGizmo, hideGizmo } from '../ui/gizmo.js';

// We are putting transformControls back here
export let scene, camera, renderer, orbitControls, transformControls; // RE-ADDED transformControls
export let allModels = [];
export let currentSelection = null;

const raycaster = new THREE.Raycaster();
const downPos = new THREE.Vector2();
let lastTapTime = 0;
const DOUBLE_TAP_DELAY = 300;
const nameCounts = {};

export function initScene() {
  const canvasContainer = document.getElementById('canvas-container');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2a2a);
  scene.fog = new THREE.Fog(0x2a2a2a, 1500, 10000);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
  renderer.shadowMap.enabled = true;
  canvasContainer.appendChild(renderer.domElement);

  // Environment
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment()).texture;
  scene.environment = envTex;

  // Camera
  camera = new THREE.PerspectiveCamera(50,
    canvasContainer.clientWidth / canvasContainer.clientHeight,
    0.05, 10000);
  camera.position.set(15, 20, 25);

  // Lights
  scene.add(new THREE.AmbientLight(0x808080));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(10, 20, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(dirLight);

  // Ground + Grid
  scene.add(new THREE.GridHelper(100, 100, 0x888888, 0x444444));
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Controls
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.1;
  orbitControls.enablePan = true;
  orbitControls.maxDistance = 2000;

  // --- RE-ADD TRANSFORMCONTROLS ---
  transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.visible = false;
  transformControls.addEventListener('dragging-changed', (event) => {
    orbitControls.enabled = !event.value;
  });
  scene.add(transformControls.getHelper());
  // --- END TRANSFORMCONTROLS ---

  // Events
  window.addEventListener('resize', resizeRenderer);
  renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
  renderer.domElement.addEventListener('pointerup', onPointerUp, { passive: false });
}

export function animate() {
  requestAnimationFrame(animate);
  orbitControls.update();
  renderer.render(scene, camera);
}

function resizeRenderer() {
  const c = document.getElementById('canvas-container');
  if (!c) return;
  camera.aspect = c.clientWidth / c.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(c.clientWidth, c.clientHeight);
}

// ------- Picking helpers -------
function getPointerNDC(evt) {
  const rect = renderer.domElement.getBoundingClientRect();
  return {
    x: ((evt.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((evt.clientY - rect.top) / rect.height) * 2 + 1
  };
}
function onPointerDown(e) {
  downPos.set(e.clientX, e.clientY);
}
function onPointerUp(e) {
  const end = new THREE.Vector2(e.clientX, e.clientY);
  if (downPos.distanceTo(end) < 10) {
    const now = performance.now();
    if (now - lastTapTime < DOUBLE_TAP_DELAY) handleDoubleTap(e);
    else handleSingleTap(e);
    lastTapTime = now;
  }
}

function handleSingleTap(e) {
  const ndc = getPointerNDC(e);
  raycaster.setFromCamera(ndc, camera);

  // --- ADDED GIZMO HIT CHECK ---
  // If the transform gizmo is visible, check if we tapped it.
  // If so, do nothing and let the gizmo handle it.
  if (transformControls.visible) {
    const gizmoHits = raycaster.intersectObjects(transformControls.getHelper().children, true);
    if (gizmoHits.length > 0) {
      return; // Tapped on the gizmo, don't deselect.
    }
  }
  // --- END GIZMO HIT CHECK ---
  
  // **CRITICAL FIX**: Only raycast against `allModels`, not the whole scene.
  // This prevents you from selecting the ground or grid.
  const hits = raycaster.intersectObjects(allModels, true);

  if (hits.length) {
    let obj = hits[0].object;
    while (obj && obj.parent && !obj.userData?.isModel) obj = obj.parent;
    selectObject(obj || hits[0].object);
  } else {
    deselectAll();
  }
}

function handleDoubleTap(e) {
  const ndc = getPointerNDC(e);
  raycaster.setFromCamera(ndc, camera);

  // **CRITICAL FIX**: Only raycast against `allModels`.
  const hits = raycaster.intersectObjects(allModels, true);

  if (hits.length) {
    const root = ascendToModelRoot(hits[0].object);
    const box = new THREE.Box3().setFromObject(root);
    orbitControls.target.copy(box.getCenter(new THREE.Vector3()));
    showTempMessage && showTempMessage('Camera Focused');
  }
}

function ascendToModelRoot(o) {
  let obj = o;
  while (obj && obj.parent && !obj.userData?.isModel) obj = obj.parent;
  return obj || o;
}

export function selectObject(o) {
  if (!o || currentSelection === o) return;
  
  if (!o.userData?.isModel && o.type !== 'Mesh') {
    return; // Safety check
  }
  
  currentSelection = o;
  transformControls.attach(o); // RE-ADDED
  
  // --- GIZMO ---
  // showGizmo && showGizmo(o); // REMOVED
  // --- END GIZMO ---
  
  // --- BUG FIX ---
  transformControls.visible = true; // RE-ADDED
  // --- END FIX ---

  updatePropsPanel && updatePropsPanel(o);

  const props = document.getElementById('props-panel');
  if (props && showPanel) showPanel(props);
  
  // Hide all other panels
  [
    'add-panel',
    'scene-panel',
    'tools-panel',
    'parent-panel',
    'decimate-panel',
    'file-panel',
    'export-panel'
  ].forEach(id => { 
      const el = document.getElementById(id); 
      el && hidePanel && hidePanel(el); 
  });
}

export function deselectAll() {
  if (currentSelection) transformControls.detach(); // RE-ADDED
  
  // --- GIZMO ---
  // hideGizmo && hideGizmo(); // REMOVED
  // --- END GIZMO ---
  
  // --- BUG FIX ---
  transformControls.visible = false; // RE-ADDED
  // --- END FIX ---
  
  currentSelection = null;

  const props = document.getElementById('props-panel');
  props && hidePanel && hidePanel(props);
}

export function assignDefaultName(obj) {
  const base = obj.userData?.type || 'Object';
  nameCounts[base] = (nameCounts[base] || 0) + 1;
  obj.userData.label = `${base} #${nameCounts[base]}`;
}

export function findByUUID(uuid) { 
  return allModels.find(o => o.uuid === uuid); 
}
export function getBuilders() { return BUILDERS; }
export function getEnsureTexState() { return ensureTexState; }
