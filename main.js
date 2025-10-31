// --- Imports ---
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import TowerBase from './towerbase.js';
import DoubleDoor from './doubledoor.js';
import WindowAsset from './window.js';
import Floor from './floor.js';
import Pipe from './pipe.js';
import Roof from './roof.js';
import TrussArm from './trussarm.js';
// Added new imports
import Cube from './cube.js';
import Sphere from './sphere.js';
import Cylinder from './cylinder.js';

import { serializeModels, downloadBlob, loadFromJSON, exportGLB, importGLBFile } from './fileio.js';

// --- Globals ---
let scene, camera, renderer, orbitControls, transformControls;
let raycaster, touchStartPos, currentSelection;
let allModels = [];

// UI refs
let loadingScreen, canvasContainer;
let fileBtn, filePanel, closeFilePanel, fileSaveBtn, fileLoadBtn, fileExportBtn, fileImportBtn;
let addBtn, addPanel, closeAddPanel;
let propsPanel, closePropsPanel, propsContent;
let addTowerDoorBtn, addTowerSolidBtn, addDoubleDoorBtn, addWindowBtn, addFloorBtn, addPipeBtn;
// Added new button refs
let addTrussArmBtn, addCubeBtn, addSphereBtn, addCylinderBtn;
let sceneBtn, scenePanel, closeScenePanel, sceneList;

// Parenting UI
let parentBtn, parentPanel, closeParentPanel, parentList, parentApplyBtn, parentCancelBtn;

// Hidden pickers
let pickerLoadJSON, pickerImportGLB;

// Export bottom panel
let exportPanel, exportNameInput, exportClose, exportCancel, exportGo, optOnlyModels, optBinary;

// Touch
let lastTapTime = 0;
const DOUBLE_TAP_DELAY = 300;

// Texture Globals
const textureLoader = new THREE.TextureLoader();
const presetTextureCache = new Map();

// PBR Preset Definitions
const PRESET_TEXTURES = {
  'none': {
    name: 'None',
    preview: '', // No preview
    albedo: null,
    normal: null,
    roughness: null,
    metalness: null,
    ao: null,
    displacement: null,
    roughnessScalar: 0.8,
    metalnessScalar: 0.1
  },
  'rustymetal': {
    name: 'Rusty Metal',
    preview: 'textures/rustymetal/rustymetal.png',
    albedo: 'textures/rustymetal/rustymetal_albedo.png',
    normal: 'textures/rustymetal/rustymetal_normal.png',
    roughness: 'textures/rustymetal/rustymetal_roughness.png',
    metalness: null, // No map, use scalar
    ao: 'textures/rustymetal/rustymetal_ao.png',
    displacement: 'textures/rustymetal/rustymetal_displacement.png',
    roughnessScalar: 1.0, // Use map, but set scalar as default
    metalnessScalar: 1.0  // No map, so this scalar is used
  },
  'road': {
    name: 'Road',
    preview: 'textures/road/road.png',
    albedo: 'textures/road/road_albedo.png',
    normal: 'textures/road/road_normal.png',
    roughness: 'textures/road/road_roughness.png',
    metalness: null, // No map, use scalar
    ao: null,
    displacement: 'textures/road/road_displacement.png',
    roughnessScalar: 1.0, // Use map
    metalnessScalar: 0.1  // No map, so this scalar is used
  }
};

// Name counters
const nameCounts = {};
function assignDefaultName(obj) {
  const base = obj.userData?.type || 'Object';
  nameCounts[base] = (nameCounts[base] || 0) + 1;
  obj.userData.label = `${base} #${nameCounts[base]}`;
}

// Builders map for loader
const BUILDERS = {
  'TowerBase': TowerBase,
  'DoubleDoor': DoubleDoor,
  'Window': WindowAsset,
  'Floor': Floor,
  'Pipe': Pipe,
  'Roof': Roof,
  'TrussArm': TrussArm,
  // Added new builders
  'Cube': Cube,
  'Sphere': Sphere,
  'Cylinder': Cylinder
};

// -----------------------------
// Init
// -----------------------------
function init() {
  // UI handles
  loadingScreen   = document.getElementById('loading-screen');
  canvasContainer = document.getElementById('canvas-container');

  fileBtn         = document.getElementById('file-btn');
  filePanel       = document.getElementById('file-panel');
  closeFilePanel  = document.getElementById('close-file-panel');
  fileSaveBtn     = document.getElementById('file-save');
  fileLoadBtn     = document.getElementById('file-load');
  fileExportBtn   = document.getElementById('file-export');
  fileImportBtn   = document.getElementById('file-import');

  pickerLoadJSON  = document.getElementById('picker-load-json');
  pickerImportGLB = document.getElementById('picker-import-glb');

  addBtn          = document.getElementById('add-btn');
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
  // Added getElementById for new buttons
  addTrussArmBtn  = document.getElementById('add-trussarm-btn');
  addCubeBtn      = document.getElementById('add-cube-btn');
  addSphereBtn    = document.getElementById('add-sphere-btn');
  addCylinderBtn  = document.getElementById('add-cylinder-btn');

  scenePanel      = document.getElementById('scene-panel');
  closeScenePanel = document.getElementById('close-scene-panel');
  sceneList       = document.getElementById('scene-list');

  parentPanel      = document.getElementById('parent-panel');
  closeParentPanel = document.getElementById('close-parent-panel');
  parentList       = document.getElementById('parent-list');
  parentApplyBtn   = document.getElementById('parent-apply');
  parentCancelBtn  = document.getElementById('parent-cancel');

  exportPanel     = document.getElementById('export-panel');
  exportNameInput = document.getElementById('export-name');
  exportClose     = document.getElementById('export-close');
  exportCancel    = document.getElementById('export-cancel');
  exportGo        = document.getElementById('export-go');
  optOnlyModels   = document.getElementById('opt-only-models');
  optBinary       = document.getElementById('opt-binary');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2a2a);
  // Push fog out so nothing within ~100 units gets fogged
  scene.fog = new THREE.Fog(0x2a2a2a, 1500, 10000);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
  renderer.shadowMap.enabled = true;
  canvasContainer.appendChild(renderer.domElement);

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
  scene.add(new THREE.GridHelper(100, 100, 0x888888, 0x444444)); // 1-unit spacing
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
  [addPanel, scenePanel, parentPanel, filePanel, exportPanel].forEach(hidePanel);
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
  // FILE dropdown (bottom sheet)
  fileBtn.addEventListener('click', () => togglePanel(filePanel, [addPanel, scenePanel, parentPanel, propsPanel, exportPanel]));
  closeFilePanel.addEventListener('click', () => hidePanel(filePanel));

  fileSaveBtn.addEventListener('click', () => {
    const data = serializeModels(scene);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'scene.json');
    showTempMessage('Session saved');
    hidePanel(filePanel);
  });

  fileLoadBtn.addEventListener('click', () => pickerLoadJSON.click());
  pickerLoadJSON.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      // Pass ensureTexState as the final argument
      loadFromJSON(json, BUILDERS, scene, allModels, (o) => {
        if (!o.userData.label) assignDefaultName(o);
      }, ensureTexState);
      refreshSceneList();
      showTempMessage('Session loaded');
      hidePanel(filePanel);
    } catch (err) {
      showTempMessage('Load failed');
      console.error(err);
    } finally {
      pickerLoadJSON.value = '';
    }
  });

  fileExportBtn.addEventListener('click', () => {
    exportNameInput.value = 'Model.glb';
    togglePanel(exportPanel, [filePanel, addPanel, scenePanel, parentPanel, propsPanel]);
  });
  exportClose.addEventListener('click', () => hidePanel(exportPanel));
  exportCancel.addEventListener('click', () => hidePanel(exportPanel));
  exportGo.addEventListener('click', () => {
    const name = (exportNameInput.value || 'Model.glb').trim();
    exportGLB(
      { scene, modelsOnly: optOnlyModels.checked, binary: optBinary.checked, fileName: name, allModels },
      () => showTempMessage('Exported'),
      (e) => { console.error(e); showTempMessage('Export failed'); }
    );
    hidePanel(exportPanel);
  });

  fileImportBtn.addEventListener('click', () => pickerImportGLB.click());
  pickerImportGLB.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      importGLBFile(f, scene, allModels, (o) => {
        assignDefaultName(o);
        refreshSceneList();
        selectObject(o);
      });
      showTempMessage('Importing…');
    } catch (err) {
      console.error(err);
      showTempMessage('Import failed');
    } finally {
      pickerImportGLB.value = '';
    }
  });

  // ADD panel
  addBtn.addEventListener('click', () => togglePanel(addPanel, [filePanel, scenePanel, parentPanel, propsPanel, exportPanel]));
  closeAddPanel.addEventListener('click', () => hidePanel(addPanel));
  closePropsPanel.addEventListener('click', () => deselectAll());

  // Scene list toggle
  sceneBtn.addEventListener('click', () => {
    refreshSceneList();
    togglePanel(scenePanel, [filePanel, addPanel, parentPanel, propsPanel, exportPanel]);
  });
  closeScenePanel.addEventListener('click', () => hidePanel(scenePanel));

  // Parenting panel
  parentBtn.addEventListener('click', () => {
    refreshParentList();
    togglePanel(parentPanel, [filePanel, addPanel, scenePanel, propsPanel, exportPanel]);
  });
  closeParentPanel.addEventListener('click', () => hidePanel(parentPanel));
  parentCancelBtn.addEventListener('click', () => hidePanel(parentPanel));
  parentApplyBtn.addEventListener('click', applyParenting);

  // Adders
  addTowerDoorBtn.addEventListener('click', () => {
    const params = { width: 12, depth: 12, height: 6, wallThickness: 1, cornerRadius: 1.2, edgeRoundness: 0.3, doorWidth: 4 };
    const tower = new TowerBase(params);
    tower.position.y = params.height / 2;
    assignDefaultName(tower);
    scene.add(tower); allModels.push(tower);
    refreshSceneList(); selectObject(tower); hidePanel(addPanel);
  });

  addTowerSolidBtn.addEventListener('click', () => {
    const params = { width: 10, depth: 10, height: 8, wallThickness: 1, cornerRadius: 1.0, edgeRoundness: 0.2, doorWidth: 0 };
    const tower = new TowerBase(params);
    tower.position.y = params.height / 2;
    assignDefaultName(tower);
    scene.add(tower); allModels.push(tower);
    refreshSceneList(); selectObject(tower); hidePanel(addPanel);
  });

  addDoubleDoorBtn.addEventListener('click', () => {
    const params = { totalWidth: 8, height: 10, depth: 0.5, frameThickness: 0.5, cornerRadius: 0.2, cornerSmoothness: 16, edgeRoundness: 0.1, edgeSmoothness: 4, glassR:1, glassG:1, glassB:1, glassOpacity:0.5, glassRoughness:0.2 };
    const doors = new DoubleDoor(params);
    doors.position.y = params.height / 2;
    assignDefaultName(doors);
    scene.add(doors); allModels.push(doors);
    refreshSceneList(); selectObject(doors); hidePanel(addPanel);
  });

  addWindowBtn.addEventListener('click', () => {
    const params = { totalWidth: 6, height: 8, depth: 0.3, frameThickness: 0.4, cornerRadius: 0.1, cornerSmoothness: 16, edgeRoundness: 0.05, edgeSmoothness: 4, hasBolts:false, hasBars:false, glassR:0.8, glassG:0.8, glassB:1, glassOpacity:0.3, glassRoughness:0.1 };
    const win = new WindowAsset(params);
    win.position.y = params.height / 2;
    assignDefaultName(win);
    scene.add(win); allModels.push(win);
    refreshSceneList(); selectObject(win); hidePanel(addPanel);
  });

  addFloorBtn.addEventListener('click', () => {
    const params = { width: 20, depth: 20, thickness: 0.5, colorR: 0.5, colorG: 0.5, colorB: 0.5, cornerRadius:0.0, edgeRoundness:0.0, edgeSmoothness:4 };
    const floor = new Floor(params);
    floor.position.y = -params.thickness / 2;
    assignDefaultName(floor);
    scene.add(floor); allModels.push(floor);
    refreshSceneList(); selectObject(floor); hidePanel(addPanel);
  });

  addPipeBtn.addEventListener('click', () => {
    const p = new Pipe();
    p.position.y = 1;
    assignDefaultName(p);
    scene.add(p); allModels.push(p);
    refreshSceneList(); selectObject(p); hidePanel(addPanel);
  });

  // Added listeners for new buttons
  addTrussArmBtn.addEventListener('click', () => {
    const obj = new TrussArm();
    assignDefaultName(obj);
    scene.add(obj); allModels.push(obj);
    refreshSceneList(); selectObject(obj); hidePanel(addPanel);
  });

  addCubeBtn.addEventListener('click', () => {
    const obj = new Cube();
    assignDefaultName(obj);
    scene.add(obj); allModels.push(obj);
    refreshSceneList(); selectObject(obj); hidePanel(addPanel);
  });

  addSphereBtn.addEventListener('click', () => {
    const obj = new Sphere();
    assignDefaultName(obj);
    scene.add(obj); allModels.push(obj);
    refreshSceneList(); selectObject(obj); hidePanel(addPanel);
  });

  addCylinderBtn.addEventListener('click', () => {
    const obj = new Cylinder();
    assignDefaultName(obj);
    scene.add(obj); allModels.push(obj);
    refreshSceneList(); selectObject(obj); hidePanel(addPanel);
  });
}

function togglePanel(panel, toHide = []) {
  if (!panel) return;
  if (panel.style.visibility === 'visible') hidePanel(panel);
  else {
    toHide.forEach(hidePanel);
    showPanel(panel);
  }
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
  else if (type === 'Roof')       copy = new Roof(params);
  else if (type === 'TrussArm')   copy = new TrussArm(params);
  // Added new types to duplicate
  else if (type === 'Cube')       copy = new Cube(params);
  else if (type === 'Sphere')     copy = new Sphere(params);
  else if (type === 'Cylinder')   copy = new Cylinder(params);
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
}
function hidePanel(p) {
  if (!p) return;
  p.style.opacity = '0';
  p.style.transform = 'translateY(100%)';
  setTimeout(() => (p.style.visibility = 'hidden'), 240);
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
    hint.textContent = parentName ? `child of ${parentName}` : '';

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

// ============================================================================
//                                TABBED PROPERTIES
// ============================================================================

// Simple tab system
function makeTabs(rootEl, tabsSpec) {
  const header = document.createElement('div');
  header.className = 'flex gap-2 mb-3 sticky top-0 bg-[rgba(30,30,30,0.9)] pt-1 pb-2 z-10';

  const contentWrap = document.createElement('div');
  contentWrap.className = 'mt-1';

  const pages = new Map();
  let currentId = tabsSpec[0].id;

  tabsSpec.forEach(tab => {
    const btn = document.createElement('button');
    btn.textContent = tab.label;
    btn.className = 'px-3 py-1.5 rounded-md text-sm bg-gray-700 data-[active=true]:bg-blue-600 font-semibold';
    btn.dataset.id = tab.id;
    header.appendChild(btn);

    const page = document.createElement('div');
    page.style.display = 'none';
    pages.set(tab.id, { page, builder: tab.build, built: false });
    contentWrap.appendChild(page);

    btn.addEventListener('click', () => {
      if (currentId === tab.id) return;
      header.querySelectorAll('button').forEach(b => b.dataset.active = 'false');
      btn.dataset.active = 'true';
      pages.get(currentId).page.style.display = 'none';
      currentId = tab.id;
      const p = pages.get(currentId);
      if (!p.built) { p.builder(p.page); p.built = true; }
      p.page.style.display = '';
    });
  });

  rootEl.appendChild(header);
  rootEl.appendChild(contentWrap);
  header.querySelector('button').dataset.active = 'true';
  const first = pages.get(currentId);
  first.builder(first.page); first.built = true; first.page.style.display = '';
}

// Collect unique THREE.Materials under an object; ensure uv2 for AO/displacement
function collectMaterialsFromObject(root) {
  const set = new Set();
  root.traverse(n => {
    if (n.isMesh && n.material) {
      if (Array.isArray(n.material)) n.material.forEach(m => m && set.add(m));
      else set.add(n.material);
      if (n.geometry?.attributes?.uv && !n.geometry.attributes.uv2) {
        n.geometry.setAttribute('uv2', n.geometry.attributes.uv);
      }
    }
  });
  return Array.from(set);
}

// --- Per-object texture override state ---
function ensureTexState(object) {
  if (!object.userData._texOverrides) object.userData._texOverrides = {
    map: null, normalMap: null, roughnessMap: null, metalnessMap: null,
    aoMap: null, emissiveMap: null, displacementMap: null,
    uvScale: 1, uvRotation: 0, displacementScale: 0.0,
    activePreset: 'none', // Added
    activeAlbedo: 'none'  // Added
  };
  return object.userData._texOverrides;
}

// Apply UV tiling & rotation to all currently attached maps on given materials
function applyUVToAllMaps(materials, scale = 1, rotationRad = 0) {
  const apply = (tex) => {
    if (!tex) return;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(scale, scale);
    tex.center.set(0.5, 0.5);
    tex.rotation = rotationRad;
    tex.needsUpdate = true;
  };
  materials.forEach(m => {
    apply(m.map);
    apply(m.normalMap);
    apply(m.roughnessMap);
    apply(m.metalnessMap);
    apply(m.aoMap);
    apply(m.emissiveMap);
    apply(m.bumpMap);
    apply(m.displacementMap);
  });
}

function setMaterialScalar(materials, key, value) {
  materials.forEach(m => {
    if (key in m) { m[key] = value; m.needsUpdate = true; }
  });
}
function setMaterialColor(materials, hex) {
  materials.forEach(m => { if (m.color) { m.color.set(hex); m.needsUpdate = true; } });
}
function setEmissive(materials, hex, intensity) {
  materials.forEach(m => {
    if (m.emissive) m.emissive.set(hex);
    if ('emissiveIntensity' in m) m.emissiveIntensity = intensity;
    m.needsUpdate = true;
  });
}

// Map name -> material property slot + colorSpace rule
const MAP_SLOTS = {
  albedo:   { prop: 'map',             color: true  },
  normal:   { prop: 'normalMap',       color: false },
  roughness:{ prop: 'roughnessMap',    color: false },
  metalness:{ prop: 'metalnessMap',    color: false },
  ao:       { prop: 'aoMap',           color: false },
  emissive: { prop: 'emissiveMap',     color: true  },
  height:   { prop: 'displacementMap', color: false }
};

/**
 * Loads a texture from a URL and applies it to materials and state.
 * @param {string} url - The URL to load.
 * @param {object} options - Configuration object.
 * @param {THREE.Object3D} options.object - The target object.
 * @param {THREE.Material[]} options.materials - Array of materials to update.
 * @param {string} options.slotName - 'albedo', 'normal', etc.
 * @param {number} options.uvScale - UV scale.
 * @param {number} options.uvRotation - UV rotation in radians.
 * @param {boolean} [options.isPreset=false] - If true, texture is cached. If false, it's a manual upload.
 */
function applyTextureFromURL({ object, materials, url, slotName, uvScale, uvRotation, isPreset = false }) {
  return new Promise((resolve, reject) => {
    const slot = MAP_SLOTS[slotName];
    if (!slot) return reject(new Error('Unknown map slot'));

    const st = ensureTexState(object);

    const applyTex = (tex) => {
      try {
        const setSRGB = (t) => {
          if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
          else if ('encoding' in t) t.encoding = THREE.sRGBEncoding;
        };
        if (slot.color) setSRGB(tex);

        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.center.set(0.5, 0.5);
        tex.repeat.set(uvScale, uvScale);
        tex.rotation = uvRotation;
        tex.needsUpdate = true; // Ensure UVs are applied

        if (typeof renderer?.capabilities?.getMaxAnisotropy === 'function') {
          tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        }
        
        materials.forEach(m => { m[slot.prop] = tex; m.needsUpdate = true; });

        // If old texture in state was NOT from cache, dispose it.
        const oldTex = st[slot.prop];
        if (oldTex && oldTex !== tex && !Array.from(presetTextureCache.values()).includes(oldTex)) {
          oldTex.dispose?.();
        }
        
        st[slot.prop] = tex;
        st.uvScale = uvScale;
        st.uvRotation = uvRotation;
        
        resolve(tex);
      } catch (e) {
        reject(e);
      }
    };

    // Use URL as the cache key for presets
    const cacheKey = isPreset ? url : null;
    let cachedTex = cacheKey ? presetTextureCache.get(cacheKey) : null;

    if (cachedTex) {
      applyTex(cachedTex);
    } else {
      textureLoader.load(url, (tex) => {
        if (cacheKey) {
          presetTextureCache.set(cacheKey, tex);
        }
        applyTex(tex);
      }, undefined, (err) => {
        console.error('Failed to load texture:', url, err);
        reject(err);
      });
    }
  });
}

/** Applies a texture from a user-uploaded file */
function uploadMapFromFile({ object, materials, file, slotName, uvScale = 1, uvRotation = 0 }) {
  const url = URL.createObjectURL(file);
  // Apply from URL, set isPreset to false.
  return applyTextureFromURL({ object, materials, url, slotName, uvScale, uvRotation, isPreset: false })
    .finally(() => {
      URL.revokeObjectURL(url);
    });
}

/** Clears a specific texture slot */
function clearOverrideSlot(object, materials, slotName) {
  const slot = MAP_SLOTS[slotName];
  const st = ensureTexState(object);
  const tex = st[slot.prop];
  
  // Only dispose if it's not a cached preset texture
  if (tex && !Array.from(presetTextureCache.values()).includes(tex)) {
    tex.dispose?.();
  }
  
  st[slot.prop] = null;
  materials.forEach(m => { m[slot.prop] = null; m.needsUpdate = true; });
}

/** Clears all manually uploaded textures, leaving presets alone is not the logic.
 * This clears ALL texture maps and resets state.
 */
function clearAllOverrides(object, materials) {
  const st = ensureTexState(object);
  for (const slotName of Object.keys(MAP_SLOTS)) {
    const slot = MAP_SLOTS[slotName];
    const tex = st[slot.prop];
    if (tex && !Array.from(presetTextureCache.values()).includes(tex)) {
      tex.dispose?.();
    }
    st[slot.prop] = null;
    materials.forEach(m => { m[slot.prop] = null; m.needsUpdate = true; });
  }
  
  // Reset scalars to default
  const preset = PRESET_TEXTURES['none'];
  setMaterialScalar(materials, 'roughness', preset.roughnessScalar);
  setMaterialScalar(materials, 'metalness', preset.metalnessScalar);
}

/** Applies a full PBR preset (textures and scalars) */
async function applyPreset(object, materials, presetKey, page) {
  const preset = PRESET_TEXTURES[presetKey];
  if (!preset) return;

  const st = ensureTexState(object);
  st.activePreset = presetKey;
  st.activeAlbedo = presetKey;
  
  // Clear all previous textures
  clearAllOverrides(object, materials);

  const uvScale = st.uvScale;
  const uvRotation = st.uvRotation;
  
  const texturePromises = [];
  
  for (const slotName of Object.keys(MAP_SLOTS)) {
    const url = preset[slotName];
    if (url) {
      // Load and apply texture
      texturePromises.push(
        applyTextureFromURL({
          object, materials, url, slotName, uvScale, uvRotation, isPreset: true
        })
      );
    }
    // No else needed, clearAllOverrides already set map to null
  }
  
  // Wait for all textures to load
  await Promise.all(texturePromises);
  
  // Set scalar fallbacks
  setMaterialScalar(materials, 'roughness', preset.roughnessScalar);
  setMaterialScalar(materials, 'metalness', preset.metalnessScalar);
  
  // Update UI
  const roughSlider = page.querySelector('#mat-rough-slider');
  const roughNumber = page.querySelector('#mat-rough-val');
  const metalSlider = page.querySelector('#mat-metal-slider');
  const metalNumber = page.querySelector('#mat-metal-val');
  const albedoSelect = page.querySelector('#albedo-override-select');
  
  if (roughSlider) roughSlider.value = preset.roughnessScalar;
  if (roughNumber) roughNumber.value = preset.roughnessScalar.toFixed(2);
  if (metalSlider) metalSlider.value = preset.metalnessScalar;
  if (metalNumber) metalNumber.value = preset.metalnessScalar.toFixed(2);
  if (albedoSelect) albedoSelect.value = presetKey;
}

/** Applies only the Albedo map from a chosen preset */
async function applyAlbedoOverride(object, materials, albedoKey) {
  const preset = PRESET_TEXTURES[albedoKey];
  if (!preset) return;

  const st = ensureTexState(object);
  st.activeAlbedo = albedoKey;
  
  const uvScale = st.uvScale;
  const uvRotation = st.uvRotation;
  const slotName = 'albedo';
  
  if (preset.albedo) {
    await applyTextureFromURL({
      object, materials, url: preset.albedo, slotName, uvScale, uvRotation, isPreset: true
    });
  } else {
    // This is the 'None' case
    clearOverrideSlot(object, materials, slotName);
  }
}

// ---------------- Transform tab ----------------
function buildTransformTab(object, page) {
  const numberInputClasses = "w-20 text-right bg-gray-800 rounded px-2 py-0.5 text-sm";
  const toRow = (id, label, min, max, step, value) => `
    <div class="space-y-1">
      <label class="text-sm font-medium flex justify-between items-center">
        <span>${label}</span>
        <input type="number" id="${id}-val" class="${numberInputClasses}" min="${min}" max="${max}" step="${step}" value="${value}">
      </label>
      <input type="range" id="${id}-slider" min="${min}" max="${max}" step="${step}" value="${value}">
    </div>`;

  page.innerHTML = `
    <div class="grid grid-cols-3 gap-3">
      ${toRow('tx','Pos X', -100,100,0.1, object.position.x.toFixed(2))}
      ${toRow('ty','Pos Y', -100,100,0.1, object.position.y.toFixed(2))}
      ${toRow('tz','Pos Z', -100,100,0.1, object.position.z.toFixed(2))}
    </div>
    <div class="grid grid-cols-3 gap-3 mt-3">
      ${toRow('rx','Rot X°', -180,180,1, THREE.MathUtils.radToDeg(object.rotation.x).toFixed(0))}
      ${toRow('ry','Rot Y°', -180,180,1, THREE.MathUtils.radToDeg(object.rotation.y).toFixed(0))}
      ${toRow('rz','Rot Z°', -180,180,1, THREE.MathUtils.radToDeg(object.rotation.z).toFixed(0))}
    </div>
    <div class="grid grid-cols-3 gap-3 mt-3">
      ${toRow('sx','Scale X', 0.01,20,0.01, object.scale.x.toFixed(2))}
      ${toRow('sy','Scale Y', 0.01,20,0.01, object.scale.y.toFixed(2))}
      ${toRow('sz','Scale Z', 0.01,20,0.01, object.scale.z.toFixed(2))}
    </div>
    <div class="mt-3 flex gap-2">
      <button id="reset-pos" class="px-3 py-2 rounded bg-gray-700">Reset Pos</button>
      <button id="reset-rot" class="px-3 py-2 rounded bg-gray-700">Reset Rot</button>
      <button id="reset-scl" class="px-3 py-2 rounded bg-gray-700">Reset Scale</button>
    </div>
  `;

  const link = (id, fn, formatFn) => {
    const slider = page.querySelector(`#${id}-slider`);
    const number = page.querySelector(`#${id}-val`);
    if (!slider || !number) return;

    const format = formatFn || (v => v.toFixed(2));

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      number.value = format(val);
      fn(val);
      if (transformControls) transformControls.update();
    });

    const updateFromNumber = () => {
      let val = parseFloat(number.value);
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      if (isNaN(val)) val = min;
      val = Math.max(min, Math.min(max, val)); // Clamp
      
      number.value = format(val);
      slider.value = val;
      fn(val);
      if (transformControls) transformControls.update();
    };
    
    number.addEventListener('change', updateFromNumber); // On blur
    number.addEventListener('keydown', e => { // On Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        updateFromNumber();
        number.blur();
      }
    });
  };

  const formatDeg = v => v.toFixed(0);
  link('tx', v => object.position.x = v);
  link('ty', v => object.position.y = v);
  link('tz', v => object.position.z = v);
  link('rx', v => object.rotation.x = THREE.MathUtils.degToRad(v), formatDeg);
  link('ry', v => object.rotation.y = THREE.MathUtils.degToRad(v), formatDeg);
  link('rz', v => object.rotation.z = THREE.MathUtils.degToRad(v), formatDeg);
  link('sx', v => object.scale.x = v);
  link('sy', v => object.scale.y = v);
  link('sz', v => object.scale.z = v);

  const reset = (ids, val, fn) => {
    fn(val);
    ids.forEach(id => {
      page.querySelector(`#${id}-slider`).value = val;
      page.querySelector(`#${id}-val`).value = (id.startsWith('r') ? val.toFixed(0) : (id.startsWith('s') ? val.toFixed(2) : val.toFixed(2)));
    });
    if (transformControls) transformControls.update();
  };

  page.querySelector('#reset-pos').addEventListener('click', () => reset(['tx','ty','tz'], 0, v => object.position.set(v,v,v)));
  page.querySelector('#reset-rot').addEventListener('click', () => reset(['rx','ry','rz'], 0, v => object.rotation.set(v,v,v)));
  page.querySelector('#reset-scl').addEventListener('click', () => reset(['sx','sy','sz'], 1, v => object.scale.set(v,v,v)));
}

// ---------------- Shape tab (per-type params) ----------------
function buildShapeTab(object, page) {
  const type = object.userData.type;
  const p = object.userData.params || {};
  let paramConfig = {};
  const numberInputClasses = "w-20 text-right bg-gray-800 rounded px-2 py-0.5 text-sm";

  if (type === 'TowerBase') {
    paramConfig = {
      height:           { min: 1,   max: 80, step: 0.1, label: 'Height' },
      width:            { min: 4,   max: 80, step: 0.1, label: 'Width' },
      depth:            { min: 4,   max: 80, step: 0.1, label: 'Depth' },
      wallThickness:    { min: 0.1, max: 5,  step: 0.05, label: 'Wall Thickness' },
      cornerRadius:     { min: 0,   max: TowerBase.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
      cornerSmoothness: { min: 8,   max: 64, step: 1,   label: 'Corner Smoothness' },
      edgeRoundness:    { min: 0,   max: TowerBase.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
      edgeSmoothness:   { min: 1,   max: 12, step: 1,   label: 'Edge Smoothness' },
      ...(p.doorWidth !== undefined && {
        doorWidth:      { min: 0,   max: TowerBase.getMaxDoorWidth(p), step: 0.1, label: 'Door Width' }
      })
    };
  } else if (type === 'DoubleDoor') {
    paramConfig = {
      height:           { min: 1,   max: 60, step: 0.1, label: 'Height' },
      totalWidth:       { min: 4,   max: 80, step: 0.1, label: 'Total Width' },
      depth:            { min: 0.05,max: 5,  step: 0.05, label: 'Depth' },
      frameThickness:   { min: 0.05,max: 2,  step: 0.05, label: 'Frame Thickness' },
      cornerRadius:     { min: 0,   max: DoubleDoor.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
      cornerSmoothness: { min: 8,   max: 64, step: 1,   label: 'Corner Smoothness' },
      edgeRoundness:    { min: 0,   max: DoubleDoor.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
      edgeSmoothness:   { min: 1,   max: 12, step: 1,   label: 'Edge Smoothness' },
      glassR:           { min: 0,   max: 1,  step: 0.01, label: 'Glass R' },
      glassG:           { min: 0,   max: 1,  step: 0.01, label: 'Glass G' },
      glassB:           { min: 0,   max: 1,  step: 0.01, label: 'Glass B' },
      glassOpacity:     { min: 0,   max: 1,  step: 0.01, label: 'Glass Opacity' },
      glassRoughness:   { min: 0,   max: 1,  step: 0.01, label: 'Glass Roughness' }
    };
  } else if (type === 'Window') {
    paramConfig = {
      height:           { min: 1,   max: 60, step: 0.1, label: 'Height' },
      totalWidth:       { min: 2,   max: 80, step: 0.1, label: 'Total Width' },
      depth:            { min: 0.02,max: 3,  step: 0.02, label: 'Depth' },
      frameThickness:   { min: 0.05,max: 2,  step: 0.05, label: 'Frame Thickness' },
      cornerRadius:     { min: 0,   max: WindowAsset.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
      cornerSmoothness: { min: 8,   max: 64, step: 1,   label: 'Corner Smoothness' },
      edgeRoundness:    { min: 0,   max: WindowAsset.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
      edgeSmoothness:   { min: 1,   max: 12, step: 1,   label: 'Edge Smoothness' },
      hasBolts:         { type: 'checkbox', label: 'Bolts' },
      hasBars:          { type: 'checkbox', label: 'Bars' },
      glassR:           { min: 0,   max: 1,  step: 0.01, label: 'Glass R' },
      glassG:           { min: 0,   max: 1,  step: 0.01, label: 'Glass G' },
      glassB:           { min: 0,   max: 1,  step: 0.01, label: 'Glass B' },
      glassOpacity:     { min: 0,   max: 1,  step: 0.01, label: 'Glass Opacity' },
      glassRoughness:   { min: 0,   max: 1,  step: 0.01, label: 'Glass Roughness' }
    };
  } else if (type === 'Floor') {
    paramConfig = {
      width:            { min: 4,   max: 200, step: 0.1, label: 'Width' },
      depth:            { min: 4,   max: 200, step: 0.1, label: 'Depth' },
      thickness:        { min: 0.1, max: 5,   step: 0.05, label: 'Thickness' },
      colorR:           { min: 0,   max: 1,   step: 0.01, label: 'Color R' },
      colorG:           { min: 0,   max: 1,   step: 0.01, label: 'Color G' },
      colorB:           { min: 0,   max: 1,   step: 0.01, label: 'Color B' },
      cornerRadius:     { min: 0,   max: Floor.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
      edgeRoundness:    { min: 0,   max: Floor.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
      edgeSmoothness:   { min: 1,   max: 12,  step: 1,    label: 'Edge Smoothness' },
      bulgeHeight:      { min: 0,   max: 2,   step: 0.01, label: 'Roof Bulge Height' },
      bulgeExponent:    { min: 0.5, max: 6,   step: 0.1,  label: 'Bulge Exponent' },
      hasSkylight:      { type: 'checkbox', label: 'Skylight Hole' },
      skylightW:        { min: 0.2, max: Math.max(0.2, p.width - 0.6),  step: 0.05, label: 'Skylight W' },
      skylightH:        { min: 0.2, max: Math.max(0.2, p.depth - 0.6),  step: 0.05, label: 'Skylight H' },
      skylightX:        { min: -p.width/2,  max: p.width/2,  step: 0.05, label: 'Skylight X' },
      skylightZ:        { min: -p.depth/2,  max: p.depth/2,  step: 0.05, label: 'Skylight Z' },
      skylightRadius:   { min: 0,   max: Math.min(p.skylightW||6, p.skylightH||6)/2, step: 0.05, label: 'Skylight Corner' },
      hasSkylightGlass: { type: 'checkbox', label: 'Skylight Glass' },
      glassOpacity:     { min: 0,   max: 1,   step: 0.01, label: 'Glass Opacity' },
      glassRoughness:   { min: 0,   max: 1,   step: 0.01, label: 'Glass Roughness' }
    };
  } else if (type === 'Pipe') {
    paramConfig = {
      length:          { min: 0.5, max: 80,   step: 0.1,  label: 'Length' },
      outerRadius:     { min: 0.02, max: 10,  step: 0.01, label: 'Outer Radius' },
      wallThickness:   { min: 0.002, max: Pipe.getMaxWall(p), step: 0.01, label: 'Wall Thickness' },
      radialSegments:  { min: 8,    max: 64,  step: 1,    label: 'Radial Segments' },

      hasElbow:        { type: 'checkbox', label: 'Has Elbow' },
      shoulderDeg:     { min: 0,    max: 180, step: 1,    label: 'Elbow Angle °' },
      elbowRadius:     { min: 0.2,  max: 20,  step: 0.05, label: 'Elbow Bend Radius' },
      elbowSegments:   { min: 8,    max: 64,  step: 1,    label: 'Elbow Segments' },
      elbowPlaneDeg:   { min: -180, max: 180, step: 1,    label: 'Elbow Plane °' },

      hasFlangeStart:  { type: 'checkbox', label: 'Flange at Start' },
      hasFlangeEnd:    { type: 'checkbox', label: 'Flange at End' },
      flangeRadius:    { min: 0.1, max: 20,  step: 0.05, label: 'Flange Radius' },
      flangeThickness: { min: 0.02,max: 2,   step: 0.01, label: 'Flange Thickness' },

      hasBolts:        { type: 'checkbox', label: 'Bolts on Flanges' },
      boltCount:       { min: 2,    max: 36,  step: 1,    label: 'Bolt Count' },
      boltRadius:      { min: 0.01, max: 0.5, step: 0.01, label: 'Bolt Radius' },
      boltHeight:      { min: 0.04, max: 1.5, step: 0.01, label: 'Bolt Height' },
      boltRingInset:   { min: 0.02, max: 2.0, step: 0.01, label: 'Bolt Ring Inset' }
    };
  } else if (type === 'Roof') {
    paramConfig = {
      width:            { min: 4,  max: 200, step: 0.1, label: 'Width' },
      depth:            { min: 4,  max: 200, step: 0.1, label: 'Depth' },
      overhang:         { min: 0,  max: 5,   step: 0.05, label: 'Overhang' },
      thickness:        { min: 0.1,max: 5,   step: 0.05, label: 'Thickness' },
      cornerRadius:     { min: 0,  max: Roof.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
      cornerSmoothness: { min: 8,  max: 64,  step: 1,    label: 'Corner Smoothness' },
      edgeRoundness:    { min: 0,  max: Roof.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
      edgeSmoothness:   { min: 1,  max: 12,  step: 1,    label: 'Edge Smoothness' },

      archHeight:       { min: 0,  max: 5,   step: 0.05, label: 'Arch Height' },
      archX:            { type:'checkbox', label: 'Curve X' },
      archZ:            { type:'checkbox', label: 'Curve Z' },

      hasSkylight:      { type:'checkbox', label: 'Skylight' },
      skylightWidth:    { min: 0.2, max: Math.max(0.2, (p.width||12)+(p.overhang||0)*2 - 0.6), step: 0.05, label: 'Skylight W' },
      skylightDepth:    { min: 0.2, max: Math.max(0.2, (p.depth||12)+(p.overhang||0)*2 - 0.6), step: 0.05, label: 'Skylight D' },
      skylightCornerRadius:{ min: 0, max: 10, step: 0.05, label: 'Skylight Corner' },

      glassOpacity:     { min: 0,  max: 1,   step: 0.01, label: 'Glass Opacity' },
      glassRoughness:   { min: 0,  max: 1,   step: 0.01, label: 'Glass Roughness' },

      hasRails:         { type:'checkbox', label: 'Rails' },
      railHeight:       { min: 0.2,max: 4,   step: 0.05, label: 'Rail Height' },
      railSpacing:      { min: 0.5,max: 5,   step: 0.1,  label: 'Rail Spacing' },

      hasVent:          { type:'checkbox', label: 'Vent' },
      hasAntenna:       { type:'checkbox', label: 'Antenna' },

      colorR:           { min: 0,  max: 1,   step: 0.01, label: 'Color R' },
      colorG:           { min: 0,  max: 1,   step: 0.01, label: 'Color G' },
      colorB:           { min: 0,  max: 1,   step: 0.01, label: 'Color B' }
    };
  } else if (type === 'TrussArm') {
    paramConfig = {
      length:        { min: 1, max: 100, step: 0.1, label: 'Length' },
      armWidth:      { min: 0.2, max: 10, step: 0.05, label: 'Arm Width' },
      armHeight:     { min: 0.2, max: 10, step: 0.05, label: 'Arm Height' },
      tubeRadius:    { min: 0.02, max: 1, step: 0.01, label: 'Tube Radius' },
      roundSegments: { min: 6, max: 64, step: 1, label: 'Round Segments' },
      segments:      { min: 1, max: 64, step: 1, label: 'Lattice Segments' },
      curve:         { min: 0, max: 10, step: 0.05, label: 'Midspan Rise' },
      hasEndJoint:   { type:'checkbox', label: 'End Joint' },
      jointRadius:   { min: 0, max: 2, step: 0.05, label: 'Joint Radius' }
    };
  // Added new types to Shape tab
  } else if (type === 'Cube') {
    paramConfig = {
      width: { min: 0.1, max: 50, step: 0.1, label: 'Width' },
      height: { min: 0.1, max: 50, step: 0.1, label: 'Height' },
      depth: { min: 0.1, max: 50, step: 0.1, label: 'Depth' },
      colorR: { min: 0, max: 1, step: 0.01, label: 'Color R' },
      colorG: { min: 0, max: 1, step: 0.01, label: 'Color G' },
      colorB: { min: 0, max: 1, step: 0.01, label: 'Color B' }
    };
  } else if (type === 'Sphere') {
    paramConfig = {
      radius: { min: 0.1, max: 50, step: 0.1, label: 'Radius' },
      segments: { min: 4, max: 64, step: 1, label: 'Segments' },
      colorR: { min: 0, max: 1, step: 0.01, label: 'Color R' },
      colorG: { min: 0, max: 1, step: 0.01, label: 'Color G' },
      colorB: { min: 0, max: 1, step: 0.01, label: 'Color B' }
    };
  } else if (type === 'Cylinder') {
    paramConfig = {
      radius: { min: 0.1, max: 50, step: 0.1, label: 'Radius' },
      height: { min: 0.1, max: 50, step: 0.1, label: 'Height' },
      radialSegments: { min: 3, max: 64, step: 1, label: 'Radial Segments' },
      colorR: { min: 0, max: 1, step: 0.01, label: 'Color R' },
      colorG: { min: 0, max: 1, step: 0.01, label: 'Color G' },
      colorB: { min: 0, max: 1, step: 0.01, label: 'Color B' }
    };
  } else {
    page.innerHTML = '<p class="text-gray-400">No shape parameters.</p>';
    return;
  }

  // Render controls
  const wrap = document.createElement('div');
  wrap.className = 'space-y-4';
  page.innerHTML = '';
  page.appendChild(wrap);

  Object.keys(paramConfig).forEach(key => {
    const cfg = paramConfig[key];
    if (cfg.type === 'checkbox') {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2';
      row.innerHTML = `<input type="checkbox" id="${key}-toggle" ${p[key] ? 'checked':''}><label for="${key}-toggle" class="text-sm font-medium">${cfg.label}</label>`;
      wrap.appendChild(row);
    } else {
      const value = (p[key] ?? cfg.min);
      const valueFmt = (cfg.step >= 1) ? Math.round(value) : Number(value).toFixed(2);
      const row = document.createElement('div');
      row.className = 'space-y-1';
      row.innerHTML = `
        <label class="text-sm font-medium flex justify-between items-center">
          <span>${cfg.label}</span>
          <input type="number" id="${key}-value" class="${numberInputClasses}" 
                 min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${valueFmt}">
        </label>
        <input type="range" id="${key}-slider" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${value}">
      `;
      wrap.appendChild(row);
    }
  });

  // Function to handle the actual parameter update and UI refresh
  const updateModelParams = () => {
    let next = { ...object.userData.params };
    
    // Read all values from number inputs
    wrap.querySelectorAll('input[type="number"]').forEach(number => {
      const key = number.id.replace('-value', '');
      if (paramConfig[key]) {
        next[key] = parseFloat(number.value);
      }
    });
    wrap.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      const key = checkbox.id.replace('-toggle', '');
      if (paramConfig[key]) {
        next[key] = checkbox.checked;
      }
    });

    // --- Re-run constraint logic ---
    // Corner Radius
    const crSlider = wrap.querySelector('#cornerRadius-slider');
    if (crSlider) {
      let maxCR = parseFloat(crSlider.max);
      if (type === 'TowerBase')      maxCR = TowerBase.getMaxCornerRadius(next);
      else if (type === 'DoubleDoor')maxCR = DoubleDoor.getMaxCornerRadius(next);
      else if (type === 'Window')    maxCR = WindowAsset.getMaxCornerRadius(next);
      else if (type === 'Floor')     maxCR = Floor.getMaxCornerRadius(next);
      else if (type === 'Roof')      maxCR = Roof.getMaxCornerRadius(next);
      crSlider.max = maxCR;
      if (next.cornerRadius > maxCR) {
        next.cornerRadius = maxCR;
      }
    }
    // Edge Roundness
    const erSlider = wrap.querySelector('#edgeRoundness-slider');
    if (erSlider) {
      let maxER = parseFloat(erSlider.max);
      if      (type === 'TowerBase') maxER = TowerBase.getMaxEdgeRoundness(next);
      else if (type === 'DoubleDoor')maxER = DoubleDoor.getMaxEdgeRoundness(next);
      else if (type === 'Window')    maxER = WindowAsset.getMaxEdgeRoundness(next);
      else if (type === 'Floor')     maxER = Floor.getMaxEdgeRoundness(next);
      else if (type === 'Roof')      maxER = Roof.getMaxEdgeRoundness(next);
      erSlider.max = maxER;
      if (next.edgeRoundness > maxER) {
        next.edgeRoundness = maxER;
      }
    }
    // Door Width (Tower only)
    const dwSlider = wrap.querySelector('#doorWidth-slider');
    if (dwSlider && type === 'TowerBase') {
      const maxDW = TowerBase.getMaxDoorWidth(next);
      dwSlider.max = maxDW;
      if (next.doorWidth > maxDW) {
        next.doorWidth = maxDW;
      }
    }
    // Pipe wallThickness
    if (type === 'Pipe') {
      const wtSlider = wrap.querySelector('#wallThickness-slider');
      if (wtSlider) {
        const maxWT = Pipe.getMaxWall(next);
        wtSlider.max = maxWT;
        if (next.wallThickness > maxWT) {
          next.wallThickness = maxWT;
        }
      }
    }
    // --- End constraint logic ---
    
    // Update the model
    object.updateParams(next);

    // Refresh UI values from the (potentially constrained) 'next' object
    Object.keys(paramConfig).forEach(key => {
      const cfg = paramConfig[key];
      if (cfg.type === 'checkbox') {
        const check = wrap.querySelector(`#${key}-toggle`);
        if (check) check.checked = next[key];
      } else {
        const slider = wrap.querySelector(`#${key}-slider`);
        const number = wrap.querySelector(`#${key}-value`);
        if (slider && number) {
          const val = next[key];
          const valFmt = (cfg.step >= 1) ? Math.round(val) : Number(val).toFixed(2);
          slider.value = val;
          number.value = valFmt;
        }
      }
    });
  };

  // Slider events
  wrap.querySelectorAll('input[type="range"]').forEach(slider => {
    const key = slider.id.replace('-slider', '');
    const cfg = paramConfig[key];
    const number = wrap.querySelector(`#${key}-value`);

    // On Drag: update number box
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      const valFmt = (cfg.step >= 1) ? Math.round(val) : val.toFixed(2);
      if (number) number.value = valFmt;
    });
    
    // On Mouse Up: trigger model rebuild
    slider.addEventListener('change', updateModelParams);
  });

  // Number input events
  wrap.querySelectorAll('input[type="number"]').forEach(number => {
    const key = number.id.replace('-value', '');
    const cfg = paramConfig[key];
    const slider = wrap.querySelector(`#${key}-slider`);

    const updateFromNumber = () => {
      let val = parseFloat(number.value);
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      if (isNaN(val)) val = min;
      val = Math.max(min, Math.min(max, val)); // Clamp
      
      const valFmt = (cfg.step >= 1) ? Math.round(val) : val.toFixed(2);
      number.value = valFmt;
      slider.value = val;
      
      updateModelParams(); // Trigger model rebuild
    };
    
    number.addEventListener('change', updateFromNumber); // On blur
    number.addEventListener('keydown', e => { // On Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        updateFromNumber();
        number.blur();
      }
    });
  });

  // Checkbox events
  wrap.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', updateModelParams); // Trigger model rebuild
  });
}

// ---------------- Textures tab ----------------
function buildTexturesTab(object, page) {
  const mats = collectMaterialsFromObject(object);
  const rep = mats[0] || {};
  const st = ensureTexState(object);
  const numberInputClasses = "w-20 text-right bg-gray-800 rounded px-2 py-0.5 text-sm";

  // Get current scalar values, fallback to state, then default
  const presetKey = st.activePreset || 'none';
  const preset = PRESET_TEXTURES[presetKey] || PRESET_TEXTURES['none'];
  const rough = ('roughness' in rep) ? rep.roughness : preset.roughnessScalar;
  const metal = ('metalness' in rep) ? rep.metalness : preset.metalnessScalar;

  // --- 1. HTML Generation ---
  page.innerHTML = `
    <div class="space-y-4">
      
      <div>
        <h4 class="text-sm font-bold mb-2">Preset Materials</h4>
        <div id="preset-scroller" class="flex overflow-x-auto gap-2 p-2 bg-gray-900 rounded-lg">
          </div>
      </div>
      
      <div>
        <label class="text-sm font-medium">Albedo (Color) Override
          <select id="albedo-override-select" class="block mt-1 w-full bg-gray-800 rounded p-2 text-sm">
            </select>
        </label>
      </div>
      
      <div class="mt-2 border-t border-white/10 pt-3">
        <h4 class="text-sm font-bold mb-2">Material Properties</h4>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-sm font-medium flex justify-between items-center">
              <span>Roughness</span>
              <input type="number" id="mat-rough-val" class="${numberInputClasses}" min="0" max="1" step="0.01" value="${rough.toFixed(2)}">
            </label>
            <input type="range" id="mat-rough-slider" min="0" max="1" step="0.01" value="${rough}">
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium flex justify-between items-center">
              <span>Metalness</span>
              <input type="number" id="mat-metal-val" class="${numberInputClasses}" min="0" max="1" step="0.01" value="${metal.toFixed(2)}">
            </label>
            <input type="range" id="mat-metal-slider" min="0" max="1" step="0.01" value="${metal}">
          </div>
        </div>
      </div>
      
      <div class="mt-2 border-t border-white/10 pt-3">
        <h4 class="text-sm font-bold mb-2">Tiling & Displacement</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-sm font-medium flex justify-between items-center">
              <span>UV Repeat</span>
              <input type="number" id="uv-scale-val" class="${numberInputClasses}" min="0.1" max="50" step="0.1" value="${st.uvScale.toFixed(1)}">
            </label>
            <input type="range" id="uv-scale-slider" min="0.1" max="50" step="0.1" value="${st.uvScale}">
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium flex justify-between items-center">
              <span>UV Rotation °</span>
              <input type="number" id="uv-rot-val" class="${numberInputClasses}" min="0" max="360" step="1" value="${Math.round(THREE.MathUtils.radToDeg(st.uvRotation || 0))}">
            </label>
            <input type="range" id="uv-rot-slider" min="0" max="360" step="1" value="${THREE.MathUtils.radToDeg(st.uvRotation || 0)}">
          </div>
        </div>
        <div class="mt-2 space-y-1">
          <label class="text-sm font-medium flex justify-between items-center">
            <span>Displacement Scale</span>
            <input type="number" id="disp-scale-val" class="${numberInputClasses}" min="0" max="1" step="0.01" value="${(st.displacementScale || 0).toFixed(2)}">
          </label>
          <input type="range" id="disp-scale-slider" min="0" max="1" step="0.01" value="${st.displacementScale || 0}">
        </div>
      </div>

      <div class="mt-3 border-t border-white/10 pt-3">
        <h4 class="text-sm font-bold mb-2">Manual PBR Upload (Overrides Presets)</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" id="pbr-grid"></div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button id="clear-all-pbr" class="px-3 py-2 rounded bg-red-600 text-sm">Clear All Textures</button>
        </div>
      </div>
    </div>
  `;

  // --- 2. Populate Presets ---
  const presetScroller = page.querySelector('#preset-scroller');
  for (const [key, preset] of Object.entries(PRESET_TEXTURES)) {
    const btn = document.createElement('button');
    btn.className = `flex-shrink-0 w-24 h-24 p-1.5 rounded-lg bg-gray-700 flex flex-col items-center justify-center gap-1
                     border-2 ${st.activePreset === key ? 'border-blue-500' : 'border-transparent'}`;
    btn.dataset.presetKey = key;
    
    if (preset.preview) {
      btn.innerHTML = `
        <img src="${preset.preview}" class="w-16 h-16 object-cover rounded-md pointer-events-none">
        <span class="text-xs font-medium pointer-events-none">${preset.name}</span>
      `;
    } else {
      btn.innerHTML = `
        <div class="w-16 h-16 rounded-md bg-gray-800 flex items-center justify-center text-gray-500">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
        </div>
        <span class="text-xs font-medium pointer-events-none">${preset.name}</span>
      `;
    }
    
    btn.addEventListener('click', () => {
      // Update UI selection state
      presetScroller.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500'));
      btn.classList.add('border-blue-500');
      // Apply the preset
      applyPreset(object, mats, key, page);
    });
    presetScroller.appendChild(btn);
  }

  // --- 3. Populate Albedo Override Dropdown ---
  const albedoSelect = page.querySelector('#albedo-override-select');
  for (const [key, preset] of Object.entries(PRESET_TEXTURES)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = preset.name + (preset.albedo ? ' Albedo' : ' (None)');
    if (key === st.activeAlbedo) {
      opt.selected = true;
    }
    albedoSelect.appendChild(opt);
  }
  albedoSelect.addEventListener('change', (e) => {
    applyAlbedoOverride(object, mats, e.target.value);
  });

  // --- 4. Link Sliders ---
  
  // Generic linker for simple slider/number pairs
  const linkSimple = (idBase, formatFn, updateFn) => {
    const slider = page.querySelector(`#${idBase}-slider`);
    const number = page.querySelector(`#${idBase}-val`);
    if (!slider || !number) return;
    
    let isManualEdit = false; // Flag to track manual edits

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      number.value = formatFn(val);
      isManualEdit = true; // Mark as manually edited
      updateFn(val);
    });
    
    // On mouseup (slider change end)
    slider.addEventListener('change', () => {
        if (isManualEdit) {
            st.activePreset = 'none'; // Manual edit breaks preset link
            st.activeAlbedo = 'none';
            presetScroller.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500'));
            isManualEdit = false;
        }
    });
    
    const updateFromNumber = () => {
      let val = parseFloat(number.value);
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      if (isNaN(val)) val = min;
      val = Math.max(min, Math.min(max, val)); // Clamp
      
      number.value = formatFn(val);
      slider.value = val;
      updateFn(val);
      
      // Manual number edit also breaks preset link
      st.activePreset = 'none';
      st.activeAlbedo = 'none';
      presetScroller.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500'));
    };
    
    number.addEventListener('change', updateFromNumber);
    number.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        updateFromNumber();
        number.blur();
      }
    });
  };

  const formatF2 = v => v.toFixed(2);
  const formatF1 = v => v.toFixed(1);
  const formatF0 = v => v.toFixed(0);

  // Link Roughness
  linkSimple('mat-rough', formatF2, v => {
    setMaterialScalar(mats, 'roughness', v);
  });
  
  // Link Metalness
  linkSimple('mat-metal', formatF2, v => {
    setMaterialScalar(mats, 'metalness', v);
  });

  // Link UV Scale & Rotation
  const syncUV = () => {
    const scale = parseFloat(page.querySelector('#uv-scale-slider').value);
    const rotDeg = parseFloat(page.querySelector('#uv-rot-slider').value);
    const rotRad = THREE.MathUtils.degToRad(rotDeg);
    st.uvScale = scale;
    st.uvRotation = rotRad;
    applyUVToAllMaps(mats, scale, rotRad);
  };
  linkSimple('uv-scale', formatF1, syncUV);
  linkSimple('uv-rot', formatF0, syncUV);

  // Link Displacement Scale
  linkSimple('disp-scale', formatF2, v => {
    st.displacementScale = v;
    setMaterialScalar(mats, 'displacementScale', v);
  });

  // --- 5. PBR Upload Rows ---
  const pbrGrid = page.querySelector('#pbr-grid');
  const makeUploadRow = (label, slotName) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 bg-gray-700 rounded px-2 py-2';
    row.innerHTML = `
      <span class="text-sm flex-1">${label}</span>
      <input type="file" id="file-${slotName}" class="hidden" accept="image/*">
      <button class="px-2 py-1 bg-gray-800 rounded text-sm" id="btn-${slotName}">Upload</button>
      <button class="px-2 py-1 bg-gray-800 rounded text-sm" id="clr-${slotName}">Clear</button>
    `;
    pbrGrid.appendChild(row);

    const btn = row.querySelector(`#btn-${slotName}`);
    const inp = row.querySelector(`#file-${slotName}`);
    const clr = row.querySelector(`#clr-${slotName}`);

    btn.addEventListener('click', () => inp.click());
    inp.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      
      // Clear preset selection on manual upload
      st.activePreset = 'none';
      st.activeAlbedo = 'none';
      presetScroller.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500'));
      albedoSelect.value = 'none';
      
      const scale = parseFloat(page.querySelector('#uv-scale-slider').value);
      const rot   = THREE.MathUtils.degToRad(parseFloat(page.querySelector('#uv-rot-slider').value));
      try {
        // isPreset is false by default
        await uploadMapFromFile({ object, materials: mats, file: f, slotName, uvScale: scale, uvRotation: rot });
      } catch (err) {
        console.error('Texture upload failed:', err);
      } finally {
        inp.value = '';
      }
    });
    clr.addEventListener('click', () => {
      clearOverrideSlot(object, mats, slotName);
      // Also clear preset state
      st.activePreset = 'none';
      st.activeAlbedo = 'none';
      presetScroller.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500'));
      albedoSelect.value = 'none';
    });
  };

  makeUploadRow('Albedo (Base Color)', 'albedo');
  makeUploadRow('Normal',             'normal');
  makeUploadRow('Roughness',          'roughness');
  makeUploadRow('Metalness',          'metalness');
  makeUploadRow('AO (Ambient Occlusion)', 'ao');
  makeUploadRow('Emissive',           'emissive');
  makeUploadRow('Height (Displacement)', 'height');

  // --- 6. Clear All ---
  page.querySelector('#clear-all-pbr').addEventListener('click', () => {
    clearAllOverrides(object, mats);
    // Also clear preset state and update UI
    st.activePreset = 'none';
    st.activeAlbedo = 'none';
    presetScroller.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500'));
    presetScroller.querySelector('button[data-preset-key="none"]').classList.add('border-blue-500');
    albedoSelect.value = 'none';
    
    const { roughnessScalar, metalnessScalar } = PRESET_TEXTURES['none'];
    page.querySelector('#mat-rough-slider').value = roughnessScalar;
    page.querySelector('#mat-rough-val').value = roughnessScalar.toFixed(2);
    page.querySelector('#mat-metal-slider').value = metalnessScalar;
    page.querySelector('#mat-metal-val').value = metalnessScalar.toFixed(2);
  });
}


// -----------------------------
// Properties Panel (TABBED)
// -----------------------------
function updatePropsPanel(object) {
  propsContent.innerHTML = '';
  if (!object) {
    propsContent.innerHTML = '<p class="text-gray-400">No selection.</p>';
    return;
  }
  makeTabs(propsContent, [
    { id: 'transform', label: 'Transform', build: (page) => buildTransformTab(object, page) },
    { id: 'shape',     label: 'Shape',     build: (page) => buildShapeTab(object, page) },
    { id: 'textures',  label: 'Textures',  build: (page) => buildTexturesTab(object, page) }
  ]);
}

// -----------------------------
// Start
// -----------------------------
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

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
window.addEventListener('unhandledrejection', (e) => {
  const msg = (e && e.reason && (e.reason.message || String(e.reason))) || 'Unhandled promise rejection';
  const box = document.getElementById('message-box');
  if (box) {
    document.getElementById('message-text').textContent = msg;
    box.classList.add('show');
    setTimeout(() => box.classList.remove('show'), 3500);
  }
  const ls = document.getElementById('loading-screen');
  if (ls) { ls.style.opacity = '0'; ls.style.display = 'none'; }
});
