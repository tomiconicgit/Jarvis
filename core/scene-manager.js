// File: core/scene-manager.js
// Purpose: Proper object selection + visible TransformControls gizmo on tap/click.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { updatePropsPanel } from '../ui/props-panel.js';
import { showPanel } from '../ui/ui-panels.js';

export let scene, camera, renderer, orbitControls, transformControls;
export let currentSelection = null;
export const allModels = [];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let isDragging = false;
let containerEl = null;

function isInTransformControls(object) {
  // If the intersected object is part of the gizmo, ignore it for selection
  let o = object;
  while (o) {
    if (o === transformControls) return true;
    o = o.parent;
  }
  return false;
}

function setPointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ( (event.clientX ?? (event.touches?.[0]?.clientX ?? 0)) - rect.left ) / rect.width;
  const y = ( (event.clientY ?? (event.touches?.[0]?.clientY ?? 0)) - rect.top ) / rect.height;
  pointer.set(x * 2 - 1, - (y * 2 - 1));
}

function selectableTop(o) {
  // Climb to the first object explicitly marked selectable
  let n = o;
  while (n && !n.userData.__selectable && n.parent) n = n.parent;
  return n && n.userData.__selectable ? n : null;
}

function intersectSelectable() {
  const targets = [];
  for (const m of allModels) {
    // include whole hierarchy
    targets.push(m);
  }
  return raycaster.intersectObjects(targets, true).filter(h => !isInTransformControls(h.object));
}

function render() {
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function onResize() {
  if (!renderer || !camera) return;
  const { clientWidth, clientHeight } = renderer.domElement.parentElement;
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight, false);
  render();
}

function onPointerDown(e) {
  // Let TransformControls take over if it’s grabbing
  if (isDragging) return;
  setPointerFromEvent(e);
}

function onPointerUp(e) {
  // If we were dragging the gizmo, do not re-select
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
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Scene + Env
  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.background = new THREE.Color(0x0b0b0b);

  // Camera
  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 5000);
  camera.position.set(6, 6, 10);

  // Grid/Helpers (optional)
  const grid = new THREE.GridHelper(200, 200, 0x444444, 0x222222);
  grid.material.depthWrite = false;
  scene.add(grid);

  // Orbit
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.08;
  orbitControls.target.set(0, 1, 0);

  // TransformControls (the gizmo)
  transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.visible = false; // hidden until something is selected
  transformControls.setMode('translate'); // default
  transformControls.setSpace('world');    // world space by default
  transformControls.size = 1;             // gizmo screen size multiplier
  scene.add(transformControls);

  // Handle drag state to disable orbit while dragging gizmo
  transformControls.addEventListener('dragging-changed', (e) => {
    isDragging = e.value;
    orbitControls.enabled = !e.value;
  });

  // Keep transformControls visible when attaching/detaching
  transformControls.addEventListener('change', render);

  // Basic lighting so gizmo is readable on dark backgrounds
  const hemi = new THREE.HemisphereLight(0xffffff, 0x111122, 0.7);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7);
  scene.add(hemi, dir);

  // Events
  renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
  renderer.domElement.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('resize', onResize);

  animate();
  onResize();
}

export function addModel(object3D) {
  // Mark as selectable and track it
  object3D.userData.__selectable = true;
  allModels.push(object3D);
  scene.add(object3D);
  render();
}

export function removeModel(object3D) {
  const i = allModels.indexOf(object3D);
  if (i !== -1) allModels.splice(i, 1);
  if (object3D.parent) object3D.parent.remove(object3D);
  if (currentSelection === object3D) clearSelection();
  render();
}

export function selectObject(object3D) {
  if (!object3D) return;
  currentSelection = object3D;

  // Attach gizmo and show it
  transformControls.attach(object3D);
  transformControls.visible = true;

  // Update UI (if your panels exist)
  try {
    updatePropsPanel?.(object3D);
    showPanel?.('props');
  } catch (_) { /* safe no-op */ }

  render();
}

export function clearSelection() {
  currentSelection = null;
  try { transformControls.detach(); } catch (_) {}
  transformControls.visible = false;
  render();
}

export function setTransformMode(mode /* 'translate' | 'rotate' | 'scale' */) {
  transformControls.setMode(mode);
  render();
}

export function setTransformSpace(space /* 'world' | 'local' */) {
  transformControls.setSpace(space);
  render();
}

export function focusSelection() {
  const target = currentSelection;
  if (!target) return;
  const box = new THREE.Box3().setFromObject(target);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  orbitControls.target.copy(center);
  camera.position.sub(orbitControls.target).setLength(Math.max(4, size.length() * 1.2)).add(center);
  orbitControls.update();
  render();
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }