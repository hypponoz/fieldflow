// FieldFlow — minimal offline-shell service worker.
// Caches the app shell so the prototype opens even with no connection;
// everything else (fonts, icon webfont) falls back to the network.
// Bump CACHE_NAME (v1 -> v2 -> ...) every time fieldflow_prototype.html changes, otherwise
// installed clients keep serving the old cached copy forever — see handoff section 10.5.
const CACHE_NAME = 'fieldflow-shell-v7';
const SHELL_FILES = [
  './fieldflow_prototype.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
  // Reverted from inlined data: URI icons (2026-09-06) — those silently broke Android's
  // WebAPK/install-prompt pipeline, which needs real fetchable icon URLs. See handoff 12.
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; }).map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).catch(function () {
        // Offline and not cached (e.g. a CDN font/icon) — just fail quietly for non-shell requests.
        return cached;
      });
    })
  );
});
