// File: ui/tools-panel-manager.js
import { hidePanel, togglePanel } from './ui-panels.js';
import { updateDecimateStats } from './decimate-panel-manager.js';
import { refreshParentList } from './parent-panel-manager.js'; // <-- NEW IMPORT

export function initToolsPanel() {
  const toolsPanel = document.getElementById('tools-panel');
  const parentPanel = document.getElementById('parent-panel');
  const decimatePanel = document.getElementById('decimate-panel');

  if (!toolsPanel || !parentPanel || !decimatePanel) return;

  document.getElementById('close-tools-panel').addEventListener('click', () => {
    hidePanel(toolsPanel);
  });

  document.getElementById('tools-parent-btn').addEventListener('click', () => {
    refreshParentList(); // <-- ADDED THIS LINE
    togglePanel(parentPanel); // This will hide toolsPanel and show parentPanel
  });

  document.getElementById('tools-decimate-btn').addEventListener('click', () => {
    updateDecimateStats(); // Refresh stats when panel is opened
    togglePanel(decimatePanel); // This will hide toolsPanel and show decimatePanel
  });
}
