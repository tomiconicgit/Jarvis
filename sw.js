// A version number. CHANGE THIS every time you deploy.
const CACHE_VERSION = 'v1.0.1'; // If it was 'v1.0.0' before, change it
const CACHE_NAME = `terra-pwa-cache-${CACHE_VERSION}`;

// A basic list of files to cache.
// You should add all your core files here.
const FILES_TO_CACHE = [
    '/',
    'index.html',
    'manifest.json',
    'loading.js',
    'debugger.js',
    'src/main.js',
    'src/core/viewport.js',
    'src/core/camera.js',
    // Add any icons or other assets here
];

// --- 1. INSTALL: Cache all your app shell files ---
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(FILES_TO_CACHE);
            })
            .then(() => {
                // THIS IS THE KEY: Force the new service worker to become active immediately
                return self.skipWaiting();
            })
    );
});

// --- 2. ACTIVATE: Clean up old caches ---
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                // Delete all caches that are NOT our new one
                if (key !== CACHE_NAME) {
                    console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
        .then(() => {
            // THIS IS THE KEY: Take control of all open pages
            return self.clients.claim();
        })
    );
});

// --- 3. FETCH: Serve files from cache ---
self.addEventListener('fetch', (event) => {
    event.respondWith(
        // Try the cache first
        caches.match(event.request)
            .then((response) => {
                // If we found it in the cache, return it.
                // Otherwise, fetch it from the network.
                return response || fetch(event.request);
            })
    );
});
