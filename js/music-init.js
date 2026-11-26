// Music start-up: exposes window.ACM, refreshes history on profile change, draws the first screen.
window.ACM={get catalog(){return CATALOG;},play:(l,i)=>playList(l,i),identOf:identOf};
if(window.ACMProfiles){ window.ACMProfiles.onChange(()=>{ const hv=$('histView'); if(hv&&!hv.classList.contains('hide')) renderHistory(); }); }
render();
