// debugger.js
// --- GONE: All UI element variables ---
let errorLog = [];
let showErrorOnLoader = null; // The callback function

/**
 * Allows loading.js to register its error-display function.
 */
export function setLoaderErrorCallback(callback) {
    showErrorOnLoader = callback;
}

/**
 * UPDATED: initDebugger now attaches the error log to the App object.
 * All direct UI manipulation is removed.
 * @param {object} App - The main application object.
 */
export function initDebugger(App) {
    // --- NEW: Expose the error log via the App object ---
    if (!App.debugger) App.debugger = {};
    App.debugger.getErrorLog = () => errorLog;
    // ---

    window.onerror = (msg, url, line, col, error) => {
        const entry = `Error: ${msg} at ${url}:${line}:${col || 0}`;
        errorLog.push(entry);
        console.error('[Global Error]', entry, error || '');
        
        if (showErrorOnLoader) {
            showErrorOnLoader(entry);
            showErrorOnLoader = null; // Show the FIRST error, then stop.
        }
        // GONE: updateStatus() and renderErrorLog()
    };

    window.addEventListener('unhandledrejection', (event) => {
        const entry = `Unhandled Rejection: ${event.reason}`;
        errorLog.push(entry);
        console.error('[Unhandled Rejection]', event.reason);

        if (showErrorOnLoader) {
            showErrorOnLoader(entry);
            showErrorOnLoader = null; // Show the FIRST error, then stop.
        }
        // GONE: updateStatus() and renderErrorLog()
    });

    setInterval(checkPerformance, 5000);
}

export function checkForErrors(moduleName) {
    try {
        if (!moduleName) throw new Error('Invalid module name');
    } catch (error) {
        const entry = `Module ${moduleName || '(unknown)'} error: ${error.message}`;
        errorLog.push(entry);
        console.error(entry);
        
        if (showErrorOnLoader) {
            showErrorOnLoader(entry);
            showErrorOnLoader = null;
        }
        // GONE: updateStatus() and renderErrorLog()
    }
}

function checkPerformance() {
    const now = performance.now();
    if (!Number.isFinite(now)) {
        const entry = 'Performance API anomaly detected';
        errorLog.push(entry);
        console.warn(entry);
        // GONE: renderErrorLog()
    }
    // GONE: updateStatus()
}

// --- GONE: updateStatus() function ---
// --- GONE: toggleDebugPanel() function ---
// --- GONE: renderErrorLog() function ---
