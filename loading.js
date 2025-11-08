// loading.js
import { initDebugger, checkForErrors } from './debugger.js';

// REMOVED static import of main.js to prevent circular dependency

const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const loadingInfo = document.getElementById('loading-info');

const modules = [
    // debugger.js is already loaded via the static import above.
    // We only need to list modules that are part of the app logic.
    { name: 'Main', path: './src/main.js' },
    { name: 'Viewport', path: './src/core/viewport.js' },
    { name: 'Camera', path: './src/core/camera.js' }
    // Add more modules here as needed
];

async function loadModules() {
    initDebugger();
    let loaded = 0;
    loadingInfo.textContent = 'Initializing...';

    for (const mod of modules) {
        loadingInfo.textContent = `Loading ${mod.name}...`;
        try {
            await import(mod.path); // Dynamic import for checking
            checkForErrors(mod.name); // Integrate debugger check
            loaded++;
            const percent = (loaded / modules.length) * 100;
            loadingProgress.style.width = `${percent}%`;
        } catch (error) {
            loadingInfo.textContent = `Error loading ${mod.name}: ${error.message}`;
            console.error(error);
            return; // Stop on error
        }
    }

    loadingInfo.textContent = 'Loading complete. Starting orchestration...';
    
    try {
        // THIS IS THE FIX:
        // Now that all modules are loaded, dynamically import main.js...
        const mainModule = await import('./src/main.js');
        
        // ...and call its exported function to start the app.
        mainModule.orchestrateModules();

        // Hide the loading screen
        setTimeout(() => loadingScreen.style.display = 'none', 1000);

    } catch (error) {
        loadingInfo.textContent = `Error starting application: ${error.message}`;
        console.error("Orchestration failed:", error);
    }
}

// --- Service Worker Registration ---
// This code will register your service worker (sw.js)
// to handle caching and offline functionality.
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        // We register 'load' to ensure the page is fully
        // loaded before we start registering the worker.
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js') // Assumes sw.js is in the root
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.error('ServiceWorker registration failed: ', err);
                });
        });
    }
}

// --- Start the Application ---
loadModules();

// --- Register the Service Worker ---
registerServiceWorker();
