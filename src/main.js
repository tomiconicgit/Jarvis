// main.js — clean boot (no auto primitives), scene-only panel
import { showLoader, loadManifest, hideLoader, reportProgress, setStatus } from './loader.js';

const App = {
  bus: createBus(),
  modules: {},
  env: { isTouch: 'ontouchstart' in window, isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) }
};

const MANIFEST = [
  { id: 'editor',  path: new URL('./editor.js',  import.meta.url).href },
  { id: 'toolbar', path: new URL('./toolbar.js', import.meta.url).href },
  { id: 'panel',   path: new URL('./panel.js',   import.meta.url).href },
  { id: 'scene',   path: new URL('./scene.js',   import.meta.url).href },
  { id: 'history', path: new URL('./history.js', import.meta.url).href }
];

(async function boot(){
  try {
    showLoader();

    const mods = await loadManifest(MANIFEST, reportProgress);
    const Editor   = mods.editor?.default;
    const Toolbar  = mods.toolbar?.default;
    const Panel    = mods.panel?.default;
    const SceneTab = mods.scene?.default;
    const History  = mods.history?.default;

    const missing = [
      ['editor',  Editor?.init],
      ['toolbar', Toolbar?.init],
      ['panel',   Panel?.init],
      ['scene',   SceneTab?.init],
      ['history', History?.init]
    ].find(([name, ok]) => !ok);
    if (missing) throw new Error(`Module "${missing[0]}" missing default .init`);

    const viewport = document.getElementById('viewport');
    const appRoot  = document.getElementById('app');

    const editor = Editor.init(viewport, App.bus);
    App.modules.editor = editor;

    // history first
    History.init(App.bus, editor);

    // top bar + scene-only panel
    Toolbar.init(document.getElementById('toolbar'), App.bus, editor);
    Panel.init({ tabs: { scene: root => SceneTab.init(root, App.bus, editor) } });

    // shortcuts (keep basics)
    window.addEventListener('keydown', e=>{
      const meta = e.ctrlKey || e.metaKey;
      if (e.key === 'Delete') App.bus.emit('delete-selection');
      if (meta && e.key.toLowerCase() === 'z'){
        if (e.shiftKey) App.bus.emit('history-redo');
        else App.bus.emit('history-undo');
        e.preventDefault();
      }
    });

    window.__ICONIC__ = { App };

    hideLoader();
    appRoot.hidden = false;

    // CLEAN SLATE: nothing is added here
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