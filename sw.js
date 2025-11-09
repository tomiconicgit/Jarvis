// sw.js

const CACHE_VERSION = 'v1.2.0'; // <-- BUMPED VERSION
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
    'src/core/ui/tools.js',
    'src/core/ui/modal.js',
    'src/core/engine/newproject.js',
    'src/core/engine/saveproject.js',
    'src/core/engine/loadproject.js',
    'src/core/engine/importengine.js', // <-- ADDED
    
    // --- DEFAULT ASSETS ---
    'src/core/default/terrain.js',
    'src/core/default/environment.js',
    'src/core/default/environment.hdr',
    
    // Add icons/ folder here when ready
    // 'icons/icon-192x192.png',
    // 'icons/icon-512x512.png',
    // 'icons/icon-maskable-512x512.png'
];

// ... (rest of the file is unchanged) ...
