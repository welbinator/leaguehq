const CACHE_NAME = 'leaguehq-v2';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  // Never intercept API calls, Next.js RSC payloads, or auth endpoints
  const url = event.request.url;
  if (url.includes('/api/')) return;
  if (url.includes('_next/')) return;
  if (url.includes('_rsc')) return;
  if (url.includes('__nextjs')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful HTML/asset responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Try cache fallback
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Return a basic offline response rather than throwing
          return new Response('Offline — please check your connection.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
  );
});
