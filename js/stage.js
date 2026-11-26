// STAGING banner. Does nothing in the live app (ACM_CONFIG.staging.on is false there).
// The staging build (tools/build_deploy.py --staging) turns it on and also changes the saved-data names and cache names,
// so staging never touches the live app's saved profiles, history or offline cache. Banner text: config/staging.json.
(function(){
const S=ACM_CONFIG.staging;
if(!S||!S.on)return;
const css=document.createElement('style');
css.textContent='#stagingBanner{position:fixed;top:0;left:0;right:0;height:24px;line-height:24px;z-index:20000;background:#ff9f0a;color:#000;'
 +'font:700 12px/24px system-ui,sans-serif;text-align:center;letter-spacing:.04em;pointer-events:none}'
 +'body{padding-top:24px}header{top:24px!important}#refreshBtn{top:calc(34px + env(safe-area-inset-top))!important}';
document.head.appendChild(css);
const b=document.createElement('div');
b.id='stagingBanner';b.setAttribute('role','status');b.textContent=S.banner;
document.body.appendChild(b);
})();
