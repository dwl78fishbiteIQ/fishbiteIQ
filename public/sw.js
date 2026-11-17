const CACHE = "fishbiteiq-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/", "/favicon.svg"]))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isDevPath(url.pathname) || isLiveData(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  if (isStatic(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function isDevPath(path) {
  return path.startsWith("/@") || path.startsWith("/src/") || path.startsWith("/node_modules/");
}

function isLiveData(path) {
  return path.startsWith("/_server") || path.startsWith("/api") || path.includes("server-fn");
}

function isStatic(path) {
  return path.startsWith("/assets/") || path.startsWith("/spots/") || path.startsWith("/__grok/") || /\.(?:js|css|png|jpe?g|svg|webp|woff2?)$/.test(path);
}

async function networkFirst(request, fallback) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(fallback)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || refresh;
}
