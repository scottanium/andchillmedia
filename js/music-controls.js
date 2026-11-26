// Music search box, Shuffle/Queue buttons and the player bar controls.
$('q').oninput=()=>render();
$('btnShuffle').onclick=()=>{shuffle=!shuffle; $('btnShuffle').classList.toggle('active',shuffle);};
$('btnQueue').onclick=()=>{view.level='track'; const root=$('view'); root.innerHTML='';
  if(!queue.length){root.innerHTML='<div class="empty">'+ACM_CONFIG.text.messages.queueEmpty+'</div>'; return;}
  queue.forEach((t,i)=>{
    const row=document.createElement('div'); row.className='row'; if(i===qIndex) row.style.outline='1px solid var(--accent)';
    row.innerHTML=`${artHTML(t.al||t.t, t)}<div class="meta"><div class="title">${esc(t.t)}</div><div class="detail">${esc(t.ar)} · ${esc(t.al)}</div></div>`;
    row.onclick=()=>{qIndex=i; playCurrent();};
    root.appendChild(row);
  });
};
$('play').onclick=()=>{ if(audio.paused){ if(!audio.src && queue[qIndex]) playCurrent(); else audio.play(); $('play').textContent=ACM_CONFIG.text.buttons.pause;} else {audio.pause(); $('play').textContent=ACM_CONFIG.text.buttons.play;}};
$('prev').onclick=()=>{ if(qIndex>0){qIndex--; playCurrent();} };
$('next').onclick=()=>{
  if(shuffle && queue.length){ qIndex=Math.floor(Math.random()*queue.length); playCurrent(); return; }
  if(qIndex<queue.length-1){qIndex++; playCurrent();}
};
audio.addEventListener('timeupdate',()=>{ if(audio.duration){ $('seek').value=Math.floor(1000*audio.currentTime/audio.duration); $('time').textContent=fmt(audio.currentTime);} });
audio.addEventListener('ended',()=>$('next').click());
$('seek').oninput=()=>{ if(audio.duration) audio.currentTime = ($('seek').value/1000)*audio.duration; };
$('vol').oninput=()=>{ audio.volume=parseFloat($('vol').value); };
document.querySelectorAll('.histtabs [data-hist]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation(); histKind=b.dataset.hist; renderHistory();}));
$('histClear').onclick=()=>clearHistory();
