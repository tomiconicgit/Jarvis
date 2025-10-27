// loader.js — dynamic loader + progress bar + logo
export function showLoader(){
  const el = document.getElementById('loader');
  if (el) el.style.display = 'flex';
  setStatus('loading…');
}
export function hideLoader(){
  const el = document.getElementById('loader');
  if (el) el.style.display = 'none';
}
export function reportProgress(done, total){
  const pct = total ? Math.round((done/total)*100) : 0;
  const bar = document.querySelector('#bar > span'); if (bar) bar.style.width = pct + '%';
  setStatus(`loading ${done}/${total}`);
}

/**
 * Import each module ONCE (with progress) and return a map of { id: module }
 * This avoids a second round of imports that can surface eval-time errors before we show the UI.
 */
export async function loadManifest(list, onProgress){
  const mods = Object.create(null);
  let done = 0; const total = list.length;
  for (const item of list){
    try{
      const mod = await import(/* @vite-ignore */ item.path);
      mods[item.id] = mod;
      done++; onProgress?.(done, total);
    }catch(err){
      console.error('Failed to load module:', item.path, err);
      setStatus(`failed: ${item.id}`);
      throw err;
    }
  }
  return mods;
}

export function setStatus(msg){
  const s=document.getElementById('status'); if(s) s.textContent = msg;
}