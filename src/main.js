// --- SRC/MAIN.JS ---
// This file acts as a manifest, providing the loader with a list of core scripts to load.

const config = {
    appName: 'Jarvis',
    version: '1.1.0',
    scripts: [
        // The debugger should be loaded first to catch errors in subsequent scripts.
        'debugger.js',
        // Core libraries
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
        // App modules
        'dashboard.js',
        'bus-tool.js' // The Bus Times tool is now a separate module
    ]
};

export default config;


