const CACHE_NAME = 'chc-rebanado-pantalla-v19.0.22';
const LAST_SCREEN = '/pantalla-ultima-vista';
const STATIC_FILES = [
  '/offline-pantalla.html',
  '/css/styles.css?v=19.0.22',
  '/css/institutional.css?v=19.0.22',
  '/js/pwa-install.js',
  '/js/state-chime.js?v=19.0.22',
  '/manifest-pantalla.webmanifest',
  '/icons/rebanado-pantalla-192.png',
  '/icons/rebanado-pantalla-512.png',
  '/icons/chc-corporate-logo.svg?v=19.0.22'
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
    // Network-first evita que una versión anterior de la PWA deje estilos viejos pegados.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch (error) {
        return (await cache.match(event.request)) || Response.error();
      }
    })());
  }
});
