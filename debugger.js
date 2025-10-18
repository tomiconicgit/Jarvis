// --- DEBUGGER.JS ---
// Catches and logs global errors for easier debugging.

(function() {
    console.log('Debugger initialized.');

    const logError = (error, type) => {
        console.group(`%cJARVIS DEBUGGER: ${type}`, 'color: #ff4757; font-weight: bold;');
        console.error(error);
        console.log(`Message: ${error.message}`);
        if (error.filename) {
            console.log(`File: ${error.filename}:${error.lineno}:${error.colno}`);
        }
        console.groupEnd();
    };

    window.onerror = function(message, source, lineno, colno, error) {
        logError({ message, filename: source, lineno, colno, error }, 'Unhandled Error');
        // Return true to prevent the default browser error handling
        return true;
    };

    window.addEventListener('unhandledrejection', event => {
        logError(event.reason, 'Unhandled Promise Rejection');
        event.preventDefault();
    });

})();

