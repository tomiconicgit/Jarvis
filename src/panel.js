// panel.js — tabs container; hosts Scene & Material panes
export default {
  init({ tabs }){
    const paneScene = document.getElementById('pane-scene');
    const paneMat   = document.getElementById('pane-material');
    const map = { scene: paneScene, material: paneMat };

    // wire tabs
    document.querySelectorAll('.tab').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
        document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
        btn.classList.add('active'); document.getElementById('pane-'+btn.dataset.tab).classList.add('active');
      });
    });

    // mount content
    tabs.scene?.(paneScene);
    tabs.material?.(paneMat);
  }
};
