(function(){
const IMG='https://image.tmdb.org/t/p/';
const $m=(id)=>document.getElementById(id);
const esc=(s)=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hue(s){let h=0;s=String(s||'');for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)%360;}
function initial(s){const t=String(s||'').trim();return (t[0]||'?').toUpperCase();}
const HIST_WATCH='acm_watchHistory_v1';
const HIST_MAX=500;
let sheetItem=null;
function loadWatch(){try{const a=JSON.parse(localStorage.getItem(HIST_WATCH)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function saveWatch(a){try{localStorage.setItem(HIST_WATCH,JSON.stringify(a.slice(0,HIST_MAX)));}catch(e){}}
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
const CAT=[['f','Free'],['a','Free with ads'],['s','Subscription'],['r','Rent'],['b','Buy']];
const SEARCH=[
 [/netflix/i,'https://www.netflix.com/search?q='],
 [/hulu/i,'https://www.hulu.com/search?q='],
 [/^(hbo )?max|hbo max/i,'https://play.hbomax.com/search?q='],
 [/disney/i,'https://www.disneyplus.com/search?q='],
 [/amazon|prime video/i,'https://www.amazon.com/s?i=instant-video&k='],
 [/apple tv/i,'https://tv.apple.com/search?term='],
 [/peacock/i,'https://www.peacocktv.com/search?q='],
 [/paramount/i,'https://www.paramountplus.com/search/?q='],
 [/tubi/i,'https://tubitv.com/search/'],
 [/pluto/i,'https://pluto.tv/search/details?query='],
 [/youtube/i,'https://www.youtube.com/results?search_query='],
 [/google play/i,'https://play.google.com/store/search?c=movies&q='],
 [/fandango|vudu/i,'https://athome.fandango.com/content/browse/search?searchString='],
 [/roku/i,'https://therokuchannel.roku.com/search/'],
 [/crunchyroll/i,'https://www.crunchyroll.com/search?q='],
 [/plex/i,'https://watch.plex.tv/search?q='],
 [/kanopy/i,'https://www.kanopy.com/en/search?query='],
 [/hoopla/i,'https://www.hoopladigital.com/search?q='],
 [/starz/i,'https://www.starz.com/us/en/search?q='],
 [/philo/i,'https://www.philo.com/player/search?q='],
 [/fubo/i,'https://www.fubo.tv/stream/search/?q='],
 [/microsoft/i,'https://www.microsoft.com/en-us/search/shop/movies?q='],
];
function searchUrl(name,title){for(const [re,u] of SEARCH){if(re.test(name))return u+encodeURIComponent(title);}return null;}
const MAJOR=[8,15,1899,337,9,350,386,531,73,300,2,10,3,192,7,283,207,43,191,257,2383,538];
let IDX=null, DATA={movie:null,tv:null}, loading={};
const st={movie:null,tv:null};
function defState(){return {q:'',sort:'pop',genres:new Set(),cats:new Set(),prov:'',y1:'',y2:'',cert:'',lang:'',shown:60};}
st.movie=defState(); st.tv=defState();
let cur=null, list=[], langName=null;
try{langName=new Intl.DisplayNames(['en'],{type:'language'});}catch(e){}
const ln=(c)=>{try{return (langName&&langName.of(c))||c;}catch(e){return c;}};
async function getJSON(u){const r=await fetch(u);if(!r.ok)throw new Error(u+' '+r.status);return r.json();}
async function load(kind){
  if(DATA[kind])return DATA[kind];
  if(loading[kind])return loading[kind];
  loading[kind]=(async()=>{
    if(!IDX)IDX=await getJSON('./media-index.json');
    const n=IDX.stats[kind].chunks;const parts=await Promise.all(Array.from({length:n},(_,i)=>getJSON(`./media-${kind}-${i+1}.json`)));
    const arr=[].concat(...parts);
    arr.forEach(x=>{x.y=x.d?+x.d.slice(0,4):0;x.k=kind;x.ps=new Set();if(x.w)for(const c in x.w)x.w[c].forEach(p=>x.ps.add(p));x.lt=(x.t||'').toLowerCase();});
    DATA[kind]=arr;return arr;})();
  return loading[kind];
}
function buildFilters(kind){
  const s=st[kind], arr=DATA[kind];
  const gcount={};arr.forEach(x=>x.g.forEach(g=>gcount[g]=(gcount[g]||0)+1));
  const gids=Object.keys(gcount).sort((a,b)=>(IDX.genres[a]||'').localeCompare(IDX.genres[b]||''));
  $m('mGenres').innerHTML=gids.map(g=>`<button type="button" class="chip${s.genres.has(+g)?' active':''}" data-g="${g}">${esc(IDX.genres[g]||g)}</button>`).join('');
  $m('mCats').innerHTML=CAT.map(([c,l])=>`<button type="button" class="chip${s.cats.has(c)?' active':''}" data-c="${c}">${l}</button>`).join('');
  const pc={};arr.forEach(x=>x.ps.forEach(p=>pc[p]=(pc[p]||0)+1));
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
function apply(){
  const kind=cur,s=st[kind];let a=DATA[kind];
  const q=s.q.trim().toLowerCase();
  const y1=parseInt(s.y1)||0,y2=parseInt(s.y2)||9999;
  const prov=s.prov?+s.prov:0, cats=[...s.cats], gs=[...s.genres];
  a=a.filter(x=>{
    if(q&&!x.lt.includes(q))return false;
    if(gs.length&&!gs.every(g=>x.g.includes(g)))return false;
    if((y1||y2<9999)&&(!x.y||x.y<y1||x.y>y2))return false;
    if(s.cert){if(s.cert==='__none'){if(x.c&&x.c!=='NR')return false;}else if(x.c!==s.cert)return false;}
    if(s.lang&&x.l!==s.lang)return false;
    if(cats.length||prov){
      if(!x.w)return false;
      const cs=cats.length?cats:['f','a','s','r','b'];
      if(!cs.some(c=>x.w[c]&&(!prov||x.w[c].includes(prov))))return false;
    }
    return true;});
  const S={pop:(x,y)=>y.p-x.p,
    rate:(x,y)=>((y.n>=50)-(x.n>=50))||y.v-x.v||y.n-x.n,
    votes:(x,y)=>y.n-x.n,
    new:(x,y)=>(y.d||'').localeCompare(x.d||''),
    old:(x,y)=>((!x.d)-(!y.d))||(x.d||'').localeCompare(y.d||''),
    az:(x,y)=>x.t.localeCompare(y.t),
    za:(x,y)=>y.t.localeCompare(x.t),
    rlong:(x,y)=>(y.r||0)-(x.r||0),
    rshort:(x,y)=>((!x.r)-(!y.r))||(x.r||0)-(y.r||0)};
  list=a.slice().sort(S[s.sort]||S.pop);
  const nf=gs.length+cats.length+(prov?1:0)+(s.y1?1:0)+(s.y2?1:0)+(s.cert?1:0)+(s.lang?1:0);
  $m('mFiltBtn').textContent='Filters'+(nf?` (${nf})`:'');$m('mFiltBtn').classList.toggle('on',!!nf);
  $m('mCount').textContent=`${list.length.toLocaleString()} of ${DATA[kind].length.toLocaleString()} ${kind==='movie'?'movies':'TV shows'}`;
  s.shown=60;renderGrid(true);
}
function badge(x){if(!x.w)return '';if(x.w.f||x.w.a)return '<span class="badge free">FREE</span>';return '';}
function meta(x){const p=[];if(x.y)p.push(x.y);if(x.k==='tv'&&x.s)p.push(x.s+' season'+(x.s>1?'s':''));else if(x.r)p.push(x.r+'m');if(x.c)p.push(x.c);return p.join(' · ');}
function renderGrid(reset){
  const g=$m('mGrid');const s=st[cur];
  if(reset){g.innerHTML='';g.dataset.n=0;}
  const from=+g.dataset.n,to=Math.min(list.length,s.shown);
  const frag=document.createDocumentFragment();
  for(let i=from;i<to;i++){const x=list[i];const b=document.createElement('button');b.type='button';b.className='card';b.dataset.i=i;
    b.innerHTML=`${posterTile(x,'w185','poster')}${x.v?`<span class="badge">★ ${x.v.toFixed(1)}</span>`:''}${badge(x)}</div><div class="ci"><div class="ct">${esc(x.t)}</div><div class="cm">${esc(meta(x))}</div></div>`;
    frag.appendChild(b);}
  g.appendChild(frag);g.dataset.n=to;
  if(!list.length)g.innerHTML='<div class="empty">No matches. Try removing a filter.</div>';
}
function openSheet(x,opts){
  const P=IDX.providers;const link=`https://www.themoviedb.org/${x.k}/${x.i}/watch?locale=US`;
  const gn=x.g.map(g=>IDX.genres[g]).filter(Boolean).join(', ');
  const m=[];if(x.y)m.push(x.k==='tv'?(x.y+(x.end?'–'+x.end:'–')):x.y);
  if(x.k==='tv'){if(x.s)m.push(`${x.s} season${x.s>1?'s':''}${x.e?`, ${x.e} episodes`:''}`);if(x.r)m.push(`~${x.r} min/episode`);}else if(x.r)m.push(`${Math.floor(x.r/60)?Math.floor(x.r/60)+'h ':''}${x.r%60}m`);
  if(x.c)m.push(x.c);
  let w='';
  if(x.w){for(const [c,l] of CAT){if(!x.w[c])continue;
    w+=`<div class="wgroup"><h3>${l}</h3><div class="provs">`+x.w[c].map(p=>{const pr=P[p]||['Provider '+p,''];const su=searchUrl(pr[0],x.t);
      const sn=pr[0].replace(/ (Store|with Ads|Standard with Ads|Basic with Ads)$/,'');
      return `<div class="prov">${pr[1]?`<img loading="lazy" alt="" src="${IMG}w92${pr[1]}">`:''}<span class="pn">${esc(pr[0])}</span><span class="pa"><a class="primary" href="${link}" target="_blank" rel="noopener" data-hist="watch" data-svc="${esc(pr[0])}">Watch</a>${su?`<a href="${esc(su)}" target="_blank" rel="noopener" data-hist="search" data-svc="${esc(sn)}">Search on ${esc(sn)}</a>`:''}</span></div>`;}).join('')+`</div></div>`;}}
  else w=`<p class="smeta">No US streaming, rental, or purchase options are listed right now.</p>`;
  sheetItem=x;
  $m('sheetBody').innerHTML=`<div class="shead">${posterTile(x,'w342','sposter')}</div><div><h2>${esc(x.t)}</h2><div class="smeta">${esc(m.join(' · '))}<br>${x.v?`★ ${x.v.toFixed(1)}/10 (${x.n.toLocaleString()} votes)`:'Not yet rated'}<br>${esc(gn)}${x.l?`<br>Language: ${esc(ln(x.l))}`:''}</div></div></div>
   <p class="sov">${esc(x.o||'No overview available.')}</p><h2 style="font-size:1.05rem;margin:18px 0 4px">Where to watch (US)</h2>${w}
   <p class="smeta" style="margin-top:14px"><a href="${link}" target="_blank" rel="noopener" style="color:var(--accent)">All options on TMDB</a> · Streaming availability data provided by JustWatch.</p>`;
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
  cur=kind;$m('mGrid').innerHTML='<div class="empty">Loading '+(kind==='movie'?'movies':'TV shows')+'…</div>';$m('mCount').textContent='';
  try{await load(kind);}catch(e){$m('mGrid').innerHTML='<div class="empty">Could not load data. Check your connection and tap Refresh.</div>';return;}
  if(cur!==kind)return;buildFilters(kind);apply();
}
window.FreeMedia={show,openById};
function wire(){
  const deb=(f,ms)=>{let t;return()=>{clearTimeout(t);t=setTimeout(f,ms);};};
  $m('mQ').addEventListener('input',deb(()=>{st[cur].q=$m('mQ').value;apply();},200));
  $m('mSort').onchange=()=>{st[cur].sort=$m('mSort').value;apply();};
  $m('mFiltBtn').onclick=()=>$m('mFilters').classList.toggle('hide');
  $m('mGenres').onclick=e=>{const b=e.target.closest('[data-g]');if(!b)return;const g=+b.dataset.g,s=st[cur].genres;s.has(g)?s.delete(g):s.add(g);b.classList.toggle('active');apply();};
  $m('mCats').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;const c=b.dataset.c,s=st[cur].cats;s.has(c)?s.delete(c):s.add(c);b.classList.toggle('active');apply();};
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
  const io=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)&&cur&&DATA[cur]&&st[cur].shown<list.length){st[cur].shown+=60;renderGrid(false);}},{rootMargin:'800px'});
  io.observe($m('mSentinel'));
}
wire();
})();
