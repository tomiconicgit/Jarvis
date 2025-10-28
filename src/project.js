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
          <button id="saveBtn">Save (to Device)</button>
          <button id="loadBtn">Load (from Device)</button>
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
      if (confirm('Load project from file? This will overwrite your current scene.')) {
        bus.emit('project-load');
      }
    });

    // Listen for toolbar shortcuts
    bus.on('project-save', () => {
      try {
        const jsonString = State.serializeState();
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { 
          href: url, 
          download: 'iconic_project.json' 
        });
        document.body.appendChild(a); // Needs to be in DOM for firefox
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
      } catch (e) {
        alert('Save failed: ' + e.message);
        __logErr('Save failed: ' + e.message);
      }
    });
    
    bus.on('project-load', () => {
      try {
        const input = Object.assign(document.createElement('input'), {
          type: 'file',
          accept: '.json, application/json'
        });

        input.addEventListener('change', (e) => {
          const file = input.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (readEvent) => {
            try {
              const jsonString = readEvent.target.result;
              State.deserializeState(jsonString);
              bus.emit('history-push', 'Load'); // Seed the history stack
            } catch (loadErr) {
              console.error("Failed to load state from file", loadErr);
              __logErr("Load failed: " + loadErr.message);
              alert('Failed to read or parse file: ' + loadErr.message);
            }
          };
          reader.onerror = () => {
            alert('Error reading file.');
            __logErr('Error reading file.');
          };
          reader.readAsText(file);
        });
        
        input.click();

      } catch (e) {
        alert('Load failed: ' + e.message);
        __logErr('Load failed: ' + e.message);
      }
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
