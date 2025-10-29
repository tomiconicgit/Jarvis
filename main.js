// --- Import Three.js and Controls ---
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

// --- Import our custom TowerBase Asset ---
import TowerBase from './towerbase.js';

// --- Global Variables ---
// 3D Scene
let scene, camera, renderer, orbitControls, transformControls;
let raycaster, touchStartPos, currentSelection;
let allModels = []; // Array to hold all selectable models

// UI Elements
let loadingScreen, canvasContainer, addBtn, addPanel, closeAddPanel;
let propsPanel, closePropsPanel, propsContent;
let addTowerDoorBtn, addTowerSolidBtn, toolsBtn;

// Touch/Tap Controls
let lastTapTime = 0;
const DOUBLE_TAP_DELAY = 300;

/**
 * Initializes the entire application.
 */
function init() {
  // --- Get UI Elements ---
  loadingScreen = document.getElementById('loading-screen');
  canvasContainer = document.getElementById('canvas-container');
  addBtn = document.getElementById('add-btn');
  toolsBtn = document.getElementById('tools-btn');
  addPanel = document.getElementById('add-panel');
  closeAddPanel = document.getElementById('close-add-panel');
  propsPanel = document.getElementById('props-panel');
  closePropsPanel = document.getElementById('close-props-panel');
  propsContent = document.getElementById('props-content');
  addTowerDoorBtn = document.getElementById('add-tower-door-btn');
  addTowerSolidBtn = document.getElementById('add-tower-solid-btn');

  // --- Scene Setup ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2a2a);
  scene.fog = new THREE.Fog(0x2a2a2a, 50, 200);

  // --- Renderer ---
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  canvasContainer.appendChild(renderer.domElement);

  // --- Camera ---
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(15, 20, 25);

  // --- Lights ---
  scene.add(new THREE.AmbientLight(0x808080));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(10, 20, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(dirLight);

  // --- Ground ---
  scene.add(new THREE.GridHelper(100, 100, 0x888888, 0x444444));
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- Controls ---
  orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.1;
  orbitControls.enablePan = true;

  transformControls = new THREE.TransformControls(camera, renderer.domElement);
  transformControls.setMode("translate");
  transformControls.addEventListener('dragging-changed', e => {
    orbitControls.enabled = !e.value;
  });
  // Update props panel when transform is done
  transformControls.addEventListener('mouseUp', () => {
    if (currentSelection) {
      updatePropsPanel(currentSelection);
    }
  });
  scene.add(transformControls);

  // --- Raycasting & Touch ---
  raycaster = new THREE.Raycaster();
  touchStartPos = new THREE.Vector2();

  // --- Event Listeners ---
  window.addEventListener('resize', onWindowResize);
  canvasContainer.addEventListener('touchstart', onTouchStart, { passive: false });
  canvasContainer.addEventListener('touchend', onTouchEnd);

  // --- Initialize UI Listeners ---
  initUI();

  // --- Hide Loading Screen ---
  loadingScreen.style.opacity = '0';
  setTimeout(() => loadingScreen.style.display = 'none', 500);

  // --- Start Render Loop ---
  animate();
}

/**
 * The main render loop.
 */
function animate() {
  requestAnimationFrame(animate);
  orbitControls.update();
  renderer.render(scene, camera);
}

// ----------------------------------------------------
// --- EVENT HANDLERS (Resize, Touch) ---
// ----------------------------------------------------

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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
    
    // Check if it was a tap (not a drag)
    if (touchStartPos.distanceTo(endPos) < 10) {
      const now = Date.now();
      if (now - lastTapTime < DOUBLE_TAP_DELAY) {
        handleDoubleTap(t);
      } else {
        handleSingleTap(t);
      }
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

// ----------------------------------------------------
// --- SELECTION & INTERACTION LOGIC ---
// ----------------------------------------------------

function handleSingleTap(t) {
  const ndc = getTouchNDC(t);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(allModels, true);

  if (hits.length) {
    let obj = hits[0].object;
    // Traverse up to find the main model group
    while (obj.parent && obj.parent.userData.isModel) {
      obj = obj.parent;
    }
    selectObject(obj);
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
    showTempMessage("Camera Focused");
  }
}

function selectObject(o) {
  if (currentSelection === o) return;
  currentSelection = o;
  transformControls.attach(o);
  updatePropsPanel(o); // Re-build the properties panel
  showPanel(propsPanel);
  hidePanel(addPanel);
}

function deselectAll() {
  if (currentSelection) {
    transformControls.detach();
  }
  currentSelection = null;
  hidePanel(propsPanel);
}

// ----------------------------------------------------
// --- UI & PANEL MANAGEMENT ---
// ----------------------------------------------------

function initUI() {
  // Main controls
  addBtn.addEventListener('click', () => { 
    showPanel(addPanel); 
    deselectAll(); // Close props panel if it's open
  });
  closeAddPanel.addEventListener('click', () => hidePanel(addPanel));
  closePropsPanel.addEventListener('click', () => deselectAll());
  
  // Tools button
  toolsBtn.addEventListener('click', () => {
    if (!currentSelection) {
      return showTempMessage("Select an object first");
    }
    const m = transformControls.getMode();
    transformControls.setMode(m === "translate" ? "rotate" : m === "rotate" ? "scale" : "translate");
    showTempMessage(`Mode: ${transformControls.getMode()[0].toUpperCase() + transformControls.getMode().slice(1)}`);
  });

  // --- Add Asset Buttons ---
  
  // Add Tower Base with door
  addTowerDoorBtn.addEventListener('click', () => {
    const params = {
      width: 12,
      depth: 12,
      height: 6,
      wallThickness: 1,
      cornerRadius: 1.2,
      edgeRoundness: 0.3,
      doorWidth: 4 // Has a door
    };
    const tower = new TowerBase(params);
    tower.position.y = params.height / 2;
    
    scene.add(tower);
    allModels.push(tower);
    selectObject(tower);
    hidePanel(addPanel);
  });
  
  // Add Tower Base (Solid)
  addTowerSolidBtn.addEventListener('click', () => {
    const params = {
      width: 10,
      depth: 10,
      height: 8,
      wallThickness: 1,
      cornerRadius: 1.0,
      edgeRoundness: 0.2,
      doorWidth: 0 // No door
    };
    const tower = new TowerBase(params);
    tower.position.y = params.height / 2;
    
    scene.add(tower);
    allModels.push(tower);
    selectObject(tower);
    hidePanel(addPanel);
  });
}

function showPanel(p) {
  p.style.visibility = 'visible';
  p.style.opacity = '1';
  p.style.transform = p.id.includes('props') ? 'translateX(0)' : 'translateY(0) translate(-50%, 0)';
  if (p.id.includes('add')) {
     p.style.transform = 'translateY(0)';
  }
}

function hidePanel(p) {
  p.style.opacity = '0';
  p.style.transform = p.id.includes('props') ? 'translateX(100%)' : 'translateY(100%)';
  if (p.id.includes('add')) {
     p.style.transform = 'translateY(100%)';
  }
  setTimeout(() => p.style.visibility = 'hidden', 300);
}

function showTempMessage(text) {
  const box = document.getElementById('message-box');
  document.getElementById('message-text').textContent = text;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 1500);
}

// ----------------------------------------------------
// --- DYNAMIC PROPERTIES PANEL ---
// ----------------------------------------------------

/**
 * Builds the sliders in the properties panel for the selected object.
 */
function updatePropsPanel(object) {
  propsContent.innerHTML = ''; // Clear old sliders
  
  if (!object || !object.userData.params || object.userData.type !== 'TowerBase') {
    propsContent.innerHTML = '<p class="text-gray-400">No parameters to edit.</p>';
    return;
  }
  
  const p = object.userData.params;
  
  // Define the sliders
  const paramConfig = {
    height:          { min: 1,   max: 40, step: 0.1, label: 'Height' },
    width:           { min: 4,   max: 60, step: 0.1, label: 'Width' },
    depth:           { min: 4,   max: 60, step: 0.1, label: 'Depth' },
    wallThickness:   { min: 0.1, max: 5,  step: 0.1, label: 'Wall Thickness' },
    cornerRadius:    { min: 0,   max: TowerBase.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
    cornerSmoothness:{ min: 8,   max: 64, step: 1,   label: 'Corner Smoothness' },
    edgeRoundness:   { min: 0,   max: TowerBase.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
    edgeSmoothness:  { min: 1,   max: 12, step: 1,   label: 'Edge Smoothness' },
    // Only show Door Width slider if the model is supposed to have a door
    ...(p.doorWidth > 0 && {
      doorWidth:     { min: 0.1, max: TowerBase.getMaxDoorWidth(p), step: 0.1, label: 'Door Width' }
    })
  };

  // Create HTML for each slider
  for (const key in paramConfig) {
    const cfg = paramConfig[key];
    // Update max values based on current params
    if (key === 'cornerRadius') cfg.max = TowerBase.getMaxCornerRadius(p);
    // -----------------------------------------------------------------
    // --- THIS IS THE FIX ---
    //
    if (key === 'edgeRoundness') cfg.max = TowerBase.getMaxEdgeRoundness(p); // Was TowerBackase
    //
    // -----------------------------------------------------------------
    if (key === 'doorWidth') cfg.max = TowerBase.getMaxDoorWidth(p);

    const value = (p[key] ?? cfg.min);
    const valueFmt = (cfg.step >= 1) ? Math.round(value) : value.toFixed(2);
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

  // Add event listeners to all new sliders
  propsContent.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener('input', () => {
      const key = slider.dataset.param;
      const cfg = paramConfig[key];
      const val = (cfg.step >= 1) ? Math.round(parseFloat(slider.value)) : parseFloat(slider.value);
      
      // Get current params and apply the change
      let next = { ...object.userData.params, [key]: val };

      // --- Dynamic Max Value Updates ---
      // If a base parameter changes, update the max of dependent sliders
      if (['width', 'depth', 'wallThickness', 'cornerRadius', 'height'].includes(key)) {
        
        // 1. Update Corner Radius Slider
        const crSlider = document.getElementById('cornerRadius-slider');
        if (crSlider) {
          const maxCR = TowerBase.getMaxCornerRadius(next);
          crSlider.max = maxCR;
          if (next.cornerRadius > maxCR) {
            next.cornerRadius = maxCR;
            crSlider.value = maxCR;
            document.getElementById('cornerRadius-value').textContent = maxCR.toFixed(2);
          }
        }
        
        // 2. Update Edge Roundness Slider
        const erSlider = document.getElementById('edgeRoundness-slider');
        if (erSlider) {
          const maxER = TowerBase.getMaxEdgeRoundness(next);
          erSlider.max = maxER;
          if (next.edgeRoundness > maxER) {
            next.edgeRoundness = maxER;
            erSlider.value = maxER;
            document.getElementById('edgeRoundness-value').textContent = maxER.toFixed(2);
          }
        }

        // 3. Update Door Width Slider
        const dwSlider = document.getElementById('doorWidth-slider');
        if (dwSlider) {
          const maxDW = TowerBase.getMaxDoorWidth(next);
          dwSlider.max = maxDW;
          if (next.doorWidth > maxDW) {
            next.doorWidth = maxDW;
            dwSlider.value = maxDW;
            document.getElementById('doorWidth-value').textContent = maxDW.toFixed(2);
          }
        }
      }

      // Update the label for the slider being moved
      const lbl = document.getElementById(`${key}-value`);
      if (lbl) lbl.textContent = (cfg.step >= 1) ? Math.round(val) : val.toFixed(2);
      
      // Finally, apply all changes and rebuild the mesh
      object.updateParams(next);
    });
  });
}

// --- Start the application ---
init();
