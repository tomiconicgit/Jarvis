/*
File: src/panel.js
*/
// panel.js â tabbed interface manager
export default {
  init({ tabs }, bus){
    const panel = document.getElementById('panel');
    panel.innerHTML = `
      <div id="panel-tabs">
        <div class="panel-tab active" data-tab="library">Library</div>
        <div class="panel-tab" data-tab="outliner">Outliner</div>
        <div class="panel-tab" data-tab="inspector">Inspector</div>
        <div class="panel-tab" data-tab="materials">Materials</div>
        <div class="panel-tab" data-tab="project">Project</div>
      </div>
      <div id="pane-library" class="panel-pane active"></div>
      <div id="pane-outliner" class="panel-pane"></div>
      <div id="pane-inspector" class="panel-pane"></div>
      <div id="pane-materials" class="panel-pane"></div>
      <div id="pane-project" class="panel-pane"></div>
    `;

    const tabButtons = panel.querySelectorAll('.panel-tab');
    const tabPanes = panel.querySelectorAll('.panel-pane');

    // Initialize tab content
    tabs.library?.(panel.querySelector('#pane-library'));
    tabs.outliner?.(panel.querySelector('#pane-outliner'));
    tabs.inspector?.(panel.querySelector('#pane-inspector'));
    tabs.materials?.(panel.querySelector('#pane-materials')); // <-- ADDED
    tabs.project?.(panel.querySelector('#pane-project'));

    // Tab switching logic
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        panel.querySelector(`#pane-${tab}`).classList.add('active');
      });
    });

    // Auto-switch to Inspector on selection
    bus.on('selection-changed', (ent) => {
      if (ent) {
        // Find the currently active tab
        const currentActive = panel.querySelector('.panel-tab.active');
        // Only switch if we're not already on inspector or materials
        if (currentActive && currentActive.dataset.tab !== 'inspector' && currentActive.dataset.tab !== 'materials') {
          tabButtons.forEach(b => b.classList.remove('active'));
          tabPanes.forEach(p => p.classList.remove('active'));
          panel.querySelector('[data-tab="inspector"]').classList.add('active');
          panel.querySelector('#pane-inspector').classList.add('active');
        }
      }
    });
  }
};
