// debugger.js
const statusBar = document.getElementById('status-bar');
let errorLog = [];

export function initDebugger() {
    // Global error capture
    window.onerror = (msg, url, line, col, error) => {
        errorLog.push(`Error: ${msg} at ${url}:${line}:${col || 0}`);
        updateStatus();
    };

    // Optional global unhandled promise rejection logging
    window.addEventListener('unhandledrejection', (event) => {
        errorLog.push(`Unhandled Rejection: ${event.reason}`);
        updateStatus();
    });

    // Basic periodic performance / health check
    setInterval(checkPerformance, 5000);
}

export function checkForErrors(moduleName) {
    try {
        if (!moduleName) throw new Error('Invalid module name');
    } catch (error) {
        errorLog.push(`Module ${moduleName || '(unknown)'} error: ${error.message}`);
    }
    updateStatus();
}

function checkPerformance() {
    // Placeholder heuristic: here purely illustrative
    const now = performance.now();
    if (!Number.isFinite(now)) {
        errorLog.push('Performance API anomaly detected');
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

// Future expansions: model load checks, network checks, etc.