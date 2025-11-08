// sw.js

const CACHE_VERSION = 'v1.0.5'; // <-- BUMPED VERSION
const CACHE_NAME = `terra-pwa-cache-${CACHE_VERSION}`;

const FILES_TO_CACHE = [
    '/',
    'index.html',
    'manifest.json',
    'launcher.js',
    'debugger.js',
    'src/main.js',
    'src/core/viewport.js',
    'src/core/camera.js',
    'src_core/filemanagement.js',
    'src/core/procedural/terrain.js',
    'src/core/ui/menu.js',
    'src/core/ui/workspace.js',
    'src/core/selectioncontext.js',
    'src/core/procedural/lighting.js',
    'src/core/procedural/sky.js'
    
    // Add icons/ folder here when ready
    // 'icons/icon-192x192.png',
    // 'icons/icon-512x512.png',
    // 'icons/icon-maskable-512x512.png'
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
                    if (key !== CACHE_NAME) { // <-- FIX: Was CACHE_NoteS
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
