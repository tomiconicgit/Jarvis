// loader.js — dynamic loader + progress bar + logo
export function showLoader(){
  const el = document.getElementById('loader');
  el.style.display = 'flex';
  setStatus('loading…');
}
export function hideLoader(){
  const el = document.getElementById('loader');
  el.style.display = 'none';
}
export function reportProgress(done, total){
  const pct = total ? Math.round((done/total)*100) : 0;
  const bar = document.querySelector('#bar > span'); bar.style.width = pct + '%';
  setStatus(`loading ${done}/${total}`);
}
export async function loadManifest(list, onProgress){
  let done = 0; const total = list.length;
  for (const item of list){
    await import(item.path);
    done++; onProgress?.(done, total);
  }
}
function setStatus(msg){ const s=document.getElementById('status'); if(s) s.textContent = msg; }