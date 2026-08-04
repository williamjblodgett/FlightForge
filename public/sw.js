const cacheName = "product-pages-v4";

async function cacheAppShell() {
  const scope = self.registration.scope;
  const cache = await caches.open(cacheName);
  const shellResponse = await fetch(scope, { cache: "reload" });
  const html = await shellResponse.clone().text();
  await cache.put(scope, shellResponse);
  const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/gu)]
    .map((match) => new URL(match[1], scope).href)
    .filter((url) => new URL(url).origin === self.location.origin);
  const fixedUrls = [
    "manifest.webmanifest",
    "icon.svg",
    "brand/flightforge-mark.png",
    "brand/flightforge-maine-hero-v2.webp",
  ].map((path) => new URL(path, scope).href);
  await Promise.allSettled([...new Set([...assetUrls, ...fixedUrls])].map((url) => cache.add(url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => {
      const copy = response.clone();
      void caches.open(cacheName).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(self.registration.scope))),
  );
});
