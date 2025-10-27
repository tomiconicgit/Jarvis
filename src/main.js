// main.js — app brain: device/layout, manifest, input, boot
import { showLoader, loadManifest, hideLoader, reportProgress } from './loader.js';

const App = {
  bus: createBus(),
  modules: {},
  env: { isTouch: 'ontouchstart' in window, isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) }
};

const MANIFEST = [
  { id: 'editor',    path: new URL('./editor.js',    import.meta.url).href },
  { id: 'toolbar',   path: new URL('./toolbar.js',   import.meta.url).href },
  { id: 'panel',     path: new URL('./panel.js',     import.meta.url).href },
  { id: 'scene',     path: new URL('./scene.js',     import.meta.url).href },
  { id: 'materials', path: new URL('./materials.js', import.meta.url).href }
];

(async function boot(){
  showLoader();
  await loadManifest(MANIFEST, reportProgress);
  const [{ default: Editor }, { default: Toolbar }, { default: Panel }, { default: SceneTab }, { default: MaterialTab }] =
    await Promise.all(MANIFEST.map(m => import(m.path)));

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

  App.bus.emit('add-primitive', { type:'box' });
})();

function createBus(){
  const map = new Map();
  return {
    on(type, fn){ if(!map.has(type)) map.set(type, new Set()); map.get(type).add(fn); return ()=>map.get(type)?.delete(fn); },
    emit(type, payload){ (map.get(type)||[]).forEach(fn=>{ try{ fn(payload); }catch(e){ console.error(e); } }); }
  };
}