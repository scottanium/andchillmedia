// Listen/Watch history screen (stored per profile, see profiles.js).
// History is stored per profile (see profiles.js). kind is 'listen' or 'watch'.
const HIST_LISTEN='listen';
const HIST_WATCH='watch';
const HIST_MAX=ACM_CONFIG.limits.historyMax;
let histKind='listen';
function histKey(kind){return window.ACMProfiles?window.ACMProfiles.key(kind):(kind==='listen'?ACM_CONFIG.storage.legacyListen:ACM_CONFIG.storage.legacyWatch);}
function loadHist(kind){try{const a=JSON.parse(localStorage.getItem(histKey(kind))||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function saveHist(kind,arr){try{localStorage.setItem(histKey(kind),JSON.stringify(arr.slice(0,HIST_MAX)));}catch(e){}}
function recordListen(t){
  if(!t||!t.u)return;
  const entry={t:t.t,ar:t.ar,al:t.al,u:t.u,id:identOf(t),ts:Date.now()};
  const arr=loadHist(HIST_LISTEN);
  if(arr[0]&&arr[0].u===entry.u){arr[0].ts=entry.ts; if(!arr[0].id) arr[0].id=entry.id;}
  else arr.unshift(entry);
  saveHist(HIST_LISTEN,arr);
  const hv=$('histView');
  if(hv&&!hv.classList.contains('hide')&&histKind==='listen') renderHistory();
}
function ago(ts){
  const s=Math.max(0,(Date.now()-ts)/1000);
  if(s<45) return 'just now';
  if(s<3600) return Math.round(s/60)+'m ago';
  if(s<86400) return Math.round(s/3600)+'h ago';
  if(s<6*86400) return Math.round(s/86400)+'d ago';
  try{return new Date(ts).toLocaleDateString();}catch(e){return '';}
}
function renderHistory(){
  const list=$('histList'), count=$('histCount');
  if(!list) return;
  document.querySelectorAll('.histtabs [data-hist]').forEach(b=>{
    const on=b.dataset.hist===histKind; b.classList.toggle('active',on); b.setAttribute('aria-selected',on);
  });
  list.innerHTML='';
  if(histKind==='listen'){
    const arr=loadHist(HIST_LISTEN);
    count.textContent=arr.length? (arr.length+' play'+(arr.length===1?'':'s')) : '';
    if(!arr.length){list.innerHTML='<div class="empty">Nothing played yet. Tracks you start will show up here, only on this device.</div>';return;}
    arr.forEach((h,i)=>{
      const row=document.createElement('div'); row.className='row';
      const track={t:h.t,ar:h.ar,al:h.al,u:h.u,id:h.id,p:h.id?('https://archive.org/details/'+h.id):''};
      row.innerHTML=`${artHTML(h.al||h.t,track)}<div class="meta"><div class="title">${esc(h.t)}</div><div class="detail">${esc(h.ar)} · ${esc(h.al)}</div></div><span class="when">${esc(ago(h.ts))}</span><button type="button" class="rm" data-rm="${i}" aria-label="Remove from history">✕</button>`;
      row.onclick=(e)=>{
        const rm=e.target.closest('[data-rm]');
        if(rm){ const a=loadHist(HIST_LISTEN); a.splice(+rm.dataset.rm,1); saveHist(HIST_LISTEN,a); renderHistory(); return; }
        const found=CATALOG.find(t=>t.u===h.u)||track;
        playList([found],0);
      };
      list.appendChild(row);
    });
  } else {
    const arr=loadHist(HIST_WATCH);
    count.textContent=arr.length? (arr.length+' event'+(arr.length===1?'':'s')) : '';
    if(!arr.length){list.innerHTML='<div class="empty">No titles opened yet. Opening a movie or show, or tapping Watch, is saved here on this device only.</div>';return;}
    arr.forEach((h,i)=>{
      const row=document.createElement('div'); row.className='row';
      const kind=h.k==='tv'?'TV':'Movie';
      let ev='Opened';
      if(h.ev==='watch') ev=h.svc?('Watch · '+h.svc):'Watch';
      else if(h.ev==='search') ev=h.svc?('Search on '+h.svc):'Search';
      const tile=artHTML(h.t, null, 'posterish', h.pp?('https://image.tmdb.org/t/p/w185'+h.pp):'');
      row.innerHTML=`${tile}<div class="meta"><div class="title">${esc(h.t)}</div><div class="detail">${esc(kind)} · ${esc(ev)}</div></div><span class="when">${esc(ago(h.ts))}</span><button type="button" class="rm" data-rm="${i}" aria-label="Remove from history">✕</button>`;
      row.onclick=async (e)=>{
        const rm=e.target.closest('[data-rm]');
        if(rm){ const a=loadHist(HIST_WATCH); a.splice(+rm.dataset.rm,1); saveHist(HIST_WATCH,a); renderHistory(); return; }
        if(!window.FreeMedia||!h.i||!h.k)return;
        const ok=await window.FreeMedia.openById(h.k,h.i);
        if(!ok) list.insertAdjacentHTML('afterbegin','<div class="empty">That title is no longer in the catalog.</div>');
      };
      list.appendChild(row);
    });
  }
}
window.renderHistory=renderHistory;
function clearHistory(){
  const label=histKind==='listen'?'listen':'watch';
  if(!confirm('Clear all '+label+' history? This cannot be undone.')) return;
  saveHist(histKind==='listen'?HIST_LISTEN:HIST_WATCH,[]);
  renderHistory();
}

