// editor.js — renderer / scene / camera / controls / selection / lighting / grid
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
    camera.position.set(12, 10, 16);

    // controls + gizmo
    let controls, gizmo;
    buildControls();

    // lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x171a1f, 0.6);
    const key  = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(10,20,12); key.castShadow = true;
    const rim  = new THREE.DirectionalLight(0x88bbff, 0.5); rim.position.set(-18,18,-10);
    scene.add(hemi, key, rim);

    // grid + ground
    const grid = new THREE.GridHelper(400, 400, 0x334, 0x223);
    grid.position.y = 0; scene.add(grid);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400,400),
      new THREE.MeshStandardMaterial({ color:0x111315, roughness:1 })
    );
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);

    // world root
    const world = new THREE.Group(); world.name = 'World'; scene.add(world);

    // selection
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
    let selected = null; let boxHelper = null;

    function setSelected(obj){
      if (selected === obj) return;
      selected = obj;

      if (boxHelper) { scene.remove(boxHelper); boxHelper.geometry?.dispose?.(); boxHelper = null; }
      if (selected) {
        boxHelper = new THREE.BoxHelper(selected, 0x4da3ff);
        scene.add(boxHelper);
        const { center, radius } = boundsOf(selected);
        controls.target.copy(center);
        clampZoomToRadius(radius);
      }
      bus.emit('selection-changed', selected);
    }

    container.addEventListener('pointerdown', e=>{
      if (gizmo.dragging) return;
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX-rect.left)/rect.width)*2-1;
      pointer.y = -((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(world.children, true);

      let hitObject = hits[0]?.object;
      if (hitObject) {
        while (hitObject.parent && hitObject.parent !== world) hitObject = hitObject.parent;
        setSelected(hitObject.parent === world ? hitObject : null);
      } else {
        setSelected(null);
      }
    });

    // view / gizmo events
    bus.on('frame-selection', ()=> selected && frame(selected));
    bus.on('toggle-grid', ()=> grid.visible = !grid.visible);
    bus.on('set-background', c=> { scene.background = new THREE.Color(c); });
    bus.on('set-lighting', name=> applyLightingPreset(name, { hemi, key, rim, scene }));
    bus.on('set-gizmo', mode=> gizmo.setMode(mode));
    bus.on('attach-selected', ()=> selected ? gizmo.attach(selected) : gizmo.detach());
    bus.on('detach-gizmo', ()=> gizmo.detach());

    // transforms from outside UI
    bus.on('transform-update', t=>{
      if (!selected) return;
      if (t.position){ selected.position.set(t.position.x, t.position.y, t.position.z); }
      if (t.rotation){ selected.rotation.set(
        THREE.MathUtils.degToRad(t.rotation.x),
        THREE.MathUtils.degToRad(t.rotation.y),
        THREE.MathUtils.degToRad(t.rotation.z)
      ); }
      if (t.scale){
        if (t.scale.uniform != null){ selected.scale.setScalar(t.scale.uniform); }
        else { selected.scale.set(t.scale.x, t.scale.y, t.scale.z); }
      }
      if (boxHelper) boxHelper.update();
      const { center, radius } = boundsOf(selected);
      controls.target.copy(center);
      clampZoomToRadius(radius);
      gizmo.attach(selected);
      bus.emit('transform-changed', selected);
      bus.emit('history-push-debounced', 'Transform');
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
    const ro = new ResizeObserver(onResize); ro.observe(container);
    window.addEventListener('orientationchange', onResize, { passive:true });
    window.addEventListener('resize', onResize, { passive:true });

    renderer.domElement.addEventListener('webglcontextlost', (e)=>{
      e.preventDefault(); rebuildRenderer();
    }, false);

    function safeRender(){ try { controls?.update(); renderer.render(scene, camera); } catch(e){} }
    renderer.setAnimationLoop(safeRender);

    function frame(obj){
      const { center, radius } = boundsOf(obj);
      controls.target.copy(center);
      const dist = Math.max(1, radius * 2.2 / Math.tan((camera.fov * Math.PI/180)/2));
      camera.position.copy(center).add(new THREE.Vector3(dist, dist*0.6, dist));
      camera.near = Math.max(0.01, radius * 0.02);
      camera.far  = Math.max(2000, radius * 200);
      camera.updateProjectionMatrix();
      clampZoomToRadius(radius);
      if (boxHelper) boxHelper.update();
    }

    function buildControls(){
      controls?.dispose();
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.zoomSpeed = 0.35; controls.zoomToCursor = true;
      controls.enablePan = true; controls.panSpeed = 0.6; controls.rotateSpeed = 0.9;
      controls.maxPolarAngle = Math.PI * 0.499; controls.minDistance = 0.5; controls.maxDistance = 500;

      if (gizmo){ scene.remove(gizmo); }
      gizmo = new TransformControls(camera, renderer.domElement);
      gizmo.setSize(0.9);
      gizmo.addEventListener('change', ()=> safeRender());
      gizmo.addEventListener('dragging-changed', e=> controls.enabled = !e.value);
      gizmo.addEventListener('objectChange', ()=>{
        if (boxHelper) boxHelper.update();
        const { center, radius } = boundsOf(gizmo.object);
        controls.target.copy(center);
        clampZoomToRadius(radius);
        bus.emit('transform-changed', selected);
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
      camera.near = Math.max(0.01, radius * 0.02);
      camera.far  = Math.max(2000, radius * 200);
      camera.updateProjectionMatrix();
    }

    return {
      get scene(){ return scene; },
      get world(){ return world; },
      get selected(){ return selected; },
      get camera(){ return camera; },
      get renderer(){ return renderer; },
      setSelected, frame,
      listObjects(){ return world.children.slice(); }
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
function applyLightingPreset(name, {hemi, key, rim, scene}){
  if (name==='Night'){ scene.background.set(0x06070a); hemi.intensity=.25; key.intensity=.4; rim.intensity=.2; }
  else if (name==='Studio'){ scene.background.set(0x0e1116); hemi.intensity=.8; key.intensity=1.2; rim.intensity=.7; }
  else { scene.background.set(0x0b0c0f); hemi.intensity=.6; key.intensity=1.0; rim.intensity=.5; }
}