// File: core/scene-manager.js
// Robust selection + always-visible TransformControls gizmo once an object is selected.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// If you have these files in your repo they will work; otherwise it's fine without them.
let updatePropsPanel = null, showPanel = null;
try {
  const mod1 = await import('../ui/props-panel.js');
  updatePropsPanel = mod1.updatePropsPanel ?? null;
} catch {}
try {
  const mod2 = await import('../ui/ui-panels.js');
  showPanel = mod2.showPanel ?? null;
} catch {}

export let scene, camera, renderer, orbitControls, transformControls;
export let currentSelection = null;
export const allModels = [];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let isDragging = false;
let containerEl = null;
let gridHelper = null;

function setPointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const cx = ( (event.clientX ?? (event.touches?.[0]?.clientX ?? 0)) - rect.left ) / rect.width;
  const cy = ( (event.clientY ?? (event.touches?.[0]?.clientY ?? 0)) - rect.top ) / rect.height;
  pointer.set(cx * 2 - 1, - (cy * 2 - 1));
}

function isInTransformControls(object) {
  let o = object;
  while (o) {
    if (o === transformControls) return true;
    o = o.parent;
  }
  return false;
}

function selectableTop(o) {
  let n = o;
  while (n && !n.userData.__selectable && n.parent) n = n.parent;
  return n && n.userData.__selectable ? n : null;
}

function intersectSelectable() {
  return raycaster
    .intersectObjects(allModels, true)
    .filter(h => !isInTransformControls(h.object));
}

function render() {
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  orbitControls?.update();
  render();
}

function onResize() {
  if (!renderer || !camera) return;
  const parent = renderer.domElement.parentElement;
  const w = parent.clientWidth, h = parent.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  render();
}

function onPointerDown(e) {
  if (isDragging) return;
  setPointerFromEvent(e);
}

function onPointerUp(e) {
  if (isDragging) return;
  setPointerFromEvent(e);
  raycaster.setFromCamera(pointer, camera);

  const hits = intersectSelectable();
  if (hits.length) {
    const top = selectableTop(hits[0].object) || hits[0].object;
    selectObject(top);
  } else {
    clearSelection();
  }
}

export function initScene(container) {
  containerEl = container;

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  // Scene + Env
  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.background = new THREE.Color(0x0b0b0b);

  // Camera (far extended so builds up to 100+ stay visible)
  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 5000);
  camera.position.set(6, 6, 10);

  // Grid
  gridHelper = new THREE.GridHelper(200, 200, 0x444444, 0x222222);
  gridHelper.material.depthWrite = false;
  scene.add(gridHelper);

  // Orbit
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.08;
  orbitControls.target.set(0, 1, 0);
  orbitControls.update();

  // TransformControls
  transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.visible = false;
  transformControls.setMode('translate');
  transformControls.setSpace('world');
  transformControls.size = 1.0;           // adjustable via event below
  transformControls.showX = true;
  transformControls.showY = true;
  transformControls.showZ = true;
  scene.add(transformControls);

  // Drag state
  transformControls.addEventListener('dragging-changed', (e) => {
    isDragging = e.value;
    orbitControls.enabled = !e.value;
  });

  // Re-render on gizmo changes
  transformControls.addEventListener('change', render);

  // Lighting to make gizmo readable
  const hemi = new THREE.HemisphereLight(0xffffff, 0x101018, 0.7);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(5, 10, 7);
  scene.add(hemi, dir);

  // Events
  renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
  renderer.domElement.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('resize', onResize);

  // External UI hooks
  window.addEventListener('iconic:set-gizmo-size', (e) => {
    transformControls.size = Number(e.detail) || 1;
    render();
  });

  animate();
  onResize();
}

export function addModel(object3D) {
  object3D.userData.__selectable = true;
  allModels.push(object3D);
  scene.add(object3D);
  render();
}

export function removeModel(object3D) {
  const i = allModels.indexOf(object3D);
  if (i !== -1) allModels.splice(i, 1);
  object3D.parent?.remove(object3D);
  if (currentSelection === object3D) clearSelection();
  render();
}

export function selectObject(object3D) {
  if (!object3D) return;
  currentSelection = object3D;
  try {
    transformControls.attach(object3D);
    transformControls.visible = true;
  } catch {}

  // Optional UI callbacks
  try { updatePropsPanel?.(object3D); } catch {}
  try { showPanel?.('props'); } catch {}

  // Notify outer UI
  window.dispatchEvent(new CustomEvent('iconic:selection-changed', { detail: object3D }));
  render();
}

export function clearSelection() {
  currentSelection = null;
  try { transformControls.detach(); } catch {}
  transformControls.visible = false;
  window.dispatchEvent(new CustomEvent('iconic:selection-changed', { detail: null }));
  render();
}

export function setTransformMode(mode) {
  transformControls.setMode(mode);
  render();
}

export function setTransformSpace(space) {
  transformControls.setSpace(space);
  render();
}

export function focusSelection() {
  const target = currentSelection;
  if (!target) return;
  const box = new THREE.Box3().setFromObject(target);
  const size = new THREE.Vector3(); const center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);
  orbitControls.target.copy(center);
  const dist = Math.max(4, size.length() * 1.8);
  const dir = new THREE.Vector3(1, 0.6, 1).normalize();
  camera.position.copy(center).add(dir.multiplyScalar(dist));
  orbitControls.update();
  render();
}

export function getScene(){ return scene; }
export function getCamera(){ return camera; }
export function getRenderer(){ return renderer; }