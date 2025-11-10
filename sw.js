--------------------------------------------------------------------------------
File: sw.js
--------------------------------------------------------------------------------
// sw.js

const CACHE_VERSION = 'v1.9.0'; // <-- BUMPED VERSION
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
    'src/core/filemanagement.js',
    'src/core/ui/menu.js',
    'src/core/ui/workspace.js',
    'src/core/selectioncontext.js',
    'src/core/ui/modal.js',
    'src/core/engine/newproject.js',
    'src/core/engine/saveproject.js',
    'src/core/engine/loadproject.js',
    'src/core/engine/importengine.js',
    'src/core/engine/exportengine.js',
    
    // --- UPDATED MODULES ---
    'src/core/events.js',
    'src/core/engine/player.js',
    'src/core/engine/testplay.js',
    'src/core/firstpersonview.js',
    'src/core/joystick.js',
    'src/core/ui/editorbar.js',
    'src/core/ui/gizmo.js',
    'src/core/ui/gizmotools.js',
    'src/core/ui/propertiespanel.js',
    'src/core/ui/transformpanel.js', // <-- THIS WAS THE TYPO (was srcD/)
    'src/core/ui/addpanel.js',
    
    // --- NEW SCRIPTING MODULE ---
    'src/core/engine/script.js',
    
    // --- DEFAULT ASSETS ---
    'src/core/default/terrain.js',
    'src/core/default/environment.js',
    'src/core/default/environment.hdr', // <-- Fixed this typo too
    'src/core/default/lighting.js',
    
    // 'icons/icon-192x192.png',
    // 'icons/icon-512x512.png',
    // 'icons/icon-maskable-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching app shell');
                // Use addAll with a catch to prevent one bad file from failing all
                return cache.addAll(FILES_TO_CACHE).catch(err => {
                    console.error('[ServiceWorker] Failed to cache all files:', err);
                });
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
