// Music catalog + shared music helpers (art, ids).

const CATALOG = (window.FREE_MUSIC_CATALOG || []).concat(window.FREE_MUSIC_CATALOG_MORE || [], window.FREE_MUSIC_CATALOG_MORE2 || []);
const genres = [...new Set(CATALOG.map(t=>t.g))].sort();
let view = {level:'genre', genre:null, artist:null, album:null};
let queue = [];
let qIndex = -1;
let shuffle = false;
const audio = document.getElementById('audio');
const $ = (id)=>document.getElementById(id);
const {esc,hue,initial}=ACMUtil;   // shared helpers: js/helpers.js

function fmt(s){s=Math.floor(s||0); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function identOf(t){
  if(t&&t.id) return String(t.id);
  const p=(t&&t.p)||'';
  const i=p.indexOf('/details/');
  if(i<0) return '';
  try{return decodeURIComponent(p.slice(i+9).split(/[?#]/)[0]).replace(/\/+$/,'');}catch(e){return p.slice(i+9).split(/[?#]/)[0].replace(/\/+$/,'');}
}
function artUrl(t){
  const id=identOf(t);
  return id?('https://archive.org/services/img/'+encodeURIComponent(id)):'';
}
function artHTML(label, track, extraClass, urlOverride){
  const u=urlOverride!==undefined?urlOverride:artUrl(track);
  const ini=esc(initial(label));
  const img=u?`<img loading="lazy" decoding="async" alt="" src="${esc(u)}" onerror="this.remove()">`:'';
  return `<span class="art${extraClass?' '+extraClass:''}" style="--h:${hue(label)}" data-initial="${ini}" aria-hidden="true">${img}</span>`;
}
function setNowArt(t){
  const el=$('nowArt'); if(!el) return;
  if(!t){ el.style.setProperty('--h','220'); el.setAttribute('data-initial','♪'); el.innerHTML=''; return; }
  const label=t.al||t.t||'';
  el.style.setProperty('--h', String(hue(label)));
  el.setAttribute('data-initial', initial(label));
  const u=artUrl(t);
  el.innerHTML=u?`<img loading="lazy" decoding="async" alt="" src="${esc(u)}" onerror="this.remove()">`:'';
}
function firstAlbumTrack(tracks){
  const sorted=tracks.slice().sort((a,b)=>(a.d||'9999').localeCompare(b.d||'9999')||a.al.localeCompare(b.al)||((a.n||0)-(b.n||0)));
  return sorted[0];
}
function repTrack(tracks){
  const map=new Map();
  for(const t of tracks){
    const k=t.ar+'\0'+t.al;
    if(!map.has(k)) map.set(k,{t,n:0,d:t.d||'9999'});
    map.get(k).n++;
  }
  let best=null;
  for(const v of map.values()){
    if(!best||v.n>best.n||(v.n===best.n&&(v.d<best.d||(v.d===best.d&&v.t.al.localeCompare(best.t.al)<0)))) best=v;
  }
  return best&&best.t;
}

