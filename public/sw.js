const CACHE_NAME = 'chc-rebanado-app-v19.0.21';
const STATIC_FILES = [
  '/offline.html',
  '/css/styles.css?v=19.0.21',
  '/css/institutional.css?v=19.0.21',
  '/js/app.js',
  '/js/pwa-install.js',
  '/js/state-chime.js?v=19.0.21',
  '/manifest.webmanifest',
  '/icons/rebanado-digital-v2-192.png',
  '/icons/rebanado-digital-v2-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('chc-rebanado-app-') && key !== CACHE_NAME).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE_NAME).then(cache => cache.match('/offline.html'))));
    return;
  }

  if (url.origin === self.location.origin && /\.(?:css|js|png|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      cache.put(event.request, response.clone());
      return response;
    }))));
  }
});
