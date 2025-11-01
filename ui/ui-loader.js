// File: ui/ui-loader.js

// List of all UI panels to load
const panels = [
  { id: 'file-panel-placeholder', path: 'ui/file-panel.html' },
  { id: 'add-panel-placeholder', path: 'ui/add-panel.html' },
  { id: 'scene-panel-placeholder', path: 'ui/scene-panel.html' },
  { id: 'tools-panel-placeholder', path: 'ui/tools-panel.html' }, // --- NEW
  { id: 'parent-panel-placeholder', path: 'ui/parent-panel.html' },
  { id: 'decimate-panel-placeholder', path: 'ui/decimate-panel.html' }, // --- NEW
  { id: 'export-panel-placeholder', path: 'ui/export-panel.html' },
  { id: 'props-panel-placeholder', path: 'ui/props-panel.html' },
];

/**
 * Fetches all HTML panel templates and injects them into the document.
 */
export async function loadUIPanels() {
  const fetchPromises = panels.map(panel => 
    fetch(panel.path)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load ${panel.path}`);
        return response.text();
      })
      .then(html => {
        const placeholder = document.getElementById(panel.id);
        if (placeholder) {
          placeholder.innerHTML = html;
        } else {
          console.warn(`Placeholder #${panel.id} not found.`);
        }
      })
  );

  // Wait for all panels to be fetched and injected
  await Promise.all(fetchPromises);
  console.log('All UI panels loaded.');
}
