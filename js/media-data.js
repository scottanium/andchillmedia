// Movie/TV data layer: loads the media-*.json chunks, cost groups, filtering and sorting. No screen code in here.
// Used by media-sheet.js and media-ui.js through window.ACMMediaData.
(function(){
const {norm}=ACMUtil;
// Cost groups. "rb" = rent or buy (paid per title); "u" = no US availability data (unknown).
const CATS=ACM_CONFIG.text.costFilters;
const BIT={f:1,a:2,s:4,rb:8,u:16};
function costMask(x){
  if(!x.w)return BIT.u;
  let m=0;
  if(x.w.f)m|=BIT.f; if(x.w.a)m|=BIT.a; if(x.w.s)m|=BIT.s; if(x.w.r||x.w.b)m|=BIT.rb;
  return m||BIT.u;
}
const MAJOR=ACM_CONFIG.popularProviderIds;
let IDX=null, DATA={movie:[],tv:[]}, loadState={movie:null,tv:null};
const listeners=[];
let langName=null;
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
    const need=Math.min(ACM_CONFIG.limits.firstChunks,n);   // chunks 1-4 hold the most popular titles; show them first
    async function worker(){
      while(next<n){const i=next++;
        const arr=await getJSON(`./media-${kind}-${i+1}.json`);results[i]=arr;
        // append in chunk order so the default (popularity) order stays stable
        while(results[appended]){const a=results[appended];results[appended]=null;a.forEach(x=>prep(x,kind));DATA[kind].push(...a);appended++;ls.done=appended;
          if(appended>=need)resolveFirst();
          notify(kind);}
      }}
    await Promise.all(Array.from({length:ACM_CONFIG.limits.loadWorkers},worker));
    ls.complete=true;resolveFirst();notify(kind);
  })();
  ls.promise.catch(()=>{});
  return ls;
}
function notify(kind){listeners.forEach(f=>{try{f(kind);}catch(e){}});}
async function load(kind){const ls=startLoad(kind);await ls.promise;return DATA[kind];}
async function loadFirst(kind){const ls=startLoad(kind);await Promise.race([ls.firstReady,ls.promise]);return DATA[kind];}
function decadeOf(y){return Math.floor(y/10)*10;}
// Shared filter + sort used by the Movies/TV tabs and by the Search tab.
// f: {q,genres:Set<number>,cats:Set,decades:Set,prov,y1,y2,cert,lang,sort}
function mask(cats){let m=0;cats.forEach(c=>{m|=BIT[c]||0;});return m;}
function todayStr(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function filterMedia(arr,f){
  // v9: "Newest first" only lists titles already released (no future or undated ones); "Upcoming" lists only future releases.
  const today=todayStr(), onlyPast=f.sort==='new', onlyFuture=f.sort==='up';
  const toks=norm(f.q||'').split(' ').filter(Boolean);
  const y1=parseInt(f.y1)||0,y2=parseInt(f.y2)||9999;
  const prov=f.prov?+f.prov:0, cm=mask(f.cats||new Set()), gs=[...(f.genres||[])], decs=f.decades||new Set();
  const noCatSel=!cm;
  return arr.filter(x=>{
    if(onlyPast&&(!x.d||x.d>today))return false;
    if(onlyFuture&&!(x.d&&x.d>today))return false;
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
  up:(x,y)=>(x.d||'').localeCompare(y.d||''),
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
window.ACMMediaData={CATS,BIT,MAJOR,DATA,loadState,listeners,idx:()=>IDX,ln,startLoad,notify,load,loadFirst,decadeOf,todayStr,filterMedia,sortMedia};
})();
