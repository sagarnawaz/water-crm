// Paani Register service worker: only shows a friendly page when there is no internet.
// It deliberately caches NO customer data or app pages, so nothing private stays on a lost or shared phone.
// ponytail: online-only. For offline entry, add an IndexedDB outbox (ids are already client-made, so replays are safe).
const CACHE = "paani-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Page loads go to the network as normal; only if that fails is the offline page shown.
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
