// editor.js — renderer / scene / camera / controls / selection / lighting / grid
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

const Editor = {
  init(container, bus){
    // -------- renderer (recreatable) --------
    let renderer = createRenderer(container);

    // block page scroll/zoom while over canvas (wheel on PC, pinch on iOS)
    renderer.domElement.addEventListener('wheel', e => e.preventDefault(), { passive:false });

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0c0f);

    const camera = new THREE.PerspectiveCamera(50, Math.max(1,container.clientWidth)/Math.max(1,container.clientHeight), 0.1, 5000);
    camera.position.set(12, 10, 16);

    // controls/gizmo are rebuilt whenever renderer is recreated
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
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400,400), new THREE.MeshStandardMaterial({ color:0x111315, roughness:1 }));
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);

    // world root
    const world = new THREE.Group(); world.name = 'World'; scene.add(world);

    // selection
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
    let selected = null; let boxHelper = null;
    
    // --- (FIX) Updated setSelected function ---
    function setSelected(mesh){
      if (selected === mesh) return;
      selected = mesh;
      if (boxHelper) { scene.remove(boxHelper); boxHelper.geometry.dispose(); boxHelper = null; }
      
      if (mesh) { 
        boxHelper = new THREE.BoxHelper(mesh, 0x4da3ff); 
        scene.add(boxHelper);
        
        // Update orbit target to the center of the new selection
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        controls.target.copy(center);
      }
      bus.emit('selection-changed', selected);
    }
    // --- End Fix ---
    
    container.addEventListener('pointerdown', e=>{
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX-rect.left)/rect.width)*2-1;
      pointer.y = -((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(world.children, true);
      
      let hitObject = hits[0]?.object;
      if (hitObject) {
        // Traverse up to find the direct child of 'world'
        while (hitObject.parent && hitObject.parent !== world) {
          hitObject = hitObject.parent;
        }
        // Only select if the ancestor is a direct child of 'world'
        if (hitObject.parent === world) {
          setSelected(hitObject);
        } else {
          setSelected(null); // Hit something, but not a selectable object
        }
      } else {
        setSelected(null); // Clicked empty space
      }
    });

    // bus
    bus.on('add-primitive', ({type})=>{
      const m = makePrimitive(type);
      world.add(m); setSelected(m); frame(m);
      bus.emit('scene-updated');
    });
    bus.on('delete-selection', ()=>{
      if (!selected) return;
      const rootObj = selected;
      gizmo.detach(); setSelected(null);
      rootObj.parent?.remove(rootObj);
      bus.emit('scene-updated');
    });
    bus.on('frame-selection', ()=> selected && frame(selected));
    bus.on('toggle-grid', ()=> grid.visible = !grid.visible);
    bus.on('set-background', c=> { scene.background = new THREE.Color(c); });
    bus.on('set-lighting', name=> applyLightingPreset(name, { hemi, key, rim, scene }));
    bus.on('set-gizmo', mode=> gizmo.setMode(mode));
    bus.on('attach-selected', ()=> {
        if (selected) {
            gizmo.attach(selected);
            if(boxHelper) boxHelper.update();
        } else {
            gizmo.detach();
        }
    });
    bus.on('detach-gizmo', ()=> gizmo.detach());

    // material updates
    bus.on('material-update', opts=>{
      if (!selected) return;
      selected.traverse(o=>{
        if (o.isMesh){
          o.castShadow = !!opts.castShadow;
          o.receiveShadow = !!opts.receiveShadow;
          const mat = ensureStandard(o.material);
          mat.wireframe = !!opts.wireframe;
          if (opts.color) mat.color.set(opts.color);
          if (opts.metalness != null) mat.metalness = opts.metalness;
          if (opts.roughness != null) mat.roughness = opts.roughness;
          if (opts.emissive != null) mat.emissiveIntensity = opts.emissive;
          if (opts.emissiveColor) mat.emissive.set(opts.emissiveColor);
          if (opts.map !== undefined) mat.map = opts.map || null;
          mat.needsUpdate = true;
        }
      });
      bus.emit('material-updated', selected);
    });

    // transform from UI
    bus.on('transform-update', t=>{
      if (!selected) return;
      if (t.position){ selected.position.set(t.position.x, t.position.y, t.position.z); }
      if (t.rotation){ selected.rotation.set(THREE.MathUtils.degToRad(t.rotation.x), THREE.MathUtils.degToRad(t.rotation.y), THREE.MathUtils.degToRad(t.rotation.z)); }
      if (t.scale){
        if (t.scale.uniform != null){ selected.scale.setScalar(t.scale.uniform); }
        else { selected.scale.set(t.scale.x, t.scale.y, t.scale.z); }
      }
      if (boxHelper) boxHelper.update();
      gizmo.attach(selected);
      bus.emit('transform-changed', selected);
    });

    // Rebuild Geometry + Deformers
    bus.on('rebuild-geometry', payload => {
      if (!selected) return;
      const { base, deform } = payload;
      
      try {
        const baseGeometry = createBaseGeometry(base);
        const deformedGeometry = applyDeformers(baseGeometry, deform);

        selected.geometry.dispose();
        selected.geometry = deformedGeometry;
        selected.userData.geometryParams = base; // Save new base params
        selected.userData.deformParams = deform; // Save new deform params
        
        selected.geometry.computeVertexNormals();
        bus.emit('attach-selected'); // Update gizmo and box helper
      } catch (err) {
        console.error("Error rebuilding geometry:", err);
      }
    });

    // size management
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

    // context-loss: rebuild renderer + controls instantly (fixes “blank after zoom”)
    renderer.domElement.addEventListener('webglcontextlost', (e)=>{
      e.preventDefault();
      console.warn('WebGL context lost — rebuilding renderer');
      rebuildRenderer();
    }, false);

    // loop
    function safeRender(){
      try { controls?.update(); renderer.render(scene, camera); }
      catch(err){ console.error(err); }
    }
    renderer.setAnimationLoop(safeRender);

    // helpers
    function frame(obj){
      const box = new THREE.Box3().setFromObject(obj);
      const sizeVec = box.getSize(new THREE.Vector3());
      const size = Math.max(sizeVec.x, sizeVec.y, sizeVec.z) || 1;
      const center = box.getCenter(new THREE.Vector3());
      controls.target.copy(center);
      const dist = Math.max(1, size * 1.2 / Math.tan((camera.fov * Math.PI/180)/2));
      camera.position.copy(center).add(new THREE.Vector3(dist, dist*0.6, dist));
      camera.near = 0.1;
      camera.far  = Math.max(2000, dist*10);
      camera.updateProjectionMatrix();
      if (boxHelper) boxHelper.update();
    }

    function buildControls(){
      controls?.dispose();
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.zoomSpeed = 0.3; // <-- (FIX) Even smoother zoom
      controls.target.set(0, 2, 0);
      controls.minDistance = 1;      
      controls.maxDistance = 500;
      controls.maxPolarAngle = Math.PI * 0.499;

      if (gizmo){ scene.remove(gizmo); }
      gizmo = new TransformControls(camera, renderer.domElement);
      gizmo.setSize(0.9);
      gizmo.addEventListener('change', ()=> safeRender());
      gizmo.addEventListener('dragging-changed', e=> controls.enabled = !e.value);
      gizmo.addEventListener('objectChange', ()=> { if (boxHelper) boxHelper.update(); bus.emit('transform-changed', selected); });
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

    return {
      get scene(){ return scene; },
      get world(){ return world; },
      get selected(){ return selected; },
      setSelected, frame,
      listObjects(){ return world.children.slice(); }
    };
  }
};

export default Editor;

/* ---------- helpers ---------- */
function createRenderer(container){
  const r = new THREE.WebGLRenderer({
    antialias:true, alpha:false, powerPreference:'high-performance', preserveDrawingBuffer:false
  });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  r.setSize(Math.max(1,container.clientWidth), Math.max(1,container.clientHeight));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true;
  container.appendChild(r.domElement);
  return r;
}

// --- Store geometry parameters in userData ---
function makePrimitive(type='box'){
  const mat = new THREE.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.4 });
  let mesh, geo, params;
  
  if (type==='sphere') {
    params = { radius: 1, widthSegments: 48, heightSegments: 32 };
    geo = new THREE.SphereGeometry(params.radius, params.widthSegments, params.heightSegments);
    mesh = new THREE.Mesh(geo, mat);
  }
  else if (type==='cylinder') {
    params = { radiusTop: 1, radiusBottom: 1, height: 2, radialSegments: 48 };
    geo = new THREE.CylinderGeometry(params.radiusTop, params.radiusBottom, params.height, params.radialSegments);
    mesh = new THREE.Mesh(geo, mat);
  }
  else if (type==='plane') {
    params = { width: 4, height: 4 };
    geo = new THREE.PlaneGeometry(params.width, params.height, 1, 1);
    mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI/2;
  }
  else { // box
    params = { width: 2, height: 2, depth: 2 };
    geo = new THREE.BoxGeometry(params.width, params.height, params.depth);
    mesh = new THREE.Mesh(geo, mat);
  }
  
  mesh.userData.geometryParams = { type, ...params };
  mesh.userData.deformParams = { twist: 0, taper: 1, noise: 0 };
  mesh.position.y = 1; mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.name = type.charAt(0).toUpperCase() + type.slice(1);
  return mesh;
}

function ensureStandard(mat){
  if (mat && mat.isMeshStandardMaterial) return mat;
  const m = new THREE.MeshStandardMaterial({ color: (mat?.color||0xffffff) });
  return m;
}

function applyLightingPreset(name, {hemi, key, rim, scene}){
  if (name==='Night'){ scene.background.set(0x06070a); hemi.intensity=.25; key.intensity=.4; rim.intensity=.2; }
  else if (name==='Studio'){ scene.background.set(0x0e1116); hemi.intensity=.8; key.intensity=1.2; rim.intensity=.7; }
  else { scene.background.set(0x0b0c0f); hemi.intensity=.6; key.intensity=1.0; rim.intensity=.5; }
}

// --- Geometry Generation Helpers ---

function createBaseGeometry(params) {
  const p = params; // alias
  if (p.type === 'box') {
    return new THREE.BoxGeometry(p.width, p.height, p.depth, 1, 1, 1);
  } else if (p.type === 'sphere') {
    return new THREE.SphereGeometry(p.radius, p.widthSegments, p.heightSegments);
  } else if (p.type === 'cylinder') {
    return new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, p.radialSegments);
  } else if (p.type === 'plane') {
    return new THREE.PlaneGeometry(p.width, p.height);
  }
  // Fallback
  return new THREE.BoxGeometry(2, 2, 2);
}

function applyDeformers(geometry, deforms) {
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  const axis = new THREE.Vector3(0, 1, 0); // Deform along Y
  
  // Get bounds
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const height = box.max.y - box.min.y;
  const center = box.min.y + height / 2;

  // Nothing to do if no deforms
  if (deforms.twist === 0 && deforms.taper === 1 && deforms.noise === 0) {
    return geometry;
  }

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);

    // Get Y-axis percentage (from -0.5 to +0.5)
    const yPercent = (height > 0.01) ? ((vertex.y - center) / height) : 0;
    
    // 1. Apply Taper
    // Taper scale goes from 1.0 (at -0.5) to taper (at +0.5)
    const taperScale = 1.0 - (yPercent + 0.5) * (1.0 - deforms.taper);
    vertex.x *= taperScale;
    vertex.z *= taperScale;
    
    // 2. Apply Twist
    const twistAmount = THREE.MathUtils.degToRad(deforms.twist);
    const twistAngle = yPercent * twistAmount;
    vertex.applyAxisAngle(axis, twistAngle);
    
    // 3. Apply Noise
    const noise = deforms.noise;
    if (noise > 0) {
      vertex.x += (Math.random() - 0.5) * noise;
      vertex.y += (Math.random() - 0.5) * noise;
      vertex.z += (Math.random() - 0.5) * noise;
    }
    
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  
  geometry.attributes.position.needsUpdate = true;
  return geometry;
}
