const CACHE_NAME = 'afc-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/booking.html',
  '/transfers.html',
  '/consolidation.html',
  '/statusupdate.html',
  '/adminpanel.html',
  '/mobiledashboard.html',
  '/mobilebooking.html',
  '/mstatusupdate.html',
  '/manifest.json',
  '/auth-guard.js',
  '/nav.js',
  '/notifications.js',
  '/packageModal.js',
  '/scanner.js',
  '/tracking.js',
  '/externalApi.js',
  '/js/api-client.js',
  '/js/sidebar.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.warn('SW cache preload warning:', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
