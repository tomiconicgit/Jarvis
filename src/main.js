// main.js — app boot (single-pass loader, robust error reporting)
import { showLoader, loadManifest, hideLoader, reportProgress, setStatus } from './loader.js';

const App = {
  bus: createBus(),
  modules: {},
  env: { isTouch: 'ontouchstart' in window, isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) }
};

// Build module URLs RELATIVE to this file
const MANIFEST = [
  { id: 'editor',    path: new URL('./editor.js',    import.meta.url).href },
  { id: 'toolbar',   path: new URL('./toolbar.js',   import.meta.url).href },
  { id: 'panel',     path: new URL('./panel.js',     import.meta.url).href },
  { id: 'scene',     path: new URL('./scene.js',     import.meta.url).href },
  { id: 'materials', path: new URL('./materials.js', import.meta.url).href }
];

(async function boot(){
  try {
    showLoader();

    // SINGLE import pass with progress (no duplicate imports)
    const mods = await loadManifest(MANIFEST, reportProgress);

    // Pull defaults
    const Editor      = mods.editor.default;
    const Toolbar     = mods.toolbar.default;
    const Panel       = mods.panel.default;
    const SceneTab    = mods.scene.default;
    const MaterialTab = mods.materials.default;

    // Sanity-check exports early so we fail with a clear message instead of hanging under the loader.
    if (!Editor?.init || !Toolbar?.init || !Panel?.init || !SceneTab?.init || !MaterialTab?.init) {
      throw new Error('One or more modules missing default .init export');
    }

    const viewport = document.getElementById('viewport');
    const appRoot  = document.getElementById('app');

    const editor = Editor.init(viewport, App.bus);
    App.modules.editor = editor;

    Toolbar.init(document.getElementById('toolbar'), App.bus, editor);

    Panel.init({
      tabs: {
        scene:    root => SceneTab.init(root, App.bus, editor),
        material: root => MaterialTab.init(root, App.bus, editor)
      }
    });

    function applyClass(){ document.body.classList.toggle('touch', App.env.isTouch); }
    applyClass(); window.addEventListener('orientationchange', applyClass, { passive:true });

    window.addEventListener('keydown', e=>{
      if (e.key === 'g') App.bus.emit('toggle-grid');
      if (e.key === 'f') App.bus.emit('frame-selection');
      if (e.key === 'Delete') App.bus.emit('delete-selection');
    });

    window.__ICONIC__ = { App };

    hideLoader();
    appRoot.hidden = false;

    // Seed scene
    App.bus.emit('add-primitive', { type:'box' });
  } catch (err) {
    console.error('BOOT FAILED:', err);
    setStatus('Error: ' + (err?.message || err));
    // keep loader visible with error text so you can see what went wrong on device
  }
})();

function createBus(){
  const map = new Map();
  return {
    on(type, fn){ if(!map.has(type)) map.set(type, new Set()); map.get(type).add(fn); return ()=>map.get(type)?.delete(fn); },
    emit(type, payload){ (map.get(type)||[]).forEach(fn=>{ try{ fn(payload); }catch(e){ console.error(e); } }); }
  };
}