// Fills the words on screen from config/ui-text.json (app name, tab names, buttons, sort lists, credits).
// In index.html: data-text="path" sets text, data-html="path" sets HTML, data-placeholder="path" sets a placeholder,
// data-options="path" fills a <select> with [value,label] pairs.
(function(){
const T=ACM_CONFIG.text;
const get=(p)=>p.split('.').reduce((o,k)=>(o==null?o:o[k]),T);
document.querySelectorAll('[data-text]').forEach(e=>{e.textContent=get(e.dataset.text);});
document.querySelectorAll('[data-html]').forEach(e=>{e.innerHTML=get(e.dataset.html);});
document.querySelectorAll('[data-placeholder]').forEach(e=>{e.placeholder=get(e.dataset.placeholder);});
document.querySelectorAll('[data-options]').forEach(e=>{e.innerHTML=get(e.dataset.options).map(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;return o.outerHTML;}).join('');});
document.title=ACM_CONFIG.staging.titlePrefix+T.appName;
})();
