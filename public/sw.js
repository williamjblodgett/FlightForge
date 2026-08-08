const CACHE_NAME = "flightforge-public-assets-v1";
const PUBLIC_ASSETS = ["/brand/flightforge-mark.png", "/brand/flightforge-maine-hero-v2.webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Authenticated HTML, RSC, APIs, video, and account routes are always network-only.
  if (event.request.mode === "navigate" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/assets/") || event.request.headers.has("authorization")) return;
  if (!PUBLIC_ASSETS.includes(url.pathname)) return;
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => {
    if (response.ok && response.type === "basic") void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  })));
});
