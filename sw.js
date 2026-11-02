// Offline support. Network first, so updates show up as soon as the phone is online;
// the cached copy is used when there is no connection.
const CACHE = 'sober-days-v10';
const FILES = ['./', 'index.html', 'app.js', 'content.js', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/IBMPlexSans.woff2', 'fonts/IBMPlexSerif-300.woff2', 'fonts/IBMPlexSerif-300i.woff2'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // 'no-cache' makes the browser check with the server every time, so the page and its
  // scripts never come from different versions (GitHub Pages lets browsers cache for 10 min).
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
