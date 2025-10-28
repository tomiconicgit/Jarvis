// loader.js — single-pass module loader with clear error reporting
export function setStatus(msg){
  const s = document.getElementById('status');
  if (s) s.textContent = String(msg);
}
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
export async function loadManifest(list, onProgress){
  const mods = Object.create(null);
  let done = 0; const total = list.length;
  for (const item of list){
    try{
      const mod = await import(/* @vite-ignore */ item.path);
      mods[item.id] = mod;
      done++; onProgress?.(done, total);
    }catch(err){
      console.error('[Loader] Failed while importing:', item.id, item.path, err);
      const firstStackLine = (err?.stack || '').split('\n')[1]?.trim() || '';
      setStatus(`Error in "${item.id}": ${err?.message || err} ${firstStackLine}`);
      throw err;
    }
  }
  return mods;
}
