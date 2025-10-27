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
  const bar = document.querySelector('#bar > span'); if (bar) bar.style.width = pct + '%';
  setStatus(`loading ${done}/${total}`);
}
export async function loadManifest(list, onProgress){
  let done = 0; const total = list.length;
  for (const item of list){
    try{
      await import(/* @vite-ignore */ item.path);
      done++; onProgress?.(done, total);
    }catch(err){
      console.error('Failed to load module:', item.path, err);
      setStatus(`failed: ${item.id}`);
      throw err;
    }
  }
}
function setStatus(msg){ const s=document.getElementById('status'); if(s) s.textContent = msg; }
