// sw.js (Service Worker)
// This script runs in the background, separate from your main web page.
// Its primary job is to intercept network requests (like for .js files,
// .html files, or images) and serve them from a local cache,
// enabling offline functionality and super-fast load times.

// --- 1. Configuration ---

// 'CACHE_VERSION' is a unique name for your cache.
// *** CRITICAL: *** You MUST change this version string (e.g., 'v1.9.1')
// every time you deploy a new version of your app.
// This tells the service worker to delete the old cache and
// install a new one with your updated files.
const CACHE_VERSION = 'v1.9.0';
const CACHE_NAME = `terra-pwa-cache-${CACHE_VERSION}`;

// 'FILES_TO_CACHE' is the "app shell" – the minimum set of files
// required to make your application *run*.
// This list MUST be kept in sync with your project's file structure.
const FILES_TO_CACHE = [
    // --- Core PWA Files ---
    '/', // The root page (index.html)
    'index.html', // The main HTML file
    'manifest.json', // The PWA manifest
    
    // --- Core App Logic ---
    'launcher.js',
    'debugger.js',
    'src/main.js',
    
    // --- Core Modules ---
    'src/core/viewport.js',
    'src/core/camera.js',
    'src/core/filemanagement.js',
    'src/core/events.js',
    'src/core/firstpersonview.js',
    'src/core/joystick.js',
    'src/core/selectioncontext.js',
    
    // --- Engine Modules ---
    'src/core/engine/newproject.js',
    'src/core/engine/saveproject.js',
    'src/core/engine/loadproject.js',
    'src/core/engine/importengine.js',
    'src/core/engine/exportengine.js',
    'src/core/engine/player.js',
    'src/core/engine/testplay.js',
    'src/core/engine/script.js',
    
    // --- UI Modules ---
    'src/core/ui/menu.js',
    'src/core/ui/workspace.js',
    'src/core/ui/modal.js',
    'src/core/ui/editorbar.js',
    'src/core/ui/gizmo.js',
    'src/core/ui/gizmotools.js',
    'src/core/ui/propertiespanel.js',
    'src/core/ui/transformpanel.js', // <-- TYPO FIX (was srcD/)
    'src/core/ui/addpanel.js',
    
    // --- Default Scene Assets ---
    'src/core/default/terrain.js',
    'src/core/default/environment.js',
    'src/core/default/environment.hdr', // <-- TYPO FIX
    'src/core/default/lighting.js',
    
    // --- Icons ---
    // (These are commented out, but you should add your app icons here)
    // 'icons/icon-192x192.png',
    // 'icons/icon-512x512.png',
    // 'icons/icon-maskable-512x512.png'
];

// --- 2. Service Worker Lifecycle Events ---

/**
 * 'install' Event
 * This event fires *once* when the browser first downloads this sw.js file
 * (or when it detects a change in the file, i.e., a new CACHE_VERSION).
 */
self.addEventListener('install', (event) => {
    // 'event.waitUntil()' tells the browser to wait until the
    // promise inside it is resolved before considering the
    // installation complete.
    event.waitUntil(
        caches.open(CACHE_NAME) // Open our new, versioned cache
            .then((cache) => {
                console.log('[ServiceWorker] Caching app shell');
                // 'cache.addAll()' fetches all files in the
                // FILES_TO_CACHE array from the network and
                // stores them in the cache.
                return cache.addAll(FILES_TO_CACHE).catch(err => {
                    // If *any* file fails to download, addAll() rejects.
                    console.error('[ServiceWorker] Failed to cache all files:', err);
                });
            })
            // 'self.skipWaiting()' is an important command. It tells
            // this new service worker to become the *active* service
            // worker immediately, rather than waiting for the user
            // to close all old tabs.
            .then(() => self.skipWaiting())
    );
});

/**
 * 'activate' Event
 * This event fires *after* 'install' is complete and this
 * service worker is now in control of the page.
 * Its main job is to clean up old, outdated caches.
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => // Get a list of *all* cache names
            Promise.all(
                keyList.map((key) => {
                    // If a cache's name is *not* our new, current CACHE_NAME...
                    if (key !== CACHE_NAME) {
                        // ...then it's an old cache. Delete it.
                        console.log('[ServiceWorker] Removing old cache', key);
                        return caches.delete(key);
                    }
                })
            )
        // 'self.clients.claim()' tells the service worker to take
        // control of all open clients (tabs) immediately.
        ).then(() => self.clients.claim())
    );
});

/**
 * 'fetch' Event
 * This is the most important event. It fires *every single time*
 * the web page makes a network request (for a .js file, a .css file,
 * an image, an API call, etc.).
 */
self.addEventListener('fetch', (event) => {
    // 'event.respondWith()' is how we "hijack" the request.
    // We provide our own response instead of letting it go to the network.
    event.respondWith(
        // 1. Try to find a match for this request in our cache.
        caches.match(event.request)
            .then((response) => {
                // 2. Check the result
                if (response) {
                    // --- CACHE HIT ---
                    // A response was found in the cache!
                    // Return the cached version immediately.
                    // This is extremely fast and works offline.
                    return response;
                }
                
                // --- CACHE MISS ---
                // No response was found in the cache.
                // This could be for a CDN link (like three.js)
                // or a file we forgot to add to FILES_TO_CACHE.
                
                // We let the browser fetch it from the network normally.
                return fetch(event.request);
            })
    );
});
