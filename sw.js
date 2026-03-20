// ============================================================
// Restaurant ERP — Service Worker
// Cache shell for offline load, live data always from network
// ============================================================

const CACHE_NAME = 'erp-dashboard-v1';

// Core assets to cache on install (app shell)
const SHELL_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── INSTALL: cache app shell ─────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: smart routing ─────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 1. Google Apps Script — ALWAYS network (live dashboard data)
  //    Never cache API responses
  if (
    url.includes('script.google.com') ||
    url.includes('script.googleusercontent.com') ||
    url.includes('googleapis.com/script')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. CDN resources (Tailwind, Chart.js, fonts) — network first, fallback to cache
  if (
    url.includes('cdn.tailwindcss.com') ||
    url.includes('cdn.jsdelivr.net') ||
    url.includes('cdnjs.cloudflare.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    url.includes('unpkg.com')
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache a copy for next time
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Local assets (index.html, icons, manifest) — cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache local asset for future
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
