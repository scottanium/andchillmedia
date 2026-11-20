/* andchillmedia v8 - streaming provider links.
   TMDB/JustWatch only give one generic "where to watch" page per title. For each provider we know
   (a) a search URL pattern that was checked to load a real page (see PROVIDER_LINK_TEST in the build notes), and
   (b) for some titles a direct title page (field "h" in the data, from TMDB's homepage field).
   Providers with no working search pattern fall back to the TMDB/JustWatch page. */
(function(){
// search: URL prefix that the URL-encoded title is appended to; null = no usable search (falls back to TMDB)
const FAM={
  netflix:  {name:'Netflix',      search:'https://www.netflix.com/search?q=',                     deep:'https://www.netflix.com/title/'},
  hulu:     {name:'Hulu',         search:'https://www.hulu.com/search?q=',                        deep:'https://www.hulu.com/'},
  max:      {name:'HBO Max',      search:'https://www.hbomax.com/search?q=',                      deep:'https://www.hbomax.com/'},
  disney:   {name:'Disney+',      search:null,                                                    deep:'https://www.disneyplus.com/'},
  prime:    {name:'Prime Video',  search:'https://www.primevideo.com/search/?phrase=',            deep:'https://www.primevideo.com/detail/'},
  apple:    {name:'Apple TV',     search:'https://tv.apple.com/search?term=',                     deep:'https://tv.apple.com/'},
  peacock:  {name:'Peacock',      search:'https://www.peacocktv.com/watch/search?q=',             deep:'https://www.peacocktv.com/'},
  paramount:{name:'Paramount+',   search:'https://www.paramountplus.com/search/?q=',              deep:'https://www.paramountplus.com/'},
  tubi:     {name:'Tubi',         search:'https://tubitv.com/search/',                            deep:'https://tubitv.com/'},
  pluto:    {name:'Pluto TV',     search:null},
  roku:     {name:'The Roku Channel', search:'https://therokuchannel.roku.com/search/',           deep:'https://therokuchannel.roku.com/'},
  plex:     {name:'Plex',         search:'https://watch.plex.tv/search?q='},
  youtube:  {name:'YouTube',      search:'https://www.youtube.com/results?search_query='},
  gplay:    {name:'Google Play',  search:'https://play.google.com/store/search?c=movies&q='},
  fandango: {name:'Fandango at Home', search:'https://athome.fandango.com/content/browse/search?searchString='},
  crunchy:  {name:'Crunchyroll',  search:'https://www.crunchyroll.com/search?q='},
  kanopy:   {name:'Kanopy',       search:'https://www.kanopy.com/en/search?query='},
  hoopla:   {name:'Hoopla',       search:'https://www.hoopladigital.com/search?q='},
  starz:    {name:'Starz',        search:'https://www.starz.com/us/en/search?q='},
  amc:      {name:'AMC+',         search:'https://www.amcplus.com/search?q='},
  cw:       {name:'The CW',       search:'https://www.cwtv.com/search/?q='},
  criterion:{name:'Criterion Channel', search:'https://www.criterionchannel.com/search?q='},
  mubi:     {name:'MUBI',         search:'https://mubi.com/en/search/films?query='},
  philo:    {name:'Philo',        search:'https://www.philo.com/player/search?q='},
  fubo:     {name:'fuboTV',       search:null},
  shudder:  {name:'Shudder',      search:null},
  viki:     {name:'Rakuten Viki', search:'https://www.viki.com/search?q='},
  mgm:      {name:'MGM+',         search:'https://www.mgmplus.com/search?q='},
  kocowa:   {name:'Kocowa',       search:'https://www.kocowa.com/en_us/search?q='},
  odk:      {name:'OnDemandKorea',search:'https://www.ondemandkorea.com/search?q='},
  cineverse:{name:'Cineverse',    search:'https://streaming.cineverse.com/find?q='},
  fawesome: {name:'Fawesome',     search:'https://fawesome.tv/search?q='},
  britbox:  {name:'BritBox',      search:'https://www.britbox.com/us/search?q='},
  hidive:   {name:'HIDIVE',       search:'https://www.hidive.com/search?q='}
};
// Ordered rules on the provider NAME. Channels sold inside Amazon / Apple TV / Roku open that host's search.
const RULES=[
  [/amazon|prime video|freevee/i,'prime'],
  [/apple tv/i,'apple'],
  [/roku/i,'roku'],
  [/netflix/i,'netflix'],
  [/^hulu/i,'hulu'],
  [/hbo max|^max$|^max /i,'max'],
  [/disney/i,'disney'],
  [/peacock/i,'peacock'],
  [/paramount/i,'paramount'],
  [/^tubi/i,'tubi'],
  [/pluto/i,'pluto'],
  [/^plex/i,'plex'],
  [/youtube/i,'youtube'],
  [/google play/i,'gplay'],
  [/fandango|vudu/i,'fandango'],
  [/crunchyroll/i,'crunchy'],
  [/kanopy/i,'kanopy'],
  [/hoopla/i,'hoopla'],
  [/^starz/i,'starz'],
  [/^amc\+|^amc plus/i,'amc'],
  [/^the cw$/i,'cw'],
  [/criterion/i,'criterion'],
  [/^mubi/i,'mubi'],
  [/^philo/i,'philo'],
  [/^fubo/i,'fubo'],
  [/shudder/i,'shudder'],
  [/rakuten viki/i,'viki'],
  [/^mgm\+|^mgm plus/i,'mgm'],
  [/^kocowa/i,'kocowa'],
  [/ondemandkorea/i,'odk'],
  [/^cineverse/i,'cineverse'],
  [/^fawesome/i,'fawesome'],
  [/^britbox/i,'britbox'],
  [/^hidive/i,'hidive']
];
// Channel-style names: the title is watched inside another app, so keep them as their own row.
const CHANNEL=/ (Amazon|Apple TV|Roku Premium) Channel$|Apple TV channel$/i;
function familyOf(name){
  const n=String(name||'');
  for(const [re,k] of RULES){ if(re.test(n)) return k; }
  return null;
}
function canonName(name,key){
  if(CHANNEL.test(name)||/^Amazon MX Player/i.test(name)) return String(name).trim();
  if(key&&FAM[key]) return FAM[key].name;
  return String(name||'').replace(/ (Store|with Ads|Standard with Ads|Basic with Ads|Free)$/i,'').trim();
}
// Compact "h" field -> full URL. Only used when the title is also listed on that service in US data.
const DEEP={n:['netflix','https://www.netflix.com/title/'],d:['disney','https://www.disneyplus.com/'],a:['apple','https://tv.apple.com/'],
  h:['hulu','https://www.hulu.com/'],p:['paramount','https://www.paramountplus.com/'],m:['max','https://www.hbomax.com/'],
  k:['peacock','https://www.peacocktv.com/'],t:['tubi','https://tubitv.com/'],z:['prime','https://www.primevideo.com/detail/'],
  r:['roku','https://therokuchannel.roku.com/']};
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
