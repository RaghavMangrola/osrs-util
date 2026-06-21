// Minimal service worker — its only job is to make Hermes installable as a PWA.
// It deliberately does NOT cache responses: Hermes is a thin client for a local
// server that's always reachable when the app is in use, and skipping the cache
// avoids serving a stale UI after an update. The fetch handler is required for
// the browser to treat the app as installable.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
