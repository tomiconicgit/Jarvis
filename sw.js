// sw.js

const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = `terra-pwa-cache-${CACHE_VERSION}`;

const FILES_TO_CACHE = [
    '/',
    'index.html',
    'manifest.json',
    'loading.js',
    'debugger.js',
    'src/main.js',
    'src/core/viewport.js',
    'src/core/camera.js'
    // Add icons and other assets here
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(FILES_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) =>
            Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[ServiceWorker] Removing old cache', key);
                        return caches.delete(key);
                    }
                })
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});