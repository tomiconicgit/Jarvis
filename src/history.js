// history.js — scene history snapshots (undo/redo) with debounce
import * as THREE from 'three';

const MAX_STACK = 50;

function debounce(fn, ms=250){
  let t=null;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}

export default {
  init(bus, editor){
    const past = [];
    const future = [];

    function snapshot(label=''){
      try{
        const json = editor.world.toJSON();
        const payload = { json, label, ts: Date.now() };
        past.push(payload);
        if (past.length > MAX_STACK) past.shift();
        future.length = 0; // clear redo when new action happens
      }catch(e){ console.error('[history] snapshot failed', e); }
    }

    const pushDebounced = debounce((why)=> snapshot(why), 250);

    function restore(state){
      try{
        editor.setSelected(null);
        [...editor.world.children].forEach(c=> editor.world.remove(c));
        const loader = new THREE.ObjectLoader();
        const obj = loader.parse(state.json);
        (obj.children||[]).forEach(child=> editor.world.add(child));
        bus.emit('scene-updated');
      }catch(e){ console.error('[history] restore failed', e); }
    }

    // public events
    bus.on('history-push', (why)=> snapshot(why||'manual'));
    bus.on('history-push-debounced', (why)=> pushDebounced(why||'change'));

    bus.on('history-undo', ()=>{
      if (past.length <= 1) return; // keep at least initial
      const current = past.pop();
      future.push(current);
      const prev = past[past.length-1];
      restore(prev);
    });

    bus.on('history-redo', ()=>{
      if (!future.length) return;
      const next = future.pop();
      past.push(next);
      restore(next);
    });

    // seed initial state shortly after boot (when first box is added)
    const seed = debounce(()=> snapshot('initial'), 100);
    bus.on('scene-updated', ()=> seed());
  }
};