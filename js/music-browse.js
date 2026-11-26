// Music browsing: genre > artist > album > track lists, crumbs, playing a list.
function filtered(){
  const nz = (window.FreeMedia&&window.FreeMedia.norm) || (x=>String(x||'').toLowerCase());
  const toks = nz($('q').value||'').split(' ').filter(Boolean);
  let list = CATALOG;
  // every word must appear somewhere in genre / artist / album / track title (accents and punctuation ignored)
  if(toks.length) list = list.filter(t => { const h = t._n || (t._n = nz(t.g+' '+t.ar+' '+t.al+' '+t.t)); return toks.every(k => h.indexOf(k) >= 0); });
  return list;
}

function renderCrumbs(){
  const el=$('crumbs'); el.innerHTML='';
  const add=(label, fn, active)=>{
    const b=document.createElement('button'); b.type='button'; b.textContent=label; if(active) b.className='active'; b.onclick=fn; el.appendChild(b);
  };
  add('Genres', ()=>{view={level:'genre',genre:null,artist:null,album:null}; render();}, view.level==='genre');
  if(view.genre) add(view.genre, ()=>{view.level='artist'; view.artist=null; view.album=null; render();}, view.level==='artist');
  if(view.artist) add(view.artist, ()=>{view.level='album'; view.album=null; render();}, view.level==='album');
  if(view.album) add(view.album, ()=>{}, true);
}

function playList(list, start=0){
  if(!list.length) return;
  queue=list; qIndex=start; playCurrent();
}

function playCurrent(){
  if(!hasAgreed()){ lockApp(); return; }
  const t=queue[qIndex]; if(!t) return;
  audio.src=t.u; audio.play().catch(()=>{});
  $('now').textContent = t.ar+' — '+t.t+' · '+t.al;
  setNowArt(t);
  $('play').textContent=ACM_CONFIG.text.buttons.pause;
  recordListen(t);
  const art=artUrl(t);
  if(navigator.mediaSession){
    navigator.mediaSession.metadata = new MediaMetadata({title:t.t, artist:t.ar, album:t.al, artwork: art?[{src:art, sizes:'200x200', type:'image/jpeg'}]:[]});
    navigator.mediaSession.setActionHandler('previoustrack', ()=>$('prev').click());
    navigator.mediaSession.setActionHandler('nexttrack', ()=>$('next').click());
    navigator.mediaSession.setActionHandler('play', ()=>audio.play());
    navigator.mediaSession.setActionHandler('pause', ()=>audio.pause());
  }
}

function render(){
  renderCrumbs();
  const root=$('view'); root.innerHTML='';
  const list=filtered();
  if(view.level==='genre'){
    const gs=[...new Set(list.map(t=>t.g))].sort();
    gs.forEach(g=>{
      const tracks=list.filter(t=>t.g===g);
      const count=tracks.length;
      const row=document.createElement('div'); row.className='row';
      row.innerHTML=`${artHTML(g, repTrack(tracks))}<div class="meta"><div class="title">${esc(g)}</div><div class="detail">${count} tracks</div></div>
        <div class="actions"><button type="button" data-playgenre="${esc(g)}">Play</button></div>`;
      row.onclick=(e)=>{ if(e.target.closest('[data-playgenre]')){ playList(tracks.slice().sort((a,b)=>(a.d||'').localeCompare(b.d||'')||a.n-b.n)); return;} view={level:'artist',genre:g,artist:null,album:null}; render();};
      root.appendChild(row);
    });
  } else if(view.level==='artist'){
    const arts=[...new Set(list.filter(t=>t.g===view.genre).map(t=>t.ar))].sort((a,b)=>a.localeCompare(b));
    arts.forEach(ar=>{
      const tracks=list.filter(t=>t.g===view.genre&&t.ar===ar);
      const albums=[...new Set(tracks.map(t=>t.al))].length;
      const row=document.createElement('div'); row.className='row';
      row.innerHTML=`${artHTML(ar, firstAlbumTrack(tracks))}<div class="meta"><div class="title">${esc(ar)}</div><div class="detail">${albums} albums · ${tracks.length} tracks</div></div>`;
      row.onclick=()=>{view.level='album'; view.artist=ar; view.album=null; render();};
      root.appendChild(row);
    });
  } else if(view.level==='album'){
    const tracks=list.filter(t=>t.g===view.genre&&t.ar===view.artist);
    const albums=[...new Set(tracks.map(t=>t.al))];
    albums.sort((a,b)=>{
      const da=tracks.find(t=>t.al===a)?.d||'9999'; const db=tracks.find(t=>t.al===b)?.d||'9999';
      return da.localeCompare(db)||a.localeCompare(b);
    });
    albums.forEach(al=>{
      const ts=tracks.filter(t=>t.al===al).sort((a,b)=>a.n-b.n);
      const d=ts[0]?.d||'';
      const z=ts[0]?.z||'';
      const row=document.createElement('div'); row.className='row';
      row.innerHTML=`${artHTML(al, ts[0])}<div class="meta"><div class="title">${esc(al)}</div><div class="detail">${esc(d||'Unknown date')} · ${ts.length} tracks</div></div>
        <div class="actions">${z?`<a href="${esc(z)}" download>Album zip</a>`:''}<button type="button" data-play>Play</button></div>`;
      row.onclick=(e)=>{ if(e.target.closest('[data-play]')){ playList(ts); return;} if(e.target.closest('a')) return; view.level='track'; view.album=al; render();};
      root.appendChild(row);
    });
  } else {
    const ts=list.filter(t=>t.g===view.genre&&t.ar===view.artist&&t.al===view.album).sort((a,b)=>a.n-b.n);
    ts.forEach((t,i)=>{
      const row=document.createElement('div'); row.className='row';
      row.innerHTML=`${artHTML(t.al||t.t, t)}<div class="meta"><div class="title">${esc((t.n? t.n+'. ':'')+t.t)}</div><div class="detail">${esc(t.ar)}</div></div>
        <div class="actions"><a href="${esc(t.u)}" download>Download</a><button type="button" data-play>Play</button></div>`;
      row.onclick=(e)=>{ if(e.target.closest('a')) return; playList(ts,i); };
      root.appendChild(row);
    });
  }
  if(!root.children.length){ root.innerHTML='<div class="empty">'+ACM_CONFIG.text.messages.noMatches+'</div>'; }
}

