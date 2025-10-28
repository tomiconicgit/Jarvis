/*
File: src/state.js
*/
// Manages the scene state, entities, and selection.
import * as THREE from 'three';

let editorRef = null;
let busRef = null;
let registryRef = null;

let ENT_SEQ = 1;
const state = { 
  entities: new Map(),
  selected: null 
};

/**
 * Helper to recursively dispose of geometries and materials
 */
function disposeObject(obj) {
  if (!obj) return;
  obj.traverse(o => {
    if (o.isMesh) {
      o.geometry?.dispose();
      if (Array.isArray(o.material)) {
        o.material.forEach(m => m.dispose());
      } else {
        o.material?.dispose();
      }
    }
  });
  obj.parent?.remove(obj);
}

/**
 * Helper to ensure all materials on an object are unique instances
 */
function cloneMaterials(obj) {
  obj.traverse(o => {
    if (o.isMesh && o.material) {
      if (Array.isArray(o.material)) {
        o.material = o.material.map(m => m.clone());
      } else {
        o.material = o.material.clone();
      }
    }
  });
}

export function initState(editor, bus, registry) { 
  editorRef = editor; 
  busRef = bus;
  registryRef = registry;
  
  // Listen for selection events from viewport clicks
  busRef.on('select-entity-by-id', selectEntity);
}

export function getEntities() { return state.entities.values(); }
export function getSelected() { return state.selected; }
export function getEntity(id) { return state.entities.get(id); }

function defaultParams(schema){ 
  const out={}; 
  for(const [k,v] of Object.entries(schema)) out[k]=v.default; 
  return out; 
}

function applyPreset(type, params, presetValue){
  if (presetValue === '__none__') return;
  // This is a simplified version of the Launch Tower's preset logic.
  // You can expand this as needed.
  if(type==='tower.base' && presetValue==='base-tall'){ params.height=60; params.aTop=3.6; params.bTop=8.5; }
  if(type==='tower.neck' && presetValue==='neck-slim'){ params.height=28; params.aTop=3.2; params.bTop=4.2; params.y=70; }
  if(type==='roof' && presetValue==='roof-flat'){ params.topScale=0.85; params.height=1.4; }
  if(type==='roof' && presetValue==='roof-point'){ params.topScale=0.0; params.height=4.2; }
  if(type==='piping' && presetValue==='pipes-quad'){ params.count=4; params.angleStart=0; }
  if(type==='top.floor' && presetValue==='pad-long'){ params.depth=24; params.width=10; params.forward=9; }
}

export function addEntity(type, presetValue, existingData = null) {
  const reg = registryRef.Registry.get(type);
  if (!reg) return;

  const id = existingData ? existingData.id : `ent_${ENT_SEQ++}`;
  const params = existingData ? existingData.params : defaultParams(reg.schema);
  
  if (!existingData) {
    applyPreset(type, params, presetValue);
  }

  const obj = reg.builder(params);
  
  // *** ADDED: Ensure materials are unique instances ***
  cloneMaterials(obj);
  
  obj.userData.__entId = id;
  
  if (existingData) {
    obj.position.fromArray(existingData.t.p);
    obj.rotation.set(existingData.t.r[0], existingData.t.r[1], existingData.t.r[2]);
    obj.scale.fromArray(existingData.t.s);
  }

  editorRef.world.add(obj);
  const ent = { id, type, params, object: obj };
  state.entities.set(id, ent);
  
  if (!existingData) {
    busRef.emit('history-push', 'Add ' + reg.label);
  }

  busRef.emit('state-changed');
  selectEntity(id);
  return ent;
}

export function rebuildEntity(id) {
  const ent = state.entities.get(id);
  if (!ent) return;
  const reg = registryRef.Registry.get(ent.type);
  
  const parent = ent.object.parent || editorRef.world;
  
  // ENHANCEMENT: Properly dispose of old object
  disposeObject(ent.object);
  
  const obj = reg.builder(ent.params);
  
  // *** ADDED: Ensure materials are unique instances ***
  cloneMaterials(obj);

  obj.userData.__entId = id;
  obj.position.copy(ent.object.position);
  obj.rotation.copy(ent.object.rotation);
  obj.scale.copy(ent.object.scale);
  
  parent.add(obj);
  ent.object = obj;
  
  if (state.selected === id) {
    busRef.emit('gizmo-attach', ent.object);
  }
  busRef.emit('state-changed');
}

export function deleteEntity(id) {
  if (!id) return;
  const ent = state.entities.get(id);
  if (!ent) return;
  
  if (state.selected === id) {
    selectEntity(null);
  }
  
  // ENHANCEMENT: Properly dispose
  disposeObject(ent.object);
  state.entities.delete(id);
  
  busRef.emit('state-changed');
  busRef.emit('history-push', 'Delete');
}

export function deleteAllEntities() {
  selectEntity(null);
  for (const id of [...state.entities.keys()]) {
    const ent = state.entities.get(id);
    // ENHANCEMENT: Properly dispose
    disposeObject(ent.object);
    state.entities.delete(id);
  }
  busRef.emit('state-changed');
}

export function duplicateEntity(id) {
  if (!id) return;
  const ent = state.entities.get(id);
  if (!ent) return;
  
  const reg = registryRef.Registry.get(ent.type);
  const newId = `ent_${ENT_SEQ++}`;
  
  const params = JSON.parse(JSON.stringify(ent.params)); // Deep copy params
  const obj = reg.builder(params);

  // *** ADDED: Ensure materials are unique instances ***
  cloneMaterials(obj);
  
  obj.position.copy(ent.object.position).add(new THREE.Vector3(1,0,1));
  obj.rotation.copy(ent.object.rotation);
  obj.scale.copy(ent.object.scale);
  obj.userData.__entId = newId;
  
  editorRef.world.add(obj);
  const newEnt = { id: newId, type: ent.type, params, object: obj };
  state.entities.set(newId, newEnt);
  
  busRef.emit('state-changed');
  busRef.emit('history-push', 'Duplicate');
  selectEntity(newId);
}

export function selectEntity(id) {
  if (state.selected === id) return;
  
  state.selected = id;
  const ent = state.entities.get(id);
  
  if (!ent) {
    busRef.emit('gizmo-detach');
  } else {
    busRef.emit('gizmo-attach', ent.object);
  }
  
  // This event triggers Outliner update and Inspector update
  busRef.emit('selection-changed', ent);
}

// --- Save / Load ---
export function serializeState() {
  const payload = [...state.entities.values()].map(e => ({
    id: e.id,
    type: e.type,
    params: e.params,
    t: { 
      p: e.object.position.toArray(),
      r: [e.object.rotation.x, e.object.rotation.y, e.object.rotation.z],
      s: e.object.scale.toArray()
    }
  }));
  return JSON.stringify(payload);
}

export function deserializeState(jsonString) {
  deleteAllEntities();
  try {
    const list = JSON.parse(jsonString);
    let maxId = 0;
    for (const rec of list) {
      if (registryRef.Registry.has(rec.type)) {
        addEntity(rec.type, null, rec);
        const idNum = parseInt(rec.id.split('_')[1], 10);
        if (idNum > maxId) maxId = idNum;
      }
    }
    ENT_SEQ = maxId + 1;
    busRef.emit('state-changed');
  } catch (e) {
    console.error("Failed to load state", e);
    __logErr("Load failed: " + e.message);
  }
}
