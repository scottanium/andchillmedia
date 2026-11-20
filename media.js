(function(){
const IMG='https://image.tmdb.org/t/p/';
const $m=(id)=>document.getElementById(id);
const esc=(s)=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hue(s){let h=0;s=String(s||'');for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)%360;}
function initial(s){const t=String(s||'').trim();return (t[0]||'?').toUpperCase();}
// search text normaliser: lower-case, strip accents and punctuation ("Spider-Man" matches "spider man")
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9\u0080-\uffff]+/g,' ').trim();}
const HIST_MAX=500;
let sheetItem=null;
const PF=()=>window.ACMProfiles;
function watchKey(){return PF()?PF().key('watch'):'acm_watchHistory_v1';}
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
// Cost groups. "rb" = rent or buy (paid per title); "u" = no US availability data (unknown).
const CATS=[['f','Free'],['a','Free with ads'],['s','Subscription'],['rb','Rent / Buy'],['u','Unknown']];
const CAT=[['f','Free'],['a','Free with ads'],['s','Subscription'],['r','Rent'],['b','Buy']];
const BIT={f:1,a:2,s:4,rb:8,u:16};
function costMask(x){
  if(!x.w)return BIT.u;
  let m=0;
  if(x.w.f)m|=BIT.f; if(x.w.a)m|=BIT.a; if(x.w.s)m|=BIT.s; if(x.w.r||x.w.b)m|=BIT.rb;
  return m||BIT.u;
}
const MAJOR=[8,15,1899,337,9,350,386,531,73,300,2,10,3,192,7,283,207,43,191,257,2383,538];
let IDX=null, DATA={movie:[],tv:[]}, loadState={movie:null,tv:null};
const listeners=[];
const st={movie:null,tv:null};
function defState(){return {q:'',sort:'pop',genres:new Set(),cats:new Set(),decades:new Set(),prov:'',y1:'',y2:'',cert:'',lang:'',shown:60};}
st.movie=defState(); st.tv=defState();
let cur=null, list=[], langName=null;
try{langName=new Intl.DisplayNames(['en'],{type:'language'});}catch(e){}
const ln=(c)=>{try{return (langName&&langName.of(c))||c;}catch(e){return c;}};
async function getJSON(u){const r=await fetch(u);if(!r.ok)throw new Error(u+' '+r.status);return r.json();}
function prep(x,kind){x.y=x.d?+x.d.slice(0,4):0;x.k=kind;x.lt=norm(x.t);x.cm=costMask(x);x.ps=null;
  if(x.w){x.ps=new Set();for(const c in x.w)x.w[c].forEach(p=>x.ps.add(p));}
  x.sk=x.lt;return x;}
// Lazy, progressive loader: chunks are fetched 3 at a time and appended as they arrive.
function startLoad(kind){
  if(loadState[kind])return loadState[kind];
  const ls={total:0,done:0,complete:false,promise:null,firstReady:null};
  let resolveFirst;ls.firstReady=new Promise(r=>resolveFirst=r);
  loadState[kind]=ls;
  ls.promise=(async()=>{
    if(!IDX)IDX=await getJSON('./media-index.json');
    const n=IDX.stats[kind].chunks;ls.total=n;
    const results=new Array(n);let next=0;let appended=0;
    const need=Math.min(4,n);   // chunks 1-4 hold the most popular titles; show them first
    async function worker(){
      while(next<n){const i=next++;
        const arr=await getJSON(`./media-${kind}-${i+1}.json`);results[i]=arr;
        // append in chunk order so the default (popularity) order stays stable
        while(results[appended]){const a=results[appended];results[appended]=null;a.forEach(x=>prep(x,kind));DATA[kind].push(...a);appended++;ls.done=appended;
          if(appended>=need)resolveFirst();
          notify(kind);}
      }}
    await Promise.all([worker(),worker(),worker()]);
    ls.complete=true;resolveFirst();notify(kind);
  })();
  ls.promise.catch(()=>{});
  return ls;
}
function notify(kind){listeners.forEach(f=>{try{f(kind);}catch(e){}});}
async function load(kind){const ls=startLoad(kind);await ls.promise;return DATA[kind];}
async function loadFirst(kind){const ls=startLoad(kind);await Promise.race([ls.firstReady,ls.promise]);return DATA[kind];}
function decadeOf(y){return Math.floor(y/10)*10;}
function buildFilters(kind){
  const s=st[kind], arr=DATA[kind];
  const gcount={};arr.forEach(x=>x.g.forEach(g=>gcount[g]=(gcount[g]||0)+1));
  const gids=Object.keys(gcount).sort((a,b)=>(IDX.genres[a]||'').localeCompare(IDX.genres[b]||''));
  $m('mGenres').innerHTML=gids.map(g=>`<button type="button" class="chip${s.genres.has(+g)?' active':''}" data-g="${g}">${esc(IDX.genres[g]||g)}</button>`).join('');
  $m('mCats').innerHTML=CATS.map(([c,l])=>`<button type="button" class="chip${s.cats.has(c)?' active':''}" data-c="${c}">${l}</button>`).join('');
  const dc={};arr.forEach(x=>{if(x.y>=1900)dc[decadeOf(x.y)]=1;});
  const decs=Object.keys(dc).map(Number).sort((a,b)=>b-a);
  $m('mDecades').innerHTML=decs.map(d=>`<button type="button" class="chip${s.decades.has(d)?' active':''}" data-d="${d}">${d}s</button>`).join('');
  const pc={};arr.forEach(x=>{if(x.ps)x.ps.forEach(p=>pc[p]=(pc[p]||0)+1);});
  const P=IDX.providers;const all=Object.keys(pc).filter(p=>P[p]);
  const major=MAJOR.filter(p=>pc[p]).map(String);
  const rest=all.filter(p=>!major.includes(p)&&pc[p]>=5).sort((a,b)=>P[a][0].localeCompare(P[b][0]));
  const opt=p=>`<option value="${p}"${s.prov===p?' selected':''}>${esc(P[p][0])} (${pc[p]})</option>`;
  $m('mProv').innerHTML=`<option value="">Any service</option><optgroup label="Popular services">${major.map(opt).join('')}</optgroup><optgroup label="All other services">${rest.map(opt).join('')}</optgroup>`;
  const cc={};arr.forEach(x=>{if(x.c)cc[x.c]=(cc[x.c]||0)+1;});
  const order=['G','PG','PG-13','R','NC-17','NR','TV-Y','TV-Y7','TV-G','TV-PG','TV-14','TV-MA'];
  const certs=Object.keys(cc).sort((a,b)=>{const ia=order.indexOf(a),ib=order.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b);});
  $m('mCert').innerHTML=`<option value="">Any rating</option>`+certs.map(c=>`<option${s.cert===c?' selected':''}>${esc(c)}</option>`).join('')+`<option value="__none"${s.cert==='__none'?' selected':''}>Not rated / unknown</option>`;
  const lc={};arr.forEach(x=>lc[x.l]=(lc[x.l]||0)+1);
  const langs=Object.keys(lc).filter(l=>lc[l]>=3).sort((a,b)=>lc[b]-lc[a]);
  $m('mLang').innerHTML=`<option value="">Any language</option>`+langs.map(l=>`<option value="${esc(l)}"${s.lang===l?' selected':''}>${esc(ln(l))} (${lc[l]})</option>`).join('');
  $m('mY1').value=s.y1;$m('mY2').value=s.y2;$m('mQ').value=s.q;$m('mSort').value=s.sort;
  $m('mQ').placeholder=kind==='movie'?'Search movies…':'Search TV shows…';
}
// Shared filter + sort used by the Movies/TV tabs and by the Search tab.
// f: {q,genres:Set<number>,cats:Set,decades:Set,prov,y1,y2,cert,lang,sort}
function mask(cats){let m=0;cats.forEach(c=>{m|=BIT[c]||0;});return m;}
function filterMedia(arr,f){
  const toks=norm(f.q||'').split(' ').filter(Boolean);
  const y1=parseInt(f.y1)||0,y2=parseInt(f.y2)||9999;
  const prov=f.prov?+f.prov:0, cm=mask(f.cats||new Set()), gs=[...(f.genres||[])], decs=f.decades||new Set();
  const noCatSel=!cm;
  return arr.filter(x=>{
    for(let i=0;i<toks.length;i++)if(x.lt.indexOf(toks[i])<0)return false;
    if(gs.length&&!gs.every(g=>x.g.includes(g)))return false;
    if((y1||y2<9999)&&(!x.y||x.y<y1||x.y>y2))return false;
    if(decs.size&&!(x.y&&decs.has(decadeOf(x.y))))return false;
    if(f.cert){if(f.cert==='__none'){if(x.c&&x.c!=='NR')return false;}else if(x.c!==f.cert)return false;}
    if(f.lang&&x.l!==f.lang)return false;
    if(cm&&!(x.cm&cm))return false;
    if(prov){
      if(!x.w)return false;
      const cs=[];if(noCatSel||cm&BIT.f)cs.push('f');if(noCatSel||cm&BIT.a)cs.push('a');if(noCatSel||cm&BIT.s)cs.push('s');if(noCatSel||cm&BIT.rb)cs.push('r','b');
      if(!cs.some(c=>x.w[c]&&x.w[c].includes(prov)))return false;
    }
    return true;});
}
function relScore(x,q){ // 0 exact, 1 starts-with, 2 word starts-with, 3 other substring
  if(!q)return 0;
  if(x.lt===q)return 0;
  if(x.lt.startsWith(q))return 1;
  if(x.lt.indexOf(' '+q)>=0)return 2;
  return 3;
}
const SORTS={pop:(x,y)=>y.p-x.p,
  rate:(x,y)=>((y.n>=50)-(x.n>=50))||y.v-x.v||y.n-x.n,
  votes:(x,y)=>y.n-x.n,
  new:(x,y)=>(y.d||'').localeCompare(x.d||''),
  old:(x,y)=>((!x.d)-(!y.d))||(x.d||'').localeCompare(y.d||''),
  az:(x,y)=>x.sk<y.sk?-1:x.sk>y.sk?1:0,
  za:(x,y)=>x.sk<y.sk?1:x.sk>y.sk?-1:0,
  rlong:(x,y)=>(y.r||0)-(x.r||0),
  rshort:(x,y)=>((!x.r)-(!y.r))||(x.r||0)-(y.r||0)};
function sortMedia(a,f){
  const q=norm(f.q||'');
  const base=SORTS[f.sort]||SORTS.pop;
  if(q&&(f.sort==='pop'||!f.sort)){ // when searching with the default sort, best title matches first
    const sc=new Map();a.forEach(x=>sc.set(x,relScore(x,q)));
    return a.slice().sort((x,y)=>(sc.get(x)-sc.get(y))||base(x,y));
  }
  return a.slice().sort(base);
}
function apply(){
  const kind=cur,s=st[kind];
  list=sortMedia(filterMedia(DATA[kind],s),s);
  const nf=s.genres.size+s.cats.size+s.decades.size+(s.prov?1:0)+(s.y1?1:0)+(s.y2?1:0)+(s.cert?1:0)+(s.lang?1:0);
  $m('mFiltBtn').textContent='Filters'+(nf?` (${nf})`:'');$m('mFiltBtn').classList.toggle('on',!!nf);
  updateCount();
  s.shown=60;renderGrid(true);
}
function updateCount(){
  const kind=cur;if(!kind)return;const ls=loadState[kind];
  const total=ls&&ls.total?IDX.stats[kind].count:DATA[kind].length;
  const more=ls&&!ls.complete?` · loading more (${ls.done}/${ls.total})…`:'';
  $m('mCount').textContent=`${list.length.toLocaleString()} of ${(ls&&ls.complete?DATA[kind].length:total).toLocaleString()} ${kind==='movie'?'movies':'TV shows'}${more}`;
}
const COST={
  f:{label:'Free',btn:'Watch free',cls:'free'},
  a:{label:'Free with ads',btn:'Watch free (ads)',cls:'ads'},
  s:{label:'Needs subscription',btn:'Watch with subscription',cls:'sub'},
  r:{label:'Rent (paid)',btn:'Rent',cls:'rent'},
  b:{label:'Buy (paid)',btn:'Buy',cls:'buy'}
};
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
  if(!x.w) return {cls:'none',text:'Not currently streaming in the US'};
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
    return {cls:'free',text:'✅ Free to watch on '+list.join(', ')};
  }
  if(x.w.s||x.w.r||x.w.b) return {cls:'paid',text:'💲 Not free — subscription, rent or buy only'};
  return {cls:'none',text:'Not currently streaming in the US'};
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
function renderGrid(reset){
  const g=$m('mGrid');const s=st[cur];
  if(reset){g.innerHTML='';g.dataset.n=0;}
  const from=+g.dataset.n,to=Math.min(list.length,s.shown);
  const frag=document.createElement('div');
  let html='';for(let i=from;i<to;i++)html+=cardHTML(list[i],i);
  frag.innerHTML=html;while(frag.firstChild)g.appendChild(frag.firstChild);
  g.dataset.n=to;
  if(!list.length){const ls=loadState[cur];g.innerHTML='<div class="empty">'+(ls&&!ls.complete?'Still loading the catalog… results will appear here.':'No matches. Try removing a filter.')+'</div>';}
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
  const P=IDX.providers;const link=`https://www.themoviedb.org/${x.k}/${x.i}/watch?locale=US`;
  const gn=x.g.map(g=>IDX.genres[g]).filter(Boolean).join(', ');
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
      const text=L.type==='deep'?`Open on ${host}`:L.type==='search'?`Find on ${host}`:'See options (TMDB)';
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
  try{await load(kind);}catch(e){return false;}
  const x=(DATA[kind]||[]).find(t=>t.i===id);
  if(!x)return false;
  openSheet(x,{silent:true});
  return true;
}
async function show(kind){
  cur=kind;list=[];$m('mGrid').innerHTML='<div class="empty">Loading '+(kind==='movie'?'movies':'TV shows')+'…</div>';$m('mCount').textContent='';
  try{await loadFirst(kind);}catch(e){$m('mGrid').innerHTML='<div class="empty">Could not load data. Check your connection and tap Refresh.</div>';return;}
  if(cur!==kind)return;buildFilters(kind);apply();
}
let rebuildT=null;
listeners.push(kind=>{
  if(cur!==kind||!DATA[kind].length||$m('mediaView').classList.contains('hide'))return;
  clearTimeout(rebuildT);
  rebuildT=setTimeout(()=>{
    const ls=loadState[kind];
    if(window.scrollY<400||!list.length){ // don't shift the grid under someone who has scrolled
      buildFilters(kind);const s=st[kind];apply();
    }else updateCount();
  },250);
});
window.FreeMedia={show,openById,load,loadFirst,startLoad,openSheet,norm,filterMedia,sortMedia,cardHTML,CATS,BIT,decadeOf,
  data:(k)=>DATA[k],idx:()=>IDX,state:(k)=>loadState[k],onLoad:(f)=>listeners.push(f),esc,hue,initial,ln};
function wire(){
  const deb=(f,ms)=>{let t;return()=>{clearTimeout(t);t=setTimeout(f,ms);};};
  $m('mQ').addEventListener('input',deb(()=>{st[cur].q=$m('mQ').value;apply();},150));
  $m('mSort').onchange=()=>{st[cur].sort=$m('mSort').value;apply();};
  $m('mFiltBtn').onclick=()=>$m('mFilters').classList.toggle('hide');
  $m('mGenres').onclick=e=>{const b=e.target.closest('[data-g]');if(!b)return;const g=+b.dataset.g,s=st[cur].genres;s.has(g)?s.delete(g):s.add(g);b.classList.toggle('active');apply();};
  $m('mCats').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;const c=b.dataset.c,s=st[cur].cats;s.has(c)?s.delete(c):s.add(c);b.classList.toggle('active');apply();};
  $m('mDecades').onclick=e=>{const b=e.target.closest('[data-d]');if(!b)return;const d=+b.dataset.d,s=st[cur].decades;s.has(d)?s.delete(d):s.add(d);b.classList.toggle('active');apply();};
  $m('mProv').onchange=()=>{st[cur].prov=$m('mProv').value;apply();};
  $m('mCert').onchange=()=>{st[cur].cert=$m('mCert').value;apply();};
  $m('mLang').onchange=()=>{st[cur].lang=$m('mLang').value;apply();};
  $m('mY1').addEventListener('input',deb(()=>{st[cur].y1=$m('mY1').value;apply();},400));
  $m('mY2').addEventListener('input',deb(()=>{st[cur].y2=$m('mY2').value;apply();},400));
  $m('mReset').onclick=()=>{const q=st[cur].q,so=st[cur].sort;st[cur]=defState();st[cur].q=q;st[cur].sort=so;buildFilters(cur);apply();};
  $m('mGrid').onclick=e=>{const b=e.target.closest('.card');if(b)openSheet(list[+b.dataset.i]);};
  $m('sheetClose').onclick=closeSheet;
  $m('sheet').onclick=e=>{if(e.target.id==='sheet')closeSheet();};
  $m('sheetBody').addEventListener('click',e=>{
    const a=e.target.closest('a[data-hist]');
    if(!a||!sheetItem)return;
    recordWatch(sheetItem,{ev:a.dataset.hist||'watch',svc:a.dataset.svc||''});
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
  const io=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)&&cur&&!$m('mediaView').classList.contains('hide')&&st[cur].shown<list.length){st[cur].shown+=60;renderGrid(false);}},{rootMargin:'800px'});
  io.observe($m('mSentinel'));
}
wire();
})();
