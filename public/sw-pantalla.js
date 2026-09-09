const CACHE_NAME = 'chc-rebanado-pantalla-v19.0.10';
const LAST_SCREEN = '/pantalla-ultima-vista';
const STATIC_FILES = [
  '/offline-pantalla.html',
  '/css/styles.css',
  '/css/institutional.css',
  '/js/pwa-install.js',
  '/manifest-pantalla.webmanifest',
  '/icons/rebanado-pantalla-192.png',
  '/icons/rebanado-pantalla-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('chc-rebanado-pantalla-') && key !== CACHE_NAME).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate' && url.pathname.startsWith('/pantalla')) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(LAST_SCREEN, response.clone());
        }
        return response;
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(LAST_SCREEN)) || cache.match('/offline-pantalla.html');
      }
    })());
    return;
  }

  if (url.origin === self.location.origin && /\.(?:css|js|png|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(event.request).then(cached => cached || fetch(event.request))));
  }
});
