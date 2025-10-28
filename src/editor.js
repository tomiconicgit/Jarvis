/*
File: src/editor.js
*/
// editor.js â renderer / scene / camera / controls / gizmo
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

const Editor = {
  init(container, bus){
    // renderer
    let renderer = createRenderer(container);
    renderer.domElement.addEventListener('wheel', e => e.preventDefault(), { passive:false });

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0c0f);

    const camera = new THREE.PerspectiveCamera(
      50,
      Math.max(1,container.clientWidth)/Math.max(1,container.clientHeight),
      0.1,
      5000
    );
    camera.position.set(28, 30, 44);

    // controls + gizmo
    let controls, gizmo;
    let zoomSlider = null; // <-- ADDED
    buildControls();

    // --- NEW: Zoom Slider ---
    zoomSlider = document.createElement('input');
    zoomSlider.type = 'range';
    zoomSlider.className = 'zoom-slider';
    zoomSlider.min = controls.minDistance;
    zoomSlider.max = controls.maxDistance;
    zoomSlider.step = 0.1;
    container.appendChild(zoomSlider);

    zoomSlider.addEventListener('input', (e) => {
      const newDist = parseFloat(e.target.value);
      const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, newDist);
    });
    // --- END NEW ---

    // lights (from Launch Tower)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x202028, .9));
    const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(30,60,40); scene.add(key);
    const rim = new THREE.DirectionalLight(0x99ccff, .5); rim.position.set(-40,50,-20); scene.add(rim);
    
    // grid
    const grid = new THREE.GridHelper(400, 200, 0x335, 0x224); grid.position.y = -0.01; scene.add(grid);

    // world root
    const world = new THREE.Group(); world.name = 'World'; scene.add(world);

    // selection highlighting
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
    let boxHelper = null;

    bus.on('selection-changed', (ent) => {
      if (boxHelper) { scene.remove(boxHelper); boxHelper.geometry?.dispose?.(); boxHelper = null; }
      if (ent) {
        boxHelper = new THREE.BoxHelper(ent.object, 0x4da3ff);
        scene.add(boxHelper);
        const { center, radius } = boundsOf(ent.object);
        controls.target.copy(center);
        clampZoomToRadius(radius); // This will update the slider's range
      }
    });

    container.addEventListener('pointerdown', e=>{
      if (gizmo.dragging || e.target !== renderer.domElement) return;
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX-rect.left)/rect.width)*2-1;
      pointer.y = -((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(world.children, true);

      let hitObject = hits[0]?.object;
      let entId = null;
      if (hitObject) {
        while (hitObject && hitObject !== world) {
          if (hitObject.userData.__entId) {
            entId = hitObject.userData.__entId;
            break;
          }
          hitObject = hitObject.parent;
        }
      }

      // --- *** THIS IS THE FIX *** ---
      // If we didn't hit anything (entId is null), just return.
      // This prevents deselection when clicking the background.
      if (entId === null) {
        return;
      }
      // --- *** END FIX *** ---

      bus.emit('select-entity-by-id', entId);
    });

    // view / gizmo events
    bus.on('frame-selection', (ent)=> ent && frame(ent.object));
    bus.on('set-grid-visible', (vis)=> grid.visible = !!vis);
    // bus.on('set-background', c=> { scene.background = new THREE.Color(c); }); // Removed: Dead code
    bus.on('set-fov', fov => { camera.fov = fov; camera.updateProjectionMatrix(); });
    bus.on('set-gizmo', mode=> gizmo.setMode(mode));
    bus.on('gizmo-attach', (obj)=> gizmo.attach(obj));
    bus.on('gizmo-detach', ()=> gizmo.detach());

    bus.on('toggle-object-wireframe', (ent)=>{
      if (!ent) return;
      let currentState = false; let foundMaterial = false;
      ent.object.traverse(child => {
        if (!foundMaterial && child.isMesh && child.material) {
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          if (mat) { currentState = mat.wireframe; foundMaterial = true; }
        }
      });
      if (!foundMaterial) return;
      const newState = !currentState;
      ent.object.traverse(child => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.wireframe = newState);
          } else {
            child.material.wireframe = newState;
          }
        }
      });
    });

    // sizing
    function onResize(){
      const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
      safeRender();
    }
    new ResizeObserver(onResize).observe(container);
    onResize();

    renderer.domElement.addEventListener('webglcontextlost', (e)=>{
      e.preventDefault(); rebuildRenderer();
    }, false);

    function safeRender(){ 
      try { 
        controls?.update(); 
        // --- ADDED: Update zoom slider value ---
        if (zoomSlider && controls) {
          const dist = camera.position.distanceTo(controls.target);
          // Only update if the distance is within the slider's current range
          if (dist >= parseFloat(zoomSlider.min) && dist <= parseFloat(zoomSlider.max)) {
            // Check if user is NOT dragging slider, to prevent fighting
            if (document.activeElement !== zoomSlider) {
              zoomSlider.value = dist;
            }
          }
        }
        // --- END ADDED ---
        renderer.render(scene, camera); 
      } catch(e){} 
    }
    renderer.setAnimationLoop(safeRender);

    function frame(obj){
      const { center, radius } = boundsOf(obj);
      controls.target.copy(center);
      const dist = Math.max(1, radius * 2.2 / Math.tan((camera.fov * Math.PI/180)/2));
      camera.position.copy(center).add(new THREE.Vector3(dist, dist*0.6, dist));
      camera.near = Math.max(0.01, radius * 0.02);
      camera.far  = Math.max(2000, radius * 200);
      camera.updateProjectionMatrix();
      clampZoomToRadius(radius); // This will update the slider's range
      if (boxHelper) boxHelper.update();
    }

    function buildControls(){
      controls?.dispose();
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.zoomSpeed = 0.35; controls.zoomToCursor = true;
      controls.enablePan = true; controls.panSpeed = 0.6; controls.rotateSpeed = 0.9;
      controls.maxPolarAngle = Math.PI * 0.95; // Allow slightly more rotation
      controls.minDistance = 0.5; controls.maxDistance = 500;
      controls.target.set(0, 25, 0); // From Launch Tower

      if (gizmo){ scene.remove(gizmo); }
      gizmo = new TransformControls(camera, renderer.domElement);
      gizmo.setSize(0.9);
      gizmo.addEventListener('change', ()=> safeRender());
      gizmo.addEventListener('dragging-changed', e=> controls.enabled = !e.value);
      gizmo.addEventListener('objectChange', ()=>{
        if (boxHelper) boxHelper.update();
        const obj = gizmo.object; if (!obj) return;
        const entId = obj.userData.__entId; if (!entId) return;
        
        // *** BUG FIX ***
        // Removed logic that moved the camera target on gizmo/slider change.
        // The camera target should only move on selection change or 'frame'.
        
        bus.emit('transform-changed-by-gizmo', { id: entId, object: obj }); 
        bus.emit('history-push-debounced', 'Transform');
      });
      scene.add(gizmo);
    }

    function rebuildRenderer(){
      const attached = gizmo?.object || null;
      renderer.setAnimationLoop(null);
      container.removeChild(renderer.domElement);
      renderer.dispose();
      renderer = createRenderer(container);
      renderer.domElement.addEventListener('wheel', e => e.preventDefault(), { passive:false });
      buildControls();
      if (attached) gizmo.attach(attached);
      onResize();
    }

    function clampZoomToRadius(radius){
      const min = Math.max(0.25, radius * 0.6);
      const max = Math.max(min + 5, radius * 40);
      controls.minDistance = min;
      controls.maxDistance = max;
      
      // --- ADDED: Update zoom slider range ---
      if (zoomSlider) {
        zoomSlider.min = min;
        zoomSlider.max = max;
      }
      // --- END ADDED ---
      
      camera.near = Math.max(0.01, radius * 0.02);
      camera.far  = Math.max(2000, radius * 200);
      camera.updateProjectionMatrix();
    }

    return {
      get scene(){ return scene; },
      get world(){ return world; },
      get camera(){ return camera; },
      get renderer(){ return renderer; },
      frame
    };
  }
};
export default Editor;

/* ---------- helpers ---------- */
function createRenderer(container){
  const r = new THREE.WebGLRenderer({ antialias:true, alpha:false, powerPreference:'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  r.setSize(Math.max(1,container.clientWidth), Math.max(1,container.clientHeight));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true;
  container.appendChild(r.domElement);
  return r;
}
function boundsOf(obj){
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
  return { center, radius };
}
