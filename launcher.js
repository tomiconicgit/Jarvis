// launcher.js
import { initDebugger, setLoaderErrorCallback } from './debugger.js';

const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const loadingInfo = document.getElementById('loading-info');

/**
 * This is the new callback function.
 * debugger.js will call this if a global error occurs.
 */
function showLoadingError(message) {
    loadingInfo.textContent = message;
    loadingProgress.style.background = '#f00'; // Turn bar red
    loadingProgress.style.width = '100%';
}

/**
 * This is the main application launcher.
 * It's now completely decoupled from the app's modules.
 */
async function loadApp() {
    // 1. Init debugger and give it our error callback
    // --- UPDATED: Pass an empty object to hold the App.debugger API ---
    // This is a temporary App object just for the debugger to attach to.
    const App = {}; 
    initDebugger(App); 
    setLoaderErrorCallback(showLoadingError);

    // 2. Register Service Worker
    registerServiceWorker();

    loadingInfo.textContent = 'Loading application...';
    loadingProgress.style.width = '30%'; // Show some progress

    try {
        // 3. Attempt to load the ENTIRE application
        // We just import main.js. That's it.
        // main.js will then handle loading everything else.
        // The real App object will be created inside main.js
        await import('./src/main.js');

        // 4. If we get here, main.js and all its imports succeeded
        loadingInfo.textContent = 'Loading complete. Starting scene...';
        loadingProgress.style.width = '100%';

        // 5. Hide the loading screen
        setTimeout(() => {
            if (loadingScreen) loadingScreen.style.display = 'none';
            // Disconnect the loader callback.
            setLoaderErrorCallback(null);
        }, 800);

    } catch (error) {
        // This will catch a FATAL error (e.g., main.js not found or has a syntax error)
        const msg = `Fatal error: ${error.message}`;
        console.error(msg, error);
        showLoadingError(msg);
        // The loading screen will stay visible with the error
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('ServiceWorker registration successful with scope:', registration.scope);
                })
                .catch((err) => {
                    console.error('ServiceWorker registration failed:', err);
                });
        });
    }
}

// Start the app
loadApp();
