// --- SRC/MAIN.JS ---
// This file acts as a manifest, providing the loader with a list of core scripts to load.

const config = {
    appName: 'Jarvis',
    version: '1.0.0',
    scripts: [
        // The debugger should be loaded first to catch errors in subsequent scripts.
        'debugger.js',
        // LeafletJS for maps (needed by dashboard)
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        // The main dashboard script.
        'dashboard.js',
    ]
};

export default config;

