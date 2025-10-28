/*
File: src/main.js
*/
// main.js — boot, tabs, object creation
import { showLoader, loadManifest, hideLoader, reportProgress, setStatus } from './loader.js';

const App = {
  bus: createBus(),
  modules: {},
  env: { isTouch: 'ontouchstart' in window, isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) }
};

const MANIFEST = [
  { id: 'editor',      path: new URL('./editor.js',      import.meta.url).href },
  { id: 'toolbar',     path: new URL('./toolbar.js',     import.meta.url).href },
  { id: 'panel',       path: new URL('./panel.js',       import.meta.url).href },
  { id: 'scene',       path: new URL('./scene.js',       import.meta.url).href },
  { id: 'history',     path: new URL('./history.js',     import.meta.url).href },
  { id: 'cube',        path: new URL('./cube.js',        import.meta.url).href },
  { id: 'sphere',      path: new URL('./sphere.js',      import.meta.url).href },
  { id: 'hollowcube',  path: new URL('./hollowcube.js',  import.meta.url).href },
  { id: 'transform',   path: new URL('./transform.js',   import.meta.url).href },
  { id: 'modifiers',   path: new URL('./modifiers.js',   import.meta.url).href } // utility module (no default export)
];

(async function boot(){
  try {
    showLoader();

    const mods = await loadManifest(MANIFEST, reportProgress);
    const Editor     = mods.editor?.default;
    const Toolbar    = mods.toolbar?.default;
    const Panel      = mods.panel?.default;
    const SceneTab   = mods.scene?.default;
    const History    = mods.history?.default;
    const Cube       = mods.cube?.default;
    const Sphere     = mods.sphere?.default;
    const HollowCube = mods.hollowcube?.default;
    const TransformTab = mods.transform?.default;

    const missing = [
      ['editor',  Editor?.init],
      ['toolbar', Toolbar?.init],
      ['panel',   Panel?.init],
      ['scene',   SceneTab?.init],
      ['history', History?.init],
      ['cube',    Cube?.create],
      ['sphere',  Sphere?.create],
      ['hollowcube', HollowCube?.create],
      ['transform', TransformTab?.init]
    ].find(([name, ok]) => !ok);
    if (missing) throw new Error(`Module "${missing[0]}" missing default .init or .create`);

    const viewport = document.getElementById('viewport');
    const appRoot  = document.getElementById('app');

    const editor = Editor.init(viewport, App.bus);
    App.modules.editor = editor;

    // history first
    History.init(App.bus, editor);

    // Top bar + panel with tabs
    Toolbar.init(document.getElementById('toolbar'), App.bus, editor);
    Panel.init({
      tabs: {
        scene: root => SceneTab.init(root, App.bus, editor),
        transform: root => TransformTab.init(root, App.bus, editor)
      }
    }, App.bus);

    // Object creation listener
    App.bus.on('add-object', (payload)=>{
      let obj = null;
      if (payload.type === 'cube') {
        obj = Cube.create(); obj.name = 'Cube';
      } else if (payload.type === 'sphere') {
        obj = Sphere.create(); obj.name = 'Sphere';
      } else if (payload.type === 'hollowcube') {
        obj = HollowCube.create(); obj.name = 'Hollow Cube';
      }
      if (obj) {
        editor.world.add(obj);
        editor.setSelected(obj);
        editor.frame(obj);
        App.bus.emit('scene-updated');
        App.bus.emit('history-push', `Add ${obj.name}`);
      }
    });

    // shortcuts
    window.addEventListener('keydown', e=>{
      const meta = e.ctrlKey || e.metaKey;
      if (e.key === 'Delete' || e.key === 'Backspace') App.bus.emit('delete-selection');
      if (meta && e.key.toLowerCase() === 'z'){
        if (e.shiftKey) App.bus.emit('history-redo');
        else App.bus.emit('history-undo');
        e.preventDefault();
      }
    });

    window.__ICONIC__ = { App };

    hideLoader();
    appRoot.hidden = false;

  } catch (err) {
    console.error('BOOT FAILED:', err);
    setStatus('Error: ' + (err?.message || err));
  }
})();

function createBus(){
  const map = new Map();
  return {
    on(type, fn){ if(!map.has(type)) map.set(type, new Set()); map.get(type).add(fn); return ()=>map.get(type)?.delete(fn); },
    emit(type, payload){ (map.get(type)||[]).forEach(fn=>{ try{ fn(payload); }catch(e){ console.error(e); } }); }
  };
}