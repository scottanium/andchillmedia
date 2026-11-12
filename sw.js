const CACHE = 'free-music-shell-v7';
const DATA_CACHE = 'free-media-data-v1';
const IMG_CACHE = 'free-media-img-v1';
const IMG_MAX = 300;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './catalog.js', './LICENSE.txt', './media.js', './media.css', './tmdb-logo.svg'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  const keep = [CACHE, DATA_CACHE, IMG_CACHE];
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trimImages() {
  const c = await caches.open(IMG_CACHE);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - IMG_MAX; i++) await c.delete(keys[i]);
}
function isIaHost(hostname) {
  return hostname === 'archive.org' || hostname === 'www.archive.org' || hostname.endsWith('.archive.org');
}
function isIaArt(url) {
  return isIaHost(url.hostname) && url.pathname.startsWith('/services/img');
}
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // audio/zip and other archive.org file downloads go straight to the network
  if ((url.pathname.endsWith('.mp3') || isIaHost(url.hostname)) && !isIaArt(url)) return;
  // TMDB posters/logos and IA album art: network first, small capped cache for offline
  if (url.hostname === 'image.tmdb.org' || isIaArt(url)) {
    e.respondWith(fetch(e.request).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(IMG_CACHE).then((c) => c.put(e.request, copy)).then(trimImages); }
      return res;
    }).catch(() => caches.match(e.request)));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // movie/TV data: stale-while-revalidate
  if (/\/media-[^/]+\.json$/.test(url.pathname)) {
    e.respondWith(caches.open(DATA_CACHE).then((c) => c.match(e.request).then((cached) => {
      const net = fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => cached);
      return cached || net;
    })));
    return;
  }
  // app shell: cache first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => cached))
  );
});
