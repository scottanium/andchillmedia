// Refresh button (clears only this page's own service worker + its own caches; live and staging share an origin): clears the service worker + caches and reloads.
(function(){
  var btn=document.getElementById('refreshBtn');
  btn.addEventListener('click',async function(){
    btn.textContent='Refreshing...';
    try{
      if('serviceWorker' in navigator){var r=await navigator.serviceWorker.getRegistration();if(r){await r.update().catch(function(){});await r.unregister();}}
      if(window.caches){var ks=await caches.keys();await Promise.all(ks.filter(ACM_CONFIG.ownsCache).map(function(k){return caches.delete(k);}));}
    }catch(e){}
    location.replace(location.pathname+'?r='+Date.now());
  });
  function upd(){var fs=document.fullscreenElement||document.webkitFullscreenElement;btn.classList.toggle('hidden',!!fs);}
  document.addEventListener('fullscreenchange',upd);
  document.addEventListener('webkitfullscreenchange',upd);
  // iOS native video fullscreen
  document.addEventListener('webkitbeginfullscreen',function(){btn.classList.add('hidden');},true);
  document.addEventListener('webkitendfullscreen',function(){btn.classList.remove('hidden');},true);
})();
