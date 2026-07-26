// DocuChain service worker — makes the app installable + offline-tolerant.
// Network-first for the static shell (so deploys show up immediately), with a
// cache fallback when offline. API / share / auth traffic is never touched.
const CACHE = "docuchain-v1";
const SHELL = [
  "/", "/index.html",
  "/style.css", "/dogstudio.css", "/dv3d.css",
  "/script.js", "/dogstudio.js", "/dv3d.js", "/contract.js",
  "/icon-192.png", "/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Only same-origin GETs for static assets. Leave the app's API, share links,
  // and any non-GET request to go straight to the network — never cache them.
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/share")) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/index.html")))
  );
});
