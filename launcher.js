// launcher.js
// This script is the very first piece of application logic that runs.
// Its sole purpose is to initialize the debugger, register the service worker,
// and then attempt to load the main application (`main.js`).
// It also controls the loading screen UI, showing progress and displaying
// any fatal errors that might happen *before* the main app has a chance to load.

// Import the necessary functions from our debugger module.
import { initDebugger, setLoaderErrorCallback } from './debugger.js';

// Get references to the loading screen HTML elements defined in index.html.
// We get these once at the start since they will be used by our functions.
const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const loadingInfo = document.getElementById('loading-info');

/**
 * This is the callback function that we will pass to the debugger.
 * If the debugger (debugger.js) catches a global error *during this loading phase*,
 * it will call this function to display the error message on the loading screen.
 * @param {string} message - The error message provided by the debugger.
 */
function showLoadingError(message) {
    // Set the text content to the error message.
    loadingInfo.textContent = message;
    // Change the loading bar's color to red to visually indicate failure.
    loadingProgress.style.background = '#f00';
    // Fill the bar to 100% to show that the process has "completed" (with an error).
    loadingProgress.style.width = '100%';
}

/**
 * This is the main asynchronous function that orchestrates the app's startup.
 * It's declared 'async' so we can use the 'await' keyword for module loading.
 */
async function loadApp() {
    
    // --- 1. Initialize Debugger ---
    // This is the absolute first step. We need the debugger running
    // before we try to do anything else, so it can catch any potential errors.
    
    // Create a temporary, empty 'App' object.
    // The `initDebugger` function expects an object to attach its API to
    // (e.g., App.debugger.getErrorLog). Since the *real* App object
    // hasn't been created yet (it's inside main.js), we give it a placeholder.
    const App = {}; 
    initDebugger(App); 
    
    // Now, we register our 'showLoadingError' function. If `initDebugger`
    // or anything after it fails, the global 'window.onerror' listener
    // (set up by initDebugger) will call this function.
    setLoaderErrorCallback(showLoadingError);

    // --- 2. Register Service Worker ---
    // We do this early in the background. It doesn't block the main app load.
    // The service worker is responsible for caching files for offline use.
    registerServiceWorker();

    // --- 3. Update UI & Load Main App ---
    // Update the loading screen to let the user know what's happening.
    loadingInfo.textContent = 'Loading application...';
    loadingProgress.style.width = '30%'; // Show some initial progress.

    try {
        // This is the most critical part of the launcher.
        // `await import('./src/main.js');` tells the browser to fetch,
        // parse, and execute 'main.js' and *all of its dependencies* (like three.js,
        // all the core modules, all the UI modules, etc.).
        // The 'await' keyword pauses the execution of *this* function (loadApp)
        // until that entire process is complete.
        // If 'main.js' or any file it imports has a syntax error or fails to
        // load, it will throw an error, which our 'catch' block will handle.
        await import('./src/main.js');

        // --- 4. Handle Success ---
        // If we get here, it means 'main.js' and all its dependencies loaded
        // and executed without throwing a fatal error. The app is ready.
        loadingInfo.textContent = 'Loading complete. Starting scene...';
        loadingProgress.style.width = '100%';

        // --- 5. Hide Loading Screen ---
        // We wait a short moment (800ms) before hiding the loading screen.
        // This gives the user a moment to read "Loading complete" and provides
        // a smoother visual transition, preventing a jarring flash.
        setTimeout(() => {
            if (loadingScreen) {
                // Fade out or just hide the screen.
                // Using 'display: none' removes it from the layout.
                loadingScreen.style.display = 'none';
            }
            
            // Disconnect our error callback. The app is loaded, so the main
            // app's UI (e.g., App.modal) will handle errors from now on.
            setLoaderErrorCallback(null);
        }, 800); // 800ms delay

    } catch (error) {
        // --- 6. Handle Fatal Error ---
        // This 'catch' block will execute if the `await import('./src/main.js')`
        // promise fails. This is a fatal startup error.
        const msg = `Fatal error: ${error.message}`;
        console.error(msg, error); // Log the full error to the console.
        showLoadingError(msg); // Display the simplified error on the loading screen.
        
        // We *don't* hide the loading screen, so the user can see the error.
    }
}

/**
 * Registers the service worker ('sw.js') for Progressive Web App (PWA) features
 * like offline caching.
 */
function registerServiceWorker() {
    // Check if the browser supports service workers.
    if ('serviceWorker' in navigator) {
        // 'window.addEventListener('load', ...)' is a common pattern.
        // It waits until the entire page (including images, etc.) is fully
        // loaded before registering the service worker. This prevents the
        // service worker's installation (which involves downloading files)
        // from competing for bandwidth with the main app load.
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    // Success!
                    console.log('ServiceWorker registration successful with scope:', registration.scope);
                })
                .catch((err) => {
                    // Failure. This isn't fatal, the app will still run online.
                    console.error('ServiceWorker registration failed:', err);
                });
        });
    }
}

// --- Start the application ---
// This is the only top-level command in this file. It calls our main
// async function and begins the entire application loading process.
loadApp();
