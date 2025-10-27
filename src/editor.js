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

    const camera = new THREE.PerspectiveCamera(
      50,
      Math.max(1,container.clientWidth)/Math.max(1,container.clientHeight),
      0.1,
      5000
    );
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

    function setSelected(mesh){
      if (selected === mesh) return;
      selected = mesh;

      if (boxHelper) { scene.remove(boxHelper); boxHelper.geometry?.dispose?.(); boxHelper = null; }

      if (mesh) {
        boxHelper = new THREE.BoxHelper(mesh, 0x4da3ff);
        scene.add(boxHelper);

        // center controls on selection and update distance limits
        const { center, radius } = boundsOf(mesh);
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
    bus.on('attach-selected', ()=> selected ? gizmo.attach(selected) : gizmo.detach());
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

      // keep orbit target and distance sane as the object changes
      const { center, radius } = boundsOf(selected);
      controls.target.copy(center);
      clampZoomToRadius(radius);

      gizmo.attach(selected);
      bus.emit('transform-changed', selected);
    });

    // geometry & deformers
    bus.on('rebuild-geometry', payload => {
      if (!selected || !selected.geometry) return;
      const { base, deform } = payload;
      try {
        const baseGeometry = createBaseGeometry(base);
        const afterDeform  = applyDeformers(baseGeometry, deform);
        selected.geometry.dispose();
        selected.geometry = afterDeform;
        selected.userData.geometryParams = base;
        selected.userData.deformParams   = deform;
        selected.geometry.computeVertexNormals();

        if (boxHelper) boxHelper.update();
        const { center, radius } = boundsOf(selected);
        controls.target.copy(center);
        clampZoomToRadius(radius);

        bus.emit('attach-selected');
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

    // context-loss: rebuild renderer + controls (protects against “blank after zoom”)
    renderer.domElement.addEventListener('webglcontextlost', (e)=>{
      e.preventDefault();
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
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;

      // Smooth, predictable zoom:
      controls.zoomSpeed = 0.35;
      controls.zoomToCursor = true;      // desktop: dolly toward cursor
      controls.enablePan = true;
      controls.panSpeed = 0.6;
      controls.rotateSpeed = 0.9;
      controls.maxPolarAngle = Math.PI * 0.499;

      // sensible defaults (will be clamped to selection on select/transform)
      controls.minDistance = 0.5;
      controls.maxDistance = 500;

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
      // Keep dolly distance outside the object; give room to orbit.
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

function boundsOf(obj){
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
  return { center, radius };
}

function makePrimitive(type='box'){
  const mat = new THREE.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.4 });
  let mesh, geo, params;

  if (type==='sphere') {
    params = { type:'sphere', radius: 1, widthSegments: 48, heightSegments: 32 };
    geo = new THREE.SphereGeometry(params.radius, params.widthSegments, params.heightSegments);
  } else if (type==='cylinder') {
    params = { type:'cylinder', radiusTop: 1, radiusBottom: 1, height: 2, radialSegments: 48 };
    geo = new THREE.CylinderGeometry(params.radiusTop, params.radiusBottom, params.height, params.radialSegments, 1, false);
  } else if (type==='plane') {
    params = { type:'plane', width: 4, height: 4 };
    geo = new THREE.PlaneGeometry(params.width, params.height, 1, 1);
  } else { // box
    params = { type:'box', width: 2, height: 2, depth: 2 };
    geo = new THREE.BoxGeometry(params.width, params.height, params.depth, 2, 2, 2);
  }

  mesh = new THREE.Mesh(geo, mat);
  if (type==='plane') mesh.rotation.x = -Math.PI/2;

  mesh.userData.geometryParams = params;
  mesh.userData.deformParams = { twist: 0, taper: 1, noise: 0, shearX: 0, shearZ: 0, hollow: 0 };
  mesh.position.y = 1; mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.name = params.type.charAt(0).toUpperCase() + params.type.slice(1);
  return mesh;
}

function ensureStandard(mat){
  if (mat && mat.isMeshStandardMaterial) return mat;
  return new THREE.MeshStandardMaterial({ color: (mat?.color||0xffffff) });
}

function applyLightingPreset(name, {hemi, key, rim, scene}){
  if (name==='Night'){ scene.background.set(0x06070a); hemi.intensity=.25; key.intensity=.4; rim.intensity=.2; }
  else if (name==='Studio'){ scene.background.set(0x0e1116); hemi.intensity=.8; key.intensity=1.2; rim.intensity=.7; }
  else { scene.background.set(0x0b0c0f); hemi.intensity=.6; key.intensity=1.0; rim.intensity=.5; }
}

/* ---- Geometry builders / deformers ---- */
function createBaseGeometry(p) {
  if (p.type === 'box')      return new THREE.BoxGeometry(p.width, p.height, p.depth, 6, 6, 6);
  if (p.type === 'sphere')   return new THREE.SphereGeometry(p.radius, p.widthSegments, p.heightSegments);
  if (p.type === 'cylinder') return new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, p.radialSegments, 8, false);
  if (p.type === 'plane')    return new THREE.PlaneGeometry(p.width, p.height, 8, 8);
  return new THREE.BoxGeometry(2, 2, 2, 4, 4, 4);
}

function applyDeformers(geometry, deforms) {
  // 1) Hollow (thickness) -> add an inner shell with flipped winding
  const hollow = Math.max(0, +deforms.hollow || 0);
  let g = geometry;
  if (hollow > 0) g = thickenGeometry(g, hollow);

  // 2) Vertex-space edits: shear/slant, taper, twist, noise
  g.computeBoundingBox();
  const box = g.boundingBox.clone();
  const height = Math.max(1e-6, box.max.y - box.min.y);
  const centerY = (box.min.y + box.max.y) / 2;

  const pos = g.attributes.position;
  const nor = (()=>{ g.computeVertexNormals(); return g.attributes.normal; })();

  const tmp = new THREE.Vector3();
  const axisY = new THREE.Vector3(0,1,0);

  const shearX = +deforms.shearX || 0;
  const shearZ = +deforms.shearZ || 0;
  const taper  = (deforms.taper==null) ? 1 : +deforms.taper;
  const twist  = THREE.MathUtils.degToRad(+deforms.twist || 0);
  const noise  = +deforms.noise || 0;

  for (let i=0;i<pos.count;i++){
    tmp.fromBufferAttribute(pos, i);

    const yPct = (tmp.y - centerY) / height; // -0.5 .. +0.5 approximately

    // Shear/slant
    tmp.x += shearX * (tmp.y - centerY);
    tmp.z += shearZ * (tmp.y - centerY);

    // Taper (about Y)
    const tScale = 1.0 - (yPct + 0.5) * (1.0 - taper);
    tmp.x *= tScale; tmp.z *= tScale;

    // Twist
    if (twist !== 0) tmp.applyAxisAngle(axisY, yPct * twist);

    // Noise
    if (noise > 0){
      tmp.x += (Math.random()-0.5)*noise;
      tmp.y += (Math.random()-0.5)*noise;
      tmp.z += (Math.random()-0.5)*noise;
    }

    pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/* make a thick shell by offsetting along vertex normals
   returns a single BufferGeometry that contains outer + inner (flipped) */
function thickenGeometry(geometry, thickness){
  const g = geometry.clone();
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const count = pos.count;

  const innerPos = new Float32Array(count*3);
  for (let i=0;i<count;i++){
    const x = pos.getX(i) - nor.getX(i)*thickness;
    const y = pos.getY(i) - nor.getY(i)*thickness;
    const z = pos.getZ(i) - nor.getZ(i)*thickness;
    innerPos[i*3+0]=x; innerPos[i*3+1]=y; innerPos[i*3+2]=z;
  }

  // merge outer + inner
  const outerPos = pos.array;
  const mergedPos = new Float32Array(outerPos.length + innerPos.length);
  mergedPos.set(outerPos, 0);
  mergedPos.set(innerPos, outerPos.length);

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));

  // build indices: keep original faces, plus flipped inner faces
  const srcIndex = g.getIndex();
  const hasIndex = !!srcIndex;
  let outerIdx;
  if (hasIndex){
    outerIdx = srcIndex.array;
  } else {
    // build a trivial index for triangles
    const triCount = (pos.count/3)|0;
    outerIdx = new Uint32Array(triCount*3);
    for (let i=0;i<outerIdx.length;i++) outerIdx[i]=i;
  }

  const innerBase = pos.count;
  const innerIdx = new (outerIdx.constructor)(outerIdx.length);
  for (let i=0;i<outerIdx.length;i+=3){
    // flip winding for inner
    innerIdx[i+0] = innerBase + outerIdx[i+0];
    innerIdx[i+1] = innerBase + outerIdx[i+2];
    innerIdx[i+2] = innerBase + outerIdx[i+1];
  }

  const allIdx = new (outerIdx.constructor)(outerIdx.length + innerIdx.length);
  allIdx.set(outerIdx, 0);
  allIdx.set(innerIdx, outerIdx.length);

  out.setIndex(new THREE.BufferAttribute(allIdx, 1));
  out.computeVertexNormals();
  out.computeBoundingBox(); out.computeBoundingSphere();
  return out;
}