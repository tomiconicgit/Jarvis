// ---------- Geometry helpers ----------
function roundedRectPath(w, d, r){
  const hw=w/2, hd=d/2, rr=Math.max(0, Math.min(r, hw, hd));
  const p = new THREE.Path();
  p.moveTo(-hw+rr, -hd);
  p.lineTo( hw-rr, -hd);
  p.absarc( hw-rr, -hd+rr, rr, -Math.PI/2, 0, false);
  p.lineTo( hw,  hd-rr);
  p.absarc( hw-rr,  hd-rr, rr, 0, Math.PI/2, false);
  p.lineTo(-hw+rr,  hd);
  p.absarc(-hw+rr,  hd-rr, rr, Math.PI/2, Math.PI, false);
  p.lineTo(-hw,    -hd+rr);
  p.absarc(-hw+rr, -hd+rr, rr, Math.PI, 1.5*Math.PI, false);
  p.closePath();
  return p;
}

function unifiedShellGeometry(p, forceNoBevel=false){
  const eps = 0.01;
  const maxCorner = Math.max(0, Math.min(p.width, p.depth)/2 - p.wallThickness - eps);
  const cornerRadius = Math.min(Math.max(0, p.cornerRadius||0), maxCorner);

  const innerW = Math.max(eps, p.width - 2*p.wallThickness);
  const innerD = Math.max(eps, p.depth - 2*p.wallThickness);
  const innerR = Math.max(0, cornerRadius - p.wallThickness);

  const shape = new THREE.Shape();

  shape.add(roundedRectPath(p.width, p.depth, cornerRadius));
  const inner = roundedRectPath(innerW, innerD, innerR);
  shape.holes.push(inner);

  const bevelEnabled = !forceNoBevel && (p.edgeRoundness||0) > 0;

  const extrudeSettings = {
    depth: p.height,
    steps: Math.max(1, Math.floor(p.edgeSmoothness||1)),
    bevelEnabled,
    bevelSegments: Math.max(1, Math.floor(p.edgeSmoothness||1)),
    bevelSize: bevelEnabled ? clampEdgeRoundnessInPlane(p) : 0,
    bevelThickness: bevelEnabled ? clampEdgeRoundnessThickness(p) : 0,
    curveSegments: Math.max(8, Math.floor(p.cornerSmoothness||16))
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.translate(0, 0, -p.height/2);
  geo.rotateX(-Math.PI/2);          // make Y up
  geo.computeVertexNormals();
  return geo;
}

function clampEdgeRoundnessInPlane(p){
  const maxByWall = Math.max(0.01, p.wallThickness/2 - 0.01);
  const maxByFoot = Math.max(0.01, Math.min(p.width, p.depth)*0.25);
  return Math.min(p.edgeRoundness||0, maxByWall, maxByFoot);
}
function clampEdgeRoundnessThickness(p){
  const maxByH = Math.max(0.01, p.height/4);
  const maxByT = Math.max(0.01, p.wallThickness/1.5);
  return Math.min(p.edgeRoundness||0, maxByH, maxByT);
}

// ---------- Unified model (Tower Neck) ----------
class TowerNeck extends THREE.Group{
  constructor(params){
    super();
    this.userData.isModel = true;
    this.userData.type = 'TowerNeck';
    this.userData.params = {...params};
    this.material = new THREE.MeshStandardMaterial({color:0xcccccc, roughness:0.7, metalness:0.1});
    this.build();
  }

  build(){
    for(const c of this.children){ c.geometry && c.geometry.dispose(); }
    this.clear();

    const p = this.userData.params;

    // Try with fillets
    let shellGeo = unifiedShellGeometry(p, /*forceNoBevel*/ false);
    const resultMesh = new THREE.Mesh(shellGeo, this.material);

    resultMesh.castShadow = true; resultMesh.receiveShadow = true;
    this.add(resultMesh);
  }

  updateParams(next){
    next = {...next};
    const crMax = Math.max(0, Math.min(next.width, next.depth)/2 - next.wallThickness - 0.01);
    if(next.cornerRadius > crMax) next.cornerRadius = crMax;

    this.userData.params = next;
    this.build();
  }
}