// panel.js — scene-only container (no tabs)
export default {
  init({ tabs }){
    const paneScene = document.getElementById('pane-scene');
    tabs.scene?.(paneScene);
  }
};