// debugger.js
const statusBar = document.getElementById('status-bar');
let errorLog = [];

export function initDebugger() {
    window.onerror = (msg, url, line, col, error) => {
        const entry = `Error: ${msg} at ${url}:${line}:${col || 0}`;
        errorLog.push(entry);
        console.error('[Global Error]', entry, error || '');
        updateStatus();
    };

    window.addEventListener('unhandledrejection', (event) => {
        const entry = `Unhandled Rejection: ${event.reason}`;
        errorLog.push(entry);
        console.error('[Unhandled Rejection]', event.reason);
        updateStatus();
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
    }
    updateStatus();
}

function checkPerformance() {
    const now = performance.now();
    if (!Number.isFinite(now)) {
        const entry = 'Performance API anomaly detected';
        errorLog.push(entry);
        console.warn(entry);
    }
    updateStatus();
}

function updateStatus() {
    if (!statusBar) return;

    if (errorLog.length > 0) {
        const last = errorLog[errorLog.length - 1];
        statusBar.textContent = `Status: Errors detected | Debugger: ${last}`;
    } else {
        statusBar.textContent = 'Status: Ready | Debugger: No errors';
    }
}