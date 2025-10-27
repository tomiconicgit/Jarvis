// main.js — robust boot; no double-imports; defensive init checks
import { showLoader, loadManifest, hideLoader, reportProgress, setStatus } from './loader.js';

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
  try {
    showLoader();

    const mods = await loadManifest(MANIFEST, reportProgress);

    const Editor      = mods.editor?.default;
    const Toolbar     = mods.toolbar?.default;
    const Panel       = mods.panel?.default;
    const SceneTab    = mods.scene?.default;
    const MaterialTab = mods.materials?.default;

    // Catch TDZ/missing default early with a precise message
    const missing = [
      ['editor', Editor?.init],
      ['toolbar', Toolbar?.init],
      ['panel', Panel?.init],
      ['scene', SceneTab?.init],
      ['materials', MaterialTab?.init]
    ].find(([name, ok]) => !ok);
    if (missing) throw new Error(`Module "${missing[0]}" missing default .init`);

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

    document.body.classList.toggle('touch', App.env.isTouch);
    window.addEventListener('orientationchange', ()=> {
      document.body.classList.toggle('touch', App.env.isTouch);
    }, { passive:true });

    window.addEventListener('keydown', e=>{
      if (e.key === 'g') App.bus.emit('toggle-grid');
      if (e.key === 'f') App.bus.emit('frame-selection');
      if (e.key === 'Delete') App.bus.emit('delete-selection');
    });

    window.__ICONIC__ = { App };

    hideLoader();
    appRoot.hidden = false;

    App.bus.emit('add-primitive', { type:'box' });
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