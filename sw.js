/* WorkWell Return — service worker (network-first, offline fallback). */
var CACHE = 'ww-cache-v1';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(['./', './index.html', './manifest.webmanifest']); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) { return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { try { c.put(req, copy); } catch (_) {} });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (m) { return m || caches.match('./index.html'); });
    })
  );
});
