/* andchillmedia v8 - "Who's watching?" profiles. Everything lives in this browser's localStorage: no accounts, no server.
   Storage:  acm_profiles_v1            -> {v:1, active:<id>, list:[{id,name,emoji,color}]}
             acm_p_<id>_listen_v1       -> listen history for that profile
             acm_p_<id>_watch_v1        -> watch history for that profile
   The old single-user keys (acm_listenHistory_v1 / acm_watchHistory_v1) are moved into the default profile. */
(function(){
const ST=ACM_CONFIG.storage;
const KEY=ST.profiles, LEG={listen:ST.legacyListen,watch:ST.legacyWatch};
const EMOJI=ACM_CONFIG.profileEmoji;
const COLORS=ACM_CONFIG.profileColors;
const MAX=ACM_CONFIG.limits.maxProfiles;
const {esc}=ACMUtil;
let state=null;const subs=[];
function rid(){return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function hkey(id,kind){return ST.profileHistory.replace('{id}',id).replace('{kind}',kind);}
function readArr(k){try{const a=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function writeArr(k,a){try{localStorage.setItem(k,JSON.stringify(a.slice(0,ACM_CONFIG.limits.historyMax)));}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
function sig(kind,e){return kind==='listen'?(e.u+'|'+e.ts):(e.k+e.i+'|'+e.ts);}
// Merge legacy single-user history into the default (first) profile, then remove the legacy keys.
function migrateLegacy(){
  const def=state.list[0];if(!def)return;
  ['listen','watch'].forEach(kind=>{
    let raw=null;try{raw=localStorage.getItem(LEG[kind]);}catch(e){}
    if(raw==null)return;
    const old=readArr(LEG[kind]);
    const mine=readArr(hkey(def.id,kind));
    const seen=new Set(mine.map(e=>sig(kind,e)));
    const merged=mine.concat(old.filter(e=>!seen.has(sig(kind,e)))).sort((a,b)=>(b.ts||0)-(a.ts||0));
    writeArr(hkey(def.id,kind),merged);
    try{localStorage.removeItem(LEG[kind]);}catch(e){}
  });
}
function init(){
  if(state)return state;
  let s=null;try{s=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
  if(!s||!Array.isArray(s.list)||!s.list.length){
    s={v:1,active:'',list:[{id:rid(),name:'Me',emoji:'😎',color:COLORS[0]}]};
    s.active=s.list[0].id;
  }
  if(!s.list.some(p=>p.id===s.active))s.active=s.list[0].id;
  state=s;save();migrateLegacy();return state;
}
const active=()=>{init();return state.list.find(p=>p.id===state.active)||state.list[0];};
function key(kind){return hkey(active().id,kind);}
function emit(){subs.forEach(f=>{try{f(active());}catch(e){}});renderChip();}
function setActive(id){init();if(!state.list.some(p=>p.id===id))return;state.active=id;save();try{sessionStorage.setItem(ST.profileChosen,'1');}catch(e){}emit();}
function add(name,emoji,color){init();if(state.list.length>=MAX)return null;
  const p={id:rid(),name:cleanName(name)||'Profile '+(state.list.length+1),emoji:emoji||EMOJI[state.list.length%EMOJI.length],color:color||COLORS[state.list.length%COLORS.length]};
  state.list.push(p);save();return p;}
function cleanName(n){return String(n||'').replace(/\s+/g,' ').trim().slice(0,20);}
function update(id,patch){init();const p=state.list.find(x=>x.id===id);if(!p)return;
  if('name' in patch){const n=cleanName(patch.name);if(n)p.name=n;}
  if(patch.emoji)p.emoji=patch.emoji;if(patch.color)p.color=patch.color;save();}
function remove(id){init();if(state.list.length<=1)return false;
  const i=state.list.findIndex(p=>p.id===id);if(i<0)return false;
  state.list.splice(i,1);['listen','watch'].forEach(k=>{try{localStorage.removeItem(hkey(id,k));}catch(e){}});
  if(state.active===id)state.active=state.list[0].id;save();return true;}
// ---------- UI ----------
let gate=null,mode='pick',editing=null,pickerOpenedByUser=false;
function avatar(p,cls){return `<span class="pav ${cls||''}" style="--pc:${esc(p.color)}" aria-hidden="true">${esc(p.emoji)}</span>`;}
function renderChip(){
  const b=document.getElementById('profBtn');if(!b)return;const p=active();
  b.innerHTML=avatar(p,'sm')+`<span class="pname">${esc(p.name)}</span>`;
  b.setAttribute('aria-label','Profile: '+p.name+'. Switch profile');
  const hn=document.getElementById('histWho');if(hn)hn.textContent=p.emoji+' '+p.name;
}
function ensureGate(){
  if(gate)return gate;
  gate=document.createElement('div');gate.id='profGate';gate.className='hide';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-label',"Who's watching?");
  document.body.appendChild(gate);
  gate.addEventListener('click',onClick);
  gate.addEventListener('input',e=>{if(e.target.id==='peName')editing.name=e.target.value;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&gate&&!gate.classList.contains('hide')&&pickerOpenedByUser)closeGate();});
  return gate;
}
function render(){
  ensureGate();init();
  if(mode==='edit'){
    const e=editing;
    gate.innerHTML=`<div class="pbox"><h2>${e.isNew?'Add profile':'Edit profile'}</h2>
      <div class="pedit">${avatar(e,'lg')}<input id="peName" type="text" maxlength="20" value="${esc(e.name)}" placeholder="Name" aria-label="Profile name" autocomplete="off"/></div>
      <div class="plabel">Icon</div><div class="pgrid sm">${EMOJI.map(m=>`<button type="button" class="pemo${m===e.emoji?' on':''}" data-emoji="${m}" aria-label="Icon ${m}">${m}</button>`).join('')}</div>
      <div class="plabel">Color</div><div class="pgrid sm">${COLORS.map(c=>`<button type="button" class="pcol${c===e.color?' on':''}" data-color="${c}" style="--pc:${c}" aria-label="Color ${c}"></button>`).join('')}</div>
      <div class="pact"><button type="button" class="mbtn on" data-act="save">Save</button><button type="button" class="mbtn" data-act="cancel-edit">Cancel</button>
      ${!e.isNew&&state.list.length>1?`<button type="button" class="mbtn danger" data-act="ask-del">Delete…</button>`:''}</div>
      ${e.confirmDel?`<div class="pwarn">Delete <b>${esc(e.name)}</b> and its listen and watch history from this device? <button type="button" class="mbtn danger" data-act="del">Yes, delete</button> <button type="button" class="mbtn" data-act="no-del">Keep</button></div>`:''}
    </div>`;
    return;
  }
  const manage=mode==='manage';
  gate.innerHTML=`<div class="pbox wide"><h2>${manage?'Manage profiles':"Who's watching?"}</h2>
    <div class="pgrid">${state.list.map(p=>`<button type="button" class="ptile${p.id===state.active?' cur':''}" data-pid="${p.id}" aria-label="${esc(p.name)}${manage?' (edit)':''}">${avatar(p,'lg')}${manage?'<span class="pedit-badge">✎</span>':''}<span class="ptn">${esc(p.name)}</span></button>`).join('')}
      ${state.list.length<MAX?`<button type="button" class="ptile add" data-act="add" aria-label="Add profile"><span class="pav lg" style="--pc:#2e2e3a">＋</span><span class="ptn">Add profile</span></button>`:''}</div>
    <div class="pact"><button type="button" class="mbtn${manage?' on':''}" data-act="${manage?'done':'manage'}">${manage?'Done':'Manage profiles'}</button>
    ${pickerOpenedByUser&&!manage?'<button type="button" class="mbtn" data-act="close">Close</button>':''}</div>
    <p class="pnote">Profiles keep separate Listen and Watch history on this device only. There are no accounts and nothing is sent anywhere.</p></div>`;
}
function onClick(e){
  const t=e.target;
  const em=t.closest('[data-emoji]');if(em){editing.emoji=em.dataset.emoji;render();focusName();return;}
  const co=t.closest('[data-color]');if(co){editing.color=co.dataset.color;render();focusName();return;}
  const tile=t.closest('[data-pid]');
  if(tile){
    if(mode==='manage'){const p=state.list.find(x=>x.id===tile.dataset.pid);editing=Object.assign({},p,{isNew:false,confirmDel:false});mode='edit';render();focusName();}
    else{setActive(tile.dataset.pid);closeGate();}
    return;}
  const a=t.closest('[data-act]');if(!a)return;
  switch(a.dataset.act){
    case 'manage':mode='manage';render();break;
    case 'done':mode='pick';render();break;
    case 'close':closeGate();break;
    case 'add':{const n=state.list.length;editing={id:'',name:'',emoji:EMOJI[(n*3+1)%EMOJI.length],color:COLORS[n%COLORS.length],isNew:true};mode='edit';render();focusName();break;}
    case 'cancel-edit':mode=editing.isNew?'pick':'manage';render();break;
    case 'save':{
      const name=cleanName(editing.name);
      if(editing.isNew){const p=add(name,editing.emoji,editing.color);if(p){setActive(p.id);mode='pick';closeGate();return;}}
      else{update(editing.id,{name,emoji:editing.emoji,color:editing.color});emit();}
      mode='manage';render();break;}
    case 'ask-del':editing.confirmDel=true;render();break;
    case 'no-del':editing.confirmDel=false;render();break;
    case 'del':{const was=editing.id===state.active;remove(editing.id);if(was)emit();else renderChip();mode='manage';render();break;}
  }
}
function focusName(){const i=document.getElementById('peName');if(i&&editing&&editing.isNew&&!editing.name){try{i.focus();}catch(e){}}}
function openGate(byUser){ensureGate();pickerOpenedByUser=!!byUser;mode='pick';editing=null;render();gate.classList.remove('hide');}
function closeGate(){if(!gate)return;gate.classList.add('hide');pickerOpenedByUser=false;mode='pick';}
// Called once the legal notice has been accepted. With 2+ profiles, ask "Who's watching?" at the start of each session.
function start(){
  init();renderChip();
  const b=document.getElementById('profBtn');if(b&&!b.dataset.w){b.dataset.w='1';b.addEventListener('click',()=>openGate(true));}
  let chosen=false;try{chosen=sessionStorage.getItem(ST.profileChosen)==='1';}catch(e){}
  if(state.list.length>1&&!chosen&&!started){openGate(false);}
  started=true;
}
let started=false;
window.ACMProfiles={init,key,active,list:()=>(init(),state.list.slice()),setActive,add,update,remove,onChange:f=>subs.push(f),start,open:()=>openGate(true),EMOJI,COLORS,renderChip};
init();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderChip);else renderChip();
})();
