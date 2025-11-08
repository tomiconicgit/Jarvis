// debugger.js
const statusBar = document.getElementById('status-bar');
let errorLog = [];

export function initDebugger() {
    window.onerror = (msg, url, line) => {
        errorLog.push(`Error: ${msg} at ${url}:${line}`);
        updateStatus();
    };
    setInterval(checkPerformance, 5000); // Constant monitoring
}

export function checkForErrors(moduleName) {
    // Placeholder for syntax/file checks; expand as needed
    try {
        // Simulate file check
        if (!moduleName) throw new Error('Invalid module');
    } catch (error) {
        errorLog.push(`Module ${moduleName} error: ${error.message}`);
    }
    updateStatus();
}

function checkPerformance() {
    const perf = performance.now();
    // Placeholder for slowdown detection
    if (perf > 10000) { // Arbitrary threshold
        errorLog.push('Performance slowdown detected');
    }
    // Future: Add model file checks (e.g., via fetch or Three.js load errors)
    updateStatus();
}

function updateStatus() {
    if (errorLog.length > 0) {
        statusBar.textContent = `Status: Errors detected | Debugger: ${errorLog[errorLog.length - 1]}`;
    } else {
        statusBar.textContent = 'Status: Ready | Debugger: No errors';
    }
}

// Future expansions: Model errors, etc.