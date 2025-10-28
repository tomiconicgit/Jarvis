/*
File: src/panel.js
*/
// panel.js — tabbed interface manager
export default {
  init({ tabs }, bus){
    const panel = document.getElementById('panel');
    panel.innerHTML = `
      <div id="panel-tabs">
        <div class="panel-tab active" data-tab="scene">Scene</div>
        <div class="panel-tab" data-tab="transform" style="display:none;">Transform</div>
      </div>
      <div id="pane-scene" class="panel-pane active"></div>
      <div id="pane-transform" class="panel-pane"></div>
    `;

    const tabButtons = panel.querySelectorAll('.panel-tab');
    const tabPanes = panel.querySelectorAll('.panel-pane');

    // Initialize tab content
    tabs.scene?.(panel.querySelector('#pane-scene'));
    tabs.transform?.(panel.querySelector('#pane-transform'));

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

    // Show/hide Transform tab based on selection
    const transformTab = panel.querySelector('[data-tab="transform"]');
    bus.on('selection-changed', (obj) => {
      transformTab.style.display = obj ? 'block' : 'none';
      if (!obj && transformTab.classList.contains('active')) {
        // If object is deselected and transform tab was active, switch back to scene tab
        transformTab.classList.remove('active');
        panel.querySelector('#pane-transform').classList.remove('active');
        panel.querySelector('[data-tab="scene"]').classList.add('active');
        panel.querySelector('#pane-scene').classList.add('active');
      }
    });
  }
};
