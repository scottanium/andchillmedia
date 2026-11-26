// Title detail sheet + cards + watch history recording ("Where to watch" rows, provider links).
// Uses window.ACMMediaData; used by media-ui.js and search.js through window.ACMMediaSheet / window.FreeMedia.
(function(){
const IMG='https://image.tmdb.org/t/p/';
const WT=ACM_CONFIG.text.watch;
const $m=(id)=>document.getElementById(id);
const {esc,hue,initial}=ACMUtil;
const D=ACMMediaData;
const {ln}=D;
const HIST_MAX=ACM_CONFIG.limits.historyMax;
let sheetItem=null;
const PF=()=>window.ACMProfiles;
function watchKey(){return PF()?PF().key('watch'):ACM_CONFIG.storage.legacyWatch;}
function loadWatch(){try{const a=JSON.parse(localStorage.getItem(watchKey())||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function saveWatch(a){try{localStorage.setItem(watchKey(),JSON.stringify(a.slice(0,HIST_MAX)));}catch(e){}}
function recordWatch(x,extra){
  if(!x)return;
  const entry={i:x.i,k:x.k,t:x.t,pp:x.pp||'',ts:Date.now(),ev:(extra&&extra.ev)||'sheet'};
  if(extra&&extra.svc)entry.svc=extra.svc;
  const arr=loadWatch();
  arr.unshift(entry);
  saveWatch(arr);
  if(typeof window.renderHistory==='function'){
    const hv=document.getElementById('histView');
    if(hv&&!hv.classList.contains('hide')) window.renderHistory();
  }
}
function posterTile(x,size,cls){
  const ini=esc(initial(x.t));
  const img=x.pp?`<img loading="lazy" decoding="async" alt="" src="${IMG}${size}${esc(x.pp)}" onerror="this.remove()">`:'';
  return `<div class="${cls}" style="--h:${hue(x.t)}" data-initial="${ini}">${img}`;
}
const COST=ACM_CONFIG.text.costDetail;
const COST_ORDER=['f','a','s','r','b'];
function providerCats(x){
  const map=new Map();
  if(!x.w)return map;
  for(const c of COST_ORDER){
    const ids=x.w[c]; if(!ids)continue;
    for(const p of ids){ if(!map.has(p)) map.set(p,[]); map.get(p).push(c); }
  }
  return map;
}
function bestCat(cats){return COST_ORDER.find(c=>cats.includes(c));}
function cleanProvName(n){return String(n||'').replace(/ (Store|with Ads|Standard with Ads|Basic with Ads)$/,'');}
function watchSummary(x,P){
  if(!x.w) return {cls:'none',text:WT.notStreaming};
  const names=[];
  const seen=new Set();
  for(const c of ['f','a']){
    for(const p of (x.w[c]||[])){
      const n=cleanProvName((P[p]||['Provider '+p])[0]);
      if(!n||seen.has(n)) continue;
      seen.add(n); names.push(n);
    }
  }
  if(names.length){
    let list=names;
    if(list.length>5) list=list.slice(0,5).concat(['and '+(names.length-5)+' more']);
    return {cls:'free',text:WT.freeOn+list.join(', ')};
  }
  if(x.w.s||x.w.r||x.w.b) return {cls:'paid',text:WT.paidOnly};
  return {cls:'none',text:WT.notStreaming};
}
function badge(x){
  if(!x.w) return '<span class="badge na">N/A</span>';
  if(x.w.f||x.w.a) return '<span class="badge free">FREE</span>';
  return '<span class="badge paid">PAID</span>';
}
function meta(x){const p=[];if(x.y)p.push(x.y);if(x.k==='tv'&&x.s)p.push(x.s+' season'+(x.s>1?'s':''));else if(x.r)p.push(x.r+'m');if(x.c)p.push(x.c);return p.join(' · ');}
function cardHTML(x,idx){
  return `<button type="button" class="card" data-i="${idx}">${posterTile(x,'w185','poster')}${x.v?`<span class="badge">★ ${x.v.toFixed(1)}</span>`:''}${badge(x)}</div><div class="ci"><div class="ct">${esc(x.t)}</div><div class="cm">${esc(x.k==='tv'?'TV · ':'')}${esc(meta(x))}</div></div></button>`;
}
// One row per streaming service. Rows merge TMDB variants of the same service (e.g. Netflix + Netflix with Ads)
// but the cost labels of every variant are kept, so Free / Subscription / Rent / Buy stay accurate.
function providerRows(x,P,link){
  const AP=window.ACMProviders;
  const map=providerCats(x);
  const rows=new Map();
  for(const [pid,cats] of map){
    const name=(P[pid]||['Provider '+pid,''])[0];
    const logo=(P[pid]||['',''])[1];
    const key=AP.familyOf(name);
    const canon=AP.canonName(name,key);
    const gid=(AP.CHANNEL.test(name)?'ch:':'')+canon;
    let r=rows.get(gid);
    if(!r){r={name:canon,raw:name,logo,cats:new Set(),pid};rows.set(gid,r);}
    cats.forEach(c=>r.cats.add(c));
    if(!r.logo&&logo)r.logo=logo;
  }
  const out=[...rows.values()].map(r=>{r.cl=[...r.cats].sort((a,b)=>COST_ORDER.indexOf(a)-COST_ORDER.indexOf(b));r.link=AP.link(r.raw,x.t,x.h,link);return r;});
  out.sort((a,b)=>COST_ORDER.indexOf(a.cl[0])-COST_ORDER.indexOf(b.cl[0])||a.name.localeCompare(b.name));
  return out;
}
function openSheet(x,opts){
  const P=D.idx().providers;const link=`https://www.themoviedb.org/${x.k}/${x.i}/watch?locale=US`;
  const gn=x.g.map(g=>D.idx().genres[g]).filter(Boolean).join(', ');
  const m=[];if(x.y)m.push(x.k==='tv'?(x.y+(x.end?'–'+x.end:'–')):x.y);
  if(x.k==='tv'){if(x.s)m.push(`${x.s} season${x.s>1?'s':''}${x.e?`, ${x.e} episodes`:''}`);if(x.r)m.push(`~${x.r} min/episode`);}else if(x.r)m.push(`${Math.floor(x.r/60)?Math.floor(x.r/60)+'h ':''}${x.r%60}m`);
  if(x.c)m.push(x.c);
  const sum=watchSummary(x,P);
  let w=`<div class="wsum ${sum.cls}">${esc(sum.text)}</div>`;
  if(x.w){
    const rows=providerRows(x,P,link);
    w+=`<div class="wgroup"><div class="provs">`+rows.map(r=>{
      const cost=COST[r.cl[0]];
      const labels=r.cl.map(c=>`<span class="clabel ${COST[c].cls}">${esc(COST[c].label)}</span>`).join('');
      const L=r.link;
      const host=(L.key&&window.ACMProviders.FAM[L.key])?window.ACMProviders.FAM[L.key].name:r.name;   // channels open their host app (Prime Video / Apple TV / Roku)
      const text=L.type==='deep'?WT.openOn+host:L.type==='search'?WT.findOn+host:WT.seeOptions;
      const hist=L.type==='search'?'search':'watch';
      const note=L.type==='deep'?'Opens the title page':L.type==='search'?`Searches ${host} for this title`:'No direct link for this service';
      return `<div class="prov">${r.logo?`<img loading="lazy" alt="" src="${IMG}w92${r.logo}">`:''}<span class="pn"><span class="pname">${esc(r.name)}</span><span class="clabels">${labels}</span></span><span class="pa"><a class="primary ${cost.cls}" href="${esc(L.url)}" target="_blank" rel="noopener noreferrer" data-link="${L.type}" data-hist="${hist}" data-svc="${esc(r.name)}" title="${esc(note)}">${esc(text)}</a></span></div>`;
    }).join('')+`</div></div>`;
  }
  sheetItem=x;
  $m('sheetBody').innerHTML=`<div class="shead">${posterTile(x,'w342','sposter')}</div><div><h2>${esc(x.t)}</h2><div class="smeta">${esc(m.join(' · '))}<br>${x.v?`★ ${x.v.toFixed(1)}/10 (${x.n.toLocaleString()} votes)`:'Not yet rated'}<br>${esc(gn)}${x.l?`<br>Language: ${esc(ln(x.l))}`:''}</div></div></div>
   <p class="sov">${esc(x.o||'No overview available.')}</p><h2 id="wHead" style="font-size:1.05rem;margin:18px 0 4px">Where to watch (US)</h2>${w}
   <p class="smeta" style="margin-top:14px"><a href="${link}" target="_blank" rel="noopener" style="color:var(--accent)">All options on TMDB</a> · Streaming availability data provided by JustWatch. Service buttons open that service's page or search, and you may need to sign in there.</p>`;
  $m('sheet').classList.add('show');$m('sheetBox').scrollTop=0;$m('sheetClose').focus();
  if(!opts||!opts.silent) recordWatch(x,{ev:'sheet'});
}
function closeSheet(){$m('sheet').classList.remove('show');sheetItem=null;}
async function openById(kind,id){
  try{await D.load(kind);}catch(e){return false;}
  const x=(D.DATA[kind]||[]).find(t=>t.i===id);
  if(!x)return false;
  openSheet(x,{silent:true});
  return true;
}
function wireSheet(){
  $m('sheetClose').onclick=closeSheet;
  $m('sheet').onclick=e=>{if(e.target.id==='sheet')closeSheet();};
  $m('sheetBody').addEventListener('click',e=>{
    const a=e.target.closest('a[data-hist]');
    if(!a||!sheetItem)return;
    recordWatch(sheetItem,{ev:a.dataset.hist||'watch',svc:a.dataset.svc||''});
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
}
wireSheet();
window.ACMMediaSheet={posterTile,cardHTML,openSheet,closeSheet,openById};
})();
