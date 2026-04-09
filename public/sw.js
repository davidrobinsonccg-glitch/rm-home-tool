// R-M Home Tool — Service Worker
// Caches the app shell for offline use.
// All Spock guidance (the main consultation flow) is offline by default.
// API features (Why tool, Report ingestion, Pattern insight, Spock assessment)
// require a network connection and will show an error if offline.

const CACHE_NAME = "rm-home-v1";
const SHELL_ASSETS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Let API calls (Netlify functions) go to the network always
  if (event.request.url.includes("/.netlify/functions/")) {
    return;
  }
  // For navigation requests, serve the app shell
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then((r) => r || fetch(event.request))
    );
    return;
  }
  // For all other requests: network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
