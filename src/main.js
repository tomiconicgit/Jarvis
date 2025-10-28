/*
File: src/main.js
*/
// main.js â boot, tabs, object creation
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
  { id: 'history',   path: new URL('./history.js',   import.meta.url).href },
  { id: 'registry',  path: new URL('./registry.js',  import.meta.url).href },
  { id: 'state',     path: new URL('./state.js',     import.meta.url).href },
  { id: 'library',   path: new URL('./library.js',   import.meta.url).href },
  { id: 'outliner',  path: new URL('./outliner.js',  import.meta.url).href },
  { id: 'inspector', path: new URL('./inspector.js', import.meta.url).href },
  { id: 'materials', path: new URL('./materials.js', import.meta.url).href }, // <-- ADDED
  { id: 'project',   path: new URL('./project.js',   import.meta.url).href },
  // { id: 'dpad',      path: new URL('./dpad.js',      import.meta.url).href } // REMOVED
];

(async function boot(){
  try {
    showLoader();

    const mods = await loadManifest(MANIFEST, reportProgress);
    const Editor      = mods.editor?.default;
    const Toolbar     = mods.toolbar?.default;
    const Panel       = mods.panel?.default;
    const History     = mods.history?.default;
    const Registry    = mods.registry; // This is an object of exports, not a class
    const State       = mods.state;
    const LibraryTab  = mods.library?.default;
    const OutlinerTab = mods.outliner?.default;
    const InspectorTab= mods.inspector?.default;
    const MaterialsTab= mods.materials?.default; // <-- ADDED
    const ProjectTab  = mods.project?.default;
    // const DPad        = mods.dpad?.default; // REMOVED
    
    // Check for missing modules
    const missing = [
      ['editor', Editor?.init],
      ['toolbar', Toolbar?.init],
      ['panel', Panel?.init],
      ['history', History?.init],
      ['registry', Registry?.register], // Check for a key export
      ['state', State?.initState],
      ['library', LibraryTab?.init],
      ['outliner', OutlinerTab?.init],
      ['inspector', InspectorTab?.init],
      ['materials', MaterialsTab?.init], // <-- ADDED
      ['project', ProjectTab?.init],
      // ['dpad', DPad?.init] // REMOVED
    ].find(([name, ok]) => !ok);
    if (missing) throw new Error(`Module "${missing[0]}" is missing or invalid.`);

    const viewport = document.getElementById('viewport');
    const appRoot  = document.getElementById('app');

    const editor = Editor.init(viewport, App.bus);
    App.modules.editor = editor;

    // Init state manager first
    State.initState(editor, App.bus, Registry);

    // History second, now depends on State
    History.init(App.bus, State);

    // UI Modules
    Toolbar.init(document.getElementById('toolbar'), App.bus, State);
    Panel.init({
      tabs: {
        library:   root => LibraryTab.init(root, App.bus, State, Registry),
        outliner:  root => OutlinerTab.init(root, App.bus, State, Registry),
        inspector: root => InspectorTab.init(root, App.bus, State, Registry),
        materials: root => MaterialsTab.init(root, App.bus, State), // <-- ADDED
        project:   root => ProjectTab.init(root, App.bus, editor, State, Registry) // <-- ENHANCEMENT: Passed State
      }
    }, App.bus);
    
    // DPad.init(App.bus, State); // REMOVED

    // shortcuts
    window.addEventListener('keydown', e=>{
      const meta = e.ctrlKey || e.metaKey;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        State.deleteEntity(State.getSelected());
      }
      if (meta && e.key.toLowerCase() === 'z'){
        if (e.shiftKey) App.bus.emit('history-redo');
        else App.bus.emit('history-undo');
        e.preventDefault();
      }
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        State.duplicateEntity(State.getSelected());
      }
    });

    window.__ICONIC__ = { App, State, Registry, Editor };

    // Add default objects from Launch Tower
    State.addEntity('tower.base', 'base-tall');
    State.addEntity('tower.neck', 'neck-slim');
    State.addEntity('roof', 'roof-point');
    State.addEntity('top.floor', 'pad-long');
    State.addEntity('piping', 'pipes-quad');
    State.addEntity('rail.segment', '__none__');
    State.addEntity('bridge.tunnel', '__none__');
    State.addEntity('truss.box', '__none__');
    State.addEntity('window.mesh', '__none__');

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
