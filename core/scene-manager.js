// File: core/scene-manager.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { updatePropsPanel } from '../ui/props-panel.js';
import { showPanel, hidePanel, showTempMessage } from '../ui/ui-panels.js';
import { BUILDERS } from '../objects/object-manifest.js';
import { ensureTexState } from '../ui/props-panel.js'; // Texture state logic moved to props-panel

export let scene, camera, renderer, orbitControls, transformControls;
export let allModels = [];
export let currentSelection = null;

let raycaster, downPos;
let lastTapTime = 0;
const TAP_MOVE_TOL = 10;         // px
const DOUBLE_TAP_DELAY = 300;
const nameCounts = {};

function safeShow(id){ const el = document.getElementById(id); if (el) showPanel(el); }
function safeHide(id){ const el = document.getElementById(id); if (el) hidePanel(el); }

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
  // prevent browser gestures interfering with pointer events
  renderer.domElement.style.touchAction = 'none';

  // Env
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment()).texture;
  scene.environment = envTex;

  // Camera
  camera = new THREE.PerspectiveCamera(
    50,
    canvasContainer.clientWidth / canvasContainer.clientHeight,
    0.05,
    10000
  );
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

  transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.setMode('translate');
  transformControls.addEventListener('dragging-changed', (e) => {
    orbitControls.enabled = !e.value;
  });
  // Touch doesn’t reliably emit mouseUp; listen for objectChange instead
  transformControls.addEventListener('objectChange', () => {
    if (currentSelection) {
      try { updatePropsPanel(currentSelection); } catch (err) { console.error(err); }
    }
  });

  // Start hidden until something is selected
  transformControls.visible = false;
  scene.add(transformControls);

  // Raycast / pointer
  raycaster = new THREE.Raycaster();
  downPos = new THREE.Vector2();

  // Events
  window.addEventListener('resize', resizeRenderer);

  const el = renderer.domElement;
  el.addEventListener('pointerdown', onPointerDown, { passive: false });
  el.addEventListener('pointerup', onPointerUp);
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

function getPointerNDC(evt) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
  return new THREE.Vector2(x, y);
}

function onPointerDown(e) {
  // only primary pointer
  if (e.isPrimary === false) return;
  downPos.set(e.clientX, e.clientY);
}

function onPointerUp(e) {
  if (e.isPrimary === false) return;

  const up = new THREE.Vector2(e.clientX, e.clientY);
  if (downPos.distanceTo(up) > TAP_MOVE_TOL) return; // it was a drag, not a tap

  const now = Date.now();
  if (now - lastTapTime < DOUBLE_TAP_DELAY) {
    handleDoubleTap(e);
  } else {
    handleSingleTap(e);
  }
  lastTapTime = now;
}

function handleSingleTap(evt) {
  const ndc = getPointerNDC(evt);
  raycaster.setFromCamera(ndc, camera);

  // if we tapped the gizmo, let it handle interaction
  const gizmoHits = raycaster.intersectObjects(transformControls.children, true);
  if (gizmoHits.length > 0) return;

  const hits = raycaster.intersectObjects(allModels, true);
  if (hits.length) {
    let obj = hits[0].object;
    while (obj && obj.parent && !obj.userData?.isModel) obj = obj.parent;
    selectObject(obj || hits[0].object);
  } else {
    deselectAll();
  }
}

function handleDoubleTap(evt) {
  const ndc = getPointerNDC(evt);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(allModels, true);
  if (hits.length) {
    const box = new THREE.Box3().setFromObject(hits[0].object);
    orbitControls.target.copy(box.getCenter(new THREE.Vector3()));
    showTempMessage('Camera Focused');
  }
}

export function selectObject(o) {
  if (!o || !o.isObject3D) return;
  if (currentSelection === o) return;

  currentSelection = o;
  transformControls.attach(o);
  transformControls.visible = true;

  try { updatePropsPanel(o); } catch (err) {
    console.error('updatePropsPanel failed:', err);
    showTempMessage('Could not build properties UI for this object');
  }

  // Show props, hide others (null-safe)
  safeShow('props-panel');
  ['add-panel','scene-panel','parent-panel','file-panel','export-panel'].forEach(safeHide);
}

export function deselectAll() {
  if (currentSelection) transformControls.detach();
  transformControls.visible = false;
  currentSelection = null;
  safeHide('props-panel');
}

export function assignDefaultName(obj) {
  const base = obj.userData?.type || 'Object';
  nameCounts[base] = (nameCounts[base] || 0) + 1;
  obj.userData.label = `${base} #${nameCounts[base]}`;
}

export function findByUUID(uuid) { 
  return allModels.find(o => o.uuid === uuid); 
}

export function getBuilders() {
  return BUILDERS;
}

export function getEnsureTexState() {
  return ensureTexState;
}