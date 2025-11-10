// debugger.js
// This module is responsible for capturing all global JavaScript errors,
// unhandled promise rejections, and other potential issues. It logs them
// to an internal array and provides a way for other modules (like the
// loading screen) to display critical errors.

// Module-level private array to store all captured error messages as strings.
let errorLog = [];

// A variable to hold a callback function. This is specifically for the
// 'launcher.js' to register a function that can display
// an error *on the loading screen itself* if a fatal error occurs during startup.
let showErrorOnLoader = null; // The callback function

/**
 * Allows launcher.js (or any other module) to register its error-display function.
 * This is the bridge between this debugger module and the loading screen UI.
 * @param {function | null} callback - The function to call when a startup error occurs.
 * Pass null to unregister (which happens after
 * an error is shown or the app loads successfully).
 */
export function setLoaderErrorCallback(callback) {
    // Store the provided function in the module-level variable.
    showErrorOnLoader = callback;
}

/**
 * Initializes the global error listeners and attaches the debugger API to the main App object.
 * This function should be called as early as possible during application startup.
 * @param {object} App - The main application object (e.g., App = {}).
 */
export function initDebugger(App) {
    // Create a namespace on the main App object to expose the error log publicly.
    // This allows any part of the app to access the error history if needed.
    if (!App.debugger) App.debugger = {};
    
    // App.debugger.getErrorLog() will now allow any module to retrieve the full error history.
    App.debugger.getErrorLog = () => errorLog;

    // --- Global Error Handler ---
    // window.onerror is a special browser event that fires for any JavaScript
    // error (e.g., syntax, runtime) that isn't caught by a try...catch block.
    window.onerror = (msg, url, line, col, error) => {
        // Format the error message into a readable string.
        const entry = `Error: ${msg} at ${url}:${line}:${col || 0}`;
        
        // Add the error to our internal log.
        errorLog.push(entry);
        
        // Also log it to the browser's console for standard debugging.
        console.error('[Global Error]', entry, error || '');
        
        // If the loading screen's error callback is currently registered, call it.
        if (showErrorOnLoader) {
            showErrorOnLoader(entry); // Show the error on the UI
            // Unregister the callback to prevent multiple error displays on the
            // loading screen from subsequent (likely related) errors.
            showErrorOnLoader = null; 
        }
    };

    // --- Unhandled Promise Rejection Handler ---
    // This event listener catches errors from async functions or Promises
    // that 'reject' without a corresponding .catch() handler.
    window.addEventListener('unhandledrejection', (event) => {
        // Format the rejection reason into a readable string.
        // event.reason contains the error message or object.
        const entry = `Unhandled Rejection: ${event.reason}`;
        
        // Add it to our internal log.
        errorLog.push(entry);
        
        // Log it to the console.
        console.error('[Unhandled Rejection]', event.reason);

        // If the loading screen's error callback is registered, call it.
        if (showErrorOnLoader) {
            showErrorOnLoader(entry); // Show the error on the UI
            showErrorOnLoader = null; // Unregister the callback.
        }
    });

    // Start a simple performance monitor.
    // This runs the 'checkPerformance' function every 5 seconds.
    setInterval(checkPerformance, 5000);
}

/**
 * A utility function for other modules to manually log "non-fatal" errors
 * or check-in points during complex operations.
 * * Note: The try/catch logic here is primarily to catch the error *it creates*
 * if `moduleName` is missing, ensuring that *all* calls to this function
 * (even bad ones) are properly logged.
 * * @param {string} moduleName - The name of the module or context reporting the error.
 */
export function checkForErrors(moduleName) {
    try {
        // This is a simple check to ensure the function is used correctly.
        if (!moduleName) throw new Error('Invalid module name provided to checkForErrors');
    } catch (error) {
        // If moduleName is missing, or if another error occurs, log it.
        const entry = `Module ${moduleName || '(unknown)'} error: ${error.message}`;
        errorLog.push(entry);
        console.error(entry);
        
        // Also trigger the loader error if it's active.
        if (showErrorOnLoader) {
            showErrorOnLoader(entry);
            showErrorOnLoader = null;
        }
    }
}

/**
 * A simple diagnostic function to check if the browser's performance API
 * is behaving normally.
 */
function checkPerformance() {
    // Get the current high-resolution timestamp since the page loaded.
    const now = performance.now();
    
    // Check if the returned value is a valid, finite number.
    // If not (e.g., NaN, Infinity), it could indicate a browser issue or anomaly.
    if (!Number.isFinite(now)) {
        const entry = 'Performance API anomaly detected';
        errorLog.push(entry);
        // Log as a warning, as it's not a fatal app error.
        console.warn(entry); 
    }
}
