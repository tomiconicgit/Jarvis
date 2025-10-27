// main.js — app brain: device/layout, manifest, input, boot
import { showLoader, loadManifest, hideLoader, reportProgress } from './loader.js';

const App = {
  bus: createBus(),
  modules: {},
  env: { isTouch: 'ontouchstart' in window, isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) }
};

// manifest of modules (expand later to your GH paths if needed)
const MANIFEST = [
  { id: 'editor',   path: './src/editor.js' },
  { id: 'toolbar',  path: './src/toolbar.js' },
  { id: 'panel',    path: './src/panel.js' },
  { id: 'scene',    path: './src/scene.js' },
  { id: 'materials',path: './src/materials.js' }
];

(async function boot(){
  showLoader();
  await loadManifest(MANIFEST, reportProgress);
  // now import the modules (already cached by loader)
  const [{ default: Editor }, { default: Toolbar }, { default: Panel }, { default: SceneTab }, { default: MaterialTab }] =
    await Promise.all(MANIFEST.map(m => import(m.path)));

  const viewport = document.getElementById('viewport');
  const appRoot  = document.getElementById('app');

  // init editor
  const editor = Editor.init(viewport, App.bus);
  App.modules.editor = editor;

  // top toolbar
  Toolbar.init(document.getElementById('toolbar'), App.bus, editor);

  // panel + tabs
  Panel.init({
    tabs: {
      scene:  root => SceneTab.init(root, App.bus, editor),
      material: root => MaterialTab.init(root, App.bus, editor)
    }
  });

  // layout / orientation handling
  function applyClass(){ document.body.classList.toggle('touch', App.env.isTouch); }
  applyClass(); window.addEventListener('orientationchange', applyClass, { passive:true });

  // keyboard shortcuts
  window.addEventListener('keydown', e=>{
    if (e.key === 'g') App.bus.emit('toggle-grid');
    if (e.key === 'f') App.bus.emit('frame-selection');
    if (e.key === 'Delete') App.bus.emit('delete-selection');
  });

  // basic touch helpers (two-finger for pan is handled by OrbitControls)
  // expose for debugging
  window.__ICONIC__ = { App };

  hideLoader();
  appRoot.hidden = false;

  // seed with a cube so UI has something
  App.bus.emit('add-primitive', { type:'box' });
})();

/* ---------- tiny event bus ---------- */
function createBus(){
  const map = new Map();
  return {
    on(type, fn){ if(!map.has(type)) map.set(type, new Set()); map.get(type).add(fn); return ()=>map.get(type)?.delete(fn); },
    emit(type, payload){ (map.get(type)||[]).forEach(fn=>{ try{ fn(payload); }catch(e){ console.error(e); } }); }
  };
}