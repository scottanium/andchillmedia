// Movies / TV screens: filter bar, grid, loading states and button wiring. Publishes window.FreeMedia (used by tabs.js and search.js).
// Data logic is in media-data.js, the detail sheet in media-sheet.js.
(function(){
const PAGE=ACM_CONFIG.limits.gridPageSize;
const MSG=ACM_CONFIG.text.messages;
const $m=(id)=>document.getElementById(id);
const {esc,hue,initial,norm}=ACMUtil;
const D=ACMMediaData, SH=ACMMediaSheet;
const {CATS,BIT,MAJOR,DATA,loadState,listeners,ln,load,loadFirst,startLoad,decadeOf,todayStr,filterMedia,sortMedia}=D;
const {cardHTML,openSheet,openById}=SH;
const st={movie:null,tv:null};
function defState(){return {q:'',sort:'pop',genres:new Set(),cats:new Set(),decades:new Set(),prov:'',y1:'',y2:'',cert:'',lang:'',shown:PAGE};}
st.movie=defState(); st.tv=defState();
let cur=null, list=[];
function buildFilters(kind){
  const s=st[kind], arr=DATA[kind];
  const gcount={};arr.forEach(x=>x.g.forEach(g=>gcount[g]=(gcount[g]||0)+1));
  const gids=Object.keys(gcount).sort((a,b)=>(D.idx().genres[a]||'').localeCompare(D.idx().genres[b]||''));
  $m('mGenres').innerHTML=gids.map(g=>`<button type="button" class="chip${s.genres.has(+g)?' active':''}" data-g="${g}">${esc(D.idx().genres[g]||g)}</button>`).join('');
  $m('mCats').innerHTML=CATS.map(([c,l])=>`<button type="button" class="chip${s.cats.has(c)?' active':''}" data-c="${c}">${l}</button>`).join('');
  const dc={};arr.forEach(x=>{if(x.y>=1900)dc[decadeOf(x.y)]=1;});
  const decs=Object.keys(dc).map(Number).sort((a,b)=>b-a);
  $m('mDecades').innerHTML=decs.map(d=>`<button type="button" class="chip${s.decades.has(d)?' active':''}" data-d="${d}">${d}s</button>`).join('');
  const pc={};arr.forEach(x=>{if(x.ps)x.ps.forEach(p=>pc[p]=(pc[p]||0)+1);});
  const P=D.idx().providers;const all=Object.keys(pc).filter(p=>P[p]);
  const major=MAJOR.filter(p=>pc[p]).map(String);
  const rest=all.filter(p=>!major.includes(p)&&pc[p]>=5).sort((a,b)=>P[a][0].localeCompare(P[b][0]));
  const opt=p=>`<option value="${p}"${s.prov===p?' selected':''}>${esc(P[p][0])} (${pc[p]})</option>`;
  $m('mProv').innerHTML=`<option value="">Any service</option><optgroup label="Popular services">${major.map(opt).join('')}</optgroup><optgroup label="All other services">${rest.map(opt).join('')}</optgroup>`;
  const cc={};arr.forEach(x=>{if(x.c)cc[x.c]=(cc[x.c]||0)+1;});
  const order=ACM_CONFIG.certOrder;
  const certs=Object.keys(cc).sort((a,b)=>{const ia=order.indexOf(a),ib=order.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b);});
  $m('mCert').innerHTML=`<option value="">Any rating</option>`+certs.map(c=>`<option${s.cert===c?' selected':''}>${esc(c)}</option>`).join('')+`<option value="__none"${s.cert==='__none'?' selected':''}>Not rated / unknown</option>`;
  const lc={};arr.forEach(x=>lc[x.l]=(lc[x.l]||0)+1);
  const langs=Object.keys(lc).filter(l=>lc[l]>=3).sort((a,b)=>lc[b]-lc[a]);
  $m('mLang').innerHTML=`<option value="">Any language</option>`+langs.map(l=>`<option value="${esc(l)}"${s.lang===l?' selected':''}>${esc(ln(l))} (${lc[l]})</option>`).join('');
  $m('mY1').value=s.y1;$m('mY2').value=s.y2;$m('mQ').value=s.q;$m('mSort').value=s.sort;
  $m('mQ').placeholder=kind==='movie'?ACM_CONFIG.text.placeholders.movie:ACM_CONFIG.text.placeholders.tv;
}
function apply(){
  const kind=cur,s=st[kind];
  list=sortMedia(filterMedia(DATA[kind],s),s);
  const nf=s.genres.size+s.cats.size+s.decades.size+(s.prov?1:0)+(s.y1?1:0)+(s.y2?1:0)+(s.cert?1:0)+(s.lang?1:0);
  $m('mFiltBtn').textContent=ACM_CONFIG.text.buttons.filters+(nf?` (${nf})`:'');$m('mFiltBtn').classList.toggle('on',!!nf);
  updateCount();
  s.shown=PAGE;renderGrid(true);
}
function updateCount(){
  const kind=cur;if(!kind)return;const ls=loadState[kind];
  const total=ls&&ls.total?D.idx().stats[kind].count:DATA[kind].length;
  const more=ls&&!ls.complete?` · loading more (${ls.done}/${ls.total})…`:'';
  $m('mCount').textContent=`${list.length.toLocaleString()} of ${(ls&&ls.complete?DATA[kind].length:total).toLocaleString()} ${kind==='movie'?'movies':'TV shows'}${more}`;
}
function renderGrid(reset){
  const g=$m('mGrid');const s=st[cur];
  if(reset){g.innerHTML='';g.dataset.n=0;}
  const from=+g.dataset.n,to=Math.min(list.length,s.shown);
  const frag=document.createElement('div');
  let html='';for(let i=from;i<to;i++)html+=cardHTML(list[i],i);
  frag.innerHTML=html;while(frag.firstChild)g.appendChild(frag.firstChild);
  g.dataset.n=to;
  if(!list.length){const ls=loadState[cur];g.innerHTML='<div class="empty">'+(ls&&!ls.complete?MSG.stillLoading:MSG.noMatchesFilter)+'</div>';}
}
async function show(kind){
  cur=kind;list=[];$m('mGrid').innerHTML='<div class="empty">'+(kind==='movie'?MSG.loadingMovies:MSG.loadingTv)+'</div>';$m('mCount').textContent='';
  try{await loadFirst(kind);}catch(e){$m('mGrid').innerHTML='<div class="empty">'+MSG.loadFailed+'</div>';return;}
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
window.FreeMedia={todayStr,show,openById,load,loadFirst,startLoad,openSheet,norm,filterMedia,sortMedia,cardHTML,CATS,BIT,decadeOf,
  data:(k)=>DATA[k],idx:()=>D.idx(),state:(k)=>loadState[k],onLoad:(f)=>listeners.push(f),esc,hue,initial,ln};
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
  const io=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)&&cur&&!$m('mediaView').classList.contains('hide')&&st[cur].shown<list.length){st[cur].shown+=PAGE;renderGrid(false);}},{rootMargin:'800px'});
  io.observe($m('mSentinel'));
}
wire();
})();
