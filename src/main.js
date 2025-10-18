// --- SRC/MAIN.JS ---
// This file acts as a manifest, providing the loader with a list of core scripts to load.

const config = {
    appName: 'Jarvis',
    version: '1.2.0', // Updated version
    scripts: [
        // The debugger should be loaded first to catch errors in subsequent scripts.
        'debugger.js',
        // Core libraries (already in index.html, but listed for clarity)
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        // App modules
        'src/dashboard.js',
        'src/video-downloader.js', // New video downloader tool
        'bus-tool.js' // The Bus Times tool is now a separate module
    ]
};

export default config;
