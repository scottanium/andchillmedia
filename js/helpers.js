// Small shared helpers used by every screen (one copy, so a fix only has to be made once).
//   esc(text)      make text safe to put inside HTML
//   hue(text)      stable 0-359 colour number for a title (used for the coloured art tiles)
//   initial(text)  first letter shown on an art tile
//   norm(text)     search-friendly text: lower-case, no accents/punctuation ("Spider-Man" matches "spider man")
window.ACMUtil=(function(){
const esc=(s)=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hue(s){let h=0;s=String(s||'');for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)%360;}
function initial(s){const t=String(s||'').trim();return (t[0]||'?').toUpperCase();}
// search text normaliser: lower-case, strip accents and punctuation
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9\u0080-\uffff]+/g,' ').trim();}
return {esc,hue,initial,norm};
})();
