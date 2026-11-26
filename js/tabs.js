// Top tabs (Music / Movies / TV / Search / History) and the scroll-to-fold filter panels.
(function(){
  const tabs=document.querySelectorAll('.tabs [data-tab]');
  function setTab(t){
    tabs.forEach(b=>{const on=b.dataset.tab===t;b.classList.toggle('active',on);b.setAttribute('aria-selected',on);});
    const music=t==='music', media=t==='movie'||t==='tv', hist=t==='history', search=t==='search';
    document.getElementById('musicCtl').classList.toggle('hide',!music);
    document.getElementById('view').classList.toggle('hide',!music);
    document.getElementById('mediaCtl').classList.toggle('hide',!media);
    document.getElementById('mediaView').classList.toggle('hide',!media);
    document.getElementById('histView').classList.toggle('hide',!hist);
    document.getElementById('searchCtl').classList.toggle('hide',!search);
    document.getElementById('searchView').classList.toggle('hide',!search);
    if(window.ACMSearch){ if(search) window.ACMSearch.show(); else window.ACMSearch.hide(); }
    document.body.classList.toggle('media-mode',media||search);
    document.title = ACM_CONFIG.staging.titlePrefix+ACM_CONFIG.text.appName+' · '+ACM_CONFIG.text.tabs[t];
    try{localStorage.setItem(ACM_CONFIG.storage.tab,t);}catch(e){}
    if(media) window.FreeMedia.show(t);
    if(hist && typeof window.renderHistory==='function') window.renderHistory();
    window.scrollTo(0,0);
  }
  tabs.forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
  // Filter panels sit in the sticky header; fold them away once someone scrolls the results so they never cover the list.
  window.addEventListener('scroll',()=>{ if(window.scrollY>150){ ['mFilters','sFilters'].forEach(id=>{ const el=document.getElementById(id); if(el&&!el.classList.contains('hide')) el.classList.add('hide'); }); } },{passive:true});
  let saved='music';try{saved=localStorage.getItem(ACM_CONFIG.storage.tab)||'music';}catch(e){}
  if(saved!=='music') setTab(saved);
})();
