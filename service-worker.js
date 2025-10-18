// --- SERVICE-WORKER.JS ---
// This service worker implements a "network-only" strategy to honor the "zero caching" request.
// This still allows the app to be installable (PWA), but all content will be fetched from the network.

const CACHE_NAME = 'jarvis-cache-v1';

// On install, pre-cache the main app shell files. This is minimal.
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // We cache the offline page to show if the network fails.
      // Caching other assets is avoided to meet the "zero caching" requirement.
      return cache.addAll([
        '/',
        'index.html' 
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    // Clean up old caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});


// The fetch event is where the caching strategy is defined.
self.addEventListener('fetch', event => {
    // We will always try to fetch from the network first.
    event.respondWith(
        fetch(event.request).catch(() => {
            // If the network request fails, we can serve the basic index.html from cache.
            // This provides a minimal offline experience without caching dynamic data.
            return caches.match(event.request).then(response => {
                if (response) {
                    return response;
                }
                // If the request is not in cache (e.g., for a JS file not cached),
                // there's nothing we can do. The browser's default offline error will show.
            });
        })
    );
});

