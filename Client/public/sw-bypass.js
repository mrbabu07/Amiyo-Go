// BYPASS SERVICE WORKER - NO CACHING
console.log('🚫 Service Worker: BYPASS MODE - No caching');

self.addEventListener('install', (event) => {
  console.log('⚡ SW: Installing (bypass mode)');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('⚡ SW: Activating (bypass mode)');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('🗑️ SW: Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('✅ SW: All caches cleared');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Don't cache anything - just pass through
  console.log('🔄 SW: Bypassing cache for:', event.request.url);
  event.respondWith(fetch(event.request));
});
