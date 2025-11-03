File: ui/file-panel-manager.js
--------------------------------------------------------------------------------
// File: ui/file-panel-manager.js
// --- MODIFIED IMPORT: Removed getEnsureTexState ---
import { scene, allModels, assignDefaultName, getBuilders } from '../core/scene-manager.js';
import { serializeModels, downloadBlob, loadFromJSON, exportGLB, importGLBFile } from '../fileio.js';
import { hidePanel, showTempMessage, togglePanel } from './ui-panels.js';
import { refreshSceneList } from './scene-panel-manager.js';
// --- NEW IMPORT: Get ensureTexState from props-panel directly ---
import { ensureTexState } from '../ui/props-panel.js';

export function initFilePanel() {
  const filePanel = document.getElementById('file-panel');
  const exportPanel = document.getElementById('export-panel');
  
  // Close buttons
  document.getElementById('close-file-panel').addEventListener('click', () => hidePanel(filePanel));
  
  // File Save
  document.getElementById('file-save').addEventListener('click', () => {
    const data = serializeModels(scene);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'scene.json');
    showTempMessage('Session saved');
    hidePanel(filePanel);
  });

  // File Load
  const pickerLoadJSON = document.getElementById('picker-load-json');
  document.getElementById('file-load').addEventListener('click', () => pickerLoadJSON.click());
  pickerLoadJSON.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      
      // --- MODIFIED CALL: Pass ensureTexState directly ---
      loadFromJSON(json, getBuilders(), scene, allModels, (o) => {
        if (!o.userData.label) assignDefaultName(o);
      }, ensureTexState); // <-- Use the direct import
      
      refreshSceneList();
      showTempMessage('Session loaded');
      hidePanel(filePanel);
    } catch (err) {
      showTempMessage('Load failed');
      console.error(err);
    } finally {
      pickerLoadJSON.value = '';
    }
  });

  // File Export
  document.getElementById('file-export').addEventListener('click', () => {
    document.getElementById('export-name').value = 'Model.glb';
    document.getElementById('opt-merge-all').checked = false;
    togglePanel(exportPanel);
  });
  document.getElementById('export-close').addEventListener('click', () => hidePanel(exportPanel));
  document.getElementById('export-cancel').addEventListener('click', () => hidePanel(exportPanel));
  document.getElementById('export-go').addEventListener('click', () => {
    const name = (document.getElementById('export-name').value || 'Model.glb').trim();
    const optOnlyModels = document.getElementById('opt-only-models').checked;
    const optBinary = document.getElementById('opt-binary').checked;
    const optMergeAll = document.getElementById('opt-merge-all').checked;
    
    exportGLB(
      { 
        scene, 
        modelsOnly: optOnlyModels, 
        binary: optBinary, 
        fileName: name, 
        allModels,
        mergeAll: optMergeAll
      },
      () => showTempMessage('Exported'),
      (e) => { console.error(e); showTempMessage('Export failed'); }
    );
    hidePanel(exportPanel);
  });

  // File Import
  const pickerImportGLB = document.getElementById('picker-import-glb');
  document.getElementById('file-import').addEventListener('click', () => pickerImportGLB.click());
  pickerImportGLB.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      importGLBFile(f, scene, allModels, (o) => {
        assignDefaultName(o);
        refreshSceneList();
      });
      showTempMessage('Importing…');
    } catch (err) {
      console.error(err);
      showTempMessage('Import failed');
    } finally {
      pickerImportGLB.value = '';
    }
  });
}
