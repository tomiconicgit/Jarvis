// --- Imports ---
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import TowerBase from './towerbase.js';
import DoubleDoor from './doubledoor.js';
import WindowAsset from './window.js';   // avoid global Window clash
import Floor from './floor.js';
import Pipe from './pipe.js';

// --- Globals ---
let scene, camera, renderer, orbitControls, transformControls;
let raycaster, touchStartPos, currentSelection;
let allModels = [];

// UI refs
let loadingScreen, canvasContainer, addBtn, addPanel, closeAddPanel;
let propsPanel, closePropsPanel, propsContent;
let addTowerDoorBtn, addTowerSolidBtn, addDoubleDoorBtn, addWindowBtn, addFloorBtn, addPipeBtn;
let toolsBtn, gizmoText;
let sceneBtn, scenePanel, closeScenePanel, sceneList;

// Parenting UI
let parentBtn, parentPanel, closeParentPanel, parentList, parentApplyBtn, parentCancelBtn;

// Touch
let lastTapTime = 0;
const DOUBLE_TAP_DELAY = 300;

// Name counters
const nameCounts = {};
function assignDefaultName(obj) {
  const base = obj.userData?.type || 'Object';
  nameCounts[base] = (nameCounts[base] || 0) + 1;
  obj.userData.label = `${base} #${nameCounts[base]}`;
}

// -----------------------------
// Init
// -----------------------------
function init() {
  // UI handles
  loadingScreen   = document.getElementById('loading-screen');
  canvasContainer = document.getElementById('canvas-container');

  addBtn          = document.getElementById('add-btn');
  toolsBtn        = document.getElementById('tools-btn');
  gizmoText       = document.getElementById('gizmo-text');
  sceneBtn        = document.getElementById('scene-btn');
  parentBtn       = document.getElementById('parent-btn');

  addPanel        = document.getElementById('add-panel');
  closeAddPanel   = document.getElementById('close-add-panel');

  propsPanel      = document.getElementById('props-panel');
  closePropsPanel = document.getElementById('close-props-panel');
  propsContent    = document.getElementById('props-content');

  addTowerDoorBtn = document.getElementById('add-tower-door-btn');
  addTowerSolidBtn= document.getElementById('add-tower-solid-btn');
  addDoubleDoorBtn= document.getElementById('add-double-door-btn');
  addWindowBtn    = document.getElementById('add-window-btn');
  addFloorBtn     = document.getElementById('add-floor-btn');
  addPipeBtn      = document.getElementById('add-pipe-btn');

  scenePanel      = document.getElementById('scene-panel');
  closeScenePanel = document.getElementById('close-scene-panel');
  sceneList       = document.getElementById('scene-list');

  parentPanel      = document.getElementById('parent-panel');
  closeParentPanel = document.getElementById('close-parent-panel');
  parentList       = document.getElementById('parent-list');
  parentApplyBtn   = document.getElementById('parent-apply');
  parentCancelBtn  = document.getElementById('parent-cancel');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2a2a);
  scene.fog = new THREE.Fog(0x2a2a2a, 50, 200);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
  renderer.shadowMap.enabled = true;
  canvasContainer.appendChild(renderer.domElement);

  // Env
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; // correct ctor (no args)
  scene.environment = envTex;

  // Camera
  camera = new THREE.PerspectiveCamera(
    50,
    canvasContainer.clientWidth / canvasContainer.clientHeight,
    0.1,
    1000
  );
  camera.position.set(15, 20, 25);

  // Lights
  scene.add(new THREE.AmbientLight(0x808080));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(10, 20, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(dirLight);

  // Ground
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

  transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.setMode('translate');
  transformControls.addEventListener('dragging-changed', (e) => {
    orbitControls.enabled = !e.value;
  });
  transformControls.addEventListener('mouseUp', () => {
    if (currentSelection) updatePropsPanel(currentSelection);
  });
  scene.add(transformControls);
  if (typeof transformControls.getHelper === 'function') {
    scene.add(transformControls.getHelper());
  }

  // Raycast / touch
  raycaster = new THREE.Raycaster();
  touchStartPos = new THREE.Vector2();

  // Events
  window.addEventListener('resize', resizeRenderer);
  canvasContainer.addEventListener('touchstart', onTouchStart, { passive: false });
  canvasContainer.addEventListener('touchend', onTouchEnd);

  // UI listeners
  initUI();

  // Hide loading
  loadingScreen.style.opacity = '0';
  setTimeout(() => (loadingScreen.style.display = 'none'), 500);

  // Initial gizmo label
  updateGizmoButtonLabel();

  // Loop
  animate();
}

// -----------------------------
// Loop
// -----------------------------
function animate() {
  requestAnimationFrame(animate);
  orbitControls.update();
  renderer.render(scene, camera);
}

// -----------------------------
// Events
// -----------------------------
function resizeRenderer() {
  const c = canvasContainer;
  camera.aspect = c.clientWidth / c.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(c.clientWidth, c.clientHeight);
}

function onTouchStart(e) {
  e.preventDefault();
  if (e.touches.length === 1) {
    const t = e.touches[0];
    touchStartPos.set(t.clientX, t.clientY);
  }
}

function onTouchEnd(e) {
  if (e.changedTouches.length === 1) {
    const t = e.changedTouches[0];
    const endPos = new THREE.Vector2(t.clientX, t.clientY);
    if (touchStartPos.distanceTo(endPos) < 10) {
      const now = Date.now();
      if (now - lastTapTime < DOUBLE_TAP_DELAY) handleDoubleTap(t);
      else handleSingleTap(t);
      lastTapTime = now;
    }
  }
}

function getTouchNDC(t) {
  return {
    x: (t.clientX / window.innerWidth) * 2 - 1,
    y: -(t.clientY / window.innerHeight) * 2 + 1
  };
}

// -----------------------------
// Selection
// -----------------------------
function handleSingleTap(t) {
  const ndc = getTouchNDC(t);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(allModels, true);
  if (hits.length) {
    let obj = hits[0].object;
    while (obj && obj.parent && !obj.userData?.isModel) obj = obj.parent;
    selectObject(obj || hits[0].object);
  } else {
    deselectAll();
  }
}

function handleDoubleTap(t) {
  const ndc = getTouchNDC(t);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(allModels, true);
  if (hits.length) {
    const box = new THREE.Box3().setFromObject(hits[0].object);
    orbitControls.target.copy(box.getCenter(new THREE.Vector3()));
    showTempMessage('Camera Focused');
  }
}

function selectObject(o) {
  if (!o) return;
  if (currentSelection === o) return;
  currentSelection = o;
  transformControls.attach(o);
  updatePropsPanel(o);
  showPanel(propsPanel);
  hidePanel(addPanel);
  hidePanel(scenePanel);
  hidePanel(parentPanel);
}

function deselectAll() {
  if (currentSelection) transformControls.detach();
  currentSelection = null;
  hidePanel(propsPanel);
}

// -----------------------------
// UI
// -----------------------------
function initUI() {
  // Toggle Add panel
  addBtn.addEventListener('click', () => {
    if (addPanel.style.visibility === 'visible') hidePanel(addPanel);
    else { showPanel(addPanel); hidePanel(scenePanel); hidePanel(propsPanel); hidePanel(parentPanel); }
  });
  closeAddPanel.addEventListener('click', () => hidePanel(addPanel));
  closePropsPanel.addEventListener('click', () => deselectAll());

  // Cycle transform mode + label
  toolsBtn.addEventListener('click', () => {
    const m = transformControls.getMode();
    const next = m === 'translate' ? 'rotate' : m === 'rotate' ? 'scale' : 'translate';
    transformControls.setMode(next);
    updateGizmoButtonLabel();
    if (!currentSelection) showTempMessage(`Mode: ${next[0].toUpperCase()}${next.slice(1)}`);
  });

  // Scene list toggle
  sceneBtn.addEventListener('click', () => {
    if (scenePanel.style.visibility === 'visible') hidePanel(scenePanel);
    else { refreshSceneList(); showPanel(scenePanel); hidePanel(addPanel); hidePanel(propsPanel); hidePanel(parentPanel); }
  });
  closeScenePanel.addEventListener('click', () => hidePanel(scenePanel));

  // Parenting panel
  parentBtn.addEventListener('click', () => {
    refreshParentList();
    showPanel(parentPanel);
    hidePanel(addPanel); hidePanel(propsPanel); hidePanel(scenePanel);
  });
  closeParentPanel.addEventListener('click', () => hidePanel(parentPanel));
  parentCancelBtn.addEventListener('click', () => hidePanel(parentPanel));
  parentApplyBtn.addEventListener('click', applyParenting);

  // Add Tower (door)
  addTowerDoorBtn.addEventListener('click', () => {
    const params = { width: 12, depth: 12, height: 6, wallThickness: 1, cornerRadius: 1.2, edgeRoundness: 0.3, doorWidth: 4 };
    const tower = new TowerBase(params);
    tower.position.y = params.height / 2;
    assignDefaultName(tower);
    scene.add(tower); allModels.push(tower);
    refreshSceneList(); selectObject(tower); hidePanel(addPanel);
  });

  // Add Tower (solid)
  addTowerSolidBtn.addEventListener('click', () => {
    const params = { width: 10, depth: 10, height: 8, wallThickness: 1, cornerRadius: 1.0, edgeRoundness: 0.2, doorWidth: 0 };
    const tower = new TowerBase(params);
    tower.position.y = params.height / 2;
    assignDefaultName(tower);
    scene.add(tower); allModels.push(tower);
    refreshSceneList(); selectObject(tower); hidePanel(addPanel);
  });

  // Add Double Door
  addDoubleDoorBtn.addEventListener('click', () => {
    const params = { totalWidth: 8, height: 10, depth: 0.5, frameThickness: 0.5, cornerRadius: 0.2, cornerSmoothness: 16, edgeRoundness: 0.1, edgeSmoothness: 4, glassR:1, glassG:1, glassB:1, glassOpacity:0.5, glassRoughness:0.2 };
    const doors = new DoubleDoor(params);
    doors.position.y = params.height / 2;
    assignDefaultName(doors);
    scene.add(doors); allModels.push(doors);
    refreshSceneList(); selectObject(doors); hidePanel(addPanel);
  });

  // Add Window
  addWindowBtn.addEventListener('click', () => {
    const params = { totalWidth: 6, height: 8, depth: 0.3, frameThickness: 0.4, cornerRadius: 0.1, cornerSmoothness: 16, edgeRoundness: 0.05, edgeSmoothness: 4, glassR:0.8, glassG:0.8, glassB:1, glassOpacity:0.3, glassRoughness:0.1, curveRadius: 0, hasBolts:false, hasBars:false };
    const win = new WindowAsset(params);
    win.position.y = params.height / 2;
    assignDefaultName(win);
    scene.add(win); allModels.push(win);
    refreshSceneList(); selectObject(win); hidePanel(addPanel);
  });

  // Add Floor
  addFloorBtn.addEventListener('click', () => {
    const params = { width: 20, depth: 20, thickness: 0.5, colorR: 0.5, colorG: 0.5, colorB: 0.5 };
    const floor = new Floor(params);
    floor.position.y = -params.thickness / 2;
    assignDefaultName(floor);
    scene.add(floor); allModels.push(floor);
    refreshSceneList(); selectObject(floor); hidePanel(addPanel);
  });

  // Add Pipe
  addPipeBtn.addEventListener('click', () => {
    const p = new Pipe();
    p.position.y = 1;
    assignDefaultName(p);
    scene.add(p); allModels.push(p);
    refreshSceneList(); selectObject(p); hidePanel(addPanel);
  });
}

function updateGizmoButtonLabel() {
  if (!gizmoText) return;
  const mode = transformControls.getMode();
  const nice = mode[0].toUpperCase() + mode.slice(1);
  gizmoText.textContent = nice;
}

// -----------------------------
// Duplicate / Delete helpers
// -----------------------------
function duplicateModel(src) {
  let copy;
  const type = src.userData?.type || 'Object';
  const params = { ...(src.userData?.params || {}) };

  if (type === 'TowerBase')       copy = new TowerBase(params);
  else if (type === 'DoubleDoor') copy = new DoubleDoor(params);
  else if (type === 'Window')     copy = new WindowAsset(params);
  else if (type === 'Floor')      copy = new Floor(params);
  else if (type === 'Pipe')       copy = new Pipe(params);
  else {
    copy = src.clone(true);
    copy.userData = { ...src.userData };
  }

  copy.position.copy(src.position).add(new THREE.Vector3(1, 0, 1));
  copy.rotation.copy(src.rotation);
  copy.scale.copy(src.scale);
  copy.userData.isModel = true;
  copy.userData.type = type || copy.userData.type || 'Object';
  if (!copy.userData.params) copy.userData.params = params;

  assignDefaultName(copy);
  scene.add(copy);
  allModels.push(copy);
  refreshSceneList();
  selectObject(copy);
}

function deleteModel(obj) {
  const idx = allModels.indexOf(obj);
  if (idx !== -1) allModels.splice(idx, 1);

  if (currentSelection === obj) deselectAll();

  if (typeof obj.dispose === 'function') obj.dispose();
  obj.traverse((n) => {
    if (n.isMesh) {
      if (n.geometry?.dispose) n.geometry.dispose();
      const m = n.material;
      if (Array.isArray(m)) m.forEach((mm) => mm?.dispose && mm.dispose());
      else if (m?.dispose) m.dispose();
    }
  });

  scene.remove(obj);
  refreshSceneList();
}

// -----------------------------
// Scene List UI
// -----------------------------
function refreshSceneList() {
  sceneList.innerHTML = '';
  if (!allModels.length) {
    sceneList.innerHTML = '<p class="text-gray-400">No objects in scene.</p>';
    return;
  }

  allModels.forEach((obj, idx) => {
    const name = obj.userData?.label || obj.userData?.type || `Object ${idx + 1}`;

    const row = document.createElement('div');
    row.className = 'flex items-center justify-between bg-gray-700 hover:bg-gray-600 rounded-md px-3 py-2';

    const nameBtn = document.createElement('button');
    nameBtn.className = 'text-left flex-1 pr-3 active:scale-[0.99] transition-transform';
    nameBtn.textContent = name;
    nameBtn.addEventListener('click', () => { selectObject(obj); hidePanel(scenePanel); });

    const actions = document.createElement('div');
    actions.className = 'flex items-center gap-2';

    const dupBtn = document.createElement('button');
    dupBtn.className = 'p-2 rounded-md bg-gray-800 hover:bg-gray-900 active:scale-95 transition-transform';
    dupBtn.title = 'Duplicate';
    dupBtn.setAttribute('aria-label', 'Duplicate');
    dupBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="9" y="9" width="10" height="10" rx="2" ry="2" stroke-width="2"></rect>
        <rect x="5" y="5" width="10" height="10" rx="2" ry="2" stroke-width="2"></rect>
      </svg>`;
    dupBtn.addEventListener('click', (e) => { e.stopPropagation(); duplicateModel(obj); });

    const delBtn = document.createElement('button');
    delBtn.className = 'p-2 rounded-md bg-red-600 hover:bg-red-700 active:scale-95 transition-transform';
    delBtn.title = 'Delete';
    delBtn.setAttribute('aria-label', 'Delete');
    delBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 6h18" stroke-width="2" stroke-linecap="round"></path>
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"></path>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-width="2"></path>
        <path d="M10 11v6M14 11v6" stroke-width="2" stroke-linecap="round"></path>
      </svg>`;
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteModel(obj); });

    actions.appendChild(dupBtn);
    actions.appendChild(delBtn);

    row.appendChild(nameBtn);
    row.appendChild(actions);
    sceneList.appendChild(row);
  });
}

// -----------------------------
// Panels + Toast
// -----------------------------
function showPanel(p) {
  if (!p) return;
  p.style.visibility = 'visible';
  p.style.opacity = '1';
  p.style.transform = 'translateY(0)';
  if (p.id === 'props-panel') {
    p.style.borderTopLeftRadius = '12px';
    p.style.borderTopRightRadius = '12px';
    p.style.borderBottomLeftRadius = '0';
    p.style.borderBottomRightRadius = '0';
  }
}
function hidePanel(p) {
  if (!p) return;
  p.style.opacity = '0';
  p.style.transform = 'translateY(100%)';
  setTimeout(() => (p.style.visibility = 'hidden'), 300);
}
function showTempMessage(text) {
  const box = document.getElementById('message-box');
  document.getElementById('message-text').textContent = text;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 1500);
}

// -----------------------------
// Parenting
// -----------------------------
function findByUUID(uuid) { return allModels.find(o => o.uuid === uuid); }

function refreshParentList() {
  parentList.innerHTML = '';
  if (!allModels.length) {
    parentList.innerHTML = '<p class="text-gray-400">No objects in scene.</p>';
    return;
  }

  allModels.forEach((obj, idx) => {
    const label = obj.userData?.label || obj.userData?.type || `Object ${idx+1}`;
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between bg-gray-700 rounded-md px-3 py-2';

    const left = document.createElement('div');
    left.className = 'flex items-center gap-3';
    left.innerHTML = `
      <input type="radio" name="parent-main" value="${obj.uuid}" aria-label="main">
      <input type="checkbox" class="parent-child" value="${obj.uuid}" aria-label="child">
      <span>${label}</span>
    `;

    const hint = document.createElement('div');
    hint.className = 'text-xs text-gray-300';
    const parentName = obj.parent && obj.parent !== scene ? (obj.parent.userData?.label || obj.parent.userData?.type) : null;
    hint.textContent = parentName ? \`child of \${parentName}\` : '';

    row.appendChild(left);
    row.appendChild(hint);
    parentList.appendChild(row);
  });
}

function setParentPreserveWorld(child, newParent) {
  child.updateMatrixWorld(true);
  newParent.updateMatrixWorld(true);

  const childWorld = child.matrixWorld.clone();
  const parentInv = new THREE.Matrix4().copy(newParent.matrixWorld).invert();

  child.matrix.copy(parentInv.multiply(childWorld));
  child.matrix.decompose(child.position, child.quaternion, child.scale);

  newParent.add(child);
}

function applyParenting() {
  const mainRadio = parentList.querySelector('input[name="parent-main"]:checked');
  if (!mainRadio) { showTempMessage('Pick a Main object'); return; }

  const main = findByUUID(mainRadio.value);
  if (!main) { showTempMessage('Invalid Main'); return; }

  const childChecks = [...parentList.querySelectorAll('input.parent-child:checked')];
  const children = childChecks.map(c => findByUUID(c.value)).filter(o => o && o !== main);
  if (!children.length) { showTempMessage('Pick at least one Child'); return; }

  const isAncestor = (a, b) => { let p = b.parent; while (p) { if (p === a) return true; p = p.parent; } return false; };

  children.forEach(child => {
    if (isAncestor(child, main)) return; // avoid cycles
    setParentPreserveWorld(child, main);
  });

  refreshSceneList();
  refreshParentList();
  showTempMessage('Parenting applied');
  hidePanel(parentPanel);
}

// -----------------------------
// Dynamic Properties Panel
// -----------------------------
function updatePropsPanel(object) {
  propsContent.innerHTML = '';

  if (!object || !object.userData?.params) {
    propsContent.innerHTML = '<p class="text-gray-400">No parameters to edit.</p>';
    return;
  }

  const type = object.userData.type;
  const p = object.userData.params;

  let paramConfig = {};
  if (type === 'TowerBase') {
    paramConfig = {
      height:           { min: 1,   max: 40, step: 0.1, label: 'Height' },
      width:            { min: 4,   max: 60, step: 0.1, label: 'Width' },
      depth:            { min: 4,   max: 60, step: 0.1, label: 'Depth' },
      wallThickness:    { min: 0.1, max: 5,  step: 0.1, label: 'Wall Thickness' },
      cornerRadius:     { min: 0,   max: TowerBase.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
      cornerSmoothness: { min: 8,   max: 64, step: 1,   label: 'Corner Smoothness' },
      edgeRoundness:    { min: 0,   max: TowerBase.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
      edgeSmoothness:   { min: 1,   max: 12, step: 1,   label: 'Edge Smoothness' },
      ...(p.doorWidth > 0 && {
        doorWidth:      { min: 0.1, max: TowerBase.getMaxDoorWidth(p), step: 0.1, label: 'Door Width' }
      })
    };
  } else if (type === 'DoubleDoor') {
    paramConfig = {
      height:           { min: 1,   max: 40, step: 0.1, label: 'Height' },
      totalWidth:       { min: 4,   max: 60, step: 0.1, label: 'Total Width' },
      depth:            { min: 0.1, max: 5,  step: 0.1, label: 'Depth' },
      frameThickness:   { min: 0.1, max: 2,  step: 0.1, label: 'Frame Thickness' },
      cornerRadius:     { min: 0,   max: DoubleDoor.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
      cornerSmoothness: { min: 8,   max: 64, step: 1,   label: 'Corner Smoothness' },
      edgeRoundness:    { min: 0,   max: DoubleDoor.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
      edgeSmoothness:   { min: 1,   max: 12, step: 1,   label: 'Edge Smoothness' },
      glassR:           { min: 0,   max: 1,  step: 0.01, label: 'Glass Red' },
      glassG:           { min: 0,   max: 1,  step: 0.01, label: 'Glass Green' },
      glassB:           { min: 0,   max: 1,  step: 0.01, label: 'Glass Blue' },
      glassOpacity:     { min: 0,   max: 1,  step: 0.01, label: 'Glass Opacity' },
      glassRoughness:   { min: 0,   max: 1,  step: 0.01, label: 'Glass Roughness' }
    };
  } else if (type === 'Window') {
    paramConfig = {
      height:           { min: 1,   max: 40, step: 0.1, label: 'Height' },
      totalWidth:       { min: 4,   max: 60, step: 0.1, label: 'Total Width' },
      depth:            { min: 0.1, max: 5,  step: 0.1, label: 'Depth' },
      frameThickness:   { min: 0.1, max: 2,  step: 0.1, label: 'Frame Thickness' },
      cornerRadius:     { min: 0,   max: WindowAsset.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
      cornerSmoothness: { min: 8,   max: 64, step: 1,   label: 'Corner Smoothness' },
      edgeRoundness:    { min: 0,   max: WindowAsset.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
      edgeSmoothness:   { min: 1,   max: 12, step: 1,   label: 'Edge Smoothness' },
      curveRadius:      { min: 0,   max: 20, step: 0.1, label: 'Curve Radius' },
      hasBolts:         { type: 'checkbox', label: 'Has Bolts' },
      hasBars:          { type: 'checkbox', label: 'Has Bars' },
      glassR:           { min: 0,   max: 1,  step: 0.01, label: 'Glass Red' },
      glassG:           { min: 0,   max: 1,  step: 0.01, label: 'Glass Green' },
      glassB:           { min: 0,   max: 1,  step: 0.01, label: 'Glass Blue' },
      glassOpacity:     { min: 0,   max: 1,  step: 0.01, label: 'Glass Opacity' },
      glassRoughness:   { min: 0,   max: 1,  step: 0.01, label: 'Glass Roughness' }
    };
  } else if (type === 'Floor') {
    paramConfig = {
      width:            { min: 4,   max: 100, step: 0.1, label: 'Width' },
      depth:            { min: 4,   max: 100, step: 0.1, label: 'Depth' },
      thickness:        { min: 0.1, max: 5,   step: 0.1, label: 'Thickness' },
      colorR:           { min: 0,   max: 1,   step: 0.01, label: 'Color Red' },
      colorG:           { min: 0,   max: 1,   step: 0.01, label: 'Color Green' },
      colorB:           { min: 0,   max: 1,   step: 0.01, label: 'Color Blue' }
    };
  } else if (type === 'Pipe') {
    // Pipe UI (includes elbow + flanges + bolts)
    paramConfig = {
      length:          { min: 0.5, max: 40,   step: 0.1,  label: 'Length' },
      outerRadius:     { min: 0.05, max: 5,   step: 0.01, label: 'Outer Radius' },
      wallThickness:   { min: 0.002, max: Pipe.getMaxWall(p), step: 0.01, label: 'Wall Thickness' },
      radialSegments:  { min: 8,    max: 64,  step: 1,    label: 'Radial Segments' },

      hasElbow:        { type: 'checkbox', label: 'Has Elbow' },
      shoulderDeg:     { min: 1,    max: 180, step: 1,    label: 'Elbow Angle (deg)' },
      elbowRadius:     { min: 0.2,  max: 20,  step: 0.05, label: 'Elbow Bend Radius' },
      elbowSegments:   { min: 8,    max: 64,  step: 1,    label: 'Elbow Segments' },
      elbowPlaneDeg:   { min: -180, max: 180, step: 1,    label: 'Elbow Plane (deg)' },

      hasFlangeStart:  { type: 'checkbox', label: 'Flange at Start' },
      hasFlangeEnd:    { type: 'checkbox', label: 'Flange at End' },
      flangeRadius:    { min: 0.1, max: 20,  step: 0.05, label: 'Flange Radius' },
      flangeThickness: { min: 0.02, max: 2,  step: 0.01, label: 'Flange Thickness' },

      hasBolts:        { type: 'checkbox', label: 'Bolts on Flanges' },
      boltCount:       { min: 2,    max: 36,  step: 1,    label: 'Bolt Count' },
      boltRadius:      { min: 0.01, max: 0.5, step: 0.01, label: 'Bolt Radius' },
      boltHeight:      { min: 0.04, max: 1.5, step: 0.01, label: 'Bolt Height' },
      boltRingInset:   { min: 0.02, max: 2.0, step: 0.01, label: 'Bolt Ring Inset' }
    };
  } else {
    propsContent.innerHTML = '<p class="text-gray-400">No parameters to edit.</p>';
    return;
  }

  // Controls
  for (const key in paramConfig) {
    const cfg = paramConfig[key];

    if (cfg.type === 'checkbox') {
      const checked = p[key] ? 'checked' : '';
      const html = `
        <div class="flex items-center space-x-2">
          <input type="checkbox" id="${key}-toggle" data-param="${key}" ${checked}>
          <label for="${key}-toggle" class="text-sm font-medium text-gray-300">${cfg.label}</label>
        </div>`;
      propsContent.insertAdjacentHTML('beforeend', html);
      continue;
    }

    // dynamic max for tower/window/door radius
    if (key === 'cornerRadius') cfg.max = type === 'TowerBase'
      ? TowerBase.getMaxCornerRadius(p)
      : type === 'DoubleDoor'
      ? DoubleDoor.getMaxCornerRadius(p)
      : type === 'Window'
      ? WindowAsset.getMaxCornerRadius(p)
      : cfg.max;

    if (key === 'edgeRoundness') cfg.max = type === 'TowerBase'
      ? TowerBase.getMaxEdgeRoundness(p)
      : type === 'DoubleDoor'
      ? DoubleDoor.getMaxEdgeRoundness(p)
      : type === 'Window'
      ? WindowAsset.getMaxEdgeRoundness(p)
      : cfg.max;

    if (type === 'TowerBase' && key === 'doorWidth') cfg.max = TowerBase.getMaxDoorWidth(p);

    if (type === 'Pipe' && key === 'wallThickness') cfg.max = Pipe.getMaxWall(p);

    const value = (p[key] ?? cfg.min);
    const valueFmt = (cfg.step >= 1) ? Math.round(value) : Number(value).toFixed(2);

    const html = `
      <div class="space-y-1">
        <label class="text-sm font-medium text-gray-300 flex justify-between">
          <span>${cfg.label}</span>
          <span id="${key}-value">${valueFmt}</span>
        </label>
        <input type="range" id="${key}-slider" data-param="${key}"
          min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${value}">
      </div>`;
    propsContent.insertAdjacentHTML('beforeend', html);
  }

  // Slider events
  propsContent.querySelectorAll('input[type="range"]').forEach((slider) => {
    slider.addEventListener('input', () => {
      const key = slider.dataset.param;
      const cfg = paramConfig[key];
      const val = (cfg.step >= 1) ? Math.round(parseFloat(slider.value)) : parseFloat(slider.value);

      let next = { ...object.userData.params, [key]: val };

      // Recompute dependent limits
      if (['totalWidth','width','depth','frameThickness','wallThickness','cornerRadius','height','outerRadius'].includes(key)) {
        // Corner Radius
        const crSlider = document.getElementById('cornerRadius-slider');
        if (crSlider) {
          let maxCR = crSlider.max;
          if (object.userData.type === 'TowerBase')      maxCR = TowerBase.getMaxCornerRadius(next);
          else if (object.userData.type === 'DoubleDoor')maxCR = DoubleDoor.getMaxCornerRadius(next);
          else if (object.userData.type === 'Window')    maxCR = WindowAsset.getMaxCornerRadius(next);
          crSlider.max = maxCR;
          if (next.cornerRadius > maxCR) {
            next.cornerRadius = maxCR;
            crSlider.value = maxCR;
            const v = (paramConfig.cornerRadius.step >= 1) ? Math.round(maxCR) : Number(maxCR).toFixed(2);
            document.getElementById('cornerRadius-value').textContent = v;
          }
        }
        // Edge Roundness
        const erSlider = document.getElementById('edgeRoundness-slider');
        if (erSlider) {
          let maxER = erSlider.max;
          if (object.userData.type === 'TowerBase')      maxER = TowerBase.getMaxEdgeRoundness(next);
          else if (object.userData.type === 'DoubleDoor')maxER = DoubleDoor.getMaxEdgeRoundness(next);
          else if (object.userData.type === 'Window')    maxER = WindowAsset.getMaxEdgeRoundness(next);
          erSlider.max = maxER;
          if (next.edgeRoundness > maxER) {
            next.edgeRoundness = maxER;
            erSlider.value = maxER;
            const v = (paramConfig.edgeRoundness.step >= 1) ? Math.round(maxER) : Number(maxER).toFixed(2);
            document.getElementById('edgeRoundness-value').textContent = v;
          }
        }
        // Door Width (Tower only)
        const dwSlider = document.getElementById('doorWidth-slider');
        if (dwSlider && object.userData.type === 'TowerBase') {
          const maxDW = TowerBase.getMaxDoorWidth(next);
          dwSlider.max = maxDW;
          if (next.doorWidth > maxDW) {
            next.doorWidth = maxDW;
            dwSlider.value = maxDW;
            const v = (paramConfig.doorWidth.step >= 1) ? Math.round(maxDW) : Number(maxDW).toFixed(2);
            document.getElementById('doorWidth-value').textContent = v;
          }
        }
        // Pipe wallThickness depends on outerRadius
        if (object.userData.type === 'Pipe') {
          const wt = document.getElementById('wallThickness-slider');
          if (wt) {
            const maxWT = Pipe.getMaxWall(next);
            wt.max = maxWT;
            if (next.wallThickness > maxWT) {
              next.wallThickness = maxWT;
              wt.value = maxWT;
              document.getElementById('wallThickness-value').textContent = Number(maxWT).toFixed(2);
            }
          }
        }
      }

      const lbl = document.getElementById(`${key}-value`);
      if (lbl) lbl.textContent = (cfg.step >= 1) ? Math.round(val) : val.toFixed(2);

      object.updateParams(next);
    });
  });

  // Checkbox events
  propsContent.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const key = checkbox.dataset.param;
      const val = checkbox.checked;
      let next = { ...object.userData.params, [key]: val };
      object.updateParams(next);
    });
  });
}

// -----------------------------
// Start
// -----------------------------
window.addEventListener('DOMContentLoaded', init);

// Show runtime errors in the toast + ensure loader hides
window.addEventListener('error', (e) => {
  const msg = e?.error?.message || e.message || 'Unknown error';
  const box = document.getElementById('message-box');
  if (box) {
    document.getElementById('message-text').textContent = msg;
    box.classList.add('show');
    setTimeout(() => box.classList.remove('show'), 3500);
  }
  const ls = document.getElementById('loading-screen');
  if (ls) { ls.style.opacity = '0'; ls.style.display = 'none'; }
});