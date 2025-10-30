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
let addTowerDoorBtn, addTowerSolidBtn, addDoubleDoorBtn, addWindowBtn, addFloorBtn, addPipeBtn, addTrussArmBtn;
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

// Name counters
const nameCounts = {};
function assignDefaultName(obj) {
  const base = obj.userData?.type || 'Object';
  nameCounts[base] = (nameCounts[base] || 0) + 1;
  obj.userData.label = `${base} #${nameCounts[base]}`;
}

// Builders map for loader
const BUILDERS = {
  TowerBase,
  DoubleDoor,
  Window: WindowAsset,
  Floor,
  Pipe,
  Roof,
  TrussArm
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
  addTrussArmBtn  = document.getElementById('add-trussarm-btn');

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
  scene.fog = new THREE.Fog(0x2a2a2a, 50, 200);

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
function togglePanel(panel, toHide = []) {
  if (!panel) return;
  if (panel.style.visibility === 'visible') hidePanel(panel);
  else {
    toHide.forEach(hidePanel);
    showPanel(panel);
  }
}

function initUI() {
  // FILE
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
      loadFromJSON(json, BUILDERS, scene, allModels, (o) => {
        if (!o.userData.label) assignDefaultName(o);
      });
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

  // Scene
  sceneBtn.addEventListener('click', () => {
    refreshSceneList();
    togglePanel(scenePanel, [filePanel, addPanel, parentPanel, propsPanel, exportPanel]);
  });
  closeScenePanel.addEventListener('click', () => hidePanel(scenePanel));

  // Parenting
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

  // NEW: Truss Arm
  addTrussArmBtn.addEventListener('click', () => {
    const p = new TrussArm({
      length: 12, armWidth: 3, armHeight: 2.2, tubeRadius: 0.12,
      segments: 8, roundSegments: 14, curve: 0.4, hasEndJoint: true, jointRadius: 0.4
    });
    p.position.y = 1.2;
    assignDefaultName(p);
    scene.add(p); allModels.push(p);
    refreshSceneList(); selectObject(p); hidePanel(addPanel);
  });
}

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
// Duplicate / Delete helpers
// -----------------------------
function duplicateModel(src) {
  let copy;
  const type = src.userData?.type || 'Object';
  const params = { ...(src.userData?.params || {}) };

  switch (type) {
    case 'TowerBase': copy = new TowerBase(params); break;
    case 'DoubleDoor': copy = new DoubleDoor(params); break;
    case 'Window': copy = new WindowAsset(params); break;
    case 'Floor': copy = new Floor(params); break;
    case 'Pipe': copy = new Pipe(params); break;
    case 'Roof': copy = new Roof(params); break;
    case 'TrussArm': copy = new TrussArm(params); break;
    default:
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

// Materials collect + UV helpers
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

function makeCheckerTexture(size = 256, cells = 8) {
  const data = new Uint8Array(size * size * 3);
  const cellSize = size / cells;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.floor(x / cellSize), cy = Math.floor(y / cellSize);
      const v = (cx + cy) % 2 === 0 ? 220 : 40;
      const i = (y * size + x) * 3;
      data[i] = data[i+1] = data[i+2] = v;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function makeNoiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 3);
  for (let i = 0; i < data.length; i += 3) {
    const v = (Math.random() * 255) | 0;
    data[i] = data[i+1] = data[i+2] = v;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

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
    apply(m.map); apply(m.normalMap); apply(m.roughnessMap); apply(m.metalnessMap);
    apply(m.aoMap); apply(m.emissiveMap); apply(m.bumpMap); apply(m.displacementMap);
  });
}
function setMaterialScalar(materials, key, value) {
  materials.forEach(m => { if (key in m) { m[key] = value; m.needsUpdate = true; } });
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

function applyProceduralMaps(materials, { pattern = 'none', scale = 1, useAlbedo = true, useRoughness = false, useMetalness = false, useBump = false, useAO = false }, locks = {}) {
  let tex = null;
  if (pattern === 'checker') tex = makeCheckerTexture(256, 8);
  if (pattern === 'noise')   tex = makeNoiseTexture(256);
  if (tex) tex.repeat.set(scale, scale);

  const setIfFree = (slot, value) => {
    if (locks[slot]) return;
    materials.forEach(m => { m[slot] = value || null; m.needsUpdate = true; });
  };

  setIfFree('map',         useAlbedo   ? tex : null);
  setIfFree('roughnessMap',useRoughness? tex : null);
  setIfFree('metalnessMap',useMetalness? tex : null);
  setIfFree('bumpMap',     useBump     ? tex : null);
  setIfFree('aoMap',       useAO       ? tex : null);
}

const MAP_SLOTS = {
  albedo:   { prop: 'map',             color: true  },
  normal:   { prop: 'normalMap',       color: false },
  roughness:{ prop: 'roughnessMap',    color: false },
  metalness:{ prop: 'metalnessMap',    color: false },
  ao:       { prop: 'aoMap',           color: false },
  emissive: { prop: 'emissiveMap',     color: true  },
  height:   { prop: 'displacementMap', color: false }
};

function ensureTexState(object) {
  if (!object.userData._texOverrides) object.userData._texOverrides = {
    map: null, normalMap: null, roughnessMap: null, metalnessMap: null,
    aoMap: null, emissiveMap: null, displacementMap: null,
    uvScale: 1, uvRotation: 0, displacementScale: 0.0
  };
  return object.userData._texOverrides;
}

function uploadMapFromFile({ object, materials, file, slotName, uvScale = 1, uvRotation = 0 }) {
  return new Promise((resolve, reject) => {
    const slot = MAP_SLOTS[slotName];
    if (!slot) return reject(new Error('Unknown map slot'));

    const url = URL.createObjectURL(file);
    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
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

        if (typeof renderer?.capabilities?.getMaxAnisotropy === 'function') {
          tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        }

        materials.forEach(m => { m[slot.prop] = tex; m.needsUpdate = true; });

        const st = ensureTexState(object);
        if (st[slot.prop] && st[slot.prop] !== tex) { st[slot.prop].dispose?.(); }
        st[slot.prop] = tex;
        st.uvScale = uvScale;
        st.uvRotation = uvRotation;

        URL.revokeObjectURL(url);
        resolve();
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    }, undefined, (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    });
  });
}
function clearOverrideSlot(object, materials, slotName) {
  const slot = MAP_SLOTS[slotName];
  const st = ensureTexState(object);
  const tex = st[slot.prop];
  if (tex) tex.dispose?.();
  st[slot.prop] = null;
  materials.forEach(m => { m[slot.prop] = null; m.needsUpdate = true; });
}
function clearAllOverrides(object, materials) {
  const st = ensureTexState(object);
  ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','displacementMap'].forEach(k => {
    if (st[k]) st[k].dispose?.();
    st[k] = null;
  });
  materials.forEach(m => {
    m.map = m.normalMap = m.roughnessMap = m.metalnessMap = m.aoMap = m.emissiveMap = m.displacementMap = null;
    m.needsUpdate = true;
  });
}

// ---------------- Transform tab ----------------
function buildTransformTab(object, page) {
  const toRow = (id, label, min, max, step, value) => `
    <div class="space-y-1">
      <label class="text-sm font-medium flex justify-between">
        <span>${label}</span><span id="${id}-val">${value}</span>
      </label>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">
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
  const setLbl = (id, v) => page.querySelector(`#${id}-val`).textContent = (typeof v === 'number' ? v.toFixed(2) : v);
  const link = (id, fn) => page.querySelector('#'+id).addEventListener('input', e => { fn(parseFloat(e.target.value)); setLbl(id, parseFloat(e.target.value)); if (transformControls) transformControls.update(); });
  link('tx', v => object.position.x = v);
  link('ty', v => object.position.y = v);
  link('tz', v => object.position.z = v);
  link('rx', v => object.rotation.x = THREE.MathUtils.degToRad(v));
  link('ry', v => object.rotation.y = THREE.MathUtils.degToRad(v));
  link('rz', v => object.rotation.z = THREE.MathUtils.degToRad(v));
  link('sx', v => object.scale.x = v);
  link('sy', v => object.scale.y = v);
  link('sz', v => object.scale.z = v);
  page.querySelector('#reset-pos').addEventListener('click', () => { object.position.set(0,0,0); ['tx','ty','tz'].forEach(id=>{page.querySelector('#'+id).value=0; setLbl(id,0);}); });
  page.querySelector('#reset-rot').addEventListener('click', () => { object.rotation.set(0,0,0); ['rx','ry','rz'].forEach(id=>{page.querySelector('#'+id).value=0; setLbl(id,0);}); });
  page.querySelector('#reset-scl').addEventListener('click', () => { object.scale.set(1,1,1); ['sx','sy','sz'].forEach(id=>{page.querySelector('#'+id).value=1; setLbl(id,1);}); });
}

// ---------------- Shape tab (per-type params) ----------------
function buildShapeTab(object, page) {
  const type = object.userData.type;
  const p = object.userData.params || {};
  let paramConfig = {};

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
        <label class="text-sm font-medium flex justify-between">
          <span>${cfg.label}</span><span id="${key}-value">${valueFmt}</span>
        </label>
        <input type="range" id="${key}-slider" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${value}">
      `;
      wrap.appendChild(row);
    }
  });

  // Slider events
  wrap.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener('input', () => {
      const key = slider.id.replace('-slider', '');
      const cfg = paramConfig[key];
      const val = (cfg.step >= 1) ? Math.round(parseFloat(slider.value)) : parseFloat(slider.value);
      let next = { ...object.userData.params, [key]: val };

      // Recompute dependent limits if footprint changes
      if (['totalWidth','width','depth','frameThickness','wallThickness','cornerRadius','height','outerRadius','overhang','thickness'].includes(key)) {
        const crSlider = wrap.querySelector('#cornerRadius-slider');
        if (crSlider) {
          let maxCR = crSlider.max;
          if (object.userData.type === 'TowerBase')      maxCR = TowerBase.getMaxCornerRadius(next);
          else if (object.userData.type === 'DoubleDoor')maxCR = DoubleDoor.getMaxCornerRadius(next);
          else if (object.userData.type === 'Window')    maxCR = WindowAsset.getMaxCornerRadius(next);
          else if (object.userData.type === 'Floor')     maxCR = Floor.getMaxCornerRadius(next);
          else if (object.userData.type === 'Roof')      maxCR = Roof.getMaxCornerRadius(next);
          crSlider.max = maxCR;
          if (next.cornerRadius > maxCR) {
            next.cornerRadius = maxCR;
            crSlider.value = maxCR;
            const v = (paramConfig.cornerRadius.step >= 1) ? Math.round(maxCR) : Number(maxCR).toFixed(2);
            wrap.querySelector('#cornerRadius-value').textContent = v;
          }
        }
        const erSlider = wrap.querySelector('#edgeRoundness-slider');
        if (erSlider) {
          let maxER = erSlider.max;
          if      (object.userData.type === 'TowerBase') maxER = TowerBase.getMaxEdgeRoundness(next);
          else if (object.userData.type === 'DoubleDoor')maxER = DoubleDoor.getMaxEdgeRoundness(next);
          else if (object.userData.type === 'Window')    maxER = WindowAsset.getMaxEdgeRoundness(next);
          else if (object.userData.type === 'Floor')     maxER = Floor.getMaxEdgeRoundness(next);
          else if (object.userData.type === 'Roof')      maxER = Roof.getMaxEdgeRoundness(next);
          erSlider.max = maxER;
          if (next.edgeRoundness > maxER) {
            next.edgeRoundness = maxER;
            erSlider.value = maxER;
            const v = (paramConfig.edgeRoundness.step >= 1) ? Math.round(maxER) : Number(maxER).toFixed(2);
            wrap.querySelector('#edgeRoundness-value').textContent = v;
          }
        }
        const dwSlider = wrap.querySelector('#doorWidth-slider');
        if (dwSlider && object.userData.type === 'TowerBase') {
          const maxDW = TowerBase.getMaxDoorWidth(next);
          dwSlider.max = maxDW;
          if (next.doorWidth > maxDW) {
            next.doorWidth = maxDW;
            dwSlider.value = maxDW;
            const v = (paramConfig.doorWidth.step >= 1) ? Math.round(maxDW) : Number(maxDW).toFixed(2);
            wrap.querySelector('#doorWidth-value').textContent = v;
          }
        }
      }

      const lbl = wrap.querySelector(`#${key}-value`);
      if (lbl) lbl.textContent = (cfg.step >= 1) ? Math.round(val) : val.toFixed(2);

      object.updateParams(next);
    });
  });

  // Checkbox events
  wrap.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const key = checkbox.id.replace('-toggle','');
      const val = checkbox.checked;
      let next = { ...object.userData.params, [key]: val };
      object.updateParams(next);
    });
  });
}

// ---------------- Textures tab ----------------
function buildTexturesTab(object, page) {
  const mats = collectMaterialsFromObject(object);
  const rep = mats[0] || {};
  const st = ensureTexState(object);

  const colorHex    = rep?.color ? `#${rep.color.getHexString()}` : '#cccccc';
  const emissiveHex = rep?.emissive ? `#${rep.emissive.getHexString()}` : '#000000';
  const rough = ('roughness' in rep) ? rep.roughness : 0.8;
  const metal = ('metalness' in rep) ? rep.metalness : 0.1;
  const emisI = ('emissiveIntensity' in rep) ? rep.emissiveIntensity : 0.0;

  page.innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">Base Color
          <input type="color" id="mat-color" class="block mt-1 w-full h-9 bg-gray-800 border-0 rounded" value="${colorHex}">
        </label>
        <label class="text-sm font-medium">Emissive
          <input type="color" id="mat-emissive" class="block mt-1 w-full h-9 bg-gray-800 border-0 rounded" value="${emissiveHex}">
        </label>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-medium flex justify-between"><span>Roughness</span><span id="rough-val">${rough.toFixed(2)}</span></label>
          <input type="range" id="mat-rough" min="0" max="1" step="0.01" value="${rough}">
        </div>
        <div>
          <label class="text-sm font-medium flex justify-between"><span>Metalness</span><span id="metal-val">${metal.toFixed(2)}</span></label>
          <input type="range" id="mat-metal" min="0" max="1" step="0.01" value="${metal}">
        </div>
      </div>
      <div>
        <label class="text-sm font-medium flex justify-between"><span>Emissive Intensity</span><span id="emi-val">${emisI.toFixed(2)}</span></label>
        <input type="range" id="mat-emi" min="0" max="10" step="0.05" value="${emisI}">
      </div>

      <div class="mt-2 border-t border-white/10 pt-3">
        <div class="grid grid-cols-2 gap-3">
          <label class="text-sm font-medium">Pattern
            <select id="tex-pattern" class="block mt-1 w-full bg-gray-800 rounded p-2">
              <option value="none">None</option>
              <option value="checker">Checker</option>
              <option value="noise">Noise</option>
            </select>
          </label>
          <label class="text-sm font-medium">Scale
            <input type="range" id="tex-scale" min="0.25" max="8" step="0.25" value="${st.uvScale || 1}">
          </label>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
          <label class="flex items-center gap-2"><input type="checkbox" id="use-albedo" checked> Albedo (Color)</label>
          <label class="flex items-center gap-2"><input type="checkbox" id="use-rough"> Roughness Map</label>
          <label class="flex items-center gap-2"><input type="checkbox" id="use-metal"> Metalness Map</label>
          <label class="flex items-center gap-2"><input type="checkbox" id="use-bump"> Bump (Normal-ish)</label>
          <label class="flex items-center gap-2"><input type="checkbox" id="use-ao"> AO Map</label>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button id="apply-tex" class="px-3 py-2 rounded bg-blue-600 font-semibold">Apply Procedural</button>
          <button id="clear-proc" class="px-3 py-2 rounded bg-gray-700">Clear Procedural (Unlocked)</button>
        </div>
      </div>

      <div class="mt-3 border-t border-white/10 pt-3">
        <h4 class="text-sm font-bold mb-2">Upload PBR Maps (overrides per-slot)</h4>
        <div class="grid grid-cols-2 gap-2" id="pbr-grid"></div>
        <div class="mt-2 grid grid-cols-2 gap-3">
          <label class="text-sm font-medium">UV Repeat
            <input type="range" id="uv-scale" min="0.25" max="8" step="0.25" value="${st.uvScale || 1}">
          </label>
          <label class="text-sm font-medium">UV Rotation°
            <input type="range" id="uv-rot" min="0" max="360" step="1" value="${THREE.MathUtils.radToDeg(st.uvRotation || 0)}">
          </label>
        </div>
        <div class="mt-2">
          <label class="text-sm font-medium flex justify-between"><span>Displacement Scale</span><span id="disp-val">${(st.displacementScale || 0).toFixed(2)}</span></label>
          <input type="range" id="disp-scale" min="0" max="1" step="0.01" value="${st.displacementScale || 0}">
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button id="clear-all-pbr" class="px-3 py-2 rounded bg-red-600">Clear All PBR Maps</button>
        </div>
      </div>
    </div>
  `;

  page.querySelector('#mat-color').addEventListener('input', e => setMaterialColor(mats, e.target.value));
  page.querySelector('#mat-emissive').addEventListener('input', e => setEmissive(mats, e.target.value, parseFloat(page.querySelector('#mat-emi').value)));
  page.querySelector('#mat-rough').addEventListener('input', e => { const v=parseFloat(e.target.value); setMaterialScalar(mats,'roughness',v); page.querySelector('#rough-val').textContent=v.toFixed(2); });
  page.querySelector('#mat-metal').addEventListener('input', e => { const v=parseFloat(e.target.value); setMaterialScalar(mats,'metalness',v); page.querySelector('#metal-val').textContent=v.toFixed(2); });
  page.querySelector('#mat-emi').addEventListener('input',   e => { const v=parseFloat(e.target.value); setEmissive(mats, page.querySelector('#mat-emissive').value, v); page.querySelector('#emi-val').textContent=v.toFixed(2); });

  const st = ensureTexState(object);
  const procApply = () => {
    const pattern = page.querySelector('#tex-pattern').value;
    const scale   = parseFloat(page.querySelector('#tex-scale').value);
    const locks = {
      map:         !!st.map,
      roughnessMap:!!st.roughnessMap,
      metalnessMap:!!st.metalnessMap,
      bumpMap:     false,
      aoMap:       !!st.aoMap
    };
    applyProceduralMaps(
      mats,
      {
        pattern,
        scale,
        useAlbedo:   page.querySelector('#use-albedo').checked,
        useRoughness:page.querySelector('#use-rough').checked,
        useMetalness:page.querySelector('#use-metal').checked,
        useBump:     page.querySelector('#use-bump').checked,
        useAO:       page.querySelector('#use-ao').checked
      },
      locks
    );
    st.uvScale = scale;
    applyUVToAllMaps(mats, st.uvScale, st.uvRotation || 0);
  };
  page.querySelector('#apply-tex').addEventListener('click', procApply);
  page.querySelector('#clear-proc').addEventListener('click', () => {
    if (!st.map)         mats.forEach(m=> m.map=null);
    if (!st.roughnessMap)mats.forEach(m=> m.roughnessMap=null);
    if (!st.metalnessMap)mats.forEach(m=> m.metalnessMap=null);
    if (!st.aoMap)       mats.forEach(m=> m.aoMap=null);
    mats.forEach(m=> m.needsUpdate=true);
  });

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
      const scale = parseFloat(page.querySelector('#uv-scale').value);
      const rot   = THREE.MathUtils.degToRad(parseFloat(page.querySelector('#uv-rot').value));
      try {
        await uploadMapFromFile({ object, materials: mats, file: f, slotName, uvScale: scale, uvRotation: rot });
        applyUVToAllMaps(mats, scale, rot);
      } catch (err) {
        console.error('Texture upload failed:', err);
      } finally {
        inp.value = '';
      }
    });
    clr.addEventListener('click', () => clearOverrideSlot(object, mats, slotName));
  };

  makeUploadRow('Albedo (Base Color)', 'albedo');
  makeUploadRow('Normal',             'normal');
  makeUploadRow('Roughness',          'roughness');
  makeUploadRow('Metalness',          'metalness');
  makeUploadRow('AO (Ambient Occlusion)', 'ao');
  makeUploadRow('Emissive',           'emissive');
  makeUploadRow('Height (Displacement)', 'height');

  const uvScaleEl = page.querySelector('#uv-scale');
  const uvRotEl   = page.querySelector('#uv-rot');
  const syncUV = () => {
    const scale = parseFloat(uvScaleEl.value);
    const rot   = THREE.MathUtils.degToRad(parseFloat(uvRotEl.value));
    st.uvScale = scale;
    st.uvRotation = rot;
    applyUVToAllMaps(mats, scale, rot);
  };
  uvScaleEl.addEventListener('input', syncUV);
  uvRotEl.addEventListener('input', syncUV);

  const dispEl = page.querySelector('#disp-scale');
  const dispLbl = page.querySelector('#disp-val');
  dispEl.addEventListener('input', () => {
    const v = parseFloat(dispEl.value);
    st.displacementScale = v;
    setMaterialScalar(mats, 'displacementScale', v);
    dispLbl.textContent = v.toFixed(2);
  });
  setMaterialScalar(mats, 'displacementScale', st.displacementScale || 0);

  page.querySelector('#clear-all-pbr').addEventListener('click', () => {
    clearAllOverrides(object, mats);
  });
}

// -----------------------------
// Properties Panel
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

window.addEventListener('error', (e) => {
  const msg = e?.error?.message || e.message || 'Unknown error';
  const box = document.getElementById('message-box');
  if (box) {
    document.getElementById('message-text').textContent = msg;
    box.classList.add('show');
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
  }
  const ls = document.getElementById('loading-screen');
  if (ls) { ls.style.opacity = '0'; ls.style.display = 'none'; }
});