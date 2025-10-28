/*
File: src/project.js
*/
// UI for the Project tab
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import * as THREE from 'three';

export default {
  init(root, bus, editor, State) { // <-- ENHANCEMENT: Added State
    root.innerHTML = `
      <div class="group">
        <h3>Save / Load</h3>
        <div class="btnbar">
          <button id="saveBtn">Save (local)</button>
          <button id="loadBtn">Load (local)</button>
        </div>
      </div>
      <div class="group">
        <h3>Export</h3>
        <button id="exportBtn" class="primary">Export GLB</button>
      </div>
      <div class="group">
        <h3>View</h3>
        <div class="row"><label>Grid</label>
          <select id="gridToggle"><option value="on">On</option><option value="off">Off</option></select>
        </div>
        <div class="row"><label>FOV</label>
          <input type="range" id="fov" min="35" max="80" step="1" value="50"/>
          <output id="fovOut">50</output>
        </div>
      </div>
    `;

    // Save / Load
    const saveBtn = root.querySelector('#saveBtn');
    const loadBtn = root.querySelector('#loadBtn');
    
    saveBtn.addEventListener('click', () => {
      bus.emit('project-save');
    });
    loadBtn.addEventListener('click', () => {
      if (confirm('Load project from local storage? This will overwrite your current scene.')) {
        bus.emit('project-load');
      }
    });

    // Listen for toolbar shortcuts
    bus.on('project-save', () => {
      try {
        // ENHANCEMENT: Call State directly instead of hacky localstorage read
        const lastState = State.serializeState();
        localStorage.setItem('tower_sandbox_project', lastState);
        alert('Saved to local storage.');
      } catch (e) {
        alert('Save failed: ' + e.message);
      }
    });
    
    bus.on('project-load', () => {
      const s = localStorage.getItem('tower_sandbox_project');
      if (!s) return alert('No save found in local storage.');
      // ENHANCEMENT: Call State directly. 'history-restore-state' was not implemented.
      State.deserializeState(s);
      bus.emit('history-push', 'Load'); // Seed the history stack
    });

    // Export
    root.querySelector('#exportBtn').addEventListener('click', () => {
      bus.emit('project-export');
    });
    
    bus.on('project-export', () => {
      const exporter = new GLTFExporter();
      const sceneToExport = editor.world; // Export the main world group
      
      exporter.parse(
        sceneToExport,
        (ab) => {
          const blob = new Blob([ab], { type: 'model/gltf-binary' });
          const url = URL.createObjectURL(blob);
          const a = Object.assign(document.createElement('a'), { href: url, download: 'iconic_scene.glb' });
          a.click();
          URL.revokeObjectURL(url);
        },
        (err) => {
          console.error('Export failed', err);
          __logErr('Export failed: ' + err.message);
        },
        { binary: true, onlyVisible: true }
      );
    });

    // View
    const gridToggle = root.querySelector('#gridToggle');
    gridToggle.addEventListener('change', () => {
      bus.emit('set-grid-visible', gridToggle.value === 'on');
    });
    
    bus.on('project-toggle-grid', () => {
        gridToggle.value = gridToggle.value === 'on' ? 'off' : 'on';
        bus.emit('set-grid-visible', gridToggle.value === 'on');
    });

    const fov = root.querySelector('#fov');
    const fovOut = root.querySelector('#fovOut');
    fov.addEventListener('input', () => {
      const val = parseFloat(fov.value);
      bus.emit('set-fov', val);
      fovOut.textContent = val;
    });
  }
};
