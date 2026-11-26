/* andchillmedia - streaming provider links (logic only).
   The DATA lives in config/providers.json: which services exist, their search URL patterns, the name rules, and the
   direct-link codes. To add or fix a provider edit that file, run python3 tools/build_config.py, then tools/run_tests.sh.
   TMDB/JustWatch only give one generic "where to watch" page per title. For each provider we know
   (a) a search URL pattern that was checked to load a real page (null = none, falls back to the TMDB/JustWatch page), and
   (b) for some titles a direct title page (field "h" in the data, from TMDB's homepage field). */
(function(){
const CFG=ACM_CONFIG.providers;
const re=(p)=>new RegExp(p[0],p[1]);
const FAM=CFG.families;
// Ordered rules on the provider NAME. Channels sold inside Amazon / Apple TV / Roku open that host's search.
const RULES=CFG.rules.map(([src,flags,key])=>[new RegExp(src,flags),key]);
// Channel-style names: the title is watched inside another app, so keep them as their own row.
const CHANNEL=re(CFG.channelPattern);
const AMAZON_MX=re(CFG.amazonMxPattern);
const STRIP_SUFFIX=re(CFG.stripSuffixPattern);
function familyOf(name){
  const n=String(name||'');
  for(const [re,k] of RULES){ if(re.test(n)) return k; }
  return null;
}
function canonName(name,key){
  if(CHANNEL.test(name)||AMAZON_MX.test(name)) return String(name).trim();
  if(key&&FAM[key]) return FAM[key].name;
  return String(name||'').replace(STRIP_SUFFIX,'').trim();
}
// Compact "h" field -> full URL. Only used when the title is also listed on that service in US data.
const DEEP=CFG.deepCodes;
function parseDeep(h){
  if(!h||typeof h!=='string')return null;
  const i=h.indexOf(':');if(i<1)return null;
  const d=DEEP[h.slice(0,i)];if(!d)return null;
  return {key:d[0],url:d[1]+h.slice(i+1)};
}
// Returns {url,type:'deep'|'search'|'tmdb',key,svc}
function link(prov,title,h,tmdbUrl){
  const key=familyOf(prov);
  const svc=canonName(prov,key);
  const dp=parseDeep(h);
  const channel=CHANNEL.test(prov);
  if(dp&&key&&dp.key===key&&!channel) return {url:dp.url,type:'deep',key,svc};
  const f=key&&FAM[key];
  if(f&&f.search) return {url:f.search+encodeURIComponent(title),type:'search',key,svc};
  return {url:tmdbUrl,type:'tmdb',key,svc};
}
window.ACMProviders={FAM,familyOf,canonName,parseDeep,link,CHANNEL};
})();
