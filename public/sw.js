const CACHE_NAME="flightforge-public-assets-v5";
const PUBLIC_ASSETS=["/offline","/offline.js","/offline.css","/brand/flightforge-mark.png"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(async cache=>{
    const responses=[];
    for(const path of PUBLIC_ASSETS){
      const response=await fetch(path,{credentials:"omit",cache:"reload",redirect:"error"});
      const mime=response.headers.get("content-type")||"";const expected=path==="/offline"?"text/html":path.endsWith(".js")?"javascript":path.endsWith(".css")?"text/css":"image/";
      if(!response.ok||response.redirected||response.type!=="basic"||new URL(response.url).pathname!==path||!mime.includes(expected)||/private|no-store/i.test(response.headers.get("cache-control")||""))throw new Error("Public offline asset unavailable");
      responses.push([path,response]);
    }
    for(const [path,response] of responses)await cache.put(path,response);
    await self.skipWaiting();
  }));
});
self.addEventListener("message",event=>{if(event.data?.type==="OFFLINE_READY"&&event.ports[0])event.waitUntil(caches.open(CACHE_NAME).then(async cache=>{const ready=(await Promise.all(PUBLIC_ASSETS.map(path=>cache.match(path)))).every(Boolean);event.ports[0].postMessage({version:CACHE_NAME,ready});}));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("flightforge-public-assets-")&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin||request.headers.has("authorization")||request.headers.has("rsc")||request.headers.has("next-router-state-tree"))return;
  if(request.mode==="navigate"&&url.pathname==="/offline"){
    // This exact route is the non-personalized static guide, safe for cache-first cold starts.
    event.respondWith(caches.open(CACHE_NAME).then(async cache=>await cache.match("/offline")||fetch(request)));return;
  }
  if(request.mode==="navigate"){
    // Network-only navigation. Fallback is generic static HTML, never a cached user response.
    if(url.pathname!=="/"&&url.pathname!=="/offline"&&url.pathname!=="/discover"&&url.pathname!=="/downloads"&&url.pathname!=="/courses"&&!url.pathname.startsWith("/courses/"))return;
    event.respondWith(fetch(request).catch(async()=>await (await caches.open(CACHE_NAME)).match("/offline")||new Response("Offline guide not downloaded.",{status:503})));
    return;
  }
  if(url.search||!PUBLIC_ASSETS.includes(url.pathname))return;
  event.respondWith(caches.open(CACHE_NAME).then(cache=>cache.match(url.pathname)).then(cached=>cached||fetch(request)));
});
