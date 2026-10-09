const CACHE_PREFIX = 'weide-brake-fluid-record-';
const CACHE = CACHE_PREFIX + 'v2';
const ASSETS = ['./', './index.html', './styles.css', './service-core.js', './app.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Cache only this app's static shell, never customer API data or unrelated paths.
  const allowed = ASSETS.some(path => new URL(path, self.registration.scope).href === url.href);
  if (!allowed) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request, { cacheName: CACHE });
    if (cached) return cached;
    if (event.request.mode === 'navigate') {
      const page = await caches.match(new URL('./index.html', self.registration.scope).href, { cacheName: CACHE });
      if (page) return page;
    }
    return Response.error();
  }));
});
