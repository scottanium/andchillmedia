/* andchillmedia v8 - Search tab: one box for music (artist / album / track), movies and TV, with
   type, cost, genre, decade/year filters and sorting. Movie/TV chunks are loaded lazily the first time this tab opens. */
(function(){
const $=(id)=>document.getElementById(id);
const FM=()=>window.FreeMedia;
const {esc}=ACMUtil;
const TYPES=ACM_CONFIG.text.searchTypes;
const S={q:'',type:'all',sort:'pop',cats:new Set(),genre:'',decades:new Set(),y1:'',y2:'',shown:ACM_CONFIG.limits.gridPageSize};
let albums=null, ready=false, active=false, res={movie:[],tv:[],music:[]}, rendered=[];
const isPhone=()=>window.matchMedia('(max-width:520px)').matches;

function buildAlbums(){
  if(albums)return albums;
  const FMn=FM().norm;const cat=(window.ACM&&window.ACM.catalog)||[];
  const map=new Map();
  for(const t of cat){
    const k=t.ar+'\u0000'+t.al;let a=map.get(k);
    if(!a){a={k:'music',ar:t.ar||'',al:t.al||t.t||'',g:t.g||'',d:t.d||'',tr:[],id:''};map.set(k,a);}
    a.tr.push(t); if(t.d&&(!a.d||t.d<a.d))a.d=t.d;
  }
  albums=[...map.values()];
  for(const a of albums){
    a.tr.sort((x,y)=>(x.n||0)-(y.n||0));
    a.n=a.tr.length;a.y=a.d?+a.d.slice(0,4):0;
    a.lt=FMn(a.ar+' '+a.al+' '+a.g);a.tt=a.tr.map(t=>FMn(t.t)).join('|');
    a.art=FMn(a.ar);a.alt=FMn(a.al);a.sk=a.alt;
    a.id=(window.ACM&&window.ACM.identOf)?window.ACM.identOf(a.tr[0]):'';
  }
  return albums;
}
function musicList(){
  const A=buildAlbums();const FMn=FM().norm;
  const toks=FMn(S.q).split(' ').filter(Boolean);
  const y1=parseInt(S.y1)||0,y2=parseInt(S.y2)||9999;
  let out=A.filter(a=>{
    if(S.sort==='up')return false;                            // v9: music has no upcoming releases
    if(S.sort==='new'&&(!a.d||a.d>FM().todayStr()))return false;
    if(S.cats.size&&!S.cats.has('f'))return false;           // all music here is free (Creative Commons / public domain)
    if(S.genre&&a.g!==S.genre)return false;
    if((y1||y2<9999)&&(!a.y||a.y<y1||a.y>y2))return false;
    if(S.decades.size&&!(a.y&&S.decades.has(FM().decadeOf(a.y))))return false;
    for(const t of toks){if(a.lt.indexOf(t)<0&&a.tt.indexOf(t)<0)return false;}
    return true;});
  const q=FMn(S.q);
  const rel=(a)=>!q?0:(a.alt===q||a.art===q)?0:(a.alt.startsWith(q)||a.art.startsWith(q))?1:(a.lt.indexOf(' '+q)>=0)?2:(a.lt.indexOf(q)>=0)?3:4;
  const by={up:()=>0,pop:(x,y)=>y.n-x.n,rate:(x,y)=>y.n-x.n,new:(x,y)=>(y.d||'').localeCompare(x.d||''),old:(x,y)=>((!x.d)-(!y.d))||(x.d||'').localeCompare(y.d||''),
    az:(x,y)=>x.sk<y.sk?-1:x.sk>y.sk?1:0,za:(x,y)=>x.sk<y.sk?1:x.sk>y.sk?-1:0};
  const base=by[S.sort]||by.pop;
  if(q&&S.sort==='pop'){const sc=new Map();out.forEach(a=>sc.set(a,rel(a)));out=out.slice().sort((x,y)=>(sc.get(x)-sc.get(y))||base(x,y));}
  else out=out.slice().sort(base);
  return out;
}
function mediaList(kind){
  const f={q:S.q,genres:new Set(),cats:S.cats,decades:S.decades,prov:'',y1:S.y1,y2:S.y2,cert:'',lang:'',sort:S.sort};
  const arr=FM().data(kind);
  if(!S.genre)return FM().sortMedia(FM().filterMedia(arr,f),f);
  // a genre name maps to a TMDB genre id (movies and TV use different ids for some names)
  const idx=FM().idx();const ids=Object.keys(idx.genres).filter(g=>idx.genres[g]===S.genre).map(Number);
  let out=[];ids.forEach(id=>{out=out.concat(FM().filterMedia(arr,Object.assign({},f,{genres:new Set([id])})));});
  return FM().sortMedia(out,f);
}
function genreOptions(){
  const idx=FM().idx();const names=new Set();
  if(idx){const used=new Set();['movie','tv'].forEach(k=>FM().data(k).forEach(x=>x.g.forEach(g=>used.add(g))));used.forEach(g=>idx.genres[g]&&names.add(idx.genres[g]));}
  buildAlbums().forEach(a=>{if(a.g)names.add(a.g);});
  return [...names].sort((a,b)=>a.localeCompare(b));
}
function buildControls(){
  $('sTypes').innerHTML=TYPES.map(([t,l])=>`<button type="button" class="chip${S.type===t?' active':''}" data-t="${t}">${l}</button>`).join('');
  $('sCats').innerHTML=FM().CATS.map(([c,l])=>`<button type="button" class="chip${S.cats.has(c)?' active':''}" data-c="${c}">${l}</button>`).join('');
  const gs=genreOptions();
  $('sGenre').innerHTML='<option value="">Any genre</option>'+gs.map(g=>`<option${S.genre===g?' selected':''}>${esc(g)}</option>`).join('');
  const dec=new Set();['movie','tv'].forEach(k=>FM().data(k).forEach(x=>{if(x.y>=1900)dec.add(FM().decadeOf(x.y));}));
  buildAlbums().forEach(a=>{if(a.y>=1900)dec.add(FM().decadeOf(a.y));});
  $('sDecades').innerHTML=[...dec].sort((a,b)=>b-a).map(d=>`<button type="button" class="chip${S.decades.has(d)?' active':''}" data-d="${d}">${d}s</button>`).join('');
  $('sSort').value=S.sort;$('sQ').value=S.q;$('sY1').value=S.y1;$('sY2').value=S.y2;
}
function loadingNote(){
  const parts=[];['movie','tv'].forEach(k=>{const ls=FM().state(k);if(ls&&!ls.complete)parts.push(`${k==='movie'?'movies':'TV'} ${ls.done}/${ls.total||'…'}`);});
  return parts.length?` · still loading ${parts.join(', ')}…`:'';
}
function badgeFree(){return '<span class="badge free">FREE</span>';}
function musicCard(a,idx){
  const ini=esc(FM().initial(a.al));const url=a.id?('https://archive.org/services/img/'+encodeURIComponent(a.id)):'';
  const img=url?`<img loading="lazy" decoding="async" alt="" src="${esc(url)}" onerror="this.remove()">`:'';
  const q=FM().norm(S.q);let hit='';
  if(q){const toks=q.split(' ').filter(Boolean);const m=a.tr.find(t=>{const n=FM().norm(t.t);return toks.every(k=>n.indexOf(k)>=0)&&!toks.every(k=>a.lt.indexOf(k)>=0);});if(m)hit=' · track: '+m.t;}
  return `<button type="button" class="card mcard" data-r="${idx}"><div class="poster sq" style="--h:${FM().hue(a.al)}" data-initial="${ini}">${img}${badgeFree()}<span class="playhint">▶ Play</span></div><div class="ci"><div class="ct">${esc(a.al)}</div><div class="cm">${esc(a.ar)} · ${a.n} track${a.n===1?'':'s'}${a.y?' · '+a.y:''}${esc(hit)}</div></div></button>`;
}
function cardFor(x,idx){
  if(x.k==='music')return musicCard(x,idx);
  return FM().cardHTML(x,idx).replace('data-i="'+idx+'"','data-r="'+idx+'"');
}
const LABEL=ACM_CONFIG.text.searchSectionLabels;
function compute(){
  const types=S.type==='all'?['movie','tv','music']:[S.type];
  res={movie:[],tv:[],music:[]};
  types.forEach(t=>{res[t]=t==='music'?musicList():(FM().data(t).length?mediaList(t):[]);});
}
function render(reset){
  const box=$('sResults');
  const types=S.type==='all'?['movie','tv','music']:[S.type];
  const total=types.reduce((n,t)=>n+res[t].length,0);
  const nf=S.cats.size+(S.genre?1:0)+S.decades.size+(S.y1?1:0)+(S.y2?1:0);
  $('sFiltBtn').textContent=ACM_CONFIG.text.buttons.filters+(nf?` (${nf})`:'');$('sFiltBtn').classList.toggle('on',!!nf);
  $('sCount').textContent=types.map(t=>`${res[t].length.toLocaleString()} ${t==='music'?'albums':t==='tv'?'TV':'movies'}`).join(' · ')+loadingNote();
  if(S.type==='all'){
    rendered=[];let html='';const lim=isPhone()?6:Math.max(6,Math.floor((box.clientWidth||900)/166)*2);
    for(const t of types){
      const arr=res[t];if(!arr.length)continue;
      const part=arr.slice(0,lim);
      html+=`<section class="ssec"><div class="shd"><h3>${LABEL[t]} <span class="scnt">${arr.length.toLocaleString()}</span></h3>${arr.length>lim?`<button type="button" class="mbtn" data-more="${t}">See all →</button>`:''}</div><div class="grid">`+part.map(x=>{rendered.push(x);return cardFor(x,rendered.length-1);}).join('')+`</div></section>`;
    }
    box.innerHTML=html||`<div class="empty">${loadingNote()?'Still loading the catalog… results will appear here.':'No matches. Try different words or remove a filter.'}</div>`;
  }else{
    const arr=res[S.type];
    if(reset){rendered=[];box.innerHTML='<div class="grid" id="sGrid"></div>';}
    let g=$('sGrid');if(!g){rendered=[];box.innerHTML='<div class="grid" id="sGrid"></div>';g=$('sGrid');}
    const from=rendered.length,to=Math.min(arr.length,S.shown);let html='';
    for(let i=from;i<to;i++){rendered.push(arr[i]);html+=cardFor(arr[i],i);}
    g.insertAdjacentHTML('beforeend',html);
    if(!arr.length)box.innerHTML=`<div class="empty">${loadingNote()?'Still loading the catalog… results will appear here.':'No matches. Try different words or remove a filter.'}</div>`;
  }
}
function apply(){S.shown=ACM_CONFIG.limits.gridPageSize;compute();render(true);}
let t0=null;
function onData(){
  if(!active)return;clearTimeout(t0);
  t0=setTimeout(()=>{
    const ok=FM().data('movie').length||FM().data('tv').length||FM().state('movie')&&FM().state('movie').complete;
    if(!ok&&!albums)return;
    buildControls();
    if(window.scrollY<400||!rendered.length){compute();render(true);}
    else{$('sCount').textContent=$('sCount').textContent.replace(/ · still loading.*$/,'')+loadingNote();}
  },250);
}
function openItem(x){
  if(x.k==='music'){
    const q=FM().norm(S.q);let i=0;
    if(q){const toks=q.split(' ').filter(Boolean);const j=x.tr.findIndex(t=>{const n=FM().norm(t.t);return toks.every(k=>n.indexOf(k)>=0);});if(j>0)i=j;}
    if(window.ACM)window.ACM.play(x.tr,i);return;}
  FM().openSheet(x);
}
async function show(){
  active=true;
  if(!ready){ready=true;wire();}
  const m=FM().startLoad('movie'),t=FM().startLoad('tv');
  buildAlbums();buildControls();compute();render(true);
  try{await Promise.race([Promise.all([FM().loadFirst('movie'),FM().loadFirst('tv')]),new Promise(r=>setTimeout(r,8000))]);}catch(e){}
  if(active){buildControls();compute();render(true);}
}
function hide(){active=false;}
function wire(){
  const deb=(f,ms)=>{let t;return()=>{clearTimeout(t);t=setTimeout(f,ms);};};
  FM().onLoad(onData);
  $('sQ').addEventListener('input',deb(()=>{S.q=$('sQ').value;apply();},150));
  $('sSort').onchange=()=>{S.sort=$('sSort').value;apply();};
  $('sFiltBtn').onclick=()=>$('sFilters').classList.toggle('hide');
  $('sTypes').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;S.type=b.dataset.t;buildControls();apply();};
  $('sCats').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;const c=b.dataset.c;S.cats.has(c)?S.cats.delete(c):S.cats.add(c);b.classList.toggle('active');apply();};
  $('sDecades').onclick=e=>{const b=e.target.closest('[data-d]');if(!b)return;const d=+b.dataset.d;S.decades.has(d)?S.decades.delete(d):S.decades.add(d);b.classList.toggle('active');apply();};
  $('sGenre').onchange=()=>{S.genre=$('sGenre').value;apply();};
  $('sY1').addEventListener('input',deb(()=>{S.y1=$('sY1').value;apply();},400));
  $('sY2').addEventListener('input',deb(()=>{S.y2=$('sY2').value;apply();},400));
  $('sReset').onclick=()=>{S.cats=new Set();S.genre='';S.decades=new Set();S.y1='';S.y2='';buildControls();apply();};
  $('sResults').onclick=e=>{
    const more=e.target.closest('[data-more]');if(more){S.type=more.dataset.more;buildControls();apply();window.scrollTo(0,0);return;}
    const c=e.target.closest('.card');if(c){const x=rendered[+c.dataset.r];if(x)openItem(x);}
  };
  new IntersectionObserver(es=>{if(active&&S.type!=='all'&&es.some(x=>x.isIntersecting)&&S.shown<res[S.type].length){S.shown+=ACM_CONFIG.limits.gridPageSize;render(false);}},{rootMargin:'800px'}).observe($('sSentinel'));
}
window.ACMSearch={show,hide,state:S,_res:()=>res};
})();
